# Architecture Research

**Domain:** PWA personal de control de gastos (React+TS / FastAPI / SQLAlchemy / Supabase Postgres + Auth)
**Researched:** 2026-10-29
**Confidence:** MEDIUM-HIGH (verificación JWT y pooler de Supabase confirmados en docs oficiales; el resto son patrones estándar de FastAPI/React conocidos, no re-verificados versión por versión)

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                 FRONTEND (PWA, React + TS + Vite)                │
│  ┌───────────┐ ┌────────────┐ ┌────────────┐ ┌───────────────┐   │
│  │ Auth UI   │ │ Quick-add  │ │ Dashboard  │ │ Historial /   │   │
│  │ (login)   │ │ gasto/ingr │ │ mes actual │ │ editar/borrar │   │
│  └─────┬─────┘ └─────┬──────┘ └─────┬──────┘ └──────┬────────┘   │
│        │      ┌──────┴──────────────┴───────────────┴──────┐     │
│        │      │  api client (fetch + Bearer) + TanStack Query│    │
│        │      └──────────────────────┬──────────────────────┘    │
│  supabase-js (solo auth: sesión, refresh de token)  │            │
│  Service worker (vite-plugin-pwa): cachea el shell estático      │
└────────┬─────────────────────────────┼───────────────────────────┘
         │ login / refresh             │ HTTPS JSON + Authorization: Bearer <access_token>
         ▼                             ▼
┌──────────────────┐   ┌──────────────────────────────────────────┐
│  Supabase Auth   │   │            BACKEND (FastAPI)              │
│  (emite JWT,     │◄──┤  deps: get_current_user_id (verifica JWT  │
│  publica JWKS)   │   │        con JWKS, extrae `sub`)            │
└──────────────────┘   │  routers → services → repositories        │
                       │  schemas (Pydantic)   models (SQLAlchemy) │
                       └──────────────────┬───────────────────────┘
                                          │ SQLAlchemy 2.0 (pooler, sesión)
                                          ▼
                       ┌──────────────────────────────────────────┐
                       │      Supabase Postgres (schema public)    │
                       │ categories │ expenses │ installments │ incomes │
                       │ RLS habilitado SIN policies (bloquea la   │
                       │ Data API; el backend entra como owner)    │
                       └──────────────────────────────────────────┘
