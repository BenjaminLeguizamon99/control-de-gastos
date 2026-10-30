import { describe, expect, it } from 'vitest'
import { AUTH_NETWORK_ERROR, authErrorMessage, GENERIC_ERROR, NETWORK_ERROR } from './authErrors'

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

  it('no code (no response) gets AUTH_NETWORK_ERROR, without "Reintentar"', () => {
    expect(authErrorMessage(undefined)).toBe(AUTH_NETWORK_ERROR)
    expect(AUTH_NETWORK_ERROR).not.toContain('Reintentar')
  })

  it.each([['email_not_confirmed'], ['toString']])('unmapped code %s gets GENERIC_ERROR', (code) => {
    expect(authErrorMessage(code)).toBe(GENERIC_ERROR)
  })
})
