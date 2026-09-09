# JournalX — Implementation Progress & Backlog Tracker

## Session 1: Folder structure, project skills, schema and migration
- [x] **S1-01**: Inspect repository; record scope, dependency versions, and architecture defaults in `docs/DECISIONS.md`.
- [x] **S1-02**: Create pnpm workspace, shared TS/lint configs, `.env.example`, `.env`, and updated `.gitignore`.
- [x] **S1-03**: Create `CLAUDE.md` and project skills (`journalx-domain`, `journalx-database`, `journalx-backend`, `journalx-frontend`, `journalx-verification`).
- [x] **S1-04**: Scaffold NestJS bootstrap (`apps/api`) and React/Vite/Mantine bootstrap (`apps/web`) with light theme AppShell.
- [x] **S1-05**: Compose local PostgreSQL container with named persistent volume and loopback binding (`127.0.0.1:5442`).
- [x] **S1-06**: Implement all 20 tables, enums, constraints, relations, and indexes in `packages/db/src/schema/`.
- [x] **S1-07**: Generate initial migration (`migrations/0000_lazy_synch.sql`), apply to database, and verify idempotency.
- [x] **S1-08**: Implement idempotent minimal seeds (`app_settings` with `Asia/Kathmandu`, `MGC` instrument, `MGC Top-Down Sweep Confirmation v1` strategy with 10 mandatory checklist items).
- [x] **S1-09**: Implement independent test fixtures (`Demo Evaluation 50K` account).
- [x] **S1-10**: Write schema documentation, decisions log, progress backlog, and `docs/session-1-handoff.md`.

---

## Session 2: Backend and test cases
- [ ] **S2-01**: Verify S1 gate and load domain/backend/database skills.
- [ ] **S2-02**: Implement decimal calculations and rule engine.
- [ ] **S2-03**: Add global DTO validation, errors, request IDs, env checks.
- [ ] **S2-04**: Implement settings, accounts, instruments, strategy versioning.
- [ ] **S2-05**: Implement journal and child resources (windows, events, analyses, zones, scenarios, quarter observations).
- [ ] **S2-06**: Implement trades and lifecycle (plan/open/close/record/correct/void).
- [ ] **S2-07**: Add rule evaluation, daily limits, transaction locks, and idempotency.
- [ ] **S2-08**: Implement file storage and evidence routes.
- [ ] **S2-09**: Implement trade and daily reviews.
- [ ] **S2-10**: Implement analytics and exports.
- [ ] **S2-11**: Generate OpenAPI specification and typed client.
- [ ] **S2-12**: Run unit and PostgreSQL integration tests.

---

## Session 3: Frontend implementation
- [ ] **S3-01**: Verify S2 API/client artifacts.
- [ ] **S3-02**: Build light Mantine shell and navigation.
- [ ] **S3-03**: Add generated client adapter, Query provider, and query keys.
- [ ] **S3-04**: Implement dashboard and journal list/calendar.
- [ ] **S3-05**: Implement all journal sections and autosave.
- [ ] **S3-06**: Implement trade plan, recording, management, and review.
- [ ] **S3-07**: Implement trade log filters and evidence gallery.
- [ ] **S3-08**: Implement playbook/versioning and settings.
- [ ] **S3-09**: Implement analytics charts/tables/export action.
- [ ] **S3-10**: Test critical UI behavior and responsive layout.

---

## Session 4: Integration and final verification
- [ ] **S4-01**: Start real stack and disable fixture transport.
- [ ] **S4-02**: Validate CORS/proxy/env and generated client.
- [ ] **S4-03**: Connect autosave, mutations, invalidation, and errors.
- [ ] **S4-04**: Verify actual image upload/content/removal.
- [ ] **S4-05**: Run full user journeys in Playwright.
- [ ] **S4-06**: Reconcile dashboard/trade/day/export totals.
- [ ] **S4-07**: Verify production builds and persistent volumes.
- [ ] **S4-08**: Run bounded performance check and fix bottlenecks.
- [ ] **S4-09**: Exercise backup and restore into isolated resources.
- [ ] **S4-10**: Complete runbooks and final acceptance report.
