# Phase 3: Categorías y carga rápida de gastos - Research

**Researched:** 2026-10-31
**Domain:** FastAPI + SQLAlchemy 2 (sync) + Alembic + Postgres 17 (schema, idempotent seed, uniqueness) / React 19 + TanStack Query + react-router 8 (fast-entry form)
**Confidence:** HIGH (most claims checked against the codebase, a local PG17, or official docs)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Formulario de gasto
- **D-01:** Pantalla propia a pantalla completa en la ruta `/gasto/nuevo` (no bottom sheet, no el home). El "atrás" del celu sale del formulario.
- **D-02:** Acceso por **botón flotante "+"** abajo a la derecha, visible en las pantallas logueadas.
- **D-03:** Orden de campos: **monto → categoría → descripción → medio de pago → fecha** (elección del usuario; difiere de la propuesta inicial).
- **D-04:** **Autofocus en el monto** al abrir (teclado numérico nativo vía `AmountInput`). En iOS puede requerir un toque; aceptado.
- **D-05:** Botón Guardar **siempre activo**; al tocarlo con datos faltantes muestra el error junto al campo ("Elegí una categoría", monto > 0). Nada de botón deshabilitado sin explicación.

#### Categorías base (CAT-01)
- **D-06:** 7 categorías base: ⚽ Deporte · 🍔 Comida · 🚌 Transporte · 🎉 Salidas · 📺 Suscripciones · 👕 Ropa · 📦 Otros.
- **D-07:** La comodín se llama **"Otros"** (no "Otras"): no se puede borrar (Fase 6) y recibe gastos de categorías borradas.
- **D-08:** Orden en la grilla y en `/categorias`: **alfabético, "Otros" siempre al final**. Las nuevas se intercalan alfabéticamente.
- **D-09:** Colores de las base: uno distinto por categoría de la paleta cerrada `cat-1..cat-10`, a criterio de Claude (que las vecinas en la grilla contrasten).
- **D-10:** Siembra **lazy e idempotente**: si el usuario no tiene categorías, el backend las crea en la primera lectura de categorías. Una restricción única evita duplicados aunque haya recargas o requests concurrentes. Nada de `user_id` fijo en migraciones.

#### Crear y renombrar categorías (CAT-02, CAT-03)
- **D-11:** Pantalla **`/categorias`** con la lista para crear y editar (el borrado va en la Fase 6). Además, el último tile de la grilla del formulario es **"＋ Nueva"**: abre un `BottomSheet`, creás la categoría y queda **elegida**, sin perder lo que estabas cargando.
- **D-12:** Emoji: **grilla curada de ~30 emojis de gastos + campo libre** para el teclado de emojis. El backend valida que sea **un solo emoji** (grafema).
- **D-13:** Color: **se asigna solo** (el color menos usado) y se puede cambiar con una fila de los 10 colores en el mismo sheet.
- **D-14:** Editar = **nombre, emoji y color** en el mismo sheet que crear. "Otros" se puede editar.
- **D-15:** Nombre duplicado (con trim y sin distinguir mayúsculas) → **409** y mensaje "Ya tenés una categoría con ese nombre". Se aplica en la DB, no solo en el código.
- **D-16:** Acceso a `/categorias`: **link en el home** por ahora. La navegación general (tabs o menú) se define en la Fase 5.

#### Confirmación y valores por defecto (GAS-04, GAS-05, GAS-06)
- **D-17:** Confirmación: **toast arriba**, "Anotado: $ 1.234,56 en 🍔 Comida" + frase con humor que rota (voz de DESIGN.md), dura ~3 s y tiene `aria-live`. El formulario queda abierto debajo.
- **D-18:** Al guardar **se conservan el medio de pago y la fecha**. Se vacían el monto, la categoría y la descripción, y el foco vuelve al monto.
- **D-19:** El "último medio de pago usado" sale **del servidor**: el medio del gasto cargado más recientemente (sincroniza entre dispositivos y no necesita tabla nueva). Sin gastos previos → **Débito/Transferencia**.
- **D-20:** **Crédito oculto hasta la Fase 4**: en esta fase el control segmentado muestra 2 opciones (Débito/Transferencia · Efectivo). **GAS-04 queda parcial en la Fase 3 y se completa en la Fase 4.** El modelo de datos igual guarda los 3 valores del enum, para que la Fase 4 no necesite migrar el tipo.
- **D-21:** Fecha: atajos Hoy / Ayer (hora Argentina) + **`input type="date"` nativo, sin límite** (se permiten fechas futuras). El `installment` va en el mes de la fecha elegida.

### Claude's Discretion
- Forma exacta de la API (rutas, schemas Pydantic) y cómo se expone el "último medio" (campo en el GET de categorías, endpoint propio, etc.).
- Largo máximo de la descripción y del nombre de categoría (valores razonables, validados en backend y frontend).
- Contenido de la lista curada de emojis y de las frases del toast.
- Manejo de errores de red al guardar (sin duplicar el gasto; mensaje serio, sin humor).
- Cómo se asigna el color "menos usado" ante empates.

