---
phase: 3
slug: categor-as-y-carga-r-pida-de-gastos
status: approved
reviewed_at: 2026-10-31
shadcn_initialized: false
preset: none
created: 2026-10-31
---

# Phase 3 — UI Design Contract

> Contrato visual y de interacción para la fase. Lo genera gsd-ui-researcher y lo verifica gsd-ui-checker.

**Alcance:** pantalla `/gasto/nuevo`, pantalla `/categorias`, sheet de crear/editar categoría, tile "＋ Nueva" en `CategoryGrid`, toast de confirmación, botón flotante "+" en `ProtectedLayout` y link a `/categorias` en el home.

**Regla base:** esta fase **no agrega tokens**. Todo sale de `frontend/src/styles/tokens.css` y de los componentes de `frontend/src/components/ui/`, tal como los documenta `DESIGN.md` (fuente de verdad, por encima de los hex viejos de `02-UI-SPEC.md`). Los chequeos G1, G2 y G3 de `DESIGN.md` tienen que seguir imprimiendo vacío.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (gate de shadcn resuelto en la Fase 2: no se inicializa) |
| Preset | not applicable |
| Component library | none: componentes propios en `frontend/src/components/ui/` sobre HTML nativo (`dialog`, radios) |
| Icon library | none. Glifos de texto: "+" (FAB), "＋" (tile Nueva), "✓" (selección), "!" (alerta). Emoji para categorías. |
| Font | Recursive Variable (`@fontsource-variable/recursive`), ya instalada |
| Tokens | `frontend/src/styles/tokens.css` (sin cambios en esta fase) |

---

## Spacing Scale

Misma escala que `DESIGN.md`:

| Token | Value | Usage en esta fase |
|-------|-------|-------|
| xs | 4px | Error ↔ campo; gap de la grilla de emojis |
| sm | 8px | Label/legend ↔ control; gap de la grilla de categorías; gap de Hoy/Ayer/fecha; gap de la grilla de colores; margen superior del toast |
| md | 16px | Padding de página (mobile); entre campos del formulario; entre secciones del sheet; gap emoji ↔ nombre en filas de `/categorias`; offset del FAB desde los bordes |
| lg | 24px | Padding del sheet; padding de página desde `sm:`; antes de "Guardar gasto" / "Guardar categoría"; título ↔ "Nueva categoría" |
| xl | 32px | Título de página ↔ primer campo / lista |
| 2xl | 48px | no se usa |
| 3xl | 64px | no se usa |

Exceptions (todas múltiplos de 4):
- Heredadas: botones, inputs y segmentos 48px mínimo (`min-h-12`); links y "Cerrar" 44px (`min-h-11`); tiles de categoría 80px (`min-h-20`); bordes 1px; selección y foco 2px con offset 2px.
- FAB: 56px × 56px (`size-14`).
- Celda de emoji en el sheet: 48px × 48px.
- Muestra de color en el sheet: celda de 48px con círculo sólido de 40px (`size-10`).
- Fila de `/categorias`: alto mínimo 56px (`min-h-14`); cuadro del emoji 40px (`size-10`).
- Padding inferior de páginas con FAB (home y `/categorias`): 96px (`pb-24`) para que el FAB no tape el último elemento. `/gasto/nuevo`: 32px (`pb-8`).
- Layout: columna única `max-w-120` (480px) centrada, como `/muestra`. Se usa en `/gasto/nuevo` y `/categorias`.

---

## Typography

Sin cambios: 4 tamaños, 2 pesos (400 y 600).

