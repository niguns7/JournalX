# JournalX — Personal Trading Journal Application

**JournalX** is a local-first, highly disciplined trading journal application built specifically for futures traders (optimized for Micro Gold Futures / MGC). It combines top-down multi-timeframe analysis, 10/10 mandatory checklist execution gating, honest non-compliant trade tracking, automated realized PnL/R calculations with Decimal.js precision, and comprehensive discipline analytics.

---

## 🏛️ Architecture Overview

JournalX is architected as a clean TypeScript monorepo managed with `pnpm` workspaces:

```text
journal-app/
├── apps/
│   ├── api/            # NestJS 10 REST API backend (REST, DTOs, Swagger, Multer storage)
│   └── web/            # React 19 + Mantine Core UI (Vite, TanStack Query, Light Theme)
├── packages/
│   ├── domain/         # Pure domain types, enums, pure calculations, reconciliation
│   ├── db/             # Drizzle ORM schema, PostgreSQL migrations, seeds & benchmark
│   ├── api-client/     # Type-safe TypeScript REST API client
│   └── config/         # Shared TypeScript & ESLint base configs
├── e2e/                # Playwright End-to-End user journeys (FR-01 to FR-14)
├── scripts/            # Database backup & restore validation utilities
├── storage/uploads/    # Local persistent evidence & chart screenshot storage
└── docs/               # System documentation, acceptance report, and decisions
```

---

## 🚀 Quickstart & Setup

### 1. Prerequisites
- **Node.js**: `v20+` or `v24+`
- **pnpm**: `v9+` or `v10+`
- **Docker & Docker Compose**: For local PostgreSQL database container

### 2. Environment Configuration
Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Default local database connection:
```env
DATABASE_URL="postgresql://journalx:journalx_secret@127.0.0.1:5442/journalx"
PORT=3000
STORAGE_LOCAL_ROOT="./storage/uploads"
VITE_API_BASE_URL="/api/v1"
```

### 3. Start Database Container
```bash
# Start PostgreSQL on port 5442
pnpm db:up
```

### 4. Run Migrations & Seed Baseline Data
```bash
# Run database schema migrations
pnpm db:migrate

# Seed baseline instruments (MGC), accounts, and playbook strategies
pnpm db:seed
```

---

## 💻 Running the Application

### Start All Services (Dev Mode)
```bash
# Runs both NestJS API (port 3000) and Vite Web UI (port 5173) in parallel
pnpm dev
```

- **Web Application**: [http://127.0.0.1:5173](http://127.0.0.1:5173)
- **API Backend**: [http://127.0.0.1:3000](http://127.0.0.1:3000)
- **Swagger OpenAPI Docs**: [http://127.0.0.1:3000/api/docs](http://127.0.0.1:3000/api/docs)
- **Health Live Probe**: [http://127.0.0.1:3000/health/live](http://127.0.0.1:3000/health/live)

---

## 🧪 Testing & Verification

### Unit & Integration Tests
```bash
# Runs Vitest in @journalx/domain & @journalx/web, and Jest in @journalx/api
pnpm test
```

### Financial Reconciliation Tests
```bash
# Verify position risk, realized PnL, fee subtraction, and net R against known fixtures
pnpm --filter @journalx/domain test src/reconciliation.spec.ts
```

### Playwright End-to-End Tests
```bash
# Runs all 9 Playwright user journeys against the live stack
npx playwright test
```

### Typecheck & Lint
```bash
pnpm typecheck
pnpm lint
```

### Production Build
```bash
pnpm build
```

---

## ⚡ Performance Benchmarking (5,000 Records)

Generate 5,000 synthetic trades in PostgreSQL and benchmark core query response times against the `< 500ms` SLA:

```bash
pnpm db:benchmark
```

**Benchmark Results**:
- **Paginated Trade Log**: ~200 ms (SLA < 500 ms) ✅
- **Daily Analytics Aggregation**: ~311 ms (SLA < 500 ms) ✅
- **Cumulative Equity Curve (4,967 trades)**: ~98 ms (SLA < 500 ms) ✅
- **Full Portfolio Summary (4,967 trades)**: ~32 ms (SLA < 500 ms) ✅

---

## 💾 Backup & Restore Runbook

### Backup Database & Evidence
Dumps all 20 database tables, attachment evidence files, and computes a SHA-256 verification manifest:

```bash
pnpm db:backup
```
Backups are saved to `backups/journalx-backup-<timestamp>/`.

### Restore Database
Restores data from the latest backup folder into a clean target database with foreign key constraint integrity:

```bash
# Restores to default or isolated test database
pnpm db:restore
```

---

## 📋 Acceptance & Compliance
For full verification details and requirements mapping (FR-01 through FR-14), refer to [`docs/acceptance-report.md`](./docs/acceptance-report.md).
