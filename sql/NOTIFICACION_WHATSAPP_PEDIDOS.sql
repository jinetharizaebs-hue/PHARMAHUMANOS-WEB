-- =====================================================================
-- AVISO POR WHATSAPP (CallMeBot) CADA VEZ QUE ENTRA UN PEDIDO NUEVO
-- Destino: 3117709956
--
-- ANTES DE EJECUTAR:
--   1. Desde el WhatsApp del 3117709956, agrega el número de CallMeBot
--      (ver https://www.callmebot.com/blog/free-api-whatsapp-messages/)
--      y envíale:  I allow callmebot to send me messages
--   2. CallMeBot responde con tu apikey.
--   3. Guarda la apikey en el Vault de Supabase (SQL Editor), UNA sola vez:
--        SELECT vault.create_secret('TU_APIKEY_AQUI', 'callmebot_apikey');
--      Para cambiarla después:
--        SELECT vault.update_secret(
--          (SELECT id FROM vault.secrets WHERE name = 'callmebot_apikey'),
--          'NUEVA_APIKEY');
--      NO escribas la apikey en este archivo: el repositorio es público.
--   4. Ejecuta este archivo en Supabase > SQL Editor.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.notificar_pedido_whatsapp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_telefono  CONSTANT TEXT := '573117709956';
  v_apikey    TEXT;
  v_items     INTEGER;
  v_total     TEXT;
  v_mensaje   TEXT;
BEGIN
  SELECT decrypted_secret INTO v_apikey
  FROM vault.decrypted_secrets
  WHERE name = 'callmebot_apikey'
  LIMIT 1;

  IF v_apikey IS NULL THEN
    RAISE WARNING 'notificar_pedido_whatsapp: falta el secreto callmebot_apikey en Vault';
    RETURN NEW;
  END IF;

  BEGIN
    v_items := jsonb_array_length(to_jsonb(NEW.productos));
  EXCEPTION WHEN others THEN
    v_items := NULL;
  END;

  v_total := replace(to_char(coalesce(NEW.total, 0), 'FM999,999,999,990'), ',', '.');

  v_mensaje := '🛒 *NUEVO PEDIDO* #' || NEW.id
    || E'\n👤 Cliente: ' || coalesce(NEW.cliente_nombre, '-')
    || E'\n📞 Teléfono: ' || coalesce(NEW.cliente_telefono, '-')
    || E'\n📍 Dirección: ' || coalesce(nullif(NEW.direccion_entrega, ''), '-')
    || E'\n🧑‍💼 Vendedor: ' || coalesce(NEW.vendedor, '-')
    || coalesce(E'\n📦 Productos: ' || v_items, '')
    || E'\n💰 Total: $' || v_total;

  -- pg_net envía la petición en segundo plano: si CallMeBot falla,
  -- el pedido se guarda igual.
  PERFORM net.http_get(
    url    := 'https://api.callmebot.com/whatsapp.php',
    params := jsonb_build_object(
      'phone',  v_telefono,
      'text',   v_mensaje,
      'apikey', v_apikey
    )
  );

  RETURN NEW;
EXCEPTION WHEN others THEN
  RAISE WARNING 'notificar_pedido_whatsapp: %', SQLERRM;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notificar_pedido_whatsapp() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notificar_pedido_whatsapp ON public.pedidos;
CREATE TRIGGER trg_notificar_pedido_whatsapp
  AFTER INSERT ON public.pedidos
  FOR EACH ROW
  EXECUTE FUNCTION public.notificar_pedido_whatsapp();

-- =====================================================================
-- PRUEBA / DIAGNÓSTICO
-- =====================================================================
-- Enviar un mensaje de prueba sin crear un pedido:
--   SELECT net.http_get(
--     url := 'https://api.callmebot.com/whatsapp.php',
--     params := jsonb_build_object(
--       'phone', '573117709956',
--       'text', 'Prueba de avisos Pharmahumanos ✅',
--       'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'callmebot_apikey')));
--
-- Ver la respuesta de CallMeBot de los últimos envíos:
--   SELECT id, status_code, content, created FROM net._http_response ORDER BY created DESC LIMIT 10;
--
-- Desactivar los avisos temporalmente:
--   ALTER TABLE public.pedidos DISABLE TRIGGER trg_notificar_pedido_whatsapp;
