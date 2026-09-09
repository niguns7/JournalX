import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { AccountType } from '@journalx/domain';
import { createDatabaseClient } from '../client';
import { tradingAccounts } from '../schema/index';

export async function runFixtures() {
  console.log('[JournalX Fixtures] Loading test / demo fixtures...');
  const { db, pool } = createDatabaseClient();

  try {
    const fixtureAccountName = 'Demo Evaluation 50K';
    const existing = await db
      .select()
      .from(tradingAccounts)
      .where(eq(tradingAccounts.name, fixtureAccountName))
      .limit(1);

    if (existing.length === 0) {
      console.log(`[JournalX Fixtures] Inserting fixture account: ${fixtureAccountName}...`);
      await db.insert(tradingAccounts).values({
        name: fixtureAccountName,
        type: AccountType.EVALUATION,
        currency: 'USD',
        nominalSize: '50000.00',
        riskBasisAmount: '2500.00',
        status: 'ACTIVE',
        riskDefaults: {
          maxDailyTrades: 3,
          maxDailyLoss: '500.00',
          consecutiveLossLimit: 2,
          maxContractsPerTrade: 5,
          maxRiskPerTrade: '250.00',
        },
        notes: 'Fixture evaluation account for test harness',
      });
    } else {
      console.log(`[JournalX Fixtures] Fixture account ${fixtureAccountName} already exists.`);
    }

    console.log('[JournalX Fixtures] Fixtures loaded successfully.');
  } catch (error) {
    console.error('[JournalX Fixtures] Fixtures failed with error:', error);
    process.exitCode = 1;
    throw error;
  } finally {
    await pool.end();
  }
}
