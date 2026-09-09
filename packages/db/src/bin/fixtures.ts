import { runFixtures } from '../seeds/fixtures';

runFixtures().catch((err) => {
  console.error('[JournalX Fixtures] Fixtures failed:', err);
  process.exit(1);
});
