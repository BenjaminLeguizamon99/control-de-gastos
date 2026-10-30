---
phase: 01-fundaci-n-end-to-end
plan: 06
subsystem: deploy
tags: [render, cloudflare-workers, cors, cron-job-org, smoke-tests]
requires: ["01-05"]
provides:
  - "Backend en Render free: https://control-de-gastos-api.onrender.com"
  - "Frontend en Cloudflare Workers (static assets, SPA): https://control-de-gastos.leguizamonbenjamin0.workers.dev"
  - "Keep-alive: cron-job.org GET /health cada 10 min"
  - "README con los pasos manuales que realmente funcionaron"
affects: [fase-02, fase-07]
tech-stack:
  added: ["wrangler (Workers Builds, vía npx en el deploy command)"]
  patterns: ["CORS_ORIGINS = origen exacto del frontend, verificado con preflight de origen ajeno"]
key-files:
  created:
    - frontend/wrangler.jsonc
  modified:
    - README.md
decisions:
  - "Frontend en Cloudflare Workers con static assets (*.workers.dev), no Pages: así quedó el proyecto conectado a Git"
  - "Deploy command `npx wrangler deploy --config wrangler.jsonc`; sin --config la auto-config ignora el archivo"
  - "Listas de pydantic-settings (ALLOWED_USER_IDS, CORS_ORIGINS) se cargan en Render como JSON"
  - "PYTHON_VERSION 3.13.18 funciona en Render (duda de 01-05 resuelta)"
metrics:
  duration: "~1 h (mayormente dashboards del usuario)"
  completed: 2026-10-30
---

# Phase 01 Plan 06: Deploy en Render + Cloudflare, keep-alive y prueba en el celular Summary

Backend en Render free y frontend en Cloudflare Workers con static assets (SPA fallback por `wrangler.jsonc`), CORS limitado al origen de workers.dev, keep-alive con cron-job.org y login verificado desde el celular: el goal de la Fase 1 se cumple en producción.

## Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 | Conectar Render, Cloudflare y cron-job.org (checkpoint) | usuario + 29e01c7 (frontend/wrangler.jsonc) |
| 2 | Smoke tests del deploy | orquestador (sin cambios de código) |
| 3 | Probar la app desplegada desde el celular (checkpoint) | aprobado por el usuario |

## Smoke tests (Task 2, todos PASS)

- `GET /health` -> `{"status":"ok"}`.
- `GET /me` sin token -> 401; con `Bearer x.y.z` -> 401.
- Preflight `OPTIONS /me` con `Origin` = URL de workers.dev -> 200 y `access-control-allow-origin` igual a ese origen; con `Origin: https://evil.example` -> 400, sin header ACAO.
- `$WEB/`, `/login`, `/recuperar` -> 200 con `id="root"` (SPA fallback OK).
- Bundle `/assets/index-*.js`: contiene `control-de-gastos-api.onrender.com`, sin `onrender.com//`, sin JWTs, sin URLs de postgres/pooler. Una coincidencia de `sb_secret_` es falso positivo: el chequeo de prefijo de supabase-js (`e.startsWith('sb_secret_')`), sin material de clave.

## Task 3 (celular, aprobado)

Login, sin zoom en los inputs, la sesión sobrevive a recargar y a reiniciar el navegador, logout local, historial de cron-job.org con 200.

## Deviations from Plan

1. **[Rule 3 - Blocking] Cloudflare Workers en vez de Pages.** El proyecto conectado a Git quedó como Worker con static assets (URL `*.workers.dev`, no `*.pages.dev`). Primero servía la carpeta fuente cruda de `frontend/`. Fix: `frontend/wrangler.jsonc` (assets `./dist`, `not_found_handling: single-page-application`, commit 29e01c7) y deploy command `npx wrangler deploy --config wrangler.jsonc`, porque la auto-config de wrangler ignoraba el archivo.
2. **[Rule 3 - Blocking] ALLOWED_USER_IDS como JSON.** El primer arranque en Render crasheó con un UUID pelado; pydantic-settings necesita `["<uuid>"]`. Lo mismo vale para `CORS_ORIGINS`. Documentado en el README.
3. **NODE_VERSION=26 como variable de build** en Cloudflare (Settings -> Build -> Variables and secrets), junto con las `VITE_*`.
4. README actualizado para reflejar todo lo anterior (Render y sección de Cloudflare).

## Known Stubs

None.

## Threat Flags

None: la superficie es la prevista en el threat model (T-01-30..34 verificados por los smoke tests).
