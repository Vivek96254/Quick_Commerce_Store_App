import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../../database/database.service';
import { RedisService } from '../../redis/redis.service';
import { LoggerService } from '../../common/services/logger.service';
import { OutboxService } from '../../common/services/outbox.service';
import { Prisma } from '@quickmart/db';

/**
 * SLA Configuration (in minutes)
 */
const SLA_LIMITS = {
  PENDING_TO_CONFIRMED: 5,       // Payment must be confirmed within 5 min
  CONFIRMED_TO_PACKED: 10,       // Packing SLA
  PACKED_TO_DISPATCHED: 5,       // Dispatch SLA
  DISPATCHED_TO_DELIVERED: 30,   // Delivery SLA
  UNPAID_AUTO_CANCEL: 30,        // Auto-cancel unpaid orders after 30 min
};

@Injectable()
export class OrderLifecycleService {
  private readonly LOCK_KEY = 'order:lifecycle-processor';

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly logger: LoggerService,
    private readonly outbox: OutboxService,
  ) {}

  /**
   * Auto-cancel unpaid orders that exceed the timeout.
   * Runs every 2 minutes.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async autoCancelUnpaidOrders(): Promise<void> {
    const lockAcquired = await this.redis.acquireLock(
      `${this.LOCK_KEY}:auto-cancel`,
      60,
    );
    if (!lockAcquired) return;

    try {
      const cutoff = new Date(
        Date.now() - SLA_LIMITS.UNPAID_AUTO_CANCEL * 60 * 1000,
      );

      const unpaidOrders = await this.db.order.findMany({
        where: {
          status: 'PENDING',
          paymentMethod: { not: 'CASH_ON_DELIVERY' },
          createdAt: { lt: cutoff },
        },
        include: {
          payment: true,
          items: true,
        },
        take: 50,
      });

      for (const order of unpaidOrders) {
        // Only cancel if payment is not completed
        if (order.payment?.status === 'COMPLETED') continue;

        try {
          await this.db.$transaction([
            this.db.order.update({
              where: { id: order.id },
              data: {
                status: 'CANCELLED',
                cancelledAt: new Date(),
                cancellationReason: 'Auto-cancelled: payment not received within time limit',
              },
            }),
            this.db.orderStatusHistory.create({
              data: {
                orderId: order.id,
                status: 'CANCELLED',
                notes: 'Auto-cancelled: payment timeout',
                changedBy: 'system',
              },
            }),
          ]);

          // Restore stock for each item
          for (const item of order.items) {
            const product = await this.db.product.findUnique({
              where: { id: item.productId },
            });
            if (product) {
              await this.db.$transaction([
                this.db.product.update({
                  where: { id: item.productId },
                  data: { stockQuantity: { increment: item.quantity } },
                }),
                this.db.inventoryLog.create({
                  data: {
                    productId: item.productId,
                    action: 'ORDER_CANCELLED',
                    quantity: item.quantity,
                    previousStock: product.stockQuantity,
                    newStock: product.stockQuantity + item.quantity,
                    orderId: order.id,
                    notes: 'Auto-cancel: payment timeout - stock restored',
                  },
                }),
              ]);
            }
          }

          await this.outbox.writeEventDirect('ORDER_CANCELLED', {
            orderId: order.id,
            orderNumber: order.orderNumber,
            userId: order.userId,
            reason: 'Payment timeout',
            automated: true,
          });

          this.logger.log(
            `Auto-cancelled unpaid order ${order.orderNumber}`,
            'OrderLifecycleService',
          );
        } catch (err) {
          this.logger.error(
            `Failed to auto-cancel order ${order.id}: ${err instanceof Error ? err.message : 'Unknown'}`,
            err instanceof Error ? err.stack : undefined,
            'OrderLifecycleService',
          );
        }
      }
    } finally {
      await this.redis.releaseLock(`${this.LOCK_KEY}:auto-cancel`);
    }
  }

  /**
   * Track SLA breaches. Runs every 5 minutes.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async trackSlaBreaches(): Promise<void> {
    const lockAcquired = await this.redis.acquireLock(
      `${this.LOCK_KEY}:sla-check`,
      60,
    );
    if (!lockAcquired) return;

    try {
      const now = new Date();

      // Check CONFIRMED orders that should have been packed
      const packedSla = new Date(
        now.getTime() - SLA_LIMITS.CONFIRMED_TO_PACKED * 60 * 1000,
      );
      const latePackOrders = await this.db.order.findMany({
        where: {
          status: 'CONFIRMED',
          confirmedAt: { lt: packedSla },
          slaBreachedAt: null,
        },
      });

      // Check PACKED orders that should have been dispatched
      const dispatchSla = new Date(
        now.getTime() - SLA_LIMITS.PACKED_TO_DISPATCHED * 60 * 1000,
      );
      const lateDispatchOrders = await this.db.order.findMany({
        where: {
          status: 'PACKED',
          packedAt: { lt: dispatchSla },
          slaBreachedAt: null,
        },
      });

      const breachedOrders = [...latePackOrders, ...lateDispatchOrders];

      for (const order of breachedOrders) {
        await this.db.order.update({
          where: { id: order.id },
          data: { slaBreachedAt: now },
        });
      }

      if (breachedOrders.length > 0) {
        this.logger.warn(
          `SLA breached for ${breachedOrders.length} orders`,
          'OrderLifecycleService',
        );
      }
    } finally {
      await this.redis.releaseLock(`${this.LOCK_KEY}:sla-check`);
    }
  }

  /**
   * Process partial fulfillment: remove items from an order and adjust totals.
   * Used when specific items become unavailable after order is placed.
   */
  async partialFulfillment(
    orderId: string,
    removedItemIds: string[],
    adminUserId: string,
  ): Promise<any> {
    const order = await this.db.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        payment: true,
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(order.status)) {
      throw new Error('Cannot modify order in current status');
    }

    const itemsToRemove = order.items.filter((item) =>
      removedItemIds.includes(item.id),
    );
    const remainingItems = order.items.filter(
      (item) => !removedItemIds.includes(item.id),
    );

    if (remainingItems.length === 0) {
      throw new Error(
        'Cannot remove all items. Cancel the order instead.',
      );
    }

    // Calculate refund amount for removed items
    const refundAmount = itemsToRemove.reduce(
      (sum, item) => sum + Number(item.total),
      0,
    );

    // Calculate new totals
    const newSubtotal = remainingItems.reduce(
      (sum, item) => sum + Number(item.total),
      0,
    );
    const newTotal = newSubtotal + Number(order.deliveryFee) + Number(order.tax);

    await this.db.executeTransaction(async (tx) => {
      // Remove items
      await tx.orderItem.deleteMany({
        where: { id: { in: removedItemIds } },
      });

      // Update order totals
      await tx.order.update({
        where: { id: orderId },
        data: {
          subtotal: new Prisma.Decimal(newSubtotal),
          total: new Prisma.Decimal(newTotal),
        },
      });

      // Restore stock for removed items
      for (const item of itemsToRemove) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (product) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQuantity: { increment: item.quantity } },
          });

          await tx.inventoryLog.create({
            data: {
              productId: item.productId,
              action: 'ORDER_CANCELLED',
              quantity: item.quantity,
              previousStock: product.stockQuantity,
              newStock: product.stockQuantity + item.quantity,
              orderId,
              notes: `Partial fulfillment: item removed from order`,
              performedBy: adminUserId,
            },
          });
        }
      }

      // Record status history
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: order.status,
          notes: `Partial fulfillment: ${itemsToRemove.length} item(s) removed. Refund: ₹${refundAmount}`,
          changedBy: adminUserId,
        },
      });

      // If payment was completed, create partial refund record
      if (order.payment?.status === 'COMPLETED' && refundAmount > 0) {
        await tx.payment.update({
          where: { orderId },
          data: {
            refundAmount: new Prisma.Decimal(refundAmount),
            refundedAt: new Date(),
            metadata: {
              partialRefund: true,
              removedItems: removedItemIds,
            },
          },
        });
      }

      // Write outbox event
      await this.outbox.writeEvent(tx, 'ORDER_STATUS_CHANGED', {
        orderId,
        orderNumber: order.orderNumber,
        userId: order.userId,
        action: 'PARTIAL_FULFILLMENT',
        removedItems: removedItemIds,
        refundAmount,
      });
    });

    this.logger.audit('ORDER_PARTIAL_FULFILLMENT', adminUserId, {
      orderId,
      removedItems: removedItemIds,
      refundAmount,
    });

    return { orderId, removedItems: removedItemIds.length, refundAmount };
  }
}
