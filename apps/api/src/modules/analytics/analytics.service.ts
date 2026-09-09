import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import {
  trades,
  instruments,
  dailyJournals,
  tradeViolations,
  strategies,
  strategyVersions,
  journalWindows,
} from '@journalx/db';
import { eq, and, gte, lte, isNull, asc } from 'drizzle-orm';
import { AnalyticsQueryDto } from './dto/analytics-query.dto.js';
import {
  calculatePositionRisk,
  calculateRealizedPnL,
  TradeDirection,
  TradeOutcome,
  TradeState,
} from '@journalx/domain';
import Decimal from 'decimal.js';

@Injectable()
export class AnalyticsService {
  constructor(private readonly databaseService: DatabaseService) {}

  private async getEligibleTrades(query: AnalyticsQueryDto) {
    let q = this.databaseService.db
      .select({
        trade: trades,
        instrument: instruments,
        journal: dailyJournals,
        strategyVersion: strategyVersions,
        window: journalWindows,
      })
      .from(trades)
      .innerJoin(instruments, eq(trades.instrumentId, instruments.id))
      .innerJoin(dailyJournals, eq(trades.journalId, dailyJournals.id))
      .innerJoin(strategyVersions, eq(trades.strategyVersionId, strategyVersions.id))
      .leftJoin(journalWindows, eq(trades.windowId, journalWindows.id))
      .where(
        and(
          isNull(trades.voidedAt),
          eq(trades.state, TradeState.CLOSED),
          query.accountId ? eq(trades.accountId, query.accountId) : undefined,
          query.from ? gte(dailyJournals.journalDate, query.from) : undefined,
          query.to ? lte(dailyJournals.journalDate, query.to) : undefined,
          query.strategyId ? eq(strategyVersions.strategyId, query.strategyId) : undefined,
        ),
      )
      .orderBy(asc(trades.exitAt), asc(trades.id));

    const rows = await q;

    const allClosed = rows.map((r) => {
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

      const pnlCalc = calculateRealizedPnL({
        entryPrice,
        exitPrice: r.trade.exitPrice || '0',
        quantity: qty,
        pointValue: pv,
        direction: r.trade.direction as TradeDirection,
        actualTotalFees: r.trade.feesConfirmed ? r.trade.actualFees : null,
        initialRisk: riskCalc.initialRisk,
      });

      return {
        ...r,
        riskCalc,
        pnlCalc,
      };
    });

    return allClosed;
  }

  async getSummary(query: AnalyticsQueryDto) {
    const tradeRows = await this.getEligibleTrades(query);

    const feeConfirmedTrades = tradeRows.filter(
      (r) => r.trade.feesConfirmed && r.trade.actualFees !== null && r.pnlCalc.netPnL !== null,
    );
    const provisionalCount = tradeRows.length - feeConfirmedTrades.length;

    let winsCount = 0;
    let lossesCount = 0;
    let breakevenCount = 0;

    let totalGrossPnL = new Decimal(0);
    let totalNetPnL = new Decimal(0);
    let totalFees = new Decimal(0);
    let totalNetR = new Decimal(0);
    let totalGrossR = new Decimal(0);

    let grossWinSum = new Decimal(0);
    let grossLossSum = new Decimal(0);

    let netWinSum = new Decimal(0);
    let netLossSum = new Decimal(0);

    let largestWinner: Decimal | null = null;
    let largestLoser: Decimal | null = null;

    let peakEquity = new Decimal(0);
    let maxDrawdownDollars = new Decimal(0);
    let currentEquity = new Decimal(0);

    for (const r of feeConfirmedTrades) {
      const gross = new Decimal(r.pnlCalc.grossPnL);
      const net = new Decimal(r.pnlCalc.netPnL!);
      const fees = new Decimal(r.trade.actualFees || '0');
      const grossR = new Decimal(r.pnlCalc.grossR || '0');
      const netR = new Decimal(r.pnlCalc.netR || '0');

      totalGrossPnL = totalGrossPnL.plus(gross);
      totalNetPnL = totalNetPnL.plus(net);
      totalFees = totalFees.plus(fees);
      totalGrossR = totalGrossR.plus(grossR);
      totalNetR = totalNetR.plus(netR);

      // Outcome
      if (r.pnlCalc.outcome === TradeOutcome.WIN) {
        winsCount++;
        grossWinSum = grossWinSum.plus(gross);
        netWinSum = netWinSum.plus(net);
        if (largestWinner === null || net.gt(largestWinner)) {
          largestWinner = net;
        }
      } else if (r.pnlCalc.outcome === TradeOutcome.LOSS) {
        lossesCount++;
        grossLossSum = grossLossSum.plus(gross.abs());
        netLossSum = netLossSum.plus(net.abs());
        if (largestLoser === null || net.lt(largestLoser)) {
          largestLoser = net;
        }
      } else {
        breakevenCount++;
      }

      // Track drawdown from peak
      currentEquity = currentEquity.plus(net);
      if (currentEquity.gt(peakEquity)) {
        peakEquity = currentEquity;
      }
      const dd = peakEquity.minus(currentEquity);
      if (dd.gt(maxDrawdownDollars)) {
        maxDrawdownDollars = dd;
      }
    }

    const totalTrades = feeConfirmedTrades.length;

    const winRate =
      totalTrades > 0
        ? new Decimal(winsCount).dividedBy(totalTrades).toFixed(8)
        : null;

    let profitFactor: string | null = null;
    if (netLossSum.isZero()) {
      profitFactor = totalTrades > 0 ? null : null; // 'No losses'
    } else {
      profitFactor = netWinSum.dividedBy(netLossSum).toFixed(8);
    }

    const meanNetR =
      totalTrades > 0 ? totalNetR.dividedBy(totalTrades).toFixed(8) : null;
    const meanGrossR =
      totalTrades > 0 ? totalGrossR.dividedBy(totalTrades).toFixed(8) : null;

    const meanWinningTrade =
      winsCount > 0 ? netWinSum.dividedBy(winsCount).toFixed(2) : null;
    const meanLosingTrade =
      lossesCount > 0 ? netLossSum.dividedBy(lossesCount).times(-1).toFixed(2) : null;

    return {
      totalClosedTrades: totalTrades,
      provisionalTradesCount: provisionalCount,
      winsCount,
      lossesCount,
      breakevenCount,
      winRate,
      profitFactor,
      totalNetPnL: totalNetPnL.toFixed(2),
      totalGrossPnL: totalGrossPnL.toFixed(2),
      totalFees: totalFees.toFixed(2),
      meanNetR,
      meanGrossR,
      sumNetR: totalNetR.toFixed(8),
      meanWinningTrade,
      meanLosingTrade,
      largestWinner: largestWinner ? largestWinner.toFixed(2) : null,
      largestLoser: largestLoser ? largestLoser.toFixed(2) : null,
      maxDrawdownDollars: maxDrawdownDollars.toFixed(2),
    };
  }

