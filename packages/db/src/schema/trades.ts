import {
  pgTable,
  uuid,
  varchar,
  integer,
  numeric,
  boolean,
  text,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import type { TradeSnapshotJson, TradeReviewJson } from '@journalx/domain';
import {
  tradeStateEnum,
  recordingModeEnum,
  tradeDirectionEnum,
  checklistAnswerEnum,
  managementEventKindEnum,
  violationSeverityEnum,
  violationSourceEnum,
} from './enums';
import { dailyJournals, journalWindows, journalScenarios } from './journals';
import { tradingAccounts } from './accounts';
import { instruments } from './instruments';
import { strategyVersions } from './strategies';

export const trades = pgTable(
  'trades',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    journalId: uuid('journal_id')
      .notNull()
      .references(() => dailyJournals.id, { onDelete: 'restrict' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => tradingAccounts.id, { onDelete: 'restrict' }),
    instrumentId: uuid('instrument_id')
      .notNull()
      .references(() => instruments.id, { onDelete: 'restrict' }),
    strategyVersionId: uuid('strategy_version_id')
      .notNull()
      .references(() => strategyVersions.id, { onDelete: 'restrict' }),
    windowId: uuid('window_id').references(() => journalWindows.id, {
      onDelete: 'set null',
    }),
    scenarioId: uuid('scenario_id').references(() => journalScenarios.id, {
      onDelete: 'set null',
    }),
    state: tradeStateEnum('state').notNull().default('PLANNED'),
    recordingMode: recordingModeEnum('recording_mode').notNull().default('NORMAL'),
    direction: tradeDirectionEnum('direction').notNull(),
    actualContractSymbol: varchar('actual_contract_symbol', { length: 32 }),
    plannedEntry: numeric('planned_entry', { precision: 18, scale: 6 }),
    actualEntry: numeric('actual_entry', { precision: 18, scale: 6 }),
    originalStop: numeric('original_stop', { precision: 18, scale: 6 }).notNull(),
    originalTarget: numeric('original_target', { precision: 18, scale: 6 }).notNull(),
    quantity: integer('quantity').notNull(),
    exitPrice: numeric('exit_price', { precision: 18, scale: 6 }),
    entryAt: timestamp('entry_at', { withTimezone: true }),
    exitAt: timestamp('exit_at', { withTimezone: true }),
    actualFees: numeric('actual_fees', { precision: 18, scale: 2 }),
    feesConfirmed: boolean('fees_confirmed').notNull().default(false),
    observedAdversePoints: numeric('observed_adverse_points', { precision: 18, scale: 6 }),
    observedFavorablePoints: numeric('observed_favorable_points', { precision: 18, scale: 6 }),
    snapshot: jsonb('snapshot').$type<TradeSnapshotJson>().default({}),
    review: jsonb('review').$type<TradeReviewJson>().default({}),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    voidedAt: timestamp('voided_at', { withTimezone: true }),
    voidReason: text('void_reason'),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('trades_journal_idx').on(table.journalId),
    index('trades_account_state_entry_idx').on(
      table.accountId,
      table.state,
      table.entryAt,
    ),
    index('trades_exit_at_idx').on(table.exitAt),
    index('trades_strategy_version_idx').on(table.strategyVersionId),
  ],
);

export const tradeChecklistAnswers = pgTable(
  'trade_checklist_answers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tradeId: uuid('trade_id')
      .notNull()
      .references(() => trades.id, { onDelete: 'cascade' }),
    itemKey: varchar('item_key', { length: 64 }).notNull(),
    answer: checklistAnswerEnum('answer').notNull(),
    evidenceNote: text('evidence_note'),
    observedAt: timestamp('observed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('trade_checklist_answers_trade_item_idx').on(
      table.tradeId,
      table.itemKey,
    ),
  ],
);

export const tradeManagementEvents = pgTable(
  'trade_management_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tradeId: uuid('trade_id')
      .notNull()
      .references(() => trades.id, { onDelete: 'cascade' }),
    kind: managementEventKindEnum('kind').notNull(),
    observedAt: timestamp('observed_at', { withTimezone: true }).notNull().defaultNow(),
    oldValue: text('old_value'),
    newValue: text('new_value'),
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('trade_management_events_trade_idx').on(table.tradeId),
  ],
);

export const tradeViolations = pgTable(
  'trade_violations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tradeId: uuid('trade_id')
      .notNull()
      .references(() => trades.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 64 }).notNull(),
    severity: violationSeverityEnum('severity').notNull(),
    source: violationSourceEnum('source').notNull(),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('trade_violations_trade_idx').on(table.tradeId),
    index('trade_violations_code_idx').on(table.code),
  ],
);
