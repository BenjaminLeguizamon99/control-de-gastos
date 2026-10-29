# Investigación de Features

**Dominio:** App personal de control de gastos (PWA, un usuario, solo ARS)
**Investigado:** 2026-10-29
**Confianza:** MEDIA (los patrones de UX de carga rápida son consistentes entre apps conocidas como Monefy, Wallet, Spendee y Money Manager; el manejo de cuotas en apps LatAm se basa mayormente en conocimiento previo, no verificado en docs oficiales)

## Hallazgo principal

Las apps de gastos que la gente sigue usando ganan por **velocidad de carga**, no por cantidad de features. Monefy es el caso de referencia: tocás "–", ponés el monto, tocás el ícono de la categoría y listo, en 3 toques. Las apps que piden muchos campos o tienen formularios largos se abandonan. En Argentina, además, ninguna app popular resuelve bien las **cuotas** de tarjeta: es un hueco real y es el diferenciador natural de este proyecto.

## Panorama de features

### Table Stakes (si faltan, el usuario deja de usarla)

| Feature | Por qué se espera | Complejidad | Notas |
|---------|-------------------|-------------|-------|
| Carga de gasto en ≤ 3-4 toques | Es el core value. Si cargar cuesta, el usuario deja de registrar y los datos pierden valor | MEDIA | Ver "Patrones de carga rápida" más abajo. El monto va primero y con el teclado numérico ya abierto |
| Monto en ARS sin errores de redondeo | Plata: tiene que cerrar al centavo | BAJA | Guardar en centavos (int) o Decimal. El input acepta formato AR (`1.234,50`) |
| Categoría con íconos/colores | Todas las apps lo hacen: la categoría se reconoce de un vistazo y se elige con un toque | BAJA | Grilla de botones, no `<select>` |
| Categorías base precargadas y editables | El usuario no quiere configurar nada antes de su primer gasto | BAJA | Unas 8-10 base: Supermercado, Comida/Delivery, Transporte, Servicios, Salud, Ocio, Ropa, Hogar, Otros. Borrar una categoría con gastos necesita una regla (ver Dependencias) |
| Medio de pago (débito/transferencia, crédito, efectivo) | Requisito del usuario; además habilita las cuotas | BAJA | 3 opciones: en mobile conviene un control segmentado, que es más rápido que un desplegable. Por defecto, el último usado |
| Fecha con default "hoy" | Casi todos los gastos se cargan el mismo día | BAJA | Atajos "Hoy / Ayer" más un selector para otra fecha |
| Descripción opcional | Contexto ("cumple de Juan") sin frenar la carga | BAJA | Nunca obligatoria |
| Ingresos como cargas sueltas | Sin ingresos no se puede calcular "lo que queda" | BAJA | Mismo formulario con toggle gasto/ingreso, o un botón "+" separado |
| Resumen del mes: ingresos, gastos, saldo | Es la segunda mitad del core value ("saber cuánto me queda") | BAJA | Número grande arriba en la home: **"Te quedan $X"** |
| Totales por categoría del mes | Responde "¿en qué se me va la plata?" | BAJA | Lista ordenada de mayor a menor, con barra o % |
| Gráfico usado vs. restante | Requisito del usuario; se entiende de un vistazo | BAJA-MEDIA | Una dona o barra simple alcanza. Caso borde: saldo negativo (gasté más de lo que ingresé) debe verse bien, no romper el gráfico |
| Navegación entre meses | El historial es básico. Monefy recibe críticas justamente por manejarlo mal | BAJA | Flechas ‹ mes › o swipe; el mes actual por defecto |
| Lista de movimientos del mes | Para revisar y corregir | BAJA | Agrupada por día y ordenada desc. Tocar un movimiento abre la edición |
| Editar y borrar movimientos | Los errores de carga son frecuentes | MEDIA | Al borrar: confirmación o "Deshacer" (snackbar). Con cuotas es más complejo, ver abajo |
| Sincronización entre dispositivos + login | Requisito del usuario | MEDIA | Supabase Auth. La sesión tiene que persistir: si hay que loguearse cada vez, la carga deja de ser rápida |
| PWA instalable, mobile first | Abrirla desde el ícono como si fuera nativa | BAJA-MEDIA | Manifest + service worker + `display: standalone` |

### Diferenciadores (ventaja frente a apps genéricas)

