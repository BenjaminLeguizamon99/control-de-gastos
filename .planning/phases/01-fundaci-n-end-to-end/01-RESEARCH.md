# Phase 1: Fundación end-to-end - Research

**Researched:** 2026-10-29
**Domain:** Walking skeleton: monorepo FastAPI (sync) + React/Vite, Supabase Auth (password + OTP de recovery), verificación JWT por JWKS, Postgres por pooler, Alembic + RLS, deploy Render + Cloudflare Pages
**Confidence:** HIGH en general (la mayoría verificado contra docs oficiales o el código fuente de las libs hoy). Hay excepciones MEDIUM/LOW, marcadas abajo.

> Base: `CLAUDE.md` (stack ya verificado) y `.planning/research/{ARCHITECTURE,PITFALLS}.md`. Este documento no repite esa investigación. Cubre solo los huecos específicos de la fase.
> **Nota de coherencia:** `CLAUDE.md` describe SQLAlchemy **async**. Pero CONTEXT.md y ROADMAP fijan **sync** (`create_engine`, endpoints `def`). Manda sync. Por eso el problema de psycopg async con el `ProactorEventLoop` de Windows **no aplica**: psycopg sync anda bien en Windows.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
**Hosting y deploy**
- **D-01:** Backend en **Render free tier**. Frontend en **Cloudflare Pages**. DB + Auth en **Supabase free**.
- **D-02:** Código en **GitHub, repo público**. Deploy automático en cada push a `main` (Render y Cloudflare Pages conectados al repo). Sin CI de tests bloqueante en esta fase (ruff/mypy/pytest se corren localmente).
- **D-03:** Repo público → **ningún secreto en el repo**: `.env` en `.gitignore`, `.env.example` versionado, secretos solo en variables de entorno de Render/Cloudflare. Solo variables `VITE_*` públicas (URL + anon/publishable key) en el frontend; nunca `service_role` ni la DB URL.
- **D-04:** **Un solo proyecto Supabase** (sirve para la app desplegada y para desarrollo manual). Los tests automatizados NO tocan Supabase: corren contra Postgres local en Docker.
- **D-05:** Keep-alive con **cron-job.org** llamando a `GET /health` cada ~10 min; `/health` ejecuta `SELECT 1` contra la DB, así también evita la pausa por inactividad de Supabase. (Configuración manual del usuario — documentar pasos.)

**Cuenta y autenticación**
- **D-06:** La única cuenta se crea **a mano desde el dashboard de Supabase** (Authentication → Add user). Signups deshabilitados desde el inicio. La app **no** tiene pantalla de registro.
- **D-07:** Allowlist en el backend: variable de entorno **`ALLOWED_USER_IDS`**; un JWT válido de un `sub` no listado recibe 403/401. Capa extra además de signups deshabilitados.
- **D-08:** **Sesión persistente indefinida** hasta logout: supabase-js con refresh automático de tokens; sin expiración por inactividad.
- **D-09:** **"Olvidé mi contraseña" en la app (AUTH-07, agregado en esta discusión)**: flujo por **código OTP de 6 dígitos** enviado por email (template de recovery de Supabase con `{{ .Token }}`, no link), verificado dentro de la PWA (`verifyOtp` tipo recovery) y luego `updateUser({ password })`. Motivo: en iOS un link abre Safari y no la PWA instalada. El researcher debe verificar la API exacta de supabase-js y la configuración del email template.

**Entorno local y aprendizaje**
- **D-10:** El usuario **tiene Docker Desktop** → tests de integración contra **Postgres en Docker** (`docker compose`), versión de Postgres alineada a la de Supabase.
- **D-11:** Herramientas detectadas en la máquina (Windows 11): Python 3.13.2 ✓, Node 22.14 ✓ (compatible con Vite 8 — no hace falta Node 24), git ✓, Docker 28 ✓. **Falta instalar `uv`** (el plan incluye el paso). `gh` CLI no está instalado (opcional; crear el repo de GitHub puede ser manual).
- **D-12:** Explicaciones de Python en **un archivo de notas por fase**: `docs/aprendizaje/fase-01.md`, cada concepto con analogía a Java (uv ≈ Maven/Gradle, `Depends()` ≈ `@Autowired`, pydantic-settings ≈ `@ConfigurationProperties`, Alembic ≈ Flyway, fixtures ≈ `@BeforeEach`, etc.). Código limpio con comentarios breves solo del "por qué".
- **D-13:** **Claude escribe el código, el usuario revisa** y pregunta. No hay ejercicios guiados.

**Locked from project level (no reabrir)**
- SQLAlchemy 2.x **sync** + endpoints `def` + psycopg 3 (`postgresql+psycopg://`).
- JWT verificado por **JWKS** (`PyJWKClient`), algoritmos fijos (ES256/RS256), `aud` + `iss` verificados; `user_id` solo del `sub` del token.
- **RLS habilitado sin policies** en cada tabla creada por Alembic; verificar con `curl` a `/rest/v1/<tabla>` usando la anon key.
- Conexión por **pooler session mode (puerto 5432, IPv4)** — la conexión directa es solo IPv6.
- Dinero como BIGINT centavos (aplica desde Fase 3).

### Claude's Discretion
- **Pantalla de login** (no discutida): mínima y funcional, sin invertir en estilos — se reestiliza en Fase 2 con el sistema de diseño. Incluye: login, "Olvidé mi contraseña" (pedir código → ingresar código + nueva contraseña), y un botón de logout visible en la pantalla autenticada.
- Estructura exacta de carpetas del monorepo y del backend por capas (seguir `.planning/research/ARCHITECTURE.md`).
- Respuesta para usuario fuera de allowlist (401 vs 403).
- Contenido de la pantalla autenticada de prueba (p. ej. mostrar el `user_id` devuelto por `/me`).

