# Diseño de Control de Gastos

Documento persistente del sistema de diseño. Los valores viven en `frontend/src/styles/tokens.css`; este archivo explica qué son y por qué.

## Dirección y porqué

**"La libreta del almacén".** La libreta de tapa blanda donde se anota lo que se gastó: papel con un toque durazno, tinta ciruela y números escritos a mano con soltura. Cálida y personal, sin cara de banco ni de template genérico (D-01).

- **Para quién y para qué:** una sola persona, desde el celular y con una mano. El trabajo principal es anotar un monto en segundos y ver cuánto queda en el mes.
- **Lo memorable, en un solo lugar:** el monto grande en Recursive con el eje Casual al máximo, que se ve escrito con birome. Todo lo demás es tranquilo: texto en Recursive Linear, sin gradientes, sin sombras salvo en el bottom sheet, sin tarjetas por todos lados.
- **Alineación:** todo a la izquierda. El monto del input va pegado al "$", no centrado.

La dirección se propuso con la skill `frontend-design` (D-02): brief, plan de tokens, revisión contra los defaults de la skill y ajuste. Revisión contra los defaults (qué se cambió y por qué):

1. El primer borrador era fondo crema, título serif y acento terracota: es el default nº 1 de la skill. Se cambió el acento a **ciruela** y el título serif por **Recursive Casual** (sans).
2. En vez de un rojo frambuesa como acento se eligió ciruela, porque el rojo tiene que quedar libre para "te pasaste" (D-09).
3. Se descartaron el kit de tarjetas SaaS (cajas iguales con la misma sombra), los títulos chicos en mayúsculas encima de cada sección, los "→" en los botones, la monoespaciada para datos y el negro teñido `#111`. El modo oscuro usa un ciruela muy oscuro (`#221A1F`), no gris.
4. Los radios cambian según la jerarquía (12 / 16 / 24) en vez de usar uno solo para todo.

## Paleta clara y oscura

Sigue `prefers-color-scheme` del sistema, sin selector en la app (D-05, D-06). Contraste WCAG medido sobre los hex de `tokens.css` (2026-10-30).

| Rol | Token | Claro | Oscuro | Contraste claro | Contraste oscuro |
|-----|-------|-------|--------|-----------------|------------------|
| Fondo (60%) | `papel` | `#FFF6EF` | `#221A1F` | — | — |
| Fondo secundario (30%) | `papel-2` | `#F6E9DE` | `#2F242B` | — | — |
| Divisor decorativo | `linea` | `#EAD9CB` | `#3D3038` | decorativo, sin mínimo | decorativo, sin mínimo |
| Borde de control | `borde` | `#98818C` | `#8A7681` | 3,36 sobre papel · 3,01 sobre papel-2 | 4,04 · 3,54 |
| Texto | `tinta` | `#2E1F27` | `#F6EAE2` | 14,67 sobre papel · 13,14 sobre papel-2 | 14,40 · 12,63 |
| Texto secundario | `tinta-2` | `#6E5A63` | `#C8B4BC` | 5,95 · 5,33 | 8,67 · 7,61 |
| Acento (10%) | `acento` | `#7A2E63` | `#E8A3CF` | 8,21 sobre papel | 8,56 |
| Acento hover/pressed | `acento-fuerte` | `#64224F` | `#F2BBDD` | — | — |
| Texto sobre acento | `sobre-acento` | `#FFFFFF` | `#221A1F` | 8,76 sobre acento | 8,56 |
| Alerta | `alerta` | `#9A5B00` | `#F2B54A` | 5,08 | 9,29 |
| Peligro | `peligro` | `#B3261E` | `#FF8A7A` | 6,13 | 7,42 |
| Velo del sheet | `velo` | tinta al 40% | negro al 60% | — | — |

Mínimos: texto ≥ 4,5:1; bordes de control ≥ 3:1 (WCAG 1.4.11).

**Ajuste:** `borde` claro pasó de `#9C8590` (2,86:1 sobre `papel-2`, no llegaba a 3:1) a `#98818C` (3,01:1). Es el cambio mínimo que pasa.

El acento se reserva para: fondo del botón primario, anillo de foco, relleno de la barra restante en estado normal y links de texto. La selección (segmento, tile de categoría) se marca con tinta, borde y ✓, no con acento.

## Paleta de categorías

10 colores (D-12). Sólidos para gráficos (≥ 3:1 contra `papel`); en los tiles van como fondo tenue `bg-cat-N/15` con texto siempre en `tinta` (≥ 4,5:1).

