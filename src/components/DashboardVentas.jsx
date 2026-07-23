import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
import { agruparUtilidadPorPeriodo, calcularRentabilidadFactura as calcularRentabilidadFacturaBase } from '../lib/rentabilidadUtils';
import './DashboardVentas.css';

const DashboardVentas = () => {
  const [facturasUltimos30Dias, setFacturasUltimos30Dias] = useState([]);
  const [ventasMesActual, setVentasMesActual] = useState(0);
  const [totalVentasAnual, setTotalVentasAnual] = useState(0);
  const [ventasMensuales, setVentasMensuales] = useState([]);
  const [ingresosDiarios, setIngresosDiarios] = useState([]);
  const [ventasPorVendedor, setVentasPorVendedor] = useState([]);
  const [cobrosMensuales, setCobrosMensuales] = useState([]);
  const [cobrosPorMes, setCobrosPorMes] = useState([]);
  const [estadoCobros, setEstadoCobros] = useState([]);
  const [totalCobradoAnual, setTotalCobradoAnual] = useState(0);
  const [cobrosUltimos30Dias, setCobrosUltimos30Dias] = useState(0);
  const [cobrosDiariosVendedor, setCobrosDiariosVendedor] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  // Nuevos estados para análisis detallado
  const [comparativaMensual, setComparativaMensual] = useState([]);
  const [ventasMensualesPorVendedor, setVentasMensualesPorVendedor] = useState([]);
  const [resumenVendedorDetallado, setResumenVendedorDetallado] = useState(null);
  const [vendedorSeleccionadoAnalisis, setVendedorSeleccionadoAnalisis] = useState('');
  const [variacionesPorcentuales, setVariacionesPorcentuales] = useState([]);
  // Estados para Reportes
  const [fechaInicio, setFechaInicio] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [fechaFin, setFechaFin] = useState(() => new Date().toISOString().split('T')[0]);
  const [vendedorSeleccionado, setVendedorSeleccionado] = useState('todos');
  const [estadoPagoSeleccionado, setEstadoPagoSeleccionado] = useState('todas');
  const [vendedoresLista, setVendedoresLista] = useState([]);
  const [reporteVentas, setReporteVentas] = useState([]);
  const [resumenReporte, setResumenReporte] = useState({
    total: 0,
    facturas: 0,
    promedio: 0,
    costoTotal: 0,
    utilidadTotal: 0,
    margenPromedio: 0
  });
  const [reporteLoading, setReporteLoading] = useState(false);
  const [periodicidadUtilidad, setPeriodicidadUtilidad] = useState('diaria');
  // Estados para Productos
  const [productosMasVendidos, setProductosMasVendidos] = useState([]);
  const [productosLoading, setProductosLoading] = useState(false);
  const [fechaInicioProductos, setFechaInicioProductos] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [fechaFinProductos, setFechaFinProductos] = useState(() => new Date().toISOString().split('T')[0]);
  const [busquedaProducto, setBusquedaProducto] = useState('');
  // Nuevos estados para filtros globales de fechas
  const [filtroFechaInicio, setFiltroFechaInicio] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [filtroFechaFin, setFiltroFechaFin] = useState(() => new Date().toISOString().split('T')[0]);
  const [mostrarFiltroFechas, setMostrarFiltroFechas] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [filtroFechaInicio, filtroFechaFin]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Usar los filtros globales de fecha
      const fechaInicioFiltro = filtroFechaInicio;
      const fechaFinFiltro = filtroFechaFin;
      const hoy = new Date();

      // 1. Facturas en el rango de fechas filtrado
      const { data: facturasData, error: facturasError } = await supabase
        .from('facturas')
        .select('fecha, total, cliente, vendedor')
        .gte('fecha', fechaInicioFiltro)
        .lte('fecha', fechaFinFiltro)
        .order('fecha', { ascending: true });

      if (facturasError) throw facturasError;
      setFacturasUltimos30Dias(facturasData || []);

      // 2. Ventas del mes actual (siempre del mes actual, no del filtro)
      const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const { data: ventasMesData, error: ventasMesError } = await supabase
        .from('facturas')
        .select('total')
        .gte('fecha', primerDiaMes.toISOString().split('T')[0])
        .lte('fecha', hoy.toISOString().split('T')[0]);

      if (ventasMesError) throw ventasMesError;
      const totalVentasMes = ventasMesData.reduce((sum, venta) => sum + (parseFloat(venta.total) || 0), 0);
      setVentasMesActual(totalVentasMes);

      // 3. Total ventas anual (siempre del año actual)
      const primerDiaAnio = new Date(hoy.getFullYear(), 0, 1);
      const { data: ventasAnualData, error: ventasAnualError } = await supabase
        .from('facturas')
        .select('total')
        .gte('fecha', primerDiaAnio.toISOString().split('T')[0])
        .lte('fecha', hoy.toISOString().split('T')[0]);

      if (ventasAnualError) throw ventasAnualError;
      const totalVentasAnual = ventasAnualData.reduce((sum, venta) => sum + (parseFloat(venta.total) || 0), 0);
      setTotalVentasAnual(totalVentasAnual);

      // 4. Datos para gráficos con filtro de fechas
      await loadChartData(fechaInicioFiltro, fechaFinFiltro);
      await loadVendedorData(fechaInicioFiltro, fechaFinFiltro);
      await loadCobrosData(fechaInicioFiltro, fechaFinFiltro);
      
      // Nuevas cargas de datos
      await getComparativaMensual(fechaInicioFiltro, fechaFinFiltro);
      await getVentasMensualesPorVendedor(null, fechaInicioFiltro, fechaFinFiltro);
      await calcularVariaciones(fechaInicioFiltro, fechaFinFiltro);

      // Lista inicial de vendedores para reportes
      await fetchVendedoresLista();

    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendedoresLista = async () => {
    try {
      const { data, error } = await supabase
        .from('facturas')
        .select('vendedor')
        .not('vendedor', 'is', null);
      if (error) throw error;
      const unicos = Array.from(new Set((data || []).map(f => f.vendedor))).sort();
      setVendedoresLista(unicos);
    } catch (e) {
      console.error('Error cargando vendedores:', e);
    }
  };

  const calcularRentabilidadFactura = (productosFactura = []) => {
    return calcularRentabilidadFacturaBase(productosFactura);
  };

  const generarReporteVentas = async () => {
    try {
      setReporteLoading(true);
      const query = supabase
        .from('facturas')
        .select('id, fecha, total, cliente, vendedor, productos')
        .gte('fecha', fechaInicio)
        .lte('fecha', fechaFin)
        .order('fecha');
      if (vendedorSeleccionado && vendedorSeleccionado !== 'todos') {
        query.eq('vendedor', vendedorSeleccionado);
      }
      const { data, error } = await query;
      if (error) throw error;
      
      // Obtener todos los abonos
      const { data: abonosData, error: abonosError } = await supabase
        .from('abonos')
        .select('factura_id, monto');
      
      if (abonosError) throw abonosError;
      
      // Calcular saldo y estado para cada factura
      const ventas = (data || []).map(f => {
        const abonosFactura = (abonosData || []).filter(a => a.factura_id === f.id);
        const totalAbonado = abonosFactura.reduce((sum, abono) => sum + (parseFloat(abono.monto) || 0), 0);
        const total = parseFloat(f.total) || 0;
        const saldo = total - totalAbonado;
        const estado = saldo <= 0 ? 'Pagada' : (totalAbonado > 0 ? 'Parcial' : 'Pendiente');
        const { costoTotal, utilidadTotal, usaCostoEstimado, fuenteCosto } = calcularRentabilidadFactura(f.productos);
        const margen = total > 0 ? (utilidadTotal / total) * 100 : 0;
        
        return {
          id: f.id,
          fecha: f.fecha,
          cliente: f.cliente || '—',
          vendedor: f.vendedor || '—',
          total: total,
          costoTotal,
          utilidadTotal,
          usaCostoEstimado,
          fuenteCosto,
          margen,
          totalAbonado: totalAbonado,
          saldo: saldo,
          estado: estado
        };
      });
      
      // Filtrar por estado de pago
      const ventasFiltradas = estadoPagoSeleccionado === 'todas' 
        ? ventas 
        : ventas.filter(v => {
            if (estadoPagoSeleccionado === 'pagadas') return v.estado === 'Pagada';
            if (estadoPagoSeleccionado === 'pendientes') return v.estado === 'Pendiente' || v.estado === 'Parcial';
            return true;
          });
      
      setReporteVentas(ventasFiltradas);
      const total = ventasFiltradas.reduce((s, v) => s + v.total, 0);
      const costoTotal = ventasFiltradas.reduce((s, v) => s + (v.costoTotal || 0), 0);
      const utilidadTotal = ventasFiltradas.reduce((s, v) => s + (v.utilidadTotal || 0), 0);
      const facturas = ventasFiltradas.length;
      const promedio = facturas ? total / facturas : 0;
      const margenPromedio = total > 0 ? (utilidadTotal / total) * 100 : 0;
      setResumenReporte({ total, facturas, promedio, costoTotal, utilidadTotal, margenPromedio });
    } catch (e) {
      console.error('Error generando reporte:', e);
      setReporteVentas([]);
      setResumenReporte({ total: 0, facturas: 0, promedio: 0, costoTotal: 0, utilidadTotal: 0, margenPromedio: 0 });
    } finally {
      setReporteLoading(false);
    }
  };

  // Autogenerar reporte al abrir pestaña o cambiar filtros
  useEffect(() => {
    if (activeTab === 'reportes') {
      if (!vendedoresLista.length) {
        fetchVendedoresLista();
      }
      generarReporteVentas();
    }
    if (activeTab === 'productos') {
      cargarProductosMasVendidos();
    }
    if (activeTab === 'comparativo') {
      // Cargar datos de comparativo cuando se abre la pestaña
      getVentasMensualesPorVendedor(null, filtroFechaInicio, filtroFechaFin);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'reportes') {
      generarReporteVentas();
    }
  }, [fechaInicio, fechaFin, vendedorSeleccionado, estadoPagoSeleccionado]);

  useEffect(() => {
    if (activeTab === 'productos') {
      cargarProductosMasVendidos();
    }
  }, [fechaInicioProductos, fechaFinProductos]);

  const cargarProductosMasVendidos = async () => {
    try {
      setProductosLoading(true);
      
      // Obtener todas las facturas con sus productos filtradas por fecha
      const { data: facturasData, error } = await supabase
        .from('facturas')
        .select('id, cliente, productos, fecha')
        .gte('fecha', fechaInicioProductos)
        .lte('fecha', fechaFinProductos)
        .order('fecha');
      
      if (error) throw error;

      // Procesar productos: calcular cantidades vendidas y clientes compradores
      const productosMap = {};
      
      facturasData.forEach(factura => {
        if (!factura.productos || !Array.isArray(factura.productos)) return;
        
        factura.productos.forEach(producto => {
          const nombre = producto.nombre || 'Sin nombre';
          const cantidad = parseInt(producto.cantidad) || 0;
          const precio = parseFloat(producto.precio) || 0;
          const subtotal = cantidad * precio;
          const cliente = factura.cliente || 'Sin cliente';
          
          if (!productosMap[nombre]) {
            productosMap[nombre] = {
              nombre,
              cantidadTotal: 0,
              montoTotal: 0,
              clientes: {}
            };
          }
          
          productosMap[nombre].cantidadTotal += cantidad;
          productosMap[nombre].montoTotal += subtotal;
          
          // Agregar o actualizar cliente
          if (!productosMap[nombre].clientes[cliente]) {
            productosMap[nombre].clientes[cliente] = {
              nombre: cliente,
              cantidad: 0,
              monto: 0
            };
          }
          
          productosMap[nombre].clientes[cliente].cantidad += cantidad;
          productosMap[nombre].clientes[cliente].monto += subtotal;
        });
      });

      // Convertir a array y ordenar por cantidad total
      const productosArray = Object.values(productosMap).map(producto => {
        // Ordenar clientes por cantidad comprada
        const clientesArray = Object.values(producto.clientes)
          .sort((a, b) => b.cantidad - a.cantidad);
        
        return {
          nombre: producto.nombre,
          cantidadTotal: producto.cantidadTotal,
          montoTotal: producto.montoTotal,
          clientesTop: clientesArray
        };
      }).sort((a, b) => b.cantidadTotal - a.cantidadTotal);

      setProductosMasVendidos(productosArray);
      
    } catch (error) {
      console.error('Error cargando productos:', error);
      setProductosMasVendidos([]);
    } finally {
      setProductosLoading(false);
    }
  };

  const exportarCSV = () => {
    const encabezados = ['ID', 'Fecha', 'Cliente', 'Vendedor', 'Total', 'Costo', 'Utilidad', 'Margen_%', 'Base_Costo', 'Abonado', 'Saldo', 'Estado'];
    const filas = reporteVentas.map(r => [
      r.id,
      r.fecha,
      r.cliente,
      r.vendedor,
      r.total,
      r.costoTotal || 0,
      r.utilidadTotal || 0,
      (r.margen || 0).toFixed(2),
      r.fuenteCosto || 'Sin datos',
      r.totalAbonado || 0,
      r.saldo || 0,
      r.estado || 'Pendiente'
    ]);
    const csv = [encabezados, ...filas]
      .map(row => row.map(val => `"${String(val).replace(/"/g, '"')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const estadoFiltro = estadoPagoSeleccionado !== 'todas' ? `-${estadoPagoSeleccionado}` : '';
    link.download = `reporte-ventas-${fechaInicio}_a_${fechaFin}${vendedorSeleccionado!=='todos' ? `-${vendedorSeleccionado}` : ''}${estadoFiltro}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const imprimirReporteFormato = () => {
    const ventanaImpresion = window.open('', '_blank', 'width=900,height=700');
    const hoy = new Date().toLocaleDateString('es-CO');
    const fechaDesde = new Date(fechaInicio).toLocaleDateString('es-CO');
    const fechaHasta = new Date(fechaFin).toLocaleDateString('es-CO');
    const vendedorFiltro = vendedorSeleccionado === 'todos' ? 'Todos los vendedores' : vendedorSeleccionado;
    const estadoFiltro = estadoPagoSeleccionado === 'todas' ? 'Todas' : (estadoPagoSeleccionado === 'pagadas' ? 'Pagadas' : 'Pendientes');
    const totalFilas = reporteVentas.length;
    const totalMonto = reporteVentas.reduce((s, r) => s + r.total, 0);
    const totalAbonado = reporteVentas.reduce((s, r) => s + (r.totalAbonado || 0), 0);
    const totalSaldo = reporteVentas.reduce((s, r) => s + (r.saldo || 0), 0);
    const promedio = totalFilas > 0 ? totalMonto / totalFilas : 0;

    const filasHTML = reporteVentas.map(r => {
      const estadoClass = r.estado === 'Pagada' ? 'pagada' : (r.estado === 'Parcial' ? 'parcial' : 'pendiente');
      return `
        <tr>
          <td class="col-id">#${String(r.id).padStart(6, '0')}</td>
          <td>${new Date(r.fecha).toLocaleDateString('es-CO')}</td>
          <td>${r.cliente}</td>
          <td>${r.vendedor}</td>
          <td class="col-total">${formatCurrency(r.total)}</td>
          <td class="col-total">${formatCurrency(r.totalAbonado || 0)}</td>
          <td class="col-total" style="color: ${r.saldo > 0 ? '#e74c3c' : '#27ae60'}">${formatCurrency(r.saldo || 0)}</td>
          <td class="col-estado"><span class="badge estado-${estadoClass}">${r.estado || 'Pendiente'}</span></td>
        </tr>
      `;
    }).join('');

    const contenidoHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Reporte de Ventas</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: Arial, sans-serif; 
            color: #333; 
            padding: 20px;
            background: #fff;
          }
          .reporte-container {
            max-width: 1000px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #000;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          .header h1 {
            font-size: 24px;
            margin-bottom: 5px;
            color: #1a1a1a;
          }
          .header p {
            font-size: 11px;
            color: #666;
          }
          .info-general {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 15px;
            margin-bottom: 20px;
            background: #f9f9f9;
            padding: 15px;
            border-radius: 5px;
          }
          .info-item {
            font-size: 10px;
          }
          .info-item label {
            font-weight: bold;
            display: block;
            margin-bottom: 3px;
            color: #333;
          }
          .info-item span {
            display: block;
            color: #666;
          }
          .resumen {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 20px;
          }
          .resumen-card {
            background: #f0f0f0;
            border-left: 4px solid #2196F3;
            padding: 12px;
            border-radius: 3px;
          }
          .resumen-card.saldo {
            border-left-color: #e74c3c;
          }
          .resumen-card.abonado {
            border-left-color: #27ae60;
          }
          .resumen-card label {
            font-size: 11px;
            color: #666;
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
          }
          .resumen-card .valor {
            font-size: 16px;
            font-weight: bold;
            color: #1a1a1a;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            background: #fff;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          thead {
            background: #2196F3;
            color: white;
          }
          th {
            padding: 12px;
            text-align: left;
            font-size: 11px;
            font-weight: bold;
            border-bottom: 2px solid #1976D2;
          }
          td {
            padding: 10px 12px;
            font-size: 10px;
            border-bottom: 1px solid #eee;
          }
          tbody tr:nth-child(even) {
            background: #f5f5f5;
          }
          .col-id {
            text-align: center;
            font-weight: bold;
            width: 50px;
          }
          .col-total {
            text-align: right;
            font-weight: bold;
            width: 90px;
          }
          .col-estado {
            text-align: center;
            width: 80px;
          }
          .badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 9px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .estado-pagada {
            background: #d4edda;
            color: #27ae60;
          }
          .estado-parcial {
            background: #fff8e1;
            color: #f39c12;
          }
          .estado-pendiente {
            background: #ffebee;
            color: #e74c3c;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #ccc;
            text-align: center;
            font-size: 9px;
            color: #999;
          }
          @media print {
            body { padding: 0; background: white; }
            .reporte-container { max-width: 100%; }
            table { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="reporte-container">
          <div class="header">
            <h1>REPORTE DE VENTAS</h1>
            <p>PHARMAHUMANOS - Sistema de Gestión</p>
          </div>

          <div class="info-general">
            <div class="info-item">
              <label>Período:</label>
              <span>${fechaDesde} a ${fechaHasta}</span>
            </div>
            <div class="info-item">
              <label>Vendedor:</label>
              <span>${vendedorFiltro}</span>
            </div>
            <div class="info-item">
              <label>Estado:</label>
              <span>${estadoFiltro}</span>
            </div>
            <div class="info-item">
              <label>Total Facturas:</label>
              <span>${totalFilas}</span>
            </div>
            <div class="info-item">
              <label>Generado:</label>
              <span>${hoy}</span>
            </div>
          </div>

          <div class="resumen">
            <div class="resumen-card">
              <label>Total Facturado</label>
              <div class="valor">${formatCurrency(totalMonto)}</div>
            </div>
            <div class="resumen-card abonado">
              <label>Total Abonado</label>
              <div class="valor">${formatCurrency(totalAbonado)}</div>
            </div>
            <div class="resumen-card saldo">
              <label>Saldo Pendiente</label>
              <div class="valor">${formatCurrency(totalSaldo)}</div>
            </div>
            <div class="resumen-card">
              <label>Ticket Promedio</label>
              <div class="valor">${formatCurrency(promedio)}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th class="col-id">ID</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Vendedor</th>
                <th class="col-total">Total</th>
                <th class="col-total">Abonado</th>
                <th class="col-total">Saldo</th>
                <th class="col-estado">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${filasHTML}
            </tbody>
          </table>

          <div class="footer">
            <p>Este reporte es confidencial y para uso interno únicamente.</p>
            <p>Impreso: ${hoy} a las ${new Date().toLocaleTimeString('es-CO')}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    ventanaImpresion.document.write(contenidoHTML);
    ventanaImpresion.document.close();
    setTimeout(() => {
      ventanaImpresion.print();
    }, 250);
  };

  const loadChartData = async (fechaInicio, fechaFin) => {
    try {
      // Gráfico de ventas mensuales
      const ventasMensualesData = await getVentasMensuales(fechaInicio, fechaFin);
      setVentasMensuales(ventasMensualesData);

      // Gráfico de ingresos diarios
      const ingresosDiariosData = await getIngresosDiarios(fechaInicio, fechaFin);
      setIngresosDiarios(ingresosDiariosData);

    } catch (error) {
      console.error('Error loading chart data:', error);
    }
  };

  const loadVendedorData = async (fechaInicio, fechaFin) => {
    try {
      // Ventas totales por vendedor
      const { data: vendedoresData, error } = await supabase
        .from('facturas')
        .select('vendedor, total')
        .gte('fecha', fechaInicio)
        .lte('fecha', fechaFin)
        .not('vendedor', 'is', null)
        .order('vendedor');

      if (error) throw error;

      const ventasPorVendedorMap = {};
      vendedoresData.forEach(factura => {
        const vendedor = factura.vendedor || 'Sin vendedor';
        ventasPorVendedorMap[vendedor] = (ventasPorVendedorMap[vendedor] || 0) + (parseFloat(factura.total) || 0);
      });

      const ventasPorVendedorArray = Object.entries(ventasPorVendedorMap)
        .map(([vendedor, ventas]) => ({ vendedor, ventas }))
        .sort((a, b) => b.ventas - a.ventas);

      setVentasPorVendedor(ventasPorVendedorArray);

    } catch (error) {
      console.error('Error loading vendedor data:', error);
    }
  };

  const loadCobrosData = async (fechaInicio, fechaFin) => {
    try {
      const hoy = new Date();
      const currentYear = hoy.getFullYear();

      // 1. COBROS MENSUALES DEL AÑO ACTUAL (desde tabla abonos)
      const { data: cobrosAnualData, error: cobrosError } = await supabase
        .from('abonos')
        .select('fecha, monto, metodo, factura_id')
        .gte('fecha', `${currentYear}-01-01`)
        .lte('fecha', `${currentYear}-12-31`)
        .order('fecha');

      if (cobrosError) throw cobrosError;

      // Procesar cobros mensuales
      const cobrosPorMesMap = Array(12).fill(0);
      if (cobrosAnualData) {
        cobrosAnualData.forEach(abono => {
          const mes = new Date(abono.fecha).getMonth();
          cobrosPorMesMap[mes] += parseFloat(abono.monto) || 0;
        });
      }

      const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      setCobrosMensuales(cobrosPorMesMap.map((total, index) => ({
        mes: meses[index],
        cobros: total
      })));

      // Total cobrado anual
      const totalAnual = cobrosAnualData ? 
        cobrosAnualData.reduce((sum, abono) => sum + (parseFloat(abono.monto) || 0), 0) : 0;
      setTotalCobradoAnual(totalAnual);

      // 2. COBROS DE LOS ÚLTIMOS 6 MESES
      const seisMesesAtras = new Date();
      seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);
      
      const { data: cobrosRecientesData } = await supabase
        .from('abonos')
        .select('fecha, monto')
        .gte('fecha', seisMesesAtras.toISOString().split('T')[0])
        .order('fecha');

      const cobrosPorMesReciente = {};
      if (cobrosRecientesData) {
        cobrosRecientesData.forEach(abono => {
          const fecha = new Date(abono.fecha);
          const mesKey = `${fecha.getFullYear()}-${fecha.getMonth()}`;
          cobrosPorMesReciente[mesKey] = (cobrosPorMesReciente[mesKey] || 0) + (parseFloat(abono.monto) || 0);
        });

        setCobrosPorMes(Object.entries(cobrosPorMesReciente).map(([key, total]) => {
          const [año, mes] = key.split('-');
          return {
            periodo: `${meses[parseInt(mes)]}-${año.slice(2)}`,
            cobros: total
          };
        }).sort((a, b) => a.periodo.localeCompare(b.periodo)));
      }

      // 3. COBROS EN EL RANGO DE FECHAS FILTRADO
      const { data: cobrosRangoData } = await supabase
        .from('abonos')
        .select('monto')
        .gte('fecha', fechaInicio)
        .lte('fecha', fechaFin);

      const totalRango = cobrosRangoData ? 
        cobrosRangoData.reduce((sum, abono) => sum + (parseFloat(abono.monto) || 0), 0) : 0;
      setCobrosUltimos30Dias(totalRango);

      // 4. MÉTODOS DE PAGO (gráfico circular)
      const metodosPago = {};
      if (cobrosAnualData) {
        cobrosAnualData.forEach(abono => {
          const metodo = abono.metodo || 'Sin especificar';
          metodosPago[metodo] = (metodosPago[metodo] || 0) + 1;
        });

        setEstadoCobros(Object.entries(metodosPago).map(([metodo, count]) => ({
          metodo,
          count,
          montoTotal: cobrosAnualData
            .filter(a => a.metodo === metodo)
            .reduce((sum, a) => sum + (parseFloat(a.monto) || 0), 0)
        })));
      }

      // 5. COBROS DIARIOS POR VENDEDOR
      await loadCobrosDiariosVendedor(fechaInicio, fechaFin);

    } catch (error) {
      console.error('Error loading cobros data:', error);
    }
  };

  // Nueva función para cargar cobros diarios por vendedor
  const loadCobrosDiariosVendedor = async (fechaInicio, fechaFin) => {
    try {
      // Obtener abonos en el rango de fechas
      const { data: abonosData, error: abonosError } = await supabase
        .from('abonos')
        .select('fecha, monto, factura_id')
        .gte('fecha', fechaInicio)
        .lte('fecha', fechaFin)
        .order('fecha');

      if (abonosError) throw abonosError;

      if (!abonosData || abonosData.length === 0) {
        setCobrosDiariosVendedor([]);
        return;
      }

      // Obtener facturas relacionadas con estos abonos
      const facturaIds = [...new Set(abonosData.map(abono => abono.factura_id))];
      
      const { data: facturasData, error: facturasError } = await supabase
        .from('facturas')
        .select('id, vendedor')
        .in('id', facturaIds);

      if (facturasError) throw facturasError;

      // Crear un mapa de factura_id a vendedor
      const facturaVendedorMap = {};
      facturasData.forEach(factura => {
        facturaVendedorMap[factura.id] = factura.vendedor || 'Sin vendedor';
      });

      // Combinar datos de abonos con vendedores
      const cobrosConVendedor = abonosData.map(abono => ({
        ...abono,
        vendedor: facturaVendedorMap[abono.factura_id] || 'Sin vendedor',
        monto: parseFloat(abono.monto) || 0
      }));

      // Agrupar por fecha y vendedor
      const cobrosPorDiaVendedor = {};
      
      cobrosConVendedor.forEach(cobro => {
        const fecha = cobro.fecha;
        const vendedor = cobro.vendedor;
        
        if (!cobrosPorDiaVendedor[fecha]) {
          cobrosPorDiaVendedor[fecha] = {};
        }
        
        if (!cobrosPorDiaVendedor[fecha][vendedor]) {
          cobrosPorDiaVendedor[fecha][vendedor] = 0;
        }
        
        cobrosPorDiaVendedor[fecha][vendedor] += cobro.monto;
      });

      // Obtener lista de todos los vendedores únicos
      const todosVendedores = [...new Set(cobrosConVendedor.map(item => item.vendedor))];
      
      // Convertir a formato para gráfico de áreas apiladas
      const datosGrafico = Object.entries(cobrosPorDiaVendedor).map(([fecha, vendedores]) => {
        const dato = { fecha: fecha.split('-').reverse().join('/').slice(0, 5) };
        
        todosVendedores.forEach(vendedor => {
          dato[vendedor] = vendedores[vendedor] || 0;
        });
        
        return dato;
      }).sort((a, b) => a.fecha.localeCompare(b.fecha));

      setCobrosDiariosVendedor({
        datos: datosGrafico,
        vendedores: todosVendedores
      });

    } catch (error) {
      console.error('Error loading cobros diarios por vendedor:', error);
    }
  };

  // Función para obtener ventas mensuales
  const getVentasMensuales = async (fechaInicio, fechaFin) => {
    try {
      const { data, error } = await supabase
        .from('facturas')
        .select('fecha, total')
        .gte('fecha', fechaInicio)
        .lte('fecha', fechaFin)
        .order('fecha');

      if (error) throw error;

      const ventasPorMes = Array(12).fill(0);
      if (data) {
        data.forEach(factura => {
          const mes = new Date(factura.fecha).getMonth();
          ventasPorMes[mes] += parseFloat(factura.total) || 0;
        });
      }

      const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      return ventasPorMes.map((total, index) => ({ mes: meses[index], ventas: total }));

    } catch (error) {
      console.error('Error en getVentasMensuales:', error);
      return [];
    }
  };

  // Función para obtener ingresos diarios
  const getIngresosDiarios = async (fechaInicio, fechaFin) => {
    try {
      const { data, error } = await supabase
        .from('facturas')
        .select('fecha, total')
        .gte('fecha', fechaInicio)
        .lte('fecha', fechaFin)
        .order('fecha');

      if (error) throw error;

      const ingresosPorDia = {};
      if (data) {
        data.forEach(factura => {
          const dia = factura.fecha;
          ingresosPorDia[dia] = (ingresosPorDia[dia] || 0) + (parseFloat(factura.total) || 0);
        });
      }

      return Object.entries(ingresosPorDia).map(([fecha, total]) => ({
        fecha: fecha.split('-').reverse().join('/').slice(0, 5),
        ingresos: total
      })).sort((a, b) => a.fecha.localeCompare(b.fecha));

    } catch (error) {
      console.error('Error en getIngresosDiarios:', error);
      return [];
    }
  };

  // Nueva función: Obtener comparativa mensual (últimos 3 años)
  const getComparativaMensual = async (fechaInicio, fechaFin) => {
    try {
      const { data, error } = await supabase
        .from('facturas')
        .select('fecha, total')
        .gte('fecha', fechaInicio)
        .lte('fecha', fechaFin)
        .order('fecha');

      if (error) throw error;

      const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const comparativaPorMes = {};

      if (data) {
        data.forEach(factura => {
          const fecha = new Date(factura.fecha);
          const mes = fecha.getMonth();
          const anio = fecha.getFullYear();
          const clave = `${meses[mes]}-${anio}`;
          
          if (!comparativaPorMes[clave]) {
            comparativaPorMes[clave] = { mes: meses[mes], anio, total: 0, facturas: 0, mes_anio: clave };
          }
          comparativaPorMes[clave].total += parseFloat(factura.total) || 0;
          comparativaPorMes[clave].facturas += 1;
        });
      }

      const resultado = Object.values(comparativaPorMes)
        .sort((a, b) => {
          if (a.anio !== b.anio) return a.anio - b.anio;
          return meses.indexOf(a.mes) - meses.indexOf(b.mes);
        });

      setComparativaMensual(resultado);
    } catch (error) {
      console.error('Error en getComparativaMensual:', error);
    }
  };

  // Nueva función: Obtener ventas mensuales detalladas por vendedor
  const getVentasMensualesPorVendedor = async (vendedor = null, fechaInicio, fechaFin) => {
    try {
      let query = supabase
        .from('facturas')
        .select('fecha, total, vendedor')
        .gte('fecha', fechaInicio)
        .lte('fecha', fechaFin);

      if (vendedor && vendedor !== 'todos') {
        query = query.eq('vendedor', vendedor);
      }

      const { data, error } = await query.order('fecha');

      if (error) throw error;

      const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const ventasPorMesVendedor = {};

      if (data) {
        data.forEach(factura => {
          const fecha = new Date(factura.fecha);
          const mes = fecha.getMonth();
          const anio = fecha.getFullYear();
          const clave = `${meses[mes]}-${anio}`;

          if (!ventasPorMesVendedor[clave]) {
            ventasPorMesVendedor[clave] = { 
              mes: meses[mes], 
              anio, 
              mes_anio: clave,
              vendedor: vendedor || 'Todos',
              total: 0, 
              facturas: 0,
              promedio: 0 
            };
          }
          ventasPorMesVendedor[clave].total += parseFloat(factura.total) || 0;
          ventasPorMesVendedor[clave].facturas += 1;
        });

        // Calcular promedios
        Object.values(ventasPorMesVendedor).forEach(item => {
          item.promedio = item.facturas > 0 ? item.total / item.facturas : 0;
        });
      }

      const resultado = Object.values(ventasPorMesVendedor)
        .sort((a, b) => {
          if (a.anio !== b.anio) return a.anio - b.anio;
          return meses.indexOf(a.mes) - meses.indexOf(b.mes);
        });

      setVentasMensualesPorVendedor(resultado);
      
      // Calcular resumen detallado
      const resumen = {
        totalFacturas: data ? data.length : 0,
        totalVentas: data ? data.reduce((s, f) => s + (parseFloat(f.total) || 0), 0) : 0,
        promedio: 0,
        variacionUltimo: 0
      };
      resumen.promedio = resumen.totalFacturas > 0 ? resumen.totalVentas / resumen.totalFacturas : 0;

      // Calcular variación del mes actual vs mes anterior
      if (resultado.length >= 2) {
        const ultimoMes = resultado[resultado.length - 1].total;
        const mesAnterior = resultado[resultado.length - 2].total;
        resumen.variacionUltimo = mesAnterior > 0 ? ((ultimoMes - mesAnterior) / mesAnterior) * 100 : 0;
      }

      setResumenVendedorDetallado(resumen);
    } catch (error) {
      console.error('Error en getVentasMensualesPorVendedor:', error);
    }
  };

  // Nueva función: Calcular variaciones porcentuales
  const calcularVariaciones = async (fechaInicio, fechaFin) => {
    try {
      const hoy = new Date();
      const anioActual = hoy.getFullYear();
      const anioAnterior = anioActual - 1;

      const { data: datosActual, error: errorActual } = await supabase
        .from('facturas')
        .select('fecha, total')
        .gte('fecha', fechaInicio)
        .lte('fecha', fechaFin);

      const { data: datosAnterior, error: errorAnterior } = await supabase
        .from('facturas')
        .select('fecha, total')
        .gte('fecha', `${anioAnterior}-01-01`)
        .lte('fecha', `${anioAnterior}-12-31`);

      if (errorActual || errorAnterior) throw new Error('Error loading data');

      const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const ventasActual = Array(12).fill(0);
      const ventasAnterior = Array(12).fill(0);

      datosActual?.forEach(f => {
        const mes = new Date(f.fecha).getMonth();
        ventasActual[mes] += parseFloat(f.total) || 0;
      });

      datosAnterior?.forEach(f => {
        const mes = new Date(f.fecha).getMonth();
        ventasAnterior[mes] += parseFloat(f.total) || 0;
      });

      const variaciones = meses.map((mes, idx) => ({
        mes,
        [anioAnterior]: ventasAnterior[idx],
        [anioActual]: ventasActual[idx],
        variacion: ventasAnterior[idx] > 0 
          ? ((ventasActual[idx] - ventasAnterior[idx]) / ventasAnterior[idx]) * 100 
          : 0,
        diferencia: ventasActual[idx] - ventasAnterior[idx]
      }));

      setVariacionesPorcentuales(variaciones);
    } catch (error) {
      console.error('Error en calcularVariaciones:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const normalizarFechaISO = (fecha) => {
    if (!fecha) return '';
    if (typeof fecha === 'string') return fecha.slice(0, 10);
    const d = new Date(fecha);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  };

  const formatearPeriodo = (periodoKey) => {
    if (!periodoKey) return 'Sin fecha';

    if (periodicidadUtilidad === 'diaria') {
      const d = new Date(`${periodoKey}T00:00:00`);
      return Number.isNaN(d.getTime()) ? periodoKey : d.toLocaleDateString('es-CO');
    }

    const [anio, mes] = periodoKey.split('-');
    const d = new Date(Number(anio), Number(mes) - 1, 1);
    return Number.isNaN(d.getTime())
      ? periodoKey
      : d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  };

  const reporteUtilidadPorPeriodo = useMemo(() => {
    const ventasNormalizadas = (reporteVentas || []).map((venta) => ({
      ...venta,
      fecha: normalizarFechaISO(venta.fecha)
    }));

    return agruparUtilidadPorPeriodo(
      ventasNormalizadas,
      periodicidadUtilidad === 'diaria' ? 'diaria' : 'mensual'
    )
      .map((item) => ({
        ...item,
        periodoLabel: formatearPeriodo(item.periodoKey)
      }))
      .sort((a, b) => b.periodoKey.localeCompare(a.periodoKey));
  }, [reporteVentas, periodicidadUtilidad]);

  const resumenUtilidadActual = useMemo(() => {
    const hoyKey = new Date().toISOString().slice(0, 10);
    const mesActualKey = hoyKey.slice(0, 7);

    const utilidadHoy = reporteUtilidadPorPeriodo
      .filter((item) => item.periodoKey === hoyKey)
      .reduce((sum, item) => sum + item.utilidadTotal, 0);

    const utilidadMesActual = reporteUtilidadPorPeriodo
      .filter((item) => item.periodoKey.slice(0, 7) === mesActualKey)
      .reduce((sum, item) => sum + item.utilidadTotal, 0);

    return { utilidadHoy, utilidadMesActual };
  }, [reporteUtilidadPorPeriodo]);

  const resumenFuenteCosto = useMemo(() => {
    return (reporteVentas || []).reduce((acc, venta) => {
      const fuente = venta?.fuenteCosto || 'Sin datos';
      acc[fuente] = (acc[fuente] || 0) + 1;
      return acc;
    }, {});
  }, [reporteVentas]);

  const renderFuenteCostoBadge = (fuenteCosto) => {
    const fuente = fuenteCosto || 'Sin datos';
    const clase = `fuente-costo fuente-${fuente.toLowerCase().replace(/\s+/g, '-')}`;
    return <span className={clase}>{fuente}</span>;
  };

  // Colores para los gráficos
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];
  const COLORS_COBROS = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0', '#607D8B'];

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Cargando datos del dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <h1>Dashboard de Ventas y Cobros</h1>
      
      {/* Tabs de navegación */}
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          📊 General
        </button>
        <button 
          className={`tab ${activeTab === 'comparativo' ? 'active' : ''}`}
          onClick={() => setActiveTab('comparativo')}
        >
          📈 Comparativo
        </button>
        <button 
          className={`tab ${activeTab === 'vendedores' ? 'active' : ''}`}
          onClick={() => setActiveTab('vendedores')}
        >
          👥 Por Vendedor
        </button>
        <button 
          className={`tab ${activeTab === 'reportes' ? 'active' : ''}`}
          onClick={() => setActiveTab('reportes')}
        >
          📄 Reportes
        </button>
        <button 
          className={`tab ${activeTab === 'productos' ? 'active' : ''}`}
          onClick={() => setActiveTab('productos')}
        >
          📦 Productos
        </button>
        <button 
          className={`tab ${activeTab === 'cobros' ? 'active' : ''}`}
          onClick={() => setActiveTab('cobros')}
        >
          💰 Cobros
        </button>
      </div>

      {activeTab === 'general' && (
        <>
          {/* Resumen del período filtrado */}
          <div className="dashboard-card full-width" style={{ marginBottom: '20px', backgroundColor: '#e3f2fd', borderLeft: '4px solid #2196F3' }}>
            <h2 style={{ color: '#1976D2', marginBottom: '10px' }}>📅 Período Filtrado</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '4px' }}>
                <span style={{ fontSize: '0.9rem', color: '#666', display: 'block' }}>Desde:</span>
                <strong style={{ fontSize: '1.1rem', color: '#2196F3' }}>{new Date(filtroFechaInicio).toLocaleDateString('es-CO')}</strong>
              </div>
              <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '4px' }}>
                <span style={{ fontSize: '0.9rem', color: '#666', display: 'block' }}>Hasta:</span>
                <strong style={{ fontSize: '1.1rem', color: '#2196F3' }}>{new Date(filtroFechaFin).toLocaleDateString('es-CO')}</strong>
              </div>
              <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '4px' }}>
                <span style={{ fontSize: '0.9rem', color: '#666', display: 'block' }}>Duración:</span>
                <strong style={{ fontSize: '1.1rem', color: '#2196F3' }}>
                  {Math.ceil((new Date(filtroFechaFin) - new Date(filtroFechaInicio)) / (1000 * 60 * 60 * 24))} días
                </strong>
              </div>
            </div>
          </div>

          <div className="dashboard-grid">
            <div className="dashboard-card">
              <h2>Facturas (Período Filtrado)</h2>
              <div className="metric">
                <span className="metric-label">Total Facturado:</span>
                <span className="metric-value">
                  {formatCurrency(facturasUltimos30Dias.reduce((sum, f) => sum + (parseFloat(f.total) || 0), 0))}
                </span>
              </div>
              <div className="metric">
                <span className="metric-label">Número de Facturas:</span>
                <span className="metric-value">{facturasUltimos30Dias.length}</span>
              </div>
            </div>

            <div className="dashboard-card">
              <h2>Ventas del Mes Actual</h2>
              <div className="ventas-metric">
                <span className="ventas-value">{formatCurrency(ventasMesActual)}</span>
              </div>
            </div>

            <div className="dashboard-card">
              <h2>Total Ventas Anual</h2>
              <div className="ventas-metric">
                <span className="ventas-value">{formatCurrency(totalVentasAnual)}</span>
              </div>
            </div>
          </div>

          {/* Gráfico de Ventas Mensuales (Barras) */}
          <div className="dashboard-card full-width">
            <h2>Ventas Mensuales - Período Filtrado</h2>
            {ventasMensuales.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ventasMensuales}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis tickFormatter={value => `$${value/1000000}M`} />
                  <Tooltip formatter={(value) => [formatCurrency(value), 'Ventas']} />
                  <Bar dataKey="ventas" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p>No hay datos para mostrar el gráfico</p>
            )}
          </div>

          {/* Gráfico de Ingresos Diarios (Líneas) */}
          <div className="dashboard-card full-width">
            <h2>Ingresos Diarios (Últimos 30 días)</h2>
            {ingresosDiarios.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={ingresosDiarios}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" />
                  <YAxis tickFormatter={value => `$${value/1000}K`} />
                  <Tooltip formatter={(value) => [formatCurrency(value), 'Ingresos']} />
                  <Line type="monotone" dataKey="ingresos" stroke="#82ca9d" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p>No hay datos para mostrar el gráfico</p>
            )}
          </div>
        </>
      )}

      {activeTab === 'comparativo' && (
        <>
          <div className="dashboard-card full-width">
            <h2>📊 Comparativa de Ventas Mensuales (Histórico)</h2>
            <div className="resumen-reporte">
              <div className="resumen-item">
                <span>Período Analizado</span>
                <strong>Últimos 3 años</strong>
              </div>
              <div className="resumen-item">
                <span>Total Registros</span>
                <strong>{comparativaMensual.length} meses</strong>
              </div>
              <div className="resumen-item">
                <span>Total Ventas</span>
                <strong>{formatCurrency(comparativaMensual.reduce((s, c) => s + c.total, 0))}</strong>
              </div>
            </div>

            {comparativaMensual.length > 0 ? (
              <>
                {/* Gráfico de Comparativa */}
                <div className="dashboard-card full-width" style={{ marginTop: '20px' }}>
                  <h3>Ventas Mensuales - Línea de Tendencia</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={comparativaMensual}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes_anio" angle={-45} textAnchor="end" height={100} />
                      <YAxis tickFormatter={value => `$${value/1000000}M`} />
                      <Tooltip 
                        formatter={(value, name) => {
                          if (name === 'total') return [formatCurrency(value), 'Ventas'];
                          if (name === 'facturas') return [value, 'Facturas'];
                          return [value, name];
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="total" stroke="#0088FE" strokeWidth={2} name="Ventas Totales" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Tabla Comparativa Detallada */}
                <div className="tabla-reporte-wrapper" style={{ marginTop: '20px' }}>
                  <table className="tabla-reporte">
                    <thead>
                      <tr>
                        <th>Mes</th>
                        <th>Año</th>
                        <th>Total Ventas</th>
                        <th>Num. Facturas</th>
                        <th>Promedio/Factura</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparativaMensual.map((item, idx) => (
                        <tr key={idx}>
                          <td><strong>{item.mes}</strong></td>
                          <td>{item.anio}</td>
                          <td className="col-total">{formatCurrency(item.total)}</td>
                          <td className="col-cantidad">{item.facturas}</td>
                          <td className="col-total">{formatCurrency(item.facturas > 0 ? item.total / item.facturas : 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p style={{ marginTop: '20px' }}>No hay datos disponibles para la comparativa.</p>
            )}
          </div>

          {/* NUEVA SECCIÓN: Variaciones Porcentuales */}
          <div className="dashboard-card full-width">
            <h2>📊 Variación Porcentual - Año Actual vs Anterior</h2>
            {variacionesPorcentuales.length > 0 ? (
              <>
                {/* Gráfico de Variaciones */}
                <div className="dashboard-card full-width" style={{ marginTop: '20px' }}>
                  <h3>Comparativa de Ventas Mes a Mes</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={variacionesPorcentuales}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" />
                      <YAxis tickFormatter={value => `$${value/1000000}M`} />
                      <Tooltip 
                        formatter={(value, name) => {
                          if (typeof value === 'number' && value < 0) return [formatCurrency(value), name];
                          if (typeof value === 'number') return [formatCurrency(value), name];
                          return [value, name];
                        }}
                      />
                      <Legend />
                      <Bar dataKey={new Date().getFullYear() - 1} fill="#8884d8" name={`${new Date().getFullYear() - 1}`} />
                      <Bar dataKey={new Date().getFullYear()} fill="#82ca9d" name={`${new Date().getFullYear()}`} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Tabla de Variaciones */}
                <div className="tabla-reporte-wrapper" style={{ marginTop: '20px' }}>
                  <table className="tabla-reporte">
                    <thead>
                      <tr>
                        <th>Mes</th>
                        <th>{new Date().getFullYear() - 1}</th>
                        <th>{new Date().getFullYear()}</th>
                        <th>Diferencia ($)</th>
                        <th>% Variación</th>
                        <th>Comportamiento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variacionesPorcentuales.map((item, idx) => {
                        const comportamiento = item.variacion > 0 ? '📈 Crecimiento' : item.variacion < 0 ? '📉 Caída' : '➡️ Estable';
                        return (
                          <tr key={idx} style={{ background: item.variacion > 0 ? '#e8f5e9' : item.variacion < 0 ? '#ffebee' : '#f5f5f5' }}>
                            <td><strong>{item.mes}</strong></td>
                            <td className="col-total">{formatCurrency(item[new Date().getFullYear() - 1])}</td>
                            <td className="col-total">{formatCurrency(item[new Date().getFullYear()])}</td>
                            <td className="col-total" style={{ color: item.diferencia > 0 ? '#4CAF50' : '#F44336' }}>
                              {formatCurrency(item.diferencia)}
                            </td>
                            <td style={{ 
                              fontWeight: 'bold', 
                              color: item.variacion > 0 ? '#4CAF50' : item.variacion < 0 ? '#F44336' : '#666',
                              textAlign: 'center'
                            }}>
                              {formatPercentage(item.variacion)}
                            </td>
                            <td style={{ textAlign: 'center' }}>{comportamiento}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p style={{ marginTop: '20px' }}>Cargando datos de variaciones...</p>
            )}
          </div>

          {/* NUEVA SECCIÓN: Análisis Detallado por Vendedor */}
          <div className="dashboard-card full-width">
            <h2>👥 Análisis de Ventas por Vendedor (Histórico)</h2>
            <div className="filtros-reporte">
              <div className="filtro">
                <label>Seleccionar Vendedor</label>
                <select 
                  value={vendedorSeleccionadoAnalisis} 
                  onChange={e => {
                    setVendedorSeleccionadoAnalisis(e.target.value);
                    getVentasMensualesPorVendedor(e.target.value || null, filtroFechaInicio, filtroFechaFin);
                  }}
                >
                  <option value="">Todos los vendedores</option>
                  {vendedoresLista.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1', fontSize: '0.9rem', color: '#666', textAlign: 'center', marginTop: '10px' }}>
                💡 <strong>Tip:</strong> Selecciona "Todos los vendedores" para ver una tabla comparativa de todos, o elige uno específico para análisis detallado.
              </div>
            </div>

            {vendedorSeleccionadoAnalisis === '' && (
              /* Tabla Comparativa de TODOS los vendedores por mes */
              <div className="tabla-reporte-wrapper" style={{ marginTop: '20px' }}>
                <h3 style={{ marginBottom: '15px', color: '#2c3e50' }}>📊 Comparativa de Vendedores - Período Filtrado</h3>
                {ventasPorVendedor.length > 0 ? (
                  <table className="tabla-reporte">
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Vendedor</th>
                        <th>Total Ventas</th>
                        <th>Num. Facturas</th>
                        <th>Promedio/Factura</th>
                        <th>% Participación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const totalGeneral = ventasPorVendedor.reduce((sum, v) => sum + v.ventas, 0);
                        return ventasPorVendedor.map((vendedor, idx) => {
                          const participacion = totalGeneral > 0 ? (vendedor.ventas / totalGeneral) * 100 : 0;
                          return (
                            <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9f9f9' }}>
                              <td style={{ fontWeight: '600', color: '#2196F3' }}>{vendedor.vendedor}</td>
                              <td className="col-total">{formatCurrency(vendedor.ventas)}</td>
                              <td className="col-cantidad">-</td>
                              <td className="col-total">-</td>
                              <td style={{ textAlign: 'center', fontWeight: '600', color: '#FF6B6B' }}>{participacion.toFixed(1)}%</td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ textAlign: 'center', color: '#999' }}>No hay datos de vendedores para el período seleccionado.</p>
                )}
              </div>
            )}

            {resumenVendedorDetallado && vendedorSeleccionadoAnalisis !== '' && (
              <div className="resumen-reporte">
                <div className="resumen-item">
                  <span>Total Facturas</span>
                  <strong>{resumenVendedorDetallado.totalFacturas}</strong>
                </div>
                <div className="resumen-item">
                  <span>Total Ventas</span>
                  <strong>{formatCurrency(resumenVendedorDetallado.totalVentas)}</strong>
                </div>
                <div className="resumen-item">
                  <span>Ticket Promedio</span>
                  <strong>{formatCurrency(resumenVendedorDetallado.promedio)}</strong>
                </div>
                <div className="resumen-item">
                  <span>Variación Última</span>
                  <strong style={{ color: resumenVendedorDetallado.variacionUltimo > 0 ? '#4CAF50' : '#F44336' }}>
                    {formatPercentage(resumenVendedorDetallado.variacionUltimo)}
                  </strong>
                </div>
              </div>
            )}

            {ventasMensualesPorVendedor.length > 0 && vendedorSeleccionadoAnalisis !== '' ? (
              <>
                {/* Gráfico de Vendedor */}
                <div className="dashboard-card full-width" style={{ marginTop: '20px' }}>
                  <h3>📈 Ventas Mensuales - {vendedorSeleccionadoAnalisis} (Tendencia)</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={ventasMensualesPorVendedor}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes_anio" angle={-45} textAnchor="end" height={100} />
                      <YAxis tickFormatter={value => `$${value/1000000}M`} />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Line type="monotone" dataKey="total" stroke="#FF6B6B" strokeWidth={2} name="Ventas Totales" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Tabla Detallada de Vendedor */}
                <div className="tabla-reporte-wrapper" style={{ marginTop: '20px' }}>
                  <h3 style={{ marginBottom: '15px', color: '#2c3e50' }}>📊 Desglose Mensual - {vendedorSeleccionadoAnalisis}</h3>
                  <table className="tabla-reporte">
                    <thead>
                      <tr>
                        <th>Período</th>
                        <th>Mes</th>
                        <th>Año</th>
                        <th>Total Ventas</th>
                        <th>Num. Facturas</th>
                        <th>Promedio/Factura</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ventasMensualesPorVendedor.map((item, idx) => (
                        <tr key={idx}>
                          <td><strong>{item.mes_anio}</strong></td>
                          <td>{item.mes}</td>
                          <td>{item.anio}</td>
                          <td className="col-total">{formatCurrency(item.total)}</td>
                          <td className="col-cantidad">{item.facturas}</td>
                          <td className="col-total">{formatCurrency(item.promedio)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : vendedorSeleccionadoAnalisis !== '' ? (
              <p style={{ marginTop: '20px', textAlign: 'center', color: '#999' }}>
                Cargando datos del vendedor <strong>{vendedorSeleccionadoAnalisis}</strong>...
              </p>
            ) : null}
          </div>
        </>
      )}

      {activeTab === 'reportes' && (
        <>
          <div className="dashboard-card full-width">
            <h2>📄 Reporte de Ventas por Fecha y Vendedor</h2>
            <div className="filtros-reporte">
              <div className="filtro">
                <label>Fecha Inicio</label>
                <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
              </div>
              <div className="filtro">
                <label>Fecha Fin</label>
                <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
              </div>
              <div className="filtro">
                <label>Vendedor</label>
                <select value={vendedorSeleccionado} onChange={e => setVendedorSeleccionado(e.target.value)}>
                  <option value="todos">Todos</option>
                  {vendedoresLista.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="filtro">
                <label>Estado de Pago</label>
                <select value={estadoPagoSeleccionado} onChange={e => setEstadoPagoSeleccionado(e.target.value)}>
                  <option value="todas">Todas</option>
                  <option value="pagadas">Pagadas</option>
                  <option value="pendientes">Pendientes</option>
                </select>
              </div>
              <div className="acciones">
                <button className="btn" onClick={generarReporteVentas}>Generar Reporte</button>
                <button className="btn" onClick={exportarCSV} disabled={reporteVentas.length===0}>Exportar CSV</button>
                <button className="btn" onClick={imprimirReporteFormato} disabled={reporteVentas.length===0}>Imprimir Formal</button>
              </div>
            </div>

            <div className="resumen-reporte">
              <div className="resumen-item">
                <span>Total Facturado</span>
                <strong>{formatCurrency(resumenReporte.total)}</strong>
              </div>
              <div className="resumen-item">
                <span>Costo Total</span>
                <strong>{formatCurrency(resumenReporte.costoTotal)}</strong>
              </div>
              <div className="resumen-item">
                <span>Utilidad Total</span>
                <strong style={{ color: resumenReporte.utilidadTotal >= 0 ? '#27ae60' : '#e74c3c' }}>
                  {formatCurrency(resumenReporte.utilidadTotal)}
                </strong>
              </div>
              <div className="resumen-item">
                <span>Margen Promedio</span>
                <strong>{formatPercentage(resumenReporte.margenPromedio)}</strong>
              </div>
              <div className="resumen-item">
                <span>Facturas</span>
                <strong>{resumenReporte.facturas}</strong>
              </div>
              <div className="resumen-item">
                <span>Ticket Promedio</span>
                <strong>{formatCurrency(resumenReporte.promedio)}</strong>
              </div>
              <div className="resumen-item">
                <span>Facturas con costo real</span>
                <strong>{resumenFuenteCosto.Real || 0}</strong>
              </div>
              <div className="resumen-item">
                <span>Facturas estimadas</span>
                <strong>{resumenFuenteCosto.Estimado || 0}</strong>
              </div>
            </div>

            <p style={{ marginBottom: '15px', color: '#5f6c7b', fontSize: '0.95rem' }}>
              Base de costo: {renderFuenteCostoBadge('Real')} usa costo guardado en la factura. {renderFuenteCostoBadge('Estimado')} usa fallback del 20%. {renderFuenteCostoBadge('Mixto')} combina ambos casos.
            </p>

            <div className="tabla-reporte-wrapper">
              {reporteLoading ? (
                <p>Cargando reporte...</p>
              ) : reporteVentas.length === 0 ? (
                <p>No hay resultados para los filtros seleccionados.</p>
              ) : (
                <table className="tabla-reporte">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Fecha</th>
                      <th>Cliente</th>
                      <th>Vendedor</th>
                      <th>Total</th>
                      <th>Costo</th>
                      <th>Utilidad</th>
                      <th>Margen</th>
                      <th>Base Costo</th>
                      <th>Abonado</th>
                      <th>Saldo</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporteVentas.map(r => (
                      <tr key={r.id}>
                        <td>{String(r.id).padStart(6, '0')}</td>
                        <td>{new Date(r.fecha).toLocaleDateString()}</td>
                        <td>{r.cliente}</td>
                        <td>{r.vendedor}</td>
                        <td className="col-total">{formatCurrency(r.total)}</td>
                        <td className="col-total">{formatCurrency(r.costoTotal || 0)}</td>
                        <td className="col-total" style={{ color: (r.utilidadTotal || 0) >= 0 ? '#27ae60' : '#e74c3c' }}>
                          {formatCurrency(r.utilidadTotal || 0)}
                        </td>
                        <td className="col-total" style={{ color: (r.margen || 0) >= 0 ? '#27ae60' : '#e74c3c' }}>
                          {formatPercentage(r.margen || 0)}
                        </td>
                        <td>{renderFuenteCostoBadge(r.fuenteCosto)}</td>
                        <td className="col-total">{formatCurrency(r.totalAbonado || 0)}</td>
                        <td className="col-total" style={{ color: r.saldo > 0 ? '#e74c3c' : '#27ae60' }}>
                          {formatCurrency(r.saldo || 0)}
                        </td>
                        <td>
                          <span className={`estado estado-${r.estado?.toLowerCase() || 'pendiente'}`}>
                            {r.estado || 'Pendiente'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="dashboard-card full-width" style={{ marginTop: '20px' }}>
              <h3>💹 Utilidad {periodicidadUtilidad === 'diaria' ? 'Diaria' : 'Mensual'}</h3>

              <div className="resumen-reporte" style={{ marginBottom: '15px' }}>
                <div className="resumen-item">
                  <span>Utilidad Hoy</span>
                  <strong style={{ color: resumenUtilidadActual.utilidadHoy >= 0 ? '#27ae60' : '#e74c3c' }}>
                    {formatCurrency(resumenUtilidadActual.utilidadHoy)}
                  </strong>
                </div>
                <div className="resumen-item">
                  <span>Utilidad Mes Actual</span>
                  <strong style={{ color: resumenUtilidadActual.utilidadMesActual >= 0 ? '#27ae60' : '#e74c3c' }}>
                    {formatCurrency(resumenUtilidadActual.utilidadMesActual)}
                  </strong>
                </div>
                <div className="filtro">
                  <label>Ver por</label>
                  <select value={periodicidadUtilidad} onChange={e => setPeriodicidadUtilidad(e.target.value)}>
                    <option value="diaria">Día</option>
                    <option value="mensual">Mes</option>
                  </select>
                </div>
              </div>

              <div className="tabla-reporte-wrapper">
                {reporteUtilidadPorPeriodo.length === 0 ? (
                  <p>No hay datos de utilidad para los filtros actuales.</p>
                ) : (
                  <table className="tabla-reporte">
                    <thead>
                      <tr>
                        <th>{periodicidadUtilidad === 'diaria' ? 'Día' : 'Mes'}</th>
                        <th>Facturas</th>
                        <th>Base Costo</th>
                        <th>Ventas</th>
                        <th>Costo</th>
                        <th>Utilidad</th>
                        <th>Margen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reporteUtilidadPorPeriodo.map((item) => (
                        <tr key={item.periodoKey}>
                          <td><strong>{item.periodoLabel}</strong></td>
                          <td className="col-cantidad">{item.facturas}</td>
                          <td>{renderFuenteCostoBadge(item.fuenteCosto)}</td>
                          <td className="col-total">{formatCurrency(item.ventaTotal)}</td>
                          <td className="col-total">{formatCurrency(item.costoTotal)}</td>
                          <td className="col-total" style={{ color: item.utilidadTotal >= 0 ? '#27ae60' : '#e74c3c' }}>
                            {formatCurrency(item.utilidadTotal)}
                          </td>
                          <td className="col-total" style={{ color: item.margen >= 0 ? '#27ae60' : '#e74c3c' }}>
                            {formatPercentage(item.margen)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'vendedores' && (
        <>
          <div className="dashboard-grid">
            <div className="dashboard-card">
              <h2>Total Vendedores</h2>
              <div className="metric">
                <span className="metric-value">{ventasPorVendedor.length}</span>
                <span className="metric-label">Vendedores activos</span>
              </div>
            </div>

            <div className="dashboard-card">
              <h2>Mejor Vendedor</h2>
              <div className="metric">
                <span className="metric-value">
                  {ventasPorVendedor[0]?.vendedor || 'N/A'}
                </span>
                <span className="metric-label">
                  {ventasPorVendedor[0] && formatCurrency(ventasPorVendedor[0].ventas)}
                </span>
              </div>
            </div>

            <div className="dashboard-card">
              <h2>Ventas Totales</h2>
              <div className="metric">
                <span className="metric-value">
                  {formatCurrency(ventasPorVendedor.reduce((sum, v) => sum + v.ventas, 0))}
                </span>
                <span className="metric-label">Total todos los vendedores</span>
              </div>
            </div>
          </div>

          {/* Gráfico de Barras por Vendedor */}
          <div className="dashboard-card full-width">
            <h2>Ventas por Vendedor (Barras)</h2>
            {ventasPorVendedor.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={ventasPorVendedor}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="vendedor" />
                  <YAxis tickFormatter={value => `$${value/1000000}M`} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="ventas" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p>No hay datos de vendedores</p>
            )}
          </div>

          {/* Gráfico de Torta por Vendedor */}
          <div className="dashboard-card full-width">
            <h2>Distribución de Ventas por Vendedor (Torta)</h2>
            {ventasPorVendedor.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={ventasPorVendedor}
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="ventas"
                    nameKey="vendedor"
                    label={({ vendedor, ventas }) => `${vendedor}: ${formatCurrency(ventas)}`}
                  >
                    {ventasPorVendedor.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p>No hay datos de vendedores</p>
            )}
          </div>
        </>
      )}

      {activeTab === 'productos' && (
        <>
          <div className="dashboard-card full-width">
            <h2>📦 Productos Más Vendidos y Sus Principales Clientes</h2>
            
            <div className="filtros-reporte">
              <div className="filtro">
                <label>Fecha Inicio</label>
                <input 
                  type="date" 
                  value={fechaInicioProductos} 
                  onChange={e => setFechaInicioProductos(e.target.value)} 
                />
              </div>
              <div className="filtro">
                <label>Fecha Fin</label>
                <input 
                  type="date" 
                  value={fechaFinProductos} 
                  onChange={e => setFechaFinProductos(e.target.value)} 
                />
              </div>
              <div className="filtro">
                <label>Buscar Producto</label>
                <input 
                  type="text" 
                  placeholder="Nombre del producto..." 
                  value={busquedaProducto} 
                  onChange={e => setBusquedaProducto(e.target.value)}
                  className="busqueda-input"
                />
                {busquedaProducto && (
                  <button 
                    className="btn-limpiar-busqueda"
                    onClick={() => setBusquedaProducto('')}
                    title="Limpiar búsqueda"
                  >
                    ×
                  </button>
                )}
              </div>
              <div className="acciones">
                <button className="btn" onClick={cargarProductosMasVendidos}>
                  🔄 Actualizar Análisis
                </button>
              </div>
            </div>
            
            {productosLoading ? (
              <p>Cargando análisis de productos...</p>
            ) : productosMasVendidos.length === 0 ? (
              <p>No hay datos de productos para el período seleccionado.</p>
            ) : (
              <>
                {busquedaProducto && (
                  <div className="busqueda-activa-info">
                    📦 Mostrando resultados para: <strong>"{busquedaProducto}"</strong>
                    <span className="resultados-count">
                      ({productosMasVendidos.filter(p => 
                        p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase())
                      ).length} producto(s) encontrado(s))
                    </span>
                  </div>
                )}
                
                <div className="resumen-productos">
                  <div className="resumen-item">
                    <span>Total Productos</span>
                    <strong>{busquedaProducto 
                      ? productosMasVendidos.filter(p => p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase())).length
                      : productosMasVendidos.length
                    }</strong>
                  </div>
                  <div className="resumen-item">
                    <span>Unidades Vendidas</span>
                    <strong>{busquedaProducto
                      ? productosMasVendidos.filter(p => p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase())).reduce((s, p) => s + p.cantidadTotal, 0)
                      : productosMasVendidos.reduce((s, p) => s + p.cantidadTotal, 0)
                    }</strong>
                  </div>
                  <div className="resumen-item">
                    <span>Ventas Totales</span>
                    <strong>{formatCurrency(busquedaProducto
                      ? productosMasVendidos.filter(p => p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase())).reduce((s, p) => s + p.montoTotal, 0)
                      : productosMasVendidos.reduce((s, p) => s + p.montoTotal, 0)
                    )}</strong>
                  </div>
                </div>
                
                <div className="productos-analisis">
                {(busquedaProducto 
                  ? productosMasVendidos.filter(p => p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase()))
                  : productosMasVendidos.slice(0, 20)
                ).map((producto, index) => (
                  <div key={index} className="producto-card">
                    <div className="producto-header">
                      <div className="ranking">#{index + 1}</div>
                      <div className="producto-info">
                        <h3>{producto.nombre}</h3>
                        <div className="producto-stats">
                          <span className="stat">
                            <strong>{producto.cantidadTotal}</strong> unidades vendidas
                          </span>
                          <span className="stat">
                            <strong>{formatCurrency(producto.montoTotal)}</strong> en ventas
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="clientes-top">
                      <h4>Top Clientes Compradores:</h4>
                      <table className="tabla-clientes-compra">
                        <thead>
                          <tr>
                            <th>Cliente</th>
                            <th>Unidades</th>
                            <th>Monto Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {producto.clientesTop.slice(0, 5).map((cliente, idx) => (
                            <tr key={idx}>
                              <td>{cliente.nombre}</td>
                              <td className="col-cantidad">{cliente.cantidad}</td>
                              <td className="col-monto">{formatCurrency(cliente.monto)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
              </>
            )}
          </div>

          {/* Gráfico de Top 10 Productos */}
          {productosMasVendidos.length > 0 && (
            <div className="dashboard-card full-width">
              <h2>Top 10 Productos Más Vendidos</h2>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={
                  busquedaProducto 
                    ? productosMasVendidos.filter(p => p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase())).slice(0, 10)
                    : productosMasVendidos.slice(0, 10)
                }>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'cantidadTotal') return [value, 'Unidades'];
                      return [formatCurrency(value), 'Ventas'];
                    }}
                  />
                  <Legend />
                  <Bar dataKey="cantidadTotal" fill="#4CAF50" name="Unidades Vendidas" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {activeTab === 'cobros' && (
        <>
          <div className="dashboard-grid">
            <div className="dashboard-card">
              <h2>Total Cobrado Anual</h2>
              <div className="metric">
                <span className="metric-value">
                  {formatCurrency(totalCobradoAnual)}
                </span>
                <span className="metric-label">En {new Date().getFullYear()}</span>
              </div>
            </div>

            <div className="dashboard-card">
              <h2>Promedio Mensual</h2>
              <div className="metric">
                <span className="metric-value">
                  {formatCurrency(totalCobradoAnual / 12)}
                </span>
                <span className="metric-label">Por mes</span>
              </div>
            </div>

            <div className="dashboard-card">
              <h2>Cobros Recientes</h2>
              <div className="metric">
                <span className="metric-value">{formatCurrency(cobrosUltimos30Dias)}</span>
                <span className="metric-label">Últimos 30 días</span>
              </div>
            </div>
          </div>

          {/* Gráfico de Cobros Mensuales */}
          <div className="dashboard-card full-width">
            <h2>Cobros Mensuales {new Date().getFullYear()}</h2>
            {cobrosMensuales.length > 0 && cobrosMensuales.some(item => item.cobros > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={cobrosMensuales}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis tickFormatter={value => `$${value/1000000}M`} />
                  <Tooltip formatter={(value) => [formatCurrency(value), 'Cobros']} />
                  <Bar dataKey="cobros" fill="#4CAF50" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data">
                <p>No hay datos de cobros para {new Date().getFullYear()}</p>
                <small>Los cobros se registran en la tabla 'abonos'</small>
              </div>
            )}
          </div>

          {/* Gráfico de Evolución de Cobros */}
          <div className="dashboard-card full-width">
            <h2>Evolución de Cobros (Últimos 6 meses)</h2>
            {cobrosPorMes.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={cobrosPorMes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="periodo" />
                  <YAxis tickFormatter={value => `$${value/1000}K`} />
                  <Tooltip formatter={(value) => [formatCurrency(value), 'Cobros']} />
                  <Line type="monotone" dataKey="cobros" stroke="#2196F3" strokeWidth={3} dot={{ fill: '#2196F3', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data">
                <p>No hay datos de cobros recientes</p>
                <small>Los cobros se registran en la tabla 'abonos'</small>
              </div>
            )}
          </div>

          {/* Gráfico de Métodos de Pago */}
          <div className="dashboard-card full-width">
            <h2>Distribución por Método de Pago</h2>
            {estadoCobros.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={estadoCobros}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="metodo"
                    label={({ metodo, count }) => `${metodo}: ${count}`}
                  >
                    {estadoCobros.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS_COBROS[index % COLORS_COBROS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name, props) => [
                    `${props.payload.metodo}: ${formatCurrency(props.payload.montoTotal)}`,
                    'Total cobrado'
                  ]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data">
                <p>No hay datos de métodos de pago</p>
                <small>Los métodos se registran en el campo 'metodo' de la tabla 'abonos'</small>
              </div>
            )}
          </div>

          {/* NUEVO: Gráfico de Cobros Diarios por Vendedor */}
          <div className="dashboard-card full-width">
            <h2>Cobros Diarios por Vendedor (Últimos 30 días)</h2>
            {cobrosDiariosVendedor.datos && cobrosDiariosVendedor.datos.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={cobrosDiariosVendedor.datos}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" />
                  <YAxis tickFormatter={value => `$${value/1000}K`} />
                  <Tooltip formatter={(value, name) => [formatCurrency(value), name]} />
                  <Legend />
                  {cobrosDiariosVendedor.vendedores.map((vendedor, index) => (
                    <Area 
                      key={vendedor} 
                      type="monotone" 
                      dataKey={vendedor} 
                      stackId="1" 
                      stroke={COLORS_COBROS[index % COLORS_COBROS.length]} 
                      fill={COLORS_COBROS[index % COLORS_COBROS.length]} 
                      fillOpacity={0.6}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data">
                <p>No hay datos de cobros por vendedor</p>
                <small>Los cobros se registran en la tabla 'abonos' y se asocian a facturas con vendedores</small>
              </div>
            )}
          </div>
        </>
      )}

      <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <button 
          onClick={() => setMostrarFiltroFechas(!mostrarFiltroFechas)}
          className="refresh-btn"
          style={{ marginBottom: '15px' }}
        >
          {mostrarFiltroFechas ? '🔽 Ocultar' : '🔼 Mostrar'} Filtro de Fechas
        </button>
        
        {mostrarFiltroFechas && (
          <div className="filtros-reporte" style={{ backgroundColor: 'white', marginBottom: '15px' }}>
            <div className="filtro">
              <label>Fecha Inicio</label>
              <input 
                type="date" 
                value={filtroFechaInicio} 
                onChange={e => setFiltroFechaInicio(e.target.value)}
              />
            </div>
            <div className="filtro">
              <label>Fecha Fin</label>
              <input 
                type="date" 
                value={filtroFechaFin} 
                onChange={e => setFiltroFechaFin(e.target.value)}
              />
            </div>
            <div className="acciones">
              <button 
                className="btn" 
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() - 30);
                  setFiltroFechaInicio(d.toISOString().split('T')[0]);
                  setFiltroFechaFin(new Date().toISOString().split('T')[0]);
                }}
              >
                Últimos 30 días
              </button>
              <button 
                className="btn" 
                onClick={() => {
                  const hoy = new Date();
                  const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
                  setFiltroFechaInicio(primerDia.toISOString().split('T')[0]);
                  setFiltroFechaFin(hoy.toISOString().split('T')[0]);
                }}
              >
                Mes Actual
              </button>
              <button 
                className="btn" 
                onClick={() => {
                  const hoy = new Date();
                  const primerDia = new Date(hoy.getFullYear(), 0, 1);
                  setFiltroFechaInicio(primerDia.toISOString().split('T')[0]);
                  setFiltroFechaFin(hoy.toISOString().split('T')[0]);
                }}
              >
                Año Actual
              </button>
            </div>
          </div>
        )}
        
        <button onClick={fetchDashboardData} className="refresh-btn">
          🔄 Actualizar Datos
        </button>
        
        {mostrarFiltroFechas && (
          <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '10px', textAlign: 'center' }}>
            📅 Período seleccionado: <strong>{new Date(filtroFechaInicio).toLocaleDateString('es-CO')}</strong> a <strong>{new Date(filtroFechaFin).toLocaleDateString('es-CO')}</strong>
          </p>
        )}
      </div>
    </div>
  );
};

export default DashboardVentas;