import {
  pgTable,
  uuid,
  varchar,
  numeric,
  timestamp,
} from 'drizzle-orm/pg-core';

export const instruments = pgTable('instruments', {
  id: uuid('id').primaryKey().defaultRandom(),
  symbol: varchar('symbol', { length: 32 }).notNull().unique(),
  displayName: varchar('display_name', { length: 128 }).notNull(),
  tickSize: numeric('tick_size', { precision: 18, scale: 6 }).notNull(),
  pointValue: numeric('point_value', { precision: 18, scale: 6 }).notNull(),
  currency: varchar('currency', { length: 10 }).notNull().default('USD'),
  verifiedSource: varchar('verified_source', { length: 255 }),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
