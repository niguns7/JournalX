import {
  pgTable,
  uuid,
  varchar,
  numeric,
  jsonb,
  text,
  integer,
  timestamp,
} from 'drizzle-orm/pg-core';
import type { AccountRiskDefaultsJson } from '@journalx/domain';
import { accountTypeEnum, accountStatusEnum } from './enums';

export const tradingAccounts = pgTable('trading_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 128 }).notNull(),
  type: accountTypeEnum('type').notNull().default('PAPER'),
  currency: varchar('currency', { length: 10 }).notNull().default('USD'),
  nominalSize: numeric('nominal_size', { precision: 18, scale: 2 }),
  riskBasisAmount: numeric('risk_basis_amount', { precision: 18, scale: 2 }),
  status: accountStatusEnum('status').notNull().default('ACTIVE'),
  riskDefaults: jsonb('risk_defaults').$type<AccountRiskDefaultsJson>().default({}),
  notes: text('notes'),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
