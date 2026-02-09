import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  Req,
  Headers,
  RawBodyRequest,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { IdempotencyInterceptor } from '../../common/interceptors/idempotency.interceptor';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate/:orderId')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @ApiBearerAuth()
  @ApiHeader({ name: 'Idempotency-Key', required: false, description: 'Unique key to prevent duplicate payment initiations' })
  @ApiOperation({ summary: 'Initiate payment for order' })
  async initiatePayment(
    @Param('orderId') orderId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.paymentsService.initiatePayment(orderId, userId);
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify payment' })
  async verifyPayment(
    @Body() body: {
      orderId: string;
      gatewayPaymentId: string;
      gatewayOrderId: string;
      signature: string;
    },
  ) {
    return this.paymentsService.verifyPayment(body);
  }

  @Post('webhook/stripe')
  @Public()
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  async stripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.paymentsService.handleStripeWebhook(req.rawBody!, signature);
  }

  @Post('webhook/razorpay')
  @Public()
  @ApiOperation({ summary: 'Razorpay webhook endpoint' })
  async razorpayWebhook(
    @Body() payload: any,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    return this.paymentsService.handleRazorpayWebhook(payload, signature);
  }

  @Post('refund/:orderId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refund payment (Admin)' })
  async refund(
    @Param('orderId') orderId: string,
    @Body() body: { amount?: number; reason?: string },
  ) {
    return this.paymentsService.refund(orderId, body.amount, body.reason);
  }
}
