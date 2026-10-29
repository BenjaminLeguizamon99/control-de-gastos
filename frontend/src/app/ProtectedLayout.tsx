import { useQueryClient } from '@tanstack/react-query'
import { Navigate, Outlet, useNavigate } from 'react-router'
import { useAuth } from '../features/auth/AuthProvider'
import { supabase } from '../lib/supabase'

export function ProtectedLayout() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  if (!session) return <Navigate to="/login" replace />

  async function logout() {
    // scope local: no cierra la sesión de los otros dispositivos (Pitfall 5)
    await supabase.auth.signOut({ scope: 'local' })
    queryClient.clear()
    navigate('/login')
  }

  return (
    <div className="min-h-dvh pb-[env(safe-area-inset-bottom)] text-zinc-900">
      <header className="flex h-14 items-center justify-between bg-zinc-100 px-4">
        <span className="font-semibold">Control de Gastos</span>
        <button
          type="button"
          onClick={logout}
          className="min-h-11 rounded border border-zinc-300 px-4 text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          Cerrar sesión
        </button>
      </header>
      <Outlet />
    </div>
  )
}