### Deferred Ideas (OUT OF SCOPE)
- CI con GitHub Actions que corra ruff/mypy/pytest antes de desplegar — considerado, no elegido para esta fase; posible mejora futura.
- Expiración de sesión por inactividad — descartado por ahora (prioriza velocidad de carga).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | Login email+contraseña (Supabase Auth) | `signInWithPassword`; error `invalid_credentials` mapeado a copy (§Code Examples F2) |
| AUTH-02 | Sesión persiste entre recargas / PWA instalada | Defaults de supabase-js `persistSession`/`autoRefreshToken` + `getSession()` antes de cada request (§F1, F3). PWA instalable: ver Open Question 2 |
| AUTH-03 | Logout desde cualquier pantalla | Layout autenticado con header. **`signOut({ scope: 'local' })`**, porque el default es `global` (Pitfall 5) |
| AUTH-04 | 401 sin JWT válido (JWKS, algoritmos fijos, aud+iss) | `HTTPBearer` de FastAPI 0.162 devuelve **401** si falta el header (verificado en el código). PyJWT 2.15: todas las excepciones heredan de `PyJWTError` (§B2). Tests con claves ES256 locales (§T1) |
| AUTH-05 | Recursos ajenos → 404 | Tabla `probes` con dueño + `WHERE id AND user_id` + test A vs. B (§B4, Open Question 1) |
| AUTH-06 | RLS sin policies + signups deshabilitados | Migración con `ENABLE ROW LEVEL SECURITY` también en **`alembic_version`** (Pitfall 2). Test automático "toda tabla public tiene RLS". Toggle de signups en el dashboard + curl a `/auth/v1/signup` → 422 `signup_disabled`. Cambio de Supabase en los grants por defecto (Pitfall 3) |
| AUTH-07 | Recuperar contraseña con código en la PWA | `resetPasswordForEmail(email)` → template "Reset password" con `{{ .Token }}` → `verifyOtp({ email, token, type: 'recovery' })` → `updateUser({ password })`. Verificado en el código de auth-js (§F4). Restricciones del SMTP por defecto (Pitfall 4) y largo del OTP (Pitfall 6) |
</phase_requirements>

## Summary

La fase es un walking skeleton y casi todo el stack ya está decidido y verificado en `CLAUDE.md`. Lo que faltaba se resolvió así:

1. **Recuperación por OTP:** la API existe tal como la pensó D-09 (`EmailOtpType` incluye `'recovery'`). Al verificar, supabase-js guarda la sesión y emite `PASSWORD_RECOVERY` (no `SIGNED_IN`). "Reenviar código" **no** puede usar `auth.resend()`, porque solo acepta `signup | email_change`: hay que volver a llamar a `resetPasswordForEmail`.
2. **Email:** el SMTP por defecto de Supabase **solo entrega a direcciones del equipo del proyecto** y como máximo **2 mails por hora**. La cuenta de la app tiene que usar el mismo email de la cuenta de Supabase. Si no, hace falta un SMTP propio.
3. **Supabase cambió los grants por defecto:** desde el 30/05/2026 los proyectos nuevos **no dan grants** a `anon`/`authenticated` sobre tablas nuevas de `public`, y el **30/10/2026 (mañana)** el cambio se aplica a todos los proyectos. El curl a `/rest/v1/<tabla>` va a devolver `42501 permission denied` en lugar de `[]`. Las dos respuestas cumplen el criterio "no devuelve datos". RLS se activa igual, como segunda capa.
4. **Engine de Node:** react-router 8.5.1 declara `node >=22.22.0` y la máquina tiene 22.14. Esto contradice D-11. Recomendación: instalar Node 24 LTS (lo que ya decía `CLAUDE.md`).
5. **Alembic crea `alembic_version` en `public` sin RLS.** Hay que activarle RLS en la primera migración.

**Primary recommendation:** Construir en este orden: backend local con tests contra Docker → proyecto Supabase configurado (checkpoints `human-action`) → frontend local contra Supabase y el backend local → deploy (Render virginia + Supabase us-east-1, Cloudflare Pages) → verificaciones manuales (curl, OTP, reload). Una sola tabla mínima con dueño (`probes`) sirve para probar AUTH-05 y AUTH-06 sin adelantar el modelo de la Fase 3.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Login, refresh y persistencia de la sesión | Browser (supabase-js) | Supabase Auth | El backend nunca ve contraseñas |
| Recuperación de contraseña por OTP | Browser (supabase-js) | Supabase Auth (template, SMTP) | Todo ocurre dentro de la PWA y no hay link |
| Verificar el JWT y obtener `user_id` | API (FastAPI `Depends`) | Supabase JWKS | Frontera de confianza. `sub` sale solo del token |
| Allowlist de usuarios | API | — | Variable de entorno `ALLOWED_USER_IDS` |
| Aislamiento por usuario (404) | API (repository) | — | El backend conecta como `postgres` (owner) y saltea RLS, así que el `WHERE user_id` es el control real |
| Bloqueo de la Data API | Database (RLS + grants) | Supabase Auth (signups off) | Red de seguridad independiente del backend |
| `/health` + keep-alive | API | cron-job.org (externo) | `SELECT 1` despierta Render y evita que Supabase se pause |
| Hosting estático / SPA fallback | CDN (Cloudflare Pages) | — | Sin `404.html`, Pages sirve `/` para cualquier ruta |

## Standard Stack

Las versiones están en `CLAUDE.md` (verificadas el 2026-10-29). Hoy se re-verificaron: fastapi 0.162.0, pyjwt 2.15.1, @supabase/supabase-js 2.118.0, vite 8.3.5, react-router 8.5.1, vite-plugin-pwa 2.0.0, @tanstack/react-query 5.105.0, zod 4.6.7, tailwindcss y @tailwindcss/vite 4.3.3, vitest 5.0.5. [VERIFIED: npm registry / PyPI]

### Backend (subset que usa esta fase)
| Library | Version | Purpose |
|---------|---------|---------|
| fastapi[standard] | 0.162.x | HTTP, `Depends`, `HTTPBearer`, CORS |
| pydantic-settings | 2.16.x | `Settings` desde env/.env |
| sqlalchemy | 2.1.x (sync) | `create_engine`, `Session`, `select()` |
| psycopg[binary] | 3.3.x | Driver (`postgresql+psycopg://`) |
| alembic | 1.20.x | Migraciones |
| pyjwt[crypto] | 2.15.x | `PyJWKClient`, ES256 |
| **dev:** pytest 9.2, ruff 0.17, mypy 2.x | | `httpx` ya viene con `fastapi[standard]` y lo usa `TestClient` |

**No hace falta** pytest-asyncio: el código es sync. `cryptography` viene con `pyjwt[crypto]` y alcanza para generar claves de test.

### Frontend (subset que usa esta fase)
| Library | Version | Purpose |
|---------|---------|---------|
| vite + react + typescript (template `react-ts`) | 8.3 / 19.3 / ~7.0 | Scaffold. Incluye oxlint |
| @supabase/supabase-js | 2.118.x | Solo `auth.*` |
| react-router | 8.5.x | `/login`, `/recuperar`, `/` (modo SPA, `createBrowserRouter`) |
| @tanstack/react-query | 5.105.x | `/me` + limpiar la cache en el logout (lo pide UI-SPEC) |
| zod | 4.x | Validación de los 3 formularios (UI-SPEC) |
| tailwindcss + @tailwindcss/vite | 4.3.x | Clases por defecto (UI-SPEC: sin `@theme` propio todavía) |

**Diferido a la Fase 3:** react-hook-form (los formularios de esta fase tienen 1 o 2 campos y alcanza con `useState`). recharts y date-fns tampoco se usan acá.

