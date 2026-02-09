import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { LoggerService } from '../../common/services/logger.service';
import { RedisService } from '../../redis/redis.service';
import { Prisma } from '@quickmart/db';

interface CsvProductRow {
  sku: string;
  name: string;
  description?: string;
  price: string;
  discountedPrice?: string;
  categoryId?: string;
  categorySlug?: string;
  unit?: string;
  unitValue?: string;
  stockQuantity?: string;
  lowStockThreshold?: string;
  isAvailable?: string;
  isFeatured?: string;
  tags?: string;
}

interface BatchStockItem {
  productId: string;
  quantity: number;
  action: 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT';
  notes?: string;
}

@Injectable()
export class AdminService {
  constructor(
    private readonly db: DatabaseService,
    private readonly logger: LoggerService,
    private readonly redis: RedisService,
  ) {}

  // ─── Dashboard Stats ─────────────────────────────────────────────

  async getDashboardStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayOrders, todayRevenue, todayNewCustomers] = await Promise.all([
      this.db.order.count({
        where: { createdAt: { gte: todayStart } },
      }),
      this.db.order.aggregate({
        where: { createdAt: { gte: todayStart }, status: { not: 'CANCELLED' } },
        _sum: { total: true },
      }),
      this.db.user.count({
        where: { createdAt: { gte: todayStart }, role: 'CUSTOMER' },
      }),
    ]);

    const [weekOrders, weekRevenue] = await Promise.all([
      this.db.order.count({
        where: { createdAt: { gte: weekStart } },
      }),
      this.db.order.aggregate({
        where: { createdAt: { gte: weekStart }, status: { not: 'CANCELLED' } },
        _sum: { total: true },
      }),
    ]);

    const [monthOrders, monthRevenue] = await Promise.all([
      this.db.order.count({
        where: { createdAt: { gte: monthStart } },
      }),
      this.db.order.aggregate({
        where: { createdAt: { gte: monthStart }, status: { not: 'CANCELLED' } },
        _sum: { total: true },
      }),
    ]);

    const ordersByStatus = await this.db.order.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    const topProducts = await this.db.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    });

    const topProductDetails = await Promise.all(
      topProducts.map(async (item) => {
        const product = await this.db.product.findUnique({
          where: { id: item.productId },
          select: { id: true, name: true },
        });
        return {
          id: item.productId,
          name: product?.name || 'Unknown',
          totalSold: item._sum.quantity || 0,
          revenue: Number(item._sum.total) || 0,
        };
      }),
    );

    const lowStockProducts = await this.db.product.findMany({
      where: {
        isAvailable: true,
      },
      select: {
        id: true,
        name: true,
        stockQuantity: true,
        lowStockThreshold: true,
      },
      orderBy: { stockQuantity: 'asc' },
      take: 20,
    });

    const recentOrders = await this.db.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });

    const weekRevenueNum = Number(weekRevenue._sum.total) || 0;
    const monthRevenueNum = Number(monthRevenue._sum.total) || 0;

    return {
      today: {
        orders: todayOrders,
        revenue: Number(todayRevenue._sum.total) || 0,
        newCustomers: todayNewCustomers,
      },
      week: {
        orders: weekOrders,
        revenue: weekRevenueNum,
        avgOrderValue: weekOrders > 0 ? weekRevenueNum / weekOrders : 0,
      },
      month: {
        orders: monthOrders,
        revenue: monthRevenueNum,
        avgOrderValue: monthOrders > 0 ? monthRevenueNum / monthOrders : 0,
      },
      ordersByStatus: Object.fromEntries(
        ordersByStatus.map((s) => [s.status, s._count.status]),
      ),
      topProducts: topProductDetails.filter((p) => p.totalSold > 0),
      lowStockProducts: lowStockProducts.filter(
        (p) => p.stockQuantity <= p.lowStockThreshold,
      ),
      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim(),
        total: Number(order.total),
        status: order.status,
        createdAt: order.createdAt.toISOString(),
      })),
    };
  }

  // ─── Store Config ─────────────────────────────────────────────────

  async getStoreConfig() {
    const config = await this.db.storeConfig.findFirst();
    if (!config) return null;

    return {
      name: config.name,
      description: config.description,
      logo: config.logo,
      phone: config.phone,
      email: config.email,
      address: config.address,
      city: config.city,
      state: config.state,
      postalCode: config.postalCode,
      country: config.country,
      currency: config.currency,
      currencySymbol: config.currencySymbol,
      deliveryRadius: config.deliveryRadius,
      minOrderAmount: Number(config.minOrderAmount),
      deliveryFee: Number(config.deliveryFee),
      freeDeliveryAbove: config.freeDeliveryAbove
        ? Number(config.freeDeliveryAbove)
        : null,
      operatingHours: config.operatingHours,
      isOpen: config.isOpen,
      taxRate: Number(config.taxRate),
      taxInclusive: config.taxInclusive,
    };
  }

  async updateStoreConfig(
    input: Partial<{
      name: string;
      description: string;
      logo: string;
      phone: string;
      email: string;
      address: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
      deliveryRadius: number;
      minOrderAmount: number;
      deliveryFee: number;
      freeDeliveryAbove: number;
      operatingHours: any;
      isOpen: boolean;
      taxRate: number;
      taxInclusive: boolean;
    }>,
  ) {
    const config = await this.db.storeConfig.findFirst();

    const updateData: any = {
      ...(input.name && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.logo !== undefined && { logo: input.logo }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.address !== undefined && { address: input.address }),
      ...(input.city !== undefined && { city: input.city }),
      ...(input.state !== undefined && { state: input.state }),
      ...(input.postalCode !== undefined && { postalCode: input.postalCode }),
      ...(input.country !== undefined && { country: input.country }),
      ...(input.deliveryRadius !== undefined && {
        deliveryRadius: input.deliveryRadius,
      }),
      ...(input.minOrderAmount !== undefined && {
        minOrderAmount: new Prisma.Decimal(input.minOrderAmount),
      }),
      ...(input.deliveryFee !== undefined && {
        deliveryFee: new Prisma.Decimal(input.deliveryFee),
      }),
      ...(input.freeDeliveryAbove !== undefined && {
        freeDeliveryAbove: input.freeDeliveryAbove
          ? new Prisma.Decimal(input.freeDeliveryAbove)
          : null,
      }),
      ...(input.operatingHours !== undefined && {
        operatingHours: input.operatingHours,
      }),
      ...(input.isOpen !== undefined && { isOpen: input.isOpen }),
      ...(input.taxRate !== undefined && {
        taxRate: new Prisma.Decimal(input.taxRate),
      }),
      ...(input.taxInclusive !== undefined && {
        taxInclusive: input.taxInclusive,
      }),
    };

    if (config) {
      return this.db.storeConfig.update({
        where: { id: config.id },
        data: updateData,
      });
    } else {
      return this.db.storeConfig.create({
        data: {
          name: input.name || 'QuickMart',
          ...updateData,
        },
      });
    }
  }

  // ─── Sales Report ─────────────────────────────────────────────────

  async getSalesReport(startDate: Date, endDate: Date) {
    const orders = await this.db.order.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: { not: 'CANCELLED' },
      },
      include: {
        items: {
          include: { product: { select: { name: true, categoryId: true } } },
        },
      },
    });

    const dailyStats: Record<string, { orders: number; revenue: number }> = {};

    for (const order of orders) {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = { orders: 0, revenue: 0 };
      }
      dailyStats[dateKey].orders++;
      dailyStats[dateKey].revenue += Number(order.total);
    }

    return {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      summary: {
        totalOrders: orders.length,
        totalRevenue: orders.reduce((sum, o) => sum + Number(o.total), 0),
        avgOrderValue:
          orders.length > 0
            ? orders.reduce((sum, o) => sum + Number(o.total), 0) / orders.length
            : 0,
      },
      dailyBreakdown: Object.entries(dailyStats)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, stats]) => ({ date, ...stats })),
    };
  }

  // ─── Inventory Report ─────────────────────────────────────────────

  async getInventoryReport() {
    const products = await this.db.product.findMany({
      include: {
        category: { select: { name: true } },
        _count: { select: { orderItems: true } },
      },
      orderBy: { stockQuantity: 'asc' },
    });

    const lowStock = products.filter(
      (p) => p.stockQuantity <= p.lowStockThreshold,
    );
    const outOfStock = products.filter((p) => p.stockQuantity === 0);
    const totalValue = products.reduce(
      (sum, p) => sum + p.stockQuantity * Number(p.price),
      0,
    );

    return {
      summary: {
        totalProducts: products.length,
        totalValue,
        lowStockCount: lowStock.length,
        outOfStockCount: outOfStock.length,
      },
      lowStockProducts: lowStock.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category.name,
        stockQuantity: p.stockQuantity,
        lowStockThreshold: p.lowStockThreshold,
        totalSold: p._count.orderItems,
      })),
      outOfStockProducts: outOfStock.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category.name,
      })),
    };
  }

  // ─── CSV Bulk Product Import ──────────────────────────────────────

  async importProductsCsv(
    csvBuffer: Buffer,
    performedBy: string,
  ): Promise<{
    imported: number;
    updated: number;
    errors: Array<{ row: number; sku: string; error: string }>;
  }> {
    const csvText = csvBuffer.toString('utf-8');
    const rows = this.parseCsv(csvText);

    if (rows.length === 0) {
      throw new BadRequestException(
        'CSV file is empty or has no data rows. Required headers: sku,name,price,categoryId (or categorySlug)',
      );
    }

    let imported = 0;
    let updated = 0;
    const errors: Array<{ row: number; sku: string; error: string }> = [];

    // Pre-fetch all categories for slug resolution
    const categories = await this.db.category.findMany({
      select: { id: true, slug: true },
    });
    const categorySlugMap = new Map(categories.map((c) => [c.slug, c.id]));
    const categoryIdSet = new Set(categories.map((c) => c.id));

    // Process in batches of 50
    const batchSize = 50;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (row, batchIdx) => {
          const rowNum = i + batchIdx + 2; // +2 for 1-based index + header row
          try {
            await this.upsertProductFromCsvRow(
              row,
              performedBy,
              categorySlugMap,
              categoryIdSet,
            );
            // Check if it was an insert or update
            const existing = await this.db.product.findUnique({
              where: { sku: row.sku },
            });
            if (existing) {
              updated++;
            } else {
              imported++;
            }
          } catch (err: any) {
            errors.push({
              row: rowNum,
              sku: row.sku || '',
              error: err.message || 'Unknown error',
            });
          }
        }),
      );
    }

    this.logger.audit('CSV_PRODUCT_IMPORT', performedBy, {
      imported,
      updated,
      errorCount: errors.length,
      totalRows: rows.length,
    });

    return { imported, updated, errors };
  }

  private async upsertProductFromCsvRow(
    row: CsvProductRow,
    performedBy: string,
    categorySlugMap: Map<string, string>,
    categoryIdSet: Set<string>,
  ) {
    if (!row.sku || !row.sku.trim()) {
      throw new BadRequestException('SKU is required');
    }
    if (!row.name || !row.name.trim()) {
      throw new BadRequestException('Name is required');
    }
    if (!row.price || isNaN(Number(row.price))) {
      throw new BadRequestException('Valid price is required');
    }

    // Resolve category
    let categoryId = row.categoryId?.trim();
    if (!categoryId && row.categorySlug?.trim()) {
      categoryId = categorySlugMap.get(row.categorySlug.trim());
      if (!categoryId) {
        throw new BadRequestException(
          `Category slug "${row.categorySlug}" not found`,
        );
      }
    }
    if (!categoryId) {
      throw new BadRequestException('categoryId or categorySlug is required');
    }
    if (!categoryIdSet.has(categoryId)) {
      throw new BadRequestException(`Category ID "${categoryId}" not found`);
    }

    const slug = this.slugify(row.name.trim());
    const price = new Prisma.Decimal(Number(row.price));
    const discountedPrice =
      row.discountedPrice && !isNaN(Number(row.discountedPrice))
        ? new Prisma.Decimal(Number(row.discountedPrice))
        : null;
    const stockQuantity = row.stockQuantity
      ? parseInt(row.stockQuantity, 10)
      : 0;
    const lowStockThreshold = row.lowStockThreshold
      ? parseInt(row.lowStockThreshold, 10)
      : 10;
    const isAvailable =
      row.isAvailable !== undefined
        ? row.isAvailable.toLowerCase() === 'true' ||
          row.isAvailable === '1'
        : true;
    const isFeatured =
      row.isFeatured !== undefined
        ? row.isFeatured.toLowerCase() === 'true' || row.isFeatured === '1'
        : false;
    const tags = row.tags
      ? row.tags.split('|').map((t) => t.trim()).filter(Boolean)
      : [];

    const existing = await this.db.product.findUnique({
      where: { sku: row.sku.trim() },
    });

    if (existing) {
      // Update existing product
      const previousStock = existing.stockQuantity;
      await this.db.product.update({
        where: { sku: row.sku.trim() },
        data: {
          name: row.name.trim(),
          slug,
          description: row.description?.trim() || existing.description,
          price,
          discountedPrice,
          categoryId,
          unit: row.unit?.trim() || existing.unit,
          unitValue: row.unitValue
            ? new Prisma.Decimal(Number(row.unitValue))
            : existing.unitValue,
          stockQuantity,
          lowStockThreshold,
          isAvailable,
          isFeatured,
          tags: tags.length > 0 ? tags : existing.tags,
        },
      });

      if (stockQuantity !== previousStock) {
        await this.db.inventoryLog.create({
          data: {
            productId: existing.id,
            action: 'ADJUSTMENT',
            quantity: Math.abs(stockQuantity - previousStock),
            previousStock,
            newStock: stockQuantity,
            notes: 'CSV bulk import adjustment',
            performedBy,
          },
        });
      }
    } else {
      // Check for slug conflict
      const slugConflict = await this.db.product.findUnique({
        where: { slug },
      });
      const finalSlug = slugConflict ? `${slug}-${Date.now()}` : slug;

      const product = await this.db.product.create({
        data: {
          sku: row.sku.trim(),
          name: row.name.trim(),
          slug: finalSlug,
          description: row.description?.trim(),
          price,
          discountedPrice,
          categoryId,
          unit: row.unit?.trim() || 'piece',
          unitValue: row.unitValue
            ? new Prisma.Decimal(Number(row.unitValue))
            : new Prisma.Decimal(1),
          stockQuantity,
          lowStockThreshold,
          isAvailable,
          isFeatured,
          tags,
        },
      });

      if (stockQuantity > 0) {
        await this.db.inventoryLog.create({
          data: {
            productId: product.id,
            action: 'STOCK_IN',
            quantity: stockQuantity,
            previousStock: 0,
            newStock: stockQuantity,
            notes: 'CSV bulk import — initial stock',
            performedBy,
          },
        });
      }
    }
  }

  /** Minimal CSV parser — handles quoted fields and newlines inside quotes */
  private parseCsv(text: string): CsvProductRow[] {
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) return []; // Need at least header + 1 data row

    const headerLine = lines[0];
    const headers = this.parseCsvLine(headerLine).map((h) =>
      h.trim().replace(/^["']|["']$/g, ''),
    );

    const requiredHeaders = ['sku', 'name', 'price'];
    const missingHeaders = requiredHeaders.filter(
      (h) => !headers.includes(h),
    );
    if (missingHeaders.length > 0) {
      throw new BadRequestException(
        `Missing required CSV headers: ${missingHeaders.join(', ')}. ` +
          `Found headers: ${headers.join(', ')}`,
      );
    }

    const rows: CsvProductRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      if (values.length === 0 || values.every((v) => !v.trim())) continue;

      const row: any = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx]?.trim().replace(/^["']|["']$/g, '') || '';
      });
      rows.push(row as CsvProductRow);
    }

    return rows;
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (inQuotes) {
        if (char === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++; // Skip escaped quote
          } else {
            inQuotes = false;
          }
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
    }

    result.push(current);
    return result;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // ─── Batch Stock Update ───────────────────────────────────────────

  async batchUpdateStock(
    items: BatchStockItem[],
    performedBy: string,
  ): Promise<{
    updated: number;
    errors: Array<{ productId: string; error: string }>;
  }> {
    if (!items || items.length === 0) {
      throw new BadRequestException('At least one stock item is required');
    }
    if (items.length > 200) {
      throw new BadRequestException('Maximum 200 items per batch');
    }

    let updatedCount = 0;
    const errors: Array<{ productId: string; error: string }> = [];

    // Process in a transaction for consistency
    for (const item of items) {
      try {
        const product = await this.db.product.findUnique({
          where: { id: item.productId },
          select: { id: true, stockQuantity: true },
        });

        if (!product) {
          errors.push({
            productId: item.productId,
            error: 'Product not found',
          });
          continue;
        }

        const previousStock = product.stockQuantity;
        let newStock: number;

        switch (item.action) {
          case 'STOCK_IN':
            newStock = previousStock + Math.abs(item.quantity);
            break;
          case 'STOCK_OUT':
            newStock = Math.max(0, previousStock - Math.abs(item.quantity));
            break;
          case 'ADJUSTMENT':
            newStock = item.quantity;
            break;
          default:
            errors.push({
              productId: item.productId,
              error: `Invalid action: ${item.action}`,
            });
            continue;
        }

        await this.db.$transaction([
          this.db.product.update({
            where: { id: item.productId },
            data: { stockQuantity: newStock },
          }),
          this.db.inventoryLog.create({
            data: {
              productId: item.productId,
              action: item.action,
              quantity: Math.abs(item.quantity),
              previousStock,
              newStock,
              notes: item.notes || 'Batch stock update',
              performedBy,
            },
          }),
        ]);

        // Invalidate product cache
        await this.redis
          .del(`products:${item.productId}`)
          .catch(() => {});

        updatedCount++;
      } catch (err: any) {
        errors.push({
          productId: item.productId,
          error: err.message || 'Unknown error',
        });
      }
    }

    this.logger.audit('BATCH_STOCK_UPDATE', performedBy, {
      updated: updatedCount,
      errorCount: errors.length,
      totalItems: items.length,
    });

    return { updated: updatedCount, errors };
  }

  // ─── Admin User Management ────────────────────────────────────────

  async assignAdminRole(
    targetUserId: string,
    adminRole: 'OWNER' | 'MANAGER' | 'INVENTORY' | 'SUPPORT',
    performedBy: string,
  ) {
    const user = await this.db.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, role: true, adminRole: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new BadRequestException(
        'Can only assign admin roles to ADMIN or SUPER_ADMIN users',
      );
    }

    const updated = await this.db.user.update({
      where: { id: targetUserId },
      data: { adminRole },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        adminRole: true,
      },
    });

    this.logger.audit('ADMIN_ROLE_ASSIGNED', performedBy, {
      targetUserId,
      adminRole,
      previousAdminRole: user.adminRole,
    });

    return updated;
  }

  async listAdminUsers() {
    return this.db.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        adminRole: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── CSV Template ─────────────────────────────────────────────────

  getCsvTemplate(): string {
    const headers = [
      'sku',
      'name',
      'description',
      'price',
      'discountedPrice',
      'categoryId',
      'categorySlug',
      'unit',
      'unitValue',
      'stockQuantity',
      'lowStockThreshold',
      'isAvailable',
      'isFeatured',
      'tags',
    ];
    const exampleRow = [
      'PROD-001',
      'Organic Bananas',
      'Fresh organic bananas',
      '49.99',
      '39.99',
      '',
      'fruits',
      'kg',
      '1',
      '100',
      '10',
      'true',
      'false',
      'organic|fresh|fruit',
    ];
    return headers.join(',') + '\n' + exampleRow.join(',') + '\n';
  }
}
