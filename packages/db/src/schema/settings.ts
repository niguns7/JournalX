import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  integer,
  timestamp,
} from 'drizzle-orm/pg-core';
import type { AppPreferencesJson } from '@journalx/domain';
import { tradingAccounts } from './accounts';

export const appSettings = pgTable('app_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  journalTimezone: varchar('journal_timezone', { length: 64 })
    .notNull()
    .default('Asia/Kathmandu'),
  displayTimezone: varchar('display_timezone', { length: 64 })
    .notNull()
    .default('Asia/Kathmandu'),
  currency: varchar('currency', { length: 10 }).notNull().default('USD'),
  defaultAccountId: uuid('default_account_id').references(() => tradingAccounts.id, {
    onDelete: 'set null',
  }),
  preferences: jsonb('preferences').$type<AppPreferencesJson>().default({}),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
