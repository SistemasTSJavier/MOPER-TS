import { Router } from 'express'
import { getNextFolio, getFolioPreview } from '../db/index.js'

const router = Router()

router.get('/preview', async (_req, res) => {
  try {
    const folio = await getFolioPreview()
    res.json({ folio })
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener folio' })
  }
})

router.post('/next', async (_req, res) => {
  try {
    const folio = await getNextFolio()
    res.json({ folio })
  } catch (e) {
    res.status(500).json({ error: 'Error al generar folio' })
  }
})

export default router
