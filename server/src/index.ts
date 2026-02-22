import 'dotenv/config'
import express, { Request, Response } from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'
import { ensureTextColumns } from './db/index.js'
import foliosRouter from './routes/folios.js'
import catalogosRouter from './routes/catalogos.js'
import moperRouter from './routes/moper.js'
import healthRouter from './routes/health.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/health', healthRouter)
app.use('/api/folios', foliosRouter)
app.use('/api/catalogos', catalogosRouter)
app.use('/api/moper', moperRouter)

// En producción servir el frontend (Vite) desde client/dist
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist')
if (existsSync(clientDist)) {
  app.use(express.static(clientDist))
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(clientDist, 'index.html'))
  })
} else {
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      message: 'API MOPER',
      endpoints: { health: '/api/health', folios: '/api/folios', moper: '/api/moper' },
    })
  })
}

const PORT = process.env.PORT || 3000
app.listen(PORT, async () => {
  try {
    await ensureTextColumns()
  } catch (e) {
    console.warn('Migración columnas texto:', e)
  }
  console.log(`Server MOPER en http://localhost:${PORT}`)
})
