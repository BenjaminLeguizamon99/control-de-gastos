# Phase 2: Dirección visual y sistema de diseño - Pattern Map

**Mapped:** 2026-10-30
**Files analyzed:** 22 (15 new, 7 modified, plus `package.json`/`package-lock.json`)
**Analogs found:** 17 / 22 (the rest have no analog because the codebase has no CSS tokens, `components/` folder or dialogs yet; use the RESEARCH.md patterns for those)

The frontend is small: 13 source files. Phase 1 code sets the conventions: named exports (`export function X`), no default exports, single quotes, no semicolons, relative imports (no path alias), comments in Spanish that explain why, copy in es-AR with voseo, Vitest `.test.ts` next to the module.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `frontend/src/styles/tokens.css` (new) | config (design tokens) | transform (CSS vars → utilities) | `frontend/src/index.css` | partial (only file with CSS; no tokens yet) |
| `frontend/src/index.css` (modify) | config | — | itself | exact |
| `frontend/package.json` (+ lock) (modify) | config | — | itself | exact |
| `frontend/src/lib/money.ts` (new) | utility (pure logic) | transform | `frontend/src/features/auth/authErrors.ts` | role-match |
| `frontend/src/lib/money.test.ts` (new) | test | — | `frontend/src/features/auth/authErrors.test.ts` | exact |
| `frontend/src/components/ui/Button.tsx` (new) | component | event-driven | buttons in `LoginPage.tsx` L92-98, `HomePage.tsx` L32-38 | role-match |
| `frontend/src/components/ui/AmountInput.tsx` (new) | component (controlled input) | event-driven | inputs plus `fieldProps`/`fieldError` in `RecoverPage.tsx` L90-108, L155-167 | role-match |
| `frontend/src/components/ui/Monto.tsx` (new) | component (display) | transform | none (closest: `HomePage.tsx` text rendering) | no analog |
| `frontend/src/components/ui/SegmentedControl.tsx` (new) | component | event-driven | none (no radios/fieldset in the codebase) | no analog |
| `frontend/src/components/ui/CategoryGrid.tsx` (new) | component | event-driven | none | no analog |
| `frontend/src/components/ui/BottomSheet.tsx` (new) | component (modal) | event-driven | none (no dialog in the codebase) | no analog |
| `frontend/src/components/ui/RestanteMes.tsx` (new) | component (display) | transform | none (uses `money.ts` + `Monto`) | no analog |
| `frontend/src/app/MuestraPage.tsx` (new) | page | static (fixed data, no fetch) | `frontend/src/app/HomePage.tsx` | role-match |
| `frontend/src/app/router.tsx` (modify) | route | — | itself, L16-21 | exact |
| `frontend/src/main.tsx` (modify: L15 `text-zinc-900`) | provider/bootstrap | — | itself | exact |
| `frontend/src/app/ProtectedLayout.tsx` (modify) | layout | — | itself | exact |
| `frontend/src/app/HomePage.tsx` (modify) | page | request-response | itself | exact |
| `frontend/src/features/auth/LoginPage.tsx` (modify) | page (form) | request-response | itself | exact |
| `frontend/src/features/auth/RecoverPage.tsx` (modify) | page (form) | request-response | itself | exact |
| `DESIGN.md` (repo root, new) | docs | — | `.planning/phases/02-.../02-UI-SPEC.md` (source of content) | partial |
| `frontend/index.html` (optional: `theme-color` meta) | config | — | itself | exact (optional; not required by any spec) |

## Pattern Assignments

### `frontend/src/index.css` (config) and `frontend/src/styles/tokens.css` (new)

