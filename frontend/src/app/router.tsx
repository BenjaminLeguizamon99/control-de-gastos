import type { ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router'
import { useAuth } from '../features/auth/AuthProvider'
import { LoginPage } from '../features/auth/LoginPage'
import { RecoverPage } from '../features/auth/RecoverPage'
import { HomePage } from './HomePage'
import { ProtectedLayout } from './ProtectedLayout'

function GuestOnly({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  return session ? <Navigate to="/" replace /> : children
}

// Sin alta de cuentas desde la app (D-06). /recuperar va sin guard: verifyOtp crea la sesión
// antes de updateUser y el guard desmontaría el formulario (Pitfall 7).
export const router = createBrowserRouter([
  { path: '/login', element: <GuestOnly><LoginPage /></GuestOnly> },
  { path: '/recuperar', element: <RecoverPage /> },
  { path: '/', element: <ProtectedLayout />, children: [{ index: true, element: <HomePage /> }] },
  { path: '*', element: <Navigate to="/" replace /> },
])
