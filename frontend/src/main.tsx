import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { router } from './app/router'
import { AuthProvider, useAuth } from './features/auth/AuthProvider'
import './index.css'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } })

// Hasta que supabase-js resuelve la sesión: evita el parpadeo del login
function App() {
  const { loading } = useAuth()
  if (loading)
    return <div className="flex min-h-dvh items-center justify-center text-tinta">Cargando…</div>
  return <RouterProvider router={router} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
