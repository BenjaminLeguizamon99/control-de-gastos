# Investigación de Pitfalls

**Dominio:** PWA personal de control de gastos (FastAPI + SQLAlchemy + Postgres/Auth de Supabase + React/TS/Vite PWA), un solo usuario, ARS, free tier
**Investigado:** 2026-10-29
**Confianza:** MEDIA-ALTA (Supabase JWT/pooler/pausado verificados en docs oficiales; el resto es conocimiento establecido del ecosistema, marcado donde la confianza es menor)

> Nombres de fase usados abajo (para mapear al roadmap): **F-Fundaciones** (repo, backend base, conexión a la DB, auth), **F-Modelo** (esquema, migraciones, categorías), **F-Gastos** (CRUD de gastos/ingresos), **F-Cuotas** (crédito en cuotas), **F-Resumen** (totales del mes, gráfico, historial), **F-Diseño** (dirección visual + sistema de diseño), **F-PWA/Deploy** (service worker, instalación, hosting).

---

## Pitfalls críticos

### Pitfall 1: Tablas en `public` expuestas por la Data API de Supabase sin RLS

**Qué sale mal:**
Supabase expone automáticamente cada tabla del schema `public` por su API REST (PostgREST). La `anon key` va embebida en el bundle del frontend (es pública por diseño). Si Alembic crea `expenses`, `incomes`, `categories` en `public` sin RLS, cualquiera con la anon key puede leer/escribir/borrar **todos** los datos vía `https://<proyecto>.supabase.co/rest/v1/expenses`, salteándose el backend FastAPI por completo.

**Por qué pasa:**
El plan es "el backend valida todo", así que se asume que RLS no hace falta. Pero el backend no es la única puerta: la Data API está abierta igual. Además FastAPI se conecta como `postgres` (rol que ignora RLS), así que activar RLS no rompe nada del backend.

**Cómo evitarlo:**
- En cada migración que crea una tabla: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` sin políticas (= deny total para `anon`/`authenticated`). El backend sigue funcionando porque `postgres` bypassea RLS.
- Alternativa/extra: crear las tablas en un schema propio no expuesto (p. ej. `app`), o desactivar la Data API en Settings → API si no se usa.
- Igual, **el backend filtra siempre por `user_id`** del JWT (ver Pitfall 2). RLS es la red de seguridad, no el mecanismo principal.

**Señales de alerta:**
Security Advisor del dashboard de Supabase muestra "RLS disabled in public". Probar `curl https://<ref>.supabase.co/rest/v1/expenses -H "apikey: <anon>"` y obtener filas.

**Fase:** F-Fundaciones / F-Modelo (primera migración). Verificar con el curl anterior antes de cargar datos reales.

---

### Pitfall 2: Verificación incorrecta del JWT de Supabase en FastAPI

**Qué sale mal:**
- Se verifica con el "JWT secret" legacy (HS256) pero el proyecto firma con **signing keys asimétricas** (ES256/RS256) → todos los tokens fallan, o peor, alguien "arregla" con `options={"verify_signature": False}`.
- Se toma el algoritmo del header del token (`jwt.decode(token, key, algorithms=[header["alg"]])`) → ataque de confusión de algoritmos.
- No se valida `aud` (Supabase usa `"authenticated"`), `exp` o `iss`.
- Se usa el `sub` de un body/query param en vez del token.

**Por qué pasa:**
Muchos tutoriales (2023-2024) usan el secreto compartido HS256. Supabase hoy recomienda signing keys asimétricas y marca el secreto legacy como "no recomendado"; los tokens se verifican contra el JWKS en `https://<ref>.supabase.co/auth/v1/.well-known/jwks.json`.

**Cómo evitarlo:**
- PyJWT + `PyJWKClient(jwks_url)` (cachea claves); `jwt.decode(token, signing_key, algorithms=["ES256", "RS256"], audience="authenticated", issuer=f"https://<ref>.supabase.co/auth/v1")`.
- Lista de algoritmos **fija** en código. Nunca `"none"`, nunca leída del token.
- Una única dependency `get_current_user_id()` que devuelve el `sub` (UUID); todos los endpoints la usan y todas las queries filtran `WHERE user_id = :uid`. Para update/delete: `WHERE id = :id AND user_id = :uid` (si no, IDOR: borrar el gasto de otro por id).
- Revisar en el dashboard (Settings → JWT Keys) qué tipo de clave usa el proyecto antes de escribir el código.
- Tests: token vencido → 401, `aud` incorrecta → 401, firma alterada → 401, gasto de otro usuario → 404.

**Señales de alerta:**
`InvalidSignatureError`/`InvalidAlgorithmError` al primer intento; código con `verify_signature: False` "temporal"; endpoints que reciben `user_id` como parámetro.

