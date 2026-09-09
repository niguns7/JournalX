JournalX — SRS and Four-Session Implementation Master Plan

Version: 1.0 | Prepared: 8 September 2026

1. Instructions to Claude

You are implementing JournalX, a personal trading journal. Treat this document as the product specification, architecture baseline, task backlog, and acceptance contract. Implement only the session requested by the user. Inspect the repository first, preserve existing work, and finish the requested session with evidence of working behavior. Do not try to implement all four sessions together.

Before changing code, read this document, CLAUDE.md, the relevant project skills, docs/PROGRESS.md, docs/DECISIONS.md, and the preceding session handoff. Verify prerequisites against actual code and test output. Resolve ordinary implementation choices yourself and record them. Ask only when a missing credential, destructive operation, or genuinely conflicting product requirement blocks progress. Never claim a migration, test, or integration succeeded without executing it.

Create project skills during Session 1, use them in later sessions, and update them when an accepted decision changes. Skills must reinforce this specification, not silently broaden scope. Do not generate business functionality merely to populate folders. Do not leave mock responses or placeholder success states in a completed feature.

If a session exceeds a context window, checkpoint completed task IDs, changed files, commands, failures, and the exact next action in docs/PROGRESS.md. Resume the same session from that checkpoint. A session is a delivery milestone and can span several conversations.

2. Product objective and scope

JournalX helps one trader prepare a daily plan, document 4H → 1H → 15M → 5M → 1M analysis, record executions honestly, evaluate process discipline, and review performance over time.

Success means the trader can create today's journal, prepare scenarios, record a planned or already-executed trade, attach chart evidence, close the trade, review the day, and see accurate account-specific statistics without manually calculating P/L or R.

Explicit constraints

One owner. No registration, organizations, workspaces, tenant IDs, memberships, billing, invitations, or role hierarchy.

NestJS backend; PostgreSQL and Drizzle ORM; TypeScript throughout.

React + Vite frontend using Mantine Core and a consistent light theme. NestJS is the application server, not the browser UI framework.

Multiple personal trading accounts are supported: evaluation, sim-funded, live, paper, replay. These are trading accounts, not application users or tenants.

Manual entry and screenshot evidence in v1. No broker connection, order execution, live charts, automatic news feed, AI trade signals, or automatic market-structure detection.

The app records strategy observations. It does not establish that an observed sweep, FVG, or market model is objectively correct or profitable.

USD instruments/accounts only in v1. Do not silently aggregate other currencies.

Provide CSV export and a documented database-plus-attachments backup/restore procedure. CSV import, automated replay, copy trading, prop-firm payout engines, mobile apps, notifications, and AI coaching are deferred.

Access decision

Default to a local personal application with services bound to loopback and no login screen. Never expose an unauthenticated journal publicly. For a remote installation, document deployment behind a private network or an authenticated reverse proxy covering both UI and API. Remote access configuration is optional deployment work, not a registration feature. Do not add an auth product in these four sessions.

3. SRS: functional requirements

ID

Requirement

Acceptance evidence

FR-01

Create one journal for each personal calendar date

Repeated/concurrent creation resolves to one journal

FR-02

Store preparation, economic events, analysis, scenarios, and screenshots

Save/reload restores every supported field

FR-03

Support multiple trading windows within one day

London and NY windows coexist under one journal

FR-04

Create/version a strategy and its checklist/risk settings

Historical trade rules remain unchanged after editing strategy

FR-05

Plan, validate, open, close, cancel, and review a trade

State rules tested through API

FR-06

Record historical trades even when strategy rules failed

Honest recording requires acknowledgment, never invents compliance

FR-07

Calculate position risk, gross/net P/L, planned RR, and realized R

Deterministic unit fixtures match exact expected values

FR-08

Track mental state, violations, lessons, and daily process score

Good losses and bad wins can be filtered

FR-09

Show daily, account, setup, quarter, and date-range analytics

API metrics reconcile against known fixtures

FR-10

Store before/entry/after and timeframe chart evidence

Upload, view, removal, and backup preservation verified

FR-11

Search/filter journals and trades; export filtered results

Export contains the same records as filtered UI

FR-12

Separate paper/replay performance from live/funded performance

Default dashboard requires one account or explicit selection

FR-13

Resume partial work without losing data

Draft states, save status, and concurrency conflicts handled

FR-14

Complete and reopen a daily review

Reopening requires a reason and invalidates old review completion

4. Daily workflow and content model

4.1 One day, several windows

A daily journal is unique by journal_date, interpreted in the owner's configured journal timezone, initially Asia/Kathmandu. Account selection does not create another journal for the same date. Trades belong to the journal corresponding to their entry instant in that timezone. An overnight trade stays attached to its entry journal when it closes the next day. Closed-trade metrics use that journal date by default; show this attribution in analytics.

The journal can contain London, NY AM, NY PM, or custom windows. Each window stores a timezone and resolved start/end timestamps. Quarter boundaries are configurable annotations associated with a window; never assume one universal Quarterly Theory schedule. Display America/New_York and Asia/Kathmandu conversions using IANA timezone data, including daylight-saving changes. Do not use fixed EST offsets year-round.

