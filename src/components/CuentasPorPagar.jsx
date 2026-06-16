import React, { useState, useEffect } from 'react';
import './CuentasPorPagar.css';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

const CuentasPorPagar = () => {
  // Estados principales
  const [vistaActual, setVistaActual] = useState('dashboard'); // dashboard, proveedores, facturas, pagos
  const [vistaFacturas, setVistaFacturas] = useState('detallada'); // detallada, compacta
  const [proveedores, setProveedores] = useState([]);
  const [facturas, setFacturas] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroProveedor, setFiltroProveedor] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  
  // Filtros para historial de pagos
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('');
  const [filtroFechaFin, setFiltroFechaFin] = useState('');
  const [filtroProveedorPagos, setFiltroProveedorPagos] = useState('todos');
  const [filtroFacturaPagos, setFiltroFacturaPagos] = useState('todos');
  
  // Modales y formularios
  const [modalProveedor, setModalProveedor] = useState(false);
  const [modalFactura, setModalFactura] = useState(false);
  const [modalPago, setModalPago] = useState(false);
  const [modalDetallePagos, setModalDetallePagos] = useState(false);
  const [proveedorEditando, setProveedorEditando] = useState(null);
  const [facturaEditando, setFacturaEditando] = useState(null);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
  const [facturaParaDetalle, setFacturaParaDetalle] = useState(null);
  
  // Formulario de proveedor
  const [formProveedor, setFormProveedor] = useState({
    nombre: '',
    nit: '',
    telefono: '',
    email: '',
    direccion: '',
    contacto: '',
    terminoPago: '30' // días
  });
  
  // Formulario de factura
  const [formFactura, setFormFactura] = useState({
    proveedorId: '',
    numeroFactura: '',
    fechaEmision: '',
    fechaVencimiento: '',
    clase: 'FP', // FP: Factura Proveedor, NC: Nota Crédito, ND: Nota Débito
    subtotal: '',
    iva: '',
    retencion: '',
    total: '',
    descripcion: '',
    archivo: null
  });
  
  // Formulario de pago
  const [formPago, setFormPago] = useState({
    facturaId: '',
    fecha: new Date().toISOString().split('T')[0],
    monto: '',
    metodoPago: 'transferencia', // transferencia, efectivo, cheque, tarjeta
    referencia: '',
    banco: '',
    nota: ''
  });

  // Funciones para cargar datos desde Supabase
  const cargarProveedores = async () => {
    try {
      const { data, error } = await supabase
        .from('proveedores')
        .select('*')
        .order('nombre', { ascending: true });
      
      if (error) throw error;
      
      // Convertir nombres de columnas de snake_case a camelCase
      const proveedoresFormateados = data.map(p => ({
        id: p.id,
        nombre: p.nombre,
        nit: p.nit,
        telefono: p.telefono,
        email: p.email,
        direccion: p.direccion,
        contacto: p.contacto,
        terminoPago: p.termino_pago,
        activo: p.activo,
        fechaCreacion: p.created_at
      }));
      
      setProveedores(proveedoresFormateados);
    } catch (error) {
      console.error('Error al cargar proveedores:', error);
      alert('Error al cargar proveedores');
    }
  };

  const cargarFacturas = async () => {
    try {
      const { data, error } = await supabase
        .from('facturas_proveedores')
        .select('*')
        .order('fecha_emision', { ascending: false });
      
      if (error) throw error;
      
      // Convertir nombres de columnas de snake_case a camelCase
      const facturasFormateadas = data.map(f => {
        let total = parseFloat(f.total);
        let subtotal = parseFloat(f.subtotal);
        let iva = parseFloat(f.iva);
        let saldo = parseFloat(f.saldo);
        
        // Asegurar que NC siempre sea negativo
        if (f.clase === 'NC') {
          total = -Math.abs(total);
          subtotal = -Math.abs(subtotal);
          iva = -Math.abs(iva);
          saldo = -Math.abs(saldo);
        }
        
        return {
          id: f.id,
          proveedorId: f.proveedor_id,
          numeroFactura: f.numero_factura,
          fechaEmision: f.fecha_emision,
          fechaVencimiento: f.fecha_vencimiento,
          clase: f.clase,
          subtotal: subtotal,
          iva: iva,
          retencion: parseFloat(f.retencion),
          total: total,
          pagado: parseFloat(f.pagado),
          saldo: saldo,
          estado: f.estado,
          descripcion: f.descripcion,
          archivo: f.archivo_url,
          fechaCreacion: f.created_at
        };
      });
      
      setFacturas(facturasFormateadas);
    } catch (error) {
      console.error('Error al cargar facturas:', error);
      alert('Error al cargar facturas');
    }
  };

  const cargarPagos = async () => {
    try {
      const { data, error } = await supabase
        .from('pagos_proveedores')
        .select('*')
        .order('fecha', { ascending: false });
      
      if (error) throw error;
      
      // Convertir nombres de columnas de snake_case a camelCase
      const pagosFormateados = data.map(p => ({
        id: p.id,
        facturaId: p.factura_id,
        fecha: p.fecha,
        monto: parseFloat(p.monto),
        metodoPago: p.metodo_pago,
        referencia: p.referencia,
        banco: p.banco,
        nota: p.nota,
        usuario: p.usuario,
        fechaCreacion: p.created_at
      }));
      
      setPagos(pagosFormateados);
    } catch (error) {
      console.error('Error al cargar pagos:', error);
      alert('Error al cargar pagos');
    }
  };

  // Inicializar datos desde Supabase
  useEffect(() => {
    cargarProveedores();
    cargarFacturas();
    cargarPagos();
  }, []);

  // Calcular días de vencimiento
  const calcularDiasVencimiento = (fechaVencimiento) => {
    if (!fechaVencimiento) return null;
    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    const diferencia = Math.ceil((vencimiento - hoy) / (1000 * 60 * 60 * 24));
    return diferencia;
  };

  // Actualizar estado de facturas
  useEffect(() => {
    const facturasActualizadas = facturas.map(factura => {
      if (factura.saldo === 0) {
        return { ...factura, estado: 'pagada' };
      }
      
      if (factura.fechaVencimiento) {
        const dias = calcularDiasVencimiento(factura.fechaVencimiento);
        if (dias < 0 && factura.saldo > 0) {
          return { ...factura, estado: 'vencida', diasVencimiento: dias };
        }
        return { ...factura, diasVencimiento: dias };
      }
      
      return factura;
    });
    
    if (JSON.stringify(facturasActualizadas) !== JSON.stringify(facturas)) {
      setFacturas(facturasActualizadas);
    }
  }, [facturas]);

  // Funciones de formateo
  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '$0';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // Métricas del dashboard
  // Función: Calcular total real por proveedor (FP + NC + ND)
  // Los valores ya están con signo correcto: FP(+), NC(-), ND(+)
  const calcularTotalPorProveedor = (proveedorId) => {
    return facturas
      .filter(f => f.proveedorId === proveedorId && f.estado !== 'pagada')
      .reduce((sum, f) => {
        // Suma automática considerando signos:
        // FP (positivo) + NC (negativo) + ND (positivo)
        return sum + f.total;
      }, 0);
  };

  const calcularMetricas = () => {
    // Calcular total considerando FP - NC + ND, descuentar lo pagado
    let totalPorPagar = 0;
    proveedores.forEach(p => {
      if (p.activo) {
        const totalProveedor = calcularTotalPorProveedor(p.id);
        const pagadoProveedor = pagos
          .filter(pago => {
            const factura = facturas.find(f => f.id === pago.facturaId);
            return factura && factura.proveedorId === p.id;
          })
          .reduce((sum, p) => sum + p.monto, 0);
        totalPorPagar += Math.max(0, totalProveedor - pagadoProveedor);
      }
    });
    
    const facturasVencidas = facturas.filter(f => f.estado === 'vencida').length;
    
    // Monto vencido considerando NC (ya con signo correcto)
    const montoVencido = facturas
      .filter(f => f.estado === 'vencida')
      .reduce((sum, f) => {
        return sum + f.saldo;  // Suma automática con signos correctos
      }, 0);
    
    const proximasVencer = facturas.filter(f => {
      return f.diasVencimiento !== null && f.diasVencimiento > 0 && f.diasVencimiento <= 7 && f.saldo > 0;
    }).length;
    
    const totalPagado = pagos.reduce((sum, p) => sum + p.monto, 0);
    
    return {
      totalPorPagar: Math.max(0, totalPorPagar),
      facturasVencidas,
      montoVencido: Math.max(0, montoVencido),
      proximasVencer,
      totalPagado,
      totalFacturas: facturas.length,
      totalProveedores: proveedores.filter(p => p.activo).length
    };
  };

  // Obtener proveedor por ID
  const obtenerProveedor = (id) => {
    return proveedores.find(p => p.id === id);
  };

  // Obtener facturas por proveedor
  const obtenerFacturasPorProveedor = (proveedorId) => {
    return facturas.filter(f => f.proveedorId === proveedorId);
  };

  // Obtener pagos por factura
  const obtenerPagosPorFactura = (facturaId) => {
    return pagos.filter(p => p.facturaId === facturaId);
  };

  // Handler para cambios en formularios
  const handleChangeProveedor = (e) => {
    const { name, value } = e.target;
    setFormProveedor(prev => ({ ...prev, [name]: value }));
  };

  const handleChangeFactura = (e) => {
    const { name, value } = e.target;
    setFormFactura(prev => {
      const updated = { ...prev, [name]: value };
      
      // Calcular total automáticamente
      if (['subtotal', 'iva', 'retencion'].includes(name)) {
        const subtotal = parseFloat(updated.subtotal) || 0;
        const iva = parseFloat(updated.iva) || 0;
        const retencion = parseFloat(updated.retencion) || 0;
        updated.total = subtotal + iva - retencion;
      }
      
      return updated;
    });
  };

  const handleChangePago = (e) => {
    const { name, value } = e.target;
    setFormPago(prev => ({ ...prev, [name]: value }));
  };

  // Guardar proveedor
  const guardarProveedor = async () => {
    if (!formProveedor.nombre || !formProveedor.nit) {
      alert('Nombre y NIT son requeridos');
      return;
    }

    try {
      // Preparar datos en formato snake_case para Supabase
      const datosProveedor = {
        nombre: formProveedor.nombre,
        nit: formProveedor.nit,
        telefono: formProveedor.telefono || null,
        email: formProveedor.email || null,
        direccion: formProveedor.direccion || null,
        contacto: formProveedor.contacto || null,
        termino_pago: parseInt(formProveedor.terminoPago) || 30,
        activo: true
      };

      if (proveedorEditando) {
        // Editar
        const { error } = await supabase
          .from('proveedores')
          .update(datosProveedor)
          .eq('id', proveedorEditando.id);
        
        if (error) throw error;
        alert('Proveedor actualizado exitosamente');
      } else {
        // Crear nuevo
        const { error } = await supabase
          .from('proveedores')
          .insert([datosProveedor]);
        
        if (error) throw error;
        alert('Proveedor creado exitosamente');
      }

      // Recargar proveedores
      await cargarProveedores();
      cerrarModalProveedor();
    } catch (error) {
      console.error('Error al guardar proveedor:', error);
      alert('Error al guardar proveedor: ' + error.message);
    }
  };

  // Guardar factura
  const guardarFactura = async () => {
    if (!formFactura.proveedorId || !formFactura.numeroFactura || !formFactura.total) {
      alert('Proveedor, número de factura y total son requeridos');
      return;
    }

    let total = parseFloat(formFactura.total);
    let subtotal = parseFloat(formFactura.subtotal) || 0;
    let iva = parseFloat(formFactura.iva) || 0;
    let retencion = parseFloat(formFactura.retencion) || 0;
    
    // Si es Nota Crédito o Nota Débito, convertir a negativo/positivo según corresponda
    const clase = formFactura.clase || 'FP';
    if (clase === 'NC') {
      // Nota Crédito: SIEMPRE negativo (descuento al proveedor)
      total = -Math.abs(total);
      subtotal = -Math.abs(subtotal);
      iva = -Math.abs(iva);
      retencion = -Math.abs(retencion);
    } else if (clase === 'ND') {
      // Nota Débito: SIEMPRE positivo (cargo al proveedor)
      total = Math.abs(total);
      subtotal = Math.abs(subtotal);
      iva = Math.abs(iva);
      retencion = Math.abs(retencion);
    }
    
    try {
      // Preparar datos en formato snake_case para Supabase
      const datosFactura = {
        proveedor_id: parseInt(formFactura.proveedorId),
        numero_factura: formFactura.numeroFactura,
        fecha_emision: formFactura.fechaEmision,
        fecha_vencimiento: formFactura.fechaVencimiento || null,
        clase: clase,
        subtotal: subtotal,
        iva: iva,
        retencion: retencion,
        total: total,
        descripcion: formFactura.descripcion || null,
        archivo_url: formFactura.archivo || null
      };

      if (facturaEditando) {
        // Editar
        const { error } = await supabase
          .from('facturas_proveedores')
          .update(datosFactura)
          .eq('id', facturaEditando.id);
        
        if (error) throw error;
        alert('Factura actualizada exitosamente');
      } else {
        // Crear nueva
        const { error } = await supabase
          .from('facturas_proveedores')
          .insert([datosFactura]);
        
        if (error) throw error;
        alert('Factura creada exitosamente');
      }

      // Recargar facturas
      await cargarFacturas();
      cerrarModalFactura();
    } catch (error) {
      console.error('Error al guardar factura:', error);
      alert('Error al guardar factura: ' + error.message);
    }
  };

  // Guardar pago
  const guardarPago = async () => {
    if (!formPago.facturaId || !formPago.monto) {
      alert('Factura y monto son requeridos');
      return;
    }

    const monto = parseFloat(formPago.monto);
    const factura = facturas.find(f => f.id === parseInt(formPago.facturaId));
    
    if (!factura) {
      alert('Factura no encontrada');
      return;
    }

    if (monto > factura.saldo) {
      alert('El monto del pago no puede ser mayor al saldo pendiente');
      return;
    }

    try {
      // Preparar datos en formato snake_case para Supabase
      const datosPago = {
        factura_id: parseInt(formPago.facturaId),
        fecha: formPago.fecha,
        monto: monto,
        metodo_pago: formPago.metodoPago,
        referencia: formPago.referencia || null,
        banco: formPago.banco || null,
        nota: formPago.nota || null,
        usuario: 'Edwin Marín' // Usuario actual de la sesión
      };

      // Insertar pago (el trigger actualizará automáticamente la factura)
      const { error } = await supabase
        .from('pagos_proveedores')
        .insert([datosPago]);
      
      if (error) throw error;

      alert('Pago registrado exitosamente');
      
      // Recargar datos
      await cargarFacturas();
      await cargarPagos();
      cerrarModalPago();
    } catch (error) {
      console.error('Error al guardar pago:', error);
      alert('Error al guardar pago: ' + error.message);
    }
  };

  // Abrir modales
  const abrirModalProveedor = (proveedor = null) => {
    if (proveedor) {
      setProveedorEditando(proveedor);
      setFormProveedor(proveedor);
    } else {
      setProveedorEditando(null);
      setFormProveedor({
        nombre: '',
        nit: '',
        telefono: '',
        email: '',
        direccion: '',
        contacto: '',
        terminoPago: '30'
      });
    }
    setModalProveedor(true);
  };

  const abrirModalFactura = (factura = null) => {
    if (factura) {
      setFacturaEditando(factura);
      setFormFactura({
        proveedorId: factura.proveedorId.toString(),
        numeroFactura: factura.numeroFactura,
        fechaEmision: factura.fechaEmision,
        fechaVencimiento: factura.fechaVencimiento,
        clase: factura.clase,
        subtotal: factura.subtotal.toString(),
        iva: factura.iva.toString(),
        retencion: factura.retencion.toString(),
        total: factura.total.toString(),
        descripcion: factura.descripcion
      });
    } else {
      setFacturaEditando(null);
      setFormFactura({
        proveedorId: '',
        numeroFactura: '',
        fechaEmision: new Date().toISOString().split('T')[0],
        fechaVencimiento: '',
        clase: 'FP',
        subtotal: '',
        iva: '',
        retencion: '',
        total: '',
        descripcion: ''
      });
    }
    setModalFactura(true);
  };

  const abrirModalPago = (factura = null) => {
    if (factura) {
      setFacturaSeleccionada(factura);
      setFormPago({
        facturaId: factura.id.toString(),
        fecha: new Date().toISOString().split('T')[0],
        monto: factura.saldo.toString(),
        metodoPago: 'transferencia',
        referencia: '',
        banco: '',
        nota: ''
      });
    } else {
      setFacturaSeleccionada(null);
      setFormPago({
        facturaId: '',
        fecha: new Date().toISOString().split('T')[0],
        monto: '',
        metodoPago: 'transferencia',
        referencia: '',
        banco: '',
        nota: ''
      });
    }
    setModalPago(true);
  };

  const abrirModalDetallePagos = (factura) => {
    setFacturaParaDetalle(factura);
    setModalDetallePagos(true);
  };

  // Cerrar modales
  const cerrarModalProveedor = () => {
    setModalProveedor(false);
    setProveedorEditando(null);
  };

  const cerrarModalFactura = () => {
    setModalFactura(false);
    setFacturaEditando(null);
  };

  const cerrarModalPago = () => {
    setModalPago(false);
    setFacturaSeleccionada(null);
  };

  const cerrarModalDetallePagos = () => {
    setModalDetallePagos(false);
    setFacturaParaDetalle(null);
  };

  // Filtrar facturas
  const facturasFiltradas = facturas.filter(factura => {
    const matchEstado = filtroEstado === 'todos' || factura.estado === filtroEstado;
    const matchProveedor = filtroProveedor === 'todos' || factura.proveedorId === parseInt(filtroProveedor);
    const matchBusqueda = busqueda === '' || 
      factura.numeroFactura.toLowerCase().includes(busqueda.toLowerCase()) ||
      obtenerProveedor(factura.proveedorId)?.nombre.toLowerCase().includes(busqueda.toLowerCase());
    
    return matchEstado && matchProveedor && matchBusqueda;
  });

  const escapeHtml = (value) => {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const formatMoneySimple = (value) => {
    const numero = Number(value || 0);
    const valorFormateado = new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.abs(numero));
    return `${numero < 0 ? '-' : ''}$ ${valorFormateado}`;
  };

  const imprimirInformeCartera = () => {
    if (facturasFiltradas.length === 0) {
      alert('No hay registros para generar el informe con los filtros actuales.');
      return;
    }

    const proveedorSeleccionado =
      filtroProveedor === 'todos'
        ? 'Todos los proveedores'
        : obtenerProveedor(parseInt(filtroProveedor))?.nombre || 'Proveedor no encontrado';

    const fechaGeneracion = new Date().toLocaleString('es-CO');

    const filas = facturasFiltradas
      .map((factura) => {
        const demora = factura.diasVencimiento !== null && factura.diasVencimiento !== undefined
          ? -factura.diasVencimiento
          : '';

        const basePP = (parseFloat(factura.subtotal) || 0) + (parseFloat(factura.iva) || 0);
        const descuento = parseFloat(factura.retencion) || 0;
        const aPagar = parseFloat(factura.saldo) || 0;

        return `
          <tr>
            <td>${escapeHtml(factura.numeroFactura)}</td>
            <td>${escapeHtml(factura.clase)}</td>
            <td>${escapeHtml(formatDate(factura.fechaEmision))}</td>
            <td>${escapeHtml(formatDate(factura.fechaVencimiento))}</td>
            <td class="demora-cell">${escapeHtml(demora === '' ? '' : demora.toString())}</td>
            <td class="money-cell">${escapeHtml(formatMoneySimple(factura.total))}</td>
            <td class="money-cell">${escapeHtml(formatMoneySimple(basePP))}</td>
            <td class="money-cell">${escapeHtml(formatMoneySimple(descuento))}</td>
            <td class="money-cell total-pagar">${escapeHtml(formatMoneySimple(aPagar))}</td>
          </tr>
        `;
      })
      .join('');

    const totalAPagar = facturasFiltradas.reduce((sum, factura) => {
      return sum + (parseFloat(factura.saldo) || 0);
    }, 0);

    const ventana = window.open('', '_blank', 'width=1400,height=900');

    if (!ventana) {
      alert('No se pudo abrir la ventana de impresión. Verifica que el navegador no esté bloqueando popups.');
      return;
    }

    ventana.document.write(`
      <!doctype html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Informe Cuentas por Pagar</title>
        <style>
          body {
            font-family: Arial, Helvetica, sans-serif;
            margin: 18px;
            color: #111827;
          }
          .header {
            margin-bottom: 14px;
          }
          .header h1 {
            margin: 0;
            font-size: 22px;
          }
          .meta {
            margin-top: 4px;
            font-size: 13px;
            color: #334155;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
          }
          th, td {
            border: 1px solid #1f2937;
            padding: 8px 10px;
            text-align: center;
          }
          th {
            background: #dbeafe;
            font-weight: 700;
          }
          .money-cell {
            text-align: right;
            white-space: nowrap;
          }
          .demora-cell {
            background: #d9f2d0;
            font-weight: 700;
          }
          .total-row td {
            font-weight: 700;
            font-size: 16px;
            background: #f8fafc;
          }
          .total-label {
            text-align: right;
          }
          .total-pagar {
            font-weight: 700;
          }
          @media print {
            body {
              margin: 8px;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>INFORME DE CUENTAS POR PAGAR</h1>
          <div class="meta"><strong>Proveedor:</strong> ${escapeHtml(proveedorSeleccionado)}</div>
          <div class="meta"><strong>Registros:</strong> ${facturasFiltradas.length}</div>
          <div class="meta"><strong>Generado:</strong> ${escapeHtml(fechaGeneracion)}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>REF DOC</th>
              <th>CLASE</th>
              <th>FH BASE</th>
              <th>FH PAGO</th>
              <th>DEMORA</th>
              <th>IMPORTE</th>
              <th>BASE PP</th>
              <th>DESCUENTO</th>
              <th>A PAGAR</th>
            </tr>
          </thead>
          <tbody>
            ${filas}
            <tr class="total-row">
              <td class="total-label" colspan="8">TOTAL</td>
              <td class="money-cell">${escapeHtml(formatMoneySimple(totalAPagar))}</td>
            </tr>
          </tbody>
        </table>

        <script>
          window.onload = function () {
            window.focus();
            window.print();
          };
        </script>
      </body>
      </html>
    `);

    ventana.document.close();
  };

  const exportarInformeCarteraExcel = () => {
    if (facturasFiltradas.length === 0) {
      alert('No hay registros para exportar con los filtros actuales.');
      return;
    }

    const proveedorSeleccionado =
      filtroProveedor === 'todos'
        ? 'Todos los proveedores'
        : obtenerProveedor(parseInt(filtroProveedor))?.nombre || 'Proveedor no encontrado';

    const fechaGeneracion = new Date().toLocaleString('es-CO');

    // Preparar datos para Excel (agregar nombre del proveedor)
    const datos = facturasFiltradas.map((factura) => {
      const demora = factura.diasVencimiento !== null && factura.diasVencimiento !== undefined
        ? -factura.diasVencimiento
        : '';

      const basePP = (parseFloat(factura.subtotal) || 0) + (parseFloat(factura.iva) || 0);
      const descuento = parseFloat(factura.retencion) || 0;
      const aPagar = parseFloat(factura.saldo) || 0;

      return {
        'REF DOC': factura.numeroFactura,
        'CLASE': factura.clase,
        'PROVEEDOR': obtenerProveedor(factura.proveedorId)?.nombre || '',
        'FH BASE': formatDate(factura.fechaEmision),
        'FH PAGO': formatDate(factura.fechaVencimiento),
        'DEMORA': demora === '' ? '' : demora,
        'IMPORTE': factura.total,
        'BASE PP': basePP,
        'DESCUENTO': descuento,
        'A PAGAR': aPagar
      };
    });

    const totalAPagar = facturasFiltradas.reduce((sum, factura) => {
      return sum + (parseFloat(factura.saldo) || 0);
    }, 0);

    // Agregar fila de totales (mantener columna PROVEEDOR)
    datos.push({
      'REF DOC': 'TOTAL',
      'CLASE': '',
      'PROVEEDOR': '',
      'FH BASE': '',
      'FH PAGO': '',
      'DEMORA': '',
      'IMPORTE': '',
      'BASE PP': '',
      'DESCUENTO': '',
      'A PAGAR': totalAPagar
    });

    // Crear workbook
    const ws = XLSX.utils.json_to_sheet(datos, {
      header: ['REF DOC', 'CLASE', 'PROVEEDOR', 'FH BASE', 'FH PAGO', 'DEMORA', 'IMPORTE', 'BASE PP', 'DESCUENTO', 'A PAGAR']
    });

    // Ajustar ancho de columnas
    ws['!cols'] = [
      { wch: 15 }, // REF DOC
      { wch: 10 }, // CLASE
      { wch: 30 }, // PROVEEDOR
      { wch: 12 }, // FH BASE
      { wch: 12 }, // FH PAGO
      { wch: 10 }, // DEMORA
      { wch: 14 }, // IMPORTE
      { wch: 14 }, // BASE PP
      { wch: 14 }, // DESCUENTO
      { wch: 14 }  // A PAGAR
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cartera');

    // Agregar hoja con metadatos
    const metaData = [
      ['INFORME DE CUENTAS POR PAGAR'],
      [''],
      ['Proveedor:', proveedorSeleccionado],
      ['Registros:', facturasFiltradas.length],
      ['Generado:', fechaGeneracion]
    ];

    const wsMeta = XLSX.utils.aoa_to_sheet(metaData);
    wsMeta['!cols'] = [{ wch: 20 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsMeta, 'Información');

    // Generar archivo
    const fileName = `informe_cartera_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Obtener clase CSS por estado
  const getEstadoClase = (estado) => {
    switch(estado) {
      case 'pagada': return 'estado-pagada';
      case 'parcial': return 'estado-parcial';
      case 'vencida': return 'estado-vencida';
      default: return 'estado-pendiente';
    }
  };

  const getEstadoTexto = (estado) => {
    switch(estado) {
      case 'pagada': return 'Pagada';
      case 'parcial': return 'Parcial';
      case 'vencida': return 'Vencida';
      default: return 'Pendiente';
    }
  };

  const metricas = calcularMetricas();

  return (
    <div className="cuentas-por-pagar-container">
      {/* Header */}
      <div className="cpp-header">
        <h1>💰 Gestión de Gastos Empresa - Proveedores</h1>
        <p>Control y registro de pagos a proveedores y cuentas por pagar</p>
      </div>

      {/* Navegación de vistas */}
      <div className="cpp-nav">
        <button 
          className={`nav-btn ${vistaActual === 'dashboard' ? 'active' : ''}`}
          onClick={() => setVistaActual('dashboard')}
        >
          📊 Dashboard
        </button>
        <button 
          className={`nav-btn ${vistaActual === 'facturas' ? 'active' : ''}`}
          onClick={() => setVistaActual('facturas')}
        >
          📄 Facturas
        </button>
        <button 
          className={`nav-btn ${vistaActual === 'proveedores' ? 'active' : ''}`}
          onClick={() => setVistaActual('proveedores')}
        >
          🏢 Proveedores
        </button>
        <button 
          className={`nav-btn ${vistaActual === 'pagos' ? 'active' : ''}`}
          onClick={() => setVistaActual('pagos')}
        >
          💳 Historial de Pagos
        </button>
      </div>

      {/* VISTA DASHBOARD */}
      {vistaActual === 'dashboard' && (
        <div className="dashboard-view">
          {/* Métricas principales */}
          <div className="metricas-grid">
            <div className="metrica-card total-por-pagar">
              <div className="metrica-icono">💰</div>
              <div className="metrica-info">
                <span className="metrica-label">Total por Pagar</span>
                <span className="metrica-valor">{formatCurrency(metricas.totalPorPagar)}</span>
              </div>
            </div>

            <div className="metrica-card facturas-vencidas">
              <div className="metrica-icono">⚠️</div>
              <div className="metrica-info">
                <span className="metrica-label">Facturas Vencidas</span>
                <span className="metrica-valor">{metricas.facturasVencidas}</span>
                <span className="metrica-sublabel">{formatCurrency(metricas.montoVencido)}</span>
              </div>
            </div>

            <div className="metrica-card proximas-vencer">
              <div className="metrica-icono">⏰</div>
              <div className="metrica-info">
                <span className="metrica-label">Próximas a Vencer (7 días)</span>
                <span className="metrica-valor">{metricas.proximasVencer}</span>
              </div>
            </div>

            <div className="metrica-card total-pagado">
              <div className="metrica-icono">✅</div>
              <div className="metrica-info">
                <span className="metrica-label">Total Pagado</span>
                <span className="metrica-valor">{formatCurrency(metricas.totalPagado)}</span>
              </div>
            </div>
          </div>

          {/* Facturas vencidas - Alerta */}
          {metricas.facturasVencidas > 0 && (
            <div className="alerta-vencidas">
              <h3>⚠️ Facturas Vencidas que Requieren Atención</h3>
              <div className="tabla-wrapper">
                <table className="cpp-table">
                  <thead>
                    <tr>
                      <th>Proveedor</th>
                      <th>N° Factura</th>
                      <th>Vencimiento</th>
                      <th>Días Vencidos</th>
                      <th>Saldo</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facturas
                      .filter(f => f.estado === 'vencida')
                      .map(factura => {
                        const proveedor = obtenerProveedor(factura.proveedorId);
                        return (
                          <tr key={factura.id} className="fila-vencida">
                            <td>{proveedor?.nombre}</td>
                            <td className="numero-factura">{factura.numeroFactura}</td>
                            <td>{formatDate(factura.fechaVencimiento)}</td>
                            <td className="dias-vencidos">{Math.abs(factura.diasVencimiento)} días</td>
                            <td className="saldo-pendiente">{formatCurrency(factura.saldo)}</td>
                            <td>
                              <button 
                                className="btn-pagar-rapido"
                                onClick={() => abrirModalPago(factura)}
                              >
                                💳 Pagar
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Próximas a vencer */}
          {metricas.proximasVencer > 0 && (
            <div className="alerta-proximas">
              <h3>⏰ Facturas Próximas a Vencer</h3>
              <div className="tabla-wrapper">
                <table className="cpp-table">
                  <thead>
                    <tr>
                      <th>Proveedor</th>
                      <th>N° Factura</th>
                      <th>Vencimiento</th>
                    <th>Días Restantes</th>
                      <th>Saldo</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facturas
                      .filter(f => f.diasVencimiento !== null && f.diasVencimiento > 0 && f.diasVencimiento <= 7 && f.saldo > 0)
                      .sort((a, b) => a.diasVencimiento - b.diasVencimiento)
                      .map(factura => {
                        const proveedor = obtenerProveedor(factura.proveedorId);
                        return (
                          <tr key={factura.id}>
                            <td>{proveedor?.nombre}</td>
                            <td className="numero-factura">{factura.numeroFactura}</td>
                            <td>{formatDate(factura.fechaVencimiento)}</td>
                            <td className="dias-restantes">{factura.diasVencimiento} días</td>
                            <td className="saldo-pendiente">{formatCurrency(factura.saldo)}</td>
                            <td>
                              <button 
                                className="btn-pagar-rapido"
                                onClick={() => abrirModalPago(factura)}
                              >
                                💳 Pagar
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Resumen por proveedor */}
          <div className="resumen-proveedores">
            <h3>📊 Resumen por Proveedor</h3>
            <div className="proveedores-resumen-grid">
              {proveedores.map(proveedor => {
                const facturasProveedor = obtenerFacturasPorProveedor(proveedor.id);
                const totalAdeudado = facturasProveedor
                  .filter(f => f.estado !== 'pagada')
                  .reduce((sum, f) => sum + f.saldo, 0);
                const facturasVencidas = facturasProveedor.filter(f => f.estado === 'vencida').length;
                
                if (totalAdeudado === 0 && facturasVencidas === 0) return null;
                
                return (
                  <div key={proveedor.id} className="proveedor-resumen-card">
                    <h4>{proveedor.nombre}</h4>
                    <div className="proveedor-stats">
                      <div className="stat">
                        <span className="stat-label">Saldo Pendiente</span>
                        <span className="stat-valor">{formatCurrency(totalAdeudado)}</span>
                      </div>
                      {facturasVencidas > 0 && (
                        <div className="stat vencidas">
                          <span className="stat-label">Facturas Vencidas</span>
                          <span className="stat-valor alert">{facturasVencidas}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VISTA FACTURAS */}
      {vistaActual === 'facturas' && (
        <div className="facturas-view">
          {/* Cabecera con acciones */}
          <div className="view-header">
            <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
              <button className="btn-primary" onClick={() => abrirModalFactura()}>
                ➕ Nueva Factura
              </button>

              <button className="btn-secondary" onClick={imprimirInformeCartera}>
                🖨️ Imprimir informe
              </button>

              <button className="btn-secondary" onClick={exportarInformeCarteraExcel}>
                📊 Exportar Excel
              </button>
              
              <div className="view-toggle" style={{display: 'flex', gap: '5px', borderRadius: '8px', padding: '4px', background: '#f1f5f9'}}>
                <button 
                  className={`toggle-btn ${vistaFacturas === 'detallada' ? 'active' : ''}`}
                  onClick={() => setVistaFacturas('detallada')}
                  title="Vista Detallada con Tarjetas"
                >
                  📋 Detallada
                </button>
                <button 
                  className={`toggle-btn ${vistaFacturas === 'compacta' ? 'active' : ''}`}
                  onClick={() => setVistaFacturas('compacta')}
                  title="Vista Compacta en Tabla"
                >
                  📊 Compacta
                </button>
              </div>
            </div>

            <div className="filtros-facturas">
              <select 
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="filtro-select"
              >
                <option value="todos">Todos los Estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="parcial">Parcial</option>
                <option value="pagada">Pagada</option>
                <option value="vencida">Vencida</option>
              </select>

              <select 
                value={filtroProveedor}
                onChange={(e) => setFiltroProveedor(e.target.value)}
                className="filtro-select"
              >
                <option value="todos">Todos los Proveedores</option>
                {proveedores.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>

              <input 
                type="text"
                placeholder="Buscar factura..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="filtro-input"
              />
            </div>
          </div>

          {/* VISTA DETALLADA - TARJETAS */}
          {vistaFacturas === 'detallada' && (
            <div className="facturas-lista">
              {facturasFiltradas.length === 0 ? (
                <div className="text-center" style={{padding: '40px', color: '#94a3b8'}}>
                  No hay facturas que coincidan con los filtros
                </div>
              ) : (
                facturasFiltradas.map(factura => {
                  const proveedor = obtenerProveedor(factura.proveedorId);
                  const pagosPorFactura = obtenerPagosPorFactura(factura.id);
                  
                  return (
                    <div key={factura.id} className={`factura-card ${getEstadoClase(factura.estado)}`}>
                      {/* Encabezado: Proveedor y NIT */}
                      <div className="factura-card-header">
                        <div className="proveedor-info">
                          <h4>{proveedor?.nombre}</h4>
                          <span className="nit">{proveedor?.nit}</span>
                        </div>
                        <span className={`estado-badge ${getEstadoClase(factura.estado)}`}>
                          {getEstadoTexto(factura.estado)}
                        </span>
                      </div>

                      {/* Contenido: Datos de la factura */}
                      <div className="factura-card-body">
                        <div className="datos-grid">
                          {/* Columna 1: Número y Clase */}
                          <div className="dato-bloque">
                            <div className="dato">
                              <span className="etiqueta">N° Factura</span>
                              <span className="valor numero-factura">{factura.numeroFactura}</span>
                            </div>
                            <div className="dato">
                              <span className="etiqueta">Clase</span>
                              {factura.clase === 'FP' && (
                                <span className="clase-badge clase-fp">📊 FP</span>
                              )}
                              {factura.clase === 'NC' && (
                                <span className="clase-badge clase-nc">✅ NC</span>
                              )}
                              {factura.clase === 'ND' && (
                                <span className="clase-badge clase-nd">⚠️ ND</span>
                              )}
                            </div>
                          </div>

                          {/* Columna 2: Fechas */}
                          <div className="dato-bloque">
                            <div className="dato">
                              <span className="etiqueta">Emisión</span>
                              <span className="valor">{formatDate(factura.fechaEmision)}</span>
                            </div>
                            <div className="dato">
                              <span className="etiqueta">Vencimiento</span>
                              <span className="valor">
                                {formatDate(factura.fechaVencimiento)}
                                {factura.diasVencimiento !== null && factura.diasVencimiento < 0 && (
                                  <div className="dias-vencidos-badge">
                                    {Math.abs(factura.diasVencimiento)}d vencida
                                  </div>
                                )}
                                {factura.diasVencimiento !== null && factura.diasVencimiento > 0 && factura.diasVencimiento <= 7 && (
                                  <div className="dias-restantes-badge">
                                    {factura.diasVencimiento}d restantes
                                  </div>
                                )}
                              </span>
                            </div>
                          </div>

                          {/* Columna 3: Montos */}
                          <div className="dato-bloque">
                            <div className="dato">
                              <span className="etiqueta">Total</span>
                              <span className="valor monto">{formatCurrency(factura.total)}</span>
                            </div>
                            <div className="dato">
                              <span className="etiqueta">Pagado</span>
                              <span className="valor monto pagado">{formatCurrency(factura.pagado)}</span>
                            </div>
                            <div className="dato">
                              <span className="etiqueta">Saldo</span>
                              <span className="valor monto saldo">{formatCurrency(factura.saldo)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Pie: Acciones */}
                      <div className="factura-card-footer">
                        <div className="acciones-btn-group">
                          {factura.saldo > 0 && (
                            <button 
                              className="btn-accion btn-pagar"
                              onClick={() => abrirModalPago(factura)}
                              title="Registrar pago"
                            >
                              💳 Pagar
                            </button>
                          )}
                          <button 
                            className="btn-accion btn-editar"
                            onClick={() => abrirModalFactura(factura)}
                            title="Editar"
                          >
                            ✏️ Editar
                          </button>
                          {pagosPorFactura.length > 0 && (
                            <button 
                              className="btn-accion btn-info"
                              onClick={() => abrirModalDetallePagos(factura)}
                              title={`${pagosPorFactura.length} pago(s) registrado(s) - Click para ver detalle`}
                            >
                              📋 {pagosPorFactura.length}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* VISTA COMPACTA - TABLA */}
          {vistaFacturas === 'compacta' && (
            <div className="tabla-wrapper">
              {facturasFiltradas.length === 0 ? (
                <div className="text-center" style={{padding: '20px', color: '#94a3b8'}}>
                  No hay facturas que coincidan con los filtros
                </div>
              ) : (
                <table className="cpp-table">
                  <thead>
                    <tr>
                      <th>Proveedor</th>
                      <th>N° Factura</th>
                      <th>Clase</th>
                      <th>Emisión</th>
                      <th>Vencimiento</th>
                      <th>Total</th>
                      <th>Pagado</th>
                      <th>Saldo</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facturasFiltradas.map(factura => {
                      const proveedor = obtenerProveedor(factura.proveedorId);
                      const pagosPorFactura = obtenerPagosPorFactura(factura.id);
                      return (
                        <tr key={factura.id} className={getEstadoClase(factura.estado)}>
                          <td>
                            <strong>{proveedor?.nombre}</strong>
                            <br />
                            <small>{proveedor?.nit}</small>
                          </td>
                          <td className="numero-factura">{factura.numeroFactura}</td>
                          <td>
                            {factura.clase === 'FP' && (
                              <span className="clase-badge clase-fp">📊 FP</span>
                            )}
                            {factura.clase === 'NC' && (
                              <span className="clase-badge clase-nc">✅ NC</span>
                            )}
                            {factura.clase === 'ND' && (
                              <span className="clase-badge clase-nd">⚠️ ND</span>
                            )}
                          </td>
                          <td>{formatDate(factura.fechaEmision)}</td>
                          <td>
                            {formatDate(factura.fechaVencimiento)}
                            {factura.diasVencimiento !== null && factura.diasVencimiento < 0 && (
                              <div className="dias-vencidos-badge">
                                {Math.abs(factura.diasVencimiento)}d vencida
                              </div>
                            )}
                            {factura.diasVencimiento !== null && factura.diasVencimiento > 0 && factura.diasVencimiento <= 7 && (
                              <div className="dias-restantes-badge">
                                {factura.diasVencimiento}d restantes
                              </div>
                            )}
                          </td>
                          <td className="monto">{formatCurrency(factura.total)}</td>
                          <td className="monto pagado">{formatCurrency(factura.pagado)}</td>
                          <td className="monto saldo">{formatCurrency(factura.saldo)}</td>
                          <td>
                            <span className={`estado-badge ${getEstadoClase(factura.estado)}`}>
                              {getEstadoTexto(factura.estado)}
                            </span>
                          </td>
                          <td>
                            <div className="acciones-btn-group">
                              {factura.saldo > 0 && (
                                <button 
                                  className="btn-accion btn-pagar"
                                  onClick={() => abrirModalPago(factura)}
                                  title="Registrar pago"
                                >
                                  💳
                                </button>
                              )}
                              <button 
                                className="btn-accion btn-editar"
                                onClick={() => abrirModalFactura(factura)}
                                title="Editar"
                              >
                                ✏️
                              </button>
                              {pagosPorFactura.length > 0 && (
                                <button 
                                  className="btn-accion btn-info"
                                  onClick={() => abrirModalDetallePagos(factura)}
                                  title={`${pagosPorFactura.length} pago(s) registrado(s) - Click para ver detalle`}
                                >
                                  📋 {pagosPorFactura.length}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Resumen de facturas */}
          <div className="facturas-resumen">
            <div className="resumen-item">
              <span className="label">Total Facturas:</span>
              <span className="valor">{facturasFiltradas.length}</span>
            </div>
            <div className="resumen-item">
              <span className="label">Total a Pagar:</span>
              <span className="valor saldo">{formatCurrency(
                facturasFiltradas.filter(f => f.estado !== 'pagada').reduce((sum, f) => sum + f.saldo, 0)
              )}</span>
            </div>
          </div>
        </div>
      )}

      {/* VISTA PROVEEDORES */}
      {vistaActual === 'proveedores' && (
        <div className="proveedores-view">
          {/* Cabecera */}
          <div className="view-header">
            <button className="btn-primary" onClick={() => abrirModalProveedor()}>
              ➕ Nuevo Proveedor
            </button>
          </div>

          {/* Grid de proveedores */}
          <div className="proveedores-grid">
            {proveedores.map(proveedor => {
              const facturasProveedor = obtenerFacturasPorProveedor(proveedor.id);
              const totalFacturas = facturasProveedor.length;
              const facturasActivas = facturasProveedor.filter(f => f.estado !== 'pagada').length;
              const saldoPendiente = facturasProveedor
                .filter(f => f.estado !== 'pagada')
                .reduce((sum, f) => sum + f.saldo, 0);
              
              return (
                <div key={proveedor.id} className="proveedor-card">
                  <div className="proveedor-header">
                    <h3>{proveedor.nombre}</h3>
                    {!proveedor.activo && <span className="badge-inactivo">Inactivo</span>}
                  </div>
                  
                  <div className="proveedor-info">
                    <div className="info-row">
                      <span className="info-label">NIT:</span>
                      <span className="info-valor">{proveedor.nit}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Contacto:</span>
                      <span className="info-valor">{proveedor.contacto}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Teléfono:</span>
                      <span className="info-valor">{proveedor.telefono}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Email:</span>
                      <span className="info-valor">{proveedor.email}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Término de Pago:</span>
                      <span className="info-valor">{proveedor.terminoPago} días</span>
                    </div>
                  </div>

                  <div className="proveedor-stats">
                    <div className="stat-item">
                      <span className="stat-label">Total Facturas</span>
                      <span className="stat-valor">{totalFacturas}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Facturas Activas</span>
                      <span className="stat-valor">{facturasActivas}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Saldo Pendiente</span>
                      <span className="stat-valor saldo">{formatCurrency(saldoPendiente)}</span>
                    </div>
                  </div>

                  <div className="proveedor-acciones">
                    <button 
                      className="btn-secondary"
                      onClick={() => abrirModalProveedor(proveedor)}
                    >
                      ✏️ Editar
                    </button>
                    <button 
                      className="btn-secondary"
                      onClick={() => {
                        setVistaActual('facturas');
                        setFiltroProveedor(proveedor.id.toString());
                      }}
                    >
                      📄 Ver Facturas
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VISTA HISTORIAL DE PAGOS */}
      {vistaActual === 'pagos' && (
        <div className="pagos-view">
          <div className="view-header">
            <h2>💳 Historial de Pagos</h2>
          </div>

          {/* Filtros */}
          <div className="filtros-section">
            <div className="filtros-grid">
              <div className="filtro-item">
                <label>📅 Fecha Inicio</label>
                <input 
                  type="date" 
                  value={filtroFechaInicio}
                  onChange={(e) => setFiltroFechaInicio(e.target.value)}
                  className="filtro-input"
                />
              </div>
              
              <div className="filtro-item">
                <label>📅 Fecha Fin</label>
                <input 
                  type="date" 
                  value={filtroFechaFin}
                  onChange={(e) => setFiltroFechaFin(e.target.value)}
                  className="filtro-input"
                />
              </div>
              
              <div className="filtro-item">
                <label>🏢 Proveedor</label>
                <select 
                  value={filtroProveedorPagos}
                  onChange={(e) => setFiltroProveedorPagos(e.target.value)}
                  className="filtro-select"
                >
                  <option value="todos">Todos los proveedores</option>
                  {proveedores.map(prov => (
                    <option key={prov.id} value={prov.id}>{prov.nombre}</option>
                  ))}
                </select>
              </div>
              
              <div className="filtro-item">
                <label>📄 Factura</label>
                <select 
                  value={filtroFacturaPagos}
                  onChange={(e) => setFiltroFacturaPagos(e.target.value)}
                  className="filtro-select"
                >
                  <option value="todos">Todas las facturas</option>
                  {facturas.map(fact => (
                    <option key={fact.id} value={fact.id}>
                      {fact.numeroFactura} - {obtenerProveedor(fact.proveedorId)?.nombre}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="filtro-item">
                <button 
                  className="btn-limpiar-filtros"
                  onClick={() => {
                    setFiltroFechaInicio('');
                    setFiltroFechaFin('');
                    setFiltroProveedorPagos('todos');
                    setFiltroFacturaPagos('todos');
                  }}
                >
                  🔄 Limpiar Filtros
                </button>
              </div>
            </div>
          </div>

          <div className="tabla-wrapper">
            <table className="cpp-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Proveedor</th>
                  <th>N° Factura</th>
                  <th>Monto</th>
                  <th>Método</th>
                  <th>Referencia</th>
                  <th>Banco</th>
                  <th>Usuario</th>
                  <th>Nota</th>
                </tr>
              </thead>
              <tbody>
                {pagos.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center">No hay pagos registrados</td>
                  </tr>
                ) : (
                  pagos
                    .filter(pago => {
                      const factura = facturas.find(f => f.id === pago.facturaId);
                      const proveedor = obtenerProveedor(factura?.proveedorId);
                      
                      // Filtro por fecha inicio
                      if (filtroFechaInicio && pago.fecha < filtroFechaInicio) {
                        return false;
                      }
                      
                      // Filtro por fecha fin
                      if (filtroFechaFin && pago.fecha > filtroFechaFin) {
                        return false;
                      }
                      
                      // Filtro por proveedor
                      if (filtroProveedorPagos !== 'todos' && factura?.proveedorId !== parseInt(filtroProveedorPagos)) {
                        return false;
                      }
                      
                      // Filtro por factura
                      if (filtroFacturaPagos !== 'todos' && pago.facturaId !== parseInt(filtroFacturaPagos)) {
                        return false;
                      }
                      
                      return true;
                    })
                    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
                    .map(pago => {
                      const factura = facturas.find(f => f.id === pago.facturaId);
                      const proveedor = obtenerProveedor(factura?.proveedorId);
                      
                      return (
                        <tr key={pago.id}>
                          <td>{formatDate(pago.fecha)}</td>
                          <td>{proveedor?.nombre || 'N/A'}</td>
                          <td className="numero-factura">{factura?.numeroFactura || 'N/A'}</td>
                          <td className="monto pagado">{formatCurrency(pago.monto)}</td>
                          <td>
                            <span className="metodo-badge">{pago.metodoPago}</span>
                          </td>
                          <td className="referencia">{pago.referencia || '-'}</td>
                          <td>{pago.banco || '-'}</td>
                          <td>{pago.usuario}</td>
                          <td><small>{pago.nota || '-'}</small></td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>

          {/* Resumen de pagos */}
          <div className="pagos-resumen">
            <div className="resumen-item">
              <span className="label">Total Pagos:</span>
              <span className="valor">{pagos.length}</span>
            </div>
            <div className="resumen-item">
              <span className="label">Monto Total:</span>
              <span className="valor">{formatCurrency(pagos.reduce((sum, p) => sum + p.monto, 0))}</span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PROVEEDOR */}
      {modalProveedor && (
        <div className="modal-overlay" onClick={cerrarModalProveedor}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{proveedorEditando ? '✏️ Editar Proveedor' : '➕ Nuevo Proveedor'}</h2>
              <button className="modal-close" onClick={cerrarModalProveedor}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Nombre *</label>
                  <input 
                    type="text"
                    name="nombre"
                    value={formProveedor.nombre}
                    onChange={handleChangeProveedor}
                    placeholder="Nombre del proveedor"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>NIT *</label>
                  <input 
                    type="text"
                    name="nit"
                    value={formProveedor.nit}
                    onChange={handleChangeProveedor}
                    placeholder="900.123.456-7"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Teléfono</label>
                  <input 
                    type="tel"
                    name="telefono"
                    value={formProveedor.telefono}
                    onChange={handleChangeProveedor}
                    placeholder="601-234-5678"
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input 
                    type="email"
                    name="email"
                    value={formProveedor.email}
                    onChange={handleChangeProveedor}
                    placeholder="contacto@proveedor.com"
                  />
                </div>

                <div className="form-group">
                  <label>Persona de Contacto</label>
                  <input 
                    type="text"
                    name="contacto"
                    value={formProveedor.contacto}
                    onChange={handleChangeProveedor}
                    placeholder="Nombre del contacto"
                  />
                </div>

                <div className="form-group">
                  <label>Término de Pago (días)</label>
                  <input 
                    type="number"
                    name="terminoPago"
                    value={formProveedor.terminoPago}
                    onChange={handleChangeProveedor}
                    placeholder="30"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Dirección</label>
                  <textarea 
                    name="direccion"
                    value={formProveedor.direccion}
                    onChange={handleChangeProveedor}
                    rows="2"
                    placeholder="Dirección completa del proveedor"
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={cerrarModalProveedor}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={guardarProveedor}>
                💾 Guardar Proveedor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FACTURA */}
      {modalFactura && (
        <div className="modal-overlay" onClick={cerrarModalFactura}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{facturaEditando ? '✏️ Editar Factura' : '➕ Nueva Factura'}</h2>
              <button className="modal-close" onClick={cerrarModalFactura}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Proveedor *</label>
                  <select 
                    name="proveedorId"
                    value={formFactura.proveedorId}
                    onChange={handleChangeFactura}
                    required
                  >
                    <option value="">Seleccione un proveedor</option>
                    {proveedores.filter(p => p.activo).map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Número de Factura *</label>
                  <input 
                    type="text"
                    name="numeroFactura"
                    value={formFactura.numeroFactura}
                    onChange={handleChangeFactura}
                    placeholder="FP-2026-001"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Clase *</label>
                  <select 
                    name="clase"
                    value={formFactura.clase}
                    onChange={handleChangeFactura}
                  >
                    <option value="FP">FP - Factura Proveedor</option>
                    <option value="NC">NC - Nota Crédito</option>
                    <option value="ND">ND - Nota Débito</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Fecha de Emisión *</label>
                  <input 
                    type="date"
                    name="fechaEmision"
                    value={formFactura.fechaEmision}
                    onChange={handleChangeFactura}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Fecha de Vencimiento</label>
                  <input 
                    type="date"
                    name="fechaVencimiento"
                    value={formFactura.fechaVencimiento}
                    onChange={handleChangeFactura}
                  />
                </div>

                <div className="form-group">
                  <label>Subtotal</label>
                  <input 
                    type="number"
                    name="subtotal"
                    value={formFactura.subtotal}
                    onChange={handleChangeFactura}
                    placeholder="0"
                    step="1000"
                  />
                </div>

                <div className="form-group">
                  <label>IVA (19%)</label>
                  <input 
                    type="number"
                    name="iva"
                    value={formFactura.iva}
                    onChange={handleChangeFactura}
                    placeholder="0"
                    step="1000"
                  />
                </div>

                <div className="form-group">
                  <label>Retención</label>
                  <input 
                    type="number"
                    name="retencion"
                    value={formFactura.retencion}
                    onChange={handleChangeFactura}
                    placeholder="0"
                    step="1000"
                  />
                </div>

                <div className="form-group">
                  <label>Total *</label>
                  <input 
                    type="number"
                    name="total"
                    value={formFactura.total}
                    onChange={handleChangeFactura}
                    placeholder="0"
                    step="1000"
                    required
                    className="input-destacado"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Descripción</label>
                  <textarea 
                    name="descripcion"
                    value={formFactura.descripcion}
                    onChange={handleChangeFactura}
                    rows="3"
                    placeholder="Descripción de la factura o productos/servicios"
                  />
                </div>
              </div>

              {/* Vista previa del cálculo */}
              {formFactura.subtotal && (
                <div className="calculo-preview">
                  <h4>📋 Vista Previa del Cálculo</h4>
                  <div className="calculo-grid">
                    <div className="calculo-item">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(parseFloat(formFactura.subtotal) || 0)}</span>
                    </div>
                    <div className="calculo-item">
                      <span>IVA:</span>
                      <span className="positive">+{formatCurrency(parseFloat(formFactura.iva) || 0)}</span>
                    </div>
                    <div className="calculo-item">
                      <span>Retención:</span>
                      <span className="negative">-{formatCurrency(parseFloat(formFactura.retencion) || 0)}</span>
                    </div>
                    <div className="calculo-item total">
                      <span>Total:</span>
                      <span className="total-valor">{formatCurrency(parseFloat(formFactura.total) || 0)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={cerrarModalFactura}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={guardarFactura}>
                💾 Guardar Factura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PAGO */}
      {modalPago && (
        <div className="modal-overlay" onClick={cerrarModalPago}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>💳 Registrar Pago</h2>
              <button className="modal-close" onClick={cerrarModalPago}>×</button>
            </div>
            
            <div className="modal-body">
              {/* Información de la factura */}
              {facturaSeleccionada && (
                <div className="factura-info-pago">
                  <h4>📄 Información de la Factura</h4>
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="label">Proveedor:</span>
                      <span className="valor">{obtenerProveedor(facturaSeleccionada.proveedorId)?.nombre}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">N° Factura:</span>
                      <span className="valor">{facturaSeleccionada.numeroFactura}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Total Factura:</span>
                      <span className="valor">{formatCurrency(facturaSeleccionada.total)}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Ya Pagado:</span>
                      <span className="valor positive">{formatCurrency(facturaSeleccionada.pagado)}</span>
                    </div>
                    <div className="info-item destacado">
                      <span className="label">Saldo Pendiente:</span>
                      <span className="valor saldo">{formatCurrency(facturaSeleccionada.saldo)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="form-grid">
                {!facturaSeleccionada && (
                  <div className="form-group full-width">
                    <label>Factura *</label>
                    <select 
                      name="facturaId"
                      value={formPago.facturaId}
                      onChange={handleChangePago}
                      required
                    >
                      <option value="">Seleccione una factura</option>
                      {facturas
                        .filter(f => f.saldo > 0)
                        .map(f => {
                          const proveedor = obtenerProveedor(f.proveedorId);
                          return (
                            <option key={f.id} value={f.id}>
                              {proveedor?.nombre} - {f.numeroFactura} - Saldo: {formatCurrency(f.saldo)}
                            </option>
                          );
                        })}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label>Fecha de Pago *</label>
                  <input 
                    type="date"
                    name="fecha"
                    value={formPago.fecha}
                    onChange={handleChangePago}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Monto del Pago *</label>
                  <input 
                    type="number"
                    name="monto"
                    value={formPago.monto}
                    onChange={handleChangePago}
                    placeholder="0"
                    step="1000"
                    required
                    className="input-destacado"
                  />
                </div>

                <div className="form-group">
                  <label>Método de Pago *</label>
                  <select 
                    name="metodoPago"
                    value={formPago.metodoPago}
                    onChange={handleChangePago}
                  >
                    <option value="transferencia">Transferencia Bancaria</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="cheque">Cheque</option>
                    <option value="tarjeta">Tarjeta</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Referencia/Número</label>
                  <input 
                    type="text"
                    name="referencia"
                    value={formPago.referencia}
                    onChange={handleChangePago}
                    placeholder="TRANS-2026-001"
                  />
                </div>

                <div className="form-group">
                  <label>Banco</label>
                  <input 
                    type="text"
                    name="banco"
                    value={formPago.banco}
                    onChange={handleChangePago}
                    placeholder="Bancolombia, Davivienda, etc."
                  />
                </div>

                <div className="form-group full-width">
                  <label>Nota/Observación</label>
                  <textarea 
                    name="nota"
                    value={formPago.nota}
                    onChange={handleChangePago}
                    rows="2"
                    placeholder="Nota adicional sobre el pago"
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={cerrarModalPago}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={guardarPago}>
                💾 Registrar Pago
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALLE DE PAGOS */}
      {modalDetallePagos && facturaParaDetalle && (
        <div className="modal-overlay" onClick={cerrarModalDetallePagos}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📋 Pagos Registrados</h2>
              <button className="modal-close" onClick={cerrarModalDetallePagos}>×</button>
            </div>
            
            <div className="modal-body">
              {/* Información de la factura */}
              <div className="factura-info-pago">
                <h4>📄 Información de la Factura</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="label">Proveedor:</span>
                    <span className="valor">{obtenerProveedor(facturaParaDetalle.proveedorId)?.nombre}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">N° Factura:</span>
                    <span className="valor">{facturaParaDetalle.numeroFactura}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Total Factura:</span>
                    <span className="valor">{formatCurrency(facturaParaDetalle.total)}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Total Pagado:</span>
                    <span className="valor positive">{formatCurrency(facturaParaDetalle.pagado)}</span>
                  </div>
                  <div className="info-item destacado">
                    <span className="label">Saldo Pendiente:</span>
                    <span className="valor saldo">{formatCurrency(facturaParaDetalle.saldo)}</span>
                  </div>
                </div>
              </div>

              {/* Lista de pagos */}
              <div style={{marginTop: '20px'}}>
                <h4 style={{marginBottom: '15px', color: '#1e293b'}}>💰 Historial de Pagos</h4>
                {obtenerPagosPorFactura(facturaParaDetalle.id).length === 0 ? (
                  <div style={{textAlign: 'center', padding: '20px', color: '#94a3b8'}}>
                    No hay pagos registrados para esta factura
                  </div>
                ) : (
                  <div className="tabla-wrapper">
                    <table className="cpp-table" style={{minWidth: 'auto'}}>
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Monto</th>
                          <th>Método</th>
                          <th>Referencia</th>
                          <th>Banco</th>
                          <th>Nota</th>
                        </tr>
                      </thead>
                      <tbody>
                        {obtenerPagosPorFactura(facturaParaDetalle.id).map(pago => (
                          <tr key={pago.id}>
                            <td>{formatDate(pago.fecha)}</td>
                            <td className="monto" style={{fontWeight: 'bold', color: '#059669'}}>
                              {formatCurrency(pago.monto)}
                            </td>
                            <td>
                              <span className="metodo-badge">{pago.metodoPago}</span>
                            </td>
                            <td style={{fontFamily: 'monospace', fontSize: '0.9rem'}}>
                              {pago.referencia || '-'}
                            </td>
                            <td>{pago.banco || '-'}</td>
                            <td style={{fontSize: '0.85rem', color: '#64748b'}}>
                              {pago.nota || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={cerrarModalDetallePagos}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CuentasPorPagar;
