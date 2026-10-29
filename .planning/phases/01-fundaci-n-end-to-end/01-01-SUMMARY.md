---
phase: 01-fundaci-n-end-to-end
plan: 01
subsystem: backend
tags: [fastapi, jwt, jwks, rls, alembic, pytest, uv]
requires: []
provides:
  - "GET /health, GET /me, GET /probes/{probe_id}"
  - "app.auth.CurrentUserId, app.auth.get_jwks_client"
  - "app.db.get_session, app.config.get_settings"
  - "Migracion 0001 (probes + RLS en probes y alembic_version)"
  - "docker-compose postgres:17 en 5433 para tests"
affects: [01-02, fases 3+]
tech-stack:
  added: [fastapi 0.162, pydantic-settings 2.16, sqlalchemy 2.1.6, psycopg 3.3.6, alembic 1.20.1, pyjwt 2.15.1, pytest 9.2, ruff 0.17.3, mypy 2.4.1]
  patterns:
    - "CurrentUserId = Annotated[UUID, Depends(get_current_user_id)]"
    - "Repositorio siempre filtra por user_id; 404 (no 403) si no es del usuario"
    - "Toda tabla nueva de public: ENABLE ROW LEVEL SECURITY sin policies (test_rls lo verifica)"
    - "Tests: env forzado + guard localhost antes de importar app; FakeJWKS override"
key-files:
  created:
    - .gitignore
    - docker-compose.yml
    - backend/pyproject.toml
    - backend/uv.lock
    - backend/.python-version
    - backend/.env.example
    - backend/alembic.ini
    - backend/alembic/env.py
    - backend/alembic/script.py.mako
    - backend/alembic/versions/0001_probes_rls.py
    - backend/app/main.py
    - backend/app/config.py
    - backend/app/db.py
    - backend/app/auth.py
    - backend/app/models/base.py
    - backend/app/models/probe.py
    - backend/app/repositories/probe_repo.py
    - backend/app/routers/health.py
    - backend/app/routers/me.py
    - backend/app/routers/probes.py
    - backend/tests/conftest.py
    - backend/tests/test_auth.py
    - backend/tests/test_probes.py
    - backend/tests/test_rls.py
    - backend/tests/test_health.py
  modified: []
decisions:
  - "403 para usuarios autenticados fuera de ALLOWED_USER_IDS; 401 para todo token invalido"
  - "SQLAlchemy sync + endpoints def (locked en el plan, sobre la sugerencia async de CLAUDE.md)"
  - "ruff isort known-third-party = [alembic] porque la carpeta local alembic/ lo hacia parecer first-party"
metrics:
  duration: "~6 min"
  completed: 2026-10-29
  tasks: 3
  files: 30
---

# Phase 1 Plan 01: Backend walking skeleton Summary

Backend FastAPI con uv: `/me` verifica el JWT de Supabase por JWKS (ES256/RS256 fijos, aud/iss/exp/sub obligatorios, allowlist con 403), `/health` toca la DB, y `probes` prueba el aislamiento 404 entre usuarios con RLS habilitado en toda tabla de `public`. 19 tests verdes contra Postgres 17 en Docker; ruff y mypy strict limpios.

## Tasks

| Task | Name | Commit | Notes |
| ---- | ---- | ------ | ----- |
| 1 | Legitimidad de paquetes + uv | (sin commit) | Resuelto por el orquestador: uv 0.13.6 instalado via winget; el usuario respondio "aprobado" para la lista completa de paquetes. |
| 2 | Scaffold + tests que fallan (RED) | 4bf2b9b | pytest fallo con `ModuleNotFoundError: app.auth` |
| 3 | Implementacion (GREEN) | 7968363 | 19 passed, ruff/format/mypy en 0 |

## Verification

- `docker compose up -d --wait db` -> healthy en 5433.
- `uv run ruff check .`, `uv run ruff format --check .`, `uv run mypy app` -> 0 errores.
- `uv run pytest -q` -> 19 passed (11 auth, 5 probes, 2 rls, 1 health).
- Greps de aceptacion: `algorithms=["ES256", "RS256"]` 1 linea; 2x `ENABLE ROW LEVEL SECURITY`; sin GRANT/POLICY; sin `async def`; sin `allow_origins=["*"]`; `alembic.ini` sin URL.
- `git check-ignore backend/.env` lo ignora; `.env.example` no.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Docker Desktop engine apagado**
- Se arranco con `docker desktop start`; despues `docker compose up --wait` quedo healthy.

**2. [Rule 3 - Blocking] uv no estaba en el PATH del shell**
- Se uso el binario de `%LOCALAPPDATA%\Microsoft\WinGet\Packages\astral-sh.uv_...\uv.exe` agregandolo al PATH por comando.

**3. [Rule 3 - Blocking] `uv init --app` creo un paquete `src/backend` con `[build-system]`**
- Se borro `src/` y se dejo `pyproject.toml` como app sin build (como pedia el plan). Tambien se borro el `alembic/README` generado.

**4. [Rule 1 - Lint] ruff isort clasificaba `alembic` como first-party** por la carpeta local `alembic/`, dejando imports inconsistentes. Se agrego `[tool.ruff.lint.isort] known-third-party = ["alembic"]`.

**5. Ajustes menores sin cambiar asserts:** se quito el `# type: ignore[call-arg]` de `get_settings()` (el plugin de pydantic para mypy lo hacia innecesario y strict lo marcaba como unused); el secreto HS256 del test paso de `"secret"` a 32 bytes para no emitir `InsecureKeyLengthWarning` (el test sigue esperando 401). Se agrego un test extra `test_garbage_token_401` (token mal formado).

## Known Stubs

None. `probes` es una tabla de prueba intencional del walking skeleton (sin endpoint de creacion, por diseno).

## Notes for next plans

- Correr los tests: `docker compose up -d --wait db` en la raiz y `uv run pytest` en `backend/`.
- El nombre del proyecto compose sale del directorio; en el worktree quedo `agent-...-db-1`. En el repo principal se va a llamar distinto, sin efecto en el puerto 5433.
- `aud="authenticated"`/`iss=.../auth/v1` siguen sin verificar contra un token real de Supabase (queda para 01-02).

## Self-Check: PASSED

- Archivos clave existen (auth.py, 0001_probes_rls.py, probe_repo.py, conftest.py, docker-compose.yml).
- Commits 4bf2b9b y 7968363 presentes en el log.