### Deferred Ideas (OUT OF SCOPE)
- Opción Crédito en el control segmentado y su selector de cuotas → Fase 4 (completa GAS-04).
- Navegación general (tabs o menú) → Fase 5, cuando exista el resumen del mes.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CAT-01 | Categorías base precargadas al primer uso (incluida "Otros") | Lazy seed in `GET /categories` using `INSERT ... ON CONFLICT DO NOTHING` over a functional unique index (Pattern 2). Verified on local PG17. |
| CAT-02 | Crear categoría | `POST /categories`, unique index `(user_id, lower(btrim(name) COLLATE pg_c_utf8))` → 409 (Pattern 3). `emoji.is_emoji` for the single-emoji rule (Pattern 4). |
| CAT-03 | Renombrar categoría | `PUT /categories/{id}` (name+emoji+color). Explicit `session.flush()` inside try/except `IntegrityError` → 409 (Pitfall 1). |
| GAS-01 | Gasto con monto es-AR, categoría, descripción opcional, medio, fecha | `POST /expenses` with strict Pydantic body; existing `parseMontoInput` + `aCentavos` already parse "1.234,56". |
| GAS-02 | Monto primero, teclado numérico | Existing `AmountInput` (`inputMode="decimal"`). Needs an `autoFocus` prop and a remount key (Pitfall 3). |
| GAS-03 | Categoría por grilla | Existing `CategoryGrid` plus an optional `onNueva` tile. |
| GAS-04 (partial) | Medio de pago segmentado, último usado preseleccionado | `GET /expenses/last-payment-method` returns the method of the newest `created_at`, defaulting to `debit`. Only `debit` and `cash` are shown and accepted this phase. |
| GAS-05 | Fecha hoy en hora Argentina, atajos Hoy/Ayer, selector | `hoyART()` built on `Intl.DateTimeFormat(...).formatToParts` with `timeZone: 'America/Argentina/Buenos_Aires'`. The client sends `YYYY-MM-DD` and the backend only does `date.replace(day=1)`. |
| GAS-06 | Formulario queda abierto y vacío + confirmación clara | Page-local toast with an always-mounted `role="status"` region. Reset by remounting `AmountInput` (Pattern 6). |
| GAS-09 | Centavos enteros | `BIGINT amount_cents`, Pydantic `int` strict with `gt=0`, JSON int, client `Number(aCentavos(v))`. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Store money as integer cents or Decimal, **never float**. STATE settles this as `BIGINT amount_cents` end to end, and the frontend keeps amounts as strings and does arithmetic in `BigInt`.
- Every request is validated against the authenticated user, and users only see their own data. Queries always use `WHERE id = ? AND user_id = ?`, and a cross-user lookup returns 404.
- SQLAlchemy uses 2.0 style only (`select()`, `Mapped[]`, `DeclarativeBase`). Never `session.query`.
- The frontend never calls `supabase.from(...)`; all data goes through FastAPI. Every new `public` table gets RLS with no policies.
- Tests run against Postgres in Docker, never SQLite. The conftest asserts that the host is localhost.
- No `python-jose`, no `float` columns, no ESLint/typescript-eslint (use oxlint), no openapi-typescript (types are written by hand).
- Mobile first. UI uses tokens only, with category color classes from literal maps (never template literals). Voice follows DESIGN.md: humor only in confirmations and empty states, errors stay serious.
- Use GSD workflow entry points for repo edits.
- Each phase adds `docs/aprendizaje/fase-NN.md` with Java analogies. Phase 3 writes `fase-03.md` covering classes and POO, dataclasses, `Mapped[...]`, `select()`/`Session`, Pydantic requests, router → service → repository, `Enum`/`Literal`.

## Summary

The phase is small and the codebase already holds most of the parts: a model/repo/router pattern with cross-user 404 (`probes`), hand-written Alembic migrations with RLS, a per-request transaction with commit-before-response (`get_session`), and on the frontend `AmountInput`, the es-AR parser `money.ts`, `CategoryGrid`, `SegmentedControl`, `BottomSheet`, the `api()` client and TanStack Query. The work is three tables, five endpoints, two screens, a FAB and a toast. No new frontend dependency is needed. **Do not add react-hook-form**: the form has five controlled fields and the house components already use `value`/`onChange`, so `useState` plus a small `validar()` is less code.

Three technical points carry the risk. They were checked against a local Postgres 17.11:

1. **Case-insensitive uniqueness that also works for accented names.** `lower()` under the `"C"` collation leaves `Á/Ñ` unchanged, so `"Ñandú"` and `"ñandú"` would not collide. PG17's built-in `pg_c_utf8` collation lowercases Unicode the same way on every platform, so the index is `(user_id, lower(btrim(name) COLLATE pg_c_utf8))`. Local test: the second insert of `' ñANDÚ '` returned 0 rows with `ON CONFLICT DO NOTHING`, and a plain insert of `'ÑANDÚ'` raised `uq_..._name`.
2. **Idempotent seed under concurrency.** `INSERT ... ON CONFLICT DO NOTHING` without a conflict target handles every unique index, functional ones included (PG docs). A concurrent second request blocks on the first one's uncommitted index entries and then inserts nothing.
3. **IntegrityError → 409 needs an explicit `session.flush()`.** `get_session` commits *after* the endpoint returns (`scope="function"`), so a unique violation that only surfaces at commit comes back as a 500, not a 409.

**Primary recommendation:** Write migration `0002` by hand: `categories`, `expenses`, `installments`, with text + CHECK for `payment_method`, the `pg_c_utf8` functional unique index, and RLS on all three. Add services `category_service` (seed and color helpers) and `expense_service` (create expense plus one installment, idempotent on a client-generated UUID). Add one backend dependency, `emoji`, for the single-emoji check. Widen CORS to POST/PUT. Extend `api()` with method and body.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| "Hoy"/"Ayer" in ART, month the user sees | Browser | — | ARCHITECTURE.md: the client decides dates in local ART and sends them. The backend never calls `date.today()`. |
| Expense → installment period (`date.replace(day=1)`) | API (service) | DB CHECK day=1 | Business rule, trusted side |
| Parse "1.234,56" → cents | Browser (`money.ts`) | API validates `int > 0` | Parsing is UI. The API is the trust boundary. |
| Category uniqueness (trim + case) | Database (unique index) | API maps to 409 | D-15: enforced in the DB |
| Lazy seed | API (service) | DB unique index | D-10 |
| Single-emoji validation | API (`emoji.is_emoji`) | Browser pre-check (UX only) | D-12: the backend validates |
| Least-used color default | Browser | API validates range 1..10 | The sheet must show the preselected color before the POST |
| Alphabetical order, "Otros" last | Browser (`localeCompare('es')`) | — | Postgres `C` collation sorts accented names wrongly. One line in TS. |
| Last payment method | API + DB | Browser derives the initial state | D-19 |
| Duplicate-save protection | Browser (UUID per draft) | API (idempotent on PK) | Discretion: "sin duplicar el gasto" |
| Anon-key data block | Database (RLS, no policies) | — | Pitfall 1 of PITFALLS.md |