4.2 Preparation

Fields: sleep quality, focus, stress (0–10), emotional state, preparation notes, maximum trades, optional daily loss budget, consecutive-loss limit, readiness checklist. Readiness items cover accepting no-trade days, avoiding financial urgency, respecting stops, avoiding revenge trading, and following the plan.

Daily settings snapshot the applicable defaults on creation. The daily cap is per account per journal date; display the selected account's status. Values not supplied by the user, such as maximum trades and daily loss limit, remain unset rather than invented.

Economic events are entered manually: title, occurrence instant, impact, relevance notes, restriction start/end. A separate checked-at timestamp records that the owner reviewed their external calendar/account rules. The application cannot independently verify current firm restrictions.

4.3 Top-down analysis

Store one analysis record per journal, optional trading window, and timeframe; use a uniqueness implementation that handles nullable window IDs correctly.

Timeframe

Structured fields

4H

Structure, dealing-range high/low, derived midpoint, reference price and timestamp, premium/discount/equilibrium, supply/demand zones, liquidity objective, invalidation, narrative

1H

Structure, conditional bias, protected high/low, external buy/sell liquidity, FVG/zone notes, optional VAH/VAL/POC, bias invalidation

15M

Up to two preferred long zones and two short zones, no-trade ranges, confluences, intended reaction

5M

Trade-specific sweep level/time, reclaim close/time, displacement observation, protected swing, MSS close/time, FVG bounds

1M

Trade-specific first retracement time, rejection/internal MSS observation, proposed entry and invalidation

4H–15M form journal preparation; 5M/1M confirmation belongs to each trade to avoid overwriting evidence between trades. Journal analysis can evolve, but copy the relevant pre-entry context into the trade's immutable execution snapshot when opened. Corrections require a reason and audit entry.

Scenarios: preferred short, alternative long, and no-trade, with trigger zone, sweep level, structure-break condition, FVG/entry condition, structural stop condition, target, invalidation, and narrative. Historical example prices from the conversation must not become seed data or live defaults.

Quarter observations: Q1–Q4, observed range, true-open reference, behavior, optional AMD/XAMD/unknown classification, and notes. These are observations rather than automated entry signals.

4.4 End-of-day review

Review fields: what the market did; what went well; repeated mistake; difficult market condition; what to repeat; one correction for tomorrow; strategy-versus-P/L reflection; final lesson.

Process checklist: analysis before execution, predefined location, liquidity event, displacement/MSS, retracement entry, correct size, respected stop, respected trade limit, no revenge trading, honest completed journal.

Compute process score 0–10 from answered boolean items. Unanswered means incomplete, not false. For no-trade days, allow justified not-applicable execution items and calculate round(10 × passed/applicable), exposing the denominator. No-trade days can receive an A grade.

Default daily grade: A for score 9–10 without serious violations; B for 7–8 without risk violations; C otherwise; D if revenge trading, oversizing, stop widening, or deliberately omitted execution is acknowledged. Store the rule version and show the reason. A manual grade override needs a reason and preserves the calculated grade.

Review completion requires all actual trades closed and reviewed, no remaining active plans, required reflection, and completed process assessment. Plans may be cancelled; overnight open positions keep the journal pending review. The UI explains the blocker.

5. Strategy and trade rules

5.1 Seed strategy

Name: MGC Top-Down Sweep Confirmation v1.

Sequence: 4H context → 1H conditional bias → 15M predefined location → 5M sweep/reclaim → 5M displacement and MSS close → FVG → first valid 1M retracement → structural invalidation and unobstructed target.

Defaults carried from the user's plan: maximum 5 contracts, maximum structural stop 5 points, minimum gross planned RR 2, consecutive-loss stop after 2. Optional 3-point minimum stop is disabled; a stop below 3 is not automatically invalid. $250 is a configurable risk cap, not a guarantee that five contracts fit after costs. Nominal account size, risk-percent basis, and actual risk budget must be separate fields. Do not infer prop-firm drawdown headroom from nominal account size.

Seed MGC instrument multiplier as a user-provided starting configuration: $10 per point per contract and 0.1 tick size; validate against official contract specifications when implementing and record source/check date. Contract limit is a personal rule here, not a statement about current firm policy. Record the actual traded expiry symbol separately from any continuous analysis symbol such as MGC1!.

5.2 Mandatory conditions versus score

A score never overrides a missing mandatory condition. Persist checklist answers as PASS, FAIL, UNANSWERED, or NOT_APPLICABLE with evidence/notes. Mandatory conditions cannot be NOT_APPLICABLE.

Seed ten one-point checklist items: higher-timeframe context; external target; predefined location; location compatible with context; approved timing; sweep/reclaim; displacement plus MSS; FVG; first valid retracement; structurally valid risk and unobstructed target. Each is mandatory for the seed strategy, so full eligibility requires 10/10. This deliberately resolves the earlier conflicting suggestion that 8/10 could override mandatory confirmations.

