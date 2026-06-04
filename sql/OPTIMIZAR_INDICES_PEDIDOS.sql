-- Script opcional: optimizar rendimiento de consultas en Gestion de Pedidos
-- Ejecutar una sola vez en Supabase SQL Editor

-- 1) Indice para filtros por estado + orden por fecha
CREATE INDEX IF NOT EXISTS idx_pedidos_estado_fecha_creacion
ON pedidos (estado, fecha_creacion DESC);

-- 2) Indice para orden general por fecha
CREATE INDEX IF NOT EXISTS idx_pedidos_fecha_creacion
ON pedidos (fecha_creacion DESC);

-- 3) Indice para busqueda por nombre de cliente (ilike)
-- Nota: puede ayudar parcialmente en prefijos; para busqueda full avanzada
-- se recomendaria trigram (pg_trgm), pero este indice es seguro y simple.
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_nombre
ON pedidos (cliente_nombre);

-- 4) Estadisticas de tabla para que el planner optimice mejor
ANALYZE pedidos;
