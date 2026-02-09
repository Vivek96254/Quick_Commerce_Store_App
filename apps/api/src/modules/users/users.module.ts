import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PushNotificationService } from '../../common/services/push-notification.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, PushNotificationService],
  exports: [UsersService, PushNotificationService],
})
export class UsersModule {}
