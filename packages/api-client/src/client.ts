import {
  AccountStatus,
  AccountType,
  ChecklistAnswer,
  DailyGrade,
  ImpactLevel,
  JournalStatus,
  ManagementEventKind,
  QuarterId,
  QuarterModel,
  ScenarioKind,
  Timeframe,
  TradeDirection,
  TradeOutcome,
  TradeState,
  ZoneKind,
  AppPreferencesJson,
  AccountRiskDefaultsJson,
  StrategyRulesJson,
  StrategyChecklistJson,
  ReadinessJson,
  ProcessJson,
  ReflectionJson,
  TimeframeDataJson,
  MarketConfluenceJson,
  ScenarioConditionsJson,
  TradeReviewJson,
  TradeSnapshotJson,
  QuarterConfigJson,
} from '@journalx/domain';

export interface ApiClientOptions {
  baseUrl: string;
  fetchFn?: typeof fetch;
  defaultHeaders?: Record<string, string>;
}

export interface ApiErrorResponse {
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
  details?: unknown;
  requestId: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly errorData: ApiErrorResponse,
  ) {
    super(errorData.message || `API Error: ${status}`);
    this.name = 'ApiError';
  }
}

export class JournalXApiClient {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly defaultHeaders: Record<string, string>;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.fetchFn = options.fetchFn || globalThis.fetch.bind(globalThis);
    this.defaultHeaders = options.defaultHeaders || {};
  }

  private async request<T>(
    endpoint: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: unknown;
      query?: Record<string, string | number | boolean | undefined>;
    } = {},
  ): Promise<T> {
    const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'http://127.0.0.1:3000';
    const path = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const url = new URL(path, origin);

    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      }
    }

    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...options.headers,
    };

    let bodyData: BodyInit | undefined = undefined;
    if (options.body !== undefined) {
      if (options.body instanceof FormData) {
        bodyData = options.body;
      } else {
        headers['Content-Type'] = 'application/json';
        bodyData = JSON.stringify(options.body);
      }
    }

    const response = await this.fetchFn(url.toString(), {
      method: options.method || 'GET',
      headers,
      body: bodyData,
    });

    if (!response.ok) {
      let errorJson: ApiErrorResponse;
      try {
        errorJson = await response.json();
      } catch {
        errorJson = {
          code: 'HTTP_ERROR',
          message: response.statusText,
          requestId: response.headers.get('x-request-id') || 'unknown',
        };
      }
      throw new ApiError(response.status, errorJson);
    }

    // If 204 or empty
    if (response.status === 204) {
      return {} as T;
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json() as Promise<T>;
    }

    return response.text() as Promise<unknown> as Promise<T>;
  }

  // Health
  readonly health = {
    live: () => this.request<{ status: string }>('/health/live'),
    ready: () => this.request<{ status: string; database: boolean }>('/health/ready'),
  };

  // Settings
  readonly settings = {
    get: () => this.request<any>('/settings'),
    update: (data: {
      expectedVersion?: number;
      journalTimezone?: string;
      displayTimezone?: string;
      currency?: string;
      defaultAccountId?: string | null;
      preferencesJson?: AppPreferencesJson;
    }) => this.request<any>('/settings', { method: 'PATCH', body: data }),
  };

  // Accounts
  readonly accounts = {
    list: (status?: AccountStatus) => this.request<any[]>('/accounts', { query: { status } }),
    getById: (id: string) => this.request<any>(`/accounts/${id}`),
    create: (data: {
      name: string;
      type: AccountType;
      currency?: string;
      nominalSize?: string;
      riskBasisAmount?: string;
      status?: AccountStatus;
      notes?: string;
      riskDefaultsJson?: AccountRiskDefaultsJson;
    }) => this.request<any>('/accounts', { method: 'POST', body: data }),
    update: (
      id: string,
      data: {
        expectedVersion?: number;
        name?: string;
        type?: AccountType;
        currency?: string;
        nominalSize?: string;
        riskBasisAmount?: string;
        status?: AccountStatus;
        notes?: string;
        riskDefaultsJson?: AccountRiskDefaultsJson;
      },
    ) => this.request<any>(`/accounts/${id}`, { method: 'PATCH', body: data }),
    archive: (id: string) => this.request<any>(`/accounts/${id}`, { method: 'DELETE' }),
  };

  // Instruments
  readonly instruments = {
    list: (includeArchived?: boolean) =>
      this.request<any[]>('/instruments', { query: { includeArchived } }),
    getById: (id: string) => this.request<any>(`/instruments/${id}`),
    create: (data: {
      symbol: string;
      displayName: string;
      tickSize: string;
      pointValue: string;
      currency?: string;
      verifiedSource?: string;
      verifiedAt?: string;
    }) => this.request<any>('/instruments', { method: 'POST', body: data }),
    update: (
      id: string,
      data: {
        displayName?: string;
        tickSize?: string;
        pointValue?: string;
        currency?: string;
        verifiedSource?: string;
        verifiedAt?: string;
      },
    ) => this.request<any>(`/instruments/${id}`, { method: 'PATCH', body: data }),
    archive: (id: string) => this.request<any>(`/instruments/${id}`, { method: 'DELETE' }),
  };

  // Strategies
  readonly strategies = {
    list: (includeArchived?: boolean) =>
      this.request<any[]>('/strategies', { query: { includeArchived } }),
    getById: (id: string) => this.request<any>(`/strategies/${id}`),
    create: (data: {
      name: string;
      description?: string;
      rules: StrategyRulesJson;
      checklist: StrategyChecklistJson;
      narrative?: string;
      publishImmediately?: boolean;
    }) => this.request<any>('/strategies', { method: 'POST', body: data }),
    update: (id: string, data: { name?: string; description?: string }) =>
      this.request<any>(`/strategies/${id}`, { method: 'PATCH', body: data }),
    archive: (id: string) => this.request<any>(`/strategies/${id}`, { method: 'DELETE' }),
    listVersions: (id: string) => this.request<any[]>(`/strategies/${id}/versions`),
    getVersionById: (id: string, versionId: string) =>
      this.request<any>(`/strategies/${id}/versions/${versionId}`),
    createDraftVersion: (
      id: string,
      data: { rules: StrategyRulesJson; checklist: StrategyChecklistJson; narrative?: string },
    ) => this.request<any>(`/strategies/${id}/versions`, { method: 'POST', body: data }),
    updateDraftVersion: (
      id: string,
      versionId: string,
      data: { rules?: StrategyRulesJson; checklist?: StrategyChecklistJson; narrative?: string },
    ) =>
      this.request<any>(`/strategies/${id}/versions/${versionId}`, {
        method: 'PATCH',
        body: data,
      }),
    publishVersion: (id: string, versionId: string) =>
      this.request<any>(`/strategies/${id}/versions/${versionId}/publish`, { method: 'POST' }),
  };

  // Journals
  readonly journals = {
    createOrGet: (data: { journalDate: string; timezoneSnapshot?: string }) =>
      this.request<any>('/journals', { method: 'POST', body: data }),
    list: (query?: {
      from?: string;
      to?: string;
      status?: JournalStatus;
      grade?: DailyGrade;
      page?: number;
      pageSize?: number;
    }) => this.request<{ items: any[]; page: number; pageSize: number; total: number }>('/journals', { query }),
    getByDate: (date: string) => this.request<any>(`/journals/by-date/${date}`),
    getById: (id: string) => this.request<any>(`/journals/${id}`),
    update: (
      id: string,
      data: {
        expectedVersion?: number;
        sleepQuality?: number;
        focusRating?: number;
        stressRating?: number;
        emotionalState?: string;
        preparationNotes?: string;
        readiness?: ReadinessJson;
        processEvaluation?: ProcessJson;
        reflection?: ReflectionJson;
        gradeOverride?: DailyGrade;
        gradeOverrideReason?: string;
      },
    ) => this.request<any>(`/journals/${id}`, { method: 'PATCH', body: data }),
    activate: (id: string) => this.request<any>(`/journals/${id}/activate`, { method: 'POST' }),
    completeReview: (
      id: string,
      data: {
        expectedVersion?: number;
        isNoTradeDay?: boolean;
        reflection?: ReflectionJson;
        processEvaluation?: ProcessJson;
        gradeOverride?: DailyGrade;
        gradeOverrideReason?: string;
      },
    ) => this.request<any>(`/journals/${id}/complete-review`, { method: 'POST', body: data }),
    reopen: (id: string, data: { reason: string }) =>
      this.request<any>(`/journals/${id}/reopen`, { method: 'POST', body: data }),

    // Children
    windows: {
      list: (journalId: string) => this.request<any[]>(`/journals/${journalId}/windows`),
      create: (
        journalId: string,
        data: {
          label: string;
          timezone: string;
          startsAt: string;
          endsAt: string;
          quarterConfig?: QuarterConfigJson;
        },
      ) => this.request<any>(`/journals/${journalId}/windows`, { method: 'POST', body: data }),
      update: (
        journalId: string,
        windowId: string,
        data: {
          label?: string;
          timezone?: string;
          startsAt?: string;
          endsAt?: string;
          quarterConfig?: QuarterConfigJson;
        },
      ) =>
        this.request<any>(`/journals/${journalId}/windows/${windowId}`, {
          method: 'PATCH',
          body: data,
        }),
      delete: (journalId: string, windowId: string) =>
        this.request<{ success: boolean }>(`/journals/${journalId}/windows/${windowId}`, {
          method: 'DELETE',
        }),
    },

    events: {
      list: (journalId: string) => this.request<any[]>(`/journals/${journalId}/events`),
      create: (
        journalId: string,
        data: {
          title: string;
          occursAt: string;
          impact?: ImpactLevel;
          restrictionStart?: string;
          restrictionEnd?: string;
          notes?: string;
          checkedAt?: string;
        },
      ) => this.request<any>(`/journals/${journalId}/events`, { method: 'POST', body: data }),
      update: (
        journalId: string,
        eventId: string,
        data: {
          title?: string;
          occursAt?: string;
          impact?: ImpactLevel;
          restrictionStart?: string;
          restrictionEnd?: string;
          notes?: string;
          checkedAt?: string;
        },
      ) =>
        this.request<any>(`/journals/${journalId}/events/${eventId}`, {
          method: 'PATCH',
          body: data,
        }),
      delete: (journalId: string, eventId: string) =>
        this.request<{ success: boolean }>(`/journals/${journalId}/events/${eventId}`, {
          method: 'DELETE',
        }),
    },

    analyses: {
      list: (journalId: string) => this.request<any[]>(`/journals/${journalId}/analyses`),
      create: (
        journalId: string,
        data: {
          windowId?: string | null;
          timeframe: Timeframe;
          data?: TimeframeDataJson;
          narrative?: string;
        },
      ) => this.request<any>(`/journals/${journalId}/analyses`, { method: 'POST', body: data }),
      update: (
        journalId: string,
        analysisId: string,
        data: {
          windowId?: string | null;
          data?: TimeframeDataJson;
          narrative?: string;
        },
      ) =>
        this.request<any>(`/journals/${journalId}/analyses/${analysisId}`, {
          method: 'PATCH',
          body: data,
        }),
      delete: (journalId: string, analysisId: string) =>
        this.request<{ success: boolean }>(`/journals/${journalId}/analyses/${analysisId}`, {
          method: 'DELETE',
        }),
    },

    zones: {
      list: (journalId: string, analysisId: string) =>
        this.request<any[]>(`/journals/${journalId}/analyses/${analysisId}/zones`),
      create: (
        journalId: string,
        analysisId: string,
        data: {
          kind: ZoneKind;
          lowerPrice: string;
          upperPrice: string;
          confluence?: MarketConfluenceJson;
          notes?: string;
        },
      ) =>
        this.request<any>(`/journals/${journalId}/analyses/${analysisId}/zones`, {
          method: 'POST',
          body: data,
        }),
      update: (
        journalId: string,
        analysisId: string,
        zoneId: string,
        data: {
          kind?: ZoneKind;
          lowerPrice?: string;
          upperPrice?: string;
          confluence?: MarketConfluenceJson;
          notes?: string;
        },
      ) =>
        this.request<any>(`/journals/${journalId}/analyses/${analysisId}/zones/${zoneId}`, {
          method: 'PATCH',
          body: data,
        }),
      delete: (journalId: string, analysisId: string, zoneId: string) =>
        this.request<{ success: boolean }>(
          `/journals/${journalId}/analyses/${analysisId}/zones/${zoneId}`,
          { method: 'DELETE' },
        ),
    },

    scenarios: {
      list: (journalId: string) => this.request<any[]>(`/journals/${journalId}/scenarios`),
      create: (
        journalId: string,
        data: {
          windowId?: string | null;
          kind: ScenarioKind;
          conditions?: ScenarioConditionsJson;
          narrative?: string;
        },
      ) => this.request<any>(`/journals/${journalId}/scenarios`, { method: 'POST', body: data }),
      update: (
        journalId: string,
        scenarioId: string,
        data: {
          windowId?: string | null;
          kind?: ScenarioKind;
          conditions?: ScenarioConditionsJson;
          narrative?: string;
        },
      ) =>
        this.request<any>(`/journals/${journalId}/scenarios/${scenarioId}`, {
          method: 'PATCH',
          body: data,
        }),
      delete: (journalId: string, scenarioId: string) =>
        this.request<{ success: boolean }>(`/journals/${journalId}/scenarios/${scenarioId}`, {
          method: 'DELETE',
        }),
    },

    quarters: {
      list: (journalId: string, windowId: string) =>
        this.request<any[]>(`/journals/${journalId}/windows/${windowId}/quarters`),
      create: (
        journalId: string,
        windowId: string,
        data: {
          quarter: QuarterId;
          startsAt: string;
          endsAt: string;
          rangeHigh?: string;
          rangeLow?: string;
          trueOpenPrice?: string;
          model?: QuarterModel;
          notes?: string;
        },
      ) =>
        this.request<any>(`/journals/${journalId}/windows/${windowId}/quarters`, {
          method: 'POST',
          body: data,
        }),
      update: (
        journalId: string,
        windowId: string,
        quarterId: string,
        data: {
          startsAt?: string;
          endsAt?: string;
          rangeHigh?: string;
          rangeLow?: string;
          trueOpenPrice?: string;
          model?: QuarterModel;
          notes?: string;
        },
      ) =>
        this.request<any>(`/journals/${journalId}/windows/${windowId}/quarters/${quarterId}`, {
          method: 'PATCH',
          body: data,
        }),
      delete: (journalId: string, windowId: string, quarterId: string) =>
        this.request<{ success: boolean }>(
          `/journals/${journalId}/windows/${windowId}/quarters/${quarterId}`,
          { method: 'DELETE' },
        ),
    },

    limits: {
      update: (
        journalId: string,
        accountId: string,
        data: { maxTrades?: number; maxDailyLoss?: string; consecutiveLossLimit?: number },
      ) => this.request<any>(`/journals/${journalId}/limits/${accountId}`, { method: 'PUT', body: data }),
    },
  };

  // Trades
  readonly trades = {
    list: (query?: {
      accountId?: string;
      journalId?: string;
      from?: string;
      to?: string;
      state?: TradeState;
      outcome?: TradeOutcome;
      strategyId?: string;
      includeVoided?: boolean;
      page?: number;
      pageSize?: number;
    }) => this.request<{ items: any[]; page: number; pageSize: number; total: number }>('/trades', { query }),
    getById: (id: string) => this.request<any>(`/trades/${id}`),
    createPlan: (data: {
      journalId: string;
      accountId: string;
      instrumentId: string;
      strategyVersionId: string;
      windowId?: string | null;
      scenarioId?: string | null;
      direction: TradeDirection;
      plannedEntry: string;
      originalStop: string;
      originalTarget: string;
      quantity: number;
      actualContractSymbol?: string;
      checklistAnswers?: Array<{ itemKey: string; answer: ChecklistAnswer; evidenceNote?: string }>;
    }) => this.request<any>('/trades', { method: 'POST', body: data }),
    updatePlan: (
      id: string,
      data: {
        expectedVersion?: number;
        plannedEntry?: string;
        originalStop?: string;
        originalTarget?: string;
        quantity?: number;
        actualContractSymbol?: string;
        windowId?: string | null;
        scenarioId?: string | null;
      },
    ) => this.request<any>(`/trades/${id}`, { method: 'PATCH', body: data }),
    evaluate: (id: string) => this.request<any>(`/trades/${id}/evaluate`, { method: 'POST' }),
    cancelPlan: (id: string) => this.request<any>(`/trades/${id}/cancel`, { method: 'POST' }),
    open: (
      id: string,
      data: {
        expectedVersion?: number;
        actualEntry: string;
        entryAt: string;
        actualContractSymbol?: string;
        acknowledgeViolations?: boolean;
      },
      headers?: { 'idempotency-key'?: string },
    ) => this.request<any>(`/trades/${id}/open`, { method: 'POST', body: data, headers }),
    recordExecution: (
      data: {
        journalId: string;
        accountId: string;
        instrumentId: string;
        strategyVersionId: string;
        windowId?: string | null;
        scenarioId?: string | null;
        direction: TradeDirection;
        actualEntry: string;
        originalStop: string;
        originalTarget: string;
        quantity: number;
        entryAt: string;
        actualContractSymbol?: string;
        exitPrice?: string;
        exitAt?: string;
        actualFees?: string;
        feesConfirmed?: boolean;
        checklistAnswers?: Array<{ itemKey: string; answer: ChecklistAnswer; evidenceNote?: string }>;
        acknowledgeViolations?: boolean;
      },
      headers?: { 'idempotency-key'?: string },
    ) => this.request<any>('/trades/record-execution', { method: 'POST', body: data, headers }),
    close: (
      id: string,
      data: {
        expectedVersion?: number;
        exitPrice: string;
        exitAt: string;
        actualFees?: string;
        feesConfirmed?: boolean;
        observedAdversePoints?: string;
        observedFavorablePoints?: string;
      },
      headers?: { 'idempotency-key'?: string },
    ) => this.request<any>(`/trades/${id}/close`, { method: 'POST', body: data, headers }),
    addManagementEvent: (
      id: string,
      data: { kind: ManagementEventKind; newValue: string; reason?: string },
    ) => this.request<any>(`/trades/${id}/management-events`, { method: 'POST', body: data }),
    saveChecklist: (
      id: string,
      data: { answers: Array<{ itemKey: string; answer: ChecklistAnswer; evidenceNote?: string }> },
    ) => this.request<any>(`/trades/${id}/checklist`, { method: 'PUT', body: data }),
    review: (id: string, data: { expectedVersion?: number; review: TradeReviewJson }) =>
      this.request<any>(`/trades/${id}/review`, { method: 'POST', body: data }),
    correct: (
      id: string,
      data: {
        expectedVersion: number;
        reason: string;
        actualEntry?: string;
        originalStop?: string;
        originalTarget?: string;
        quantity?: number;
        exitPrice?: string;
        exitAt?: string;
        actualFees?: string;
        feesConfirmed?: boolean;
      },
    ) => this.request<any>(`/trades/${id}/correct`, { method: 'POST', body: data }),
    void: (id: string, data: { expectedVersion: number; reason: string }) =>
      this.request<any>(`/trades/${id}/void`, { method: 'POST', body: data }),
  };

  // Attachments
  readonly attachments = {
    upload: (formData: FormData) =>
      this.request<any>('/attachments', { method: 'POST', body: formData }),
    getMetadata: (id: string) => this.request<any>(`/attachments/${id}`),
    getContentUrl: (id: string) => `${this.baseUrl}/attachments/${id}/content`,
    delete: (id: string) => this.request<{ success: boolean }>(`/attachments/${id}`, { method: 'DELETE' }),
  };

  // Analytics
  readonly analytics = {
    getSummary: (query?: { accountId?: string; from?: string; to?: string; strategyId?: string }) =>
      this.request<any>('/analytics/summary', { query }),
    getDaily: (query?: { accountId?: string; from?: string; to?: string; strategyId?: string }) =>
      this.request<any[]>('/analytics/daily', { query }),
    getEquity: (query?: { accountId?: string; from?: string; to?: string; strategyId?: string }) =>
      this.request<any[]>('/analytics/equity', { query }),
    getBreakdowns: (query?: { accountId?: string; from?: string; to?: string; strategyId?: string }) =>
      this.request<any>('/analytics/breakdowns', { query }),
    getDiscipline: (query?: { accountId?: string; from?: string; to?: string; strategyId?: string }) =>
      this.request<any>('/analytics/discipline', { query }),
  };

  // Exports
  readonly exports = {
    getTradesCsvUrl: (query?: Record<string, string | undefined>) => {
      const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'http://127.0.0.1:3000';
      const u = new URL(`${this.baseUrl}/exports/trades.csv`, origin);
      if (query) {
        for (const [k, v] of Object.entries(query)) {
          if (v !== undefined) u.searchParams.append(k, v);
        }
      }
      return u.toString();
    },
    getJournalsCsvUrl: (from?: string, to?: string) => {
      const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'http://127.0.0.1:3000';
      const u = new URL(`${this.baseUrl}/exports/journals.csv`, origin);
      if (from) u.searchParams.append('from', from);
      if (to) u.searchParams.append('to', to);
      return u.toString();
    },
  };
}

export function createApiClient(options: ApiClientOptions): JournalXApiClient {
  return new JournalXApiClient(options);
}
