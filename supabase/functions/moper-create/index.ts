import { supabase, created, err, CORS_HEADERS } from '../_shared/supabase.ts'

function toDateOnly(s: string | null | undefined): string | null {
  if (s == null || typeof s !== 'string') return null
  const t = s.trim()
  if (!t) return null
  const m = t.match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST') return err('Método no permitido', 405)
  try {
    const body = await req.json()
    if (!body || typeof body !== 'object') return err('Cuerpo inválido (JSON esperado)', 400)
    const curp = (body.curp ?? '').trim().slice(0, 18) || null
    const { data, error } = await supabase
      .from('moper_registros')
      .insert({
        folio: null,
        oficial_id: null,
        oficial_nombre: (body.oficial_nombre ?? '').trim() || null,
        curp,
        fecha_ingreso: toDateOnly(body.fecha_ingreso) || null,
        fecha_inicio_efectiva: toDateOnly(body.fecha_inicio_efectiva) || null,
        servicio_actual_id: null,
        servicio_nuevo_id: null,
        puesto_actual_id: null,
        puesto_nuevo_id: null,
        servicio_actual_nombre: (body.servicio_actual_nombre ?? '').trim() || null,
        servicio_nuevo_nombre: (body.servicio_nuevo_nombre ?? '').trim() || null,
        puesto_actual_nombre: (body.puesto_actual_nombre ?? '').trim() || null,
        puesto_nuevo_nombre: (body.puesto_nuevo_nombre ?? '').trim() || null,
        sueldo_actual: body.sueldo_actual ?? null,
        sueldo_nuevo: body.sueldo_nuevo ?? 0,
        motivo: (body.motivo ?? '').trim() || '',
      })
      .select('id')
      .single()
    if (error) throw error
    if (!data?.id) return err('Error al guardar registro', 500)
    return created({ id: data.id, folio: null })
  } catch (e) {
    return err('Error al guardar registro', 500, (e as Error).message)
  }
})
