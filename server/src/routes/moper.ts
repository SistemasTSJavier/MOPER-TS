import { Router, Request, Response } from 'express'
import { query, getNextFolio } from '../db/index.js'
import { pgErrorDetail } from '../utils/pgError.js'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import type { AuthRequest } from '../middleware/auth.js'
import { generarCodigoAcceso } from '../utils/codigoAcceso.js'

const router = Router()

const SELECT_REGISTRO = `
  SELECT m.id, m.folio, m.fecha_hora, m.fecha_inicio_efectiva, m.created_at, m.codigo_acceso,
    m.fecha_llenado, m.fecha_registro,
    COALESCE(m.oficial_nombre, o.nombre) as oficial_nombre,
    COALESCE(m.curp, o.curp) as curp,
    COALESCE(m.fecha_ingreso::text, o.fecha_ingreso::text) as fecha_ingreso,
    COALESCE(m.servicio_actual_nombre, sa.nombre) as servicio_actual_nombre,
    COALESCE(m.servicio_nuevo_nombre, sn.nombre) as servicio_nuevo_nombre,
    COALESCE(m.puesto_actual_nombre, pa.nombre) as puesto_actual_nombre,
    COALESCE(m.puesto_nuevo_nombre, pn.nombre) as puesto_nuevo_nombre,
    m.sueldo_actual, m.sueldo_nuevo, m.motivo,
    m.creado_por, m.solicitado_por,
    m.firma_conformidad_at, m.firma_conformidad_nombre, m.firma_conformidad_imagen,
    m.firma_rh_at, m.firma_rh_nombre, m.firma_rh_imagen,
    m.firma_gerente_at, m.firma_gerente_nombre, m.firma_gerente_imagen,
    m.firma_control_at, m.firma_control_nombre, m.firma_control_imagen,
    m.completado
  FROM moper_registros m
  LEFT JOIN oficiales o ON o.id = m.oficial_id
  LEFT JOIN servicios sa ON sa.id = m.servicio_actual_id
  LEFT JOIN servicios sn ON sn.id = m.servicio_nuevo_id
  LEFT JOIN puestos pa ON pa.id = m.puesto_actual_id
  LEFT JOIN puestos pn ON pn.id = m.puesto_nuevo_id
`

interface MoperBody {
  oficial_nombre: string
  curp: string
  fecha_ingreso: string | null
  fecha_inicio_efectiva: string
  servicio_actual_nombre: string
  servicio_nuevo_nombre: string
  puesto_actual_nombre: string
  puesto_nuevo_nombre: string
  sueldo_actual: number | null
  sueldo_nuevo: number
  motivo: string
  creado_por?: string
  solicitado_por?: string
  fecha_llenado?: string
  fecha_registro?: string
  asignar_folio_ahora?: boolean
}

/** Normaliza a YYYY-MM-DD para columna DATE (evita error con datetime-local). */
function toDateOnly(s: string | null | undefined): string | null {
  if (s == null || typeof s !== 'string') return null
  const trimmed = s.trim()
  if (!trimmed) return null
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : null
}

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const body = req.body as MoperBody | undefined
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Cuerpo de la petición inválido (JSON esperado)' })
  }
  const puedeCrear = req.user?.rol === 'admin' || req.user?.rol === 'gerente'
  if (!puedeCrear) {
    return res.status(403).json({ error: 'Sin permiso para crear registros' })
  }
  const curpVal = (body.curp || '').trim().slice(0, 18) || null
  try {
    const creadoPor = (body.creado_por || '').trim() || null
    const solicitadoPor = (body.solicitado_por || '').trim() || null
    // Fecha de llenado: automática (fecha actual al crear). No se acepta del body.
    const fechaLlenado = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    const fechaRegistro = toDateOnly(body.fecha_registro) || null
    const codigoAcceso = generarCodigoAcceso()
    const folio = await getNextFolio()
    const row = await query<{ id: number }>(
      `INSERT INTO moper_registros (
        folio, oficial_id, oficial_nombre, curp, fecha_ingreso, fecha_inicio_efectiva,
        servicio_actual_id, servicio_nuevo_id, puesto_actual_id, puesto_nuevo_id,
        servicio_actual_nombre, servicio_nuevo_nombre, puesto_actual_nombre, puesto_nuevo_nombre,
        sueldo_actual, sueldo_nuevo, motivo, creado_por, solicitado_por, fecha_llenado, fecha_registro, codigo_acceso
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
      RETURNING id`,
      [
        folio,
        null,
        (body.oficial_nombre || '').trim() || null,
        curpVal,
        toDateOnly(body.fecha_ingreso) || null,
        toDateOnly(body.fecha_inicio_efectiva) || null,
        null,
        null,
        null,
        null,
        (body.servicio_actual_nombre || '').trim() || null,
        (body.servicio_nuevo_nombre || '').trim() || null,
        (body.puesto_actual_nombre || '').trim() || null,
        (body.puesto_nuevo_nombre || '').trim() || null,
        body.sueldo_actual ?? null,
        body.sueldo_nuevo ?? 0,
        (body.motivo || '').trim() || '',
        creadoPor,
        solicitadoPor,
        fechaLlenado,
        fechaRegistro,
        codigoAcceso,
      ]
    )
    const id = row.rows[0]?.id
    if (id == null) {
      console.error('INSERT moper_registros sin RETURNING id')
      return res.status(500).json({ error: 'Error al guardar registro' })
    }
    res.status(201).json({ id, folio, codigo_acceso: codigoAcceso })
  } catch (e) {
    const detail = pgErrorDetail(e)
    console.error('POST /api/moper error:', e)
    res.status(500).json({
      error: 'Error al guardar registro',
      ...(detail && { detail }),
    })
  }
})

