-- SQL INTEGRAL PARA SUPABASE
-- Arregla permisos y estructura para TODAS las tablas principales.
-- Ejecutar en el SQL Editor del proyecto Supabase en una sola vez.

BEGIN;

-- ====== TABLA: clientes ======
ALTER TABLE IF EXISTS clientes
  ADD COLUMN IF NOT EXISTS correo TEXT,
  ADD COLUMN IF NOT EXISTS clasificacion INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fecha_registro TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE IF EXISTS clientes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read clients" ON clientes;
DROP POLICY IF EXISTS "Allow anon insert clients" ON clientes;
DROP POLICY IF EXISTS "Allow anon update clients" ON clientes;
DROP POLICY IF EXISTS "Allow anon delete clients" ON clientes;

CREATE POLICY "Allow anon read clients" ON clientes FOR SELECT USING (true);
CREATE POLICY "Allow anon insert clients" ON clientes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update clients" ON clientes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete clients" ON clientes FOR DELETE USING (true);

-- ====== TABLA: productos (o products) ======
-- Si la tabla se llama "products", actualizar aquí
ALTER TABLE IF EXISTS productos
  ADD COLUMN IF NOT EXISTS imagen_url TEXT,
  ADD COLUMN IF NOT EXISTS imagen_public_id TEXT;

ALTER TABLE IF EXISTS productos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read productos" ON productos;
DROP POLICY IF EXISTS "Allow anon insert productos" ON productos;
DROP POLICY IF EXISTS "Allow anon update productos" ON productos;
DROP POLICY IF EXISTS "Allow anon delete productos" ON productos;

CREATE POLICY "Allow anon read productos" ON productos FOR SELECT USING (true);
CREATE POLICY "Allow anon insert productos" ON productos FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update productos" ON productos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete productos" ON productos FOR DELETE USING (true);

-- Nota: Si la tabla se llama "products" en lugar de "productos", descomenta esto:
-- ALTER TABLE IF EXISTS products ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow anon read products" ON products FOR SELECT USING (true);
-- CREATE POLICY "Allow anon insert products" ON products FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Allow anon update products" ON products FOR UPDATE USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow anon delete products" ON products FOR DELETE USING (true);

-- ====== TABLA: vendedores ======
ALTER TABLE IF EXISTS vendedores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read vendedores" ON vendedores;
DROP POLICY IF EXISTS "Allow anon insert vendedores" ON vendedores;
DROP POLICY IF EXISTS "Allow anon update vendedores" ON vendedores;
DROP POLICY IF EXISTS "Allow anon delete vendedores" ON vendedores;

CREATE POLICY "Allow anon read vendedores" ON vendedores FOR SELECT USING (true);
CREATE POLICY "Allow anon insert vendedores" ON vendedores FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update vendedores" ON vendedores FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete vendedores" ON vendedores FOR DELETE USING (true);

-- ====== TABLA: facturas ======
ALTER TABLE IF EXISTS facturas
  ADD COLUMN IF NOT EXISTS cliente TEXT;

ALTER TABLE IF EXISTS facturas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read facturas" ON facturas;
DROP POLICY IF EXISTS "Allow anon insert facturas" ON facturas;
DROP POLICY IF EXISTS "Allow anon update facturas" ON facturas;
DROP POLICY IF EXISTS "Allow anon delete facturas" ON facturas;

CREATE POLICY "Allow anon read facturas" ON facturas FOR SELECT USING (true);
CREATE POLICY "Allow anon insert facturas" ON facturas FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update facturas" ON facturas FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete facturas" ON facturas FOR DELETE USING (true);

-- ====== TABLA: detalles_factura ======
ALTER TABLE IF EXISTS detalles_factura ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read detalles_factura" ON detalles_factura;
DROP POLICY IF EXISTS "Allow anon insert detalles_factura" ON detalles_factura;
DROP POLICY IF EXISTS "Allow anon update detalles_factura" ON detalles_factura;
DROP POLICY IF EXISTS "Allow anon delete detalles_factura" ON detalles_factura;

CREATE POLICY "Allow anon read detalles_factura" ON detalles_factura FOR SELECT USING (true);
CREATE POLICY "Allow anon insert detalles_factura" ON detalles_factura FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update detalles_factura" ON detalles_factura FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete detalles_factura" ON detalles_factura FOR DELETE USING (true);

-- ====== TABLA: abonos ======
ALTER TABLE IF EXISTS abonos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read abonos" ON abonos;
DROP POLICY IF EXISTS "Allow anon insert abonos" ON abonos;
DROP POLICY IF EXISTS "Allow anon update abonos" ON abonos;
DROP POLICY IF EXISTS "Allow anon delete abonos" ON abonos;

