import { describe, expect, it } from 'vitest';
import {
  calculatePositionRisk,
  calculatePositionSizeRecommendation,
  calculateRealizedPnL,
} from './calculations.js';
import { SEED_STRATEGY } from './constants.js';
import { sanitizeCsvField } from './csv-sanitizer.js';
import { ChecklistAnswer, DailyGrade, TradeDirection, TradeOutcome } from './enums.js';
import { calculateDailyProcessScore } from './review-scoring.js';
import { evaluateTradeEligibility } from './rules.js';

describe('Deterministic Financial Calculations (SRS Section 6)', () => {
  // Fixture 1: Long 5 contracts, entry 4435, stop 4430, target/exit 4445, m=10, fees=12.50
  it('Fixture 1: Long winning trade with fees', () => {
    const risk = calculatePositionRisk({
      entryPrice: '4435.000000',
      stopPrice: '4430.000000',
      quantity: 5,
      pointValue: '10.000000',
      targetPrice: '4445.000000',
    });

    expect(risk.stopPoints).toBe('5.000000');
    expect(risk.initialRisk).toBe('250.00');
    expect(risk.plannedReward).toBe('500.00');
    expect(risk.plannedRR).toBe('2.00000000');

    const pnl = calculateRealizedPnL({
      entryPrice: '4435.000000',
      exitPrice: '4445.000000',
      quantity: 5,
      pointValue: '10.000000',
      direction: TradeDirection.LONG,
      actualTotalFees: '12.50',
      initialRisk: risk.initialRisk,
    });

    expect(pnl.grossPnL).toBe('500.00');
    expect(pnl.netPnL).toBe('487.50');
    expect(pnl.grossR).toBe('2.00000000');
    expect(pnl.netR).toBe('1.95000000');
    expect(pnl.outcome).toBe(TradeOutcome.WIN);
  });

  // Fixture 2: Short 5 contracts, entry 4454, stop 4458, target/exit 4446, m=10, fees=12.50
  it('Fixture 2: Short winning trade with fees', () => {
    const risk = calculatePositionRisk({
      entryPrice: '4454.000000',
      stopPrice: '4458.000000',
      quantity: 5,
      pointValue: '10.000000',
      targetPrice: '4446.000000',
    });

    expect(risk.stopPoints).toBe('4.000000');
    expect(risk.initialRisk).toBe('200.00');
    expect(risk.plannedReward).toBe('400.00');
    expect(risk.plannedRR).toBe('2.00000000');

    const pnl = calculateRealizedPnL({
      entryPrice: '4454.000000',
      exitPrice: '4446.000000',
      quantity: 5,
      pointValue: '10.000000',
      direction: TradeDirection.SHORT,
      actualTotalFees: '12.50',
      initialRisk: risk.initialRisk,
    });

    expect(pnl.grossPnL).toBe('400.00');
    expect(pnl.netPnL).toBe('387.50');
    expect(pnl.grossR).toBe('2.00000000');
    expect(pnl.netR).toBe('1.93750000');
    expect(pnl.outcome).toBe(TradeOutcome.WIN);
  });

  // Fixture 3: Long first fixture exits at stop 4430, fees=12.50
  it('Fixture 3: Long losing trade at stop with fees', () => {
    const risk = calculatePositionRisk({
      entryPrice: '4435.000000',
      stopPrice: '4430.000000',
      quantity: 5,
      pointValue: '10.000000',
    });

    const pnl = calculateRealizedPnL({
      entryPrice: '4435.000000',
      exitPrice: '4430.000000',
      quantity: 5,
      pointValue: '10.000000',
      direction: TradeDirection.LONG,
      actualTotalFees: '12.50',
      initialRisk: risk.initialRisk,
    });

    expect(pnl.grossPnL).toBe('-250.00');
    expect(pnl.netPnL).toBe('-262.50');
    expect(pnl.netR).toBe('-1.05000000');
    expect(pnl.outcome).toBe(TradeOutcome.LOSS);
  });

  // Fixture 4: Entry equals exit, fees=12.50 -> gross 0, net -12.50, LOSS
  it('Fixture 4: Scratch trade with fees is a net LOSS', () => {
    const risk = calculatePositionRisk({
      entryPrice: '4435.000000',
      stopPrice: '4430.000000',
      quantity: 5,
      pointValue: '10.000000',
    });

    const pnl = calculateRealizedPnL({
      entryPrice: '4435.000000',
      exitPrice: '4435.000000',
      quantity: 5,
      pointValue: '10.000000',
      direction: TradeDirection.LONG,
      actualTotalFees: '12.50',
      initialRisk: risk.initialRisk,
    });

    expect(pnl.grossPnL).toBe('0.00');
    expect(pnl.netPnL).toBe('-12.50');
    expect(pnl.outcome).toBe(TradeOutcome.LOSS);
  });

  // Fixture 5: Price risk 250, estimated costs 12.50 (2.50/contract), all-in cap 250
  it('Fixture 5: Position size recommendation under all-in risk budget', () => {
    const rec = calculatePositionSizeRecommendation({
      entryPrice: '4435.000000',
      stopPrice: '4430.000000',
      pointValue: '10.000000',
      maxRiskDollars: '250.00',
      estimatedFeesPerContract: '2.50',
      maxContractsAllowed: 5,
    });

    // Single contract price risk = 5 * 10 = $50. All-in = $52.50. 250 / 52.50 = 4.76 -> 4 contracts ($210.00)
    expect(rec.recommendedContracts).toBe(4);
    expect(rec.estimatedAllInRisk).toBe('210.00');
    expect(rec.isFeasible).toBe(true);
  });

  // Fixture 6: All-in position size below one contract
  it('Fixture 6: All-in position size below one contract suggests 0', () => {
    const rec = calculatePositionSizeRecommendation({
      entryPrice: '4435.000000',
      stopPrice: '4400.000000', // 35 points * $10 = $350 risk per contract
      pointValue: '10.000000',
      maxRiskDollars: '250.00',
    });

    expect(rec.recommendedContracts).toBe(0);
    expect(rec.isFeasible).toBe(false);
  });

  // Provisional fee handling: null fees keeps net metrics null
  it('Provisional fee handling: null fees preserves null netPnL/netR/outcome', () => {
    const pnl = calculateRealizedPnL({
      entryPrice: '4435.000000',
      exitPrice: '4445.000000',
      quantity: 5,
      pointValue: '10.000000',
      direction: TradeDirection.LONG,
      actualTotalFees: null,
      initialRisk: '250.00',
    });

    expect(pnl.grossPnL).toBe('500.00');
    expect(pnl.netPnL).toBeNull();
    expect(pnl.grossR).toBe('2.00000000');
    expect(pnl.netR).toBeNull();
    expect(pnl.outcome).toBeNull();
  });
});

