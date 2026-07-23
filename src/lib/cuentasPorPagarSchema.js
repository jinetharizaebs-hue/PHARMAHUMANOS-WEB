const toNumber = (value) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const normalizarFacturaProveedor = (factura = {}) => {
  let total = toNumber(factura.total);
  let subtotal = toNumber(factura.subtotal);
  let iva = toNumber(factura.iva);
  let saldo = toNumber(factura.saldo);

  if (factura.clase === 'NC') {
    total = -Math.abs(total);
    subtotal = -Math.abs(subtotal);
    iva = -Math.abs(iva);
    saldo = -Math.abs(saldo);
  }

  return {
    id: factura.id,
    proveedorId: factura.proveedor_id ?? factura.proveedorId ?? null,
    numeroFactura: factura.numero_factura ?? factura.numeroFactura ?? '',
    fechaEmision: factura.fecha_emision || factura.fecha || null,
    fechaVencimiento: factura.fecha_vencimiento || factura.fechaVencimiento || null,
    clase: factura.clase || 'FP',
    subtotal,
    iva,
    retencion: toNumber(factura.retencion),
    total,
    pagado: toNumber(factura.pagado),
    saldo,
    estado: factura.estado || (saldo === 0 ? 'pagada' : 'pendiente'),
    descripcion: factura.descripcion || '',
    archivo: factura.archivo_url || factura.archivo || null,
    fechaCreacion: factura.created_at || factura.fechaCreacion || null,
  };
};

export const normalizarPagoProveedor = (pago = {}) => ({
  id: pago.id,
  facturaId: pago.factura_id ?? pago.facturaId ?? null,
  fecha: pago.fecha || null,
  monto: toNumber(pago.monto),
  metodoPago: pago.metodo_pago || pago.metodoPago || 'transferencia',
  referencia: pago.referencia || '',
  banco: pago.banco || '',
  nota: pago.nota || pago.observaciones || '',
  usuario: pago.usuario || '',
  fechaCreacion: pago.created_at || pago.fechaCreacion || null,
});

export const construirPayloadFacturaProveedor = (formFactura) => ({
  numero_factura: formFactura.numeroFactura,
  proveedor_id: parseInt(formFactura.proveedorId, 10),
  total: parseFloat(formFactura.total) || 0,
  saldo: parseFloat(formFactura.total) || 0,
  estado: 'pendiente',
  fecha: formFactura.fechaEmision || new Date().toISOString().split('T')[0],
});

export const construirPayloadPagoProveedor = (formPago) => ({
  factura_id: parseInt(formPago.facturaId, 10),
  monto: parseFloat(formPago.monto) || 0,
  fecha: formPago.fecha || new Date().toISOString().split('T')[0],
  observaciones: formPago.nota || null,
});
