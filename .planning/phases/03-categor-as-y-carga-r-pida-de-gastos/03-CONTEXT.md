# Phase 3: Categorías y carga rápida de gastos - Context

**Gathered:** 2026-10-31
**Status:** Ready for planning

<domain>
## Phase Boundary

El usuario carga un gasto desde el celular en segundos (monto, categoría, descripción opcional, medio de pago, fecha), guardado en centavos y con su fila en `installments` (1 cuota en el mes de la fecha). Tiene categorías base sembradas una sola vez y puede crear y renombrar categorías (también editar emoji y color).

Fuera de esta fase: cuotas y el medio Crédito (Fase 4), resumen del mes / lista / ingresos (Fase 5), editar/borrar gastos y borrar categorías (Fase 6), PWA (Fase 7).

</domain>

<decisions>
## Implementation Decisions

### Formulario de gasto
- **D-01:** Pantalla propia a pantalla completa en la ruta `/gasto/nuevo` (no bottom sheet, no el home). El "atrás" del celu sale del formulario.
- **D-02:** Acceso por **botón flotante "+"** abajo a la derecha, visible en las pantallas logueadas.
- **D-03:** Orden de campos: **monto → categoría → descripción → medio de pago → fecha** (elección del usuario; difiere de la propuesta inicial).
- **D-04:** **Autofocus en el monto** al abrir (teclado numérico nativo vía `AmountInput`). En iOS puede requerir un toque; aceptado.
- **D-05:** Botón Guardar **siempre activo**; al tocarlo con datos faltantes muestra el error junto al campo ("Elegí una categoría", monto > 0). Nada de botón deshabilitado sin explicación.

### Categorías base (CAT-01)
- **D-06:** 7 categorías base: ⚽ Deporte · 🍔 Comida · 🚌 Transporte · 🎉 Salidas · 📺 Suscripciones · 👕 Ropa · 📦 Otros.
- **D-07:** La comodín se llama **"Otros"** (no "Otras"): no se puede borrar (Fase 6) y recibe gastos de categorías borradas.
- **D-08:** Orden en la grilla y en `/categorias`: **alfabético, "Otros" siempre al final**. Las nuevas se intercalan alfabéticamente.
- **D-09:** Colores de las base: uno distinto por categoría de la paleta cerrada `cat-1..cat-10`, a criterio de Claude (que las vecinas en la grilla contrasten).
- **D-10:** Siembra **lazy e idempotente**: si el usuario no tiene categorías, el backend las crea en la primera lectura de categorías. Una restricción única evita duplicados aunque haya recargas o requests concurrentes. Nada de `user_id` fijo en migraciones.

### Crear y renombrar categorías (CAT-02, CAT-03)
- **D-11:** Pantalla **`/categorias`** con la lista para crear y editar (el borrado va en la Fase 6). Además, el último tile de la grilla del formulario es **"＋ Nueva"**: abre un `BottomSheet`, creás la categoría y queda **elegida**, sin perder lo que estabas cargando.
- **D-12:** Emoji: **grilla curada de ~30 emojis de gastos + campo libre** para el teclado de emojis. El backend valida que sea **un solo emoji** (grafema).
- **D-13:** Color: **se asigna solo** (el color menos usado) y se puede cambiar con una fila de los 10 colores en el mismo sheet.
- **D-14:** Editar = **nombre, emoji y color** en el mismo sheet que crear. "Otros" se puede editar.
- **D-15:** Nombre duplicado (con trim y sin distinguir mayúsculas) → **409** y mensaje "Ya tenés una categoría con ese nombre". Se aplica en la DB, no solo en el código.
- **D-16:** Acceso a `/categorias`: **link en el home** por ahora. La navegación general (tabs o menú) se define en la Fase 5.

### Confirmación y valores por defecto (GAS-04, GAS-05, GAS-06)
- **D-17:** Confirmación: **toast arriba**, "Anotado: $ 1.234,56 en 🍔 Comida" + frase con humor que rota (voz de DESIGN.md), dura ~3 s y tiene `aria-live`. El formulario queda abierto debajo.
- **D-18:** Al guardar **se conservan el medio de pago y la fecha**. Se vacían el monto, la categoría y la descripción, y el foco vuelve al monto.
- **D-19:** El "último medio de pago usado" sale **del servidor**: el medio del gasto cargado más recientemente (sincroniza entre dispositivos y no necesita tabla nueva). Sin gastos previos → **Débito/Transferencia**.
- **D-20:** **Crédito oculto hasta la Fase 4**: en esta fase el control segmentado muestra 2 opciones (Débito/Transferencia · Efectivo). **GAS-04 queda parcial en la Fase 3 y se completa en la Fase 4.** El modelo de datos igual guarda los 3 valores del enum, para que la Fase 4 no necesite migrar el tipo.
- **D-21:** Fecha: atajos Hoy / Ayer (hora Argentina) + **`input type="date"` nativo, sin límite** (se permiten fechas futuras). El `installment` va en el mes de la fecha elegida.

