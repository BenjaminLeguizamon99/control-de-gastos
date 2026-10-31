import { describe, expect, it } from 'vitest'
import { ayer, hoyART } from './fecha'

describe('hoyART', () => {
  it.each([
    ['2026-11-01T01:30:00Z', '2026-10-31'], // 31/10 22:30 ART
    ['2026-10-31T03:00:00Z', '2026-10-31'],
    ['2026-10-31T02:59:00Z', '2026-10-30'],
  ])('%s → %s', (instante, expected) => {
    expect(hoyART(new Date(instante))).toBe(expected)
  })
})

describe('ayer', () => {
  it.each([
    ['2026-03-01', '2026-02-28'],
    ['2024-03-01', '2024-02-29'],
    ['2027-01-01', '2026-12-31'],
  ])('%s → %s', (iso, expected) => {
    expect(ayer(iso)).toBe(expected)
  })
})
