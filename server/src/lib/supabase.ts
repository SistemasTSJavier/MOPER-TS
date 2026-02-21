import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * Cliente de Supabase para el backend (usa service role para operaciones de servidor).
 * Úsalo para Auth, Realtime, Storage o consultas con PostgREST.
 */
export const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null