**Fase:** F-Fundaciones. Bloqueante para todo lo demás.

---

### Pitfall 3: Plata con `float` y cuotas que no suman el total

**Qué sale mal:**
`0.1 + 0.2 != 0.3`. Totales del mes con "$12.345,6700001". Y lo más típico: 10.000 / 3 cuotas = 3.333,33 × 3 = 9.999,99 → se "pierde" un centavo, o se redondea cada cuota hacia arriba y suma 10.000,01.

**Por qué pasa:**
JSON y JS solo tienen `number` (float). `Decimal(0.1)` en Python construye desde el float ya impreciso. Dividir y redondear cada parte por separado nunca garantiza la suma.

**Cómo evitarlo:**
- **Guardar centavos como entero** (`BIGINT` en Postgres, `int` en Python, `number` entero en la API/TS). Es la opción más simple y sin ambigüedad. (Alternativa: `NUMERIC(14,2)` + `Decimal`, pero Pydantic v2 serializa `Decimal` como string y el frontend tiene que manejarlo — más fricción.)
- Algoritmo de cuotas con resto distribuido:
  ```python
  def split(total_cents: int, n: int) -> list[int]:
      base, rest = divmod(total_cents, n)
      return [base + 1 if i < rest else base for i in range(n)]
  assert sum(split(1_000_000, 3)) == 1_000_000
  ```
  (El resto va a las primeras cuotas; documentar la regla.)
- Conversión string → centavos en el frontend sin pasar por float (parsear parte entera y decimal por separado), ver Pitfall 9.
- Formateo solo en la capa de presentación: `Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })` sobre `cents / 100`.
- Test con property-based o tabla: para n en 1..24 y montos varios, `sum(split(t, n)) == t`.

**Señales de alerta:**
Columnas `Float`/`REAL`/`double precision`; `parseFloat` en el formulario; totales con más de 2 decimales; diferencia de 1 centavo entre "total de la compra" y suma de cuotas.

**Fase:** F-Modelo (tipo de columna) y F-Cuotas (algoritmo + test).

---

### Pitfall 4: Fechas y límites de mes con zona horaria (Argentina UTC-3)

**Qué sale mal:**
- Frontend calcula "hoy" con `new Date().toISOString().slice(0,10)` → entre las 21:00 y 23:59 de Argentina devuelve **mañana** (es UTC). Un gasto del 31 a la noche cae en el mes siguiente.
- Backend calcula "mes actual" con `date.today()`/`now()` en un servidor UTC → el último día del mes a la noche muestra el mes siguiente vacío.
- Se guarda la fecha del gasto como `timestamptz` a medianoche UTC → al mostrarlo en ART aparece el día anterior.
- Sumar meses con `timedelta(days=30)` para las cuotas → en enero 31 + 30 días = marzo 2, saltea febrero.

**Por qué pasa:**
Mezclar "instante" (timestamp) con "fecha de calendario". Un gasto es una fecha de calendario, no un instante.

**Cómo evitarlo:**
- Columna `DATE` para la fecha del gasto/ingreso. Para cuotas, guardar el **mes de imputación** como `DATE` normalizado al día 1 (`2026-11-01`) o como `year`+`month`.
- "Hoy" en el frontend con fecha local: `new Date().toLocaleDateString('en-CA')` (da `YYYY-MM-DD` local) o armarlo con `getFullYear/getMonth/getDate`.
- El **cliente manda el mes que quiere ver** (`GET /summary?month=2026-10`); el backend no decide "mes actual" con su reloj. Si el backend necesita "hoy", usar `ZoneInfo("America/Argentina/Buenos_Aires")` explícito.
- Aritmética de meses con índice: `idx = year*12 + (month-1) + k` → `divmod(idx, 12)`. Sin `timedelta`.
- `created_at`/`updated_at` sí como `timestamptz` (instantes), con `datetime.now(timezone.utc)` — no `datetime.utcnow()` (deprecado en 3.12 y devuelve naive).
- Test: gasto cargado el 31/10 a las 22:30 ART queda en octubre; compra en 12 cuotas desde noviembre termina en octubre del año siguiente.

**Señales de alerta:**
`toISOString()` en código de formularios; `timedelta(days=30)`; endpoints de resumen sin parámetro de mes; bugs que "solo pasan a la noche".

**Fase:** F-Modelo (tipos), F-Gastos (fecha por defecto), F-Cuotas (suma de meses), F-Resumen (mes por parámetro).

---

### Pitfall 5: Modelo de datos de cuotas que complica totales y edición

