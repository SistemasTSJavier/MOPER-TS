import { Router, Response } from 'express'
import bcrypt from 'bcrypt'
import { query } from '../db/index.js'
import { signToken, requireAuth } from '../middleware/auth.js'
import type { AuthRequest } from '../middleware/auth.js'

const router = Router()

router.post('/login', async (req: AuthRequest, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string }
  if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email y contraseña requeridos' })
  }
  const emailNorm = email.trim().toLowerCase()
  if (!emailNorm) {
    return res.status(400).json({ error: 'Email inválido' })
  }
  try {
    const r = await query<{ id: number; email: string; password_hash: string; nombre: string; rol: string }>(
      'SELECT id, email, password_hash, nombre, rol FROM usuarios WHERE email = $1',
      [emailNorm]
    )
    const user = r.rows[0]
    if (!user) {
      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }
    const ok = await bcrypt.compare(password, user.password_hash)
    if (!ok) {
      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }
    const token = signToken({
      userId: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
    })
    res.json({
      user: { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol },
      token,
    })
  } catch (e) {
    console.error('POST /api/auth/login error:', e)
    res.status(500).json({ error: 'Error al iniciar sesión' })
  }
})

router.get('/me', requireAuth, (req: AuthRequest, res: Response) => {
  res.json({ user: req.user })
})

export default router