```

Regla de dirección: el frontend **nunca** lee/escribe tablas vía supabase-js. supabase-js se usa solo para login y obtener el access token. Todo dato pasa por FastAPI. Una sola fuente de lógica (cuotas, totales) = el backend Python, que es lo que el usuario quiere aprender.

### Component Responsibilities

| Componente | Responsabilidad | Implementación típica |
|---|---|---|
| Auth UI | Login/logout, mantener sesión | `supabase.auth.signInWithPassword` (o magic link), `onAuthStateChange` |
| api client | Un `fetch` wrapper que agrega `Authorization: Bearer` con el token actual y tira error tipado en 4xx/5xx | `src/api/client.ts` (~30 líneas, sin axios) |
| Server state | Cache, refetch e invalidación tras mutaciones | TanStack Query; keys tipo `['summary', '2026-10']` |
| Quick-add | Formulario de gasto en 1 pantalla: monto, categoría, medio de pago, cuotas/mes 1ra cuota si crédito, fecha=hoy | Componente controlado; inputs nativos (`inputmode="decimal"`) |
| Dashboard | Totales por categoría, usado vs. queda, navegación de mes | Lee **un** endpoint `/summary?month=YYYY-MM` |
| Service worker | Instalable + shell offline (no datos offline en v1) | `vite-plugin-pwa` con `generateSW` |
| Auth dependency | Verificar JWT, devolver `user_id: UUID` | `Depends(get_current_user_id)` con PyJWT + `PyJWKClient` |
| Routers | HTTP: validar entrada (Pydantic), códigos de estado, llamar al service | `APIRouter` por recurso |
| Services | Reglas de negocio: dividir cuotas, sembrar categorías, reasignar al borrar categoría, armar resumen | Funciones/clases puras de Python, testeables con pytest |
| Repositories | Queries SQLAlchemy, **siempre filtradas por `user_id`** | Funciones que reciben `Session` + `user_id` |
| Models | Mapeo ORM de tablas | SQLAlchemy 2.0 `Mapped[...]`, `mapped_column` |
| Migrations | Evolución de esquema | Alembic `autogenerate`, revisado a mano |

### Mapeo a capas de Spring (para el usuario)

| Spring / Java | FastAPI / Python en este proyecto | Nota |
|---|---|---|
| `@RestController` | `app/routers/expenses.py` (`APIRouter`) | Decoradores `@router.get(...)` ≈ `@GetMapping` |
| `@Service` | `app/services/expense_service.py` | No hay contenedor IoC: son funciones o clases simples |
| `@Repository` / `JpaRepository` | `app/repositories/expense_repo.py` | Sin métodos derivados mágicos; escribís el `select(...)` |
| `@Entity` (JPA) | `app/models/expense.py` (SQLAlchemy) | `Mapped[int]` ≈ campo tipado con `@Column` |
| DTO + Bean Validation (`@Valid`, `@NotNull`) | `app/schemas/expense.py` (Pydantic `BaseModel`) | Pydantic valida y serializa; FastAPI lo hace automático |
| `@Autowired` / inyección | `Depends(...)` | Inyección por parámetro de función, resuelta por request |
| Spring Security filter + `@AuthenticationPrincipal` | `user_id: UUID = Depends(get_current_user_id)` | Dependencia en cada router (o a nivel `APIRouter(dependencies=...)`) |
| `@Transactional` | `with session.begin():` o commit en la dependencia `get_session` | Una sesión por request |
| `application.yml` | `app/config.py` con `pydantic-settings` + `.env` | |
| Flyway/Liquibase | Alembic | |
| JUnit + MockMvc | pytest + `TestClient` (httpx) | `app.dependency_overrides` ≈ `@MockBean` |

Recomendación de pragmatismo: con 4 tablas, la capa repository es delgada. Mantenerla igual (el usuario viene de Spring y la separación ayuda a testear services), pero **no** crear interfaces/ABCs para repos — Python no las necesita.

## Recommended Project Structure

Monorepo, un solo git repo:

```
control-de-gastos/
├── DESIGN.md                   # Sistema de diseño: dirección visual, paleta, tipografía, tono, componentes, do/don't
├── README.md
├── .planning/
├── backend/
│   ├── pyproject.toml          # deps (uv), config de pytest/ruff
│   ├── .env.example            # DATABASE_URL, SUPABASE_URL, CORS_ORIGINS
│   ├── alembic.ini
│   ├── alembic/versions/
│   ├── app/
│   │   ├── main.py             # FastAPI(), CORS, include_router
│   │   ├── config.py           # Settings (pydantic-settings)
│   │   ├── db.py               # engine, SessionLocal, get_session
│   │   ├── auth.py             # get_current_user_id (JWKS)
│   │   ├── models/             # category.py, expense.py (Expense + Installment), income.py, base.py
│   │   ├── schemas/            # Pydantic: *Create, *Update, *Read, Summary
│   │   ├── repositories/
│   │   ├── services/           # installments.py (split puro), category_service.py, summary_service.py
│   │   └── routers/            # categories.py, expenses.py, incomes.py, summary.py
│   └── tests/
│       ├── test_installments.py  # unit, sin DB
│       └── test_api_*.py         # TestClient + Postgres de test
└── frontend/
    ├── package.json
    ├── vite.config.ts          # + VitePWA({...})
    ├── public/                 # íconos PWA
    └── src/
        ├── main.tsx
        ├── styles/
        │   ├── tokens.css      # CSS custom properties: --color-*, --font-*, --space-*, --radius-*
        │   └── global.css
        ├── lib/supabase.ts     # createClient (solo auth)
        ├── lib/money.ts        # cents <-> string ARS (Intl.NumberFormat 'es-AR')
        ├── api/                # client.ts + un archivo por recurso + types.ts
        ├── features/
        │   ├── auth/
        │   ├── expenses/       # QuickAddForm, ExpenseList, useExpenses
        │   ├── incomes/
        │   ├── categories/
        │   └── dashboard/      # MonthSummary, CategoryBreakdown, UsedVsLeftChart, MonthNav
        └── components/         # botones, inputs, sheet — derivados de DESIGN.md