**Current file, all of it** (`frontend/src/index.css` L1-5):
```css
@import "tailwindcss";

html {
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
```
- Keep `@import "tailwindcss"` first. Add `@import "@fontsource-variable/recursive/full.css";` and `@import "./styles/tokens.css";` after it (RESEARCH "Recommended Project Structure").
- Replace the `html { font-family }` block. The family now comes from `--font-sans` in `@theme` (`"Recursive Variable"`, see RESEARCH Pitfall 2). Set the `html` base here: `font-variant-numeric: tabular-nums`, `background: var(--papel)`, `color: var(--tinta)`. Also `html:has(dialog[open]) { overflow: hidden; }` and the `dialog[open]` keyframes inside `@media (prefers-reduced-motion: no-preference)`.
- `tokens.css` has no analog. Copy RESEARCH Pattern 1 directly: `:root` vars, a dark `@media`, the `@theme` reset (`--color-*: initial` …), and `@theme inline` that maps the vars. Hex values come from UI-SPEC §Color and §Paleta de categorías. Add `--velo`, `--duracion-corta`, `--duracion-hoja` and `--ease-salida` (UI-SPEC §Radios, sombra y movimiento).
- Rule: hex/rgb may only appear in `styles/tokens.css` (third grep in RESEARCH Pitfall 4).

### `frontend/package.json` (config)
`dependencies` (L13-20) are kept in alphabetical order. Install with `npm install @fontsource-variable/recursive@^5.3.0`, which adds it to `dependencies` (before `@supabase/supabase-js`). Do not touch the Vite/Tailwind versions (CLAUDE.md: "No subir ni bajar libs de Vite sueltas").

---

### `frontend/src/lib/money.ts` (utility, transform)

**Analog:** `frontend/src/features/auth/authErrors.ts`. It is the only pure-logic module: named exports, module-level constants, one-line Spanish comments that explain why.

**Module shape** (L1-2, L20-27):
```ts
export const NETWORK_ERROR =
  'No pudimos conectar con el servidor. Revisá tu conexión y tocá "Reintentar".'
...
export function authErrorMessage(code: string | undefined): string {
  // Sin code = no hubo respuesta del servidor; con code no mapeado = error real de Supabase
  if (!code) return AUTH_NETWORK_ERROR
  // Object.hasOwn evita que "toString" & co. devuelvan funciones del prototipo
  return Object.hasOwn(MESSAGES, code) ? MESSAGES[code] : GENERIC_ERROR
}
```
Apply:
- Module-level constants: the `Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', trailingZeroDisplay: 'stripIfInteger' })` instance and the threshold `UMBRAL_CERCA = 20` (UI-SPEC: "vive como constante en el helper").
- Exported functions with explicit return types: `formatMonto(value: string): { entero: string; centavos: string | null }`, `parseMontoInput(raw: string): { display: string; value: string }`, `estadoRestante(restante: string, presupuesto: string): 'normal' | 'cerca' | 'pasado'`, `porcentajeUsado(...)`. Bodies follow RESEARCH Patterns 2, 3 and 6.
- The validation copy ("Ingresá un monto mayor a $ 0.", "El monto puede tener hasta 2 decimales.") can live here as exported constants, the same way `NETWORK_ERROR` does in authErrors.
- Validate against the regex before `formatToParts`, because `"abc"` returns `"$ NaN"` (Pitfall 6). No `Number()`/`parseFloat` on amounts. The only allowed `Number()` is on the integer percentage (Pattern 3).

### `frontend/src/lib/money.test.ts` (test)

**Analog:** `frontend/src/features/auth/authErrors.test.ts`

**Imports + table-driven tests** (L1-14):
```ts
import { describe, expect, it } from 'vitest'
import { AUTH_NETWORK_ERROR, authErrorMessage, GENERIC_ERROR, NETWORK_ERROR } from './authErrors'

describe('authErrorMessage', () => {
  it.each([
    ['invalid_credentials', 'Email o contraseña incorrectos. Revisalos e intentá de nuevo.'],
    ...
  ])('%s', (code, expected) => {
    expect(authErrorMessage(code)).toBe(expected)
  })
```
Apply: one `describe` per function and `it.each` tables for the cases in RESEARCH "Phase Requirements → Test Map". Expected strings use ` ` after `$` (Pitfall 3), for example `'$ 125.430'`. The file must end in `.test.ts`, not `.tsx` (vite.config.ts L10: `include: ['src/**/*.test.ts']`). No mocks are needed (compare `api/client.test.ts`, which mocks supabase; money.ts has no I/O).

---

### `frontend/src/components/ui/Button.tsx` (component)

**Analog:** the Phase 1 buttons. This is the markup being replaced, so it shows the props and states the component must cover.

Primary submit with loading (`LoginPage.tsx` L92-98):
```tsx
<button
  type="submit"
  disabled={submitting}
  className="min-h-11 w-full rounded bg-blue-600 px-4 font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-60"
>
  {submitting ? 'Ingresando…' : 'Ingresar'}
</button>
```
Secondary (`HomePage.tsx` L32-38, `ProtectedLayout.tsx` L24-30):
```tsx
<button type="button" onClick={() => refetch()}
  className="min-h-11 rounded border border-zinc-300 px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
```
Apply:
- Named export `export function Button(...)`. Props extend `ComponentProps<'button'>` (`import type { ComponentProps, ReactNode } from 'react'`, using the `import type` style from `router.tsx` L1, which `verbatimModuleSyntax` requires) plus `variant`, `loading`, `loadingLabel` and `fullWidth`.
- Default `type="button"`. The Phase 1 call sites pass `type="submit"` explicitly.
- `loading` maps to `disabled` + `aria-busy` + `loadingLabel`. This replaces the `submitting ? 'Ingresando…' : 'Ingresar'` ternary at the call sites.
- Use a variant → class-string map as a module constant (like `inputBase` in LoginPage L9-10). Token classes only: `min-h-12 px-6 rounded-control text-cuerpo font-semibold bg-acento text-sobre-acento hover:bg-acento-fuerte focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento disabled:opacity-50 disabled:cursor-not-allowed`.
- Note: Phase 1 uses `focus-visible:ring-*`. The UI-SPEC changes this to `outline` (2px `acento`, offset 2px). Use outline everywhere.

### `frontend/src/components/ui/AmountInput.tsx` (component)

**Analog:** the RecoverPage field helpers, for the label, error and ARIA wiring.

Label + input + error (`RecoverPage.tsx` L152-167, L90-108):
```tsx
<label htmlFor="code" className="mb-2 block text-sm font-semibold">Código</label>
<input id="code" type="text" inputMode="numeric" ... {...fieldProps('code')} />
{fieldError('code')}

function fieldProps(name: string) {
  const err = fieldErrors[name]
  return {
    'aria-invalid': err ? true : undefined,
    'aria-describedby': err ? `${name}-error` : undefined,
    className: `${inputBase} ${err ? 'border-red-600' : 'border-zinc-300'}`,
  }
}
// error: <p id={`${name}-error`} role="alert" className="mt-1 text-sm text-red-600">{err}</p>
```
Apply: keep the `aria-invalid` / `aria-describedby` / `role="alert"` / `mt-1` wiring the same. Use `useId()` instead of a hardcoded `id`. Token swap: `text-sm text-red-600` → `text-etiqueta font-normal text-peligro`, `border-red-600`/`border-zinc-300` → `border-peligro`/`border-borde`. Input attributes: `type="text" inputMode="decimal" autoComplete="off" enterKeyHint="done"` (RESEARCH Pattern 6; Phase 1 already uses camelCase `inputMode`, `autoComplete`). `onChange(value: string)` emits only the normalized string from `parseMontoInput`.

### `Monto.tsx`, `SegmentedControl.tsx`, `CategoryGrid.tsx`, `BottomSheet.tsx`, `RestanteMes.tsx` (components)
No analog. Use RESEARCH Pattern 4 (dialog), Pattern 5 (native radios in `fieldset`/`legend`, `useId()` for `name`, `relative` on the label because of `sr-only`) and UI-SPEC §Componentes. Keep the house conventions from Button: named export, typed props, a class-string constant, token utilities only.
- `CategoryGrid`: `bg-cat-N/15` has to be built from a literal lookup map (`const FONDO = { 1: 'bg-cat-1/15 active:bg-cat-1/25', ... } as const`), not `` `bg-cat-${n}/15` ``. Tailwind only generates classes it finds as complete strings in the source.
- `RestanteMes`: the meter `aria-valuenow`/`aria-valuemax` take numbers. Pass the integer percentage (or the cents as a string). Never `Number(monto)`.

---

### `frontend/src/app/MuestraPage.tsx` (page)

**Analog:** `frontend/src/app/HomePage.tsx`

