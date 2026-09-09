import { createApiClient, JournalXApiClient } from '@journalx/api-client';
import {
  fixtureSettings,
  fixtureAccounts,
  fixtureInstruments,
  fixtureStrategies,
  fixtureTodayJournal,
  fixtureWindows,
  fixtureEvents,
  fixtureAnalyses,
  fixtureScenarios,
  fixtureQuarters,
  fixtureTrades,
  fixtureAnalyticsSummary,
  fixtureAnalyticsDaily,
  fixtureAnalyticsEquity,
  fixtureAnalyticsBreakdowns,
  fixtureAnalyticsDiscipline,
} from './fixtures.js';

// Detect whether we are in fixture mode
// In Vite: import.meta.env.VITE_USE_FIXTURES === 'true' or in test environment
export const isFixtureMode =
  typeof window !== 'undefined' &&
  (window.location.search.includes('fixtures=true') ||
    (import.meta as any).env?.VITE_USE_FIXTURES === 'true' ||
    (import.meta as any).env?.MODE === 'test');

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL ||
  (import.meta as any).env?.VITE_API_URL ||
  '/api/v1';

// Custom in-memory state for fixtures to allow mutations during dev/test preview
let stateSettings: any = { ...fixtureSettings };
let stateAccounts: any[] = [...fixtureAccounts];
let stateInstruments: any[] = [...fixtureInstruments];
let stateStrategies: any[] = [...fixtureStrategies];
let stateJournals: any[] = [{ ...fixtureTodayJournal }];
let stateWindows: any[] = [...fixtureWindows];
let stateEvents: any[] = [...fixtureEvents];
let stateAnalyses: any[] = [...fixtureAnalyses];
let stateScenarios: any[] = [...fixtureScenarios];
let stateQuarters: any[] = [...fixtureQuarters];
let stateTrades: any[] = [...fixtureTrades];

