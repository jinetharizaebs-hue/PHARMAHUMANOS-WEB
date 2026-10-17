-- Bucket de imágenes de productos en Supabase Storage (reemplaza a Cloudinary).
-- Ejecutar una vez en Supabase > SQL Editor.
--
-- - Lectura pública (las imágenes se ven en el catálogo sin iniciar sesión).
-- - Solo superadmin, admin e inventario pueden subir, reemplazar o borrar.
-- - Máx. 2 MB por archivo y solo imágenes (el formulario ya las comprime a ~100 KB).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('productos', 'productos', true, 2097152, ARRAY['image/webp', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Imagenes productos lectura publica" ON storage.objects;
DROP POLICY IF EXISTS "Imagenes productos subir staff" ON storage.objects;
DROP POLICY IF EXISTS "Imagenes productos actualizar staff" ON storage.objects;
DROP POLICY IF EXISTS "Imagenes productos borrar staff" ON storage.objects;

CREATE POLICY "Imagenes productos lectura publica"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'productos');

CREATE POLICY "Imagenes productos subir staff"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'productos'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('superadmin', 'admin', 'inventario')
  );

CREATE POLICY "Imagenes productos actualizar staff"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'productos'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('superadmin', 'admin', 'inventario')
  );

CREATE POLICY "Imagenes productos borrar staff"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'productos'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('superadmin', 'admin', 'inventario')
  );
