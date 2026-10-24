-- =====================================================================
-- SEGURIDAD - PASO 2 de 2
-- Cierra el acceso anónimo y limita las políticas "abiertas a todos"
-- (USING (true)) al personal interno.
--
-- ORDEN:
--   1. Ejecutar SEGURIDAD_PASO1_FUNCION_PEDIDO_CATALOGO.sql
--   2. Desplegar el frontend que usa crear_pedido_catalogo
--   3. Ejecutar ESTE archivo en Supabase > SQL Editor
--
-- Resultado:
--   - Visitantes sin sesión: solo leen productos activos (sin costo_compra)
--     y crean pedidos mediante crear_pedido_catalogo.
--   - Personal interno (superadmin, admin, contabilidad, inventario,
--     vendedor): mismo acceso que hoy.
--   - Cuentas sin rol o rol cliente: solo leen productos activos.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 0. ¿El usuario autenticado es personal interno? (rol en app_metadata)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.es_personal_interno()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')
         IN ('superadmin', 'admin', 'contabilidad', 'inventario', 'vendedor');
$$;

-- ---------------------------------------------------------------------
-- 1. Anónimos: retirar todos los permisos sobre tablas y secuencias
-- ---------------------------------------------------------------------
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- Que las tablas nuevas tampoco nazcan abiertas a anon
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES    FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;

-- Lo único que necesita el catálogo público (columnas usadas en CatalogoClientes.jsx)
GRANT SELECT (id, codigo, nombre, precio, categoria, descripcion, imagen_url, stock, activo, created_at)
  ON public.productos TO anon;

-- ---------------------------------------------------------------------
-- 2. Políticas "USING (true)" abiertas a todos -> solo personal interno
--    Se reemplaza cada una por otra equivalente (mismo comando y tabla)
--    pero condicionada a es_personal_interno().
-- ---------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  v_nombre TEXT;
  v_condicion TEXT;
BEGIN
  FOR r IN
    SELECT tablename, policyname, cmd
    FROM pg_policies
    WHERE schemaname = 'public'
      AND coalesce(qual, 'true') = 'true'
      AND coalesce(with_check, 'true') = 'true'
      AND roles && ARRAY['public', 'anon', 'authenticated']::name[]
  LOOP
    v_nombre := left('interno_' || r.policyname, 63);
    v_condicion := CASE r.cmd
      WHEN 'INSERT' THEN 'WITH CHECK (public.es_personal_interno())'
      WHEN 'SELECT' THEN 'USING (public.es_personal_interno())'
      WHEN 'DELETE' THEN 'USING (public.es_personal_interno())'
      ELSE 'USING (public.es_personal_interno()) WITH CHECK (public.es_personal_interno())'
    END;

    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_nombre, r.tablename);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR %s TO authenticated %s',
                   v_nombre, r.tablename, r.cmd, v_condicion);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 3. Tablas con RLS desactivado (p. ej. proveedores, facturas_proveedores,
--    pagos_proveedores): activarlo y dar acceso solo al personal interno
-- ---------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND NOT c.relrowsecurity
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.relname);
    EXECUTE format('DROP POLICY IF EXISTS interno_acceso_total ON public.%I', r.relname);
    EXECUTE format('CREATE POLICY interno_acceso_total ON public.%I FOR ALL TO authenticated
                    USING (public.es_personal_interno()) WITH CHECK (public.es_personal_interno())',
                   r.relname);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 4. Catálogo: visitantes y clientes ven solo productos activos
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS catalogo_lectura_productos_activos ON public.productos;
CREATE POLICY catalogo_lectura_productos_activos ON public.productos
  FOR SELECT TO anon, authenticated
  USING (activo = true);

-- ---------------------------------------------------------------------
-- 5. Storage: solo el personal interno sube/cambia/borra imágenes
-- ---------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, cmd
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE')
      AND coalesce(qual, '') || coalesce(with_check, '') LIKE '%productos%'
      AND coalesce(qual, '') || coalesce(with_check, '') NOT LIKE '%es_personal_interno%'
  LOOP
    EXECUTE format('ALTER POLICY %I ON storage.objects %s', r.policyname,
      CASE r.cmd
        WHEN 'INSERT' THEN 'WITH CHECK (bucket_id = ''productos'' AND public.es_personal_interno())'
        WHEN 'DELETE' THEN 'USING (bucket_id = ''productos'' AND public.es_personal_interno())'
        ELSE 'USING (bucket_id = ''productos'' AND public.es_personal_interno())
              WITH CHECK (bucket_id = ''productos'' AND public.es_personal_interno())'
      END);
  END LOOP;
END $$;

COMMIT;

-- =====================================================================
-- VERIFICACIÓN (ejecutar después y revisar el resultado)
-- =====================================================================

-- a) Ninguna tabla debe aparecer con rls_activo = false
SELECT c.relname AS tabla, c.relrowsecurity AS rls_activo
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY rls_activo, tabla;

-- b) Políticas que aún dejan pasar a cualquiera (debería quedar solo
--    catalogo_lectura_productos_activos, que filtra por activo = true)
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual IS NULL OR qual NOT LIKE '%es_personal_interno%')
  AND (with_check IS NULL OR with_check NOT LIKE '%es_personal_interno%')
ORDER BY tablename, policyname;

-- c) Funciones SECURITY DEFINER que anon puede ejecutar (revisar cada una)
SELECT p.proname
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prosecdef
  AND has_function_privilege('anon', p.oid, 'EXECUTE');
