import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AuditLogService } from '../../common/services/audit-log.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService, AuditLogService],
  exports: [AdminService],
})
export class AdminModule {}
