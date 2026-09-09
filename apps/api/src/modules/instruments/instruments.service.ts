import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { instruments } from '@journalx/db';
import { eq, isNull } from 'drizzle-orm';
import { CreateInstrumentDto, UpdateInstrumentDto } from './dto/create-instrument.dto.js';
import { AuditService } from '../../common/services/audit.service.js';
import { AuditAction } from '@journalx/domain';

@Injectable()
export class InstrumentsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly auditService: AuditService,
  ) {}

  async listInstruments(includeArchived = false) {
    let query = this.databaseService.db.select().from(instruments).$dynamic();
    if (!includeArchived) {
      query = query.where(isNull(instruments.archivedAt));
    }
    return query;
  }

  async getInstrumentById(id: string) {
    const rows = await this.databaseService.db
      .select()
      .from(instruments)
      .where(eq(instruments.id, id))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException(`Instrument '${id}' not found.`);
    }

    return rows[0];
  }

  async getInstrumentBySymbol(symbol: string) {
    const rows = await this.databaseService.db
      .select()
      .from(instruments)
      .where(eq(instruments.symbol, symbol))
      .limit(1);

    return rows[0] ?? null;
  }

  async createInstrument(dto: CreateInstrumentDto, requestId?: string) {
    const existing = await this.getInstrumentBySymbol(dto.symbol);
    if (existing) {
      throw new ConflictException(`Instrument with symbol '${dto.symbol}' already exists.`);
    }

    const [created] = await this.databaseService.db
      .insert(instruments)
      .values({
        symbol: dto.symbol.toUpperCase(),
        displayName: dto.displayName,
        tickSize: dto.tickSize,
        pointValue: dto.pointValue,
        currency: dto.currency || 'USD',
        verifiedSource: dto.verifiedSource ?? null,
        verifiedAt: dto.verifiedAt ? new Date(dto.verifiedAt) : null,
      })
      .returning();

    await this.auditService.record({
      entityType: 'instruments',
      entityId: created.id,
      action: AuditAction.CREATE,
      afterJson: created,
      requestId,
    });

    return created;
  }

  async updateInstrument(id: string, dto: UpdateInstrumentDto, requestId?: string) {
    const current = await this.getInstrumentById(id);

    const updatePayload: Partial<typeof instruments.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (dto.displayName !== undefined) updatePayload.displayName = dto.displayName;
    if (dto.tickSize !== undefined) updatePayload.tickSize = dto.tickSize;
    if (dto.pointValue !== undefined) updatePayload.pointValue = dto.pointValue;
    if (dto.currency !== undefined) updatePayload.currency = dto.currency;
    if (dto.verifiedSource !== undefined) updatePayload.verifiedSource = dto.verifiedSource;
    if (dto.verifiedAt !== undefined)
      updatePayload.verifiedAt = dto.verifiedAt ? new Date(dto.verifiedAt) : null;

    const [updated] = await this.databaseService.db
      .update(instruments)
      .set(updatePayload)
      .where(eq(instruments.id, id))
      .returning();

    await this.auditService.record({
      entityType: 'instruments',
      entityId: id,
      action: AuditAction.UPDATE,
      beforeJson: current,
      afterJson: updated,
      requestId,
    });

    return updated;
  }

  async archiveInstrument(id: string, requestId?: string) {
    const current = await this.getInstrumentById(id);

    const [updated] = await this.databaseService.db
      .update(instruments)
      .set({
        archivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(instruments.id, id))
      .returning();

    await this.auditService.record({
      entityType: 'instruments',
      entityId: id,
      action: AuditAction.ARCHIVE,
      beforeJson: current,
      afterJson: updated,
      requestId,
    });

    return updated;
  }
}
