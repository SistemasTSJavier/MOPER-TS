import { Router } from 'express'
import { query } from '../db/index.js'

const router = Router()

router.get('/search', async (req, res) => {
  const q = (req.query.q as string)?.trim() || ''
  if (!q || q.length < 2) {
    return res.json([])
  }
  try {
    const result = await query<{ id: number; nombre: string; curp: string; fecha_ingreso: string }>(
      `SELECT id, nombre, curp, fecha_ingreso FROM oficiales 
       WHERE LOWER(nombre) LIKE LOWER($1) OR LOWER(curp) LIKE LOWER($1) 
       LIMIT 20`,
      [`%${q}%`]
    )
    res.json(result.rows.map((r) => ({ ...r, fecha_ingreso: r.fecha_ingreso ? r.fecha_ingreso : null })))
  } catch (e) {
    res.status(500).json({ error: 'Error en búsqueda' })
  }
})

export default router
