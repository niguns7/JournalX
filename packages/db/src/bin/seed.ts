import { runSeed } from '../seeds/seed';

runSeed().catch((err) => {
  console.error('[JournalX Seed] Seed failed:', err);
  process.exit(1);
});
