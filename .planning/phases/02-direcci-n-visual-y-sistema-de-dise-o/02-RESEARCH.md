# Phase 2: Dirección visual y sistema de diseño - Research

**Researched:** 2026-10-30
**Domain:** Design tokens con Tailwind 4, componentes accesibles con HTML nativo, formateo de montos es-AR
**Confidence:** HIGH (la mayoría de lo que importa se probó en esta sesión contra el Tailwind 4.3.3 y el Node instalados)

## Summary

El UI-SPEC aprobado ya fija casi todo: paleta, tipografía (Recursive), tokens, los 5 componentes, el copy y la ruta `/muestra`. Esta investigación chequeó que ese contrato se pueda implementar con el stack instalado y encontró dónde se puede romper. Lo central se verificó compilando CSS con `@tailwindcss/node` 4.3.3 y corriendo `Intl.NumberFormat` en Node:

1. El reset `--color-*: initial; --text-*: initial; --radius-*: initial; --shadow-*: initial; --font-*: initial;` dentro de `@theme` **hace que `text-red-600`, `rounded-lg`, `rounded` (sin sufijo), `shadow`, `text-sm`, `text-white` y `bg-black` no generen CSS**. `rounded-full`, `bg-transparent`, `p-4`, `min-h-12`, `sr-only`, `line-clamp-2`, `tabular-nums` y `font-semibold` siguen funcionando. `@theme inline { --color-papel: var(--papel) }` genera `bg-papel { background-color: var(--papel) }`, y el cambio de modo oscuro en `:root` lo sigue sin recargar. `bg-cat-3/15` sale como `color-mix(in oklab, var(--cat-3) 15%, transparent)`. [VERIFIED: compile local]
2. `Intl.NumberFormat('es-AR', {style:'currency', currency:'ARS'})` acepta strings como decimales exactos (`"12345678901234567.89"` se formatea sin perder dígitos) y **`trailingZeroDisplay: 'stripIfInteger'` resuelve D-07 de forma nativa**: `"125430"` da `$ 125.430` y `"125430.5"` da `$ 125.430,50`. El espacio después de `$` es U+00A0 (NBSP). `"abc"` **no tira error, devuelve `"$ NaN"`**, así que hay que validar antes. [VERIFIED: node 26]
3. La familia de `@fontsource-variable/recursive` se llama **`'Recursive Variable'`**, no `'Recursive'`. `full.css` trae los ejes CASL y MONO (subset latin de unos 305 KB en woff2). [VERIFIED: npm pack 5.3.0]

**Primary recommendation:** implementar el UI-SPEC tal cual. Usar `trailingZeroDisplay: 'stripIfInteger'` + `formatToParts` en `money.ts`, `<dialog>` + `showModal()` con un cierre por backdrop hecho a mano (sin depender de `closedby`), y radios nativos para el segmentado y la grilla. La única dependencia nueva es `@fontsource-variable/recursive`. Y hay que corregir el regex de verificación del UI-SPEC, porque da falsos positivos (ver Pitfall 4).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Tokens (paleta claro/oscuro, escala, radios) | Browser / CSS (`tokens.css` → `@theme`) | — | El tema lo decide `prefers-color-scheme` en CSS, sin JS (D-05/D-06) |
| Formateo de montos y estado restante | Browser (`lib/money.ts`, lógica pura) | API (manda los montos como string decimal) | Ni float ni cuentas de plata en JS: BigInt en centavos solo para comparar |
| Componentes base | Browser (`components/ui/`) | — | HTML nativo (dialog, radio, input) |
| Fuentes | CDN/Static (bundle Vite → `dist/`, Cloudflare Workers assets) | — | Self-hosted por la PWA offline (Phase 7) |
| Página `/muestra` | Browser (ruta SPA pública) | Static (fallback SPA de wrangler) | Tiene que abrirse en el celular desde el deploy (SC4) |

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
### Personalidad y tono
- **D-01:** Tono **cálido y cercano**: colores cálidos, formas redondeadas, algo de personalidad. Menos "banco", más "tu libreta". Evitar el look genérico de template (DIS-01).
- **D-02:** Sin referencia visual externa: la dirección la propone Claude con la skill `frontend-design`, documentando el porqué en `DESIGN.md`.
- **D-03:** Voz **rioplatense con voseo** ("Ingresá", "Te quedan $…"), frases cortas.
- **D-04:** **Humor solo en momentos sueltos**: estados vacíos y confirmaciones (ej. "Anotado. Tu billetera llora un poquito"). Errores, botones, labels y montos siempre serios y claros. `DESIGN.md` documenta esta regla de voz con ejemplos de sí/no.

