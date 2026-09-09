import Decimal from 'decimal.js';
import { TradeDirection, TradeOutcome } from './enums.js';

// Configure standard precision and rounding
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export interface PositionRiskInput {
  entryPrice: string; // numeric string
  stopPrice: string; // numeric string
  quantity: number; // contracts
  pointValue: string; // numeric string
  targetPrice?: string; // optional planned target
  estimatedRoundTripFees?: string; // optional fee estimate
  slippageAllowance?: string; // optional slippage allowance
}

export interface PositionRiskOutput {
  stopPoints: string;
  initialRisk: string; // initial gross price risk
  plannedReward?: string;
  plannedRR?: string;
  estimatedAllInRisk?: string;
}

export interface RealizedPnLInput {
  entryPrice: string;
  exitPrice: string;
  quantity: number;
  pointValue: string;
  direction: TradeDirection;
  actualTotalFees?: string | null;
  initialRisk?: string;
}

export interface RealizedPnLOutput {
  grossPnL: string;
  netPnL: string | null;
  grossR: string | null;
  netR: string | null;
  outcome: TradeOutcome | null;
}

export interface PositionSizeRecommendationInput {
  entryPrice: string;
  stopPrice: string;
  pointValue: string;
  maxRiskDollars: string;
  estimatedFeesPerContract?: string;
  slippageAllowancePerContract?: string;
  maxContractsAllowed?: number;
}

export interface PositionSizeRecommendationOutput {
  recommendedContracts: number;
  estimatedAllInRisk: string;
  singleContractPriceRisk: string;
  singleContractAllInRisk: string;
  isFeasible: boolean;
  explanation: string;
}

/**
 * Calculates initial gross price risk, stop distance in points, planned reward, and planned RR.
 */
export function calculatePositionRisk(input: PositionRiskInput): PositionRiskOutput {
  const entry = new Decimal(input.entryPrice);
  const stop = new Decimal(input.stopPrice);
  const qty = new Decimal(input.quantity);
  const pv = new Decimal(input.pointValue);

  const stopPoints = entry.minus(stop).abs();
  const initialRisk = stopPoints.times(qty).times(pv);

  const result: PositionRiskOutput = {
    stopPoints: stopPoints.toFixed(6),
    initialRisk: initialRisk.toFixed(2),
  };

  if (input.targetPrice !== undefined && input.targetPrice !== null && input.targetPrice !== '') {
    const target = new Decimal(input.targetPrice);
    const plannedReward = target.minus(entry).abs().times(qty).times(pv);
    result.plannedReward = plannedReward.toFixed(2);

    if (!initialRisk.isZero()) {
      const plannedRR = plannedReward.dividedBy(initialRisk);
      result.plannedRR = plannedRR.toFixed(8);
    }
  }

  if (input.estimatedRoundTripFees !== undefined || input.slippageAllowance !== undefined) {
    const fees = new Decimal(input.estimatedRoundTripFees || '0');
    const slippage = new Decimal(input.slippageAllowance || '0');
    const allIn = initialRisk.plus(fees).plus(slippage);
    result.estimatedAllInRisk = allIn.toFixed(2);
  }

  return result;
}

/**
 * Calculates gross PnL, net PnL, gross R, net R, and trade outcome.
 * If actualTotalFees is null/undefined, netPnL, netR and outcome remain null (provisional).
 */
export function calculateRealizedPnL(input: RealizedPnLInput): RealizedPnLOutput {
  const entry = new Decimal(input.entryPrice);
  const exit = new Decimal(input.exitPrice);
  const qty = new Decimal(input.quantity);
  const pv = new Decimal(input.pointValue);
  const dirMultiplier = input.direction === TradeDirection.LONG ? new Decimal(1) : new Decimal(-1);

  const priceDiff = exit.minus(entry);
  const grossPnL = dirMultiplier.times(priceDiff).times(qty).times(pv);

  const initialRisk = input.initialRisk ? new Decimal(input.initialRisk) : null;
  const grossR = initialRisk && !initialRisk.isZero() ? grossPnL.dividedBy(initialRisk) : null;

  if (input.actualTotalFees === null || input.actualTotalFees === undefined) {
    return {
      grossPnL: grossPnL.toFixed(2),
      netPnL: null,
      grossR: grossR ? grossR.toFixed(8) : null,
      netR: null,
      outcome: null,
    };
  }

  const fees = new Decimal(input.actualTotalFees);
  const netPnL = grossPnL.minus(fees);
  const netR = initialRisk && !initialRisk.isZero() ? netPnL.dividedBy(initialRisk) : null;

  let outcome: TradeOutcome;
  const roundedNet = netPnL.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  if (roundedNet.gt(0)) {
    outcome = TradeOutcome.WIN;
  } else if (roundedNet.lt(0)) {
    outcome = TradeOutcome.LOSS;
  } else {
    outcome = TradeOutcome.BREAKEVEN;
  }

  return {
    grossPnL: grossPnL.toFixed(2),
    netPnL: netPnL.toFixed(2),
    grossR: grossR ? grossR.toFixed(8) : null,
    netR: netR ? netR.toFixed(8) : null,
    outcome,
  };
}

/**
 * Recommends position size based on max dollar risk budget including estimated per-contract costs.
 */
export function calculatePositionSizeRecommendation(
  input: PositionSizeRecommendationInput,
): PositionSizeRecommendationOutput {
  const entry = new Decimal(input.entryPrice);
  const stop = new Decimal(input.stopPrice);
  const pv = new Decimal(input.pointValue);
  const maxRisk = new Decimal(input.maxRiskDollars);
  const feesPerContract = new Decimal(input.estimatedFeesPerContract || '0');
  const slippagePerContract = new Decimal(input.slippageAllowancePerContract || '0');

  const stopPoints = entry.minus(stop).abs();
  const singleContractPriceRisk = stopPoints.times(pv);
  const singleContractAllInRisk = singleContractPriceRisk.plus(feesPerContract).plus(slippagePerContract);

  if (singleContractAllInRisk.isZero() || singleContractAllInRisk.gt(maxRisk)) {
    return {
      recommendedContracts: 0,
      estimatedAllInRisk: '0.00',
      singleContractPriceRisk: singleContractPriceRisk.toFixed(2),
      singleContractAllInRisk: singleContractAllInRisk.toFixed(2),
      isFeasible: false,
      explanation: `All-in risk per contract ($${singleContractAllInRisk.toFixed(2)}) exceeds max risk budget ($${maxRisk.toFixed(2)}). Suggest 0 contracts.`,
    };
  }

  // Calculate maximum integer contracts
  const rawContracts = maxRisk.dividedBy(singleContractAllInRisk).floor().toNumber();
  const maxAllowed = input.maxContractsAllowed ?? Infinity;
  const recommendedContracts = Math.min(rawContracts, maxAllowed);

  const estimatedAllInRisk = singleContractAllInRisk.times(recommendedContracts);

  return {
    recommendedContracts,
    estimatedAllInRisk: estimatedAllInRisk.toFixed(2),
    singleContractPriceRisk: singleContractPriceRisk.toFixed(2),
    singleContractAllInRisk: singleContractAllInRisk.toFixed(2),
    isFeasible: recommendedContracts > 0,
    explanation:
      recommendedContracts > 0
        ? `Recommended ${recommendedContracts} contract(s) with estimated all-in risk $${estimatedAllInRisk.toFixed(2)} within budget $${maxRisk.toFixed(2)}.`
        : 'No valid position size available within risk parameters.',
  };
}
