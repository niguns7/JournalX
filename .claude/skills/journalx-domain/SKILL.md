---
name: journalx-domain
description: Domain rules, calculations, trade lifecycle, hard gates, and honest logging for JournalX.
---

# JournalX Domain Rules & Standards

## 1. Trade Lifecycle & State Machine
- **States**: `PLANNED` -> `OPEN` -> `CLOSED`. `PLANNED` -> `CANCELLED`.
- **Retrospective Trade**: Created directly as `OPEN` or `CLOSED` with `recording_mode = 'RETROSPECTIVE'`.
- **Review**: Reviewing a trade is tracked via `reviewed_at` timestamp on `CLOSED` trades.

## 2. Calculation Contract & Financial Precision
- **Decimal arithmetic**: All financial calculations MUST run with decimal arithmetic strings. Never use JS floating-point arithmetic for financial authority.
- **Formulas**:
  - `stopPoints = abs(entry - stop)`
  - `initialRisk = stopPoints * contracts * pointValue` (gross price risk)
  - `plannedReward = abs(target - entry) * contracts * pointValue`
  - `plannedRR = plannedReward / initialRisk`
  - `grossPnL = direction * (exit - entry) * contracts * pointValue` (`+1` for Long, `-1` for Short)
  - `netPnL = grossPnL - actualTotalFees`
  - `grossR = grossPnL / initialRisk`
  - `netR = netPnL / initialRisk` (default displayed R)
- **Fee Handling**:
  - If `actualTotalFees` is unknown/provisional, trade can be `CLOSED` but `netPnL`/`netR`/`outcome` remain provisional/null.
  - Final review requires confirmed fees (including explicit 0.00).

## 3. Hard Gates vs Score
- A score never overrides a missing mandatory condition.
- Checklist answers are `PASS`, `FAIL`, `UNANSWERED`, or `NOT_APPLICABLE`.
- Mandatory checklist items CANNOT be `NOT_APPLICABLE`.
- Seed Strategy (`MGC Top-Down Sweep Confirmation v1`) has 10 mandatory conditions requiring 10/10 `PASS` for `ELIGIBLE`.

## 4. Honest Recording Principle
- The system NEVER prevents recording an actual execution, even if noncompliant.
- Noncompliant trades are saved with warnings, failed condition reasons, and violation acknowledgments.
- Missing checklist passes are never fabricated.

## 5. Immutability & Management Events
- Original execution fields (`actual_entry`, `original_stop`, `original_target`, `quantity`, context snapshots) are frozen at `OPEN`.
- Stop or target modifications are recorded as `trade_management_events` (`kind = 'STOP_LOSS_UPDATE' | 'TAKE_PROFIT_UPDATE'`).
- Moving stop wider than original creates a `trade_violation`.
- Calculated initial risk never changes upon stop modification.
