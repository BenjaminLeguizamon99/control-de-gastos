---
phase: 1
slug: fundaci-n-end-to-end
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-29
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 9.2 (backend) + Vitest 5 (frontend, solo `authErrors.ts`) |
| **Config file** | `backend/pyproject.toml` `[tool.pytest.ini_options]` — none, Wave 0 installs |
| **Quick run command** | `cd backend && uv run pytest -x -q` |
| **Full suite command** | `docker compose up -d db && cd backend && uv run ruff check . && uv run ruff format --check . && uv run mypy app && uv run pytest` + `cd frontend && npm run build && npx vitest run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && uv run pytest -x -q`
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

*Filled by the planner per task (Task ID = {N}-{plan}-{task}). Requirement → test mapping from RESEARCH.md:*

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| AUTH-01 | Login OK / credenciales inválidas (mapeo de errores) | unit + manual | `cd frontend && npx vitest run src/features/auth` | ❌ W0 | ⬜ pending |
| AUTH-02 | Recargar y seguir logueado | manual | — | n/a | ⬜ pending |
| AUTH-03 | Logout local → `/login` | manual | — | n/a | ⬜ pending |
| AUTH-04 | 401 sin header / vencido / HS256 / otra clave / aud / iss / sub no-UUID; 403 fuera de allowlist; 200 `/me` | integration | `cd backend && uv run pytest tests/test_auth.py -x` | ❌ W0 | ⬜ pending |
| AUTH-05 | Probe de A pedido por B → 404, por A → 200 | integration (Docker) | `cd backend && uv run pytest tests/test_probes.py -x` | ❌ W0 | ⬜ pending |
| AUTH-06 | Toda tabla de `public` tiene RLS | integration (Docker) | `cd backend && uv run pytest tests/test_rls.py -x` | ❌ W0 | ⬜ pending |
| SC5 | `/health` 200 con `SELECT 1` | integration + smoke | `cd backend && uv run pytest tests/test_health.py -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `docker-compose.yml` — postgres:17 en puerto 5433
- [ ] `backend/tests/conftest.py` — env, claves ES256, `FakeJWKS`, `make_token`, migración de sesión, `TRUNCATE`
- [ ] `backend/tests/test_auth.py`, `test_probes.py`, `test_rls.py`, `test_health.py`
- [ ] `frontend`: `vitest` en devDeps + `src/features/auth/authErrors.test.ts`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Login con Supabase real | AUTH-01 | Requiere proyecto Supabase real | Login con credenciales correctas → `/`; incorrectas → mensaje de error |
| Sesión persiste | AUTH-02 | Comportamiento del navegador | Login → F5 → sigue en `/` |
| Logout | AUTH-03 | Flujo de UI | Logout desde el header → `/login`; otra sesión sigue viva |
| Data API bloqueada / signups off | AUTH-06 | Supabase real | `curl /rest/v1/probes` con anon key → 42501 o `[]`; signup → 422 |
| Recuperación con código | AUTH-07 | Email real (≤2 envíos/h) | Pedir código → mail → código + contraseña nueva → `/` → login con la nueva |
| Deploy free tier | SC5 | Infra externa | `curl https://<render>/health` → 200; Pages sirve la SPA en rutas profundas |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