| Role | Token | Size | Weight | Line Height | Uso en esta fase |
|------|-------|------|--------|-------------|-----|
| Body | `text-cuerpo` | 16px | 400 (600 en botones y en la 1ª línea del toast) | 1.5 | Inputs (descripción, nombre, emoji libre, fecha), nombre en filas de `/categorias`, botones, 1ª línea del toast |
| Label | `text-etiqueta` | 14px | 600 (400 en errores, ayudas, "Editar" y 2ª línea del toast) | 1.4 | Labels y legends, nombre en tiles, errores, 2ª línea del toast |
| Heading | `text-titulo` + `font-casual` | 22px | 600 | 1.2 | Títulos "Nuevo gasto", "Categorías", títulos de sheet; "+" del FAB |
| Display | `text-monto` + `font-casual` | 44px | 600 | 1.0 | Solo el valor del `AmountInput` |

- Excepción heredada: `text-emoji` (28px) para emoji en tiles, celdas de la grilla de emojis, cuadro de emoji en filas de `/categorias` y el "＋" del tile Nueva.
- El monto del toast va con `<Monto size="cuerpo">` (16px), no en display.

---

## Color

Mismos tokens que `DESIGN.md` (paleta del usuario del 2026-10-31).

| Role | Token | Claro / Oscuro | Usage |
|------|-------|-------|-------|
| Dominant (60%) | `papel` | `#F1FAEE` / `#14233A` | Fondo de página y del sheet |
| Secondary (30%) | `papel-2` | `#E1F1EE` / `#1D3557` | Header, inputs, track del segmentado, celda de emoji elegida |
| Accent (10%) | `acento` | `#407597` / `#A8DADC` | Ver lista reservada |
| Destructive | `peligro` | `#C62D3A` / `#FF7A84` | Solo errores de validación y de red en esta fase (no hay acciones destructivas) |
| Texto | `tinta` / `tinta-2` | ver DESIGN.md | Texto; `tinta` también es el fondo del toast |
| Categorías | `cat-1..cat-10` | ver DESIGN.md | `/15` en tiles y cuadros de emoji; **sólido** solo en las muestras del selector de color |

Accent reserved for:
1. Fondo del botón primario ("Guardar gasto", "Guardar categoría").
2. Fondo del FAB "+" (texto `sobre-acento`). Es el CTA primario de las pantallas logueadas; extensión del punto 1.
3. Anillo de foco de todos los controles.
4. Links de texto: "Volver", "Editar categorías" en el home.

Nada más. La selección (tile de categoría, celda de emoji, muestra de color, segmento, Hoy/Ayer) se marca con `tinta`, borde 2px y/o "✓", nunca con acento.

**Toast:** fondo `tinta`, texto `papel` (11,56:1 en claro, 14,76:1 en oscuro: el par se invierte y sigue pasando). Sin sombra (regla de DESIGN.md); el contraste invertido alcanza para separarlo del fondo.

**Colores de las categorías base (D-09)**, en orden alfabético con "Otros" al final; en la grilla de 3 columnas ninguna vecina comparte familia:

| Categoría | Emoji | Color |
|-----------|-------|-------|
| Comida | 🍔 | `cat-1` Tomate |
| Deporte | ⚽ | `cat-5` Eucalipto |
| Ropa | 👕 | `cat-3` Mostaza |
| Salidas | 🎉 | `cat-7` Lavanda |
| Suscripciones | 📺 | `cat-2` Mandarina |
| Transporte | 🚌 | `cat-6` Pizarra |
| Otros | 📦 | `cat-10` Canela |

---

## Pantallas y componentes

### Botón flotante "+" (`ProtectedLayout`, D-02)
- `<Link to="/gasto/nuevo" aria-label="Cargar gasto">`, `fixed`, 16px de la derecha y `16px + env(safe-area-inset-bottom)` de abajo. Dentro de la columna de 480px en desktop: anclado al viewport es aceptable (shortcut; mover a la columna solo si en desktop molesta).
- 56px, `rounded-full`, `bg-acento text-sobre-acento`, "+" en `text-titulo font-casual`, centrado. Hover (`@media (hover: hover)`) y pressed: `bg-acento-fuerte`. Foco: anillo `acento` 2px offset 2px. Sin sombra.
- Visible en todas las rutas logueadas **excepto** `/gasto/nuevo` (`useMatch`).

