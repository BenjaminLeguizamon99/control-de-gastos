export const NETWORK_ERROR =
  'No pudimos conectar con el servidor. Revisá tu conexión y tocá "Reintentar".'

// Login y recuperación no tienen botón "Reintentar": se reenvía el mismo formulario
export const AUTH_NETWORK_ERROR =
  'No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo.'

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

export const GENERIC_ERROR = 'Algo salió mal. Intentá de nuevo en unos minutos.'

export function authErrorMessage(code: string | undefined): string {
  // Sin code = no hubo respuesta del servidor; con code no mapeado = error real de Supabase
  if (!code) return AUTH_NETWORK_ERROR
  // Object.hasOwn evita que "toString" & co. devuelvan funciones del prototipo
  return Object.hasOwn(MESSAGES, code) ? MESSAGES[code] : GENERIC_ERROR
}
