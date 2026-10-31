---
phase: 02-direcci-n-visual-y-sistema-de-dise-o
plan: 04
subsystem: frontend/design-system
tags: [design-review, palette, deploy, uat]
requires:
  - 02-03 (/muestra con los 5 componentes base)
provides:
  - DESIGN.md final con "## Revisión con capturas"
  - Paleta elegida por el usuario en tokens.css (claro y oscuro)
  - Deploy verificado por el usuario en celular real (SC4)
affects:
  - frontend/src/styles/tokens.css (solo hex de la paleta base; categorías sin cambios)
  - DESIGN.md (Dirección, Paleta clara y oscura, Revisión con capturas)
tech-stack:
  added: []
  patterns: ["capturas headless con prefers-color-scheme emulado por CDP (Emulation.setEmulatedMedia)"]
key-files:
  created: []
  modified:
    - DESIGN.md
    - frontend/src/styles/tokens.css
decisions:
  - "Paleta del usuario (#E63946 #F1FAEE #A8DADC #457B9D #1D3557) reemplaza durazno/ciruela; supersede el tono cálido de D-01"
  - "#457B9D se usa como #407597 y #E63946 como #C62D3A (claro) / #FF7A84 (oscuro) para pasar AA como texto"
  - "alerta queda ámbar (fuera de la paleta del usuario) para distinguir 'te queda poco' de 'te pasaste' (D-09)"
  - "'Guardando…' en claro con poco contraste se deja: botón disabled, exento por WCAG 1.4.3"
metrics:
  duration: ~1 día (incluye iteración de paleta con el usuario)
  completed: 2026-10-31
  tasks: 2
  files: 2
---

# Phase 2 Plan 04: Revisión con capturas, paleta del usuario y prueba en celular Summary

Cierre de la fase. Revisión visual con la skill `frontend-design` sobre capturas reales, cambio de paleta pedido por el usuario en el checkpoint y aprobación en celular real desde el deploy.

## Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 | Suite completa, capturas headless y revisión con frontend-design | d56a72a |
| 2 | Deploy y prueba en celular real y compu (checkpoint) | 5176d46 (cambio de paleta), push d56a72a y 5176d46 |

**Task 1** la ejecutó el orquestador en la sesión principal, porque los subagentes no tienen la herramienta Skill. Resultados:

- Suite: 60 tests, lint (solo las 2 advertencias que ya había), build y G1–G3 vacíos.
- `.woff2` en `dist/assets`, sin `fonts.googleapis`, y `hover:hover` presente en el CSS de salida.
- Capturas de `/muestra` a 360, 390, 768 y 1280px en claro y oscuro, y de `/login` a 390px. Se guardaron en el scratchpad de la sesión, fuera del repo.
- La skill no marcó hallazgos que pidieran cambios. "Guardando…" se dejó así y quedó justificado.

**Task 2:** se hizo el push y el usuario probó el deploy. La fuente, los íconos de categoría, los inputs y los botones le gustaron, pero rechazó la paleta y eligió una propia. Se reemplazaron solo los hex de `tokens.css`, se volvieron a medir los contrastes (todos pasan AA) y se volvieron a sacar capturas. Después de otro push, el usuario aprobó: "AHORA SIII! hermoso quedo".

## Deviations from Plan

1. **[Rule 2 - tooling]** En Edge headless, `--force-dark-mode` y `--blink-settings=preferredColorScheme` no cambian `prefers-color-scheme`. Además, con Windows en modo oscuro las capturas "claras" salían oscuras. El modo se emuló por CDP (`Emulation.setEmulatedMedia`) con un script en el scratchpad. Las capturas de 360 y 390px por CLI se veían cortadas por el ancho mínimo de ventana de Edge; con CDP se ven completas.
2. **[User decision]** El cambio de paleta en el checkpoint modificó `tokens.css` y `DESIGN.md` en este plan. El plan solo contemplaba ajustes que pidiera la skill.

## Known Stubs

Ninguno.

## Self-Check: PASSED

- DESIGN.md tiene 11 encabezados `## ` y termina en `## Revisión con capturas`
- `git log origin/main..HEAD --oneline` vacío después del push
- El usuario aprobó en el celular real
