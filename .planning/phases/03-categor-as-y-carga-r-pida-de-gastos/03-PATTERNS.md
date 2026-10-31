# Phase 3: Categorías y carga rápida de gastos - Pattern Map

**Mapped:** 2026-10-31
**Files analyzed:** 38 (new + modified)
**Analogs found:** 35 / 38 (3 without a close analog: services, Toast, fecha/categorias helpers fall back to RESEARCH.md patterns, see bottom)

Paths are relative to the repo root `C:\Users\Benjamin\Documents\proyectos\control-de-gastos`.

## File Classification

### Backend

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `backend/alembic/versions/0002_categories_expenses.py` (new) | migration | schema | `backend/alembic/versions/0001_probes_rls.py` | exact |
| `backend/app/models/category.py` (new) | model | CRUD | `backend/app/models/probe.py` | exact |
| `backend/app/models/expense.py` (new, Expense + Installment) | model | CRUD | `backend/app/models/probe.py` | role-match (adds relationship) |
| `backend/app/models/__init__.py` (modify) | config/barrel | — | itself | exact |
| `backend/app/schemas/category.py`, `schemas/expense.py` (new folder) | DTO | request-response | `ProbeRead` in `backend/app/routers/probes.py` L14-16, `MeResponse` in `routers/me.py` L11-12 | role-match (inline today, RESEARCH asks for own folder) |
| `backend/app/repositories/category_repo.py` (new) | repository | CRUD | `backend/app/repositories/probe_repo.py` | exact |
| `backend/app/repositories/expense_repo.py` (new) | repository | CRUD | `backend/app/repositories/probe_repo.py` | exact |
| `backend/app/services/category_service.py` (new) | service | CRUD + seed | none (no `services/` yet) | no analog → RESEARCH Patterns 2, 3 |
| `backend/app/services/expense_service.py` (new) | service | CRUD | none | no analog → RESEARCH Pattern 5 |
| `backend/app/routers/categories.py` (new) | router | request-response | `backend/app/routers/probes.py` | exact |
| `backend/app/routers/expenses.py` (new) | router | request-response | `backend/app/routers/probes.py` | exact |
| `backend/app/main.py` (modify: routers + CORS methods) | config | — | itself L8-16 | exact |
| `backend/pyproject.toml` + `uv.lock` (modify: `emoji`) | config | — | itself L6-13 | exact (via `uv add`, human checkpoint) |
| `backend/tests/conftest.py` (modify TRUNCATE) | test fixture | — | itself L81-90 | exact |
| `backend/tests/test_categories.py` (new) | test | integration | `backend/tests/test_probes.py` | exact |
| `backend/tests/test_expenses.py` (new) | test | integration | `backend/tests/test_probes.py` | exact |
| `backend/tests/test_cors.py` (new) | test | integration | `backend/tests/test_health.py` / `test_probes.py` (client fixture) | role-match |
| `backend/tests/test_rls.py` | test | — | unchanged, already covers new tables | — |

