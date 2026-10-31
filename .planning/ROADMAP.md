# Roadmap: Control de Gastos

## Overview

Vamos de un directorio vacío a una PWA instalable donde cargo un gasto desde el celular en segundos y veo al instante cuánto me queda en el mes. Primero armamos un esqueleto que funciona de punta a punta, ya seguro: login con Supabase, FastAPI verificando el JWT y Postgres con RLS. Después definimos la dirección visual con la skill `frontend-design`, antes de construir pantallas reales. Luego viene el corazón del producto: categorías y carga rápida de gastos, cuotas de crédito, ingresos y el resumen mensual. Cerramos con edición, borrado, filtros y comparaciones, y al final con el pulido de PWA, responsive y deploy. Cada fase explica los conceptos de Python que aparecen, con analogías a Java cuando ayudan.

## Decisiones fijadas (no se reabren en las fases)

- **Dinero**: `BIGINT amount_cents` de punta a punta (`int` en Python, entero en JSON, `number` en TS). Nunca `float`, nunca `parseFloat(x)*100`. Reparto de cuotas con `divmod` y el resto de centavos va a la primera cuota.
- **SQLAlchemy sync**: `create_engine` / `Session` síncronos, endpoints `def` (no `async def`), psycopg 3 (`postgresql+psycopg://`). Es el mismo modelo mental de Spring MVC: un hilo por request.
- **Tabla `installments` desde el primer gasto**: todo gasto genera 1 o más filas en `installments` (débito y efectivo generan 1 cuota en el mes de su fecha). Totales, gráfico e historial salen de `installments` por `(user_id, period)`.
- **JWT por JWKS**: `PyJWKClient`, algoritmos fijos (ES256/RS256, nunca el que trae el token), `aud` + `iss` verificados y `user_id` tomado solo del `sub`.
- **RLS habilitado sin policies** en cada tabla `public`, en la misma migración que la crea. El frontend nunca lee tablas directo; supabase-js se usa solo para el login.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Fundación end-to-end** - Esqueleto que funciona de punta a punta: login, `/me` protegido por JWT, DB con RLS, deploy temprano (completed 2026-10-30)
- [x] **Phase 2: Dirección visual y sistema de diseño** - Identidad visual propia con `frontend-design`, `DESIGN.md`, `tokens.css` y componentes base (completed 2026-10-31)
- [ ] **Phase 3: Categorías y carga rápida de gastos** - Categorías base editables y un formulario de gasto rápido en el celular (1 cuota)
- [ ] **Phase 4: Cuotas de crédito** - Compras en N cuotas con preview y mes de la primera cuota elegible
- [ ] **Phase 5: Ingresos y resumen mensual** - "Te quedan $X", totales por categoría, gráfico, lista por día y navegación de meses
- [ ] **Phase 6: Edición, filtros y comparaciones** - Editar y borrar gastos e ingresos, borrar categorías, filtros, cuotas pendientes y comparación con el mes anterior
- [ ] **Phase 7: PWA, responsive y deploy final** - App instalable, buena en celular, tablet y compu, robusta ante cold starts

## Phase Details

### Phase 1: Fundación end-to-end

**Goal**: El usuario puede iniciar sesión en la app desplegada y el backend reconoce quién es, con la seguridad de datos resuelta desde el día uno
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07
**Success Criteria** (what must be TRUE):

  1. El usuario inicia sesión con email y contraseña, recarga la página y sigue logueado. Puede cerrar sesión desde cualquier pantalla.
  2. Una request al backend sin JWT, con un JWT vencido o con un JWT firmado con otro algoritmo recibe 401. Con un token válido, `/me` devuelve el `user_id` del token.
  3. Un test automatizado demuestra que un usuario que pide un recurso de otro usuario recibe 404 (queries siempre con `WHERE id = ? AND user_id = ?`).
  4. Un `curl` a `/rest/v1/<tabla>` con la anon key no devuelve datos (RLS habilitado sin policies) y no se puede crear una cuenta nueva (signups deshabilitados).
  5. Frontend y backend están desplegados en free tier, `/health` responde con un `SELECT 1` contra Supabase (pooler session mode, puerto 5432), y ruff, mypy y pytest corren limpios.
  6. Desde la pantalla de login el usuario pide "Olvidé mi contraseña", recibe un código de 6 dígitos por email, lo ingresa en la app (sin salir de la PWA) y entra con la contraseña nueva.

