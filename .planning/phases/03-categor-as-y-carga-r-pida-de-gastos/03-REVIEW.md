---
phase: 03-categor-as-y-carga-r-pida-de-gastos
reviewed: 2026-11-01T00:00:00Z
depth: standard
files_reviewed: 40
files_reviewed_list:
  - backend/alembic/versions/0002_categories_expenses.py
  - backend/app/main.py
  - backend/app/models/__init__.py
  - backend/app/models/category.py
  - backend/app/models/expense.py
  - backend/app/repositories/category_repo.py
  - backend/app/repositories/expense_repo.py
  - backend/app/routers/categories.py
  - backend/app/routers/expenses.py
  - backend/app/schemas/__init__.py
  - backend/app/schemas/category.py
  - backend/app/schemas/expense.py
  - backend/app/services/__init__.py
  - backend/app/services/category_service.py
  - backend/app/services/expense_service.py
  - backend/pyproject.toml
  - backend/tests/conftest.py
  - backend/tests/test_categories.py
  - backend/tests/test_cors.py
  - backend/tests/test_expenses.py
  - docs/aprendizaje/fase-03.md
  - frontend/src/api/client.test.ts
  - frontend/src/api/client.ts
  - frontend/src/api/types.ts
  - frontend/src/app/HomePage.tsx
  - frontend/src/app/MuestraPage.tsx
  - frontend/src/app/ProtectedLayout.tsx
  - frontend/src/app/router.tsx
  - frontend/src/components/ui/AmountInput.tsx
  - frontend/src/components/ui/CategoryGrid.tsx
  - frontend/src/components/ui/SegmentedControl.tsx
  - frontend/src/features/categories/CategoriaSheet.tsx
  - frontend/src/features/categories/CategoriasPage.tsx
  - frontend/src/features/categories/useCategorias.ts
  - frontend/src/features/expenses/NuevoGastoPage.tsx
  - frontend/src/lib/categorias.test.ts
  - frontend/src/lib/categorias.ts
  - frontend/src/lib/fecha.test.ts
  - frontend/src/lib/fecha.ts
  - frontend/src/lib/money.test.ts
findings:
  critical: 1
  warning: 5
  info: 4
  total: 10
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-11-01T00:00:00Z
**Depth:** standard
**Files Reviewed:** 40
**Status:** issues_found

## Narrative Findings (AI reviewer)

## Summary

Overall the code is solid. Every query filters by `user_id`, `extra="forbid"` blocks a smuggled `user_id` or `is_fallback`, amounts are integer cents, 409 is mapped from the right constraint name, and RLS is on for every new table. The main problem is the idempotency contract. The server returns whatever row already has that `id`, without comparing payloads. Meanwhile the client keeps the same `draftId` while the user edits the form after a failed save. Together, these can silently drop a corrected amount. Smaller issues: the idempotency race returns 500, the client and server disagree on which emojis are valid, and some errors are reported to the user as the wrong kind of problem.

## Critical Issues

### CR-01: Idempotent retry silently keeps stale data after the user edits the form

**File:** `backend/app/services/expense_service.py:12-14`, `frontend/src/features/expenses/NuevoGastoPage.tsx:72,106-121`
**Issue:** `create_expense` returns the existing row for a known `id` and does not check that the payload matches. On the client, `draftId` only rotates in `onSuccess`. Here is the failure path:
1. The POST commits on the server, but the response is lost (timeout or connection drop), so `errorGuardar` is shown.
2. The user corrects the amount, category or date and taps "Guardar gasto" again.
3. The request goes out with the same `id`. The server returns the **old** row with 201.
4. The toast shows the client-side `guardado` amount, which is the **new** value. The user thinks the corrected expense was saved, but the DB still has the old one.

This loses data without telling anyone, in the app's core flow. The test `test_expense_idempotent` only covers identical bodies.
**Fix:** Make the server reject a reused `id` that comes with a different payload, and have the toast use the server response:
```python
existing = expense_repo.get(session, user_id, data.id)
if existing is not None:
    same = (existing.amount_cents, existing.category_id, existing.description,
            existing.payment_method, existing.date) == (
            data.amount_cents, data.category_id, data.description or None,
            data.payment_method, data.date)
    if not same:
        raise HTTPException(409, "Conflicting retry")
    return existing
```
On the client, either build the toast from the `ExpenseApi` response instead of `guardado`, or rotate `draftId.current` whenever a field changes after an error.

## Warnings

### WR-01: Concurrent retry or a cross-user id collision returns 500 instead of an idempotent response

**File:** `backend/app/services/expense_service.py:12,37-38`
**Issue:** The check-then-insert has a race. Two requests with the same `id` (for example, a double tap that slips past the disabled button, or the browser retrying) both see `None`. The second one then hits the `expenses_pkey` `IntegrityError` at `flush()`, and that error is not handled, so the API returns a 500. The client shows the "revisá tu conexión" error even though the expense was saved. A second case: `expense_repo.get` filters by `user_id`, so an `id` that already belongs to another user also ends in a 500.
**Fix:** Wrap the flush. On a PK violation, roll back and re-read:
```python
try:
    session.flush()
except IntegrityError as e:
    if isinstance(e.orig, UniqueViolation) and e.orig.diag.constraint_name == "expenses_pkey":
        raise HTTPException(409, "Conflicting id") from None
    raise
```
Or use `INSERT ... ON CONFLICT (id) DO NOTHING` and re-select by `(id, user_id)`, returning 409 or 404 when no row matches.

### WR-02: The client rejects flags and keycaps that the backend accepts

