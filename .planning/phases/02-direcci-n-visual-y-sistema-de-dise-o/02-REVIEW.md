---
phase: 02-direcci-n-visual-y-sistema-de-dise-o
reviewed: 2026-10-31T00:00:00Z
depth: standard
files_reviewed: 19
files_reviewed_list:
  - frontend/package.json
  - frontend/src/app/HomePage.tsx
  - frontend/src/app/MuestraPage.tsx
  - frontend/src/app/ProtectedLayout.tsx
  - frontend/src/app/router.tsx
  - frontend/src/components/ui/AmountInput.tsx
  - frontend/src/components/ui/BottomSheet.tsx
  - frontend/src/components/ui/Button.tsx
  - frontend/src/components/ui/CategoryGrid.tsx
  - frontend/src/components/ui/Monto.tsx
  - frontend/src/components/ui/RestanteMes.tsx
  - frontend/src/components/ui/SegmentedControl.tsx
  - frontend/src/features/auth/LoginPage.tsx
  - frontend/src/features/auth/RecoverPage.tsx
  - frontend/src/index.css
  - frontend/src/lib/money.test.ts
  - frontend/src/lib/money.ts
  - frontend/src/main.tsx
  - frontend/src/styles/tokens.css
findings:
  critical: 1
  warning: 5
  info: 5
  total: 11
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-10-31T00:00:00Z
**Depth:** standard
**Files Reviewed:** 19
**Status:** issues_found

## Narrative Findings (AI reviewer)

## Summary

The money layer follows the project rule: no floats, BigInt cents, and Intl gets the exact decimal string. The problems are in the edges around it:
- `AmountInput` can show one number while holding a different `value`, so the wrong amount can be saved.
- Dots in the input mean different things depending on how they got there, which can make an amount 100x or 1000x off without any warning.
- `aCentavos` trusts its input. A string with 3 or more decimals gives the wrong number of cents without an error, and any other format it doesn't expect throws during render.
- `RestanteMes` shows nonsense when the budget is 0 or when the amount left is more than the budget.
- `BottomSheet` calls `onClose` twice and closes when a drag that starts inside the sheet ends on the backdrop.
- Logout does nothing, with no message, when `signOut` returns an error.

## Critical Issues

### CR-01: AmountInput shows an old display when refocused, so the visible amount and `value` disagree and the wrong amount gets saved

**File:** `frontend/src/components/ui/AmountInput.tsx:18,44-49`
**Issue:** `display` only gets synced from `value` on mount and on blur. When focused, the input renders `display`, not `value`. If the parent changes `value` while the input is unfocused (the usual "save, then reset the form" flow: tapping the submit button blurs the input first, then the parent sets `value=''`), the old `display` (for example `"500"`) stays in state. The next time the user focuses the field, `"500"` appears again while `value` is `''`. Typing `1` then gives `parseMontoInput("5001")`, so it saves 5001 instead of 1. The same thing happens if the parent changes `value` while the input is focused (submitting with Enter/"done" from the keyboard, given `enterKeyHint="done"`): the field keeps showing the old amount until blur. For a money input this is incorrect data.
**Fix:** Re-derive `display` from `value` when focus starts, and stop trusting `display` once `value` has changed outside the input:
```tsx
onFocus={() => {
  setDisplay(formatMontoEditable(value))
  setFocused(true)
}}
```
and, for an external change while focused, compare against the last value this input emitted:
```tsx
const [emitted, setEmitted] = useState(value)
if (value !== emitted) { setEmitted(value); setDisplay(formatMontoEditable(value)) }
// in onChange: setEmitted(next.value); onChange(next.value)
```
Add a test: type, blur, have the parent reset to `''`, refocus, and expect the display to be `''`.

## Warnings

### WR-01: A dot means different things depending on how it was entered, so amounts can be 100x or 1000x off without any warning

**File:** `frontend/src/lib/money.ts:43-47` (enshrined in `money.test.ts:53-54,64-72`)
**Issue:** A trailing `.` turns into the decimal comma, and any other `.` is thrown away as a thousands separator. So the same text gives different amounts:
- Typing `1.500` one key at a time gives **1,50** (the test asserts this). Most es-AR users mean fifteen hundred.
- Pasting `1.500` gives **1500**.
- Pasting `1234.56` (copied from a calculator, a bank app in English, or an API) gives **123456**, 100x the real amount.
- Typing `1234.56` gives **1234,56**.

The display regroups as you type, so the user may not notice the value changed scale. This is silent money corruption on the main data entry path.
**Fix:** Make the rule the same for every input path. For example: when the raw text has no comma and exactly one `.` followed by 1 or 2 digits at the end (`/^\d+\.\d{0,2}$/` after stripping), treat that `.` as the decimal separator. Otherwise treat dots as grouping. Also add paste cases (`'1234.56' -> '1234.56'`) to the tests. At minimum, show the help text "Usá coma para los centavos" by default and reject ambiguous input instead of guessing.

### WR-02: `aCentavos` doesn't validate its input; 3+ decimals give the wrong cents and other formats crash the render

**File:** `frontend/src/lib/money.ts:61-66` (callers: `estadoRestante`, `porcentajeUsado`, `RestanteMes.tsx:14-15`)
**Issue:** `aCentavos('12.345')` gives `12*100 + 345 = 1545n` (15.45) instead of 1234.5 cents. That is a silent wrong result. `aCentavos('1E+3')` (Python `str(Decimal)` can produce exponent notation, and Pydantic serializes Decimal with `str`), `aCentavos('abc')`, and `aCentavos('1,5')` throw a `SyntaxError` during render, which takes down the whole route. `formatMonto` validates and falls back to `—`, so the module's contract is inconsistent: the same input shows `—` in `Monto` and crashes `RestanteMes`.
**Fix:** Validate once with the same regex and fail loudly:
```ts
export function aCentavos(value: string): bigint {
  if (!MONTO_VALIDO.test(value)) throw new RangeError(`Monto inválido: ${value}`)
  ...
}
```
and validate API responses at the boundary (zod is already a dependency: `z.string().regex(MONTO_VALIDO)`), so bad data is rejected in the query, not in render.

