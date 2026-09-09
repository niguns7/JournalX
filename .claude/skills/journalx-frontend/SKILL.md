---
name: journalx-frontend
description: Mantine Core light theme UI, form workflows, TanStack Query, and autosave state management for JournalX.
---

# JournalX Frontend Standards

## 1. Visual Direction & Design System
- **Theme**: Strictly forced light theme.
- **Palette**: White panels over light gray canvas (`#f8f9fa`), indigo primary accent (`#4f46e5` / Mantine indigo), subtle borders (`#e9ecef`), readable dark charcoal text (`#1e293b`).
- **P/L & Performance Colors**:
  - Green / Red ONLY for financial outcomes (with explicit `+` / `-` sign indicators).
  - Amber / Neutral for process discipline grades and checklist evaluations.
  - Good loss and bad win must remain visually distinguishable from raw P/L colors.

## 2. Framework & Navigation
- React + Vite + TypeScript.
- Mantine Core v7 (`@mantine/core`, `@mantine/hooks`, `@mantine/dates`, `@mantine/notifications`).
- Mantine AppShell navigation:
  - Dashboard
  - Daily Journal
  - Trade Log
  - Analytics
  - Playbook
  - Settings
- Primary action: "Open Today" button to quickly navigate or create today's journal in the user's configured timezone.

## 3. Form & State Management
- TanStack Query v5 for server state.
- Debounced autosave for journal sections with visual status indicators: `Saving...`, `Saved`, `Error`.
- Concurrency conflict handling: Warn and preserve unsaved form text on `409 Conflict`.
