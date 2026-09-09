import { runMigrations } from '../migrate';

runMigrations().catch((err) => {
  console.error('[JournalX DB] Migration failed:', err);
  process.exit(1);
});