The engine returns ELIGIBLE, INCOMPLETE, or INELIGIBLE plus individual reasons. Additional risk guards check instrument/contract, positive size, tick alignment, direction of stop/target, contract cap, cost-inclusive risk cap if configured, stop limit, RR, session/news windows, max trades, and consecutive losses.

Timing and sequence are assessed from recorded evidence at the candidate entry instant, not server time. An after-the-fact entry must be marked retrospective. Break-and-retest and Judas swing can be classification tags; only the seeded sweep strategy is executable as a validated playbook in v1. A different checklist requires a separate published strategy version.

JournalX never prevents the user from recording an actual execution. A noncompliant actual trade is saved with warnings, failed conditions, violation acknowledgment, and reason. Planning eligibility and historical logging are separate operations. Do not fabricate missing checklist passes.

5.3 Trade lifecycle and corrections

PLANNED → OPEN → CLOSED. PLANNED → CANCELLED. A retrospective executed trade may be created atomically as OPEN or CLOSED with the same validation rules and explicit recording mode. Review completion is a separate reviewed_at flag on CLOSED trades.

v1 execution model: one entry fill and one final exit fill per trade, integer contracts, no scaling or partial exits. State this limitation in the trade form. Reject partial-close payloads; never average fills silently. Future fill-ledger support is out of scope.

Freeze actual entry, original structural stop, original target, quantity, instrument specification, strategy rules, context and checklist snapshot at OPEN. Subsequent stop/target adjustments are management events preserving the original values and recording old/new values, timestamp and reason. Stop widening creates a violation. Calculated original risk must not change when moving a stop.

Closed-trade correction is an explicit endpoint requiring expected version and reason; recalculate dependent metrics, record before/after values, and mark affected trade/day reviews incomplete. No ordinary delete of executed trades. Archive configuration records; cancel plans. Correct an accidentally duplicated actual record using a void action with reason and audit trail; voided records are excluded from analytics but visible in an audit filter.

6. Calculation contract

All monetary calculations run server-side using decimal arithmetic. API decimals are strings; never use JavaScript floating-point arithmetic as financial authority. PostgreSQL numeric columns store prices/money, not floats. Return unrounded intermediate ratios at sufficient precision; round money to two decimals using one documented rounding mode at the final calculation boundary.

Let q = contracts; m = point value per contract; e = actual entry; s = original stop; t = original target; x = actual exit; d = +1 long or -1 short.

stopPoints = abs(e − s)

initialRisk = stopPoints × q × m (gross price risk)

plannedReward = abs(t − e) × q × m, after direction validation

plannedRR = plannedReward / initialRisk

estimatedAllInRisk = initialRisk + estimatedRoundTripFees + configuredSlippageAllowance

grossPnL = d × (x − e) × q × m

netPnL = grossPnL − actualTotalFees

grossR = grossPnL / initialRisk

netR = netPnL / initialRisk; this is the default displayed R

Fees are total round-trip costs for the trade, not per-contract unless the input explicitly says so. Fee estimates may be derived from per-contract settings but are snapshotted.

Slippage is already reflected in actual fills. Never subtract estimated slippage again from realized P/L.

Realized outcome uses rounded netPnL: positive WIN, negative LOSS, zero BREAKEVEN. An exit at entry with fees is a net loss.

A plan preview uses planned entry. Opening recomputes eligibility and risk using actual entry and preserves both values. An actual fill exceeding risk limits is recorded with a warning.

If actualTotalFees is unknown, CLOSED is permitted but netPnL/netR/outcome remain provisional/null. Gross metrics can display. Final review requires confirmed fees, including explicit zero. Net analytics include only fee-confirmed closed trades and show omitted count.

Zero/negative initial risk is invalid; zero denominator ratios return null rather than Infinity.

Analytics definitions

Default filter: selected account, selected date range, nonvoided CLOSED trades with confirmed fees. Replay/paper is never blended by default. Net expectancy is mean netR. Win rate = wins / all included closed trades, including breakeven trades in the denominator. Profit factor = total positive netPnL / absolute total negative netPnL; no losses returns null with 'No losses', not a fabricated number. Mean winner/loss, total fees, cumulative net P/L, sum netR, violations, and compliance percentage must display sample count.

Trade P/L curve starts at zero; realized drawdown is peak cumulative net P/L minus subsequent cumulative net P/L, ordered by close timestamp and UUID tie-break. Label it 'realized trade drawdown', never broker trailing drawdown or mark-to-market equity. Daily totals use entry-journal date; the curve uses close order. Explain both conventions in tooltips.

Two consecutive losses: same account and entry-journal date, ordered by close instant; a win or net breakeven resets the count. Unknown-fee closed trades make this check indeterminate and prevent an eligible plan until resolved. Maximum trades counts OPEN and CLOSED actual trades, excluding cancelled/voided/planned records. Daily realized-loss guard uses confirmed net P/L; optionally include aggregate initial risk of open trades when checking a configured budget, clearly labeled as a conservative estimate.

