import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import './ContabilidadScreen.css';

const ContabilidadScreen = () => {
  const [fechaCorte, setFechaCorte] = useState('2025-10-30');
  const [clienteSeleccionado, setClienteSeleccionado] = useState('todos');
  const [tipoReporte, setTipoReporte] = useState('cartera');
  const [datosContabilidad, setDatosContabilidad] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [vistaActiva, setVistaActiva] = useState('cartera');
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth());
  const [anioSeleccionado, setAnioSeleccionado] = useState(new Date().getFullYear());
  
  // Estados para el formulario de nuevo registro
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nuevoRegistro, setNuevoRegistro] = useState({
    distribuidora: '',
    cliente: '',
    nit: '',
    refDoc: '',
    clase: 'Factura',
    fechaBase: '',
    fechaPago: '',
    importe: '',
    descuento: '',
    basePP: ''
  });
  const [editandoRegistro, setEditandoRegistro] = useState(null);
  const [errorConexion, setErrorConexion] = useState(null);

  const formatearFecha = (fechaISO) => {
    if (!fechaISO) return '';
    const partes = fechaISO.split('-');
    if (partes.length !== 3) return fechaISO;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  };

  const calcularDemoraDesdeHoy = (fechaVencimiento) => {
    if (!fechaVencimiento) return null;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const venc = new Date(fechaVencimiento + 'T00:00:00');
    const diffMs = venc.getTime() - hoy.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  const calcularEficiencia = (facturas) => {
    if (!facturas.length) return 0;
    const totalPagado = facturas.reduce((s, f) => s + (parseFloat(f.pagado) || 0), 0);
    const totalGeneral = facturas.reduce((s, f) => s + (parseFloat(f.total) || 0), 0);
    if (!totalGeneral) return 0;
    return Math.round((totalPagado / totalGeneral) * 1000) / 10;
  };

  const cargarDatos = async () => {
    setCargando(true);
    setErrorConexion(null);
    try {
      const { data: facturas, error } = await supabase
        .from('facturas_proveedores')
        .select('*, proveedores(id, nombre, nit)')
        .order('fecha_vencimiento', { ascending: true });

      if (error) throw error;

      const mapaProveedores = {};
      (facturas || []).forEach(f => {
        const prov = f.proveedores;
        if (!prov) return;
        const nit = prov.nit;
        if (!mapaProveedores[nit]) {
          mapaProveedores[nit] = {
            id: prov.id,
            distribuidora: prov.nombre,
            cliente: prov.nombre,
            nit,
            documentos: [],
            total: 0
          };
        }
        const demora = calcularDemoraDesdeHoy(f.fecha_vencimiento);
        const aPagar = parseFloat(f.saldo) || 0;
        mapaProveedores[nit].documentos.push({
          id: f.id,
          refDoc: f.numero_factura,
          clase: f.clase,
          fechaBase: formatearFecha(f.fecha_emision),
          fechaPago: formatearFecha(f.fecha_vencimiento),
          demora,
          importe: parseFloat(f.total) || 0,
          basePP: parseFloat(f.subtotal) || 0,
          descuento: parseFloat(f.retencion) || 0,
          aPagar,
          estado: f.estado
        });
        mapaProveedores[nit].total += aPagar;
      });

      const reporteCartera = Object.values(mapaProveedores);
      const clientes = [
        { id: 'todos', nombre: 'Todos los clientes' },
        ...reporteCartera.map(c => ({ id: c.nit, nombre: c.distribuidora }))
      ];

      setDatosContabilidad({
        reporteCartera,
        clientes,
        metricasDashboard: { eficienciaCobro: calcularEficiencia(facturas || []) }
      });
    } catch (err) {
      setErrorConexion('Error al cargar datos: ' + err.message);
      setDatosContabilidad({
        reporteCartera: [],
        clientes: [{ id: 'todos', nombre: 'Todos los clientes' }],
        metricasDashboard: { eficienciaCobro: 0 }
      });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Funciones para manejar el formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNuevoRegistro(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const calcularAPagar = () => {
    const importe = parseFloat(nuevoRegistro.importe) || 0;
    const descuento = parseFloat(nuevoRegistro.descuento) || 0;
    return importe - descuento;
  };

  const calcularDemora = (fechaBase, fechaPago) => {
    if (!fechaBase || !fechaPago) return 0;
    
    try {
      const [diaBase, mesBase, anioBase] = fechaBase.split('/');
      const [diaPago, mesPago, anioPago] = fechaPago.split('/');
      
      const base = new Date(anioBase, mesBase - 1, diaBase);
      const pago = new Date(anioPago, mesPago - 1, diaPago);
      const hoy = new Date();
      
      const diffTime = pago.getTime() - hoy.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays;
    } catch (error) {
      return 0;
    }
  };

  const validarCamposObligatorios = () => {
    const { distribuidora, cliente, nit, refDoc } = nuevoRegistro;
    return distribuidora.trim() && cliente.trim() && nit.trim() && refDoc.trim();
  };

  const agregarNuevoRegistro = async () => {
    if (!validarCamposObligatorios()) {
      alert('Por favor complete los campos obligatorios: Distribuidora, Cliente, NIT y REF DOC');
      return;
    }

    try {
      // Buscar o crear proveedor por NIT
      let proveedorId;
      const { data: provExistente } = await supabase
        .from('proveedores')
        .select('id')
        .eq('nit', nuevoRegistro.nit)
        .maybeSingle();

      if (provExistente) {
        proveedorId = provExistente.id;
      } else {
        const { data: nuevoProv, error: errProv } = await supabase
          .from('proveedores')
          .insert({ nombre: nuevoRegistro.distribuidora, nit: nuevoRegistro.nit })
          .select('id')
          .single();
        if (errProv) throw errProv;
        proveedorId = nuevoProv.id;
      }

      const importe = parseFloat(nuevoRegistro.importe) || 0;
      const descuento = parseFloat(nuevoRegistro.descuento) || 0;
      const aPagar = importe - descuento;

      const { error: errFact } = await supabase
        .from('facturas_proveedores')
        .insert({
          proveedor_id: proveedorId,
          numero_factura: nuevoRegistro.refDoc,
          fecha_emision: nuevoRegistro.fechaBase || null,
          fecha_vencimiento: nuevoRegistro.fechaPago || null,
          clase: nuevoRegistro.clase,
          subtotal: parseFloat(nuevoRegistro.basePP) || importe,
          iva: 0,
          retencion: descuento,
          total: importe,
          pagado: 0,
          saldo: aPagar,
          estado: aPagar > 0 ? 'pendiente' : 'pagada'
        });
      if (errFact) throw errFact;

      await cargarDatos();
      limpiarFormulario();
      alert('Registro guardado exitosamente!');
    } catch (err) {
      alert('Error al guardar: ' + err.message);
    }
  };

  const editarRegistro = (documento, cliente) => {
    setEditandoRegistro({ documento, cliente });
    setNuevoRegistro({
      distribuidora: cliente.distribuidora,
      cliente: cliente.cliente,
      nit: cliente.nit,
      refDoc: documento.refDoc,
      clase: documento.clase,
      fechaBase: convertirFechaParaInput(documento.fechaBase),
      fechaPago: convertirFechaParaInput(documento.fechaPago),
      importe: documento.importe.toString(),
      descuento: documento.descuento.toString(),
      basePP: documento.basePP ? documento.basePP.toString() : ''
    });
    setMostrarFormulario(true);
  };

  const actualizarRegistro = async () => {
    if (!editandoRegistro || !datosContabilidad) return;

    try {
      const importe = parseFloat(nuevoRegistro.importe) || 0;
      const descuento = parseFloat(nuevoRegistro.descuento) || 0;
      const aPagar = importe - descuento;

      const { error } = await supabase
        .from('facturas_proveedores')
        .update({
          numero_factura: nuevoRegistro.refDoc,
          fecha_emision: nuevoRegistro.fechaBase || null,
          fecha_vencimiento: nuevoRegistro.fechaPago || null,
          clase: nuevoRegistro.clase,
          subtotal: parseFloat(nuevoRegistro.basePP) || importe,
          retencion: descuento,
          total: importe,
          saldo: aPagar,
          estado: aPagar > 0 ? 'pendiente' : 'pagada'
        })
        .eq('id', editandoRegistro.documento.id);

      if (error) throw error;

      await cargarDatos();
      limpiarFormulario();
      alert('Registro actualizado exitosamente!');
    } catch (err) {
      alert('Error al actualizar: ' + err.message);
    }
  };

  const eliminarRegistro = async (documentoId, clienteNit) => {
    if (!window.confirm('¿Está seguro de que desea eliminar este documento?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('facturas_proveedores')
        .delete()
        .eq('id', documentoId);

      if (error) throw error;
      await cargarDatos();
    } catch (err) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  const convertirFechaParaInput = (fechaString) => {
    if (!fechaString) return '';
    const partes = fechaString.split('/');
    if (partes.length === 3) {
      return `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
    }
    return '';
  };

  const limpiarFormulario = () => {
    setNuevoRegistro({
      distribuidora: '',
      cliente: '',
      nit: '',
      refDoc: '',
      clase: 'Factura',
      fechaBase: '',
      fechaPago: '',
      importe: '',
      descuento: '',
      basePP: ''
    });
    setEditandoRegistro(null);
    setMostrarFormulario(false);
  };

  const aplicarFiltros = () => {
    cargarDatos();
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || amount === '') return '-';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getColorDemora = (demora) => {
    if (demora === '' || demora === null || demora === undefined) return '';
    if (demora >= 0) return 'demora-positiva';
    if (demora < -30) return 'demora-critica';
    if (demora < -15) return 'demora-alerta';
    return 'demora-normal';
  };

  const getTotalCartera = () => {
    if (!datosContabilidad?.reporteCartera) return 0;
    return datosContabilidad.reporteCartera.reduce((sum, cliente) => sum + cliente.total, 0);
  };

  const getTotalDocumentos = () => {
    if (!datosContabilidad?.reporteCartera) return 0;
    return datosContabilidad.reporteCartera.reduce((sum, cliente) => sum + cliente.documentos.length, 0);
  };

  if (!datosContabilidad) {
    return (
      <div className="contabilidad-container">
        <div className="contabilidad-header">
          <h1>Cargando información contable...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className={`contabilidad-container ${cargando ? 'loading' : ''}`}>
      {/* Header */}
      <div className="contabilidad-header">
        <h1>📊 Sistema de Gestión de Cartera</h1>
        <p>Dashboard, reportes de cartera y análisis de pagos mensuales</p>
      </div>

      {errorConexion && (
        <div style={{background:'#fee2e2',color:'#b91c1c',padding:'12px 16px',borderRadius:'8px',marginBottom:'16px',fontWeight:'500'}}>
          ⚠️ {errorConexion}
        </div>
      )}

      {/* Toolbar: acciones + navegación */}
      <div className="toolbar-row">
        <button
          className="btn btn-success"
          onClick={() => { setEditandoRegistro(null); setMostrarFormulario(true); }}
        >
          ➕ Nuevo Registro
        </button>
        <button className="btn btn-primary" onClick={aplicarFiltros}>
          🔄 Actualizar
        </button>
        <div className="navegacion-vistas">
          <button
            className={`btn-vista ${vistaActiva === 'dashboard' ? 'active' : ''}`}
            onClick={() => setVistaActiva('dashboard')}
          >
            📈 Dashboard
          </button>
          <button
            className={`btn-vista ${vistaActiva === 'cartera' ? 'active' : ''}`}
            onClick={() => setVistaActiva('cartera')}
          >
            📋 Cartera
          </button>
        </div>
      </div>

      {/* Formulario para Nuevo Registro */}
      {mostrarFormulario && (
        <div className="formulario-nuevo-registro">
          <div className="formulario-header">
            <h3>{editandoRegistro ? '✏️ Editar Registro' : '➕ Agregar Nuevo Registro'}</h3>
            <button 
              className="btn-cerrar"
              onClick={limpiarFormulario}
            >
              ×
            </button>
          </div>
          
          <div className="formulario-grid">
            <div className="form-group">
              <label>Distribuidora *</label>
              <input
                type="text"
                name="distribuidora"
                value={nuevoRegistro.distribuidora}
                onChange={handleInputChange}
                placeholder="Ej: DISTRIBUIDORA FARMACEUTICA ROMA"
              />
            </div>
            
            <div className="form-group">
              <label>Cliente *</label>
              <input
                type="text"
                name="cliente"
                value={nuevoRegistro.cliente}
                onChange={handleInputChange}
                placeholder="Ej: BERNAL DELGADILLO CAROLINA"
              />
            </div>
            
            <div className="form-group">
              <label>NIT *</label>
              <input
                type="text"
                name="nit"
                value={nuevoRegistro.nit}
                onChange={handleInputChange}
                placeholder="Ej: 10231877"
              />
            </div>
            
            <div className="form-group">
              <label>REF DOC *</label>
              <input
                type="text"
                name="refDoc"
                value={nuevoRegistro.refDoc}
                onChange={handleInputChange}
                placeholder="Ej: AXBF519986"
              />
            </div>
            
            <div className="form-group">
              <label>Clase</label>
              <select
                name="clase"
                value={nuevoRegistro.clase}
                onChange={handleInputChange}
              >
                <option value="Factura">Factura</option>
                <option value="RV">RV</option>
                <option value="NC">NC</option>
                <option value="ND">ND</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Fecha Base</label>
              <input
                type="date"
                name="fechaBase"
                value={nuevoRegistro.fechaBase}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="form-group">
              <label>Fecha Pago</label>
              <input
                type="date"
                name="fechaPago"
                value={nuevoRegistro.fechaPago}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="form-group">
              <label>Importe</label>
              <input
                type="number"
                name="importe"
                value={nuevoRegistro.importe}
                onChange={handleInputChange}
                placeholder="0"
                step="0.01"
              />
            </div>
            
            <div className="form-group">
              <label>Descuento</label>
              <input
                type="number"
                name="descuento"
                value={nuevoRegistro.descuento}
                onChange={handleInputChange}
                placeholder="0"
                step="0.01"
              />
            </div>
            
            <div className="form-group">
              <label>Base PP</label>
              <input
                type="number"
                name="basePP"
                value={nuevoRegistro.basePP}
                onChange={handleInputChange}
                placeholder="0"
                step="0.01"
              />
            </div>
            
            <div className="form-group">
              <label>A Pagar (Calculado)</label>
              <input
                type="text"
                value={formatCurrency(calcularAPagar())}
                disabled
                className="campo-calculado"
              />
            </div>
          </div>
          
          <div className="formulario-acciones">
            <button 
              className="btn btn-success" 
              onClick={editandoRegistro ? actualizarRegistro : agregarNuevoRegistro}
            >
              {editandoRegistro ? '💾 Actualizar Registro' : '💾 Guardar Registro'}
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={limpiarFormulario}
            >
              ❌ Cancelar
            </button>
          </div>
        </div>
      )}

      {vistaActiva === 'dashboard' ? (
        <div className="dashboard-container">
          <h2>Resumen de cartera</h2>
          <div className="metricas-grid">
            <div className="metrica-card">
              <h3>Total Cartera</h3>
              <p className="metrica-valor">{formatCurrency(getTotalCartera())}</p>
            </div>
            <div className="metrica-card">
              <h3>Clientes Activos</h3>
              <p className="metrica-valor">{datosContabilidad.reporteCartera.length} prov.</p>
            </div>
            <div className="metrica-card">
              <h3>Documentos Totales</h3>
              <p className="metrica-valor">{getTotalDocumentos()}</p>
            </div>
            <div className="metrica-card">
              <h3>Eficiencia de Cobro</h3>
              <p className="metrica-valor">{datosContabilidad.metricasDashboard.eficienciaCobro}%</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Filtros */}
          <div className="filtros-section">
            <h3>Filtrar Reportes</h3>
            <div className="filtros-grid">
              <div className="form-group">
                <label>Fecha de Corte:</label>
                <input
                  type="date"
                  value={fechaCorte}
                  onChange={(e) => setFechaCorte(e.target.value)}
                />
              </div>
              
              <div className="form-group">
                <label>Cliente:</label>
                <select
                  value={clienteSeleccionado}
                  onChange={(e) => setClienteSeleccionado(e.target.value)}
                >
                  {datosContabilidad.clientes.map(cliente => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nombre}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Tipo de Reporte:</label>
                <select
                  value={tipoReporte}
                  onChange={(e) => setTipoReporte(e.target.value)}
                >
                  <option value="cartera">Estado de Cartera</option>
                  <option value="antiguedad">Antigüedad de Saldos</option>
                  <option value="vencidos">Documentos Vencidos</option>
                </select>
              </div>
              
              <button className="btn btn-primary" onClick={aplicarFiltros}>
                🔍 Generar Reporte
              </button>
            </div>
          </div>

          {/* Reportes de Cartera */}
          <div className="reportes-cartera">
            {datosContabilidad.reporteCartera.length === 0 && (
              <div className="cartera-vacia">
                <span style={{fontSize:'2rem'}}>📭</span>
                <p>No hay facturas registradas en cuentas por pagar.</p>
              </div>
            )}
            {datosContabilidad.reporteCartera.map((cliente) => (
              <div key={cliente.id} className="cliente-reporte">
                <div className="cliente-header">
                  <div className="cliente-info">
                    <h2>{cliente.distribuidora}</h2>
                    <p>{cliente.cliente}</p>
                  </div>
                  <div className="cliente-nit">
                    <strong>NIT: {cliente.nit}</strong>
                    <span className="total-cliente">{formatCurrency(cliente.total)}</span>
                  </div>
                </div>

                <div className="tabla-container">
                  <table className="data-table cartera-table">
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
                        <th>ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cliente.documentos.map((doc, index) => (
                        <tr key={doc.id || index}>
                          <td className="ref-doc">{doc.refDoc}</td>
                          <td className="clase-doc">{doc.clase}</td>
                          <td>{doc.fechaBase || '-'}</td>
                          <td>{doc.fechaPago || '-'}</td>
                          <td className={`demora ${getColorDemora(doc.demora)}`}>
                            {doc.demora || doc.demora === 0 ? doc.demora : '-'}
                          </td>
                          <td className={doc.importe < 0 ? 'negative' : 'positive'}>
                            {formatCurrency(doc.importe)}
                          </td>
                          <td>{doc.basePP ? formatCurrency(doc.basePP) : '-'}</td>
                          <td>{doc.descuento ? formatCurrency(doc.descuento) : '-'}</td>
                          <td className={doc.aPagar < 0 ? 'negative' : 'positive'}>
                            {formatCurrency(doc.aPagar)}
                          </td>
                          <td>
                            <div className="acciones-tabla">
                              <button 
                                className="btn-editar"
                                onClick={() => editarRegistro(doc, cliente)}
                                title="Editar documento"
                              >
                                ✏️
                              </button>
                              <button 
                                className="btn-eliminar"
                                onClick={() => eliminarRegistro(doc.id, cliente.nit)}
                                title="Eliminar documento"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="total-row">
                        <td colSpan="8" className="total-label">
                          <strong>TOTAL CLIENTE</strong>
                        </td>
                        <td className="total-amount">
                          <strong>{formatCurrency(cliente.total)}</strong>
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ))}
          </div>

          {/* Resumen General */}
          <div className="resumen-general">
            <div className="resumen-card">
              <h3>Resumen General de Cartera</h3>
              <div className="resumen-stats">
                <div className="resumen-stat">
                  <span className="stat-label">Total Cartera:</span>
                  <span className="stat-value">
                    {formatCurrency(getTotalCartera())}
                  </span>
                </div>
                <div className="resumen-stat">
                  <span className="stat-label">Clientes Activos:</span>
                  <span className="stat-value">{datosContabilidad.reporteCartera.length}</span>
                </div>
                <div className="resumen-stat">
                  <span className="stat-label">Documentos Totales:</span>
                  <span className="stat-value">
                    {getTotalDocumentos()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ContabilidadScreen;