---
phase: 2
slug: direcci-n-visual-y-sistema-de-dise-o
status: approved
shadcn_initialized: false
preset: none
created: 2026-10-30
reviewed_at: 2026-10-30
---

# Phase 2 — UI Design Contract

> Contrato visual y de interacción para la fase. Lo genera gsd-ui-researcher y lo verifica gsd-ui-checker.

**Alcance:** identidad visual (paleta clara y oscura, tipografía, tono), `tokens.css` como única fuente de tokens expuesta en el `@theme` de Tailwind 4, `DESIGN.md` en la raíz, los 5 componentes base más el patrón "cuánto me queda" (D-08), y una página de muestra pública. Se migran las 3 pantallas de Phase 1 a los tokens. No se construyen pantallas reales.

**Skill:** `frontend-design@claude-plugins-official` figura instalada en `~/.claude/plugins/installed_plugins.json` (v1.1.1, verificado el 2026-10-30). La dirección de abajo sale de su proceso: brief, plan de tokens, revisión contra los defaults y ajuste. El executor igual confirma que esté disponible antes de escribir `DESIGN.md` (CONTEXT, prerrequisito bloqueante) y usa la skill para hacer la autocrítica con capturas de la página de muestra.

---

## Dirección visual: "La libreta del almacén"

- **Tema:** la libreta de tapa blanda donde se anota lo que se gastó: papel con un toque durazno, tinta ciruela y números escritos a mano con soltura. Es cálida y personal, no tiene cara de banco (D-01).
- **Para quién y para qué:** una sola persona, desde el celular y con una mano. El trabajo principal es anotar un monto en segundos y ver cuánto queda.
- **Lo memorable, en un solo lugar:** el monto grande en Recursive con el eje Casual al máximo, que se ve escrito con birome. Todo lo demás es tranquilo: texto en Recursive Linear, sin gradientes, sin sombras salvo en el bottom sheet, sin tarjetas por todos lados.
- **Revisión contra los defaults de la skill (qué se cambió y por qué):**
  1. El primer borrador era fondo crema, título serif y acento terracota. Es el default nº 1 de la skill, así que se cambió el acento a **ciruela** y el título serif por **Recursive Casual** (sans).
  2. En vez de un rojo frambuesa como acento se eligió ciruela, porque el rojo tiene que quedar libre para "te pasaste" (D-09).
  3. Se descartaron el kit de tarjetas SaaS (todo en cajas iguales con la misma sombra), los títulos chicos en mayúsculas encima de cada sección, los "→" en los botones, la monoespaciada para datos y el negro teñido #111. El modo oscuro usa un ciruela muy oscuro (`#221A1F`), no gris.
  4. Los radios cambian según la jerarquía (12 / 16 / 24) en vez de usar uno solo para todo.
- **Alineación:** todo a la izquierda. Solo el monto del input se alinea a la izquierda pegado al "$" (no centrado).

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none. Gate de shadcn: no se inicializa. Son 5 componentes chicos y la apariencia neutra de shadcn va en contra de DIS-01. El bottom sheet usa `<dialog>` nativo y el control segmentado y la grilla usan radios nativos, así que no hacen falta Radix ni Base UI. |
| Preset | not applicable |
| Component library | none: componentes propios en `frontend/src/components/ui/` con elementos HTML nativos y utilidades de Tailwind generadas desde los tokens |
| Icon library | none. Las categorías usan emoji (D-11). Los únicos glifos de UI son "✓" (selección) y "!" (alerta), como texto. |
| Font | **Recursive** variable, self-hosted con `@fontsource-variable/recursive` (import `@fontsource-variable/recursive/full.css`, que trae los ejes CASL y MONO). Fallback: `system-ui, sans-serif`. Sin CDN (PWA offline, Phase 7). Los archivos quedan en `dist/` por el bundle de Vite. |
| Tokens | `frontend/src/styles/tokens.css`, importado desde `frontend/src/index.css` después de `@import "tailwindcss"`. Es la única fuente de tokens. |

### Cómo se exponen los tokens (Tailwind 4)

