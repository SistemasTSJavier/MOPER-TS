import { Router } from 'express'
import { query } from '../db/index.js'

const router = Router()

/**
 * GET /api/health
 * Comprueba que el servidor y la base de datos (Supabase) responden.
 */
router.get('/', async (_req, res) => {
  try {
    await query('SELECT 1')
    res.json({
      ok: true,
      message: 'Servidor y base de datos Supabase conectados correctamente.',
      database: 'connected',
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    res.status(503).json({
      ok: false,
      message: 'Error de conexión a la base de datos.',
      database: 'error',
      error: message,
    })
  }
})

export default router
