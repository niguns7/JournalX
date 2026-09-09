import 'dotenv/config';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import path from 'path';
import fs from 'fs';
import { createDatabaseClient } from './client';

export async function runMigrations() {
  console.log('[JournalX DB] Starting migration runner...');
  const { db, pool } = createDatabaseClient();

  try {
    let migrationsFolder = path.resolve(process.cwd(), 'migrations');
    if (!fs.existsSync(migrationsFolder)) {
      migrationsFolder = path.resolve(process.cwd(), 'packages/db/migrations');
    }
    console.log(`[JournalX DB] Applying migrations from: ${migrationsFolder}`);
    await migrate(db, { migrationsFolder });
    console.log('[JournalX DB] Migrations applied successfully.');
  } catch (error) {
    console.error('[JournalX DB] Migration failed with error:', error);
    process.exitCode = 1;
    throw error;
  } finally {
    await pool.end();
  }
}
