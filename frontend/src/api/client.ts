import { supabase } from '../lib/supabase'

// Sin esto, "undefined/me" cae en el fallback SPA (index.html con 200) y parece un error de red
const API_URL = import.meta.env.VITE_API_URL?.replace(/\/+$/, '')
if (!API_URL) throw new Error('Falta VITE_API_URL (ver frontend/.env.example)')

export class ApiError extends Error {
  status: number
  constructor(status: number) {
    super(`HTTP ${status}`)
    this.status = status
  }
}

interface ApiInit {
  method?: 'GET' | 'POST' | 'PUT'
  body?: unknown
}

function request(path: string, token: string | undefined, init?: ApiInit): Promise<Response> {
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
  const hasBody = init?.body !== undefined
  if (hasBody) headers['Content-Type'] = 'application/json'
  return fetch(`${API_URL}${path}`, {
    headers,
    ...(init?.method && { method: init.method }),
    ...(hasBody && { body: JSON.stringify(init.body) }),
  })
}

export async function api<T>(path: string, init?: ApiInit): Promise<T> {
  // getSession en cada llamada: devuelve el token ya refrescado por supabase-js
  const { data } = await supabase.auth.getSession()
  let res = await request(path, data.session?.access_token, init)
  if (res.status === 401) {
    // Token vencido (sleep del equipo, reloj corrido): refrescar y reintentar una vez
    const { data: refreshed } = await supabase.auth.refreshSession()
    if (refreshed.session) res = await request(path, refreshed.session.access_token, init)
  }
  if (!res.ok) throw new ApiError(res.status)
  return res.json() as Promise<T>
}
