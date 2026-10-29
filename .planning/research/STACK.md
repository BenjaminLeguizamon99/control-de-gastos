# Stack Research

**Domain:** PWA personal de control de gastos (FastAPI + Supabase + React)
**Researched:** 2026-10-29
**Confidence:** HIGH en versiones (verificadas contra PyPI/npm el 2026-10-29), MEDIUM en el hosting

> Stack **bloqueado** por el usuario: FastAPI + SQLAlchemy 2.x + Alembic, Postgres y Auth de Supabase, React + TS + Vite como PWA. Este documento elige *dentro* de ese stack: versiones exactas, librerías de soporte y hosting gratis.

## Recommended Stack

### Core Technologies — Backend

| Technology | Version | Purpose | Why Recommended | Conf. |
|------------|---------|---------|-----------------|-------|
| Python | 3.13 (3.14 también sirve) | Runtime | SQLAlchemy 2.1 exige >=3.11. 3.13 tiene wheels para todo el stack sin sorpresas. | HIGH |
| uv | 0.13.x | Gestor de proyecto, venv, lockfile, versión de Python | Reemplaza pip + venv + pyenv + poetry con una sola herramienta muy rápida. Analogía Java: Maven/Gradle + wrapper. `pyproject.toml` ≈ `pom.xml`, `uv.lock` ≈ dependencias resueltas y fijadas. | HIGH |
| FastAPI | 0.162.x (`fastapi[standard]`) | Framework HTTP | Stack bloqueado. `[standard]` trae uvicorn, el CLI `fastapi dev` y httpx. Analogía: Spring Boot Web con validación al estilo Bean Validation (vía Pydantic) y OpenAPI automático. | HIGH |
| Pydantic | 2.14.x | DTOs y validación de request/response | Viene con FastAPI. Los modelos Pydantic son los DTOs (≈ `record` + `@Valid`). Usar `Decimal` para los montos. | HIGH |
| pydantic-settings | 2.16.x | Config desde variables de entorno / `.env` | ≈ `@ConfigurationProperties`. Tipa y valida `DATABASE_URL`, `SUPABASE_URL`, etc. al arrancar. | HIGH |
| SQLAlchemy | 2.1.x (async: `sqlalchemy[asyncio]`) | ORM | Stack bloqueado. Usar el estilo 2.0 (`Mapped[...]`, `mapped_column`, `select()`). ≈ JPA/Hibernate; `AsyncSession` ≈ `EntityManager`. | HIGH |
| psycopg (v3) | 3.3.x (`psycopg[binary]`) | Driver de Postgres | **Elegido en vez de asyncpg** porque un mismo driver sirve en modo async (para la app) y sync (para Alembic): URL `postgresql+psycopg://`. Con asyncpg hace falta un segundo driver o el template async de Alembic. ≈ el driver JDBC. | HIGH |
| Alembic | 1.20.x | Migraciones | Stack bloqueado. ≈ Flyway/Liquibase, con autogeneración de diffs a partir de los modelos. Revisar siempre a mano la migración autogenerada. | HIGH |
| PyJWT | 2.15.x (`pyjwt[crypto]`) | Verificar el JWT de Supabase | `PyJWKClient` descarga y cachea el JWKS de Supabase y valida por `kid`. El extra `[crypto]` es **obligatorio** para ES256/RS256. Es lo que usan los docs actuales de FastAPI. | HIGH |
| Uvicorn | 0.54.x | Servidor ASGI | Viene con `fastapi[standard]`. ≈ el Tomcat embebido. | HIGH |

### Core Technologies — Frontend

| Technology | Version | Purpose | Why Recommended | Conf. |
|------------|---------|---------|-----------------|-------|
| Node.js | 24 LTS | Toolchain | Vitest 5 pide >=22.12, React Router 8 pide >=22.22, Vite 8 pide >=20.19. Node 24 LTS cumple todo. | HIGH |
| Vite | 8.3.x | Dev server y build | Stack bloqueado. Arrancar con `npm create vite@latest -- --template react-ts`. | HIGH |
| React | 19.3.x | UI | Stack bloqueado. | HIGH |
| TypeScript | 7.0.x (lo que traiga el template) | Tipado | El template oficial de create-vite fija `~7.0.2` (el compilador nativo nuevo, mucho más rápido). Ver la tabla de compatibilidad: algunas herramientas todavía declaran soporte solo hasta TS 6. | HIGH |
| vite-plugin-pwa | 2.0.x | Manifest, service worker (Workbox) e instalabilidad | Es el estándar para PWA en Vite y soporta Vite 8. Usar `registerType: 'autoUpdate'` y precache del app shell. | HIGH |
| @supabase/supabase-js | 2.118.x | **Solo auth** (login, sesión, refresh del token) | Se usa `supabase.auth.*` y se manda `session.access_token` como `Authorization: Bearer` a FastAPI. **No** usar `supabase.from(...)`: todos los datos pasan por el backend. | HIGH |
| @tanstack/react-query | 5.x (5.105) | Fetching, cache e invalidación | Estándar de facto para server state. Invalidar `['month', yyyy-mm]` después de cada alta, edición o borrado hace que "cuánto me queda" se actualice solo. | HIGH |
| react-router | 8.5.x (modo declarativo/SPA) | Routing | Solo hay 3 o 4 vistas (mes actual, cargar, categorías, login). Usar el modo SPA (`createBrowserRouter`), **no** el modo framework/SSR. | MEDIUM: v8 es reciente, confirmar la API en los docs al implementar |