/** Actualizar registro (solo admin o gerente). No modifica folio, codigo_acceso ni firmas. */
router.patch('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const puedeEditar = req.user?.rol === 'admin' || req.user?.rol === 'gerente'
  if (!puedeEditar) {
    return res.status(403).json({ error: 'Sin permiso para editar registros' })
  }
  const id = req.params.id
  const body = req.body as MoperBody | undefined
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Cuerpo inválido' })
  }
  const curpVal = (body.curp || '').trim().slice(0, 18) || null
  const creadoPor = (body.creado_por || '').trim() || null
  const solicitadoPor = (body.solicitado_por || '').trim() || null
  const fechaRegistro = toDateOnly(body.fecha_registro) || null
  try {
    await query(
      `UPDATE moper_registros SET
        oficial_nombre = $1, curp = $2, fecha_ingreso = $3, fecha_inicio_efectiva = $4,
        servicio_actual_nombre = $5, servicio_nuevo_nombre = $6,
        puesto_actual_nombre = $7, puesto_nuevo_nombre = $8,
        sueldo_actual = $9, sueldo_nuevo = $10, motivo = $11,
        creado_por = $12, solicitado_por = $13, fecha_registro = $14,
        updated_at = NOW()
       WHERE id = $15`,
      [
        (body.oficial_nombre || '').trim() || null,
        curpVal,
        toDateOnly(body.fecha_ingreso) || null,
        toDateOnly(body.fecha_inicio_efectiva) || null,
        (body.servicio_actual_nombre || '').trim() || null,
        (body.servicio_nuevo_nombre || '').trim() || null,
        (body.puesto_actual_nombre || '').trim() || null,
        (body.puesto_nuevo_nombre || '').trim() || null,
        body.sueldo_actual ?? null,
        body.sueldo_nuevo ?? 0,
        (body.motivo || '').trim() || '',
        creadoPor,
        solicitadoPor,
        fechaRegistro,
        id,
      ]
    )
    const r = await query(SELECT_REGISTRO + ' WHERE m.id = $1', [id])
    if (r.rows.length === 0) return res.status(404).json({ error: 'No encontrado' })
    res.json(r.rows[0])
  } catch (e) {
    const detail = pgErrorDetail(e)
    console.error('PATCH /api/moper/:id error:', e)
    res.status(500).json({
      error: 'Error al actualizar',
      ...(detail && { detail }),
    })
  }
})

/** Acceso público por código: devuelve el registro para mostrar resumen y permitir firma de conformidad. */
router.get('/codigo/:codigo', async (req: Request, res: Response) => {
  const codigo = (req.params.codigo || '').trim()
  if (!codigo) return res.status(400).json({ error: 'Código requerido' })
  try {
    const r = await query(SELECT_REGISTRO + ' WHERE m.codigo_acceso = $1', [codigo])
    if (r.rows.length === 0) return res.status(404).json({ error: 'Código no válido' })
    res.json(r.rows[0])
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener registro' })
  }
})