```

### Structure Rationale

- **backend/ por capas** (no por feature): 4 recursos chicos; capas espejan Spring y el usuario se orienta rápido.
- **frontend/ por feature**: la UI crece por pantalla; cada feature tiene sus componentes + hooks de query.
- **`DESIGN.md` en la raíz + `tokens.css` en frontend**: DESIGN.md es el documento que lee cualquier fase futura (humano o agente) antes de tocar UI; `tokens.css` es la única implementación de esas decisiones. Regla: ningún color/tamaño/fuente literal en componentes — solo `var(--token)`. DESIGN.md referencia los nombres de token, así no divergen.
- **Tipos API**: escribir `src/api/types.ts` a mano en v1 (son ~6 tipos). Generar desde OpenAPI (`openapi-typescript`) es opcional si empiezan a divergir.

## Data Model

```
categories                 expenses (padre)                installments (hijas)          incomes
──────────                 ─────────────────               ────────────────────          ───────
id         UUID PK         id             UUID PK          id          UUID PK            id          UUID PK
user_id    UUID  idx       user_id        UUID idx         expense_id  UUID FK→expenses   user_id     UUID idx
name       text            category_id    UUID FK          user_id     UUID idx           amount_cents BIGINT >0
is_default bool            amount_cents   BIGINT >0 (total)   (ON DELETE CASCADE)          date        DATE
created_at                 description    text null        number      smallint (1..N)    description text null
UNIQUE(user_id, name)      payment_method enum/text        period      DATE (día 1 del mes)  created_at
                           date           DATE             amount_cents BIGINT
                           installments_count smallint ≥1  UNIQUE(expense_id, number)
                           first_period   DATE (día 1)     INDEX(user_id, period)
                           created_at, updated_at
```

### Decisión: materializar cuotas (filas) — no computarlas al leer

**Usar filas `installments`, y generar también 1 fila para gastos sin crédito** (débito/efectivo → `installments_count=1`, `period = primer día del mes de date`).

Por qué:
- **Una sola query de agregación** para todo: "gastos del mes X" = `SUM(installments.amount_cents) WHERE user_id=? AND period=?`. Sin ramas crédito/no-crédito, sin aritmética de meses en SQL.
- El redondeo queda fijo y auditable: se calcula una vez en Python, se guarda, y la suma de cuotas == total siempre (constraint verificable en tests).
- Indexable (`(user_id, period)`), trivial de leer para un principiante.
- Computar al leer obliga a `generate_series` o a traer todos los gastos de crédito potencialmente activos y expandir en Python — más complejo, y cambia el resultado si cambia el algoritmo.

Costo: al **editar** un gasto (monto, cuotas, primer mes) hay que borrar y regenerar sus cuotas. Hacerlo en el service, dentro de la misma transacción. Es ~5 líneas.

Algoritmo de división (service puro, con test):
```python
def split_installments(total_cents: int, count: int, first_period: date) -> list[tuple[int, date, int]]:
    base, remainder = divmod(total_cents, count)
    # el resto de centavos va a la primera cuota para que la suma sea exacta
    return [
        (i + 1, add_months(first_period, i), base + (remainder if i == 0 else 0))
        for i in range(count)
    ]
