import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import './HistorialInventario.css';

export default function HistorialInventario() {
  const [movimientos, setMovimientos] = useState([]);
  const [movimientosFiltrados, setMovimientosFiltrados] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  
  // Estados para búsqueda
  const [busqueda, setBusqueda] = useState({
    producto: '',
    fechaInicio: '',
    fechaFin: '',
    cantidadMin: '',
    cantidadMax: '',
    motivo: ''
  });

  useEffect(() => {
    cargarProductos();
  }, []);

  useEffect(() => {
    cargarMovimientos();
  }, [filtroTipo]);

  useEffect(() => {
    filtrarMovimientos();
  }, [movimientos, busqueda]);

  const cargarProductos = async () => {
    const { data, error } = await supabase
      .from('productos')
      .select('id, nombre');

    if (!error) {
      setProductos(data || []);
    }
  };

  const cargarMovimientos = async () => {
    setLoading(true);
    let query = supabase
      .from('movimientos_inventario')
      .select('*')
      .order('created_at', { ascending: false });

    if (filtroTipo !== 'todos') {
      query = query.eq('tipo', filtroTipo);
    }

    const { data, error } = await query;

    if (!error) {
      setMovimientos(data || []);
      setMovimientosFiltrados(data || []);
    }
    setLoading(false);
  };

  const obtenerNombreProducto = (productoId) => {
    const producto = productos.find(p => p.id === productoId);
    return producto ? producto.nombre : `ID ${productoId}`;
  };

  const filtrarMovimientos = () => {
    let resultados = [...movimientos];

    // Filtrar por producto
    if (busqueda.producto) {
      resultados = resultados.filter(mov => 
        obtenerNombreProducto(mov.producto_id).toLowerCase().includes(busqueda.producto.toLowerCase())
      );
    }

    // Filtrar por fecha
    if (busqueda.fechaInicio) {
      const fechaInicio = new Date(busqueda.fechaInicio);
      resultados = resultados.filter(mov => 
        new Date(mov.created_at) >= fechaInicio
      );
    }

    if (busqueda.fechaFin) {
      const fechaFin = new Date(busqueda.fechaFin);
      fechaFin.setHours(23, 59, 59, 999); // Hasta el final del día
      resultados = resultados.filter(mov => 
        new Date(mov.created_at) <= fechaFin
      );
    }

    // Filtrar por cantidad mínima
    if (busqueda.cantidadMin) {
      resultados = resultados.filter(mov => 
        mov.cantidad >= parseInt(busqueda.cantidadMin)
      );
    }

    // Filtrar por cantidad máxima
    if (busqueda.cantidadMax) {
      resultados = resultados.filter(mov => 
        mov.cantidad <= parseInt(busqueda.cantidadMax)
      );
    }

    // Filtrar por motivo
    if (busqueda.motivo) {
      resultados = resultados.filter(mov => 
        mov.motivo.toLowerCase().includes(busqueda.motivo.toLowerCase())
      );
    }

    setMovimientosFiltrados(resultados);
  };

  const handleBusquedaChange = (field, value) => {
    setBusqueda(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const limpiarFiltros = () => {
    setBusqueda({
      producto: '',
      fechaInicio: '',
      fechaFin: '',
      cantidadMin: '',
      cantidadMax: '',
      motivo: ''
    });
    setMovimientosFiltrados(movimientos);
  };

  const exportarCSV = () => {
const headers = ['Producto', 'Tipo', 'Cantidad', 'Motivo', 'Referencia', 'Fecha'];
      const csvContent = [
        headers.join(','),
        ...movimientosFiltrados.map(mov => [
          `"${obtenerNombreProducto(mov.producto_id)}"`,
          mov.tipo,
          mov.cantidad,
          mov.motivo,
          `"${mov.referencia || ''}"`,
          new Date(mov.created_at).toLocaleDateString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historial_inventario_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="historial-container">
        <div className="loading-pulse">Cargando historial...</div>
      </div>
    );
  }

  return (
    <div className="historial-container">
      {/* Header */}
      <div className="historial-header">
        <h1 className="historial-title">HISTORIAL DE MOVIMIENTOS</h1>
      </div>

      <div className="historial-content">
        {/* Filtros principales */}
        <div className="filtros-container">
          <div className="filtros-group">
            <span className="filtro-label">Filtrar por tipo:</span>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="filtro-select"
            >
              <option value="todos">Todos los movimientos</option>
              <option value="entrada">Solo entradas</option>
              <option value="salida">Solo salidas</option>
            </select>
          </div>

          <div className="acciones-group">
            <button onClick={limpiarFiltros} className="btn-secundario">
              Limpiar Filtros
            </button>
            <button onClick={exportarCSV} className="btn-primario">
              Exportar CSV
            </button>
          </div>
        </div>

        {/* Búsqueda avanzada */}
        <div className="busqueda-avanzada">
          <h3 className="busqueda-titulo">Búsqueda Avanzada</h3>
          
          <div className="busqueda-grid">
            {/* Búsqueda por producto */}
            <div className="busqueda-group">
              <label className="busqueda-label">Producto:</label>
              <input
                type="text"
                placeholder="Buscar por nombre de producto..."
                value={busqueda.producto}
                onChange={(e) => handleBusquedaChange('producto', e.target.value)}
                className="busqueda-input"
              />
            </div>

            {/* Búsqueda por fechas */}
            <div className="busqueda-group">
              <label className="busqueda-label">Fecha desde:</label>
              <input
                type="date"
                value={busqueda.fechaInicio}
                onChange={(e) => handleBusquedaChange('fechaInicio', e.target.value)}
                className="busqueda-input"
              />
            </div>

            <div className="busqueda-group">
              <label className="busqueda-label">Fecha hasta:</label>
              <input
                type="date"
                value={busqueda.fechaFin}
                onChange={(e) => handleBusquedaChange('fechaFin', e.target.value)}
                className="busqueda-input"
              />
            </div>

            {/* Búsqueda por cantidades */}
            <div className="busqueda-group">
              <label className="busqueda-label">Cantidad mínima:</label>
              <input
                type="number"
                min="0"
                placeholder="Mínimo"
                value={busqueda.cantidadMin}
                onChange={(e) => handleBusquedaChange('cantidadMin', e.target.value)}
                className="busqueda-input"
              />
            </div>

            <div className="busqueda-group">
              <label className="busqueda-label">Cantidad máxima:</label>
              <input
                type="number"
                min="0"
                placeholder="Máximo"
                value={busqueda.cantidadMax}
                onChange={(e) => handleBusquedaChange('cantidadMax', e.target.value)}
                className="busqueda-input"
              />
            </div>

            {/* Búsqueda por motivo */}
            <div className="busqueda-group">
              <label className="busqueda-label">Motivo:</label>
              <input
                type="text"
                placeholder="Buscar por motivo..."
                value={busqueda.motivo}
                onChange={(e) => handleBusquedaChange('motivo', e.target.value)}
                className="busqueda-input"
              />
            </div>
          </div>
        </div>

        {/* Contador de resultados */}
        <div className="resultados-info">
          <span className="resultados-contador">
            {movimientosFiltrados.length} movimiento(s) encontrado(s)
          </span>
          {movimientosFiltrados.length !== movimientos.length && (
            <span className="resultados-total">
              (de {movimientos.length} totales)
            </span>
          )}
        </div>

        {/* Tabla */}
        <div className="tabla-container">
          <table className="historial-table">
            <thead>
              <tr>
                <th className="table-header">Producto</th>
                <th className="table-header">Tipo</th>
                <th className="table-header">Cantidad</th>
                <th className="table-header">Motivo</th>
                <th className="table-header">Observaciones</th>
                <th className="table-header">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {movimientosFiltrados.map((mov) => (
                <tr key={mov.id} className="table-row">
                  <td className="table-cell">{obtenerNombreProducto(mov.producto_id)}</td>
                  <td className="table-cell">
                    <span className={`badge ${mov.tipo === 'entrada' ? 'badge-entrada' : 'badge-salida'}`}>
                      {mov.tipo}
                    </span>
                  </td>
                  <td className="table-cell">{mov.cantidad}</td>
                  <td className="table-cell">{mov.motivo}</td>
                  <td className="table-cell observaciones-cell">
                    {mov.referencia || '-'}
                  </td>
                  <td className="table-cell">
                    {new Date(mov.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {movimientosFiltrados.length === 0 && (
          <div className="empty-state">
            {movimientos.length === 0 
              ? 'No hay movimientos registrados aún' 
              : 'No se encontraron movimientos con los filtros aplicados'
            }
          </div>
        )}
      </div>
    </div>
  );
}