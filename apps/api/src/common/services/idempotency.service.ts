import { Injectable, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { LoggerService } from './logger.service';
import * as crypto from 'crypto';

@Injectable()
export class IdempotencyService {
  private readonly EXPIRY_HOURS = 24;

  constructor(
    private readonly db: DatabaseService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Compute a SHA-256 hash of the request body for payload comparison.
   */
  hashPayload(body: unknown): string {
    const serialized = JSON.stringify(body ?? {});
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  /**
   * Check for an existing idempotency record.
   * - Same key + same payload hash → return cached response
   * - Same key + different payload hash → throw 409
   * - No record → return null (caller should proceed)
   */
  async check(
    key: string,
    requestHash: string,
  ): Promise<{ statusCode: number; responsePayload: unknown } | null> {
    const existing = await this.db.idempotencyKey.findUnique({
      where: { key },
    });

    if (!existing) {
      return null;
    }

    // Expired entry — treat as new request
    if (existing.expiresAt < new Date()) {
      await this.db.idempotencyKey.delete({ where: { id: existing.id } });
      return null;
    }

    // Same key, different payload → conflict
    if (existing.requestHash !== requestHash) {
      throw new ConflictException(
        'Idempotency key already used with a different request payload',
      );
    }

    // Same key, same payload → return cached response
    if (existing.responsePayload !== null && existing.statusCode !== null) {
      this.logger.debug(
        `Idempotency cache hit for key: ${key}`,
        'IdempotencyService',
      );
      return {
        statusCode: existing.statusCode,
        responsePayload: existing.responsePayload,
      };
    }

    // Record exists but response not yet stored (concurrent request in progress)
    // Wait briefly and retry once, then conflict
    throw new ConflictException(
      'A request with this idempotency key is already being processed',
    );
  }

  /**
   * Reserve a slot for this idempotency key before processing.
   */
  async reserve(key: string, requestHash: string): Promise<void> {
    const expiresAt = new Date(
      Date.now() + this.EXPIRY_HOURS * 60 * 60 * 1000,
    );

    await this.db.idempotencyKey.create({
      data: {
        key,
        requestHash,
        expiresAt,
      },
    });
  }

  /**
   * Store the response after successful processing.
   */
  async store(
    key: string,
    statusCode: number,
    responsePayload: unknown,
  ): Promise<void> {
    await this.db.idempotencyKey.update({
      where: { key },
      data: {
        statusCode,
        responsePayload: responsePayload as any,
      },
    });
  }

  /**
   * Remove a reserved key if processing fails (allows retry).
   */
  async remove(key: string): Promise<void> {
    await this.db.idempotencyKey.deleteMany({ where: { key } });
  }

  /**
   * Cleanup expired idempotency keys (called by cron).
   */
  async cleanupExpired(): Promise<number> {
    const result = await this.db.idempotencyKey.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }
}