### Supporting Libraries

| Library | Version | Purpose | When to Use | Conf. |
|---------|---------|---------|-------------|-------|
| react-hook-form | 7.91.x | Formularios (gasto, ingreso, categoría) | El form de gasto tiene campos condicionales (cuotas y mes de la primera cuota solo si es crédito). RHF los maneja sin re-renders. | HIGH |
| zod | 4.x (4.6) | Esquemas de validación en el cliente | Junto con `@hookform/resolvers` 6.x. ≈ Bean Validation del lado del cliente. El backend igual valida todo (Pydantic) porque es la frontera de confianza. | HIGH |
| @hookform/resolvers | 6.0.x | Conecta zod con RHF | Soporta zod ^4. | HIGH |
| recharts | 3.10.x | Gráfico de usado vs. restante y totales por categoría | API declarativa en JSX, soporta React 19 y alcanza para una dona o barras. Liviano comparado con alternativas tipo ECharts. | HIGH |
| tailwindcss + @tailwindcss/vite | 4.3.x | Estilos mobile first | Los tokens de diseño (paleta, tipografía) de la skill `frontend-design` se definen como variables CSS en `@theme` y quedan documentados en un solo lugar. Es neutral respecto de la estética, no impone un look. | MEDIUM: puede ajustarse según lo que decida la fase de diseño |
| date-fns | 4.x | Aritmética de meses en el cliente (navegación, etiquetas "mes actual/siguiente") | Solo si hace falta. Formatear con `Intl.DateTimeFormat('es-AR')` y montos con `Intl.NumberFormat('es-AR', {style:'currency', currency:'ARS'})`, ambos nativos. | MEDIUM |
| python-dateutil (`relativedelta`) | stdlib + opcional | Sumar meses para las cuotas en el backend | Hace falta sumar N meses para repartir las cuotas. Con `date` y aritmética de (año, mes) alcanza en unas pocas líneas; agregar dateutil solo si se complica. | MEDIUM |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| pytest 9.2.x | Tests del backend | ≈ JUnit 5. Las fixtures (`conftest.py`) ≈ `@BeforeEach` + inyección. |
| pytest-asyncio 1.4.x | Tests async | Poner `asyncio_mode = "auto"` en `pyproject.toml` para no decorar cada test. |
| httpx 0.28.x | Cliente para tests de la API | `httpx.AsyncClient(transport=ASGITransport(app=app))` ≈ MockMvc. Para el auth, sobreescribir la dependencia `get_current_user` con `app.dependency_overrides` y no generar tokens reales. |
| ruff 0.17.x | Lint + formatter | Reemplaza flake8, black e isort. ≈ Checkstyle + formatter. |
| mypy 2.x (opcional) | Chequeo de tipos estático | Útil para un dev Java: hace que los type hints se comporten como tipos de verdad. Activarlo en el CI cuando haya código. |
| Postgres local (Docker) o un proyecto Supabase aparte para tests | DB de test | Recomendación: tests contra un Postgres real en Docker (`postgres:17`) para que `NUMERIC` y las fechas se comporten igual que en prod. **No** usar SQLite para tests porque `Decimal` y las funciones de fecha difieren. testcontainers 4.15 es opcional. |
| oxlint | Lint del frontend | Viene en el template actual de create-vite. Usarlo en vez de armar ESLint + typescript-eslint (ver compatibilidad). |
| Vitest 5.x + @testing-library/react 16.x | Tests del frontend | Solo para la lógica no trivial (formateo, preview de cuotas en el form). No hace falta testear cada componente. |

## Installation

