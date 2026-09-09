import {
  ChecklistAnswer,
  DailyGrade,
  ImpactLevel,
  QuarterId,
  QuarterModel,
  ScenarioKind,
  Timeframe,
  TradeDirection,
  TradeOutcome,
  TradeState,
  ZoneKind,
} from './enums.js';

export interface AppPreferencesJson {
  theme?: 'light';
  compactMode?: boolean;
  defaultTimeframe?: string;
  autoSaveDelayMs?: number;
}

export interface AccountRiskDefaultsJson {
  maxDailyTrades?: number;
  maxDailyLoss?: string; // string decimal
  consecutiveLossLimit?: number;
  maxContractsPerTrade?: number;
  maxRiskPerTrade?: string; // string decimal
}

export interface StrategyRulesJson {
  maxContracts: number;
  maxStructuralStopPoints?: string; // string decimal
  minPlannedRR?: string; // string decimal
  consecutiveLossStopCount?: number;
  maxRiskPerTradeDollars?: string; // string decimal
  riskPercentBasis?: string;
}

export interface ChecklistItemDefinition {
  key: string;
  label: string;
  description?: string;
  isMandatory: boolean;
  order: number;
}

export interface StrategyChecklistJson {
  items: ChecklistItemDefinition[];
}

export interface ReadinessChecklistItem {
  key: string;
  label: string;
  completed: boolean;
}

export interface ReadinessJson {
  items: ReadinessChecklistItem[];
  notes?: string;
}

export interface ProcessChecklistItem {
  key: string;
  label: string;
  applicable: boolean;
  passed: boolean;
}

export interface ProcessJson {
  score?: number; // 0-10
  passedCount?: number;
  applicableCount?: number;
  items: ProcessChecklistItem[];
}

export interface ReflectionJson {
  whatMarketDid?: string;
  whatWentWell?: string;
  repeatedMistake?: string;
  difficultMarketCondition?: string;
  whatToRepeat?: string;
  oneCorrectionForTomorrow?: string;
  strategyVsPnlReflection?: string;
  finalLesson?: string;
}

export interface QuarterConfigJson {
  q1?: { start: string; end: string };
  q2?: { start: string; end: string };
  q3?: { start: string; end: string };
  q4?: { start: string; end: string };
}

export interface TimeframeDataJson {
  structure?: string;
  dealingRangeHigh?: string;
  dealingRangeLow?: string;
  derivedMidpoint?: string;
  referencePrice?: string;
  referenceTimestamp?: string;
  marketState?: 'PREMIUM' | 'DISCOUNT' | 'EQUILIBRIUM';
  liquidityObjective?: string;
  invalidation?: string;
  bias?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  protectedHigh?: string;
  protectedLow?: string;
  externalBuyLiquidity?: string;
  externalSellLiquidity?: string;
  vah?: string;
  val?: string;
  poc?: string;
  customNotes?: string;
}

export interface MarketConfluenceJson {
  reasons: string[];
  timeframeOrigin?: Timeframe;
}

export interface ScenarioConditionsJson {
  triggerZone?: string;
  sweepLevel?: string;
  structureBreakCondition?: string;
  fvgOrEntryCondition?: string;
  structuralStopCondition?: string;
  target?: string;
  invalidation?: string;
}

export interface TradeSnapshotJson {
  rulesSnapshot?: StrategyRulesJson;
  checklistSnapshot?: StrategyChecklistJson;
  contextSnapshot?: {
    timeframe4H?: TimeframeDataJson;
    timeframe1H?: TimeframeDataJson;
    timeframe15M?: TimeframeDataJson;
  };
  instrumentSnapshot?: {
    symbol: string;
    tickSize: string;
    pointValue: string;
  };
}

export interface TradeReviewJson {
  notes?: string;
  followedPlan?: boolean;
  entryExecutionRating?: number; // 0-10
  managementRating?: number; // 0-10
  exitRating?: number; // 0-10
  emotionalDisciplineRating?: number; // 0-10
  lessonsLearned?: string;
}
