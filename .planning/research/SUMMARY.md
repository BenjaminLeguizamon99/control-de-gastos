# Resumen de Investigación del Proyecto

**Proyecto:** Control de Gastos | **Dominio:** PWA personal de control de gastos (un usuario, solo ARS, free tier) | **Investigado:** 2026-10-29 | **Confianza:** MEDIA-ALTA

## Resumen ejecutivo

PWA mobile first de un solo usuario cuyo valor central es cargar un gasto en segundos y saber al instante cuánto queda en el mes. Las apps que se siguen usando (Monefy es la referencia) ganan por velocidad de carga, no por cantidad de features. El diferenciador real son las **cuotas de tarjeta** al estilo argentino, que ninguna app popular resuelve bien.

Arquitectura recomendada: monolito simple. React + TS (PWA estática) usa supabase-js **solo para login**; FastAPI verifica el JWT de Supabase vía JWKS, concentra la lógica (cuotas, totales) y accede a Postgres de Supabase con SQLAlchemy. El frontend nunca lee tablas directo. Modelo de datos: todo gasto genera ≥1 fila en `installments` (débito/efectivo = 1 cuota en el mes de su fecha), así totales, gráfico e historial salen de una sola query por `(user_id, period)`. Dinero en centavos enteros. Backend por capas (router → service → repository), familiar para un dev Java.

Riesgos principales: tablas `public` expuestas por la Data API de Supabase sin RLS; JWT mal verificado (HS256 legacy, algoritmo leído del token, queries sin `user_id`); plata/cuotas que no suman; bugs de zona horaria/fin de mes; cold starts del free tier; quirks de PWA en iOS. Todos tienen mitigación barata si se atacan en la fase correcta.

## Decisiones que el roadmap debe fijar

**Decisión 1 — Dinero = `BIGINT amount_cents` (int de punta a punta). Se descarta `NUMERIC` + `Decimal` de STACK.md.**
- `int` en Python, entero en JSON, `number` en TS. `CHECK (amount_cents > 0)` + `Field(gt=0)`.
- Pydantic serializa `Decimal` como string y JS/TS no tiene decimal → strings o floats en el frontend. Centavos enteros son correctos en todas las capas; para un dev Java es el patrón conocido de `long` en centavos.
- Conversión solo en los bordes de UI (`lib/money.ts`, formato es-AR). Nunca `parseFloat(x)*100`.
- Reparto de cuotas con `divmod`: **el resto va a la primera cuota** (1000/3 = 333,34 + 333,33 + 333,33). Test `sum(split(t,n)) == t` para n=1..24.

**Decisión 2 — SQLAlchemy sync + endpoints `def` + psycopg 3. Se descarta async de STACK.md.**
- `create_engine`/`Session` síncronos, `psycopg[binary]`, URL `postgresql+psycopg://`.
- Ritmo "equilibrio": mismo modelo mental que Spring MVC (hilo por request); aprendizaje concentrado en Python, Pydantic, SQLAlchemy 2.0 y pytest sin sumar `async/await`. Un usuario → async no aporta. Evita el problema de psycopg async con `ProactorEventLoop` en Windows.
- Salida: con psycopg, pasar a async después solo cambia engine/session. `sqlalchemy` sin `[asyncio]`; `pytest-asyncio` opcional.

Discrepancias menores resueltas: tabla `installments` (no `expense_charges`); resto a la primera cuota; sin FK a `auth.users`.

## Preguntas abiertas para el usuario

1. **Primera cuota relativa a la fecha del gasto o a hoy?** Recomendación: fecha del gasto (mes de `date` o el siguiente), validada en el servidor.
2. **¿Usa centavos?** El almacenamiento no cambia; solo define si el input es entero por defecto.
3. **Medio de pago: desplegable o control segmentado?** Recomendación: segmentado de 3 opciones + último usado por defecto, y grilla de íconos para categoría.
4. **Login:** email + contraseña (o OTP tipeado), no magic link (en iOS abre Safari, no la PWA).
5. **Host del backend:** Render free + ping a `/health`, o Cloud Run. Se decide en la fase de deploy.

## Hallazgos clave

### Stack (versiones verificadas en PyPI/npm el 2026-10-29)
- **Backend:** Python 3.13 + uv; FastAPI 0.162 `[standard]`; Pydantic 2.14 + pydantic-settings; SQLAlchemy 2.1 estilo 2.0 (`Mapped`, `select()`) sync; psycopg 3; Alembic 1.20; PyJWT 2.15 `[crypto]` con `PyJWKClient`, algoritmos fijos ES256/RS256.
- **Frontend:** React 19, Vite 8, TS del template, vite-plugin-pwa 2, supabase-js (solo auth), TanStack Query 5, react-hook-form + zod, recharts, Tailwind 4 (tokens en `@theme`), react-router 8 en modo SPA.
- **Herramientas:** pytest + httpx, ruff (reglas B, DTZ), mypy, oxlint, Vitest. Tests contra Postgres en Docker, no SQLite.
- **Hosting:** Cloudflare Pages (frontend), Render free o similar (backend), Supabase free (DB + Auth). Conexión por **pooler session mode (5432)**; la directa es solo IPv6.

