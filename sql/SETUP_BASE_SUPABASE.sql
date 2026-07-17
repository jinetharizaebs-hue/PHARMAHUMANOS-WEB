-- SCRIPT PARA CREAR LA ESTRUCTURA BASE DEL PROYECTO EN SUPABASE
-- Ejecutar en Supabase SQL Editor sobre el proyecto nuevo.
-- Este script crea tablas principales y deja el esquema listo para usar.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS productos (
  id BIGSERIAL PRIMARY KEY,
  codigo TEXT UNIQUE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  precio NUMERIC(12,2) DEFAULT 0,
  costo_compra NUMERIC(12,2) DEFAULT 0,
  stock INTEGER DEFAULT 0,
  stock_minimo INTEGER DEFAULT 0,
  categoria TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clientes (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  documento TEXT,
  tipo TEXT DEFAULT 'cliente',
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendedores (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  telefono TEXT,
  email TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pedidos (
  id BIGSERIAL PRIMARY KEY,
  numero_pedido TEXT UNIQUE,
  cliente_id BIGINT REFERENCES clientes(id),
  vendedor_id BIGINT REFERENCES vendedores(id),
  estado TEXT DEFAULT 'pendiente',
  total NUMERIC(12,2) DEFAULT 0,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS detalles_pedido (
  id BIGSERIAL PRIMARY KEY,
  pedido_id BIGINT REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id BIGINT REFERENCES productos(id),
  cantidad INTEGER DEFAULT 1,
  precio_unitario NUMERIC(12,2) DEFAULT 0,
  subtotal NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS facturas (
  id BIGSERIAL PRIMARY KEY,
  numero_factura TEXT UNIQUE,
  cliente_id BIGINT REFERENCES clientes(id),
  vendedor_id BIGINT REFERENCES vendedores(id),
  total NUMERIC(12,2) DEFAULT 0,
  saldo NUMERIC(12,2) DEFAULT 0,
  estado TEXT DEFAULT 'pendiente',
  fecha TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS detalles_factura (
  id BIGSERIAL PRIMARY KEY,
  factura_id BIGINT REFERENCES facturas(id) ON DELETE CASCADE,
  producto_id BIGINT REFERENCES productos(id),
  cantidad INTEGER DEFAULT 1,
  precio_unitario NUMERIC(12,2) DEFAULT 0,
  subtotal NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS abonos (
  id BIGSERIAL PRIMARY KEY,
  factura_id BIGINT REFERENCES facturas(id) ON DELETE CASCADE,
  monto NUMERIC(12,2) DEFAULT 0,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id BIGSERIAL PRIMARY KEY,
  producto_id BIGINT REFERENCES productos(id),
  tipo TEXT NOT NULL,
  cantidad INTEGER DEFAULT 0,
  motivo TEXT,
  referencia TEXT,
  usuario TEXT,
  rol_usuario TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auditoria_productos (
  id BIGSERIAL PRIMARY KEY,
  producto_id BIGINT REFERENCES productos(id),
  accion TEXT,
  detalle TEXT,
  usuario TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS historial_inventario (
  id BIGSERIAL PRIMARY KEY,
  producto_id BIGINT REFERENCES productos(id),
  tipo TEXT,
  cantidad INTEGER DEFAULT 0,
  saldo_anterior INTEGER DEFAULT 0,
  saldo_nuevo INTEGER DEFAULT 0,
  observacion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gastos_empresa (
  id BIGSERIAL PRIMARY KEY,
  descripcion TEXT NOT NULL,
  monto NUMERIC(12,2) DEFAULT 0,
  categoria TEXT,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS proveedores (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS facturas_proveedores (
  id BIGSERIAL PRIMARY KEY,
  numero_factura TEXT UNIQUE,
  proveedor_id BIGINT REFERENCES proveedores(id),
  total NUMERIC(12,2) DEFAULT 0,
  saldo NUMERIC(12,2) DEFAULT 0,
  estado TEXT DEFAULT 'pendiente',
  fecha TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pagos_proveedores (
  id BIGSERIAL PRIMARY KEY,
  factura_id BIGINT REFERENCES facturas_proveedores(id) ON DELETE CASCADE,
  monto NUMERIC(12,2) DEFAULT 0,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS preparaciones_pedidos (
  id BIGSERIAL PRIMARY KEY,
  pedido_id BIGINT REFERENCES pedidos(id) ON DELETE CASCADE,
  estado TEXT DEFAULT 'pendiente',
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS visits_cobro (
  id BIGSERIAL PRIMARY KEY,
  cliente_id BIGINT REFERENCES clientes(id),
  vendedor_id BIGINT REFERENCES vendedores(id),
  fecha TIMESTAMPTZ DEFAULT NOW(),
  estado TEXT DEFAULT 'pendiente',
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos(activo);
CREATE INDEX IF NOT EXISTS idx_clientes_activo ON clientes(activo);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_facturas_estado ON facturas(estado);
CREATE INDEX IF NOT EXISTS idx_movimientos_producto ON movimientos_inventario(producto_id);
