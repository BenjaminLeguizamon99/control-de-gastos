---
phase: 03-categor-as-y-carga-r-pida-de-gastos
plan: 04
subsystem: backend-categories
tags: [fastapi, pydantic, sqlalchemy, emoji, categories]
requires: ["03-01"]
provides:
  - "POST /categories (201, CategoryRead)"
  - "PUT /categories/{category_id} (200, CategoryRead)"
  - "CategoryIn schema (strict, extra=forbid, single-emoji validator)"
  - "category_service.create_category / update_category / _flush_or_409"
  - "docs/aprendizaje/fase-03.md"
affects: [frontend category sheet (plan 05/06)]
tech-stack:
  added: ["emoji 2.16.0"]
  patterns: ["flush inside try/except IntegrityError -> 409 by constraint name (DB decides uniqueness)"]
key-files:
  created:
    - docs/aprendizaje/fase-03.md
  modified:
    - backend/pyproject.toml
    - backend/uv.lock
    - backend/app/schemas/category.py
    - backend/app/services/category_service.py
    - backend/app/routers/categories.py
    - backend/tests/test_categories.py
decisions:
  - "Uniqueness of category names is decided only by uq_categories_user_name at flush time; no pre-SELECT (D-15)"
  - "create_category calls ensure_seeded first so a POST before any GET still leaves base categories and Otros (D-10)"
  - "test_categories.py gets an autouse fixture depending on db_session so client-only tests truncate too"
metrics:
  completed: 2026-10-31
  tasks: 3
  files: 8
---

# Phase 3 Plan 04: Crear y renombrar categorías Summary

POST/PUT /categories with a strict `CategoryIn` (1..40 trimmed name, exactly one emoji via `emoji.is_emoji`, color 1..10, no extra fields), 409 mapped from the `uq_categories_user_name` index at flush, owner-scoped 404, plus the phase 3 Python learning note.

## Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 | Verificar el paquete emoji e instalarlo con uv (human-verified, `uv add emoji`) | 65e3af3 |
| 2 | POST y PUT de categorías con 409, 422 y 404 (TDD) | 8f50426 (RED), fbbc653 (GREEN) |
| 3 | Nota de aprendizaje de la Fase 3 | fafe8fe |

## Verification

- `pytest -q`: 77 passed (27 new category create/rename tests)
- `ruff check .`, `ruff format --check .`, `mypy app` (strict): clean
- `fase-03.md`: 9 `##` sections, 9 `**Java:**` bullets; mentions `Mapped`, `select()`, `Literal`, `extra="forbid"`, router/service/repository

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test isolation leak in test_categories.py**
- **Found during:** Task 2 (GREEN)
- **Issue:** the `db_session` fixture is the one that TRUNCATEs, and tests that only request `client` left rows behind, so later tests saw a leftover "Farmacia" (409) or renamed "Comida" (StopIteration).
- **Fix:** module-level `@pytest.fixture(autouse=True) _clean(db_session)` in `backend/tests/test_categories.py`.
- **Commit:** fbbc653

**2. [Rule 1 - Accuracy] Learning note Literal/CHECK wording**
- The plan text implied the DB CHECK would need changing for "credit"; migration 0002 already allows `'credit'`, so the note says only the `Literal` changes in Phase 4.

## TDD Gate Compliance

RED `test(03-04)` 8f50426 (27 failing) -> GREEN `feat(03-04)` fbbc653. No refactor commit needed.

## Threat Flags

None: new surface (POST/PUT /categories) is covered by T-03-17..T-03-20 in the plan's threat model.

## Self-Check: PASSED

- Files exist: backend/app/schemas/category.py, backend/app/services/category_service.py, backend/app/routers/categories.py, backend/tests/test_categories.py, docs/aprendizaje/fase-03.md
- Commits present: 65e3af3, 8f50426, fbbc653, fafe8fe
