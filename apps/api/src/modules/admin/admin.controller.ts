import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { Response } from 'express';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  AdminRoleGuard,
  AdminRoles,
} from '../auth/guards/admin-role.guard';
import { AuditLogService } from '../../common/services/audit-log.service';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard, AdminRoleGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ─── Dashboard ────────────────────────────────────────────────────

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  async getDashboard() {
    return this.adminService.getDashboardStats();
  }

  // ─── Store Configuration ──────────────────────────────────────────

  @Get('store-config')
  @ApiOperation({ summary: 'Get store configuration' })
  async getStoreConfig() {
    return this.adminService.getStoreConfig();
  }

  @Put('store-config')
  @AdminRoles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Update store configuration (Owner / Manager only)' })
  async updateStoreConfig(@Body() body: any) {
    return this.adminService.updateStoreConfig(body);
  }

  // ─── Reports ──────────────────────────────────────────────────────

  @Get('reports/sales')
  @AdminRoles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Get sales report' })
  async getSalesReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.adminService.getSalesReport(
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('reports/inventory')
  @AdminRoles('OWNER', 'MANAGER', 'INVENTORY')
  @ApiOperation({ summary: 'Get inventory report' })
  async getInventoryReport() {
    return this.adminService.getInventoryReport();
  }

  // ─── CSV Bulk Import ──────────────────────────────────────────────

  @Post('products/import-csv')
  @AdminRoles('OWNER', 'MANAGER', 'INVENTORY')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
      fileFilter: (_req, file, cb) => {
        if (
          file.mimetype === 'text/csv' ||
          file.mimetype === 'application/vnd.ms-excel' ||
          file.originalname.endsWith('.csv')
        ) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only CSV files are allowed'), false);
        }
      },
    }),
  )
  @ApiOperation({ summary: 'Bulk import products from CSV' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  async importProductsCsv(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ) {
    if (!file) {
      throw new BadRequestException('CSV file is required');
    }
    return this.adminService.importProductsCsv(file.buffer, userId);
  }

  @Get('products/csv-template')
  @ApiOperation({ summary: 'Download CSV template for product import' })
  async getCsvTemplate(@Res() res: Response) {
    const csv = this.adminService.getCsvTemplate();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=product-import-template.csv',
    );
    res.send(csv);
  }

  // ─── Batch Stock Update ───────────────────────────────────────────

  @Patch('products/batch-stock')
  @AdminRoles('OWNER', 'MANAGER', 'INVENTORY')
  @ApiOperation({ summary: 'Batch update stock for multiple products' })
  async batchUpdateStock(
    @Body()
    body: {
      items: Array<{
        productId: string;
        quantity: number;
        action: 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT';
        notes?: string;
      }>;
    },
    @CurrentUser('id') userId: string,
  ) {
    if (!body.items || !Array.isArray(body.items)) {
      throw new BadRequestException('"items" array is required');
    }
    return this.adminService.batchUpdateStock(body.items, userId);
  }

  // ─── Admin User Management ────────────────────────────────────────

  @Get('users')
  @AdminRoles('OWNER')
  @ApiOperation({ summary: 'List all admin users (Owner only)' })
  async listAdminUsers() {
    return this.adminService.listAdminUsers();
  }

  @Patch('users/:id/admin-role')
  @AdminRoles('OWNER')
  @ApiOperation({ summary: 'Assign admin sub-role to a user (Owner only)' })
  async assignAdminRole(
    @Param('id') targetUserId: string,
    @Body() body: { adminRole: 'OWNER' | 'MANAGER' | 'INVENTORY' | 'SUPPORT' },
    @CurrentUser('id') userId: string,
  ) {
    return this.adminService.assignAdminRole(
      targetUserId,
      body.adminRole,
      userId,
    );
  }

  // ─── Audit / Error Logs ───────────────────────────────────────────

  @Get('audit-logs')
  @AdminRoles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Search audit logs' })
  async getAuditLogs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('resource') resource?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.auditLogService.findAll({
      page,
      limit,
      userId,
      action,
      resource,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }
}