**Qué sale mal:**
- Se guarda un solo registro "compra en 6 cuotas" y el total mensual se calcula con lógica especial en cada query → bugs en resumen, historial y gráfico.
- O se generan 6 gastos independientes sin vínculo → editar el monto o la cantidad de cuotas obliga a buscar y editar 6 filas a mano; borrar deja huérfanos.
- Editar una compra en cuotas actualiza el padre pero no regenera las cuotas (o regenera fuera de una transacción y queda a medias).
- Cambiar el medio de pago de crédito a efectivo deja cuotas colgando.

**Por qué pasa:**
Se diseña para la carga y no para el resumen ni la edición.

**Cómo evitarlo:**
- Separar **compra** (`expenses`: monto total, categoría, medio de pago, fecha, `installments_count`, `first_installment_month`) de **imputaciones mensuales** (`expense_charges`: `expense_id`, `month`, `amount_cents`, `n`). **Todo** gasto tiene ≥1 imputación (débito/efectivo = 1 imputación en el mes de su fecha).
- Los totales del mes, por categoría y el gráfico salen **siempre** de `expense_charges` (join a `expenses` para la categoría). Una sola query, sin casos especiales.
- Editar = en una transacción: actualizar `expenses`, borrar sus `expense_charges`, regenerarlas con `split()`. FK `ON DELETE CASCADE` de charges a expenses.
- No permitir editar una cuota individual (es derivada). Documentarlo en la UI.
- Definir explícitamente si "mes actual / mes siguiente" de la primera cuota es relativo a **la fecha del gasto** o a **hoy** (si se carga un gasto con fecha pasada, cambia el resultado). Recomendación: relativo a la fecha del gasto. **Validar con el usuario.**

**Señales de alerta:**
`if payment_method == 'credit'` dentro de queries de resumen; suma por categoría que no coincide con el total del mes; cuotas que siguen apareciendo tras borrar la compra.

**Fase:** F-Modelo (esquema decidido antes de F-Gastos aunque cuotas se implementen después), F-Cuotas (regeneración transaccional + tests).

---

### Pitfall 6: Conexión SQLAlchemy ↔ Supabase (IPv6, pooler, prepared statements)

**Qué sale mal:**
- La conexión directa (`db.<ref>.supabase.co:5432`) es **solo IPv6** sin el add-on pago; muchos hosts gratuitos no tienen salida IPv6 → `could not translate host name`/timeout en deploy aunque en local funcione.
- Se usa el pooler en **modo transacción** (puerto 6543) con asyncpg o psycopg con prepared statements → errores tipo `prepared statement "__asyncpg_stmt_x__" already exists` intermitentes. El pooler compartido no soporta prepared statements.
- El pool de SQLAlchemy mantiene conexiones que el pooler/la DB cortó (o que murieron cuando el proyecto se pausó) → primer request después de un rato falla con `connection closed`.
- Alembic apunta al pooler en modo transacción y falla con DDL/locks.

**Por qué pasa:**
El string de conexión "que anda en local" no es el mismo que anda desde el host; los docs de pooler están pensados para serverless.

**Cómo evitarlo:**
- Backend persistente (un proceso uvicorn) en host IPv4: usar el **pooler en modo sesión** (`aws-<n>-<region>.pooler.supabase.com:5432`, usuario `postgres.<ref>`). Copiar el host exacto del diálogo "Connect".
- Si se termina en modo transacción (6543): psycopg 3 → `connect_args={"prepare_threshold": None}`; asyncpg → `statement_cache_size=0` (y `poolclass=NullPool` es lo más seguro).
- `create_engine(..., pool_pre_ping=True, pool_recycle=300)` y pool chico (`pool_size=2-5`): el free tier tiene pocas conexiones.
- `sslmode=require`.
- Alembic usa la misma URL de sesión (o la directa desde local si hay IPv6).

**Señales de alerta:**
Funciona en local y falla en deploy; errores de prepared statements intermitentes; `OperationalError` en el primer request de la mañana.

**Fase:** F-Fundaciones (conexión) y verificar de nuevo en F-PWA/Deploy desde el host real.

---

### Pitfall 7: Cold starts del free tier (Supabase pausado + backend dormido)

**Qué sale mal:**
- Supabase pausa proyectos del plan Free con baja actividad durante 7 días (docs oficiales). Un uso personal esporádico (vacaciones) → la app deja de andar hasta reactivarlo a mano desde el dashboard.
- Hosts gratuitos de backend (p. ej. Render free; reportado ~15 min de inactividad, confianza BAJA sobre el número exacto) duermen el proceso → primera carga tarda 30-60 s. Rompe el valor central: "cargar un gasto en segundos".
- El frontend muestra error/timeout genérico y el usuario reintenta → gastos duplicados.

