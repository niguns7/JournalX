import {
  pgTable,
  uuid,
  varchar,
  integer,
  jsonb,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { idempotencyStatusEnum } from './enums';

export const idempotencyRequests = pgTable(
  'idempotency_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    operation: varchar('operation', { length: 128 }).notNull(),
    key: varchar('key', { length: 128 }).notNull(),
    requestHash: varchar('request_hash', { length: 64 }).notNull(),
    resultResourceId: uuid('result_resource_id'),
    resultStatus: integer('result_status'),
    resultBody: jsonb('result_body'),
    status: idempotencyStatusEnum('status').notNull().default('PENDING'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idempotency_requests_op_key_idx').on(table.operation, table.key),
  ],
);