**Installation:**
```bash
# Backend (desde backend/)
uv init --app --python 3.13   # o crear pyproject a mano
uv add "fastapi[standard]" pydantic-settings "sqlalchemy" "psycopg[binary]" alembic "pyjwt[crypto]"
uv add --dev pytest ruff mypy
# Frontend (desde la raíz)
npm create vite@latest frontend -- --template react-ts
cd frontend && npm i @supabase/supabase-js react-router @tanstack/react-query zod && npm i -D tailwindcss @tailwindcss/vite
```

## Package Legitimacy Audit

slopcheck **no se pudo ejecutar**: la instalación fue bloqueada por el clasificador de permisos de la sesión. Siguiendo el protocolo, todos los paquetes quedan como `[ASSUMED]`. Todos son paquetes de primera línea con años de historia, y sus nombres coinciden con la documentación oficial de FastAPI, Supabase, Vite y TanStack que citan `CLAUDE.md` y este documento. Además se confirmaron en el registro correcto (PyPI para Python, npm para JS).

| Package | Registry | Source Repo | slopcheck | Disposition |
|---------|----------|-------------|-----------|-------------|
| fastapi, pydantic-settings, sqlalchemy, psycopg, alembic, pyjwt, pytest, ruff, mypy | PyPI | fastapi/fastapi, pydantic/pydantic-settings, sqlalchemy/sqlalchemy, psycopg/psycopg, sqlalchemy/alembic, jpadilla/pyjwt, pytest-dev/pytest, astral-sh/ruff, python/mypy | n/a | Approved [ASSUMED] |
| @supabase/supabase-js, react-router, @tanstack/react-query, zod, tailwindcss, @tailwindcss/vite, vite-plugin-pwa | npm | supabase/supabase-js, remix-run/react-router, TanStack/query, colinhacks/zod, tailwindlabs/tailwindcss, vite-pwa/vite-plugin-pwa | n/a | Approved [ASSUMED] |

**Packages removed:** none. **Flagged [SUS]:** none. Si el planner quiere cumplir el protocolo al pie de la letra, puede agregar un único `checkpoint:human-verify` que cubra la lista completa antes del primer `uv add` / `npm i`.

## Architecture Patterns

### System Architecture Diagram

```
 [Celular / navegador]
   │ 1. email+pass ──────────────► Supabase Auth ──(emite JWT ES256, kid)
   │ 1b. resetPasswordForEmail ──► Supabase Auth ──► SMTP ──► mail con {{ .Token }}
   │ 1c. verifyOtp(recovery) + updateUser(password) ─► Supabase Auth
   │        (supabase-js guarda la sesión en localStorage y la refresca sola)
   │
   │ 2. GET /me  Authorization: Bearer <access_token>
   ▼
 [Cloudflare Pages: SPA estática]      [Render free: uvicorn + FastAPI]
                                          │ HTTPBearer ─► sin header → 401
                                          │ PyJWKClient ─► JWKS (cache) ──► Supabase /auth/v1/.well-known/jwks.json
                                          │ jwt.decode(alg fijos, aud, iss) ─► falla → 401
                                          │ sub ∈ ALLOWED_USER_IDS? ─► no → 403
                                          │ user_id (UUID) ─► router ─► repository (WHERE id AND user_id) ─► 404 si no hay fila
                                          ▼
                              Supabase Postgres (pooler session :5432, IPv4, sslmode=require)
                              public.probes, public.alembic_version: RLS ON, sin policies, sin grants a anon
                                          ▲
 [Atacante con publishable key] ─ GET /rest/v1/probes ─► PostgREST ─► 42501 / [] (sin datos)
 [cron-job.org] ─ cada 10 min ─► GET /health ─► SELECT 1
```

### Recommended Project Structure
```
control-de-gastos/
├── .gitignore                 # .env, .venv, node_modules, dist, __pycache__
├── README.md                  # pasos manuales (Supabase, Render, Pages, cron) + cómo correr local
├── docker-compose.yml         # postgres:17 para tests (puerto 5433)
├── render.yaml                # Blueprint del backend (rootDir: backend)
├── docs/aprendizaje/fase-01.md
├── backend/
│   ├── pyproject.toml         # deps + [tool.ruff] + [tool.mypy] + [tool.pytest.ini_options]
│   ├── uv.lock  .python-version  .env.example
│   ├── alembic.ini  alembic/env.py  alembic/versions/0001_probes_rls.py
│   ├── app/
│   │   ├── main.py  config.py  db.py  auth.py
│   │   ├── models/ (base.py, probe.py)
│   │   ├── repositories/probe_repo.py
│   │   └── routers/ (health.py, me.py, probes.py)
│   └── tests/ (conftest.py, test_auth.py, test_probes.py, test_rls.py, test_health.py)
└── frontend/
    ├── .nvmrc (24)  .env.example  vite.config.ts  index.html (viewport-fit=cover)
    └── src/ main.tsx, lib/supabase.ts, api/client.ts,
             features/auth/ (AuthProvider.tsx, LoginPage.tsx, RecoverPage.tsx, authErrors.ts),
             app/ (router.tsx, ProtectedLayout.tsx, HomePage.tsx)
```
No se crean `services/` ni `schemas/` en esta fase porque no hay lógica de negocio. Se agregan en la Fase 3. La única respuesta tipada, `{user_id}`, puede ser un modelo Pydantic dentro de `routers/me.py`.

### Anti-Patterns to Avoid
- **`PyJWKClient` o `create_engine` leídos de settings a nivel módulo *antes* de que el conftest setee el entorno.** Para evitarlo, el conftest define las variables de entorno en la primera línea, antes de cualquier `import app`, o se usa `get_settings()` con `lru_cache`.
- **Parámetros `= Depends(...)` como default.** Ruff B008 los marca. Usar `Annotated[T, Depends(...)]`, que es además el estilo que recomienda FastAPI.
- **Cachear JWKS más de 10 min o no cachearlo:** `PyJWKClient` ya trae `lifespan=300` por defecto, que está bien.
- **Envolver `/recuperar` con el guard "si hay sesión → /"** (ver Pitfall 7).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Descargar y cachear JWKS, elegir la clave por `kid` | fetch + dict propio | `jwt.PyJWKClient` | Rotación, cooldown, cache con TTL |
| Validar exp/aud/iss | comparaciones a mano | `jwt.decode(..., audience=, issuer=, options={"require": [...]})` | Tolerancias y errores tipados |
| Leer `Authorization: Bearer` | parsear headers | `fastapi.security.HTTPBearer` | Ya devuelve 401 y `WWW-Authenticate` |
| Refresh de tokens y persistencia | timers propios | supabase-js (`autoRefreshToken`, `persistSession`, default `true`) | Locks entre pestañas, reintentos |
| Envío y verificación del OTP | endpoint propio de reset | `resetPasswordForEmail` + `verifyOtp` | Supabase maneja expiración y rate limit |
| Transacción por request | commit manual en cada endpoint | `with SessionLocal() as s, s.begin(): yield s` | Rollback automático |
| Claves de test | JWKs inventados | `ec.generate_private_key(ec.SECP256R1())` + `jwt.encode(..., algorithm="ES256", headers={"kid": ...})` | Se ejercita la verificación real |

