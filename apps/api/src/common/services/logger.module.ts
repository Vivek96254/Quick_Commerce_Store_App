import { Global, Module } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { IdempotencyService } from './idempotency.service';
import { OutboxService } from './outbox.service';
import { InventoryReservationService } from './inventory-reservation.service';

@Global()
@Module({
  providers: [
    LoggerService,
    IdempotencyService,
    OutboxService,
    InventoryReservationService,
  ],
  exports: [
    LoggerService,
    IdempotencyService,
    OutboxService,
    InventoryReservationService,
  ],
})
export class LoggerModule {}