Optional MAE/MFE: manually entered observed adverse/favorable point excursion, nonnegative; null if unknown. Compute dollar amounts from q/m and label manually observed. Do not infer excursions from entry/exit alone.

Required deterministic fixtures

Fixture

Expected

Long 5 contracts, entry 4435, stop 4430, target/exit 4445, m=10, fees=12.50

Risk 250; gross +500; net +487.50; grossR 2; netR 1.95

Short 5 contracts, entry 4454, stop 4458, target/exit 4446, fees=12.50

Risk 200; gross +400; net +387.50; netR 1.9375

Long first fixture exits at 4430, fees=12.50

Gross −250; net −262.50; netR −1.05

Entry equals exit, fees=12.50

Gross 0; net −12.50; LOSS

Price risk 250, estimated costs 12.50, all-in cap 250

INELIGIBLE at 5 contracts; suggested size may be 4

All-in position size below one contract

Suggest zero and explain no valid size

7. Architecture and repository

Use a pnpm workspace modular monolith: one Nest application, one React application, one PostgreSQL database, a persistent local attachment directory. No Redis, queues, microservices, event bus, CQRS, or unnecessary abstraction framework.

Path

Responsibility

apps/api/src/modules/{settings,accounts,instruments,strategies,journals,trades,attachments,analytics,exports}

Nest domain modules with controllers, DTOs, services, repositories

apps/api/src/common

Validation, errors, request IDs, concurrency, logging

apps/api/test

API integration tests against real PostgreSQL

apps/web/src/app

Providers, router, light theme, app shell

apps/web/src/features/{dashboard,journals,trades,playbook,analytics,settings}

Feature pages/components/hooks

apps/web/src/components

Reused presentational UI only

apps/web/src/lib

API transport, query keys, date/decimal presentation

packages/db/src/schema

Drizzle tables, enums, constraints, relations

packages/db/migrations

Generated and reviewed SQL migrations

packages/db/src/seeds

Minimal configuration seeds and separate test/demo fixtures

packages/domain/src

Pure decimal calculations and rule evaluation without framework dependencies

packages/api-client

Generated OpenAPI types and typed request client

packages/config

Shared TS/lint configuration

tests/e2e

Playwright full-stack browser tests

infra

Compose, container files, reverse-proxy example

scripts

Development, backup, restore, migration verification

docs

SRS, decisions, progress, contracts, runbooks, session handoffs

.claude/skills

Project-specific Claude skills

Frontend must never import database tables or credentials. API owns validation, persistence, scores and metrics. Pure shared calculations may power previews but API responses remain authoritative. Nest DTOs/OpenAPI define the external contract; generated client types are not replaced with handwritten duplicate DTOs.

Select compatible stable dependencies at Session 1, verify their official documentation, pin versions and commit lockfile. Keep all Mantine packages on the same compatible release. Do not upgrade unrelated dependencies between sessions.

8. Database specification

Use UUID primary keys; created_at/updated_at as timestamptz; mutable aggregates have integer version for optimistic concurrency. Decimal prices numeric(18,6), money numeric(18,2), ratios numeric(18,8); quantities integer. Use date for journal_date. No user_id or tenant_id columns.

Table

Principal columns and relationships

app_settings

Singleton checked key; journal_timezone, display_timezone, currency USD, default_account_id, preferences

trading_accounts

name, type, currency, nominal_size, risk_basis_amount, status, notes, risk defaults

instruments

symbol unique, display_name, tick_size, point_value, currency, verified_source, verified_at, archived_at

strategies

name, description, current_published_version_id, archived_at

strategy_versions

strategy_id, version_number unique per strategy, status DRAFT/PUBLISHED, typed rules_json, checklist_json, narrative, published_at

daily_journals

journal_date unique, timezone_snapshot, status DRAFT/ACTIVE/REVIEWED, mental fields, readiness_json, process_json, reflection_json, grade data, reviewed_at

journal_account_limits

journal_id + account_id unique, risk/trade/consecutive-loss limits snapshot

journal_windows

journal_id, label, timezone, starts_at, ends_at, quarter_config_json

economic_events

journal_id, title, occurs_at, impact, restriction_start/end, notes

timeframe_analyses

journal_id, nullable window_id, timeframe, typed data_json, narrative

market_zones

analysis_id, kind, lower_price, upper_price, confluence_json, notes

journal_scenarios

journal_id, optional window_id, kind SHORT/LONG/NO_TRADE, typed conditions_json, narrative

quarter_observations

window_id, quarter unique per window, starts_at, ends_at, high/low, model, notes

trades

journal_id, account_id, instrument_id, strategy_version_id, optional window_id/scenario_id, state, recording_mode, direction, actual_contract_symbol, planned_entry, actual_entry, original_stop/target, quantity, exit, entry_at/exit_at, actual_fees, fees_confirmed, snapshot_json, review_json, reviewed_at, voided_at/reason

trade_checklist_answers

trade_id + item_key unique, answer, evidence_note, observed_at; immutable once opened except audited correction

