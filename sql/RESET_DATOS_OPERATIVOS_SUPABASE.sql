-- Vacia los datos operativos y conserva tablas, estructura, indices y permisos.
-- Ejecutar en Supabase SQL Editor con una cuenta administrativa.
BEGIN;

TRUNCATE TABLE
  detalles_pedido,
  preparaciones_pedidos,
  pedidos,
  abonos,
  detalles_factura,
  facturas,
  movimientos_inventario,
  historial_inventario,
  auditoria_productos,
  productos,
  pagos_proveedores,
  facturas_proveedores,
  proveedores,
  gastos_empresa,
  visits_cobro,
  clientes,
  vendedores,
  categories
RESTART IDENTITY CASCADE;

COMMIT;