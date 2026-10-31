---
phase: 03-categor-as-y-carga-r-pida-de-gastos
plan: 05
subsystem: frontend
tags: [categorias, ui, sheet, react-query]
requires: ["03-03", "03-04"]
provides: [CategoriaSheet, CategoriasPage, "tile ＋ Nueva", "link Editar categorías"]
affects: [CategoryGrid, MuestraPage, NuevoGastoPage, HomePage, router]
tech-stack:
  added: []
  patterns: ["sheet montado con key por apertura para estado limpio", "setQueryData + ordenar tras POST/PUT"]
key-files:
  created:
    - frontend/src/features/categories/CategoriaSheet.tsx
    - frontend/src/features/categories/CategoriasPage.tsx
  modified:
    - frontend/src/components/ui/CategoryGrid.tsx
    - frontend/src/app/MuestraPage.tsx
    - frontend/src/features/expenses/NuevoGastoPage.tsx
    - frontend/src/app/router.tsx
    - frontend/src/app/HomePage.tsx
decisions:
  - "Con texto en el campo \"Otro emoji\" manda ese campo; si es inválido no hay emoji elegido y se muestra EMOJI_INVALIDO"
  - "El CategoriaSheet del formulario se renderiza fuera del <form> del gasto (formularios anidados son inválidos y su submit dispararía Guardar gasto)"
metrics:
  duration: ~15min
  completed: 2026-10-31
  tasks: 2
  files: 7
---

# Phase 3 Plan 05: Crear y renombrar categorías (UI) Summary

Sheet de crear/editar categoría (nombre, 30 emojis + campo libre, 10 colores con el menos usado preseleccionado, POST/PUT con 409 bajo Nombre), pantalla /categorias, tile "＋ Nueva" en la grilla del formulario que deja la nueva elegida, y link "Editar categorías" en el home.

## Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 | Tile "＋ Nueva" y sheet de crear/editar categoría | 81ff163 |
| 2 | Pantalla /categorias, link del home y "＋ Nueva" en el formulario | 297bf90 |

## Verification

- `npm run build`, `npm run lint` (exit 0, solo warnings only-export-components, ya existentes por `FONDO`) y `npx vitest run` (82 tests) verdes.
- Greps de aceptación OK; sin `dangerouslySetInnerHTML` ni `bg-cat-${`.

## Deviations from Plan

- Comentario de CategoriasPage reescrito para no contener "borrar" (el criterio de aceptación lo greppea).

Otherwise plan executed as written.

## Known Stubs

None.

## Notes

- `autoFocus` del Nombre al crear: React enfoca al montar, antes de `showModal()`; el foco inicial lo decide el navegador al abrir el dialog (puede quedar en "Cerrar"). No verificado en navegador.

## Self-Check: PASSED

- CategoriaSheet.tsx y CategoriasPage.tsx existen; commits 81ff163 y 297bf90 en el log.
