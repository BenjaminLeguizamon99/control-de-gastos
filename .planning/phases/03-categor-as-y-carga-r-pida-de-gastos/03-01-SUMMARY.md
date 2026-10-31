---
phase: 03-categor-as-y-carga-r-pida-de-gastos
plan: 01
subsystem: backend-api
tags: [fastapi, sqlalchemy, alembic, categories, expenses, cors]
requires: [phase-02 auth + db session + RLS pattern]
provides:
  - "GET /categories (lazy idempotent seed of 7 base categories)"
  - "POST /expenses (client id, cents, 1 installment)"
  - "GET /expenses/last-payment-method"
  - "migration 0002: categories, expenses, installments + RLS"
  - "category_service.BASE / ensure_seeded / list_categories; category_repo.get / list_for_user"
affects: [03-02, 03-03, 03-04, 03-05, 03-06]
tech-stack:
  added: []
  patterns:
    - "INSERT ... ON CONFLICT DO NOTHING (no target) for concurrent-safe lazy seed"
    - "Per-field Pydantic strict + extra=forbid on request models"
    - "Service raises HTTPException(404) for foreign ids (documented shortcut)"
key-files:
  created:
    - backend/alembic/versions/0002_categories_expenses.py
    - backend/app/models/category.py
    - backend/app/models/expense.py
    - backend/app/schemas/__init__.py
    - backend/app/schemas/category.py
    - backend/app/schemas/expense.py
    - backend/app/repositories/category_repo.py
    - backend/app/repositories/expense_repo.py
    - backend/app/services/__init__.py
    - backend/app/services/category_service.py
    - backend/app/services/expense_service.py
    - backend/app/routers/categories.py
    - backend/app/routers/expenses.py
    - backend/tests/test_categories.py
    - backend/tests/test_expenses.py
    - backend/tests/test_cors.py
  modified:
    - backend/app/models/__init__.py
    - backend/app/main.py
    - backend/tests/conftest.py
decisions:
  - "Seed logic split into ensure_seeded (reusable by plan 04 on create) + list_categories"
  - "Idempotent retry returns the stored expense unchanged (201), even if the retried body differs"
metrics:
  completed: 2026-10-31
  tasks: 3
  files: 19
---

# Phase 3 Plan 01: Categories and expense API Summary

Migration 0002 (categories/expenses/installments with CHECKs, a `pg_c_utf8` case-insensitive unique name index and RLS), a concurrency-safe lazy seed of the 7 base categories, and `POST /expenses` storing integer cents plus one installment in the month of the chosen date. Retries with the same client id are idempotent.

## Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 | Failing tests (seed, expense, last payment method, CORS) | a2bc64b |
| 2 | Migration 0002 + seeded GET /categories | 69477c4 |
| 3 | POST /expenses + last payment method + write CORS | 2f5f469 |

## Verification

- `pytest -q`: 50 passed (includes test_rls.py, which checks that RLS is on for the new tables)
- `ruff check .`, `ruff format --check .`, `mypy app` (strict): clean
- No `session.commit()` in app code and no `today()` in expense_service
- Not pushed (migration 0002 is not applied on Supabase yet; that is plan 06)

## Deviations from Plan

- I split the newest-`created_at` scenario into its own test, `test_last_payment_method_newest_wins`. That test inserts a `credit` expense directly through db_session, which the DB CHECK allows, to cover D-20. The name still matches `-k last_payment`.
- During Task 1 (RED), `ruff check tests` reported I001 because the not-yet-existing `app.models.*` modules were classified as third-party. The warning went away once Task 2 created them. No code change was needed.

## Known Stubs

None.

## Notes for downstream

- `pg_c_utf8` is verified only on local PG 17. Plan 06 must check it on Supabase before applying 0002 (RESEARCH A1).
- The backend tests share the Docker test DB on port 5433 and TRUNCATE it. Parallel backend test runs from other worktrees can interfere with each other.

## Self-Check: PASSED

- All created files exist. Commits a2bc64b, 69477c4 and 2f5f469 are in the branch history.
