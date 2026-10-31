import { useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, Outlet, useMatch, useNavigate } from 'react-router'
import { Button } from '../components/ui/Button'
import { useAuth } from '../features/auth/AuthProvider'
import { supabase } from '../lib/supabase'

export function ProtectedLayout() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  // Hook antes del return temprano; el FAB no va dentro del propio formulario (D-02)
  const enForm = useMatch('/gasto/nuevo')

  if (!session) return <Navigate to="/login" replace />

  async function logout() {
    // scope local: no cierra la sesión de los otros dispositivos (Pitfall 5)
    await supabase.auth.signOut({ scope: 'local' })
    queryClient.clear()
    navigate('/login')
  }

  return (
    <div className="min-h-dvh pb-[env(safe-area-inset-bottom)] text-tinta">
      <header className="flex h-14 items-center justify-between bg-papel-2 px-4">
        <span className="font-semibold">Control de Gastos</span>
        <Button variant="secundario" onClick={logout}>
          Cerrar sesión
        </Button>
      </header>
      <Outlet />
      {!enForm && (
        <Link
          to="/gasto/nuevo"
          aria-label="Cargar gasto"
          className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] inline-flex size-14 items-center justify-center rounded-full bg-acento text-sobre-acento text-titulo font-casual hover:bg-acento-fuerte active:bg-acento-fuerte focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento"
        >
          +
        </Link>
      )}
    </div>
  )
}
