import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { OrderLifecycleService } from './order-lifecycle.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IdempotencyInterceptor } from '../../common/interceptors/idempotency.interceptor';
import { OrderStatus, PaymentMethod } from '@quickmart/db';

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly lifecycleService: OrderLifecycleService,
  ) {}

  @Post()
  @UseInterceptors(IdempotencyInterceptor)
  @ApiHeader({ name: 'Idempotency-Key', required: false, description: 'Unique key to prevent duplicate orders' })
  @ApiOperation({ summary: 'Create order from cart' })
  async createOrder(
    @CurrentUser('id') userId: string,
    @Body() body: {
      addressId: string;
      paymentMethod: 'CASH_ON_DELIVERY' | 'STRIPE' | 'RAZORPAY';
      notes?: string;
    },
  ) {
    return this.ordersService.createOrder(userId, body);
  }

  @Get()
  @ApiOperation({ summary: 'Get current user orders' })
  async getUserOrders(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: OrderStatus,
  ) {
    return this.ordersService.findUserOrders(userId, { page, limit, status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  async getOrder(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('id') id: string,
  ) {
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(role);
    return this.ordersService.findById(id, isAdmin ? undefined : userId);
  }

  @Get('number/:orderNumber')
  @ApiOperation({ summary: 'Get order by order number' })
  async getOrderByNumber(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('orderNumber') orderNumber: string,
  ) {
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(role);
    return this.ordersService.findByOrderNumber(orderNumber, isAdmin ? undefined : userId);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel order' })
  async cancelOrder(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this.ordersService.cancelOrder(id, userId, body.reason);
  }

  // Admin endpoints
  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get all orders (Admin)' })
  async getAllOrders(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: OrderStatus,
    @Query('paymentMethod') paymentMethod?: PaymentMethod,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.ordersService.findAllOrders({
      page,
      limit,
      status,
      paymentMethod,
      search,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    });
  }

  @Patch('admin/:id/status')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update order status (Admin)' })
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: { status: OrderStatus; notes?: string },
  ) {
    return this.ordersService.updateStatus(id, body.status, body.notes, userId);
  }

  @Post('admin/:id/partial-fulfillment')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Partial fulfillment — remove items & auto-refund (Admin)' })
  async partialFulfillment(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: { itemIds: string[] },
  ) {
    return this.lifecycleService.partialFulfillment(id, body.itemIds, userId);
  }

  // ─── Polling Fallback (Mobile Reliability) ──────────────────────

  @Get(':id/poll')
  @ApiOperation({
    summary: 'Poll order status (websocket fallback for mobile)',
    description:
      'Lightweight endpoint that returns only status + timestamps. ' +
      'Returns 304 Not Modified when If-None-Match matches the current ETag.',
  })
  async pollOrderStatus(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('id') id: string,
    @Headers('if-none-match') ifNoneMatch?: string,
  ) {
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(role);
    const order = await this.ordersService.findById(
      id,
      isAdmin ? undefined : userId,
    );

    // Build a lightweight status payload
    const statusPayload = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      confirmedAt: order.confirmedAt,
      packedAt: order.packedAt,
      dispatchedAt: order.dispatchedAt,
      deliveredAt: order.deliveredAt,
      cancelledAt: order.cancelledAt,
      estimatedDelivery: order.estimatedDelivery,
    };

    // Simple ETag based on status + timestamp
    const etag = `"${order.status}-${order.updatedAt || order.createdAt}"`;

    if (ifNoneMatch && ifNoneMatch === etag) {
      return { notModified: true, etag };
    }

    return { ...statusPayload, etag };
  }
}
