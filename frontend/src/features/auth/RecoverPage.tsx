import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { z } from 'zod'
import { Button } from '../../components/ui/Button'
import { supabase } from '../../lib/supabase'
import { authErrorMessage } from './authErrors'

const emailSchema = z.email()
const codeSchema = z.string().regex(/^\d{6}$/)
const passwordSchema = z.string().min(8)
const RATE_LIMITS = ['over_email_send_rate_limit', 'over_request_rate_limit']

const inputBase =
  'w-full min-h-12 rounded-control border bg-papel-2 px-4 text-cuerpo text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento'
const linkClass =
  'inline-flex min-h-11 items-center py-2 text-etiqueta font-normal text-acento focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento'

export function RecoverPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  // verifyOtp ya creó la sesión: si updateUser falla se reintenta solo la contraseña (Pitfall 7)
  const [verified, setVerified] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Devuelve true si hay que quedarse (rate limit); cualquier otro resultado no revela si el email existe
  async function sendCode(): Promise<boolean> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim())
      if (error?.code && RATE_LIMITS.includes(error.code)) {
        setServerError(authErrorMessage(error.code))
        return true
      }
    } catch {
      // Error de red: igual avanzamos, el usuario puede usar "Reenviar código"
    }
    return false
  }

  async function onRequest(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setServerError(null)
    if (!emailSchema.safeParse(email.trim()).success) {
      setFieldErrors({ email: 'Ingresá un email válido.' })
      return
    }
    setFieldErrors({})
    setSubmitting(true)
    const blocked = await sendCode()
    setSubmitting(false)
    if (!blocked) setStep(2)
  }

  async function onResend() {
    setServerError(null)
    await sendCode()
  }

  async function onChange(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setServerError(null)
    const errors: Record<string, string> = {}
    if (!verified && !codeSchema.safeParse(code).success) errors.code = 'El código tiene 6 dígitos.'
    if (!passwordSchema.safeParse(password).success) errors.password = 'Usá al menos 8 caracteres.'
    setFieldErrors(errors)
    if (Object.keys(errors).length) return
    setSubmitting(true)
    try {
      if (!verified) {
        const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code, type: 'recovery' })
        if (error) {
          setServerError(authErrorMessage(error.code))
          return
        }
        setVerified(true)
      }
      const { error } = await supabase.auth.updateUser({ password })
      if (error) setServerError(authErrorMessage(error.code))
      else navigate('/')
    } catch {
      setServerError(authErrorMessage(undefined))
    } finally {
      setSubmitting(false)
    }
  }

  function fieldProps(name: string) {
    const err = fieldErrors[name]
    return {
      'aria-invalid': err ? true : undefined,
      'aria-describedby': err ? `${name}-error` : undefined,
      className: `${inputBase} ${err ? 'border-peligro' : 'border-borde'}`,
    }
  }

  function fieldError(name: string) {
    const err = fieldErrors[name]
    return (
      err && (
        <p id={`${name}-error`} role="alert" className="mt-1 text-etiqueta font-normal text-peligro">
          {err}
        </p>
      )
    )
  }

  return (
    <main className="min-h-dvh px-4 pb-[env(safe-area-inset-bottom)] text-tinta">
      <div className="mx-auto mt-8 max-w-sm sm:mt-12">
        <h1 className="mb-2 text-titulo font-casual">Recuperar contraseña</h1>
        {step === 1 ? (
          <form onSubmit={onRequest} noValidate>
            <p className="mb-6 text-etiqueta font-normal text-tinta-2">Te mandamos un código de 6 dígitos a tu email.</p>
            <div className="mb-6">
              <label htmlFor="email" className="mb-2 block text-etiqueta">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                inputMode="email"
                autoCapitalize="none"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                {...fieldProps('email')}
              />
              {fieldError('email')}
            </div>
            {serverError && (
              <p role="alert" className="mb-4 text-etiqueta font-normal text-peligro">
                {serverError}
              </p>
            )}
            <Button variant="primario" type="submit" fullWidth loading={submitting} loadingLabel="Enviando…">
              Enviar código
            </Button>
          </form>
        ) : (
          <form onSubmit={onChange} noValidate>
            <p className="mb-6 text-etiqueta font-normal text-tinta-2">Revisá tu email e ingresá el código que te llegó.</p>
            {!verified && (
              <div className="mb-4">
                <label htmlFor="code" className="mb-2 block text-etiqueta">
                  Código
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value.trim())}
                  {...fieldProps('code')}
                />
                {fieldError('code')}
                <button type="button" onClick={onResend} className={linkClass}>
                  Reenviar código
                </button>
              </div>
            )}
            <div className="mb-6">
              <label htmlFor="password" className="mb-2 block text-etiqueta">
                Contraseña nueva
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                {...fieldProps('password')}
              />
              {fieldError('password')}
            </div>
            {serverError && (
              <p role="alert" className="mb-4 text-etiqueta font-normal text-peligro">
                {serverError}
              </p>
            )}
            <Button variant="primario" type="submit" fullWidth loading={submitting} loadingLabel="Guardando…">
              Cambiar contraseña
            </Button>
          </form>
        )}
        <Link to="/login" className={`${linkClass} mt-4`}>
          Volver a iniciar sesión
        </Link>
      </div>
    </main>
  )
}
