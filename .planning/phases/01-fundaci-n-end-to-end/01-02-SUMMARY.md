---
phase: 01-fundaci-n-end-to-end
plan: 02
subsystem: infra
tags: [supabase, jwks, rls, alembic, pooler, auth]
requires: ["01-01"]
provides:
  - "Proyecto Supabase (us-east-1) con signing key ES256, signups off, usuario unico en ALLOWED_USER_IDS"
  - "Migracion 0001 aplicada en Supabase (probes + RLS en probes y alembic_version)"
  - "backend/.env local (gitignored) apuntando al pooler session mode :5432 con sslmode=require"
  - "Template Reset password con {{ .Token }} (OTP 6 digitos) para AUTH-07"
affects: [01-03, deploy en Render]
tech-stack:
  added: []
  patterns:
    - "Verificacion de Data API cerrada: curl con publishable key debe dar [] o 42501, nunca GRANT"
key-files:
  created: []
  modified:
    - backend/.env (local, no versionado)
decisions:
  - "Data API cerrada verificada por RLS sin policies: PostgREST devuelve [] (200) en vez de 42501; ambos son PASS segun el plan"
metrics:
  duration: "~5 min (Task 2)"
  completed: 2026-10-29
  tasks: 2
  files: 1
---

# Phase 1 Plan 02: Supabase real conectado y endurecido Summary

Backend local conectado a Supabase por el pooler session mode (5432, sslmode=require): migracion 0001 aplicada con RLS en todas las tablas de `public`, JWKS publica una clave ES256, la Data API con la publishable key no devuelve filas y `/auth/v1/signup` responde `signup_disabled`.

## Tasks

| Task | Name | Commit | Notes |
| ---- | ---- | ------ | ----- |
| 1 | Crear y configurar Supabase + backend/.env | (sin commit) | checkpoint:human-action; el usuario respondio "listo"; el orquestador valido `.env` sin imprimir valores |
| 2 | Migracion + verificacion con curl | (sin commit: no hay archivos versionados) | 6/6 chequeos PASS, evidencia abajo |

## Evidencia (sin keys ni passwords)

| # | Chequeo | Resultado | PASS |
|---|---------|-----------|------|
| 1 | `GET $SUPABASE_URL/auth/v1/.well-known/jwks.json` | `keys` = 1 clave: `alg=ES256, kty=EC, crv=P-256` | si |
| 2 | `uv run alembic upgrade head` / `alembic current` | `Running upgrade -> 0001, probes + RLS`; `0001 (head)` | si |
| 3 | Query de tablas de `public` sin RLS | `[]`; detalle: `[('alembic_version', True), ('probes', True)]` | si |
| 4 | Backend local (`fastapi run`, puerto 8000) | `/health` -> 200 `{"status":"ok"}`; `/me` sin token -> 401 `{"detail":"Not authenticated"}`; proceso detenido despues | si |
| 5 | `GET /rest/v1/probes?select=*` y `/rest/v1/alembic_version?select=*` con publishable key | ambos `[]` (200) | si |
| 6 | `POST /auth/v1/signup` | 422 `{"error_code":"signup_disabled","msg":"Signups not allowed for this instance"}` | si |

- `git check-ignore backend/.env` -> ignorado; `git status --porcelain backend/.env` -> vacio.
- No se ejecuto ningun GRANT.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Faltaba `?sslmode=require` en DATABASE_URL**
- Lo agrego el orquestador antes de este agente (mitiga T-01-15).

**2. [Rule 3 - Blocking] Password de DATABASE_URL envuelta en `[ ]`**
- **Found during:** Task 2, paso 2 (`alembic upgrade head` -> `password authentication failed`).
- **Issue:** al reemplazar el placeholder `[YOUR-PASSWORD]` de Supabase quedaron los corchetes alrededor de la password.
- **Fix:** se probo la conexion con psycopg sin imprimir nada (con corchetes: falla; sin corchetes: `select 1` OK) y se quitaron solo esos dos caracteres de `backend/.env`.
- **Files modified:** backend/.env (local, no versionado).

**Nota:** la password tiene caracteres no alfanumericos (el paso 1 del Task 1 pedia alfanumerica). Hoy funciona con SQLAlchemy y psycopg; si aparece un error de parseo de URL (por ejemplo al cargarla en Render), conviene rotarla por una alfanumerica.

## Known Stubs

None.

## Notes for next plans

- `aud="authenticated"` / `iss=.../auth/v1` siguen sin probarse con un token real; se cubre cuando el frontend haga login (01-03).
- El template de Reset password y el OTP de 6 digitos los configuro el usuario en el Task 1; no se pueden verificar por curl sin mandar un mail (limite de 2/h). Se validan en AUTH-07.

## Self-Check: PASSED

- 01-02-SUMMARY.md creado; backend/.env sigue gitignored; puerto 8000 libre (backend detenido).
