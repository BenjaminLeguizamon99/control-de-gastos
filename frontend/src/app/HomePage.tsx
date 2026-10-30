import { useQuery } from '@tanstack/react-query'
import { ApiError, api } from '../api/client'
import { useAuth } from '../features/auth/AuthProvider'
import { NETWORK_ERROR } from '../features/auth/authErrors'

export function HomePage() {
  const { session } = useAuth()
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<{ user_id: string }>('/me'),
  })

  // Solo 403 es falta de acceso; un 401 ya se reintentó con el token refrescado en api()
  const denied = error instanceof ApiError && error.status === 403

  return (
    <main className="mx-auto mt-8 max-w-sm px-4 sm:mt-12">
      <h1 className="mb-6 text-2xl leading-tight font-semibold">Sesión iniciada</h1>
      <p>Entraste como {session?.user.email}.</p>
      {isPending && <p className="mt-4">Cargando…</p>}
      {data && <p className="mt-4">ID de usuario: {data.user_id}</p>}
      {denied && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          Tu cuenta no tiene acceso. Cerrá sesión e ingresá con otra.
        </p>
      )}
      {error && !denied && (
        <div className="mt-4">
          <p role="alert" className="mb-4 text-sm text-red-600">
            {NETWORK_ERROR}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="min-h-11 rounded border border-zinc-300 px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            Reintentar
          </button>
        </div>
      )}
    </main>
  )
}