  async getDaily(query: AnalyticsQueryDto) {
    const tradeRows = await this.getEligibleTrades(query);

    const dailyMap = new Map<
      string,
      {
        journalDate: string;
        tradeCount: number;
        winsCount: number;
        lossesCount: number;
        breakevenCount: number;
        netPnL: Decimal;
        netR: Decimal;
        grossPnL: Decimal;
        fees: Decimal;
      }
    >();

    for (const r of tradeRows) {
      if (!r.trade.feesConfirmed || r.pnlCalc.netPnL === null) continue;

      const dateStr = r.journal.journalDate;
      let dayStat = dailyMap.get(dateStr);
      if (!dayStat) {
        dayStat = {
          journalDate: dateStr,
          tradeCount: 0,
          winsCount: 0,
          lossesCount: 0,
          breakevenCount: 0,
          netPnL: new Decimal(0),
          netR: new Decimal(0),
          grossPnL: new Decimal(0),
          fees: new Decimal(0),
        };
        dailyMap.set(dateStr, dayStat);
      }

      dayStat.tradeCount++;
      dayStat.grossPnL = dayStat.grossPnL.plus(new Decimal(r.pnlCalc.grossPnL));
      dayStat.netPnL = dayStat.netPnL.plus(new Decimal(r.pnlCalc.netPnL));
      dayStat.fees = dayStat.fees.plus(new Decimal(r.trade.actualFees || '0'));
      dayStat.netR = dayStat.netR.plus(new Decimal(r.pnlCalc.netR || '0'));

      if (r.pnlCalc.outcome === TradeOutcome.WIN) dayStat.winsCount++;
      else if (r.pnlCalc.outcome === TradeOutcome.LOSS) dayStat.lossesCount++;
      else dayStat.breakevenCount++;
    }

    return Array.from(dailyMap.values())
      .sort((a, b) => a.journalDate.localeCompare(b.journalDate))
      .map((d) => ({
        journalDate: d.journalDate,
        tradeCount: d.tradeCount,
        winsCount: d.winsCount,
        lossesCount: d.lossesCount,
        breakevenCount: d.breakevenCount,
        netPnL: d.netPnL.toFixed(2),
        grossPnL: d.grossPnL.toFixed(2),
        fees: d.fees.toFixed(2),
        netR: d.netR.toFixed(8),
      }));
  }

  async getEquityCurve(query: AnalyticsQueryDto) {
    const tradeRows = await this.getEligibleTrades(query);

    const feeConfirmedTrades = tradeRows.filter(
      (r) => r.trade.feesConfirmed && r.pnlCalc.netPnL !== null,
    );

    let cumulativeNetPnL = new Decimal(0);
    let cumulativeNetR = new Decimal(0);
    let peakNetPnL = new Decimal(0);

    const curve: any[] = [];

    for (const r of feeConfirmedTrades) {
      const net = new Decimal(r.pnlCalc.netPnL!);
      const netR = new Decimal(r.pnlCalc.netR || '0');

      cumulativeNetPnL = cumulativeNetPnL.plus(net);
      cumulativeNetR = cumulativeNetR.plus(netR);

      if (cumulativeNetPnL.gt(peakNetPnL)) {
        peakNetPnL = cumulativeNetPnL;
      }

      const drawdown = peakNetPnL.minus(cumulativeNetPnL);

      curve.push({
        tradeId: r.trade.id,
        exitAt: r.trade.exitAt,
        journalDate: r.journal.journalDate,
        netPnL: net.toFixed(2),
        cumulativeNetPnL: cumulativeNetPnL.toFixed(2),
        peakCumulativeNetPnL: peakNetPnL.toFixed(2),
        drawdownDollars: drawdown.toFixed(2),
        netR: netR.toFixed(8),
        cumulativeNetR: cumulativeNetR.toFixed(8),
      });
    }

    return curve;
  }

