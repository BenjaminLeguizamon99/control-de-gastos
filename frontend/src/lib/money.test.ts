import { describe, expect, it } from 'vitest'
import {
  aCentavos,
  deCentavos,
  estadoRestante,
  formatMonto,
  formatMontoEditable,
  montoTexto,
  parseMontoInput,
  porcentajeUsado,
} from './money'

// Intl separa "$" de la cifra con U+00A0 (Pitfall 3)
const S = ' '

describe('formatMonto', () => {
  it.each([
    ['125430.00', `$${S}125.430`, null],
    ['125430.50', `$${S}125.430`, ',50'],
    ['125430.5', `$${S}125.430`, ',50'],
    ['0', `$${S}0`, null],
    ['0.1', `$${S}0`, ',10'],
    ['-15000', `-$${S}15.000`, null],
    ['12345678901234567.89', `$${S}12.345.678.901.234.567`, ',89'],
    ['abc', '—', null],
    ['', '—', null],
  ])('%s', (value, entero, centavos) => {
    expect(formatMonto(value)).toEqual({ entero, centavos })
  })
})

describe('montoTexto / formatMontoEditable', () => {
  it('montoTexto une entero y centavos', () => {
    expect(montoTexto('174999.50')).toBe(`$${S}174.999,50`)
  })

  it.each([
    ['125430.5', '125.430,50'],
    ['125430', '125.430'],
    ['', ''],
  ])('formatMontoEditable(%s)', (value, expected) => {
    expect(formatMontoEditable(value)).toBe(expected)
  })
})

describe('parseMontoInput', () => {
  it.each([
    ['1.234,5', '1.234,5', '1234.5'],
    ['0,99', '0,99', '0.99'],
    ['12,345', '12,34', '12.34'],
    ['abc', '', ''],
    ['1,2,3', '1,23', '1.23'],
    ['1.', '1,', '1'],
    ['1.2345', '12.345', '12345'],
    ['1.234', '1.234', '1234'],
    [',5', '0,5', '0.5'],
    ['007', '7', '7'],
    ['0', '0', '0'],
    ['', '', ''],
  ])('%s', (raw, display, value) => {
    expect(parseMontoInput(raw)).toEqual({ display, value })
  })

  it('"1.500" tipeado de a una tecla termina en 1,50', () => {
    let display = ''
    let last = { display: '', value: '' }
    for (const tecla of '1.500') {
      last = parseMontoInput(display + tecla)
      display = last.display
    }
    expect(last).toEqual({ display: '1,50', value: '1.50' })
  })
})

describe('aCentavos / deCentavos', () => {
  it.each([
    ['25000.5', 2500050n],
    ['-0.01', -1n],
    ['80000', 8000000n],
  ])('aCentavos(%s)', (value, expected) => {
    expect(aCentavos(value)).toBe(expected)
  })

  it.each([
    [17499950n, '174999.50'],
    [8000000n, '80000'],
    [-1500000n, '-15000'],
  ])('deCentavos(%s)', (c, expected) => {
    expect(deCentavos(c)).toBe(expected)
  })
})

describe('estadoRestante', () => {
  it.each([
    ['80000', '200000', 'normal'],
    ['40000', '200000', 'normal'],
    ['39999.99', '200000', 'cerca'],
    ['25000.50', '200000', 'cerca'],
    ['0', '200000', 'cerca'],
    ['-0.01', '200000', 'pasado'],
    ['-15000', '200000', 'pasado'],
    ['0', '0', 'cerca'],
    ['100', '0', 'normal'],
  ])('(%s, %s) → %s', (restante, presupuesto, expected) => {
    expect(estadoRestante(restante, presupuesto)).toBe(expected)
  })
})

describe('porcentajeUsado', () => {
  it.each([
    ['80000', '200000', 60],
    ['25000.50', '200000', 87],
    ['-15000', '200000', 100],
    ['200000', '200000', 0],
    ['0', '0', 100],
  ])('(%s, %s) → %s', (restante, presupuesto, expected) => {
    expect(porcentajeUsado(restante, presupuesto)).toBe(expected)
  })
})
