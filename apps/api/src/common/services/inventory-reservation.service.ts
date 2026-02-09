import { Injectable, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../../database/database.service';
import { RedisService } from '../../redis/redis.service';
import { LoggerService } from './logger.service';

const RESERVATION_TTL_MINUTES = 15;

@Injectable()
export class InventoryReservationService {
  private readonly LOCK_KEY = 'inventory:reservation-cleanup';

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Reserve stock for a set of items during checkout.
   * Runs inside a Serializable transaction to prevent overselling.
   * Returns the reservation IDs for later conversion or release.
   */
  async reserveStock(
    userId: string,
    items: Array<{ productId: string; quantity: number }>,
    sessionId?: string,
  ): Promise<string[]> {
    const reservationIds = await this.db.executeTransaction(async (tx) => {
      const ids: string[] = [];

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new BadRequestException(`Product ${item.productId} not found`);
        }

        if (!product.isAvailable) {
          throw new BadRequestException(
            `${product.name} is no longer available`,
          );
        }

        const availableStock =
          product.stockQuantity - product.reservedQuantity;
        if (availableStock < item.quantity) {
          throw new BadRequestException(
            `Only ${availableStock} of ${product.name} available`,
          );
        }

        // Increment reserved quantity
        await tx.product.update({
          where: { id: item.productId },
          data: {
            reservedQuantity: { increment: item.quantity },
          },
        });

        // Create reservation record
        const reservation = await tx.inventoryReservation.create({
          data: {
            productId: item.productId,
            userId,
            sessionId,
            quantity: item.quantity,
            expiresAt: new Date(
              Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000,
            ),
          },
        });

        ids.push(reservation.id);
      }

      return ids;
    });

    this.logger.debug(
      `Reserved stock for ${items.length} items, user: ${userId}`,
      'InventoryReservationService',
    );

    return reservationIds;
  }

  /**
   * Convert reservations to actual stock deductions on payment success.
   * Called when an order is confirmed/paid.
   */
  async convertReservations(
    orderId: string,
    userId: string,
  ): Promise<void> {
    const reservations = await this.db.inventoryReservation.findMany({
      where: {
        userId,
        releasedAt: null,
        convertedAt: null,
      },
    });

    if (reservations.length === 0) return;

    await this.db.executeTransaction(async (tx) => {
      for (const reservation of reservations) {
        // Decrease reservedQuantity (the actual stockQuantity was already
        // decremented during order creation in the existing flow)
        await tx.product.update({
          where: { id: reservation.productId },
          data: {
            reservedQuantity: { decrement: reservation.quantity },
          },
        });

        // Mark reservation as converted
        await tx.inventoryReservation.update({
          where: { id: reservation.id },
          data: {
            orderId,
            convertedAt: new Date(),
          },
        });
      }
    });

    this.logger.debug(
      `Converted ${reservations.length} reservations for order: ${orderId}`,
      'InventoryReservationService',
    );
  }

  /**
   * Release specific reservations (e.g. on payment failure or timeout).
   */
  async releaseReservations(reservationIds: string[]): Promise<void> {
    for (const id of reservationIds) {
      const reservation = await this.db.inventoryReservation.findUnique({
        where: { id },
      });

      if (!reservation || reservation.releasedAt || reservation.convertedAt) {
        continue;
      }

      await this.db.$transaction([
        this.db.product.update({
          where: { id: reservation.productId },
          data: {
            reservedQuantity: { decrement: reservation.quantity },
          },
        }),
        this.db.inventoryReservation.update({
          where: { id },
          data: { releasedAt: new Date() },
        }),
      ]);
    }
  }

  /**
   * Release all pending reservations for a user (e.g. on checkout cancel).
   */
  async releaseUserReservations(userId: string): Promise<void> {
    const reservations = await this.db.inventoryReservation.findMany({
      where: {
        userId,
        releasedAt: null,
        convertedAt: null,
      },
    });

    await this.releaseReservations(reservations.map((r) => r.id));
  }

  /**
   * Scheduled cleanup: release all expired reservations every minute.
   * Handles edge case of app crash after reserve but before payment.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async cleanupExpiredReservations(): Promise<void> {
    const lockAcquired = await this.redis.acquireLock(this.LOCK_KEY, 30);
    if (!lockAcquired) return;

    try {
      const expired = await this.db.inventoryReservation.findMany({
        where: {
          expiresAt: { lt: new Date() },
          releasedAt: null,
          convertedAt: null,
        },
        take: 100,
      });

      if (expired.length === 0) return;

      for (const reservation of expired) {
        try {
          await this.db.$transaction([
            this.db.product.update({
              where: { id: reservation.productId },
              data: {
                reservedQuantity: { decrement: reservation.quantity },
              },
            }),
            this.db.inventoryReservation.update({
              where: { id: reservation.id },
              data: { releasedAt: new Date() },
            }),
          ]);
        } catch (err) {
          // Log but don't fail the entire batch — next run will retry
          this.logger.error(
            `Failed to release expired reservation ${reservation.id}: ${err instanceof Error ? err.message : 'Unknown'}`,
            undefined,
            'InventoryReservationService',
          );
        }
      }

      this.logger.log(
        `Released ${expired.length} expired inventory reservations`,
        'InventoryReservationService',
      );
    } finally {
      await this.redis.releaseLock(this.LOCK_KEY);
    }
  }

  /**
   * Handle edge case: payment success arrives after reservation timeout.
   * Re-check stock and create a fresh reservation if stock is available.
   */
  async reReserveIfNeeded(
    orderId: string,
    items: Array<{ productId: string; quantity: number }>,
    userId: string,
  ): Promise<boolean> {
    // Check if reservations are still active
    const activeReservations = await this.db.inventoryReservation.findMany({
      where: {
        userId,
        releasedAt: null,
        convertedAt: null,
      },
    });

    if (activeReservations.length > 0) {
      // Reservations still active, convert them
      await this.convertReservations(orderId, userId);
      return true;
    }

    // Reservations expired — try to reserve again
    try {
      await this.reserveStock(userId, items);
      await this.convertReservations(orderId, userId);
      return true;
    } catch {
      // Stock no longer available
      return false;
    }
  }
}
