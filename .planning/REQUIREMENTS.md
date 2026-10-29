# Requirements: Control de Gastos

**Defined:** 2026-10-29
**Core Value:** Cargar un gasto desde el celular en segundos y saber al instante cuánta plata me queda este mes.

## v1 Requirements

### Autenticación (AUTH)

- [x] **AUTH-01**: El usuario puede iniciar sesión con email y contraseña (Supabase Auth)
- [x] **AUTH-02**: La sesión persiste entre recargas y al reabrir la PWA instalada
- [x] **AUTH-03**: El usuario puede cerrar sesión desde cualquier pantalla
- [x] **AUTH-04**: El backend rechaza (401) toda request sin JWT válido (JWKS, algoritmos fijos, `aud` + `iss` verificados)
- [ ] **AUTH-05**: Un usuario solo puede ver/modificar sus propios datos; recursos ajenos devuelven 404
- [x] **AUTH-06**: Las tablas no son accesibles por la Data API pública de Supabase (RLS habilitado sin policies) y los registros nuevos están deshabilitados
- [x] **AUTH-07**: El usuario puede recuperar su contraseña desde la app: pide un código de 6 dígitos por email (OTP de recuperación de Supabase, sin link), lo ingresa en la PWA y define una contraseña nueva

### Categorías (CAT)

- [ ] **CAT-01**: Al primer uso el usuario tiene categorías base precargadas (incluida "Otros")
- [ ] **CAT-02**: El usuario puede crear una categoría
- [ ] **CAT-03**: El usuario puede renombrar una categoría
- [ ] **CAT-04**: El usuario puede borrar una categoría; sus gastos se reasignan a "Otros" (que no se puede borrar)

### Gastos (GAS)

- [ ] **GAS-01**: El usuario puede cargar un gasto con monto en ARS (acepta decimales con coma, formato "1.234,56"), categoría, descripción opcional, medio de pago y fecha
- [ ] **GAS-02**: El monto se ingresa primero, con teclado numérico en el celular
- [ ] **GAS-03**: La categoría se elige tocando una grilla de categorías
- [ ] **GAS-04**: El medio de pago se elige con un control segmentado de 3 opciones (Débito/Transferencia · Crédito · Efectivo), con el último usado preseleccionado
- [ ] **GAS-05**: La fecha es hoy por defecto (hora local Argentina), con atajos "Hoy" / "Ayer" y selector para otra fecha
- [ ] **GAS-06**: Al guardar, el formulario queda abierto y vacío para cargar otro gasto, con una confirmación visual clara de que la carga fue exitosa
- [ ] **GAS-07**: El usuario puede editar un gasto (en compras en cuotas, se edita la compra completa y se regeneran sus cuotas)
- [ ] **GAS-08**: El usuario puede borrar un gasto (en compras en cuotas, se borra la compra completa)
- [ ] **GAS-09**: Los montos se guardan como centavos enteros; nunca hay errores de redondeo

### Cuotas (CUO)

- [ ] **CUO-01**: Si el medio de pago es Crédito, el usuario puede elegir la cantidad de cuotas
- [ ] **CUO-02**: Si el medio de pago es Crédito, el usuario elige el mes de la primera cuota: el mes de la fecha del gasto o el siguiente
- [ ] **CUO-03**: El monto se divide automáticamente en N cuotas mensuales que suman exactamente el total (el resto de centavos va a la primera cuota)
- [ ] **CUO-04**: Antes de guardar, el usuario ve un preview del monto por cuota y los meses en que caen
- [ ] **CUO-05**: Cada cuota se muestra en la lista de su mes con la etiqueta "Cuota n/N"

### Ingresos (ING)

- [ ] **ING-01**: El usuario puede cargar un ingreso con monto, fecha y descripción
- [ ] **ING-02**: El usuario puede editar y borrar un ingreso

### Resumen mensual (RES)

- [ ] **RES-01**: Por defecto se muestra el mes actual con "Te quedan $X" (ingresos − gastos del mes, incluidas las cuotas que caen en él)
- [ ] **RES-02**: El usuario ve el total gastado por categoría en el mes
- [ ] **RES-03**: El usuario ve un gráfico de cuánto usó vs. cuánto le queda en el mes (incluye el caso de saldo negativo)
- [ ] **RES-04**: El usuario puede navegar a meses anteriores y futuros (en los futuros ve lo ya comprometido en cuotas)
- [ ] **RES-05**: El usuario ve el total de cuotas pendientes (suma de cuotas de meses futuros)
- [ ] **RES-06**: El usuario ve la comparación de gastos con el mes anterior (ej. "+12% vs. septiembre")
- [ ] **RES-07**: Un mes sin movimientos muestra un estado vacío claro

