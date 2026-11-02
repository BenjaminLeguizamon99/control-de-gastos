import { describe, expect, it } from 'vitest'
import type { Categoria, ColorCategoria } from '../components/ui/CategoryGrid'
import { aCategoria, colorMenosUsado, esUnEmoji, ordenar } from './categorias'

const cat = (nombre: string, color: ColorCategoria = 1, esOtros = false): Categoria => ({
  id: nombre,
  emoji: '🍔',
  nombre,
  color,
  esOtros,
})

describe('aCategoria', () => {
  it('mapea la respuesta de la API', () => {
    expect(aCategoria({ id: 'x', name: 'Comida', emoji: '🍔', color: 1, is_fallback: false })).toEqual({
      id: 'x',
      nombre: 'Comida',
      emoji: '🍔',
      color: 1,
      esOtros: false,
    })
  })
})

describe('ordenar', () => {
  it('alfabético es y Otros al final aunque se renombre', () => {
    const cs = [cat('Transporte'), cat('Aaa', 1, true), cat('Árbol'), cat('Bebidas')]
    expect(ordenar(cs).map((c) => c.nombre)).toEqual(['Árbol', 'Bebidas', 'Transporte', 'Aaa'])
  })
})

describe('colorMenosUsado', () => {
  const conColores = (colores: number[]) => colores.map((c, i) => cat(`c${i}`, c as ColorCategoria))
  it.each([
    [[], 1],
    [[1, 5, 3, 7, 2, 6, 10], 4],
    [[1, 1, 2], 3],
    [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 1], 2],
  ])('%j → %s', (colores, expected) => {
    expect(colorMenosUsado(conColores(colores))).toBe(expected)
  })
})

describe('esUnEmoji', () => {
  it.each([
    ['🍔', true],
    ['👨‍👩‍👧', true],
    ['✈️', true],
    ['🇦🇷', true],
    ['1️⃣', true],
    ['#️⃣', true],
    ['🍔🍕', false],
    ['a', false],
    ['', false],
    ['1', false],
  ])('%s → %s', (s, expected) => {
    expect(esUnEmoji(s)).toBe(expected)
  })
})