### Claro / oscuro
- **D-05:** **Dos paletas (clara y oscura) que siguen al sistema** (`prefers-color-scheme`). Ambas cálidas y con contraste accesible (WCAG AA en texto y montos).
- **D-06:** **Sin selector en la app**: no se guarda preferencia; se cambia desde el celular.

### Números y montos
- **D-07:** Formato de montos: **pesos sin centavos en grande**; los centavos se muestran solo si no son `,00` y en tamaño menor. Formato `es-AR` (`$ 125.430`, `$ 125.430,50`) con `Intl.NumberFormat`. Dígitos tabulares para que no "bailen". Nunca se hacen cuentas con float en el cliente (restricción de proyecto: los montos llegan como string/Decimal).
- **D-08:** Patrón "cuánto me queda": **número grande** ("Te quedan $ 80.000") **+ barra fina** de usado vs. restante debajo. En esta fase se define como patrón/componente en la página de muestra; la pantalla real del mes es de una fase posterior.
- **D-09:** Alertas de color **escalonadas suaves**: color normal mientras hay margen; cálido/ámbar cerca del límite (umbral inicial: < 20% restante); rojo solo al pasarse. Los tres estados son tokens semánticos (no colores sueltos) y no dependen solo del color (texto o ícono acompaña, por accesibilidad).
- **D-10:** Input de monto con el **teclado numérico nativo** del celular (`inputmode="decimal"`), no un teclado propio dibujado.

### Categorías
- **D-11:** Cada categoría se identifica con **emoji + nombre** (el usuario elige el emoji al crearla, en una fase posterior). Sin librería de íconos para categorías.
- **D-12:** Cada categoría tiene **un color de una paleta cerrada** de 8–10 colores cálidos definidos en `tokens.css`, legibles en claro y oscuro. Esos colores sirven también para los gráficos por categoría de fases posteriores.

### Claude's Discretion
- **Tipografía** (D-01): elegir con la skill la familia o familias, no genéricas; dígitos tabulares obligatorios para montos. Cargar las fuentes **self-hosted** (archivos en el bundle o paquete npm tipo `@fontsource`), no desde un CDN, porque la PWA de la Phase 7 tiene que funcionar offline.
- **Grilla de categorías**: columnas y tamaño de cada botón (el usuario lo delegó). Restricción: targets táctiles ≥ 44px y cómodos para el pulgar.
- **Página de muestra**: ruta y acceso a criterio del planner, con la condición de que se pueda abrir en el celular real (SC4), o sea que tiene que existir en el deploy.
- **Migrar las pantallas de Phase 1** (login, recuperar, home) de las clases por defecto de Tailwind a los tokens nuevos: recomendado hacerlo en esta fase (el UI-SPEC de Phase 1 lo anticipa: "Phase 2 crea `tokens.css` y reemplaza estas clases"), pero el planner decide el alcance.
- Comportamiento de detalle del control segmentado y del bottom sheet (animación, cierre por gesto), radios, sombras y escala de espaciado.

### Deferred Ideas (OUT OF SCOPE)
- Selector de tema claro/oscuro dentro de la app — descartado por ahora (D-06); se puede reconsiderar si molesta.
- Comentarios con humor cuando te acercás o pasás del presupuesto — descartado (D-04); quizá en una fase de presupuesto si el usuario lo pide.

