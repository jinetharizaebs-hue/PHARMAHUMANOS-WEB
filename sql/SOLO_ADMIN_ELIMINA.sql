-- =====================================================================
-- SOLO ADMIN / SUPERADMIN PUEDEN ELIMINAR PRODUCTOS, FACTURAS Y ABONOS
-- Ejecutar en Supabase > SQL Editor. Se puede ejecutar más de una vez.
--
-- La app ya pide la contraseña de un admin antes de eliminar, pero esa
-- verificación ocurre en el navegador. Estas políticas hacen que la base
-- de datos rechace el DELETE de cualquier otro rol aunque alguien llame
-- a la API directamente.
--
-- Son políticas RESTRICTIVE: se suman (con AND) a las que ya existan, así
-- que no abren ningún acceso nuevo; solo quitan el de eliminar.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Revisión previa: RLS debe estar activo en las tres tablas
--    (si alguna sale con rls_activo = false, avísame antes de seguir)
-- ---------------------------------------------------------------------
SELECT relname AS tabla, relrowsecurity AS rls_activo
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relname IN ('productos', 'facturas', 'abonos');

-- ---------------------------------------------------------------------
-- 2. Políticas (solo se crean en tablas con RLS activo)
-- ---------------------------------------------------------------------
DO $$
DECLARE
  v_tabla TEXT;
BEGIN
  FOREACH v_tabla IN ARRAY ARRAY['productos', 'facturas', 'abonos'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class
      WHERE relnamespace = 'public'::regnamespace AND relname = v_tabla AND relrowsecurity
    ) THEN
      RAISE NOTICE 'Tabla % sin RLS activo: no se creó la política', v_tabla;
      CONTINUE;
    END IF;

    EXECUTE format('DROP POLICY IF EXISTS solo_admin_elimina ON public.%I', v_tabla);
    EXECUTE format(
      'CREATE POLICY solo_admin_elimina ON public.%I AS RESTRICTIVE FOR DELETE TO public '
      'USING (coalesce(auth.jwt() -> ''app_metadata'' ->> ''role'', '''') IN (''superadmin'', ''admin''))',
      v_tabla
    );
    RAISE NOTICE 'Tabla %: solo admin/superadmin pueden eliminar', v_tabla;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 3. Comprobación: debe salir una fila por tabla
-- ---------------------------------------------------------------------
SELECT tablename AS tabla, policyname, permissive, cmd
FROM pg_policies
WHERE schemaname = 'public' AND policyname = 'solo_admin_elimina'
ORDER BY tablename;
