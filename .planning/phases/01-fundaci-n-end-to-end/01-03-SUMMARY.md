---
phase: 01-fundaci-n-end-to-end
plan: 03
subsystem: frontend-auth
tags: [frontend, vite, react, supabase-auth, tanstack-query, react-router, tailwind]
requires: []
provides:
  - "frontend/ (Vite 8 + React 19 + TS 7 + Tailwind 4 + Vitest 5, oxlint)"
  - "api<T>(path) con Bearer + ApiError(status)"
  - "AuthProvider/useAuth {session, loading}"
  - "/login, / (con GET /me) y ProtectedLayout con logout local"
affects: [01-04]
tech-stack:
  added: ["@supabase/supabase-js 2.118", "react-router 8.5", "@tanstack/react-query 5.105", "zod 4.6", "tailwindcss 4.3", "@tailwindcss/vite 4.3", "vitest 5.0"]
  patterns: ["feature folders (src/features/auth)", "api() con token de getSession() en cada llamada", "TanStack Query para server state", "guards como componentes de ruta"]
key-files:
  created:
    - frontend/package.json
    - frontend/package-lock.json
    - frontend/.nvmrc
    - frontend/.env.example
    - frontend/.gitignore
    - frontend/index.html
    - frontend/vite.config.ts
    - frontend/src/main.tsx
    - frontend/src/index.css
    - frontend/src/env.d.ts
    - frontend/src/lib/supabase.ts
    - frontend/src/api/client.ts
    - frontend/src/features/auth/authErrors.ts
    - frontend/src/features/auth/authErrors.test.ts
    - frontend/src/features/auth/AuthProvider.tsx
    - frontend/src/features/auth/LoginPage.tsx
    - frontend/src/app/router.tsx
    - frontend/src/app/ProtectedLayout.tsx
    - frontend/src/app/HomePage.tsx
  modified: []
decisions:
  - ".nvmrc = 26 (Node 26 LTS instalado; el usuario eligió quedarse con 26 en vez de 24)"
  - "Pantalla 'Cargando…' de sesión inicial vive en main.tsx (componente App) antes del RouterProvider"
  - "authErrorMessage usa Object.hasOwn para que códigos como 'toString' caigan al fallback"
metrics:
  duration: "~15 min"
  completed: 2026-10-29
---

# Phase 01 Plan 03: Frontend auth slice Summary

Frontend Vite 8 + React 19 con login de Supabase (email+contraseña), pantalla `/` que muestra el `user_id` devuelto por `GET /me` vía `api()` con Bearer, persistencia de sesión por defaults de supabase-js y logout local desde el header.

## Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 | Node LTS y legitimidad de paquetes | resuelto por el orquestador (Node v26.13.0, paquetes "aprobado") |
| 2 | Scaffold + mapeo de errores (TDD) | 5c460e2 (RED), 859114b (GREEN) |
| 3 | Login -> / con /me -> logout | c2c45e1 |

## Verification

- `npx vitest run`: 10/10 tests pasan.
- `npm run build` y `npm run lint` exit 0 (lint: 2 warnings `only-export-components` de fast refresh en main.tsx y router.tsx, no son errores).
- Greps de aceptación: `scope: 'local'` 1 línea; sin `supabase.from`, sin `signUp/registr`, sin `service_role/sb_secret/DATABASE_URL`; `Bearer` 1 línea; sin PWA; `lang="es"` y `viewport-fit=cover` presentes; `src/App.tsx` no existe.

## Deviations from Plan

1. **[Decisión del usuario] `.nvmrc` = `26`, no `24`.** Se instaló Node 26.13.0 LTS (cumple react-router >=22.22 y vitest). `engines.node` queda `>=24`. El must_have "contains 24" en `.nvmrc` no aplica.
2. **[Rule 3] `src/main.tsx` placeholder en el commit de Task 2.** Al borrar `App.tsx` del template el build se rompía; main.tsx quedó renderizando solo `StrictMode` hasta Task 3.
3. **[Rule 2] `.env` en `frontend/.gitignore`.** El template solo ignoraba `*.local`; sin esto un `.env` real se podía commitear.
4. **Comentario de router.tsx reescrito** para no contener "registro" (el grep de aceptación `registr` lo marcaba aunque era un comentario).
5. Se borró `public/` entero (`favicon.svg`, `icons.svg`; el template actual no trae `vite.svg`).
6. Se usó `src/env.d.ts` (el template no trae `vite-env.d.ts`; `tsconfig.app.json` ya incluye `types: ["vite/client"]`).

## Known Stubs

- `LoginPage.tsx`: espacio reservado (comentario) para el link "Olvidé mi contraseña": lo agrega 01-04 según el plan.

## Notes for 01-04

- Sin `.env` con valores reales, `src/lib/supabase.ts` tira "Faltan variables VITE_*" al cargar: la verificación manual contra Supabase real y el backend de 01-01 es el checkpoint de 01-04.
- No se probó en navegador (no hay proyecto Supabase todavía).

## Self-Check: PASSED

- Archivos listados en key-files existen; commits 5c460e2, 859114b, c2c45e1 presentes en `git log`.
