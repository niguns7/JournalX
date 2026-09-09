import Decimal from 'decimal.js';
import { calculatePositionRisk, calculatePositionSizeRecommendation } from './calculations.js';
import { ChecklistAnswer, TradeDirection } from './enums.js';
import {
  AccountRiskDefaultsJson,
  ChecklistItemDefinition,
  StrategyChecklistJson,
  StrategyRulesJson,
} from './types.js';

export type EligibilityStatus = 'ELIGIBLE' | 'INELIGIBLE' | 'INCOMPLETE';

export interface EvaluateTradeEligibilityInput {
  direction: TradeDirection;
  entryPrice: string;
  stopPrice: string;
  targetPrice?: string;
  quantity: number;
  tickSize: string;
  pointValue: string;
  strategyRules?: StrategyRulesJson | null;
  strategyChecklist?: StrategyChecklistJson | null;
  checklistAnswers?: Array<{ itemKey: string; answer: ChecklistAnswer }> | null;
  accountLimits?: AccountRiskDefaultsJson | null;
  todayStats?: {
    tradeCount: number; // Open + Closed actual trades
    realizedLoss: string; // Positive number representing cumulative realized loss dollars
    consecutiveLosses: number;
    hasIndeterminateFeeTrade?: boolean;
  } | null;
}

export interface EvaluateTradeEligibilityOutput {
  status: EligibilityStatus;
  reasons: string[];
  suggestedQuantity?: number;
  initialRisk: string;
  stopPoints: string;
  plannedRR?: string;
  plannedReward?: string;
}

function isTickAligned(priceStr: string, tickSizeStr: string): boolean {
  try {
    const price = new Decimal(priceStr);
    const tick = new Decimal(tickSizeStr);
    if (tick.isZero()) return false;
    const remainder = price.modulo(tick);
    // Exact or within floating micro precision
    return remainder.isZero() || remainder.abs().lt('0.000000001') || remainder.minus(tick).abs().lt('0.000000001');
  } catch {
    return false;
  }
}

