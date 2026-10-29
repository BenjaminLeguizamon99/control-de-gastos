# Walking Skeleton — Control de Gastos

**Phase:** 1
**Generated:** 2026-10-29

## Capability Proven End-to-End

El usuario inicia sesión en la app desplegada (Cloudflare Pages) y ve el `user_id` que le devuelve `GET /me` del backend en Render, que verificó su JWT de Supabase por JWKS; `/health` hace `SELECT 1` contra Supabase Postgres.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Repo | Monorepo: `backend/` + `frontend/` + `docker-compose.yml` + `render.yaml` en la raíz; GitHub público, rama `main` | Un solo repo para un dev; deploy automático por push (D-02) |
| Backend framework | FastAPI 0.162 + Python 3.13 + uv | Stack bloqueado; uv ≈ Maven/Gradle |
| Estilo de concurrencia | **Sync**: `create_engine`, `Session`, endpoints `def` (nunca `async def`) | Locked (ROADMAP); modelo mental de Spring MVC. Async queda para v2 (BACK-01) |
| Data layer | Supabase Postgres 17 + SQLAlchemy 2.x (estilo 2.0: `Mapped`, `select()`) + psycopg 3 (`postgresql+psycopg://`) | Mismo driver para app y Alembic |
| Conexión a la DB | Shared pooler **session mode, puerto 5432**, `sslmode=require`, `pool_size=5, max_overflow=0, pool_pre_ping=True` | La directa es IPv6-only en free; Render sale por IPv4 |
| Transacciones | `get_session()`: una `Session` con `session.begin()` por request (≈ `@Transactional`) | Rollback automático |
| Migraciones | Alembic; URL desde `get_settings()` (no `alembic.ini`); se corren **desde local**, nunca en el build | Un deploy roto no toca el schema |
| RLS | Toda tabla de `public` (incluida `alembic_version`) con `ENABLE ROW LEVEL SECURITY` **en la misma migración que la crea**, sin policies y sin GRANT a anon/authenticated. `tests/test_rls.py` lo exige para toda tabla futura | La Data API pública no expone nada; el backend conecta como owner |
| Autorización de datos | Todo repositorio filtra `WHERE id = ? AND user_id = ?`; recurso ajeno o inexistente → **404** | El `WHERE user_id` es el control real (el owner saltea RLS) |
| Auth (identidad) | Supabase Auth email+password; signups deshabilitados; usuario único creado a mano en el dashboard | Sin programar seguridad propia (D-06) |
| Auth (backend) | `app/auth.py`: `HTTPBearer` + `PyJWKClient` (JWKS) + `jwt.decode(algorithms=["ES256","RS256"], audience="authenticated", issuer="{SUPABASE_URL}/auth/v1")`; `user_id` solo del `sub`; `ALLOWED_USER_IDS` → 403. Uso: `user_id: CurrentUserId` | 401 para token inválido, 403 fuera de la allowlist (D-07) |
| Config | `pydantic-settings` (`app/config.py`, `get_settings()` con `lru_cache`); listas en env como JSON | ≈ `@ConfigurationProperties` |
| Recuperación de contraseña | OTP de 6 dígitos (`resetPasswordForEmail` → `verifyOtp({type:'recovery'})` → `updateUser`), template de email con `{{ .Token }}` | En iOS un link abre Safari y no la PWA (D-09) |
| Frontend | React 19 + TypeScript 7 + Vite 8, Node 24 (`frontend/.nvmrc`), oxlint, Tailwind 4 (clases por defecto hasta la Fase 2) | Stack bloqueado; TS 7 incompatible con typescript-eslint |
| Routing | react-router 8.5 en modo SPA (`createBrowserRouter`); rutas `/login`, `/recuperar` (sin guard de sesión), `/` bajo `ProtectedLayout` | Sin SSR: hosting estático |
| Estado del servidor | TanStack Query; `queryClient.clear()` en logout | Invalidación por key en fases siguientes |
| Cliente HTTP | `src/api/client.ts`: `api<T>(path)` toma el `access_token` vigente de `supabase.auth.getSession()` y manda `Authorization: Bearer`; `ApiError(status)` | supabase-js se usa **solo** para `auth.*`, nunca `supabase.from()` |
| Sesión | supabase-js con `persistSession`/`autoRefreshToken` por defecto; logout `signOut({ scope: 'local' })` | Sesión indefinida (D-08) sin cerrar otros dispositivos |
| Tests backend | pytest + `TestClient` contra **Postgres 17 en Docker** (puerto 5433); `FakeJWKS` con clave ES256 local vía `dependency_overrides`; guard que aborta si la DB no es localhost | Nunca tocar Supabase desde tests (D-04, D-10) |
| Tests frontend | Vitest solo para lógica pura (`authErrors.ts` hoy) | Sin testear cada componente |
| Calidad | `ruff check`, `ruff format --check`, `mypy app` (strict), `pytest`; `npm run build`, `npm run lint`, `vitest run`. Sin CI bloqueante en v1 | D-02 |
| Deployment target | Backend: Render free (`render.yaml`, región virginia). Frontend: Cloudflare Pages (root `frontend`, output `dist`). DB+Auth: Supabase free (us-east-1). Keep-alive: cron-job.org → `/health` cada 10 min | Free tier (D-01, D-05) |
| Secretos | `.env` gitignored, `.env.example` versionado; secretos solo en Render (`sync: false`); frontend solo `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_API_URL` | Repo público (D-03) |
| Directory layout (backend) | `app/{main,config,db,auth}.py`, `app/models/`, `app/repositories/`, `app/routers/`; `schemas/` y `services/` se agregan en la Fase 3 | Capas ≈ Spring (router ≈ controller, repository ≈ DAO) |
| Directory layout (frontend) | `src/lib/`, `src/api/`, `src/features/<feature>/`, `src/app/` (router, layout, páginas raíz) | La UI crece por feature |
| Aprendizaje | `docs/aprendizaje/fase-NN.md` por fase, conceptos de Python con analogía Java | D-12 |