## Standard Stack

### Core (already installed, verified in `pyproject.toml` / `package.json` / `node_modules`)
| Library | Version | Purpose |
|---------|---------|---------|
| FastAPI | >=0.162 | routers |
| SQLAlchemy | >=2.1.6 (sync) | `Mapped[]`, `select()`, `postgresql.insert().on_conflict_do_nothing()` |
| Alembic | >=1.20.1 | hand-written migration `0002` |
| psycopg[binary] | 3.3.6 | driver. `e.orig.diag.constraint_name` identifies which unique index failed. Pulls `tzdata` on win32 (verified in `uv.lock`), so `zoneinfo` works on Windows if ever needed. |
| Pydantic | 2.x | request models, `ConfigDict(strict=True, extra="forbid")` |
| react-router | 8.5.1 | exports `createBrowserRouter`, `Outlet`, `Link`, `useMatch`, `useLocation`, `useNavigate` (verified in `dist/production/index.d.ts`) |
| @tanstack/react-query | 5.105 | `useQuery`, `useMutation`, `setQueryData` |
| zod | 4.6.7 | already used in LoginPage. Optional here; a plain function is enough. |

### Supporting (new)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `emoji` (PyPI) | 2.16.0 (2026-09-16) | `emoji.is_emoji(s)` returns True only when `s` is exactly one emoji, including ZWJ sequences, flags and skin tones, because it is a lookup in the Unicode emoji-test data | Backend validation for D-12. Ships `py.typed`, so it works under mypy strict. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `emoji` | `regex` (mrab) `regex.fullmatch(r"\X", s)` + `\p{Extended_Pictographic}` | One grapheme cluster, but also accepts any pictograph and needs two checks. `emoji` matches the "one emoji" intent exactly. |
| `emoji` | stdlib only | Python 3.13 has no grapheme segmentation or emoji property, so it would be hand-rolled. Rejected. |
| text + CHECK for `payment_method` | native PG `ENUM` | Alembic does not autogenerate enum changes, and `ALTER TYPE ... ADD VALUE` has transaction caveats. ARCHITECTURE.md already chose text + CHECK. D-20 is satisfied because the CHECK lists all 3 values. |
| `useState` form | react-hook-form + zod resolver | Two new deps for five fields, and the house components are controlled already. Revisit in Phase 4 only if the conditional credit fields make the form unwieldy. |
| Client UUID idempotency | Disable the button while saving | `Button loading` already blocks double taps, but it does not cover "request arrived, response lost, user retries". The UUID costs about 5 lines. |

**Installation:**
```bash
cd backend && uv add emoji     # updates pyproject.toml + uv.lock (Render uses `uv sync --frozen`)
```
No frontend installs.

**Version verification:** `emoji` on PyPI: latest 2.16.0, uploaded 2026-09-16, first release 0.1.0 in 2014-08, repository github.com/carpedm20/emoji (checked via the PyPI JSON API this session). `is_emoji` source is `return string in unicode_codes.EMOJI_DATA` (fetched from GitHub master `emoji/core.py`).

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| emoji | PyPI | ~12 yrs (0.1.0 in 2014-08; 2.16.0 in 2026-09) | not checked | github.com/carpedm20/emoji (has `py.typed`) | unavailable (the install of slopcheck was blocked in this environment) | Approved with checkpoint `[ASSUMED]` |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*slopcheck could not run, so `emoji` is tagged `[ASSUMED]`. The planner should gate `uv add emoji` behind a `checkpoint:human-verify`. Evidence that it is legitimate: a 12-year release history, the canonical repository, and a long-standing package name.*

## Architecture Patterns

### System Architecture Diagram

```
 Phone (React SPA)                                   FastAPI (Render)                        Postgres (Supabase)
 ─────────────────                                   ────────────────                        ───────────────────
 FAB "+" (ProtectedLayout) ──► /gasto/nuevo
   │ useQuery ['categories'] ─────── GET /categories ──► auth(JWKS) ─► category_service.list
   │                                                         │ count==0? ── yes ─► INSERT 7 rows ON CONFLICT DO NOTHING ─► categories
   │                                                         └────────────────────► SELECT ... WHERE user_id ◄──────────┘
   │ useQuery ['last-payment-method'] ─ GET /expenses/last-payment-method ─► SELECT payment_method ORDER BY created_at DESC LIMIT 1
   │
   │ user: monto ("1.234,56" → parseMontoInput → "1234.56")
   │       tile tap / "+ Nueva" ─► BottomSheet ─► POST /categories ─► flush ─ IntegrityError(uq name)? ─► 409
   │       desc, medio (debit|cash), fecha (hoyART()/ayer/date input → "YYYY-MM-DD")
   │ Guardar ─► validar() ─ errors? ─► inline messages (D-05)
   │        └─► useMutation POST /expenses {id: draftUUID, amount_cents: Number(aCentavos(v)), ...}
   │                                       ─► expense_service.create
   │                                            ├ same id already mine? ─► return it (retry case)
   │                                            ├ category not mine? ─► 404
   │                                            └ INSERT expense + installment(number=1, period=date[day=1]) ─► commit before response
   │ onSuccess: toast (role=status) · reset monto/cat/desc · new draft UUID · remount AmountInput (autoFocus)
   │ onError: serious inline message, keep data, same UUID so the retry is idempotent
 Anon key ─► /rest/v1/categories|expenses|installments ─► RLS without policies ─► []
```

