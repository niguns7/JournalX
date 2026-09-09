# JournalX — Architectural & Technical Decisions Log

This document records the design choices, architectural invariants, and constraints adopted across the JournalX implementation.

---

## 1. Monorepo & Modular Monolith Layout
- **Decision**: Use a `pnpm` workspace with a modular monolith structure:
  - `apps/api`: NestJS application server providing REST endpoints (`/api/v1`)
  - `apps/web`: React 18 + Vite + Mantine Core v7 frontend
  - `packages/db`: Drizzle ORM schema, SQL migration files, and seed runners
  - `packages/domain`: Pure TypeScript types, constants, and financial calculations
  - `packages/config`: Shared compiler and linter configurations
- **Rationale**: Keeps full-stack development cohesive with pure TypeScript while strictly separating persistence from presentation and business logic from transport.

## 2. Personal Single-Owner Scope
- **Decision**: No `user_id`, `tenant_id`, `organization_id`, or authentication tables.
- **Rationale**: JournalX is a private, personal trading application designed to run locally (bound to loopback `127.0.0.1`) or behind an authenticated private network proxy. Avoiding multi-tenancy drastically simplifies schema and eliminates unnecessary authorization overhead.

## 3. Financial Precision & Arithmetic Standards
- **Decision**: 
  - Prices, points, stop/target levels: `numeric(18, 6)`
  - Currency amounts, fees, nominal sizes, P/L: `numeric(18, 2)`
  - Ratios, R-multiples: `numeric(18, 8)`
  - Quantities: `integer`
  - All financial calculations run server-side using decimal string arithmetic.
- **Rationale**: Eliminates JavaScript floating-point rounding errors and preserves exact financial precision.

## 4. Local Database Port Configuration
- **Decision**: Default `POSTGRES_PORT` to `5442` in `.env` (while mapping to internal container port `5432`) and bind to loopback (`127.0.0.1:5442:5432`).
- **Rationale**: Avoids port collisions on systems where standard `5432` is already occupied by other Docker containers or local database instances.

## 5. Optimistic Concurrency & Audit Trails
- **Decision**: Include `version: integer().notNull().default(1)` on mutable aggregate roots (`daily_journals`, `trades`, `strategy_versions`, `app_settings`).
- **Rationale**: Prevents lost updates between concurrent browser tabs or background autosaves.

## 6. Seed & Fixture Discipline
- **Decision**: Maintain a strict distinction between minimal configuration seeds (`packages/db/src/seeds/seed.ts`) and test fixtures (`packages/db/src/seeds/fixtures.ts`).
- **Rationale**: Prevents fictitious or mock trade data from polluting the trader's personal database.

## 7. Pure Domain Calculation Engine
- **Decision**: Centralize all financial and rule calculations in `@journalx/domain` using `Decimal.js` (arbitrary-precision decimal arithmetic). Decimal values are passed as strings over REST and mapped to PostgreSQL `numeric`.
- **Rationale**: Completely eliminates floating point inaccuracies and guarantees exact reproduction of all SRS Section 6 test fixtures.

## 8. 10/10 Mandatory Checklist Gate
- **Decision**: Enforce hard gate validation on trade plans. Every mandatory checklist item must be explicitly answered `PASS` before a trade can be opened or evaluated as `ELIGIBLE`. `NOT_APPLICABLE` is strictly rejected for mandatory items.
- **Rationale**: Upholds discipline and prevents emotional trade entries.

## 9. Stop-Widening Violation & Initial Risk Invariance
- **Decision**: Moving stop loss wider than previous level creates a permanent `STOP_WIDENED` violation. `initialRisk` remains permanently frozen at the original trade baseline so R-multiples are never artificially deflated.
- **Rationale**: Prevents deceptive performance metrics and enforces honest logging.

## 10. Concurrency & Idempotency Key Handling
- **Decision**: `idempotency_keys` table stores SHA-256 request payload hash and response JSON. Retried requests with matching key return cached response without re-executing. Database transactions lock `journal_account_limits` using `SELECT ... FOR UPDATE` during trade state transitions.
- **Rationale**: Guarantees zero duplicate execution and ensures strict atomic daily trade limit compliance across concurrent requests.

## 11. File Signature Verification & Storage Compensation
- **Decision**: Multi-byte binary signature inspection (magic bytes for PNG, JPEG, WebP) independent of client MIME headers. If database insertion fails, an automated compensation step deletes the orphaned file from disk.
- **Rationale**: Eliminates malware/mime-spoofing risks and prevents disk leaks on failed uploads.

## 12. CSV Formula Sanitization
- **Decision**: Neutralize dangerous leading characters (`=`, `+`, `-`, `@`) with a leading tab character and quote fields per RFC 4180.
- **Rationale**: Protects spreadsheets from formula injection attacks upon CSV export.

## 13. End-of-Day Review Gate & Correction Invalidation
- **Decision**: Daily review completion blocks if any open trade exists or any closed trade has unconfirmed fees. If a trade is corrected post-review, its `reviewedAt` timestamp is automatically invalidated and reset to `null`.
- **Rationale**: Guarantees metrics reflect fully settled trades with verified brokerage fees.

## 14. Relative API Base URL and Origin Resolution
- **Decision**: In `@journalx/api-client`, dynamically resolve relative API paths (e.g. `/api/v1`) using `window.location.origin` in browser environments and fallback to loopback in Node.js test environments.
- **Rationale**: Enables seamless reverse proxying through Vite dev server (`/api` -> `http://127.0.0.1:3000`) and standard production reverse proxies (Nginx/Caddy) without hardcoded origins or CORS misconfigurations.

## 15. Dynamic Live Entity Resolution Over Hardcoded Test IDs
- **Decision**: Frontend modals and workspaces auto-query real database entities (accounts, instruments, active published strategy versions, and date-matched journals) and bind live entity UUIDs upon load instead of falling back to mock fixture string literals.
- **Rationale**: Guarantees zero runtime 400/404 foreign key mismatches when operating against live PostgreSQL instances.

## 16. Database Restore Constraint Bypass via Replica Role
- **Decision**: In `scripts/restore.ts`, wrap data insertion with `SET session_replication_role = 'replica';` before importing table records and `SET session_replication_role = 'origin';` upon commit.
- **Rationale**: Prevents circular and multi-table deferred foreign key constraint violations while importing large multi-table relational backups.

## 17. Pure Decimal.js Financial Reconciliation Test Suite
- **Decision**: Maintain dedicated test vector coverage in `packages/domain/src/reconciliation.spec.ts` matching exact mathematical edge cases (MGC point values, zero-risk division safeguards, provisional fee states, no-trade day exclusion from win-rate).
- **Rationale**: Protects accounting integrity and financial expectancy calculations against accidental regression.