trade_management_events

trade_id, kind, observed_at, old/new value, reason

trade_violations

trade_id, code, severity, source MANUAL/RULE_ENGINE, note; stable deduplication key

attachments

storage_key unique, original_name, mime_type, bytes, checksum, journal_id nullable, trade_id nullable, stage, timeframe, caption, status

audit_events

entity_type/id, action, reason, before/after JSON, request_id, occurred_at

idempotency_requests

operation, key, request_hash, result_resource_id, result_status; unique operation/key

Typed JSON is reserved for evolving form sections, rule snapshots and reviews. Validate its versioned shape at the API boundary. Core filter dimensions, prices, ownership and relationships stay relational. Financial aggregates should be derived initially rather than duplicated across tables.

Database constraints: positive quantities/tick/point value; nonnegative fees; ratings 0–10; zone lower ≤ upper; range high > low; time end > start; trade exit ≥ entry; exactly one attachment owner; valid CLOSED execution fields; nullable fee totals until confirmed. Enforce stop/target direction when execution fields are complete. Validate same-journal links to windows/scenarios using composite foreign keys where practical and service checks otherwise. Restrict deletion of referenced accounts, instruments and published strategy versions. Published rule versions are immutable. Add indexes for journal date, account/state/entry_at, trade journal_id, exit_at, setup/strategy, attachment owner, audit entity, and event restriction windows.

Create migrations from Drizzle schema, inspect SQL, apply to a fresh development PostgreSQL, and verify rerunning makes no changes. Do not use schema push as the final migration workflow. Never reset an existing database without explicit authorization. Use forward corrective migrations after applied migrations; do not rewrite applied history.

9. API contract

Base /api/v1. DTO validation rejects unexpected fields. Decimal input/output strings, ISO timestamps with offsets, date-only strings for journal dates. Lists return {items, page, pageSize, total}; enforce max pageSize 100. Errors return {code, message, fieldErrors?, details?, requestId}. Use 400 validation, 404 missing, 409 state/version/idempotency conflict, 413 upload limit, 415 unsupported media. Mutations include expectedVersion; atomic database comparison increments version.

Group

Required operations

Health

GET /health/live and /health/ready (DB readiness)

Settings

GET/PATCH /settings

Accounts/instruments

List/create/update/archive; no deleting referenced entities

Strategies

CRUD draft; create version; publish; retrieve immutable versions

Journals

POST /journals idempotent by date; GET list/detail; PATCH sections; POST //activate, /complete-review, /reopen

Journal children

CRUD windows, events, analyses, zones, scenarios, quarter observations under journal paths

Trade plans

POST /trades; PATCH / for plans; POST //evaluate and //cancel

Actual executions

POST //open; POST /trades/record-execution; POST //close

Trade history

POST //management-events, /review, /correct, /void; GET list/detail

Evidence

POST attachment upload; GET metadata/content; DELETE attachment with history-preserving policy

Analytics

GET /analytics/summary, /daily, /equity, /breakdowns, /discipline

Export

GET /exports/trades.csv and /exports/journals.csv with shared filters

Use Idempotency-Key on actual execution/open/close/create mutations; same key/body returns the original resource, different body returns 409. Claim the key and mutate in the same transaction. Close/correction and their audit writes are atomic. Evaluate and open run the same rule engine; open recomputes using current records in a transaction. Serialize account/day checks with a database lock on journal_account_limits to avoid simultaneous app entries bypassing limits. Actual recordings are still accepted with recorded violations.

Document every route with real examples, enums, nullability, errors and lifecycle semantics. Generate OpenAPI JSON and the frontend client at the Session 2 gate.

10. Frontend specification: light theme

Navigation

Dashboard, Daily Journal, Trade Log, Analytics, Playbook, Settings. A primary 'Open today' action opens or creates the unique current journal. Trade record actions always retain selected journal/account context.

Visual direction

Use Mantine AppShell, white panels over a very light gray canvas, indigo primary actions, restrained borders and shadows, readable dark text, consistent 8px spacing rhythm, modest rounded corners. Force light mode. Use green/red only for financial outcome with signs and labels; use separate neutral/amber indicators for process quality. Good loss and bad win must remain distinguishable from P/L color.

Use Mantine Core, hooks, form, dates, notifications and dropzone where needed; Mantine Charts with its compatible peer dependencies for simple analytics. Use TanStack Query for server state, React Router for navigation, and generated API types. Use Mantine form validation for quick feedback; server validation remains authoritative. Prefer plain textareas for narrative in v1 instead of a rich-text framework.

Screens and components

Screen

Required behavior

Dashboard

Selected account/date range, today readiness, pending reviews, trade count, net P/L/netR, process score, validation progress toward configurable goal (default 100 reviewed trades), quick actions

Journal calendar/list

Today/this week/needs review/grade filters, no-trade days visible, date navigation

Journal workspace

Header and save status; sections Preparation, Calendar, 4H, 1H, 15M, Scenarios, Windows, Trades, Review; completion markers without blocking draft saves