**Además, del UI-SPEC aprobado (02-UI-SPEC.md, status: approved):** dirección "La libreta del almacén", Recursive vía `@fontsource-variable/recursive/full.css`, `tokens.css` en `frontend/src/styles/`, reset de los defaults en `@theme`, componentes en `frontend/src/components/ui/`, `lib/money.ts`, ruta pública `/muestra`, migración de Phase 1 en alcance, bottom sheet sin arrastre ni handle. Se trata como contrato cerrado.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DIS-01 | Dirección visual propia (paleta, tipografía, tono) con `frontend-design`, sin look genérico | La skill está instalada (`frontend-design@claude-plugins-official` en `installed_plugins.json`, y el SKILL.md existe en `~/.claude/plugins/marketplaces/claude-plugins-official/plugins/frontend-design/skills/frontend-design/`). Se usa para la autocrítica con capturas de `/muestra`. Recursive self-hosted verificada |
| DIS-02 | `DESIGN.md` + `tokens.css` como fuente única usada por todos los componentes | Se verificó el mecanismo `:root` vars → `@theme inline` + reset de namespaces. Ver los patrones 1-2 y el plan de verificación por grep |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Montos: nunca float. Llegan como string/Decimal. En el cliente no se hacen cuentas de plata con `Number`/`parseFloat`.
- Mobile first. Dirección visual con la skill `frontend-design`, documentada en un archivo persistente (`DESIGN.md`).
- Lint: oxlint (no ESLint/typescript-eslint, por TS 7). Tests: Vitest, solo para la lógica no trivial ("No hace falta testear cada componente").
- No usar `supabase.from(...)`. No aplica a esta fase.
- No subir ni bajar libs de Vite sueltas sin chequear peers.
- GSD: los cambios al repo pasan por `/gsd-execute-phase`.

## Standard Stack

### Core (ya instalado, no se toca)
| Library | Version | Purpose |
|---------|---------|---------|
| tailwindcss + @tailwindcss/vite | 4.3.3 [VERIFIED: node_modules] | Tokens vía `@theme`, utilidades |
| react / react-dom | ^19.3.1 | `<dialog>` con `onClose`/`onCancel` nativos |
| vitest | ^5.0.5, `environment: 'node'`, `include: ['src/**/*.test.ts']` | Tests de `money.ts` |

### Nueva dependencia
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @fontsource-variable/recursive | 5.3.0 (modificado 2026-07-19) [VERIFIED: npm registry] | Recursive variable self-hosted, con ejes CASL/MONO en `full.css` | Fontsource es el estándar para fuentes self-hosted vía npm. Es solo CSS + woff2, sin scripts ni dependencias. Repo: github.com/fontsource/font-files |

**Installation:**
```bash
cd frontend && npm install @fontsource-variable/recursive@^5.3.0
```

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `<dialog>` nativo | Radix Dialog / vaul (drawer con swipe) | Agrega deps y el gesto de arrastre está descartado por el UI-SPEC. El nativo ya trae focus trap, Esc, inert y la vuelta del foco |
| Radios nativos | Radix RadioGroup / ToggleGroup | Los radios nativos ya traen flechas, Tab y lectores de pantalla sin JS |
| `trailingZeroDisplay` | Cortar ",00" a mano | La opción nativa es exacta y más corta |

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| @fontsource-variable/recursive | npm | org Fontsource, años de historia; v5.3.0 | no medido | github.com/fontsource/font-files | no ejecutado | Approved [ASSUMED]: contenido inspeccionado con `npm pack` (sin `scripts`, sin `dependencies`, solo CSS/woff2/metadata) |

**Packages removed:** none. **Flagged:** none. slopcheck no se corrió. Igual el paquete lo nombra el UI-SPEC aprobado y se inspeccionó el tarball, así que un checkpoint humano es opcional.

## Architecture Patterns

### System Architecture Diagram

```
API (string "125430.50") ──► lib/money.ts ──┬─ formatMonto() ─► formatToParts ─► {entero, centavos} ─► <Monto>
                                            ├─ estadoRestante() (BigInt centavos) ─► 'normal'|'cerca'|'pasado' ─► <RestanteMes> (color token + texto)
usuario tipea ─► <AmountInput> ─► parseMontoInput() ─► string normalizado "125430.5" ─► onChange (nunca number)

prefers-color-scheme ─► :root vars (tokens.css) ─► @theme inline ─► utilidades (bg-papel, text-tinta, bg-cat-N/15) ─► componentes
                         @theme { --*: initial } ─► defaults de Tailwind eliminados ─► clases sueltas = sin CSS

router.tsx ─► /muestra (pública, antes de '*') ─► MuestraPage ─► Button, AmountInput, SegmentedControl, CategoryGrid, BottomSheet, RestanteMes
```

