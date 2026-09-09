import { Injectable, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../../modules/database/database.service.js';
import { idempotencyRequests } from '@journalx/db';
import { eq, and } from 'drizzle-orm';
import * as crypto from 'crypto';

export interface IdempotencyCheckResult {
  isCached: boolean;
  statusCode?: number;
  body?: unknown;
}

@Injectable()
export class IdempotencyService {
  constructor(private readonly databaseService: DatabaseService) {}

  hashPayload(payload: unknown): string {
    const serialized = JSON.stringify(payload ?? {});
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  async check(
    operation: string,
    key: string,
    payload: unknown,
    tx?: any,
  ): Promise<IdempotencyCheckResult> {
    const db = tx ?? this.databaseService.db;
    const requestHash = this.hashPayload(payload);

    const existing = await db
      .select()
      .from(idempotencyRequests)
      .where(and(eq(idempotencyRequests.operation, operation), eq(idempotencyRequests.key, key)))
      .limit(1);

    if (existing.length > 0) {
      const record = existing[0];
      if (record.requestHash !== requestHash) {
        throw new ConflictException(
          `Idempotency-Key '${key}' has already been used with a different request payload.`,
        );
      }

      if (record.status === 'COMPLETED' && record.resultBody !== null) {
        return {
          isCached: true,
          statusCode: record.resultStatus ?? 200,
          body: record.resultBody,
        };
      }

      if (record.status === 'PENDING') {
        throw new ConflictException(
          `Operation with Idempotency-Key '${key}' is currently being processed.`,
        );
      }
    }

    return { isCached: false };
  }

  async saveResult(
    operation: string,
    key: string,
    payload: unknown,
    statusCode: number,
    resultBody: unknown,
    resourceId?: string,
    tx?: any,
  ): Promise<void> {
    const db = tx ?? this.databaseService.db;
    const requestHash = this.hashPayload(payload);

    await db
      .insert(idempotencyRequests)
      .values({
        operation,
        key,
        requestHash,
        resultStatus: statusCode,
        resultBody: resultBody as any,
        resultResourceId: resourceId ?? null,
        status: 'COMPLETED',
      })
      .onConflictDoUpdate({
        target: [idempotencyRequests.operation, idempotencyRequests.key],
        set: {
          resultStatus: statusCode,
          resultBody: resultBody as any,
          resultResourceId: resourceId ?? null,
          status: 'COMPLETED',
          updatedAt: new Date(),
        },
      });
  }
}