### Recommended Project Structure (additions only)
```
backend/app/
├── models/category.py, expense.py        # Expense + Installment in expense.py
├── schemas/category.py, expense.py       # Pydantic request/response (new folder)
├── repositories/category_repo.py, expense_repo.py
├── services/category_service.py          # BASE list, seed, uniqueness → 409
├── services/expense_service.py           # create + 1 installment, idempotency
├── routers/categories.py, expenses.py
alembic/versions/0002_categories_expenses.py
backend/tests/test_categories.py, test_expenses.py, test_cors.py (or extend an existing test)
frontend/src/
├── api/types.ts                           # hand-written API types
├── lib/fecha.ts (+ fecha.test.ts)         # hoyART, ayer
├── lib/categorias.ts (+ .test.ts)         # ordenar, colorMenosUsado, esUnEmoji
├── features/expenses/NuevoGastoPage.tsx
├── features/categories/CategoriasPage.tsx, CategoriaSheet.tsx, useCategorias.ts
└── components/ui/Toast.tsx                # only if reused; otherwise inline in NuevoGastoPage
docs/aprendizaje/fase-03.md
```

### Pattern 1: Migration 0002 (hand-written, same style as 0001)
```python
# Source: codebase 0001_probes_rls.py + verified on PG 17.11 locally
def upgrade() -> None:
    op.create_table(
        "categories",
        sa.Column("id", sa.Uuid, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.Uuid, nullable=False),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("emoji", sa.Text, nullable=False),
        sa.Column("color", sa.SmallInteger, nullable=False),
        sa.Column("is_fallback", sa.Boolean, nullable=False, server_default=sa.false()),  # "Otros"
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("color BETWEEN 1 AND 10", name="ck_categories_color"),
        sa.CheckConstraint("char_length(name) BETWEEN 1 AND 40", name="ck_categories_name_len"),
    )
    # pg_c_utf8 (PG17 builtin): Unicode lowercase on every platform. Under "C", lower('Ñ') = 'Ñ'.
    op.execute("CREATE UNIQUE INDEX uq_categories_user_name ON categories "
               "(user_id, lower(btrim(name) COLLATE pg_c_utf8))")
    op.execute("CREATE UNIQUE INDEX uq_categories_user_fallback ON categories (user_id) WHERE is_fallback")

    op.create_table(
        "expenses",
        sa.Column("id", sa.Uuid, primary_key=True),  # client generated (idempotent retries)
        sa.Column("user_id", sa.Uuid, nullable=False),
        sa.Column("category_id", sa.Uuid, sa.ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("amount_cents", sa.BigInteger, nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("payment_method", sa.Text, nullable=False),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("amount_cents > 0", name="ck_expenses_amount"),
        sa.CheckConstraint("payment_method IN ('debit','credit','cash')", name="ck_expenses_method"),
        sa.CheckConstraint("char_length(description) <= 140", name="ck_expenses_desc_len"),
    )
    op.create_index("ix_expenses_user_created", "expenses", ["user_id", sa.text("created_at DESC")])

    op.create_table(
        "installments",
        sa.Column("id", sa.Uuid, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("expense_id", sa.Uuid, sa.ForeignKey("expenses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Uuid, nullable=False),
        sa.Column("number", sa.SmallInteger, nullable=False),
        sa.Column("period", sa.Date, nullable=False),
        sa.Column("amount_cents", sa.BigInteger, nullable=False),
        sa.UniqueConstraint("expense_id", "number", name="uq_installments_expense_number"),
        sa.CheckConstraint("number >= 1", name="ck_installments_number"),
        sa.CheckConstraint("extract(day from period) = 1", name="ck_installments_period_day1"),
        sa.CheckConstraint("amount_cents > 0", name="ck_installments_amount"),
    )
    op.create_index("ix_installments_user_period", "installments", ["user_id", "period"])  # Phase 5 summary
    for t in ("categories", "expenses", "installments"):
        op.execute(f"ALTER TABLE {t} ENABLE ROW LEVEL SECURITY")

def downgrade() -> None:
    op.drop_table("installments"); op.drop_table("expenses"); op.drop_table("categories")
```
`installments_count` and `first_period` are left to Phase 4. That migration adds them with `DEFAULT 1`, which is trivial.

### Pattern 2: Idempotent lazy seed
```python
# Source: PG docs sql-insert ("when omitted, conflicts with all usable constraints (and unique indexes) are handled")
from sqlalchemy.dialects.postgresql import insert as pg_insert

BASE = [  # (name, emoji, color, is_fallback). Colors in the 3-col grid (alphabetical) have contrasting neighbors.
    ("Comida", "🍔", 1, False), ("Deporte", "⚽", 5, False), ("Ropa", "👕", 3, False),
    ("Salidas", "🎉", 7, False), ("Suscripciones", "📺", 2, False), ("Transporte", "🚌", 6, False),
    ("Otros", "📦", 10, True),
]

def list_categories(session: Session, user_id: UUID) -> Sequence[Category]:
    cats = category_repo.list_for_user(session, user_id)
    if cats:
        return cats
    session.execute(pg_insert(Category).values(
        [{"user_id": user_id, "name": n, "emoji": e, "color": c, "is_fallback": f} for n, e, c, f in BASE]
    ).on_conflict_do_nothing())
    return category_repo.list_for_user(session, user_id)  # READ COMMITTED: a new statement sees the other tx's commit
```
Under concurrency, request B sees 0 rows and inserts. Its insert waits on A's uncommitted index entries, then does nothing. B's second SELECT sees A's 7 rows. The seed only runs when the user has 0 categories, and "Otros" can never be deleted (Phase 6), so it runs once per user.