**Conceptos Python**: entornos y dependencias con `uv` (análogo a Maven/Gradle), módulos y paquetes, type hints, `Depends()` de FastAPI como inyección de dependencias (análogo a `@Autowired`), `pydantic-settings` para configuración, migraciones con Alembic (análogo a Flyway), fixtures de pytest (análogo a `@BeforeEach`).
**Plans**: 6 plans
Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Backend skeleton: /health, /me con JWKS + allowlist, probes con 404 cruzado y RLS, tests contra Docker
- [x] 01-03-PLAN.md — Frontend skeleton: login → / con /me → logout (Vite, Tailwind, Vitest, Node 24)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — Proyecto Supabase endurecido (claves ES256, signups off, usuario, OTP) + migración y verificación con curl

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-04-PLAN.md — Recuperación de contraseña con código OTP + verificación local de punta a punta

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 01-05-PLAN.md — render.yaml, README, notas de aprendizaje, escaneo de secretos y push a GitHub (main)

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 01-06-PLAN.md — Deploy Render + Cloudflare Pages + cron-job.org, smoke tests y prueba en el celular

**UI hint**: yes

### Phase 2: Dirección visual y sistema de diseño

**Goal**: La app tiene una identidad visual propia y documentada, y los componentes base que usarán todas las pantallas reales
**Mode:** mvp
**Depends on**: Phase 1 (scaffold de frontend). Prerrequisito obligatorio: el usuario instaló la skill `frontend-design`. La fase no arranca sin ella. Puede correr en paralelo con el trabajo de backend de la Phase 3, pero tiene que terminar antes de que se construya cualquier pantalla real.
**Requirements**: DIS-01, DIS-02
**Success Criteria** (what must be TRUE):

  1. La skill `frontend-design` está instalada y se usó para definir la paleta, la tipografía y el tono, con un resultado que no se ve como un template genérico.
  2. `DESIGN.md` en la raíz documenta las decisiones (paleta, tipografía, espaciado, tono, uso de cada componente) y `tokens.css` es la única fuente de tokens, expuesta en el `@theme` de Tailwind.
  3. Existe una página de muestra con los componentes base (botón, input de monto, control segmentado, grilla de categorías, bottom sheet) que usan solo tokens, sin colores ni tamaños hardcodeados.
  4. La página de muestra se ve bien en un celular real y en la compu.

**Conceptos Python**: ninguno nuevo (fase de frontend). Se introduce lo mínimo de React + TypeScript: componentes como funciones y props tipadas (análogo a interfaces de Java).
**Plans**: 4 plans

Plans:
**Wave 1**

- [x] 02-01-PLAN.md — Tokens + Recursive + DESIGN.md con la skill, Button y migración de login/recuperar/home

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 02-02-PLAN.md — money.ts (TDD), Monto, RestanteMes, AmountInput y /muestra pública

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 02-03-PLAN.md — SegmentedControl, CategoryGrid, BottomSheet y colores de categoría en /muestra

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 02-04-PLAN.md — Revisión con capturas + frontend-design, deploy y prueba en celular real

**UI hint**: yes

### Phase 3: Categorías y carga rápida de gastos

