import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { strategies, strategyVersions } from '@journalx/db';
import { eq, desc, isNull } from 'drizzle-orm';
import {
  CreateStrategyDto,
  UpdateStrategyDto,
  CreateStrategyVersionDto,
  UpdateStrategyVersionDto,
} from './dto/create-strategy.dto.js';
import { AuditService } from '../../common/services/audit.service.js';
import { AuditAction, StrategyVersionStatus } from '@journalx/domain';

@Injectable()
export class StrategiesService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly auditService: AuditService,
  ) {}

  async listStrategies(includeArchived = false) {
    let query = this.databaseService.db.select().from(strategies).$dynamic();
    if (!includeArchived) {
      query = query.where(isNull(strategies.archivedAt));
    }
    const allStrategies = await query.orderBy(desc(strategies.createdAt));

    const results: Array<typeof strategies.$inferSelect & { currentPublishedVersion: typeof strategyVersions.$inferSelect | null }> = [];
    for (const strat of allStrategies) {
      let currentPublishedVersion: typeof strategyVersions.$inferSelect | null = null;
      if (strat.currentPublishedVersionId) {
        const [v] = await this.databaseService.db
          .select()
          .from(strategyVersions)
          .where(eq(strategyVersions.id, strat.currentPublishedVersionId))
          .limit(1);
        currentPublishedVersion = v ?? null;
      }
      results.push({
        ...strat,
        currentPublishedVersion,
      });
    }

    return results;
  }

  async getStrategyById(id: string) {
    const [strategy] = await this.databaseService.db
      .select()
      .from(strategies)
      .where(eq(strategies.id, id))
      .limit(1);

    if (!strategy) {
      throw new NotFoundException(`Strategy '${id}' not found.`);
    }

    let currentPublishedVersion: typeof strategyVersions.$inferSelect | null = null;
    if (strategy.currentPublishedVersionId) {
      const [v] = await this.databaseService.db
        .select()
        .from(strategyVersions)
        .where(eq(strategyVersions.id, strategy.currentPublishedVersionId))
        .limit(1);
      currentPublishedVersion = v ?? null;
    }

    const versions = await this.databaseService.db
      .select()
      .from(strategyVersions)
      .where(eq(strategyVersions.strategyId, id))
      .orderBy(desc(strategyVersions.versionNumber));

    return {
      ...strategy,
      currentPublishedVersion,
      versions,
    };
  }

  async createStrategy(dto: CreateStrategyDto, requestId?: string) {
    const [createdStrategy] = await this.databaseService.db
      .insert(strategies)
      .values({
        name: dto.name,
        description: dto.description ?? null,
      })
      .returning();

    const isPublished = dto.publishImmediately ?? false;

    const [createdVersion] = await this.databaseService.db
      .insert(strategyVersions)
      .values({
        strategyId: createdStrategy.id,
        versionNumber: 1,
        status: isPublished ? StrategyVersionStatus.PUBLISHED : StrategyVersionStatus.DRAFT,
        rules: dto.rules,
        checklist: dto.checklist,
        narrative: dto.narrative ?? null,
        publishedAt: isPublished ? new Date() : null,
      })
      .returning();

    if (isPublished) {
      await this.databaseService.db
        .update(strategies)
        .set({
          currentPublishedVersionId: createdVersion.id,
          updatedAt: new Date(),
        })
        .where(eq(strategies.id, createdStrategy.id));
    }

    await this.auditService.record({
      entityType: 'strategies',
      entityId: createdStrategy.id,
      action: AuditAction.CREATE,
      afterJson: { strategy: createdStrategy, version: createdVersion },
      requestId,
    });

    return {
      ...createdStrategy,
      currentPublishedVersionId: isPublished ? createdVersion.id : null,
      currentPublishedVersion: isPublished ? createdVersion : null,
      versions: [createdVersion],
    };
  }

  async updateStrategy(id: string, dto: UpdateStrategyDto, requestId?: string) {
    const [strategy] = await this.databaseService.db
      .select()
      .from(strategies)
      .where(eq(strategies.id, id))
      .limit(1);

    if (!strategy) {
      throw new NotFoundException(`Strategy '${id}' not found.`);
    }

    const updatePayload: Partial<typeof strategies.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (dto.name !== undefined) updatePayload.name = dto.name;
    if (dto.description !== undefined) updatePayload.description = dto.description;

    const [updated] = await this.databaseService.db
      .update(strategies)
      .set(updatePayload)
      .where(eq(strategies.id, id))
      .returning();

    await this.auditService.record({
      entityType: 'strategies',
      entityId: id,
      action: AuditAction.UPDATE,
      beforeJson: strategy,
      afterJson: updated,
      requestId,
    });

    return updated;
  }

  async archiveStrategy(id: string, requestId?: string) {
    const [strategy] = await this.databaseService.db
      .select()
      .from(strategies)
      .where(eq(strategies.id, id))
      .limit(1);

    if (!strategy) {
      throw new NotFoundException(`Strategy '${id}' not found.`);
    }

    const [updated] = await this.databaseService.db
      .update(strategies)
      .set({
        archivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(strategies.id, id))
      .returning();

    await this.auditService.record({
      entityType: 'strategies',
      entityId: id,
      action: AuditAction.ARCHIVE,
      beforeJson: strategy,
      afterJson: updated,
      requestId,
    });

    return updated;
  }

  async listVersions(strategyId: string) {
    return this.databaseService.db
      .select()
      .from(strategyVersions)
      .where(eq(strategyVersions.strategyId, strategyId))
      .orderBy(desc(strategyVersions.versionNumber));
  }

  async getVersionById(strategyId: string, versionId: string) {
    const [version] = await this.databaseService.db
      .select()
      .from(strategyVersions)
      .where(eq(strategyVersions.id, versionId))
      .limit(1);

    if (!version || version.strategyId !== strategyId) {
      throw new NotFoundException(`Strategy version '${versionId}' not found for strategy '${strategyId}'.`);
    }

    return version;
  }

  async createDraftVersion(strategyId: string, dto: CreateStrategyVersionDto, requestId?: string) {
    const [strategy] = await this.databaseService.db
      .select()
      .from(strategies)
      .where(eq(strategies.id, strategyId))
      .limit(1);

    if (!strategy) {
      throw new NotFoundException(`Strategy '${strategyId}' not found.`);
    }

    // Determine next version number
    const versions = await this.databaseService.db
      .select()
      .from(strategyVersions)
      .where(eq(strategyVersions.strategyId, strategyId))
      .orderBy(desc(strategyVersions.versionNumber))
      .limit(1);

    const nextVersionNumber = versions.length > 0 ? versions[0].versionNumber + 1 : 1;

    const [createdVersion] = await this.databaseService.db
      .insert(strategyVersions)
      .values({
        strategyId,
        versionNumber: nextVersionNumber,
        status: StrategyVersionStatus.DRAFT,
        rules: dto.rules,
        checklist: dto.checklist,
        narrative: dto.narrative ?? null,
      })
      .returning();

    await this.auditService.record({
      entityType: 'strategy_versions',
      entityId: createdVersion.id,
      action: AuditAction.CREATE,
      afterJson: createdVersion,
      requestId,
    });

    return createdVersion;
  }

  async updateDraftVersion(
    strategyId: string,
    versionId: string,
    dto: UpdateStrategyVersionDto,
    requestId?: string,
  ) {
    const version = await this.getVersionById(strategyId, versionId);

    if (version.status === StrategyVersionStatus.PUBLISHED) {
      throw new BadRequestException('Published strategy versions are immutable and cannot be updated.');
    }

    const updatePayload: Partial<typeof strategyVersions.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (dto.rules !== undefined) updatePayload.rules = dto.rules;
    if (dto.checklist !== undefined) updatePayload.checklist = dto.checklist;
    if (dto.narrative !== undefined) updatePayload.narrative = dto.narrative;

    const [updated] = await this.databaseService.db
      .update(strategyVersions)
      .set(updatePayload)
      .where(eq(strategyVersions.id, versionId))
      .returning();

    await this.auditService.record({
      entityType: 'strategy_versions',
      entityId: versionId,
      action: AuditAction.UPDATE,
      beforeJson: version,
      afterJson: updated,
      requestId,
    });

    return updated;
  }

  async publishVersion(strategyId: string, versionId: string, requestId?: string) {
    const version = await this.getVersionById(strategyId, versionId);

    const [updatedVersion] = await this.databaseService.db
      .update(strategyVersions)
      .set({
        status: StrategyVersionStatus.PUBLISHED,
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(strategyVersions.id, versionId))
      .returning();

    await this.databaseService.db
      .update(strategies)
      .set({
        currentPublishedVersionId: versionId,
        updatedAt: new Date(),
      })
      .where(eq(strategies.id, strategyId));

    await this.auditService.record({
      entityType: 'strategy_versions',
      entityId: versionId,
      action: AuditAction.PUBLISH,
      beforeJson: version,
      afterJson: updatedVersion,
      requestId,
    });

    return updatedVersion;
  }
}
