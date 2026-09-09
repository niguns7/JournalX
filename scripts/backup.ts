import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import pg from 'pg';

const { Pool } = pg;

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

export async function runBackup(): Promise<string> {
  console.log('================================================================');
  console.log('            JournalX S4-09 Database & Storage Backup            ');
  console.log('================================================================\n');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve(process.cwd(), `backups/backup-${timestamp}`);
  const attachmentsBackupDir = path.join(backupDir, 'attachments');

  fs.mkdirSync(attachmentsBackupDir, { recursive: true });

  const databaseUrl =
    process.env.DATABASE_URL || 'postgresql://journalx:journalx_secret@127.0.0.1:5442/journalx';
  const storageDir = path.resolve(process.cwd(), process.env.STORAGE_DIR || './storage/attachments');

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    console.log(`[Backup] 1. Extracting table data from database: ${databaseUrl}...`);

    const tables = [
      'app_settings',
      'trading_accounts',
      'instruments',
      'strategies',
      'strategy_versions',
      'daily_journals',
      'journal_account_limits',
      'journal_windows',
      'economic_events',
      'timeframe_analyses',
      'market_zones',
      'journal_scenarios',
      'quarter_observations',
      'trades',
      'trade_checklist_answers',
      'trade_management_events',
      'trade_violations',
      'attachments',
      'audit_events',
      'idempotency_requests',
    ];

    const tableCounts: Record<string, number> = {};
    let sqlDump = `-- JournalX Database Backup\n-- Created At: ${new Date().toISOString()}\n\n`;

    for (const table of tables) {
      try {
        const countRes = await pool.query(`SELECT count(*)::int FROM "${table}"`);
        const count = countRes.rows[0]?.count ?? 0;
        tableCounts[table] = count;

        const dataRes = await pool.query(`SELECT * FROM "${table}"`);
        if (dataRes.rows.length > 0) {
          sqlDump += `-- Table: ${table} (${count} rows)\n`;
          for (const row of dataRes.rows) {
            const columns = Object.keys(row).map((k) => `"${k}"`).join(', ');
            const values = Object.values(row)
              .map((val) => {
                if (val === null || val === undefined) return 'NULL';
                if (typeof val === 'number' || typeof val === 'boolean') return `${val}`;
                if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
                return `'${String(val).replace(/'/g, "''")}'`;
              })
              .join(', ');
            sqlDump += `INSERT INTO "${table}" (${columns}) VALUES (${values});\n`;
          }
          sqlDump += '\n';
        }
      } catch (tableErr: any) {
        console.warn(`[Backup] Warning for table ${table}:`, tableErr.message);
      }
    }

    const sqlFilePath = path.join(backupDir, 'database.sql');
    fs.writeFileSync(sqlFilePath, sqlDump, 'utf8');

    const dbChecksum = crypto.createHash('sha256').update(fs.readFileSync(sqlFilePath)).digest('hex');
    console.log(`[Backup] Database SQL dump generated: ${sqlFilePath} (${(sqlDump.length / 1024).toFixed(1)} KB)`);

    // 2. Backup Attachments
    console.log(`[Backup] 2. Backing up attachments from ${storageDir}...`);
    const attachmentManifests: BackupManifest['attachments'] = [];

    if (fs.existsSync(storageDir)) {
      const files = fs.readdirSync(storageDir);
      for (const file of files) {
        const srcPath = path.join(storageDir, file);
        const stat = fs.statSync(srcPath);
        if (stat.isFile()) {
          const destPath = path.join(attachmentsBackupDir, file);
          fs.copyFileSync(srcPath, destPath);

          const fileBuf = fs.readFileSync(destPath);
          const checksum = crypto.createHash('sha256').update(fileBuf).digest('hex');

          attachmentManifests.push({
            fileName: file,
            bytes: stat.size,
            checksum,
          });
        }
      }
    }
    console.log(`[Backup] Backed up ${attachmentManifests.length} attachment file(s).`);

    // 3. Write Manifest
    const manifest: BackupManifest = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      database: {
        fileName: 'database.sql',
        checksum: dbChecksum,
        tableCounts,
      },
      attachments: attachmentManifests,
    };

    const manifestPath = path.join(backupDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    console.log(`[Backup] Manifest written to ${manifestPath}`);
    console.log(`\n[Backup] ✅ Backup completed successfully in: ${backupDir}\n`);

    return backupDir;
  } finally {
    await pool.end();
  }
}

if (process.argv[1]?.endsWith('backup.ts') || process.argv[1]?.endsWith('backup.js')) {
  runBackup().catch((err) => {
    console.error('[Backup] Backup failed:', err);
    process.exit(1);
  });
}
