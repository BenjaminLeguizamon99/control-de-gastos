export const NETWORK_ERROR =
  'No pudimos conectar con el servidor. Revisá tu conexión y tocá "Reintentar".'

const TOO_MANY = 'Demasiados intentos. Esperá unos minutos y volvé a probar.'

// Copy de UI-SPEC (es-AR). Claves = error.code de supabase-js.
const MESSAGES: Record<string, string> = {
  invalid_credentials: 'Email o contraseña incorrectos. Revisalos e intentá de nuevo.',
  otp_expired: 'El código es incorrecto o venció. Pedí uno nuevo con "Reenviar código".',
  over_email_send_rate_limit: TOO_MANY,
  over_request_rate_limit: TOO_MANY,
  weak_password: 'Usá al menos 8 caracteres.',
  same_password: 'La contraseña nueva tiene que ser distinta de la actual.',
}

export function authErrorMessage(code: string | undefined): string {
  // Object.hasOwn evita que "toString" & co. devuelvan funciones del prototipo
  return code && Object.hasOwn(MESSAGES, code) ? MESSAGES[code] : NETWORK_ERROR
}