| Token | Nombre | Claro | Oscuro | Sólido vs papel (claro / oscuro) | tinta sobre /15 (claro / oscuro) |
|-------|--------|-------|--------|----------------------------------|----------------------------------|
| `cat-1` | Tomate | `#C2412D` | `#F08A73` | 4,81 / 6,95 | 11,91 / 11,07 |
| `cat-2` | Mandarina | `#B85A06` | `#F2A25C` | 4,37 / 8,17 | 12,13 / 10,80 |
| `cat-3` | Mostaza | `#8F6A00` | `#E2C25A` | 4,65 / 9,79 | 12,13 / 10,37 |
| `cat-4` | Oliva | `#6A7419` | `#B8C46A` | 4,77 / 9,02 | 12,19 / 10,47 |
| `cat-5` | Eucalipto | `#2F7A6B` | `#6FC2AE` | 4,78 / 8,10 | 12,06 / 10,85 |
| `cat-6` | Pizarra | `#4F6B8A` | `#95B0D0` | 5,18 / 7,61 | 12,06 / 10,84 |
| `cat-7` | Lavanda | `#6B5BB5` | `#A99CF0` | 5,19 / 7,04 | 12,05 / 11,00 |
| `cat-8` | Uva | `#7E3FA0` | `#C594E8` | 6,34 / 7,10 | 11,78 / 11,06 |
| `cat-9` | Rosa | `#C23A6E` | `#F28DB2` | 4,77 / 7,47 | 11,91 / 10,97 |
| `cat-10` | Canela | `#8A5A3C` | `#D6A07E` | 5,45 / 7,44 | 12,01 / 10,93 |

Ninguno necesitó ajuste. El /15 se midió aproximando el `color-mix` en sRGB.

**Fallback en iOS < 16.2:** Tailwind 4 genera la opacidad (`bg-cat-3/15`) con `color-mix()` dentro de `@supports`, y afuera deja un fallback **sólido** `background-color: var(--cat-N)`. En navegadores sin `color-mix` el texto `tinta` queda sobre el color sólido y no llega a 4,5:1 (medido: 2,3–3,4 en claro, 1,5–2,1 en oscuro). Se acepta porque el target es un celular actual; si alguna vez importa, el arreglo es un token tenue precalculado por categoría.

## Tipografía

Familia única: **Recursive Variable**, self-hosted con `@fontsource-variable/recursive` (import `full.css`, que trae los ejes `wght`, `CASL`, `MONO`, `slnt` y `CRSV`). Sin CDN; los woff2 salen en `dist/assets`. Fallback: `system-ui, sans-serif`.

| Rol | Utilidad | Tamaño | Peso | Interlineado | CASL |
|-----|----------|--------|------|--------------|------|
| Cuerpo | `text-cuerpo` | 16px | 400 | 1,5 | 0 |
| Etiqueta | `text-etiqueta` | 14px | 600 (errores y ayudas en 400 con `font-normal`) | 1,4 | 0 |
| Título | `text-titulo` + `font-casual` | 22px | 600 | 1,2 | 1 |
| Monto | `text-monto` + `font-casual` | 44px | 600 | 1,0 | 1 |

- Solo 4 tamaños y 2 pesos (400 y 600). El emoji de categoría va a 28px como ícono (excepción declarada): token `text-emoji` (1,75rem, interlineado 1), solo para el emoji del tile de categoría.
- `font-casual` (CASL 1) solo en título y monto: es el único lugar donde se gasta la personalidad. MONO siempre en 0.
- `font-variant-numeric: tabular-nums` global en `html`, para que los montos no bailen (también con la fuente de fallback).
- Inputs siempre a ≥ 16px para que iOS no haga zoom.
- Sin mayúsculas sostenidas ni tracking extra. Todo en sentence case.

## Espaciado

Se usa el `--spacing` por defecto de Tailwind (0,25rem), con solo estos pasos:

| Token | Valor | Uso |
|-------|-------|-----|
| xs | 4px | Label "Te quedan" ↔ monto; error ↔ input; "$" ↔ cifra |
| sm | 8px | Label ↔ input; gap de la grilla; monto ↔ barra; barra ↔ texto "Usaste…" |
| md | 16px | Padding de página (mobile), padding interno de tiles e inputs, entre campos |
| lg | 24px | Padding del bottom sheet; padding de página desde `sm:`; antes del botón principal |
| xl | 32px | Título de página ↔ primera sección |
| 2xl | 48px | Entre secciones de la página de muestra |
| 3xl | 64px | Margen inferior de la página de muestra |

