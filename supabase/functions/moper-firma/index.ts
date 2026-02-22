import { supabase, ok, err, CORS_HEADERS } from '../_shared/supabase.ts'

const VALID = ['conformidad', 'rh', 'gerente', 'control']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST') return err('Método no permitido', 405)
  try {
    const body = await req.json()
    const { id, tipo, imagen } = body ?? {}
    if (!VALID.includes(tipo) || !imagen?.startsWith?.('data:image/')) {
      return err('tipo e imagen (data URL) requeridos', 400)
    }
    const col = `firma_${tipo === 'conformidad' ? 'conformidad' : tipo === 'rh' ? 'rh' : tipo === 'gerente' ? 'gerente' : 'control'}_at`
    const colNombre = col.replace('_at', '_nombre')
    const colImagen = col.replace('_at', '_imagen')
    const nombreFirma = 'Firma manuscrita'

    const { data: row, error: getErr } = await supabase
      .from('moper_registros')
      .select('folio, firma_conformidad_at')
      .eq('id', id)
      .single()
    if (getErr || !row) return err('Registro no encontrado', 404)
    if (tipo === 'conformidad' && !row.firma_conformidad_at && row.folio == null) {
      const { data: num, error: rpcErr } = await supabase.rpc('get_next_folio_number')
      if (rpcErr) throw rpcErr
      const folio = `SPT/No. ${String(num ?? 280).padStart(4, '0')}/MOP`
      const { error: upErr } = await supabase
        .from('moper_registros')
        .update({
          folio,
          [col]: new Date().toISOString(),
          [colNombre]: nombreFirma,
          [colImagen]: imagen,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
      if (upErr) throw upErr
    } else {
      const { error: upErr } = await supabase
        .from('moper_registros')
        .update({
          [col]: new Date().toISOString(),
          [colNombre]: nombreFirma,
          [colImagen]: imagen,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
      if (upErr) throw upErr
    }

    const { data: updated, error: selErr } = await supabase
      .from('moper_registros')
      .select('folio, firma_conformidad_at, firma_rh_at, firma_gerente_at, firma_control_at')
      .eq('id', id)
      .single()
    if (selErr) throw selErr
    const completado = !!(updated?.firma_conformidad_at && updated?.firma_rh_at && updated?.firma_gerente_at && updated?.firma_control_at)
    if (completado) {
      await supabase.from('moper_registros').update({ completado: true }).eq('id', id)
    }
    return ok({ ok: true, completado, folio: updated?.folio ?? null })
  } catch (e) {
    return err('Error al registrar firma', 500, (e as Error).message)
  }
})
