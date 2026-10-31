---
phase: 03-categor-as-y-carga-r-pida-de-gastos
plan: 03
subsystem: frontend
tags: [expense-form, toast, fab, react-query]
requires: [03-01, 03-02]
provides: [nuevo-gasto-page, fab, useCategorias, FONDO-export]
affects: [03-05]
tech-stack:
  added: []
  patterns: [remount via key for reset, always-mounted role=status region, draft UUID reused on retry]
key-files:
  created:
    - frontend/src/features/categories/useCategorias.ts
    - frontend/src/features/expenses/NuevoGastoPage.tsx
  modified:
    - frontend/src/components/ui/AmountInput.tsx
    - frontend/src/components/ui/SegmentedControl.tsx
    - frontend/src/components/ui/CategoryGrid.tsx
    - frontend/src/app/router.tsx
    - frontend/src/app/ProtectedLayout.tsx
decisions:
  - "Mutation callbacks passed per mutate() call so the toast captures the saved amount and category without extra state"
  - "Focus on invalid submit uses existing DOM nodes (amount input, first grid radio, date input), no post-render effect"
  - "Hoy/Ayer pressed style uses border-tinta! to override Button secundario's border-borde"
metrics:
  duration: ~15 min
  completed: 2026-10-31
---

# Phase 03 Plan 03: Carga rápida de gastos Summary

FAB "+" in ProtectedLayout leads to /gasto/nuevo, a full-screen form (monto with autofocus, sorted category grid, descripción, Débito/Transferencia|Efectivo preselected from the server's last method, Hoy/Ayer/date) that POSTs `amount_cents` as an integer with a reusable draft UUID and shows a 3 s "Anotado: ..." toast before resetting for the next expense.

## Tasks

| Task | Commit |
|------|--------|
| 1: FAB, ruta /gasto/nuevo, ajustes de componentes | dfcfcc9 |
| 2: NuevoGastoPage con validación, guardado idempotente y toast | 12e1220 |

## Verification

- `npm run build`: ok
- `npm run lint`: exit 0 (new warning: `only-export-components` on `export const FONDO`, mandated by the plan)
- `npx vitest run`: 82/82 pass
- Acceptance greps: role="status" 1, crypto.randomUUID 2, Number(aCentavos( 1, no credit/parseFloat/toFixed/disabled/bg-cat-${

## Deviations from Plan

**1. [Rule 1 - Bug] Zero-width space as escape, not literal**
- Literal U+200B in the "Débito/Transferencia" label tripped oxlint `no-irregular-whitespace`; built it with `String.fromCharCode(0x200b)` instead. Commit 12e1220.

## Known Stubs

None. The "＋ Nueva" tile in the grid is out of this plan's scope (sheet plan).

## Not verified

Manual end-to-end run against the local backend (two consecutive saves) was not performed; only build/lint/unit tests.

## Self-Check: PASSED
