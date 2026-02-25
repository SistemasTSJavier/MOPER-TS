/**
 * Crea los 4 usuarios de Tactical Support en la tabla usuarios.
 * Ejecutar desde la carpeta server con: npx tsx scripts/seed-usuarios-tactical.ts
 * Requiere DATABASE_URL en .env (misma URI de Supabase que en Render).
 */
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import pg from 'pg'

const { Pool } = pg

// Firma por correo: gterh@ = Gerente RH, gerenteoperaciones@ = Gerente Operaciones, coordinadorcentrodecontrol@ = Centro de Control
const USUARIOS = [
  { email: 'gterh@tacticalsupport.com.mx', password: 'Tactical2026', nombre: 'Gerente RH', rol: 'rh' as const },
  { email: 'gerenteoperaciones@tacticalsupport.com.mx', password: 'Tactical2026', nombre: 'Gerente de Operaciones', rol: 'gerente' as const },
  { email: 'coordinadorcentrodecontrol@tacticalsupport.com.mx', password: 'Tactical2026', nombre: 'Coordinador Centro de Control', rol: 'control' as const },
]

async function main() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/moper'
  if (!connectionString || connectionString === 'postgresql://localhost:5432/moper') {
    console.error('Configura DATABASE_URL en server/.env (URI del pooler de Supabase)')
    process.exit(1)
  }
  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('supabase') ? { rejectUnauthorized: false } : undefined,
  })
  console.log('Conectando a la base de datos...')
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        nombre TEXT NOT NULL,
        rol VARCHAR(20) NOT NULL CHECK (rol IN ('admin', 'gerente', 'rh', 'control')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    console.log('Tabla usuarios lista.')
    for (const u of USUARIOS) {
      const hash = await bcrypt.hash(u.password, 10)
      const emailNorm = u.email.trim().toLowerCase()
      await pool.query(
        `INSERT INTO usuarios (email, password_hash, nombre, rol) VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO UPDATE SET password_hash = $2, nombre = $3, rol = $4`,
        [emailNorm, hash, u.nombre, u.rol]
      )
      console.log('  OK:', emailNorm, '→', u.rol)
    }
    console.log('\nListo. Los 3 usuarios de firma ya pueden iniciar sesión (Gerente RH, Gerente Operaciones, Centro de Control).')
  } catch (e) {
    console.error('Error:', e)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()
