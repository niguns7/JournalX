# JournalX — Project Instructions & Architecture

JournalX is a personal trading journal application designed for one trader to prepare daily plans, document multi-timeframe analysis (4H -> 1H -> 15M -> 5M -> 1M), record executions honestly, evaluate process discipline, and review analytics over time.

## Architecture
- **Monorepo Layout**: pnpm workspace modular monolith:
  - `apps/api`: NestJS backend application (`/api/v1`)
  - `apps/web`: React + Vite + Mantine Core frontend (forced light theme)
  - `packages/db`: Drizzle ORM schema, SQL migrations, seed scripts
  - `packages/domain`: Pure TypeScript types, constants, and financial calculations
  - `packages/config`: Shared tsconfig, ESLint, Prettier configurations
- **Database**: PostgreSQL 16 with Drizzle ORM. UUID primary keys, numeric columns for prices `(18,6)`, money `(18,2)`, and ratios `(18,8)`. Optimistic concurrency versions on mutable aggregates.
- **Scope**: Single-owner personal app. No `user_id` or `tenant_id` columns.

## Common Commands
- `pnpm install`: Install workspace dependencies
- `pnpm dev`: Start both API and Web concurrently
- `pnpm dev:api`: Start NestJS API in watch mode
- `pnpm dev:web`: Start React/Vite development server
- `pnpm build`: Build all packages and applications
- `pnpm typecheck`: Run TypeScript verification across workspace
- `pnpm lint`: Run ESLint across workspace
- `pnpm db:up`: Start PostgreSQL in Docker container
- `pnpm db:generate`: Generate new Drizzle migrations from schema
- `pnpm db:migrate`: Run pending migrations against PostgreSQL
- `pnpm db:seed`: Run idempotent minimal seed script
- `pnpm db:fixtures`: Load test/demo fixtures
- `pnpm test`: Run test suites across packages

## Project Skills
Skills are located in `.claude/skills/`:
- `journalx-domain`: Domain rules, decimal formulas, hard gates vs score, honest recording.
- `journalx-database`: Drizzle ORM schema conventions, numeric precisions, migrations, seeds.
- `journalx-backend`: NestJS modules, DTO validation, error envelopes, concurrency control.
- `journalx-frontend`: Mantine light theme design system, forms, Query state, autosave.
- `journalx-verification`: Testing gates, verification commands, and handoff documentation.

## Documentation
- `SRS.md`: Master specification and 4-session implementation plan.
- `docs/DECISIONS.md`: Log of architectural and technical decisions.
- `docs/PROGRESS.md`: Task-level progress tracker across sessions.
- `docs/session-N-handoff.md`: Handoff reports with real command execution evidence.
