export const queryKeys = {
  health: ['health'] as const,
  settings: () => ['settings'] as const,
  accounts: {
    all: ['accounts'] as const,
    list: (status?: string) => ['accounts', 'list', { status }] as const,
    detail: (id: string) => ['accounts', 'detail', id] as const,
  },
  instruments: {
    all: ['instruments'] as const,
    list: (includeArchived?: boolean) => ['instruments', 'list', { includeArchived }] as const,
    detail: (id: string) => ['instruments', 'detail', id] as const,
  },
  strategies: {
    all: ['strategies'] as const,
    list: (includeArchived?: boolean) => ['strategies', 'list', { includeArchived }] as const,
    detail: (id: string) => ['strategies', 'detail', id] as const,
    versions: (id: string) => ['strategies', id, 'versions'] as const,
    versionDetail: (id: string, versionId: string) =>
      ['strategies', id, 'versions', versionId] as const,
  },
  journals: {
    all: ['journals'] as const,
    list: (filters?: Record<string, any>) => ['journals', 'list', filters] as const,
    byDate: (date: string) => ['journals', 'byDate', date] as const,
    detail: (id: string) => ['journals', 'detail', id] as const,
    windows: (journalId: string) => ['journals', journalId, 'windows'] as const,
    events: (journalId: string) => ['journals', journalId, 'events'] as const,
    analyses: (journalId: string) => ['journals', journalId, 'analyses'] as const,
    zones: (journalId: string, analysisId: string) =>
      ['journals', journalId, 'analyses', analysisId, 'zones'] as const,
    scenarios: (journalId: string) => ['journals', journalId, 'scenarios'] as const,
    quarters: (journalId: string, windowId: string) =>
      ['journals', journalId, 'windows', windowId, 'quarters'] as const,
  },
  trades: {
    all: ['trades'] as const,
    list: (filters?: Record<string, any>) => ['trades', 'list', filters] as const,
    detail: (id: string) => ['trades', 'detail', id] as const,
  },
  analytics: {
    all: ['analytics'] as const,
    summary: (filters?: Record<string, any>) => ['analytics', 'summary', filters] as const,
    daily: (filters?: Record<string, any>) => ['analytics', 'daily', filters] as const,
    equity: (filters?: Record<string, any>) => ['analytics', 'equity', filters] as const,
    breakdowns: (filters?: Record<string, any>) => ['analytics', 'breakdowns', filters] as const,
    discipline: (filters?: Record<string, any>) => ['analytics', 'discipline', filters] as const,
  },
};
