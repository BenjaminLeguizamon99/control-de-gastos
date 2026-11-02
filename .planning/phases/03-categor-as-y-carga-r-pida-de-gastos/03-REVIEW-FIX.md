---
phase: 03-categor-as-y-carga-r-pida-de-gastos
fixed_at: 2026-11-01T00:00:00Z
review_path: .planning/phases/03-categor-as-y-carga-r-pida-de-gastos/03-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 03: Code Review Fix Report

**Fixed at:** 2026-11-01T00:00:00Z
**Source review:** .planning/phases/03-categor-as-y-carga-r-pida-de-gastos/03-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6 (1 critical, 5 warnings; Info excluded by scope)
- Fixed: 6
- Skipped: 0

Final gate, all green: backend `pytest` (84 passed), `ruff check`, `ruff format --check`, `mypy app`. Frontend `vitest` (94 passed), `npm run lint` (0 errors; the `only-export-components` warnings were already there), `npm run build`. No new Alembic migration was created and the DB schema did not change.

## Fixed Issues

### CR-01: Idempotent retry silently keeps stale data after the user edits the form

**Files modified:** `backend/app/services/expense_service.py`, `backend/tests/test_expenses.py`, `frontend/src/features/expenses/NuevoGastoPage.tsx`
**Commit:** 282ead9
**Applied fix:** The new `_same_or_409` compares the stored row (amount, category, description normalized to `None`, payment method, date) with the payload and returns 409 when they differ. On the client, a 409 rotates `draftId` and shows a serious message ("Este gasto ya se había guardado con los datos anteriores. Si volvés a tocar "Guardar gasto", se guarda como un gasto aparte."). The next tap then saves the corrected expense as a new row. Since a 2xx now means the stored row matches what was sent, the success toast built from the local `guardado` value is correct. Added the parametrized test `test_expense_retry_with_changes_conflicts`.
**Status:** fixed: requires human verification. This changes the logic and UX: after a lost response followed by an edit, the user ends up with both the old and the new expense, and has to delete one once Phase 6 adds edit/delete. The 409 branch in the client has no component test.

### WR-01: Concurrent retry or a cross-user id collision returns 500

**Files modified:** `backend/app/services/expense_service.py`, `backend/tests/test_expenses.py`
**Commit:** 70f2964
**Applied fix:** The insert now runs inside `session.begin_nested()` (a savepoint). An `IntegrityError` on `expenses_pkey` rolls back only the savepoint and the row is read again for this user. If it exists, it goes through `_same_or_409` (same payload gives 201, different payload gives 409). If it belongs to another user, the response is 409 `Conflicting id`. Any other `IntegrityError` is re-raised. Added two tests: `test_expense_id_of_other_user_conflicts`, and `test_expense_concurrent_retry`, which monkeypatches the first `expense_repo.get` to simulate losing the race. Both fail without the fix.
**Status:** fixed: requires human verification (concurrency logic).

### WR-02: The client rejects flags and keycaps that the backend accepts

**Files modified:** `frontend/src/lib/categorias.ts`, `frontend/src/lib/categorias.test.ts`
**Commit:** 97f917a
**Applied fix:** `esUnEmoji` now also accepts `\p{Regional_Indicator}` and the keycap combiner `⃣`, still with the single-grapheme check. Added `🇦🇷`, `1️⃣` and `#️⃣` as valid test cases.

### WR-03: An amount above the backend limit is shown as a network error

**Files modified:** `frontend/src/lib/money.ts`, `frontend/src/lib/money.test.ts`, `frontend/src/features/expenses/NuevoGastoPage.tsx`
**Commit:** 9d8d8b9
**Applied fix:** Moved the amount validation into a pure function, `errorMonto` in `money.ts`. It keeps the empty-amount and decimals checks and adds a `MAX_CENTAVOS = 100_000_000_000n` cap (the same as `ExpenseCreate`) with the message "El monto no puede superar $ 1.000.000.000.". The cap also keeps `Number(aCentavos(...))` below 2^53. The page's `onError` now handles 422 separately with "No pudimos guardar el gasto porque algún dato no es válido. Revisá el formulario." Added the `errorMonto` tests.

### WR-04: Models do not match the migration

**Files modified:** `backend/app/models/category.py`, `backend/app/models/expense.py`, `backend/tests/test_models.py` (new)
**Commit:** c5fbfc6
**Applied fix:** Mirrored migration 0002 in `__table_args__`:
- the `uq_categories_user_name` functional index (including the `COLLATE pg_c_utf8` expression)
- the partial index `uq_categories_user_fallback`
- `ix_expenses_user_created` (`created_at DESC`) and `ix_installments_user_period`
- `uq_installments_expense_number` and all CHECK constraints
- `Text` on the text columns

Autogenerate `compare_metadata` (with `compare_type=True`) against the migrated test DB went from about 10 diffs to `[]`. The new test `test_models_match_migrations` asserts this and fails on the old models. No migration was created and the schema is unchanged.

### WR-05: CategoriaSheet reports every 422 as an emoji error

**Files modified:** `frontend/src/api/client.ts`, `frontend/src/api/client.test.ts`, `frontend/src/lib/categorias.ts`, `frontend/src/features/categories/CategoriaSheet.tsx`
**Commit:** 290b89f
**Applied fix:** `ApiError` now carries the parsed error body (`res.json().catch(() => undefined)`) and has a `campoInvalido()` method that reads `detail[0].loc[1]`. The sheet shows `EMOJI_INVALIDO` only when the field is `emoji`. Any other 422 shows the new generic `CATEGORIA_INVALIDA` ("No pudimos guardar la categoría porque algún dato no es válido. Revisá el formulario.") in the form-level error slot, which used to be the boolean `errorRed`. Added two client tests.

---

_Fixed: 2026-11-01T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
