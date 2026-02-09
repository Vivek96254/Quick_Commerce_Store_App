import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class AuditLogService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Persist an audit record in the database.
   * Silently swallows errors so the calling flow is never disrupted.
   */
  async record(params: {
    userId: string;
    action: string;
    resource: string;
    resourceId?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      await this.db.auditLog.create({
        data: {
          userId: params.userId,
          action: params.action,
          resource: params.resource,
          resourceId: params.resourceId,
          details: params.details ?? undefined,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      });
    } catch {
      // Non-critical — never block the request
    }
  }

  /** Admin: paginated audit log list */
  async findAll(params: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 50));

    const where: any = {
      ...(params.userId && { userId: params.userId }),
      ...(params.action && { action: params.action }),
      ...(params.resource && { resource: params.resource }),
      ...(params.startDate || params.endDate
        ? {
            createdAt: {
              ...(params.startDate && { gte: params.startDate }),
              ...(params.endDate && { lte: params.endDate }),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.db.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      }),
      this.db.auditLog.count({ where }),
    ]);

    return {
      items: items.map((log) => ({
        id: log.id,
        userId: log.userId,
        user: log.user,
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId,
        details: log.details,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        createdAt: log.createdAt.toISOString(),
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
}
