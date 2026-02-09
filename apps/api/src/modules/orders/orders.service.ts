import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { RedisService } from '../../redis/redis.service';
import { LoggerService } from '../../common/services/logger.service';
import { OutboxService } from '../../common/services/outbox.service';
import { CartService } from '../cart/cart.service';
import { Prisma, OrderStatus, PaymentMethod } from '@quickmart/db';
import { nanoid } from 'nanoid';

@Injectable()
export class OrdersService {
  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly logger: LoggerService,
    private readonly outbox: OutboxService,
    private readonly cartService: CartService,
  ) {}

  private generateOrderNumber(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = nanoid(6).toUpperCase();
    return `QM${dateStr}${random}`;
  }

  async createOrder(
    userId: string,
    input: {
      addressId: string;
      paymentMethod: 'CASH_ON_DELIVERY' | 'STRIPE' | 'RAZORPAY';
      notes?: string;
    },
  ) {
    // Get cart
    const cart = await this.cartService.getCart(userId);

    if (cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Get store config
    const storeConfig = await this.db.storeConfig.findFirst();
    const minOrderAmount = storeConfig ? Number(storeConfig.minOrderAmount) : 0;

    if (cart.subtotal < minOrderAmount) {
      throw new BadRequestException(`Minimum order amount is ₹${minOrderAmount}`);
    }

    // Get address
    const address = await this.db.address.findFirst({
      where: { id: input.addressId, userId },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    // Create order in transaction with stock locking
    const order = await this.db.executeTransaction(async (tx) => {
      // Lock and validate stock
      const productIds = cart.items.map((item: any) => item.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });

      const productMap = new Map(products.map((p) => [p.id, p]));

      for (const item of cart.items) {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new BadRequestException(`Product ${item.productId} not found`);
        }
        if (!product.isAvailable) {
          throw new BadRequestException(`${product.name} is no longer available`);
        }
        if (product.stockQuantity < item.quantity) {
          throw new BadRequestException(
            `Only ${product.stockQuantity} of ${product.name} available`,
          );
        }
      }

      // Calculate totals
      const subtotal = cart.subtotal;
      const deliveryFee = cart.deliveryFee;
      const taxRate = storeConfig ? Number(storeConfig.taxRate) : 0;
      const tax = storeConfig?.taxInclusive ? 0 : (subtotal * taxRate) / 100;
      const total = subtotal + deliveryFee + tax;

      // Create order
      const newOrder = await tx.order.create({
        data: {
          orderNumber: this.generateOrderNumber(),
          userId,
          addressId: input.addressId,
          status: 'PENDING',
          subtotal: new Prisma.Decimal(subtotal),
          deliveryFee: new Prisma.Decimal(deliveryFee),
          discount: new Prisma.Decimal(0),
          tax: new Prisma.Decimal(tax),
          total: new Prisma.Decimal(total),
          paymentMethod: input.paymentMethod as PaymentMethod,
          notes: input.notes,
          estimatedDelivery: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
          deliveryAddress: {
            fullName: address.fullName,
            phone: address.phone,
            addressLine1: address.addressLine1,
            addressLine2: address.addressLine2,
            landmark: address.landmark,
            city: address.city,
            state: address.state,
            postalCode: address.postalCode,
            country: address.country,
          },
        },
      });

      // Create order items and update stock
      for (const item of cart.items) {
        const product = productMap.get(item.productId)!;
        const unitPrice = Number(product.price);
        const discountedPrice = product.discountedPrice
          ? Number(product.discountedPrice)
          : null;
        const itemTotal = (discountedPrice || unitPrice) * item.quantity;

        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: new Prisma.Decimal(unitPrice),
            discountedPrice: discountedPrice
              ? new Prisma.Decimal(discountedPrice)
              : null,
            total: new Prisma.Decimal(itemTotal),
            productSnapshot: {
              name: product.name,
              slug: product.slug,
              sku: product.sku,
              unit: product.unit,
              image: item.product.images[0]?.url || null,
            },
          },
        });

        // Update stock
        const previousStock = product.stockQuantity;
        const newStock = previousStock - item.quantity;

        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: newStock },
        });

        // Create inventory log
        await tx.inventoryLog.create({
          data: {
            productId: item.productId,
            action: 'ORDER_RESERVED',
            quantity: item.quantity,
            previousStock,
            newStock,
            orderId: newOrder.id,
            notes: `Order ${newOrder.orderNumber}`,
          },
        });
      }

      // Create order status history
      await tx.orderStatusHistory.create({
        data: {
          orderId: newOrder.id,
          status: 'PENDING',
          notes: 'Order placed',
        },
      });

      // Create payment record
      await tx.payment.create({
        data: {
          orderId: newOrder.id,
          amount: new Prisma.Decimal(total),
          currency: storeConfig?.currency || 'INR',
          method: input.paymentMethod as PaymentMethod,
          status: input.paymentMethod === 'CASH_ON_DELIVERY' ? 'PENDING' : 'PENDING',
        },
      });

      // Write outbox event atomically within the same transaction
      await this.outbox.writeEvent(tx, 'ORDER_CREATED', {
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
        userId,
        total,
        paymentMethod: input.paymentMethod,
      });

      return newOrder;
    });

    // Clear cart
    await this.cartService.clearCart(userId);

    this.logger.audit('ORDER_CREATED', userId, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: Number(order.total),
    });

    return this.findById(order.id, userId);
  }

  async findById(id: string, userId?: string) {
    const order = await this.db.order.findFirst({
      where: {
        id,
        ...(userId && { userId }),
      },
      include: {
        items: {
          include: { product: true },
        },
        payment: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.formatOrder(order);
  }

  async findByOrderNumber(orderNumber: string, userId?: string) {
    const order = await this.db.order.findFirst({
      where: {
        orderNumber,
        ...(userId && { userId }),
      },
      include: {
        items: {
          include: { product: true },
        },
        payment: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.formatOrder(order);
  }

  async findUserOrders(
    userId: string,
    params: {
      page?: number;
      limit?: number;
      status?: OrderStatus;
    },
  ) {
    // Ensure page and limit are valid numbers
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 10));
    const { status } = params;

    const where: Prisma.OrderWhereInput = {
      userId,
      ...(status && { status }),
    };

    const [items, total] = await Promise.all([
      this.db.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: { product: true },
            take: 3,
          },
          payment: true,
        },
      }),
      this.db.order.count({ where }),
    ]);

    return {
      items: items.map(this.formatOrderSummary),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  }

  async findAllOrders(params: {
    page?: number;
    limit?: number;
    status?: OrderStatus;
    paymentMethod?: PaymentMethod;
    search?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    // Ensure page and limit are valid numbers
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));
    const {
      status,
      paymentMethod,
      search,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const where: Prisma.OrderWhereInput = {
      ...(status && { status }),
      ...(paymentMethod && { paymentMethod }),
      ...(search && {
        OR: [
          { orderNumber: { contains: search, mode: 'insensitive' } },
          { user: { firstName: { contains: search, mode: 'insensitive' } } },
          { user: { lastName: { contains: search, mode: 'insensitive' } } },
          { user: { phone: { contains: search } } },
        ],
      }),
      ...(startDate && { createdAt: { gte: new Date(startDate) } }),
      ...(endDate && { createdAt: { lte: new Date(endDate) } }),
    };

    const [items, total] = await Promise.all([
      this.db.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: {
            select: { firstName: true, lastName: true, phone: true },
          },
          items: {
            take: 1,
          },
          payment: true,
        },
      }),
      this.db.order.count({ where }),
    ]);

    return {
      items: items.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customer: {
          name: `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim(),
          phone: order.user.phone,
        },
        status: order.status,
        total: Number(order.total),
        paymentMethod: order.paymentMethod,
        paymentStatus: order.payment?.status,
        itemCount: order.items.length,
        createdAt: order.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  }

  async updateStatus(
    orderId: string,
    status: OrderStatus,
    notes?: string,
    changedBy?: string,
  ) {
    const order = await this.db.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Validate status transition
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['PACKED', 'CANCELLED'],
      PACKED: ['OUT_FOR_DELIVERY', 'CANCELLED'],
      OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
      DELIVERED: ['REFUNDED'],
      CANCELLED: [],
      REFUNDED: [],
    };

    if (!validTransitions[order.status].includes(status)) {
      throw new BadRequestException(
        `Cannot change status from ${order.status} to ${status}`,
      );
    }

    const now = new Date();
    await this.db.$transaction([
      this.db.order.update({
        where: { id: orderId },
        data: {
          status,
          ...(status === 'CONFIRMED' && { confirmedAt: now }),
          ...(status === 'PACKED' && { packedAt: now }),
          ...(status === 'OUT_FOR_DELIVERY' && { dispatchedAt: now }),
          ...(status === 'DELIVERED' && { deliveredAt: now }),
          ...(status === 'CANCELLED' && {
            cancelledAt: now,
            cancellationReason: notes,
          }),
        },
      }),
      this.db.orderStatusHistory.create({
        data: {
          orderId,
          status,
          notes,
          changedBy,
        },
      }),
    ]);

    // If cancelled, restore stock
    if (status === 'CANCELLED') {
      await this.restoreStock(orderId);
      await this.outbox.writeEventDirect('ORDER_CANCELLED', {
        orderId,
        orderNumber: order.orderNumber,
        userId: order.userId,
        reason: notes,
      });
    } else {
      await this.outbox.writeEventDirect('ORDER_STATUS_CHANGED', {
        orderId,
        orderNumber: order.orderNumber,
        userId: order.userId,
        previousStatus: order.status,
        newStatus: status,
      });
    }

    this.logger.audit('ORDER_STATUS_UPDATED', changedBy || 'system', {
      orderId,
      previousStatus: order.status,
      newStatus: status,
    });

    return this.findById(orderId);
  }

  async cancelOrder(orderId: string, userId: string, reason: string) {
    const order = await this.db.order.findFirst({
      where: { id: orderId, userId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
      throw new BadRequestException('Order cannot be cancelled at this stage');
    }

    return this.updateStatus(orderId, 'CANCELLED', reason, userId);
  }

  private async restoreStock(orderId: string) {
    const orderItems = await this.db.orderItem.findMany({
      where: { orderId },
      include: { product: true },
    });

    for (const item of orderItems) {
      const previousStock = item.product.stockQuantity;
      const newStock = previousStock + item.quantity;

      await this.db.$transaction([
        this.db.product.update({
          where: { id: item.productId },
          data: { stockQuantity: newStock },
        }),
        this.db.inventoryLog.create({
          data: {
            productId: item.productId,
            action: 'ORDER_CANCELLED',
            quantity: item.quantity,
            previousStock,
            newStock,
            orderId,
            notes: 'Order cancelled - stock restored',
          },
        }),
      ]);
    }
  }

  private formatOrder(order: any) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      status: order.status,
      subtotal: Number(order.subtotal),
      deliveryFee: Number(order.deliveryFee),
      discount: Number(order.discount),
      tax: Number(order.tax),
      total: Number(order.total),
      paymentMethod: order.paymentMethod,
      notes: order.notes,
      estimatedDelivery: order.estimatedDelivery?.toISOString(),
      confirmedAt: order.confirmedAt?.toISOString() ?? null,
      packedAt: order.packedAt?.toISOString() ?? null,
      dispatchedAt: order.dispatchedAt?.toISOString() ?? null,
      deliveredAt: order.deliveredAt?.toISOString(),
      cancelledAt: order.cancelledAt?.toISOString(),
      slaBreachedAt: order.slaBreachedAt?.toISOString() ?? null,
      cancellationReason: order.cancellationReason,
      deliveryAddress: order.deliveryAddress,
      items: order.items.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        discountedPrice: item.discountedPrice ? Number(item.discountedPrice) : null,
        total: Number(item.total),
        productSnapshot: item.productSnapshot,
      })),
      payment: order.payment
        ? {
            id: order.payment.id,
            status: order.payment.status,
            method: order.payment.method,
            paidAt: order.payment.paidAt?.toISOString(),
          }
        : null,
      statusHistory: order.statusHistory?.map((h: any) => ({
        status: h.status,
        notes: h.notes,
        createdAt: h.createdAt.toISOString(),
      })),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }

  private formatOrderSummary(order: any) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      total: Number(order.total),
      paymentMethod: order.paymentMethod,
      paymentStatus: order.payment?.status,
      itemCount: order.items.length,
      items: order.items.slice(0, 3).map((item: any) => ({
        name: item.productSnapshot?.name || item.product?.name,
        quantity: item.quantity,
        image: item.productSnapshot?.image,
      })),
      createdAt: order.createdAt.toISOString(),
    };
  }
}