## Stack Touched in Phase 1

- [ ] Project scaffold (framework, build, lint, test runner) — 01-01 (uv, ruff, mypy, pytest), 01-03 (Vite, oxlint, Vitest)
- [ ] Routing — at least one real route — backend `/health`, `/me`, `/probes/{id}`; frontend `/login`, `/recuperar`, `/`
- [ ] Database — real read AND write — `/health` (`SELECT 1`) y `GET /probes/{id}` (read); los tests insertan `probes` (write); migración 0001 aplicada en Supabase
- [ ] UI — interactive element wired to the API — login → `/` que llama `GET /me` con Bearer
- [ ] Deployment — Render + Cloudflare Pages + cron-job.org (01-06)

## Out of Scope (Deferred to Later Slices)

- PWA instalable (manifest, service worker, vite-plugin-pwa, íconos) → Fase 7 (decisión del usuario). AUTH-02 se verifica en esta fase con recarga y reapertura del navegador.
- Sistema de diseño (`DESIGN.md`, `tokens.css`, `@theme`, modo oscuro, shadcn) → Fase 2.
- Pantalla de registro (nunca; signups deshabilitados).
- Endpoint para crear `probes` (los tests insertan directo; la tabla es solo de prueba de seguridad).
- Categorías, gastos, cuotas, ingresos, resumen → Fases 3 a 6.
- CI con GitHub Actions y expiración de sesión por inactividad (Deferred Ideas de CONTEXT.md).
- SMTP propio para emails de recovery (el SMTP por defecto alcanza para un usuario).
- SQLAlchemy async (v2, BACK-01).

## Subsequent Slice Plan

Cada fase agrega un slice vertical sobre este esqueleto sin cambiar sus decisiones:

- Phase 2: identidad visual propia y componentes base (`DESIGN.md`, `tokens.css`), reestilizando login y layout.
- Phase 3: categorías y carga rápida de un gasto (1 cuota), con `categories`/`expenses`/`installments` con RLS y repositorios por `user_id`.
- Phase 4: compras con tarjeta en N cuotas que suman exacto el total.
- Phase 5: ingresos y resumen mensual ("Te quedan $X", por categoría, gráfico, navegación de meses).
- Phase 6: edición, borrado, filtros y comparación con el mes anterior.
- Phase 7: PWA instalable, responsive y robustez ante cold starts.
