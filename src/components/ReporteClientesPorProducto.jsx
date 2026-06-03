import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import * as XLSX from 'xlsx';
import './ReporteClientesPorProducto.css';

const toLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseLocalDate = (value) => {
  if (!value || typeof value !== 'string') return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const ReporteClientesPorProducto = () => {
  const [productos, setProductos] = useState([]);
  const [facturas, setFacturas] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [reporteClientes, setReporteClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [estadisticas, setEstadisticas] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('activos'); // 'activos', 'inactivos', 'todos'

  // Cargar productos y facturas
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setCargando(true);

       // Cargar TODOS los productos (activos, inactivos, con/sin stock)
const { data: productosData, error: productosError } = await supabase
  .from('productos')
  .select('id, codigo, nombre, precio, categoria, imagen_url, activo, stock')
  .order('nombre', { ascending: true });

        // Cargar facturas con productos
        const { data: facturasData, error: facturasError } = await supabase
          .from('facturas')
          .select('*')
          .order('fecha', { ascending: false });

        if (facturasError) throw facturasError;

        setProductos(productosData || []);
        setFacturas(facturasData || []);
      } catch (error) {
        console.error('Error cargando datos:', error);
        alert('Error al cargar datos. Revisa la consola.');
      } finally {
        setCargando(false);
      }
    };

    cargarDatos();
  }, []);

  // Generar reporte cuando se selecciona un producto
  useEffect(() => {
    if (!productoSeleccionado) {
      setReporteClientes([]);
      setEstadisticas(null);
      return;
    }

    generarReporte();
  }, [productoSeleccionado, fechaInicio, fechaFin, facturas]);

  const generarReporte = () => {
    if (!productoSeleccionado) return;

    // Filtrar facturas por fecha si se especifica
    let facturasFiltradas = facturas;
    
    if (fechaInicio) {
      facturasFiltradas = facturasFiltradas.filter(f => 
        (parseLocalDate(f.fecha) || new Date(f.fecha)) >= parseLocalDate(fechaInicio)
      );
    }
    
    if (fechaFin) {
      facturasFiltradas = facturasFiltradas.filter(f => 
        (parseLocalDate(f.fecha) || new Date(f.fecha)) <= parseLocalDate(fechaFin)
      );
    }

    // Agrupar por cliente
    const clientesMap = {};

    facturasFiltradas.forEach(factura => {
      if (!factura.productos || !Array.isArray(factura.productos)) return;

      factura.productos.forEach(item => {
        // Buscar por ID o por nombre (compatibilidad)
        const esElProducto = 
          item.id === productoSeleccionado.id || 
          item.producto_id === productoSeleccionado.id ||
          item.nombre === productoSeleccionado.nombre;

        if (esElProducto) {
          const cliente = factura.cliente || 'Cliente Desconocido';
          
          if (!clientesMap[cliente]) {
            clientesMap[cliente] = {
              cliente: cliente,
              vendedor: factura.vendedor || 'N/A',
              cantidadTotal: 0,
              totalVentas: 0,
              numeroCompras: 0,
              ultimaCompra: factura.fecha,
              primeraCompra: factura.fecha,
              facturas: []
            };
          }

          const cantidad = parseInt(item.cantidad) || 1;
          const precio = parseFloat(item.precio) || 0;
          const subtotal = cantidad * precio;

          clientesMap[cliente].cantidadTotal += cantidad;
          clientesMap[cliente].totalVentas += subtotal;
          clientesMap[cliente].numeroCompras += 1;
          clientesMap[cliente].facturas.push({
            id: factura.id,
            fecha: factura.fecha,
            cantidad: cantidad,
            precio: precio,
            subtotal: subtotal
          });

          // Actualizar fechas
          if ((parseLocalDate(factura.fecha) || new Date(factura.fecha)) > (parseLocalDate(clientesMap[cliente].ultimaCompra) || new Date(clientesMap[cliente].ultimaCompra))) {
            clientesMap[cliente].ultimaCompra = factura.fecha;
          }
          if ((parseLocalDate(factura.fecha) || new Date(factura.fecha)) < (parseLocalDate(clientesMap[cliente].primeraCompra) || new Date(clientesMap[cliente].primeraCompra))) {
            clientesMap[cliente].primeraCompra = factura.fecha;
          }
        }
      });
    });

    // Convertir a array y ordenar por cantidad total
    const reporteArray = Object.values(clientesMap).sort((a, b) => 
      b.cantidadTotal - a.cantidadTotal
    );

    setReporteClientes(reporteArray);

    // Calcular estadísticas generales
    const stats = {
      totalClientes: reporteArray.length,
      cantidadTotalVendida: reporteArray.reduce((sum, c) => sum + c.cantidadTotal, 0),
      ingresoTotal: reporteArray.reduce((sum, c) => sum + c.totalVentas, 0),
      promedioUnidadesCliente: reporteArray.length > 0 
        ? (reporteArray.reduce((sum, c) => sum + c.cantidadTotal, 0) / reporteArray.length).toFixed(2)
        : 0,
      promedioIngresoCliente: reporteArray.length > 0
        ? (reporteArray.reduce((sum, c) => sum + c.totalVentas, 0) / reporteArray.length).toFixed(2)
        : 0
    };

    setEstadisticas(stats);
  };

  const handleSeleccionarProducto = (producto) => {
    setProductoSeleccionado(producto);
    setBusquedaProducto('');
  };

  const limpiarSeleccion = () => {
    setProductoSeleccionado(null);
    setReporteClientes([]);
    setEstadisticas(null);
    setBusquedaProducto('');
  };

 const productosFiltrados = productos.filter(p => {
  // Filtro de búsqueda
  const coincideBusqueda = p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase()) ||
    (p.codigo && p.codigo.toLowerCase().includes(busquedaProducto.toLowerCase()));
  
  if (!coincideBusqueda) return false;
  
  // Filtro por estado
  if (filtroEstado === 'activos') return p.activo === true;
  if (filtroEstado === 'inactivos') return p.activo === false;
  if (filtroEstado === 'sinstock') return p.stock === 0 || p.stock === null;
  
  return true; // 'todos'
});

  const formatPrecio = (precio) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(precio || 0);
  };

  const formatFecha = (fecha) => {
    const localDate = parseLocalDate(fecha) || new Date(fecha);
    return localDate.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const exportarCSV = () => {
    if (reporteClientes.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const headers = ['Cliente', 'Vendedor', 'Cantidad Total', 'Total Ventas', 'N° Compras', 'Primera Compra', 'Última Compra'];
    const rows = reporteClientes.map(c => [
      c.cliente,
      c.vendedor,
      c.cantidadTotal,
      c.totalVentas,
      c.numeroCompras,
      formatFecha(c.primeraCompra),
      formatFecha(c.ultimaCompra)
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
      csv += row.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reporte_clientes_${productoSeleccionado.nombre.replace(/\s+/g, '_')}_${toLocalDateKey()}.csv`;
    link.click();
  };

  const exportarExcel = () => {
    if (reporteClientes.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const headers = ['Cliente', 'Vendedor', 'Cantidad Total', 'Total Ventas', 'N° Compras', 'Primera Compra', 'Última Compra'];
    const rows = reporteClientes.map(c => [
      c.cliente,
      c.vendedor,
      c.cantidadTotal,
      c.totalVentas,
      c.numeroCompras,
      formatFecha(c.primeraCompra),
      formatFecha(c.ultimaCompra)
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
    
    // Ajustar ancho de columnas
    ws['!cols'] = [
      { wch: 20 }, // Cliente
      { wch: 15 }, // Vendedor
      { wch: 15 }, // Cantidad Total
      { wch: 15 }, // Total Ventas
      { wch: 12 }, // N° Compras
      { wch: 15 }, // Primera Compra
      { wch: 15 }  // Última Compra
    ];

    const fileName = `reporte_clientes_${productoSeleccionado.nombre.replace(/\s+/g, '_')}_${toLocalDateKey()}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  if (cargando) {
    return (
      <div className="reporte-clientes-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reporte-clientes-container">
      <header className="reporte-header">
        <h1>
          <i className="fas fa-users"></i> Reporte de Clientes por Producto
        </h1>
        <p className="reporte-subtitle">
          Analiza qué clientes compraron cada producto
        </p>
      </header>

      {/* Selector de producto */}
      <div className="selector-producto-section">
        <h2>1. Selecciona un Producto</h2>
        
        {!productoSeleccionado ? (
          <div className="buscador-producto">
            <div className="search-box">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="Buscar producto por nombre o código..."
                value={busquedaProducto}
                onChange={(e) => setBusquedaProducto(e.target.value)}
                autoFocus
              />
              {busquedaProducto && (
                <button 
                  className="clear-btn"
                  onClick={() => setBusquedaProducto('')}
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>

            {/* Filtros de estado */}
            <div className="filtro-estado-productos">
              <button
                className={`filtro-btn ${filtroEstado === 'todos' ? 'active' : ''}`}
                onClick={() => setFiltroEstado('todos')}
              >
                <i className="fas fa-list"></i>
                Todos ({productos.length})
              </button>
              <button
                className={`filtro-btn ${filtroEstado === 'activos' ? 'active' : ''}`}
                onClick={() => setFiltroEstado('activos')}
              >
                <i className="fas fa-check-circle"></i>
                Activos ({productos.filter(p => p.activo === true).length})
              </button>
              <button
                className={`filtro-btn ${filtroEstado === 'inactivos' ? 'active' : ''}`}
                onClick={() => setFiltroEstado('inactivos')}
              >
                <i className="fas fa-times-circle"></i>
                Inactivos ({productos.filter(p => p.activo === false).length})
              </button>
              <button
                className={`filtro-btn ${filtroEstado === 'sinstock' ? 'active' : ''}`}
                onClick={() => setFiltroEstado('sinstock')}
              >
                <i className="fas fa-exclamation-triangle"></i>
                Sin Stock ({productos.filter(p => p.stock === 0 || p.stock === null).length})
              </button>
            </div>




            <div className="productos-lista">
              {productosFiltrados.length === 0 ? (
                <div className="empty-state">
                  <i className="fas fa-box-open"></i>
                  <p>No se encontraron productos</p>
                </div>
              ) : (
                productosFiltrados.slice(0, 50).map(producto => (
                  <div
                    key={producto.id}
                    className="producto-item"
                    onClick={() => handleSeleccionarProducto(producto)}
                  >
                    <div className="producto-imagen">
                      <img 
                        src={producto.imagen_url || 'https://via.placeholder.com/60?text=Producto'} 
                        alt={producto.nombre}
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/60?text=Sin+Imagen';
                        }}
                      />
                    </div>
                    <div className="producto-info">
                      <h4>{producto.nombre}</h4>
                      {producto.codigo && <span className="producto-codigo">Ref: {producto.codigo}</span>}
                      {producto.categoria && <span className="producto-categoria">{producto.categoria}</span>}
                      <span className="producto-precio">{formatPrecio(producto.precio)}</span>
                    </div>
                    <i className="fas fa-chevron-right"></i>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="producto-seleccionado">
            <div className="producto-card">
              <img 
                src={productoSeleccionado.imagen_url || 'https://via.placeholder.com/100?text=Producto'} 
                alt={productoSeleccionado.nombre}
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/100?text=Sin+Imagen';
                }}
              />
              <div className="producto-detalles">
                <h3>{productoSeleccionado.nombre}</h3>
                {productoSeleccionado.codigo && (
                  <p className="codigo">Ref: {productoSeleccionado.codigo}</p>
                )}
                {productoSeleccionado.categoria && (
                  <span className="badge">{productoSeleccionado.categoria}</span>
                )}
                <p className="precio">{formatPrecio(productoSeleccionado.precio)}</p>
              </div>
              <button className="btn-cambiar" onClick={limpiarSeleccion}>
                <i className="fas fa-exchange-alt"></i> Cambiar Producto
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filtros de fecha */}
      {productoSeleccionado && (
        <div className="filtros-fecha-section">
          <h2>2. Filtrar por Fecha (Opcional)</h2>
          <div className="filtros-row">
            <div className="filtro-item">
              <label>Desde:</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>
            <div className="filtro-item">
              <label>Hasta:</label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>
            {(fechaInicio || fechaFin) && (
              <button 
                className="btn-limpiar-filtros"
                onClick={() => {
                  setFechaInicio('');
                  setFechaFin('');
                }}
              >
                <i className="fas fa-times"></i> Limpiar Filtros
              </button>
            )}
          </div>
        </div>
      )}

      {/* Estadísticas */}
      {estadisticas && (
        <div className="estadisticas-section">
          <h2>3. Estadísticas Generales</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <i className="fas fa-users"></i>
              <div className="stat-content">
                <h3>{estadisticas.totalClientes}</h3>
                <p>Clientes Distintos</p>
              </div>
            </div>
            <div className="stat-card">
              <i className="fas fa-boxes"></i>
              <div className="stat-content">
                <h3>{estadisticas.cantidadTotalVendida}</h3>
                <p>Unidades Vendidas</p>
              </div>
            </div>
            <div className="stat-card">
              <i className="fas fa-dollar-sign"></i>
              <div className="stat-content">
                <h3>{formatPrecio(estadisticas.ingresoTotal)}</h3>
                <p>Ingreso Total</p>
              </div>
            </div>
            <div className="stat-card">
              <i className="fas fa-chart-line"></i>
              <div className="stat-content">
                <h3>{estadisticas.promedioUnidadesCliente}</h3>
                <p>Prom. Unidades/Cliente</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de clientes */}
      {reporteClientes.length > 0 && (
        <div className="tabla-clientes-section">
          <div className="tabla-header">
            <h2>4. Clientes que Compraron este Producto</h2>
            <div className="export-buttons-group">
              <button className="btn-exportar btn-csv" onClick={exportarCSV}>
                <i className="fas fa-download"></i> Exportar CSV
              </button>
              <button className="btn-exportar btn-excel" onClick={exportarExcel}>
                <i className="fas fa-file-excel"></i> Exportar Excel
              </button>
            </div>
          </div>

          <div className="tabla-wrapper">
            <table className="tabla-clientes">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Cliente</th>
                  <th>Vendedor</th>
                  <th className="text-center">Cantidad Total</th>
                  <th className="text-right">Total Ventas</th>
                  <th className="text-center">N° Compras</th>
                  <th>Primera Compra</th>
                  <th>Última Compra</th>
                  <th className="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reporteClientes.map((cliente, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td className="cliente-nombre">
                      <i className="fas fa-user"></i> {cliente.cliente}
                    </td>
                    <td>{cliente.vendedor}</td>
                    <td className="text-center">
                      <span className="badge-cantidad">{cliente.cantidadTotal}</span>
                    </td>
                    <td className="text-right font-bold">
                      {formatPrecio(cliente.totalVentas)}
                    </td>
                    <td className="text-center">{cliente.numeroCompras}</td>
                    <td>{formatFecha(cliente.primeraCompra)}</td>
                    <td>{formatFecha(cliente.ultimaCompra)}</td>
                    <td className="text-center">
                      <button 
                        className="btn-ver-detalle"
                        onClick={() => {
                          // Mostrar modal con detalles de facturas (implementar si necesario)
                          alert(`Detalles de ${cliente.cliente}:\n\nFacturas: ${cliente.facturas.length}\nTotal: ${formatPrecio(cliente.totalVentas)}`);
                        }}
                      >
                        <i className="fas fa-eye"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Estado vacío */}
      {productoSeleccionado && reporteClientes.length === 0 && (
        <div className="empty-state-reporte">
          <i className="fas fa-inbox"></i>
          <h3>No hay clientes que compraron este producto</h3>
          <p>Intenta cambiar el rango de fechas o seleccionar otro producto</p>
        </div>
      )}
    </div>
  );
};

export default ReporteClientesPorProducto;
