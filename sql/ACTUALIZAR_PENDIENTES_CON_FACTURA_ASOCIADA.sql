-- Script: ACTUALIZAR_PENDIENTES_CON_FACTURA_ASOCIADA.sql
-- Objetivo: actualizar a 'entregado' solo pedidos en 'pendiente' que
-- tengan factura asociada con criterios estrictos.
--
-- Criterios de asociacion:
-- 1) Mismo cliente (normalizado en minusculas y sin espacios extra)
-- 2) Mismo vendedor (normalizado)
-- 3) Mismo total
-- 4) Misma fecha calendario: DATE(pedido.fecha_creacion) = factura.fecha
--
-- Nota: se limita a 1000 pedidos por ejecucion para control operativo.

BEGIN;

-- 1) Construir lote objetivo (max 1000 pedidos pendientes con al menos 1 factura asociada)
CREATE TEMP TABLE pedidos_objetivo AS
WITH candidatos AS (
  SELECT
    p.id AS pedido_id,
    f.id AS factura_id,
    p.fecha_creacion,
    f.fecha,
    ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY f.id DESC) AS rn
  FROM pedidos p
  INNER JOIN facturas f
    ON LOWER(TRIM(COALESCE(p.cliente_nombre, ''))) = LOWER(TRIM(COALESCE(f.cliente, '')))
   AND LOWER(TRIM(COALESCE(p.vendedor, ''))) = LOWER(TRIM(COALESCE(f.vendedor, '')))
   AND COALESCE(p.total, 0)::numeric = COALESCE(f.total, 0)::numeric
   AND DATE(COALESCE(p.fecha_creacion, NOW())) = f.fecha
  WHERE p.estado = 'pendiente'
)
SELECT pedido_id AS id, factura_id
FROM candidatos
WHERE rn = 1
ORDER BY id ASC
LIMIT 1000;

-- 2) Vista previa del lote objetivo
SELECT
  p.id AS pedido_id,
  p.estado AS estado_actual,
  p.cliente_nombre,
  p.vendedor,
  p.total,
  DATE(p.fecha_creacion) AS fecha_pedido,
  po.factura_id
FROM pedidos p
INNER JOIN pedidos_objetivo po ON po.id = p.id
ORDER BY p.id ASC;

-- 3) Actualizar estado solo del lote objetivo
UPDATE pedidos p
SET
  estado = 'entregado',
  fecha_actualizacion = NOW()
FROM pedidos_objetivo po
WHERE p.id = po.id;

-- 4) Validacion del lote
SELECT
  COUNT(*) AS total_en_lote,
  COUNT(*) FILTER (WHERE p.estado = 'entregado') AS total_entregados_en_lote,
  MIN(p.id) AS id_min_lote,
  MAX(p.id) AS id_max_lote
FROM pedidos p
INNER JOIN pedidos_objetivo po ON po.id = p.id;

-- 5) Pendientes restantes
SELECT COUNT(*) AS pendientes_restantes
FROM pedidos
WHERE estado = 'pendiente';

COMMIT;