Excepciones:
- Targets táctiles: botones, segmentos e inputs de 48px mínimo (`min-h-12`). Botón "Cerrar" del sheet y links: 44px (`min-h-11`). Tiles de categoría: 80px.
- Barra restante: 8px de alto. Borde de controles: 1px. Borde de selección y anillo de foco: 2px con offset de 2px.
- Layout: columna única de 480px máximo, centrada en tablet y desktop.

## Radios, sombra y movimiento

| Token | Valor | Uso |
|-------|-------|-----|
| `rounded-segmento` | 8px | Segmento interno del control segmentado |
| `rounded-control` | 12px | Botones, inputs, control segmentado |
| `rounded-tile` | 16px | Tiles de categoría, bloque de muestras |
| `rounded-hoja` | 24px | Esquinas superiores del bottom sheet (las 4 en desktop) |
| `rounded-full` | 9999px | Barra restante |
| `shadow-hoja` | claro `0 -8px 24px` tinta al 16%; oscuro `none` (usa borde superior `linea`) | Solo el bottom sheet |
| `--duracion-corta` | 150ms | Indicador del segmentado |
| `--duracion-hoja` | 240ms | Entrada del sheet |
| `--ease-salida` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Ambas transiciones |

Con `prefers-reduced-motion: reduce` no hay traslado ni animación. Fuera de esas dos transiciones no hay animaciones (ni entradas de página ni hovers animados).

## Componentes

Carpeta `frontend/src/components/ui/`, un archivo por componente, solo utilidades de tokens.

### `Button`

```tsx
<Button variant="primario" type="submit" fullWidth loading={enviando} loadingLabel="Guardando…">Guardar gasto</Button>
```

| Prop | Valores | Por defecto |
|------|---------|-------------|
| `variant` | `primario` · `secundario` · `peligro` | `primario` |
| `loading` | `boolean`: deshabilita, pone `aria-busy` y muestra `loadingLabel` | `false` |
| `loadingLabel` | texto durante la carga (si falta, se mantiene el label) | — |
| `fullWidth` | `boolean`: ancho completo (usar en formularios) | `false` |
| resto | cualquier prop de `<button>`; `type` es `button` salvo que se pase `submit` | `type="button"` |

Cuándo usar cada variante:
- **primario:** la acción principal de la pantalla, una sola por vista ("Ingresar", "Guardar gasto").
- **secundario:** acciones de apoyo ("Cerrar sesión", "Reintentar", "Elegir categoría").
- **peligro:** acciones destructivas ("Borrar gasto"), siempre con confirmación.

Alto mínimo 48px, padding horizontal 24px, `rounded-control`, 16px/600, sin sombra. Foco: outline 2px `acento` con offset 2px.

### Montos: regla general

Los montos viajan siempre como **string** (así los serializa Pydantic desde `Decimal`), nunca como `number`. La lógica vive en `frontend/src/lib/money.ts`: el formateo le pasa el string a `Intl.NumberFormat('es-AR')` y las cuentas (usado, exceso, porcentaje, estado) se hacen en `BigInt` de centavos con `aCentavos` / `deCentavos`. Prohibido `parseFloat`, `toFixed` y `Number(` sobre montos (el único `Number(` es el porcentaje 0..100 ya calculado en BigInt).

### `Monto`

```tsx
<Monto value="125430.50" size="monto" className="text-tinta" />
```

| Prop | Valores | Por defecto |
|------|---------|-------------|
| `value` | string decimal (`'125430.50'`, `'-15000'`) | — |
| `size` | `monto` (cifra grande, centavos en `text-titulo`) · `cuerpo` (todo 16px) | `cuerpo` |
| `className` | color del monto (va en el contenedor) | — |

Formato es-AR sin `,00`: `$ 125.430`, `$ 125.430,50`, `$ 0`. Un string inválido se ve como `—` (nunca "$ NaN"). Usar en todo lugar donde se muestre plata.

### `RestanteMes`

```tsx
<RestanteMes restante="25000.50" presupuesto="200000" />
```

Patrón "cuánto me queda": label "Te quedan" (o "Te pasaste"), monto grande, barra de usado y texto de estado. Recibe los dos montos como string y calcula el estado con `estadoRestante` y el ancho con `porcentajeUsado` (ver "Estados del presupuesto"). La barra es `role="meter"` con `aria-valuetext` igual al texto de estado.

**Excepción a "sin style inline":** el relleno de la barra usa `style={{ '--usado': '60%' }}` con la clase `w-(--usado)`, porque el ancho es un dato de runtime. Es la única; el grep G2 la excluye buscando `--usado`.

### `AmountInput`

```tsx
<AmountInput value={monto} onChange={setMonto} error={errores.monto} help="Usá coma para los centavos." />
```

