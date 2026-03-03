-- Ejecutar en BD existente para añadir columna cancelado (si no existe):
-- psql -d tu_base -f server/src/db/add_cancelado.sql
ALTER TABLE moper_registros ADD COLUMN IF NOT EXISTS cancelado BOOLEAN DEFAULT FALSE;
