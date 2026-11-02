// Montos siempre como string (así los manda Pydantic); las cuentas van en BigInt de centavos, nunca float

export const UMBRAL_CERCA = 20
export const MONTO_VACIO = 'Ingresá un monto mayor a $ 0.'
export const MONTO_DECIMALES = 'El monto puede tener hasta 2 decimales.'
export const MONTO_MAXIMO = 'El monto no puede superar $ 1.000.000.000.'

// Mismo tope que ExpenseCreate en el backend; además mantiene el Number() del POST por debajo de 2^53
const MAX_CENTAVOS = 100_000_000_000n

const MONTO_VALIDO = /^-?\d+(\.\d{1,2})?$/
const MONEDA = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  trailingZeroDisplay: 'stripIfInteger',
})
const MILES = new Intl.NumberFormat('es-AR')

function unir(parts: Intl.NumberFormatPart[]): string {
  return parts.map((p) => p.value).join('')
}

export function formatMonto(value: string): { entero: string; centavos: string | null } {
  // Validar antes de Intl: un string inválido daría "$ NaN"
  if (!MONTO_VALIDO.test(value)) return { entero: '—', centavos: null }
  // Intl acepta el string decimal exacto, sin pasar por float
  const parts = MONEDA.formatToParts(value as `${number}`)
  const i = parts.findIndex((p) => p.type === 'decimal')
  if (i < 0) return { entero: unir(parts), centavos: null }
  return { entero: unir(parts.slice(0, i)), centavos: unir(parts.slice(i)) }
}

export function montoTexto(value: string): string {
  const { entero, centavos } = formatMonto(value)
  return entero + (centavos ?? '')
}

export function formatMontoEditable(value: string): string {
  if (value === '') return ''
  return montoTexto(value).replace(/^\$ /, '')
}

export function parseMontoInput(raw: string): { display: string; value: string } {
  // Con coma, los puntos son los separadores de miles del display propio.
  // Sin coma, un "." al final es la coma decimal (teclados que solo traen punto).
  // shortcut: un "." en medio del texto se descarta porque el caret va siempre al final; si se permite editar en el medio, recalcular el caret contando dígitos
  let s = raw.includes(',')
    ? raw.replaceAll('.', '')
    : raw.endsWith('.')
      ? `${raw.slice(0, -1).replaceAll('.', '')},`
      : raw.replaceAll('.', '')
  s = s.replace(/[^\d,]/g, '')
  if (s === '') return { display: '', value: '' }

  const coma = s.indexOf(',')
  const entero = (coma < 0 ? s : s.slice(0, coma)).replace(/^0+(?=\d)/, '') || '0'
  const fraccion = coma < 0 ? null : s.slice(coma + 1).replaceAll(',', '').slice(0, 2)

  return {
    display: MILES.format(BigInt(entero)) + (fraccion === null ? '' : `,${fraccion}`),
    value: entero + (fraccion ? `.${fraccion}` : ''),
  }
}

export function aCentavos(value: string): bigint {
  const negativo = value.startsWith('-')
  const [entero, fraccion = ''] = (negativo ? value.slice(1) : value).split('.')
  const c = BigInt(entero) * 100n + BigInt(fraccion.padEnd(2, '0'))
  return negativo ? -c : c
}

export function errorMonto(monto: string): string | undefined {
  if (monto === '' || aCentavos(monto) <= 0n) return MONTO_VACIO
  if ((monto.split('.')[1] ?? '').length > 2) return MONTO_DECIMALES
  if (aCentavos(monto) > MAX_CENTAVOS) return MONTO_MAXIMO
}

export function deCentavos(c: bigint): string {
  const negativo = c < 0n
  const abs = negativo ? -c : c
  const fraccion = abs % 100n
  return `${negativo ? '-' : ''}${abs / 100n}${fraccion ? `.${String(fraccion).padStart(2, '0')}` : ''}`
}

export type EstadoRestante = 'normal' | 'cerca' | 'pasado'

export function estadoRestante(restante: string, presupuesto: string): EstadoRestante {
  const r = aCentavos(restante)
  const p = aCentavos(presupuesto)
  if (r < 0n) return 'pasado'
  if (r === 0n) return 'cerca'
  if (r * 100n < p * BigInt(UMBRAL_CERCA)) return 'cerca'
  return 'normal'
}

export function porcentajeUsado(restante: string, presupuesto: string): number {
  const p = aCentavos(presupuesto)
  if (p <= 0n) return 100
  const usado = ((p - aCentavos(restante)) * 100n) / p
  const acotado = usado < 0n ? 0n : usado > 100n ? 100n : usado
  // Ya es un entero 0..100 calculado en BigInt; pasarlo a number no pierde nada
  return Number(acotado)
}
