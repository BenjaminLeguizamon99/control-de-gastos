---
phase: 02-direcci-n-visual-y-sistema-de-dise-o
plan: 03
subsystem: frontend/design-system
tags: [a11y, radios, dialog, tailwind, tokens]
requires:
  - 02-02 (MuestraPage, Button, tokens cat-1..cat-10, shadow-hoja, velo)
provides:
  - SegmentedControl (radios nativos)
  - CategoryGrid + tipos Categoria, ColorCategoria
  - BottomSheet (dialog nativo con showModal)
  - token text-emoji
affects:
  - frontend/src/app/MuestraPage.tsx (secciones Medio de pago, Categorías, Hoja inferior, Colores de categoría)
  - frontend/src/index.css (scroll lock + animación de la hoja)
  - DESIGN.md (Componentes completo, text-emoji en Tipografía)
tech-stack:
  added: []
  patterns: ["radios sr-only dentro de label + has-[:checked]/has-[:focus-visible]", "mapa literal Record<ColorCategoria, string> para clases de color", "dialog controlado por useEffect sobre open"]
key-files:
  created:
    - frontend/src/components/ui/SegmentedControl.tsx
    - frontend/src/components/ui/CategoryGrid.tsx
    - frontend/src/components/ui/BottomSheet.tsx
  modified:
    - frontend/src/styles/tokens.css
    - frontend/src/index.css
    - frontend/src/app/MuestraPage.tsx
    - DESIGN.md
decisions:
  - "Muestras de 'Colores de categoría' en grilla de 2 columnas (el plan solo pedía una lista)"
  - "BottomSheet: border-0 + border-t border-linea siempre; en claro casi no se ve bajo la sombra, en oscuro reemplaza la sombra none"
metrics:
  duration: ~10min
  completed: 2026-10-30
  tasks: 2
  files: 7
---

# Phase 2 Plan 03: SegmentedControl, CategoryGrid y BottomSheet en /muestra Summary

Controles de selección con HTML nativo (radios en fieldset y `<dialog>` con `showModal()`) que le dan a `/muestra` los 5 componentes base. Teclado, foco y lectores de pantalla vienen del navegador. Los colores de categoría salen de mapas de clases literales.

## Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 | SegmentedControl + CategoryGrid + secciones Medio de pago, Categorías y Colores | c4fd1bb |
| 2 | BottomSheet + hojas de categorías y borrado + DESIGN.md | 470679d |

## Verification

- `npm test` (60 pasan), `npm run lint` (0 errores; quedan 2 warnings previos en main.tsx/router.tsx), `npm run build` pasan.
- G1/G2/G3 (solo tokens) vacíos; no hay `bg-cat-${` en ningún lado; no hay `closedby`.
- En el CSS del build están `.bg-cat-10/15` (color-mix), `text-emoji`, `backdrop:bg-velo::backdrop`, `max-h-[85dvh]` y `rounded-t-hoja`.
- MuestraPage tiene 16 usos de los 5 componentes base; DESIGN.md sigue con 10 secciones `## `.

## Deviations from Plan

**1. [Rule 1 - Bug] Comentario con "closedby" rompía el criterio de aceptación**
- **Found during:** Task 2
- **Issue:** un comentario en BottomSheet.tsx decía "sin closedby", y el criterio exige que el archivo no tenga esa palabra.
- **Fix:** saqué la palabra del comentario antes del commit.
- **Commit:** 470679d

Aparte de eso, el plan se ejecutó tal cual.

## Known Stubs

- Los botones "Borrar gasto" y "Cancelar" de la hoja de confirmación en `/muestra` solo cierran la hoja. Es intencional (T-02-10): la página de muestra no tiene datos y el borrado real llega en una fase posterior.

## Not Verified

- No probé en un navegador real: el teclado (flechas en los radios), la vuelta del foco al cerrar el dialog, el cierre tocando el fondo, la animación ni el tema oscuro. Todo eso queda para la verificación visual de la fase.

## Self-Check: PASSED

- FOUND: frontend/src/components/ui/SegmentedControl.tsx, CategoryGrid.tsx, BottomSheet.tsx
- FOUND: commits c4fd1bb, 470679d