```
`add_months` sobre fechas día 1 = aritmética de año/mes simple (sin `dateutil`). `first_period` solo puede ser mes de `date` o el siguiente — validar en el schema/service, no solo en el desplegable.

### Dinero: enteros en centavos (`BIGINT amount_cents`)

- DB `BIGINT`, Python `int`, JSON número entero, TS `number` (entero seguro hasta 2^53 — sobra para ARS).
- Por qué no `Numeric` + `Decimal`: es correcto en Python, pero JSON/TypeScript no tienen decimal; terminarías serializando como string o arriesgando floats en el frontend. Centavos enteros son correctos de punta a punta sin trucos.
- Conversión solo en los bordes de UI: `lib/money.ts` parsea el input del usuario ("1.234,50") a centavos y formatea con `Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })`. Nunca `parseFloat(x) * 100` — parsear la parte entera y decimal como strings.
- `CHECK (amount_cents > 0)` en DB + `Field(gt=0)` en Pydantic.

### Categorías por usuario, sembradas en forma perezosa

- No hay tabla `users` propia: `user_id` = `sub` del JWT (UUID de `auth.users`). **No** poner FK a `auth.users` desde Alembic (acopla migraciones al schema `auth` de Supabase; innecesario con un solo usuario).
- Siembra: en `category_service.list_categories(user_id)`, si el usuario tiene 0 categorías, insertar las default (incluida "Otros" con `is_default=True`) y devolverlas. Idempotente gracias a `UNIQUE(user_id, name)`. Evita triggers en `auth.users` y webhooks.
- Borrar categoría con gastos: el service reasigna sus gastos a "Otros" y luego borra. "Otros" no se puede borrar (409). FK `expenses.category_id` con `ON DELETE RESTRICT` como red de seguridad.

### Medio de pago y fechas

- `payment_method`: `text` con `CHECK IN ('debit','credit','cash')` + `Literal[...]`/`StrEnum` en Pydantic. Evitar el tipo `ENUM` nativo de Postgres: Alembic no autogenera bien sus cambios.
- Fechas como `DATE` (sin hora). "Hoy" y "mes actual" los decide el **frontend** en hora local (Argentina) y los manda explícitos (`month=2026-10`). El backend no usa `date.today()` para decidir el mes — evita el bug del servidor en UTC a las 21hs+ de Argentina.
- Validación servidor: si `payment_method != 'credit'` entonces `installments_count == 1`.

## Architectural Patterns

### Pattern 1: Dependencia de autenticación con JWKS

**What:** Cada endpoint de datos recibe `user_id` por `Depends`. Supabase recomienda claves de firma asimétricas (ES256/RS256) y verificación local contra `https://<project>.supabase.co/auth/v1/.well-known/jwks.json`; el secreto HS256 legacy está desaconsejado para verificación local (docs oficiales). El JWKS no devuelve claves si el proyecto sigue con HS256 → **habilitar JWT signing keys asimétricas en el proyecto** al crearlo.
**When to use:** Todas las rutas excepto `/health`.
**Trade-offs:** `PyJWKClient` cachea claves en memoria; Supabase cachea el JWKS 10 min en su edge, no cachear mucho más que eso (rotaciones).

```python
# app/auth.py
import jwt
from jwt import PyJWKClient
from uuid import UUID
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

_jwks = PyJWKClient(f"{settings.supabase_url}/auth/v1/.well-known/jwks.json", lifespan=600)
_bearer = HTTPBearer()

def get_current_user_id(creds: HTTPAuthorizationCredentials = Depends(_bearer)) -> UUID:
    try:
        key = _jwks.get_signing_key_from_jwt(creds.credentials).key
        claims = jwt.decode(
            creds.credentials, key, algorithms=["ES256", "RS256"],
            audience="authenticated", issuer=f"{settings.supabase_url}/auth/v1",
        )
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid token")
    return UUID(claims["sub"])
```
(Confirmar `aud="authenticated"` contra la referencia de claims de Supabase en la fase de auth — la página de JWT no lo documenta explícitamente. MEDIUM.)

Defensa extra para app de un solo usuario: `ALLOWED_USER_IDS` en settings y 403 si `sub` no está — barato y evita que alguien que se registre en tu proyecto Supabase use tu backend. Alternativa: deshabilitar signups en Supabase tras crear tu cuenta (recomendado hacer ambas o al menos la segunda).

