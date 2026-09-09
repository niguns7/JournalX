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
