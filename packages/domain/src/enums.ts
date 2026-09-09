export enum AccountType {
  EVALUATION = 'EVALUATION',
  SIM_FUNDED = 'SIM_FUNDED',
  LIVE = 'LIVE',
  PAPER = 'PAPER',
  REPLAY = 'REPLAY',
}

export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum StrategyVersionStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
}

export enum JournalStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  REVIEWED = 'REVIEWED',
}

export enum DailyGrade {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
}

export enum ImpactLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum Timeframe {
  TF_4H = '4H',
  TF_1H = '1H',
  TF_15M = '15M',
  TF_5M = '5M',
  TF_1M = '1M',
}

export enum ZoneKind {
  SUPPLY = 'SUPPLY',
  DEMAND = 'DEMAND',
  PREMIUM_FVG = 'PREMIUM_FVG',
  DISCOUNT_FVG = 'DISCOUNT_FVG',
  ORDER_BLOCK = 'ORDER_BLOCK',
  LIQUIDITY_POOL = 'LIQUIDITY_POOL',
  OTHER = 'OTHER',
}

export enum ScenarioKind {
  SHORT = 'SHORT',
  LONG = 'LONG',
  NO_TRADE = 'NO_TRADE',
}

export enum QuarterId {
  Q1 = 'Q1',
  Q2 = 'Q2',
  Q3 = 'Q3',
  Q4 = 'Q4',
}

export enum QuarterModel {
  AMD = 'AMD',
  XAMD = 'XAMD',
  UNKNOWN = 'UNKNOWN',
}

export enum TradeState {
  PLANNED = 'PLANNED',
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export enum TradeDirection {
  LONG = 'LONG',
  SHORT = 'SHORT',
}

export enum RecordingMode {
  NORMAL = 'NORMAL',
  RETROSPECTIVE = 'RETROSPECTIVE',
}

export enum ChecklistAnswer {
  PASS = 'PASS',
  FAIL = 'FAIL',
  UNANSWERED = 'UNANSWERED',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
}

export enum ManagementEventKind {
  STOP_LOSS_UPDATE = 'STOP_LOSS_UPDATE',
  TAKE_PROFIT_UPDATE = 'TAKE_PROFIT_UPDATE',
  NOTE = 'NOTE',
}

export enum ViolationSeverity {
  WARNING = 'WARNING',
  SERIOUS = 'SERIOUS',
  CRITICAL = 'CRITICAL',
}

export enum ViolationSource {
  MANUAL = 'MANUAL',
  RULE_ENGINE = 'RULE_ENGINE',
}

export enum AttachmentStage {
  BEFORE = 'BEFORE',
  ENTRY = 'ENTRY',
  AFTER = 'AFTER',
  TIMEFRAME = 'TIMEFRAME',
}

export enum AttachmentStatus {
  ACTIVE = 'ACTIVE',
  DELETED = 'DELETED',
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  VOID = 'VOID',
  CORRECT = 'CORRECT',
  PUBLISH = 'PUBLISH',
  ARCHIVE = 'ARCHIVE',
  REOPEN = 'REOPEN',
}

export enum IdempotencyStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum TradeOutcome {
  WIN = 'WIN',
  LOSS = 'LOSS',
  BREAKEVEN = 'BREAKEVEN',
}
