import { supabase } from '../lib/supabase'

export class ApiError extends Error {
  status: number
  constructor(status: number) {
    super(`HTTP ${status}`)
    this.status = status
  }
}

export async function api<T>(path: string): Promise<T> {
  // getSession en cada llamada: devuelve el token ya refrescado por supabase-js
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  const res = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new ApiError(res.status)
  return res.json() as Promise<T>
}
