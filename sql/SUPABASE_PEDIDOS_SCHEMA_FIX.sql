-- SQL PARA ACOMODAR EL ESQUEMA DE PEDIDOS EN SUPABASE
-- Ejecutar en Supabase SQL Editor para que el carrito guarde datos correctamente.

BEGIN;

ALTER TABLE IF EXISTS pedidos
  ADD COLUMN IF NOT EXISTS cliente_nombre TEXT,
  ADD COLUMN IF NOT EXISTS cliente_telefono TEXT,
  ADD COLUMN IF NOT EXISTS direccion_entrega TEXT,
  ADD COLUMN IF NOT EXISTS cliente_notas TEXT,
  ADD COLUMN IF NOT EXISTS vendedor TEXT,
  ADD COLUMN IF NOT EXISTS productos JSONB,
  ADD COLUMN IF NOT EXISTS total NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS fecha_actualizacion TIMESTAMPTZ;

-- Si la columna productos existe con otro tipo, conviértela a JSONB.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'pedidos'
      AND column_name = 'productos'
      AND data_type <> 'jsonb'
  ) THEN
    ALTER TABLE pedidos ALTER COLUMN productos TYPE JSONB USING productos::jsonb;
  END IF;
END$$;

ALTER TABLE IF EXISTS pedidos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read pedidos" ON pedidos;
DROP POLICY IF EXISTS "Allow anon insert pedidos" ON pedidos;
DROP POLICY IF EXISTS "Allow anon update pedidos" ON pedidos;
DROP POLICY IF EXISTS "Allow anon delete pedidos" ON pedidos;

CREATE POLICY "Allow anon read pedidos" ON pedidos FOR SELECT USING (true);
CREATE POLICY "Allow anon insert pedidos" ON pedidos FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update pedidos" ON pedidos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete pedidos" ON pedidos FOR DELETE USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON pedidos TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

COMMIT;
