import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';

// Core modules
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { LoggerModule } from './common/services/logger.module';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { AdminModule } from './modules/admin/admin.module';
import { WebsocketModule } from './websocket/websocket.module';
import { HealthModule } from './modules/health/health.module';
import { UploadModule } from './modules/upload/upload.module';

// Middleware
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

// Configuration validation
import configuration from './config/configuration';
import { validate } from './config/env.validation';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          name: 'short',
          ttl: 1000,
          limit: config.get<number>('THROTTLE_SHORT_LIMIT') || 10,
        },
        {
          name: 'medium',
          ttl: 10000,
          limit: config.get<number>('THROTTLE_MEDIUM_LIMIT') || 50,
        },
        {
          name: 'long',
          ttl: 60000,
          limit: config.get<number>('THROTTLE_LONG_LIMIT') || 100,
        },
      ],
    }),

    // Scheduled tasks
    ScheduleModule.forRoot(),

    // Core modules
    LoggerModule,
    DatabaseModule,
    RedisModule,

    // Feature modules
    AuthModule,
    UsersModule,
    ProductsModule,
    CategoriesModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    AddressesModule,
    AdminModule,
    WebsocketModule,
    HealthModule,
    UploadModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
