import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { LoggerService } from './logger.service';

@Injectable()
export class PushNotificationService {
  constructor(
    private readonly db: DatabaseService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Register or update a push notification token for a user.
   * If the token already exists for another user, it is reassigned.
   */
  async registerToken(params: {
    userId: string;
    token: string;
    platform: 'fcm' | 'apns' | 'web';
    deviceId?: string;
  }) {
    // Upsert by token (a device token belongs to one user at a time)
    const existing = await this.db.pushToken.findUnique({
      where: { token: params.token },
    });

    if (existing) {
      return this.db.pushToken.update({
        where: { token: params.token },
        data: {
          userId: params.userId,
          platform: params.platform,
          deviceId: params.deviceId,
          isActive: true,
        },
      });
    }

    return this.db.pushToken.create({
      data: {
        userId: params.userId,
        token: params.token,
        platform: params.platform,
        deviceId: params.deviceId,
      },
    });
  }

  /** Remove a push token (on logout or uninstall) */
  async removeToken(token: string): Promise<void> {
    await this.db.pushToken.deleteMany({ where: { token } });
  }

  /** Deactivate all tokens for a user (e.g., when account is disabled) */
  async deactivateUserTokens(userId: string): Promise<void> {
    await this.db.pushToken.updateMany({
      where: { userId },
      data: { isActive: false },
    });
  }

  /** Get active tokens for a user (to send push) */
  async getActiveTokens(userId: string) {
    return this.db.pushToken.findMany({
      where: { userId, isActive: true },
    });
  }

  /**
   * Send push notification to a user.
   * This is a stub — integrate with FCM / APNs in production.
   */
  async sendToUser(
    userId: string,
    notification: {
      title: string;
      body: string;
      data?: Record<string, string>;
    },
  ): Promise<{ sent: number; failed: number }> {
    const tokens = await this.getActiveTokens(userId);

    if (tokens.length === 0) {
      return { sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    for (const pushToken of tokens) {
      try {
        // TODO: Replace with actual FCM / APNs call
        // await this.fcm.send({ token: pushToken.token, notification, data })
        this.logger.debug(
          `[PUSH STUB] → ${pushToken.platform}/${pushToken.token.slice(0, 12)}… — ${notification.title}`,
          'PushNotificationService',
        );
        sent++;
      } catch {
        // Mark broken tokens as inactive
        await this.db.pushToken.update({
          where: { id: pushToken.id },
          data: { isActive: false },
        });
        failed++;
      }
    }

    return { sent, failed };
  }
}
