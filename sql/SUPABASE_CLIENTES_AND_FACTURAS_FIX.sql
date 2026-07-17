-- SQL de corrección para el proyecto Supabase actual.
-- Ejecutar en el SQL Editor del proyecto nuevo de Supabase.

BEGIN;

-- Asegura que la tabla clientes tenga los campos que usa el frontend.
ALTER TABLE IF EXISTS clientes
  ADD COLUMN IF NOT EXISTS correo TEXT,
  ADD COLUMN IF NOT EXISTS clasificacion INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fecha_registro TIMESTAMPTZ DEFAULT NOW();

-- Asegura que la tabla facturas tenga el campo cliente que espera el frontend.
ALTER TABLE IF EXISTS facturas
  ADD COLUMN IF NOT EXISTS cliente TEXT;

-- Habilitar RLS y políticas para que el rol anon pueda leer/escribir.
ALTER TABLE IF EXISTS clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS facturas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read clients" ON clientes;
DROP POLICY IF EXISTS "Allow anon insert clients" ON clientes;
DROP POLICY IF EXISTS "Allow anon update clients" ON clientes;

CREATE POLICY "Allow anon read clients" ON clientes
  FOR SELECT USING (true);

CREATE POLICY "Allow anon insert clients" ON clientes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anon update clients" ON clientes
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon read facturas" ON facturas;
DROP POLICY IF EXISTS "Allow anon insert facturas" ON facturas;
DROP POLICY IF EXISTS "Allow anon update facturas" ON facturas;

CREATE POLICY "Allow anon read facturas" ON facturas
  FOR SELECT USING (true);

CREATE POLICY "Allow anon insert facturas" ON facturas
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anon update facturas" ON facturas
  FOR UPDATE USING (true) WITH CHECK (true);

-- Concede privilegios directos al rol anon en estas tablas.
GRANT SELECT, INSERT, UPDATE, DELETE ON clientes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON facturas TO anon;

-- Si la tabla usa secuencias de serial/bigserial.
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

COMMIT;
