import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import {
  trades,
  instruments,
  dailyJournals,
  tradingAccounts,
} from '@journalx/db';
import { eq, and, gte, lte, isNull, desc } from 'drizzle-orm';
import {
  generateCsvString,
  calculatePositionRisk,
  calculateRealizedPnL,
  TradeDirection,
  RealizedPnLOutput,
} from '@journalx/domain';
import { TradeQueryDto } from '../trades/dto/trade.dto.js';

@Injectable()
export class ExportsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async exportTradesCsv(query: TradeQueryDto): Promise<string> {
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
      conditions.push(gte(dailyJournals.journalDate, query.from));
    }
    if (query.to) {
      conditions.push(lte(dailyJournals.journalDate, query.to));
    }

    const rows = await this.databaseService.db
      .select({
        trade: trades,
        instrument: instruments,
        account: tradingAccounts,
        journal: dailyJournals,
      })
      .from(trades)
      .innerJoin(instruments, eq(trades.instrumentId, instruments.id))
      .innerJoin(tradingAccounts, eq(trades.accountId, tradingAccounts.id))
      .innerJoin(dailyJournals, eq(trades.journalId, dailyJournals.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(trades.createdAt));

    const headers = [
      'Trade ID',
      'Journal Date',
      'Account',
      'Symbol',
      'Contract Symbol',
      'Direction',
      'State',
      'Quantity',
      'Planned Entry',
      'Actual Entry',
      'Original Stop',
      'Original Target',
      'Exit Price',
      'Entry At',
      'Exit At',
      'Gross PnL ($)',
      'Net PnL ($)',
      'Gross R',
      'Net R',
      'Actual Fees ($)',
      'Outcome',
      'Voided',
    ];

    const dataRows: any[] = [];

    for (const r of rows) {
      const entryPrice = r.trade.actualEntry || r.trade.plannedEntry || '0';
      const stopPrice = r.trade.originalStop;
      const targetPrice = r.trade.originalTarget;
      const qty = r.trade.quantity;
      const pv = r.instrument.pointValue;

      const riskCalc = calculatePositionRisk({
        entryPrice,
        stopPrice,
        quantity: qty,
        pointValue: pv,
        targetPrice,
      });

      let pnlCalc: RealizedPnLOutput | null = null;
      if (r.trade.exitPrice) {
        pnlCalc = calculateRealizedPnL({
          entryPrice,
          exitPrice: r.trade.exitPrice,
          quantity: qty,
          pointValue: pv,
          direction: r.trade.direction as TradeDirection,
          actualTotalFees: r.trade.feesConfirmed ? r.trade.actualFees : null,
          initialRisk: riskCalc.initialRisk,
        });
      }

      dataRows.push([
        r.trade.id,
        r.journal.journalDate,
        r.account.name,
        r.instrument.symbol,
        r.trade.actualContractSymbol || '',
        r.trade.direction,
        r.trade.state,
        r.trade.quantity,
        r.trade.plannedEntry || '',
        r.trade.actualEntry || '',
        r.trade.originalStop,
        r.trade.originalTarget,
        r.trade.exitPrice || '',
        r.trade.entryAt ? r.trade.entryAt.toISOString() : '',
        r.trade.exitAt ? r.trade.exitAt.toISOString() : '',
        pnlCalc ? pnlCalc.grossPnL : '',
        pnlCalc?.netPnL !== null && pnlCalc?.netPnL !== undefined ? pnlCalc.netPnL : '',
        pnlCalc ? pnlCalc.grossR : '',
        pnlCalc?.netR !== null && pnlCalc?.netR !== undefined ? pnlCalc.netR : '',
        r.trade.actualFees || '',
        pnlCalc ? pnlCalc.outcome || '' : '',
        r.trade.voidedAt ? 'YES' : 'NO',
      ]);
    }

    return generateCsvString(headers, dataRows);
  }

  async exportJournalsCsv(from?: string, to?: string): Promise<string> {
    const conditions: any[] = [];
    if (from) conditions.push(gte(dailyJournals.journalDate, from));
    if (to) conditions.push(lte(dailyJournals.journalDate, to));

    const rows = await this.databaseService.db
      .select()
      .from(dailyJournals)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(dailyJournals.journalDate));

    const headers = [
      'Journal ID',
      'Journal Date',
      'Timezone',
      'Status',
      'Daily Grade',
      'Grade Override',
      'Process Score',
      'Sleep Quality',
      'Focus Rating',
      'Stress Rating',
      'Preparation Notes',
      'Reviewed At',
    ];

    const dataRows = rows.map((j) => [
      j.id,
      j.journalDate,
      j.timezoneSnapshot,
      j.status,
      j.dailyGrade || '',
      j.gradeOverride || '',
      j.processEvaluation?.score !== undefined ? j.processEvaluation.score : '',
      j.sleepQuality !== null ? j.sleepQuality : '',
      j.focusRating !== null ? j.focusRating : '',
      j.stressRating !== null ? j.stressRating : '',
      j.preparationNotes || '',
      j.reviewedAt ? j.reviewedAt.toISOString() : '',
    ]);

    return generateCsvString(headers, dataRows);
  }
}
