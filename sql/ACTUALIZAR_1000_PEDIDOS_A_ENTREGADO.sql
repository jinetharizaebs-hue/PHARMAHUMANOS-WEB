-- Script: ACTUALIZAR_1000_PEDIDOS_A_ENTREGADO.sql
-- Objetivo: pasar a 'entregado' los primeros 1000 pedidos que aun estan en 'pendiente'.
-- Motor: PostgreSQL (Supabase)

BEGIN;

-- 1) Guardar exactamente los 1000 pedidos objetivo (pendientes mas antiguos por ID)
CREATE TEMP TABLE pedidos_objetivo AS
SELECT id
FROM pedidos
WHERE estado = 'pendiente'
ORDER BY id ASC
LIMIT 1000;

-- 2) Vista previa del lote objetivo
SELECT p.id, p.estado, p.fecha_creacion, p.fecha_actualizacion
FROM pedidos p
INNER JOIN pedidos_objetivo po ON po.id = p.id
ORDER BY p.id ASC;

-- 3) Ejecutar actualizacion del lote
UPDATE pedidos p
SET
  estado = 'entregado',
  fecha_actualizacion = NOW()
FROM pedidos_objetivo po
WHERE p.id = po.id;

-- 4) Validacion del lote actualizado
SELECT
  COUNT(*) AS total_en_lote,
  COUNT(*) FILTER (WHERE p.estado = 'entregado') AS total_entregados_en_lote,
  MIN(p.id) AS id_min_lote,
  MAX(p.id) AS id_max_lote
FROM pedidos p
INNER JOIN pedidos_objetivo po ON po.id = p.id;

-- 5) Validacion global de pendientes restantes
SELECT COUNT(*) AS pendientes_restantes
FROM pedidos
WHERE estado = 'pendiente';

COMMIT;