### `/gasto/nuevo` (D-01, D-03..D-05, D-17..D-21)

```
┌ header (app) ─────────────────┐
│ Volver                        │  link 44px, acento
│ Nuevo gasto                   │  22px CASL
│                               │  32px
│ Monto                         │
│ ┌───────────────────────────┐ │
│ │ $ 1.234,5                 │ │  AmountInput, autofocus
│ └───────────────────────────┘ │  16px
│ Categoría                     │
│ [🍔 Comida][⚽ Deporte][👕 Ropa]│
│ [🎉 Salid.][📺 Suscr.][🚌 Tran.]│
│ [📦 Otros ][ ＋ Nueva ]        │
│ Descripción (opcional)        │
│ [Ej.: almuerzo con el equipo] │
│ Medio de pago                 │
│ [Débito/Transferencia|Efectivo]│
│ Fecha                         │
│ [Hoy][Ayer][ 31/10/2026  📅 ] │
│                               │  24px
│ [       Guardar gasto       ] │  primario, fullWidth
└───────────────────────────────┘
```

- `<form noValidate>` con `<main className="mx-auto max-w-120 px-4 pb-8 sm:px-6">`. Arriba: link "Volver" a `/` (necesario en desktop y en la PWA instalada sin botón atrás), luego `<h1>` "Nuevo gasto", 32px, campos con 16px entre sí, 24px antes del botón.
- **Monto:** `AmountInput` con `autoFocus` (agregar el passthrough). Se resetea remontándolo con `key` después de guardar.
- **Categoría:** `CategoryGrid` ordenada (alfabético `localeCompare('es')`, "Otros" al final, por `is_fallback`) + tile "＋ Nueva" al final.
  - Cargando: en lugar de la grilla, texto "Cargando categorías…" (14px/400 `tinta-2`), con la legend visible.
  - Error: `NETWORK_ERROR` en `peligro` con `role="alert"` + `Button secundario` "Reintentar".
- **Tile "＋ Nueva":** `<button type="button" aria-label="Nueva categoría">` dentro del mismo `div` de la grilla pero fuera de los radios. Mismo tamaño que un tile (80px, `rounded-tile`, padding 8px), fondo transparente, borde 1px `border-dashed border-borde`, "＋" en `text-emoji text-tinta-2` y "Nueva" en `text-etiqueta text-tinta`. Pressed: `bg-papel-2`. Abre el sheet de crear categoría. Prop nueva en `CategoryGrid`: `onNueva?: () => void` (si no se pasa, no hay tile).
- **Descripción:** label "Descripción (opcional)", `<input type="text" maxLength={140} autoComplete="off" enterKeyHint="done">`, placeholder "Ej.: almuerzo con el equipo" en `tinta-2`. Estilo de input estándar: `min-h-12 rounded-control border border-borde bg-papel-2 px-4 text-cuerpo`. Sin contador: `maxLength` corta.
- **Medio de pago:** `SegmentedControl` legend "Medio de pago", opciones `Débito/​Transferencia` (valor `debit`) y `Efectivo` (`cash`). El `​` permite el corte después de la barra; el label del segmento agrega `text-center` para que el corte a 2 líneas quede centrado (en la Fase 4, con 3 opciones, va a cortar en 360px). Preseleccionado: último medio del servidor, o `debit` sin gastos (D-19). Crédito no se muestra (D-20).
- **Fecha:** `<fieldset>` legend "Fecha". Fila con gap 8px: botón "Hoy", botón "Ayer" y `<input type="date" aria-label="Otra fecha">` que ocupa el resto (`flex-1`). Hoy/Ayer: `Button secundario` con `aria-pressed` cuando la fecha coincide; pressed = borde 2px `tinta` + 600 (misma regla de selección que tiles). Input con el estilo estándar. Default: hoy en ART. Sin `min`/`max` (D-21).
- **Guardar:** `<Button variant="primario" type="submit" fullWidth loading loadingLabel="Guardando…">Guardar gasto</Button>`, siempre activo (D-05).
- **Validación al enviar** (solo al tocar Guardar; después, cada error se limpia cuando ese campo cambia): errores 14px/400 `peligro`, 4px debajo, `role="alert"`, `aria-invalid` en el control. El foco va al **primer** campo con error.
- **Después de guardar (D-18):** se vacían monto, categoría y descripción; medio y fecha se conservan; el foco vuelve al monto; se muestra el toast. Nuevo UUID de borrador.
- **Error de red al guardar:** mensaje encima del botón (14px/400 `peligro`, `role="alert"`), los datos quedan como estaban y el mismo UUID se reusa al reintentar (sin duplicar).

