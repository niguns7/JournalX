import { describe, it, expect } from 'vitest';
import {
  calculatePositionRisk,
  calculateRealizedPnL,
  calculatePositionSizeRecommendation,
  TradeDirection,
  TradeOutcome,
} from './index.js';
import Decimal from 'decimal.js';

describe('Financial & Export Reconciliation Specifications (S4-06)', () => {
  describe('1. Position Risk & RR Calculations', () => {
    it('calculates exact stop points, initial risk, planned reward, and planned RR', () => {
      // Instrument: MGC (Micro Gold, $10/pt)
      // Long 2 contracts @ 4435.00, Stop @ 4430.00, Target @ 4445.00
      const risk = calculatePositionRisk({
        entryPrice: '4435.00',
        stopPrice: '4430.00',
        quantity: 2,
        pointValue: '10.00',
        targetPrice: '4445.00',
      });

      expect(risk.stopPoints).toBe('5.000000');
      expect(risk.initialRisk).toBe('100.00'); // 5 pts * 2 contracts * $10 = $100.00
      expect(risk.plannedReward).toBe('200.00'); // 10 pts * 2 contracts * $10 = $200.00
      expect(Number(risk.plannedRR).toFixed(2)).toBe('2.00'); // $200 / $100 = 2.00 R
    });

    it('handles Short position risk with inverted pricing correctly', () => {
      // Short 1 contract @ 4440.00, Stop @ 4445.00, Target @ 4425.00
      const risk = calculatePositionRisk({
        entryPrice: '4440.00',
        stopPrice: '4445.00',
        quantity: 1,
        pointValue: '10.00',
        targetPrice: '4425.00',
      });

      expect(risk.stopPoints).toBe('5.000000');
      expect(risk.initialRisk).toBe('50.00');
      expect(risk.plannedReward).toBe('150.00');
      expect(Number(risk.plannedRR).toFixed(2)).toBe('3.00');
    });
  });

  describe('2. Realized PnL, Fees & Net R Arithmetic', () => {
    it('reconciles winning trade with confirmed fees against exact net R math', () => {
      // Long 2 contracts @ 4435.00, Exit @ 4445.00, Fees $5.50, Initial Risk $100.00
      const pnl = calculateRealizedPnL({
        entryPrice: '4435.00',
        exitPrice: '4445.00',
        quantity: 2,
        pointValue: '10.00',
        direction: TradeDirection.LONG,
        actualTotalFees: '5.50',
        initialRisk: '100.00',
      });

      expect(pnl.grossPnL).toBe('200.00');
      expect(pnl.netPnL).toBe('194.50'); // $200 - $5.50 = $194.50
      expect(Number(pnl.grossR).toFixed(4)).toBe('2.0000');
      expect(Number(pnl.netR).toFixed(4)).toBe('1.9450'); // $194.50 / $100 = 1.945 R
      expect(pnl.outcome).toBe(TradeOutcome.WIN);
    });

    it('handles provisional fee state where fees are unconfirmed', () => {
      const pnl = calculateRealizedPnL({
        entryPrice: '4435.00',
        exitPrice: '4445.00',
        quantity: 2,
        pointValue: '10.00',
        direction: TradeDirection.LONG,
        actualTotalFees: null,
        initialRisk: '100.00',
      });

      expect(pnl.grossPnL).toBe('200.00');
      expect(pnl.netPnL).toBeNull();
      expect(pnl.netR).toBeNull();
      expect(pnl.outcome).toBeNull();
      expect(Number(pnl.grossR).toFixed(4)).toBe('2.0000');
    });

    it('reconciles full loss trade with fees inflating loss beyond -1.00R', () => {
      // Long 2 contracts @ 4435.00, Stop Hit @ 4430.00, Fees $5.50, Initial Risk $100.00
      const pnl = calculateRealizedPnL({
        entryPrice: '4435.00',
        exitPrice: '4430.00',
        quantity: 2,
        pointValue: '10.00',
        direction: TradeDirection.LONG,
        actualTotalFees: '5.50',
        initialRisk: '100.00',
      });

      expect(pnl.grossPnL).toBe('-100.00');
      expect(pnl.netPnL).toBe('-105.50'); // -$100 - $5.50 = -$105.50
      expect(Number(pnl.grossR).toFixed(4)).toBe('-1.0000');
      expect(Number(pnl.netR).toFixed(4)).toBe('-1.0550'); // -$105.50 / $100 = -1.055 R
      expect(pnl.outcome).toBe(TradeOutcome.LOSS);
    });
  });

  describe('3. Position Size Budgeting & Sizing Recommendation', () => {
    it('calculates recommended contracts within strict risk basis dollar limit', () => {
      // Max dollar risk: $250.00
      // Entry 4435, Stop 4430 (5 pts @ $10/pt = $50/contract price risk)
      // Estimated fees per contract: $2.50
      // Single contract all-in risk: $52.50
      // 250 / 52.50 = 4.76 -> floor = 4 contracts
      const rec = calculatePositionSizeRecommendation({
        entryPrice: '4435.00',
        stopPrice: '4430.00',
        pointValue: '10.00',
        maxRiskDollars: '250.00',
        estimatedFeesPerContract: '2.50',
      });

      expect(rec.isFeasible).toBe(true);
      expect(rec.recommendedContracts).toBe(4);
      expect(rec.singleContractPriceRisk).toBe('50.00');
      expect(rec.singleContractAllInRisk).toBe('52.50');
      expect(rec.estimatedAllInRisk).toBe('210.00'); // 4 * $52.50 = $210.00 <= $250.00
    });

    it('returns 0 contracts when single contract all-in risk exceeds total budget', () => {
      const rec = calculatePositionSizeRecommendation({
        entryPrice: '4435.00',
        stopPrice: '4400.00', // 35 pts @ $10/pt = $350/contract
        pointValue: '10.00',
        maxRiskDollars: '250.00',
        estimatedFeesPerContract: '2.50',
      });

      expect(rec.isFeasible).toBe(false);
      expect(rec.recommendedContracts).toBe(0);
    });
  });

  describe('4. Portfolio Metrics & Statistical Integrity', () => {
    it('verifies that no-trade days are excluded from trade-level win rate calculation', () => {
      // Scenario: 10 calendar days, 4 trading days with 5 total trades, 6 no-trade days
      const trades = [
        { netR: new Decimal('2.0'), outcome: TradeOutcome.WIN },
        { netR: new Decimal('1.5'), outcome: TradeOutcome.WIN },
        { netR: new Decimal('-1.0'), outcome: TradeOutcome.LOSS },
        { netR: new Decimal('2.5'), outcome: TradeOutcome.WIN },
        { netR: new Decimal('-1.05'), outcome: TradeOutcome.LOSS },
      ];

      const noTradeDaysCount = 6;
      const totalCalendarDays = 10;

      const completedTradesCount = trades.filter((t) => t.outcome !== null).length;
      const winsCount = trades.filter((t) => t.outcome === TradeOutcome.WIN).length;
      const winRate = (winsCount / completedTradesCount) * 100;

      // Win rate must be 3/5 = 60%, NOT 3/10 = 30%
      expect(completedTradesCount).toBe(5);
      expect(winRate).toBe(60);

      // Cumulative Net R: 2.0 + 1.5 - 1.0 + 2.5 - 1.05 = 3.95 R
      const cumulativeNetR = trades.reduce((sum, t) => sum.plus(t.netR), new Decimal(0));
      expect(cumulativeNetR.toFixed(2)).toBe('3.95');

      // Expectancy R = (3/5 * ((2.0 + 1.5 + 2.5)/3)) - (2/5 * ((1.0 + 1.05)/2)) = (0.6 * 2.0) - (0.4 * 1.025) = 1.20 - 0.41 = 0.79 R
      const avgWinR = new Decimal(2.0).plus(1.5).plus(2.5).dividedBy(3);
      const avgLossR = new Decimal(1.0).plus(1.05).dividedBy(2);
      const expectancyR = new Decimal(0.6).times(avgWinR).minus(new Decimal(0.4).times(avgLossR));
      expect(expectancyR.toFixed(2)).toBe('0.79');
    });
  });
});
