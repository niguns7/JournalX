---
name: journalx-database
description: Drizzle ORM conventions, PostgreSQL schema standards, migrations, and seeds for JournalX.
---

# JournalX Database Standards

## 1. Schema Conventions
- **Primary Keys**: UUID via `defaultRandom()`.
- **Timestamps**: `timestamptz` with `defaultNow()`.
- **Numeric Precision**:
  - Prices, points, stop/target distances: `numeric(18, 6)`
  - Currency, money, fees, nominal accounts, P/L: `numeric(18, 2)`
  - Ratios, R-multiples: `numeric(18, 8)`
  - Contract quantities: `integer`
  - Journal dates: `date`
- **Optimistic Concurrency**: `version: integer().notNull().default(1)` on mutable aggregates (`daily_journals`, `trades`, `strategy_versions`, `app_settings`).
- **Single-Owner Scope**: Strictly NO `user_id` or `tenant_id` columns.

## 2. Relationships & Integrity
- Foreign keys with `onDelete: 'restrict'` for referenced entities (`trading_accounts`, `instruments`, `strategies`).
- Foreign keys with `onDelete: 'cascade'` for dependent child items (`trade_checklist_answers`, `trade_management_events`, `trade_violations`, `market_zones`).
- Composite unique constraints (e.g. `journal_date` on `daily_journals`, `(strategy_id, version_number)` on `strategy_versions`, `(trade_id, item_key)` on `trade_checklist_answers`).

## 3. Migrations & Drizzle Kit
- Migration directory: `packages/db/migrations`
- Generate: `pnpm --filter @journalx/db db:generate`
- Apply: `pnpm --filter @journalx/db db:migrate`
- Schema push is never used as the production migration workflow. Forward corrective migrations only.

## 4. Seeds & Fixtures
- Seed minimal defaults (`packages/db/src/seeds/seed.ts`):
  - `app_settings`: default timezone `Asia/Kathmandu`, USD currency.
  - `instruments`: `MGC` ($10 point value, 0.1 tick size).
  - `strategies`: `MGC Top-Down Sweep Confirmation v1` with 10 mandatory checklist items.
- Fixtures (`packages/db/src/seeds/fixtures.ts`): Loaded only in testing environments, never mixed into default personal DB.
