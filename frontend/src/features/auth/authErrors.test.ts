import { describe, expect, it } from 'vitest'
import { authErrorMessage, NETWORK_ERROR } from './authErrors'

describe('authErrorMessage', () => {
  it.each([
    ['invalid_credentials', 'Email o contraseña incorrectos. Revisalos e intentá de nuevo.'],
    ['otp_expired', 'El código es incorrecto o venció. Pedí uno nuevo con "Reenviar código".'],
    ['over_email_send_rate_limit', 'Demasiados intentos. Esperá unos minutos y volvé a probar.'],
    ['over_request_rate_limit', 'Demasiados intentos. Esperá unos minutos y volvé a probar.'],
    ['weak_password', 'Usá al menos 8 caracteres.'],
    ['same_password', 'La contraseña nueva tiene que ser distinta de la actual.'],
  ])('%s', (code, expected) => {
    expect(authErrorMessage(code)).toBe(expected)
  })

  it('NETWORK_ERROR copy', () => {
    expect(NETWORK_ERROR).toBe(
      'No pudimos conectar con el servidor. Revisá tu conexión y tocá "Reintentar".',
    )
  })

  it.each([[undefined], ['cualquier_otro'], ['toString']])('fallback for %s', (code) => {
    expect(authErrorMessage(code)).toBe(NETWORK_ERROR)
  })
})
