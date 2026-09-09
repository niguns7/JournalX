import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { tradingAccounts } from '@journalx/db';
import { eq, desc } from 'drizzle-orm';
import { CreateAccountDto } from './dto/create-account.dto.js';
import { UpdateAccountDto } from './dto/update-account.dto.js';
import { AuditService } from '../../common/services/audit.service.js';
import { AccountStatus, AuditAction } from '@journalx/domain';

@Injectable()
export class AccountsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly auditService: AuditService,
  ) {}

  async listAccounts(status?: AccountStatus) {
    let query = this.databaseService.db.select().from(tradingAccounts).$dynamic();
    if (status) {
      query = query.where(eq(tradingAccounts.status, status));
    }
    return query.orderBy(desc(tradingAccounts.createdAt));
  }

  async getAccountById(id: string) {
    const rows = await this.databaseService.db
      .select()
      .from(tradingAccounts)
      .where(eq(tradingAccounts.id, id))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException(`Trading account '${id}' not found.`);
    }

    return rows[0];
  }

  async createAccount(dto: CreateAccountDto, requestId?: string) {
    const [created] = await this.databaseService.db
      .insert(tradingAccounts)
      .values({
        name: dto.name,
        type: dto.type,
        currency: dto.currency || 'USD',
        nominalSize: dto.nominalSize ?? null,
        riskBasisAmount: dto.riskBasisAmount ?? null,
        status: dto.status ?? AccountStatus.ACTIVE,
        notes: dto.notes ?? null,
        riskDefaults: dto.riskDefaultsJson ?? null,
      })
      .returning();

    await this.auditService.record({
      entityType: 'trading_accounts',
      entityId: created.id,
      action: AuditAction.CREATE,
      afterJson: created,
      requestId,
    });

    return created;
  }

  async updateAccount(id: string, dto: UpdateAccountDto, requestId?: string) {
    const current = await this.getAccountById(id);

    if (dto.expectedVersion !== undefined && current.version !== dto.expectedVersion) {
      throw new ConflictException(
        `Version conflict: current version is ${current.version}, expected ${dto.expectedVersion}.`,
      );
    }

    const updatePayload: Partial<typeof tradingAccounts.$inferInsert> = {
      version: current.version + 1,
      updatedAt: new Date(),
    };

    if (dto.name !== undefined) updatePayload.name = dto.name;
    if (dto.type !== undefined) updatePayload.type = dto.type;
    if (dto.currency !== undefined) updatePayload.currency = dto.currency;
    if (dto.nominalSize !== undefined) updatePayload.nominalSize = dto.nominalSize;
    if (dto.riskBasisAmount !== undefined) updatePayload.riskBasisAmount = dto.riskBasisAmount;
    if (dto.status !== undefined) updatePayload.status = dto.status;
    if (dto.notes !== undefined) updatePayload.notes = dto.notes;
    if (dto.riskDefaultsJson !== undefined) updatePayload.riskDefaults = dto.riskDefaultsJson;

    const [updated] = await this.databaseService.db
      .update(tradingAccounts)
      .set(updatePayload)
      .where(eq(tradingAccounts.id, id))
      .returning();

    await this.auditService.record({
      entityType: 'trading_accounts',
      entityId: id,
      action: AuditAction.UPDATE,
      beforeJson: current,
      afterJson: updated,
      requestId,
    });

    return updated;
  }

  async archiveAccount(id: string, requestId?: string) {
    const current = await this.getAccountById(id);

    const [updated] = await this.databaseService.db
      .update(tradingAccounts)
      .set({
        status: AccountStatus.ARCHIVED,
        version: current.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(tradingAccounts.id, id))
      .returning();

    await this.auditService.record({
      entityType: 'trading_accounts',
      entityId: id,
      action: AuditAction.ARCHIVE,
      beforeJson: current,
      afterJson: updated,
      requestId,
    });

    return updated;
  }
}
