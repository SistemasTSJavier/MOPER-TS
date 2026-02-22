import { supabase, ok, err, CORS_HEADERS } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  try {
    const [pend, aprob, listPend, listAprob] = await Promise.all([
      supabase.from('moper_registros').select('id', { count: 'exact', head: true }).is('completado', null).or('completado.eq.false'),
      supabase.from('moper_registros').select('id', { count: 'exact', head: true }).eq('completado', true),
      supabase.from('moper_registros').select('id, folio, oficial_nombre, fecha_hora, completado').is('completado', null).or('completado.eq.false').order('id', { ascending: false }).limit(50),
      supabase.from('moper_registros').select('id, folio, oficial_nombre, fecha_hora, completado').eq('completado', true).order('id', { ascending: false }).limit(50),
    ])
    const pendientes = pend.count ?? 0
    const aprobados = aprob.count ?? 0
    if (pend.error) throw pend.error
    if (aprob.error) throw aprob.error
    if (listPend.error) throw listPend.error
    if (listAprob.error) throw listAprob.error
    return ok({
      pendientes: Number(pendientes),
      aprobados: Number(aprobados),
      registrosPendientes: listPend.data ?? [],
      registrosAprobados: listAprob.data ?? [],
    })
  } catch (e) {
    return err('Error al listar registros', 500, (e as Error).message)
  }
})
