import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ClientesScreen.css';
import { supabase } from './supabaseClient.js';

const ClientesScreen = ({ 
  onSeleccionarCliente, 
  onVolver,
  onHacerPedido,
  clientes: initialClientes 
}) => {
  const navigate = useNavigate();
  // Estados para clientes
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: '',
    direccion: '',
    telefono: '',
    correo: '',
    clasificacion: 3
  });
  const [clientes, setClientes] = useState(initialClientes || []);
  const [importandoClientes, setImportandoClientes] = useState(false);
  const [filtroClasificacion, setFiltroClasificacion] = useState(0);
  const [clienteEditando, setClienteEditando] = useState(null);
  const [cargandoClientes, setCargandoClientes] = useState(true);
  const [error, setError] = useState(null);
  const [mostrarEstadisticas, setMostrarEstadisticas] = useState(false);

  // Cargar clientes al montar el componente
  useEffect(() => {
    cargarClientes();
  }, []);

  // Función para determinar clasificación automática
  const determinarClasificacionAutomatica = async (nombreCliente) => {
    try {
      const { data: facturas, error: facturasError } = await supabase
        .from('facturas')
        .select('*')
        .eq('cliente', nombreCliente);
      
      if (facturasError) {
        console.error('Error al obtener facturas:', facturasError);
        return 3;
      }
      
      if (!facturas || facturas.length === 0) return 3;
      
      const totalGastado = facturas.reduce((sum, f) => sum + (f.total || 0), 0);
      const promedioPorFactura = totalGastado / facturas.length;
      
      // Obtener todas las facturas para calcular frecuencia
      const { data: todasFacturas, error: todasFacturasError } = await supabase
        .from('facturas')
        .select('*');
      
      if (todasFacturasError) {
        console.error('Error al obtener todas las facturas:', todasFacturasError);
        return 3;
      }
      
      const frecuenciaCompras = facturas.length / (todasFacturas?.length || 1);
      
      let puntaje = 3;
      if (totalGastado > 5000000) puntaje += 1;
      if (totalGastado > 10000000) puntaje += 1;
      if (totalGastado < 1000000) puntaje -= 1;
      
      if (promedioPorFactura > 500000) puntaje += 1;
      if (promedioPorFactura < 100000) puntaje -= 1;
      
      if (frecuenciaCompras > 0.5) puntaje += 1;
      if (frecuenciaCompras < 0.1) puntaje -= 1;
      
      return Math.min(Math.max(puntaje, 1), 5);
    } catch (error) {
      console.error('Error calculando clasificación:', error);
      return 3;
    }
  };

  // Cargar clientes desde Supabase
  const cargarClientes = async () => {
    setCargandoClientes(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('clientes')
        .select('*')
        .order('nombre', { ascending: true });
      
      if (supabaseError) {
        throw supabaseError;
      }
      
      setClientes(data || []);
    } catch (error) {
      console.error('Error completo al cargar clientes:', {
        message: error.message,
        details: error.details,
        code: error.code
      });
      setError('Error al cargar clientes. Por favor revisa la consola para más detalles.');
    } finally {
      setCargandoClientes(false);
    }
  };

  // Validar formato de email
  const validarEmail = (email) => {
    if (!email) return true;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  // Validar formato de teléfono
  const validarTelefono = (telefono) => {
    if (!telefono) return true;
    const re = /^[0-9+\- ]+$/;
    return re.test(telefono);
  };

  const limpiarTelefono = (telefono) => {
    if (!telefono) return '';
    return String(telefono).replace(/\D/g, '');
  };

  // Funciones para gestión de clientes
  const iniciarEdicionCliente = (cliente) => {
    setClienteEditando(cliente);
    setNuevoCliente({
      nombre: cliente.nombre,
      direccion: cliente.direccion,
      telefono: cliente.telefono,
      correo: cliente.correo,
      clasificacion: cliente.clasificacion
    });
  };

  const cancelarEdicionCliente = () => {
    setClienteEditando(null);
    setNuevoCliente({
      nombre: '',
      direccion: '',
      telefono: '',
      correo: '',
      clasificacion: 3
    });
    setError(null);
  };

  const guardarCliente = async () => {
    if (!nuevoCliente.nombre) {
      alert('El nombre del cliente es obligatorio');
      return;
    }

    // Validaciones
    if (nuevoCliente.correo && !validarEmail(nuevoCliente.correo)) {
      alert('Por favor ingresa un email válido');
      return;
    }

    if (nuevoCliente.telefono && !validarTelefono(nuevoCliente.telefono)) {
      alert('Por favor ingresa un teléfono válido');
      return;
    }

    const telefonoLimpio = limpiarTelefono(nuevoCliente.telefono);

    try {
      if (clienteEditando) {
        // Actualizar cliente existente
        const { error: updateError } = await supabase
          .from('clientes')
          .update({
            nombre: nuevoCliente.nombre,
            direccion: nuevoCliente.direccion,
            telefono: telefonoLimpio,
            correo: nuevoCliente.correo,
            clasificacion: nuevoCliente.clasificacion,
            actualizado_en: new Date().toISOString()
          })
          .eq('id', clienteEditando.id);
        
        if (updateError) throw updateError;
      } else {
        // Verificar si el cliente ya existe
        const { data: clienteExistente, error: searchError } = await supabase
          .from('clientes')
          .select('nombre')
          .ilike('nombre', nuevoCliente.nombre)
          .single();
        
        if (clienteExistente) {
          alert('Ya existe un cliente con ese nombre');
          return;
        }

        // Crear nuevo cliente
        const clasificacion = nuevoCliente.clasificacion || 
          await determinarClasificacionAutomatica(nuevoCliente.nombre);
        
        const { error: insertError } = await supabase
          .from('clientes')
          .insert([{
            nombre: nuevoCliente.nombre,
            direccion: nuevoCliente.direccion,
            telefono: telefonoLimpio,
            correo: nuevoCliente.correo,
            clasificacion: clasificacion
          }]);
        
        if (insertError) throw insertError;
      }
      
      // Actualizar la lista de clientes
      await cargarClientes();
      
      setNuevoCliente({
        nombre: '',
        direccion: '',
        telefono: '',
        correo: '',
        clasificacion: 3
      });
      setClienteEditando(null);
      
      alert('Cliente guardado exitosamente!');
    } catch (error) {
      console.error('Error al guardar cliente:', error);
      alert('Error al guardar cliente: ' + error.message);
    }
  };

  const seleccionarCliente = (cliente) => {
    onSeleccionarCliente(cliente);
  };

  const hacerPedidoCliente = (cliente) => {
    if (onHacerPedido) {
      onHacerPedido(cliente);
      return;
    }

    const params = new URLSearchParams({
      nombre: cliente.nombre || '',
      telefono: cliente.telefono || '',
      direccion: cliente.direccion || '',
      correo: cliente.correo || ''
    });

    navigate(`/catalogo-clientes?${params.toString()}`, {
      state: {
        clienteData: {
          nombre: cliente.nombre || '',
          telefono: cliente.telefono || '',
          direccion: cliente.direccion || '',
          correo: cliente.correo || '',
          clasificacion: cliente.clasificacion || 3
        }
      }
    });
  };

  // Función para manejar el volver
  const manejarVolver = () => {
    // Si está editando un cliente, cancelar la edición primero
    if (clienteEditando) {
      cancelarEdicionCliente();
    } else {
      // Si no está editando, volver directamente
      onVolver();
    }
  };

  // Función para exportar clientes
  const exportarClientes = async () => {
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('clientes')
        .select('*');
      
      if (supabaseError) throw supabaseError;
      
      if (!data || data.length === 0) {
        setError('No hay clientes para exportar');
        return;
      }

      const datosExportacion = {
        metadata: {
          sistema: "e-business store(EBS) Facturación",
          version: "1.0",
          fechaExportacion: new Date().toISOString(),
          totalClientes: data.length
        },
        clientes: data.map(cliente => ({
          id: cliente.id,
          nombre: cliente.nombre,
          direccion: cliente.direccion || '',
          telefono: cliente.telefono || '',
          correo: cliente.correo || '',
          clasificacion: cliente.clasificacion || 3,
          fecha_registro: cliente.fecha_registro || new Date().toISOString()
        }))
      };

      const dataStr = JSON.stringify(datosExportacion, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `clientes_ebs_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      alert(`✅ Se exportaron ${data.length} clientes correctamente`);
    } catch (error) {
      console.error('Error al exportar clientes:', error);
      setError(`Error al exportar clientes: ${error.message}`);
    }
  };

  // Función para importar clientes
  const importarClientes = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImportandoClientes(true);
    setError(null);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const contenido = e.target.result;
        const datosImportados = JSON.parse(contenido);
        
        if (!datosImportados || !Array.isArray(datosImportados.clientes)) {
          throw new Error("El archivo no tiene el formato correcto. Debe contener un array 'clientes'");
        }
        
        const clientesImportados = datosImportados.clientes;
        
        // Validar y normalizar clientes
        const clientesValidados = clientesImportados.map((cliente, index) => {
          if (!cliente.nombre || !cliente.nombre.toString().trim()) {
            throw new Error(`Cliente en posición ${index} no tiene nombre válido`);
          }
          
          // Validar email si existe
          if (cliente.correo && !validarEmail(cliente.correo.toString())) {
            throw new Error(`Cliente "${cliente.nombre}" tiene un email inválido`);
          }
          
          // Validar teléfono si existe
          if (cliente.telefono && !validarTelefono(cliente.telefono.toString())) {
            throw new Error(`Cliente "${cliente.nombre}" tiene un teléfono inválido`);
          }
          
          let clasificacion = 3;
          if (cliente.clasificacion !== undefined) {
            clasificacion = Math.max(1, Math.min(5, parseInt(cliente.clasificacion) || 3));
          }
          
          return {
            nombre: cliente.nombre.toString().trim(),
            direccion: cliente.direccion ? cliente.direccion.toString().trim() : '',
            telefono: cliente.telefono ? cliente.telefono.toString().trim() : '',
            correo: cliente.correo ? cliente.correo.toString().trim() : '',
            clasificacion: clasificacion
          };
        });
        
        // Verificar duplicados
        const { data: clientesExistentes, error: clientesError } = await supabase
          .from('clientes')
          .select('nombre');
          
        if (clientesError) throw clientesError;
          
        const nombresExistentes = new Set(clientesExistentes.map(c => c.nombre.toLowerCase()));
        const nuevosClientes = clientesValidados.filter(c => 
          !nombresExistentes.has(c.nombre.toLowerCase())
        );
        
        if (nuevosClientes.length === 0) {
          setError('⚠️ Todos los clientes en el archivo ya existen en el sistema');
          return;
        }
        
        const confirmacion = window.confirm(
          `📊 Resumen de Importación:\n\n` +
          `• Clientes en archivo: ${clientesImportados.length}\n` +
          `• Nuevos clientes a importar: ${nuevosClientes.length}\n` +
          `• Clientes duplicados (no se importarán): ${clientesImportados.length - nuevosClientes.length}\n\n` +
          `¿Desea continuar con la importación?`
        );
        
        if (confirmacion) {
          const { error: insertError } = await supabase
            .from('clientes')
            .insert(nuevosClientes);
          
          if (insertError) throw insertError;
          
          await cargarClientes();
          alert(`🎉 Importación completada!\n\nSe agregaron ${nuevosClientes.length} nuevos clientes.`);
        }
      } catch (error) {
        console.error("Error importando clientes:", error);
        setError(`Error al importar: ${error.message}`);
      } finally {
        setImportandoClientes(false);
        event.target.value = '';
      }
    };
    
    reader.onerror = () => {
      setError("Error al leer el archivo. Asegúrese de seleccionar un archivo JSON válido.");
      setImportandoClientes(false);
      event.target.value = '';
    };
    
    reader.readAsText(file);
  };

  // Filtros
  const clientesFiltrados = clientes.filter(cliente => {
    const coincideNombre = cliente.nombre.toLowerCase().includes(busquedaCliente.toLowerCase());
    const coincideTelefono = cliente.telefono && cliente.telefono.includes(busquedaCliente);
    const coincideCorreo = cliente.correo && cliente.correo.toLowerCase().includes(busquedaCliente.toLowerCase());
    const coincideClasificacion = filtroClasificacion === 0 || cliente.clasificacion === filtroClasificacion;
    
    return (coincideNombre || coincideTelefono || coincideCorreo) && coincideClasificacion;
  });

  return (
    <div className="clientes-modal">
      <div className="clientes-content">
        <div className="clientes-header">
          <h2>{clienteEditando ? 'Editar Cliente' : 'Seleccionar Cliente'}</h2>
          <button 
            className="button secondary-button"
            onClick={manejarVolver}
          >
            Volver
          </button>
        </div>
        
        {/* Mostrar mensajes de error */}
        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}
        
        <div className="clientes-search">
          <input
            type="text"
            placeholder="🔍 Buscar cliente..."
            value={busquedaCliente}
            onChange={(e) => setBusquedaCliente(e.target.value)}
          />
        </div>

        <div className="clientes-filters">
          <label>Filtrar por clasificación:</label>
          <select 
            value={filtroClasificacion} 
            onChange={(e) => setFiltroClasificacion(Number(e.target.value))}
          >
            <option value={0}>Todas</option>
            <option value={1}>1 ★</option>
            <option value={2}>2 ★★</option>
            <option value={3}>3 ★★★</option>
            <option value={4}>4 ★★★★</option>
            <option value={5}>5 ★★★★★</option>
          </select>
        </div>
        
        {cargandoClientes ? (
          <div className="loading-clientes">
            <p>Cargando clientes...</p>
          </div>
        ) : (
          <>
            {/* Estadísticas en Acordeón */}
            <div className="clientes-stats-collapsible">
              <div 
                className="stats-header"
                onClick={() => setMostrarEstadisticas(!mostrarEstadisticas)}
              >
                <h4>📊 Estadísticas de Clientes</h4>
                <span className={`toggle-arrow ${mostrarEstadisticas ? 'expanded' : ''}`}>
                  ▼
                </span>
              </div>
              
              {mostrarEstadisticas && (
                <div className="stats-grid">
                  {[5, 4, 3, 2, 1].map(star => (
                    <div key={star} className="stat-item">
                      <span className={`clasificacion-badge clasificacion-${star}`}>
                        {star} {'★'.repeat(star)}
                      </span>
                      <span>
                        {clientes.filter(c => c.clasificacion === star).length} clientes
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {!clienteEditando && (
              <div className="clientes-list">
                {clientesFiltrados.length > 0 ? (
                  clientesFiltrados.map(cliente => (
                    <div 
                      key={cliente.id} 
                      className="cliente-item"
                    >
                      <div 
                        className="cliente-info"
                        onClick={() => seleccionarCliente(cliente)}
                      >
                        <h4>{cliente.nombre}</h4>
                        <div className={`clasificacion-badge clasificacion-${cliente.clasificacion}`}>
                          {cliente.clasificacion} {'★'.repeat(cliente.clasificacion)}
                        </div>
                        {cliente.telefono && <p>📞 Tel: {cliente.telefono}</p>}
                        {cliente.correo && <p>📧 Email: {cliente.correo}</p>}
                        {cliente.direccion && <p>📍 Dir: {cliente.direccion}</p>}
                      </div>
                      <div className="cliente-acciones">
                        <button
                          className="button success-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            hacerPedidoCliente(cliente);
                          }}
                        >
                          🛒 Hacer Pedido
                        </button>
                        <button
                          className="button info-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            iniciarEdicionCliente(cliente);
                          }}
                        >
                          ✏️ Editar
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-clientes">
                    <p>No se encontraron clientes</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
        
        <div className="nuevo-cliente-form">
          <h3>{clienteEditando ? 'Editar Cliente' : 'Agregar Nuevo Cliente'}</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Nombre *</label>
              <input
                type="text"
                value={nuevoCliente.nombre}
                onChange={(e) => setNuevoCliente({...nuevoCliente, nombre: e.target.value})}
                placeholder="Nombre completo"
                required
              />
            </div>
            <div className="form-group">
              <label>Teléfono</label>
              <input
                type="tel"
                value={nuevoCliente.telefono}
                onChange={(e) => setNuevoCliente({...nuevoCliente, telefono: e.target.value})}
                placeholder="Ej: +57 1234567890"
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Correo</label>
              <input
                type="email"
                value={nuevoCliente.correo}
                onChange={(e) => setNuevoCliente({...nuevoCliente, correo: e.target.value})}
                placeholder="Ej: cliente@ejemplo.com"
              />
            </div>
            <div className="form-group">
              <label>Dirección</label>
              <input
                type="text"
                value={nuevoCliente.direccion}
                onChange={(e) => setNuevoCliente({...nuevoCliente, direccion: e.target.value})}
                placeholder="Opcional"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Clasificación (1-5)</label>
              <div className="clasificacion-stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`star ${star <= nuevoCliente.clasificacion ? 'filled' : ''}`}
                    onClick={() => setNuevoCliente({...nuevoCliente, clasificacion: star})}
                  >
                    ★
                  </span>
                ))}
              </div>
              <div style={{ marginTop: '8px', fontSize: '0.9rem', color: '#666' }}>
                Clasificación seleccionada: {nuevoCliente.clasificacion} estrellas
              </div>
            </div>
          </div>
          
          <div className="form-buttons">
            <button 
              className="button primary-button"
              onClick={guardarCliente}
              disabled={cargandoClientes}
            >
              {clienteEditando ? 'Actualizar Cliente' : 'Guardar Cliente'}
            </button>
            
            {clienteEditando && (
              <button 
                className="button secondary-button"
                onClick={cancelarEdicionCliente}
              >
                Cancelar
              </button>
            )}
          </div>
        </div>

        <div className="clientes-actions">
          <button 
            className="button info-button"
            onClick={exportarClientes}
            disabled={clientes.length === 0 || importandoClientes || cargandoClientes}
          >
            📤 Exportar Clientes
            {clientes.length > 0 && (
              <span className="badge-count">{clientes.length}</span>
            )}
          </button>
          
          <label 
            htmlFor="importar-clientes" 
            className={`button warning-button ${importandoClientes || cargandoClientes ? 'disabled' : ''}`}
          >
            📥 Importar Clientes
          </label>
          
          <input
            type="file"
            id="importar-clientes"
            accept=".json,application/json"
            onChange={importarClientes}
            disabled={importandoClientes || cargandoClientes}
            style={{ display: 'none' }}
          />
          
          {importandoClientes && (
            <div className="import-progress">
              <div className="spinner"></div>
              <span>Procesando archivo...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientesScreen;