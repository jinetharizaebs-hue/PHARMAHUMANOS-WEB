import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './ReportesCobros.css';

const toLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseLocalDate = (value) => {
  if (!value || typeof value !== 'string') return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  return null;
};

const ReportesCobros = () => {
  const navigate = useNavigate();
  const [cargando, setCargando] = useState(true);
  const [abonos, setAbonos] = useState([]);
  const [facturas, setFacturas] = useState([]);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [filtroVendedor, setFiltroVendedor] = useState('Todos');
  const [mostrarGrafico, setMostrarGrafico] = useState(true);
  const [mostrarModalImportar, setMostrarModalImportar] = useState(false);
  const [archivoCSV, setArchivoCSV] = useState(null);
  const [errorImportacion, setErrorImportacion] = useState('');
  const [vistaActual, setVistaActual] = useState('resumen'); // 'resumen', 'diario', 'mensual', 'buscar-cliente'
  const [periodoActual, setPeriodoActual] = useState(''); // Para vista detallada
  
  // Estados para búsqueda de cliente
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [clientesSugeridos, setClientesSugeridos] = useState([]);
  const [resumenCliente, setResumenCliente] = useState(null);

  // Obtener vendedores únicos de las facturas
  const obtenerVendedores = () => {
    const vendedoresSet = new Set();
    facturas.forEach(factura => {
      if (factura.vendedor) {
        vendedoresSet.add(factura.vendedor);
      }
    });
    return Array.from(vendedoresSet).sort();
  };

  const vendedores = obtenerVendedores();

  // Buscar clientes que coincidan con la búsqueda
  const buscarClientes = (termino) => {
    if (!termino.trim()) {
      setClientesSugeridos([]);
      return;
    }

    const clientesUnicos = new Set();
    facturas.forEach(factura => {
      if (factura.cliente && factura.cliente.toLowerCase().includes(termino.toLowerCase())) {
        clientesUnicos.add(factura.cliente);
      }
    });

    setClientesSugeridos(Array.from(clientesUnicos).sort());
  };

  // Calcular resumen del cliente cuando se selecciona
  const calcularResumenCliente = (nombreCliente) => {
    setClienteSeleccionado(nombreCliente);
    setBusquedaCliente(nombreCliente);
    setClientesSugeridos([]);

    // Obtener todas las facturas del cliente
    const facturasCliente = facturas.filter(f => f.cliente === nombreCliente);
    const abonosCliente = abonos.filter(a => a.cliente === nombreCliente);

    // Calcular totales
    const totalFacturas = facturasCliente.reduce((sum, f) => sum + (f.total || 0), 0);
    const totalAbonos = abonosCliente.reduce((sum, a) => sum + (parseFloat(a.monto) || 0), 0);
    const saldoDeuda = totalFacturas - totalAbonos;

    setResumenCliente({
      cliente: nombreCliente,
      totalFacturas: totalFacturas,
      cantidadFacturas: facturasCliente.length,
      totalAbonos: totalAbonos,
      cantidadAbonos: abonosCliente.length,
      saldoDeuda: saldoDeuda,
      facturasCliente: facturasCliente.sort((a, b) => {
        const fechaA = parseLocalDate(a.fecha) || new Date(a.fecha);
        const fechaB = parseLocalDate(b.fecha) || new Date(b.fecha);
        return fechaB - fechaA;
      }),
      abonosCliente: abonosCliente.sort((a, b) => {
        const fechaA = parseLocalDate(a.fecha) || new Date(a.fecha);
        const fechaB = parseLocalDate(b.fecha) || new Date(b.fecha);
        return fechaB - fechaA;
      })
    });
  };

  const limpiarBusqueda = () => {
    setBusquedaCliente('');
    setClienteSeleccionado(null);
    setClientesSugeridos([]);
    setResumenCliente(null);
  };

  // Cargar datos desde Supabase
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setCargando(true);
        
        // Cargar facturas desde Supabase
        const { data: facturasData, error: facturasError } = await supabase
          .from('facturas')
          .select('*')
          .order('fecha', { ascending: false });
        
        if (facturasError) throw facturasError;
        setFacturas(facturasData || []);
        
        // Cargar abonos desde Supabase
        const { data: abonosData, error: abonosError } = await supabase
          .from('abonos')
          .select('*')
          .order('fecha', { ascending: false });
        
        if (abonosError) throw abonosError;
        
        // Enriquecer abonos con información de la factura
        const abonosEnriquecidos = (abonosData || []).map(abono => {
          const facturaRelacionada = facturasData.find(f => f.id === abono.factura_id);
          return {
            ...abono,
            vendedor: facturaRelacionada?.vendedor || 'Sin asignar',
            cliente: facturaRelacionada?.cliente || 'Cliente desconocido',
            facturaId: abono.factura_id
          };
        });
        
        setAbonos(abonosEnriquecidos);
        
        // Establecer fechas por defecto (últimos 30 días)
        const hoy = new Date();
        const hace30Dias = new Date();
        hace30Dias.setDate(hoy.getDate() - 30);
        
        setFechaInicio(toLocalDateKey(hace30Dias));
        setFechaFin(toLocalDateKey(hoy));
      } catch (error) {
        console.error("Error cargando datos desde Supabase:", error);
        alert('Error al cargar datos desde la base de datos');
      } finally {
        setCargando(false);
      }
    };

    cargarDatos();
  }, []);

  // Procesar abonos para reportes
  const procesarAbonos = () => {
    let abonosFiltrados = [...abonos];
    
    // Filtrar por vendedor si no es "Todos"
    if (filtroVendedor !== 'Todos') {
      abonosFiltrados = abonosFiltrados.filter(
        abono => abono.vendedor === filtroVendedor
      );
    }
    
    // Filtrar por rango de fechas
    abonosFiltrados = abonosFiltrados.filter(abono => {
      const fechaAbono = parseLocalDate(abono.fecha) || new Date(abono.fecha);
      const fechaInicioObj = fechaInicio ? parseLocalDate(fechaInicio) : null;
      const fechaFinObj = fechaFin ? parseLocalDate(fechaFin) : null;
      
      return (!fechaInicioObj || fechaAbono >= fechaInicioObj) && 
             (!fechaFinObj || fechaAbono <= fechaFinObj);
    });
    
    // Abonos por día
    const abonosPorDia = abonosFiltrados.reduce((acum, abono) => {
      const fecha = abono.fecha;
      if (!acum[fecha]) {
        acum[fecha] = {
          fecha,
          total: 0,
          cantidad: 0,
          abonos: []
        };
      }
      acum[fecha].total += parseFloat(abono.monto);
      acum[fecha].cantidad += 1;
      acum[fecha].abonos.push(abono);
      return acum;
    }, {});
    
    // Abonos por mes
    const abonosPorMes = abonosFiltrados.reduce((acum, abono) => {
      const fecha = parseLocalDate(abono.fecha) || new Date(abono.fecha);
      const mes = `${fecha.getFullYear()}-${(fecha.getMonth() + 1).toString().padStart(2, '0')}`;
      const mesNombre = fecha.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
      
      if (!acum[mes]) {
        acum[mes] = {
          mes,
          mesNombre,
          total: 0,
          cantidad: 0,
          abonos: []
        };
      }
      acum[mes].total += parseFloat(abono.monto);
      acum[mes].cantidad += 1;
      acum[mes].abonos.push(abono);
      return acum;
    }, {});
    
    // Abonos por vendedor
    const abonosPorVendedor = abonosFiltrados.reduce((acum, abono) => {
      const vendedor = abono.vendedor;
      if (!acum[vendedor]) {
        acum[vendedor] = {
          vendedor,
          total: 0,
          cantidad: 0,
          abonos: []
        };
      }
      acum[vendedor].total += parseFloat(abono.monto);
      acum[vendedor].cantidad += 1;
      acum[vendedor].abonos.push(abono);
      return acum;
    }, {});
    
    // Abonos por vendedor y día
    const abonosPorVendedorDia = abonosFiltrados.reduce((acum, abono) => {
      const key = `${abono.vendedor}-${abono.fecha}`;
      if (!acum[key]) {
        acum[key] = {
          vendedor: abono.vendedor,
          fecha: abono.fecha,
          total: 0,
          cantidad: 0,
          abonos: []
        };
      }
      acum[key].total += parseFloat(abono.monto);
      acum[key].cantidad += 1;
      acum[key].abonos.push(abono);
      return acum;
    }, {});
    
    // Abonos por vendedor y mes
    const abonosPorVendedorMes = abonosFiltrados.reduce((acum, abono) => {
      const fecha = parseLocalDate(abono.fecha) || new Date(abono.fecha);
      const mes = `${fecha.getFullYear()}-${(fecha.getMonth() + 1).toString().padStart(2, '0')}`;
      const mesNombre = fecha.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
      const key = `${abono.vendedor}-${mes}`;
      
      if (!acum[key]) {
        acum[key] = {
          vendedor: abono.vendedor,
          mes,
          mesNombre,
          total: 0,
          cantidad: 0,
          abonos: []
        };
      }
      acum[key].total += parseFloat(abono.monto);
      acum[key].cantidad += 1;
      acum[key].abonos.push(abono);
      return acum;
    }, {});
    
    // Calcular totales para cada vendedor
    const vendedoresConTotales = vendedores.map(vendedor => {
      return abonosPorVendedor[vendedor] || {
        vendedor,
        total: 0,
        cantidad: 0,
        abonos: []
      };
    });
    
    return {
      porDia: Object.values(abonosPorDia).sort((a, b) => {
        const fechaA = parseLocalDate(a.fecha) || new Date(a.fecha);
        const fechaB = parseLocalDate(b.fecha) || new Date(b.fecha);
        return fechaA - fechaB;
      }),
      porMes: Object.values(abonosPorMes).sort((a, b) => a.mes.localeCompare(b.mes)),
      porVendedor: vendedoresConTotales.sort((a, b) => b.total - a.total),
      porVendedorDia: Object.values(abonosPorVendedorDia),
      porVendedorMes: Object.values(abonosPorVendedorMes),
      porCliente: abonosFiltrados.reduce((acum, abono) => {
        const cliente = abono.cliente;
        if (!acum[cliente]) {
          acum[cliente] = {
            cliente,
            total: 0,
            cantidad: 0,
            abonos: []
          };
        }
        acum[cliente].total += parseFloat(abono.monto);
        acum[cliente].cantidad += 1;
        acum[cliente].abonos.push(abono);
        return acum;
      }, {}),
      totalGeneral: abonosFiltrados.reduce((sum, abono) => sum + parseFloat(abono.monto), 0),
      cantidadGeneral: abonosFiltrados.length,
      abonosFiltrados
    };
  };

  const reportes = procesarAbonos();

  // Formatear moneda
  const formatMoneda = (valor) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(valor);
  };

  // Formatear fecha
  const formatFechaLegible = (fecha) => {
    const opciones = { year: 'numeric', month: 'short', day: 'numeric' };
    const localDate = parseLocalDate(fecha) || new Date(fecha);
    return localDate.toLocaleDateString('es-ES', opciones);
  };

  // Calcular porcentaje para gráfico circular
  const calcularPorcentaje = (valor) => {
    return reportes.totalGeneral > 0 
      ? ((valor / reportes.totalGeneral) * 100).toFixed(1) 
      : '0';
  };

  // Obtener color para cada vendedor
  const obtenerColorVendedor = (vendedor) => {
    const colores = ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b', '#858796'];
    const index = vendedores.indexOf(vendedor) % colores.length;
    return colores[index];
  };

  // Obtener vendedor principal para un día
  const obtenerVendedorPrincipal = (abonosDia) => {
    const conteoVendedores = abonosDia.reduce((acc, abono) => {
      acc[abono.vendedor] = (acc[abono.vendedor] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(conteoVendedores)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
  };

  // Función auxiliar para generar y descargar el CSV
  const generarCSV = (headers, rows, filename) => {
    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.map(item => `"${item}"`).join(',') + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1. Exportar reporte completo de abonos
  const exportarACSV = () => {
    const headers = ['Fecha', 'Cliente', 'Vendedor', 'Monto', 'Nota', 'Factura ID'];
    const rows = reportes.abonosFiltrados.map(abono => [
      abono.fecha,
      abono.cliente,
      abono.vendedor,
      abono.monto,
      abono.nota || '',
      abono.factura_id || abono.facturaId
    ]);
    
    generarCSV(headers, rows, `reporte_cobros_${toLocalDateKey()}`);
  };

  // 2. Exportar reporte por vendedores
  const exportarVendedoresACSV = () => {
    const headers = ['Vendedor', 'Cantidad Abonos', 'Total Recaudado', 'Promedio por Abono', '% del Total'];
    const rows = reportes.porVendedor.map(vendedor => [
      vendedor.vendedor,
      vendedor.cantidad,
      vendedor.total,
      vendedor.cantidad > 0 ? (vendedor.total / vendedor.cantidad).toFixed(2) : 0,
      calcularPorcentaje(vendedor.total)
    ]);
    
    generarCSV(headers, rows, `reporte_vendedores_${toLocalDateKey()}`);
  };

  // 3. Exportar reporte diario
  const exportarDiarioACSV = () => {
    const headers = ['Fecha', 'Cantidad Abonos', 'Total Recaudado', 'Promedio por Abono', 'Vendedor Principal'];
    const rows = reportes.porDia.map(dia => [
      dia.fecha,
      dia.cantidad,
      dia.total,
      (dia.total / dia.cantidad).toFixed(2),
      obtenerVendedorPrincipal(dia.abonos)
    ]);
    
    generarCSV(headers, rows, `reporte_diario_${toLocalDateKey()}`);
  };

  // 4. Exportar reporte mensual
  const exportarMensualACSV = () => {
    const headers = ['Mes', 'Cantidad Abonos', 'Total Recaudado', 'Promedio por Abono', 'Vendedor Principal'];
    const rows = reportes.porMes.map(mes => [
      mes.mesNombre,
      mes.cantidad,
      mes.total,
      (mes.total / mes.cantidad).toFixed(2),
      obtenerVendedorPrincipal(mes.abonos)
    ]);
    
    generarCSV(headers, rows, `reporte_mensual_${toLocalDateKey()}`);
  };

  // 5. Exportar reporte de clientes
  const exportarClientesACSV = () => {
    const headers = ['Cliente', 'Cantidad Abonos', 'Total Abonado', 'Vendedores'];
    const rows = Object.values(reportes.porCliente)
      .sort((a, b) => b.total - a.total)
      .map(cliente => [
        cliente.cliente,
        cliente.cantidad,
        cliente.total,
        [...new Set(cliente.abonos.map(a => a.vendedor))].join(', ')
      ]);
    
    generarCSV(headers, rows, `reporte_clientes_${toLocalDateKey()}`);
  };

  // 6. Exportar reporte diario por vendedor
  const exportarDiarioVendedorACSV = () => {
    const headers = ['Vendedor', 'Fecha', 'Cantidad Abonos', 'Total Recaudado', 'Promedio por Abono'];
    const rows = reportes.porVendedorDia.map(item => [
      item.vendedor,
      item.fecha,
      item.cantidad,
      item.total,
      (item.total / item.cantidad).toFixed(2)
    ]);
    
    generarCSV(headers, rows, `reporte_diario_vendedor_${toLocalDateKey()}`);
  };

  // 7. Exportar reporte mensual por vendedor
  const exportarMensualVendedorACSV = () => {
    const headers = ['Vendedor', 'Mes', 'Cantidad Abonos', 'Total Recaudado', 'Promedio por Abono'];
    const rows = reportes.porVendedorMes.map(item => [
      item.vendedor,
      item.mesNombre,
      item.cantidad,
      item.total,
      (item.total / item.cantidad).toFixed(2)
    ]);
    
    generarCSV(headers, rows, `reporte_mensual_vendedor_${toLocalDateKey()}`);
  };

  // Renderizar vista de resumen general
  const renderResumenGeneral = () => (
    <>
      {/* Resumen por Vendedor */}
      <div className="resumen-vendedores">
        <h2>
          <i className="fas fa-users"></i> Resumen por Vendedor
          <small className="subtitle">
            {filtroVendedor !== 'Todos' ? `Filtrado por: ${filtroVendedor}` : 'Todos los vendedores'}
          </small>
        </h2>
        
        {mostrarGrafico ? (
          <div className="vendedores-grid">
            {reportes.porVendedor.map((vendedor, index) => (
              <div 
                key={index} 
                className="vendedor-card"
                style={{ borderLeft: `5px solid ${obtenerColorVendedor(vendedor.vendedor)}` }}
              >
                <div className="vendedor-header">
                  <h3>{vendedor.vendedor}</h3>
                  <span className="porcentaje">
                    {calcularPorcentaje(vendedor.total)}%
                  </span>
                </div>
                <div className="vendedor-stats">
                  <div className="stat-item">
                    <span>Total:</span>
                    <strong>{formatMoneda(vendedor.total)}</strong>
                  </div>
                  <div className="stat-item">
                    <span>Abonos:</span>
                    <strong>{vendedor.cantidad}</strong>
                  </div>
                  <div className="stat-item">
                    <span>Promedio:</span>
                    <strong>
                      {vendedor.cantidad > 0 
                        ? formatMoneda(vendedor.total / vendedor.cantidad) 
                        : formatMoneda(0)}
                    </strong>
                  </div>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ 
                      width: `${calcularPorcentaje(vendedor.total)}%`,
                      backgroundColor: obtenerColorVendedor(vendedor.vendedor)
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="tabla-container">
            <table className="tabla-vendedores">
              <thead>
                <tr>
                  <th>Vendedor</th>
                  <th>Cantidad</th>
                  <th>Total</th>
                  <th>Promedio</th>
                  <th>% del Total</th>
                </tr>
              </thead>
              <tbody>
                {reportes.porVendedor.map((vendedor, index) => (
                  <tr key={index}>
                    <td>
                      <span 
                        className="vendedor-tag" 
                        style={{ backgroundColor: obtenerColorVendedor(vendedor.vendedor) }}
                      >
                        {vendedor.vendedor}
                      </span>
                    </td>
                    <td>{vendedor.cantidad}</td>
                    <td className="total">{formatMoneda(vendedor.total)}</td>
                    <td>
                      {vendedor.cantidad > 0 
                        ? formatMoneda(vendedor.total / vendedor.cantidad) 
                        : formatMoneda(0)}
                    </td>
                    <td>
                      <div className="porcentaje-container">
                        <div className="porcentaje-bar">
                          <div 
                            className="bar-fill" 
                            style={{ 
                              width: `${calcularPorcentaje(vendedor.total)}%`,
                              backgroundColor: obtenerColorVendedor(vendedor.vendedor)
                            }}
                          ></div>
                        </div>
                        <span className="porcentaje-text">
                          {calcularPorcentaje(vendedor.total)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reporte de Abonos por Día */}
      <div className="reporte-diario">
        <h2>
          <i className="fas fa-calendar-day"></i> Abonos por Día
          <small className="subtitle">
            {fechaInicio && fechaFin 
              ? `Desde ${formatFechaLegible(fechaInicio)} hasta ${formatFechaLegible(fechaFin)}` 
              : 'Todos los abonos'}
          </small>
        </h2>
        
        {cargando ? (
          <div className="loading-placeholder">
            <div className="spinner"></div>
            <p>Cargando datos de abonos...</p>
          </div>
        ) : reportes.porDia.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-calendar-times"></i>
            <p>No hay abonos registrados en este período</p>
          </div>
        ) : (
          <div className="tabla-container">
            <table className="tabla-abonos">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cantidad</th>
                  <th>Total</th>
                  <th>Promedio</th>
                  <th>Vendedor Principal</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reportes.porDia.map((dia, index) => {
                  const vendedorPrincipal = obtenerVendedorPrincipal(dia.abonos);
                  
                  return (
                    <tr key={index}>
                      <td>{formatFechaLegible(dia.fecha)}</td>
                      <td>{dia.cantidad}</td>
                      <td className="total">{formatMoneda(dia.total)}</td>
                      <td>{formatMoneda(dia.total / dia.cantidad)}</td>
                      <td>
                        <span 
                          className="vendedor-tag" 
                          style={{ backgroundColor: obtenerColorVendedor(vendedorPrincipal) }}
                        >
                          {vendedorPrincipal}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="button small-button"
                          onClick={() => {
                            setFechaInicio(dia.fecha);
                            setFechaFin(dia.fecha);
                            setVistaActual('diario');
                            setPeriodoActual(dia.fecha);
                          }}
                          title="Ver detalles del día"
                        >
                          <i className="fas fa-search"></i>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reporte de Abonos por Mes */}
      <div className="reporte-mensual">
        <h2>
          <i className="fas fa-calendar-alt"></i> Abonos por Mes
        </h2>
        
        {reportes.porMes.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-calendar-times"></i>
            <p>No hay abonos registrados por mes</p>
          </div>
        ) : (
          <div className="tabla-container">
            <table className="tabla-abonos">
              <thead>
                <tr>
                  <th>Mes</th>
                  <th>Cantidad</th>
                  <th>Total</th>
                  <th>Promedio</th>
                  <th>Vendedor Principal</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reportes.porMes.map((mes, index) => {
                  const vendedorPrincipal = obtenerVendedorPrincipal(mes.abonos);
                  
                  return (
                    <tr key={index}>
                      <td>{mes.mesNombre}</td>
                      <td>{mes.cantidad}</td>
                      <td className="total">{formatMoneda(mes.total)}</td>
                      <td>{formatMoneda(mes.total / mes.cantidad)}</td>
                      <td>
                        <span 
                          className="vendedor-tag" 
                          style={{ backgroundColor: obtenerColorVendedor(vendedorPrincipal) }}
                        >
                          {vendedorPrincipal}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="button small-button"
                          onClick={() => {
                            // Establecer el rango de fechas para el mes seleccionado
                            const [year, month] = mes.mes.split('-');
                            const firstDay = new Date(year, month - 1, 1);
                            const lastDay = new Date(year, month, 0);
                            
                            setFechaInicio(toLocalDateKey(firstDay));
                            setFechaFin(toLocalDateKey(lastDay));
                            setVistaActual('mensual');
                            setPeriodoActual(mes.mes);
                          }}
                          title="Ver detalles del mes"
                        >
                          <i className="fas fa-search"></i>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top Clientes */}
      <div className="top-clientes">
        <h2>
          <i className="fas fa-user-tag"></i> Top Clientes
          <small className="subtitle">Clientes con más abonos</small>
        </h2>
        
        {Object.keys(reportes.porCliente).length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-user-slash"></i>
            <p>No hay datos de clientes</p>
          </div>
        ) : (
          <div className="clientes-grid">
            {Object.values(reportes.porCliente)
              .sort((a, b) => b.total - a.total)
              .slice(0, 5)
              .map((cliente, index) => (
                <div key={index} className="cliente-card">
                  <div className="cliente-header">
                    <h3>{cliente.cliente}</h3>
                    <span className="ranking">#{index + 1}</span>
                  </div>
                  <div className="cliente-stats">
                    <div className="stat-item">
                      <span>Total abonado:</span>
                      <strong>{formatMoneda(cliente.total)}</strong>
                    </div>
                    <div className="stat-item">
                      <span>Abonos:</span>
                      <strong>{cliente.cantidad}</strong>
                    </div>
                  </div>
                  <div className="cliente-vendedores">
                    <span>Vendedores:</span>
                    <div className="vendedores-tags">
                      {[...new Set(cliente.abonos.map(a => a.vendedor))]
                        .slice(0, 3)
                        .map((vendedor, i) => (
                          <span 
                            key={i} 
                            className="vendedor-tag small"
                            style={{ backgroundColor: obtenerColorVendedor(vendedor) }}
                          >
                            {vendedor}
                          </span>
                        ))}
                      {[...new Set(cliente.abonos.map(a => a.vendedor))].length > 3 && (
                        <span className="vendedor-tag small more">
                          +{[...new Set(cliente.abonos.map(a => a.vendedor))].length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </>
  );

  // Renderizar vista detallada por día
  const renderVistaDiaria = () => {
    const dia = reportes.porDia.find(d => d.fecha === periodoActual);
    
    if (!dia) {
      return (
        <div className="empty-state">
          <i className="fas fa-calendar-times"></i>
          <p>No se encontraron datos para este día</p>
          <button 
            className="button secondary-button"
            onClick={() => setVistaActual('resumen')}
          >
            Volver al resumen
          </button>
        </div>
      );
    }

    return (
      <div className="vista-detallada">
        <div className="vista-header">
          <button 
            className="button secondary-button"
            onClick={() => setVistaActual('resumen')}
          >
            <i className="fas fa-arrow-left"></i> Volver al resumen
          </button>
          <h2>Detalles del día: {formatFechaLegible(dia.fecha)}</h2>
          <div className="resumen-dia">
            <span>Total: {formatMoneda(dia.total)}</span>
            <span>Abonos: {dia.cantidad}</span>
          </div>
        </div>

        <div className="tabla-container">
          <table className="tabla-detalle">
            <thead>
              <tr>
                <th>Vendedor</th>
                <th>Cliente</th>
                <th>Monto</th>
                <th>Nota</th>
                <th>Factura ID</th>
              </tr>
            </thead>
            <tbody>
              {dia.abonos.map((abono, index) => (
                <tr key={index}>
                  <td>
                    <span 
                      className="vendedor-tag" 
                      style={{ backgroundColor: obtenerColorVendedor(abono.vendedor) }}
                    >
                      {abono.vendedor}
                    </span>
                  </td>
                  <td>{abono.cliente}</td>
                  <td className="total">{formatMoneda(abono.monto)}</td>
                  <td>{abono.nota || '-'}</td>
                  <td>{abono.factura_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Renderizar vista detallada por mes
  const renderVistaMensual = () => {
    const mes = reportes.porMes.find(m => m.mes === periodoActual);
    
    if (!mes) {
      return (
        <div className="empty-state">
          <i className="fas fa-calendar-times"></i>
          <p>No se encontraron datos para este mes</p>
          <button 
            className="button secondary-button"
            onClick={() => setVistaActual('resumen')}
          >
            Volver al resumen
          </button>
        </div>
      );
    }

    return (
      <div className="vista-detallada">
        <div className="vista-header">
          <button 
            className="button secondary-button"
            onClick={() => setVistaActual('resumen')}
          >
            <i className="fas fa-arrow-left"></i> Volver al resumen
          </button>
          <h2>Detalles del mes: {mes.mesNombre}</h2>
          <div className="resumen-mes">
            <span>Total: {formatMoneda(mes.total)}</span>
            <span>Abonos: {mes.cantidad}</span>
          </div>
        </div>

        <div className="tabla-container">
          <table className="tabla-detalle">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Vendedor</th>
                <th>Cliente</th>
                <th>Monto</th>
                <th>Nota</th>
                <th>Factura ID</th>
              </tr>
            </thead>
            <tbody>
              {mes.abonos.map((abono, index) => (
                <tr key={index}>
                  <td>{formatFechaLegible(abono.fecha)}</td>
                  <td>
                    <span 
                      className="vendedor-tag" 
                      style={{ backgroundColor: obtenerColorVendedor(abono.vendedor) }}
                    >
                      {abono.vendedor}
                    </span>
                  </td>
                  <td>{abono.cliente}</td>
                  <td className="total">{formatMoneda(abono.monto)}</td>
                  <td>{abono.nota || '-'}</td>
                  <td>{abono.factura_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="reportes-container">
      <header className="reportes-header">
        <h1>
          <i className="fas fa-chart-line"></i> Reportes de Cobros
          {vistaActual !== 'resumen' && (
            <small className="subtitle">
              {vistaActual === 'diario' ? `Vista diaria - ${formatFechaLegible(periodoActual)}` : 
               vistaActual === 'mensual' ? `Vista mensual - ${reportes.porMes.find(m => m.mes === periodoActual)?.mesNombre}` : ''}
            </small>
          )}
        </h1>
        <div className="header-actions">
          {vistaActual === 'resumen' ? (
            <>
              <button 
                className="button secondary-button"
                onClick={() => navigate('/facturas')}
              >
                <i className="fas fa-arrow-left"></i> Volver a Facturas
              </button>

              <button 
                className="button info-button"
                onClick={() => setVistaActual('buscar-cliente')}
              >
                <i className="fas fa-search"></i> Buscar Cliente
              </button>
              
              {/* Menú de exportación */}
              <div className="dropdown">
                <button className="button info-button dropdown-toggle">
                  <i className="fas fa-file-csv"></i> Exportar Reportes
                  <i className="fas fa-caret-down"></i>
                </button>
                <div className="dropdown-menu">
                  <button className="dropdown-item" onClick={exportarACSV}>
                    <i className="fas fa-file-alt"></i> Abonos detallados
                  </button>
                  <button className="dropdown-item" onClick={exportarVendedoresACSV}>
                    <i className="fas fa-user-tie"></i> Por vendedores
                  </button>
                  <button className="dropdown-item" onClick={exportarDiarioACSV}>
                    <i className="fas fa-calendar-day"></i> Diario consolidado
                  </button>
                  <button className="dropdown-item" onClick={exportarMensualACSV}>
                    <i className="fas fa-calendar-alt"></i> Mensual consolidado
                  </button>
                  <button className="dropdown-item" onClick={exportarDiarioVendedorACSV}>
                    <i className="fas fa-calendar-day"></i> Diario por vendedor
                  </button>
                  <button className="dropdown-item" onClick={exportarMensualVendedorACSV}>
                    <i className="fas fa-calendar-alt"></i> Mensual por vendedor
                  </button>
                  <button className="dropdown-item" onClick={exportarClientesACSV}>
                    <i className="fas fa-users"></i> Por clientes
                  </button>
                </div>
              </div>
              
              <button 
                className="button toggle-button"
                onClick={() => setMostrarGrafico(!mostrarGrafico)}
              >
                <i className={`fas fa-${mostrarGrafico ? 'chart-bar' : 'chart-pie'}`}></i> 
                {mostrarGrafico ? 'Ver Tabla' : 'Ver Gráfico'}
              </button>
            </>
          ) : vistaActual === 'buscar-cliente' ? (
            <button 
              className="button secondary-button"
              onClick={() => {
                limpiarBusqueda();
                setVistaActual('resumen');
              }}
            >
              <i className="fas fa-arrow-left"></i> Volver al resumen
            </button>
          ) : (
            <button 
              className="button secondary-button"
              onClick={() => setVistaActual('resumen')}
            >
              <i className="fas fa-arrow-left"></i> Volver al resumen
            </button>
          )}
        </div>
      </header>

      {/* Filtros (solo en vista resumen) */}
      {vistaActual === 'resumen' && (
        <div className="filtros-container">
          <div className="filtro-row">
            <div className="filtro-group">
              <label>
                <i className="fas fa-calendar-alt"></i> Fecha Inicio:
                <input 
                  type="date" 
                  value={fechaInicio}
                  onChange={e => setFechaInicio(e.target.value)}
                  max={fechaFin || toLocalDateKey()}
                />
              </label>
              
              <label>
                Fecha Fin:
                <input 
                  type="date" 
                  value={fechaFin}
                  onChange={e => setFechaFin(e.target.value)}
                  min={fechaInicio}
                  max={toLocalDateKey()}
                />
              </label>
            </div>
            
            <div className="filtro-group">
              <label>
                <i className="fas fa-user-tie"></i> Vendedor:
                <select
                  value={filtroVendedor}
                  onChange={e => setFiltroVendedor(e.target.value)}
                >
                  <option value="Todos">Todos los vendedores</option>
                  {vendedores.map(vendedor => (
                    <option key={vendedor} value={vendedor}>
                      {vendedor}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          
          <div className="resumen-filtros">
            <div className="resumen-card">
              <div className="resumen-icon">
                <i className="fas fa-money-bill-wave"></i>
              </div>
              <div className="resumen-content">
                <span>Total abonos</span>
                <strong>{formatMoneda(reportes.totalGeneral)}</strong>
              </div>
            </div>
            
            <div className="resumen-card">
              <div className="resumen-icon">
                <i className="fas fa-list-ol"></i>
              </div>
              <div className="resumen-content">
                <span>Cantidad de abonos</span>
                <strong>{reportes.cantidadGeneral}</strong>
              </div>
            </div>
            
            <div className="resumen-card">
              <div className="resumen-icon">
                <i className="fas fa-calculator"></i>
              </div>
              <div className="resumen-content">
                <span>Promedio por abono</span>
                <strong>
                  {reportes.cantidadGeneral > 0 
                    ? formatMoneda(reportes.totalGeneral / reportes.cantidadGeneral) 
                    : formatMoneda(0)}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contenido principal según la vista */}
      {vistaActual === 'resumen' && renderResumenGeneral()}
      {vistaActual === 'diario' && renderVistaDiaria()}
      {vistaActual === 'mensual' && renderVistaMensual()}

      {/* Vista de búsqueda de cliente */}
      {vistaActual === 'buscar-cliente' && (
        <div className="buscar-cliente-section">
          <div className="search-container">
            <div className="search-box">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="Escribe el nombre del cliente..."
                value={busquedaCliente}
                onChange={(e) => {
                  setBusquedaCliente(e.target.value);
                  buscarClientes(e.target.value);
                }}
                className="search-input"
              />
              {busquedaCliente && (
                <button 
                  className="clear-btn"
                  onClick={limpiarBusqueda}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sugerencias de clientes */}
            {clientesSugeridos.length > 0 && (
              <div className="clientes-sugeridos">
                {clientesSugeridos.map((cliente, idx) => (
                  <div 
                    key={idx}
                    className="cliente-item"
                    onClick={() => calcularResumenCliente(cliente)}
                  >
                    <i className="fas fa-user"></i>
                    {cliente}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resumen del cliente cuando está seleccionado */}
          {resumenCliente && (
            <div className="resumen-cliente">
              <h2>📊 Resumen de {resumenCliente.cliente}</h2>
              
              <div className="resumen-stats">
                <div className="stat-card deuda">
                  <span className="stat-label">Saldo a Deber</span>
                  <span className="stat-value">{formatMoneda(resumenCliente.saldoDeuda)}</span>
                  <span className="stat-subtext">
                    {resumenCliente.saldoDeuda > 0 ? '🔴 Deuda' : '🟢 Sin deuda'}
                  </span>
                </div>

                <div className="stat-card total-facturas">
                  <span className="stat-label">Total Facturas</span>
                  <span className="stat-value">{formatMoneda(resumenCliente.totalFacturas)}</span>
                  <span className="stat-subtext">{resumenCliente.cantidadFacturas} factura(s)</span>
                </div>

                <div className="stat-card total-abonos">
                  <span className="stat-label">Total Abonos</span>
                  <span className="stat-value">{formatMoneda(resumenCliente.totalAbonos)}</span>
                  <span className="stat-subtext">{resumenCliente.cantidadAbonos} abono(s)</span>
                </div>

                <div className="stat-card porcentaje">
                  <span className="stat-label">Pagado</span>
                  <span className="stat-value">
                    {resumenCliente.totalFacturas > 0 
                      ? `${((resumenCliente.totalAbonos / resumenCliente.totalFacturas) * 100).toFixed(1)}%`
                      : '0%'
                    }
                  </span>
                  <span className="stat-subtext">del total facturado</span>
                </div>
              </div>

              {/* Facturas del cliente */}
              {resumenCliente.facturasCliente.length > 0 && (
                <div className="cliente-facturas">
                  <h3>📄 Facturas</h3>
                  <div className="tabla-scroll">
                    <table className="tabla-cliente">
                      <thead>
                        <tr>
                          <th>Factura</th>
                          <th>Fecha</th>
                          <th>Total</th>
                          <th>Abonado</th>
                          <th>Pendiente</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resumenCliente.facturasCliente.map((factura, idx) => {
                          const abonoFactura = resumenCliente.abonosCliente
                            .filter(a => a.factura_id === factura.id)
                            .reduce((sum, a) => sum + (parseFloat(a.monto) || 0), 0);
                          const pendiente = (factura.total || 0) - abonoFactura;
                          
                          return (
                            <tr key={idx} className={pendiente > 0 ? 'pendiente' : 'pagada'}>
                              <td><strong>{factura.id}</strong></td>
                              <td>{formatFechaLegible(factura.fecha)}</td>
                              <td>{formatMoneda(factura.total)}</td>
                              <td className="abonado">{formatMoneda(abonoFactura)}</td>
                              <td className={pendiente > 0 ? 'deuda' : 'pagado'}>
                                {formatMoneda(pendiente)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Abonos del cliente */}
              {resumenCliente.abonosCliente.length > 0 && (
                <div className="cliente-abonos">
                  <h3>💰 Abonos Registrados</h3>
                  <div className="tabla-scroll">
                    <table className="tabla-cliente">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Factura</th>
                          <th>Monto</th>
                          <th>Vendedor</th>
                          <th>Nota</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resumenCliente.abonosCliente.map((abono, idx) => (
                          <tr key={idx}>
                            <td>{formatFechaLegible(abono.fecha)}</td>
                            <td><strong>{abono.factura_id}</strong></td>
                            <td className="monto">{formatMoneda(abono.monto)}</td>
                            <td>{abono.vendedor}</td>
                            <td>{abono.nota || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportesCobros;