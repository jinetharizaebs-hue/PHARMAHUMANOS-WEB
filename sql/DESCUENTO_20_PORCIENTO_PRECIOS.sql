-- =====================================================
-- ACTUALIZAR COSTO DESDE VENTA (-20%)
-- Objetivo: guardar en costo de compra el 80% del valor de venta
-- Formula: costo = venta * 0.80
-- =====================================================

DO $$
DECLARE
  col_venta TEXT;
  col_costo TEXT;
BEGIN
  -- Detecta columna de venta: venta o precio
  SELECT column_name INTO col_venta
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'productos'
    AND column_name IN ('venta', 'precio')
  ORDER BY CASE WHEN column_name = 'venta' THEN 1 ELSE 2 END
  LIMIT 1;

  -- Detecta columna de costo: costo_de_compra o costo_compra
  SELECT column_name INTO col_costo
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'productos'
    AND column_name IN ('costo_de_compra', 'costo_compra')
  ORDER BY CASE WHEN column_name = 'costo_de_compra' THEN 1 ELSE 2 END
  LIMIT 1;

  IF col_venta IS NULL THEN
    RAISE EXCEPTION 'No se encontro columna de venta (venta o precio) en public.productos';
  END IF;

  IF col_costo IS NULL THEN
    RAISE EXCEPTION 'No se encontro columna de costo (costo_de_compra o costo_compra) en public.productos';
  END IF;

  EXECUTE format(
    'UPDATE public.productos
     SET %I = ROUND((%I)::numeric * 0.80, 2)
     WHERE %I IS NOT NULL AND (%I)::numeric > 0;',
    col_costo, col_venta, col_venta, col_venta
  );

  RAISE NOTICE 'Actualizacion completada: % = (% * 0.80)', col_costo, col_venta;
END $$;

-- Verificacion rapida
SELECT *
FROM public.productos
LIMIT 20;