export function createFixtureTransport(): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = typeof input === 'string' ? input : input.toString();
    const url = new URL(urlStr, 'http://localhost:3000');
    const path = url.pathname.replace(/^\/api\/v1/, '');
    const method = init?.method || 'GET';
    const body = init?.body ? JSON.parse(init.body.toString()) : undefined;

    // Simulate small latency only outside test mode
    if ((import.meta as any).env?.MODE !== 'test') {
      await new Promise((r) => setTimeout(r, 20));
    }

    // Routes
    if (path === '/health/live' || path === '/health/ready') {
      return new Response(JSON.stringify({ status: 'ok', database: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (path === '/settings') {
      if (method === 'PATCH') {
        stateSettings = { ...stateSettings, ...body, version: stateSettings.version + 1 };
        return new Response(JSON.stringify(stateSettings), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify(stateSettings), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (path === '/accounts') {
      if (method === 'POST') {
        const newAcc = {
          id: `acc-${Date.now()}`,
          ...body,
          status: body.status || 'ACTIVE',
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        stateAccounts.push(newAcc);
        return new Response(JSON.stringify(newAcc), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify(stateAccounts), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (path.startsWith('/accounts/')) {
      const id = path.replace('/accounts/', '');
      const acc = stateAccounts.find((a) => a.id === id);
      if (!acc) {
        return new Response(
          JSON.stringify({ code: 'NOT_FOUND', message: 'Account not found', requestId: 'req-1' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (method === 'PATCH') {
        Object.assign(acc, body, { version: acc.version + 1, updatedAt: new Date().toISOString() });
        return new Response(JSON.stringify(acc), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (method === 'DELETE') {
        acc.status = 'ARCHIVED';
        return new Response(JSON.stringify(acc), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify(acc), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (path === '/instruments') {
      if (method === 'POST') {
        const newInst = {
          id: `inst-${Date.now()}`,
          ...body,
          archivedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        stateInstruments.push(newInst);
        return new Response(JSON.stringify(newInst), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify(stateInstruments), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (path.startsWith('/instruments/')) {
      const id = path.replace('/instruments/', '');
      const inst = stateInstruments.find((i) => i.id === id);
      if (!inst) {
        return new Response(
          JSON.stringify({ code: 'NOT_FOUND', message: 'Instrument not found', requestId: 'req-1' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (method === 'PATCH') {
        Object.assign(inst, body, { updatedAt: new Date().toISOString() });
        return new Response(JSON.stringify(inst), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify(inst), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (path === '/strategies') {
      return new Response(JSON.stringify(stateStrategies), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (path.startsWith('/strategies/')) {
      const id = path.replace('/strategies/', '').split('/')[0];
      const strat = stateStrategies.find((s) => s.id === id);
      if (!strat) {
        return new Response(
          JSON.stringify({ code: 'NOT_FOUND', message: 'Strategy not found', requestId: 'req-1' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(JSON.stringify(strat), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (path === '/journals') {
      if (method === 'POST') {
        const { journalDate } = body;
        let existing = stateJournals.find((j) => j.journalDate === journalDate);
        if (!existing) {
          existing = {
            id: `jour-${journalDate}`,
            journalDate,
            timezoneSnapshot: 'Asia/Kathmandu',
            status: 'DRAFT',
            sleepQuality: 8,
            focusRating: 8,
            stressRating: 3,
            emotionalState: 'Calm',
            preparationNotes: '',
            readiness: {
              physicalScore: 8,
              mentalScore: 8,
              checklistComplete: false,
              newsChecked: false,
              riskAcknowledged: false,
            },
            processEvaluation: {
              analysisBeforeExecution: true,
              predefinedLocationRespected: true,
              liquidityEventConfirmed: true,
              displacementConfirmed: true,
              retracementEntryUsed: true,
              correctPositionSizing: true,
              respectedStopLoss: true,
              respectedTradeLimit: true,
              noRevengeTrading: true,
              honestJournalingCompleted: true,
              passedCount: 10,
              applicableCount: 10,
              score: '10.000000',
            },
            reflection: null,
            calculatedGrade: null,
            gradeOverride: null,
            gradeOverrideReason: null,
            isNoTradeDay: false,
            reviewedAt: null,
            version: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          stateJournals.push(existing);
        }
        return new Response(JSON.stringify(existing), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(
        JSON.stringify({
          items: stateJournals,
          total: stateJournals.length,
          page: 1,
          pageSize: 20,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (path.startsWith('/journals/by-date/')) {
      const date = path.replace('/journals/by-date/', '');
      const journal = stateJournals.find((j) => j.journalDate === date) || stateJournals[0];
      return new Response(JSON.stringify(journal), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (path.match(/\/journals\/[^/]+$/)) {
      const id = path.replace('/journals/', '');
      const journal = stateJournals.find((j) => j.id === id) || stateJournals[0];
      if (method === 'PATCH') {
        // Concurrency check simulation: if expectedVersion is wrong, trigger 409
        if (body.expectedVersion && body.expectedVersion !== journal.version) {
          return new Response(
            JSON.stringify({
              code: 'VERSION_CONFLICT',
              message: 'Journal was modified in another session. Please review the changes.',
              details: { currentVersion: journal.version, expectedVersion: body.expectedVersion },
              requestId: 'req-conflict',
            }),
            { status: 409, headers: { 'Content-Type': 'application/json' } },
          );
        }
        Object.assign(journal, body, {
          version: journal.version + 1,
          updatedAt: new Date().toISOString(),
        });
        return new Response(JSON.stringify(journal), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify(journal), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (path.includes('/complete-review')) {
      const journal = stateJournals[0];
      journal.status = 'REVIEWED';
      journal.reviewedAt = new Date().toISOString();
      journal.calculatedGrade = 'A';
      journal.version += 1;
      if (body) Object.assign(journal, body);
      return new Response(JSON.stringify(journal), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (path.includes('/reopen')) {
      const journal = stateJournals[0];
      journal.status = 'ACTIVE';
      journal.reviewedAt = null;
      journal.version += 1;
      return new Response(JSON.stringify(journal), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Windows
    if (path.includes('/windows')) {
      return new Response(JSON.stringify(stateWindows), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Events
    if (path.includes('/events')) {
      if (method === 'POST') {
        const newEvt = {
          id: `evt-${Date.now()}`,
          ...body,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        stateEvents.push(newEvt);
        return new Response(JSON.stringify(newEvt), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify(stateEvents), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Analyses
    if (path.includes('/analyses')) {
      if (method === 'POST') {
        const newAna = {
          id: `ana-${Date.now()}`,
          ...body,
          zones: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        stateAnalyses.push(newAna);
        return new Response(JSON.stringify(newAna), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify(stateAnalyses), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Scenarios
    if (path.includes('/scenarios')) {
      if (method === 'POST') {
        const newScen = {
          id: `scen-${Date.now()}`,
          ...body,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        stateScenarios.push(newScen);
        return new Response(JSON.stringify(newScen), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify(stateScenarios), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Trades
    if (path === '/trades') {
      if (method === 'POST') {
        const newTrade = {
          id: `trd-${Date.now()}`,
          ...body,
          state: 'PLANNED',
          recordingMode: 'PLANNED',
          riskAmount: '250.00',
          stopPoints: '5.000000',
          plannedRR: '2.000000',
          grossPnL: null,
          netPnL: null,
          grossR: null,
          netR: null,
          actualFees: null,
          feesConfirmed: false,
          outcome: null,
          reviewedAt: null,
          review: null,
          violations: [],
          managementEvents: [],
          checklistAnswers: body.checklistAnswers || [],
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        stateTrades.unshift(newTrade);
        return new Response(JSON.stringify(newTrade), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(
        JSON.stringify({
          items: stateTrades,
          total: stateTrades.length,
          page: 1,
          pageSize: 20,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (path === '/trades/record-execution') {
      const isClosed = Boolean(body.exitPrice && body.exitAt);
      const newTrade = {
        id: `trd-${Date.now()}`,
        ...body,
        state: isClosed ? 'CLOSED' : 'OPEN',
        recordingMode: 'RETROSPECTIVE',
        riskAmount: '250.00',
        grossPnL: isClosed ? '500.00' : null,
        netPnL: isClosed && body.feesConfirmed ? '487.50' : null,
        grossR: isClosed ? '2.000000' : null,
        netR: isClosed && body.feesConfirmed ? '1.950000' : null,
        outcome: isClosed && body.feesConfirmed ? 'WIN' : null,
        reviewedAt: null,
        review: null,
        violations: body.acknowledgeViolations
          ? [
              {
                id: `viol-${Date.now()}`,
                code: 'NON_COMPLIANT_RECORDING',
                severity: 'WARNING',
                source: 'RULE_ENGINE',
                note: 'User acknowledged non-compliant actual execution.',
              },
            ]
          : [],
        managementEvents: [],
        checklistAnswers: body.checklistAnswers || [],
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      stateTrades.unshift(newTrade);
      return new Response(JSON.stringify(newTrade), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (path.startsWith('/trades/')) {
      const id = path.replace('/trades/', '').split('/')[0];
      const trade = stateTrades.find((t) => t.id === id);

      if (path.endsWith('/evaluate')) {
        return new Response(
          JSON.stringify({
            eligible: true,
            status: 'ELIGIBLE',
            riskAmount: '250.00',
            plannedRR: '2.000000',
            reasons: [],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (path.endsWith('/close') && trade) {
        trade.state = 'CLOSED';
        trade.exitPrice = body.exitPrice;
        trade.exitAt = body.exitAt;
        trade.actualFees = body.actualFees || '12.50';
        trade.feesConfirmed = Boolean(body.feesConfirmed);
        trade.grossPnL = '500.00';
        trade.netPnL = trade.feesConfirmed ? '487.50' : null;
        trade.netR = trade.feesConfirmed ? '1.950000' : null;
        trade.outcome = trade.feesConfirmed ? 'WIN' : null;
        trade.version += 1;
        return new Response(JSON.stringify(trade), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (path.endsWith('/review') && trade) {
        trade.review = body.review;
        trade.reviewedAt = new Date().toISOString();
        trade.version += 1;
        return new Response(JSON.stringify(trade), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (path.endsWith('/cancel') && trade) {
        trade.state = 'CANCELLED';
        trade.version += 1;
        return new Response(JSON.stringify(trade), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (path.endsWith('/void') && trade) {
        trade.voidedAt = new Date().toISOString();
        trade.voidReason = body.reason;
        trade.version += 1;
        return new Response(JSON.stringify(trade), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (trade) {
        return new Response(JSON.stringify(trade), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Analytics
    if (path === '/analytics/summary') {
      return new Response(JSON.stringify(fixtureAnalyticsSummary), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (path === '/analytics/equity') {
      return new Response(JSON.stringify(fixtureAnalyticsEquity), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (path === '/analytics/daily') {
      return new Response(JSON.stringify(fixtureAnalyticsDaily), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (path === '/analytics/breakdowns') {
      return new Response(JSON.stringify(fixtureAnalyticsBreakdowns), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (path === '/analytics/discipline') {
      return new Response(JSON.stringify(fixtureAnalyticsDiscipline), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fallback
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
}

export const apiClient: JournalXApiClient = createApiClient({
  baseUrl: API_BASE_URL,
  fetchFn: isFixtureMode ? createFixtureTransport() : undefined,
});
