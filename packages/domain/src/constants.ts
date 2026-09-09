import { ChecklistItemDefinition, StrategyRulesJson } from './types.js';

export const DEFAULT_JOURNAL_TIMEZONE = 'Asia/Kathmandu';
export const DEFAULT_DISPLAY_TIMEZONE = 'Asia/Kathmandu';
export const DEFAULT_CURRENCY = 'USD';

export const SEED_INSTRUMENT = {
  symbol: 'MGC',
  displayName: 'Micro Gold Futures',
  tickSize: '0.100000',
  pointValue: '10.000000',
  currency: 'USD',
  verifiedSource: 'CME Group MGC Contract Specifications',
  verifiedAt: '2026-09-08T00:00:00.000Z',
};

export const SEED_STRATEGY = {
  name: 'MGC Top-Down Sweep Confirmation v1',
  description:
    '4H context -> 1H conditional bias -> 15M predefined location -> 5M sweep/reclaim -> 5M displacement and MSS close -> FVG -> first valid 1M retracement -> structural invalidation and unobstructed target.',
  versionNumber: 1,
  rules: {
    maxContracts: 5,
    maxStructuralStopPoints: '5.000000',
    minPlannedRR: '2.000000',
    consecutiveLossStopCount: 2,
    maxRiskPerTradeDollars: '250.00',
  } satisfies StrategyRulesJson,
  checklist: {
    items: [
      {
        key: 'htf_context',
        label: 'Higher-timeframe context',
        description: '4H structure and dealing range directionally aligned',
        isMandatory: true,
        order: 1,
      },
      {
        key: 'external_target',
        label: 'External target',
        description: 'External liquidity target / draw on liquidity clearly identified',
        isMandatory: true,
        order: 2,
      },
      {
        key: 'predefined_location',
        label: 'Predefined location',
        description: '15M key zone / POI reached without chasing',
        isMandatory: true,
        order: 3,
      },
      {
        key: 'location_compatible',
        label: 'Location compatible with context',
        description: 'Predefined zone is directionally consistent with higher timeframe narrative',
        isMandatory: true,
        order: 4,
      },
      {
        key: 'approved_timing',
        label: 'Approved timing',
        description: 'Inside approved trading window and clear of restricted news events',
        isMandatory: true,
        order: 5,
      },
      {
        key: 'sweep_reclaim',
        label: 'Sweep and reclaim',
        description: '5M liquidity sweep of key level followed by immediate reclaim',
        isMandatory: true,
        order: 6,
      },
      {
        key: 'displacement_mss',
        label: 'Displacement plus MSS',
        description: '5M energetic displacement candle closing beyond structural pivot (MSS)',
        isMandatory: true,
        order: 7,
      },
      {
        key: 'fvg_formation',
        label: 'Fair Value Gap',
        description: 'Clean Fair Value Gap (FVG) created during displacement leg',
        isMandatory: true,
        order: 8,
      },
      {
        key: 'first_retracement',
        label: 'First valid retracement',
        description: 'First clean 1M/5M retracement test into FVG entry zone',
        isMandatory: true,
        order: 9,
      },
      {
        key: 'structural_risk_target',
        label: 'Structurally valid risk & unobstructed target',
        description: 'Stop placed beyond structural swing with clean path to >= 2:1 RR target',
        isMandatory: true,
        order: 10,
      },
    ] satisfies ChecklistItemDefinition[],
  },
};