## Runtime State Inventory

No aplica: es una fase greenfield, no un rename ni una migración.

## Common Pitfalls

### Pitfall 1: react-router 8 no corre oficialmente en Node 22.14
**What goes wrong:** `npm i` muestra `EBADENGINE` (react-router 8.5.1 pide `>=22.22.0`) y puede haber fallas sutiles. [VERIFIED: npm view engines]
**How to avoid:** Instalar Node 24 LTS en Windows (`winget install OpenJS.NodeJS.LTS`) y versionar `frontend/.nvmrc` con `24`. Cloudflare Pages lee `.nvmrc` y `.node-version` (su default v3 es 22.23.4, que cumple igual). [CITED: developers.cloudflare.com/pages/configuration/build-image/] Si el usuario no quiere actualizar, la alternativa es react-router 7.18.5 (`node >=20`).

### Pitfall 2: `alembic_version` queda en `public` sin RLS
**What goes wrong:** Alembic crea la tabla `alembic_version` en el schema por defecto (`public`). El Security Advisor de Supabase la marca como "RLS disabled".
**How to avoid:** En la migración 0001 agregar `op.execute("ALTER TABLE alembic_version ENABLE ROW LEVEL SECURITY")`. La tabla ya existe cuando corre la primera migración, porque Alembic la crea antes de ejecutar los scripts [ASSUMED: comportamiento de Alembic; se confirma con el test de RLS]. Además, conviene un **test automático** que, después de `alembic upgrade head` en Docker, falle si alguna tabla de `public` tiene `relrowsecurity = false`. Ese test protege todas las fases que vienen.

### Pitfall 3: el curl de RLS devuelve un error en vez de `[]`
**What goes wrong:** Desde el 30/05/2026 los proyectos nuevos no otorgan `SELECT` a `anon`/`authenticated` sobre tablas nuevas de `public`, y desde el 30/10/2026 rige para todos. La respuesta es `{"code":"42501","message":"permission denied for table probes"}`. Alguien podría "arreglarlo" con un `GRANT`. [CITED: supabase.com/changelog/45329]
**How to avoid:** En el plan, aceptar **`42501` o `[]`** como PASS. **Nunca** agregar `GRANT` a `anon`/`authenticated`. RLS se activa igual, porque el backend conecta como `postgres` y no necesita grants. Con la publishable key `sb_publishable_...` la key va en el header `apikey`, no en `Authorization`. [CITED: supabase.com/docs/guides/api/api-keys]

### Pitfall 4: el email de recovery no llega
**What goes wrong:** El SMTP por defecto de Supabase "refuse[s] to deliver messages to addresses that are not part of the project's team", con un límite de **2 mensajes por hora**. [CITED: supabase.com/docs/guides/auth/auth-smtp] Si se prueba varias veces, aparece `over_email_send_rate_limit`. Además, el OTP solo se puede pedir una vez cada 60 segundos. [CITED: auth-email-passwordless]
**How to avoid:** Crear el usuario de la app con **el mismo email que la cuenta dueña de la org de Supabase**. Si es otro, configurar un SMTP propio (fuera de alcance salvo que haga falta). Mapear `over_email_send_rate_limit` y `over_request_rate_limit` al copy "Demasiados intentos…". En la verificación manual, planificar como mucho 2 envíos por hora.

### Pitfall 5: `signOut()` cierra la sesión en todos los dispositivos
**What goes wrong:** En auth-js `signOut(options = { scope: 'global' })` revoca todas las sesiones, incluida la del celular cuando se cierra sesión en la compu. [VERIFIED: código de GoTrueClient.ts]
**How to avoid:** `supabase.auth.signOut({ scope: 'local' })`. Después, `queryClient.clear()` y navegar a `/login`.

### Pitfall 6: el largo del OTP puede no ser 6
**What goes wrong:** El default documentado es 6 (configurable entre 6 y 10). Un reporte anecdótico dice que algunos proyectos hosted emiten 8 dígitos. UI-SPEC fija `pattern="[0-9]{6}"`. [CITED: supabase CLI config `auth.email.otp_length` default 6; LOW: reporte de 8 dígitos]
**How to avoid:** Agregar un checkpoint `human-action` para confirmar en el dashboard (Authentication → Providers/Sign In → Email: "Email OTP Length") que el valor sea **6**. El label exacto del dashboard no está verificado (LOW). El cliente valida 6 dígitos según el copy.

### Pitfall 7: el guard de rutas desmonta `/recuperar` en medio del flujo
**What goes wrong:** `verifyOtp` guarda la sesión y emite `PASSWORD_RECOVERY` antes de que corra `updateUser`. [VERIFIED: GoTrueClient.ts] Si `/recuperar` está envuelto en "con sesión → `/`", el componente se desmonta y se pierde el manejo del error de `updateUser` (`weak_password`, `same_password`).
**How to avoid:** No aplicar el redirect "si hay sesión" a `/recuperar`. En el submit del paso 2 hacer `await verifyOtp` → `await updateUser` → `navigate('/')`. Si `updateUser` falla, el usuario ya quedó logueado con la contraseña vieja: mostrar el error y dejar el formulario para reintentar solo `updateUser`, sin pedir otro código.

### Pitfall 8: "Reenviar código" con `auth.resend()`
**What goes wrong:** `ResendParams.type` solo acepta `'signup' | 'email_change'` (y `sms`/`phone_change`). `'recovery'` no compila. [VERIFIED: types.ts]
**How to avoid:** "Reenviar código" vuelve a llamar a `resetPasswordForEmail(email)`.

### Pitfall 9: callbacks async en `onAuthStateChange`
**What goes wrong:** La firma async está `@deprecated` porque puede generar deadlock si dispara un refresh anidado. [VERIFIED: GoTrueClient.ts]
**How to avoid:** Usar un callback sync que solo haga `setSession(session)`. Cualquier otra llamada a supabase va fuera del callback.

### Pitfall 10: password de la DB con caracteres especiales / `%` en alembic.ini
**What goes wrong:** Un `@`, `#` o `/` en la password rompe la URL, y un `%` rompe `config.set_main_option` (por la interpolación de configparser).
**How to avoid:** Usar una password alfanumérica larga, o URL-encodearla. En `alembic/env.py` crear el engine desde `get_settings().database_url` sin pasar por `alembic.ini`.