| Prop | Valores | Por defecto |
|------|---------|-------------|
| `value` | string normalizado (`'1234.5'`, `''`) | — |
| `onChange` | recibe el string normalizado, nunca un `number` | — |
| `label` | texto del label | `Monto` |
| `error` | mensaje (`MONTO_VACIO`, `MONTO_DECIMALES`); pone `aria-invalid` y `role="alert"` | — |
| `help` | ayuda bajo el campo cuando no hay error | — |

`type="text"` + `inputMode="decimal"`: abre el teclado numérico nativo y permite mostrar los miles en vivo (`1.234,5`). Los separadores de miles los pone la app; el usuario solo tipea dígitos y una coma, con hasta 2 decimales. Al salir del campo se completa a `1.234,50`.

**Decisión del punto:** un `.` tipeado al final se toma como coma decimal (hay teclados que solo traen punto), así que tipear `1.500` queda `1,50`, no mil quinientos. La vista en vivo lo hace evidente apenas se tipea el punto (`1,`). Un `.` en medio del texto se descarta.

### Selección: por qué HTML nativo

`SegmentedControl` y `CategoryGrid` son radios nativos (`<fieldset>` + `<legend>` + `<input type="radio" class="sr-only">` dentro de un `<label>`), y `BottomSheet` es un `<dialog>` con `showModal()`. Así el teclado (Tab entra al grupo, flechas cambian la opción), el foco y los lectores de pantalla vienen del navegador, sin JS propio. El estilo de seleccionado y de foco se cuelga del label con `has-[:checked]:` y `has-[:focus-visible]:`. El `name` de cada grupo sale de `useId()`, así dos instancias no se pisan. El label lleva `relative` para que el `sr-only` (absolute) no genere scroll horizontal.

### `SegmentedControl`

```tsx
<SegmentedControl legend="Medio de pago" options={[{ value: 'debito', label: 'Débito' }]} value={medio} onChange={setMedio} />
```

| Prop | Valores |
|------|---------|
| `legend` | texto visible del grupo |
| `options` | `{ value, label }[]` (2 a 4 opciones cortas) |
| `value` / `onChange` | valor elegido; `onChange` recibe el `value` |

Para elegir una entre pocas opciones excluyentes (Efectivo / Débito / Crédito). Track `bg-papel-2` con borde, alto 48px; el segmento elegido pasa a `bg-papel`, borde y 600 en `tinta`, así la selección se ve por contraste y peso, no solo por color. Transición de color de `--duracion-corta`, apagada con `motion-reduce`.

### `CategoryGrid`

```tsx
<CategoryGrid categorias={categorias} value={categoriaId} onChange={setCategoriaId} />
```

| Prop | Valores | Por defecto |
|------|---------|-------------|
| `categorias` | `Categoria[]`: `{ id, emoji, nombre, color: ColorCategoria }` (color 1..10) | — |
| `value` | id elegido o `null` | — |
| `onChange` | recibe el id | — |
| `legend` | texto del grupo | `Categoría` |

Grilla de 3 columnas (4 desde 640px), tiles de 80px con emoji (`text-emoji`, `aria-hidden`) y nombre (`line-clamp-2`, el nombre completo en `title`). Fondo `bg-cat-N/15` y `active:bg-cat-N/25`. La elegida tiene borde 2px `tinta` y un ✓ arriba a la derecha (D-11): no depende solo del color.

**Mapa literal de colores:** las clases van escritas enteras en un `Record<ColorCategoria, string>` (`'bg-cat-1/15 active:bg-cat-1/25'` … `'bg-cat-10/15 …'`). Tailwind solo genera las clases que encuentra completas en el código, así que está prohibido armarlas con template literal sobre el número (`bg-cat-${n}`). Lo mismo para las muestras sólidas de `/muestra`.

### `BottomSheet`

```tsx
<BottomSheet open={abierta} onClose={() => setAbierta(false)} title="¿Borrar este gasto?">…</BottomSheet>
```

| Prop | Valores |
|------|---------|
| `open` | controla la hoja; un `useEffect` llama a `showModal()` / `close()` |
| `onClose` | se llama al cerrar por cualquier vía |
| `title` | título visible; es el `aria-labelledby` del dialog |
| `children` | contenido |

Para elegir algo sin salir de la pantalla (categorías) y para confirmar acciones destructivas ("¿Borrar este gasto?" con "Borrar gasto" en `peligro` y "Cancelar" en `secundario`). En el celular se pega abajo con esquinas superiores `rounded-hoja`; desde 640px queda centrada, de 480px y con las 4 esquinas redondeadas. Alto máximo 85dvh con scroll interno y padding inferior que respeta `safe-area-inset-bottom`.