### Features
- **Imprescindibles:** login con sesión persistente; carga rápida (monto primero con teclado numérico, categoría en grilla, defaults); ingresos sueltos; resumen del mes ("Te quedan $X", totales por categoría, gráfico usado vs. restante, saldo negativo, estado vacío); navegación de meses incluidos futuros; lista/editar/borrar; categorías base editables; PWA instalable y responsive con sistema de diseño.
- **Diferenciadores:** cuotas automáticas con etiqueta "Cuota 2/6"; "comprometido en meses futuros"; defaults inteligentes; UI optimista.
- **Diferir:** autocompletar descripción, "guardar y cargar otro", atajos de manifest, total de cuotas pendientes, cola offline, CSV, filtros, comparación mes a mes.
- **Anti-features:** sync bancario, presupuestos, cierre de tarjeta, multimoneda, OCR, cuentas con saldos, push, offline completo.

### Arquitectura
- Monorepo: `backend/` por capas, `frontend/` por feature, `DESIGN.md` en la raíz, `tokens.css` como única implementación de tokens.
- `get_current_user_id` (JWKS → `sub`). Router/Service/Repository; queries siempre con `user_id`; ajeno → 404.
- Tablas: `categories`, `expenses`, `installments` (`period` = día 1 del mes), `incomes`. `payment_method` como `text` + `CHECK`. Fechas `DATE`.
- `GET /summary?month=YYYY-MM` con 2 queries agregadas. El cliente decide "hoy" y el mes.
- Service worker cachea solo el shell, nunca la API.
- Categorías sembradas perezosa e idempotentemente; borrar una reasigna a "Otros".

### Pitfalls críticos (13 en PITFALLS.md)
1. **Sin RLS en `public`** → `ENABLE ROW LEVEL SECURITY` sin policies en cada migración; verificar con curl a `/rest/v1/<tabla>` con la anon key; deshabilitar signups.
2. **JWT mal verificado / IDOR** → JWKS, algoritmos fijos, `aud` + `iss`, `user_id` solo del token, `WHERE id=? AND user_id=?`, tests de 401 y aislamiento.
3. **Plata/cuotas** → centavos enteros, split con resto a la primera cuota, parser es-AR sin `parseFloat`; tests de las 3 funciones puras.
4. **Fechas/zona horaria** → `DATE`, mes por parámetro, aritmética de meses por índice; test del gasto del 31 a las 22:30 ART.
5. **Cold starts** → `/health` con `SELECT 1` pingueado cada ~10 min, UI "conectando…", Guardar deshabilitado en vuelo.

Otros: SW sin cachear API + `registerType: 'prompt'`; iOS (`viewport-fit=cover`, `dvh`, fuente ≥16px); CORS con origen exacto y rutas sin barra final; solo `VITE_*` públicas.

## Implicaciones para el roadmap (7 fases sugeridas)

Dependencias duras: auth → todo; categorías → gastos; gastos+cuotas → resumen; diseño → UI real.

1. **Fundación end-to-end (walking skeleton)** — monorepo, `/health` + `/me` protegido, Supabase vía pooler session, Alembic con RLS, login supabase-js → `/me`, ruff/mypy/pytest, signups deshabilitados, deploy temprano.
2. **Dirección visual y sistema de diseño** — bloqueada hasta instalar la skill `frontend-design`; `DESIGN.md`, `tokens.css`, componentes base (botón, input de monto, segmentado, grilla de categorías, bottom sheet), safe areas.
3. **Categorías y gastos simples** — esquema `installments` fijado ya; siembra perezosa; CRUD de categorías; alta con 1 cuota; formulario rápido con parser es-AR.
4. **Cuotas de crédito** — `split_installments` + tests, `first_period` validado en servidor, regeneración transaccional al editar, preview, "Cuota n/N".
5. **Ingresos, resumen y dashboard** — CRUD de ingresos, `/summary`, "Te quedan $X", totales por categoría, gráfico, navegación de meses.
6. **Edición, borrado y categorías** — lista por día, editar/borrar compra completa con Deshacer, borrado de categoría con reasignación.
7. **PWA, pulido responsive y deploy final** — manifest, íconos, SW de shell con prompt, instrucciones iOS, cron a `/health`, UI "conectando…", pruebas en celular/tablet/compu.

**Research-phase:** necesaria en fases 1, 2 y 7. Patrón estándar (se puede omitir) en 3–6.

## Confianza

| Área | Confianza | Notas |
|---|---|---|
| Stack | ALTA | Versiones verificadas. MEDIA en hosting, `aud` del JWT, pausa de Supabase, psycopg en Windows. |
| Features | MEDIA | UX de carga rápida consistente; cuotas en LatAm no verificado. |
| Arquitectura | MEDIA-ALTA | JWKS y pooler confirmados en docs. |
| Pitfalls | MEDIA-ALTA | Supabase verificado; resto conocimiento establecido. |

**Brechas:** `aud="authenticated"` e `iss` sin documentar (validar con token real en fase 1); proyecto en HS256 → JWKS vacío (revisar Settings → JWT Keys); medir cold start de Render; confirmar pausa de Supabase free; TS 7 incompatible con typescript-eslint/openapi-typescript (oxlint + tipos a mano, o bajar a TS ~6.0).

## Fuentes
- **ALTA:** PyPI/npm (2026-10-29), plantilla create-vite `react-ts`, docs de Supabase (signing-keys, jwts, connecting-to-postgres, free-project-pausing), render.com/docs/free.
- **MEDIA:** docs de Supabase sobre SQLAlchemy/Supavisor; patrones de FastAPI, SQLAlchemy, TanStack Query, vite-plugin-pwa; reseñas de Monefy, Wallet, Spendee.
- **BAJA:** free tier de Koyeb/Cloud Run; cuotas en Mobills; fuente secundaria sobre sleep de Render.
