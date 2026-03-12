import React, { useState, useEffect } from 'react';
import './GastosScreen.css';

const GastosScreen = () => {
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth());
  const [anioSeleccionado, setAnioSeleccionado] = useState(new Date().getFullYear());
  const [tipoGasto, setTipoGasto] = useState('todos');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [gastoEditando, setGastoEditando] = useState(null);
  const [datosGastos, setDatosGastos] = useState(null);
  const [cargando, setCargando] = useState(false);

  // Filtros avanzados
  const [personaFiltro, setPersonaFiltro] = useState('todos');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todos');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [busquedaReferencia, setBusquedaReferencia] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina] = useState(10);
  const [mostrarPreview, setMostrarPreview] = useState(false);
  const [erroresValidacion, setErroresValidacion] = useState({});
  
  // Estados adicionales para nóminas mejoradas
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);
  const [nominasEmpleado, setNominasEmpleado] = useState([]);
  const [mostrarDetalleNomina, setMostrarDetalleNomina] = useState(false);
  const [nominaDetalle, setNominaDetalle] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('todos'); // todos, pagadas, pendientes
  
  // Estado para tabs/secciones colapsables
  const [seccionesAbiertas, setSeccionesAbiertas] = useState({
    nequi: true,
    nomina: true,
    especifico: true,
    credito: true
  });
  const [mostrarFiltrosAvanzados, setMostrarFiltrosAvanzados] = useState(false);

  // Estado para nuevo gasto
  const [nuevoGasto, setNuevoGasto] = useState({
    fecha: '',
    tipo: 'nequi',
    persona: 'Edwin Marín',
    cantidad: '',
    referencia: '',
    categoria: 'Servicios',
    descripcion: '',
    // Nuevos campos para facturas/cuentas por cobrar
    refDoc: '',
    clase: 'RV',
    fhBase: '',
    importe: '',
    abono: ''
  });

  // Datos de ejemplo basados en el documento
  const datosEjemplo = {
    gastosNequi: {
      'Edwin Marín': [
        {
          id: 1,
          fecha: '2025-06-05',
          cantidad: 380000,
          referencia: 'M12808105',
          descripcion: 'Pago varios'
        },
        {
          id: 2,
          fecha: '2025-06-07',
          cantidad: 1000000,
          referencia: 'M12152352',
          descripcion: 'Transferencia negocio'
        },
        // ... más gastos de Edwin según el documento
      ],
      'Jhon Fredy Marín': [
        {
          id: 101,
          fecha: '2025-06-01',
          cantidad: 200000,
          referencia: 'S7660991',
          descripcion: 'Pago inicial'
        },
        {
          id: 102,
          fecha: '2025-06-03',
          cantidad: 270000,
          referencia: 'M168089',
          descripcion: 'Compra materiales'
        },
        // ... más gastos de Jhon según el documento
      ]
    },
    nominas: [
      {
        id: 201,
        persona: 'Paola Huertas',
        cantidad: 2750000,
        mes: 5, // Junio
        anio: 2025,
        tipo: 'nómina',
        descripcion: 'Pago nómina mensual'
      },
      {
        id: 202,
        persona: 'Carolina Bernal',
        cantidad: 1550000,
        mes: 5,
        anio: 2025,
        tipo: 'nómina',
        descripcion: 'Pago nómina mensual'
      },
      {
        id: 203,
        persona: 'Fabian Marín',
        cantidad: 2500000,
        mes: 5,
        anio: 2025,
        tipo: 'prima',
        descripcion: 'Prima 2024'
      }
    ],
    gastosEspecificos: [
      {
        id: 301,
        categoria: 'Ofrenda',
        cantidad: 1400000,
        mes: 5,
        anio: 2025
      },
      {
        id: 302,
        categoria: 'E.P.S',
        cantidad: 400000,
        mes: 5,
        anio: 2025
      },
      {
        id: 303,
        categoria: 'Gasolina',
        cantidad: 323000,
        mes: 5,
        anio: 2025
      },
      {
        id: 304,
        categoria: 'Parqueadero',
        cantidad: 470000,
        mes: 5,
        anio: 2025
      },
      {
        id: 305,
        categoria: 'Comida',
        cantidad: 357500,
        mes: 5,
        anio: 2025
      },
      {
        id: 306,
        categoria: 'Arriendo',
        cantidad: 650000,
        mes: 5,
        anio: 2025
      },
      {
        id: 307,
        categoria: 'Viajes',
        cantidad: 200000,
        mes: 5,
        anio: 2025
      },
      {
        id: 308,
        categoria: 'Pasajes',
        cantidad: 50400,
        mes: 5,
        anio: 2025
      },
      {
        id: 309,
        categoria: 'Compras Oficina',
        cantidad: 102500,
        mes: 5,
        anio: 2025
      }
    ],
    creditos: [
      {
        id: 401,
        distribuidora: 'Roma',
        pago: 700000,
        cartera: 4152638,
        fechaPago: '2025-07-13',
        tipo: 'crédito'
      },
      {
        id: 402,
        distribuidora: 'Axa',
        pago: 1796000,
        cartera: 3140000,
        fechaPago: '2025-07-20',
        tipo: 'crédito'
      },
      {
        id: 403,
        distribuidora: 'Coopicredito',
        pago: 22731842,
        cartera: 0,
        fechaPago: '2025-07-05',
        tipo: 'crédito'
      }
    ],
    facturas: [
      {
        id: 1001,
        refDoc: '500787688',
        clase: 'RV',
        fhBase: '2025-09-23',
        importe: 35806685,
        abono: 4380669,
        aPagar: 31426017,
        tipo: 'factura'
      },
      {
        id: 1002,
        refDoc: '4400077966',
        clase: 'NC',
        fhBase: '',
        importe: -12861150,
        abono: 0,
        aPagar: -12861150,
        tipo: 'factura'
      }
    ],
    cajaMenor: {
      moneda: 43000,
      efectivo: 352000,
      total: 395000
    }
  };

  useEffect(() => {
    setCargando(true);
    const timer = setTimeout(() => {
      setDatosGastos(datosEjemplo);
      setCargando(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Categorías de gastos
  const categoriasGastos = [
    'Servicios', 'Nómina', 'Gasolina', 'Arriendo', 'Comida', 'Transporte',
    'Ofrenda', 'Arreglos', 'Parqueadero', 'Viajes', 'Pasajes', 'Compras Oficina',
    'Fechas Especiales', 'Varios', 'EPS', 'Créditos', 'Cuidado Personal', 'Antigripal Cuidado Respiratorio'
  ];

  // Tipos de gasto
  const tiposGasto = [
    { value: 'nequi', label: 'Nequi' },
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'nomina', label: 'Nómina' },
    { value: 'credito', label: 'Crédito' },
    { value: 'especifico', label: 'Gasto Específico' },
    { value: 'todos', label: 'Todos los Gastos' }
  ];

  // Personas
  const personas = ['Edwin Marín', 'Jhon Fredy Marín', 'Paola Huertas', 'Carolina Bernal', 'Fabian Marín'];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNuevoGasto(prev => ({
      ...prev,
      [name]: value
    }));
    // Limpiar error si el usuario empieza a escribir
    if (erroresValidacion[name]) {
      setErroresValidacion(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const validarGasto = () => {
    const errores = {};
    
    if (!nuevoGasto.fecha && nuevoGasto.tipo !== 'factura') {
      errores.fecha = 'La fecha es requerida';
    }
    
    if (nuevoGasto.tipo === 'factura') {
      if (!nuevoGasto.refDoc) {
        errores.refDoc = 'El número de referencia es requerido';
      }
      if (!nuevoGasto.clase) {
        errores.clase = 'La clase es requerida';
      }
      if (!nuevoGasto.fhBase) {
        errores.fhBase = 'La fecha base es requerida';
      }
      if (!nuevoGasto.importe || parseFloat(nuevoGasto.importe) <= 0) {
        errores.importe = 'El importe debe ser mayor a 0';
      }
    } else {
      if (!nuevoGasto.cantidad || parseFloat(nuevoGasto.cantidad) <= 0) {
        errores.cantidad = 'La cantidad debe ser mayor a 0';
      }
    }
    
    if (!nuevoGasto.tipo) {
      errores.tipo = 'El tipo de gasto es requerido';
    }
    
    if (!nuevoGasto.persona && nuevoGasto.tipo === 'nequi') {
      errores.persona = 'La persona es requerida para gastos Nequi';
    }
    
    setErroresValidacion(errores);
    return Object.keys(errores).length === 0;
  };

  const calcularTotalGastos = () => {
    if (!datosGastos) return 0;

    let total = 0;

    // Sumar gastos Nequi de Edwin
    if (datosGastos.gastosNequi['Edwin Marín']) {
      total += datosGastos.gastosNequi['Edwin Marín'].reduce((sum, gasto) => sum + gasto.cantidad, 0);
    }

    // Sumar gastos Nequi de Jhon
    if (datosGastos.gastosNequi['Jhon Fredy Marín']) {
      total += datosGastos.gastosNequi['Jhon Fredy Marín'].reduce((sum, gasto) => sum + gasto.cantidad, 0);
    }

    // Sumar nóminas
    total += datosGastos.nominas.reduce((sum, nomina) => sum + nomina.cantidad, 0);

    // Sumar gastos específicos
    total += datosGastos.gastosEspecificos.reduce((sum, gasto) => sum + gasto.cantidad, 0);

    return total;
  };

  const agregarGasto = () => {
    if (!validarGasto()) {
      return;
    }

    const gasto = {
      id: Date.now(),
      fecha: nuevoGasto.fecha,
      cantidad: parseFloat(nuevoGasto.cantidad),
      referencia: nuevoGasto.referencia,
      descripcion: nuevoGasto.descripcion,
      categoria: nuevoGasto.categoria,
      tipo: nuevoGasto.tipo,
      persona: nuevoGasto.persona,
      // Campos adicionales para facturas
      ...(nuevoGasto.tipo === 'factura' && {
        refDoc: nuevoGasto.refDoc,
        clase: nuevoGasto.clase,
        fhBase: nuevoGasto.fhBase,
        importe: parseFloat(nuevoGasto.importe),
        abono: nuevoGasto.abono ? parseFloat(nuevoGasto.abono) : 0,
        aPagar: parseFloat(nuevoGasto.importe) - (nuevoGasto.abono ? parseFloat(nuevoGasto.abono) : 0)
      })
    };

    setDatosGastos(prev => {
      const nuevoEstado = JSON.parse(JSON.stringify(prev));

      switch (nuevoGasto.tipo) {
        case 'factura':
          if (!nuevoEstado.facturas) {
            nuevoEstado.facturas = [];
          }
          nuevoEstado.facturas.push(gasto);
          break;
          
        case 'nequi':
          if (!nuevoEstado.gastosNequi[nuevoGasto.persona]) {
            nuevoEstado.gastosNequi[nuevoGasto.persona] = [];
          }
          nuevoEstado.gastosNequi[nuevoGasto.persona].push(gasto);
          break;

        case 'nomina':
          nuevoEstado.nominas.push({
            ...gasto,
            persona: nuevoGasto.persona,
            mes: new Date(nuevoGasto.fecha).getMonth(),
            anio: new Date(nuevoGasto.fecha).getFullYear()
          });
          break;

        case 'especifico':
          nuevoEstado.gastosEspecificos.push({
            ...gasto,
            categoria: nuevoGasto.categoria,
            mes: new Date(nuevoGasto.fecha).getMonth(),
            anio: new Date(nuevoGasto.fecha).getFullYear()
          });
          break;

        default:
          break;
      }

      return nuevoEstado;
    });

    limpiarFormulario();
    setMostrarPreview(false);
    alert('Gasto agregado exitosamente!');
  };

  const editarGasto = (gasto, tipo, persona = null) => {
    setGastoEditando({ gasto, tipo, persona });
    setNuevoGasto({
      fecha: gasto.fecha || '',
      tipo: tipo,
      persona: persona || gasto.persona || 'Edwin Marín',
      cantidad: gasto.cantidad?.toString() || '',
      referencia: gasto.referencia || '',
      categoria: gasto.categoria || 'Servicios',
      descripcion: gasto.descripcion || '',
      // Campos de facturas
      refDoc: gasto.refDoc || '',
      clase: gasto.clase || 'RV',
      fhBase: gasto.fhBase || '',
      importe: gasto.importe?.toString() || '',
      abono: gasto.abono?.toString() || ''
    });
    setMostrarFormulario(true);
  };

  const eliminarGasto = (gastoId, tipo, persona = null) => {
    if (!window.confirm('¿Está seguro de que desea eliminar este gasto?')) {
      return;
    }

    setDatosGastos(prev => {
      const nuevoEstado = JSON.parse(JSON.stringify(prev));

      switch (tipo) {
        case 'nequi':
          if (persona && nuevoEstado.gastosNequi[persona]) {
            nuevoEstado.gastosNequi[persona] = nuevoEstado.gastosNequi[persona].filter(g => g.id !== gastoId);
          }
          break;

        case 'nomina':
          nuevoEstado.nominas = nuevoEstado.nominas.filter(n => n.id !== gastoId);
          break;

        case 'especifico':
          nuevoEstado.gastosEspecificos = nuevoEstado.gastosEspecificos.filter(g => g.id !== gastoId);
          break;
          
        case 'factura':
          if (nuevoEstado.facturas) {
            nuevoEstado.facturas = nuevoEstado.facturas.filter(f => f.id !== gastoId);
          }
          break;

        default:
          break;
      }

      return nuevoEstado;
    });

    alert('Gasto eliminado exitosamente!');
  };

  const limpiarFormulario = () => {
    setNuevoGasto({
      fecha: '',
      tipo: 'nequi',
      persona: 'Edwin Marín',
      cantidad: '',
      referencia: '',
      categoria: 'Servicios',
      descripcion: '',
      refDoc: '',
      clase: 'RV',
      fhBase: '',
      importe: '',
      abono: ''
    });
    setGastoEditando(null);
    setMostrarFormulario(false);
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || amount === '') return '-';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getNombreMes = (mes) => {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return meses[mes];
  };

  const filtrarGastos = (gastos, tipo = 'todos') => {
    let gastosFiltrados = gastos;

    // Filtrar por persona
    if (personaFiltro !== 'todos') {
      gastosFiltrados = gastosFiltrados.filter(g => g.persona === personaFiltro);
    }

    // Filtrar por categoría
    if (categoriaFiltro !== 'todos') {
      gastosFiltrados = gastosFiltrados.filter(g => g.categoria === categoriaFiltro);
    }

    // Filtrar por rango de fechas
    if (fechaInicio) {
      gastosFiltrados = gastosFiltrados.filter(g => new Date(g.fecha) >= new Date(fechaInicio));
    }
    if (fechaFin) {
      gastosFiltrados = gastosFiltrados.filter(g => new Date(g.fecha) <= new Date(fechaFin));
    }

    // Filtrar por referencia
    if (busquedaReferencia) {
      gastosFiltrados = gastosFiltrados.filter(g => 
        g.referencia && g.referencia.toLowerCase().includes(busquedaReferencia.toLowerCase())
      );
    }

    return gastosFiltrados;
  };

  const obtenerGastosConPaginacion = (gastos) => {
    const inicio = (paginaActual - 1) * itemsPorPagina;
    const fin = inicio + itemsPorPagina;
    return {
      gastos: gastos.slice(inicio, fin),
      total: gastos.length,
      totalPaginas: Math.ceil(gastos.length / itemsPorPagina)
    };
  };

  const limpiarFiltros = () => {
    setPersonaFiltro('todos');
    setCategoriaFiltro('todos');
    setFechaInicio('');
    setFechaFin('');
    setBusquedaReferencia('');
    setPaginaActual(1);
  };

  const toggleSeccion = (seccion) => {
    setSeccionesAbiertas(prev => ({
      ...prev,
      [seccion]: !prev[seccion]
    }));
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Funciones para gestión mejorada de nóminas
  const obtenerEmpleados = () => {
    const empleadosSet = new Set();
    datosGastos?.nominas?.forEach(nomina => {
      if (nomina.persona) {
        empleadosSet.add(nomina.persona);
      }
    });
    return Array.from(empleadosSet).sort();
  };

  const obtenerNominasEmpleado = (empleado) => {
    return datosGastos?.nominas?.filter(n => n.persona === empleado) || [];
  };

  const calcularResumenEmpleado = (empleado) => {
    const nominas = obtenerNominasEmpleado(empleado);
    const totalNominado = nominas.reduce((sum, n) => sum + (n.cantidad || 0), 0);
    const promedioPorNomina = nominas.length > 0 ? totalNominado / nominas.length : 0;
    
    return {
      empleado,
      totalNominado,
      cantidadNominas: nominas.length,
      promedioPorNomina,
      nominas: nominas.sort((a, b) => new Date(b.fecha || `2025-${b.mes}-01`) - new Date(a.fecha || `2025-${a.mes}-01`))
    };
  };

  const verDetalleNomina = (nomina) => {
    setNominaDetalle(nomina);
    setMostrarDetalleNomina(true);
  };

  const cerrarDetalleNomina = () => {
    setMostrarDetalleNomina(false);
    setNominaDetalle(null);
  };

  if (!datosGastos) {
    return (
      <div className="gastos-container">
        <div className="gastos-header">
          <h1>Cargando información de gastos...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className={`gastos-container ${cargando ? 'loading' : ''}`}>
      {/* Header */}
      <div className="gastos-header">
        <h1>💰 Sistema de Gestión de Gastos</h1>
        <p>Control y análisis de gastos mensuales, nóminas y créditos</p>
      </div>

      {/* Resumen General */}
      <div className="resumen-gastos">
        <div className="resumen-card total">
          <h3>Total Gastos {getNombreMes(mesSeleccionado)} {anioSeleccionado}</h3>
          <p className="monto-total">{formatCurrency(calcularTotalGastos())}</p>
          <div className="desglose">
            <span>Nequi: {formatCurrency(6348000 + 22743250)}</span>
            <span>Nóminas: {formatCurrency(2750000 + 1550000 + 2500000)}</span>
            <span>Gastos Específicos: {formatCurrency(16050400)}</span>
          </div>
        </div>

        <div className="resumen-card caja-menor">
          <h3>Caja Menor</h3>
          <p className="monto-total">{formatCurrency(datosGastos.cajaMenor.total)}</p>
          <div className="desglose">
            <span>Moneda: {formatCurrency(datosGastos.cajaMenor.moneda)}</span>
            <span>Efectivo: {formatCurrency(datosGastos.cajaMenor.efectivo)}</span>
          </div>
        </div>
      </div>

      {/* Botones de Acción */}
      <div className="acciones-principales">
        <button 
          className="btn btn-success" 
          onClick={() => {
            setGastoEditando(null);
            setMostrarFormulario(true);
          }}
        >
          ➕ Agregar Gasto
        </button>
        
        <div className="filtros-rapidos">
          <select 
            value={tipoGasto} 
            onChange={(e) => setTipoGasto(e.target.value)}
            className="filtro-select"
          >
            {tiposGasto.map(tipo => (
              <option key={tipo.value} value={tipo.value}>
                {tipo.label}
              </option>
            ))}
          </select>
          
          <select 
            value={mesSeleccionado} 
            onChange={(e) => setMesSeleccionado(parseInt(e.target.value))}
            className="filtro-select"
          >
            {Array.from({length: 12}, (_, i) => (
              <option key={i} value={i}>{getNombreMes(i)}</option>
            ))}
          </select>
          
          <select 
            value={anioSeleccionado} 
            onChange={(e) => setAnioSeleccionado(parseInt(e.target.value))}
            className="filtro-select"
          >
            {[2024, 2025, 2026].map(anio => (
              <option key={anio} value={anio}>{anio}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Filtros Avanzados */}
      <div className="filtros-avanzados">
        <div className="filtros-header">
          <h3>🔍 Filtros Avanzados</h3>
          <button className="btn-filtros-toggle" onClick={limpiarFiltros}>
            🔄 Limpiar Filtros
          </button>
        </div>
        <div className="filtros-grid">
          <div className="filtro-item">
            <label>Persona:</label>
            <select 
              value={personaFiltro}
              onChange={(e) => {
                setPersonaFiltro(e.target.value);
                setPaginaActual(1);
              }}
              className="filtro-select"
            >
              <option value="todos">Todas</option>
              {personas.map(persona => (
                <option key={persona} value={persona}>{persona}</option>
              ))}
            </select>
          </div>

          <div className="filtro-item">
            <label>Categoría:</label>
            <select 
              value={categoriaFiltro}
              onChange={(e) => {
                setCategoriaFiltro(e.target.value);
                setPaginaActual(1);
              }}
              className="filtro-select"
            >
              <option value="todos">Todas</option>
              {categoriasGastos.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="filtro-item">
            <label>Desde:</label>
            <input 
              type="date"
              value={fechaInicio}
              onChange={(e) => {
                setFechaInicio(e.target.value);
                setPaginaActual(1);
              }}
              className="filtro-input"
            />
          </div>

          <div className="filtro-item">
            <label>Hasta:</label>
            <input 
              type="date"
              value={fechaFin}
              onChange={(e) => {
                setFechaFin(e.target.value);
                setPaginaActual(1);
              }}
              className="filtro-input"
            />
          </div>

          <div className="filtro-item full-width">
            <label>Buscar Referencia:</label>
            <input 
              type="text"
              value={busquedaReferencia}
              onChange={(e) => {
                setBusquedaReferencia(e.target.value);
                setPaginaActual(1);
              }}
              placeholder="Ej: M12808105"
              className="filtro-input"
            />
          </div>
        </div>
      </div>

      {/* Formulario de Gastos */}
      {mostrarFormulario && (
        <div className="formulario-gasto">
          <div className="formulario-header">
            <h3>{gastoEditando ? '✏️ Editar Gasto' : '➕ Agregar Nuevo Gasto'}</h3>
            <button className="btn-cerrar" onClick={limpiarFormulario}>×</button>
          </div>
          
          <div className="formulario-grid">
            <div className="form-group">
              <label>Fecha *</label>
              <input
                type="date"
                name="fecha"
                value={nuevoGasto.fecha}
                onChange={handleInputChange}
                required
                className={erroresValidacion.fecha ? 'input-error' : ''}
              />
              {erroresValidacion.fecha && <span className="error-message">{erroresValidacion.fecha}</span>}
            </div>
            
            <div className="form-group">
              <label>Tipo de Gasto *</label>
              <select
                name="tipo"
                value={nuevoGasto.tipo}
                onChange={handleInputChange}
                className={erroresValidacion.tipo ? 'input-error' : ''}
              >
                {tiposGasto.filter(t => t.value !== 'todos').map(tipo => (
                  <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                ))}
                <option value="factura">📄 Factura/Cuenta por Cobrar</option>
              </select>
              {erroresValidacion.tipo && <span className="error-message">{erroresValidacion.tipo}</span>}
            </div>
            
            <div className="form-group">
              <label>Persona *</label>
              <select
                name="persona"
                value={nuevoGasto.persona}
                onChange={handleInputChange}
                className={erroresValidacion.persona ? 'input-error' : ''}
              >
                {personas.map(persona => (
                  <option key={persona} value={persona}>{persona}</option>
                ))}
              </select>
              {erroresValidacion.persona && <span className="error-message">{erroresValidacion.persona}</span>}
            </div>
            
            <div className="form-group">
              <label>Cantidad *</label>
              <input
                type="number"
                name="cantidad"
                value={nuevoGasto.cantidad}
                onChange={handleInputChange}
                placeholder="0"
                step="1000"
                required
                className={erroresValidacion.cantidad ? 'input-error' : ''}
              />
              {erroresValidacion.cantidad && <span className="error-message">{erroresValidacion.cantidad}</span>}
            </div>
            
            <div className="form-group">
              <label>Referencia</label>
              <input
                type="text"
                name="referencia"
                value={nuevoGasto.referencia}
                onChange={handleInputChange}
                placeholder="Ej: M12808105"
              />
            </div>
            
            <div className="form-group">
              <label>Categoría</label>
              <select
                name="categoria"
                value={nuevoGasto.categoria}
                onChange={handleInputChange}
              >
                {categoriasGastos.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group full-width">
              <label>Descripción</label>
              <textarea
                name="descripcion"
                value={nuevoGasto.descripcion}
                onChange={handleInputChange}
                placeholder="Descripción detallada del gasto..."
                rows="3"
              />
            </div>
            
            {/* Campos adicionales para facturas/cuentas por cobrar */}
            {nuevoGasto.tipo === 'factura' && (
              <>
                <div className="form-group">
                  <label>REF DOC *</label>
                  <input
                    type="text"
                    name="refDoc"
                    value={nuevoGasto.refDoc}
                    onChange={handleInputChange}
                    placeholder="Ej: 500787688"
                    required
                    className={erroresValidacion.refDoc ? 'input-error' : ''}
                  />
                  {erroresValidacion.refDoc && <span className="error-message">{erroresValidacion.refDoc}</span>}
                </div>
                
                <div className="form-group">
                  <label>CLASE *</label>
                  <select
                    name="clase"
                    value={nuevoGasto.clase}
                    onChange={handleInputChange}
                    className={erroresValidacion.clase ? 'input-error' : ''}
                  >
                    <option value="RV">RV - Recibo de Venta</option>
                    <option value="NC">NC - Nota Crédito</option>
                    <option value="ND">ND - Nota Débito</option>
                    <option value="FV">FV - Factura de Venta</option>
                  </select>
                  {erroresValidacion.clase && <span className="error-message">{erroresValidacion.clase}</span>}
                </div>
                
                <div className="form-group">
                  <label>FH BASE (Fecha Base) *</label>
                  <input
                    type="date"
                    name="fhBase"
                    value={nuevoGasto.fhBase}
                    onChange={handleInputChange}
                    required
                    className={erroresValidacion.fhBase ? 'input-error' : ''}
                  />
                  {erroresValidacion.fhBase && <span className="error-message">{erroresValidacion.fhBase}</span>}
                </div>
                
                <div className="form-group">
                  <label>IMPORTE *</label>
                  <input
                    type="number"
                    name="importe"
                    value={nuevoGasto.importe}
                    onChange={handleInputChange}
                    placeholder="0"
                    step="1000"
                    required
                    className={erroresValidacion.importe ? 'input-error' : ''}
                  />
                  {erroresValidacion.importe && <span className="error-message">{erroresValidacion.importe}</span>}
                </div>
                
                <div className="form-group">
                  <label>ABONO</label>
                  <input
                    type="number"
                    name="abono"
                    value={nuevoGasto.abono}
                    onChange={handleInputChange}
                    placeholder="0"
                    step="1000"
                  />
                </div>
              </>
            )}
          </div>

          {/* Vista Previa del Gasto */}
          {nuevoGasto.fecha && nuevoGasto.cantidad && (
            <div className="gasto-preview">
              <h4>📋 Vista Previa del Gasto</h4>
              <div className="preview-grid">
                <div className="preview-item">
                  <span className="preview-label">Fecha:</span>
                  <span className="preview-value">{new Date(nuevoGasto.fecha).toLocaleDateString('es-CO')}</span>
                </div>
                <div className="preview-item">
                  <span className="preview-label">Tipo:</span>
                  <span className="preview-value">{tiposGasto.find(t => t.value === nuevoGasto.tipo)?.label || nuevoGasto.tipo}</span>
                </div>
                <div className="preview-item">
                  <span className="preview-label">Persona:</span>
                  <span className="preview-value">{nuevoGasto.persona}</span>
                </div>
                <div className="preview-item">
                  <span className="preview-label">Cantidad:</span>
                  <span className="preview-value amount">{formatCurrency(parseFloat(nuevoGasto.cantidad) || 0)}</span>
                </div>
              </div>
            </div>
          )}
          
          <div className="formulario-acciones">
            <button 
              className="btn btn-success" 
              onClick={agregarGasto}
            >
              💾 {gastoEditando ? 'Actualizar Gasto' : 'Guardar Gasto'}
            </button>
            <button className="btn btn-secondary" onClick={limpiarFormulario}>
              ❌ Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Sección de Gastos por Tipo */}
      {(tipoGasto === 'todos' || tipoGasto === 'nequi') && (
        <div className="seccion-gastos">
          <div className="seccion-header" onClick={() => toggleSeccion('nequi')}>
            <h2>💳 Gastos Nequi <span className="toggle-icon">{seccionesAbiertas.nequi ? '▼' : '▶'}</span></h2>
          </div>
          
          {seccionesAbiertas.nequi && (
            <>
              <div className="subseccion">
                <h3>Edwin Marín - Total: {formatCurrency(
                  datosGastos.gastosNequi['Edwin Marín']?.reduce((sum, g) => sum + g.cantidad, 0) || 0
                )}</h3>
                {datosGastos.gastosNequi['Edwin Marín']?.length > 0 ? (
                  <>
                    <div className="tabla-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Fecha</th>
                            <th>Cantidad</th>
                            <th>Referencia</th>
                            <th>Descripción</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {datosGastos.gastosNequi['Edwin Marín']?.slice(0, itemsPorPagina).map(gasto => (
                            <tr key={gasto.id}>
                              <td>{new Date(gasto.fecha).toLocaleDateString('es-CO')}</td>
                              <td className="negative">{formatCurrency(gasto.cantidad)}</td>
                              <td className="referencia">{gasto.referencia || '-'}</td>
                              <td>{gasto.descripcion || '-'}</td>
                              <td>
                                <div className="acciones-tabla">
                                  <button 
                                    className="btn-editar"
                                    onClick={() => editarGasto(gasto, 'nequi', 'Edwin Marín')}
                                    title="Editar"
                                  >
                                    ✏️
                                  </button>
                                  <button 
                                    className="btn-eliminar"
                                    onClick={() => eliminarGasto(gasto.id, 'nequi', 'Edwin Marín')}
                                    title="Eliminar"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {datosGastos.gastosNequi['Edwin Marín']?.length > itemsPorPagina && (
                      <div className="tabla-info">
                        <span>{datosGastos.gastosNequi['Edwin Marín']?.length} registro(s) total</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="tabla-vacia">
                    <p>No hay gastos registrados para Edwin Marín</p>
                  </div>
                )}
              </div>

              <div className="subseccion">
                <h3>Jhon Fredy Marín - Total: {formatCurrency(
                  datosGastos.gastosNequi['Jhon Fredy Marín']?.reduce((sum, g) => sum + g.cantidad, 0) || 0
                )}</h3>
                {datosGastos.gastosNequi['Jhon Fredy Marín']?.length > 0 ? (
                  <>
                    <div className="tabla-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Fecha</th>
                            <th>Cantidad</th>
                            <th>Referencia</th>
                            <th>Descripción</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {datosGastos.gastosNequi['Jhon Fredy Marín']?.slice(0, itemsPorPagina).map(gasto => (
                            <tr key={gasto.id}>
                              <td>{new Date(gasto.fecha).toLocaleDateString('es-CO')}</td>
                              <td className="negative">{formatCurrency(gasto.cantidad)}</td>
                              <td className="referencia">{gasto.referencia || '-'}</td>
                              <td>{gasto.descripcion || '-'}</td>
                              <td>
                                <div className="acciones-tabla">
                                  <button 
                                    className="btn-editar"
                                    onClick={() => editarGasto(gasto, 'nequi', 'Jhon Fredy Marín')}
                                    title="Editar"
                                  >
                                    ✏️
                                  </button>
                                  <button 
                                    className="btn-eliminar"
                                    onClick={() => eliminarGasto(gasto.id, 'nequi', 'Jhon Fredy Marín')}
                                    title="Eliminar"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {datosGastos.gastosNequi['Jhon Fredy Marín']?.length > itemsPorPagina && (
                      <div className="tabla-info">
                        <span>{datosGastos.gastosNequi['Jhon Fredy Marín']?.length} registro(s) total</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="tabla-vacia">
                    <p>No hay gastos registrados para Jhon Fredy Marín</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Nóminas */}
      {(tipoGasto === 'todos' || tipoGasto === 'nomina') && (
        <div className="seccion-gastos">
          <div className="seccion-header" onClick={() => toggleSeccion('nomina')}>
            <h2>👥 Nóminas y Pagos Personal <span className="toggle-icon">{seccionesAbiertas.nomina ? '▼' : '▶'}</span></h2>
          </div>

          {seccionesAbiertas.nomina && (
            <>
              {/* Resumen por empleado */}
              <div className="nominas-resumen">
                <h3>Resumen por Empleado</h3>
                <div className="empleados-grid">
                  {obtenerEmpleados().map((empleado, idx) => {
                    const resumen = calcularResumenEmpleado(empleado);
                    return (
                      <div key={idx} className="empleado-card">
                        <div className="empleado-header">
                          <h4>👤 {empleado}</h4>
                          <span className="badge-nominas">{resumen.cantidadNominas}</span>
                        </div>
                        <div className="empleado-stats">
                          <div className="stat">
                            <span className="stat-label">Total:</span>
                            <span className="stat-value">{formatCurrency(resumen.totalNominado)}</span>
                          </div>
                          <div className="stat">
                            <span className="stat-label">Promedio:</span>
                            <span className="stat-value">{formatCurrency(resumen.promedioPorNomina)}</span>
                          </div>
                        </div>
                        <button 
                          className="btn-ver-detalles"
                          onClick={() => {
                            setEmpleadoSeleccionado(empleado);
                            setNominasEmpleado(resumen.nominas);
                          }}
                        >
                          Ver detalles →
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Detalles del empleado seleccionado */}
              {empleadoSeleccionado && (
                <div className="nominas-detalles">
                  <div className="detalles-header">
                    <h3>Nóminas de {empleadoSeleccionado}</h3>
                    <button 
                      className="btn-cerrar-detalles"
                      onClick={() => {
                        setEmpleadoSeleccionado(null);
                        setNominasEmpleado([]);
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  {nominasEmpleado.length > 0 ? (
                    <>
                      <div className="tabla-container tabla-nominas-container">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Mes/Fecha</th>
                              <th>Tipo</th>
                              <th>Cantidad</th>
                              <th>Descripción</th>
                              <th>Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {nominasEmpleado.map((nomina) => (
                              <tr key={nomina.id} className="nomina-row">
                                <td>
                                  {nomina.fecha ? new Date(nomina.fecha).toLocaleDateString('es-CO') : `${getNombreMes(nomina.mes)} ${nomina.anio}`}
                                </td>
                                <td>
                                  <span className={`badge badge-${nomina.tipo === 'nómina' ? 'primary' : 'warning'}`}>
                                    {nomina.tipo}
                                  </span>
                                </td>
                                <td className="negative"><strong>{formatCurrency(nomina.cantidad)}</strong></td>
                                <td>{nomina.descripcion || '-'}</td>
                                <td>
                                  <div className="acciones-tabla">
                                    <button 
                                      className="btn-detalles"
                                      onClick={() => verDetalleNomina(nomina)}
                                      title="Ver detalles"
                                    >
                                      👁️
                                    </button>
                                    <button 
                                      className="btn-editar"
                                      onClick={() => editarGasto(nomina, 'nomina')}
                                      title="Editar"
                                    >
                                      ✏️
                                    </button>
                                    <button 
                                      className="btn-eliminar"
                                      onClick={() => eliminarGasto(nomina.id, 'nomina')}
                                      title="Eliminar"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="nominas-estadisticas">
                        <div className="stat-card">
                          <span className="stat-title">Total Nominado</span>
                          <span className="stat-amount">
                            {formatCurrency(nominasEmpleado.reduce((sum, n) => sum + (n.cantidad || 0), 0))}
                          </span>
                        </div>
                        <div className="stat-card">
                          <span className="stat-title">Registros</span>
                          <span className="stat-amount">{nominasEmpleado.length}</span>
                        </div>
                        <div className="stat-card">
                          <span className="stat-title">Promedio</span>
                          <span className="stat-amount">
                            {formatCurrency(nominasEmpleado.reduce((sum, n) => sum + (n.cantidad || 0), 0) / nominasEmpleado.length)}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="tabla-vacia">
                      <p>No hay nóminas para este empleado</p>
                    </div>
                  )}
                </div>
              )}

              {/* Lista general de nóminas si no hay empleado seleccionado */}
              {!empleadoSeleccionado && datosGastos.nominas?.length > 0 && (
                <>
                  <div className="tabla-container tabla-nominas-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Persona</th>
                          <th>Tipo</th>
                          <th>Cantidad</th>
                          <th>Mes</th>
                          <th>Descripción</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {datosGastos.nominas?.slice(0, itemsPorPagina).map(nomina => (
                          <tr key={nomina.id}>
                            <td><strong>{nomina.persona}</strong></td>
                            <td><span className="badge badge-info">{nomina.tipo}</span></td>
                            <td className="negative">{formatCurrency(nomina.cantidad)}</td>
                            <td>{getNombreMes(nomina.mes)} {nomina.anio}</td>
                            <td>{nomina.descripcion || '-'}</td>
                            <td>
                              <div className="acciones-tabla">
                                <button 
                                  className="btn-editar"
                                  onClick={() => editarGasto(nomina, 'nomina')}
                                  title="Editar"
                                >
                                  ✏️
                                </button>
                                <button 
                                  className="btn-eliminar"
                                  onClick={() => eliminarGasto(nomina.id, 'nomina')}
                                  title="Eliminar"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {datosGastos.nominas?.length > itemsPorPagina && (
                    <div className="tabla-info">
                      <span>{datosGastos.nominas?.length} registro(s) total</span>
                    </div>
                  )}
                </>
              )}

              {!empleadoSeleccionado && datosGastos.nominas?.length === 0 && (
                <div className="tabla-vacia">
                  <p>No hay nóminas registradas</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Gastos Específicos */}
      {(tipoGasto === 'todos' || tipoGasto === 'especifico') && (
        <div className="seccion-gastos">
          <div className="seccion-header" onClick={() => toggleSeccion('especifico')}>
            <h2>📊 Gastos Específicos por Categoría <span className="toggle-icon">{seccionesAbiertas.especifico ? '▼' : '▶'}</span></h2>
          </div>
          {seccionesAbiertas.especifico && (
            <div className="categorias-grid">
              {datosGastos.gastosEspecificos.map(gasto => (
                <div key={gasto.id} className="categoria-card">
                  <h4>{gasto.categoria}</h4>
                  <p className="monto-categoria negative">{formatCurrency(gasto.cantidad)}</p>
                  <span className="periodo">{getNombreMes(gasto.mes)} {gasto.anio}</span>
                  <div className="acciones-categoria">
                    <button 
                      className="btn-editar"
                      onClick={() => editarGasto(gasto, 'especifico')}
                    >
                      ✏️
                    </button>
                    <button 
                      className="btn-eliminar"
                      onClick={() => eliminarGasto(gasto.id, 'especifico')}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Créditos y Distribuidoras */}
      {(tipoGasto === 'todos' || tipoGasto === 'credito') && (
        <div className="seccion-gastos">
          <div className="seccion-header" onClick={() => toggleSeccion('credito')}>
            <h2>🏦 Créditos y Distribuidoras <span className="toggle-icon">{seccionesAbiertas.credito ? '▼' : '▶'}</span></h2>
          </div>
          {seccionesAbiertas.credito && (
            <div className="creditos-grid">
              {datosGastos.creditos.map(credito => (
                <div key={credito.id} className="credito-card">
                  <div className="credito-header">
                    <h4>{credito.distribuidora}</h4>
                    <span className="badge badge-warning">{credito.tipo}</span>
                  </div>
                  <div className="credito-info">
                    <div className="info-item">
                      <span className="label">Próximo Pago:</span>
                      <span className="value">{formatCurrency(credito.pago)}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Cartera Pendiente:</span>
                      <span className="value">{formatCurrency(credito.cartera)}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Fecha Pago:</span>
                      <span className="value fecha">{credito.fechaPago}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Facturas y Cuentas por Cobrar */}
      {(tipoGasto === 'todos' || tipoGasto === 'factura') && datosGastos.facturas && (
        <div className="seccion-gastos">
          <div className="seccion-header" onClick={() => toggleSeccion('factura')}>
            <h2>📄 Facturas y Cuentas por Cobrar <span className="toggle-icon">{seccionesAbiertas.factura !== false ? '▼' : '▶'}</span></h2>
          </div>
          {seccionesAbiertas.factura !== false && (
            <>
              <div className="tabla-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>REF DOC</th>
                      <th>CLASE</th>
                      <th>FH BASE</th>
                      <th>IMPORTE</th>
                      <th>ABONO</th>
                      <th>A PAGAR</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datosGastos.facturas?.map(factura => (
                      <tr key={factura.id} className={factura.clase === 'NC' ? 'factura-nc' : ''}>
                        <td className="referencia">{factura.refDoc}</td>
                        <td>
                          <span className={`badge badge-${factura.clase === 'NC' ? 'danger' : 'info'}`}>
                            {factura.clase}
                          </span>
                        </td>
                        <td>{factura.fhBase ? new Date(factura.fhBase).toLocaleDateString('es-CO') : '-'}</td>
                        <td className={factura.importe < 0 ? 'negative' : 'positive'}>
                          {formatCurrency(factura.importe)}
                        </td>
                        <td className="positive">{formatCurrency(factura.abono)}</td>
                        <td className={factura.aPagar < 0 ? 'negative' : 'positive'}>
                          {formatCurrency(factura.aPagar)}
                        </td>
                        <td>
                          <div className="acciones-tabla">
                            <button 
                              className="btn-editar"
                              onClick={() => editarGasto(factura, 'factura')}
                              title="Editar"
                            >
                              ✏️
                            </button>
                            <button 
                              className="btn-eliminar"
                              onClick={() => eliminarGasto(factura.id, 'factura')}
                              title="Eliminar"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {datosGastos.facturas?.length > itemsPorPagina && (
                <div className="tabla-info">
                  <span>{datosGastos.facturas?.length} factura(s) total</span>
                </div>
              )}
            </>
          )}
          {datosGastos.facturas?.length === 0 && (
            <div className="tabla-vacia">
              <p>No hay facturas registradas</p>
            </div>
          )}
        </div>
      )}

      {/* Resumen por Categorías */}
      <div className="seccion-gastos">
        <h2>📈 Resumen por Categorías</h2>
        <div className="resumen-categorias">
          {datosGastos.gastosEspecificos.map(gasto => (
            <div key={gasto.id} className="categoria-resumen">
              <div className="categoria-info">
                <span className="categoria-nombre">{gasto.categoria}</span>
                <span className="categoria-monto">{formatCurrency(gasto.cantidad)}</span>
              </div>
              <div className="categoria-bar">
                <div 
                  className="categoria-progreso"
                  style={{
                    width: `${(gasto.cantidad / 16050400) * 100}%`
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Botón Scroll to Top */}
      <div className="footer-actions">
        <button className="btn btn-scroll-top" onClick={scrollToTop}>
          ⬆️ Ir al Inicio
        </button>
      </div>
    </div>
  );
};

export default GastosScreen;