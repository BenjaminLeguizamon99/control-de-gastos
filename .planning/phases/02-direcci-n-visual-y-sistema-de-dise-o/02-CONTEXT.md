# Phase 2: Dirección visual y sistema de diseño - Context

**Gathered:** 2026-10-30
**Status:** Ready for planning

<domain>
## Phase Boundary

La app tiene una identidad visual propia, documentada en `DESIGN.md` (raíz del repo), con `frontend/src/…/tokens.css` como única fuente de tokens expuesta en el `@theme` de Tailwind 4, y los componentes base que usarán todas las pantallas reales: botón, input de monto, control segmentado, grilla de categorías y bottom sheet. Una página de muestra los exhibe usando solo tokens. No se construyen pantallas reales (carga de gastos, mes, categorías son Phases 3+). Requisitos: DIS-01, DIS-02.

**Prerrequisito bloqueante (ROADMAP):** la skill `frontend-design` tiene que estar instalada y usarse para definir paleta, tipografía y tono. Al 2026-10-30 está disponible en el marketplace oficial pero **no instalada**; el usuario la instala con `/plugin install frontend-design@claude-plugins-official`. El planner/executor debe verificar que esté disponible antes de la tarea de dirección visual y frenar con un checkpoint si no lo está.

</domain>

<decisions>
## Implementation Decisions

### Personalidad y tono
- **D-01:** Tono **cálido y cercano**: colores cálidos, formas redondeadas, algo de personalidad. Menos "banco", más "tu libreta". Evitar el look genérico de template (DIS-01).
- **D-02:** Sin referencia visual externa: la dirección la propone Claude con la skill `frontend-design`, documentando el porqué en `DESIGN.md`.
- **D-03:** Voz **rioplatense con voseo** ("Ingresá", "Te quedan $…"), frases cortas.
- **D-04:** **Humor solo en momentos sueltos**: estados vacíos y confirmaciones (ej. "Anotado. Tu billetera llora un poquito"). Errores, botones, labels y montos siempre serios y claros. `DESIGN.md` documenta esta regla de voz con ejemplos de sí/no.

### Claro / oscuro
- **D-05:** **Dos paletas (clara y oscura) que siguen al sistema** (`prefers-color-scheme`). Ambas cálidas y con contraste accesible (WCAG AA en texto y montos).
- **D-06:** **Sin selector en la app**: no se guarda preferencia; se cambia desde el celular.

### Números y montos
- **D-07:** Formato de montos: **pesos sin centavos en grande**; los centavos se muestran solo si no son `,00` y en tamaño menor. Formato `es-AR` (`$ 125.430`, `$ 125.430,50`) con `Intl.NumberFormat`. Dígitos tabulares para que no "bailen". Nunca se hacen cuentas con float en el cliente (restricción de proyecto: los montos llegan como string/Decimal).
- **D-08:** Patrón "cuánto me queda": **número grande** ("Te quedan $ 80.000") **+ barra fina** de usado vs. restante debajo. En esta fase se define como patrón/componente en la página de muestra; la pantalla real del mes es de una fase posterior.
- **D-09:** Alertas de color **escalonadas suaves**: color normal mientras hay margen; cálido/ámbar cerca del límite (umbral inicial: < 20% restante); rojo solo al pasarse. Los tres estados son tokens semánticos (no colores sueltos) y no dependen solo del color (texto o ícono acompaña, por accesibilidad).
- **D-10:** Input de monto con el **teclado numérico nativo** del celular (`inputmode="decimal"`), no un teclado propio dibujado.

### Categorías
- **D-11:** Cada categoría se identifica con **emoji + nombre** (el usuario elige el emoji al crearla, en una fase posterior). Sin librería de íconos para categorías.
- **D-12:** Cada categoría tiene **un color de una paleta cerrada** de 8–10 colores cálidos definidos en `tokens.css`, legibles en claro y oscuro. Esos colores sirven también para los gráficos por categoría de fases posteriores.

