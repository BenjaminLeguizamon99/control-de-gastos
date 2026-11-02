import type { CategoryApi } from '../api/types'
import type { Categoria, ColorCategoria } from '../components/ui/CategoryGrid'

export const aCategoria = (c: CategoryApi): Categoria => ({
  id: c.id,
  nombre: c.name,
  emoji: c.emoji,
  color: c.color as ColorCategoria,
  esOtros: c.is_fallback,
})

// "Otros" se reconoce por esOtros y no por nombre: se puede renombrar (D-14)
export const ordenar = (cs: Categoria[]) =>
  cs.toSorted((a, b) => Number(!!a.esOtros) - Number(!!b.esOtros) || a.nombre.localeCompare(b.nombre, 'es'))

// Empate -> el número más bajo (D-13)
export function colorMenosUsado(cs: Categoria[]): ColorCategoria {
  const usos = Array<number>(11).fill(0)
  cs.forEach((c) => usos[c.color]++)
  let mejor = 1
  for (let c = 2; c <= 10; c++) if (usos[c] < usos[mejor]) mejor = c
  return mejor as ColorCategoria
}

const GRAFEMAS = new Intl.Segmenter('es', { granularity: 'grapheme' })

// Solo UX; el backend decide (D-12). Banderas y keycaps (1️⃣) no son Extended_Pictographic
export const esUnEmoji = (s: string) =>
  [...GRAFEMAS.segment(s)].length === 1 && /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20E3/u.test(s)

export const EMOJIS = [
  '🍔', '🍕', '☕', '🛒', '🍺', '🚌', '🚕', '⛽', '🚗', '🏠',
  '💡', '📱', '💻', '📺', '🎮', '🎬', '🎉', '⚽', '🏋️', '👕',
  '👟', '💊', '🏥', '💇', '🐶', '🎁', '📚', '✈️', '🎓', '📦',
]

export const CATEGORIA_FALTA = 'Elegí una categoría.'
export const CATEGORIA_DUPLICADA = 'Ya tenés una categoría con ese nombre.'
export const NOMBRE_FALTA = 'Ponele un nombre a la categoría.'
export const EMOJI_FALTA = 'Elegí un emoji.'
export const EMOJI_INVALIDO = 'Tiene que ser un solo emoji.'
export const CATEGORIA_RED =
  'No pudimos guardar la categoría. Revisá tu conexión y volvé a tocar "Guardar categoría".'