### Pitfall 11: Python y uv en Render con `rootDir`
**What goes wrong:** Render dice que `.python-version` va "in the root of your repo" y no documenta qué pasa con `rootDir`. Su default es Python 3.14.8. Render agrega uv solo si encuentra `uv.lock` en el root directory del servicio. [CITED: render.com/docs/python-version, render.com/docs/uv-version]
**How to avoid:** Definir la variable de entorno `PYTHON_VERSION=3.13.x` (versión completa, tiene prioridad sobre el archivo) y dejar `uv.lock` en `backend/`. Build: `uv sync --frozen --no-dev`. Start: `.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Se llama al binario directo y no a `uv run`, para que no se re-sincronicen las dependencias de dev al arrancar [ASSUMED: comportamiento de sync de `uv run`].

### Pitfall 12: latencia entre regiones
**What goes wrong:** Render free no tiene región en Sudamérica (opciones: oregon, ohio, virginia, frankfurt, singapore; default oregon). Si Supabase está en São Paulo, cada query viaja ida y vuelta entre continentes. [CITED: render.com/docs/blueprint-spec]
**How to avoid:** Crear el proyecto Supabase en **us-east-1 (N. Virginia)** y el servicio Render en **`region: virginia`**. Así la latencia larga queda en un único tramo, Argentina → EE.UU. La región no se puede cambiar después en ninguno de los dos.

### Pitfall 13: proyecto dentro de OneDrive
**What goes wrong:** El repo está en `OneDrive\Documents`. OneDrive intenta sincronizar `node_modules` y `.venv`, con decenas de miles de archivos, y puede dejarlos bloqueados o solo en la nube. [ASSUMED: problema conocido, no verificado hoy]
**How to avoid:** Lo ideal es mover el repo fuera de OneDrive (por ejemplo `C:\dev\control-de-gastos`). La alternativa es marcar la carpeta como "Mantener siempre en este dispositivo". Es decisión del usuario (Open Question 3).

### Pitfall 14: `ALLOWED_USER_IDS` y listas en pydantic-settings
**What goes wrong:** Los campos complejos (`list[UUID]`) se parsean como **JSON** desde las variables de entorno, así que `ALLOWED_USER_IDS=uuid1,uuid2` falla al arrancar. [ASSUMED: comportamiento documentado de pydantic-settings, no re-leído hoy]
**How to avoid:** En `.env.example` usar el formato `ALLOWED_USER_IDS=["<uuid>"]`, y lo mismo con `CORS_ORIGINS`. Es formato JSON y no requiere código extra.

## Code Examples

### B1. `app/config.py`
```python
from functools import lru_cache
from uuid import UUID
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    database_url: str            # postgresql+psycopg://postgres.<ref>:<pw>@aws-?-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require
    supabase_url: str            # https://<ref>.supabase.co  (sin barra final)
    allowed_user_ids: list[UUID] # JSON: ["..."]
    cors_origins: list[str] = ["http://localhost:5173"]

@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]  # los valores vienen del entorno
```
Las variables de entorno tienen prioridad sobre `.env`, así que el conftest puede forzar la DB de Docker. [ASSUMED: orden de prioridad de pydantic-settings]

### B2. `app/auth.py`: JWKS + allowlist
```python
from functools import lru_cache
from typing import Annotated
from uuid import UUID
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.config import get_settings

@lru_cache
def get_jwks_client() -> jwt.PyJWKClient:
    return jwt.PyJWKClient(f"{get_settings().supabase_url}/auth/v1/.well-known/jwks.json")

def get_current_user_id(
    creds: Annotated[HTTPAuthorizationCredentials, Depends(HTTPBearer())],
    jwks: Annotated[jwt.PyJWKClient, Depends(get_jwks_client)],
) -> UUID:
    s = get_settings()
    try:
        key = jwks.get_signing_key_from_jwt(creds.credentials)
        claims = jwt.decode(
            creds.credentials, key, algorithms=["ES256", "RS256"],  # fijos: nunca del header
            audience="authenticated", issuer=f"{s.supabase_url}/auth/v1",
            options={"require": ["exp", "sub", "aud", "iss"]},
        )
        user_id = UUID(claims["sub"])
    except (jwt.PyJWTError, ValueError):   # PyJWKClientError también hereda de PyJWTError
        raise HTTPException(401, "Invalid token", headers={"WWW-Authenticate": "Bearer"}) from None
    if user_id not in s.allowed_user_ids:
        raise HTTPException(403, "Forbidden")
    return user_id

CurrentUserId = Annotated[UUID, Depends(get_current_user_id)]
```
Verificado hoy: `aud = "authenticated"` y `iss = https://<ref>.supabase.co/auth/v1` [CITED: supabase.com/docs/guides/auth/jwt-fields]; algoritmos ES256 (recomendado) y RS256, EdDSA "coming soon" [CITED: signing-keys]; jerarquía de excepciones de PyJWT 2.15.1 [VERIFIED: código del wheel]. Recomendación: **403** para quien está fuera de la allowlist (está autenticado pero no autorizado). UI-SPEC ya trata igual el 401 y el 403.

### B3. `app/db.py` y `/health`
```python
engine = create_engine(get_settings().database_url, pool_size=5, max_overflow=0, pool_pre_ping=True, pool_recycle=300)
SessionLocal = sessionmaker(engine, expire_on_commit=False)

def get_session() -> Iterator[Session]:
    with SessionLocal() as session, session.begin():
        yield session

# routers/health.py — sin auth
@router.get("/health")
def health(session: Annotated[Session, Depends(get_session)]) -> dict[str, str]:
    session.execute(text("SELECT 1"))
    return {"status": "ok"}
```

### B4. Patrón dueño → 404 (tabla `probes`)
```python
# repositories/probe_repo.py
def get_probe(session: Session, user_id: UUID, probe_id: UUID) -> Probe | None:
    return session.scalar(select(Probe).where(Probe.id == probe_id, Probe.user_id == user_id))

# routers/probes.py
@router.get("/probes/{probe_id}")
def read_probe(probe_id: UUID, user_id: CurrentUserId, session: Annotated[Session, Depends(get_session)]) -> ProbeRead:
    probe = get_probe(session, user_id, probe_id)
    if probe is None:
        raise HTTPException(404, "Not found")  # 404 y no 403: no revelar existencia
    return ProbeRead.model_validate(probe, from_attributes=True)
```

### B5. Migración 0001
```python
def upgrade() -> None:
    op.create_table("probes",
        sa.Column("id", sa.Uuid, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.Uuid, nullable=False, index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    op.execute("ALTER TABLE probes ENABLE ROW LEVEL SECURITY")         # sin policies: deny para la Data API
    op.execute("ALTER TABLE alembic_version ENABLE ROW LEVEL SECURITY")

def downgrade() -> None:
    op.drop_table("probes")
```
`gen_random_uuid()` es nativo desde PG13, así que funciona igual en Docker y en Supabase. Sin FK a `auth.users` (decisión de ARCHITECTURE.md).

