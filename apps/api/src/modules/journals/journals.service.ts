import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import {
  dailyJournals,
  journalAccountLimits,
  journalWindows,
  economicEvents,
  timeframeAnalyses,
  marketZones,
  journalScenarios,
  quarterObservations,
  tradingAccounts,
  trades,
  appSettings,
} from '@journalx/db';
import { eq, and, gte, lte, desc, count, sql } from 'drizzle-orm';
import {
  CreateJournalDto,
  UpdateJournalDto,
  CompleteJournalReviewDto,
  ReopenJournalDto,
  CreateWindowDto,
  UpdateWindowDto,
  CreateEconomicEventDto,
  UpdateEconomicEventDto,
  CreateTimeframeAnalysisDto,
  UpdateTimeframeAnalysisDto,
  CreateMarketZoneDto,
  UpdateMarketZoneDto,
  CreateScenarioDto,
  UpdateScenarioDto,
  CreateQuarterObservationDto,
  UpdateQuarterObservationDto,
  UpdateJournalAccountLimitDto,
} from './dto/journal.dto.js';
import { AuditService } from '../../common/services/audit.service.js';
import {
  AccountStatus,
  AuditAction,
  DailyGrade,
  JournalStatus,
  TradeState,
  calculateDailyProcessScore,
} from '@journalx/domain';

