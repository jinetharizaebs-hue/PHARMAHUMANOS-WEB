-- =====================================================================
-- CONTABILIDAD: completar tablas y mantener saldos de proveedores
-- (gastos_empresa, proveedores, facturas_proveedores, pagos_proveedores)
--
-- CUENTAS POR PAGAR: saldo siempre = total - pagos registrados
--
-- Regla única (la misma de la pantalla Cuentas por Pagar):
--   total = subtotal + iva - retencion   (neto a pagar)
--   saldo = total - suma de pagos_proveedores
--
-- Corrige:
--   - Editar el total de una factura ya no borra los abonos hechos
--   - Editar o borrar un pago también actualiza la factura
--
-- Ejecutar en Supabase > SQL Editor. Se puede ejecutar más de una vez.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Completar las tablas: la base en Supabase Cloud se creó con una
--    versión reducida y le faltan columnas que usa Cuentas por Pagar.
--    Solo AGREGA columnas; no borra ni modifica datos existentes.
-- ---------------------------------------------------------------------
ALTER TABLE public.proveedores
  ADD COLUMN IF NOT EXISTS nit          VARCHAR(50),
  ADD COLUMN IF NOT EXISTS contacto     VARCHAR(255),
  ADD COLUMN IF NOT EXISTS termino_pago INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS proveedores_nit_unico
  ON public.proveedores (nit) WHERE nit IS NOT NULL;

ALTER TABLE public.facturas_proveedores
  ADD COLUMN IF NOT EXISTS fecha_emision     DATE,
  ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE,
  ADD COLUMN IF NOT EXISTS clase             VARCHAR(10) DEFAULT 'FP',
  ADD COLUMN IF NOT EXISTS subtotal          NUMERIC(15, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS iva               NUMERIC(15, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retencion         NUMERIC(15, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pagado            NUMERIC(15, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS descripcion       TEXT,
  ADD COLUMN IF NOT EXISTS archivo_url       TEXT,
  ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ DEFAULT now();

-- La app no envía "fecha" (usa fecha_emision): que no bloquee el guardado
ALTER TABLE public.facturas_proveedores ALTER COLUMN fecha SET DEFAULT now();

-- Facturas que ya existían: fecha de emisión = fecha de registro,
-- subtotal = total (no tenían desglose de IVA ni retención)
UPDATE public.facturas_proveedores
SET fecha_emision = fecha::date
WHERE fecha_emision IS NULL AND fecha IS NOT NULL;

UPDATE public.facturas_proveedores
SET subtotal = total
WHERE subtotal = 0 AND iva = 0 AND retencion = 0 AND total <> 0;

ALTER TABLE public.pagos_proveedores
  ADD COLUMN IF NOT EXISTS factura_id  BIGINT REFERENCES public.facturas_proveedores(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS fecha       DATE DEFAULT current_date,
  ADD COLUMN IF NOT EXISTS monto       NUMERIC(15, 2),
  ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(50) DEFAULT 'transferencia',
  ADD COLUMN IF NOT EXISTS referencia  VARCHAR(100),
  ADD COLUMN IF NOT EXISTS banco       VARCHAR(100),
  ADD COLUMN IF NOT EXISTS nota        TEXT,
  ADD COLUMN IF NOT EXISTS usuario     VARCHAR(255);

-- Gastos: columnas que usan Gestión de Gastos, Gastos de Empresa y Gastos Fácil
ALTER TABLE public.gastos_empresa
  ADD COLUMN IF NOT EXISTS empleado    VARCHAR(255) DEFAULT 'Otro',
  ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(50) DEFAULT 'transferencia',
  ADD COLUMN IF NOT EXISTS referencia  VARCHAR(100),
  ADD COLUMN IF NOT EXISTS notas       TEXT,
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT now();

-- Las pantallas trabajan con fecha sin hora (AAAA-MM-DD)
DO $$
BEGIN
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'gastos_empresa' AND column_name = 'fecha')
     <> 'date' THEN
    ALTER TABLE public.gastos_empresa
      ALTER COLUMN fecha TYPE DATE USING (fecha AT TIME ZONE 'America/Bogota')::date;
  END IF;
END $$;

-- Calcula pagado, saldo y estado de una factura a partir de sus pagos
CREATE OR REPLACE FUNCTION public.calcular_estado_factura_proveedor(
  p_factura_id BIGINT,
  p_total      NUMERIC,
  OUT o_pagado NUMERIC,
  OUT o_saldo  NUMERIC,
  OUT o_estado TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  SELECT coalesce(sum(monto), 0) INTO o_pagado
  FROM public.pagos_proveedores
  WHERE factura_id = p_factura_id;

  p_total := coalesce(p_total, 0);

  IF p_total < 0 THEN
    -- Nota crédito: su saldo negativo descuenta de la deuda con el proveedor
    o_saldo  := p_total;
    o_estado := 'pendiente';
  ELSIF p_total - o_pagado <= 0 THEN
    o_saldo  := 0;
    o_estado := 'pagada';
  ELSIF o_pagado > 0 THEN
    o_saldo  := p_total - o_pagado;
    o_estado := 'parcial';
  ELSE
    o_saldo  := p_total;
    o_estado := 'pendiente';
  END IF;
END;
$$;

-- Al crear o cambiar el total de una factura
CREATE OR REPLACE FUNCTION public.recalcular_saldo_factura_proveedor()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v RECORD;
BEGIN
  SELECT * INTO v FROM public.calcular_estado_factura_proveedor(NEW.id, NEW.total);
  NEW.pagado := v.o_pagado;
  NEW.saldo  := v.o_saldo;
  NEW.estado := v.o_estado;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_calcular_saldo_inicial ON public.facturas_proveedores;
DROP TRIGGER IF EXISTS trg_recalcular_saldo_factura_proveedor ON public.facturas_proveedores;
CREATE TRIGGER trg_recalcular_saldo_factura_proveedor
  BEFORE INSERT OR UPDATE OF total ON public.facturas_proveedores
  FOR EACH ROW
  EXECUTE FUNCTION public.recalcular_saldo_factura_proveedor();

-- Al registrar, editar o borrar un pago
CREATE OR REPLACE FUNCTION public.actualizar_factura_despues_pago()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_facturas   BIGINT[] := ARRAY[]::BIGINT[];
  v_factura_id BIGINT;
  v RECORD;
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_facturas := v_facturas || NEW.factura_id::BIGINT;
  END IF;
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_facturas := v_facturas || OLD.factura_id::BIGINT;
  END IF;

  FOR v_factura_id IN SELECT DISTINCT x FROM unnest(v_facturas) AS x LOOP
    CONTINUE WHEN v_factura_id IS NULL;

    SELECT c.* INTO v
    FROM public.facturas_proveedores f,
         LATERAL public.calcular_estado_factura_proveedor(f.id, f.total) c
    WHERE f.id = v_factura_id;

    UPDATE public.facturas_proveedores
    SET pagado = v.o_pagado, saldo = v.o_saldo, estado = v.o_estado
    WHERE id = v_factura_id;
  END LOOP;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_actualizar_factura_pago ON public.pagos_proveedores;
CREATE TRIGGER trigger_actualizar_factura_pago
  AFTER INSERT OR UPDATE OR DELETE ON public.pagos_proveedores
  FOR EACH ROW
  EXECUTE FUNCTION public.actualizar_factura_despues_pago();

-- =====================================================================
-- REVISIÓN DE DATOS EXISTENTES (solo consulta, no cambia nada)
-- =====================================================================

-- a) Facturas cuyo saldo guardado no coincide con total - pagos
SELECT f.id, f.numero_factura, f.total, f.pagado, f.saldo AS saldo_guardado,
       c.o_saldo AS saldo_correcto, f.estado, c.o_estado AS estado_correcto
FROM public.facturas_proveedores f,
     LATERAL public.calcular_estado_factura_proveedor(f.id, f.total) c
WHERE f.saldo IS DISTINCT FROM c.o_saldo
   OR f.pagado IS DISTINCT FROM c.o_pagado
ORDER BY f.id;

-- b) Facturas creadas desde el Dashboard de Contabilidad con retención,
--    donde el total quedó en bruto (total <> subtotal + iva - retencion)
SELECT id, numero_factura, subtotal, iva, retencion, total,
       subtotal + iva - retencion AS total_esperado
FROM public.facturas_proveedores
WHERE coalesce(retencion, 0) <> 0
  AND total IS DISTINCT FROM subtotal + iva - retencion
ORDER BY id;

-- =====================================================================
-- CORRECCIÓN (ejecutar SOLO después de revisar los resultados de arriba)
-- =====================================================================
-- Recalcular el saldo de todas las facturas según sus pagos:
--   UPDATE public.facturas_proveedores SET total = total;
--
-- Corregir una factura concreta de la consulta (b) dejando el total en neto:
--   UPDATE public.facturas_proveedores SET total = subtotal + iva - retencion WHERE id = <ID>;
