# Phase 3: Categorías y carga rápida de gastos - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-31
**Phase:** 03-categorias-y-carga-rapida-de-gastos
**Areas discussed:** Dónde vive el formulario, Categorías base, Crear y renombrar categorías, Confirmación y defaults

---

## Dónde vive el formulario

| Pregunta | Opciones | Elegida |
|----------|----------|---------|
| Dónde se abre | Pantalla propia / Bottom sheet sobre home / Home = formulario | Pantalla propia |
| Acceso | Botón flotante "+" / Botón grande en home / Claude decide | Botón flotante "+" |
| Orden de campos | Monto→cat→medio→fecha→desc / Monto→desc→cat→medio→fecha | Otra: monto→categoría→descripción→medio→fecha |
| Autofocus en monto | Sí / No | Sí |
| Validación | Botón siempre activo + error en campo / Botón deshabilitado | Botón siempre activo + error |

## Categorías base

| Pregunta | Opciones | Elegida |
|----------|----------|---------|
| Lista base | 9 clásicas / 6 mínimas / Lista propia | Propia: Deporte, Comida, Transporte, Salidas, Suscripciones, Ropa, Otros |
| Nombre comodín | Otros / Otras | Otros |
| Emojis | Propuesta (⚽🍔🚌🎉📺👕📦) / Cambiar | Propuesta |
| Colores | Claude asigna / Los elijo yo | Claude asigna |
| Orden | Fijo + Otros al final / Más usadas primero / Alfabético + Otros al final | Alfabético + Otros al final |
| Siembra | Lazy en primera lectura / En migración | Lazy en primera lectura |

## Crear y renombrar categorías

| Pregunta | Opciones | Elegida |
|----------|----------|---------|
| Dónde | /categorias + tile "+" / Solo /categorias / Solo grilla | /categorias + tile "+" |
| Emoji | Curada + campo libre / Solo teclado / Solo curada | Curada + campo libre |
| Color | Auto editable / Siempre auto / Siempre elegido | Auto editable |
| Editar | Nombre, emoji y color / Solo nombre | Nombre, emoji y color |
| Duplicados | Rechazar case-insensitive / Permitir | Rechazar (409) |
| Acceso a /categorias | Link en home / Tabs ya | Link en home |

## Confirmación y defaults

| Pregunta | Opciones | Elegida |
|----------|----------|---------|
| Confirmación | Toast con monto + frase / Mensaje fijo en form | Toast |
| Último medio | Servidor (último gasto) / localStorage | Servidor |
| Qué se conserva | Medio + fecha / Solo medio | Medio + fecha |
| Crédito en Fase 3 | 1 cuota sin campos extra / Oculto hasta Fase 4 | Oculto hasta Fase 4 |
| GAS-04 parcial | Sí, completa en Fase 4 / Mostrar crédito | Sí, completa en Fase 4 |
| Medio inicial | Débito/Transferencia / Ninguno / Efectivo | Débito/Transferencia |
| Fecha | Nativo sin futuras / Nativo sin límite | Nativo sin límite |

**Notes:** Ocultar Crédito contradice el GAS-04 del roadmap; el usuario confirmó dejarlo parcial. Se actualizó la trazabilidad en REQUIREMENTS.md.

## Claude's Discretion

- Forma de la API y cómo se expone el último medio de pago
- Largos máximos de descripción y nombre
- Lista curada de emojis y frases del toast
- Errores de red al guardar
- Desempate del color "menos usado"

## Deferred Ideas

- Crédito + cuotas → Fase 4
- Navegación general (tabs/menú) → Fase 5