@Injectable()
export class JournalsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly auditService: AuditService,
  ) {}

  async createOrGetJournal(dto: CreateJournalDto, requestId?: string) {
    const existing = await this.databaseService.db
      .select()
      .from(dailyJournals)
      .where(eq(dailyJournals.journalDate, dto.journalDate))
      .limit(1);

    if (existing.length > 0) {
      return this.getJournalById(existing[0].id);
    }

    let timezoneSnapshot = dto.timezoneSnapshot;
    if (!timezoneSnapshot) {
      const rows = await this.databaseService.db
        .select()
        .from(appSettings)
        .limit(1);
      timezoneSnapshot = rows[0]?.journalTimezone || 'Asia/Kathmandu';
    }

    const [created] = await this.databaseService.db
      .insert(dailyJournals)
      .values({
        journalDate: dto.journalDate,
        timezoneSnapshot,
        status: JournalStatus.DRAFT,
      })
      .returning();

    // Snapshot active account limits for this journal date
    const activeAccounts = await this.databaseService.db
      .select()
      .from(tradingAccounts)
      .where(eq(tradingAccounts.status, AccountStatus.ACTIVE));

    for (const acc of activeAccounts) {
      const defaults = acc.riskDefaults;
      await this.databaseService.db
        .insert(journalAccountLimits)
        .values({
          journalId: created.id,
          accountId: acc.id,
          maxTrades: defaults?.maxDailyTrades ?? null,
          maxDailyLoss: defaults?.maxDailyLoss ?? null,
          consecutiveLossLimit: defaults?.consecutiveLossLimit ?? null,
        })
        .onConflictDoNothing();
    }

    await this.auditService.record({
      entityType: 'daily_journals',
      entityId: created.id,
      action: AuditAction.CREATE,
      afterJson: created,
      requestId,
    });

    return this.getJournalById(created.id);
  }

  async listJournals(query: {
    from?: string;
    to?: string;
    status?: JournalStatus;
    grade?: DailyGrade;
    page?: number;
    pageSize?: number;
  }) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize && query.pageSize > 0 ? Math.min(query.pageSize, 100) : 25;
    const offset = (page - 1) * pageSize;

    let q = this.databaseService.db.select().from(dailyJournals).$dynamic();
    let countQ = this.databaseService.db
      .select({ count: count(dailyJournals.id) })
      .from(dailyJournals)
      .$dynamic();

    const conditions: any[] = [];
    if (query.from) {
      conditions.push(gte(dailyJournals.journalDate, query.from));
    }
    if (query.to) {
      conditions.push(lte(dailyJournals.journalDate, query.to));
    }
    if (query.status) {
      conditions.push(eq(dailyJournals.status, query.status));
    }
    if (query.grade) {
      conditions.push(eq(dailyJournals.dailyGrade, query.grade));
    }

    if (conditions.length > 0) {
      q = q.where(and(...conditions));
      countQ = countQ.where(and(...conditions));
    }

    const items = await q.orderBy(desc(dailyJournals.journalDate)).limit(pageSize).offset(offset);
    const totalRes = await countQ;
    const total = Number(totalRes[0]?.count || 0);

    return {
      items,
      page,
      pageSize,
      total,
    };
  }

  async getJournalById(id: string) {
    const [journal] = await this.databaseService.db
      .select()
      .from(dailyJournals)
      .where(eq(dailyJournals.id, id))
      .limit(1);

    if (!journal) {
      throw new NotFoundException(`Journal '${id}' not found.`);
    }

    const windows = await this.databaseService.db
      .select()
      .from(journalWindows)
      .where(eq(journalWindows.journalId, id));

    const events = await this.databaseService.db
      .select()
      .from(economicEvents)
      .where(eq(economicEvents.journalId, id))
      .orderBy(economicEvents.occursAt);

    const analyses = await this.databaseService.db
      .select()
      .from(timeframeAnalyses)
      .where(eq(timeframeAnalyses.journalId, id));

    // Get zones for each analysis
    const analysesWithZones: any[] = [];
    for (const a of analyses) {
      const zones = await this.databaseService.db
        .select()
        .from(marketZones)
        .where(eq(marketZones.analysisId, a.id));
      analysesWithZones.push({ ...a, zones });
    }

    const scenarios = await this.databaseService.db
      .select()
      .from(journalScenarios)
      .where(eq(journalScenarios.journalId, id));

    const limits = await this.databaseService.db
      .select({
        id: journalAccountLimits.id,
        journalId: journalAccountLimits.journalId,
        accountId: journalAccountLimits.accountId,
        maxTrades: journalAccountLimits.maxTrades,
        maxDailyLoss: journalAccountLimits.maxDailyLoss,
        consecutiveLossLimit: journalAccountLimits.consecutiveLossLimit,
        accountName: tradingAccounts.name,
        accountType: tradingAccounts.type,
      })
      .from(journalAccountLimits)
      .leftJoin(tradingAccounts, eq(journalAccountLimits.accountId, tradingAccounts.id))
      .where(eq(journalAccountLimits.journalId, id));

    const journalTrades = await this.databaseService.db
      .select()
      .from(trades)
      .where(eq(trades.journalId, id))
      .orderBy(desc(trades.createdAt));

    return {
      ...journal,
      windows,
      events,
      analyses: analysesWithZones,
      scenarios,
      limits,
      trades: journalTrades,
    };
  }

  async getJournalByDate(journalDate: string) {
    const [journal] = await this.databaseService.db
      .select()
      .from(dailyJournals)
      .where(eq(dailyJournals.journalDate, journalDate))
      .limit(1);

    if (!journal) {
      throw new NotFoundException(`Journal for date '${journalDate}' not found.`);
    }

    return this.getJournalById(journal.id);
  }

  async updateJournal(id: string, dto: UpdateJournalDto, requestId?: string) {
    const [current] = await this.databaseService.db
      .select()
      .from(dailyJournals)
      .where(eq(dailyJournals.id, id))
      .limit(1);

    if (!current) {
      throw new NotFoundException(`Journal '${id}' not found.`);
    }

    if (dto.expectedVersion !== undefined && current.version !== dto.expectedVersion) {
      throw new ConflictException(
        `Version conflict: current version is ${current.version}, expected ${dto.expectedVersion}.`,
      );
    }

    const updatePayload: Partial<typeof dailyJournals.$inferInsert> = {
      version: current.version + 1,
      updatedAt: new Date(),
    };

    if (dto.sleepQuality !== undefined) updatePayload.sleepQuality = dto.sleepQuality;
    if (dto.focusRating !== undefined) updatePayload.focusRating = dto.focusRating;
    if (dto.stressRating !== undefined) updatePayload.stressRating = dto.stressRating;
    if (dto.emotionalState !== undefined) updatePayload.emotionalState = dto.emotionalState;
    if (dto.preparationNotes !== undefined) updatePayload.preparationNotes = dto.preparationNotes;
    if (dto.readiness !== undefined) updatePayload.readiness = dto.readiness;
    if (dto.processEvaluation !== undefined) updatePayload.processEvaluation = dto.processEvaluation;
    if (dto.reflection !== undefined) updatePayload.reflection = dto.reflection;
    if (dto.gradeOverride !== undefined) updatePayload.gradeOverride = dto.gradeOverride;
    if (dto.gradeOverrideReason !== undefined)
      updatePayload.gradeOverrideReason = dto.gradeOverrideReason;

    const [updated] = await this.databaseService.db
      .update(dailyJournals)
      .set(updatePayload)
      .where(eq(dailyJournals.id, id))
      .returning();

    await this.auditService.record({
      entityType: 'daily_journals',
      entityId: id,
      action: AuditAction.UPDATE,
      beforeJson: current,
      afterJson: updated,
      requestId,
    });

    return updated;
  }

  async activateJournal(id: string, requestId?: string) {
    const [current] = await this.databaseService.db
      .select()
      .from(dailyJournals)
      .where(eq(dailyJournals.id, id))
      .limit(1);

    if (!current) {
      throw new NotFoundException(`Journal '${id}' not found.`);
    }

    const [updated] = await this.databaseService.db
      .update(dailyJournals)
      .set({
        status: JournalStatus.ACTIVE,
        version: current.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(dailyJournals.id, id))
      .returning();

    await this.auditService.record({
      entityType: 'daily_journals',
      entityId: id,
      action: AuditAction.UPDATE,
      reason: 'Activated daily journal workspace',
      beforeJson: current,
      afterJson: updated,
      requestId,
    });

    return updated;
  }

  async completeReview(id: string, dto: CompleteJournalReviewDto, requestId?: string) {
    const [current] = await this.databaseService.db
      .select()
      .from(dailyJournals)
      .where(eq(dailyJournals.id, id))
      .limit(1);

    if (!current) {
      throw new NotFoundException(`Journal '${id}' not found.`);
    }

    if (dto.expectedVersion !== undefined && current.version !== dto.expectedVersion) {
      throw new ConflictException(
        `Version conflict: current version is ${current.version}, expected ${dto.expectedVersion}.`,
      );
    }

    // Check trade blockers for review
    const journalTrades = await this.databaseService.db
      .select()
      .from(trades)
      .where(and(eq(trades.journalId, id), sql`${trades.voidedAt} IS NULL`));

    const openTrades = journalTrades.filter((t) => t.state === TradeState.OPEN);
    if (openTrades.length > 0) {
      throw new BadRequestException(
        `Cannot complete daily review: ${openTrades.length} trade(s) are still OPEN. Close all trades before completing review.`,
      );
    }

    const unconfirmedFeeTrades = journalTrades.filter(
      (t) => t.state === TradeState.CLOSED && (!t.feesConfirmed || t.actualFees === null),
    );
    if (unconfirmedFeeTrades.length > 0) {
      throw new BadRequestException(
        `Cannot complete daily review: ${unconfirmedFeeTrades.length} closed trade(s) have unconfirmed fees. Confirm fees before completing review.`,
      );
    }

    const plannedTrades = journalTrades.filter((t) => t.state === TradeState.PLANNED);
    if (plannedTrades.length > 0) {
      throw new BadRequestException(
        `Cannot complete daily review: ${plannedTrades.length} trade plan(s) are still pending. Cancel or execute them first.`,
      );
    }

    const isNoTradeDay = dto.isNoTradeDay ?? journalTrades.length === 0;
    const processItems = dto.processEvaluation?.items || current.processEvaluation?.items || [];

    const scoreResult = calculateDailyProcessScore({
      items: processItems,
      isNoTradeDay,
    });

    const updatePayload: Partial<typeof dailyJournals.$inferInsert> = {
      status: JournalStatus.REVIEWED,
      reviewedAt: new Date(),
      dailyGrade: scoreResult.grade,
      processEvaluation: scoreResult.processJson,
      version: current.version + 1,
      updatedAt: new Date(),
    };

    if (dto.reflection) updatePayload.reflection = dto.reflection;
    if (dto.gradeOverride !== undefined) {
      updatePayload.gradeOverride = dto.gradeOverride;
      updatePayload.gradeOverrideReason = dto.gradeOverrideReason ?? null;
    }

    const [updated] = await this.databaseService.db
      .update(dailyJournals)
      .set(updatePayload)
      .where(eq(dailyJournals.id, id))
      .returning();

    await this.auditService.record({
      entityType: 'daily_journals',
      entityId: id,
      action: AuditAction.UPDATE,
      reason: 'Completed end-of-day review',
      beforeJson: current,
      afterJson: updated,
      requestId,
    });

    return updated;
  }

  async reopenJournal(id: string, dto: ReopenJournalDto, requestId?: string) {
    const [current] = await this.databaseService.db
      .select()
      .from(dailyJournals)
      .where(eq(dailyJournals.id, id))
      .limit(1);

    if (!current) {
      throw new NotFoundException(`Journal '${id}' not found.`);
    }

    if (!dto.reason || dto.reason.trim().length === 0) {
      throw new BadRequestException('A reason is mandatory when reopening a reviewed daily journal.');
    }

    const [updated] = await this.databaseService.db
      .update(dailyJournals)
      .set({
        status: JournalStatus.ACTIVE,
        reviewedAt: null,
        version: current.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(dailyJournals.id, id))
      .returning();

    await this.auditService.record({
      entityType: 'daily_journals',
      entityId: id,
      action: AuditAction.REOPEN,
      reason: dto.reason,
      beforeJson: current,
      afterJson: updated,
      requestId,
    });

    return updated;
  }

  // --- Windows CRUD ---
  async listWindows(journalId: string) {
    return this.databaseService.db
      .select()
      .from(journalWindows)
      .where(eq(journalWindows.journalId, journalId));
  }

  async createWindow(journalId: string, dto: CreateWindowDto) {
    const [created] = await this.databaseService.db
      .insert(journalWindows)
      .values({
        journalId,
        label: dto.label,
        timezone: dto.timezone,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        quarterConfig: dto.quarterConfig ?? null,
      })
      .returning();

    return created;
  }

  async updateWindow(
    journalId: string,
    windowId: string,
    dto: UpdateWindowDto,
  ) {
    const updatePayload: Partial<typeof journalWindows.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (dto.label !== undefined) updatePayload.label = dto.label;
    if (dto.timezone !== undefined) updatePayload.timezone = dto.timezone;
    if (dto.startsAt !== undefined) updatePayload.startsAt = new Date(dto.startsAt);
    if (dto.endsAt !== undefined) updatePayload.endsAt = new Date(dto.endsAt);
    if (dto.quarterConfig !== undefined) updatePayload.quarterConfig = dto.quarterConfig;

    const [updated] = await this.databaseService.db
      .update(journalWindows)
      .set(updatePayload)
      .where(and(eq(journalWindows.id, windowId), eq(journalWindows.journalId, journalId)))
      .returning();

    if (!updated) throw new NotFoundException(`Window '${windowId}' not found.`);
    return updated;
  }

  async deleteWindow(journalId: string, windowId: string) {
    await this.databaseService.db
      .delete(journalWindows)
      .where(and(eq(journalWindows.id, windowId), eq(journalWindows.journalId, journalId)));
    return { success: true };
  }

  // --- Economic Events CRUD ---
  async listEvents(journalId: string) {
    return this.databaseService.db
      .select()
      .from(economicEvents)
      .where(eq(economicEvents.journalId, journalId))
      .orderBy(economicEvents.occursAt);
  }

  async createEvent(journalId: string, dto: CreateEconomicEventDto) {
    const [created] = await this.databaseService.db
      .insert(economicEvents)
      .values({
        journalId,
        title: dto.title,
        occursAt: new Date(dto.occursAt),
        impact: dto.impact,
        restrictionStart: dto.restrictionStart ? new Date(dto.restrictionStart) : null,
        restrictionEnd: dto.restrictionEnd ? new Date(dto.restrictionEnd) : null,
        notes: dto.notes ?? null,
        checkedAt: dto.checkedAt ? new Date(dto.checkedAt) : null,
      })
      .returning();

    return created;
  }

  async updateEvent(journalId: string, eventId: string, dto: UpdateEconomicEventDto) {
    const updatePayload: Partial<typeof economicEvents.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (dto.title !== undefined) updatePayload.title = dto.title;
    if (dto.occursAt !== undefined) updatePayload.occursAt = new Date(dto.occursAt);
    if (dto.impact !== undefined) updatePayload.impact = dto.impact;
    if (dto.restrictionStart !== undefined)
      updatePayload.restrictionStart = dto.restrictionStart ? new Date(dto.restrictionStart) : null;
    if (dto.restrictionEnd !== undefined)
      updatePayload.restrictionEnd = dto.restrictionEnd ? new Date(dto.restrictionEnd) : null;
    if (dto.notes !== undefined) updatePayload.notes = dto.notes;
    if (dto.checkedAt !== undefined)
      updatePayload.checkedAt = dto.checkedAt ? new Date(dto.checkedAt) : null;

    const [updated] = await this.databaseService.db
      .update(economicEvents)
      .set(updatePayload)
      .where(and(eq(economicEvents.id, eventId), eq(economicEvents.journalId, journalId)))
      .returning();

    if (!updated) throw new NotFoundException(`Event '${eventId}' not found.`);
    return updated;
  }

  async deleteEvent(journalId: string, eventId: string) {
    await this.databaseService.db
      .delete(economicEvents)
      .where(and(eq(economicEvents.id, eventId), eq(economicEvents.journalId, journalId)));
    return { success: true };
  }

  // --- Analyses & Zones CRUD ---
  async listAnalyses(journalId: string) {
    const analyses = await this.databaseService.db
      .select()
      .from(timeframeAnalyses)
      .where(eq(timeframeAnalyses.journalId, journalId));

    const results: any[] = [];
    for (const a of analyses) {
      const zones = await this.databaseService.db
        .select()
        .from(marketZones)
        .where(eq(marketZones.analysisId, a.id));
      results.push({ ...a, zones });
    }
    return results;
  }

  async createAnalysis(journalId: string, dto: CreateTimeframeAnalysisDto) {
    const [created] = await this.databaseService.db
      .insert(timeframeAnalyses)
      .values({
        journalId,
        windowId: dto.windowId ?? null,
        timeframe: dto.timeframe,
        data: dto.data ?? {},
        narrative: dto.narrative ?? null,
      })
      .returning();

    return { ...created, zones: [] };
  }

  async updateAnalysis(
    journalId: string,
    analysisId: string,
    dto: UpdateTimeframeAnalysisDto,
  ) {
    const updatePayload: Partial<typeof timeframeAnalyses.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (dto.windowId !== undefined) updatePayload.windowId = dto.windowId;
    if (dto.data !== undefined) updatePayload.data = dto.data;
    if (dto.narrative !== undefined) updatePayload.narrative = dto.narrative;

    const [updated] = await this.databaseService.db
      .update(timeframeAnalyses)
      .set(updatePayload)
      .where(and(eq(timeframeAnalyses.id, analysisId), eq(timeframeAnalyses.journalId, journalId)))
      .returning();

    if (!updated) throw new NotFoundException(`Analysis '${analysisId}' not found.`);
    return updated;
  }

  async deleteAnalysis(journalId: string, analysisId: string) {
    await this.databaseService.db
      .delete(timeframeAnalyses)
      .where(and(eq(timeframeAnalyses.id, analysisId), eq(timeframeAnalyses.journalId, journalId)));
    return { success: true };
  }

  // Zones
  async listZones(analysisId: string) {
    return this.databaseService.db
      .select()
      .from(marketZones)
      .where(eq(marketZones.analysisId, analysisId));
  }

  async createZone(analysisId: string, dto: CreateMarketZoneDto) {
    const [created] = await this.databaseService.db
      .insert(marketZones)
      .values({
        analysisId,
        kind: dto.kind,
        lowerPrice: dto.lowerPrice,
        upperPrice: dto.upperPrice,
        confluence: dto.confluence ?? null,
        notes: dto.notes ?? null,
      })
      .returning();

    return created;
  }

  async updateZone(analysisId: string, zoneId: string, dto: UpdateMarketZoneDto) {
    const updatePayload: Partial<typeof marketZones.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (dto.kind !== undefined) updatePayload.kind = dto.kind;
    if (dto.lowerPrice !== undefined) updatePayload.lowerPrice = dto.lowerPrice;
    if (dto.upperPrice !== undefined) updatePayload.upperPrice = dto.upperPrice;
    if (dto.confluence !== undefined) updatePayload.confluence = dto.confluence;
    if (dto.notes !== undefined) updatePayload.notes = dto.notes;

    const [updated] = await this.databaseService.db
      .update(marketZones)
      .set(updatePayload)
      .where(and(eq(marketZones.id, zoneId), eq(marketZones.analysisId, analysisId)))
      .returning();

    if (!updated) throw new NotFoundException(`Market zone '${zoneId}' not found.`);
    return updated;
  }

  async deleteZone(analysisId: string, zoneId: string) {
    await this.databaseService.db
      .delete(marketZones)
      .where(and(eq(marketZones.id, zoneId), eq(marketZones.analysisId, analysisId)));
    return { success: true };
  }

  // --- Scenarios CRUD ---
  async listScenarios(journalId: string) {
    return this.databaseService.db
      .select()
      .from(journalScenarios)
      .where(eq(journalScenarios.journalId, journalId));
  }

  async createScenario(journalId: string, dto: CreateScenarioDto) {
    const [created] = await this.databaseService.db
      .insert(journalScenarios)
      .values({
        journalId,
        windowId: dto.windowId ?? null,
        kind: dto.kind,
        conditions: dto.conditions ?? {},
        narrative: dto.narrative ?? null,
      })
      .returning();

    return created;
  }

  async updateScenario(journalId: string, scenarioId: string, dto: UpdateScenarioDto) {
    const updatePayload: Partial<typeof journalScenarios.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (dto.windowId !== undefined) updatePayload.windowId = dto.windowId;
    if (dto.kind !== undefined) updatePayload.kind = dto.kind;
    if (dto.conditions !== undefined) updatePayload.conditions = dto.conditions;
    if (dto.narrative !== undefined) updatePayload.narrative = dto.narrative;

    const [updated] = await this.databaseService.db
      .update(journalScenarios)
      .set(updatePayload)
      .where(and(eq(journalScenarios.id, scenarioId), eq(journalScenarios.journalId, journalId)))
      .returning();

    if (!updated) throw new NotFoundException(`Scenario '${scenarioId}' not found.`);
    return updated;
  }

  async deleteScenario(journalId: string, scenarioId: string) {
    await this.databaseService.db
      .delete(journalScenarios)
      .where(and(eq(journalScenarios.id, scenarioId), eq(journalScenarios.journalId, journalId)));
    return { success: true };
  }

  // --- Quarters CRUD ---
  async listQuarters(windowId: string) {
    return this.databaseService.db
      .select()
      .from(quarterObservations)
      .where(eq(quarterObservations.windowId, windowId))
      .orderBy(quarterObservations.quarter);
  }

  async createQuarter(windowId: string, dto: CreateQuarterObservationDto) {
    const [created] = await this.databaseService.db
      .insert(quarterObservations)
      .values({
        windowId,
        quarter: dto.quarter,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        rangeHigh: dto.rangeHigh ?? null,
        rangeLow: dto.rangeLow ?? null,
        trueOpenPrice: dto.trueOpenPrice ?? null,
        model: dto.model ?? 'UNKNOWN',
        notes: dto.notes ?? null,
      })
      .returning();

    return created;
  }

  async updateQuarter(
    windowId: string,
    quarterObsId: string,
    dto: UpdateQuarterObservationDto,
  ) {
    const updatePayload: Partial<typeof quarterObservations.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (dto.startsAt !== undefined) updatePayload.startsAt = new Date(dto.startsAt);
    if (dto.endsAt !== undefined) updatePayload.endsAt = new Date(dto.endsAt);
    if (dto.rangeHigh !== undefined) updatePayload.rangeHigh = dto.rangeHigh;
    if (dto.rangeLow !== undefined) updatePayload.rangeLow = dto.rangeLow;
    if (dto.trueOpenPrice !== undefined) updatePayload.trueOpenPrice = dto.trueOpenPrice;
    if (dto.model !== undefined) updatePayload.model = dto.model;
    if (dto.notes !== undefined) updatePayload.notes = dto.notes;

    const [updated] = await this.databaseService.db
      .update(quarterObservations)
      .set(updatePayload)
      .where(
        and(eq(quarterObservations.id, quarterObsId), eq(quarterObservations.windowId, windowId)),
      )
      .returning();

    if (!updated) throw new NotFoundException(`Quarter observation '${quarterObsId}' not found.`);
    return updated;
  }

  async deleteQuarter(windowId: string, quarterObsId: string) {
    await this.databaseService.db
      .delete(quarterObservations)
      .where(
        and(eq(quarterObservations.id, quarterObsId), eq(quarterObservations.windowId, windowId)),
      );
    return { success: true };
  }

  // --- Account Limits CRUD ---
  async updateAccountLimit(
    journalId: string,
    accountId: string,
    dto: UpdateJournalAccountLimitDto,
  ) {
    const updatePayload: Partial<typeof journalAccountLimits.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (dto.maxTrades !== undefined) updatePayload.maxTrades = dto.maxTrades;
    if (dto.maxDailyLoss !== undefined) updatePayload.maxDailyLoss = dto.maxDailyLoss;
    if (dto.consecutiveLossLimit !== undefined)
      updatePayload.consecutiveLossLimit = dto.consecutiveLossLimit;

    const [updated] = await this.databaseService.db
      .insert(journalAccountLimits)
      .values({
        journalId,
        accountId,
        maxTrades: dto.maxTrades ?? null,
        maxDailyLoss: dto.maxDailyLoss ?? null,
        consecutiveLossLimit: dto.consecutiveLossLimit ?? null,
      })
      .onConflictDoUpdate({
        target: [journalAccountLimits.journalId, journalAccountLimits.accountId],
        set: updatePayload,
      })
      .returning();

    return updated;
  }
}
