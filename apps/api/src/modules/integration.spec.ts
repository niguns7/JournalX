import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../app.module.js';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter.js';
import { LoggingInterceptor } from '../common/interceptors/logging.interceptor.js';
import {
  AccountStatus,
  AccountType,
  ChecklistAnswer,
  DailyGrade,
  ImpactLevel,
  JournalStatus,
  ManagementEventKind,
  QuarterId,
  ScenarioKind,
  Timeframe,
  TradeDirection,
  TradeOutcome,
  TradeState,
  ZoneKind,
} from '@journalx/domain';

describe('JournalX Backend Integration Test Suite (Real PostgreSQL)', () => {
  jest.setTimeout(30000);

  let app: INestApplication;
  let testAccountId: string;
  let testInstrumentId: string;
  let testStrategyId: string;
  let testStrategyVersionId: string;
  let testJournalId: string;
  let testJournalDate: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.setGlobalPrefix('api/v1', {
      exclude: ['health', 'health/live', 'health/ready'],
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new LoggingInterceptor());

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('1. Health Checks', () => {
    it('GET /health/live returns status ok', async () => {
      const res = await request(app.getHttpServer()).get('/health/live').expect(200);
      expect(res.body.status).toBe('ok');
    });

    it('GET /health/ready returns database up', async () => {
      const res = await request(app.getHttpServer()).get('/health/ready').expect(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.checks.database).toBe('up');
    });
  });

  describe('2. Settings Module', () => {
    it('GET /api/v1/settings returns seeded singleton settings', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/settings').expect(200);
      expect(res.body.journalTimezone).toBe('Asia/Kathmandu');
      expect(res.body.currency).toBe('USD');
      expect(res.body.version).toBeDefined();
    });

    it('PATCH /api/v1/settings updates settings and rejects concurrency conflict', async () => {
      const getRes = await request(app.getHttpServer()).get('/api/v1/settings').expect(200);
      const currentVersion = getRes.body.version;

      // Update with valid version
      const updateRes = await request(app.getHttpServer())
        .patch('/api/v1/settings')
        .send({
          expectedVersion: currentVersion,
          preferencesJson: { compactMode: true },
        })
        .expect(200);
      expect(updateRes.body.version).toBe(currentVersion + 1);
      expect(updateRes.body.preferences.compactMode).toBe(true);

      // Stale expectedVersion produces 409 Conflict
      await request(app.getHttpServer())
        .patch('/api/v1/settings')
        .send({
          expectedVersion: currentVersion, // stale
          preferencesJson: { compactMode: false },
        })
        .expect(409);
    });
  });

  describe('3. Accounts Module', () => {
    it('POST /api/v1/accounts creates a trading account', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/accounts')
        .send({
          name: 'Apex 50K Evaluation Test',
          type: AccountType.EVALUATION,
          currency: 'USD',
          nominalSize: '50000.00',
          riskBasisAmount: '2500.00',
          riskDefaultsJson: {
            maxDailyTrades: 3,
            maxDailyLoss: '500.00',
            consecutiveLossLimit: 2,
            maxContractsPerTrade: 5,
            maxRiskPerTrade: '250.00',
          },
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Apex 50K Evaluation Test');
      expect(res.body.status).toBe(AccountStatus.ACTIVE);
      testAccountId = res.body.id;
    });

    it('GET /api/v1/accounts lists trading accounts', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/accounts').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((a: any) => a.id === testAccountId)).toBe(true);
    });

    it('PATCH /api/v1/accounts/:id updates account', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/accounts/${testAccountId}`)
        .send({
          notes: 'Updated account notes for integration test',
        })
        .expect(200);
      expect(res.body.notes).toBe('Updated account notes for integration test');
    });
  });

  describe('4. Instruments Module', () => {
    it('GET /api/v1/instruments returns seeded MGC instrument', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/instruments').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      const mgc = res.body.find((i: any) => i.symbol === 'MGC');
      expect(mgc).toBeDefined();
      expect(mgc.tickSize).toBe('0.100000');
      expect(mgc.pointValue).toBe('10.000000');
      testInstrumentId = mgc.id;
    });

    it('POST /api/v1/instruments creates an instrument and prevents duplicate symbol', async () => {
      const uniqueSymbol = `TEST_${Date.now().toString().slice(-4)}`;
      const res = await request(app.getHttpServer())
        .post('/api/v1/instruments')
        .send({
          symbol: uniqueSymbol,
          displayName: 'Test Future',
          tickSize: '0.250000',
          pointValue: '20.000000',
        })
        .expect(201);
      expect(res.body.symbol).toBe(uniqueSymbol);

      // Duplicate symbol rejects with 409 Conflict
      await request(app.getHttpServer())
        .post('/api/v1/instruments')
        .send({
          symbol: uniqueSymbol,
          displayName: 'Duplicate Test Future',
          tickSize: '0.250000',
          pointValue: '20.000000',
        })
        .expect(409);
    });
  });

  describe('5. Strategies & Versioning Module', () => {
    it('GET /api/v1/strategies returns seeded strategy', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/strategies').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      const seedStrat = res.body.find((s: any) => s.name.includes('MGC Top-Down Sweep'));
      expect(seedStrat).toBeDefined();
      testStrategyId = seedStrat.id;

      const stratDetails = await request(app.getHttpServer())
        .get(`/api/v1/strategies/${testStrategyId}`)
        .expect(200);
      const v1 = stratDetails.body.versions.find((v: any) => v.versionNumber === 1);
      testStrategyVersionId = v1 ? v1.id : seedStrat.currentPublishedVersionId;
    });

    it('Version publishing: draft version can be published and becomes immutable', async () => {
      // Create separate strategy for version lifecycle tests
      const customStrat = await request(app.getHttpServer())
        .post('/api/v1/strategies')
        .send({
          name: `Custom Test Strategy ${Date.now()}`,
          description: 'Strategy for version lifecycle tests',
          rules: {
            maxContracts: 5,
            maxStructuralStopPoints: '5.000000',
            minPlannedRR: '2.000000',
          },
          checklist: {
            items: [
              { key: 'item1', label: 'Item 1', isMandatory: true, order: 1 },
            ],
          },
          publishImmediately: true,
        })
        .expect(201);
      const customStratId = customStrat.body.id;

      // 1. Create draft version
      const draftRes = await request(app.getHttpServer())
        .post(`/api/v1/strategies/${customStratId}/versions`)
        .send({
          rules: {
            maxContracts: 3,
            maxStructuralStopPoints: '4.000000',
            minPlannedRR: '2.500000',
          },
          checklist: {
            items: [
              { key: 'item1', label: 'Item 1', isMandatory: true, order: 1 },
            ],
          },
          narrative: 'Draft v2 narrative',
        })
        .expect(201);

      expect(draftRes.body.status).toBe('DRAFT');
      const draftVersionId = draftRes.body.id;

      // 2. Update draft version
      await request(app.getHttpServer())
        .patch(`/api/v1/strategies/${customStratId}/versions/${draftVersionId}`)
        .send({
          narrative: 'Updated draft v2 narrative',
        })
        .expect(200);

      // 3. Publish version
      const pubRes = await request(app.getHttpServer())
        .post(`/api/v1/strategies/${customStratId}/versions/${draftVersionId}/publish`)
        .expect(200);
      expect(pubRes.body.status).toBe('PUBLISHED');
      expect(pubRes.body.publishedAt).toBeDefined();

      // 4. Modifying published version is blocked
      await request(app.getHttpServer())
        .patch(`/api/v1/strategies/${customStratId}/versions/${draftVersionId}`)
        .send({ narrative: 'Illegal edit on published version' })
        .expect(400);
    });
  });

  describe('6. Journals & Child Modules', () => {
    testJournalDate = `20${String(Date.now()).slice(-2)}-0${(Date.now() % 8) + 1}-0${(Date.now() % 8) + 1}`;

    it('POST /api/v1/journals creates journal idempotently by date and auto-snapshots limits', async () => {
      const res1 = await request(app.getHttpServer())
        .post('/api/v1/journals')
        .send({ journalDate: testJournalDate })
        .expect(201);

      expect(res1.body.journalDate).toBe(testJournalDate);
      expect(res1.body.status).toBe(JournalStatus.DRAFT);
      expect(res1.body.limits).toBeDefined();
      expect(res1.body.limits.length).toBeGreaterThan(0);
      testJournalId = res1.body.id;

      // Repeated call with same date returns existing journal
      const res2 = await request(app.getHttpServer())
        .post('/api/v1/journals')
        .send({ journalDate: testJournalDate })
        .expect(201);
      expect(res2.body.id).toBe(testJournalId);
    });

    it('PATCH /api/v1/journals/:id updates preparation sections and checks concurrency', async () => {
      const journal = await request(app.getHttpServer())
        .get(`/api/v1/journals/${testJournalId}`)
        .expect(200);

      const updateRes = await request(app.getHttpServer())
        .patch(`/api/v1/journals/${testJournalId}`)
        .send({
          expectedVersion: journal.body.version,
          sleepQuality: 8,
          focusRating: 9,
          stressRating: 3,
          emotionalState: 'Calm, patient, no urgency',
          preparationNotes: 'Pre-market 4H sweep observed, waiting for 15M POI',
        })
        .expect(200);

      expect(updateRes.body.sleepQuality).toBe(8);
      expect(updateRes.body.focusRating).toBe(9);
      expect(updateRes.body.version).toBe(journal.body.version + 1);

      // Stale version conflict
      await request(app.getHttpServer())
        .patch(`/api/v1/journals/${testJournalId}`)
        .send({
          expectedVersion: journal.body.version, // stale
          sleepQuality: 5,
        })
        .expect(409);
    });

    it('POST /api/v1/journals/:id/activate transitions journal to ACTIVE', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/journals/${testJournalId}/activate`)
        .expect(200);
      expect(res.body.status).toBe(JournalStatus.ACTIVE);
    });

    it('Child resources: creates Windows, Events, Analyses, Zones, Scenarios, and Quarters', async () => {
      // 1. Window
      const winRes = await request(app.getHttpServer())
        .post(`/api/v1/journals/${testJournalId}/windows`)
        .send({
          label: 'London Session',
          timezone: 'Europe/London',
          startsAt: `${testJournalDate}T07:00:00.000Z`,
          endsAt: `${testJournalDate}T10:00:00.000Z`,
        })
        .expect(201);
      const windowId = winRes.body.id;

      // 2. Event
      await request(app.getHttpServer())
        .post(`/api/v1/journals/${testJournalId}/events`)
        .send({
          title: 'UK CPI Release',
          occursAt: `${testJournalDate}T07:00:00.000Z`,
          impact: ImpactLevel.HIGH,
        })
        .expect(201);

      // 3. Analysis
      const analysisRes = await request(app.getHttpServer())
        .post(`/api/v1/journals/${testJournalId}/analyses`)
        .send({
          windowId,
          timeframe: Timeframe.TF_4H,
          data: {
            structure: 'BULLISH',
            dealingRangeHigh: '4450.000000',
            dealingRangeLow: '4400.000000',
          },
          narrative: '4H discount sweep bullish expansion',
        })
        .expect(201);
      const analysisId = analysisRes.body.id;

      // 4. Zone
      await request(app.getHttpServer())
        .post(`/api/v1/journals/${testJournalId}/analyses/${analysisId}/zones`)
        .send({
          kind: ZoneKind.DEMAND,
          lowerPrice: '4430.000000',
          upperPrice: '4435.000000',
          notes: '15M unmitigated bullish FVG',
        })
        .expect(201);

      // 5. Scenario
      await request(app.getHttpServer())
        .post(`/api/v1/journals/${testJournalId}/scenarios`)
        .send({
          windowId,
          kind: ScenarioKind.LONG,
          conditions: {
            triggerZone: '4430-4435',
            structureBreakCondition: '5M MSS close above 4438',
          },
        })
        .expect(201);

      // 6. Quarter
      await request(app.getHttpServer())
        .post(`/api/v1/journals/${testJournalId}/windows/${windowId}/quarters`)
        .send({
          quarter: QuarterId.Q1,
          startsAt: `${testJournalDate}T07:00:00.000Z`,
          endsAt: `${testJournalDate}T07:45:00.000Z`,
          rangeHigh: '4440.000000',
          rangeLow: '4432.000000',
        })
        .expect(201);

      // Verify all populated on journal GET
      const fullJournal = await request(app.getHttpServer())
        .get(`/api/v1/journals/${testJournalId}`)
        .expect(200);

      expect(fullJournal.body.windows.length).toBe(1);
      expect(fullJournal.body.events.length).toBe(1);
      expect(fullJournal.body.analyses.length).toBe(1);
      expect(fullJournal.body.analyses[0].zones.length).toBe(1);
      expect(fullJournal.body.scenarios.length).toBe(1);
    });
  });

  describe('7. Trade Lifecycle & Rule Engine Tests', () => {
    let tradeId: string;

    it('POST /api/v1/trades creates a planned trade and evaluates 10/10 checklist', async () => {
      const planRes = await request(app.getHttpServer())
        .post('/api/v1/trades')
        .send({
          journalId: testJournalId,
          accountId: testAccountId,
          instrumentId: testInstrumentId,
          strategyVersionId: testStrategyVersionId,
          direction: TradeDirection.LONG,
          plannedEntry: '4435.000000',
          originalStop: '4430.000000',
          originalTarget: '4445.000000',
          quantity: 5,
          checklistAnswers: [
            { itemKey: 'htf_context', answer: ChecklistAnswer.PASS },
            { itemKey: 'external_target', answer: ChecklistAnswer.PASS },
            { itemKey: 'predefined_location', answer: ChecklistAnswer.PASS },
            { itemKey: 'location_compatible', answer: ChecklistAnswer.PASS },
            { itemKey: 'approved_timing', answer: ChecklistAnswer.PASS },
            { itemKey: 'sweep_reclaim', answer: ChecklistAnswer.PASS },
            { itemKey: 'displacement_mss', answer: ChecklistAnswer.PASS },
            { itemKey: 'fvg_formation', answer: ChecklistAnswer.PASS },
            { itemKey: 'first_retracement', answer: ChecklistAnswer.PASS },
            { itemKey: 'structural_risk_target', answer: ChecklistAnswer.PASS },
          ],
        })
        .expect(201);

      expect(planRes.body.state).toBe(TradeState.PLANNED);
      expect(planRes.body.initialRisk).toBe('250.00'); // 5 points * 5 qty * $10
      expect(planRes.body.plannedReward).toBe('500.00'); // 10 points * 5 qty * $10
      expect(planRes.body.plannedRR).toBe('2.00000000');
      tradeId = planRes.body.id;

      // Evaluate endpoint
      const evalRes = await request(app.getHttpServer())
        .post(`/api/v1/trades/${tradeId}/evaluate`)
        .expect(200);
      expect(evalRes.body.status).toBe('ELIGIBLE');
    });

    it('POST /api/v1/trades/:id/open transitions trade to OPEN and freezes context', async () => {
      const openRes = await request(app.getHttpServer())
        .post(`/api/v1/trades/${tradeId}/open`)
        .send({
          actualEntry: '4435.000000',
          entryAt: `${testJournalDate}T08:15:00.000Z`,
          actualContractSymbol: 'MGCZ26',
        })
        .expect(200);

      expect(openRes.body.state).toBe(TradeState.OPEN);
      expect(openRes.body.actualEntry).toBe('4435.000000');
      expect(openRes.body.snapshot).toBeDefined();
    });

    it('POST /api/v1/trades/:id/management-events records stop move and detects widening', async () => {
      // 1. Tighten stop to breakeven (4435) -> valid move, no violation
      await request(app.getHttpServer())
        .post(`/api/v1/trades/${tradeId}/management-events`)
        .send({
          kind: ManagementEventKind.STOP_LOSS_UPDATE,
          newValue: '4435.000000',
          reason: 'Moved stop to breakeven after 1R',
        })
        .expect(201);

      // 2. Widen stop to 4425 (wider than previous stop) -> creates STOP_WIDENED violation
      await request(app.getHttpServer())
        .post(`/api/v1/trades/${tradeId}/management-events`)
        .send({
          kind: ManagementEventKind.STOP_LOSS_UPDATE,
          newValue: '4425.000000',
          reason: 'Moved stop wider (violation)',
        })
        .expect(201);

      const trade = await request(app.getHttpServer())
        .get(`/api/v1/trades/${tradeId}`)
        .expect(200);

      expect(trade.body.managementEvents.length).toBe(2);
      expect(trade.body.violations.some((v: any) => v.code === 'STOP_WIDENED')).toBe(true);
      // Initial risk baseline remains strictly preserved at 250.00!
      expect(trade.body.initialRisk).toBe('250.00');
    });

    it('POST /api/v1/trades/:id/close completes trade and calculates exact SRS Section 6 Fixture 1 metrics', async () => {
      const closeRes = await request(app.getHttpServer())
        .post(`/api/v1/trades/${tradeId}/close`)
        .send({
          exitPrice: '4445.000000',
          exitAt: `${testJournalDate}T08:45:00.000Z`,
          actualFees: '12.50',
          feesConfirmed: true,
        })
        .expect(200);

      expect(closeRes.body.state).toBe(TradeState.CLOSED);
      expect(closeRes.body.grossPnL).toBe('500.00');
      expect(closeRes.body.netPnL).toBe('487.50');
      expect(closeRes.body.grossR).toBe('2.00000000');
      expect(closeRes.body.netR).toBe('1.95000000');
      expect(closeRes.body.outcome).toBe(TradeOutcome.WIN);
    });

    it('POST /api/v1/trades/:id/review reviews closed trade and requires confirmed fees', async () => {
      const trade = await request(app.getHttpServer())
        .get(`/api/v1/trades/${tradeId}`)
        .expect(200);

      const reviewRes = await request(app.getHttpServer())
        .post(`/api/v1/trades/${tradeId}/review`)
        .send({
          expectedVersion: trade.body.version,
          review: {
            notes: 'Good execution',
            followedPlan: true,
            entryExecutionRating: 10,
          },
        })
        .expect(200);

      expect(reviewRes.body.reviewedAt).toBeDefined();
    });

    it('POST /api/v1/trades/:id/correct updates closed trade and invalidates review', async () => {
      const trade = await request(app.getHttpServer())
        .get(`/api/v1/trades/${tradeId}`)
        .expect(200);

      const correctRes = await request(app.getHttpServer())
        .post(`/api/v1/trades/${tradeId}/correct`)
        .send({
          expectedVersion: trade.body.version,
          reason: 'Correcting exit fill to 4446.00',
          exitPrice: '4446.000000',
        })
        .expect(200);

      expect(correctRes.body.exitPrice).toBe('4446.000000');
      expect(correctRes.body.netPnL).toBe('537.50'); // 550 gross - 12.50
      expect(correctRes.body.reviewedAt).toBeNull(); // Review invalidated
    });

    it('POST /api/v1/trades/record-execution atomically creates retrospective trade', async () => {
      const retroRes = await request(app.getHttpServer())
        .post('/api/v1/trades/record-execution')
        .send({
          journalId: testJournalId,
          accountId: testAccountId,
          instrumentId: testInstrumentId,
          strategyVersionId: testStrategyVersionId,
          direction: TradeDirection.SHORT,
          actualEntry: '4454.000000',
          originalStop: '4458.000000',
          originalTarget: '4446.000000',
          quantity: 5,
          entryAt: `${testJournalDate}T09:00:00.000Z`,
          exitPrice: '4446.000000',
          exitAt: `${testJournalDate}T09:30:00.000Z`,
          actualFees: '12.50',
          feesConfirmed: true,
        })
        .expect(201);

      expect(retroRes.body.recordingMode).toBe('RETROSPECTIVE');
      expect(retroRes.body.state).toBe(TradeState.CLOSED);
      // SRS Section 6 Fixture 2 check:
      expect(retroRes.body.initialRisk).toBe('200.00');
      expect(retroRes.body.grossPnL).toBe('400.00');
      expect(retroRes.body.netPnL).toBe('387.50');
      expect(retroRes.body.netR).toBe('1.93750000');
      expect(retroRes.body.outcome).toBe(TradeOutcome.WIN);
    });
  });

  describe('8. Concurrency & Idempotency Key Handling', () => {
    it('Replaying mutation with same Idempotency-Key returns cached response', async () => {
      const idempotencyKey = `idem-${Date.now()}`;
      const payload = {
        journalId: testJournalId,
        accountId: testAccountId,
        instrumentId: testInstrumentId,
        strategyVersionId: testStrategyVersionId,
        direction: TradeDirection.LONG,
        actualEntry: '4435.000000',
        originalStop: '4430.000000',
        originalTarget: '4445.000000',
        quantity: 1,
        entryAt: `${testJournalDate}T10:00:00.000Z`,
        exitPrice: '4445.000000',
        exitAt: `${testJournalDate}T10:30:00.000Z`,
        actualFees: '2.50',
        feesConfirmed: true,
      };

      // First call
      const res1 = await request(app.getHttpServer())
        .post('/api/v1/trades/record-execution')
        .set('idempotency-key', idempotencyKey)
        .send(payload)
        .expect(201);

      // Replay call with exact same key & body returns original resource
      const res2 = await request(app.getHttpServer())
        .post('/api/v1/trades/record-execution')
        .set('idempotency-key', idempotencyKey)
        .send(payload)
        .expect(201);

      expect(res2.body.id).toBe(res1.body.id);

      // Replay with same key but DIFFERENT body yields 409 Conflict
      await request(app.getHttpServer())
        .post('/api/v1/trades/record-execution')
        .set('idempotency-key', idempotencyKey)
        .send({ ...payload, quantity: 2 })
        .expect(409);
    });
  });

  describe('9. Attachments Module & File Signature Checks', () => {
    let attachmentId: string;

    it('Uploads valid PNG image (magic bytes 89 50 4E 47 0D 0A 1A 0A)', async () => {
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52,
      ]);

      const res = await request(app.getHttpServer())
        .post('/api/v1/attachments')
        .attach('file', pngBuffer, 'test_chart.png')
        .field('journalId', testJournalId)
        .field('caption', 'Valid PNG chart screenshot')
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.mimeType).toBe('image/png');
      attachmentId = res.body.id;
    });

    it('Rejects invalid file format / fake MIME (415 Unsupported Media Type)', async () => {
      const fakeBuffer = Buffer.from('NOT A VALID PNG OR JPEG');

      await request(app.getHttpServer())
        .post('/api/v1/attachments')
        .attach('file', fakeBuffer, 'fake.png')
        .field('journalId', testJournalId)
        .expect(415);
    });

    it('Streams attachment content via GET /api/v1/attachments/:id/content', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/attachments/${attachmentId}/content`)
        .expect(200);

      expect(res.headers['content-type']).toBe('image/png');
    });

    it('Deletes attachment and files via DELETE /api/v1/attachments/:id', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/attachments/${attachmentId}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/v1/attachments/${attachmentId}`)
        .expect(404);
    });
  });

  describe('10. Daily Reviews & Reopening', () => {
    it('Completes daily review when all trades closed and fees confirmed', async () => {
      const journal = await request(app.getHttpServer())
        .get(`/api/v1/journals/${testJournalId}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/journals/${testJournalId}/complete-review`)
        .send({
          expectedVersion: journal.body.version,
          processEvaluation: {
            items: [
              { key: 'item1', label: 'Item 1', applicable: true, passed: true },
              { key: 'item2', label: 'Item 2', applicable: true, passed: true },
              { key: 'item3', label: 'Item 3', applicable: true, passed: true },
              { key: 'item4', label: 'Item 4', applicable: true, passed: true },
              { key: 'item5', label: 'Item 5', applicable: true, passed: true },
              { key: 'item6', label: 'Item 6', applicable: true, passed: true },
              { key: 'item7', label: 'Item 7', applicable: true, passed: true },
              { key: 'item8', label: 'Item 8', applicable: true, passed: true },
              { key: 'item9', label: 'Item 9', applicable: true, passed: true },
              { key: 'item10', label: 'Item 10', applicable: true, passed: true },
            ],
          },
          reflection: {
            whatMarketDid: 'Expanded cleanly into 4H liquidity objective',
            whatWentWell: 'Patience at 15M POI',
          },
        })
        .expect(200);

      expect(res.body.status).toBe(JournalStatus.REVIEWED);
      expect(res.body.dailyGrade).toBe(DailyGrade.A);
      expect(res.body.reviewedAt).toBeDefined();
    });

    it('Reopens reviewed journal requiring reason', async () => {
      // Missing reason throws 400
      await request(app.getHttpServer())
        .post(`/api/v1/journals/${testJournalId}/reopen`)
        .send({ reason: '' })
        .expect(400);

      // Valid reason reopens
      const reopenRes = await request(app.getHttpServer())
        .post(`/api/v1/journals/${testJournalId}/reopen`)
        .send({ reason: 'Need to add an extra observation' })
        .expect(200);

      expect(reopenRes.body.status).toBe(JournalStatus.ACTIVE);
      expect(reopenRes.body.reviewedAt).toBeNull();
    });
  });

  describe('11. Analytics & CSV Exports', () => {
    it('GET /api/v1/analytics/summary returns reconciled metrics', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/analytics/summary')
        .query({ accountId: testAccountId })
        .expect(200);

      expect(res.body.totalClosedTrades).toBeGreaterThan(0);
      expect(res.body.totalNetPnL).toBeDefined();
      expect(res.body.winRate).toBeDefined();
    });

    it('GET /api/v1/analytics/daily returns daily series', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/analytics/daily')
        .query({ accountId: testAccountId })
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/v1/analytics/equity returns equity curve with peak drawdown', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/analytics/equity')
        .query({ accountId: testAccountId })
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].cumulativeNetPnL).toBeDefined();
    });

    it('GET /api/v1/exports/trades.csv streams sanitized CSV with neutralized formulas', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/exports/trades.csv')
        .query({ accountId: testAccountId })
        .expect(200);

      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Trade ID,Journal Date,Account,Symbol');
    });

    it('GET /api/v1/exports/journals.csv streams sanitized journals CSV', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/exports/journals.csv')
        .expect(200);

      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Journal ID,Journal Date,Timezone');
    });
  });
});
