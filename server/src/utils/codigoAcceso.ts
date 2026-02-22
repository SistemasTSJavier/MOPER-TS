import crypto from 'crypto'

const CARACTERES = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const LONGITUD = 8

/** Genera un código de acceso único para un registro MOPER (sin 0,O,1,I para evitar confusiones). */
export function generarCodigoAcceso(): string {
  let s = ''
  const bytes = crypto.randomBytes(LONGITUD)
  for (let i = 0; i < LONGITUD; i++) {
    s += CARACTERES[bytes[i]! % CARACTERES.length]
  }
  return s
}
