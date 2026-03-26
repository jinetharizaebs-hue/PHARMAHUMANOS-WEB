-- =====================================================
-- MIGRACION: COSTO DE COMPRA EN PRODUCTOS
-- Objetivo: permitir calcular utilidad por producto vendido
-- =====================================================

ALTER TABLE productos
ADD COLUMN IF NOT EXISTS costo_compra NUMERIC(12, 2) DEFAULT 0;

-- Normaliza registros antiguos sin costo cargado
UPDATE productos
SET costo_compra = 0
WHERE costo_compra IS NULL;

-- Verificacion rapida
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'productos'
  AND column_name IN ('precio', 'costo_compra')
ORDER BY column_name;
