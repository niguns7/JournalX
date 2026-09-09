import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema/index.js';

const { Pool } = pg;

export function createDatabaseClient(connectionString?: string) {
  const connectionUrl =
    connectionString ||
    process.env.DATABASE_URL ||
    'postgresql://journalx:journalx_secret@127.0.0.1:5442/journalx';

  const pool = new Pool({
    connectionString: connectionUrl,
    max: 10,
  });

  const db = drizzle(pool, { schema });

  return { db, pool };
}

export type Database = ReturnType<typeof createDatabaseClient>['db'];