### Recommended Project Structure
```
frontend/src/
├── styles/tokens.css        # única fuente: vars :root + dark + @theme reset + @theme inline + @utility
├── index.css                # @import "tailwindcss"; @import "@fontsource-variable/recursive/full.css"; @import "./styles/tokens.css"; base html
├── lib/money.ts             # formatMonto, parseMontoInput, estadoRestante, porcentajeUsado
├── lib/money.test.ts
├── components/ui/           # Button, Monto, AmountInput, SegmentedControl, CategoryGrid, BottomSheet, RestanteMes
└── app/MuestraPage.tsx      # o features/muestra/; ruta en router.tsx
DESIGN.md                    # raíz del repo
```

### Pattern 1: tokens.css (verificado)
```css
/* frontend/src/styles/tokens.css */
:root {
  color-scheme: light dark;
  --papel: #FFF6EF; --tinta: #2E1F27; --acento: #7A2E63; /* … */
  --cat-1: #C2412D; /* … cat-10 */
  --sombra-hoja: 0 -8px 24px rgb(46 31 39 / 0.16);
}
@media (prefers-color-scheme: dark) {
  :root { --papel: #221A1F; --tinta: #F6EAE2; /* … */ --sombra-hoja: none; }
}
@theme {
  --color-*: initial; --text-*: initial; --radius-*: initial; --shadow-*: initial; --font-*: initial;
  --font-sans: "Recursive Variable", system-ui, sans-serif;
  --font-casual: "Recursive Variable", system-ui, sans-serif;
  --font-casual--font-variation-settings: "CASL" 1;     /* genera .font-casual con font-variation-settings */
  --text-cuerpo: 1rem;      --text-cuerpo--line-height: 1.5;
  --text-etiqueta: 0.875rem; --text-etiqueta--line-height: 1.4; --text-etiqueta--font-weight: 600;
  --text-titulo: 1.375rem;  --text-titulo--line-height: 1.2;  --text-titulo--font-weight: 600;
  --text-monto: 2.75rem;    --text-monto--line-height: 1;     --text-monto--font-weight: 600;
  --radius-segmento: 8px; --radius-control: 12px; --radius-tile: 16px; --radius-hoja: 24px;
}
@theme inline {
  --color-papel: var(--papel); --color-tinta: var(--tinta); --color-acento: var(--acento); /* … */
  --color-cat-1: var(--cat-1); /* … */
  --shadow-hoja: var(--sombra-hoja);
}
```
Verificado: `.font-casual` emite `font-variation-settings: var(--font-casual--font-variation-settings)`. `.text-titulo` emite tamaño + line-height + font-weight. `--font-*: initial` **no** borra `--font-weight-*` (`font-semibold` sigue andando), pero si se resetea `--font-weight-*` también, desaparece. [VERIFIED: compile local]

Se recomienda `@theme inline` para los colores porque los valores cambian por media query. Con `@theme` sin `inline`, Tailwind emitiría `--color-papel: var(--papel)` en `:root` y la resolución sería la misma, pero `inline` evita la doble indirección. [CITED: tailwindcss.com/docs/theme, conocimiento previo; el comportamiento con `inline` se verificó local]

### Pattern 2: formatMonto con Intl (verificado)
```ts
const fmt = new Intl.NumberFormat('es-AR', {
  style: 'currency', currency: 'ARS', trailingZeroDisplay: 'stripIfInteger',
})
// value: string decimal validado (/^-?\d+(\.\d{1,2})?$/); format("abc") devuelve "$ NaN", no tira error
export function formatMonto(value: string) {
  const parts = fmt.formatToParts(value as unknown as number) // ver nota de tipos
  const i = parts.findIndex(p => p.type === 'decimal')
  const join = (ps: Intl.NumberFormatPart[]) => ps.map(p => p.value).join('')
  return i === -1 ? { entero: join(parts), centavos: null } : { entero: join(parts.slice(0, i)), centavos: join(parts.slice(i)) }
}
```
Salidas reales: `"125430.50"` → `$ 125.430,50`, `"125430"` → `$ 125.430`, `"0"` → `$ 0`, `"-15000"` → `-$ 15.000`, `"0.1"` → `$ 0,10`. Las partes son `currency, literal(U+00A0), integer, group, …, decimal, fraction`. [VERIFIED: node]