| Feature | Propuesta de valor | Complejidad | Notas |
|---------|--------------------|-------------|-------|
| **Cuotas de tarjeta automáticas** | Las apps globales no lo resuelven; en Argentina es como se compra | MEDIA-ALTA | Se carga una compra con N cuotas y la primera en el mes actual o en el siguiente. Cada mes ve solo su cuota. El resto de los centavos va a la primera cuota (ej. $1000 / 3 = 333,34 + 333,33 + 333,33). Etiqueta "Cuota 2/6" en la lista |
| **"Comprometido en meses futuros"** | Saber cuánto ya debo de cuotas antes de que llegue el mes | BAJA (si las cuotas existen) | Al navegar a un mes futuro se ven las cuotas que ya caen ahí. Como extra, un total "cuotas pendientes". Sale casi gratis del modelo de cuotas |
| Defaults inteligentes | Cada toque ahorrado cuenta | BAJA | Último medio de pago usado y, si hace falta, la última categoría. Cuotas por defecto: 1 |
| Autocompletar descripción con historial | "Carrefour" o "Uber" se repiten mucho | BAJA-MEDIA | Sugerencias de descripciones previas. Opcional: al elegir una, sugerir su categoría |
| Guardar y cargar otro | Al volver del súper con varios tickets | BAJA | Botón secundario que deja el formulario abierto y limpio |
| Atajo de PWA "Nuevo gasto" | Llegar al formulario en 1 toque desde la pantalla de inicio | BAJA | `shortcuts` del web manifest (soportado en Android/Chrome; en iOS no está, confianza MEDIA) |
| UI optimista | Se siente instantánea aunque el backend esté en free tier (cold starts) | MEDIA | Mostrar el gasto al toque y sincronizar después. Si falla el guardado, avisar y no perder el dato |
| Identidad visual propia | Requisito del usuario; si da gusto abrirla, se usa más | MEDIA | Skill `frontend-design` + documento de sistema de diseño |

### Anti-features (parecen buenas, pero acá traen problemas)

| Feature | Por qué se pide | Por qué es problemática | Alternativa |
|---------|-----------------|-------------------------|-------------|
| Sincronización bancaria / lectura de resúmenes | "Que se cargue solo" | En AR no hay open banking accesible. Scraping frágil, riesgo de seguridad, fuera del free tier | Carga manual ultra rápida |
| Presupuestos por categoría | Estándar en Wallet/Spendee | Fuera de alcance por decisión del usuario; suma configuración y pantallas | "Lo que queda" = ingresos − gastos |
| Modelado de cierre/vencimiento de tarjeta | Exactitud contable | Complejidad alta (fechas por tarjeta, varias tarjetas) que el usuario descartó | Elegir mes de primera cuota: actual o siguiente |
| Múltiples monedas / USD | Inflación, ahorro en dólares | Descartado; obliga a cotizaciones y conversión | Solo ARS |
| Ingresos recurrentes automáticos | Sueldo fijo | Descartado; además requiere jobs programados | Carga suelta (con autocompletar es rápido) |
| Escaneo de tickets / OCR | Parece más rápido | Más lento y errático que tipear un monto; costo de API | Teclado numérico directo |
| Múltiples cuentas/billeteras con saldos | Wallet, Money Manager lo tienen | Hay que conciliar saldos y transferencias entre cuentas: otro producto | El medio de pago como atributo del gasto, no como cuenta |
| Notificaciones / recordatorios push | "Para no olvidarme de cargar" | Web push en iOS es limitado; molesta; infraestructura extra | Atajo de PWA + carga rápida |
| Gamificación, metas de ahorro, reportes avanzados | Engagement | Scope creep sin relación con el core value | Totales por categoría + un gráfico |
| Offline completo con resolución de conflictos | "Cargar sin señal" | Sync bidireccional con conflictos es difícil de hacer bien | v1: UI optimista. v1.x: cola offline simple de creaciones (no de ediciones) |
| Desplegable (`<select>`) para categoría y medio de pago | Es lo obvio en un formulario | En mobile abre un picker nativo: 2 toques más y se tapa la pantalla | Grilla de categorías + control segmentado (3 medios de pago) |

## Patrones de carga rápida en mobile (lo que hace sentir "en segundos")

