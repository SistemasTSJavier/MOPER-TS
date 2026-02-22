import { supabase, ok, err, CORS_HEADERS } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  try {
    const { data, error } = await supabase.from('folio_sequence').select('last_number').eq('id', 1).single()
    if (error) throw error
    const next = (Number(data?.last_number ?? 279) + 1)
    const folio = `SPT/No. ${String(next).padStart(4, '0')}/MOP`
    return ok({ folio })
  } catch (e) {
    return err('Error al obtener folio', 500, (e as Error).message)
  }
})