### Claude's Discretion
- **Tipografía** (D-01): elegir con la skill la familia o familias, no genéricas; dígitos tabulares obligatorios para montos. Cargar las fuentes **self-hosted** (archivos en el bundle o paquete npm tipo `@fontsource`), no desde un CDN, porque la PWA de la Phase 7 tiene que funcionar offline.
- **Grilla de categorías**: columnas y tamaño de cada botón (el usuario lo delegó). Restricción: targets táctiles ≥ 44px y cómodos para el pulgar.
- **Página de muestra**: ruta y acceso a criterio del planner, con la condición de que se pueda abrir en el celular real (SC4), o sea que tiene que existir en el deploy.
- **Migrar las pantallas de Phase 1** (login, recuperar, home) de las clases por defecto de Tailwind a los tokens nuevos: recomendado hacerlo en esta fase (el UI-SPEC de Phase 1 lo anticipa: "Phase 2 crea `tokens.css` y reemplaza estas clases"), pero el planner decide el alcance.
- Comportamiento de detalle del control segmentado y del bottom sheet (animación, cierre por gesto), radios, sombras y escala de espaciado.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Alcance y requisitos
- `.planning/ROADMAP.md` §"Phase 2: Dirección visual y sistema de diseño" — goal, prerrequisito de la skill, success criteria 1–4
- `.planning/REQUIREMENTS.md` — DIS-01, DIS-02
- `.planning/PROJECT.md` — restricciones de diseño (mobile first, skill `frontend-design`, archivo de diseño persistente) y de montos (ARS, sin float)

### Estado visual actual (lo que se reemplaza)
- `.planning/phases/01-fundaci-n-end-to-end/01-UI-SPEC.md` — contrato de UI de Phase 1: copy, color, tipografía y la nota de que Phase 2 reemplaza las clases por tokens
- `.planning/phases/01-fundaci-n-end-to-end/01-CONTEXT.md` — decisiones de Phase 1 (deploy, auth) que no se reabren

### Skill
- `~/.claude/plugins/marketplaces/claude-plugins-official/plugins/frontend-design/skills/frontend-design/SKILL.md` — skill obligatoria para la dirección visual (instalar antes de usar)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/src/index.css`: hoy solo `@import "tailwindcss"` + una font stack de sistema; es el punto donde entra `tokens.css` / `@theme`.
- `frontend/src/features/auth/authErrors.ts`: copy de UI en es-AR (voseo) ya establecido; la regla de voz de D-03/D-04 lo extiende.
- Stack instalado: React 19, Tailwind 4 (`@tailwindcss/vite`), react-router 8, TanStack Query, zod, Vitest. No hay librería de componentes.

### Established Patterns
- Clases de Tailwind por defecto hardcodeadas en las pantallas de Phase 1 (`text-red-600`, `border-zinc-300`, `ring-blue-600`, `min-h-11`): son exactamente lo que SC3 prohíbe en componentes nuevos.
- Estructura por features (`src/features/auth`, `src/app`, `src/api`, `src/lib`); los componentes base no tienen carpeta todavía.
- Lint con oxlint (2 warnings `only-export-components` preexistentes en `main.tsx` y `router.tsx`).

### Integration Points
- `frontend/src/app/router.tsx`: donde se agrega la ruta de la página de muestra.
- Deploy: Cloudflare Workers con static assets (`frontend/wrangler.jsonc`, SPA fallback); cualquier archivo de fuente tiene que quedar dentro de `dist/`.

</code_context>

<specifics>
## Specific Ideas

- Ejemplo de copy con humor aprobado por el tono: "Anotado. Tu billetera llora un poquito" (confirmación).
- Ejemplo de patrón restante: "Te quedan $ 80.000" en grande con barra fina debajo.
- Ejemplo de categorías: 🍔 Comida, 🚌 Transporte.

</specifics>

<deferred>
## Deferred Ideas

- Selector de tema claro/oscuro dentro de la app — descartado por ahora (D-06); se puede reconsiderar si molesta.
- Comentarios con humor cuando te acercás o pasás del presupuesto — descartado (D-04); quizá en una fase de presupuesto si el usuario lo pide.

</deferred>

---

*Phase: 02-direcci-n-visual-y-sistema-de-dise-o*
*Context gathered: 2026-10-30*
