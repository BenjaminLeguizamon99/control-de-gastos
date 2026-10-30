import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { z } from 'zod'
import { Button } from '../../components/ui/Button'
import { supabase } from '../../lib/supabase'
import { authErrorMessage } from './authErrors'

const emailSchema = z.email()

const inputBase =
  'w-full min-h-12 rounded-control border bg-papel-2 px-4 text-cuerpo text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento'

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
    <main className="min-h-dvh px-4 pb-[env(safe-area-inset-bottom)] text-tinta">
      <div className="mx-auto mt-8 max-w-sm sm:mt-12">
        <h1 className="mb-6 text-titulo font-casual">Iniciar sesión</h1>
        <form onSubmit={onSubmit} noValidate>
          <div className="mb-4">
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
              aria-invalid={emailError ? true : undefined}
              aria-describedby={emailError ? 'email-error' : undefined}
              className={`${inputBase} ${emailError ? 'border-peligro' : 'border-borde'}`}
            />
            {emailError && (
              <p id="email-error" role="alert" className="mt-1 text-etiqueta font-normal text-peligro">
                {emailError}
              </p>
            )}
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="mb-2 block text-etiqueta">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputBase} border-borde`}
            />
            <Link
              to="/recuperar"
              className="inline-flex min-h-11 items-center py-2 text-etiqueta font-normal text-acento focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento"
            >
              Olvidé mi contraseña
            </Link>
          </div>
          {serverError && (
            <p role="alert" className="mb-4 text-etiqueta font-normal text-peligro">
              {serverError}
            </p>
          )}
          <Button variant="primario" type="submit" fullWidth loading={submitting} loadingLabel="Ingresando…">
            Ingresar
          </Button>
        </form>
      </div>
    </main>
  )
}
