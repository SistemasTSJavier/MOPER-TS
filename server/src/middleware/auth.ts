import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'moper-secret-cambiar-en-produccion'

export interface JwtPayload {
  userId: number
  email: string
  nombre: string
  rol: string
}

export interface AuthRequest extends Request {
  user?: { id: number; email: string; nombre: string; rol: string }
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload
    return decoded
  } catch {
    return null
  }
}

/** Middleware: exige Bearer token y pone req.user (id, email, nombre, rol). */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    res.status(401).json({ error: 'Token requerido' })
    return
  }
  const payload = verifyToken(token)
  if (!payload) {
    res.status(401).json({ error: 'Token inválido o expirado' })
    return
  }
  req.user = {
    id: payload.userId,
    email: payload.email,
    nombre: payload.nombre,
    rol: payload.rol,
  }
  next()
}

/** Middleware opcional: si hay Bearer token válido, pone req.user; si no, sigue sin user. */
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    next()
    return
  }
  const payload = verifyToken(token)
  if (payload) {
    req.user = {
      id: payload.userId,
      email: payload.email,
      nombre: payload.nombre,
      rol: payload.rol,
    }
  }
  next()
}