**Cómo evitarlo:**
- Endpoint `/health` que haga `SELECT 1` en la DB, pingueado por un cron externo gratuito (GitHub Actions `schedule` o cron-job.org) cada ~10-14 min durante el día → mantiene despiertos backend **y** Supabase. Revisar los términos del host elegido.
- UI: estado "despertando el servidor…" con timeout largo (60 s) en vez de error inmediato; botón Guardar deshabilitado mientras hay un request en vuelo (evita duplicados).
- Opcional: idempotency key (UUID generado en el cliente como `id` del gasto) para que un reintento no duplique.
- Evaluar en la investigación de STACK un host sin sleep o con arranque rápido.

**Señales de alerta:**
Primera carga del día lenta; mail de Supabase "your project will be paused"; gastos duplicados.

**Fase:** F-PWA/Deploy (cron + health), F-Gastos (botón deshabilitado / idempotencia).

---

### Pitfall 8: Service worker que sirve datos o versiones viejas

**Qué sale mal:**
- Se cachean respuestas de la API con estrategia `CacheFirst`/`StaleWhileRevalidate` → el resumen del mes muestra totales viejos después de cargar un gasto, o datos de otra sesión.
- `index.html` precacheado y `registerType: 'autoUpdate'` mal configurado o sin prompt → el usuario queda días en una versión vieja (o el SW se actualiza en medio de una carga y recarga la página perdiendo el formulario).
- Respuestas con `Authorization` guardadas en Cache Storage.

**Cómo evitarlo:**
- `vite-plugin-pwa` con Workbox: precache **solo** del app shell (JS/CSS/HTML/íconos). **No** cachear `/api/*` en el SW (o como mucho `NetworkOnly`). La frescura de datos la maneja TanStack Query (invalidar `['summary', month]` tras crear/editar/borrar).
- `registerType: 'prompt'` + toast "Hay una versión nueva – Actualizar" (`useRegisterSW`). Nunca recargar sola mientras hay un formulario abierto.
- No prometer modo offline para carga de gastos en el MVP (sería una cola de sincronización: complejidad alta). Mostrar "sin conexión" claramente.

**Señales de alerta:**
"Cargué un gasto y el total no cambió hasta recargar"; deploy hecho pero el celular sigue con UI vieja; entradas de la API en DevTools → Application → Cache Storage.

**Fase:** F-PWA/Deploy (config del SW) y F-Resumen (invalidación de queries).

---

### Pitfall 9: Input de montos en mobile con locale argentino

**Qué sale mal:**
- `<input type="number">`: en algunos navegadores/teclados con locale es-AR la coma decimal no se acepta o `value` devuelve `""`; el scroll del mouse cambia el monto en desktop; no permite mostrar "1.234,56".
- `parseFloat("1.234,56")` = 1.234 (¡un peso con 23 centavos!). `parseFloat("1234,56")` = 1234.
- Teclado de texto completo en vez de numérico → carga lenta (va contra el valor central).
- En iOS, un input con `font-size < 16px` hace zoom automático al enfocarlo.

**Cómo evitarlo:**
- `<input type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done">` con `font-size ≥ 16px`.
- Parser propio a centavos, con test: aceptar dígitos, `.` como separador de miles y `,` como decimal (convención es-AR); si hay un solo `.` seguido de 1-2 dígitos al final y no hay coma, tratarlo como decimal (algunos teclados `decimal` solo muestran punto). Rechazar ambigüedades con mensaje.
- Considerar que en ARS los centavos casi no se usan: permitir montos enteros como caso principal (más rápido de tipear) y decimales opcionales.
- Formatear con `Intl.NumberFormat('es-AR')` al salir del campo (blur), no mientras tipea (mover el cursor es fuente de bugs).

**Señales de alerta:**
`type="number"` o `parseFloat` en el formulario; montos 1000× más chicos en la base; zoom al tocar el campo en iPhone.

**Fase:** F-Gastos (componente de monto reutilizable, usado también por ingresos).

---

### Pitfall 10: Quirks de PWA en iOS (instalación, sesión, layout)

**Qué sale mal:**
- iOS no tiene `beforeinstallprompt`: el botón "Instalar app" nunca aparece; hay que instruir "Compartir → Agregar a inicio".
- La PWA instalada tiene **almacenamiento separado** de Safari: el login hecho en Safari no se comparte; hay que loguearse dentro de la app instalada.
- **Magic link / OAuth**: el link del mail abre Safari, no la PWA instalada → la sesión queda en Safari y la PWA sigue deslogueada. Clásico en iOS.
- Notch/barra inferior tapan la navegación (sin `viewport-fit=cover` + `env(safe-area-inset-*)`); `100vh` incluye la barra del navegador → botones fuera de pantalla (usar `100dvh`).

**Cómo evitarlo:**
- Login con **email + contraseña** (o OTP de 6 dígitos que se tipea dentro de la app) en vez de magic link. Sesión persistente con refresh automático de supabase-js.
- Pantalla/tooltip de instrucciones de instalación para iOS (detectar `navigator.standalone`).
- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`, `apple-touch-icon`, padding con `env(safe-area-inset-bottom)` en la barra de acciones, `dvh`.
- Probar en un iPhone real (o al menos Safari iOS) antes de dar por cerrada la fase PWA.

**Señales de alerta:**
"Me logueo y la app sigue pidiendo login"; botón Guardar tapado por la home bar.

**Fase:** F-Fundaciones (método de login elegido), F-Diseño (safe areas, dvh), F-PWA/Deploy (instalación iOS).

---

### Pitfall 11: Borrar una categoría que tiene gastos

**Qué sale mal:**
- FK con `ON DELETE CASCADE` → borrar "Comida" borra en silencio todos los gastos del historial.
- Sin FK → gastos con `category_id` huérfano que rompen el resumen (500 o categoría "undefined").
- Categorías base precargadas: como el usuario se crea en Supabase Auth (no en nuestra DB), nadie dispara el seed → primera vez la lista está vacía; o el seed corre en cada login y duplica.

**Cómo evitarlo:**
- FK `ON DELETE RESTRICT`. Al borrar una categoría en uso: pedir a qué categoría reasignar sus gastos (o "Otros"), y hacerlo en una transacción; si no tiene gastos, borrar directo. (Alternativa más simple: soft delete con `archived_at` — la categoría deja de ofrecerse pero el historial la conserva.)
- Unicidad `UNIQUE (user_id, lower(name))` para evitar duplicados al crear/renombrar.
- Seed idempotente: en la dependency de usuario o en un endpoint `POST /me/bootstrap`, "si el usuario no tiene categorías, crear las base" dentro de una transacción (o `INSERT ... ON CONFLICT DO NOTHING`).

**Señales de alerta:**
El historial cambia de totales después de borrar una categoría; categorías duplicadas.

**Fase:** F-Modelo (FK + unique), F-Gastos o fase de categorías (flujo de reasignación).

---

### Pitfall 12: Mezclar async y sync en FastAPI (y otros tropiezos Java → Python)

**Qué sale mal:**
- `async def endpoint()` que usa una `Session` **sincrónica** de SQLAlchemy → la llamada bloquea el event loop; con un solo worker todo el server se congela mientras espera la DB (en Java no existe este problema porque cada request tiene su thread).
- Mezclar tutoriales de SQLAlchemy 1.x (`session.query(...)`) con 2.0 (`select(...)`), o Pydantic v1 (`orm_mode`, `.dict()`) con v2 (`from_attributes`, `.model_dump()`).
- Acceder a una relación lazy después de cerrar la sesión → `DetachedInstanceError` (equivalente a `LazyInitializationException` de Hibernate).
- **Argumentos por defecto mutables**: `def f(items=[])` comparte la misma lista entre llamadas (se evalúa una vez al definir la función). Igual con `Field(default=[])` mal usado; usar `None` o `default_factory=list`.
- `Decimal(0.1)` en vez de `Decimal("0.1")`; datetimes naive vs aware comparados → `TypeError`.
- `is` para comparar valores (`==` en Python es `.equals()`; `is` es `==` de referencias en Java).
- Imports circulares entre modelos SQLAlchemy.

**Cómo evitarlo:**
- **Recomendación concreta: endpoints `def` (no `async def`) + SQLAlchemy sync + psycopg 3.** FastAPI corre los `def` en un threadpool: modelo mental igual a Java, sin bloquear el loop. Para un usuario no hace falta async. Si más adelante se quiere async, todo debe ser async (`AsyncSession` + asyncpg) de punta a punta.
- Fijar versiones y usar solo docs de SQLAlchemy 2.0 (`Mapped[...]`, `mapped_column`, `select()`) y Pydantic v2.
- Sesión por request vía dependency con `yield` (`with SessionLocal() as s: yield s`); serializar a schemas Pydantic **dentro** del request; `selectinload` para relaciones que se devuelven.
- Linter `ruff` con reglas `B` (flake8-bugbear: detecta B006 argumento mutable por defecto, B008) y `DTZ` (datetimes naive). `mypy` o `pyright` para el tipado que extrañarás de Java.

**Señales de alerta:**
Requests que se encolan; `async def` con `session.execute` sin `await`; listas que "recuerdan" valores entre requests; `DetachedInstanceError`.

**Fase:** F-Fundaciones (decisión sync/async + ruff/mypy configurados desde el día 1).

---

### Pitfall 13: Inconsistencia de diseño entre milestones

**Qué sale mal:**
La dirección visual se define con la skill `frontend-design` en una sesión, pero solo queda en el código de esas pantallas. Milestones posteriores (otra sesión, otro contexto) inventan colores hex sueltos, espaciados distintos, otro estilo de botones → la app se ve "parchada" y termina con el look genérico que se quería evitar.

**Cómo evitarlo:**
- Salida obligatoria de F-Diseño: archivo persistente (`DESIGN.md` o `.planning/DESIGN-SYSTEM.md`) con paleta, tipografía, escala de espaciado, radios, sombras, tono de los textos, componentes base y ejemplos de uso, **y** los tokens en código (CSS custom properties o `@theme` de Tailwind v4) como única fuente.
- Regla: ningún color/tamaño literal en componentes; solo tokens. Revisar con grep de `#[0-9a-f]{3,6}` fuera del archivo de tokens.
- Colores semánticos desde el inicio (positivo/negativo para "lo que queda", uno por categoría con contraste suficiente, modo oscuro si se decide).
- Hacer F-Diseño **antes** de construir pantallas (la skill tiene que estar instalada; si no, la fase se bloquea — dejarlo explícito en el roadmap).
- Cada plan de fase de UI incluye "leer DESIGN.md" como lectura obligatoria.

