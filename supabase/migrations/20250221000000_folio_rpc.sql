-- Función para obtener el siguiente número de folio (atómico).
-- Las Edge Functions la llaman con .rpc('get_next_folio_number').
CREATE OR REPLACE FUNCTION get_next_folio_number()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  n integer;
BEGIN
  UPDATE folio_sequence SET last_number = last_number + 1 WHERE id = 1 RETURNING last_number INTO n;
  RETURN COALESCE(n, 280);
END;
$$;
