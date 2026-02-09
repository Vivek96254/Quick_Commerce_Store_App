import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class SessionTrackingService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Create a new tracked session when a user authenticates.
   */
  async createSession(params: {
    userId: string;
    deviceInfo?: string;
    ipAddress?: string;
    userAgent?: string;
    ttlMs?: number;
  }) {
    const ttl = params.ttlMs || 7 * 24 * 60 * 60 * 1000; // default 7 days
    const expiresAt = new Date(Date.now() + ttl);

    return this.db.userSession.create({
      data: {
        userId: params.userId,
        deviceInfo: params.deviceInfo,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        expiresAt,
      },
    });
  }

  /** Touch last-active timestamp for a session */
  async touch(sessionId: string): Promise<void> {
    await this.db.userSession
      .update({
        where: { id: sessionId },
        data: { lastActiveAt: new Date() },
      })
      .catch(() => {});
  }

  /** List active sessions for a user */
  async listUserSessions(userId: string) {
    const sessions = await this.db.userSession.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActiveAt: 'desc' },
    });

    return sessions.map((s) => ({
      id: s.id,
      deviceInfo: s.deviceInfo,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      lastActiveAt: s.lastActiveAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
    }));
  }

  /** Revoke a single session */
  async revokeSession(sessionId: string, userId: string): Promise<void> {
    await this.db.userSession.updateMany({
      where: { id: sessionId, userId },
      data: { revokedAt: new Date() },
    });
  }

  /** Revoke all sessions except the current one */
  async revokeOtherSessions(
    userId: string,
    currentSessionId: string,
  ): Promise<number> {
    const result = await this.db.userSession.updateMany({
      where: {
        userId,
        id: { not: currentSessionId },
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    return result.count;
  }

  /** Cleanup expired sessions (called by cron) */
  async cleanupExpiredSessions(): Promise<number> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await this.db.userSession.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { revokedAt: { lt: oneDayAgo } },
        ],
      },
    });
    return result.count;
  }
}