### Lista de movimientos (LIS)

- [ ] **LIS-01**: El usuario ve los movimientos del mes agrupados por día
- [ ] **LIS-02**: El usuario puede filtrar la lista por categoría y por medio de pago

### Diseño y PWA (DIS)

- [ ] **DIS-01**: Se define una dirección visual propia (paleta, tipografía, tono) con la skill `frontend-design`, evitando un look genérico
- [ ] **DIS-02**: Las decisiones de diseño quedan documentadas en `DESIGN.md` y implementadas como tokens únicos (`tokens.css`) usados por todos los componentes
- [ ] **DIS-03**: La interfaz es mobile first y se ve bien en celular, tablet y computadora
- [ ] **DIS-04**: La app es instalable como PWA (manifest, íconos, service worker que cachea solo el shell, aviso de actualización)
- [ ] **DIS-05**: En iOS la PWA respeta safe areas y no hace zoom al tocar inputs
- [ ] **DIS-06**: Mientras el backend despierta (cold start) la app muestra un estado "conectando…" y no permite guardar por duplicado

## v2 Requirements

- **GAS-10**: Autocompletar descripción con descripciones usadas antes
- **GAS-11**: Deshacer al borrar (toast con "Deshacer")
- **EXP-01**: Exportar movimientos a CSV
- **OFF-01**: Cola offline para cargar gastos sin conexión
- **DIS-07**: Atajo de manifest "Nuevo gasto" desde el ícono de la app
- **BACK-01**: Migración del backend a async (tema de aprendizaje)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Múltiples monedas | Solo ARS, decisión del usuario |
| Multiusuario / compartir | App de uso personal |
| App nativa (tiendas) | PWA, una sola base de código |
| Ingresos recurrentes automáticos | Usuario eligió cargas sueltas |
| Cierre / vencimiento de resumen de tarjeta | Cuotas por mes elegido, sin fechas de cierre |
| Presupuestos por categoría | "Lo que queda" se calcula contra ingresos |
| Sync bancario / OCR de tickets | Complejidad alta, fuera del valor central |
| Editar cuotas individuales | Se edita la compra completa |
| Magic link / OAuth | En iOS abren Safari en lugar de la PWA |
| Push notifications | No aportan al valor central |
| Auth propia | Delegada a Supabase Auth por seguridad |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| AUTH-05 | Phase 1 | Pending |
| AUTH-06 | Phase 1 | Complete |
| AUTH-07 | Phase 1 | Complete |
| CAT-01 | Phase 3 | Pending |
| CAT-02 | Phase 3 | Pending |
| CAT-03 | Phase 3 | Pending |
| CAT-04 | Phase 6 | Pending |
| GAS-01 | Phase 3 | Pending |
| GAS-02 | Phase 3 | Pending |
| GAS-03 | Phase 3 | Pending |
| GAS-04 | Phase 3 | Pending |
| GAS-05 | Phase 3 | Pending |
| GAS-06 | Phase 3 | Pending |
| GAS-07 | Phase 6 | Pending |
| GAS-08 | Phase 6 | Pending |
| GAS-09 | Phase 3 | Pending |
| CUO-01 | Phase 4 | Pending |
| CUO-02 | Phase 4 | Pending |
| CUO-03 | Phase 4 | Pending |
| CUO-04 | Phase 4 | Pending |
| CUO-05 | Phase 5 | Pending |
| ING-01 | Phase 5 | Pending |
| ING-02 | Phase 6 | Pending |
| RES-01 | Phase 5 | Pending |
| RES-02 | Phase 5 | Pending |
| RES-03 | Phase 5 | Pending |
| RES-04 | Phase 5 | Pending |
| RES-05 | Phase 6 | Pending |
| RES-06 | Phase 6 | Pending |
| RES-07 | Phase 5 | Pending |
| LIS-01 | Phase 5 | Pending |
| LIS-02 | Phase 6 | Pending |
| DIS-01 | Phase 2 | Pending |
| DIS-02 | Phase 2 | Pending |
| DIS-03 | Phase 7 | Pending |
| DIS-04 | Phase 7 | Pending |
| DIS-05 | Phase 7 | Pending |
| DIS-06 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 42 total
- Mapped to phases: 42
- Unmapped: 0 ✓

---
*Requirements defined: 2026-10-29*
*Last updated: 2026-10-29 after roadmap creation*
