/**
 * Script para crear usuarios en la tabla `usuarios` (Supabase / PostgreSQL).
 * Uso: npx tsx scripts/create-user.ts <email> <password> <nombre> <rol>
 * Roles: admin, gerente, rh, control
 *
 * Ejemplo:
 *   npx tsx scripts/create-user.ts gerente@empresa.com MiClave123 "Juan Gerente" gerente
 */
import 'dotenv/config'
import bcrypt from 'bcrypt'
import pg from 'pg'

const { Pool } = pg

async function main() {
  const [, , email, password, nombre, rol] = process.argv
  if (!email || !password || !nombre || !rol) {
    console.error('Uso: npx tsx scripts/create-user.ts <email> <password> <nombre> <rol>')
    console.error('Roles: admin, gerente, rh, control')
    process.exit(1)
  }
  const validRoles = ['admin', 'gerente', 'rh', 'control']
  if (!validRoles.includes(rol)) {
    console.error('Rol debe ser uno de:', validRoles.join(', '))
    process.exit(1)
  }
  const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/moper'
  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('supabase') ? { rejectUnauthorized: false } : undefined,
  })
  try {
    const hash = await bcrypt.hash(password, 10)
    const emailNorm = email.trim().toLowerCase()
    await pool.query(
      `INSERT INTO usuarios (email, password_hash, nombre, rol) VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET password_hash = $2, nombre = $3, rol = $4`,
      [emailNorm, hash, nombre.trim(), rol]
    )
    console.log('Usuario creado/actualizado:', emailNorm, '| Rol:', rol)
  } catch (e) {
    console.error('Error:', e)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()