### B6. `main.py`: CORS
```python
app = FastAPI(redirect_slashes=False)
app.add_middleware(CORSMiddleware, allow_origins=get_settings().cors_origins,
                   allow_methods=["*"], allow_headers=["Authorization", "Content-Type"])
```
`CORS_ORIGINS` en Render: `["https://<proyecto>.pages.dev"]`.

### T1. `tests/conftest.py`: claves ES256 locales y override del JWKS
```python
import os
os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5433/test")
os.environ["SUPABASE_URL"] = "https://test.supabase.co"
os.environ["ALLOWED_USER_IDS"] = '["11111111-1111-1111-1111-111111111111","22222222-2222-2222-2222-222222222222"]'

import time, jwt, pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi.testclient import TestClient
from app.main import app
from app.auth import get_jwks_client

KEY = ec.generate_private_key(ec.SECP256R1())

class FakeJWKS:  # reemplaza la descarga del JWKS; la verificación real de jwt.decode sigue corriendo
    def get_signing_key_from_jwt(self, token: str) -> jwt.PyJWK:
        jwk = jwt.algorithms.ECAlgorithm.to_jwk(KEY.public_key(), as_dict=True)
        return jwt.PyJWK({**jwk, "kid": "test", "alg": "ES256"})

def make_token(sub: str, **overrides: object) -> str:
    claims = {"sub": sub, "aud": "authenticated", "iss": "https://test.supabase.co/auth/v1",
              "exp": int(time.time()) + 3600, "role": "authenticated", **overrides}
    return jwt.encode(claims, KEY, algorithm="ES256", headers={"kid": "test"})

@pytest.fixture(scope="session", autouse=True)
def _migrate():  # Alembic real contra Docker: también prueba la migración
    from alembic import command; from alembic.config import Config
    command.upgrade(Config("alembic.ini"), "head")

@pytest.fixture
def client():
    app.dependency_overrides[get_jwks_client] = FakeJWKS
    yield TestClient(app)
    app.dependency_overrides.clear()
```
Casos de 401: sin header; `exp` en el pasado; `aud="anon"`; `iss` de otro proyecto; token **HS256** con el mismo `kid` (`jwt.encode(claims, "secret", algorithm="HS256", headers={"kid":"test"})` → `InvalidAlgorithmError`); token firmado con **otra** clave EC (firma inválida); `"sub": "no-uuid"`. Además: `sub` fuera de la allowlist → 403, y un token válido → `/me` devuelve `{"user_id": sub}`. Limpieza entre tests: `TRUNCATE probes` en un fixture (más simple que los savepoints).

### T2. Test "toda tabla de public tiene RLS"
```python
def test_all_public_tables_have_rls(db_session):
    rows = db_session.execute(text(
        "SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace "
        "WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity")).scalars().all()
    assert rows == []
```

### F1. `src/lib/supabase.ts` + `src/api/client.ts`
```ts
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
// persistSession y autoRefreshToken vienen en true; flowType por defecto 'implicit' (no afecta al OTP)

export async function api<T>(path: string): Promise<T> {
  const { data } = await supabase.auth.getSession()   // siempre el token vigente (refrescado)
  const res = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
    headers: data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {},
  })
  if (!res.ok) throw new ApiError(res.status)
  return res.json() as Promise<T>
}
```

### F2. Mapeo de errores (`authErrors.ts`, se testea con Vitest)
`invalid_credentials` → "Email o contraseña incorrectos…". `otp_expired` → "El código es incorrecto o venció…". `over_email_send_rate_limit` | `over_request_rate_limit` → "Demasiados intentos…". `weak_password` → "Usá al menos 8 caracteres." Cualquier otro → error de red. Los códigos existen en `auth-js/src/lib/error-codes.ts`. [VERIFIED] Se lee `error.code` (`AuthError`).

### F3. AuthProvider (callback sync)
```ts
useEffect(() => {
  supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) })
  const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))  // sync: no await adentro
  return () => data.subscription.unsubscribe()
}, [])
```

### F4. Recuperación (D-09), verificado contra auth-js
```ts
// Paso 1 (y "Reenviar código"): siempre pasa al paso 2, aunque el email no exista
await supabase.auth.resetPasswordForEmail(email)          // sin redirectTo: el template no lleva link
// Paso 2: un solo submit
const v = await supabase.auth.verifyOtp({ email, token: code, type: 'recovery' }) // guarda sesión + PASSWORD_RECOVERY
if (v.error) return showError(v.error)
const u = await supabase.auth.updateUser({ password })
if (u.error) return showError(u.error)                     // ya hay sesión: reintentar solo updateUser
navigate('/')
```
**Template de email** (Dashboard → Authentication → Emails → "Reset password"): asunto "Tu código para Control de Gastos"; cuerpo `<p>Tu código para cambiar la contraseña es: <strong>{{ .Token }}</strong></p><p>Vence en 1 hora.</p>`. **Sin** `{{ .ConfirmationURL }}`. La variable `{{ .Token }}` es la que documenta Supabase para códigos de email [CITED: auth-email-passwordless]. Que funcione también en el template de recovery es [ASSUMED]: la doc de passwords no lo menciona, pero el `type: 'recovery'` de `verifyOtp` existe [VERIFIED: types.ts]. Por eso el checkpoint manual de SC6 es obligatorio.

### D1. Configuración manual de Supabase (checkpoints `human-action`)
1. Crear el proyecto en **us-east-1**. Usar una password de DB alfanumérica (Pitfall 10).
2. Settings → JWT Keys: confirmar que hay una signing key **asimétrica (ECC P-256)** vigente. Si dice legacy HS256, ir a "Migrate JWT secret" → "Rotate keys". [CITED: signing-keys] Comprobar con `curl https://<ref>.supabase.co/auth/v1/.well-known/jwks.json`, que debe devolver `keys` con `"alg":"ES256"`.
3. Authentication → Sign In / Providers: desactivar **"Allow new users to sign up"** (el toggle general, **no** el del provider Email, porque ese apaga también el login). [CITED: supabase.com/docs/guides/auth/general-configuration; la ubicación exacta del toggle es MEDIUM]
4. Authentication → Users → Add user, con **el email de la cuenta de Supabase** (Pitfall 4) y "Auto confirm". Copiar el UUID a `ALLOWED_USER_IDS`.
5. Email: OTP Length = 6 (Pitfall 6). Editar el template "Reset password" (F4).
6. Copiar del botón "Connect" la URI del **Session pooler** (`postgres.<ref>@aws-?-us-east-1.pooler.supabase.com:5432`) y anteponer el driver: `postgresql+psycopg://…?sslmode=require`.
7. Copiar la publishable key (`sb_publishable_…`). Si el proyecto solo tiene la anon legacy, sirve igual. [CITED: api-keys]