  async getBreakdowns(query: AnalyticsQueryDto) {
    const tradeRows = await this.getEligibleTrades(query);
    const confirmed = tradeRows.filter((r) => r.trade.feesConfirmed && r.pnlCalc.netPnL !== null);

    // Direction breakdown
    const directionBreakdown = {
      LONG: { count: 0, wins: 0, netPnL: new Decimal(0), netR: new Decimal(0) },
      SHORT: { count: 0, wins: 0, netPnL: new Decimal(0), netR: new Decimal(0) },
    };

    // Window breakdown
    const windowBreakdown: Record<string, { count: number; wins: number; netPnL: Decimal; netR: Decimal }> = {};

    for (const r of confirmed) {
      const dir = r.trade.direction as 'LONG' | 'SHORT';
      const net = new Decimal(r.pnlCalc.netPnL!);
      const netR = new Decimal(r.pnlCalc.netR || '0');

      if (directionBreakdown[dir]) {
        directionBreakdown[dir].count++;
        directionBreakdown[dir].netPnL = directionBreakdown[dir].netPnL.plus(net);
        directionBreakdown[dir].netR = directionBreakdown[dir].netR.plus(netR);
        if (r.pnlCalc.outcome === TradeOutcome.WIN) directionBreakdown[dir].wins++;
      }

      const windowLabel = r.window?.label || 'Unassigned Window';
      if (!windowBreakdown[windowLabel]) {
        windowBreakdown[windowLabel] = {
          count: 0,
          wins: 0,
          netPnL: new Decimal(0),
          netR: new Decimal(0),
        };
      }
      windowBreakdown[windowLabel].count++;
      windowBreakdown[windowLabel].netPnL = windowBreakdown[windowLabel].netPnL.plus(net);
      windowBreakdown[windowLabel].netR = windowBreakdown[windowLabel].netR.plus(netR);
      if (r.pnlCalc.outcome === TradeOutcome.WIN) windowBreakdown[windowLabel].wins++;
    }

    return {
      direction: {
        LONG: {
          count: directionBreakdown.LONG.count,
          winRate:
            directionBreakdown.LONG.count > 0
              ? (directionBreakdown.LONG.wins / directionBreakdown.LONG.count).toFixed(4)
              : null,
          netPnL: directionBreakdown.LONG.netPnL.toFixed(2),
          netR: directionBreakdown.LONG.netR.toFixed(8),
        },
        SHORT: {
          count: directionBreakdown.SHORT.count,
          winRate:
            directionBreakdown.SHORT.count > 0
              ? (directionBreakdown.SHORT.wins / directionBreakdown.SHORT.count).toFixed(4)
              : null,
          netPnL: directionBreakdown.SHORT.netPnL.toFixed(2),
          netR: directionBreakdown.SHORT.netR.toFixed(8),
        },
      },
      windows: Object.entries(windowBreakdown).map(([label, stat]) => ({
        label,
        count: stat.count,
        winRate: stat.count > 0 ? (stat.wins / stat.count).toFixed(4) : null,
        netPnL: stat.netPnL.toFixed(2),
        netR: stat.netR.toFixed(8),
      })),
    };
  }

  async getDiscipline(query: AnalyticsQueryDto) {
    const tradeRows = await this.getEligibleTrades(query);
    const confirmed = tradeRows.filter((r) => r.trade.feesConfirmed && r.pnlCalc.netPnL !== null);

    let goodWins = 0;
    let badWins = 0;
    let goodLosses = 0;
    let badLosses = 0;

    for (const r of confirmed) {
      const violations = await this.databaseService.db
        .select()
        .from(tradeViolations)
        .where(eq(tradeViolations.tradeId, r.trade.id));

      const isDisciplined = violations.length === 0;
      const isWin = r.pnlCalc.outcome === TradeOutcome.WIN;

      if (isWin && isDisciplined) goodWins++;
      else if (isWin && !isDisciplined) badWins++;
      else if (!isWin && isDisciplined) goodLosses++;
      else badLosses++;
    }

    return {
      matrix: {
        goodWins,
        badWins,
        goodLosses,
        badLosses,
      },
      totalDisciplinedTrades: goodWins + goodLosses,
      totalUndisciplinedTrades: badWins + badLosses,
      disciplineRate:
        confirmed.length > 0
          ? ((goodWins + goodLosses) / confirmed.length).toFixed(4)
          : null,
    };
  }
}