### Frontend

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `frontend/src/api/client.ts` (modify: method + body) | utility | request-response | itself | exact |
| `frontend/src/api/client.test.ts` (extend: POST case) | test | unit | itself | exact |
| `frontend/src/api/types.ts` (new) | types | — | inline types in `HomePage.tsx` L11 (`api<{ user_id: string }>`) | partial |
| `frontend/src/lib/fecha.ts` + `fecha.test.ts` (new) | utility | transform | `frontend/src/lib/money.ts` + `money.test.ts` | role-match |
| `frontend/src/lib/categorias.ts` + `categorias.test.ts` (new) | utility | transform | `frontend/src/lib/money.ts` + `money.test.ts` | role-match |
| `frontend/src/lib/money.test.ts` (extend) | test | unit | itself | exact |
| `frontend/src/features/expenses/NuevoGastoPage.tsx` (new) | page/component | request-response (query + mutation) | `features/auth/LoginPage.tsx` (form) + `app/HomePage.tsx` (useQuery + error) + `app/MuestraPage.tsx` (UI kit wiring) | role-match |
| `frontend/src/features/categories/CategoriasPage.tsx` (new) | page | CRUD list | `app/HomePage.tsx` + `app/MuestraPage.tsx` | role-match |
| `frontend/src/features/categories/CategoriaSheet.tsx` (new) | component (form in sheet) | request-response | `features/auth/LoginPage.tsx` form + `MuestraPage.tsx` L122-131 BottomSheet + `CategoryGrid.tsx` radios | role-match |
| `frontend/src/features/categories/useCategorias.ts` (new) | hook | request-response | `app/HomePage.tsx` L9-12 `useQuery` | role-match |
| `frontend/src/components/ui/Toast.tsx` (optional; inline OK) | component | event-driven | none | no analog → RESEARCH Pitfall 10 + UI-SPEC |
| `frontend/src/components/ui/CategoryGrid.tsx` (modify: `onNueva`, export `FONDO`, `esOtros` in type) | component | — | itself | exact |
| `frontend/src/components/ui/AmountInput.tsx` (modify: `autoFocus`) | component | — | itself | exact |
| `frontend/src/components/ui/SegmentedControl.tsx` (modify: `text-center` on label) | component | — | itself L26 | exact |
| `frontend/src/app/router.tsx` (modify: 2 children) | route | — | itself L20 | exact |
| `frontend/src/app/ProtectedLayout.tsx` (modify: FAB) | layout | — | itself | exact |
| `frontend/src/app/HomePage.tsx` (modify: link + `pb-24`) | page | — | `LoginPage.tsx` L81-86 Link style | exact |
| `docs/aprendizaje/fase-03.md` (new) | docs | — | `docs/aprendizaje/fase-01.md` | exact |

---

## Pattern Assignments — Backend

### `backend/alembic/versions/0002_categories_expenses.py` (migration)

**Analog:** `backend/alembic/versions/0001_probes_rls.py` (whole file, 31 lines)

Header + imports (L1-13) — copy, set `revision = "0002"`, `down_revision = "0001"`:
```python
"""probes + RLS

Revision ID: 0001
Revises:
"""

import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None
```

Column style + RLS (L17-27):
```python
    op.create_table(
        "probes",
        sa.Column("id", sa.Uuid, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.Uuid, nullable=False, index=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    # RLS sin policies: la Data API de Supabase (anon/authenticated) no puede leer nada.
    op.execute("ALTER TABLE probes ENABLE ROW LEVEL SECURITY")
```
Body of the three tables, the `pg_c_utf8` functional unique index `uq_categories_user_name`, partial index `uq_categories_user_fallback`, CHECKs and the RLS loop: RESEARCH.md Pattern 1 verbatim. `alembic_version` RLS is already done in 0001 — do not repeat. Downgrade drops in reverse FK order (installments, expenses, categories). `expenses.id` has NO server default (client UUID).

---

### `backend/app/models/category.py`, `backend/app/models/expense.py` (model)

**Analog:** `backend/app/models/probe.py` (L1-15)
```python
from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Probe(Base):
    __tablename__ = "probes"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    user_id: Mapped[UUID] = mapped_column(index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```
