import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import {
  trades,
  tradeChecklistAnswers,
  tradeManagementEvents,
  tradeViolations,
  instruments,
  strategies,
  strategyVersions,
  tradingAccounts,
  dailyJournals,
  journalAccountLimits,
  timeframeAnalyses,
  attachments,
} from '@journalx/db';
import { eq, and, desc, gte, lte, count, sql, isNull } from 'drizzle-orm';
import {
  CreateTradePlanDto,
  UpdateTradePlanDto,
  OpenTradeDto,
  RecordExecutionDto,
  CloseTradeDto,
  AddManagementEventDto,
  SaveChecklistAnswersDto,
  ReviewTradeDto,
  CorrectTradeDto,
  VoidTradeDto,
  TradeQueryDto,
} from './dto/trade.dto.js';
import { AuditService } from '../../common/services/audit.service.js';
import { IdempotencyService } from '../../common/services/idempotency.service.js';
import {
  calculatePositionRisk,
  calculateRealizedPnL,
  evaluateTradeEligibility,
  AuditAction,
  ChecklistAnswer,
  JournalStatus,
  ManagementEventKind,
  RealizedPnLOutput,
  RecordingMode,
  TradeDirection,
  TradeOutcome,
  TradeState,
  ViolationSeverity,
  ViolationSource,
} from '@journalx/domain';
import Decimal from 'decimal.js';

