import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { LoggerService } from '../services/logger.service';

/**
 * Guard that prevents duplicate webhook processing.
 *
 * Requires the request body to contain `provider` and `eventId`.
 * If the combination has already been processed, the guard short-circuits
 * with a 200 (avoids throwing so payment providers receive an OK).
 */
@Injectable()
export class WebhookDedupGuard implements CanActivate {
  constructor(
    private readonly db: DatabaseService,
    private readonly logger: LoggerService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const provider: string | undefined =
      request.body?.provider || request.params?.provider;
    const eventId: string | undefined =
      request.body?.eventId ||
      request.body?.id ||
      request.headers['x-webhook-id'];

    if (!provider || !eventId) {
      // Let the handler decide how to deal with missing fields
      return true;
    }

    const existing = await this.db.webhookEvent.findUnique({
      where: {
        provider_eventId: { provider, eventId },
      },
    });

    if (existing) {
      this.logger.log(
        `Duplicate webhook ignored: ${provider}/${eventId}`,
        'WebhookDedupGuard',
      );
      // Respond 200 so the provider stops retrying
      response.status(200).json({ message: 'Already processed' });
      return false;
    }

    // Store the event (will be marked processed by the handler)
    await this.db.webhookEvent.create({
      data: {
        provider,
        eventId,
        eventType: request.body?.type || request.body?.event || 'unknown',
        payload: request.body || {},
      },
    });

    return true;
  }
}
