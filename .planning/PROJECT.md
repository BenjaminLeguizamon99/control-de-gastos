# Control de Gastos

## What This Is

App web personal (PWA) para registrar gastos diarios de forma rápida y ver cuánta plata se gasta por categoría y cuánta queda en el mes. Pensada para usarse principalmente desde el celular (mobile first), pero debe verse bien en tablet y computadora. Uso personal de un único usuario, con datos sincronizados entre dispositivos.

## Core Value

Cargar un gasto desde el celular en segundos y saber al instante cuánta plata me queda este mes.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Login con Supabase Auth; datos sincronizados entre celular, tablet y compu
- [ ] Registrar gasto: monto (ARS), categoría, descripción (opcional), medio de pago (desplegable: débito/transferencia, crédito, efectivo), fecha (por defecto hoy)
- [ ] Gasto con crédito: elegir cantidad de cuotas; el monto se divide automáticamente entre los meses siguientes
- [ ] Gasto con crédito: elegir el mes de la primera cuota (desplegable con solo mes actual o mes siguiente)
- [ ] Registrar ingresos como cargas sueltas (monto, fecha, descripción)
- [ ] Categorías base precargadas, editables (crear, renombrar, borrar)
- [ ] Ver totales gastados por categoría del mes
- [ ] Gráfico de cuánto usé vs. cuánto me queda (ingresos − gastos del mes)
- [ ] Vista por defecto: mes actual, con navegación a meses anteriores (historial)
- [ ] Editar y borrar gastos e ingresos
- [ ] PWA instalable, diseño mobile first y responsive (celular, tablet, compu)
- [ ] Dirección visual propia (paleta, tipografía, tono) definida al inicio con la skill `frontend-design`, evitando un look genérico
- [ ] Todas las decisiones de diseño documentadas (sistema de diseño) para mantener consistencia en milestones futuros

### Out of Scope

- Múltiples monedas / conversión — solo ARS, decisión explícita del usuario
- Multiusuario / compartir gastos — app de uso personal
- App nativa (tiendas Android/iOS) — se eligió PWA para una sola base de código
- Ingresos recurrentes automáticos (sueldo fijo) — el usuario eligió cargas sueltas
- Modelado de cierre de resumen de tarjeta — las cuotas se asignan por mes elegido, sin fechas de cierre/vencimiento
- Presupuestos por categoría — "lo que queda" se calcula contra ingresos cargados
- Auth propia (hash/JWT a mano) — se delega a Supabase Auth por seguridad

## Context

- Usuario: desarrollador backend Java que quiere **aprender Python** (sabe lo básico: algoritmos y estructuras de datos; muy poco de POO en Python). Sin experiencia en React/TypeScript.
- Ritmo elegido: **equilibrio** — avanzar rápido pero explicando las decisiones clave de Python (POO, async, tipado, Pydantic, SQLAlchemy, pytest) con analogías a Java cuando ayuden.
- La skill `frontend-design` no está instalada en el entorno actual; el usuario la va a instalar antes de la fase de dirección visual.
- Proyecto greenfield, directorio vacío al iniciar.

## Constraints

- **Tech stack (backend)**: Python + FastAPI + SQLAlchemy + Alembic — el usuario quiere aprender Python con un backend propio
- **Tech stack (datos/auth)**: Postgres de Supabase + Supabase Auth; FastAPI verifica el JWT de Supabase — evitar programar seguridad desde cero
- **Tech stack (frontend)**: React + TypeScript (Vite), PWA — ecosistema más grande; tipos familiares desde Java
- **Moneda**: solo ARS — montos manejados sin errores de redondeo (enteros/centavos o Decimal, nunca float)
- **Presupuesto**: planes gratuitos (Supabase free tier, hosting gratuito) — uso personal
- **Diseño**: mobile first; dirección visual con skill `frontend-design`, documentada en un archivo de diseño persistente
- **Seguridad**: cada request validada contra el usuario autenticado; un usuario solo accede a sus propios datos

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| PWA en vez de app nativa | Una sola base de código para celular, tablet y compu | — Pending |
| Backend propio en FastAPI | El usuario quiere aprender Python | — Pending |
| Supabase Auth + Postgres de Supabase | Login y base gestionados; menos riesgo de seguridad; free tier | — Pending |
| SQLAlchemy + Alembic | ORM estándar de Python (análogo a JPA/Hibernate) + migraciones | — Pending |
| React + TypeScript (Vite) | Ecosistema más grande; tipado familiar | — Pending |
| "Lo que queda" = ingresos − gastos del mes | Elección del usuario (ingresos como cargas sueltas) | — Pending |
| Cuotas: monto dividido en N meses, primera cuota en mes actual o siguiente (elegible) | Elección del usuario; refleja cuándo impacta realmente cada cuota | — Pending |
| Solo ARS | Elección del usuario; evita conversión de monedas | — Pending |
| Diseño documentado con skill `frontend-design` | Mantener identidad visual consistente entre milestones | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-10-29 after initialization*