### Claude's Discretion
- Forma exacta de la API (rutas, schemas Pydantic) y cómo se expone el "último medio" (campo en el GET de categorías, endpoint propio, etc.).
- Largo máximo de la descripción y del nombre de categoría (valores razonables, validados en backend y frontend).
- Contenido de la lista curada de emojis y de las frases del toast.
- Manejo de errores de red al guardar (sin duplicar el gasto; mensaje serio, sin humor).
- Cómo se asigna el color "menos usado" ante empates.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requisitos y alcance
- `.planning/ROADMAP.md` § Phase 3: goal, success criteria (seed idempotente, parser es-AR, test del día 31 a las 22:30 ART, RLS en las 3 tablas)
- `.planning/REQUIREMENTS.md`: CAT-01..03, GAS-01..06, GAS-09 (GAS-04 parcial, ver D-20)
- `.planning/PROJECT.md`: restricciones (centavos, sync SQLAlchemy, RLS, solo ARS)

### Arquitectura y riesgos
- `.planning/research/ARCHITECTURE.md`: capas router → service → repository, modelo `expenses` + `installments`
- `.planning/research/PITFALLS.md`: dinero, zona horaria, RLS
- `.planning/research/STACK.md`: versiones de librerías

### Diseño
- `DESIGN.md`: voz (humor solo en confirmaciones), tokens, uso de los componentes
- `.planning/phases/02-direcci-n-visual-y-sistema-de-dise-o/02-CONTEXT.md`: D-07 (formato de montos), D-11/D-12 (emoji + color de categoría)
- `.planning/phases/02-direcci-n-visual-y-sistema-de-dise-o/02-UI-SPEC.md`: contrato visual de los componentes base

### Seguridad heredada
- `.planning/phases/01-fundaci-n-end-to-end/01-CONTEXT.md`: allowlist, JWKS, 404 cruzado, RLS sin policies, tests contra Postgres en Docker

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/src/components/ui/AmountInput.tsx` + `frontend/src/lib/money.ts`: parser es-AR y montos como string/BigInt de centavos. Se usa tal cual para GAS-01/02/09.
- `frontend/src/components/ui/CategoryGrid.tsx`: grilla con `Categoria { id, emoji, nombre, color: 1..10 }`. Hay que agregarle el tile "＋ Nueva" (D-11).
- `frontend/src/components/ui/SegmentedControl.tsx`: medio de pago (2 opciones en esta fase).
- `frontend/src/components/ui/BottomSheet.tsx`: sheet de crear/editar categoría (`dialog showModal`).
- `frontend/src/components/ui/Button.tsx`, `Monto.tsx`: botón Guardar y monto del toast.
- `frontend/src/api/client.ts` (`api`, `ApiError`) + TanStack Query: llamadas autenticadas con reintento por 401.
- `backend/app/models/probe.py`, `repositories/probe_repo.py`, `routers/probes.py`: patrón model/repo/router con `user_id` del token y 404 cruzado, para copiar en categories/expenses.
- `backend/app/auth.py` (`get_current_user_id`), `backend/app/db.py` (`get_session`).

### Established Patterns
- Clases de color de categoría en mapas literales, nunca template literals (Tailwind).
- Selección con HTML nativo (radios sr-only, `dialog`).
- Migraciones Alembic con `ENABLE ROW LEVEL SECURITY` en cada tabla nueva.
- Queries siempre con `WHERE id = ? AND user_id = ?`.

### Integration Points
- `frontend/src/app/router.tsx`: nuevas rutas `/gasto/nuevo` y `/categorias` como hijas de `ProtectedLayout`.
- `frontend/src/app/ProtectedLayout.tsx`: lugar natural para el botón "+" flotante.
- `frontend/src/app/HomePage.tsx`: link a `/categorias` (D-16). Sigue siendo un placeholder hasta la Fase 5.
- `backend/app/main.py`: registrar los routers nuevos.

</code_context>

<specifics>
## Specific Ideas

- La lista de categorías base sale de los gastos reales del usuario: Deporte, Comida, Transporte, Salidas, Suscripciones, Ropa, Otros.
- Toast tipo "Anotado: $ 1.234,56 en 🍔 Comida" (ejemplo de humor de DESIGN.md: "Anotado. Tu billetera llora un poquito").

</specifics>

<deferred>
## Deferred Ideas

- Opción Crédito en el control segmentado y su selector de cuotas → Fase 4 (completa GAS-04).
- Navegación general (tabs o menú) → Fase 5, cuando exista el resumen del mes.

</deferred>

---

*Phase: 03-categorias-y-carga-rapida-de-gastos*
*Context gathered: 2026-10-31*
