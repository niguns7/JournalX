import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../modules/database/database.service.js';
import { auditEvents } from '@journalx/db';
import { AuditAction } from '@journalx/domain';

export interface RecordAuditInput {
  entityType: string;
  entityId: string;
  action: AuditAction;
  reason?: string | null;
  beforeJson?: unknown;
  afterJson?: unknown;
  requestId?: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async record(input: RecordAuditInput, tx?: any): Promise<void> {
    const db = tx ?? this.databaseService.db;
    try {
      await db.insert(auditEvents).values({
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        reason: input.reason ?? null,
        beforeJson: input.beforeJson ?? null,
        afterJson: input.afterJson ?? null,
        requestId: input.requestId ?? null,
      });
    } catch (err) {
      this.logger.error(`Failed to record audit event for ${input.entityType}:${input.entityId}`, err);
      throw err;
    }
  }
}