**Nota de tipos:** `lib.es2023.intl` tipa `format(value: number | bigint | StringNumericLiteral)`. Si TS 7 no acepta un `string` común, alcanza con hacer cast al template literal type `` `${number}` `` (es el tipo `StringNumericLiteral`). [ASSUMED: revisar con `tsc -b`]

### Pattern 3: estadoRestante con BigInt
Pasar el string decimal a centavos BigInt partiéndolo por `.` y rellenando la fracción a 2 dígitos (`padEnd(2,'0')`). Después: `restante < 0n` → `pasado`, `restante * 100n < presupuesto * 20n` → `cerca` (el 0 cae acá), si no → `normal`. Porcentaje de la barra: `Number((usado * 100n) / presupuesto)` con tope en 100, que convierte un entero chico y no es una cuenta de plata. Hay que cuidar la división por cero si el presupuesto es 0.

### Pattern 4: BottomSheet con `<dialog>`
```tsx
const ref = useRef<HTMLDialogElement>(null)
useEffect(() => { const d = ref.current!; if (open && !d.open) d.showModal(); else if (!open && d.open) d.close() }, [open])
<dialog ref={ref} aria-labelledby={titleId} onClose={onClose}
        onClick={e => { if (e.target === e.currentTarget) onClose() }}>  {/* backdrop: clic en el propio dialog */}
  <div>{/* contenido; el dialog no puede tener padding, para que el clic dentro caiga en este div */}</div>
</dialog>
```
- `Esc` dispara `cancel` y después `close`. `onClose` mantiene el estado de React sincronizado. [CITED: developer.mozilla.org/.../Elements/dialog]
- **No depender de `closedby="any"`**: MDN no confirma el soporte en Safari. El handler de clic cubre todos los casos. [CITED: MDN; LOW sobre el soporte en Safari]
- Entrada animada: usar **`@keyframes`** (`translateY(100%)` → 0) en `dialog[open]`. Según MDN, las animaciones con keyframes no necesitan `@starting-style` ni `allow-discrete`, y así se evita el soporte desparejo de `@starting-style` en Safari < 17.5. Es solo animación de entrada, como pide el spec. Envolverla en `@media (prefers-reduced-motion: no-preference)`. [CITED: MDN]
- Usar el selector `dialog[open]`, no la pseudo-clase `:open` (que es más nueva). [ASSUMED]
- Bloqueo de scroll: `html:has(dialog[open]) { overflow: hidden; }` (`:has` funciona desde Safari 15.4). [ASSUMED]
- El `<dialog>` trae estilos UA (`max-width/height`, `margin:auto`, borde, padding): hay que resetearlos con utilidades (`m-0 mt-auto p-0 max-w-none w-full border-0`). `color` y `background` heredan del UA, así que se fijan explícitamente (`bg-papel text-tinta`).

### Pattern 5: SegmentedControl / CategoryGrid con radios nativos
`<fieldset><legend>` + `<label class="has-[:checked]:bg-papel has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-acento"><input type="radio" class="sr-only" name=… /></label>`. Se verificó que `has-[:focus-visible]:outline-acento` compila. Los radios con el mismo `name` dan flechas y Tab gratis. El `name` tiene que ser único por instancia (`useId()`). Ojo: `sr-only` es `position:absolute`, así que el `<label>` necesita `relative` para que el input no se vaya fuera del layout y genere scroll horizontal.