1. **FAB "+" siempre visible** en la home (zona del pulgar, abajo a la derecha o al centro).
2. **El monto primero, con foco automático** y `inputmode="decimal"`: el teclado numérico aparece solo. Tamaño grande, con formato `$ 12.345` mientras se escribe.
3. **Categoría con un toque** en una grilla de íconos visible sin scroll (las 8 más usadas). Opcional: que tocar la categoría guarde directo, como en Monefy, si el resto queda en default.
4. **Todo lo demás con default:** fecha hoy, último medio de pago y descripción vacía. El campo cuotas aparece **solo** si el medio es crédito (revelación progresiva), con default 1 y "primera cuota: este mes".
5. **Un solo botón "Guardar"** grande, arriba del teclado y alcanzable con el pulgar. Después vuelve a la home con el saldo ya actualizado. Ese feedback inmediato es el que cierra el core value.
6. **Hoja inferior (bottom sheet) en vez de página nueva:** se siente más rápido y no se pierde el contexto.
7. **Sesión persistente:** nunca pedir login para cargar un gasto.

Flujo objetivo para un gasto típico: `+` → tipear monto → tocar categoría → `Guardar` = **4 toques + dígitos**.

## Dependencias entre features

```
Auth + sesión persistente
    └──requiere──> todo lo demás (los datos son por usuario)

Categorías (base precargadas)
    └──requerida por──> Carga de gasto
                            ├──requerida por──> Totales por categoría
                            ├──requerida por──> Lista del mes ──> Editar/Borrar
                            └──+ Ingresos ──requerida por──> Saldo "te quedan $X" ──> Gráfico usado vs. restante

Medio de pago = crédito
    └──habilita──> Cuotas (N, mes de primera cuota)
                       ├──requiere──> Modelo "compra" + "cuota por mes" (definir antes de los totales)
                       ├──afecta──> Totales por categoría y saldo (se suman cuotas, no compras)
                       ├──habilita──> "Comprometido en meses futuros"
                       └──complica──> Editar/Borrar (¿se edita la compra entera? sí: regenerar cuotas)

Navegación entre meses ──requiere──> consultas por mes (las cuotas ya asignadas a cada mes)

Autocompletar descripción ──mejora──> Carga de gasto (requiere historial)
UI optimista ──mejora──> Carga de gasto (cold start del backend free tier)
```

### Notas de dependencias

- **El modelo de cuotas se define antes que los totales:** todos los agregados (por categoría, saldo, gráfico) suman *lo que impacta en el mes*. Un gasto en débito impacta en el mes de su fecha; una compra en cuotas impacta con cada cuota en su mes. Si los totales se construyen primero sobre "gastos" y las cuotas se agregan después, hay que reescribir las consultas. Recomendación: un gasto normal es una compra de 1 cuota con impacto en el mes de la fecha. Un solo camino de código.
- **Editar o borrar una compra en cuotas actúa sobre la compra completa:** se regeneran o eliminan todas sus cuotas. No se permite editar una cuota suelta en v1, porque eso desincroniza el total.
- **Borrar una categoría con movimientos:** hace falta una regla. Recomendado: no permitirlo, o pedir reasignar a otra (o a "Otros"). Borrado lógico es otra opción. Nunca dejar movimientos huérfanos.
- **El saldo depende de ingresos y gastos del mismo mes:** el ingreso de un mes no se arrastra al siguiente. Esto es coherente con la definición del usuario, pero hay que dejarlo explícito en la UI ("este mes").

## Definición de MVP

### Lanzar con (v1)

- [ ] Login Supabase con sesión persistente: precondición de todo
- [ ] Categorías base precargadas + CRUD: precondición de la carga
- [ ] Carga rápida de gasto (monto, categoría, medio de pago, fecha, descripción) con defaults: core value
- [ ] Cuotas en crédito (N cuotas, primera en mes actual/siguiente, resto de centavos en la primera): requisito clave y diferenciador
- [ ] Carga de ingresos sueltos: necesaria para el saldo
- [ ] Home del mes: "Te quedan $X", gráfico usado/restante, totales por categoría: core value
- [ ] Navegación de meses (incluye futuros, para ver cuotas): requisito
- [ ] Lista de movimientos + editar/borrar (compra completa en cuotas): corrección de errores
- [ ] PWA instalable + diseño mobile first responsive + sistema de diseño documentado: requisito

### Agregar después de validar (v1.x)

- [ ] Autocompletar descripción con sugerencia de categoría: cuando haya historial y se repitan las cargas
- [ ] "Guardar y cargar otro": si se cargan varios gastos seguidos
- [ ] Atajo de manifest "Nuevo gasto": casi gratis, puede ir en v1 si sobra tiempo
- [ ] Total de cuotas pendientes (comprometido futuro): cuando haya varias compras en cuotas
- [ ] Cola offline simple de creaciones: si se detectan cargas perdidas por falta de señal
- [ ] Exportar CSV: si se quiere analizar en planilla o tener backup propio
- [ ] Filtro de la lista por categoría o medio de pago