### Pattern 3: Uniqueness → 409 (create and rename share one pattern)
```python
from psycopg.errors import UniqueViolation
from sqlalchemy.exc import IntegrityError

def _flush_or_409(session: Session) -> None:
    try:
        session.flush()  # REQUIRED: without it the violation surfaces at commit (after the endpoint) → 500
    except IntegrityError as e:
        if isinstance(e.orig, UniqueViolation) and e.orig.diag.constraint_name == "uq_categories_user_name":
            raise HTTPException(409, "Ya tenés una categoría con ese nombre") from None
        raise
```
The HTTPException propagates through `get_session`'s `with session.begin()`, which rolls back. Raising HTTPException from the service is a shortcut; replace it with domain exceptions if a non-HTTP caller ever appears.

### Pattern 4: Pydantic request models (strict)
```python
import datetime as dt          # NOT "from datetime import date": a field named `date` would shadow the type
from typing import Annotated, Literal
import emoji
from pydantic import AfterValidator, BaseModel, ConfigDict, Field, StringConstraints

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]

def _one_emoji(v: str) -> str:
    if not emoji.is_emoji(v):
        raise ValueError("Tiene que ser un solo emoji")
    return v

class CategoryIn(BaseModel):              # used for POST and PUT (the sheet always sends all 3)
    model_config = ConfigDict(strict=True, extra="forbid")
    name: Name
    emoji: Annotated[str, AfterValidator(_one_emoji)]
    color: int = Field(ge=1, le=10)

class ExpenseCreate(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")   # strict: rejects 1234.5, "123456" and bool for int
    id: UUID                                                  # client draft UUID
    amount_cents: int = Field(gt=0, le=100_000_000_000)       # ≤ $1.000 millones; far below 2^53
    category_id: UUID
    description: Annotated[str, StringConstraints(strip_whitespace=True, max_length=140)] | None = None
    payment_method: Literal["debit", "cash"]                  # Phase 4 widens to include "credit"
    date: dt.date                                             # strict JSON: "YYYY-MM-DD"
```
Turn an empty description into `None` in the service (`data.description or None`). `extra="forbid"` blocks a smuggled `user_id`.

### Pattern 5: Expense create (one installment, idempotent)
```python
def create_expense(session: Session, user_id: UUID, data: ExpenseCreate) -> Expense:
    if (prev := expense_repo.get(session, user_id, data.id)) is not None:
        return prev                                   # retry of the same draft: no duplicate
    if category_repo.get(session, user_id, data.category_id) is None:
        raise HTTPException(404, "Not found")         # another user's category or one that doesn't exist (no leak)
    exp = Expense(id=data.id, user_id=user_id, category_id=data.category_id,
                  amount_cents=data.amount_cents, description=data.description or None,
                  payment_method=data.payment_method, date=data.date,
                  installments=[Installment(user_id=user_id, number=1,
                                            period=data.date.replace(day=1),
                                            amount_cents=data.amount_cents)])
    session.add(exp)
    session.flush()
    return exp
```
Last method: `session.scalar(select(Expense.payment_method).where(Expense.user_id == user_id).order_by(Expense.created_at.desc(), Expense.id.desc()).limit(1)) or "debit"`. Expose it as `GET /expenses/last-payment-method` → `{"payment_method": "..."}`. In Phase 6, declare it before `/expenses/{id}` in the router.

### Pattern 6: Frontend form state (no RHF)
```tsx
const draftId = useRef(crypto.randomUUID())
const [montoKey, setMontoKey] = useState(0)           // remount AmountInput = clears its internal display state
const [medio, setMedio] = useState<'debit' | 'cash' | null>(null)
const medioActual = medio ?? (last.data?.payment_method === 'cash' ? 'cash' : 'debit') // derive, no useEffect
const [fecha, setFecha] = useState(() => hoyART())
// on success:
setMonto(''); setCategoria(null); setDescripcion('')
draftId.current = crypto.randomUUID(); setMontoKey((k) => k + 1); mostrarToast(...)
// JSX: <AmountInput key={montoKey} autoFocus ... />   (add `autoFocus?: boolean` passthrough to the <input>)
```

### Pattern 7: Date in ART
```ts
// shortcut: hardcoded AR zone; switch to the device zone only if the user ever spends outside Argentina
const TZ = 'America/Argentina/Buenos_Aires'
const FMT = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
export function hoyART(now = new Date()): string {
  const p = Object.fromEntries(FMT.formatToParts(now).map((x) => [x.type, x.value]))
  return `${p.year}-${p.month}-${p.day}`             // formatToParts: does not depend on a locale's date pattern
}
export function ayer(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10)
}
// test: hoyART(new Date('2026-11-01T01:30:00Z')) === '2026-10-31'   // 31/10 22:30 ART
```

### Pattern 8: Small pure helpers (tested)
```ts
export const ordenar = (cs: Categoria[]) =>
  cs.toSorted((a, b) => Number(a.esOtros) - Number(b.esOtros) || a.nombre.localeCompare(b.nombre, 'es'))
export function colorMenosUsado(cs: Categoria[]): ColorCategoria {   // ties → lowest number
  const usos = Array<number>(11).fill(0); cs.forEach((c) => usos[c.color]++)
  let mejor = 1; for (let c = 2; c <= 10; c++) if (usos[c] < usos[mejor]) mejor = c
  return mejor as ColorCategoria
}
// UX pre-check only; the backend decides
export const esUnEmoji = (s: string) =>
  [...new Intl.Segmenter('es', { granularity: 'grapheme' }).segment(s)].length === 1 && /\p{Extended_Pictographic}/u.test(s)
```
Map API → `Categoria` once in the `queryFn` (`name`→`nombre`, `is_fallback`→`esOtros`) so `CategoryGrid` keeps its current interface. `Categoria` gets a new `esOtros` field.

