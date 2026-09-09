---
name: journalx-backend
description: NestJS architecture, DTO validation, error envelopes, and API patterns for JournalX.
---

# JournalX Backend Standards

## 1. Modular Monolith Architecture
- Located in `apps/api/src/modules/`:
  - `health` (Liveness & readiness health checks)
  - `settings`
  - `accounts`
  - `instruments`
  - `strategies`
  - `journals`
  - `trades`
  - `attachments`
  - `analytics`
  - `exports`
- Shared utilities in `apps/api/src/common/`:
  - `filters` (HttpExceptionFilter with standard error response envelope)
  - `interceptors` (Logging, Request ID injection)
  - `pipes` (Strict ValidationPipe with `whitelist: true, forbidNonWhitelisted: true`)

## 2. API Contract & Formats
- Base route: `/api/v1`
- Standard Error Envelope:
  ```json
  {
    "code": "BAD_REQUEST",
    "message": "Human readable error description",
    "fieldErrors": { "field": ["error message"] },
    "details": {},
    "requestId": "uuid"
  }
  ```
- Pagination Contract:
  ```json
  {
    "items": [],
    "page": 1,
    "pageSize": 25,
    "total": 100
  }
  ```
- Optimistic Concurrency: Mutations submit `expectedVersion`; compare and increment atomically. Conflict yields `409 Conflict`.
- Idempotency: `Idempotency-Key` header on actual execution / open / close mutations.