**Señales de alerta:**
Hex sueltos en componentes; dos tonos del "mismo" verde; pantallas nuevas que no se parecen a las viejas.

**Fase:** F-Diseño (temprano, antes de F-Gastos UI) y verificación en cada fase de UI posterior.

---

## Patrones de deuda técnica

| Atajo | Beneficio inmediato | Costo a largo plazo | Cuándo es aceptable |
|-------|--------------------|---------------------|---------------------|
| `float` para montos "por ahora" | Menos código | Migrar datos + corregir totales; desconfianza en los números | Nunca |
| Calcular el mes actual en el backend con `date.today()` | Endpoint sin parámetros | Bug de fin de mes de noche | Nunca; pasar el mes desde el cliente |
| Guardar compra en cuotas como una fila sin imputaciones | Carga más simple | Lógica especial en cada query de resumen | Nunca; decidir el esquema en F-Modelo |
| Sin tests en `split()`, parser de montos y suma de meses | Velocidad | Bugs silenciosos de plata | Nunca (son 3 funciones puras, tests baratos) |
| Saltear RLS porque "el backend controla" | Nada que hacer | Datos expuestos vía Data API | Nunca |
| Sin modo offline | Mucho menos complejidad | No se puede cargar sin señal | Aceptable en MVP |
| Soft delete de categorías en vez de reasignación | Menos UI | Categorías archivadas acumuladas | Aceptable |
| `allow_origins=["*"]` en CORS | Funciona al toque | Cualquier sitio puede llamar con un token robado | Solo en local |

## Gotchas de integración