### Pattern 6: AmountInput
`<input type="text" inputMode="decimal" autoComplete="off" enterKeyHint="done">`. No usar `type="number"`, que rechaza la coma en es-AR y cambia el valor con la rueda del mouse. `parseMontoInput(raw)` hace todo en strings: pasa `.`→`,`, saca lo que no sea dígito o coma, se queda con la primera coma, corta a 2 decimales, saca ceros a la izquierda y devuelve `{display, value}`. Las cifras de miles en vivo se pueden armar con `Intl.NumberFormat('es-AR').format(BigInt(enteros))`. Detalle: cuando el usuario tipea `.` para separar miles (`1.234`), el spec lo toma como coma decimal. Es una decisión del spec y hay que documentarla en DESIGN.md. Reformatear en vivo mueve el cursor: hay que llevar el caret al final o recalcularlo contando dígitos.

### Anti-Patterns to Avoid
- **`Number(value)` / `parseFloat` / `toFixed` sobre montos**: viola la restricción del proyecto. Pasar el string directo a Intl.
- **Clases arbitrarias `bg-[#…]`, `p-[13px]`**: no las bloquea el reset (se verificó que `bg-[#fff]` compila). Hay que agarrarlas con grep.
- **`style={{ color: … }}` inline**: tampoco lo bloquea nada. Grep.
- **`font-family: 'Recursive'`**: no matchea. El nombre correcto es `'Recursive Variable'`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Focus trap, Esc, inert del fondo, vuelta del foco | Trampa de foco con JS | `<dialog>.showModal()` | Nativo y baseline desde 2022 |
| Navegación por flechas en el segmentado/grilla | roving tabindex | `<input type="radio">` con el mismo `name` | Nativo |
| Separadores es-AR, sacar el `,00` | Regex de miles | `Intl.NumberFormat` + `trailingZeroDisplay` | Exacto con strings |
| Modo oscuro | Toggle/estado en JS | `@media (prefers-color-scheme)` en `:root` | D-06; cambia en vivo |
| Fuentes | Copiar woff2 a mano | `@fontsource-variable/recursive/full.css` | Vite reescribe las URLs y las manda a `dist/assets` |

## Common Pitfalls

### Pitfall 1: El reset rompe Phase 1 en silencio
**What goes wrong:** con `--color-*: initial`, login, recuperar, home, ProtectedLayout **y `main.tsx`** (`text-zinc-900` en "Cargando…", que el UI-SPEC no lista) quedan sin colores ni tamaños, sin ningún error de build.
**How to avoid:** migrar en el mismo plan (o wave) que introduce el reset y sumar `main.tsx` a la lista. `text-white`/`bg-black` también desaparecen.

### Pitfall 2: Nombre de la familia
`@fontsource-variable/recursive` declara `font-family: 'Recursive Variable'`. Si se usa `"Recursive"`, cae al fallback sin aviso. [VERIFIED: full.css]

### Pitfall 3: NBSP en los tests
El separador después de `$` es U+00A0. En los tests hay que comparar contra `'$ 125.430'` o normalizar. La salida depende del ICU de Node: el `.nvmrc` dice 26 (local v26.13.0, que trae full-icu). [VERIFIED]

### Pitfall 4: El regex de verificación del UI-SPEC da falsos positivos
`rounded(-(sm|md|lg|xl))?\b` matchea el `rounded` de `rounded-control`, `rounded-tile`, `rounded-hoja` y `rounded-full` (`\b` corta en el `-`), así que nunca va a "no devolver nada". Usar en su lugar:
```bash
grep -rnE "\b(zinc|blue|red|gray|slate|neutral|stone|white|black|amber|green)-[0-9]+|\btext-(xs|sm|base|lg|xl|[2-9]xl)\b|\brounded(-(xs|sm|md|lg|xl|[2-4]xl))?([\"' ]|$)|\bshadow(-(xs|sm|md|lg|xl|2xl))?([\"' ]|$)" frontend/src --include=*.tsx
grep -rnE "\[#|#[0-9a-fA-F]{3,8}\b|\[[0-9.]+(px|rem|em)\]|rgb\(|style=\{\{" frontend/src --include=*.tsx
grep -rnE "#[0-9a-fA-F]{3,8}\b|rgb\(" frontend/src --include=*.css | grep -v "styles/tokens.css"
```
Las tres tienen que dar vacío. Como el reset ya anula las clases por defecto, el grep sirve sobre todo para encontrar valores arbitrarios y estilos inline.

