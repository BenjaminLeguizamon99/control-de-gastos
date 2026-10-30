# Phase 2: Dirección visual y sistema de diseño - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-30
**Phase:** 02-direcci-n-visual-y-sistema-de-dise-o
**Areas discussed:** Personalidad y tono, Claro / oscuro, Números y montos, Categorías

---

## Personalidad y tono

| Option | Description | Selected |
|--------|-------------|----------|
| Calma y precisa | Pocos colores, mucho espacio, números protagonistas | |
| Cálida y cercana | Colores cálidos, formas redondeadas, algo de personalidad | ✓ |
| Audaz y con carácter | Alto contraste, tipografía grande, color firma fuerte | |

| Option | Description | Selected |
|--------|-------------|----------|
| No tengo referencia | Claude propone con la skill | ✓ |
| Sí, te la describo | — | |

| Option | Description | Selected |
|--------|-------------|----------|
| Rioplatense, directo y breve | Voseo, sin chistes | |
| Rioplatense con algo de humor | Voseo + comentarios amigables | ✓ |
| Neutro | Sin voseo | |

| Option | Description | Selected |
|--------|-------------|----------|
| Una sola familia con personalidad | — | |
| Dos familias: títulos + texto | — | |
| Decidí vos | Claude elige con la skill | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Solo en momentos sueltos | Estados vacíos y confirmaciones; errores/botones/montos serios | ✓ |
| También cuando gastás mucho | Comentario al acercarte o pasarte del presupuesto | |
| En todos lados | Incluso errores y labels | |

**User's choice:** cálido y cercano, voseo con humor puntual, tipografía a criterio de Claude.

---

## Claro / oscuro

| Option | Description | Selected |
|--------|-------------|----------|
| Seguir al celular | Claro/oscuro según el sistema | ✓ |
| Solo claro | Una paleta clara cálida | |
| Solo oscuro | Una paleta oscura cálida | |

| Option | Description | Selected |
|--------|-------------|----------|
| No, solo el sistema | Sin ajuste en la app | ✓ |
| Sí, un selector | Claro/oscuro/automático en la app | |

---

## Números y montos

| Option | Description | Selected |
|--------|-------------|----------|
| Pesos sin centavos en grande | Centavos solo si no son ,00, en chico | ✓ |
| Siempre con centavos | Todo igual de tamaño | |
| Abreviado en resúmenes | $ 125,4 mil en totales | |

| Option | Description | Selected |
|--------|-------------|----------|
| Un número grande + barra | "Te quedan $ X" + barra usado/restante | ✓ |
| Anillo / dona | Anillo que se vacía | |
| Solo el número | Sin gráfico | |

| Option | Description | Selected |
|--------|-------------|----------|
| Escalonado suave | Ámbar cerca del límite (<20%), rojo al pasarse | ✓ |
| Solo al pasarte | Rojo al pasarse | |
| Sin alertas de color | — | |

| Option | Description | Selected |
|--------|-------------|----------|
| Teclado numérico del celu | `inputmode=decimal` | ✓ |
| Teclado propio en pantalla | Teclas dibujadas | |

---

## Categorías

| Option | Description | Selected |
|--------|-------------|----------|
| Emoji + nombre | El usuario elige el emoji | ✓ |
| Ícono dibujado + nombre | Librería tipo Lucide | |
| Solo nombre con color | Chip de color | |

| Option | Description | Selected |
|--------|-------------|----------|
| Sí, de una paleta cerrada | 8–10 colores cálidos en tokens.css | ✓ |
| No, todas iguales | — | |
| Color libre | Color picker | |

| Option | Description | Selected |
|--------|-------------|----------|
| 3 por fila, botones grandes | — | |
| 4 por fila, más compactos | — | |
| Decidí vos | Claude decide | ✓ |

---

## Claude's Discretion

- Tipografía (familia, carga self-hosted, dígitos tabulares)
- Grilla de categorías (columnas, tamaño)
- Ruta y acceso de la página de muestra
- Migración de las pantallas de Phase 1 a tokens
- Detalles de control segmentado, bottom sheet, radios, sombras, espaciado

## Deferred Ideas

- Selector de tema dentro de la app
- Humor al acercarse o pasarse del presupuesto
