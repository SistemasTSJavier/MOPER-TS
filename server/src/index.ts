import 'dotenv/config'
import dns from 'dns'
// Forzar IPv4 al conectar a la BD (compatible con pooler de Supabase desde Render)
dns.setDefaultResultOrder('ipv4first')

import express, { Request, Response } from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'
import { initPool, ensureTextColumns, ensureUsuariosTable, query } from './db/index.js'
import foliosRouter from './routes/folios.js'
import catalogosRouter from './routes/catalogos.js'
import moperRouter from './routes/moper.js'
import authRouter from './routes/auth.js'
import healthRouter from './routes/health.js'
import bcrypt from 'bcrypt'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/health', healthRouter)
app.use('/api/auth', authRouter)
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
;(async () => {
  try {
    await initPool()
    await ensureTextColumns()
    await ensureUsuariosTable()
    const adminEmail = process.env.ADMIN_EMAIL?.trim()
    const adminPassword = process.env.ADMIN_PASSWORD
    if (adminEmail && adminPassword) {
      const r = await query<{ count: string }>('SELECT COUNT(*) as count FROM usuarios')
      const count = parseInt(r.rows[0]?.count ?? '0', 10)
      if (count === 0) {
        const hash = await bcrypt.hash(adminPassword, 10)
        await query(
          'INSERT INTO usuarios (email, password_hash, nombre, rol) VALUES ($1, $2, $3, $4)',
          [adminEmail.toLowerCase(), hash, 'Administrador', 'admin']
        )
        console.log('[Auth] Usuario admin creado:', adminEmail)
      }
    }
  } catch (e) {
    console.warn('Migración / seed:', e)
  }
  app.listen(PORT, () => {
    console.log(`Server MOPER en http://localhost:${PORT}`)
  })
})()