### WR-03: RestanteMes shows contradictory output when the budget is 0 or the amount left is more than the budget

**File:** `frontend/src/components/ui/RestanteMes.tsx:13-16`, `frontend/src/lib/money.ts:77-93`
**Issue:**
- With `presupuesto="0"` and `restante="100"`, the state is `normal` (test line 103) but `porcentajeUsado` returns 100. The bar is full in the "normal" color, and the text reads `Usaste -$ 100 de $ 0` (negative `usado`).
- With `presupuesto="0"` and `restante="0"`, it says "Te queda poco este mes" even though there is no budget.
- Whenever `restante > presupuesto` (a refund, or the budget lowered mid-month), `usado` is negative and the text shows `Usaste -$ …`.
**Fix:** Clamp `usado` at `0n` before formatting. Treat `p <= 0n` explicitly: either don't render the meter (show a "configurá tu presupuesto" state) or return 0 from `porcentajeUsado`. Add tests for `('100','0')` and `('250000','200000')` that check the rendered text, not only the state.

### WR-04: BottomSheet calls `onClose` twice and closes on a drag that ends on the backdrop

**File:** `frontend/src/components/ui/BottomSheet.tsx:18-33`
**Issue:**
1. On a backdrop click or the "Cerrar" button, `onClose()` runs. The parent sets `open=false`, the effect calls `d.close()`, and that fires the native `close` event, which calls `onClose()` a second time. Today `cerrar` is idempotent, but a real `onClose` (reset the form, navigate back, track an analytics event) will run twice.
2. A `click` whose `mousedown` happens inside the sheet (for example selecting text in an input) and whose `mouseup` happens on the backdrop is dispatched to the common ancestor, which is the `<dialog>` itself. `e.target === e.currentTarget` is then true and the sheet closes, losing whatever the user typed in a gasto form.
3. If the parent ignores `onClose` and keeps `open=true` after Esc, the dialog stays closed but the prop says open. The effect won't re-run, so the component is no longer controlled.
**Fix:** Only call `onClose` from the native `close` event, and have the button and backdrop call `ref.current?.close()`. Track the pointer start:
```tsx
const downOnBackdrop = useRef(false)
onPointerDown={(e) => { downOnBackdrop.current = e.target === e.currentTarget }}
onClick={(e) => { if (downOnBackdrop.current && e.target === e.currentTarget) ref.current?.close() }}
```

### WR-05: A failed logout does nothing and shows no message

**File:** `frontend/src/app/ProtectedLayout.tsx:14-19`
**Issue:** `supabase.auth.signOut({ scope: 'local' })` returns `{ error }` and can reject on network errors. For a non-401/403/404 error, supabase-js keeps the local session. The code ignores the return value: the user taps "Cerrar sesión" and stays logged in with no feedback. A rejection becomes an unhandled promise rejection from the click handler.
**Fix:**
```ts
async function logout() {
  try {
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) { setLogoutError(NETWORK_ERROR); return }
  } catch { setLogoutError(NETWORK_ERROR); return }
  queryClient.clear()
  navigate('/login')
}
```

## Info

### IN-01: Invisible NBSP literal inside the regex

**File:** `frontend/src/lib/money.ts:36` (and `money.test.ts:14`)
**Issue:** `/^\$ /` contains a literal U+00A0. It looks identical to a regular space, so a reformat or an editor's "fix whitespace" breaks `formatMontoEditable` silently.
**Fix:** Write it as `/^\$ /` and `const S = ' '`.

### IN-02: No maximum length on the amount input

**File:** `frontend/src/lib/money.ts:52-58`, `frontend/src/components/ui/AmountInput.tsx:34-58`
**Issue:** `parseMontoInput` accepts any number of integer digits (BigInt). The backend column will be bounded (for example `Numeric(12,2)`), so the user only finds out through a server 422.
**Fix:** Cap the integer digits in `parseMontoInput` to the backend's precision (shared constant).

### IN-03: The selected category tile changes border width and shifts its content

**File:** `frontend/src/components/ui/CategoryGrid.tsx:47`
**Issue:** `has-[:checked]:border-2` goes from 1px to 2px, so the tile's content moves 1px on selection.
**Fix:** Keep `border` and add `has-[:checked]:outline`/`ring-1 ring-inset ring-tinta`, or use a 2px transparent border by default.

### IN-04: Screen readers announce the state text twice

**File:** `frontend/src/components/ui/RestanteMes.tsx:33-41`
**Issue:** `aria-valuetext={texto}` and the visible `<p>{texto}</p>` are the same string.
**Fix:** Use a short `aria-valuetext` (for example `${porcentaje}% usado`), or link the meter to the paragraph with `aria-describedby`.

### IN-05: `formatMonto` renders "-$ 0" for negative-zero strings

**File:** `frontend/src/lib/money.ts:21-26`
**Issue:** Python can serialize `Decimal('-0.00')`. The regex accepts it and Intl prints `-$ 0`.
**Fix:** Normalize with `deCentavos(aCentavos(value))` before formatting, or special-case `/^-0(\.0+)?$/`.

---

_Reviewed: 2026-10-31T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