### Pitfall 5: `color-mix` y el fallback sólido
`bg-cat-N/15` emite un fallback `background-color: var(--cat-N)` **sólido** fuera de `@supports color-mix` (iOS < 16.2). Ahí el texto `tinta` sobre el color sólido puede no tener contraste. Se acepta (el target es un celular actual), pero hay que anotarlo en DESIGN.md. [VERIFIED: output compilado; versión de iOS ASSUMED]

### Pitfall 6: `formatToParts("abc")` → `"$ NaN"`
No tira error. Validar con un regex antes de formatear (o en el borde de la API) y decidir qué se muestra ante un input inválido.

### Pitfall 7: Fuente de 305 KB solo para latin
`full.css` tiene 4 `@font-face` con `unicode-range`. Para es-AR solo se descarga latin (~305 KB), y latin-ext solo si aparece algún carácter de ese rango. Es aceptable para la PWA, pero no hay que importar además `index.css` u otras variantes, porque se duplica.

### Pitfall 8: Hover pegado en el celular
Tailwind 4 ya envuelve `hover:` en `@media (hover: hover)` por defecto. [ASSUMED: comportamiento conocido de v4, verificar en el CSS de salida] Si es así, no hace falta configurar nada.

## Code Examples
Ver los patrones 1-6. Los valores de salida de Intl salen de ejecutarlos en esta sesión.

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `tailwind.config.js` `theme.extend` | `@theme` en CSS (Tailwind 4) | Una sola fuente en CSS |
| Librerías de modal (focus-trap) | `<dialog>.showModal()` | Cero deps |
| Cortar `,00` a mano | `trailingZeroDisplay: 'stripIfInteger'` | Nativo |
| `Intl.format(Number(str))` | `Intl.format(str)` (NumberFormat v3, decimal exacto) | Sin float |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | TS 7 acepta `formatToParts` con un string usando el cast `` `${number}` `` | Pattern 2 | Bajo: un cast más |
| A2 | `closedby` no es confiable en Safari | Pattern 4 | Nulo: el handler de clic cubre todo |
| A3 | `:has()` y el selector `dialog[open]` andan en el iOS del usuario | Pattern 4 | Bajo: falla solo el scroll lock |
| A4 | `hover:` de Tailwind 4 se envuelve en `(hover: hover)` | Pitfall 8 | Bajo: hover pegado en el celular |
| A5 | El fallback sólido de color-mix solo afecta a iOS < 16.2 | Pitfall 5 | Bajo |
| A6 | slopcheck no se corrió para `@fontsource-variable/recursive` | Audit | Bajo: se inspeccionó el tarball |

## Open Questions

1. **¿El "." que tipea el usuario es decimal o separador de miles?** El spec dice decimal. Alguien que escribe `1.500` queriendo decir mil quinientos obtiene `1,50`. Recomendación: respetar el spec, documentarlo y que la vista en vivo (`1,5`) lo haga evidente.
2. **¿Los montos negativos con `<Monto>`?** `RestanteMes` muestra el valor absoluto. Un negativo formateado da `-$ 15.000`. No hay caso de uso en esta fase.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Skill frontend-design | DIS-01 (bloqueante) | ✓ | instalada (`installed_plugins.json`) | — |
| Node | build/test | ✓ | v26.13.0 (`.nvmrc` 26) | — |
| Tailwind | tokens | ✓ | 4.3.3 | — |
| npm registry | instalar la fuente | ✓ | — | — |
| Celular real | SC4 | humano | — | checkpoint manual |
| Navegador para capturas (autocrítica de la skill) | DIS-01 | no verificado | — | capturas del usuario |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^5.0.5, `environment: 'node'` |
| Config file | `frontend/vite.config.ts` (`include: ['src/**/*.test.ts']`: solo `.ts`, no `.tsx`) |
| Quick run command | `cd frontend && npx vitest run src/lib/money.test.ts` |
| Full suite command | `cd frontend && npm test && npm run lint && npm run build` |