export function evaluateTradeEligibility(
  input: EvaluateTradeEligibilityInput,
): EvaluateTradeEligibilityOutput {
  const reasons: string[] = [];
  let isHardIneligible = false;
  let isIncomplete = false;

  const qty = input.quantity;
  if (!Number.isInteger(qty) || qty <= 0) {
    reasons.push('Contract quantity must be a positive integer.');
    isHardIneligible = true;
  }

  // Decimal inputs
  let entry: Decimal;
  let stop: Decimal;
  let pv: Decimal;
  let tick: Decimal;

  try {
    entry = new Decimal(input.entryPrice);
    stop = new Decimal(input.stopPrice);
    pv = new Decimal(input.pointValue);
    tick = new Decimal(input.tickSize);
  } catch {
    return {
      status: 'INELIGIBLE',
      reasons: ['Invalid numeric prices or instrument parameters.'],
      initialRisk: '0.00',
      stopPoints: '0.000000',
    };
  }

  if (pv.lte(0) || tick.lte(0)) {
    reasons.push('Instrument tick size and point value must be strictly positive.');
    isHardIneligible = true;
  }

  // Tick alignment check
  if (!isTickAligned(input.entryPrice, input.tickSize)) {
    reasons.push(`Entry price ${input.entryPrice} does not align with tick size ${input.tickSize}.`);
    isHardIneligible = true;
  }
  if (!isTickAligned(input.stopPrice, input.tickSize)) {
    reasons.push(`Stop price ${input.stopPrice} does not align with tick size ${input.tickSize}.`);
    isHardIneligible = true;
  }
  if (input.targetPrice && !isTickAligned(input.targetPrice, input.tickSize)) {
    reasons.push(`Target price ${input.targetPrice} does not align with tick size ${input.tickSize}.`);
    isHardIneligible = true;
  }

  // Directional check
  if (input.direction === TradeDirection.LONG) {
    if (entry.lte(stop)) {
      reasons.push('For a LONG trade, entry price must be strictly greater than stop price.');
      isHardIneligible = true;
    }
    if (input.targetPrice && new Decimal(input.targetPrice).lte(entry)) {
      reasons.push('For a LONG trade, target price must be strictly greater than entry price.');
      isHardIneligible = true;
    }
  } else {
    // SHORT
    if (entry.gte(stop)) {
      reasons.push('For a SHORT trade, entry price must be strictly less than stop price.');
      isHardIneligible = true;
    }
    if (input.targetPrice && new Decimal(input.targetPrice).gte(entry)) {
      reasons.push('For a SHORT trade, target price must be strictly less than entry price.');
      isHardIneligible = true;
    }
  }

  // Calculate position risk
  const riskCalc = calculatePositionRisk({
    entryPrice: input.entryPrice,
    stopPrice: input.stopPrice,
    quantity: Math.max(1, qty),
    pointValue: input.pointValue,
    targetPrice: input.targetPrice,
  });

  const stopPoints = new Decimal(riskCalc.stopPoints);
  const initialRisk = new Decimal(riskCalc.initialRisk);

  // Strategy rules checks
  const rules = input.strategyRules;
  if (rules) {
    if (rules.maxContracts && qty > rules.maxContracts) {
      reasons.push(`Position size (${qty} contracts) exceeds strategy maximum (${rules.maxContracts}).`);
      isHardIneligible = true;
    }

    if (rules.maxStructuralStopPoints) {
      const maxStop = new Decimal(rules.maxStructuralStopPoints);
      if (stopPoints.gt(maxStop)) {
        reasons.push(
          `Structural stop distance (${stopPoints.toFixed(6)} points) exceeds strategy maximum (${maxStop.toFixed(6)} points).`,
        );
        isHardIneligible = true;
      }
    }

    if (rules.minPlannedRR && riskCalc.plannedRR) {
      const minRR = new Decimal(rules.minPlannedRR);
      const actualRR = new Decimal(riskCalc.plannedRR);
      if (actualRR.lt(minRR)) {
        reasons.push(`Planned R:R ratio (${actualRR.toFixed(2)}) is below strategy minimum (${minRR.toFixed(2)}).`);
        isHardIneligible = true;
      }
    }

    if (rules.maxRiskPerTradeDollars) {
      const maxRisk = new Decimal(rules.maxRiskPerTradeDollars);
      if (initialRisk.gt(maxRisk)) {
        reasons.push(
          `Initial risk ($${initialRisk.toFixed(2)}) exceeds strategy maximum risk ($${maxRisk.toFixed(2)}).`,
        );
        isHardIneligible = true;
      }
    }
  }

  // Account limit checks
  const accountLimits = input.accountLimits;
  if (accountLimits) {
    if (accountLimits.maxContractsPerTrade && qty > accountLimits.maxContractsPerTrade) {
      reasons.push(
        `Position size (${qty} contracts) exceeds account maximum (${accountLimits.maxContractsPerTrade}).`,
      );
      isHardIneligible = true;
    }

    if (accountLimits.maxRiskPerTrade) {
      const maxAccRisk = new Decimal(accountLimits.maxRiskPerTrade);
      if (initialRisk.gt(maxAccRisk)) {
        reasons.push(
          `Initial risk ($${initialRisk.toFixed(2)}) exceeds account maximum risk ($${maxAccRisk.toFixed(2)}).`,
        );
        isHardIneligible = true;
      }
    }
  }

  // Today stats / daily guard checks
  const stats = input.todayStats;
  if (stats) {
    if (stats.hasIndeterminateFeeTrade) {
      reasons.push('Previous trade closed with unconfirmed fees; consecutive loss status is indeterminate.');
      isHardIneligible = true;
    }

    if (accountLimits?.maxDailyTrades !== undefined && stats.tradeCount >= accountLimits.maxDailyTrades) {
      reasons.push(`Daily trade count (${stats.tradeCount}) has reached max allowed (${accountLimits.maxDailyTrades}).`);
      isHardIneligible = true;
    }

    const lossLimitCount = accountLimits?.consecutiveLossLimit ?? rules?.consecutiveLossStopCount;
    if (lossLimitCount !== undefined && stats.consecutiveLosses >= lossLimitCount) {
      reasons.push(
        `Consecutive loss limit reached (${stats.consecutiveLosses} consecutive losses; limit is ${lossLimitCount}).`,
      );
      isHardIneligible = true;
    }

    if (accountLimits?.maxDailyLoss) {
      const maxDailyLoss = new Decimal(accountLimits.maxDailyLoss);
      const currentLoss = new Decimal(stats.realizedLoss || '0');
      if (currentLoss.gte(maxDailyLoss)) {
        reasons.push(
          `Daily loss budget exceeded (current loss $${currentLoss.toFixed(2)} >= limit $${maxDailyLoss.toFixed(2)}).`,
        );
        isHardIneligible = true;
      }
    }
  }

  // Checklist evaluation
  const checklist = input.strategyChecklist;
  const answersMap = new Map<string, ChecklistAnswer>();
  if (input.checklistAnswers) {
    for (const a of input.checklistAnswers) {
      answersMap.set(a.itemKey, a.answer);
    }
  }

  if (checklist && checklist.items && checklist.items.length > 0) {
    for (const item of checklist.items) {
      const answer = answersMap.get(item.key) ?? ChecklistAnswer.UNANSWERED;

      if (item.isMandatory) {
        if (answer === ChecklistAnswer.FAIL) {
          reasons.push(`Mandatory checklist condition failed: "${item.label}".`);
          isHardIneligible = true;
        } else if (answer === ChecklistAnswer.NOT_APPLICABLE) {
          reasons.push(`Mandatory condition cannot be NOT_APPLICABLE: "${item.label}".`);
          isHardIneligible = true;
        } else if (answer === ChecklistAnswer.UNANSWERED) {
          reasons.push(`Mandatory condition unanswered: "${item.label}".`);
          isIncomplete = true;
        }
      }
    }
  }

  // Calculate suggested quantity if risk was exceeded
  let suggestedQuantity: number | undefined;
  const effectiveMaxRisk = rules?.maxRiskPerTradeDollars ?? accountLimits?.maxRiskPerTrade;
  if (effectiveMaxRisk && (isHardIneligible || initialRisk.gt(new Decimal(effectiveMaxRisk)))) {
    const maxContractsCap = Math.min(
      rules?.maxContracts ?? Infinity,
      accountLimits?.maxContractsPerTrade ?? Infinity,
    );
    const sizingRec = calculatePositionSizeRecommendation({
      entryPrice: input.entryPrice,
      stopPrice: input.stopPrice,
      pointValue: input.pointValue,
      maxRiskDollars: effectiveMaxRisk,
      maxContractsAllowed: Number.isFinite(maxContractsCap) ? maxContractsCap : undefined,
    });
    suggestedQuantity = sizingRec.recommendedContracts;
  }

  let status: EligibilityStatus = 'ELIGIBLE';
  if (isHardIneligible) {
    status = 'INELIGIBLE';
  } else if (isIncomplete) {
    status = 'INCOMPLETE';
  }

  return {
    status,
    reasons,
    suggestedQuantity,
    initialRisk: riskCalc.initialRisk,
    stopPoints: riskCalc.stopPoints,
    plannedRR: riskCalc.plannedRR,
    plannedReward: riskCalc.plannedReward,
  };
}