- **Cierre:** botón "Cerrar", Esc (evento `close` nativo) o toque en el fondo (`e.target === e.currentTarget`; el contenido va en un div interno para que el clic adentro no cuente). No se usa `closedby` (soporte desparejo). Sin handle ni arrastre. El foco vuelve al botón que la abrió.
- **Scroll lock:** `html:has(dialog[open]) { overflow: hidden }` en `index.css`; depende solo de que haya un dialog abierto, así que se libera solo al cerrar.
- **Movimiento:** entra desde abajo con `@keyframes hoja-entra` (`--duracion-hoja`, `--ease-salida`), solo dentro de `prefers-reduced-motion: no-preference`. Keyframes en vez de `@starting-style` por soporte en Safari.
- **Sombra:** `shadow-hoja` en claro; en oscuro la sombra es `none` y se ve el borde superior `linea`.

## Estados del presupuesto

Lo calcula `estadoRestante` en `frontend/src/lib/money.ts` con `UMBRAL_CERCA = 20` (porcentaje del presupuesto). El umbral no es CSS: vive solo en esa constante.

| Estado | Condición | Monto | Barra | Texto bajo la barra |
|--------|-----------|-------|-------|---------------------|
| `normal` | restante ≥ 20% del presupuesto | `tinta` | `acento` | "Usaste $ X de $ Y" en `tinta-2` |
| `cerca` | 0 ≤ restante < 20% | `alerta` | `alerta` | "! Te queda poco este mes. Usaste $ X de $ Y" en `alerta` |
| `pasado` | restante < 0 | `peligro` | `peligro`, llena al 100% | "Te pasaste $ Z. Usaste $ X de $ Y" en `peligro` |

- Restante exactamente 0 es `cerca` ("Te quedan $ 0").
- En `pasado` el label cambia a "Te pasaste" y el monto muestra el valor absoluto del exceso.
- El estado siempre va con texto, nunca solo por color (D-09): el "!" y las frases cambian aunque no se vean los colores.

## Voz

Español rioplatense con voseo y frases cortas (D-03). **El humor va solo en estados vacíos y confirmaciones (D-04).** Errores, botones, labels y montos son siempre serios y claros. Los errores dicen qué pasó y cómo seguir, sin disculparse.

| Sí | No | Por qué |
|----|----|---------|
| "Ingresá un monto mayor a $ 0." | "¡Ups! Parece que te olvidaste el monto 😅" | Los errores son claros, sin chiste |
| "Guardar gasto" | "¡Dale, anotalo!" | Los botones dicen lo que hacen |
| "Anotado. Tu billetera llora un poquito." | "Gasto creado exitosamente." | En las confirmaciones va la personalidad |
| "Te quedan $ 80.000" | "Saldo disponible: ARS 80000.00" | Voseo, formato es-AR, sin `,00` |

## Solo tokens

`tokens.css` es la única fuente de hex y rgb del frontend. Su `@theme` resetea los defaults de Tailwind (`--color-*`, `--text-*`, `--radius-*`, `--shadow-*`, `--font-*: initial`), así que una clase como `text-red-600`, `rounded-lg` o `bg-blue-600` **no genera CSS**. Los componentes usan solo los nombres semánticos (`bg-papel`, `text-tinta`, `rounded-control`, `text-etiqueta`…).

Chequeos (desde la raíz; los tres tienen que imprimir vacío):

```bash
# G1: clases de paleta/tamaño/radio/sombra por defecto
grep -rnE "\b(zinc|blue|red|gray|slate|neutral|stone|white|black|amber|green)-[0-9]+|\btext-(xs|sm|base|lg|xl|[2-9]xl)\b|\brounded(-(xs|sm|md|lg|xl|[2-4]xl))?([\"' ]|$)|\bshadow(-(xs|sm|md|lg|xl|2xl))?([\"' ]|$)" frontend/src --include=*.tsx
# G2: valores arbitrarios, hex, rgb e inline style (excepción: la barra de RestanteMes con --usado)
grep -rnE "\[#|#[0-9a-fA-F]{3,8}\b|\[[0-9.]+(px|rem|em)\]|rgb\(|style=\{\{" frontend/src --include=*.tsx | grep -v -- "--usado"
# G3: hex/rgb en CSS fuera de tokens.css
grep -rnE "#[0-9a-fA-F]{3,8}\b|rgb\(" frontend/src --include=*.css | grep -v "styles/tokens.css"
```

Para agregar un color, tamaño o radio: sumarlo en `tokens.css` (claro y oscuro), medir el contraste y documentarlo acá.
