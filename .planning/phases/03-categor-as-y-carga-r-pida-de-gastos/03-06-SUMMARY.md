---
phase: 03-categor-as-y-carga-r-pida-de-gastos
plan: 06
subsystem: ops
tags: [supabase, migracion, deploy, render, cloudflare, uat]
requires: ["03-01", "03-02", "03-03", "03-04", "03-05"]
provides: ["migración 0002 en Supabase", "Fase 3 desplegada", "UAT en celular aprobado"]
affects: []
tech-stack:
  added: []
  patterns: ["migrar Supabase antes del push a main"]
key-files:
  created: []
  modified: []
decisions:
  - "El deploy de Render se disparó a mano: el push no generó un deploy automático aunque Auto-Deploy está en On Commit"
metrics:
  duration: ~45min
  completed: 2026-11-01
  tasks: 3
  files: 0
---

# Phase 3 Plan 06: Migración, deploy y UAT Summary

Migración 0002 aplicada en Supabase con la Data API cerrada, push de la fase a main, smoke test del deploy y UAT en celular real aprobado.

## Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 | Verificar pg_c_utf8, migrar Supabase y probar la anon key | — (sin cambios de código) |
| 2 | Push a main y smoke test del deploy | push `5176d46..1921918` |
| 3 | UAT en el celular real | — |

## Verification

Suite local antes del checkpoint: backend 77 passed, ruff check y ruff format --check limpios, mypy limpio; frontend vitest 82/82, lint 0 errores, build OK.

Task 1 (el usuario corrió `alembic upgrade head`; los chequeos de solo lectura los corrió el orquestador contra Supabase):
- `SELECT version()` → PostgreSQL 17.11 (pooler `aws-0-us-east-1`)
- `pg_collation` → `pg_c_utf8`, `und-x-icu`
- `alembic_version` → `0002`; `categories`, `expenses`, `installments` con `rowsecurity = true`
- `uq_categories_user_name` → `(user_id, lower((btrim(name) COLLATE pg_c_utf8)))`
- curl con la publishable key a `/rest/v1/{categories,expenses,installments}` → `[]` (HTTP 200) en las tres

Task 2 (después del deploy manual en Render):
- `GET /health` → `{"status":"ok"}`
- `GET /categories` sin token → 401; `POST /expenses` sin token → 401
- Preflight CORS POST `/expenses` y PUT `/categories/x` desde workers.dev → 200
- workers.dev `/gasto/nuevo` y `/categorias` → 200
- openapi: `/categories`, `/categories/{category_id}`, `/expenses`, `/expenses/last-payment-method`, `/health`, `/me`, `/probes/{probe_id}`

Task 3: el usuario respondió "aprobado" a los 12 pasos de la UAT.

## Deviations from Plan

1. **Deploy de Render manual.** Después del push, durante 12 minutos Render siguió sirviendo el deploy de `29e01c7` (Fase 1): `/categories` 404, preflight POST 400. Auto-Deploy figura en "On Commit", pero no apareció ningún deploy nuevo en Events. El usuario disparó "Manual Deploy → Deploy latest commit" y el smoke test pasó. Mientras tanto, el frontend nuevo (Cloudflare desplegó bien) estuvo llamando a un backend sin esas rutas.
2. **`.planning/config.json`.** Tenía `"_auto_chain_active": false`, la marca temporal que escribe GSD. El usuario pidió descartarla y se descartó antes del push.

## Known Stubs

Ninguno.

## Notes

- Hay que revisar la conexión GitHub → Render (Settings → Build & Deploy, y los permisos de la GitHub App) antes de la próxima fase con cambios de backend.

## Self-Check: PASSED