### Toast de confirmación (D-17)
- Región `<div role="status" aria-live="polite" aria-atomic="true">` **siempre montada** en la página; cambia el texto. Vacía = no se ve nada.
- Posición: `fixed`, arriba, `top: 8px + env(safe-area-inset-top)`, centrada, ancho `calc(100% - 32px)` hasta `max-w-120 - 32px` (usar `inset-x-4 mx-auto max-w-112`). `pointer-events-none`: nunca bloquea toques (tapa el header 3 s, sin consecuencias).
- Caja: `bg-tinta text-papel rounded-control px-4 py-2`, sin sombra, sin botón de cerrar.
- Contenido, 2 líneas: (1) "Anotado: " + `<Monto size="cuerpo">` + " en {emoji} {nombre}" a 16px/600; (2) frase de humor a 14px/400.
- Duración 3000ms; cada guardado nuevo reemplaza el texto y reinicia el timer. Sin animación de entrada/salida (DESIGN.md: solo hay dos transiciones en el sistema); aparece y desaparece.

### `/categorias` (D-08, D-11, D-14, D-16)

```
│ Volver                        │
│ Categorías                    │  22px CASL
│                               │  24px
│ [      Nueva categoría      ] │  secundario, fullWidth
│                               │  32px
│ [🍔] Comida            Editar │  fila 56px
│ ───────────────────────────── │  linea
│ [⚽] Deporte           Editar │
│ …                             │
│ [📦] Otros             Editar │
│                         (+)   │  FAB
```

- Mismo `main` que el formulario, con `pb-24`. Link "Volver" a `/`, `<h1>` "Categorías".
- Botón **secundario** "Nueva categoría" (el FAB ya es el acento de la pantalla; un primario más competiría). Abre el sheet de crear.
- Lista `<ul>`; cada fila es un `<button type="button">` de ancho completo, `min-h-14`, padding vertical 8px, gap 16px, `border-b border-linea`: cuadro de 40px `rounded-control` con `bg-cat-N/15` y el emoji en `text-emoji`; nombre en 16px/400 `tinta` (`truncate`); "Editar" a la derecha en 14px/400 `tinta-2`. Pressed: `bg-papel-2`. Nombre accesible: "Editar {nombre}" (`aria-label`). Abre el sheet de editar.
- Mismo orden que la grilla. Mismos estados de carga y error que la grilla del formulario.
- Sin borrar (Fase 6).
- Reusar el mapa literal `FONDO` de `CategoryGrid` (exportarlo); nada de `bg-cat-${n}`.

### Sheet de crear/editar categoría (D-11..D-15)
Usa `BottomSheet`. Título "Nueva categoría" o "Editar categoría". Contenido en `<form noValidate>`, 16px entre secciones:

1. **Nombre:** label "Nombre", input estándar, `maxLength={40}`, `autoComplete="off"`, placeholder "Ej.: Farmacia". Al crear: `autoFocus`. Al editar: precargado, sin autofocus.
2. **Emoji:** `<fieldset>` legend "Emoji". Grilla de radios nativos (`sr-only` dentro de `label`, `useId` para el name), **6 columnas**, gap 4px, celdas de 48px `rounded-control`, emoji en `text-emoji`. Elegida: `bg-papel-2` + borde 2px `tinta` (las no elegidas llevan borde 2px transparente para no saltar). Foco: anillo `acento`.
   - Lista curada (30, en este orden): 🍔 🍕 ☕ 🛒 🍺 🚌 🚕 ⛽ 🚗 🏠 💡 📱 💻 📺 🎮 🎬 🎉 ⚽ 🏋️ 👕 👟 💊 🏥 💇 🐶 🎁 📚 ✈️ 🎓 📦
   - Debajo, 8px: label "Otro emoji", input estándar de ancho completo, placeholder "Tocá acá y usá el teclado de emojis". Si tiene un emoji válido (`esUnEmoji`), ese es el elegido y ningún radio queda marcado (salvo que coincida con uno de la lista). Tocar un radio vacía el campo libre.
   - Al crear: ninguno elegido. Al editar: el actual (en la grilla si está, si no en el campo libre).
3. **Color:** `<fieldset>` legend "Color". Radios nativos en grilla de **5 columnas × 2 filas** (D-13 dice "fila": 10 muestras de 48px no entran en una fila a 360px, así que se parte en dos), gap 8px. Cada celda 48px con círculo sólido de 40px (`bg-cat-N`, mapa literal nuevo `SOLIDO`), nombre del color en `sr-only` (Tomate, Mandarina, Mostaza, Oliva, Eucalipto, Pizarra, Lavanda, Uva, Rosa, Canela). Elegido: anillo 2px `tinta` con offset 2px + "✓" 14px/600 en `text-papel` centrado. Al crear: preseleccionado `colorMenosUsado` (empate → número más bajo).
4. **Guardar:** 24px arriba, `<Button variant="primario" type="submit" fullWidth loading loadingLabel="Guardando…">Guardar categoría</Button>`.

- Errores bajo cada campo (mismo estilo que el formulario); foco al primer campo con error. 409 → error bajo Nombre. Error de red → encima del botón. El sheet queda abierto con los datos en cualquier error.
- Éxito: el sheet se cierra. Desde el formulario, la categoría nueva queda **elegida** en la grilla (D-11) y no se toca ningún otro campo. Desde `/categorias`, la lista se actualiza (invalidar la query de categorías). Sin toast: la selección/lista es la confirmación.
- El contenido supera 85dvh en celulares chicos: scroll interno del sheet (ya soportado).

### Home (D-16)
- Link `<Link to="/categorias">` "Editar categorías" en `text-acento`, `min-h-11 inline-flex items-center`, 16px debajo del contenido actual. `main` del home suma `pb-24` por el FAB. El resto del placeholder no cambia (Fase 5).

---

## Interaction & States

| Elemento | Contrato |
|----------|----------|
| Foco | Outline 2px `acento` offset 2px en todo control nuevo (FAB, tile Nueva, filas, celdas de emoji, muestras de color, Hoy/Ayer). |
| Hover | Solo con `@media (hover: hover)`. |
| Selección | Siempre con borde/anillo `tinta` 2px y/o "✓" o peso 600; nunca solo por color. |
| Cargando | Botón deshabilitado con "Guardando…"; los campos siguen editables. Doble toque en Guardar no duplica (UUID de borrador + botón deshabilitado). |
| Movimiento | Sin animaciones nuevas. El sheet usa su entrada existente; el toast no anima. |
| Teclado | Enter en descripción u otros inputs envía el formulario (submit nativo). Esc cierra el sheet. |
| Responsive | Revisar en 360, 390, 768 y 1280px: sin scroll horizontal; la grilla pasa a 4 columnas desde `sm:`. |
| Claro/oscuro | Todo con tokens; revisar ambos modos en las dos pantallas y el sheet. |

---

## Copywriting Contract

Rioplatense con voseo. Humor **solo** en la 2ª línea del toast y en estados vacíos. Errores, labels y botones, serios.