Trade plan/detail

Context and confirmation, risk preview, eligibility reasons, evidence, execution, management, review; prominent planned versus actual distinction

Trade log

Date/account/setup/session/quarter/outcome/violation/review filters, pagination, columns, CSV export

Analytics

Net cumulative P/L, daily results, expectancy by setup, session/quarter breakdown, stop-distance buckets, violation categories, process trends; sample counts and null-safe empty states

Playbook

Strategy narrative, mandatory checklist, risk defaults, version history, publish workflow; edited draft never mutates historical trades

Settings

Accounts, instruments, timezone/display choices, default preferences, backup instructions

Trade quick entry uses progressive sections rather than one giant modal. Side-by-side chart and fields on desktop; stacked fields on mobile. At 375px width, navigation becomes a drawer and tables scroll or use compact cards. Currency inputs display units; timestamps display timezone. Keyboard navigation, visible focus, labels, error descriptions and chart summaries required.

Autosave applies to journal draft sections after a short debounce; saves are serialized per aggregate, cancel obsolete queued payloads, and use returned versions. Show Saving/Saved/Error and retry. Never autosave lifecycle actions, actual executions, or closed-trade corrections. On conflict, preserve unsaved text and show reload/compare guidance; do not silently overwrite. Warn on navigation with unsaved content. Do not persist screenshots or private narratives to browser localStorage by default.

11. Uploads, reliability and operational requirements

Allow PNG, JPEG, WebP chart images only, maximum 10 MiB each. Verify file signatures and decode validity; never trust MIME or extension alone. Reject SVG/HTML.

Generate server storage keys, prevent path traversal, and serve only through the controlled content route with correct headers. Original names are display metadata.

Files live in a persistent configured volume outside the source tree. Upload temporary bytes, create metadata, atomically finalize file; clean up failures and reconcile orphaned temporary files. Document recovery after interruption.

DB transactions cannot atomically cover filesystem operations; explicitly implement cleanup/compensation and test failures.

Structured logs include request ID, route, status, latency and safe error codes, not entire journal bodies or secrets.

Load validated environment settings, keep secrets out of frontend bundles and source control, configure explicit development CORS origins and same-origin proxy for packaged use.

Index-backed pagination and bounded analytics queries; no N+1 screenshot fetches. Establish measured baseline with at least 5,000 synthetic trades. Target common list/summary requests under 500ms on documented local hardware; report measurements rather than guarantee hardware-independent latency.

Backup includes PostgreSQL dump plus attachment directory and a manifest. Document restore to a separate empty database/volume and verify one restored journal/trade/image. CSV is portable reporting, not a complete backup.

CSV export escapes cells and neutralizes spreadsheet formula prefixes in user text. Export is generated server-side with the same filter implementation used by list endpoints.

12. Session 1 — Folder structure, project skills, schema and migration

Goal: a reproducible repository and complete validated data foundation. No feature UI and no claim that backend functionality is complete.

Task

Work

Done when

S1-01

Inspect repo; record scope and dependency versions

docs/DECISIONS.md records architecture/defaults without inventing user requirements

S1-02

Create pnpm workspace, TS/lint/format config, env examples, gitignore

Install, lint and typecheck scripts run

S1-03

Create CLAUDE.md and project skills

Skills contain concrete rules, references and verification commands

S1-04

Scaffold Nest bootstrap and React/Mantine bootstrap only

API liveness and light-theme shell start

S1-05

Compose local PostgreSQL and named persistent volumes

DB becomes healthy; ports bind locally

S1-06

Implement all tables, constraints, relations and indexes from section 8

Schema compiles and mapping is documented

S1-07

Generate/review/apply SQL migration

Fresh database migrated; rerun is a no-op; actual result recorded

S1-08

Add idempotent minimal seeds

Settings, MGC, strategy exist; sample trading account is clearly labeled demo or omitted

S1-09

Add independent test fixtures and migration checks

No fake trades appear in normal personal database

S1-10

Write schema, command and handoff docs

Session 2 can start without rereading chat history

Required project skills under .claude/skills/<name>/SKILL.md:

journalx-domain: lifecycle, money/R definitions, hard gates, honest logging, historical snapshots.

journalx-database: Drizzle schema, transactions, migrations, constraints and fixture discipline.

journalx-backend: Nest module patterns, DTO/OpenAPI contract, concurrency, errors and tests.

journalx-frontend: Mantine light theme, forms, query state, save/conflict behavior, accessibility.

journalx-verification: required test matrix, evidence, handoffs and no false completion claims.

Keep skill instructions concise and reference docs rather than copying this entire SRS five times. Use the installed Claude skill conventions; document how each is loaded. Commit project skills with the repository when git is configured; do not overwrite unrelated global skills.

Gate: database up; all schema/migration checks pass; repeat seed safe; no credentials committed; apps bootstrap; docs/session-1-handoff.md records applied migration names and environment requirements. If database access is unavailable, mark migration execution BLOCKED and provide the exact command; do not mark this session complete.

