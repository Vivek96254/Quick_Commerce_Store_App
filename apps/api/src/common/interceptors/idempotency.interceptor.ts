import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { IdempotencyService } from '../services/idempotency.service';

/**
 * Idempotency interceptor — reads the `Idempotency-Key` header.
 * Apply to individual routes via `@UseInterceptors(IdempotencyInterceptor)`.
 *
 * Behaviour:
 *  - No header → pass through (no idempotency enforcement)
 *  - Header present + cached match → return cached response
 *  - Header present + payload mismatch → 409
 *  - Header present + new → process, then cache result
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly idempotencyService: IdempotencyService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const idempotencyKey: string | undefined =
      request.headers['idempotency-key'];

    // No header → skip
    if (!idempotencyKey) {
      return next.handle();
    }

    const requestHash = this.idempotencyService.hashPayload(request.body);

    // Check for existing result
    const cached = await this.idempotencyService.check(
      idempotencyKey,
      requestHash,
    );

    if (cached) {
      // Return cached response, wrapping in the same envelope the TransformInterceptor uses
      const response = context.switchToHttp().getResponse();
      response.status(cached.statusCode);
      return of(cached.responsePayload);
    }

    // Reserve the key
    await this.idempotencyService.reserve(idempotencyKey, requestHash);

    return next.handle().pipe(
      tap(async (data) => {
        // Store the successful response
        await this.idempotencyService.store(
          idempotencyKey,
          HttpStatus.OK,
          data,
        );
      }),
      catchError(async (error) => {
        // Remove reservation so client can retry
        await this.idempotencyService.remove(idempotencyKey);
        throw error;
      }),
    );
  }
}
