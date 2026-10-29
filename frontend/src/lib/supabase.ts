import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
if (!url || !key) throw new Error('Faltan variables VITE_* (ver frontend/.env.example)')

// Defaults: persistSession + autoRefreshToken = sesión indefinida hasta logout (D-08).
// Solo se usa supabase.auth.*; los datos pasan siempre por la API.
export const supabase = createClient(url, key)