**File:** `frontend/src/lib/categorias.ts:28-29`
**Issue:** `esUnEmoji` requires `\p{Extended_Pictographic}`. Regional-indicator flags (`🇦🇷`) and keycaps (`1️⃣`, `#️⃣`) are not Extended_Pictographic, so they fail. I checked this with Node: `esUnEmoji('🇦🇷') === false`. `emoji.is_emoji` on the backend accepts them. As a result, a user in Argentina cannot pick the 🇦🇷 emoji: the client says "Tiene que ser un solo emoji" and never sends the request.
**Fix:** Accept the RGI_Emoji property, or relax the client check to grapheme count only and let the backend decide (D-12 already says "Solo UX; el backend decide"):
```ts
export const esUnEmoji = (s: string) =>
  [...GRAFEMAS.segment(s)].length === 1 && /\p{Extended_Pictographic}|\p{Regional_Indicator}|⃣/u.test(s)
```
Add `'🇦🇷'` and `'1️⃣'` to `categorias.test.ts`.

### WR-03: An amount above the backend limit is shown as a network error

**File:** `frontend/src/features/expenses/NuevoGastoPage.tsx:93-94,111,138-139`, `frontend/src/lib/money.ts:39-59`
**Issue:** `parseMontoInput` has no digit cap. The backend allows `amount_cents <= 100_000_000_000`, which is $1.000.000.000. A larger amount comes back as a 422, and that falls through to `setErrorGuardar(true)`, which says "Revisá tu conexión y volvé a tocar Guardar". Retrying fails the same way forever. Separately, `Number(aCentavos(monto))` silently loses precision above 2^53, so the amount sent can differ from the amount typed.
**Fix:** Validate the cap on the client and give 422 its own message:
```ts
const MAX_CENTAVOS = 100_000_000_000n
if (monto === '' || aCentavos(monto) <= 0n) nuevos.monto = MONTO_VACIO
else if (aCentavos(monto) > MAX_CENTAVOS) nuevos.monto = 'El monto es demasiado grande.'
```
In `onError`, handle `err.status === 422` separately from network failures.

### WR-04: The models do not match the migration, so a future `alembic revision --autogenerate` will propose dropping indexes

**File:** `backend/app/models/category.py:14-19`, `backend/app/models/expense.py:11-35`, `backend/alembic/versions/0002_categories_expenses.py:36-38,63,83`
**Issue:** `uq_categories_user_fallback` (a partial index on `user_id`) and `ix_installments_user_period` exist only in the migration, with no `Index(...)` in `__table_args__`. Autogenerate compares against metadata, so the next autogenerated migration will contain `op.drop_index(...)` for them. Dropping `uq_categories_user_fallback` would allow more than one fallback category per user. The CHECK constraints are also missing from the models, and `Mapped[str]` maps to `VARCHAR` while the migration uses `TEXT`, which will show up as type diffs.
**Fix:** Declare the indexes and types in the models, for example:
```python
__table_args__ = (
    Index("uq_categories_user_fallback", "user_id", unique=True,
          postgresql_where=text("is_fallback")),
)
name: Mapped[str] = mapped_column(Text)
```
Do the same for `Installment` (`Index("ix_installments_user_period", "user_id", "period")`) and the `Text` columns in `Expense`.

### WR-05: CategoriaSheet reports every 422 as an emoji error

**File:** `frontend/src/features/categories/CategoriaSheet.tsx:94-95`
**Issue:** Any 422 is shown as `EMOJI_INVALIDO`, and that replaces all other errors. A 422 caused by the name (for example, the backend's code-point count differing from the client's), by `color`, or by a future schema change would point the user at the wrong field. Because WR-02 rejects valid emojis on the client, the reverse mismatch cannot surface, but this mapping hides any other drift.
**Fix:** Read `detail[0].loc` from the 422 body (the response body would need to be exposed through `ApiError`). At minimum, show a generic "Revisá los datos" message unless the location is `["body", "emoji"]`.

## Info

### IN-01: `ExpenseCreate.date` accepts non-ISO inputs in lax mode

**File:** `backend/app/schemas/expense.py:21`
**Issue:** Lax Pydantic parses integers (Unix timestamps) and midnight datetime strings as `date`. There is also no sanity range, so years like 0001 or 9999 are accepted, and those would create installments in absurd periods.
**Fix:** Use `dt.date = Field(strict=False)` together with an `AfterValidator` that bounds the year, for example `2000 <= year <= today.year + 1`.

### IN-02: A POST that collides with a seed name on a brand-new user returns 409, and the seed rolls back

**File:** `backend/app/services/category_service.py:61-66`
**Issue:** On a user's first POST, `ensure_seeded` inserts the 7 base categories. If the new name matches one of them (for example "comida"), the request returns 409 and the transaction rolls back, seed included. The UI says "Ya tenés una categoría con ese nombre" while the user's list is empty until the next GET. This is harmless but confusing.
**Fix:** Acceptable as is. Optionally commit the seed separately, or document the behavior.

### IN-03: The selected date goes stale after midnight

**File:** `frontend/src/features/expenses/NuevoGastoPage.tsx:64,83-84`
**Issue:** `fecha` is initialized once, and D-18 keeps it across saves on purpose. If the page stays open past 00:00 ART, `fecha` still holds yesterday's date and neither "Hoy" nor "Ayer" looks pressed (or "Ayer" does). The next expense is filed under the previous day unless the user notices.
**Fix:** When `fecha` equaled the previous `hoy`, advance it as `hoy` changes, or recompute `hoy` on `visibilitychange`.

### IN-04: `if (!cat) return` fails silently

**File:** `frontend/src/features/expenses/NuevoGastoPage.tsx:104-105`
**Issue:** If the selected category id is no longer in `categorias.data` (for example, after a refetch), submit does nothing and shows no feedback.
**Fix:** Set `errores.categoria = CATEGORIA_NO_EXISTE` and focus the grid instead of returning.

---

_Reviewed: 2026-11-01T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