router.get('/', requireAuth, async (_req: Request, res: Response) => {
  try {
    const pendientes = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM moper_registros WHERE completado IS NOT TRUE'
    )
    const aprobados = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM moper_registros WHERE completado = TRUE'
    )
    const listPend = await query(
      `SELECT id, folio, oficial_nombre, fecha_hora, completado
       FROM moper_registros WHERE completado IS NOT TRUE ORDER BY id DESC LIMIT 50`
    )
    const listAprob = await query(
      `SELECT id, folio, oficial_nombre, fecha_hora, completado
       FROM moper_registros WHERE completado = TRUE ORDER BY id DESC LIMIT 50`
    )
    res.json({
      pendientes: parseInt(pendientes.rows[0]?.count ?? '0', 10),
      aprobados: parseInt(aprobados.rows[0]?.count ?? '0', 10),
      registrosPendientes: listPend.rows,
      registrosAprobados: listAprob.rows,
    })
  } catch (e) {
    const detail = pgErrorDetail(e)
    console.error('GET /api/moper error:', e)
    res.status(500).json({
      error: 'Error al listar registros',
      ...(detail && { detail }),
    })
  }
})

router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const r = await query(SELECT_REGISTRO + ' WHERE m.id = $1', [req.params.id])
    if (r.rows.length === 0) return res.status(404).json({ error: 'No encontrado' })
    res.json(r.rows[0])
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener registro' })
  }
})

router.patch('/:id/firma', optionalAuth, async (req: AuthRequest, res: Response) => {
  const { tipo, imagen, codigo_acceso } = req.body as { tipo: string; imagen?: string; codigo_acceso?: string }
  const valid = ['conformidad', 'rh', 'gerente', 'control']
  if (!valid.includes(tipo) || !imagen?.startsWith?.('data:image/')) {
    return res.status(400).json({ error: 'tipo e imagen (data URL) requeridos' })
  }
  const id = req.params.id
  const current = await query<{ folio: string | null; firma_conformidad_at: string | null; codigo_acceso: string | null }>(
    'SELECT folio, firma_conformidad_at, codigo_acceso FROM moper_registros WHERE id = $1',
    [id]
  )
  const row = current.rows[0]
  if (!row) return res.status(404).json({ error: 'Registro no encontrado' })

  let nombreFirma = 'Firma manuscrita'
  if (tipo === 'conformidad') {
    const codigoRecibido = (codigo_acceso ?? '').trim()
    const codigoRegistro = row.codigo_acceso?.trim()
    if (!codigoRegistro || codigoRecibido !== codigoRegistro) {
      return res.status(401).json({ error: 'Código de acceso incorrecto' })
    }
  } else {
    if (!req.user) {
      const hasAuth = !!req.headers.authorization?.trim()
      return res.status(401).json({
        error: hasAuth ? 'Token inválido o expirado. Cierre sesión e inicie de nuevo.' : 'Debe iniciar sesión para esta firma',
      })
    }
    const rolFirma: Record<string, string[]> = { rh: ['rh', 'admin'], gerente: ['gerente', 'admin'], control: ['control', 'admin'] }
    const rolesOk = rolFirma[tipo]
    if (!rolesOk?.includes(req.user.rol)) {
      return res.status(403).json({ error: 'Su cuenta no está vinculada a esta firma' })
    }
    nombreFirma = req.user.nombre
  }
  const col = `firma_${tipo === 'conformidad' ? 'conformidad' : tipo === 'rh' ? 'rh' : tipo === 'gerente' ? 'gerente' : 'control'}_at`
  const colNombre = col.replace('_at', '_nombre')
  const colImagen = col.replace('_at', '_imagen')
  try {
    if (tipo === 'conformidad' && !row.firma_conformidad_at && row.folio == null) {
      const folioAsignar = await getNextFolio()
      await query(
        `UPDATE moper_registros SET folio = $1, ${col} = NOW(), ${colNombre} = $2, ${colImagen} = $3, updated_at = NOW() WHERE id = $4`,
        [folioAsignar, nombreFirma, imagen, id]
      )
    } else {
      await query(
        `UPDATE moper_registros SET ${col} = NOW(), ${colNombre} = $1, ${colImagen} = $2, updated_at = NOW() WHERE id = $3`,
        [nombreFirma, imagen, id]
      )
    }
    const r = await query(
      'SELECT folio, firma_conformidad_at, firma_rh_at, firma_gerente_at, firma_control_at FROM moper_registros WHERE id = $1',
      [id]
    )
    const updated = r.rows[0] as Record<string, unknown>
    const completado = updated.firma_conformidad_at && updated.firma_rh_at && updated.firma_gerente_at && updated.firma_control_at
    if (completado) {
      await query('UPDATE moper_registros SET completado = TRUE WHERE id = $1', [id])
    }
    res.json({ ok: true, completado: !!completado, folio: updated.folio ?? null })
  } catch (e) {
    res.status(500).json({ error: 'Error al registrar firma' })
  }
})

export default router