| Element | Copy |
|---------|------|
| Primary CTA (formulario) | Guardar gasto (cargando: "Guardando…") |
| Primary CTA (sheet) | Guardar categoría (cargando: "Guardando…") |
| FAB (nombre accesible) | Cargar gasto |
| Título formulario | Nuevo gasto |
| Título `/categorias` | Categorías |
| Botón en `/categorias` | Nueva categoría |
| Tile de la grilla | ＋ Nueva (nombre accesible: "Nueva categoría") |
| Títulos del sheet | Nueva categoría · Editar categoría |
| Fila de categoría | {nombre} + "Editar" (nombre accesible: "Editar {nombre}") |
| Link de volver | Volver |
| Link en home | Editar categorías |
| Labels | Monto · Categoría · Descripción (opcional) · Medio de pago · Fecha · Nombre · Emoji · Otro emoji · Color |
| Opciones de medio | Débito/Transferencia · Efectivo |
| Atajos de fecha | Hoy · Ayer (input: nombre accesible "Otra fecha") |
| Placeholders | Ej.: almuerzo con el equipo · Ej.: Farmacia · Tocá acá y usá el teclado de emojis |
| Toast línea 1 | Anotado: $ 1.234,56 en 🍔 Comida |
| Toast línea 2 (rota en orden, sin repetir seguido) | 1. Tu billetera llora un poquito. 2. Queda en la libreta. 3. Uno menos para acordarte. 4. La plata se fue, el registro queda. 5. Listo, ¿cargamos otro? |
| Cargando categorías | Cargando categorías… |
| Empty state heading (`/categorias`, defensivo: con la siembra no debería verse) | Todavía no tenés categorías |
| Empty state body | Esto no debería pasar. Tocá "Nueva categoría" para crear la primera. |
| Validación monto | Ingresá un monto mayor a $ 0. (`MONTO_VACIO`) · El monto puede tener hasta 2 decimales. (`MONTO_DECIMALES`) |
| Validación categoría | Elegí una categoría. |
| Validación fecha (input vaciado) | Elegí una fecha. |
| Validación nombre | Ponele un nombre a la categoría. |
| Nombre duplicado (409) | Ya tenés una categoría con ese nombre. |
| Validación emoji (ninguno) | Elegí un emoji. |
| Validación emoji (campo libre inválido o 422) | Tiene que ser un solo emoji. |
| Categoría inexistente al guardar gasto (404) | Esa categoría ya no existe. Elegí otra. (se refresca la grilla y se des-elige) |
| Error de red: gasto | No pudimos guardar el gasto. Revisá tu conexión y volvé a tocar "Guardar gasto". |
| Error de red: categoría | No pudimos guardar la categoría. Revisá tu conexión y volvé a tocar "Guardar categoría". |
| Error de carga de categorías | No pudimos conectar con el servidor. Revisá tu conexión y tocá "Reintentar". (`NETWORK_ERROR`) + botón "Reintentar" |
| Destructive confirmation | No hay acciones destructivas en esta fase (borrar categoría y gasto: Fase 6). |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| none | — | not applicable (shadcn no inicializado) |

Sin dependencias nuevas de frontend. (Backend: `emoji` de PyPI, gateado en RESEARCH.md; no es UI.)

---

## Fuentes

| Fuente | Decisiones usadas |
|--------|-------------------|
| 03-CONTEXT.md | D-01..D-21 (ruta, FAB, orden de campos, autofocus, botón siempre activo, base y orden, sheet con "＋ Nueva", emoji/colores, 409, toast, reset, último medio, Crédito oculto, fecha) |
| 03-RESEARCH.md | Colores de las base, toast `role=status` siempre montado, remount de `AmountInput`, límites 40/140, `esUnEmoji`, `colorMenosUsado`, FAB oculto en el formulario |
| DESIGN.md / tokens.css | Toda la escala, tipografía, color, radios, componentes, voz |
| Discreción del researcher | Toast invertido `tinta`/`papel` sin animación; "Volver"; secundario en `/categorias`; layout de fecha; 30 emojis; frases; color 5×2; tile Nueva punteado; copy de errores |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
