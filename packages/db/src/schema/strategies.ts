import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  jsonb,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import type { StrategyRulesJson, StrategyChecklistJson } from '@journalx/domain';
import { strategyVersionStatusEnum } from './enums';

export const strategies = pgTable('strategies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 128 }).notNull(),
  description: text('description'),
  currentPublishedVersionId: uuid('current_published_version_id'),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const strategyVersions = pgTable(
  'strategy_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    strategyId: uuid('strategy_id')
      .notNull()
      .references(() => strategies.id, { onDelete: 'restrict' }),
    versionNumber: integer('version_number').notNull(),
    status: strategyVersionStatusEnum('status').notNull().default('DRAFT'),
    rules: jsonb('rules').$type<StrategyRulesJson>().notNull(),
    checklist: jsonb('checklist').$type<StrategyChecklistJson>().notNull(),
    narrative: text('narrative'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('strategy_versions_strategy_version_idx').on(
      table.strategyId,
      table.versionNumber,
    ),
  ],
);
