import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { z } from 'zod'
import { supabase } from '../../lib/supabase'
import { authErrorMessage } from './authErrors'

const emailSchema = z.email()

const inputBase =
  'w-full min-h-11 rounded border px-4 text-base text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setServerError(null)
    if (!emailSchema.safeParse(email.trim()).success) {
      setEmailError('Ingresá un email válido.')
      return
    }
    setEmailError(null)
    setSubmitting(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) setServerError(authErrorMessage(error.code))
      else navigate('/')
    } catch {
      setServerError(authErrorMessage(undefined))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-dvh px-4 pb-[env(safe-area-inset-bottom)] text-zinc-900">
      <div className="mx-auto mt-8 max-w-sm sm:mt-12">
        <h1 className="mb-6 text-2xl leading-tight font-semibold">Iniciar sesión</h1>
        <form onSubmit={onSubmit} noValidate>
          <div className="mb-4">
            <label htmlFor="email" className="mb-2 block text-sm font-semibold">
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
              aria-invalid={emailError ? true : undefined}
              aria-describedby={emailError ? 'email-error' : undefined}
              className={`${inputBase} ${emailError ? 'border-red-600' : 'border-zinc-300'}`}
            />
            {emailError && (
              <p id="email-error" role="alert" className="mt-1 text-sm text-red-600">
                {emailError}
              </p>
            )}
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="mb-2 block text-sm font-semibold">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputBase} border-zinc-300`}
            />
            {/* El link "Olvidé mi contraseña" lo agrega 01-04 */}
          </div>
          {serverError && (
            <p role="alert" className="mb-4 text-sm text-red-600">
              {serverError}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="min-h-11 w-full rounded bg-blue-600 px-4 font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {submitting ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </main>
  )
}
