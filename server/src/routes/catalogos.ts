import { Router, Request, Response } from 'express'
import { query } from '../db/index.js'

const router = Router()

router.get('/servicios', async (_req: Request, res: Response) => {
  try {
    const r = await query<{ id: number; nombre: string }>('SELECT id, nombre FROM servicios ORDER BY nombre')
    res.json(r.rows)
  } catch (e) {
    res.status(500).json({ error: 'Error al cargar servicios' })
  }
})

router.get('/puestos', async (_req: Request, res: Response) => {
  try {
    const r = await query<{ id: number; nombre: string }>('SELECT id, nombre FROM puestos ORDER BY nombre')
    res.json(r.rows)
  } catch (e) {
    res.status(500).json({ error: 'Error al cargar puestos' })
  }
})

export default router