### Anti-Patterns to Avoid
- **`new Date().toISOString().slice(0,10)` for "hoy":** it returns tomorrow from 21:00 ART onward (PITFALLS #4).
- **Seed in a migration or with a fixed `user_id`:** forbidden by D-10.
- **Checking "name exists" in Python only:** races, and D-15 requires the DB. A pre-check is fine for UX but the index is authoritative.
- **Sorting categories in SQL `ORDER BY name`:** with the `C` collation, "Árbol" sorts after "Z". Sort in the client with `localeCompare('es')`.
- **Identifying "Otros" by name:** D-14 lets the user rename it. Use `is_fallback`.
- **Template-literal color classes** (`bg-cat-${n}`): Tailwind will not generate them. Use the existing `FONDO` literal map for the color picker row too.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| "Is this exactly one emoji?" (server) | regex over code-point ranges | `emoji.is_emoji` | ZWJ families, flags, skin tones, keycaps, VS16 |
| Grapheme counting (browser) | `s.length` / `[...s].length` | `Intl.Segmenter` | 👨‍👩‍👧 is 5 code points, 8 UTF-16 units, 1 grapheme (checked: `char_length` = 5) |
| Duplicate-safe insert | SELECT-then-INSERT | `ON CONFLICT DO NOTHING` | race-free |
| Case-insensitive unique | app-level `casefold()` compare | functional unique index with `pg_c_utf8` | DB enforced (D-15), Unicode aware |
| es-AR money parse | new parser | existing `parseMontoInput` + `aCentavos` | already tested, BigInt |
| Timezone date | manual UTC-3 offset | `Intl.DateTimeFormat` with `timeZone` | correct even if AR changes its rules |
| Modal / focus trap | custom overlay | existing `BottomSheet` (`dialog.showModal`) | already accessible |

## Common Pitfalls

### Pitfall 1: Unique violation becomes a 500 instead of a 409
**What goes wrong:** the endpoint returns, then `get_session` commits, the IntegrityError fires there, and the client gets a 500.
**Why:** SQLAlchemy autoflushes lazily, and `SessionDep` commits after the handler (`scope="function"`, which `test_commit_failure_returns_5xx` tests on purpose).
**How to avoid:** call `session.flush()` inside the try in the service (Pattern 3).
**Warning sign:** the duplicate-name test gets a 500.

### Pitfall 2: CORS blocks every write
**What goes wrong:** `main.py` has `allow_methods=["GET"]`, so preflight for POST/PUT from the browser fails. pytest (TestClient sends no preflight) stays green while the phone fails.
**How to avoid:** `allow_methods=["GET", "POST", "PUT"]`. Add a test: `client.options("/categories", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST"})` returns 200 with POST in `access-control-allow-methods`.

### Pitfall 3: AmountInput does not clear after save
**What goes wrong:** `AmountInput` keeps its own `display` state and shows it while focused. Setting the parent value to `''` while focus is on the input (D-18 refocus) keeps showing the old amount.
**How to avoid:** remount with `key={montoKey}` and add an `autoFocus` passthrough (Pattern 6). Remounting also covers D-04.
**Note:** focus after an async save is outside the user gesture, so iOS will not raise the keyboard. D-04 accepts this.

### Pitfall 4: `api()` only does GET
**What goes wrong:** `client.ts` sends no method or body and always calls `res.json()`.
**How to avoid:** `api<T>(path, init?: { method?: string; body?: unknown })`, sending `Content-Type: application/json` and `JSON.stringify(body)` on both the first try and the 401 retry. Keep `ApiError.status`; the UI maps 409 → "Ya tenés una categoría con ese nombre" without parsing the body. Extend `client.test.ts` with a POST case.

### Pitfall 5: Field named `date` shadows the type
**What goes wrong:** `from datetime import date` plus a class attribute `date: Mapped[date]` or Pydantic `date: date`. Later annotations in that class body see the field, not the type. Pydantic documents this clash.
**How to avoid:** `import datetime as dt` and annotate `dt.date`.

### Pitfall 6: Test state leak / TRUNCATE
**What goes wrong:** `db_session` only runs `TRUNCATE probes`, so categories seeded in one test leak into the next. Seed tests then pass or fail depending on order.
**How to avoid:** `TRUNCATE probes, installments, expenses, categories` in the fixture, and make every new test that touches the DB request `db_session`.

### Pitfall 7: Migration not applied before deploy
**What goes wrong:** `render.yaml` auto-deploys on commit, and migrations are run by hand from local (README). Pushing the code first gives 500s on `/categories`.
**How to avoid:** run `alembic upgrade head` against Supabase before pushing to `main`, then run the anon-key curl on all three tables (expect `[]`).

### Pitfall 8: `crypto.randomUUID` is undefined over plain HTTP
**What goes wrong:** it requires a secure context. Testing from the phone at `http://192.168.x.x:5173` breaks the form. localhost and the HTTPS deploy are fine.
**How to avoid:** test on the deploy or on localhost. Do not add a polyfill.

### Pitfall 9: Regex `v` flag and TS target
`/\p{RGI_Emoji}/v` needs ES2024, but `tsconfig.app.json` targets ES2023 and TS errors on the literal. Use the `u` flag with `\p{Extended_Pictographic}` (Pattern 8). The backend is the real check anyway.

### Pitfall 10: Toast is not announced
**What goes wrong:** a live region mounted at the same moment as its text is often not announced.
**How to avoid:** keep a `<div role="status" aria-live="polite">` always mounted and swap its text. Clear and restart the 3 s `setTimeout` on each save. Respect `motion-reduce`.

## Code Examples

The patterns above cover the code. The remaining wiring is:

```tsx
// router.tsx — children of ProtectedLayout (react-router 8 SPA mode, same API as today)
{ path: '/', element: <ProtectedLayout />, children: [
  { index: true, element: <HomePage /> },
  { path: 'gasto/nuevo', element: <NuevoGastoPage /> },
  { path: 'categorias', element: <CategoriasPage /> },
] },
// ProtectedLayout — FAB hidden on the form itself
const enForm = useMatch('/gasto/nuevo')
{!enForm && <Link to="/gasto/nuevo" aria-label="Cargar gasto"
  className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] ... min-h-14 min-w-14">+</Link>}
```
```python
# test: concurrent seed (two real sessions, the second blocks on the first's uncommitted index entries)
def test_seed_concurrent(db_session: Session) -> None:
    s1, s2 = SessionLocal(), SessionLocal()
    list_categories(s1, UUID(USER_A))                       # inserted, not committed
    t = threading.Thread(target=lambda: (list_categories(s2, UUID(USER_A)), s2.commit()))
    t.start(); time.sleep(0.3); s1.commit(); t.join(5)
    assert db_session.scalar(select(func.count()).select_from(Category)) == 7
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `lower(name)` under the DB default collation | `COLLATE pg_c_utf8` (PG17 builtin provider) | PostgreSQL 17 | Unicode case mapping that does not depend on the OS locale. Supabase runs PG17. |
| `datetime.utcnow()` | `datetime.now(UTC)` / `server_default=func.now()` | Python 3.12 deprecation | ruff `DTZ` is already enabled |
| `session.query(...)` | `select()` + `session.scalar(s)` | SQLAlchemy 2.0 | already the house style |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Supabase's database is PG17 and has the `pg_c_utf8` collation | Pattern 1 | Migration 0002 fails on Supabase. Detect with `SELECT version(); SELECT 1 FROM pg_collation WHERE collname='pg_c_utf8';` before applying. Fallback: `COLLATE "und-x-icu"` if ICU exists. Verified only on local `postgres:17` (17.11). |
| A2 | `emoji` package is legitimate and safe (slopcheck could not run) | Package audit | Supply-chain risk. Low given a 12-year history and the canonical repo. |
| A3 | `emoji.is_emoji` returns True for ZWJ sequences, flags and skin tones, and False for "🍔🍕" or "ab" | Pattern 4 | Wrong 422s. Cover with a parametrized test. |
| A4 | Seed colors (Comida 1, Deporte 5, Ropa 3, Salidas 7, Suscripciones 2, Transporte 6, Otros 10) contrast in the 3-col grid | Pattern 2 | Cosmetic. Check on the phone. |
| A5 | Limits: name ≤ 40, description ≤ 140, amount ≤ 100.000.000.000 cents | Pattern 4 | Discretion values. Easy to change. |
| A6 | Pydantic strict JSON accepts a `str` for `UUID` and `"YYYY-MM-DD"` for `date` | Pattern 4 | Cited from the Pydantic conversion table. A test POST confirms it. |

## Open Questions

1. **Does Supabase's DB actually have `pg_c_utf8`?** (A1) Recommendation: the first task of the migration plan runs the two-line check above against Supabase, behind a human checkpoint since it touches prod read-only.
2. **`uv` is not on PATH in the agent's shell.** `backend/.venv` was created by uv 0.13.6, but `uv` is not found in bash or PowerShell here. `uv add emoji` must update `uv.lock` (Render uses `--frozen`). Recommendation: the executor locates uv (or asks the user to run `uv add emoji`). Do not fall back to `pip install`.
3. **409 message for a duplicate when creating from the form's sheet:** use the same message and keep the sheet open. No research gap.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker + `postgres:17` test DB (port 5433) | backend tests | ✓ (container up, healthy) | Docker 28.5.1 / PG 17.11 | — |
| Backend venv | pytest/ruff/mypy | ✓ | Python 3.13.2. `.venv/Scripts/python.exe -m pytest` → 22 passed in 0.42 s | — |
| `uv` CLI | `uv add emoji`, lockfile | ✗ on this shell's PATH | venv made by 0.13.6 | user runs it in their terminal (checkpoint) |
| Node / npm | frontend tests/build | ✓ | Node 26.13.0 / npm 11.20 (meets ≥24) | — |
| Supabase (prod) | apply 0002, anon curl | not probed (prod) | — | human step |
| Real phone | GAS-02/03/06 UAT | human | — | — |

**Missing dependencies with no fallback:** none that block code. The `uv` lock update needs the user's terminal.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest 9.2 (backend, real Postgres 17 in Docker via `alembic upgrade head` in a session fixture); Vitest 5 (frontend, `environment: 'node'`, only `src/**/*.test.ts`; no jsdom or testing-library installed) |
| Config file | `backend/pyproject.toml` `[tool.pytest.ini_options]`; `frontend/vite.config.ts` `test` |
| Quick run command | `cd backend && .venv/Scripts/python.exe -m pytest -x -q` (or `uv run pytest -x -q`) · `cd frontend && npm test` |
| Full suite command | backend: `uv run pytest && uv run ruff check . && uv run mypy app` · frontend: `npm test && npm run lint && npm run build` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CAT-01 | first GET seeds 7 incl. Otros (`is_fallback`); 2nd GET still 7 | integration | `pytest tests/test_categories.py -k seed -x` | ❌ Wave 0 |
| CAT-01 | concurrent seed → 7, no error | integration | `pytest tests/test_categories.py::test_seed_concurrent -x` | ❌ |
| CAT-02 | POST 201; `"  comida "` → 409 with message; `"ÑANDÚ"` vs `"ñandú"` → 409; emoji `"ab"`, `"🍔🍕"` → 422, `"👨‍👩‍👧"` → 201; color 11 → 422 | integration | `pytest tests/test_categories.py -k create -x` | ❌ |
| CAT-03 | PUT renames; PUT to an existing name → 409; another user's id → 404 | integration | `pytest tests/test_categories.py -k rename -x` | ❌ |
| GAS-01 | POST /expenses 201; another user's category → 404; extra `user_id` → 422; amount 0 / 12.5 / "123" → 422; `credit` → 422 (Phase 3); no description OK | integration | `pytest tests/test_expenses.py -x` | ❌ |
| GAS-09 | 123456 stored and returned as 123456; one installment with the same amount | integration | `pytest tests/test_expenses.py -k cents -x` | ❌ |
| GAS-09 | `aCentavos(parseMontoInput('1.234,56').value) === 123456n` | unit | `npm test -- money` | ✅ file exists, add case |
| GAS-05 | `hoyART(2026-11-01T01:30Z)` → `2026-10-31`; `ayer('2026-03-01')` → `2026-02-28` | unit | `npm test -- fecha` | ❌ |
| GAS-05 | POST date `2026-10-31` → installment period `2026-10-01`; `2026-12-31` → `2026-12-01` | integration | `pytest tests/test_expenses.py -k period -x` | ❌ |
| GAS-04 | last method: none → debit; after cash → cash; newest `created_at` wins | integration | `pytest tests/test_expenses.py -k last_payment -x` | ❌ |
| GAS-06 | same `id` POSTed twice → 1 expense, 1 installment | integration | `pytest tests/test_expenses.py -k idempotent -x` | ❌ |
| D-08/D-13 | `ordenar` (Otros last, accents), `colorMenosUsado` ties → lowest | unit | `npm test -- categorias` | ❌ |
| api | `api()` POST sends method, body and JSON header, and retries the body on 401 | unit | `npm test -- client` | ✅ extend |
| SC5 | all `public` tables have RLS | integration | `pytest tests/test_rls.py` | ✅ (covers new tables automatically) |
| SC5 | anon curl to `/rest/v1/{categories,expenses,installments}` → `[]` | manual | `curl https://<ref>.supabase.co/rest/v1/expenses -H "apikey: <publishable>"` | manual |
| CORS | preflight POST/PUT allowed | integration | `pytest tests/test_cors.py -x` | ❌ |
| GAS-02/03/06 | numeric keyboard, autofocus, grid tap, toast, form reset on a real phone | manual UAT | — | manual |

### Sampling Rate
- **Per task commit:** backend `pytest -x -q` (<2 s today) or frontend `npm test`
- **Per wave merge:** full suite, both sides, plus `npm run build` (tsc catches TS issues)
- **Phase gate:** full suite green, then the Supabase migration, the anon curl, and phone UAT before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/tests/conftest.py`: extend TRUNCATE to the 3 new tables
- [ ] `backend/tests/test_categories.py`, `test_expenses.py`, CORS preflight test
- [ ] `frontend/src/lib/fecha.test.ts`, `categorias.test.ts`; extend `money.test.ts` and `client.test.ts`

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (inherited) | `CurrentUserId` (JWKS, fixed algorithms, allowlist), unchanged |
| V3 Session Management | no (Supabase handles it) | — |
| V4 Access Control | yes | every repo query filters `user_id`; `category_id` in an expense is checked for ownership → 404; PUT on another user's category → 404; RLS without policies on all 3 tables |
| V5 Input Validation | yes | Pydantic `strict=True`, `extra="forbid"`, length limits, `Literal` method, `emoji.is_emoji`; DB CHECKs as a second line |
| V6 Cryptography | no | — |
| V14 Config | yes | CORS: add only POST/PUT, keep the origin allowlist |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR: expense pointing at another user's category | Tampering / Info disclosure | ownership check in the service; 404 that reveals nothing; test |
| Mass assignment (`user_id` in body) | Elevation | `extra="forbid"`; `user_id` only from the token |
| Client-supplied expense `id` that collides with another user's row | Tampering | the lookup filters by `user_id`, so the insert then fails on the PK (500, nothing leaks). UUIDv4 collisions are not realistic and only 2 allowlisted users exist. |
| Stored XSS via category name or emoji | Tampering | React escapes text; never `dangerouslySetInnerHTML` |
| Oversized payloads | DoS | `max_length` 40/140, amount upper bound |
| Data API bypass | Info disclosure | RLS enabled (test_rls plus manual curl) |

## Sources

### Primary (HIGH confidence)
- Codebase: `backend/app/{db,main,auth}.py`, `models/probe.py`, `alembic/versions/0001_probes_rls.py`, `tests/conftest.py`, `frontend/src/{api/client.ts, lib/money.ts, components/ui/*.tsx, app/*.tsx}`, `tsconfig.app.json`, `render.yaml`, `uv.lock`
- Local PostgreSQL 17.11 (Docker): `lower()` under `C` vs `pg_c_utf8`, a functional unique index with `ON CONFLICT DO NOTHING`, emoji `char_length`
- https://www.postgresql.org/docs/17/sql-insert.html: a DO NOTHING without a conflict target handles all unique indexes
- https://pydantic.dev/docs/validation/latest/concepts/conversion_table/: strict JSON for int, date, UUID and Literal
- https://raw.githubusercontent.com/carpedm20/emoji/master/emoji/core.py and https://carpedm20.github.io/emoji/docs/api.html: `is_emoji` semantics; `py.typed` present in the repo
- PyPI JSON API (`pypi.org/pypi/emoji/json`): version 2.16.0, release history

### Secondary (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md` and `PITFALLS.md` (project research, aligned with the above)
- WebSearch on Postgres C vs C.UTF-8 `lower()` behavior (pgsql-hackers patch threads, bug #16286), consistent with the local test

### Tertiary (LOW confidence)
- None used for recommendations.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH. Everything except `emoji` is already installed, and `emoji` was verified on PyPI and GitHub.
- Architecture: HIGH. It extends existing patterns, and the DB behavior was tested locally.
- Pitfalls: HIGH. Pitfalls 1–4 and 6–7 come straight from the current code.

**Research date:** 2026-10-31
**Valid until:** 2026-11-30