### Pattern 2: Repositorios siempre con `user_id`

**What:** Toda función de repo recibe `user_id` y lo pone en el `WHERE`. Buscar por id = `WHERE id=:id AND user_id=:uid`; si no hay fila → 404 (no 403, no filtrar existencia).
**When to use:** Siempre. Es la implementación de "un usuario solo accede a sus datos" — RLS no aplica porque el backend conecta como owner.
**Trade-offs:** Disciplina manual; cubrirla con un test por recurso ("usuario B no ve gasto de A").

```python
def get_expense(session: Session, user_id: UUID, expense_id: UUID) -> Expense | None:
    return session.scalar(select(Expense).where(Expense.id == expense_id, Expense.user_id == user_id))
```

### Pattern 3: Un endpoint de resumen por mes

**What:** `GET /summary?month=YYYY-MM` devuelve todo lo que el dashboard necesita en un viaje:
```json
{ "month": "2026-10", "income_cents": 150000000, "expense_cents": 98000000,
  "left_cents": 52000000, "by_category": [{"category_id": "...", "name": "Super", "total_cents": 40000000}] }
```
Queries (2, agregadas en SQL, no en Python):
```sql
SELECT c.id, c.name, SUM(i.amount_cents) FROM installments i
JOIN expenses e ON e.id = i.expense_id JOIN categories c ON c.id = e.category_id
WHERE i.user_id = :uid AND i.period = :period GROUP BY c.id, c.name;

SELECT COALESCE(SUM(amount_cents),0) FROM incomes
WHERE user_id = :uid AND date >= :period AND date < :next_period;
```
**Trade-offs:** Un endpoint "de pantalla" no es REST puro, pero es lo correcto para mobile (1 request, carga instantánea). La lista de gastos del mes es otro endpoint (`GET /expenses?month=`) que devuelve las **cuotas del mes** con datos del padre ("Heladera 3/12").

### Pattern 4: Sesión por request

```python
# app/db.py
engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(engine, expire_on_commit=False)

def get_session():
    with SessionLocal() as session, session.begin():   # commit al final, rollback si hay excepción ≈ @Transactional
        yield session
```
Recomendación: **SQLAlchemy sync + endpoints `def`** (FastAPI los corre en threadpool). Para un único usuario no hay ganancia con async, y evita que el usuario aprenda `async`/`await`, `AsyncSession` y lazy-loading-async a la vez que Python básico. Si STACK.md elige async, la arquitectura no cambia (solo `AsyncSession` y `await`). Coordinar con STACK.md.

## Data Flow

### Request Flow (cargar gasto en cuotas)

```
Usuario toca "Guardar"
  → QuickAddForm: parsea monto → amount_cents, arma payload
  → useMutation → api.post('/expenses', payload)  [Bearer token de supabase.auth.getSession()]
  → FastAPI: get_current_user_id (JWKS) → ExpenseCreate (Pydantic valida)
  → expense_service.create: valida categoría del usuario, split_installments(), inserta Expense + N Installment
  → commit (una transacción) → 201 ExpenseRead
  ← onSuccess: invalidateQueries(['summary']), (['expenses'])
  ← Dashboard re-fetch /summary?month=... → "te queda $X"
```

### State Management

```
Supabase session (supabase-js, localStorage) ─► token para api client
TanStack Query cache  ◄─ queries (summary, expenses, incomes, categories por mes)
      ▲                          │
      └── invalidate on mutation ┘
Estado local de UI (form, mes seleccionado) ─► useState / query param ?month=
```
No hace falta Redux/Zustand. El mes seleccionado va en la URL (`?month=2026-10`) para que back/forward del navegador funcione como historial.

### Key Data Flows

