import pg from 'pg'

const { Pool } = pg

const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/moper'
const isLocalhost = /localhost|127\.0\.0\.1/.test(connectionString)

const pool = new Pool({
  connectionString,
  // SSL para cualquier Postgres remoto (Supabase, Render, etc.)
  ...(!isLocalhost && {
    ssl: { rejectUnauthorized: false },
  }),
})

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params as any)
}

export async function getNextFolio(): Promise<string> {
  const client = await pool.connect()
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
  ]
  for (const sql of alters) {
    await pool.query(sql)
  }
}

export { pool }
