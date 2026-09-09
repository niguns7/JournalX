import 'dotenv/config';
import { createDatabaseClient } from '../client.js';
import {
  appSettings,
  tradingAccounts,
  instruments,
  strategies,
  strategyVersions,
  dailyJournals,
  trades,
} from '../schema/index.js';
import { eq, and, sql, desc, gte, lte } from 'drizzle-orm';
import { TradeDirection, TradeState, TradeOutcome, AccountType } from '@journalx/domain';

export async function runBenchmark() {
  console.log('================================================================');
  console.log('  JournalX S4-08 Bounded Performance Benchmark (5,000 Records)  ');
  console.log('================================================================\n');

  const { db, pool } = createDatabaseClient();

  try {
    // 1. Ensure prerequisite entities exist
    console.log('[Benchmark] 1. Ensuring prerequisite entities...');
    const [inst] = await db.select().from(instruments).limit(1);
    const [stratVer] = await db.select().from(strategyVersions).limit(1);
    const [acc] = await db.select().from(tradingAccounts).limit(1);

    if (!inst || !stratVer || !acc) {
      throw new Error('Missing prerequisite instruments/strategy/account seeds. Run db:seed first.');
    }

    // Ensure a benchmark journal exists
    const benchDate = '2025-01-01';
    let [benchJournal] = await db
      .select()
      .from(dailyJournals)
      .where(eq(dailyJournals.journalDate, benchDate))
      .limit(1);

    if (!benchJournal) {
      const [newJournal] = await db
        .insert(dailyJournals)
        .values({
          journalDate: benchDate,
          timezoneSnapshot: 'Asia/Kathmandu',
          status: 'ACTIVE',
          sleepQuality: 8,
          focusRating: 8,
          stressRating: 3,
          emotionalState: 'Calm',
        })
        .returning();
      benchJournal = newJournal;
    }

    // 2. Check existing count of benchmark trades
    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(trades);

    const existingCount = countRow?.count ?? 0;
    const TARGET_BENCHMARK_COUNT = 5000;

    if (existingCount < TARGET_BENCHMARK_COUNT) {
      const needed = TARGET_BENCHMARK_COUNT - existingCount;
      console.log(`[Benchmark] 2. Seeding ${needed} synthetic trade records to reach ${TARGET_BENCHMARK_COUNT}...`);

      const batchSize = 500;
      const batches = Math.ceil(needed / batchSize);

      for (let b = 0; b < batches; b++) {
        const currentBatchSize = Math.min(batchSize, needed - b * batchSize);
        const rows = [];

        for (let i = 0; i < currentBatchSize; i++) {
          const idx = b * batchSize + i;
          const isWin = idx % 2 === 0;
          const dayOffset = (idx % 365);
          const dateObj = new Date(Date.UTC(2025, 0, 1 + dayOffset, 14, 30, 0));
          const exitDateObj = new Date(Date.UTC(2025, 0, 1 + dayOffset, 15, 15, 0));

          rows.push({
            journalId: benchJournal.id,
            accountId: acc.id,
            instrumentId: inst.id,
            strategyVersionId: stratVer.id,
            recordingMode: 'NORMAL' as const,
            state: TradeState.CLOSED,
            direction: isWin ? TradeDirection.LONG : TradeDirection.SHORT,
            plannedEntry: '4435.00',
            originalStop: '4430.00',
            originalTarget: '4445.00',
            quantity: 2,
            actualEntry: '4435.00',
            entryAt: dateObj,
            exitPrice: isWin ? '4445.00' : '4430.00',
            exitAt: exitDateObj,
            stopPoints: '5.000000',
            riskAmount: '100.00',
            plannedRR: '2.000000',
            grossPnL: isWin ? '200.00' : '-100.00',
            actualFees: '5.00',
            feesConfirmed: true,
            netPnL: isWin ? '195.00' : '-105.00',
            grossR: isWin ? '2.000000' : '-1.000000',
            netR: isWin ? '1.950000' : '-1.050000',
            outcome: isWin ? TradeOutcome.WIN : TradeOutcome.LOSS,
            observedAdversePoints: '1.500000',
            observedFavorablePoints: isWin ? '10.000000' : '2.000000',
            executionQuality: 'GOOD_WIN',
          });
        }

        await db.insert(trades).values(rows);
        process.stdout.write(`  Inserted batch ${b + 1}/${batches} (${rows.length} rows)\r`);
      }
      console.log(`\n[Benchmark] Successfully seeded ${needed} trades. Total records: ${TARGET_BENCHMARK_COUNT}\n`);
    } else {
      console.log(`[Benchmark] 2. Sufficient trade records already present (${existingCount} records).\n`);
    }

    // 3. Run Benchmark Queries & Measure Response Times
    console.log('[Benchmark] 3. Running Performance Benchmark Queries (SLA < 500ms):');
    console.log('----------------------------------------------------------------');

    const results: Array<{ queryName: string; durationMs: number; passed: boolean; details: string }> = [];

    // Query 1: Filtered & Paginated Trade Log (Page 1, 20 items with ORDER BY entry_at DESC)
    const t1Start = performance.now();
    const tradeLogPage = await db
      .select()
      .from(trades)
      .where(and(eq(trades.accountId, acc.id), eq(trades.state, TradeState.CLOSED)))
      .orderBy(desc(trades.entryAt))
      .limit(20)
      .offset(0);
    const t1End = performance.now();
    const t1Duration = t1End - t1Start;
    results.push({
      queryName: 'Paginated Trade Log (Limit 20, Offset 0, Order By Date)',
      durationMs: t1Duration,
      passed: t1Duration < 500,
      details: `Returned ${tradeLogPage.length} items in ${t1Duration.toFixed(2)} ms`,
    });

    // Query 2: Daily Analytics Aggregations (P&L, Count Grouped by Entry Date)
    const t2Start = performance.now();
    const dailyAnalytics = await db.execute(sql`
      SELECT 
        DATE(t.entry_at) AS day,
        COUNT(*)::int AS trade_count,
        SUM(
          (CASE WHEN t.direction = 'LONG' THEN 1 ELSE -1 END) * 
          (t.exit_price - COALESCE(t.actual_entry, t.planned_entry)) * 
          t.quantity * i.point_value - COALESCE(t.actual_fees, 0)
        )::text AS total_net_pnl
      FROM trades t
      JOIN instruments i ON t.instrument_id = i.id
      WHERE t.account_id = ${acc.id} AND t.state = 'CLOSED'
      GROUP BY DATE(t.entry_at)
      ORDER BY DATE(t.entry_at) DESC
      LIMIT 100
    `);
    const t2End = performance.now();
    const t2Duration = t2End - t2Start;
    results.push({
      queryName: 'Daily Analytics Aggregations (GROUP BY Date, SUM, COUNT with JOIN)',
      durationMs: t2Duration,
      passed: t2Duration < 500,
      details: `Aggregated ${dailyAnalytics.rows.length} days in ${t2Duration.toFixed(2)} ms`,
    });

    // Query 3: Cumulative Equity Curve (Cumulative Net P&L over 5,000 trades)
    const t3Start = performance.now();
    const equityCurve = await db.execute(sql`
      SELECT 
        t.id,
        t.entry_at,
        SUM(
          (CASE WHEN t.direction = 'LONG' THEN 1 ELSE -1 END) * 
          (t.exit_price - COALESCE(t.actual_entry, t.planned_entry)) * 
          t.quantity * i.point_value - COALESCE(t.actual_fees, 0)
        ) OVER (ORDER BY t.entry_at ASC)::text AS cumulative_pnl
      FROM trades t
      JOIN instruments i ON t.instrument_id = i.id
      WHERE t.account_id = ${acc.id} AND t.state = 'CLOSED'
      ORDER BY t.entry_at ASC
    `);
    const t3End = performance.now();
    const t3Duration = t3End - t3Start;
    results.push({
      queryName: 'Cumulative Equity Curve (Window Function SUM OVER Order By Date)',
      durationMs: t3Duration,
      passed: t3Duration < 500,
      details: `Calculated window sum across ${equityCurve.rows.length} trades in ${t3Duration.toFixed(2)} ms`,
    });

    // Query 4: Performance Summary Aggregates (Win Rate, Profit Factor, Total Volume)
    const t4Start = performance.now();
    const summaryRes = await db.execute(sql`
      SELECT 
        COUNT(*)::int AS total_trades,
        SUM(
          (CASE WHEN t.direction = 'LONG' THEN 1 ELSE -1 END) * 
          (t.exit_price - COALESCE(t.actual_entry, t.planned_entry)) * 
          t.quantity * i.point_value
        )::text AS gross_pnl,
        SUM(t.actual_fees)::text AS total_fees,
        SUM(
          (CASE WHEN t.direction = 'LONG' THEN 1 ELSE -1 END) * 
          (t.exit_price - COALESCE(t.actual_entry, t.planned_entry)) * 
          t.quantity * i.point_value - COALESCE(t.actual_fees, 0)
        )::text AS net_pnl
      FROM trades t
      JOIN instruments i ON t.instrument_id = i.id
      WHERE t.account_id = ${acc.id} AND t.state = 'CLOSED'
    `);
    const t4End = performance.now();
    const t4Duration = t4End - t4Start;
    const summaryRow: any = summaryRes.rows[0];
    results.push({
      queryName: 'Full Portfolio Summary Aggregates (Multi-Filter Metrics with JOIN)',
      durationMs: t4Duration,
      passed: t4Duration < 500,
      details: `Calculated summary for ${summaryRow?.total_trades ?? 0} trades in ${t4Duration.toFixed(2)} ms`,
    });

    // 4. Output Results Table
    console.log('');
    for (const r of results) {
      const statusIcon = r.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`[${statusIcon}] ${r.queryName}`);
      console.log(`       Duration: ${r.durationMs.toFixed(2)} ms (SLA < 500 ms) | ${r.details}`);
    }
    console.log('----------------------------------------------------------------');

    const allPassed = results.every((r) => r.passed);
    if (!allPassed) {
      throw new Error('One or more performance benchmark queries exceeded the 500ms SLA threshold!');
    }

    console.log('\n[Benchmark] All 4 benchmark queries PASSED well under the 500ms SLA target!\n');
  } catch (err) {
    console.error('[Benchmark] Benchmark execution failed:', err);
    process.exitCode = 1;
    throw err;
  } finally {
    await pool.end();
  }
}

// Allow direct execution
if (process.argv[1]?.endsWith('benchmark.ts') || process.argv[1]?.endsWith('benchmark.js')) {
  runBenchmark().catch(() => process.exit(1));
}