1. **Login:** supabase-js → Supabase Auth → sesión en localStorage → refresh automático. El backend nunca ve contraseñas.
2. **Primer uso:** `GET /categories` → service detecta 0 → siembra defaults → devuelve.
3. **Editar gasto:** `PUT /expenses/{id}` → service borra cuotas → regenera → misma transacción.
4. **Borrar gasto:** `DELETE /expenses/{id}` → cascade borra cuotas.
5. **Dashboard / historial:** `GET /summary?month=` y `GET /expenses?month=` / `GET /incomes?month=`.

## Scaling Considerations

| Escala | Ajustes |
|---|---|
| 1 usuario (objetivo) | Monolito FastAPI + 1 Postgres. Nada más. |
| Decenas de usuarios | Igual. Abrir signups y quitar allowlist; los índices `(user_id, period)` ya alcanzan. |
| Miles | Fuera de alcance. Primero: pool de conexiones/plan Supabase. |

### Scaling Priorities

1. **Primer cuello real: cold start del hosting gratuito** (backend dormido → primera carga lenta). Es UX, no escala. Mitigar con un skeleton/loader y quizá ping periódico; decidir en la fase de deploy.
2. **Conexiones a Postgres:** usar el pooler de Supabase en **session mode** (puerto 5432 del pooler) para un servidor persistente. Si se usa **transaction mode** (6543), los prepared statements no están soportados: psycopg necesita `prepare_threshold=None`, asyncpg `statement_cache_size=0`, y Supabase recomienda `NullPool` (docs oficiales). La conexión directa de Supabase es IPv6; muchos hostings gratuitos solo IPv4 → por eso el pooler. Alembic: misma URL de session mode.

## Anti-Patterns

### Anti-Pattern 1: Frontend leyendo tablas con supabase-js "porque es más rápido"
**What people do:** Mezclar llamadas directas a Supabase con llamadas a FastAPI.
**Why it's wrong:** Dos fuentes de lógica (cuotas, totales), dos modelos de seguridad (RLS vs. backend), y el schema `public` queda expuesto por la Data API.
**Do this instead:** Solo FastAPI toca datos. **Habilitar RLS sin policies** en todas las tablas (migración Alembic con `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`) para que la Data API con anon key no devuelva nada; el backend conecta con el rol owner/postgres, que bypasea RLS.

### Anti-Pattern 2: `float` para plata
**What people do:** `amount: float` en Pydantic, `parseFloat` en TS.
**Why it's wrong:** 0.1+0.2; totales mensuales que no cierran.
**Do this instead:** `amount_cents: int` en todas las capas; convertir solo en el input/formateo de UI.

### Anti-Pattern 3: Calcular cuotas en el frontend
**What people do:** El form calcula y manda las N cuotas.
**Why it's wrong:** El cliente decide datos contables; edición inconsistente.
**Do this instead:** El cliente manda `amount_cents`, `installments_count`, `first_period`; el backend divide. El form puede mostrar una *preview* ("12 x $10.000") calculada localmente, solo visual.

### Anti-Pattern 4: Mes calculado en el servidor con `date.today()` / UTC
**Why it's wrong:** Entre las 21:00 y 23:59 de Argentina (UTC-3) el servidor ya está en el día/mes siguiente.
**Do this instead:** El cliente manda `date` y `month` explícitos.

### Anti-Pattern 5: Hardcodear estilos en componentes
**Why it's wrong:** La dirección visual se pierde entre milestones.
**Do this instead:** DESIGN.md + `tokens.css`; componentes solo usan `var(--...)`. Cada fase de UI lee DESIGN.md primero.

### Anti-Pattern 6: Service worker cacheando respuestas de la API
**Why it's wrong:** Mostrar "te queda $X" viejo es peor que mostrar un loader. Offline/sync está fuera de alcance.
**Do this instead:** Precache solo del shell estático; API siempre a la red (`NetworkOnly` o sin regla).

## Integration Points

### External Services