CREATE POLICY "Allow anon read abonos" ON abonos FOR SELECT USING (true);
CREATE POLICY "Allow anon insert abonos" ON abonos FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update abonos" ON abonos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete abonos" ON abonos FOR DELETE USING (true);

-- ====== TABLA: pedidos ======
ALTER TABLE IF EXISTS pedidos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read pedidos" ON pedidos;
DROP POLICY IF EXISTS "Allow anon insert pedidos" ON pedidos;
DROP POLICY IF EXISTS "Allow anon update pedidos" ON pedidos;
DROP POLICY IF EXISTS "Allow anon delete pedidos" ON pedidos;

CREATE POLICY "Allow anon read pedidos" ON pedidos FOR SELECT USING (true);
CREATE POLICY "Allow anon insert pedidos" ON pedidos FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update pedidos" ON pedidos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete pedidos" ON pedidos FOR DELETE USING (true);

-- ====== TABLA: detalles_pedido ======
ALTER TABLE IF EXISTS detalles_pedido ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read detalles_pedido" ON detalles_pedido;
DROP POLICY IF EXISTS "Allow anon insert detalles_pedido" ON detalles_pedido;
DROP POLICY IF EXISTS "Allow anon update detalles_pedido" ON detalles_pedido;
DROP POLICY IF EXISTS "Allow anon delete detalles_pedido" ON detalles_pedido;

CREATE POLICY "Allow anon read detalles_pedido" ON detalles_pedido FOR SELECT USING (true);
CREATE POLICY "Allow anon insert detalles_pedido" ON detalles_pedido FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update detalles_pedido" ON detalles_pedido FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete detalles_pedido" ON detalles_pedido FOR DELETE USING (true);

-- ====== TABLA: movimientos_inventario ======
ALTER TABLE IF EXISTS movimientos_inventario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read movimientos_inventario" ON movimientos_inventario;
DROP POLICY IF EXISTS "Allow anon insert movimientos_inventario" ON movimientos_inventario;
DROP POLICY IF EXISTS "Allow anon update movimientos_inventario" ON movimientos_inventario;
DROP POLICY IF EXISTS "Allow anon delete movimientos_inventario" ON movimientos_inventario;

CREATE POLICY "Allow anon read movimientos_inventario" ON movimientos_inventario FOR SELECT USING (true);
CREATE POLICY "Allow anon insert movimientos_inventario" ON movimientos_inventario FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update movimientos_inventario" ON movimientos_inventario FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete movimientos_inventario" ON movimientos_inventario FOR DELETE USING (true);

-- ====== TABLA: auditoria_productos ======
ALTER TABLE IF EXISTS auditoria_productos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read auditoria_productos" ON auditoria_productos;
DROP POLICY IF EXISTS "Allow anon insert auditoria_productos" ON auditoria_productos;
DROP POLICY IF EXISTS "Allow anon update auditoria_productos" ON auditoria_productos;
DROP POLICY IF EXISTS "Allow anon delete auditoria_productos" ON auditoria_productos;

CREATE POLICY "Allow anon read auditoria_productos" ON auditoria_productos FOR SELECT USING (true);
CREATE POLICY "Allow anon insert auditoria_productos" ON auditoria_productos FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update auditoria_productos" ON auditoria_productos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete auditoria_productos" ON auditoria_productos FOR DELETE USING (true);

-- ====== TABLA: categories ======
ALTER TABLE IF EXISTS categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read categories" ON categories;
DROP POLICY IF EXISTS "Allow anon insert categories" ON categories;
DROP POLICY IF EXISTS "Allow anon update categories" ON categories;
DROP POLICY IF EXISTS "Allow anon delete categories" ON categories;

CREATE POLICY "Allow anon read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Allow anon insert categories" ON categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update categories" ON categories FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete categories" ON categories FOR DELETE USING (true);

-- ====== TABLA: gastos_empresa ======
ALTER TABLE IF EXISTS gastos_empresa ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read gastos_empresa" ON gastos_empresa;
DROP POLICY IF EXISTS "Allow anon insert gastos_empresa" ON gastos_empresa;
DROP POLICY IF EXISTS "Allow anon update gastos_empresa" ON gastos_empresa;
DROP POLICY IF EXISTS "Allow anon delete gastos_empresa" ON gastos_empresa;

CREATE POLICY "Allow anon read gastos_empresa" ON gastos_empresa FOR SELECT USING (true);
CREATE POLICY "Allow anon insert gastos_empresa" ON gastos_empresa FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update gastos_empresa" ON gastos_empresa FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete gastos_empresa" ON gastos_empresa FOR DELETE USING (true);

