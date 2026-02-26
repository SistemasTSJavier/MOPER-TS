import { Router, Request, Response } from 'express'
import { getNextFolio, getFolioPreview, adjustFolioSequence } from '../db/index.js'
import { pgErrorDetail } from '../utils/pgError.js'
import { requireAuth } from '../middleware/auth.js'
import type { AuthRequest } from '../middleware/auth.js'

const router = Router()

router.get('/preview', requireAuth, async (_req: Request, res: Response) => {
  try {
    const folio = await getFolioPreview()
    res.json({ folio })
  } catch (e) {
    const detail = pgErrorDetail(e)
    console.error('GET /api/folios/preview error:', e)
    res.status(500).json({
      error: 'Error al obtener folio',
      ...(detail && { detail }),
    })
  }
})

/** Ajustar manualmente el próximo número de folio: body { delta: 1 } sube, { delta: -1 } baja. Solo admin o gerente. */
router.patch('/sequence', requireAuth, async (req: AuthRequest, res: Response) => {
  const puede = req.user?.rol === 'admin' || req.user?.rol === 'gerente'
  if (!puede) {
    return res.status(403).json({ error: 'Sin permiso para ajustar el folio' })
  }
  const delta = Number((req.body as { delta?: number }).delta)
  if (!Number.isInteger(delta) || delta === 0) {
    return res.status(400).json({ error: 'Se requiere body { delta: 1 } para subir o { delta: -1 } para bajar' })
  }
  try {
    const folio = await adjustFolioSequence(delta)
    res.json({ folio })
  } catch (e) {
    const detail = pgErrorDetail(e)
    console.error('PATCH /api/folios/sequence error:', e)
    res.status(500).json({
      error: 'Error al ajustar folio',
      ...(detail && { detail }),
    })
  }
})

router.post('/next', requireAuth, async (_req: Request, res: Response) => {
  try {
    const folio = await getNextFolio()
    res.json({ folio })
  } catch (e) {
    const detail = pgErrorDetail(e)
    console.error('POST /api/folios/next error:', e)
    res.status(500).json({
      error: 'Error al generar folio',
      ...(detail && { detail }),
    })
  }
})

export default router