describe('Rule Engine & Gate Verification', () => {
  it('Requires 10/10 mandatory checklist items for ELIGIBLE status', () => {
    const allPassedAnswers = SEED_STRATEGY.checklist.items.map((item) => ({
      itemKey: item.key,
      answer: ChecklistAnswer.PASS,
    }));

    const result = evaluateTradeEligibility({
      direction: TradeDirection.LONG,
      entryPrice: '4435.000000',
      stopPrice: '4430.000000',
      targetPrice: '4445.000000',
      quantity: 5,
      tickSize: '0.100000',
      pointValue: '10.000000',
      strategyRules: SEED_STRATEGY.rules,
      strategyChecklist: SEED_STRATEGY.checklist,
      checklistAnswers: allPassedAnswers,
    });

    expect(result.status).toBe('ELIGIBLE');
    expect(result.reasons).toHaveLength(0);
  });

  it('Rejects eligibility if even 1 mandatory item fails (9/10 score cannot bypass gate)', () => {
    const ninePassedAnswers = SEED_STRATEGY.checklist.items.map((item, idx) => ({
      itemKey: item.key,
      answer: idx === 0 ? ChecklistAnswer.FAIL : ChecklistAnswer.PASS,
    }));

    const result = evaluateTradeEligibility({
      direction: TradeDirection.LONG,
      entryPrice: '4435.000000',
      stopPrice: '4430.000000',
      targetPrice: '4445.000000',
      quantity: 5,
      tickSize: '0.100000',
      pointValue: '10.000000',
      strategyRules: SEED_STRATEGY.rules,
      strategyChecklist: SEED_STRATEGY.checklist,
      checklistAnswers: ninePassedAnswers,
    });

    expect(result.status).toBe('INELIGIBLE');
    expect(result.reasons.some((r) => r.includes('Mandatory checklist condition failed'))).toBe(true);
  });

  it('Returns INCOMPLETE if mandatory checklist items are unanswered', () => {
    const incompleteAnswers = [
      { itemKey: 'htf_context', answer: ChecklistAnswer.PASS },
    ];

    const result = evaluateTradeEligibility({
      direction: TradeDirection.LONG,
      entryPrice: '4435.000000',
      stopPrice: '4430.000000',
      targetPrice: '4445.000000',
      quantity: 5,
      tickSize: '0.100000',
      pointValue: '10.000000',
      strategyRules: SEED_STRATEGY.rules,
      strategyChecklist: SEED_STRATEGY.checklist,
      checklistAnswers: incompleteAnswers,
    });

    expect(result.status).toBe('INCOMPLETE');
    expect(result.reasons.some((r) => r.includes('unanswered'))).toBe(true);
  });

  it('Rejects off-tick price inputs', () => {
    const result = evaluateTradeEligibility({
      direction: TradeDirection.LONG,
      entryPrice: '4435.050000', // 0.05 is not aligned with 0.10 tick size
      stopPrice: '4430.000000',
      quantity: 1,
      tickSize: '0.100000',
      pointValue: '10.000000',
    });

    expect(result.status).toBe('INELIGIBLE');
    expect(result.reasons.some((r) => r.includes('does not align with tick size'))).toBe(true);
  });

  it('Rejects wrong-side stop / target directions', () => {
    // Long with stop above entry
    const longBadStop = evaluateTradeEligibility({
      direction: TradeDirection.LONG,
      entryPrice: '4435.000000',
      stopPrice: '4440.000000',
      quantity: 1,
      tickSize: '0.100000',
      pointValue: '10.000000',
    });
    expect(longBadStop.status).toBe('INELIGIBLE');

    // Short with stop below entry
    const shortBadStop = evaluateTradeEligibility({
      direction: TradeDirection.SHORT,
      entryPrice: '4435.000000',
      stopPrice: '4430.000000',
      quantity: 1,
      tickSize: '0.100000',
      pointValue: '10.000000',
    });
    expect(shortBadStop.status).toBe('INELIGIBLE');
  });

  it('Enforces daily consecutive loss and trade count limits', () => {
    const result = evaluateTradeEligibility({
      direction: TradeDirection.LONG,
      entryPrice: '4435.000000',
      stopPrice: '4430.000000',
      quantity: 1,
      tickSize: '0.100000',
      pointValue: '10.000000',
      strategyRules: SEED_STRATEGY.rules,
      accountLimits: { maxDailyTrades: 3, consecutiveLossLimit: 2 },
      todayStats: {
        tradeCount: 3,
        realizedLoss: '100.00',
        consecutiveLosses: 2,
      },
    });

    expect(result.status).toBe('INELIGIBLE');
    expect(result.reasons.some((r) => r.includes('max allowed'))).toBe(true);
    expect(result.reasons.some((r) => r.includes('Consecutive loss limit reached'))).toBe(true);
  });
});