- `:root` define las variables crudas de la paleta clara. `@media (prefers-color-scheme: dark) { :root { … } }` las reemplaza (D-05, sin selector en la app: D-06). `:root { color-scheme: light dark; }` para que los inputs y el scrollbar nativos acompañen.
- `@theme inline { --color-papel: var(--papel); … }` las publica como utilidades (`bg-papel`, `text-tinta`, `border-borde`, `bg-cat-3/15`).
- `@theme` hace reset de los defaults con `--color-*: initial;`, `--text-*: initial;`, `--radius-*: initial;`, `--shadow-*: initial;` y `--font-*: initial;`. Así una clase como `text-red-600` o `rounded-lg` **no genera CSS** y SC3 se cumple solo. Por eso la migración de Phase 1 es obligatoria en esta fase: si no, esas pantallas pierden el estilo.
- Se mantiene el `--spacing` por defecto de Tailwind (0.25rem): las utilidades `p-4`, `gap-2`, etc. caen en múltiplos de 4px. En los componentes nuevos solo se usan los pasos de la escala de abajo.

---

## Layout

- Mobile first. Columna única, `max-width: 480px`, centrada en tablet y desktop, con padding horizontal de 16px (24px desde `sm:`).
- Altura `min-h-dvh`. El padding inferior suma `env(safe-area-inset-bottom)`.
- **Página de muestra:** ruta pública `/muestra`, fuera de `ProtectedLayout` y de `GuestOnly`, para poder abrirla en el celular desde el deploy sin loguearse (SC4). Se agrega en `frontend/src/app/router.tsx` **antes** del `*`. No muestra datos reales.
- Orden de la página de muestra (de arriba hacia abajo, 48px entre secciones, título de sección de 22px):
  1. "Cuánto te queda": el patrón restante en sus 3 estados, uno debajo del otro.
  2. "Montos": `$ 125.430`, `$ 125.430,50` y `$ 0` con `Monto` en tamaño display.
  3. "Botones": primario, secundario, peligro, y primario en estado cargando.
  4. "Monto": `AmountInput` con su label y un ejemplo con error.
  5. "Medio de pago": `SegmentedControl` con Efectivo / Débito / Crédito.
  6. "Categorías": `CategoryGrid` con 9 categorías de ejemplo.
  7. "Hoja inferior": botón secundario "Elegir categoría" que abre un `BottomSheet` con la grilla, y botón peligro "Borrar gasto" que abre la confirmación destructiva.
  8. "Voz": estado vacío de ejemplo y confirmación con humor.
  9. "Colores de categoría": 10 muestras con su nombre.
- Sin header de app en `/muestra`. Arriba va un título de 22px, "Sistema de diseño", y una línea de 16px en `tinta-2`: "Así se ven los componentes de Control de Gastos."

```
┌──────────────────────────────┐
│ Sistema de diseño            │
│ Así se ven los componentes…  │
│                              │
│ Cuánto te queda              │
│ Te quedan                    │
│ $ 80.000          ← 44 CASL  │
│ ████████████░░░░░░░░  barra  │
│ Usaste $ 120.000 de $ 200.000│
│ …                            │
│ Categorías                   │
│ ┌──────┐┌──────┐┌──────┐     │
│ │ 🍔   ││ 🚌   ││ 🛒   │     │
│ │Comida││Transp││Súper │     │
│ └──────┘└──────┘└──────┘     │
└──────────────────────────────┘
```

---

## Spacing Scale