No se agregan jsdom ni @testing-library. Los componentes son HTML nativo y su comportamiento (dialog, radios) lo da el navegador. Probarlo en jsdom probaría el mock, no la app. Se validan a mano en `/muestra`.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DIS-02 | formatMonto: `125430.00` sin centavos, `125430.50` → `,50`, `0`, negativo, string grande sin perder precisión | unit | `npx vitest run src/lib/money.test.ts` | ❌ Wave 0 |
| DIS-02 | parseMontoInput: `1.234,5`, `0,99`, `12,345`→2 decimales, `abc`, `1,2,3`, `.`→`,` | unit | idem | ❌ |
| DIS-02 | estadoRestante: 20% exacto → normal, 0 → cerca, -0.01 → pasado, presupuesto 0 | unit | idem | ❌ |
| DIS-02 | Sin colores/tamaños sueltos en componentes y pantallas | static | los 3 grep del Pitfall 4, todos vacíos | n/a |
| DIS-02 | tokens.css es la única fuente (no hay hex fuera de él) | static | el tercer grep del Pitfall 4 | n/a |
| DIS-02 | Fuente self-hosted en el bundle | build | `npm run build && ls dist/assets/*.woff2` (no hay `fonts.googleapis` en `dist/`) | n/a |
| DIS-02 | `DESIGN.md` existe con las secciones del UI-SPEC | static | `test -f DESIGN.md && grep -c "^## " DESIGN.md` | n/a |
| DIS-01 | Dirección no genérica, hecha con la skill | manual | autocrítica con la skill sobre capturas de `/muestra` en 360/390/768/1280, claro y oscuro | — |
| SC4 | Se ve bien en un celular real + compu, el tema cambia sin recargar, no hay scroll horizontal | manual (checkpoint:human-verify) | abrir `/muestra` en el deploy | — |

### Sampling Rate
- **Per task commit:** `npx vitest run` + los grep del Pitfall 4
- **Per wave merge:** `npm test && npm run lint && npm run build`
- **Phase gate:** suite verde + deploy + checkpoint humano en el celular

### Wave 0 Gaps
- [ ] `frontend/src/lib/money.test.ts`, que cubre DIS-02 (lógica de montos)
- Framework: ninguno que agregar

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2/V3/V4 | no | `/muestra` es pública y no muestra datos reales ni llama a la API |
| V5 Input Validation | sí (client-side, UX) | `parseMontoInput` filtra lo que se tipea. El backend (Pydantic `Decimal`) sigue siendo la frontera de confianza en Phase 3 |
| V6 Cryptography | no | — |

| Pattern | STRIDE | Mitigation |
|---------|--------|------------|
| Ruta pública que expone datos | Information disclosure | `/muestra` usa datos fijos, sin `useAuth`/fetch. Va fuera de `ProtectedLayout` |
| Fuente de CDN externo (tracking/offline) | Info disclosure | Self-hosted |

## Sources

### Primary (HIGH)
- Compilación local con `@tailwindcss/node` (Tailwind 4.3.3): reset de namespaces, `@theme inline`, `/15` con color-mix, `--font-*--font-variation-settings`, `--text-*--font-weight`, `has-[:focus-visible]`, valores arbitrarios
- Node v26.13.0: salidas de `Intl.NumberFormat` es-AR, NBSP, `trailingZeroDisplay`, strings grandes, `"abc"` → NaN
- `npm view` + `npm pack @fontsource-variable/recursive@5.3.0`: archivos, nombre de la familia, tamaños, sin scripts
- Código del repo: `frontend/package.json`, `vite.config.ts`, `router.tsx`, `.oxlintrc.json`, `wrangler.jsonc`, uso de clases por defecto en Phase 1

### Secondary (MEDIUM)
- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog: `closedby`, `@starting-style` vs keyframes, baseline

### Tertiary (LOW)
- Soporte de `closedby` en Safari (no confirmado)

## Metadata
**Confidence breakdown:** Stack HIGH (verificado local) · Architecture HIGH · Pitfalls HIGH en los de Tailwind/Intl/fuente, MEDIUM en el soporte de navegadores
**Research date:** 2026-10-30
**Valid until:** 2026-11-30