**Goal**: El usuario carga un gasto desde el celular en segundos, con categorías precargadas que puede ampliar y renombrar
**Mode:** mvp
**Depends on**: Phase 1, Phase 2 (las pantallas usan el sistema de diseño)
**Requirements**: CAT-01, CAT-02, CAT-03, GAS-01, GAS-02, GAS-03, GAS-04, GAS-05, GAS-06, GAS-09
**Success Criteria** (what must be TRUE):

  1. En el primer uso el usuario ve las categorías base (incluida "Otros"), sembradas una sola vez aunque recargue. Puede crear y renombrar categorías.
  2. El usuario abre el formulario, tipea el monto primero con teclado numérico ("1.234,56" se acepta), toca una categoría en la grilla, ve el último medio de pago usado ya elegido y la fecha en "Hoy" (hora Argentina), y guarda.
  3. Al guardar ve una confirmación clara y el formulario queda vacío y listo para otro gasto.
  4. Un gasto de $1.234,56 queda guardado como `123456` centavos y se muestra igual, y cada gasto genera su fila en `installments` (1 cuota en el mes de su fecha). Los tests del parser es-AR y del gasto del día 31 a las 22:30 ART pasan.
  5. La migración de `categories`, `expenses` e `installments` habilita RLS, y el `curl` con la anon key sigue sin devolver datos.

**Conceptos Python**: clases y POO en Python (`__init__`, `self`, dataclasses), modelos de SQLAlchemy 2.0 con `Mapped[...]` (análogo a entidades JPA), `select()` y `Session` (análogo a `EntityManager`), modelos de Pydantic para validar requests (análogo a DTOs + Bean Validation), capas router → service → repository, `Enum` y `Literal`.
**Plans**: 6 plans

Plans:
**Wave 1**

- [x] 03-01-PLAN.md — API del gasto: migración 0002 (3 tablas + RLS), siembra lazy de categorías base, POST /expenses con 1 cuota, último medio, CORS
- [x] 03-02-PLAN.md — api() con POST/PUT, tipos de la API, hoyART/ayer y helpers de categorías (TDD)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 03-03-PLAN.md — FAB "+", /gasto/nuevo con validación, guardado idempotente y toast
- [x] 03-04-PLAN.md — POST/PUT /categories con 409 por la DB y emoji validado (checkpoint uv add emoji) + docs fase-03

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 03-05-PLAN.md — Sheet de categoría, /categorias, tile "＋ Nueva" y link en el home

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 03-06-PLAN.md — pg_c_utf8 + migración en Supabase + curl anon, push a main y UAT en celular
**UI hint**: yes

### Phase 4: Cuotas de crédito

**Goal**: El usuario registra compras con tarjeta en cuotas y cada cuota cae en el mes correcto, sumando exactamente el total
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: CUO-01, CUO-02, CUO-03, CUO-04
**Success Criteria** (what must be TRUE):

  1. Al elegir "Crédito" aparecen la cantidad de cuotas y el mes de la primera cuota (el mes de la fecha del gasto o el siguiente). Con otro medio de pago no aparecen.
  2. Antes de guardar, el usuario ve el monto de cada cuota y los meses en que caen (ej. $1.000 en 3 cuotas: 333,34 + 333,33 + 333,33, de nov a ene).
  3. La compra guardada genera N filas en `installments` cuya suma es exactamente el total. Un test verifica `sum(split(t, n)) == t` para n = 1..24, y el servidor rechaza un mes de primera cuota inválido.

**Conceptos Python**: funciones puras y tests parametrizados (`@pytest.mark.parametrize`, análogo a `@ParameterizedTest`), `divmod`, aritmética de fechas con `datetime.date`, transacciones con `Session.begin()` (análogo a `@Transactional`), validadores de Pydantic.
**Plans**: TBD
**UI hint**: yes

### Phase 5: Ingresos y resumen mensual