@Injectable()
export class TradesService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly auditService: AuditService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  /**
   * Helper to attach pure domain calculations to a trade entity
   */
  private enrichTrade(trade: typeof trades.$inferSelect, instrument: typeof instruments.$inferSelect) {
    const entryPrice = trade.actualEntry || trade.plannedEntry || '0';
    const stopPrice = trade.originalStop;
    const targetPrice = trade.originalTarget;
    const qty = trade.quantity;
    const pv = instrument.pointValue;

    const riskCalc = calculatePositionRisk({
      entryPrice,
      stopPrice,
      quantity: qty,
      pointValue: pv,
      targetPrice,
    });

    let realizedCalc: RealizedPnLOutput | null = null;
    if (trade.exitPrice) {
      realizedCalc = calculateRealizedPnL({
        entryPrice,
        exitPrice: trade.exitPrice,
        quantity: qty,
        pointValue: pv,
        direction: trade.direction as TradeDirection,
        actualTotalFees: trade.feesConfirmed ? trade.actualFees : null,
        initialRisk: riskCalc.initialRisk,
      });
    }

    return {
      ...trade,
      stopPoints: riskCalc.stopPoints,
      initialRisk: riskCalc.initialRisk,
      plannedReward: riskCalc.plannedReward,
      plannedRR: riskCalc.plannedRR,
      grossPnL: realizedCalc ? realizedCalc.grossPnL : null,
      netPnL: realizedCalc ? realizedCalc.netPnL : null,
      grossR: realizedCalc ? realizedCalc.grossR : null,
      netR: realizedCalc ? realizedCalc.netR : null,
      outcome: realizedCalc ? realizedCalc.outcome : null,
    };
  }

  /**
   * Calculate today stats for limit checks in transaction
   */
  private async getTodayStats(journalId: string, accountId: string, tx: any) {
    const journalTrades = await tx
      .select()
      .from(trades)
      .where(
        and(
          eq(trades.journalId, journalId),
          eq(trades.accountId, accountId),
          sql`${trades.voidedAt} IS NULL`,
          sql`${trades.state} != 'CANCELLED'`,
        ),
      )
      .orderBy(trades.createdAt);

    // Actual trades count: OPEN or CLOSED
    const actualTrades = journalTrades.filter(
      (t: any) => t.state === TradeState.OPEN || t.state === TradeState.CLOSED,
    );
    const tradeCount = actualTrades.length;

    // Check consecutive losses and cumulative loss
    let consecutiveLosses = 0;
    let realizedLossDollars = new Decimal(0);
    let hasIndeterminateFeeTrade = false;

    // Order closed trades by exitAt / createdAt
    const closedTrades = journalTrades.filter((t: any) => t.state === TradeState.CLOSED);

    for (const t of closedTrades) {
      if (!t.feesConfirmed || t.actualFees === null) {
        hasIndeterminateFeeTrade = true;
      }

      const [inst] = await tx
        .select()
        .from(instruments)
        .where(eq(instruments.id, t.instrumentId))
        .limit(1);

      if (inst && t.actualEntry && t.exitPrice) {
        const pnl = calculateRealizedPnL({
          entryPrice: t.actualEntry,
          exitPrice: t.exitPrice,
          quantity: t.quantity,
          pointValue: inst.pointValue,
          direction: t.direction as TradeDirection,
          actualTotalFees: t.feesConfirmed ? t.actualFees : '0',
          initialRisk: calculatePositionRisk({
            entryPrice: t.actualEntry,
            stopPrice: t.originalStop,
            quantity: t.quantity,
            pointValue: inst.pointValue,
          }).initialRisk,
        });

        if (pnl.netPnL !== null) {
          const net = new Decimal(pnl.netPnL);
          if (net.lt(0)) {
            consecutiveLosses++;
            realizedLossDollars = realizedLossDollars.plus(net.abs());
          } else {
            // Reset consecutive loss count on win or breakeven
            consecutiveLosses = 0;
          }
        }
      }
    }

    return {
      tradeCount,
      realizedLoss: realizedLossDollars.toFixed(2),
      consecutiveLosses,
      hasIndeterminateFeeTrade,
    };
  }

  async createTradePlan(dto: CreateTradePlanDto, requestId?: string) {
    const [inst] = await this.databaseService.db
      .select()
      .from(instruments)
      .where(eq(instruments.id, dto.instrumentId))
      .limit(1);
    if (!inst) throw new NotFoundException(`Instrument '${dto.instrumentId}' not found.`);

    const [stratVer] = await this.databaseService.db
      .select()
      .from(strategyVersions)
      .where(eq(strategyVersions.id, dto.strategyVersionId))
      .limit(1);
    if (!stratVer)
      throw new NotFoundException(`Strategy version '${dto.strategyVersionId}' not found.`);

    // Evaluate eligibility
    const evalResult = evaluateTradeEligibility({
      direction: dto.direction,
      entryPrice: dto.plannedEntry,
      stopPrice: dto.originalStop,
      targetPrice: dto.originalTarget,
      quantity: dto.quantity,
      tickSize: inst.tickSize,
      pointValue: inst.pointValue,
      strategyRules: stratVer.rules,
      strategyChecklist: stratVer.checklist,
      checklistAnswers: dto.checklistAnswers?.map((a) => ({
        itemKey: a.itemKey,
        answer: a.answer,
      })),
    });

    const [created] = await this.databaseService.db
      .insert(trades)
      .values({
        journalId: dto.journalId,
        accountId: dto.accountId,
        instrumentId: dto.instrumentId,
        strategyVersionId: dto.strategyVersionId,
        windowId: dto.windowId ?? null,
        scenarioId: dto.scenarioId ?? null,
        state: TradeState.PLANNED,
        recordingMode: RecordingMode.NORMAL,
        direction: dto.direction,
        plannedEntry: dto.plannedEntry,
        originalStop: dto.originalStop,
        originalTarget: dto.originalTarget,
        quantity: dto.quantity,
        actualContractSymbol: dto.actualContractSymbol ?? null,
      })
      .returning();

    // Save checklist answers
    if (dto.checklistAnswers && dto.checklistAnswers.length > 0) {
      for (const a of dto.checklistAnswers) {
        await this.databaseService.db
          .insert(tradeChecklistAnswers)
          .values({
            tradeId: created.id,
            itemKey: a.itemKey,
            answer: a.answer,
            evidenceNote: a.evidenceNote ?? null,
          })
          .onConflictDoNothing();
      }
    }

    // Save violations if any rule failed
    if (evalResult.status === 'INELIGIBLE') {
      for (const reason of evalResult.reasons) {
        await this.databaseService.db.insert(tradeViolations).values({
          tradeId: created.id,
          code: 'PLAN_RULE_VIOLATION',
          severity: ViolationSeverity.WARNING,
          source: ViolationSource.RULE_ENGINE,
          note: reason,
        });
      }
    }

    await this.auditService.record({
      entityType: 'trades',
      entityId: created.id,
      action: AuditAction.CREATE,
      afterJson: created,
      requestId,
    });

    return this.getTradeById(created.id);
  }

  async updateTradePlan(id: string, dto: UpdateTradePlanDto, requestId?: string) {
    const current = await this.getTradeById(id);

    if (current.state !== TradeState.PLANNED) {
      throw new BadRequestException('Only trades in PLANNED state can be modified with update plan.');
    }

    if (dto.expectedVersion !== undefined && current.version !== dto.expectedVersion) {
      throw new ConflictException(
        `Version conflict: current version is ${current.version}, expected ${dto.expectedVersion}.`,
      );
    }

    const updatePayload: Partial<typeof trades.$inferInsert> = {
      version: current.version + 1,
      updatedAt: new Date(),
    };

    if (dto.plannedEntry !== undefined) updatePayload.plannedEntry = dto.plannedEntry;
    if (dto.originalStop !== undefined) updatePayload.originalStop = dto.originalStop;
    if (dto.originalTarget !== undefined) updatePayload.originalTarget = dto.originalTarget;
    if (dto.quantity !== undefined) updatePayload.quantity = dto.quantity;
    if (dto.actualContractSymbol !== undefined)
      updatePayload.actualContractSymbol = dto.actualContractSymbol;
    if (dto.windowId !== undefined) updatePayload.windowId = dto.windowId;
    if (dto.scenarioId !== undefined) updatePayload.scenarioId = dto.scenarioId;

    const [updated] = await this.databaseService.db
      .update(trades)
      .set(updatePayload)
      .where(eq(trades.id, id))
      .returning();

    await this.auditService.record({
      entityType: 'trades',
      entityId: id,
      action: AuditAction.UPDATE,
      beforeJson: current,
      afterJson: updated,
      requestId,
    });

    return this.getTradeById(id);
  }

  async cancelTradePlan(id: string, requestId?: string) {
    const current = await this.getTradeById(id);

    if (current.state !== TradeState.PLANNED) {
      throw new BadRequestException('Only PLANNED trades can be cancelled.');
    }

    const [updated] = await this.databaseService.db
      .update(trades)
      .set({
        state: TradeState.CANCELLED,
        version: current.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(trades.id, id))
      .returning();

    await this.auditService.record({
      entityType: 'trades',
      entityId: id,
      action: AuditAction.UPDATE,
      reason: 'Cancelled trade plan',
      beforeJson: current,
      afterJson: updated,
      requestId,
    });

    return this.getTradeById(id);
  }

  async evaluateTrade(tradeId: string) {
    const trade = await this.getTradeById(tradeId);
    const [inst] = await this.databaseService.db
      .select()
      .from(instruments)
      .where(eq(instruments.id, trade.instrumentId))
      .limit(1);

    const [stratVer] = await this.databaseService.db
      .select()
      .from(strategyVersions)
      .where(eq(strategyVersions.id, trade.strategyVersionId))
      .limit(1);

    const [limits] = await this.databaseService.db
      .select()
      .from(journalAccountLimits)
      .where(
        and(
          eq(journalAccountLimits.journalId, trade.journalId),
          eq(journalAccountLimits.accountId, trade.accountId),
        ),
      )
      .limit(1);

    const todayStats = await this.getTodayStats(
      trade.journalId,
      trade.accountId,
      this.databaseService.db,
    );

    const answers = await this.databaseService.db
      .select()
      .from(tradeChecklistAnswers)
      .where(eq(tradeChecklistAnswers.tradeId, tradeId));

    const evalResult = evaluateTradeEligibility({
      direction: trade.direction as TradeDirection,
      entryPrice: trade.actualEntry || trade.plannedEntry || '0',
      stopPrice: trade.originalStop,
      targetPrice: trade.originalTarget,
      quantity: trade.quantity,
      tickSize: inst.tickSize,
      pointValue: inst.pointValue,
      strategyRules: stratVer?.rules,
      strategyChecklist: stratVer?.checklist,
      checklistAnswers: answers.map((a) => ({ itemKey: a.itemKey, answer: a.answer as ChecklistAnswer })),
      accountLimits: limits
        ? {
            maxDailyTrades: limits.maxTrades ?? undefined,
            maxDailyLoss: limits.maxDailyLoss ?? undefined,
            consecutiveLossLimit: limits.consecutiveLossLimit ?? undefined,
          }
        : undefined,
      todayStats,
    });

    return evalResult;
  }

  async openTrade(
    id: string,
    dto: OpenTradeDto,
    idempotencyKey?: string,
    requestId?: string,
  ) {
    if (idempotencyKey) {
      const cached = await this.idempotencyService.check('trades.open', idempotencyKey, dto);
      if (cached.isCached) {
        return cached.body;
      }
    }

    // Atomic transaction with row locking
    const result = await this.databaseService.db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(trades)
        .where(eq(trades.id, id))
        .for('update')
        .limit(1);

      if (!current) throw new NotFoundException(`Trade '${id}' not found.`);
      if (current.state !== TradeState.PLANNED) {
        throw new BadRequestException(`Cannot open trade in '${current.state}' state.`);
      }

      if (dto.expectedVersion !== undefined && current.version !== dto.expectedVersion) {
        throw new ConflictException(
          `Version conflict: current version is ${current.version}, expected ${dto.expectedVersion}.`,
        );
      }

      // Lock journal_account_limits to serialize concurrent trade entries for account/day
      await tx
        .select()
        .from(journalAccountLimits)
        .where(
          and(
            eq(journalAccountLimits.journalId, current.journalId),
            eq(journalAccountLimits.accountId, current.accountId),
          ),
        )
        .for('update');

      const [inst] = await tx
        .select()
        .from(instruments)
        .where(eq(instruments.id, current.instrumentId))
        .limit(1);

      const [stratVer] = await tx
        .select()
        .from(strategyVersions)
        .where(eq(strategyVersions.id, current.strategyVersionId))
        .limit(1);

      const todayStats = await this.getTodayStats(current.journalId, current.accountId, tx);
      const answers = await tx
        .select()
        .from(tradeChecklistAnswers)
        .where(eq(tradeChecklistAnswers.tradeId, id));

      const evalResult = evaluateTradeEligibility({
        direction: current.direction as TradeDirection,
        entryPrice: dto.actualEntry,
        stopPrice: current.originalStop,
        targetPrice: current.originalTarget,
        quantity: current.quantity,
        tickSize: inst.tickSize,
        pointValue: inst.pointValue,
        strategyRules: stratVer?.rules,
        strategyChecklist: stratVer?.checklist,
        checklistAnswers: answers.map((a) => ({
          itemKey: a.itemKey,
          answer: a.answer as ChecklistAnswer,
        })),
        todayStats,
      });

      // Honest recording: if ineligible, record violations
      if (evalResult.status === 'INELIGIBLE') {
        for (const reason of evalResult.reasons) {
          await tx.insert(tradeViolations).values({
            tradeId: current.id,
            code: 'OPEN_RULE_VIOLATION',
            severity: ViolationSeverity.SERIOUS,
            source: ViolationSource.RULE_ENGINE,
            note: reason,
          });
        }
      }

      // Snapshot context at OPEN
      const tfAnalyses = await tx
        .select()
        .from(timeframeAnalyses)
        .where(eq(timeframeAnalyses.journalId, current.journalId));

      const snapshotJson = {
        rulesSnapshot: stratVer?.rules,
        checklistSnapshot: stratVer?.checklist,
        instrumentSnapshot: {
          symbol: inst.symbol,
          tickSize: inst.tickSize,
          pointValue: inst.pointValue,
        },
        contextSnapshot: {
          timeframe4H: tfAnalyses.find((a) => a.timeframe === '4H')?.data,
          timeframe1H: tfAnalyses.find((a) => a.timeframe === '1H')?.data,
          timeframe15M: tfAnalyses.find((a) => a.timeframe === '15M')?.data,
        },
      };

      const [updated] = await tx
        .update(trades)
        .set({
          state: TradeState.OPEN,
          actualEntry: dto.actualEntry,
          entryAt: new Date(dto.entryAt),
          actualContractSymbol: dto.actualContractSymbol ?? current.actualContractSymbol,
          snapshot: snapshotJson,
          version: current.version + 1,
          updatedAt: new Date(),
        })
        .where(eq(trades.id, id))
        .returning();

      await this.auditService.record(
        {
          entityType: 'trades',
          entityId: id,
          action: AuditAction.UPDATE,
          reason: 'Opened trade execution',
          beforeJson: current,
          afterJson: updated,
          requestId,
        },
        tx,
      );

      return this.enrichTrade(updated, inst);
    });

    if (idempotencyKey) {
      await this.idempotencyService.saveResult(
        'trades.open',
        idempotencyKey,
        dto,
        200,
        result,
        result.id,
      );
    }

    return result;
  }

  async recordExecution(
    dto: RecordExecutionDto,
    idempotencyKey?: string,
    requestId?: string,
  ) {
    if (idempotencyKey) {
      const cached = await this.idempotencyService.check(
        'trades.recordExecution',
        idempotencyKey,
        dto,
      );
      if (cached.isCached) {
        return cached.body;
      }
    }

    const result = await this.databaseService.db.transaction(async (tx) => {
      // Lock journal_account_limits
      await tx
        .select()
        .from(journalAccountLimits)
        .where(
          and(
            eq(journalAccountLimits.journalId, dto.journalId),
            eq(journalAccountLimits.accountId, dto.accountId),
          ),
        )
        .for('update');

      const [inst] = await tx
        .select()
        .from(instruments)
        .where(eq(instruments.id, dto.instrumentId))
        .limit(1);
      if (!inst) throw new NotFoundException(`Instrument '${dto.instrumentId}' not found.`);

      const [stratVer] = await tx
        .select()
        .from(strategyVersions)
        .where(eq(strategyVersions.id, dto.strategyVersionId))
        .limit(1);
      if (!stratVer)
        throw new NotFoundException(`Strategy version '${dto.strategyVersionId}' not found.`);

      const todayStats = await this.getTodayStats(dto.journalId, dto.accountId, tx);

      const evalResult = evaluateTradeEligibility({
        direction: dto.direction,
        entryPrice: dto.actualEntry,
        stopPrice: dto.originalStop,
        targetPrice: dto.originalTarget,
        quantity: dto.quantity,
        tickSize: inst.tickSize,
        pointValue: inst.pointValue,
        strategyRules: stratVer.rules,
        strategyChecklist: stratVer.checklist,
        checklistAnswers: dto.checklistAnswers?.map((a) => ({
          itemKey: a.itemKey,
          answer: a.answer,
        })),
        todayStats,
      });

      const isClosed = dto.exitPrice !== undefined && dto.exitPrice !== null && dto.exitPrice !== '';
      const state = isClosed ? TradeState.CLOSED : TradeState.OPEN;

      const [created] = await tx
        .insert(trades)
        .values({
          journalId: dto.journalId,
          accountId: dto.accountId,
          instrumentId: dto.instrumentId,
          strategyVersionId: dto.strategyVersionId,
          windowId: dto.windowId ?? null,
          scenarioId: dto.scenarioId ?? null,
          state,
          recordingMode: RecordingMode.RETROSPECTIVE,
          direction: dto.direction,
          plannedEntry: dto.actualEntry,
          actualEntry: dto.actualEntry,
          originalStop: dto.originalStop,
          originalTarget: dto.originalTarget,
          quantity: dto.quantity,
          entryAt: new Date(dto.entryAt),
          actualContractSymbol: dto.actualContractSymbol ?? null,
          exitPrice: dto.exitPrice ?? null,
          exitAt: dto.exitAt ? new Date(dto.exitAt) : null,
          actualFees: dto.actualFees ?? null,
          feesConfirmed: dto.feesConfirmed ?? true,
          snapshot: {
            rulesSnapshot: stratVer.rules,
            checklistSnapshot: stratVer.checklist,
            instrumentSnapshot: {
              symbol: inst.symbol,
              tickSize: inst.tickSize,
              pointValue: inst.pointValue,
            },
          },
        })
        .returning();

      // Save checklist answers
      if (dto.checklistAnswers) {
        for (const a of dto.checklistAnswers) {
          await tx
            .insert(tradeChecklistAnswers)
            .values({
              tradeId: created.id,
              itemKey: a.itemKey,
              answer: a.answer,
              evidenceNote: a.evidenceNote ?? null,
            })
            .onConflictDoNothing();
        }
      }

      // Record violations if noncompliant
      if (evalResult.status === 'INELIGIBLE') {
        for (const reason of evalResult.reasons) {
          await tx.insert(tradeViolations).values({
            tradeId: created.id,
            code: 'RETROSPECTIVE_VIOLATION',
            severity: ViolationSeverity.SERIOUS,
            source: ViolationSource.RULE_ENGINE,
            note: reason,
          });
        }
      }

      await this.auditService.record(
        {
          entityType: 'trades',
          entityId: created.id,
          action: AuditAction.CREATE,
          reason: 'Recorded retrospective trade execution',
          afterJson: created,
          requestId,
        },
        tx,
      );

      return this.enrichTrade(created, inst);
    });

    if (idempotencyKey) {
      await this.idempotencyService.saveResult(
        'trades.recordExecution',
        idempotencyKey,
        dto,
        201,
        result,
        result.id,
      );
    }

    return result;
  }

  async closeTrade(
    id: string,
    dto: CloseTradeDto,
    idempotencyKey?: string,
    requestId?: string,
  ) {
    if (idempotencyKey) {
      const cached = await this.idempotencyService.check('trades.close', idempotencyKey, dto);
      if (cached.isCached) {
        return cached.body;
      }
    }

    const result = await this.databaseService.db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(trades)
        .where(eq(trades.id, id))
        .for('update')
        .limit(1);

      if (!current) throw new NotFoundException(`Trade '${id}' not found.`);
      if (current.state !== TradeState.OPEN) {
        throw new BadRequestException(`Cannot close trade in '${current.state}' state.`);
      }

      if (dto.expectedVersion !== undefined && current.version !== dto.expectedVersion) {
        throw new ConflictException(
          `Version conflict: current version is ${current.version}, expected ${dto.expectedVersion}.`,
        );
      }

      const [inst] = await tx
        .select()
        .from(instruments)
        .where(eq(instruments.id, current.instrumentId))
        .limit(1);

      const [updated] = await tx
        .update(trades)
        .set({
          state: TradeState.CLOSED,
          exitPrice: dto.exitPrice,
          exitAt: new Date(dto.exitAt),
          actualFees: dto.actualFees ?? null,
          feesConfirmed: dto.feesConfirmed ?? true,
          observedAdversePoints: dto.observedAdversePoints ?? null,
          observedFavorablePoints: dto.observedFavorablePoints ?? null,
          version: current.version + 1,
          updatedAt: new Date(),
        })
        .where(eq(trades.id, id))
        .returning();

      await this.auditService.record(
        {
          entityType: 'trades',
          entityId: id,
          action: AuditAction.UPDATE,
          reason: 'Closed trade execution',
          beforeJson: current,
          afterJson: updated,
          requestId,
        },
        tx,
      );

      return this.enrichTrade(updated, inst);
    });

    if (idempotencyKey) {
      await this.idempotencyService.saveResult(
        'trades.close',
        idempotencyKey,
        dto,
        200,
        result,
        result.id,
      );
    }

    return result;
  }

  async addManagementEvent(id: string, dto: AddManagementEventDto, requestId?: string) {
    const trade = await this.getTradeById(id);

    // Fetch previous stop from latest event or originalStop
    let previousStop = trade.originalStop;
    const events = await this.databaseService.db
      .select()
      .from(tradeManagementEvents)
      .where(
        and(
          eq(tradeManagementEvents.tradeId, id),
          eq(tradeManagementEvents.kind, ManagementEventKind.STOP_LOSS_UPDATE),
        ),
      )
      .orderBy(desc(tradeManagementEvents.observedAt))
      .limit(1);

    if (events.length > 0 && events[0].newValue) {
      previousStop = events[0].newValue;
    }

    // Check stop widening violation
    if (dto.kind === ManagementEventKind.STOP_LOSS_UPDATE) {
      const prev = new Decimal(previousStop);
      const next = new Decimal(dto.newValue);
      const isLong = trade.direction === TradeDirection.LONG;

      const isWidened = isLong ? next.lt(prev) : next.gt(prev);
      if (isWidened) {
        await this.databaseService.db.insert(tradeViolations).values({
          tradeId: id,
          code: 'STOP_WIDENED',
          severity: ViolationSeverity.SERIOUS,
          source: ViolationSource.RULE_ENGINE,
          note: `Stop loss was moved wider from ${prev.toFixed(6)} to ${next.toFixed(6)}.`,
        });
      }
    }

    const [createdEvent] = await this.databaseService.db
      .insert(tradeManagementEvents)
      .values({
        tradeId: id,
        kind: dto.kind,
        oldValue: previousStop,
        newValue: dto.newValue,
        reason: dto.reason ?? null,
      })
      .returning();

    await this.auditService.record({
      entityType: 'trade_management_events',
      entityId: createdEvent.id,
      action: AuditAction.CREATE,
      afterJson: createdEvent,
      requestId,
    });

    return createdEvent;
  }

  async correctTrade(id: string, dto: CorrectTradeDto, requestId?: string) {
    return this.databaseService.db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(trades)
        .where(eq(trades.id, id))
        .for('update')
        .limit(1);

      if (!current) throw new NotFoundException(`Trade '${id}' not found.`);
      if (current.state !== TradeState.CLOSED) {
        throw new BadRequestException('Only CLOSED trades can be corrected.');
      }

      if (current.version !== dto.expectedVersion) {
        throw new ConflictException(
          `Version conflict: current version is ${current.version}, expected ${dto.expectedVersion}.`,
        );
      }

      const updatePayload: Partial<typeof trades.$inferInsert> = {
        version: current.version + 1,
        updatedAt: new Date(),
        // Invalidate review on corrected trade
        reviewedAt: null,
        review: {},
      };

      if (dto.actualEntry !== undefined) updatePayload.actualEntry = dto.actualEntry;
      if (dto.originalStop !== undefined) updatePayload.originalStop = dto.originalStop;
      if (dto.originalTarget !== undefined) updatePayload.originalTarget = dto.originalTarget;
      if (dto.quantity !== undefined) updatePayload.quantity = dto.quantity;
      if (dto.exitPrice !== undefined) updatePayload.exitPrice = dto.exitPrice;
      if (dto.exitAt !== undefined) updatePayload.exitAt = new Date(dto.exitAt);
      if (dto.actualFees !== undefined) updatePayload.actualFees = dto.actualFees;
      if (dto.feesConfirmed !== undefined) updatePayload.feesConfirmed = dto.feesConfirmed;

      const [updated] = await tx
        .update(trades)
        .set(updatePayload)
        .where(eq(trades.id, id))
        .returning();

      // Invalidate day review on parent journal
      await tx
        .update(dailyJournals)
        .set({
          status: JournalStatus.ACTIVE,
          reviewedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(dailyJournals.id, current.journalId));

      await this.auditService.record(
        {
          entityType: 'trades',
          entityId: id,
          action: AuditAction.CORRECT,
          reason: dto.reason,
          beforeJson: current,
          afterJson: updated,
          requestId,
        },
        tx,
      );

      const [inst] = await tx
        .select()
        .from(instruments)
        .where(eq(instruments.id, updated.instrumentId))
        .limit(1);

      return this.enrichTrade(updated, inst);
    });
  }

  async voidTrade(id: string, dto: VoidTradeDto, requestId?: string) {
    const current = await this.getTradeById(id);

    if (current.version !== dto.expectedVersion) {
      throw new ConflictException(
        `Version conflict: current version is ${current.version}, expected ${dto.expectedVersion}.`,
      );
    }

    const [updated] = await this.databaseService.db
      .update(trades)
      .set({
        voidedAt: new Date(),
        voidReason: dto.reason,
        version: current.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(trades.id, id))
      .returning();

    await this.auditService.record({
      entityType: 'trades',
      entityId: id,
      action: AuditAction.VOID,
      reason: dto.reason,
      beforeJson: current,
      afterJson: updated,
      requestId,
    });

    return this.getTradeById(id);
  }

  async reviewTrade(id: string, dto: ReviewTradeDto, requestId?: string) {
    const current = await this.getTradeById(id);

    if (current.state !== TradeState.CLOSED) {
      throw new BadRequestException('Only CLOSED trades can be reviewed.');
    }

    if (!current.feesConfirmed || current.actualFees === null) {
      throw new BadRequestException('Cannot review trade with unconfirmed fees.');
    }

    if (dto.expectedVersion !== undefined && current.version !== dto.expectedVersion) {
      throw new ConflictException(
        `Version conflict: current version is ${current.version}, expected ${dto.expectedVersion}.`,
      );
    }

    const [updated] = await this.databaseService.db
      .update(trades)
      .set({
        review: dto.review,
        reviewedAt: new Date(),
        version: current.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(trades.id, id))
      .returning();

    await this.auditService.record({
      entityType: 'trades',
      entityId: id,
      action: AuditAction.UPDATE,
      reason: 'Reviewed trade',
      beforeJson: current,
      afterJson: updated,
      requestId,
    });

    return this.getTradeById(id);
  }

  async saveChecklistAnswers(id: string, dto: SaveChecklistAnswersDto) {
    for (const a of dto.answers) {
      await this.databaseService.db
        .insert(tradeChecklistAnswers)
        .values({
          tradeId: id,
          itemKey: a.itemKey,
          answer: a.answer,
          evidenceNote: a.evidenceNote ?? null,
        })
        .onConflictDoUpdate({
          target: [tradeChecklistAnswers.tradeId, tradeChecklistAnswers.itemKey],
          set: {
            answer: a.answer,
            evidenceNote: a.evidenceNote ?? null,
            updatedAt: new Date(),
          },
        });
    }

    return this.databaseService.db
      .select()
      .from(tradeChecklistAnswers)
      .where(eq(tradeChecklistAnswers.tradeId, id));
  }

  async getTradeById(id: string) {
    const [trade] = await this.databaseService.db
      .select()
      .from(trades)
      .where(eq(trades.id, id))
      .limit(1);

    if (!trade) {
      throw new NotFoundException(`Trade '${id}' not found.`);
    }

    const [inst] = await this.databaseService.db
      .select()
      .from(instruments)
      .where(eq(instruments.id, trade.instrumentId))
      .limit(1);

    const [acc] = await this.databaseService.db
      .select()
      .from(tradingAccounts)
      .where(eq(tradingAccounts.id, trade.accountId))
      .limit(1);

    const [stratVer] = await this.databaseService.db
      .select()
      .from(strategyVersions)
      .where(eq(strategyVersions.id, trade.strategyVersionId))
      .limit(1);

    const checklistAnswers = await this.databaseService.db
      .select()
      .from(tradeChecklistAnswers)
      .where(eq(tradeChecklistAnswers.tradeId, id));

    const managementEvents = await this.databaseService.db
      .select()
      .from(tradeManagementEvents)
      .where(eq(tradeManagementEvents.tradeId, id))
      .orderBy(tradeManagementEvents.observedAt);

    const violations = await this.databaseService.db
      .select()
      .from(tradeViolations)
      .where(eq(tradeViolations.tradeId, id));

    const tradeAttachments = await this.databaseService.db
      .select()
      .from(attachments)
      .where(eq(attachments.tradeId, id));

    const enriched = this.enrichTrade(trade, inst);

    return {
      ...enriched,
      account: acc,
      instrument: inst,
      strategyVersion: stratVer,
      checklistAnswers,
      managementEvents,
      violations,
      attachments: tradeAttachments,
    };
  }

  async listTrades(query: TradeQueryDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize && query.pageSize > 0 ? Math.min(query.pageSize, 100) : 25;
    const offset = (page - 1) * pageSize;

    let q = this.databaseService.db.select().from(trades).$dynamic();
    let countQ = this.databaseService.db
      .select({ count: count(trades.id) })
      .from(trades)
      .$dynamic();

    const conditions: any[] = [];

    if (!query.includeVoided) {
      conditions.push(isNull(trades.voidedAt));
    }
    if (query.accountId) {
      conditions.push(eq(trades.accountId, query.accountId));
    }
    if (query.journalId) {
      conditions.push(eq(trades.journalId, query.journalId));
    }
    if (query.state) {
      conditions.push(eq(trades.state, query.state));
    }
    if (query.from) {
      conditions.push(gte(trades.createdAt, new Date(query.from)));
    }
    if (query.to) {
      conditions.push(lte(trades.createdAt, new Date(query.to)));
    }

    if (conditions.length > 0) {
      q = q.where(and(...conditions));
      countQ = countQ.where(and(...conditions));
    }

    const rawTrades = await q.orderBy(desc(trades.createdAt)).limit(pageSize).offset(offset);
    const totalRes = await countQ;
    const total = Number(totalRes[0]?.count || 0);

    // Enrich trades with instruments and calculations
    const items: any[] = [];
    for (const t of rawTrades) {
      const [inst] = await this.databaseService.db
        .select()
        .from(instruments)
        .where(eq(instruments.id, t.instrumentId))
        .limit(1);

      items.push(this.enrichTrade(t, inst));
    }

    return {
      items,
      page,
      pageSize,
      total,
    };
  }
}
