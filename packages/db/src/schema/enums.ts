import { pgEnum } from 'drizzle-orm/pg-core';

export const accountTypeEnum = pgEnum('account_type', [
  'EVALUATION',
  'SIM_FUNDED',
  'LIVE',
  'PAPER',
  'REPLAY',
]);

export const accountStatusEnum = pgEnum('account_status', ['ACTIVE', 'ARCHIVED']);

export const strategyVersionStatusEnum = pgEnum('strategy_version_status', [
  'DRAFT',
  'PUBLISHED',
]);

export const journalStatusEnum = pgEnum('journal_status', ['DRAFT', 'ACTIVE', 'REVIEWED']);

export const dailyGradeEnum = pgEnum('daily_grade', ['A', 'B', 'C', 'D']);

export const impactLevelEnum = pgEnum('impact_level', ['LOW', 'MEDIUM', 'HIGH']);

export const timeframeEnum = pgEnum('timeframe', ['4H', '1H', '15M', '5M', '1M']);

export const zoneKindEnum = pgEnum('zone_kind', [
  'SUPPLY',
  'DEMAND',
  'PREMIUM_FVG',
  'DISCOUNT_FVG',
  'ORDER_BLOCK',
  'LIQUIDITY_POOL',
  'OTHER',
]);

export const scenarioKindEnum = pgEnum('scenario_kind', ['SHORT', 'LONG', 'NO_TRADE']);

export const quarterIdEnum = pgEnum('quarter_id', ['Q1', 'Q2', 'Q3', 'Q4']);

export const quarterModelEnum = pgEnum('quarter_model', ['AMD', 'XAMD', 'UNKNOWN']);

export const tradeStateEnum = pgEnum('trade_state', ['PLANNED', 'OPEN', 'CLOSED', 'CANCELLED']);

export const tradeDirectionEnum = pgEnum('trade_direction', ['LONG', 'SHORT']);

export const recordingModeEnum = pgEnum('recording_mode', ['NORMAL', 'RETROSPECTIVE']);

export const checklistAnswerEnum = pgEnum('checklist_answer', [
  'PASS',
  'FAIL',
  'UNANSWERED',
  'NOT_APPLICABLE',
]);

export const managementEventKindEnum = pgEnum('management_event_kind', [
  'STOP_LOSS_UPDATE',
  'TAKE_PROFIT_UPDATE',
  'NOTE',
]);

export const violationSeverityEnum = pgEnum('violation_severity', ['WARNING', 'SERIOUS', 'CRITICAL']);

export const violationSourceEnum = pgEnum('violation_source', ['MANUAL', 'RULE_ENGINE']);

export const attachmentStageEnum = pgEnum('attachment_stage', [
  'BEFORE',
  'ENTRY',
  'AFTER',
  'TIMEFRAME',
]);

export const attachmentStatusEnum = pgEnum('attachment_status', ['ACTIVE', 'DELETED']);

export const auditActionEnum = pgEnum('audit_action', [
  'CREATE',
  'UPDATE',
  'DELETE',
  'VOID',
  'CORRECT',
  'PUBLISH',
  'ARCHIVE',
  'REOPEN',
]);

export const idempotencyStatusEnum = pgEnum('idempotency_status', [
  'PENDING',
  'COMPLETED',
  'FAILED',
]);
