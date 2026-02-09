import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrderLifecycleService } from './order-lifecycle.service';
import { CartModule } from '../cart/cart.module';

@Module({
  imports: [CartModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderLifecycleService],
  exports: [OrdersService, OrderLifecycleService],
})
export class OrdersModule {}
