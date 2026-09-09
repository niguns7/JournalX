import {
  pgTable,
  uuid,
  varchar,
  integer,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { attachmentStageEnum, attachmentStatusEnum } from './enums';
import { dailyJournals } from './journals';
import { trades } from './trades';

export const attachments = pgTable(
  'attachments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storageKey: varchar('storage_key', { length: 255 }).notNull().unique(),
    originalName: varchar('original_name', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 64 }).notNull(),
    bytes: integer('bytes').notNull(),
    checksum: varchar('checksum', { length: 64 }).notNull(),
    journalId: uuid('journal_id').references(() => dailyJournals.id, {
      onDelete: 'cascade',
    }),
    tradeId: uuid('trade_id').references(() => trades.id, {
      onDelete: 'cascade',
    }),
    stage: attachmentStageEnum('stage'),
    timeframe: varchar('timeframe', { length: 16 }),
    caption: text('caption'),
    status: attachmentStatusEnum('status').notNull().default('ACTIVE'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('attachments_journal_idx').on(table.journalId),
    index('attachments_trade_idx').on(table.tradeId),
  ],
);