13. Session 2 — Backend and test cases

Goal: fully implemented API and domain behavior, usable through OpenAPI and tests before frontend work.

Task

Work

Done when

S2-01

Verify S1 gate and load domain/backend/database skills

Existing baseline runs

S2-02

Implement decimal calculations and rule engine

Required arithmetic and hard-gate unit fixtures pass

S2-03

Add global DTO validation, errors, request IDs, env checks

Consistent validation/error contract verified

S2-04

Implement settings, accounts, instruments, strategy versioning

Archive/publish/snapshot behavior tested

S2-05

Implement journal and child resources

Date uniqueness, full section save/reload and cross-journal checks pass

S2-06

Implement trades and lifecycle

Plan/open/close/record/correct/void and management events work

S2-07

Add rule evaluation, daily limits, transaction locks and idempotency

Concurrent/repeated requests cannot silently duplicate execution

S2-08

Implement file storage and evidence routes

Invalid uploads and interrupted writes handled

S2-09

Implement trade and daily reviews

Incomplete/unknown-fee/open-position blockers work

S2-10

Implement analytics and exports

Values reconcile against SQL-backed fixtures

S2-11

Generate OpenAPI and typed client; document examples

Client generation succeeds without manual type patches

S2-12

Run unit and PostgreSQL integration tests

Evidence captured in Session 2 handoff

Required test matrix: long/short P/L, estimated versus actual costs, zero risk, off-tick input, wrong-side stop/target, cap exceeded, score cannot bypass a gate, retrospective noncompliant record, first-retracement evidence, preserved risk after stop move, fee-provisional handling, duplicate journal creation, idempotent replay/body mismatch, concurrent version conflict, duplicate close, rollback on audit failure, invalid state changes, rule-version immutability, same-journal foreign links, overnight attribution, Nepal date boundary, New York DST transition, two-loss reset and indeterminate fee state, no-trade review, correction invalidates review, excluded void records, dashboard/filter/export agreement, upload path/signature/size failures, and failed file-write compensation.

Use a real isolated PostgreSQL for integration tests; do not replace repository integration with mocked database calls. Mock only external boundaries and filesystem failure scenarios where appropriate. A broker platform result is not needed for these deterministic calculations.

Gate: all endpoints implemented; tests pass; OpenAPI and client committed/generated; no TODO business logic; docs/session-2-handoff.md lists commands, passed/failed counts and any genuine limitations.

14. Session 3 — Frontend implementation

Goal: complete UI workflows against the frozen API contract using deterministic development fixtures. Live end-to-end acceptance belongs to Session 4.

Task

Work

Done when

S3-01

Verify S2 API/client artifacts

No hand-authored substitute API shapes

S3-02

Build light Mantine shell and navigation

Desktop/mobile routes usable

S3-03

Add generated client adapter, Query provider and query keys

One consistent data-access path

S3-04

Implement dashboard and journal list/calendar

Filters/empty/loading/error states exist

S3-05

Implement all journal sections and autosave

No fields from section 4 omitted

S3-06

Implement trade plan, recording, management and review

Mandatory reasons and decimal/cost labels clear

S3-07

Implement trade log filters and evidence gallery

Keyboard/form/upload states covered

S3-08

Implement playbook/versioning and settings

Editing defaults does not imply historical changes

S3-09

Implement analytics charts/tables/export action

Null, provisional and small-sample states readable

S3-10

Test critical UI behavior and responsive layout

Relevant component tests and screenshots recorded

Use Mock Service Worker only in explicit development/test mode, with fixtures matching the generated API schema. Never activate mocks in a production build. The same client must operate with real transport; Session 4 changes runtime configuration and fixes contract defects, not rewrites the UI. Label any fixture preview clearly.

Test especially: required hard gate failed, historical trade acknowledgment, fee uncertainty, no-trade completion, autosave errors/conflicts, disabled double-submit, decimal input, attachment errors, and accessible navigation at 375/768/1440px. Do not mirror every Mantine component in tests.

Gate: all routes and fields implemented; no dead buttons; component tests/typecheck/build pass; fixture mode explicit; docs/session-3-handoff.md records live integration still pending and includes visual evidence paths.

15. Session 4 — Integration and final verification

Goal: run the actual web app, API, PostgreSQL and filesystem together; close all contract gaps and prove the journal works.

Task

Work

Done when

S4-01

Start real stack and disable fixture transport

Every production UI query hits Nest

S4-02

Validate CORS/proxy/env and generated client

All screens load real responses

S4-03

Connect autosave, mutations, invalidation and errors

No stale totals or silently lost edits

S4-04

Verify actual image upload/content/removal

Evidence survives reload and restart

S4-05

Run full user journeys in Playwright

Browser tests exercise real DB/API

S4-06

Reconcile dashboard/trade/day/export totals

Known fixture totals agree exactly

S4-07

Verify production builds and persistent volumes

Clean-start instructions work

S4-08

Run bounded performance check and fix measured bottlenecks

Baseline and fixture size documented

S4-09

Exercise backup and restore into isolated resources

