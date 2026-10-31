import { useId } from 'react'

export type ColorCategoria = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

export interface Categoria {
  id: string
  emoji: string
  nombre: string
  color: ColorCategoria
  esOtros?: boolean
}

// Clases enteras: Tailwind solo genera las que encuentra completas en el código
export const FONDO: Record<ColorCategoria, string> = {
  1: 'bg-cat-1/15 active:bg-cat-1/25',
  2: 'bg-cat-2/15 active:bg-cat-2/25',
  3: 'bg-cat-3/15 active:bg-cat-3/25',
  4: 'bg-cat-4/15 active:bg-cat-4/25',
  5: 'bg-cat-5/15 active:bg-cat-5/25',
  6: 'bg-cat-6/15 active:bg-cat-6/25',
  7: 'bg-cat-7/15 active:bg-cat-7/25',
  8: 'bg-cat-8/15 active:bg-cat-8/25',
  9: 'bg-cat-9/15 active:bg-cat-9/25',
  10: 'bg-cat-10/15 active:bg-cat-10/25',
}

export const SOLIDO: Record<ColorCategoria, string> = {
  1: 'bg-cat-1',
  2: 'bg-cat-2',
  3: 'bg-cat-3',
  4: 'bg-cat-4',
  5: 'bg-cat-5',
  6: 'bg-cat-6',
  7: 'bg-cat-7',
  8: 'bg-cat-8',
  9: 'bg-cat-9',
  10: 'bg-cat-10',
}

export const NOMBRES_COLOR: [ColorCategoria, string][] = [
  [1, 'Tomate'],
  [2, 'Mandarina'],
  [3, 'Mostaza'],
  [4, 'Oliva'],
  [5, 'Eucalipto'],
  [6, 'Pizarra'],
  [7, 'Lavanda'],
  [8, 'Uva'],
  [9, 'Rosa'],
  [10, 'Canela'],
]

// La selección no depende solo del color: borde de tinta 2px + ✓ (D-11, D-12)
export function CategoryGrid({
  categorias,
  value,
  onChange,
  legend = 'Categoría',
  onNueva,
}: {
  categorias: Categoria[]
  value: string | null
  onChange: (id: string) => void
  legend?: string
  onNueva?: () => void
}) {
  const name = useId()
  return (
    <fieldset>
      <legend className="mb-2 text-etiqueta">{legend}</legend>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {categorias.map((c) => (
          <label
            key={c.id}
            title={c.nombre}
            className={`relative flex min-h-20 flex-col items-center justify-center gap-1 rounded-tile border border-borde p-2 text-tinta has-[:checked]:border-2 has-[:checked]:border-tinta has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-acento ${FONDO[c.color]}`}
          >
            <input
              type="radio"
              className="sr-only"
              name={name}
              value={c.id}
              checked={value === c.id}
              onChange={() => onChange(c.id)}
            />
            <span aria-hidden="true" className="text-emoji">
              {c.emoji}
            </span>
            <span className="line-clamp-2 text-center text-etiqueta">{c.nombre}</span>
            {value === c.id && (
              <span aria-hidden="true" className="absolute top-1 right-2 text-etiqueta">
                ✓
              </span>
            )}
          </label>
        ))}
        {onNueva && (
          <button
            type="button"
            aria-label="Nueva categoría"
            onClick={onNueva}
            className="flex min-h-20 flex-col items-center justify-center gap-1 rounded-tile border border-dashed border-borde bg-transparent p-2 active:bg-papel-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento"
          >
            <span aria-hidden="true" className="text-emoji text-tinta-2">
              ＋
            </span>
            <span className="text-etiqueta text-tinta">Nueva</span>
          </button>
        )}
      </div>
    </fieldset>
  )
}
