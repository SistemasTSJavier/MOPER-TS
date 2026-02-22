/** Mensaje seguro para el cliente según código de error PostgreSQL. */
export function pgErrorDetail(err: unknown): string | undefined {
  const e = err as { code?: string; message?: string }
  if (e?.code === '22P02') return 'Formato de fecha o número inválido.'
  if (e?.code === '23502') return 'Falta un dato requerido.'
  if (e?.code === '23505') return 'Registro duplicado.'
  if (e?.code === '22001') return 'Algún texto excede el límite (ej. CURP 18 caracteres).'
  if (e?.code === '28P01' || e?.code === '3D000') return 'Error de conexión a la base de datos.'
  if (e?.code === '42703') return 'Base de datos desactualizada (falta columna). Ejecutar migraciones.'
  if (e?.code === '42P01') return 'Tabla no existe. Ejecutar schema/migraciones en la base de datos.'
  if (e?.message) return e.message
  return undefined
}