Declared values (must be multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Label "Te quedan" ↔ monto; error ↔ input; "$" ↔ cifra |
| sm | 8px | Label ↔ input; gap de la grilla de categorías; monto ↔ barra; barra ↔ texto "Usaste…" |
| md | 16px | Padding de página (mobile), padding interno de tiles e inputs, entre campos |
| lg | 24px | Padding del bottom sheet; padding de página desde `sm:`; antes del botón principal |
| xl | 32px | Título de página ↔ primera sección |
| 2xl | 48px | Entre secciones de la página de muestra |
| 3xl | 64px | Margen inferior de la página de muestra (por encima del safe area) |

Exceptions:
- Targets táctiles: botones, segmentos e input de altura mínima 48px (`min-h-12`). Botón "Cerrar" del sheet y links: mínimo 44px. Tiles de categoría: 80px de alto mínimo.
- Barra restante: 8px de alto. Borde de controles: 1px. Borde de selección y anillo de foco: 2px, con offset de 2px.

---

## Typography

Familia única, Recursive. `font-feature-settings` / `font-variant-numeric: tabular-nums` aplicado **globalmente** en `html` (los dígitos de Recursive ya son tabulares; se declara igual para que el fallback también los use). MONO siempre en 0.

| Role | Token | Size | Weight | Line Height | CASL | Uso |
|------|-------|------|--------|-------------|------|-----|
| Body | `text-cuerpo` | 16px | 400 | 1.5 | 0 | Texto, inputs de texto, botones |
| Label | `text-etiqueta` | 14px | 600 | 1.4 | 0 | Labels, nombre de categoría, texto "Usaste…", errores (estos en 400) |
| Heading | `text-titulo` | 22px | 600 | 1.2 | 1 | Títulos de página, sección y sheet; centavos y "$" junto a un monto display |
| Display | `text-monto` | 44px | 600 | 1.0 | 1 | Monto restante y valor del `AmountInput` |

- Solo 4 tamaños y 2 pesos (400 y 600). El emoji de categoría va a 28px, como ícono y no como texto (excepción declarada).
- CASL 1 (`font-variation-settings: "CASL" 1`) solo en Heading y Display. Es el único lugar donde se gasta la personalidad.
- Inputs a ≥16px siempre (iOS no hace zoom).
- Sin mayúsculas sostenidas y sin tracking extra. Todo en sentence case.

---

## Color

Valores crudos en `tokens.css`. Los componentes usan **solo** los nombres semánticos.

| Rol | Token | Claro | Oscuro | Uso |
|-----|-------|-------|--------|-----|
| Dominant (60%) | `papel` | `#FFF6EF` | `#221A1F` | Fondo de página, fondo del sheet, segmento seleccionado |
| Secondary (30%) | `papel-2` | `#F6E9DE` | `#2F242B` | Fondo de inputs, track del control segmentado y de la barra, fondo de la sección de muestras |
| Línea | `linea` | `#EAD9CB` | `#3D3038` | Divisores decorativos (no se usa como borde de control) |
| Borde de control | `borde` | `#9C8590` | `#8A7681` | Borde de inputs, botón secundario y tiles no seleccionados (≥3:1, WCAG 1.4.11) |
| Texto | `tinta` | `#2E1F27` | `#F6EAE2` | Texto principal, montos en estado normal, borde de tile seleccionado |
| Texto secundario | `tinta-2` | `#6E5A63` | `#C8B4BC` | Ayudas, "Te quedan", "Usaste…", "$" del input (≈6:1 / 8,7:1) |
| Accent (10%) | `acento` | `#7A2E63` (ciruela) | `#E8A3CF` | Ver lista reservada |
| Accent hover/pressed | `acento-fuerte` | `#64224F` | `#F2BBDD` | Hover y pressed del botón primario |
| Texto sobre acento | `sobre-acento` | `#FFFFFF` | `#221A1F` | Texto del botón primario (8,7:1 / 8,6:1) |
| Alerta | `alerta` | `#9A5B00` | `#F2B54A` | Estado "cerca del límite": monto, barra y aviso (5:1 / 9,3:1) |
| Destructive / peligro | `peligro` | `#B3261E` | `#FF8A7A` | Estado "te pasaste", errores de formulario y validación, botón peligro (6,1:1 / 7,4:1) |

Accent reserved for: (1) fondo del botón primario; (2) anillo de foco de todos los controles; (3) relleno de la barra restante en estado normal; (4) links de texto ("Olvidé mi contraseña", "Volver a iniciar sesión", "Reenviar código"). Nada más. **No** se usa en el segmento seleccionado ni en el tile de categoría seleccionado: esos marcan la selección con tinta, borde y ✓.

Estados del presupuesto (D-09), siempre con texto que acompaña al color:

| Estado | Condición | Monto | Barra | Texto bajo la barra |
|--------|-----------|-------|-------|---------------------|
| `normal` | restante ≥ 20% del presupuesto | `tinta` | `acento` | "Usaste $ X de $ Y" en `tinta-2` |
| `cerca` | 0 < restante < 20% | `alerta` | `alerta` | "! Te queda poco este mes. Usaste $ X de $ Y" en `alerta` |
| `pasado` | restante < 0 | `peligro` | `peligro`, llena al 100% | "Te pasaste $ Z. Usaste $ X de $ Y" en `peligro` |

Con restante exactamente 0, el estado es `cerca` y el label dice "Te quedan $ 0". El umbral se define en `tokens.css`/`DESIGN.md` como valor inicial (20%), pero vive como constante en el helper, no como CSS.

### Paleta de categorías (D-12)

10 colores, tokens `cat-1` … `cat-10`. Sólidos para los gráficos de fases posteriores (≥3:1 contra `papel` en su modo). En los tiles se usan como fondo tenue (`bg-cat-N/15`). El texto del tile siempre es `tinta`, nunca el color de la categoría.

| Token | Nombre | Claro | Oscuro |
|-------|--------|-------|--------|
| `cat-1` | Tomate | `#C2412D` | `#F08A73` |
| `cat-2` | Mandarina | `#B85A06` | `#F2A25C` |
| `cat-3` | Mostaza | `#8F6A00` | `#E2C25A` |
| `cat-4` | Oliva | `#6A7419` | `#B8C46A` |
| `cat-5` | Eucalipto | `#2F7A6B` | `#6FC2AE` |
| `cat-6` | Pizarra | `#4F6B8A` | `#95B0D0` |
| `cat-7` | Lavanda | `#6B5BB5` | `#A99CF0` |
| `cat-8` | Uva | `#7E3FA0` | `#C594E8` |
| `cat-9` | Rosa | `#C23A6E` | `#F28DB2` |
| `cat-10` | Canela | `#8A5A3C` | `#D6A07E` |

El executor verifica cada par (sólido vs `papel`, ≥3:1, y `tinta` sobre `cat-N/15`, ≥4,5:1) con una herramienta de contraste y ajusta el valor si alguno no da. Los valores ajustados se anotan en `DESIGN.md`.

### Radios, sombra y movimiento

| Token | Valor | Uso |
|-------|-------|-----|
| `rounded-control` | 12px | Botones, inputs, control segmentado (el segmento interno usa 8px: `rounded-segmento`) |
| `rounded-tile` | 16px | Tiles de categoría, bloque de muestras |
| `rounded-hoja` | 24px | Esquinas superiores del bottom sheet (las 4 en desktop) |
| `rounded-full` | 9999px | Barra restante |
| `shadow-hoja` | claro `0 -8px 24px rgb(46 31 39 / 0.16)`; oscuro `none` (usa `border-top: 1px linea`) | Solo el bottom sheet |
| `--duracion-corta` / `--duracion-hoja` | 150ms / 240ms | Indicador del segmentado / entrada del sheet |
| `--ease-salida` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Ambas transiciones |

`@media (prefers-reduced-motion: reduce)`: sin traslado, el sheet aparece con un fade de 0ms y el indicador cambia sin animar. Fuera de esas dos, no hay animaciones (ni entradas de página ni hovers animados).

---

## Componentes

Carpeta `frontend/src/components/ui/`, un archivo por componente, props tipadas, sin colores ni tamaños sueltos (solo utilidades de tokens). Helpers de dinero en `frontend/src/lib/money.ts`.

### Formato de montos: `lib/money.ts` y `<Monto>`
- `formatMonto(value: string)`: recibe el string decimal de la API (`"125430.50"`) y usa `new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).formatToParts(value)` **pasándole el string** (los strings se formatean como decimal exacto, no pasan por float). Devuelve `{ entero: "$ 125.430", centavos: ",50" | null }`. `centavos` es `null` cuando la parte decimal es `,00` (D-07).
- `<Monto value size="monto|cuerpo">`: en `size="monto"` el entero va a 44px y los centavos a 22px, alineados por línea base. En `size="cuerpo"` todo va a 16px. Usa siempre `tabular-nums`.
- `estadoRestante(restante: string, presupuesto: string)`: devuelve `'normal' | 'cerca' | 'pasado'` haciendo la cuenta en centavos con `BigInt` (nunca `Number`/`parseFloat`).
- Test Vitest en `money.test.ts`: `"125430.00"` → sin centavos; `"125430.50"` → `,50`; `"0"`; negativo; los 3 estados y los bordes (20% exacto → `normal`, 0 → `cerca`, -0.01 → `pasado`).

### `Button`
| Prop | Valores |
|------|---------|
| `variant` | `primario` (fondo `acento`, texto `sobre-acento`) · `secundario` (fondo transparente, borde 1px `borde`, texto `tinta`) · `peligro` (fondo transparente, borde 1px `peligro`, texto `peligro`) |
| `loading` | `boolean`: deshabilita el botón, pone `aria-busy="true"` y reemplaza el label por `loadingLabel` |
| `fullWidth` | `boolean` (por defecto `true` dentro de formularios) |

- Alto mínimo 48px, padding horizontal 24px, `rounded-control`, texto 16px/600, sin sombra.
- Hover (solo con `@media (hover: hover)`): primario a `acento-fuerte`, secundario y peligro con fondo `papel-2`. Pressed: igual que hover. Disabled: `opacity-50`, `cursor-not-allowed`.
- Foco: `focus-visible:outline-2 outline-offset-2 outline-acento`.
- Siempre `type="button"` por defecto; `type="submit"` explícito en formularios.

### `AmountInput` (input de monto)
- `<input type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done">` con el teclado nativo (D-10). No se dibuja un teclado propio.
- Visual: "$" a 22px en `tinta-2` + valor a 44px/600 CASL 1 en `tinta`. Fondo `papel-2`, borde 1px `borde`, `rounded-control`, padding 16px, alto mínimo 80px. Placeholder "0" en `tinta-2`.
- Label visible arriba (14px/600): "Monto". Ayuda opcional debajo.
- Entrada: acepta dígitos y **una** coma decimal con hasta 2 decimales. El punto que escribe el usuario se toma como coma (muchos teclados `decimal` en es-AR muestran "," pero algunos Android muestran "."). Cualquier otro carácter se descarta al tipear.
- Formato: mientras está enfocado muestra lo tipeado con separador de miles en vivo (`125.430,5`). Al perder el foco completa a formato final sin `,00` (`125.430` o `125.430,50`).
- `onChange` emite el string normalizado para la API (`"125430.50"`, `"125430"`), o `""` si está vacío. Nunca un `number`.
- Error: borde y texto en `peligro`, `aria-invalid="true"`, mensaje con `aria-describedby` y `role="alert"`, 4px debajo.
- El parser y el formateador viven en `money.ts` y entran en el test: `"1.234,5"`, `"0,99"`, `"12,345"` (corta a 2 decimales), `"abc"` y `"1,2,3"`.

### `SegmentedControl`
- `<fieldset>` con `<legend>` visible (14px/600) y un `<input type="radio">` nativo por opción, oculto visualmente (`sr-only`) dentro de un `<label>` que es el segmento. Las flechas, el Tab y los lectores de pantalla funcionan sin JS propio.
- 2 a 4 opciones, de igual ancho. Track `papel-2`, borde 1px `borde`, `rounded-control`, padding 4px, alto total 48px.
- Seleccionado: fondo `papel`, texto `tinta` a 600 y borde 1px `borde`. No seleccionado: texto `tinta-2` a 400. Es un cambio de contraste y de peso, no solo de color.
- Indicador: transición de `background-color` en 150ms; con reduced motion no anima.
- Foco: anillo `acento` alrededor del segmento enfocado (`has-[:focus-visible]`).
- Muestra: legend "Medio de pago"; opciones "Efectivo", "Débito" y "Crédito"; por defecto, "Débito".

### `CategoryGrid`
- `<fieldset>` + `<legend>` ("Categoría") + un radio nativo por categoría, como en el segmentado. Props: `categorias: { id, emoji, nombre, color: 1..10 }[]`, `value` y `onChange`.
- Grilla de **3 columnas** en mobile y **4** desde `sm:` (640px), con gap de 8px.
- Tile: alto mínimo 80px, `rounded-tile`, fondo `bg-cat-N/15`, borde 1px `borde`, padding 8px, contenido centrado en columna: emoji de 28px arriba y nombre de 14px/600 en `tinta` debajo, como máximo 2 líneas (`line-clamp-2`, nombre completo en `title`).
- Seleccionado: borde 2px `tinta` y "✓" de 14px/600 en la esquina superior derecha. No depende solo del color.
- Pressed: fondo `bg-cat-N/25`. Foco: anillo `acento` con offset de 2px.
- Datos de muestra: 🍔 Comida (1), 🚌 Transporte (6), 🛒 Súper (4), 🏠 Casa (10), 💡 Servicios (3), 💊 Salud (5), 🎉 Salidas (9), 🎁 Regalos (7), 📦 Otros (2).

### `BottomSheet`
- `<dialog>` nativo abierto con `showModal()`: trae focus trap, `Esc` para cerrar, `inert` del fondo y foco que vuelve al disparador al cerrarse. Props: `open`, `onClose`, `title`, `children`.
- Mobile: pegado abajo, ancho completo, `rounded-hoja` solo arriba, `max-height: 85dvh` con scroll interno, padding 24px y padding inferior de `24px + env(safe-area-inset-bottom)`. Desde `sm:`: centrado, `max-width: 480px` y las 4 esquinas redondeadas.
- Fondo `papel`, `shadow-hoja`. Backdrop `::backdrop` con `tinta` al 40% en claro y negro al 60% en oscuro (token `--velo`).
- Header: título de 22px/600 CASL 1 a la izquierda y botón de texto "Cerrar" (44px, `tinta-2`) a la derecha. El título va como `aria-labelledby`.
- Cierre: botón "Cerrar", `Esc` o toque en el backdrop. **No** hay arrastre para cerrar ni handle (no se muestra un handle que no funcione).
- Entrada: `translateY(100%)` → 0 en 240ms con `--ease-salida` (con `@starting-style`). Con reduced motion, sin animación.
- Mientras está abierto se bloquea el scroll del body: `html:has(dialog[open]) { overflow: hidden; }` en el CSS global.

### `RestanteMes` (patrón "cuánto me queda", D-08)
- Props: `restante: string` y `presupuesto: string` (strings decimales). El estado sale de `estadoRestante`.
- Estructura: "Te quedan" (16px, `tinta-2`) → 4px → `<Monto size="monto">` con el color del estado → 8px → barra → 8px → texto de estado (14px).
- Barra: alto 8px, `rounded-full`, track `papel-2`, relleno con el ancho de lo usado (`min(usado/presupuesto, 1)`, calculado en centavos con BigInt y llevado a un porcentaje entero) y el color del estado. `role="meter"` con `aria-valuemin=0`, `aria-valuemax` = presupuesto, `aria-valuenow` = usado y `aria-valuetext` = el texto de estado.
- En estado `pasado`, el label pasa a "Te pasaste" y el monto muestra el valor absoluto del exceso.
- Muestra: normal (restante `80000` de `200000`), cerca (`25000.50` de `200000`) y pasado (`-15000` de `200000`).

---

## Interaction & States

| Elemento | Contrato |
|----------|----------|
| Foco | Visible siempre en todos los controles: outline 2px `acento`, offset 2px. Nunca se quita sin reemplazo. |
| Hover | Solo con `@media (hover: hover)`, para que en el celular no quede pegado. |
| Cargando | El botón deshabilitado muestra `loadingLabel` ("Guardando…"). Los inputs siguen editables. |
| Errores | Debajo del campo, 14px/400 `peligro`, `role="alert"`. El input lleva `aria-invalid`. |
| Claro / oscuro | Sigue `prefers-color-scheme`, sin toggle (D-06). Se prueba cambiando el tema del celular con la página abierta: tiene que cambiar sin recargar. |
| Responsive | Se revisa en 360px, 390px, 768px y 1280px. En ningún ancho hay scroll horizontal. |

### Migración de Phase 1 (en alcance)
Login, recuperar, home y el header de `ProtectedLayout` reemplazan sus clases por defecto de Tailwind (`text-red-600`, `border-zinc-300`, `ring-blue-600`, `bg-blue-600`, `rounded`, `text-2xl`, etc.) por los componentes `Button`, por inputs con los tokens (`bg-papel-2 border-borde rounded-control`, alto 48px, 16px) y por `text-titulo`, `text-peligro` y `text-acento` para los links. El copy de Phase 1 no cambia. Verificación: `grep -rnE "(zinc|blue|red|gray|slate|neutral)-[0-9]|text-(xs|sm|base|lg|xl|[2-9]xl)\b|rounded(-(sm|md|lg|xl))?\b" frontend/src` no devuelve nada (salvo `rounded-full`).

---

## Copywriting Contract

Todo en español rioplatense con voseo y frases cortas (D-03). **Regla de humor (D-04):** el humor va solo en estados vacíos y confirmaciones. Los errores, botones, labels y montos son siempre serios y claros. `DESIGN.md` copia esta tabla de sí/no.

| Element | Copy |
|---------|------|
| Título de página de muestra | Sistema de diseño |
| Bajada | Así se ven los componentes de Control de Gastos. |
| Primary CTA (muestra) | Guardar gasto (cargando: "Guardando…") |
| Botón secundario (muestra) | Elegir categoría |
| Botón peligro (muestra) | Borrar gasto |
| Label input | Monto |
| Legend segmentado | Medio de pago: Efectivo / Débito / Crédito |
| Legend grilla | Categoría |
| Título del sheet de categorías | Elegí una categoría |
| Cerrar sheet | Cerrar |
| Restante normal | Te quedan $ 80.000 · Usaste $ 120.000 de $ 200.000 |
| Restante cerca | Te quedan $ 25.000,50 · ! Te queda poco este mes. Usaste $ 174.999,50 de $ 200.000 |
| Restante pasado | Te pasaste $ 15.000 · Te pasaste $ 15.000. Usaste $ 215.000 de $ 200.000 |
| Empty state heading | Todavía no anotaste nada este mes |
| Empty state body | Cuando cargues tu primer gasto lo vas a ver acá. Por ahora, tu billetera respira tranquila. Botón: "Cargar gasto" |
| Confirmación (humor) | Anotado. Tu billetera llora un poquito. |
| Error de guardado | No pudimos guardar el gasto. Revisá tu conexión y tocá "Reintentar". |
| Validación monto vacío/cero | Ingresá un monto mayor a $ 0. |
| Validación decimales | El monto puede tener hasta 2 decimales. |
| Destructive confirmation | Borrar gasto: bottom sheet con título "¿Borrar este gasto?", cuerpo "Se borra para siempre. No se puede deshacer.", botones "Borrar gasto" (peligro) y "Cancelar" (secundario). En la muestra, "Borrar gasto" solo cierra el sheet: no hay datos. |

Las "·" de la tabla separan dos piezas de copy distintas (label/monto y texto bajo la barra); no se muestran en la UI.

Ejemplos de voz para `DESIGN.md`:

| Sí | No | Por qué |
|----|----|---------|
| "Ingresá un monto mayor a $ 0." | "¡Ups! Parece que te olvidaste el monto 😅" | Los errores son claros, sin chiste |
| "Guardar gasto" | "¡Dale, anotalo!" | Los botones dicen lo que hacen |
| "Anotado. Tu billetera llora un poquito." | "Gasto creado exitosamente." | En las confirmaciones va la personalidad |
| "Te quedan $ 80.000" | "Saldo disponible: ARS 80000.00" | Voseo, formato es-AR, sin `,00` |

---

## Entregables de documentación

`DESIGN.md` (raíz del repo), en este orden: dirección y porqué (incluida la revisión contra los defaults), paleta clara y oscura con el contraste medido, paleta de categorías, tipografía (Recursive, ejes, escala, regla de CASL), espaciado, radios, sombra y movimiento, componentes (cuándo usar cada uno y sus props), estados del presupuesto, regla de voz con la tabla de sí/no, y la regla "solo tokens: el `@theme` resetea los defaults".

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| none | — | not applicable (shadcn no inicializado) |

Dependencia nueva única: `@fontsource-variable/recursive` (paquete de fuentes de Fontsource, CSS + woff2, sin JS en runtime; v5.3.0 en npm al 2026-10-30).

---

## Checker Sign-Off
- [x] Dimension 1 Copywriting: FLAG (non-blocking: "Cancelar", "Cerrar")
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-10-30
