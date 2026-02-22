import { supabase, ok, err, CORS_HEADERS } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return err('Falta id', 400)
  try {
    const { data, error } = await supabase
      .from('moper_registros')
      .select('id, folio, fecha_hora, fecha_inicio_efectiva, oficial_nombre, curp, fecha_ingreso, servicio_actual_nombre, servicio_nuevo_nombre, puesto_actual_nombre, puesto_nuevo_nombre, sueldo_actual, sueldo_nuevo, motivo, firma_conformidad_at, firma_conformidad_nombre, firma_conformidad_imagen, firma_rh_at, firma_rh_nombre, firma_rh_imagen, firma_gerente_at, firma_gerente_nombre, firma_gerente_imagen, firma_control_at, firma_control_nombre, firma_control_imagen, completado')
      .eq('id', id)
      .single()
    if (error) {
      if (error.code === 'PGRST116') return err('No encontrado', 404)
      throw error
    }
    return ok(data)
  } catch (e) {
    return err('Error al obtener registro', 500, (e as Error).message)
  }
})