| Integración | Error común | Enfoque correcto |
|-------------|-------------|------------------|
| Supabase Auth → FastAPI | Verificar con secreto HS256 legacy cuando el proyecto usa signing keys | Revisar tipo de clave; JWKS + `algorithms` fijos + `audience="authenticated"` + `issuer` |
| Supabase Auth (frontend) | Guardar el access token una vez y reusarlo → 401 al expirar (1 h) | Pedir `supabase.auth.getSession()` antes de cada request (supabase-js refresca); ante 401, refrescar y reintentar una vez |
| Supabase Postgres | Conexión directa IPv6 desde host IPv4 | Pooler modo sesión :5432 con usuario `postgres.<ref>` |
| Pooler modo transacción | Prepared statements activos | `prepare_threshold=None` (psycopg) / `statement_cache_size=0` (asyncpg) |
| CORS en FastAPI | `allow_origins=["*"]` + `allow_credentials=True` (inválido), olvidar el origen de producción o de previews | Lista explícita por variable de entorno (`http://localhost:5173`, dominio prod); el header `Authorization` dispara preflight → `allow_headers` lo incluye |
| FastAPI rutas | `/expenses` vs `/expenses/` → redirect 307 que en el navegador pierde CORS/`Authorization` | Definir rutas sin barra final y que el cliente use exactamente esa forma (o `redirect_slashes=False`) |
| Vite env vars | Poner `service_role` key o la URL de la DB en una var `VITE_*` (queda en el bundle público) | Frontend solo `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (o publishable key), `VITE_API_URL`; secretos solo en el backend; `.env` en `.gitignore` |
| Alembic + Supabase | Autogenerate con metadata que referencia `auth.users` o que intenta tocar schemas de Supabase | Migrar solo `public`/schema propio; `user_id UUID NOT NULL` indexado; FK a `auth.users` solo vía SQL explícito si se quiere |

## Trampas de performance

Escala real: 1 usuario, cientos/miles de filas por año. Lo que importa es latencia percibida, no throughput.

| Trampa | Síntomas | Prevención | Cuándo se rompe |
|--------|----------|------------|-----------------|
| Cold start de backend + DB pausada | 30-60 s en la primera carga | Cron a `/health`, UI de "despertando" | Desde el día 1 en free tier |
| N+1 al listar gastos con categoría | Lista lenta en host lejano (cada query cruza red a Supabase) | `selectinload`/join; resumen agregado en SQL (`GROUP BY`) no en Python | Con ~50+ gastos/mes y DB en otra región |
| Backend y DB en regiones distintas | Cada query +100-200 ms | Elegir región del host igual o cercana a la de Supabase (p. ej. ambas en `sa-east-1`/São Paulo o ambas en US-East) | Siempre |
| Refetch de todo tras cada alta | Parpadeo | Invalidar solo `['expenses', month]` y `['summary', month]` | Bajo impacto |

## Errores de seguridad

| Error | Riesgo | Prevención |
|-------|--------|------------|
| Tablas sin RLS en `public` | Cualquiera con la anon key lee/borra todo | RLS habilitado sin políticas o schema no expuesto (Pitfall 1) |
| Update/delete por `id` sin `user_id` | IDOR | `WHERE id = :id AND user_id = :uid`; 404 si no existe |
| `user_id` tomado del body | Escribir datos a nombre de otro | `user_id` solo del JWT; schemas de entrada sin ese campo |
| Registro abierto en Supabase Auth | App personal en internet: cualquiera crea cuenta y usa el backend/la cuota free | Desactivar "Allow new users to sign up" después de crear la cuenta propia (o allowlist de email en el backend) |
| Secretos commiteados | Fuga de credenciales de la DB | `.env` ignorado, `.env.example` sin valores, secretos en el panel del host |
| Logs con tokens | Token reusable en logs del host | No loguear headers `Authorization` |

## UX Pitfalls

| Pitfall | Impacto | Mejor enfoque |
|---------|---------|---------------|
| Formulario de carga con muchos pasos | Se abandona el hábito de cargar | Monto con foco automático + teclado numérico; categoría con chips grandes; fecha = hoy y medio de pago = último usado por defecto; Guardar al alcance del pulgar |
| Doble tap en Guardar | Gasto duplicado | Deshabilitar mientras guarda; idempotencia por UUID de cliente |
| "Lo que queda" sin ingresos cargados | Muestra negativo enorme o divide por cero en el gráfico | Estado vacío explícito: "Cargá un ingreso para ver cuánto te queda" |
| Negativo sin distinguir | No se entiende si se pasó | Color semántico negativo + texto "te pasaste $X" |
| Cuotas invisibles en el mes | El usuario no entiende por qué un gasto de $60.000 suma $10.000 | En el detalle del mes mostrar "cuota 2/6 de Heladera" |
| Borrar sin confirmar / sin deshacer | Pérdida de datos por toque accidental | Confirmación o toast "Deshacer" |
| Montos sin formato local | "12345.5" ilegible | `Intl.NumberFormat('es-AR', {style:'currency', currency:'ARS'})` en toda la app |
| Navegación de meses sin indicar cuál se ve | Confusión con historial | Título grande "Octubre 2026" con flechas; botón "volver a este mes" |

## Checklist "parece terminado pero no lo está"

- [ ] **Auth:** verificado con token vencido, `aud` incorrecta y firma alterada → 401; registro público deshabilitado.
- [ ] **Aislamiento de datos:** curl a la Data API con anon key no devuelve filas; borrar un id ajeno devuelve 404.
- [ ] **Cuotas:** suma de cuotas == total para n=1..24 (test); editar monto/cuotas/mes regenera todo; borrar la compra borra las cuotas; pasar de crédito a efectivo deja 1 imputación.
- [ ] **Fechas:** gasto cargado a las 22:30 del último día del mes queda en ese mes; 12 cuotas cruzan año correctamente.
- [ ] **Monto:** "1.234,56", "1234,56", "1234.5" y "1234" parsean bien; teclado numérico en Android e iOS; sin zoom en iOS.
- [ ] **Categorías:** borrar una en uso no altera totales del historial; usuario nuevo recibe categorías base una sola vez.
- [ ] **Resumen:** suma por categoría == total del mes; estado vacío sin ingresos.
- [ ] **PWA:** instalable en Android; instrucciones iOS; tras deploy aparece "nueva versión"; la API no está en Cache Storage; safe areas OK en iPhone.
- [ ] **Deploy:** conexión a la DB probada desde el host real; CORS con el dominio de producción; primer request tras 1 h de inactividad responde (cron activo).
- [ ] **Diseño:** DESIGN.md existe y los componentes usan solo tokens.

## Estrategias de recuperación

| Pitfall | Costo de recuperación | Pasos |
|---------|----------------------|-------|
| Montos guardados como float | MEDIO | Migración Alembic: nueva columna `BIGINT`, `round(amount*100)`, verificar totales, eliminar la vieja |
| Cuotas sin tabla de imputaciones | ALTO | Crear `expense_charges`, script de backfill recalculando con `split()`, reescribir queries de resumen |
| Datos expuestos sin RLS | BAJO (arreglo) / ALTO (si hubo acceso) | Habilitar RLS ya; revisar logs de API en Supabase; rotar keys |
| Proyecto Supabase pausado | BAJO | Restaurar desde el dashboard; agregar el cron |
| Usuario atascado en versión vieja del SW | BAJO | Publicar versión con prompt; en último caso, desinstalar/reinstalar la PWA |
| Fechas guardadas como timestamptz UTC | MEDIO | Migrar a `DATE` con `(ts AT TIME ZONE 'America/Argentina/Buenos_Aires')::date` |

## Mapeo pitfall → fase

| Pitfall | Fase de prevención | Verificación |
|---------|-------------------|--------------|
| 1. Tablas sin RLS | F-Fundaciones / F-Modelo | curl a `/rest/v1/<tabla>` con anon key → vacío/denegado; Security Advisor limpio |
| 2. JWT mal verificado | F-Fundaciones | Tests de 401 (vencido, aud, firma) e IDOR |
| 3. Float y cuotas | F-Modelo + F-Cuotas | Columnas `BIGINT`; test `sum(split(t,n)) == t` |
| 4. Zona horaria / meses | F-Modelo, F-Gastos, F-Cuotas, F-Resumen | Tests de 22:30 último día y cruce de año |
| 5. Modelo de cuotas | F-Modelo (esquema) + F-Cuotas | Resumen sale de una sola tabla de imputaciones; edición transaccional testeada |
| 6. Conexión pooler | F-Fundaciones + F-PWA/Deploy | Conexión exitosa desde el host real; sin errores de prepared statements |
| 7. Cold starts | F-PWA/Deploy | Cron activo; primera carga del día < pocos segundos o con UI de espera |
| 8. SW con datos viejos | F-PWA/Deploy + F-Resumen | Alta de gasto actualiza totales sin recargar; prompt de actualización |
| 9. Input de montos | F-Gastos | Tests del parser; prueba en celular real |
| 10. iOS PWA | F-Fundaciones (login), F-Diseño, F-PWA/Deploy | Login + instalación probados en iPhone |
| 11. Borrar categoría | F-Modelo + fase de categorías | Historial intacto tras borrar; seed idempotente |
| 12. Async/sync y Python | F-Fundaciones | Endpoints `def` + Session sync; ruff (B, DTZ) y mypy en CI/pre-commit |
| 13. Diseño inconsistente | F-Diseño (antes de UI) | DESIGN.md + tokens; grep de hex sueltos |

## Preguntas abiertas para el usuario / roadmap

- "Primera cuota en mes actual o siguiente": ¿relativo a la **fecha del gasto** o a **hoy**? (Recomendado: fecha del gasto.)
- ¿Se usan centavos en la práctica? (Si no, el input puede ser entero por defecto; el almacenamiento en centavos se mantiene igual.)
- Host del backend: definir en STACK teniendo en cuenta IPv4/IPv6, sleep y región respecto de Supabase.

## Fuentes

- Supabase — JWT Signing Keys (legacy secret no recomendado; ES256/RS256; JWKS `/auth/v1/.well-known/jwks.json`; caché ~10-20 min): https://supabase.com/docs/guides/auth/signing-keys — ALTA
- Supabase — Connecting to Postgres (directa IPv6, pooler sesión :5432 / transacción :6543, prepared statements no soportados en transacción, `statement_cache_size=0` para asyncpg): https://supabase.com/docs/guides/database/connecting-to-postgres — ALTA
- Supabase — Project Pausing (free tier, ventana de 7 días de baja actividad): https://supabase.com/docs/guides/platform/free-project-pausing — ALTA
- Prevención de pausado vía pings: https://github.com/travisvn/supabase-pause-prevention — MEDIA
- Sleep de Render free a los 15 min (fuente secundaria): https://dev.to/astraedus/my-production-app-was-down-for-24-hours-and-nobody-told-me-3nma — BAJA, verificar en docs del host elegido
- Conocimiento establecido (sin verificación en esta sesión, confianza MEDIA): bloqueo del event loop con I/O sync en `async def` (docs FastAPI "async"), argumentos mutables por defecto (ruff B006), `aud="authenticated"` en tokens Supabase, `inputmode="decimal"`, zoom iOS con fuentes < 16px, ausencia de `beforeinstallprompt` en iOS y almacenamiento separado de PWA instalada, Workbox/vite-plugin-pwa `registerType: 'prompt'`, redirect 307 por barra final en Starlette.

---
*Investigación de pitfalls para: PWA personal de control de gastos*
*Investigado: 2026-10-29*
