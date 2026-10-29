# Phase 1: Fundación end-to-end - Context

**Gathered:** 2026-10-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Esqueleto que funciona de punta a punta y desplegado: monorepo (`backend/` FastAPI + `frontend/` React/Vite), login con email y contraseña vía Supabase Auth, recuperación de contraseña por código OTP dentro de la app, backend que verifica el JWT (JWKS) y expone `/me` protegido y `/health` (con `SELECT 1`), conexión a Supabase Postgres por pooler session mode, Alembic con RLS habilitado sin policies, signups deshabilitados, y tooling (ruff, mypy, pytest) limpio. Requisitos: AUTH-01..AUTH-07.

Sin features de dominio (categorías, gastos) — esas son Fase 3+. Sin sistema de diseño — es Fase 2.

</domain>

<decisions>
## Implementation Decisions

### Hosting y deploy
- **D-01:** Backend en **Render free tier**. Frontend en **Cloudflare Pages**. DB + Auth en **Supabase free**.
- **D-02:** Código en **GitHub, repo público**. Deploy automático en cada push a `main` (Render y Cloudflare Pages conectados al repo). Sin CI de tests bloqueante en esta fase (ruff/mypy/pytest se corren localmente).
- **D-03:** Repo público → **ningún secreto en el repo**: `.env` en `.gitignore`, `.env.example` versionado, secretos solo en variables de entorno de Render/Cloudflare. Solo variables `VITE_*` públicas (URL + anon/publishable key) en el frontend; nunca `service_role` ni la DB URL.
- **D-04:** **Un solo proyecto Supabase** (sirve para la app desplegada y para desarrollo manual). Los tests automatizados NO tocan Supabase: corren contra Postgres local en Docker.
- **D-05:** Keep-alive con **cron-job.org** llamando a `GET /health` cada ~10 min; `/health` ejecuta `SELECT 1` contra la DB, así también evita la pausa por inactividad de Supabase. (Configuración manual del usuario — documentar pasos.)

### Cuenta y autenticación
- **D-06:** La única cuenta se crea **a mano desde el dashboard de Supabase** (Authentication → Add user). Signups deshabilitados desde el inicio. La app **no** tiene pantalla de registro.
- **D-07:** Allowlist en el backend: variable de entorno **`ALLOWED_USER_IDS`**; un JWT válido de un `sub` no listado recibe 403/401. Capa extra además de signups deshabilitados.
- **D-08:** **Sesión persistente indefinida** hasta logout: supabase-js con refresh automático de tokens; sin expiración por inactividad.
- **D-09:** **"Olvidé mi contraseña" en la app (AUTH-07, agregado en esta discusión)**: flujo por **código OTP de 6 dígitos** enviado por email (template de recovery de Supabase con `{{ .Token }}`, no link), verificado dentro de la PWA (`verifyOtp` tipo recovery) y luego `updateUser({ password })`. Motivo: en iOS un link abre Safari y no la PWA instalada. El researcher debe verificar la API exacta de supabase-js y la configuración del email template.

### Entorno local y aprendizaje
- **D-10:** El usuario **tiene Docker Desktop** → tests de integración contra **Postgres en Docker** (`docker compose`), versión de Postgres alineada a la de Supabase.
- **D-11:** Herramientas detectadas en la máquina (Windows 11): Python 3.13.2 ✓, Node 22.14 ✓ (compatible con Vite 8 — no hace falta Node 24), git ✓, Docker 28 ✓. **Falta instalar `uv`** (el plan incluye el paso). `gh` CLI no está instalado (opcional; crear el repo de GitHub puede ser manual).
- **D-12:** Explicaciones de Python en **un archivo de notas por fase**: `docs/aprendizaje/fase-01.md`, cada concepto con analogía a Java (uv ≈ Maven/Gradle, `Depends()` ≈ `@Autowired`, pydantic-settings ≈ `@ConfigurationProperties`, Alembic ≈ Flyway, fixtures ≈ `@BeforeEach`, etc.). Código limpio con comentarios breves solo del "por qué".
- **D-13:** **Claude escribe el código, el usuario revisa** y pregunta. No hay ejercicios guiados.