-- ====== TABLA: proveedores ======
ALTER TABLE IF EXISTS proveedores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read proveedores" ON proveedores;
DROP POLICY IF EXISTS "Allow anon insert proveedores" ON proveedores;
DROP POLICY IF EXISTS "Allow anon update proveedores" ON proveedores;
DROP POLICY IF EXISTS "Allow anon delete proveedores" ON proveedores;

CREATE POLICY "Allow anon read proveedores" ON proveedores FOR SELECT USING (true);
CREATE POLICY "Allow anon insert proveedores" ON proveedores FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update proveedores" ON proveedores FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete proveedores" ON proveedores FOR DELETE USING (true);

-- ====== TABLA: facturas_proveedores ======
ALTER TABLE IF EXISTS facturas_proveedores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read facturas_proveedores" ON facturas_proveedores;
DROP POLICY IF EXISTS "Allow anon insert facturas_proveedores" ON facturas_proveedores;
DROP POLICY IF EXISTS "Allow anon update facturas_proveedores" ON facturas_proveedores;
DROP POLICY IF EXISTS "Allow anon delete facturas_proveedores" ON facturas_proveedores;

CREATE POLICY "Allow anon read facturas_proveedores" ON facturas_proveedores FOR SELECT USING (true);
CREATE POLICY "Allow anon insert facturas_proveedores" ON facturas_proveedores FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update facturas_proveedores" ON facturas_proveedores FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete facturas_proveedores" ON facturas_proveedores FOR DELETE USING (true);

-- ====== TABLA: pagos_proveedores ======
ALTER TABLE IF EXISTS pagos_proveedores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read pagos_proveedores" ON pagos_proveedores;
DROP POLICY IF EXISTS "Allow anon insert pagos_proveedores" ON pagos_proveedores;
DROP POLICY IF EXISTS "Allow anon update pagos_proveedores" ON pagos_proveedores;
DROP POLICY IF EXISTS "Allow anon delete pagos_proveedores" ON pagos_proveedores;

CREATE POLICY "Allow anon read pagos_proveedores" ON pagos_proveedores FOR SELECT USING (true);
CREATE POLICY "Allow anon insert pagos_proveedores" ON pagos_proveedores FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update pagos_proveedores" ON pagos_proveedores FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete pagos_proveedores" ON pagos_proveedores FOR DELETE USING (true);

-- ====== TABLA: visits_cobro ======
ALTER TABLE IF EXISTS visits_cobro ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read visits_cobro" ON visits_cobro;
DROP POLICY IF EXISTS "Allow anon insert visits_cobro" ON visits_cobro;
DROP POLICY IF EXISTS "Allow anon update visits_cobro" ON visits_cobro;
DROP POLICY IF EXISTS "Allow anon delete visits_cobro" ON visits_cobro;

CREATE POLICY "Allow anon read visits_cobro" ON visits_cobro FOR SELECT USING (true);
CREATE POLICY "Allow anon insert visits_cobro" ON visits_cobro FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update visits_cobro" ON visits_cobro FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete visits_cobro" ON visits_cobro FOR DELETE USING (true);

-- ====== TABLA: historial_inventario ======
ALTER TABLE IF EXISTS historial_inventario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read historial_inventario" ON historial_inventario;
DROP POLICY IF EXISTS "Allow anon insert historial_inventario" ON historial_inventario;
DROP POLICY IF EXISTS "Allow anon update historial_inventario" ON historial_inventario;
DROP POLICY IF EXISTS "Allow anon delete historial_inventario" ON historial_inventario;

CREATE POLICY "Allow anon read historial_inventario" ON historial_inventario FOR SELECT USING (true);
CREATE POLICY "Allow anon insert historial_inventario" ON historial_inventario FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update historial_inventario" ON historial_inventario FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete historial_inventario" ON historial_inventario FOR DELETE USING (true);

-- ====== TABLA: preparaciones_pedidos ======
ALTER TABLE IF EXISTS preparaciones_pedidos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read preparaciones_pedidos" ON preparaciones_pedidos;
DROP POLICY IF EXISTS "Allow anon insert preparaciones_pedidos" ON preparaciones_pedidos;
DROP POLICY IF EXISTS "Allow anon update preparaciones_pedidos" ON preparaciones_pedidos;
DROP POLICY IF EXISTS "Allow anon delete preparaciones_pedidos" ON preparaciones_pedidos;

CREATE POLICY "Allow anon read preparaciones_pedidos" ON preparaciones_pedidos FOR SELECT USING (true);
CREATE POLICY "Allow anon insert preparaciones_pedidos" ON preparaciones_pedidos FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update preparaciones_pedidos" ON preparaciones_pedidos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete preparaciones_pedidos" ON preparaciones_pedidos FOR DELETE USING (true);

-- ====== CONCEDER PRIVILEGIOS GLOBALES AL ROL ANON ======
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

COMMIT;
