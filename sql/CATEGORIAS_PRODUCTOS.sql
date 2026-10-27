-- =====================================================================
-- CATEGORÍAS DE PRODUCTOS EDITABLES DESDE LA APP
-- Ejecutar en Supabase > SQL Editor. Se puede ejecutar más de una vez.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tabla de categorías (la lista que aparece al crear un producto)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categorias_productos (
  id         BIGSERIAL PRIMARY KEY,
  nombre     VARCHAR(80) NOT NULL,
  activo     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS categorias_productos_nombre_unico
  ON public.categorias_productos (lower(nombre));

-- Las que estaban fijas en el código
INSERT INTO public.categorias_productos (nombre)
VALUES ('Populares'), ('Genéricos'), ('Medicamentos Éticos'), ('Ortopédicos'),
       ('Hospitalarios'), ('Insumos médicos'), ('Dispositivos médicos')
ON CONFLICT DO NOTHING;

-- Y cualquier otra que ya tengan los productos guardados
INSERT INTO public.categorias_productos (nombre)
SELECT DISTINCT trim(categoria)
FROM public.productos
WHERE categoria IS NOT NULL AND trim(categoria) <> ''
ON CONFLICT DO NOTHING;

-- Solo usuarios con sesión; sin acceso para visitantes
ALTER TABLE public.categorias_productos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.categorias_productos FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.categorias_productos TO authenticated;
GRANT USAGE ON SEQUENCE public.categorias_productos_id_seq TO authenticated;

-- Ver la lista: personal interno
DROP POLICY IF EXISTS categorias_productos_lectura ON public.categorias_productos;
CREATE POLICY categorias_productos_lectura ON public.categorias_productos
  FOR SELECT TO authenticated
  USING (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')
         IN ('superadmin', 'admin', 'contabilidad', 'vendedor'));

-- Crear / activar / desactivar: administración
DROP POLICY IF EXISTS categorias_productos_alta ON public.categorias_productos;
CREATE POLICY categorias_productos_alta ON public.categorias_productos
  FOR INSERT TO authenticated
  WITH CHECK (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')
              IN ('superadmin', 'admin'));

DROP POLICY IF EXISTS categorias_productos_edicion ON public.categorias_productos;
CREATE POLICY categorias_productos_edicion ON public.categorias_productos
  FOR UPDATE TO authenticated
  USING (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')
         IN ('superadmin', 'admin'))
  WITH CHECK (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')
              IN ('superadmin', 'admin'));

-- Revisión
SELECT id, nombre, activo FROM public.categorias_productos ORDER BY nombre;
