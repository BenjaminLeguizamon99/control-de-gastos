import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { ApiError, api } from '../api/client'
import { Button } from '../components/ui/Button'
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
    <main className="mx-auto mt-8 max-w-sm px-4 pb-24 sm:mt-12">
      <h1 className="mb-6 text-titulo font-casual">Sesión iniciada</h1>
      <p>Entraste como {session?.user.email}.</p>
      {isPending && <p className="mt-4">Cargando…</p>}
      {data && <p className="mt-4">ID de usuario: {data.user_id}</p>}
      {denied && (
        <p role="alert" className="mt-4 text-etiqueta font-normal text-peligro">
          Tu cuenta no tiene acceso. Cerrá sesión e ingresá con otra.
        </p>
      )}
      {error && !denied && (
        <div className="mt-4">
          <p role="alert" className="mb-4 text-etiqueta font-normal text-peligro">
            {NETWORK_ERROR}
          </p>
          <Button variant="secundario" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      )}
      <Link
        to="/categorias"
        className="mt-4 inline-flex min-h-11 items-center text-cuerpo text-acento focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento"
      >
        Editar categorías
      </Link>
    </main>
  )
}
