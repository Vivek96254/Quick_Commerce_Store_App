import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../../database/database.service';
import { LoggerService } from './logger.service';
import { RedisService } from '../../redis/redis.service';

export type OutboxEventType =
  | 'ORDER_CREATED'
  | 'PAYMENT_SUCCESS'
  | 'STOCK_DEDUCTED'
  | 'ORDER_STATUS_CHANGED'
  | 'ORDER_CANCELLED';

@Injectable()
export class OutboxService {
  private readonly MAX_RETRIES = 5;
  private readonly LOCK_KEY = 'outbox:processor';
  private readonly LOCK_TTL = 30; // seconds

  constructor(
    private readonly db: DatabaseService,
    private readonly logger: LoggerService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Write an outbox event inside an existing Prisma transaction context.
   * This guarantees the event is committed atomically with the business data.
   */
  async writeEvent(
    tx: any,
    type: OutboxEventType,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await tx.outboxEvent.create({
      data: {
        type,
        payload,
        status: 'PENDING',
      },
    });
  }

  /**
   * Write an outbox event outside a transaction (for simple cases).
   */
  async writeEventDirect(
    type: OutboxEventType,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.db.outboxEvent.create({
      data: {
        type,
        payload,
        status: 'PENDING',
      },
    });
  }

  /**
   * Background processor — runs every 10 seconds.
   * Uses Redis lock to prevent concurrent processing across instances.
   */
  @Cron(CronExpression.EVERY_10_SECONDS)
  async processOutbox(): Promise<void> {
    const lockAcquired = await this.redis.acquireLock(
      this.LOCK_KEY,
      this.LOCK_TTL,
    );
    if (!lockAcquired) return;

    try {
      const events = await this.db.outboxEvent.findMany({
        where: {
          status: { in: ['PENDING', 'FAILED'] },
          retries: { lt: this.MAX_RETRIES },
        },
        orderBy: { createdAt: 'asc' },
        take: 20,
      });

      for (const event of events) {
        await this.processEvent(event);
      }
    } catch (error) {
      this.logger.error(
        `Outbox processor error: ${error instanceof Error ? error.message : 'Unknown'}`,
        error instanceof Error ? error.stack : undefined,
        'OutboxService',
      );
    } finally {
      await this.redis.releaseLock(this.LOCK_KEY);
    }
  }

  private async processEvent(event: any): Promise<void> {
    try {
      // Mark as processing
      await this.db.outboxEvent.update({
        where: { id: event.id },
        data: { status: 'PROCESSING' },
      });

      await this.executeSideEffect(event.type, event.payload);

      // Mark as completed
      await this.db.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: 'COMPLETED',
          processedAt: new Date(),
        },
      });

      this.logger.debug(
        `Outbox event ${event.id} (${event.type}) processed`,
        'OutboxService',
      );
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Unknown error';

      await this.db.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: 'FAILED',
          retries: event.retries + 1,
          lastError: errorMsg,
        },
      });

      this.logger.error(
        `Outbox event ${event.id} (${event.type}) failed: ${errorMsg}`,
        error instanceof Error ? error.stack : undefined,
        'OutboxService',
      );
    }
  }

  /**
   * Route side effects by event type.
   * Each handler is idempotent — safe to re-execute on retry.
   */
  private async executeSideEffect(
    type: string,
    payload: any,
  ): Promise<void> {
    switch (type) {
      case 'ORDER_CREATED':
        await this.handleOrderCreated(payload);
        break;
      case 'PAYMENT_SUCCESS':
        await this.handlePaymentSuccess(payload);
        break;
      case 'STOCK_DEDUCTED':
        await this.handleStockDeducted(payload);
        break;
      case 'ORDER_STATUS_CHANGED':
        await this.handleOrderStatusChanged(payload);
        break;
      case 'ORDER_CANCELLED':
        await this.handleOrderCancelled(payload);
        break;
      default:
        this.logger.warn(`Unknown outbox event type: ${type}`, 'OutboxService');
    }
  }

  private async handleOrderCreated(payload: any): Promise<void> {
    // Publish to Redis for real-time notification delivery
    await this.redis.publish('events:order_created', payload);
    this.logger.log(
      `Order created event published: ${payload.orderId}`,
      'OutboxService',
    );
  }

  private async handlePaymentSuccess(payload: any): Promise<void> {
    await this.redis.publish('events:payment_success', payload);
    this.logger.log(
      `Payment success event published: ${payload.orderId}`,
      'OutboxService',
    );
  }

  private async handleStockDeducted(payload: any): Promise<void> {
    await this.redis.publish('events:stock_deducted', payload);
    this.logger.log(
      `Stock deducted event published: ${payload.productId}`,
      'OutboxService',
    );
  }

  private async handleOrderStatusChanged(payload: any): Promise<void> {
    await this.redis.publish('events:order_status_changed', payload);
    this.logger.log(
      `Order status changed event published: ${payload.orderId}`,
      'OutboxService',
    );
  }

  private async handleOrderCancelled(payload: any): Promise<void> {
    await this.redis.publish('events:order_cancelled', payload);
    this.logger.log(
      `Order cancelled event published: ${payload.orderId}`,
      'OutboxService',
    );
  }

  /**
   * Cleanup old completed events (older than 7 days). Runs daily.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupOldEvents(): Promise<void> {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const result = await this.db.outboxEvent.deleteMany({
      where: {
        status: 'COMPLETED',
        processedAt: { lt: cutoff },
      },
    });

    if (result.count > 0) {
      this.logger.log(
        `Cleaned up ${result.count} old outbox events`,
        'OutboxService',
      );
    }
  }
}
