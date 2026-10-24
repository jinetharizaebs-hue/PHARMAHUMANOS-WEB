-- =====================================================================
-- EMPLEADOS EDITABLES Y CATEGORÍAS DE GASTOS UNIFICADAS
-- Ejecutar en Supabase > SQL Editor. Se puede ejecutar más de una vez.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tabla de empleados (la lista que aparece al registrar gastos)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.empleados (
  id         BIGSERIAL PRIMARY KEY,
  nombre     VARCHAR(100) NOT NULL,
  activo     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS empleados_nombre_unico
  ON public.empleados (lower(nombre));

INSERT INTO public.empleados (nombre)
VALUES ('Alan Diaz'), ('Jhon Diaz'), ('Andrea Gutiérrez')
ON CONFLICT DO NOTHING;

-- Solo usuarios con sesión; sin acceso para visitantes
ALTER TABLE public.empleados ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.empleados FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.empleados TO authenticated;
GRANT USAGE ON SEQUENCE public.empleados_id_seq TO authenticated;

-- Ver la lista: personal que registra gastos
DROP POLICY IF EXISTS empleados_lectura ON public.empleados;
CREATE POLICY empleados_lectura ON public.empleados
  FOR SELECT TO authenticated
  USING (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')
         IN ('superadmin', 'admin', 'contabilidad', 'vendedor'));

-- Agregar / activar / desactivar: administración y contabilidad
DROP POLICY IF EXISTS empleados_alta ON public.empleados;
CREATE POLICY empleados_alta ON public.empleados
  FOR INSERT TO authenticated
  WITH CHECK (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')
              IN ('superadmin', 'admin', 'contabilidad'));

DROP POLICY IF EXISTS empleados_edicion ON public.empleados;
CREATE POLICY empleados_edicion ON public.empleados
  FOR UPDATE TO authenticated
  USING (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')
         IN ('superadmin', 'admin', 'contabilidad'))
  WITH CHECK (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')
              IN ('superadmin', 'admin', 'contabilidad'));

-- ---------------------------------------------------------------------
-- 2. Unificar categorías ya guardadas (mismo criterio que
--    src/lib/gastosCatalogos.js)
-- ---------------------------------------------------------------------
UPDATE public.gastos_empresa SET categoria = 'Nómina'        WHERE categoria IN ('Nomina', 'nomina', 'NOMINA');
UPDATE public.gastos_empresa SET categoria = 'Viáticos'      WHERE categoria IN ('Viaticos', 'Viajes');
UPDATE public.gastos_empresa SET categoria = 'Capacitación'  WHERE categoria = 'Capacitacion';
UPDATE public.gastos_empresa SET categoria = 'Créditos'      WHERE categoria = 'Creditos';
UPDATE public.gastos_empresa SET categoria = 'Suministros'   WHERE categoria IN ('Materiales', 'Compras Oficina');
UPDATE public.gastos_empresa SET categoria = 'Mantenimiento' WHERE categoria = 'Arreglos';
UPDATE public.gastos_empresa SET categoria = 'Otros'         WHERE categoria = 'Varios';

-- Revisión: categorías que siguen fuera del catálogo (deberían salir 0 filas)
SELECT categoria, count(*) AS gastos
FROM public.gastos_empresa
WHERE categoria NOT IN (
  'Nómina', 'Arriendo', 'Servicios', 'EPS', 'Transporte', 'Gasolina', 'Parqueadero',
  'Pasajes', 'Viáticos', 'Comida', 'Suministros', 'Mantenimiento', 'Marketing',
  'Capacitación', 'Créditos', 'Fechas Especiales', 'Ofrenda', 'Cuidado Personal',
  'Antigripal Cuidado Respiratorio', 'Otros'
)
GROUP BY categoria;
