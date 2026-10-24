-- =====================================================================
-- SEGURIDAD - PASO 1 de 2
-- Función para que el catálogo público cree pedidos SIN poder leer,
-- modificar ni borrar la tabla pedidos.
--
-- Es seguro ejecutarlo en cualquier momento: solo AGREGA una función.
-- Ejecutar en Supabase > SQL Editor ANTES de desplegar el frontend nuevo.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.crear_pedido_catalogo(
  p_cliente_nombre    TEXT,
  p_cliente_telefono  TEXT,
  p_direccion_entrega TEXT,
  p_cliente_notas     TEXT,
  p_vendedor          TEXT,
  p_productos         JSONB,
  p_total             NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido JSONB;
BEGIN
  IF coalesce(btrim(p_cliente_nombre), '') = '' OR length(p_cliente_nombre) > 150 THEN
    RAISE EXCEPTION 'Nombre de cliente inválido';
  END IF;

  IF coalesce(p_cliente_telefono, '') !~ '^[0-9]{7,15}$' THEN
    RAISE EXCEPTION 'Teléfono inválido';
  END IF;

  IF length(coalesce(p_direccion_entrega, '')) > 300
     OR length(coalesce(p_cliente_notas, '')) > 1000
     OR length(coalesce(p_vendedor, '')) > 100 THEN
    RAISE EXCEPTION 'Datos demasiado largos';
  END IF;

  IF jsonb_typeof(p_productos) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_productos) = 0
     OR jsonb_array_length(p_productos) > 300 THEN
    RAISE EXCEPTION 'Lista de productos inválida';
  END IF;

  IF p_total IS NULL OR p_total < 0 THEN
    RAISE EXCEPTION 'Total inválido';
  END IF;

  INSERT INTO public.pedidos (
    cliente_nombre, cliente_telefono, direccion_entrega, cliente_notas,
    vendedor, productos, total, estado, fecha_creacion
  ) VALUES (
    btrim(p_cliente_nombre), p_cliente_telefono, coalesce(btrim(p_direccion_entrega), ''),
    coalesce(nullif(btrim(p_cliente_notas), ''), 'Ninguna'),
    coalesce(nullif(btrim(p_vendedor), ''), 'Sin asignar'),
    p_productos, p_total, 'pendiente', now()
  )
  RETURNING jsonb_build_object('id', id) INTO v_pedido;

  RETURN v_pedido;
END;
$$;

REVOKE ALL ON FUNCTION public.crear_pedido_catalogo(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crear_pedido_catalogo(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, NUMERIC) TO anon, authenticated;
