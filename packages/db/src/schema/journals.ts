import {
  pgTable,
  uuid,
  date,
  varchar,
  integer,
  numeric,
  text,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import type {
  ReadinessJson,
  ProcessJson,
  ReflectionJson,
  QuarterConfigJson,
  TimeframeDataJson,
  MarketConfluenceJson,
  ScenarioConditionsJson,
} from '@journalx/domain';
import {
  journalStatusEnum,
  dailyGradeEnum,
  impactLevelEnum,
  timeframeEnum,
  zoneKindEnum,
  scenarioKindEnum,
  quarterIdEnum,
  quarterModelEnum,
} from './enums';
import { tradingAccounts } from './accounts';

export const dailyJournals = pgTable(
  'daily_journals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    journalDate: date('journal_date').notNull().unique(),
    timezoneSnapshot: varchar('timezone_snapshot', { length: 64 })
      .notNull()
      .default('Asia/Kathmandu'),
    status: journalStatusEnum('status').notNull().default('DRAFT'),
    sleepQuality: integer('sleep_quality'),
    focusRating: integer('focus_rating'),
    stressRating: integer('stress_rating'),
    emotionalState: text('emotional_state'),
    preparationNotes: text('preparation_notes'),
    readiness: jsonb('readiness').$type<ReadinessJson>().default({ items: [] }),
    processEvaluation: jsonb('process_evaluation').$type<ProcessJson>().default({ items: [] }),
    reflection: jsonb('reflection').$type<ReflectionJson>().default({}),
    dailyGrade: dailyGradeEnum('daily_grade'),
    gradeOverride: dailyGradeEnum('grade_override'),
    gradeOverrideReason: text('grade_override_reason'),
    gradeRuleVersion: varchar('grade_rule_version', { length: 32 }).default('v1'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('daily_journals_date_idx').on(table.journalDate),
    index('daily_journals_status_idx').on(table.status),
  ],
);

export const journalAccountLimits = pgTable(
  'journal_account_limits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    journalId: uuid('journal_id')
      .notNull()
      .references(() => dailyJournals.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => tradingAccounts.id, { onDelete: 'restrict' }),
    maxTrades: integer('max_trades'),
    maxDailyLoss: numeric('max_daily_loss', { precision: 18, scale: 2 }),
    consecutiveLossLimit: integer('consecutive_loss_limit'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('journal_account_limits_journal_account_idx').on(
      table.journalId,
      table.accountId,
    ),
  ],
);

export const journalWindows = pgTable(
  'journal_windows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    journalId: uuid('journal_id')
      .notNull()
      .references(() => dailyJournals.id, { onDelete: 'cascade' }),
    label: varchar('label', { length: 64 }).notNull(),
    timezone: varchar('timezone', { length: 64 }).notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    quarterConfig: jsonb('quarter_config').$type<QuarterConfigJson>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('journal_windows_journal_idx').on(table.journalId),
  ],
);

export const economicEvents = pgTable(
  'economic_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    journalId: uuid('journal_id')
      .notNull()
      .references(() => dailyJournals.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    occursAt: timestamp('occurs_at', { withTimezone: true }).notNull(),
    impact: impactLevelEnum('impact').notNull().default('LOW'),
    restrictionStart: timestamp('restriction_start', { withTimezone: true }),
    restrictionEnd: timestamp('restriction_end', { withTimezone: true }),
    notes: text('notes'),
    checkedAt: timestamp('checked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('economic_events_journal_idx').on(table.journalId),
    index('economic_events_occurs_at_idx').on(table.occursAt),
  ],
);

export const timeframeAnalyses = pgTable(
  'timeframe_analyses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    journalId: uuid('journal_id')
      .notNull()
      .references(() => dailyJournals.id, { onDelete: 'cascade' }),
    windowId: uuid('window_id').references(() => journalWindows.id, {
      onDelete: 'set null',
    }),
    timeframe: timeframeEnum('timeframe').notNull(),
    data: jsonb('data').$type<TimeframeDataJson>().notNull().default({}),
    narrative: text('narrative'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('timeframe_analyses_journal_tf_idx').on(table.journalId, table.timeframe),
  ],
);

export const marketZones = pgTable(
  'market_zones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    analysisId: uuid('analysis_id')
      .notNull()
      .references(() => timeframeAnalyses.id, { onDelete: 'cascade' }),
    kind: zoneKindEnum('kind').notNull(),
    lowerPrice: numeric('lower_price', { precision: 18, scale: 6 }).notNull(),
    upperPrice: numeric('upper_price', { precision: 18, scale: 6 }).notNull(),
    confluence: jsonb('confluence').$type<MarketConfluenceJson>(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('market_zones_analysis_idx').on(table.analysisId),
  ],
);

export const journalScenarios = pgTable(
  'journal_scenarios',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    journalId: uuid('journal_id')
      .notNull()
      .references(() => dailyJournals.id, { onDelete: 'cascade' }),
    windowId: uuid('window_id').references(() => journalWindows.id, {
      onDelete: 'set null',
    }),
    kind: scenarioKindEnum('kind').notNull(),
    conditions: jsonb('conditions').$type<ScenarioConditionsJson>().notNull().default({}),
    narrative: text('narrative'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('journal_scenarios_journal_idx').on(table.journalId),
  ],
);

export const quarterObservations = pgTable(
  'quarter_observations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    windowId: uuid('window_id')
      .notNull()
      .references(() => journalWindows.id, { onDelete: 'cascade' }),
    quarter: quarterIdEnum('quarter').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    rangeHigh: numeric('range_high', { precision: 18, scale: 6 }),
    rangeLow: numeric('range_low', { precision: 18, scale: 6 }),
    trueOpenPrice: numeric('true_open_price', { precision: 18, scale: 6 }),
    model: quarterModelEnum('model').default('UNKNOWN'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('quarter_observations_window_quarter_idx').on(
      table.windowId,
      table.quarter,
    ),
  ],
);