```bash
# Backend
uv init backend --python 3.13 && cd backend
uv add "fastapi[standard]" "sqlalchemy[asyncio]" "psycopg[binary]" alembic "pyjwt[crypto]" pydantic-settings
uv add --dev pytest pytest-asyncio httpx ruff mypy
uv run alembic init -t async migrations   # o el template sync con la misma URL psycopg
uv run fastapi dev app/main.py

# Frontend
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install @supabase/supabase-js @tanstack/react-query react-router react-hook-form zod @hookform/resolvers recharts
npm install -D vite-plugin-pwa tailwindcss @tailwindcss/vite vitest @testing-library/react jsdom
```

## Decisiones clave (detalle)

### 1. Verificación del JWT de Supabase (signing keys asimétricas / JWKS)
- Supabase hoy recomienda **signing keys asimétricas** (P-256/**ES256** preferido sobre RS256). El JWT secret legacy HS256 está marcado como "No longer recommended" y solo queda por compatibilidad. **Acción en la Fase 1:** en el dashboard (Settings → JWT Keys) confirmar que el proyecto usa signing keys asimétricas y, si no, migrarlo.
- JWKS: `https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json`. Si el proyecto sigue en HS256, ese endpoint **no devuelve claves** (es la señal de que falta migrar).
- Patrón en FastAPI (≈ un filtro de Spring Security, pero como dependencia inyectada):

```python
jwks = jwt.PyJWKClient(f"{settings.supabase_url}/auth/v1/.well-known/jwks.json", cache_keys=True)

def get_current_user_id(creds: HTTPAuthorizationCredentials = Depends(HTTPBearer())) -> UUID:
    try:
        key = jwks.get_signing_key_from_jwt(creds.credentials)
        claims = jwt.decode(creds.credentials, key, algorithms=["ES256", "RS256"],
                            audience="authenticated", issuer=f"{settings.supabase_url}/auth/v1")
    except jwt.PyJWTError:
        raise HTTPException(401)
    return UUID(claims["sub"])
```

- Validar `exp` (PyJWT lo hace solo), `iss`, `aud` y `sub`. **Fijar la lista `algorithms`** y nunca leerla del header. Confianza: `aud="authenticated"` e `iss=.../auth/v1` son MEDIUM (vienen de tokens conocidos de Supabase y los docs no lo dicen explícito). Verificar con un token real en la Fase 1.
- Caché: el edge de Supabase cachea el JWKS 10 minutos. Antes de rotar claves, esperar a que la clave standby esté publicada.
- Como alternativa se puede no validar localmente y llamar a `GET /auth/v1/user` en cada request. Es más lento y agrega dependencia de red, así que solo conviene como fallback.

### 2. Async + psycopg 3 + pooler de Supabase
- **Async** (`create_async_engine("postgresql+psycopg://...")`, endpoints `async def`). Al usuario le interesa aprender async y es lo idiomático en FastAPI. Analogía: corrutinas ≈ virtual threads, pero cooperativas: un `await` cede el control, y una llamada bloqueante dentro de un `async def` traba todo el servidor.
- **Qué conexión usar:** la conexión directa del free tier es **solo IPv6**, y Render y la mayoría de los PaaS gratis salen por IPv4. Usar el **shared pooler en session mode (puerto 5432)**, que es IPv4 y **soporta prepared statements**, así que no hace falta tocar el driver.
- Si en algún momento se usa **transaction mode (puerto 6543)**, hay que desactivar los prepared statements: con psycopg `connect_args={"prepare_threshold": None}` y con asyncpg `statement_cache_size=0`. Si no, aparecen errores intermitentes.
- Pool chico (`pool_size=5, max_overflow=0, pool_pre_ping=True`). El free tier tiene un límite bajo de conexiones y el pooler en session mode ocupa una conexión real por cliente.
- **Windows (entorno del usuario):** psycopg async no funciona con el `ProactorEventLoop` por defecto de Windows. En dev local hay que forzar `asyncio.WindowsSelectorEventLoopPolicy()` o correr con `uvicorn --loop` de tipo selector. Confianza MEDIUM: es una limitación conocida de psycopg 3, verificarla al primer arranque. En Linux (prod) no aplica.

### 3. Dinero en ARS
- Postgres `NUMERIC(14,2)` ↔ `Decimal` en SQLAlchemy y Pydantic (≈ `BigDecimal`). Nunca `float`. Pydantic serializa `Decimal` a JSON como **string**, lo cual es correcto: en el frontend se trata como string o se convierte para mostrar, y no se hacen cuentas de plata en JS.
- Reparto de cuotas: `quantize(Decimal("0.01"), ROUND_DOWN)` por cuota y el resto de centavos se suma a la primera, de modo que la suma de las cuotas dé exacto el total. Esto necesita test unitario.

## Hosting gratuito

| Pieza | Recomendado | Por qué | Conf. |
|-------|-------------|---------|-------|
| Frontend (estático + PWA) | **Cloudflare Pages** (alternativa: Vercel/Netlify) | CDN global, HTTPS (que la PWA necesita), builds de Vite desde GitHub y un free tier generoso para un sitio estático. Configurar el fallback SPA a `index.html`. | MEDIUM |
| Backend FastAPI | **Render (free web service)** | Sin tarjeta y deploy desde GitHub. El free web service **se apaga tras 15 min sin tráfico** y despertarlo tarda **~1 minuto**. Tiene 750 h/mes. | HIGH (docs de Render) |
| DB + Auth | Supabase free | Bloqueado. **No usar Render Postgres free porque expira a los 30 días.** | HIGH |

**Impacto del cold start en el core value ("cargar un gasto en segundos").** La PWA cachea el app shell, así que la UI abre al instante, pero el primer request después de un rato inactivo puede tardar ~1 minuto. Mitigaciones en orden de costo:
1. Mostrar un estado "conectando…" y dejar armar el formulario mientras el backend despierta (se puede disparar un `GET /health` apenas abre la app).
2. Un ping externo gratuito (cron-job.org o un cron de GitHub Actions) a `/health` cada ~10 min durante el día. Esto consume las 750 h, que alcanzan para 1 servicio 24/7 en un mes de 31 días (744 h).
3. Si molesta, pasar a **Google Cloud Run** (free tier por requests, cold start de segundos, pide tarjeta) o a Render paid (~US$7/mes).

**Supabase free pausa los proyectos tras ~1 semana sin actividad** (confianza MEDIUM: es la política conocida y conviene verificarla en la página de pricing). Con uso diario no pasa, y el ping a `/health` puede hacer una query trivial para mantenerlo activo.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| psycopg 3 | asyncpg 0.32 | Si se necesita el máximo rendimiento async. Para un usuario es irrelevante y obliga a un segundo driver o a configurar Alembic en async. |
| Async SQLAlchemy | Sync SQLAlchemy (`def` endpoints, FastAPI los corre en threadpool) | Si async se vuelve una fuente de bugs para aprender: es más parecido a JPA clásico y con psycopg el cambio es solo de engine/session. |
| uv | Poetry | Solo si el proyecto ya usara Poetry. uv es más rápido y además maneja la versión de Python. |
| PyJWT | `supabase-py` + `auth.get_claims()` | Si se prefiere delegar la verificación al SDK. Suma una dependencia grande para algo que son 10 líneas. |
| Render | Cloud Run / Koyeb | Cloud Run si el cold start de Render es inaceptable y hay tarjeta. El free tier actual de Koyeb no lo pude confirmar (LOW). |
| Cloudflare Pages | Vercel / Netlify | Son equivalentes para un SPA estático, así que vale cualquiera de los tres. |
| TanStack Query | SWR | No hay motivo para elegirlo: TanStack tiene mejores mutations e invalidación. |
| Recharts | Chart.js (react-chartjs-2), Nivo | Chart.js si se quiere canvas en lugar de SVG. No hace falta para 2 gráficos. |
| Hand-written TS types | openapi-typescript 7.13 + openapi-fetch | Cuando la API crezca. Hoy declara peer `typescript ^5.x` (conflicto con TS 7, aunque como CLI probablemente funcione). Son pocos endpoints, alcanza con tipos a mano. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `python-jose` | Mantenimiento históricamente flojo. FastAPI migró sus docs a PyJWT. | `pyjwt[crypto]` |
| Verificar con el JWT secret legacy (HS256) | Supabase lo desaconseja y la rotación rompe el código. | Signing keys asimétricas + JWKS |
| `float` para montos (Python o columnas `REAL`/`DOUBLE`) | Errores de redondeo en la plata, una restricción explícita del proyecto. | `NUMERIC` + `Decimal` |
| SQLAlchemy estilo 1.x (`session.query(...)`, `declarative_base()`) | Legacy. Muchos tutoriales viejos lo usan y confunden. | Estilo 2.0: `select()`, `DeclarativeBase`, `Mapped[]` |
| `supabase.from('tabla')` en el frontend / RLS como única defensa | Saltea el backend FastAPI (que es el objetivo de aprendizaje) y duplica la lógica de autorización. | Todo por la API. Filtrar siempre por `user_id` del token. Activar igual RLS sin policies en las tablas para que la anon key no pueda leer nada directo. |
| Conexión directa a Supabase desde Render | Es IPv6-only en el free tier y falla desde hosts IPv4. | Shared pooler session mode, puerto 5432 |
| Render Postgres free | Se borra a los 30 días (+14 de gracia). | Supabase Postgres |
| SQLite para tests | Semántica distinta de `NUMERIC` y fechas. Tests verdes que fallan en prod. | Postgres en Docker |
| Create React App | Está muerto. | Vite |
| React Router en modo framework (SSR/loaders de servidor) | No hay servidor Node y la PWA es estática. | Modo SPA / data router del lado del cliente |
| ESLint + typescript-eslint hoy | typescript-eslint 8.72 declara `typescript >=4.8.4 <6.1.0` y el template trae TS 7. | oxlint (del template) |
| Bajar o subir libs de Vite sueltas sin chequear peers | `@vitejs/plugin-react` 6 exige `vite ^8`. | Mantener Vite 8 + plugin-react 6 |

## Stack Patterns by Variant

**Si el cold start de Render molesta en el uso diario:**
- Primero el ping a `/health`. Si no alcanza, Cloud Run.
- Por qué: el core value es la velocidad de carga.

**Si async complica el aprendizaje:**
- Pasar a sync SQLAlchemy + psycopg sync con `def` endpoints.
- Por qué: con psycopg el modelo, los repositorios y Alembic no cambian.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| sqlalchemy 2.1.x | Python >=3.11 | Usar 3.13. |
| pydantic-settings 2.16 | Python >=3.11 | Igual que arriba. |
| @vitejs/plugin-react 6.1 | vite ^8 | El template ya los alinea. |
| vite-plugin-pwa 2.0 | vite 3–8, Node >=20.19 | OK. |
| vitest 5.0 | vite 6–8, Node ^22.12 / ^24 / >=26 | Usar Node 24 LTS. |
| react-router 8.5 | react >=19.2.7, Node >=22.22 | Node 24 LTS. |
| @hookform/resolvers 6.0 | zod ^3.25 \|\| ^4, react-hook-form ^7.55 | OK. |
| typescript 7.0 | typescript-eslint (<6.1), openapi-typescript (peer ^5) | **Conflicto.** Por eso se usan oxlint y tipos a mano. Si hiciera falta, bajar a TS `~6.0.3`. |
| psycopg async | Windows ProactorEventLoop | Hace falta la selector loop policy en dev local en Windows (MEDIUM). |
| pyjwt 2.15 | ES256/RS256 | Requiere el extra `[crypto]` (instala `cryptography`). |

## Sources

- PyPI JSON API (`pypi.org/pypi/<pkg>/json`): versiones y `requires_python` de fastapi, sqlalchemy, alembic, psycopg, asyncpg, pydantic, pydantic-settings, pyjwt, uvicorn, pytest, pytest-asyncio, httpx, ruff, mypy, uv y python-jose, verificadas el 2026-10-29. HIGH
- npm registry (`registry.npmjs.org/<pkg>/latest`): versiones y peerDependencies/engines de vite, react, typescript, vite-plugin-pwa, react-router, @tanstack/react-query, react-hook-form, zod, @hookform/resolvers, recharts, supabase-js, tailwind, vitest, typescript-eslint y openapi-typescript. HIGH
- https://raw.githubusercontent.com/vitejs/vite/main/packages/create-vite/template-react-ts/package.json: el template trae TS ~7.0.2, oxlint, Vite ^8.3.5 y React ^19.3.1. HIGH
- https://supabase.com/docs/guides/auth/signing-keys: endpoint JWKS, preferencia por ES256, HS256 legacy no recomendado, caché de 10+10 min. HIGH
- https://supabase.com/docs/guides/auth/jwts: claims `iss`/`sub`/`exp`/`role`, matching por `kid`, JWKS vacío si se usa HS256. HIGH (aud no documentado allí → MEDIUM)
- https://supabase.com/docs/guides/database/connecting-to-postgres: directa IPv6-only en free, pooler IPv4, session 5432 con prepared statements, transaction 6543 sin ellos. HIGH
- https://render.com/docs/free: spin-down a los 15 min, ~1 min de wake, 750 h/mes, Postgres free expira a los 30 días. HIGH
- WebSearch sobre Koyeb/Cloud Run (agentdeals.dev, render.com/articles/fastapi-deployment-options, koyeb.com/docs/compare/render-vs-koyeb): sin datos verificados de free tier. LOW
- Conocimiento previo (no verificado hoy): pausa de Supabase free por inactividad, problema de psycopg async en Windows, `aud="authenticated"`. MEDIUM

---
*Stack research for: PWA de control de gastos personal*
*Researched: 2026-10-29*