| Servicio | Patrón | Notas |
|---|---|---|
| Supabase Auth | supabase-js en frontend; backend solo verifica JWT vía JWKS | Activar claves de firma asimétricas; deshabilitar signups tras crear la cuenta; configurar Site URL/redirects con el dominio del frontend |
| Supabase Postgres | SQLAlchemy vía pooler (session mode) | `sslmode=require`; driver psycopg 3; Alembic usa la misma URL |
| Hosting frontend | Estático (build de Vite) | Necesita HTTPS (requisito PWA); SPA fallback a `index.html` |
| Hosting backend | Proceso uvicorn persistente | CORS: `allow_origins` = dominio del frontend exacto (no `*` — se usa header Authorization) |

### Internal Boundaries

| Límite | Comunicación | Notas |
|---|---|---|
| Frontend ↔ Backend | REST JSON, contrato = OpenAPI de FastAPI (`/docs`) | Tipos TS a mano en v1 |
| Router ↔ Service | Llamada directa con schemas Pydantic / primitivos | El router no hace queries |
| Service ↔ Repository | Llamada directa con `Session` + `user_id` | El service no arma HTTP errors genéricos; lanza excepciones de dominio que el router traduce (o `HTTPException` directo — aceptable a esta escala) |
| `split_installments` | Función pura, sin DB | La pieza con más lógica: test unitario obligatorio (suma exacta, resto, cambio de año dic→ene) |

## Suggested Build Order

Dependencias duras: auth → todo; categorías → gastos; gastos+cuotas → resumen; DESIGN.md/tokens → pantallas con UI real.

1. **Fundación end-to-end (walking skeleton):** monorepo, FastAPI `/health` + `/me` protegido (dependencia JWT), conexión a Supabase Postgres, Alembic con primera migración vacía + RLS, frontend Vite con login supabase-js que llama `/me`. Idealmente desplegado ya (descubre CORS/IPv4/HTTPS temprano). *Riesgo más alto, hacerlo primero.*
2. **Dirección visual + sistema de diseño:** DESIGN.md + `tokens.css` + componentes base (botón, input, select, sheet). Requiere que el usuario instale la skill `frontend-design`. Puede ir en paralelo con 3 (backend).
3. **Categorías + gastos simples (sin cuotas) end-to-end:** modelos, siembra perezosa, CRUD de categorías, alta de gasto con 1 cuota (ya usando tabla `installments`), quick-add en el front. Entrega el core value parcial.
4. **Cuotas de crédito:** `split_installments` + tests, `first_period` (mes actual/siguiente), edición con regeneración, preview en el form.
5. **Ingresos + resumen mensual + dashboard:** `incomes` CRUD, `GET /summary`, totales por categoría, gráfico usado vs. queda, navegación de meses (historial).
6. **Editar/borrar en UI, pulido responsive y PWA:** manifest, íconos, service worker (solo shell), pruebas en celular/tablet/compu, borrado de categoría con reasignación a "Otros".

Fases que probablemente necesiten research específico: 1 (config exacta Supabase JWKS/claims, pooler + hosting gratuito con IPv4), 6 (vite-plugin-pwa e instalación en iOS). Fases 3–5: patrones estándar.

## Sources

- Supabase — JSON Web Tokens (verificación con JWKS, HS256 legacy desaconsejado, cache 10 min): https://supabase.com/docs/guides/auth/jwts (HIGH)
- Supabase — Disabling prepared statements (transaction mode / asyncpg `statement_cache_size=0`): https://supabase.com/docs/guides/troubleshooting/disabling-prepared-statements-qL8lEL (HIGH)
- Supabase — Using SQLAlchemy with Supabase (NullPool en transaction mode): https://supabase.com/docs/guides/troubleshooting/using-sqlalchemy-with-supabase-FUqebT.md (HIGH)
- Supabase — Supavisor FAQ: https://supabase.com/docs/guides/troubleshooting/supavisor-faq-YyP5tI.md (MEDIUM, no leído en detalle)
- FastAPI dependencies / SQLAlchemy 2.0 session-per-request, TanStack Query, vite-plugin-pwa: patrones estándar por conocimiento previo, no re-verificados en esta sesión (MEDIUM)

---
*Architecture research for: PWA personal de control de gastos*
*Researched: 2026-10-29*
