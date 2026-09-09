---
name: journalx-verification
description: Verification gates, testing commands, handoff reporting, and evidence standards for JournalX.
---

# JournalX Verification Standards

## 1. Zero False Claims Rule
- Never claim a test, migration, build, or healthcheck passed without executing the command in the shell and inspecting the real output.
- Record actual exit codes and command output snippets in `docs/session-N-handoff.md`.

## 2. Session 1 Verification Checklist
- `pnpm install` exits 0.
- `pnpm typecheck` exits 0.
- `pnpm lint` exits 0.
- `pnpm build` exits 0.
- PostgreSQL starts and passes healthcheck.
- Drizzle migrations apply cleanly (`db:migrate`).
- Re-running migrations is an idempotent no-op.
- Seed data inserts successfully (`db:seed`).
- Re-running seed is idempotent.
- NestJS API boots and `GET /health/live` returns `{ status: "ok" }`.
- Mantine web application shell builds cleanly.

## 3. Session Documentation Maintenance
- Maintain `docs/PROGRESS.md` with checked boxes for completed task IDs.
- Record architectural decisions and trade-offs in `docs/DECISIONS.md`.
- Produce comprehensive `docs/session-N-handoff.md` after each session.
