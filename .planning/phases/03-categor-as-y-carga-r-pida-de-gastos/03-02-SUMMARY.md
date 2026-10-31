---
phase: 03-categor-as-y-carga-r-pida-de-gastos
plan: 02
subsystem: frontend
tags: [api-client, fecha, categorias, vitest]
requires: []
provides: [api-writes, api-types, hoyART, ayer, categorias-helpers]
affects: [03-03, 03-05]
tech-stack:
  added: []
  patterns: [Intl.DateTimeFormat formatToParts for ART date, Intl.Segmenter grapheme check]
key-files:
  created:
    - frontend/src/api/types.ts
    - frontend/src/lib/fecha.ts
    - frontend/src/lib/fecha.test.ts
    - frontend/src/lib/categorias.ts
    - frontend/src/lib/categorias.test.ts
  modified:
    - frontend/src/api/client.ts
    - frontend/src/api/client.test.ts
    - frontend/src/lib/money.test.ts
    - frontend/src/components/ui/CategoryGrid.tsx
decisions:
  - "api() takes optional { method, body }; Content-Type and body only when body is present, so GETs are byte-identical to before"
  - "ordenar coerces optional esOtros with !! so categories without the field sort as non-Otros"
metrics:
  duration: ~10 min
  completed: 2026-10-31
---

# Phase 03 Plan 02: Client pure helpers Summary

api() now does authenticated POST/PUT with JSON body (resent on the 401 retry), plus hand-written API types, ART-zone `hoyART`/`ayer`, and category helpers (`aCategoria`, `ordenar`, `colorMenosUsado`, `esUnEmoji`, `EMOJIS`, copy constants), all unit-tested.

## Tasks

| Task | Commits |
|------|---------|
| 1: api() con método y body | 4c3f1bf (test), 38f725e (feat) |
| 2: Tipos, fecha ART, helpers de categorías | 32b130c (test), 1dc54a8 (feat) |

## Verification

- `npx vitest run`: 82/82 pass (5 files)
- `npm run lint`: 0 errors (2 pre-existing warnings in router.tsx/main.tsx)
- `npm run build`: ok

## Deviations from Plan

None - plan executed exactly as written. Note: the new money.test.ts case (`1.234,56` -> 123456n) passed in RED because it covers existing code; it is a regression guard.

## TDD Gate Compliance

RED (test) and GREEN (feat) commits present for both tasks.

## Self-Check: PASSED
