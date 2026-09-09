import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { appSettings } from '@journalx/db';
import { eq } from 'drizzle-orm';
import { UpdateSettingsDto } from './dto/update-settings.dto.js';
import { AuditService } from '../../common/services/audit.service.js';
import { AuditAction } from '@journalx/domain';

@Injectable()
export class SettingsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly auditService: AuditService,
  ) {}

  async getSettings() {
    const rows = await this.databaseService.db
      .select()
      .from(appSettings)
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException('Application settings have not been initialized.');
    }

    return rows[0];
  }

  async updateSettings(dto: UpdateSettingsDto, requestId?: string) {
    const current = await this.getSettings();

    if (dto.expectedVersion !== undefined && current.version !== dto.expectedVersion) {
      throw new ConflictException(
        `Version conflict: current version is ${current.version}, expected ${dto.expectedVersion}.`,
      );
    }

    const updatePayload: Partial<typeof appSettings.$inferInsert> = {
      version: current.version + 1,
      updatedAt: new Date(),
    };

    if (dto.journalTimezone !== undefined) updatePayload.journalTimezone = dto.journalTimezone;
    if (dto.displayTimezone !== undefined) updatePayload.displayTimezone = dto.displayTimezone;
    if (dto.currency !== undefined) updatePayload.currency = dto.currency;
    if (dto.defaultAccountId !== undefined) updatePayload.defaultAccountId = dto.defaultAccountId;
    if (dto.preferencesJson !== undefined) updatePayload.preferences = dto.preferencesJson;

    const [updated] = await this.databaseService.db
      .update(appSettings)
      .set(updatePayload)
      .where(eq(appSettings.id, current.id))
      .returning();

    await this.auditService.record({
      entityType: 'app_settings',
      entityId: current.id,
      action: AuditAction.UPDATE,
      beforeJson: current,
      afterJson: updated,
      requestId,
    });

    return updated;
  }
}