### A futuro (v2+)

- [ ] Comparación mes contra mes por categoría: requiere varios meses de datos
- [ ] Búsqueda de texto en movimientos: valor bajo con poco volumen
- [ ] Presupuestos por categoría: hoy está fuera de alcance; reconsiderar solo si el usuario lo pide

## Matriz de priorización

| Feature | Valor | Costo | Prioridad |
|---------|-------|-------|-----------|
| Carga rápida de gasto con defaults | ALTO | MEDIO | P1 |
| Saldo del mes + gráfico | ALTO | BAJO | P1 |
| Totales por categoría | ALTO | BAJO | P1 |
| Cuotas de crédito | ALTO | MEDIO-ALTO | P1 |
| Ingresos sueltos | ALTO | BAJO | P1 |
| Categorías editables | MEDIO | BAJO | P1 |
| Navegación de meses | ALTO | BAJO | P1 |
| Editar/borrar | ALTO | MEDIO | P1 |
| PWA instalable | ALTO | BAJO | P1 |
| UI optimista | MEDIO | MEDIO | P2 |
| Autocompletar descripción | MEDIO | BAJO | P2 |
| Atajo "Nuevo gasto" en manifest | MEDIO | BAJO | P2 |
| Comprometido futuro (total) | MEDIO | BAJO | P2 |
| Cola offline | MEDIO | ALTO | P3 |
| Exportar CSV | BAJO | BAJO | P3 |

## Análisis de competidores

| Feature | Monefy | Wallet (BudgetBakers) / Spendee | Mobills (BR) | Nuestro enfoque |
|---------|--------|----------------------------------|--------------|-----------------|
| Carga rápida | Referencia: "–", monto, ícono = listo | Más campos y cuentas; más lento | Formulario estándar | Estilo Monefy + defaults inteligentes |
| Cuotas | No tiene | Sin soporte nativo claro de cuotas AR | Tiene compras "parceladas" en tarjeta (confianza BAJA, no verificado) | Nativo: N cuotas, primera este mes o el siguiente |
| Historial de meses | Criticado por manejarlo mal | Bueno | Bueno | Flechas de mes, incluye meses futuros |
| Sync | Google Drive/Dropbox, en Pro | Nube + sync bancario (pago) | Nube | Supabase, gratis, sin bancos |
| Presupuestos | No | Sí | Sí | No (decisión) |
| Multimoneda | Pro | Sí | Sí | No (solo ARS) |

## Fuentes

- [Monefy en App Store](https://apps.apple.com/app/id1212024409): carga de un toque, solo el monto es obligatorio (listado del desarrollador)
- [The Edge Malaysia: Back to basics for expense tracking](https://www.theedgemarkets.com/article/back-basics-expense-tracking): flujo "+/–, monto, ícono" (2018)
- [Softpedia: reseña de Monefy](https://mobile.softpedia.com/android/Monefy-Android-Review-2301.html): la más intuitiva y liviana (versión vieja)
- [Gerald: reseña de Monefy](https://joingerald.com/learn/financial-wellness/monefy-expense-tracker-review): límites del free (contenido patrocinado, confianza BAJA)
- [La Voz de San Justo: las 5 mejores apps para controlar gastos](https://www.lavozdesanjusto.com.ar/las--5-mejores-apps-para-controlar-gastos-62211): Monefy sin historial acumulativo; Wallet
- [Forbes Argentina: cinco apps para finanzas](https://www.forbesargentina.com/money/cinco-apps-interfaces-intuitivas-te-ayudaran-ahorrar-planificar-tus-finanzas-n50586): Spendee y otras
- [BBVA Argentina: herramientas de control de gastos](https://www.bbva.com.ar/economia-para-tu-dia-a-dia/ef/tarjeta-de-credito/control-de-gastos-con-herramientas.html)
- [iProfesional: apps financieras](https://www.iprofesional.com/finanzas/382368-3-apps-financieras-para-controlar-tus-gastos-y-ahorros)
- Búsqueda sin resultados: no encontré ninguna app argentina popular que se especialice en cuotas. Es un vacío, aunque no está demostrado que no exista.

---
*Investigación de features para: app personal de control de gastos (AR)*
*Investigado: 2026-10-29*