Restored record and image confirmed

S4-10

Complete runbooks and final acceptance report

No outstanding critical workflow defects

Required full-stack journeys:

Fresh configuration → create today → readiness/news → 4H/1H/15M → scenarios → eligible plan → open → attach entry evidence → close with fees → review trade/day → verify netR and dashboard.

Mandatory sweep missing → cannot mark eligible → record actual execution honestly → violation saved → bad-win/good-loss filters reflect process and outcome independently.

Zero trades → cancel unused plans → complete no-trade day → calendar and discipline analytics include it; win-rate denominator does not.

Repeated submit and stale tab → one execution; 409 conflict preserves unsaved form data.

Change strategy/instrument defaults → old trade monetary/rule snapshots unchanged; new plan uses new defaults.

Overnight entry and New York daylight-saving windows → correct journal association and displayed times.

Closed trade correction → audited financial changes → review invalidation → every aggregate/export updates.

Unknown fees → provisional net stats → confirm fees → metrics and review become available.

Restart services → all journals and chart evidence remain; restore backup to isolated instance and view them.

Gate: unit/integration/browser tests pass against real services; production build has no mock transport; no registration/tenant features; all FR IDs mapped to evidence; README includes installation, migration, dev/start/build/test commands and backup instructions. Hosting is optional and not required for acceptance.

16. Session handoff and progress format

Every session writes docs/session-N-handoff.md with:

Requested milestone and status COMPLETE/PARTIAL/BLOCKED.

Task IDs completed, deferred or blocked with reasons.

Concrete behavior implemented and important files.

Schema migrations and whether they were actually applied.

Commands run and their exit/results; never just 'tested'.

API contract changes and regenerated artifacts.

Decisions made and why; risks or limitations.

Exact start command and next action for the following session.

Maintain docs/PROGRESS.md as a checkbox backlog keyed to S1–S4 task IDs. Keep docs/DECISIONS.md for accepted deviations. A downstream session may make a narrowly necessary corrective migration or earlier-layer bug fix, but must document it and rerun the affected tests. Do not treat a session boundary as a reason to retain a known defect.

17. Copy-and-paste Claude prompts

Session 1

Read JournalX_Master_Implementation_Plan.md as the authoritative SRS. Implement Session 1 only: project skills, workspace/folder structure, application bootstraps, full Drizzle schema, PostgreSQL configuration, reviewed SQL migrations, minimal idempotent seeds, and foundation checks. Inspect existing work first. Apply migrations to the configured development database and verify them; if access is blocked, say so explicitly. Do not implement feature backend endpoints or frontend screens yet. Update PROGRESS, DECISIONS, and session-1-handoff with real command evidence.

Session 2

Read the JournalX master plan, CLAUDE.md, relevant project skills, PROGRESS, DECISIONS and session-1-handoff. Verify Session 1 prerequisites, then implement Session 2 fully: calculation/rule engine, all backend modules, lifecycle and reviews, uploads, analytics, exports, concurrency/idempotency, OpenAPI/client generation, and unit plus real PostgreSQL integration tests. Preserve the personal single-owner scope and financial definitions. Do not implement the frontend milestone. Finish with session-2-handoff and exact test results.

Session 3

Read the JournalX master plan, project instructions/skills, progress/decisions and session-2-handoff. Implement Session 3: complete responsive React/Vite frontend with Mantine Core in forced light theme, all journal/trade/review/analytics/playbook/settings workflows, generated API client, server-state management, autosave/conflict handling, evidence UI and required UI tests. Use schema-matching fixtures only in explicit development/test mode. Do not claim real integration is complete. Finish with build/test results, visual evidence and session-3-handoff.

Session 4

Read the JournalX master plan, project instructions/skills, progress/decisions and prior handoffs. Implement Session 4: connect the completed UI to the actual Nest API, PostgreSQL and persistent attachment storage; disable mocks; fix contract/state issues; run all specified full-stack journeys, financial reconciliation, persistence and isolated backup/restore checks. Add narrowly necessary fixes across layers with tests. Finish with a complete acceptance report mapping every FR requirement to evidence and clear commands to run JournalX. Do not publish publicly or add registration/multi-tenancy.

Resume an unfinished session

Continue Session [N] of JournalX. Read the master plan, PROGRESS, DECISIONS and latest handoff/checkpoint. Verify completed work rather than rebuilding it. Resume at the recorded next incomplete task and complete the session's acceptance gate. Report blockers honestly and preserve unrelated changes.

18. Official implementation references

Verify compatibility when installing; these references support the implementation approach rather than freezing future package versions.

NestJS OpenAPI: https://docs.nestjs.com/openapi/introduction

Drizzle SQL migrations: https://orm.drizzle.team/docs/migrations

Drizzle migration runner: https://orm.drizzle.team/docs/drizzle-kit-migrate

Mantine + Vite: https://mantine.dev/guides/vite/

The architecture is deliberately a manageable personal application. Completion is measured by persistent, accurate daily journaling and honest trade review, not the number of modules or generated files.