import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import pg from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';

const { Pool, Client } = pg;

interface BackupManifest {
  version: string;
  timestamp: string;
  database: {
    fileName: string;
    checksum: string;
    tableCounts: Record<string, number>;
  };
  attachments: Array<{
    fileName: string;
    bytes: number;
    checksum: string;
  }>;
}

export async function runRestore(targetBackupDir?: string) {
  console.log('================================================================');
  console.log('       JournalX S4-09 Isolated Backup & Restore Verification     ');
  console.log('================================================================\n');

  // 1. Locate backup directory
  const backupsRoot = path.resolve(process.cwd(), 'backups');
  let backupDir = targetBackupDir;

  if (!backupDir) {
    if (!fs.existsSync(backupsRoot)) {
      throw new Error(`No backups directory found at ${backupsRoot}. Run pnpm db:backup first.`);
    }
    const entries = fs
      .readdirSync(backupsRoot)
      .filter((e) => e.startsWith('backup-'))
      .sort()
      .reverse();

    if (entries.length === 0) {
      throw new Error(`No backup bundles found in ${backupsRoot}. Run pnpm db:backup first.`);
    }

    backupDir = path.join(backupsRoot, entries[0]);
  }

  console.log(`[Restore] 1. Using backup bundle: ${backupDir}`);

  // 2. Read and verify manifest
  const manifestPath = path.join(backupDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest file missing in backup bundle: ${manifestPath}`);
  }

  const manifest: BackupManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  console.log(`[Restore] 2. Verified manifest generated at ${manifest.timestamp}`);

  // 3. Verify SQL dump checksum
  const sqlFilePath = path.join(backupDir, manifest.database.fileName);
  if (!fs.existsSync(sqlFilePath)) {
    throw new Error(`SQL dump file missing: ${sqlFilePath}`);
  }
  const dbChecksum = crypto.createHash('sha256').update(fs.readFileSync(sqlFilePath)).digest('hex');
  if (dbChecksum !== manifest.database.checksum) {
    throw new Error(`Database SQL dump checksum mismatch! Expected ${manifest.database.checksum}, got ${dbChecksum}`);
  }
  console.log(`[Restore] Database SQL dump checksum verified: ${dbChecksum}`);

  // 4. Verify Attachment files and checksums
  const attachmentsBackupDir = path.join(backupDir, 'attachments');
  const restoredAttachmentsDir = path.resolve(process.cwd(), './storage/restore_test');
  fs.mkdirSync(restoredAttachmentsDir, { recursive: true });

  for (const att of manifest.attachments) {
    const srcAttPath = path.join(attachmentsBackupDir, att.fileName);
    if (!fs.existsSync(srcAttPath)) {
      throw new Error(`Attachment file missing from backup: ${att.fileName}`);
    }
    const buf = fs.readFileSync(srcAttPath);
    const checksum = crypto.createHash('sha256').update(buf).digest('hex');
    if (checksum !== att.checksum) {
      throw new Error(`Attachment checksum mismatch for ${att.fileName}!`);
    }

    // Restore to isolated folder
    fs.copyFileSync(srcAttPath, path.join(restoredAttachmentsDir, att.fileName));
  }
  console.log(`[Restore] Verified and restored ${manifest.attachments.length} attachment file(s) to ${restoredAttachmentsDir}`);

  // 5. Restore into isolated database
  const ISOLATED_DB_NAME = 'journalx_isolated_restore';
  const adminUrl =
    process.env.DATABASE_URL || 'postgresql://journalx:journalx_secret@127.0.0.1:5442/journalx';
  
  const urlObj = new URL(adminUrl);
  urlObj.pathname = '/postgres'; // connect to maintenance db to create target
  const maintenanceClient = new Client({ connectionString: urlObj.toString() });

  try {
    await maintenanceClient.connect();
    // Drop existing isolated db if present
    await maintenanceClient.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = '${ISOLATED_DB_NAME}' AND pid <> pg_backend_pid();
    `);
    await maintenanceClient.query(`DROP DATABASE IF EXISTS "${ISOLATED_DB_NAME}";`);
    await maintenanceClient.query(`CREATE DATABASE "${ISOLATED_DB_NAME}";`);
    console.log(`[Restore] 3. Created clean isolated target database: "${ISOLATED_DB_NAME}"`);
  } finally {
    await maintenanceClient.end();
  }

  // Connect to isolated database
  urlObj.pathname = `/${ISOLATED_DB_NAME}`;
  const isolatedUrl = urlObj.toString();
  const isolatedPool = new Pool({ connectionString: isolatedUrl });

  try {
    // Apply migrations first to create clean schema & enums
    console.log('[Restore] 4. Applying schema migrations to isolated database...');
    const isolatedDb = drizzle(isolatedPool);
    const migrationsFolder = path.resolve(process.cwd(), 'packages/db/migrations');
    await migrate(isolatedDb, { migrationsFolder });

    // Execute backup SQL insert statements
    console.log('[Restore] 5. Importing data from database.sql...');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    const statements = sqlContent
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.startsWith('INSERT INTO'));

    const client = await isolatedPool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SET session_replication_role = 'replica'");
      for (const stmt of statements) {
        await client.query(stmt);
      }
      await client.query("SET session_replication_role = 'origin'");
      await client.query('COMMIT');
    } catch (importErr) {
      await client.query('ROLLBACK');
      throw importErr;
    } finally {
      client.release();
    }

    // 6. Verify restored record counts
    console.log('[Restore] 6. Verifying record integrity across all tables:');
    console.log('----------------------------------------------------------------');

    let allCountsMatch = true;
    for (const [table, expectedCount] of Object.entries(manifest.database.tableCounts)) {
      const res = await isolatedPool.query(`SELECT count(*)::int FROM "${table}"`);
      const actualCount = res.rows[0]?.count ?? 0;
      const match = actualCount === expectedCount;
      if (!match) allCountsMatch = false;

      const status = match ? '✅ OK' : '❌ MISMATCH';
      console.log(`  [${status}] Table "${table}": Expected ${expectedCount}, Got ${actualCount}`);
    }
    console.log('----------------------------------------------------------------');

    if (!allCountsMatch) {
      throw new Error('Database table count mismatch during restore verification!');
    }

    // Verify sample queries against isolated database
    const [sampleTrade] = (await isolatedPool.query(`SELECT id, direction, state, planned_entry FROM trades LIMIT 1`)).rows;
    const [sampleJournal] = (await isolatedPool.query(`SELECT id, journal_date, status FROM daily_journals LIMIT 1`)).rows;
    console.log(`\n[Restore] Sample verified records in isolated DB:`);
    console.log(`  - Journal: ${sampleJournal?.journal_date} (${sampleJournal?.status})`);
    console.log(`  - Trade: ${sampleTrade?.id} [${sampleTrade?.direction} @ ${sampleTrade?.planned_entry}]`);

    console.log(`\n[Restore] ✅ FULL BACKUP & RESTORE VERIFICATION PASSED PERFECTLY!\n`);
  } finally {
    await isolatedPool.end();
  }
}

if (process.argv[1]?.endsWith('restore.ts') || process.argv[1]?.endsWith('restore.js')) {
  runRestore().catch((err) => {
    console.error('[Restore] Restore verification failed:', err);
    process.exit(1);
  });
}