describe('Review Scoring and Grade Logic', () => {
  it('Calculates score and Grade A for 10/10 process compliance', () => {
    const items = [
      { key: 'item1', label: 'Item 1', applicable: true, passed: true },
      { key: 'item2', label: 'Item 2', applicable: true, passed: true },
      { key: 'item3', label: 'Item 3', applicable: true, passed: true },
      { key: 'item4', label: 'Item 4', applicable: true, passed: true },
      { key: 'item5', label: 'Item 5', applicable: true, passed: true },
      { key: 'item6', label: 'Item 6', applicable: true, passed: true },
      { key: 'item7', label: 'Item 7', applicable: true, passed: true },
      { key: 'item8', label: 'Item 8', applicable: true, passed: true },
      { key: 'item9', label: 'Item 9', applicable: true, passed: true },
      { key: 'item10', label: 'Item 10', applicable: true, passed: true },
    ];

    const res = calculateDailyProcessScore({ items });
    expect(res.score).toBe(10);
    expect(res.grade).toBe(DailyGrade.A);
  });

  it('Handles no-trade days allowing Grade A with prorated score', () => {
    const items = [
      { key: 'prep', label: 'Pre-market prep', applicable: true, passed: true },
      { key: 'wait', label: 'Disciplined patience', applicable: true, passed: true },
      { key: 'exec', label: 'Execution', applicable: false, passed: false },
    ];

    const res = calculateDailyProcessScore({ items, isNoTradeDay: true });
    expect(res.score).toBe(10);
    expect(res.grade).toBe(DailyGrade.A);
  });

  it('Assigns Grade D if serious violation exists regardless of score', () => {
    const items = [
      { key: 'item1', label: 'Item 1', applicable: true, passed: true },
    ];

    const res = calculateDailyProcessScore({ items, hasSeriousViolation: true });
    expect(res.grade).toBe(DailyGrade.D);
  });
});

describe('CSV Sanitization', () => {
  it('Neutralizes dangerous spreadsheet formula prefixes (=, +, -, @)', () => {
    expect(sanitizeCsvField('=SUM(A1:A10)')).toBe(`'=SUM(A1:A10)`);
    expect(sanitizeCsvField('+cmd|')).toBe(`'+cmd|`);
    expect(sanitizeCsvField('-10% discount')).toBe(`'-10% discount`);
    expect(sanitizeCsvField('@lookup(foo)')).toBe(`'@lookup(foo)`);
    expect(sanitizeCsvField('Normal text')).toBe('Normal text');
    expect(sanitizeCsvField('=SUM(A1, B1)')).toBe(`"'=SUM(A1, B1)"`);
  });
});