**Verificación SC4:**
```bash
curl -s "https://<ref>.supabase.co/rest/v1/probes?select=*" -H "apikey: <publishable>"            # PASS: 42501 o []
curl -s -X POST "https://<ref>.supabase.co/auth/v1/signup" -H "apikey: <publishable>" \
  -H "Content-Type: application/json" -d '{"email":"intruso@example.com","password":"x12345678"}' # PASS: 422 signup_disabled
```
El código `signup_disabled` existe en auth-js [VERIFIED]. Que el status sea 422 viene de una fuente de terceros (MEDIUM).

### D2. `render.yaml` + Cloudflare Pages + cron
```yaml
services:
  - type: web
    name: control-de-gastos-api
    runtime: python
    rootDir: backend
    region: virginia
    plan: free
    buildCommand: uv sync --frozen --no-dev
    startCommand: .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port $PORT
    healthCheckPath: /health
    autoDeployTrigger: commit
    envVars:
      - { key: PYTHON_VERSION, value: 3.13.9 }   # poner la última 3.13.x disponible
      - { key: DATABASE_URL, sync: false }
      - { key: SUPABASE_URL, sync: false }
      - { key: ALLOWED_USER_IDS, sync: false }
      - { key: CORS_ORIGINS, sync: false }
```
[CITED: render.com/docs/blueprint-spec. `autoDeployTrigger` reemplaza a `autoDeploy`. Las variables `sync: false` se piden solo al crear el Blueprint]. Las migraciones se corren **desde local** (`uv run alembic upgrade head` con la `.env` de Supabase) y no en el build. Así un deploy roto no puede tocar el schema.
**Cloudflare Pages:** conectar el repo con root directory `frontend`, build `npm run build` y output `dist`. Variables (de build): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_API_URL`. Sin `404.html`, Pages ya funciona como SPA. [CITED: serving-pages]
**cron-job.org:** `GET https://<render>.onrender.com/health` cada 10 min. Render free se apaga a los 15 min sin tráfico y tiene 750 h/mes, que alcanzan para un servicio 24/7 (unas 744 h). [CITED en CLAUDE.md: render.com/docs/free]

### D3. `docker-compose.yml`
```yaml
services:
  db:
    image: postgres:17     # Supabase hosted usa PG17 por defecto [CITED: changelog 46080]
    environment: { POSTGRES_USER: postgres, POSTGRES_PASSWORD: postgres, POSTGRES_DB: test }
    ports: ["5433:5432"]   # 5433 para no chocar con un Postgres local
```

### Tooling (pyproject)
```toml
[tool.ruff.lint]
select = ["E", "F", "I", "B", "UP", "DTZ"]
[tool.mypy]
strict = true
plugins = ["pydantic.mypy"]
[tool.pytest.ini_options]
testpaths = ["tests"]
```
SQLAlchemy 2.x tipa `Mapped[...]` de forma nativa, sin plugin de mypy.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JWT secret HS256 | Signing keys asimétricas + JWKS | 2025 | Verificar con `PyJWKClient` |
| anon key (JWT) | publishable key `sb_publishable_…` (no es JWT) | 2025 | Va en el header `apikey`. Las dos conviven |
| Tablas de `public` con grants automáticos a anon | Sin grants por defecto | Proyectos nuevos desde 30/05/2026, todos desde 30/10/2026 | El curl devuelve 42501 |
| `HTTPBearer` respondía 403 sin header | Responde 401 + `WWW-Authenticate` | FastAPI reciente (0.162 verificado) | Cumple SC2 sin código extra |
| `autoDeploy` en render.yaml | `autoDeployTrigger: commit` | Render, reciente | Usar el nuevo |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `{{ .Token }}` funciona en el template "Reset password" y `verifyOtp(type:'recovery')` lo acepta | F4 | Si falla, AUTH-07 se bloquea. El checkpoint manual lo detecta |
| A2 | `alembic_version` ya existe cuando corre la migración 0001 | Pitfall 2 | El `ALTER` falla y hay que moverlo a la migración 0002. El test lo detecta |
| A3 | `uv run` re-sincroniza las dependencias de dev, por eso se usa `.venv/bin/uvicorn` | Pitfall 11 | Bajo: el start propuesto funciona igual |
| A4 | Las variables de entorno tienen prioridad sobre `.env`, y `list[...]` se parsea como JSON en pydantic-settings | B1, Pitfall 14 | Los tests podrían apuntar a la DB equivocada. Mitigación: el conftest pisa `DATABASE_URL` |
| A5 | OneDrive interfiere con `node_modules`/`.venv` | Pitfall 13 | Builds lentos o archivos bloqueados |
| A6 | Ubicación y label en el dashboard de "Allow new users to sign up" y "Email OTP Length" | D1 | Bajo: buscar en la UI |
| A7 | Render ofrece `region: virginia` en el plan free | Pitfall 12 | Usar ohio |
| A8 | Paquetes sin slopcheck (todos de primera línea) | Audit | Bajo |

## Open Questions (RESOLVED)

> RESOLVED 2026-10-29 by user: 1) tabla `probes`; 2) PWA diferida a Fase 7; 3) el usuario mueve el repo fuera de OneDrive; 4) Node 24 LTS + react-router 8.5.

1. **¿Qué tabla usa la Fase 1 para probar AUTH-05 y AUTH-06 si todavía no hay dominio?**
   - Recomendación: una tabla mínima `probes(id, user_id, created_at)` con RLS y `GET /probes/{id}` protegido. No hay endpoint de creación: los tests insertan directo en la DB. La Fase 3 la puede borrar en su migración o dejarla. No se recomienda adelantar `categories`, porque el SC5 de la Fase 3 asume que se crea ahí.
2. **¿PWA instalable ya en la Fase 1?** AUTH-02 menciona "al reabrir la PWA instalada", pero la PWA es alcance de la Fase 7.
   - Recomendación: en la Fase 1 verificar la persistencia con recarga y cierre/reapertura del navegador, y verificar la PWA instalada en la Fase 7. Si el usuario la quiere ahora, alcanza con `VitePWA({ registerType: 'autoUpdate', manifest: {...} })`, sin runtime caching para la API, más íconos.
3. **¿Mover el repo fuera de OneDrive?** Lo decide el usuario antes del primer `npm i` / `uv sync`.
4. **¿Actualizar a Node 24 o bajar a react-router 7?** Recomendación: Node 24 LTS, en línea con `CLAUDE.md`. Contradice la nota de D-11, que no consideraba el engine de react-router.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python | backend | ✓ | 3.13.2 | — |
| uv | backend | ✗ | — | Instalar: `winget install --id=astral-sh.uv -e` o el instalador PowerShell de astral.sh [ASSUMED: comandos] |
| Node | frontend | ✓ (versión baja) | 22.14.0 | Actualizar a 24 LTS (Pitfall 1) |
| Docker | tests | ✓ | 28.5.1 | — |
| git | repo | ✓ | — | — |
| gh CLI | crear el repo | ✗ | — | Crear el repo a mano en github.com |
| Cuentas Supabase / Render / Cloudflare / cron-job.org / GitHub | deploy | n/a | — | Checkpoints `human-action` |

