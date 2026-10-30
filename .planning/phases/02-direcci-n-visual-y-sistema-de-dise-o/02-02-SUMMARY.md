---
phase: 02-direcci-n-visual-y-sistema-de-dise-o
plan: 02
subsystem: frontend/design-system
tags: [money, bigint, intl, a11y, tdd]
requires:
  - 02-01 (tokens, Button, DESIGN.md)
provides:
  - frontend/src/lib/money.ts (formatMonto, montoTexto, formatMontoEditable, parseMontoInput, aCentavos, deCentavos, estadoRestante, porcentajeUsado, UMBRAL_CERCA, MONTO_VACIO, MONTO_DECIMALES)
  - Monto, RestanteMes, AmountInput
  - ruta pública /muestra (MuestraPage)
affects:
  - frontend/src/app/router.tsx
  - DESIGN.md (10 secciones)
tech-stack:
  added: []
  patterns: ["montos como string + BigInt de centavos", "Intl.formatToParts sobre string decimal exacto", "CSS var de runtime (--usado) como única excepción a style inline"]
key-files:
  created:
    - frontend/src/lib/money.ts
    - frontend/src/lib/money.test.ts
    - frontend/src/components/ui/Monto.tsx
    - frontend/src/components/ui/RestanteMes.tsx
    - frontend/src/components/ui/AmountInput.tsx
    - frontend/src/app/MuestraPage.tsx
  modified:
    - frontend/src/app/router.tsx
    - DESIGN.md
decisions:
  - "Un '.' tipeado al final del input de monto es coma decimal: '1.500' queda '1,50' (confirmado por el usuario, documentado en DESIGN.md)"
  - "Ceros a la izquierda: /^0+(?=\\d)/ en vez de 'dejar 0 si el raw era 0', así '00' también da '0'"
metrics:
  duration: ~15min
  completed: 2026-10-30
  tasks: 3
  files: 8
---

# Phase 2 Plan 02: Montos (money.ts + Monto + RestanteMes + AmountInput) y /muestra pública Summary

Lógica de dinero sin float (Intl recibe strings, cuentas en BigInt de centavos) con 46 tests table-driven, los componentes `Monto`, `RestanteMes` (3 estados con texto y `role="meter"`) y `AmountInput` (teclado nativo, miles en vivo, emite string), y la página pública `/muestra` con datos fijos.

## Tasks

| Task | Nombre | Commit | Archivos |
|------|--------|--------|----------|
| 1 | RED: tests de la lógica de montos | 82c2ab2 | lib/money.test.ts |
| 2 | GREEN money.ts + Monto + RestanteMes + /muestra | 39f0f25 | lib/money.ts, ui/Monto.tsx, ui/RestanteMes.tsx, app/MuestraPage.tsx, app/router.tsx |
| 3 | AmountInput + DESIGN.md | 9ac347c | ui/AmountInput.tsx, app/MuestraPage.tsx, DESIGN.md |

## Verificación

- RED: `vitest run src/lib/money.test.ts` falló (módulo inexistente) antes de 39f0f25; GREEN: 46/46. `npm test` total: 60 pasan.
- `npm run lint`: solo los 2 warnings `only-export-components` previos. `npm run build` OK.
- G1, G2, G3 vacíos. `grep -c "Number(" money.ts` = 1, sin `parseFloat`/`toFixed`. MuestraPage sin `useAuth`/`useQuery`/`api(`.
- `/muestra` está antes de `'*'` en el router. `grep -c "^## " DESIGN.md` = 10.
- En el CSS compilado están `w-(--usado)` → `width:var(--usado)` y `has-[:focus-visible]:outline-acento`.

## TDD Gate Compliance

`test(02-02)` (82c2ab2) precede a `feat(02-02)` (39f0f25). Sin refactor.

## Deviations from Plan

**1. [Rule 1 - Edge] Ceros a la izquierda en parseMontoInput**
- El plan decía "dejar '0' si queda vacío y hay coma o el raw era '0'"; con eso `'00'` daba `''`. Se usa `/^0+(?=\d)/` + `|| '0'`, que cubre los casos del test y además `'00'` → `'0'`.
- **Commit:** 39f0f25

Fuera de eso, el plan se ejecutó tal cual. La heading del estado vacío en "Voz" es `<h3>` (jerarquía bajo el `<h2>` de la sección).

## Known Stubs

Ninguno. El `onChange={() => {}}` del segundo `AmountInput` en `/muestra` es intencional: es el ejemplo fijo del estado de error.

## Self-Check: PASSED
