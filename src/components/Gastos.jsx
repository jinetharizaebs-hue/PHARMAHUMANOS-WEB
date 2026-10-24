import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import './Gastos.css';
import { supabase } from '../lib/supabase';
import { CATEGORIAS_GASTO, METODOS_PAGO, normalizarCategoria, etiquetaCategoria, etiquetaMetodoPago } from '../lib/gastosCatalogos';
import { useEmpleados } from '../hooks/useEmpleados';
import GestionEmpleados from './GestionEmpleados';

// Pantalla única de gastos (reemplaza Gestión de Gastos, Gastos de Empresa y Gastos Fácil).
// Todo se guarda en la tabla gastos_empresa.

const GASTOS_POR_PAGINA = 20;

const hoy = () => new Date().toLocaleDateString('en-CA'); // AAAA-MM-DD en hora local
const mesActual = () => hoy().slice(0, 7);

const mesAnterior = (mes) => {
  const [anio, m] = mes.split('-').map(Number);
  const fecha = new Date(anio, m - 2, 1);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
};

const nombreMes = (mes) => {
  const [anio, m] = mes.split('-').map(Number);
  const texto = new Date(anio, m - 1, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

const formatCurrency = (num) => new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0
}).format(num || 0);

const formatDate = (fecha) => new Date(`${fecha}T00:00:00`).toLocaleDateString('es-CO');

const sumar = (lista) => lista.reduce((sum, g) => sum + g.monto, 0);

// Agrupa y ordena de mayor a menor: [{ clave, total, cantidad }]
const agruparPor = (lista, obtenerClave) => {
  const grupos = lista.reduce((acc, g) => {
    const clave = obtenerClave(g) || 'Sin dato';
    acc[clave] = acc[clave] || { clave, total: 0, cantidad: 0 };
    acc[clave].total += g.monto;
    acc[clave].cantidad += 1;
    return acc;
  }, {});
  return Object.values(grupos).sort((a, b) => b.total - a.total);
};

const Gastos = () => {
  const { empleados: listaEmpleados, nombresActivos, tablaDisponible, agregarEmpleado, cambiarActivo } = useEmpleados();

  const [vista, setVista] = useState('resumen'); // resumen, historial, formulario, empleados
  const [gastos, setGastos] = useState([]);
  const [deudaProveedores, setDeudaProveedores] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [errorCarga, setErrorCarga] = useState('');
  const [mes, setMes] = useState(mesActual());

  // Historial
  const [verTodosLosMeses, setVerTodosLosMeses] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState('todos');
  const [filtroEmpleado, setFiltroEmpleado] = useState('todos');
  const [filtroMetodo, setFiltroMetodo] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);

  // Formulario
  const crearFormularioInicial = () => ({
    fecha: hoy(),
    categoria: 'Servicios',
    empleado: nombresActivos[0] || 'Otro',
    descripcion: '',
    monto: '',
    metodo_pago: 'transferencia',
    referencia: '',
    notas: ''
  });
  const [formGasto, setFormGasto] = useState(crearFormularioInicial);
  const [gastoEditando, setGastoEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      setErrorCarga('');

      const [gastosResp, facturasResp] = await Promise.all([
        supabase.from('gastos_empresa').select('*').order('fecha', { ascending: false }),
        supabase.from('facturas_proveedores').select('saldo').gt('saldo', 0)
      ]);

      if (gastosResp.error) throw gastosResp.error;

      setGastos((gastosResp.data || []).map(g => ({
        ...g,
        fecha: String(g.fecha || '').slice(0, 10),
        categoria: normalizarCategoria(g.categoria),
        empleado: g.empleado || 'Otro',
        monto: Number(g.monto) || 0
      })));

      // La deuda con proveedores es informativa: si falla, no bloquea la pantalla
      setDeudaProveedores(facturasResp.error
        ? null
        : (facturasResp.data || []).reduce((sum, f) => sum + (Number(f.saldo) || 0), 0));
    } catch (error) {
      console.error('Error al cargar gastos:', error);
      setErrorCarga('No fue posible cargar los gastos. Verifica la conexión e intenta de nuevo.');
      setGastos([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // ========================
  // CÁLCULOS
  // ========================
  const gastosDelMes = gastos.filter(g => g.fecha.startsWith(mes));
  const gastosMesAnterior = gastos.filter(g => g.fecha.startsWith(mesAnterior(mes)));
  const totalMes = sumar(gastosDelMes);
  const totalMesAnterior = sumar(gastosMesAnterior);
  const variacion = totalMesAnterior > 0 ? ((totalMes - totalMesAnterior) / totalMesAnterior) * 100 : null;
  const totalNomina = sumar(gastosDelMes.filter(g => g.categoria === 'Nómina'));

  const porCategoria = agruparPor(gastosDelMes, g => g.categoria);
  const porMetodo = agruparPor(gastosDelMes, g => g.metodo_pago);
  const porEmpleado = agruparPor(gastosDelMes, g => g.empleado);

  const empleadosConGastos = [...new Set([
    ...listaEmpleados.map(e => e.nombre),
    'Otro',
    ...gastos.map(g => g.empleado)
  ])];

  const gastosHistorial = gastos.filter(g => {
    if (!verTodosLosMeses && !g.fecha.startsWith(mes)) return false;
    if (filtroCategoria !== 'todos' && g.categoria !== filtroCategoria) return false;
    if (filtroEmpleado !== 'todos' && g.empleado !== filtroEmpleado) return false;
    if (filtroMetodo !== 'todos' && g.metodo_pago !== filtroMetodo) return false;
    if (busqueda) {
      const texto = busqueda.toLowerCase();
      const coincide = [g.descripcion, g.referencia, g.notas]
        .some(campo => String(campo || '').toLowerCase().includes(texto));
      if (!coincide) return false;
    }
    return true;
  });
  const totalPaginas = Math.max(1, Math.ceil(gastosHistorial.length / GASTOS_POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const gastosPagina = gastosHistorial.slice((paginaSegura - 1) * GASTOS_POR_PAGINA, paginaSegura * GASTOS_POR_PAGINA);

  // ========================
  // ACCIONES
  // ========================
  const abrirFormulario = (gasto = null) => {
    if (gasto) {
      setGastoEditando(gasto);
      setFormGasto({
        fecha: gasto.fecha,
        categoria: gasto.categoria,
        empleado: gasto.empleado,
        descripcion: gasto.descripcion || '',
        monto: String(gasto.monto),
        metodo_pago: gasto.metodo_pago || 'transferencia',
        referencia: gasto.referencia || '',
        notas: gasto.notas || ''
      });
    } else {
      setGastoEditando(null);
      setFormGasto(crearFormularioInicial());
    }
    setVista('formulario');
  };

  const cerrarFormulario = () => {
    setGastoEditando(null);
    setFormGasto(crearFormularioInicial());
    setVista('historial');
  };

  const guardarGasto = async (e) => {
    e.preventDefault();

    const monto = Number(formGasto.monto);
    if (!formGasto.fecha || !formGasto.descripcion.trim()) {
      alert('Completa la fecha y la descripción.');
      return;
    }
    if (!Number.isFinite(monto) || monto <= 0) {
      alert('El monto debe ser mayor a 0.');
      return;
    }

    const datosGasto = {
      fecha: formGasto.fecha,
      categoria: formGasto.categoria,
      empleado: formGasto.empleado || 'Otro',
      descripcion: formGasto.descripcion.trim(),
      monto,
      metodo_pago: formGasto.metodo_pago,
      referencia: formGasto.referencia.trim() || null,
      notas: formGasto.notas.trim() || null
    };

    setGuardando(true);
    try {
      const { error } = gastoEditando
        ? await supabase.from('gastos_empresa').update(datosGasto).eq('id', gastoEditando.id)
        : await supabase.from('gastos_empresa').insert([datosGasto]);

      if (error) throw error;

      await cargarDatos();
      // Mostrar el mes del gasto guardado para que se vea en la lista
      setMes(datosGasto.fecha.slice(0, 7));
      cerrarFormulario();
      alert(gastoEditando ? 'Gasto actualizado' : 'Gasto registrado');
    } catch (error) {
      console.error('Error al guardar gasto:', error);
      alert('No se pudo guardar el gasto: ' + error.message);
    } finally {
      setGuardando(false);
    }
  };

  const eliminarGasto = async (gasto) => {
    if (!window.confirm(`¿Eliminar el gasto "${gasto.descripcion}" por ${formatCurrency(gasto.monto)}?`)) return;

    try {
      const { error } = await supabase.from('gastos_empresa').delete().eq('id', gasto.id);
      if (error) throw error;
      await cargarDatos();
    } catch (error) {
      console.error('Error al eliminar gasto:', error);
      alert('No se pudo eliminar el gasto: ' + error.message);
    }
  };

  const exportarExcel = () => {
    const filas = gastosHistorial.map(g => ({
      Fecha: g.fecha,
      Categoría: g.categoria,
      Empleado: g.empleado,
      Descripción: g.descripcion,
      Monto: g.monto,
      'Método de pago': etiquetaMetodoPago(g.metodo_pago),
      Referencia: g.referencia || '',
      Notas: g.notas || ''
    }));
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(filas), 'Gastos');
    XLSX.writeFile(libro, `gastos_${verTodosLosMeses ? 'todos' : mes}.xlsx`);
  };

  const limpiarFiltros = () => {
    setFiltroCategoria('todos');
    setFiltroEmpleado('todos');
    setFiltroMetodo('todos');
    setBusqueda('');
    setPagina(1);
  };

  // ========================
  // RENDER
  // ========================
  const listaBarras = (grupos, obtenerEtiqueta = (clave) => clave) => (
    grupos.length === 0 ? (
      <p className="ge-vacio">Sin gastos en {nombreMes(mes)}.</p>
    ) : (
      <div className="reporte-list">
        {grupos.map(({ clave, total, cantidad }) => (
          <div key={clave} className="reporte-item">
            <div className="reporte-label">{obtenerEtiqueta(clave)}</div>
            <div className="reporte-barra">
              <div className="barra" style={{ width: `${(total / grupos[0].total) * 100}%` }}></div>
            </div>
            <div className="reporte-datos">
              <span>{formatCurrency(total)}</span>
              <span>({cantidad})</span>
            </div>
          </div>
        ))}
      </div>
    )
  );

  const opcionesEmpleado = nombresActivos.includes(formGasto.empleado)
    ? nombresActivos
    : [formGasto.empleado, ...nombresActivos].filter(Boolean);

  return (
    <div className="ge-container">
      <div className="ge-header">
        <h1>💰 Gastos</h1>
        <div className="ge-header-acciones">
          <label className="ge-mes">
            Mes
            <input type="month" value={mes} onChange={(e) => { setMes(e.target.value || mesActual()); setPagina(1); }} />
          </label>
          <button className="btn-nuevo" onClick={() => abrirFormulario()}>➕ Nuevo Gasto</button>
        </div>
      </div>

      {errorCarga && <div className="setup-notice">{errorCarga}</div>}

      <div className="ge-nav">
        {[
          ['resumen', '📊 Resumen'],
          ['historial', '📜 Historial'],
          ['empleados', '👥 Empleados']
        ].map(([clave, etiqueta]) => (
          <button
            key={clave}
            className={`nav-btn ${vista === clave ? 'active' : ''}`}
            onClick={() => setVista(clave)}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      {cargando && <p className="text-center">⏳ Cargando...</p>}

      {/* RESUMEN */}
      {vista === 'resumen' && !cargando && (
        <>
          <div className="ge-resumen-grid">
            <div className="resumen-card">
              <div className="resumen-icon">💸</div>
              <div className="resumen-content">
                <h3>Total {nombreMes(mes)}</h3>
                <div className="resumen-valor">{formatCurrency(totalMes)}</div>
                {variacion !== null && (
                  <div className={`ge-variacion ${variacion > 0 ? 'sube' : 'baja'}`}>
                    {variacion > 0 ? '▲' : '▼'} {Math.abs(variacion).toFixed(0)}% vs. mes anterior
                  </div>
                )}
              </div>
            </div>

            <div className="resumen-card">
              <div className="resumen-icon">👥</div>
              <div className="resumen-content">
                <h3>Nómina del mes</h3>
                <div className="resumen-valor">{formatCurrency(totalNomina)}</div>
              </div>
            </div>

            <div className="resumen-card">
              <div className="resumen-icon">🧾</div>
              <div className="resumen-content">
                <h3>Gastos registrados</h3>
                <div className="resumen-valor">{gastosDelMes.length}</div>
              </div>
            </div>

            {deudaProveedores !== null && (
              <Link to="/cuentas-por-pagar" className="resumen-card ge-card-link">
                <div className="resumen-icon">🏦</div>
                <div className="resumen-content">
                  <h3>Pendiente con proveedores</h3>
                  <div className="resumen-valor">{formatCurrency(deudaProveedores)}</div>
                  <div className="ge-variacion">Ver Cuentas por Pagar →</div>
                </div>
              </Link>
            )}
          </div>

          <div className="reportes-grid">
            <div className="reporte-box">
              <h3>📂 Por categoría</h3>
              {listaBarras(porCategoria, etiquetaCategoria)}
            </div>
            <div className="reporte-box">
              <h3>💳 Por método de pago</h3>
              {listaBarras(porMetodo, etiquetaMetodoPago)}
            </div>
            <div className="reporte-box">
              <h3>👤 Por empleado</h3>
              {listaBarras(porEmpleado)}
            </div>
          </div>
        </>
      )}

      {/* HISTORIAL */}
      {vista === 'historial' && !cargando && (
        <>
          <div className="ge-filtros">
            <div className="filtro-grid">
              <div className="filtro-item">
                <label>Periodo</label>
                <select value={verTodosLosMeses ? 'todos' : 'mes'} onChange={(e) => { setVerTodosLosMeses(e.target.value === 'todos'); setPagina(1); }}>
                  <option value="mes">{nombreMes(mes)}</option>
                  <option value="todos">Todos los meses</option>
                </select>
              </div>
              <div className="filtro-item">
                <label>Categoría</label>
                <select value={filtroCategoria} onChange={(e) => { setFiltroCategoria(e.target.value); setPagina(1); }}>
                  <option value="todos">Todas</option>
                  {CATEGORIAS_GASTO.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                </select>
              </div>
              <div className="filtro-item">
                <label>Empleado</label>
                <select value={filtroEmpleado} onChange={(e) => { setFiltroEmpleado(e.target.value); setPagina(1); }}>
                  <option value="todos">Todos</option>
                  {empleadosConGastos.map(emp => <option key={emp} value={emp}>{emp}</option>)}
                </select>
              </div>
              <div className="filtro-item">
                <label>Método de pago</label>
                <select value={filtroMetodo} onChange={(e) => { setFiltroMetodo(e.target.value); setPagina(1); }}>
                  <option value="todos">Todos</option>
                  {METODOS_PAGO.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div className="filtro-item">
                <label>Buscar</label>
                <input
                  type="text"
                  placeholder="Descripción, referencia o notas"
                  value={busqueda}
                  onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
                />
              </div>
            </div>
            <div className="ge-filtros-acciones">
              <span><strong>{gastosHistorial.length}</strong> gastos · Total <strong>{formatCurrency(sumar(gastosHistorial))}</strong></span>
              <div>
                <button className="btn-limpiar" onClick={limpiarFiltros}>🔄 Limpiar filtros</button>
                <button className="btn-limpiar" onClick={exportarExcel} disabled={gastosHistorial.length === 0}>⬇️ Excel</button>
              </div>
            </div>
          </div>

          <div className="ge-tabla-wrapper">
            <table className="ge-tabla">
              <thead>
                <tr>
                  <th>📅 Fecha</th>
                  <th>📂 Categoría</th>
                  <th>👤 Empleado</th>
                  <th>📝 Descripción</th>
                  <th>💰 Monto</th>
                  <th>💳 Método</th>
                  <th>📌 Referencia</th>
                  <th>⚙️ Acciones</th>
                </tr>
              </thead>
              <tbody>
                {gastosPagina.length === 0 ? (
                  <tr><td colSpan="8" className="text-center">No hay gastos con estos filtros</td></tr>
                ) : (
                  gastosPagina.map(g => (
                    <tr key={g.id}>
                      <td>{formatDate(g.fecha)}</td>
                      <td><span className="categoria-badge">{etiquetaCategoria(g.categoria)}</span></td>
                      <td>{g.empleado}</td>
                      <td className="descripcion">{g.descripcion}</td>
                      <td className="monto">{formatCurrency(g.monto)}</td>
                      <td><span className="metodo-badge">{etiquetaMetodoPago(g.metodo_pago)}</span></td>
                      <td>{g.referencia || '-'}</td>
                      <td className="acciones">
                        <button className="btn-editar" onClick={() => abrirFormulario(g)} title="Editar">✏️</button>
                        <button className="btn-eliminar" onClick={() => eliminarGasto(g)} title="Eliminar">🗑️</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPaginas > 1 && (
            <div className="ge-paginacion">
              <button onClick={() => setPagina(paginaSegura - 1)} disabled={paginaSegura === 1}>← Anterior</button>
              <span>Página {paginaSegura} de {totalPaginas}</span>
              <button onClick={() => setPagina(paginaSegura + 1)} disabled={paginaSegura === totalPaginas}>Siguiente →</button>
            </div>
          )}
        </>
      )}

      {/* FORMULARIO */}
      {vista === 'formulario' && (
        <div className="ge-form-container">
          <h2>{gastoEditando ? '✏️ Editar gasto' : '➕ Nuevo gasto'}</h2>
          <form className="ge-form" onSubmit={guardarGasto}>
            <div className="form-grid">
              <div className="form-group">
                <label>Fecha *</label>
                <input type="date" value={formGasto.fecha} onChange={(e) => setFormGasto({ ...formGasto, fecha: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Monto *</label>
                <input type="number" min="0" step="100" placeholder="0" value={formGasto.monto} onChange={(e) => setFormGasto({ ...formGasto, monto: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Categoría</label>
                <select value={formGasto.categoria} onChange={(e) => setFormGasto({ ...formGasto, categoria: e.target.value })}>
                  {CATEGORIAS_GASTO.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Método de pago</label>
                <select value={formGasto.metodo_pago} onChange={(e) => setFormGasto({ ...formGasto, metodo_pago: e.target.value })}>
                  {METODOS_PAGO.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Empleado</label>
                <select value={formGasto.empleado} onChange={(e) => setFormGasto({ ...formGasto, empleado: e.target.value })}>
                  {opcionesEmpleado.map(emp => <option key={emp} value={emp}>{emp}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Referencia</label>
                <input type="text" placeholder="N° comprobante, factura..." value={formGasto.referencia} onChange={(e) => setFormGasto({ ...formGasto, referencia: e.target.value })} />
              </div>
              <div className="form-group full-width">
                <label>Descripción *</label>
                <input type="text" placeholder="¿En qué se gastó?" value={formGasto.descripcion} onChange={(e) => setFormGasto({ ...formGasto, descripcion: e.target.value })} required />
              </div>
              <div className="form-group full-width">
                <label>Notas</label>
                <textarea rows="2" value={formGasto.notas} onChange={(e) => setFormGasto({ ...formGasto, notas: e.target.value })} />
              </div>
            </div>
            <div className="form-buttons">
              <button type="submit" className="btn-guardar" disabled={guardando}>
                {guardando ? 'Guardando...' : (gastoEditando ? '💾 Actualizar' : '💾 Guardar')}
              </button>
              <button type="button" className="btn-cancelar" onClick={cerrarFormulario}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* EMPLEADOS */}
      {vista === 'empleados' && (
        <GestionEmpleados
          empleados={listaEmpleados}
          tablaDisponible={tablaDisponible}
          agregarEmpleado={agregarEmpleado}
          cambiarActivo={cambiarActivo}
        />
      )}
    </div>
  );
};

export default Gastos;