### Claude's Discretion
- **Pantalla de login** (no discutida): mínima y funcional, sin invertir en estilos — se reestiliza en Fase 2 con el sistema de diseño. Incluye: login, "Olvidé mi contraseña" (pedir código → ingresar código + nueva contraseña), y un botón de logout visible en la pantalla autenticada.
- Estructura exacta de carpetas del monorepo y del backend por capas (seguir `.planning/research/ARCHITECTURE.md`).
- Respuesta para usuario fuera de allowlist (401 vs 403).
- Contenido de la pantalla autenticada de prueba (p. ej. mostrar el `user_id` devuelto por `/me`).

### Locked from project level (no reabrir)
- SQLAlchemy 2.x **sync** + endpoints `def` + psycopg 3 (`postgresql+psycopg://`).
- JWT verificado por **JWKS** (`PyJWKClient`), algoritmos fijos (ES256/RS256), `aud` + `iss` verificados; `user_id` solo del `sub` del token.
- **RLS habilitado sin policies** en cada tabla creada por Alembic; verificar con `curl` a `/rest/v1/<tabla>` usando la anon key.
- Conexión por **pooler session mode (puerto 5432, IPv4)** — la conexión directa es solo IPv6.
- Dinero como BIGINT centavos (aplica desde Fase 3).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Proyecto y alcance
- `.planning/PROJECT.md` — contexto, constraints, key decisions
- `.planning/REQUIREMENTS.md` — AUTH-01..AUTH-07 (AUTH-07 agregado en esta discusión)
- `.planning/ROADMAP.md` §"Phase 1" y §"Decisiones fijadas" — goal y 6 success criteria

### Investigación
- `.planning/research/SUMMARY.md` — decisiones resueltas (sync, centavos), fase 1 como walking skeleton
- `.planning/research/STACK.md` — versiones exactas (FastAPI, SQLAlchemy, psycopg, PyJWT, Vite, supabase-js), hosting, gotchas TS 7 / oxlint
- `.planning/research/ARCHITECTURE.md` — layout del monorepo, capas backend (mapeo a Spring), dependencia `get_current_user_id`, RLS sin policies
- `.planning/research/PITFALLS.md` — pitfalls 1 (RLS), 2 (JWT/IDOR), 6 (pooler/prepared statements), 10 (login en iOS), 12 (CORS, secretos, trailing slash)

### Docs externas a verificar por el researcher
- https://supabase.com/docs/guides/auth/signing-keys — asimétricas/JWKS (confirmar que el proyecto las tiene activas)
- https://supabase.com/docs/guides/auth/jwts — claims (`aud`, `iss`) — validar con token real
- https://supabase.com/docs/guides/database/connecting-to-postgres — pooler session mode
- https://supabase.com/docs/guides/auth/passwords — reset de contraseña / OTP de recovery
- https://render.com/docs/free — límites del free tier

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Ninguno — proyecto greenfield (solo `.planning/` y `CLAUDE.md`).

### Established Patterns
- Ninguno aún. Esta fase **establece** los patrones: capas router/service/repository, `Depends()` para auth y sesión DB, migraciones Alembic con `ENABLE ROW LEVEL SECURITY`, estructura de tests con pytest + Postgres en Docker.

### Integration Points
- Supabase (Auth + Postgres), Render, Cloudflare Pages, cron-job.org, GitHub.

</code_context>

<specifics>
## Specific Ideas

- El usuario es dev Java aprendiendo Python: el archivo `docs/aprendizaje/fase-01.md` es un entregable de la fase.
- Tareas manuales del usuario (crear proyecto Supabase con signing keys asimétricas, crear su usuario, deshabilitar signups, editar template de email de recovery, crear repo GitHub, conectar Render/Cloudflare, configurar cron-job.org) deben quedar como pasos claros con checkpoints `human-action` en el plan.

</specifics>

<deferred>
## Deferred Ideas

- CI con GitHub Actions que corra ruff/mypy/pytest antes de desplegar — considerado, no elegido para esta fase; posible mejora futura.
- Expiración de sesión por inactividad — descartado por ahora (prioriza velocidad de carga).

</deferred>

---

*Phase: 01-fundaci-n-end-to-end*
*Context gathered: 2026-10-29*