**Page shell** (L6, L16-18):
```tsx
export function HomePage() {
  ...
  return (
    <main className="mx-auto mt-8 max-w-sm px-4 sm:mt-12">
      <h1 className="mb-6 text-2xl leading-tight font-semibold">Sesión iniciada</h1>
```
Apply: `export function MuestraPage()` in `src/app/`, with `<main>` + `<h1>`. Use UI-SPEC layout tokens: `max-w-[480px]` is an arbitrary value and the grep forbids it, so use the default `max-w-120` (30rem = 480px with the 0.25rem spacing scale), plus `px-4 sm:px-6 pb-16 min-h-dvh`, sections with `mt-12`, `h1`/`h2` with `text-titulo font-casual`. **Do not** import `useAuth`, `useQuery` or `api`: fixed data only (RESEARCH Security Domain). Local state (`useState`) for sheet open/closed and the selected values.

### `frontend/src/app/router.tsx` (route)

**Current routes** (L16-21):
```tsx
export const router = createBrowserRouter([
  { path: '/login', element: <GuestOnly><LoginPage /></GuestOnly> },
  { path: '/recuperar', element: <RecoverPage /> },
  { path: '/', element: <ProtectedLayout />, children: [{ index: true, element: <HomePage /> }] },
  { path: '*', element: <Navigate to="/" replace /> },
])
```
Apply: add `{ path: '/muestra', element: <MuestraPage /> },` with no guard, like `/recuperar`, before `'*'`. Add a one-line comment explaining why it is public (SC4: it has to open on the phone without logging in). Import it next to `HomePage` (L6). The `only-export-components` warning on this file already exists; don't fix it here.

---

### Phase 1 migration: files the `@theme` reset will unstyle

All of these lose their colors and sizes silently once `--color-*/--text-*/--radius-*: initial` lands (RESEARCH Pitfall 1). They have to be migrated **in the same plan/wave as the reset**. The copy does not change. The current repo has 34 matching default-class lines.

Token swap table (applies to all files below):

| Phase 1 class | Replace with |
|---------------|--------------|
| `text-zinc-900` | `text-tinta` (or drop it if `html` already sets `color: var(--tinta)`) |
| `bg-zinc-100` (header) | `bg-papel-2` |
| `text-2xl leading-tight font-semibold` (h1) | `text-titulo font-casual` (the token already carries weight and line-height) |
| `text-sm` (help text) | `text-etiqueta font-normal` (or `text-cuerpo text-tinta-2` for body help) |
| `text-sm font-semibold` (label) | `text-etiqueta` |
| `text-sm text-red-600` (error) | `text-etiqueta font-normal text-peligro` |
| `text-blue-600` (links) | `text-acento` |
| `text-base` (input) | `text-cuerpo` |
| `rounded` / `border-zinc-300` / `border-red-600` | `rounded-control` / `border-borde` / `border-peligro` |
| `min-h-11` (inputs, buttons) | `min-h-12` (48px per UI-SPEC; links stay at `min-h-11` = 44px) |
| `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600` | `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento` |
| `bg-blue-600 text-white ... disabled:opacity-60` button | `<Button variant="primario" type="submit" fullWidth loading={submitting} loadingLabel="Ingresando…">` |
| bordered `rounded border-zinc-300` button | `<Button variant="secundario">` |

Per file:
- **`frontend/src/main.tsx` L15:** `className="flex min-h-dvh items-center justify-center text-zinc-900"` → swap `text-zinc-900`. Not listed in UI-SPEC; RESEARCH Pitfall 1 adds it.
- **`frontend/src/app/ProtectedLayout.tsx` L21-30:** wrapper `text-zinc-900`, header `bg-zinc-100`, "Cerrar sesión" button → `<Button variant="secundario">`. `pb-[env(safe-area-inset-bottom)]` is an arbitrary value. The second grep (`\[[0-9.]+(px|rem|em)\]`) does not catch it, so it can stay.
- **`frontend/src/app/HomePage.tsx` L17-38:** h1, two `text-sm text-red-600` errors, "Reintentar" → `<Button variant="secundario">`.
- **`frontend/src/features/auth/LoginPage.tsx`:** `inputBase` constant L9-10 (define it once with tokens: `w-full min-h-12 rounded-control border bg-papel-2 px-4 text-cuerpo text-tinta` + outline focus), L41/43/46/60/63/69/82/88/92-98.
- **`frontend/src/features/auth/RecoverPage.tsx`:** `inputBase` L12-13, `linkClass` L14-15, `fieldProps` L95, `fieldError` L103, L111/113/116/118/135/139-145/149/152/174/188/192-198. The resend link (L168) stays a plain `<button className={linkClass}>`, not `Button`, because it is styled as a link.
- `inputBase` is duplicated in LoginPage and RecoverPage. Keeping both copies (now with tokens) is the minimum diff. Extracting a shared input class is optional and the plan doesn't require it.

