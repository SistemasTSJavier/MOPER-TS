import dns from 'dns'
import pg from 'pg'

const { Pool } = pg

// Forzar IPv4 al resolver (el pooler de Supabase suele ser accesible por IPv4 desde Render)
dns.setDefaultResultOrder('ipv4first')

const rawConnectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/moper'
const isLocalhost = /localhost|127\.0\.0\.1/.test(rawConnectionString)

let pool: pg.Pool

/** Resuelve el host de la URL a IPv4 y crea el pool. Llamar antes de usar query/getNextFolio/etc. */
export async function initPool(): Promise<void> {
  let connectionString = rawConnectionString
  const match = rawConnectionString.match(/@([^:\/]+):(\d+)/)
  if (match && !isLocalhost) {
    const [, host] = match
    try {
      const { address } = await dns.promises.lookup(host, { family: 4 })
      const escaped = host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      connectionString = rawConnectionString.replace(new RegExp(`@${escaped}:`), `@${address}:`)
    } catch (e) {
      console.warn('[DB] No se pudo resolver', host, 'a IPv4. Usa Connection pooling (puerto 6543) en Supabase.', (e as Error).message)
    }
  }
  pool = new Pool({
    connectionString,
    ...(!isLocalhost && { ssl: { rejectUnauthorized: false } }),
  })
}

function getPool(): pg.Pool {
  if (!pool) throw new Error('initPool() debe ejecutarse antes de usar la BD')
  return pool
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  return getPool().query<T>(text, params as any)
}

export async function getNextFolio(): Promise<string> {
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const res = await client.query<{ last_number: number }>(
      'UPDATE folio_sequence SET last_number = last_number + 1 WHERE id = 1 RETURNING last_number'
    )
    const num = res.rows[0]?.last_number ?? 280
    await client.query('COMMIT')
    const padded = String(num).padStart(4, '0')
    return `SPT/No. ${padded}/MOP`
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export async function getFolioPreview(): Promise<string> {
  const res = await query<{ last_number: number }>('SELECT last_number FROM folio_sequence WHERE id = 1')
  const next = (res.rows[0]?.last_number ?? 279) + 1
  return `SPT/No. ${String(next).padStart(4, '0')}/MOP`
}

/** Añade columnas de texto libre si no existen (migración para instalaciones ya existentes). */
export async function ensureTextColumns(): Promise<void> {
  const alters = [
    'ALTER TABLE moper_registros ADD COLUMN IF NOT EXISTS oficial_nombre TEXT',
    'ALTER TABLE moper_registros ADD COLUMN IF NOT EXISTS servicio_actual_nombre TEXT',
    'ALTER TABLE moper_registros ADD COLUMN IF NOT EXISTS servicio_nuevo_nombre TEXT',
    'ALTER TABLE moper_registros ADD COLUMN IF NOT EXISTS puesto_actual_nombre TEXT',
    'ALTER TABLE moper_registros ADD COLUMN IF NOT EXISTS puesto_nuevo_nombre TEXT',
    'ALTER TABLE moper_registros ADD COLUMN IF NOT EXISTS firma_conformidad_imagen TEXT',
    'ALTER TABLE moper_registros ADD COLUMN IF NOT EXISTS firma_rh_imagen TEXT',
    'ALTER TABLE moper_registros ADD COLUMN IF NOT EXISTS firma_gerente_imagen TEXT',
    'ALTER TABLE moper_registros ADD COLUMN IF NOT EXISTS firma_control_imagen TEXT',
    'ALTER TABLE moper_registros ADD COLUMN IF NOT EXISTS creado_por TEXT',
    'ALTER TABLE moper_registros ADD COLUMN IF NOT EXISTS solicitado_por TEXT',
    'ALTER TABLE moper_registros ADD COLUMN IF NOT EXISTS codigo_acceso TEXT',
  ]
  for (const sql of alters) {
    await getPool().query(sql)
  }
}

/** Crea la tabla usuarios si no existe. */
export async function ensureUsuariosTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      nombre TEXT NOT NULL,
      rol VARCHAR(20) NOT NULL CHECK (rol IN ('admin', 'gerente', 'rh', 'control')),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
}

export { getPool }
