-- =====================================================================
-- PERMISOS DE LAS TABLAS DE CONTABILIDAD
-- Corrige: "permission denied for table pagos_proveedores" (y similares)
--
-- Tablas: proveedores, facturas_proveedores, pagos_proveedores, gastos_empresa
-- Acceso: solo usuarios con sesión y rol interno
--         (superadmin, admin, contabilidad, vendedor).
--         Visitantes sin sesión: sin acceso.
--
-- Ejecutar en Supabase > SQL Editor. Se puede ejecutar más de una vez.
-- =====================================================================

DO $$
DECLARE
  v_tabla TEXT;
  r RECORD;
BEGIN
  FOREACH v_tabla IN ARRAY ARRAY['proveedores', 'facturas_proveedores', 'pagos_proveedores', 'gastos_empresa'] LOOP
    -- Permisos de tabla: usuarios con sesión sí, visitantes no
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', v_tabla);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', v_tabla);

    -- Quitar políticas abiertas a cualquiera (USING (true))
    FOR r IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = v_tabla
        AND coalesce(qual, 'true') = 'true'
        AND coalesce(with_check, 'true') = 'true'
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, v_tabla);
    END LOOP;

    -- RLS activo + acceso solo para roles internos
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_tabla);
    EXECUTE format('DROP POLICY IF EXISTS contabilidad_personal_interno ON public.%I', v_tabla);
    EXECUTE format($p$
      CREATE POLICY contabilidad_personal_interno ON public.%I
        FOR ALL TO authenticated
        USING (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')
               IN ('superadmin', 'admin', 'contabilidad', 'vendedor'))
        WITH CHECK (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')
                    IN ('superadmin', 'admin', 'contabilidad', 'vendedor'))
    $p$, v_tabla);
  END LOOP;
END $$;

-- Secuencias de los id (necesarias para crear registros)
DO $$
DECLARE
  v_secuencia TEXT;
BEGIN
  FOR v_secuencia IN
    SELECT pg_get_serial_sequence('public.' || t, 'id')
    FROM unnest(ARRAY['proveedores', 'facturas_proveedores', 'pagos_proveedores', 'gastos_empresa']) AS t
  LOOP
    IF v_secuencia IS NOT NULL THEN
      EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %s TO authenticated', v_secuencia);
      EXECUTE format('REVOKE ALL ON SEQUENCE %s FROM anon', v_secuencia);
    END IF;
  END LOOP;
END $$;

-- =====================================================================
-- VERIFICACIÓN: cada tabla debe mostrar rls = true y authenticated con permisos
-- =====================================================================
SELECT c.relname AS tabla,
       c.relrowsecurity AS rls,
       has_table_privilege('authenticated', c.oid, 'SELECT') AS authenticated_lee,
       has_table_privilege('authenticated', c.oid, 'INSERT') AS authenticated_crea,
       has_table_privilege('anon', c.oid, 'SELECT') AS anon_lee
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('proveedores', 'facturas_proveedores', 'pagos_proveedores', 'gastos_empresa', 'facturas', 'abonos')
ORDER BY c.relname;