Verification after migration: the three greps in RESEARCH Pitfall 4 (not the UI-SPEC regex, which gives false positives on `rounded-control`).

---

### `DESIGN.md` (repo root, docs)
No code analog. Section order is fixed by UI-SPEC §Entregables de documentación. Its content is the UI-SPEC tables plus measured contrast values. Also document the `.`-as-decimal decision (RESEARCH Open Question 1) and the color-mix fallback (Pitfall 5).

## Shared Patterns

### Component/module conventions
**Source:** every file in `frontend/src` (for example `HomePage.tsx` L1-6, `authErrors.ts`)
**Apply to:** all new `.ts`/`.tsx`
- Named exports only (`export function X`), no default export, no barrel `index.ts`.
- Relative imports (`'../../lib/money'`). No `@/` alias is configured (tsconfig.app.json has no `paths`).
- `import type` for type-only imports (`verbatimModuleSyntax: true`, tsconfig.app.json L14). See `router.tsx` L1: `import type { ReactNode } from 'react'`, `LoginPage.tsx` L1: `import { useState, type FormEvent } from 'react'`.
- Single quotes, no semicolons, comments in Spanish, one line, explaining why.
- `noUnusedLocals`/`noUnusedParameters` are on, so drop unused props.

### Accessible error display
**Source:** `frontend/src/features/auth/RecoverPage.tsx` L90-108
**Apply to:** AmountInput, migrated Login/Recover fields
`aria-invalid={err ? true : undefined}` + `aria-describedby={err ? `${id}-error` : undefined}` + `<p id=… role="alert" className="mt-1 …">`.

### Copy / voice
**Source:** `frontend/src/features/auth/authErrors.ts` L1-18
**Apply to:** money.ts validation messages, MuestraPage copy, DESIGN.md voice section
Voseo, short sentences, no humor in errors. Copy strings go in exported constants when they are reused or tested.

### Class-string constants
**Source:** `LoginPage.tsx` L9-10, `RecoverPage.tsx` L12-15 (`inputBase`, `linkClass`)
**Apply to:** Button variant map, input/link styling, CategoryGrid color lookup
Module-level `const` strings, combined with template literals for state (`${inputBase} ${err ? '…' : '…'}`). No `clsx`/`cva` dependency.

### Token-only rule (SC3)
**Source:** RESEARCH Pitfall 4 greps
**Apply to:** every `.tsx` in `frontend/src` and every `.css` except `styles/tokens.css`
No palette classes, no arbitrary `[#…]`/`[13px]`, no `style={{…}}`. A dynamic width on the RestanteMes bar is the one case that needs a runtime value. Handle it with a CSS var set through `style={{ '--usado': … }}` plus a utility, or a `<meter>`/`<progress>`, and **declare it as an explicit exception in the plan**, because `style={{` is grepped.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `frontend/src/styles/tokens.css` | config | transform | No design tokens or `@theme` exist yet; use RESEARCH Pattern 1 |
| `frontend/src/components/ui/BottomSheet.tsx` | component | event-driven | No dialog/modal in the codebase; use RESEARCH Pattern 4 |
| `frontend/src/components/ui/SegmentedControl.tsx` | component | event-driven | No radio/fieldset use; use RESEARCH Pattern 5 |
| `frontend/src/components/ui/CategoryGrid.tsx` | component | event-driven | Same as above |
| `frontend/src/components/ui/Monto.tsx`, `RestanteMes.tsx` | component | transform | No display components; build on `money.ts` + UI-SPEC §Componentes |

## Metadata

**Analog search scope:** `frontend/src/**` (all 13 source files), `frontend/index.html`, `vite.config.ts`, `package.json`, `.oxlintrc.json`, `tsconfig.app.json`
**Files scanned:** 19
**Pattern extraction date:** 2026-10-30