**Goal**: El usuario abre la app y ve al instante cuánto le queda este mes, en qué lo gastó y qué movimientos tuvo, y puede recorrer otros meses
**Mode:** mvp
**Depends on**: Phase 4
**Requirements**: ING-01, RES-01, RES-02, RES-03, RES-04, RES-07, LIS-01, CUO-05
**Success Criteria** (what must be TRUE):

  1. El usuario carga un ingreso (monto, fecha, descripción) y el "Te quedan $X" del mes actual se actualiza (ingresos menos gastos, incluidas las cuotas que caen en el mes).
  2. El usuario ve el total gastado por categoría y un gráfico de usado vs. restante que también muestra bien un saldo negativo.
  3. El usuario ve los movimientos del mes agrupados por día, y cada cuota aparece en su mes con la etiqueta "Cuota n/N".
  4. El usuario navega a meses anteriores y futuros. En un mes futuro ve lo ya comprometido en cuotas y un mes sin movimientos muestra un estado vacío claro.

**Conceptos Python**: queries agregadas con `func.sum` y `group_by` en SQLAlchemy, modelos de respuesta de Pydantic (`response_model`), parámetros de query validados (`month=YYYY-MM`), comprensiones de listas y diccionarios.
**Plans**: TBD
**UI hint**: yes

### Phase 6: Edición, filtros y comparaciones

**Goal**: El usuario corrige o borra cualquier movimiento, depura sus categorías y analiza mejor su mes
**Mode:** mvp
**Depends on**: Phase 5
**Requirements**: GAS-07, GAS-08, ING-02, CAT-04, LIS-02, RES-05, RES-06
**Success Criteria** (what must be TRUE):

  1. El usuario edita un gasto. Si era en cuotas, edita la compra completa y las cuotas se regeneran en una sola transacción, y el resumen de cada mes afectado se actualiza.
  2. El usuario borra un gasto (en cuotas se borra la compra entera) y edita o borra un ingreso.
  3. El usuario borra una categoría y sus gastos pasan a "Otros". "Otros" no se puede borrar.
  4. El usuario filtra la lista del mes por categoría y por medio de pago.
  5. El usuario ve el total de cuotas pendientes de meses futuros y la comparación con el mes anterior (ej. "+12% vs. septiembre").

**Conceptos Python**: `PATCH` con modelos parciales de Pydantic (`exclude_unset`), borrado en cascada y `UPDATE` masivo en SQLAlchemy, manejo de excepciones propias con `HTTPException` (análogo a `@ControllerAdvice`), `Optional` / `X | None`.
**Plans**: TBD
**UI hint**: yes

### Phase 7: PWA, responsive y deploy final

**Goal**: El usuario instala la app en el celular y la usa a diario en celular, tablet y compu sin sorpresas
**Mode:** mvp
**Depends on**: Phase 6
**Requirements**: DIS-03, DIS-04, DIS-05, DIS-06
**Success Criteria** (what must be TRUE):

  1. El usuario instala la app desde el navegador (Android e iOS) con su ícono, la reabre y sigue logueado. Cuando hay una versión nueva ve un aviso para actualizar (el service worker cachea solo el shell, nunca la API).
  2. En iOS la app respeta notch y barra inferior (safe areas) y no hace zoom al tocar un input.
  3. Todas las pantallas se ven bien en celular, tablet y compu (probado en dispositivos reales).
  4. Si el backend está despertando, la app muestra "conectando…" y el botón Guardar no permite cargar el mismo gasto dos veces. Un ping periódico a `/health` reduce los cold starts.

**Conceptos Python**: endpoint de salud y configuración de producción (CORS con origen exacto, variables de entorno), logging con el módulo `logging` (análogo a SLF4J).
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 (el backend de la Phase 3 puede avanzar en paralelo con la Phase 2)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Fundación end-to-end | 6/6 | Complete   | 2026-10-30 |
| 2. Dirección visual y sistema de diseño | 4/4 | Complete   | 2026-10-31 |
| 3. Categorías y carga rápida de gastos | 5/6 | In Progress|  |
| 4. Cuotas de crédito | 0/TBD | Not started | - |
| 5. Ingresos y resumen mensual | 0/TBD | Not started | - |
| 6. Edición, filtros y comparaciones | 0/TBD | Not started | - |
| 7. PWA, responsive y deploy final | 0/TBD | Not started | - |
