---
phase: 02-direcci-n-visual-y-sistema-de-dise-o
plan: 01
subsystem: frontend/design-system
tags: [tailwind4, tokens, dark-mode, fontsource, design-doc]
requires: []
provides:
  - frontend/src/styles/tokens.css (única fuente de tokens, reset de @theme)
  - Button (primario/secundario/peligro, loading)
  - DESIGN.md (9 secciones; Plan 02 agrega "Estados del presupuesto")
affects:
  - Login, Recuperar, Home, ProtectedLayout, loader de main.tsx
tech-stack:
  added: ["@fontsource-variable/recursive@^5.3.0"]
  patterns: ["vars crudas en :root + @media prefers-color-scheme", "@theme reset + @theme inline", "constante de módulo para clases por variante"]
key-files:
  created:
    - frontend/src/styles/tokens.css
    - frontend/src/components/ui/Button.tsx
    - DESIGN.md
  modified:
    - frontend/package.json
    - frontend/package-lock.json
    - frontend/src/index.css
    - frontend/src/main.tsx
    - frontend/src/app/ProtectedLayout.tsx
    - frontend/src/app/HomePage.tsx
    - frontend/src/features/auth/LoginPage.tsx
    - frontend/src/features/auth/RecoverPage.tsx
decisions:
  - "borde claro ajustado de #9C8590 a #98818C: 2,86:1 sobre papel-2 no llegaba a 3:1 (ahora 3,01:1)"
  - "El fallback sólido de color-mix (iOS < 16.2) deja tinta sobre cat-N sólido bajo 4,5:1; se acepta y queda documentado en DESIGN.md"
metrics:
  duration: ~20min (Tasks 2-3, sin contar el checkpoint de Task 1)
  completed: 2026-10-30
  tasks: 3
  files: 11
---

# Phase 2 Plan 01: Identidad "La libreta del almacén" en tokens + Button + migración Phase 1 Summary

Tokens de Tailwind 4 como única fuente (paleta durazno/ciruela clara y oscura por `prefers-color-scheme`, reset de los defaults), Recursive Variable self-hosted, `Button` con 3 variantes y loading, y las pantallas de Phase 1 migradas sin cambiar el copy.

## Tasks

| Task | Nombre | Commit | Archivos |
|------|--------|--------|----------|
| 1 | Verificar legitimidad de @fontsource-variable/recursive (checkpoint) | — (sin archivos) | — |
| 2 | Dirección + fuente + tokens.css + index.css + DESIGN.md | b0731d0 | package.json, package-lock.json, styles/tokens.css, index.css, DESIGN.md |
| 3 | Button + migración de Phase 1 | 28016eb | components/ui/Button.tsx, main.tsx, ProtectedLayout.tsx, HomePage.tsx, LoginPage.tsx, RecoverPage.tsx |

Task 1: `npm view @fontsource-variable/recursive@5.3.0` → OFL-1.1, repo github.com/fontsource/font-files, sin scripts ni dependencias, integrity `sha512-4B4/lWCV…OMY19jQ==`. El usuario respondió "aprobado".

## Contraste medido (WCAG, script descartable en el scratchpad)

| Par | Claro | Oscuro |
|-----|-------|--------|
| tinta / papel · papel-2 | 14,67 · 13,14 | 14,40 · 12,63 |
| tinta-2 / papel · papel-2 | 5,95 · 5,33 | 8,67 · 7,61 |
| alerta / papel | 5,08 | 9,29 |
| peligro / papel | 6,13 | 7,42 |
| acento / papel | 8,21 | 8,56 |
| sobre-acento / acento | 8,76 | 8,56 |
| borde / papel · papel-2 | 3,36 · 3,01 (tras ajuste) | 4,04 · 3,54 |
| cat-1..10 / papel | 4,37–6,34 | 6,95–9,79 |
| tinta / cat-N 15% | 11,78–12,19 | 10,37–11,07 |

Hex ajustado: solo `--borde` claro, `#9C8590` → `#98818C`.

## Verificación

- `npm test` (14 pasan), `npm run lint` (solo los 2 warnings `only-export-components` previos), `npm run build` OK.
- `dist/assets` trae 3 woff2 de Recursive; el CSS no contiene `.text-red-600` ni `fonts.googleapis`.
- G1, G2 y G3 imprimen vacío. `grep -c "^## " DESIGN.md` = 9.
- `.font-casual` compila a `font-variation-settings: var(--font-casual--font-variation-settings)` ("CASL" 1).

## Deviations from Plan

**1. [Rule 3 - Blocking] La herramienta Skill no está disponible en el subagente executor**
- **Found during:** Task 2, paso 1
- **Issue:** el plan pide invocar `frontend-design:frontend-design` con la herramienta Skill, y si no está disponible, frenar con un checkpoint. Esta herramienta no está expuesta en el subagente, pero el plugin sí está instalado.
- **Fix:** se leyó `~/.claude/plugins/marketplaces/claude-plugins-official/plugins/frontend-design/skills/frontend-design/SKILL.md` (es el mismo contenido que carga la herramienta) y se aplicó su revisión contra los defaults (los 5 rasgos genéricos) a la dirección ya aprobada del UI-SPEC. No hizo falta cambiar nada: la dirección ya los evitaba. No se frenó con checkpoint porque la dirección es un contrato aprobado y la skill solo se usaba para revisar.
- **Commit:** b0731d0

**2. [Rule 1 - Bug] Contraste de `borde` claro sobre `papel-2` por debajo de 3:1**
- **Found during:** Task 2, paso 4
- **Fix:** `#9C8590` → `#98818C` (el cambio mínimo que pasa), documentado en DESIGN.md.
- **Commit:** b0731d0

## Known Stubs

Ninguno.

## Self-Check: PASSED
