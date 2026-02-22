import { Router, Request, Response } from 'express'
import { getNextFolio, getFolioPreview } from '../db/index.js'
import { pgErrorDetail } from '../utils/pgError.js'
import { requireAuth } from '../middleware/auth.js'

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