**Bloqueante sin fallback:** ninguno.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest 9.2 (backend) + Vitest 5 (frontend, solo `authErrors.ts`) |
| Config file | `backend/pyproject.toml` `[tool.pytest.ini_options]` (Wave 0) |
| Quick run command | `cd backend && uv run pytest -x -q` |
| Full suite command | `docker compose up -d db && cd backend && uv run ruff check . && uv run ruff format --check . && uv run mypy app && uv run pytest` (+ `cd frontend && npm run build && npx vitest run`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Login con credenciales correctas e incorrectas | manual (Supabase real) + unit del mapeo de errores | `npx vitest run src/features/auth` | ❌ Wave 0 |
| AUTH-02 | Recargar y seguir logueado | manual | — (checkpoint: login → F5 → sigue en `/`) | n/a |
| AUTH-03 | Logout desde el header → `/login`, la sesión de otro dispositivo sigue viva | manual | — | n/a |
| AUTH-04 | 401: sin header / vencido / HS256 / otra clave / aud / iss / sub no-UUID. 403: fuera de la allowlist. 200 `/me` = sub | integration | `uv run pytest tests/test_auth.py -x` | ❌ Wave 0 |
| AUTH-05 | Probe de A pedido por B → 404, por A → 200 | integration (Docker) | `uv run pytest tests/test_probes.py -x` | ❌ Wave 0 |
| AUTH-06 | Toda tabla de `public` tiene RLS | integration (Docker) | `uv run pytest tests/test_rls.py -x` | ❌ Wave 0 |
| AUTH-06 | curl a la Data API → 42501/[]; signup → 422 | manual (Supabase real) | curls de D1 | n/a |
| AUTH-07 | Pedir código → mail → código + contraseña nueva → `/` → login con la nueva | manual (≤2 envíos/h) | — | n/a |
| SC5 | `/health` 200 con DB (local en Docker y en Render) | integration + smoke | `uv run pytest tests/test_health.py -x`; `curl https://<render>/health` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `uv run pytest -x -q` (unos segundos con Docker levantado)
- **Per wave merge:** full suite (ruff + mypy + pytest + build del frontend)
- **Phase gate:** full suite verde + los checkpoints manuales de SC1, SC4, SC5 (deploy) y SC6

### Wave 0 Gaps
- [ ] `docker-compose.yml` (postgres:17 en 5433)
- [ ] `backend/tests/conftest.py`: env, claves ES256, `FakeJWKS`, `make_token`, migración de sesión, `TRUNCATE`
- [ ] `backend/tests/test_auth.py`, `test_probes.py`, `test_rls.py`, `test_health.py`
- [ ] `frontend`: `vitest` en devDeps + `src/features/auth/authErrors.test.ts`

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth (password, OTP de recovery, signups off, rate limits nativos) |
| V3 Session Management | yes | supabase-js (refresh automático). Logout `scope:'local'` |
| V4 Access Control | yes | `get_current_user_id` + allowlist + `WHERE user_id` → 404. RLS sin policies y sin grants |
| V5 Input Validation | yes | `UUID` en los path params (FastAPI → 422). zod en el cliente |
| V6 Cryptography | yes | PyJWT[crypto] con ES256/RS256 fijos. Nada propio |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Confusión de algoritmo (HS256/none) | Spoofing | `algorithms=["ES256","RS256"]` fijo + test HS256 |
| Token de otro proyecto Supabase | Spoofing | `issuer` exacto + `audience` |
| IDOR por id | Info disclosure | `WHERE id AND user_id`, 404 |
| Data API con publishable key | Info disclosure / Tampering | Sin grants + RLS sin policies + curl de verificación |
| Alta de cuentas ajenas | Elevation | Signups off + `ALLOWED_USER_IDS` (403) |
| Enumeración de emails en recovery | Info disclosure | `resetPasswordForEmail` no revela si la cuenta existe; la UI siempre pasa al paso 2 |
| Secretos en un repo público | Info disclosure | `.env` en `.gitignore`. Solo `VITE_*` públicas. `sync:false` en Render |
| CORS abierto | Spoofing | `CORS_ORIGINS` explícito |

## Sources

### Primary (HIGH)
- Código de auth-js (`supabase/supabase-js` master): `types.ts` (`EmailOtpType` incluye `recovery`; `ResendParams` sin recovery), `GoTrueClient.ts` (`verifyOtp` → `PASSWORD_RECOVERY`, `signOut` con scope `global` por defecto, `flowType: 'implicit'`, deprecación del callback async), `error-codes.ts`
- Wheels de PyJWT 2.15.1 (exceptions, firma de `PyJWKClient`) y FastAPI 0.162.0 (`HTTPBearer` → 401)
- npm registry: versiones y engines (react-router 8.5.1 `>=22.22.0`, 7.18.5 `>=20`; supabase-js `>=22`)
- https://supabase.com/docs/guides/auth/jwt-fields (aud/iss)
- https://supabase.com/docs/guides/auth/signing-keys
- https://supabase.com/docs/guides/api/api-keys
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/auth/auth-email-passwordless
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://render.com/docs/blueprint-spec, https://render.com/docs/python-version, https://render.com/docs/uv-version
- https://developers.cloudflare.com/pages/configuration/serving-pages/, https://developers.cloudflare.com/pages/configuration/build-image/

### Secondary (MEDIUM)
- https://supabase.com/docs/guides/auth/general-configuration (toggle de signups); https://www.guardlayer.io/blog/supabase-signups-not-allowed-for-this-instance (422 `signup_disabled`)
- https://supabase.com/docs/reference/cli/config (`otp_length` default 6, rango 6 a 10)
- https://supabase.com/changelog/46080-self-hosted-supabase-upgrading-from-pg-15-to-17-breaking-change (PG17 default en la plataforma)

### Tertiary (LOW)
- https://dev.to/incultnitollc/your-otp-regex-assumes-six-digits-supabase-magic-links-dont-33i1 (proyectos con OTP de 8 dígitos)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH. Re-verificado en los registros hoy.
- Auth/OTP: HIGH en la API (código fuente). MEDIUM en el template de recovery con `{{ .Token }}` (A1).
- Supabase config/RLS: HIGH (docs y changelog). MEDIUM en los labels del dashboard.
- Deploy: HIGH en los campos de Render y Pages. MEDIUM en la combinación `rootDir` + Python.
- Pitfalls: HIGH en los que se verificaron en código. Los demás marcados.

**Research date:** 2026-10-29
**Valid until:** ~2026-11-28. Supabase cambia rápido: revisar el changelog antes de ejecutar.
