import 'dotenv/config';
import { eq, and } from 'drizzle-orm';
import {
  DEFAULT_JOURNAL_TIMEZONE,
  DEFAULT_DISPLAY_TIMEZONE,
  DEFAULT_CURRENCY,
  SEED_INSTRUMENT,
  SEED_STRATEGY,
} from '@journalx/domain';
import { createDatabaseClient } from '../client';
import {
  appSettings,
  instruments,
  strategies,
  strategyVersions,
} from '../schema/index';

export async function runSeed() {
  console.log('[JournalX Seed] Starting idempotent minimal seed...');
  const { db, pool } = createDatabaseClient();

  try {
    // 1. Seed App Settings (Singleton)
    const existingSettings = await db.select().from(appSettings).limit(1);
    if (existingSettings.length === 0) {
      console.log('[JournalX Seed] Inserting initial app_settings...');
      await db.insert(appSettings).values({
        journalTimezone: DEFAULT_JOURNAL_TIMEZONE,
        displayTimezone: DEFAULT_DISPLAY_TIMEZONE,
        currency: DEFAULT_CURRENCY,
        preferences: { theme: 'light', autoSaveDelayMs: 1000 },
      });
    } else {
      console.log('[JournalX Seed] app_settings already exists, skipping.');
    }

    // 2. Seed MGC Instrument
    const existingInstrument = await db
      .select()
      .from(instruments)
      .where(eq(instruments.symbol, SEED_INSTRUMENT.symbol))
      .limit(1);

    let instrumentId: string;
    if (existingInstrument.length === 0) {
      console.log(`[JournalX Seed] Inserting instrument: ${SEED_INSTRUMENT.symbol}...`);
      const [inserted] = await db
        .insert(instruments)
        .values({
          symbol: SEED_INSTRUMENT.symbol,
          displayName: SEED_INSTRUMENT.displayName,
          tickSize: SEED_INSTRUMENT.tickSize,
          pointValue: SEED_INSTRUMENT.pointValue,
          currency: SEED_INSTRUMENT.currency,
          verifiedSource: SEED_INSTRUMENT.verifiedSource,
          verifiedAt: new Date(SEED_INSTRUMENT.verifiedAt),
        })
        .returning({ id: instruments.id });
      instrumentId = inserted.id;
    } else {
      instrumentId = existingInstrument[0].id;
      console.log(`[JournalX Seed] Instrument ${SEED_INSTRUMENT.symbol} already exists.`);
    }

    // 3. Seed Strategy & Strategy Version 1
    const existingStrategy = await db
      .select()
      .from(strategies)
      .where(eq(strategies.name, SEED_STRATEGY.name))
      .limit(1);

    let strategyId: string;
    if (existingStrategy.length === 0) {
      console.log(`[JournalX Seed] Inserting strategy: ${SEED_STRATEGY.name}...`);
      const [insertedStrat] = await db
        .insert(strategies)
        .values({
          name: SEED_STRATEGY.name,
          description: SEED_STRATEGY.description,
        })
        .returning({ id: strategies.id });
      strategyId = insertedStrat.id;
    } else {
      strategyId = existingStrategy[0].id;
      console.log(`[JournalX Seed] Strategy ${SEED_STRATEGY.name} already exists.`);
    }

    // Check version 1
    const existingVersion = await db
      .select()
      .from(strategyVersions)
      .where(
        and(
          eq(strategyVersions.strategyId, strategyId),
          eq(strategyVersions.versionNumber, SEED_STRATEGY.versionNumber),
        ),
      )
      .limit(1);

    let versionId: string;
    if (existingVersion.length === 0) {
      console.log(`[JournalX Seed] Inserting strategy version ${SEED_STRATEGY.versionNumber}...`);
      const [insertedVersion] = await db
        .insert(strategyVersions)
        .values({
          strategyId,
          versionNumber: SEED_STRATEGY.versionNumber,
          status: 'PUBLISHED',
          rules: SEED_STRATEGY.rules,
          checklist: SEED_STRATEGY.checklist,
          narrative: SEED_STRATEGY.description,
          publishedAt: new Date(),
        })
        .returning({ id: strategyVersions.id });
      versionId = insertedVersion.id;

      // Update current published version reference on strategy
      await db
        .update(strategies)
        .set({ currentPublishedVersionId: versionId })
        .where(eq(strategies.id, strategyId));
    } else {
      versionId = existingVersion[0].id;
      console.log(
        `[JournalX Seed] Strategy version ${SEED_STRATEGY.versionNumber} already exists.`,
      );
    }

    console.log('[JournalX Seed] Seed completed successfully.');
  } catch (error) {
    console.error('[JournalX Seed] Seed failed with error:', error);
    process.exitCode = 1;
    throw error;
  } finally {
    await pool.end();
  }
}