Deviations:
- `expense.py`: `import datetime as dt` (NOT `from datetime import date`) and annotate `date: Mapped[dt.date]`, `created_at: Mapped[dt.datetime]` (RESEARCH Pitfall 5).
- `amount_cents: Mapped[int] = mapped_column(BigInteger)`; `color`/`number`: `SmallInteger`; `payment_method: Mapped[str]` (text + CHECK, no PG enum).
- `Expense.installments: Mapped[list["Installment"]] = relationship(cascade="all, delete-orphan")` so Pattern 5 can build `Expense(..., installments=[Installment(...)])`.
- Do not redeclare the functional unique index in the model (migration is hand-written; models don't drive autogenerate here).

**Barrel** `backend/app/models/__init__.py` (L1-4) — append the new classes:
```python
from app.models.base import Base
from app.models.probe import Probe

__all__ = ["Base", "Probe"]
```

---

### `backend/app/repositories/category_repo.py`, `expense_repo.py` (repository)

**Analog:** `backend/app/repositories/probe_repo.py` (L1-10) — module-level functions taking `session` first, `user_id` always in the WHERE:
```python
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.probe import Probe


def get_probe(session: Session, user_id: UUID, probe_id: UUID) -> Probe | None:
    return session.scalar(select(Probe).where(Probe.id == probe_id, Probe.user_id == user_id))
```
Needed functions: `category_repo.get(session, user_id, id)`, `category_repo.list_for_user(session, user_id) -> Sequence[Category]` (`session.scalars(select(...).where(Category.user_id == user_id)).all()`, no ORDER BY — sorting is client-side), `expense_repo.get(session, user_id, id)`, `expense_repo.last_payment_method(session, user_id) -> str | None` (query in RESEARCH Pattern 5 footnote).

---

### `backend/app/services/category_service.py`, `expense_service.py` (service) — NO ANALOG

No `services/` layer exists yet. Shape: module-level functions like `probe_repo.py` (session first, user_id second, no classes). Code: RESEARCH Pattern 2 (`BASE` + `list_categories` with `pg_insert(...).on_conflict_do_nothing()`), Pattern 3 (`_flush_or_409` with `session.flush()` inside try), Pattern 5 (`create_expense`, idempotent on `data.id`, ownership check → `HTTPException(404, "Not found")`). Raising `HTTPException` from the service follows the existing 404 style in `routers/probes.py` L22-23 and is documented as a shortcut in RESEARCH.

---

### `backend/app/schemas/category.py`, `schemas/expense.py` (DTO)

**Analog:** `ProbeRead` in `backend/app/routers/probes.py` L14-16 and response mapping L24:
```python
class ProbeRead(BaseModel):
    id: UUID
    created_at: datetime
...
    return ProbeRead.model_validate(probe, from_attributes=True)
```
Request models (`CategoryIn`, `ExpenseCreate`) with `ConfigDict(strict=True, extra="forbid")`, `Literal["debit", "cash"]`, `emoji.is_emoji` AfterValidator: RESEARCH Pattern 4. Response models: `CategoryRead {id, name, emoji, color, is_fallback}`, `ExpenseRead {id, amount_cents, category_id, description, payment_method, date}`, `LastPaymentMethod {payment_method}`; return them with `model_validate(obj, from_attributes=True)`. Use `import datetime as dt` here too.

---

### `backend/app/routers/categories.py`, `expenses.py` (router)

**Analog:** `backend/app/routers/probes.py` (L1-24)
```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.auth import CurrentUserId
from app.db import SessionDep
from app.repositories.probe_repo import get_probe

router = APIRouter()


@router.get("/probes/{probe_id}")
def read_probe(probe_id: UUID, user_id: CurrentUserId, session: SessionDep) -> ProbeRead:
    probe = get_probe(session, user_id, probe_id)
    if probe is None:
        raise HTTPException(404, "Not found")  # 404 y no 403: no revelar que existe
    return ProbeRead.model_validate(probe, from_attributes=True)
```
Rules to keep: sync `def` (not `async def`), `user_id: CurrentUserId` + `session: SessionDep` params, return type annotation = response model, 404 text `"Not found"`. Endpoints: `GET /categories` → `list[CategoryRead]`, `POST /categories` (`status_code=201`), `PUT /categories/{category_id}`, `POST /expenses` (`status_code=201`), `GET /expenses/last-payment-method` (declare before any future `/expenses/{id}`). Router stays thin: delegate to services.

---

### `backend/app/main.py` (modify)

**Analog:** itself L5-16:
```python
from app.routers import health, me, probes
...
    allow_methods=["GET"],
...
app.include_router(probes.router)
```
Change to `from app.routers import categories, expenses, health, me, probes`, `allow_methods=["GET", "POST", "PUT"]` (RESEARCH Pitfall 2), and two more `include_router` lines. Keep `allow_origins` and `allow_headers` as is.

---

### `backend/tests/conftest.py` (modify)

**Analog:** itself L81-90 — only change the TRUNCATE (Pitfall 6):
```python
        session.execute(text("TRUNCATE probes"))
```
→ `TRUNCATE probes, installments, expenses, categories`. Reuse `USER_A`, `USER_B`, `auth`, `make_token`, `client`, `db_session` (L36-38, L51-64, L73-90). For the concurrency test, `SessionLocal` from `app.db` (as conftest L33 imports it).

### `backend/tests/test_categories.py`, `test_expenses.py`, `test_cors.py` (test)

**Analog:** `backend/tests/test_probes.py` (L1-47)
```python
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.probe import Probe
from tests.conftest import USER_A, USER_B, auth, make_token


def create_probe(db_session: Session, owner: str) -> UUID:
    probe = Probe(user_id=UUID(owner))
    db_session.add(probe)
    db_session.commit()
    return probe.id


def test_other_user_gets_404(client: TestClient, db_session: Session) -> None:
    probe_id = create_probe(db_session, USER_A)
    r = client.get(f"/probes/{probe_id}", headers=auth(make_token(USER_B)))
    assert r.status_code == 404
    assert r.json() == {"detail": "Not found"}
```
Every DB-touching test requests `db_session` (even if only for cleanup). Typed `-> None`. Use `pytest.mark.parametrize` for 422 cases (emoji, amount, method). Test list: RESEARCH "Phase Requirements → Test Map". CORS test: `client.options("/categories", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST"})` (origin matches conftest L12).

---

## Pattern Assignments — Frontend

### `frontend/src/api/client.ts` (modify)

**Analog:** itself (L15-32):
```ts
function request(path: string, token: string | undefined): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
}

export async function api<T>(path: string): Promise<T> {
  const { data } = await supabase.auth.getSession()
  let res = await request(path, data.session?.access_token)
  if (res.status === 401) {
    const { data: refreshed } = await supabase.auth.refreshSession()
    if (refreshed.session) res = await request(path, refreshed.session.access_token)
  }
  if (!res.ok) throw new ApiError(res.status)
  return res.json() as Promise<T>
}
```
Add `init?: { method?: string; body?: unknown }` threaded into `request()` for BOTH calls; when `body` is present add `'Content-Type': 'application/json'` and `JSON.stringify(body)`. Keep `ApiError(status)` (UI maps 409/404 by status). Note: the existing test L35 asserts `headers` equals `{ Authorization: 'Bearer new' }` exactly for GET — keep GET headers unchanged (only add Content-Type when there is a body).

### `frontend/src/api/client.test.ts` (extend)

**Analog:** itself L27-36 (`fetchMock.mockResolvedValueOnce(...)`, `await import('./client')`, assert on `fetchMock.mock.calls[i][1]`). Add: POST sends method/body/Content-Type, and the 401 retry resends the body.

### `frontend/src/lib/fecha.ts`, `lib/categorias.ts` (+ tests) (utility)

**Analog:** `frontend/src/lib/money.ts` — module of named pure exports, top-level `Intl` formatter constants (L8-13), Spanish comments explaining the why, `// shortcut:` comment convention (L42). Code: RESEARCH Patterns 7 and 8.
```ts
const MONEDA = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  trailingZeroDisplay: 'stripIfInteger',
})
```
**Test analog:** `frontend/src/lib/money.test.ts` L1-11, L16-29 — `import { describe, expect, it } from 'vitest'` and table-driven `it.each([...])('%s', ...)`. Vitest env is `node`, only `*.test.ts`.

`categorias.ts` should also hold the API→UI mapper (`name→nombre`, `is_fallback→esOtros`) and message constants, mirroring how `features/auth/authErrors.ts` L1-2 exports copy constants (`NETWORK_ERROR` is reused as is).

### `frontend/src/components/ui/CategoryGrid.tsx` (modify)

**Analog:** itself. Changes:
- L5-10 `Categoria`: add `esOtros?: boolean` (optional keeps `MuestraPage` compiling).
- L13 `const FONDO` → `export const FONDO` (UI-SPEC: reuse in `/categorias` rows).
- Props L27-37: add `onNueva?: () => void`; after the `.map` (L43-67), inside the same grid `div`, render the dashed tile when `onNueva` is set.
Tile class base to copy (L47), minus radio/`has-[:checked]` parts:
```tsx
className={`relative flex min-h-20 flex-col items-center justify-center gap-1 rounded-tile border border-borde p-2 text-tinta ... ${FONDO[c.color]}`}
```
→ `type="button" aria-label="Nueva categoría"`, `border-dashed`, `bg-transparent active:bg-papel-2`, focus ring `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento`.

### `frontend/src/components/ui/AmountInput.tsx` (modify)

**Analog:** itself. Add `autoFocus?: boolean` to props (L4-16) and pass `autoFocus={autoFocus}` to the `<input>` (L34-58). Reset is done by the parent via `key` (Pitfall 3) — no internal change.

### `frontend/src/components/ui/SegmentedControl.tsx` (modify)

Add `text-center` to the label class at L26 (UI-SPEC: wrapped "Débito/​Transferencia").

### `frontend/src/features/categories/useCategorias.ts` (hook)

**Analog:** `frontend/src/app/HomePage.tsx` L9-12:
```tsx
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<{ user_id: string }>('/me'),
  })
```
→ `queryKey: ['categories']`, `queryFn: async () => ordenar((await api<CategoryApi[]>('/categories')).map(aCategoria))`. Global `retry: 1` is set in `frontend/src/main.tsx` L9 — don't override.

### `frontend/src/features/expenses/NuevoGastoPage.tsx` (page)

**Analogs and what to take from each:**

1. Form skeleton, inline errors, server error, submit button — `features/auth/LoginPage.tsx` L21-39, L45-95:
```tsx
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setServerError(null)
    ...
        <form onSubmit={onSubmit} noValidate>
...
            {emailError && (
              <p id="email-error" role="alert" className="mt-1 text-etiqueta font-normal text-peligro">
                {emailError}
              </p>
            )}
...
          {serverError && (
            <p role="alert" className="mb-4 text-etiqueta font-normal text-peligro">
              {serverError}
            </p>
          )}
          <Button variant="primario" type="submit" fullWidth loading={submitting} loadingLabel="Ingresando…">
```
   Standard text input class (L10-11) — reuse for descripción and fecha:
```ts
const inputBase =
  'w-full min-h-12 rounded-control border bg-papel-2 px-4 text-cuerpo text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento'
```
   (Consider moving `inputBase` to a shared spot only if 3+ files need it; otherwise copy.) Use `useMutation` `isPending` instead of a `submitting` state.
2. Query loading/error states with `NETWORK_ERROR` + "Reintentar" — `app/HomePage.tsx` L21, L28-37:
```tsx
      {error && !denied && (
        <div className="mt-4">
          <p role="alert" className="mb-4 text-etiqueta font-normal text-peligro">
            {NETWORK_ERROR}
          </p>
          <Button variant="secundario" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      )}
```
3. Page shell + UI kit wiring — `app/MuestraPage.tsx` L57-65, L103, L111, L116:
```tsx
    <main className="mx-auto min-h-dvh max-w-120 px-4 pb-16 sm:px-6">
...
        <SegmentedControl legend="Medio de pago" options={MEDIOS} value={medio} onChange={setMedio} />
...
        <CategoryGrid categorias={CATEGORIAS} value={categoria} onChange={setCategoria} />
```
   (UI-SPEC: `pb-8` here.) Medios: `[{ value: 'debit', label: 'Débito/\u200bTransferencia' }, { value: 'cash', label: 'Efectivo' }]`.
4. "Volver" link style — `LoginPage.tsx` L81-86:
```tsx
            <Link
              to="/recuperar"
              className="inline-flex min-h-11 items-center py-2 text-etiqueta font-normal text-acento focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento"
            >
```
State/reset/draft UUID/derived medio: RESEARCH Pattern 6. Amount → cents: `Number(aCentavos(monto))` from `lib/money.ts` L61-66; validation copy `MONTO_VACIO` from `lib/money.ts` L4. Toast: always-mounted `role="status"` (no analog, see below); toast amount uses `<Monto value=... size="cuerpo" />` (`components/ui/Monto.tsx`).

### `frontend/src/features/categories/CategoriaSheet.tsx` (form in sheet)

- Sheet usage — `app/MuestraPage.tsx` L122-131:
```tsx
        <BottomSheet open={hoja === 'categoria'} onClose={cerrar} title="Elegí una categoría">
          <CategoryGrid categorias={CATEGORIAS} value={categoria} onChange={setCategoria} />
        </BottomSheet>
```
- Emoji and color radio grids — copy the native-radio pattern from `components/ui/CategoryGrid.tsx` L38-68 (`useId()` name, `<label>` with `has-[:checked]:border-2 has-[:checked]:border-tinta has-[:focus-visible]:outline-...`, `<input type="radio" className="sr-only">`).
- Solid color map + names — `app/MuestraPage.tsx` L29-54 (`SOLIDO`, `NOMBRES_COLOR`). Move these out of MuestraPage into a shared module (e.g. export from `CategoryGrid.tsx` next to `FONDO`) and import them in both places; do not duplicate.
- Form/error/button: same as LoginPage excerpt above. 409 → error under Nombre (`e instanceof ApiError && e.status === 409`, as `HomePage.tsx` L15 checks status). On success: `queryClient.setQueryData(['categories'], ...)` or `invalidateQueries`, then the caller selects the new id (D-11).

### `frontend/src/features/categories/CategoriasPage.tsx` (page)

Same shell/query/error analogs as NuevoGastoPage (`MuestraPage.tsx` L65 main with `pb-24`, `HomePage.tsx` error block). Rows: `<button>` with emoji box `className={\`size-10 rounded-control ... ${FONDO[c.color]}\`}` (literal map, never template class names — see `CategoryGrid.tsx` L12 comment). One `CategoriaSheet` with `editing: Categoria | null | 'nueva'` state, like `MuestraPage.tsx` L61 `hoja` state.

### `frontend/src/app/router.tsx` (modify)

**Analog:** itself L20:
```tsx
  { path: '/', element: <ProtectedLayout />, children: [{ index: true, element: <HomePage /> }] },
```
Add `{ path: 'gasto/nuevo', element: <NuevoGastoPage /> }` and `{ path: 'categorias', element: <CategoriasPage /> }` to `children`.

### `frontend/src/app/ProtectedLayout.tsx` (modify: FAB)

**Analog:** itself L1-2, L21-30:
```tsx
import { Navigate, Outlet, useNavigate } from 'react-router'
...
    <div className="min-h-dvh pb-[env(safe-area-inset-bottom)] text-tinta">
      <header className="flex h-14 items-center justify-between bg-papel-2 px-4">
...
      <Outlet />
    </div>
```
Add `Link, useMatch` to the import; after `<Outlet />` render the FAB when `!useMatch('/gasto/nuevo')` (call the hook before the early `return <Navigate>` at L12 to respect hook rules). Classes: `fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] inline-flex size-14 items-center justify-center rounded-full bg-acento text-sobre-acento text-titulo font-casual hover:bg-acento-fuerte active:bg-acento-fuerte focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento` (button variant colors from `components/ui/Button.tsx` L4).

### `frontend/src/app/HomePage.tsx` (modify)

Add `pb-24` to `main` (L18) and a `<Link to="/categorias">Editar categorías</Link>` using the LoginPage L81-86 link classes (with `text-cuerpo`/`mt-4` per UI-SPEC).

### `docs/aprendizaje/fase-03.md` (docs)

**Analog:** `docs/aprendizaje/fase-01.md` — title `# Fase N: ...`, one `## concept` per section with three bullets: `**Qué es:**`, `**Java:**`, `**Dónde:**` (file paths). Topics from RESEARCH "Project Constraints".

---

## Shared Patterns

### Auth + per-user scoping (backend)
**Source:** `backend/app/auth.py` L43 (`CurrentUserId`), `backend/app/db.py` L21-28 (`SessionDep`), `backend/app/repositories/probe_repo.py` L10.
**Apply to:** every router endpoint and repo query. `user_id` only from the token; every `select` has `Model.user_id == user_id`; cross-user → `HTTPException(404, "Not found")`.

### Transaction / error surfacing (backend)
**Source:** `backend/app/db.py` L21-28:
```python
def get_session() -> Iterator[Session]:
    with SessionLocal() as session, session.begin():
        yield session

# scope="function": el commit corre antes de mandar la respuesta...
SessionDep = Annotated[Session, Depends(get_session, scope="function")]
```
**Apply to:** services. Never call `session.commit()` in app code; call `session.flush()` where a constraint must map to 409 (RESEARCH Pitfall 1). HTTPException propagates and rolls back.

### Literal Tailwind class maps (frontend)
**Source:** `components/ui/CategoryGrid.tsx` L12-24 (`FONDO`), `app/MuestraPage.tsx` L29-41 (`SOLIDO`).
**Apply to:** CategoryGrid tile, CategoriasPage rows, CategoriaSheet color picker. Never `bg-cat-${n}`.

### Inline error + alert (frontend)
**Source:** `components/ui/AmountInput.tsx` L41-42, L60-64 and `LoginPage.tsx` L59-67: `aria-invalid`, `aria-describedby={id-error}`, `<p role="alert" className="mt-1 text-etiqueta font-normal text-peligro">`, border swap `border-peligro` vs `border-borde`.
**Apply to:** NuevoGastoPage fields, CategoriaSheet fields.

### Focus ring
`focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento` (buttons/links) or `has-[:focus-visible]:outline-...` on labels wrapping sr-only radios (`CategoryGrid.tsx` L47). Apply to every new control.

### Network error copy
**Source:** `features/auth/authErrors.ts` L1-2 `NETWORK_ERROR`. Reuse for category load errors; new form-specific messages (gasto/categoría) live in `lib/categorias.ts` or the feature file as constants.

## No Analog Found

| File | Role | Data Flow | Reason / Use instead |
|---|---|---|---|
| `backend/app/services/category_service.py` | service | CRUD + seed | No service layer yet → RESEARCH Patterns 2, 3; module-level functions like `probe_repo.py` |
| `backend/app/services/expense_service.py` | service | CRUD | Same → RESEARCH Pattern 5 |
| Toast (inline in `NuevoGastoPage.tsx` or `components/ui/Toast.tsx`) | component | event-driven | No live-region component exists → RESEARCH Pitfall 10 + UI-SPEC "Toast de confirmación". Keep inline unless reused. |

## Metadata

**Analog search scope:** `backend/app`, `backend/alembic`, `backend/tests`, `frontend/src`, `docs/aprendizaje`
**Files scanned:** ~50 (whole codebase is small; all analogs read in full)
**Pattern extraction date:** 2026-10-31
