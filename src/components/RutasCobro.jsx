import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './RutasCobro.css';

const PAGE_SIZE = 1000;

const toNumber = (value) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const fetchAllRows = async (table, orderColumn = 'id', ascending = false) => {
  let from = 0;
  let allRows = [];

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order(orderColumn, { ascending })
      .range(from, to);

    if (error) throw error;

    const batch = data || [];
    allRows = allRows.concat(batch);

    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return allRows;
};

const RutasCobro = () => {
  const navigate = useNavigate();
  const [clientesConDeuda, setClientesConDeuda] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroZona, setFiltroZona] = useState('');
  const [filtroVendedor, setFiltroVendedor] = useState('');
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [ordenamiento, setOrdenamiento] = useState('prioridad');
  const [rutaGenerada, setRutaGenerada] = useState([]);
  const [mostrarMapa, setMostrarMapa] = useState(false);
  const [mostrarRecordatorios, setMostrarRecordatorios] = useState(false);
  const [reporteDiario, setReporteDiario] = useState(null);
  const [mostrarListaClientes, setMostrarListaClientes] = useState(true);
  const [analisisOpen, setAnalisisOpen] = useState(false);

  // Nuevos estados para historial
  const [mostrarHistorialVisitas, setMostrarHistorialVisitas] = useState(false);
  const [historialVisitas, setHistorialVisitas] = useState([]);
  const [mostrarClientesMenosVisitados, setMostrarClientesMenosVisitados] = useState(false);
  const [clientesMenosVisitados, setClientesMenosVisitados] = useState([]);
  const [mostrarClientesSinVisitar, setMostrarClientesSinVisitar] = useState(false);
  const [clientesSinVisitar, setClientesSinVisitar] = useState([]);

  // Nuevo estado para el modal de detalles de deuda
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [mostrarDetallesDeuda, setMostrarDetallesDeuda] = useState(false);
  const [mostrarMapaDeuda, setMostrarMapaDeuda] = useState(false);

  // Cargar clientes con deuda
  useEffect(() => {
    cargarDatosCompletos();
  }, []);

  const cargarDatosCompletos = async () => {
    try {
      setCargando(true);
      await Promise.all([
        cargarClientesConDeuda(),
        cargarReporteDiario()
      ]);
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setCargando(false);
    }
  };

  // Función para cargar clientes con facturas mayores a 60 días Y saldo pendiente
  const cargarClientesMas60Dias = async () => {
    try {
      let facturasData = [];
      let abonosData = [];

      try {
        facturasData = await fetchAllRows('facturas', 'id', false);
        abonosData = await fetchAllRows('abonos', 'id', false);
      } catch (supabaseError) {
        console.error('Error cargando facturas/abonos desde Supabase:', supabaseError);
        facturasData = JSON.parse(localStorage.getItem('facturas') || '[]');
        abonosData = JSON.parse(localStorage.getItem('abonos') || '[]');
      }

      const hoy = new Date();
      
      // Filtrar facturas con más de 60 días Y que tengan saldo pendiente
      const facturasMas60DiasConSaldo = facturasData.filter(factura => {
        const fechaFactura = new Date(factura.fecha);
        const diferenciaDias = Math.floor((hoy - fechaFactura) / (1000 * 60 * 60 * 24));
        
        // Verificar si tiene más de 60 días
        if (diferenciaDias <= 60) return false;
        
        // Calcular saldo pendiente
        const facturaId = Number(factura.id);
        const abonosFactura = abonosData.filter(abono => Number(abono.factura_id) === facturaId);
        const totalAbonado = abonosFactura.reduce((sum, abono) => sum + toNumber(abono.monto), 0);
        const saldoPendiente = toNumber(factura.total) - totalAbonado;
        
        // Solo incluir facturas con saldo pendiente > 0
        return saldoPendiente > 0;
      });

      if (facturasMas60DiasConSaldo.length === 0) {
        alert('✅ No hay facturas mayores a 60 días de antigüedad con saldo pendiente');
        return [];
      }

      // Agrupar por cliente
      const clientesConFacturasAntiguas = {};
      
      facturasMas60DiasConSaldo.forEach(factura => {
        // Calcular saldo pendiente para esta factura
        const facturaId = Number(factura.id);
        const abonosFactura = abonosData.filter(abono => Number(abono.factura_id) === facturaId);
        const totalAbonado = abonosFactura.reduce((sum, abono) => sum + toNumber(abono.monto), 0);
        const saldoPendiente = toNumber(factura.total) - totalAbonado;
        
        if (!clientesConFacturasAntiguas[factura.cliente]) {
          clientesConFacturasAntiguas[factura.cliente] = {
            nombre: factura.cliente,
            direccion: factura.direccion || 'Sin dirección',
            telefono: factura.telefono || 'Sin teléfono',
            facturasAntiguas: [],
            totalDeuda: 0,
            diasMaximo: 0,
            totalFacturas: 0,
            vendedor: factura.vendedor || 'Sin vendedor'
          };
        }
        
        const diasAntiguedad = Math.floor((hoy - new Date(factura.fecha)) / (1000 * 60 * 60 * 24));
        clientesConFacturasAntiguas[factura.cliente].facturasAntiguas.push({
          id: factura.id,
          fecha: factura.fecha,
          total: factura.total,
          saldoPendiente: saldoPendiente,
          abonado: totalAbonado,
          diasAntiguedad: diasAntiguedad,
          vendedor: factura.vendedor
        });
        
        clientesConFacturasAntiguas[factura.cliente].totalDeuda += saldoPendiente;
        clientesConFacturasAntiguas[factura.cliente].totalFacturas += 1;
        if (diasAntiguedad > clientesConFacturasAntiguas[factura.cliente].diasMaximo) {
          clientesConFacturasAntiguas[factura.cliente].diasMaximo = diasAntiguedad;
        }
      });

      // Convertir a array y ordenar por días de antigüedad (mayor a menor)
      const clientesArray = Object.values(clientesConFacturasAntiguas)
        .sort((a, b) => b.diasMaximo - a.diasMaximo);

      return clientesArray;

    } catch (error) {
      console.error('Error cargando clientes con más de 60 días:', error);
      return [];
    }
  };

  // Función para cargar clientes sin visitar o con más de 30 días sin visita
  const cargarClientesSinVisitar30Dias = async () => {
    try {
      let visitasData = [];
      
      // Intentar cargar desde Supabase
      const { data: visitas, error } = await supabase
        .from('visits_cobro')
        .select('*')
        .order('fecha_visita', { ascending: false });

      if (!error && visitas) {
        visitasData = visitas;
      } else {
        // Fallback a localStorage
        visitasData = JSON.parse(localStorage.getItem('visitasCobro') || '[]');
      }

      const hoy = new Date();
      const clientesConUltimaVisita = {};

      // Procesar visitas para obtener la última visita de cada cliente
      visitasData.forEach(visita => {
        const nombreCliente = visita.cliente_nombre || visita.clienteNombre;
        const fechaVisita = new Date(visita.fecha_visita || visita.fecha);
        
        if (!clientesConUltimaVisita[nombreCliente] || 
            fechaVisita > new Date(clientesConUltimaVisita[nombreCliente].ultimaVisita)) {
          clientesConUltimaVisita[nombreCliente] = {
            nombre: nombreCliente,
            ultimaVisita: fechaVisita,
            diasDesdeUltimaVisita: Math.floor((hoy - fechaVisita) / (1000 * 60 * 60 * 24)),
            direccion: visita.direccion,
            vendedor: visita.vendedor,
            deuda: visita.deuda_pendiente || visita.deuda
          };
        }
      });

      // Combinar con clientes con deuda actual
      const clientesConInfoCompleta = clientesConDeuda.map(cliente => {
        const infoVisita = clientesConUltimaVisita[cliente.nombre];
        
        if (infoVisita) {
          return {
            ...cliente,
            ultimaVisita: infoVisita.ultimaVisita,
            diasDesdeUltimaVisita: infoVisita.diasDesdeUltimaVisita,
            necesitaVisitaUrgente: infoVisita.diasDesdeUltimaVisita > 30
          };
        } else {
          // Cliente nunca visitado
          return {
            ...cliente,
            ultimaVisita: null,
            diasDesdeUltimaVisita: null,
            necesitaVisitaUrgente: true
          };
        }
      });

      // Filtrar clientes que necesitan visita urgente (más de 30 días sin visita o nunca visitados)
      const clientesUrgentes = clientesConInfoCompleta
        .filter(cliente => cliente.necesitaVisitaUrgente)
        .sort((a, b) => {
          // Primero los nunca visitados, luego por días desde última visita
          if (!a.ultimaVisita && !b.ultimaVisita) return 0;
          if (!a.ultimaVisita) return -1;
          if (!b.ultimaVisita) return 1;
          return b.diasDesdeUltimaVisita - a.diasDesdeUltimaVisita;
        });

      setClientesSinVisitar(clientesUrgentes);
      return clientesUrgentes;

    } catch (error) {
      console.error('Error cargando clientes sin visitar:', error);
      return [];
    }
  };

  // Función para cargar historial de visitas
  const cargarHistorialVisitas = async () => {
    try {
      // Intentar cargar desde Supabase
      const { data: visitas, error } = await supabase
        .from('visits_cobro')
        .select('*')
        .order('fecha_visita', { ascending: false })
        .limit(50);

      if (!error && visitas) {
        setHistorialVisitas(visitas);
      } else {
        // Fallback a localStorage
        const visitasStorage = JSON.parse(localStorage.getItem('visitasCobro') || '[]');
        const visitasOrdenadas = visitasStorage
          .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
          .slice(0, 50);
        setHistorialVisitas(visitasOrdenadas);
      }
    } catch (error) {
      console.error('Error cargando historial:', error);
      // Fallback final
      const visitasStorage = JSON.parse(localStorage.getItem('visitasCobro') || '[]');
      setHistorialVisitas(visitasStorage.slice(0, 50));
    }
  };

  // Función para cargar clientes menos visitados
  const cargarClientesMenosVisitados = async () => {
    try {
      let visitas = [];

      // Intentar cargar desde Supabase
      const { data: visitasData, error } = await supabase
        .from('visits_cobro')
        .select('*');

      if (!error && visitasData) {
        visitas = visitasData;
      } else {
        // Fallback a localStorage
        visitas = JSON.parse(localStorage.getItem('visitasCobro') || '[]');
      }

      // Contar visitas por cliente
      const visitasPorCliente = {};
      
      visitas.forEach(visita => {
        const nombreCliente = visita.cliente_nombre || visita.clienteNombre;
        if (nombreCliente) {
          visitasPorCliente[nombreCliente] = (visitasPorCliente[nombreCliente] || 0) + 1;
        }
      });

      // Convertir a array y ordenar por menos visitados
      const clientesConConteo = Object.entries(visitasPorCliente)
        .map(([nombre, conteo]) => ({
          nombre,
          visitas: conteo,
          ultimaVisita: visitas.find(v => 
            (v.cliente_nombre || v.clienteNombre) === nombre
          )?.fecha_visita || visitas.find(v => 
            (v.cliente_nombre || v.clienteNombre) === nombre
          )?.fecha
        }))
        .sort((a, b) => a.visitas - b.visitas)
        .slice(0, 15);

      setClientesMenosVisitados(clientesConConteo);
      
    } catch (error) {
      console.error('Error cargando clientes menos visitados:', error);
    }
  };

  // Función para calcular días desde última visita
  const calcularDiasDesdeUltimaVisita = (fechaVisita) => {
    if (!fechaVisita) return 'Nunca visitado';
    
    const hoy = new Date();
    const ultimaVisita = new Date(fechaVisita);
    const diferenciaMs = hoy - ultimaVisita;
    const dias = Math.floor(diferenciaMs / (1000 * 60 * 60 * 24));
    
    if (dias === 0) return 'Hoy';
    if (dias === 1) return 'Ayer';
    return `${dias} día${dias !== 1 ? 's' : ''}`;
  };

  // Función para obtener el nivel de urgencia
  const obtenerNivelUrgencia = (diasDesdeUltimaVisita, nuncaVisitado) => {
    if (nuncaVisitado) return 'alta';
    if (diasDesdeUltimaVisita > 60) return 'alta';
    if (diasDesdeUltimaVisita > 30) return 'media';
    return 'baja';
  };

  // Función para formatear fecha
  const formatFecha = (fecha) => {
    if (!fecha) return 'Sin fecha';
    return new Date(fecha).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const obtenerFechaAbono = (abono) => {
    return abono?.fecha || abono?.fecha_abono || abono?.created_at || abono?.createdAt || null;
  };

  const cargarClientesConDeuda = async () => {
    try {
      // Cargar facturas y abonos completos (sin límite de 1000 filas)
      const [facturas, abonos] = await Promise.all([
        fetchAllRows('facturas', 'id', false),
        fetchAllRows('abonos', 'id', false)
      ]);

      // Cargar visitas desde Supabase
      const { data: visitas, error: visitasError } = await supabase
        .from('visits_cobro')
        .select('*');
      
      if (visitasError) {
        console.log('Tabla visits_cobro no encontrada, usando localStorage');
        throw visitasError;
      }

      // Calcular deudas por cliente
      const deudasPorCliente = {};
      
      facturas.forEach(factura => {
        const facturaId = Number(factura.id);
        const abonosFactura = abonos.filter(abono => Number(abono.factura_id) === facturaId);
        const totalAbonado = abonosFactura.reduce((sum, abono) => sum + toNumber(abono.monto), 0);
        const saldo = toNumber(factura.total) - totalAbonado;
        
        if (saldo > 0) {
          if (!deudasPorCliente[factura.cliente]) {
            deudasPorCliente[factura.cliente] = {
              nombre: factura.cliente,
              direccion: factura.direccion || 'Sin dirección',
              telefono: factura.telefono || 'Sin teléfono',
              totalDeuda: 0,
              facturasPendientes: [],
              abonosPendientes: [],
              ultimaFechaAbono: null,
              facturaMasAntigua: factura.fecha,
              ultimaFactura: factura.fecha,
              zona: extraerZona(factura.direccion),
              vendedor: factura.vendedor || 'Sin vendedor',
              clienteId: factura.cliente_id || factura.id.toString()
            };
          }
          
          deudasPorCliente[factura.cliente].totalDeuda += saldo;
          deudasPorCliente[factura.cliente].facturasPendientes.push({
            id: factura.id,
            fecha: factura.fecha,
            total: factura.total,
            saldo: saldo,
            vendedor: factura.vendedor
          });

          abonosFactura.forEach(abono => {
            const fechaAbono = obtenerFechaAbono(abono);
            deudasPorCliente[factura.cliente].abonosPendientes.push({
              facturaId: factura.id,
              fecha: fechaAbono,
              monto: toNumber(abono.monto)
            });

            if (fechaAbono) {
              const fechaActual = new Date(fechaAbono);
              const fechaRegistrada = deudasPorCliente[factura.cliente].ultimaFechaAbono
                ? new Date(deudasPorCliente[factura.cliente].ultimaFechaAbono)
                : null;

              if (!fechaRegistrada || fechaActual > fechaRegistrada) {
                deudasPorCliente[factura.cliente].ultimaFechaAbono = fechaAbono;
              }
            }
          });
          
          // Actualizar fechas
          if (new Date(factura.fecha) < new Date(deudasPorCliente[factura.cliente].facturaMasAntigua)) {
            deudasPorCliente[factura.cliente].facturaMasAntigua = factura.fecha;
          }
          if (new Date(factura.fecha) > new Date(deudasPorCliente[factura.cliente].ultimaFactura)) {
            deudasPorCliente[factura.cliente].ultimaFactura = factura.fecha;
          }
        }
      });

      // Convertir a array y calcular prioridad
      const clientesArray = Object.values(deudasPorCliente).map(cliente => {
        const diasDesdePrimeraFactura = Math.floor(
          (new Date() - new Date(cliente.facturaMasAntigua)) / (1000 * 60 * 60 * 24)
        );
        const diasDesdeUltimaFactura = Math.floor(
          (new Date() - new Date(cliente.ultimaFactura)) / (1000 * 60 * 60 * 24)
        );

        // Verificar si el cliente fue visitado hoy (desde Supabase)
        const visitadoHoy = visitas?.some(visita => 
          visita.cliente_nombre === cliente.nombre && 
          new Date(visita.fecha_visita).toDateString() === new Date().toDateString()
        );

        // Calcular puntuación de prioridad (mayor = más urgente)
        let puntuacion = 0;
        const cantidadFacturas = cliente.facturasPendientes.length;
        const maxFactura = Math.max(
          ...cliente.facturasPendientes.map(f => f.total || f.saldo || 0),
          0
        );

        // Factor cantidad de facturas (35%)
        puntuacion += Math.min(35, cantidadFacturas * 3.5);

        // Factor valor alto (35%)
        puntuacion += Math.min(35, (maxFactura / 100000) * 35);

        // Factor antigüedad (30%)
        if (diasDesdePrimeraFactura > 90) puntuacion += 30;
        else if (diasDesdePrimeraFactura > 60) puntuacion += 20;
        else if (diasDesdePrimeraFactura > 30) puntuacion += 10;

        const prioridadCalculada = calcularPrioridadRuta(diasDesdePrimeraFactura, puntuacion);

        return {
          ...cliente,
          diasDesdePrimeraFactura,
          diasDesdeUltimaFactura,
          puntuacionPrioridad: prioridadCalculada.puntuacion,
          nivelPrioridad: prioridadCalculada.nivel,
          visitadoHoy: visitadoHoy || false,
          necesitaRecordatorio: diasDesdePrimeraFactura > 60
        };
      });

      setClientesConDeuda(clientesArray);
      
    } catch (error) {
      console.error("Error cargando clientes con deuda:", error);
      // Fallback a localStorage si hay error
      cargarDesdeLocalStorage();
    }
  };

  // Fallback a localStorage
  const cargarDesdeLocalStorage = () => {
    try {
      const facturasStorage = JSON.parse(localStorage.getItem('facturas') || '[]');
      const abonosStorage = JSON.parse(localStorage.getItem('abonos') || '[]');
      
      // Calcular deudas básicas desde localStorage
      const deudasPorCliente = {};
      
      facturasStorage.forEach(factura => {
        const facturaId = Number(factura.id);
        const abonosFactura = abonosStorage.filter(abono => Number(abono.factura_id) === facturaId);
        const totalAbonado = abonosFactura.reduce((sum, abono) => sum + toNumber(abono.monto), 0);
        const saldo = toNumber(factura.total) - totalAbonado;
        
        if (saldo > 0) {
          if (!deudasPorCliente[factura.cliente]) {
            deudasPorCliente[factura.cliente] = {
              nombre: factura.cliente,
              direccion: factura.direccion || 'Sin dirección',
              telefono: factura.telefono || 'Sin teléfono',
              totalDeuda: 0,
              facturasPendientes: [],
              abonosPendientes: [],
              ultimaFechaAbono: null,
              facturaMasAntigua: factura.fecha,
              ultimaFactura: factura.fecha,
              zona: extraerZona(factura.direccion),
              vendedor: factura.vendedor || 'Sin vendedor',
              clienteId: factura.id.toString()
            };
          }
          
          deudasPorCliente[factura.cliente].totalDeuda += saldo;
          deudasPorCliente[factura.cliente].facturasPendientes.push({
            id: factura.id,
            fecha: factura.fecha,
            total: factura.total,
            saldo: saldo,
            vendedor: factura.vendedor
          });

          abonosFactura.forEach(abono => {
            const fechaAbono = obtenerFechaAbono(abono);
            deudasPorCliente[factura.cliente].abonosPendientes.push({
              facturaId: factura.id,
              fecha: fechaAbono,
              monto: toNumber(abono.monto)
            });

            if (fechaAbono) {
              const fechaActual = new Date(fechaAbono);
              const fechaRegistrada = deudasPorCliente[factura.cliente].ultimaFechaAbono
                ? new Date(deudasPorCliente[factura.cliente].ultimaFechaAbono)
                : null;

              if (!fechaRegistrada || fechaActual > fechaRegistrada) {
                deudasPorCliente[factura.cliente].ultimaFechaAbono = fechaAbono;
              }
            }
          });
        }
      });

      const clientesArray = Object.values(deudasPorCliente).map(cliente => {
        const diasDesdePrimeraFactura = Math.floor(
          (new Date() - new Date(cliente.facturaMasAntigua)) / (1000 * 60 * 60 * 24)
        );
        const diasDesdeUltimaFactura = Math.floor(
          (new Date() - new Date(cliente.ultimaFactura)) / (1000 * 60 * 60 * 24)
        );

        // Calcular puntuación de prioridad
        let puntuacion = 0;
        const cantidadFacturas = cliente.facturasPendientes.length;
        const maxFactura = Math.max(
          ...cliente.facturasPendientes.map(f => f.total || f.saldo || 0),
          0
        );

        puntuacion += Math.min(35, cantidadFacturas * 3.5);
        puntuacion += Math.min(35, (maxFactura / 100000) * 35);
        if (diasDesdePrimeraFactura > 90) puntuacion += 30;
        else if (diasDesdePrimeraFactura > 60) puntuacion += 20;
        else if (diasDesdePrimeraFactura > 30) puntuacion += 10;

        const prioridadCalculada = calcularPrioridadRuta(diasDesdePrimeraFactura, puntuacion);

        return {
          ...cliente,
          diasDesdePrimeraFactura,
          diasDesdeUltimaFactura,
          puntuacionPrioridad: prioridadCalculada.puntuacion,
          nivelPrioridad: prioridadCalculada.nivel,
          visitadoHoy: false,
          necesitaRecordatorio: diasDesdePrimeraFactura > 60
        };
      });

      setClientesConDeuda(clientesArray);
      
    } catch (error) {
      console.error('Error cargando desde localStorage:', error);
    }
  };

  // Función para extraer zona de la dirección
  const extraerZona = (direccion) => {
    if (!direccion) return 'Sin zona';
    
    const direccionLower = direccion.toLowerCase();
    const zonas = ['norte', 'sur', 'este', 'oeste', 'centro', 'oriente', 'occidente'];
    
    for (let zona of zonas) {
      if (direccionLower.includes(zona)) {
        return zona.charAt(0).toUpperCase() + zona.slice(1);
      }
    }
    
    return 'Otra zona';
  };

  // Regla de negocio para rutas: más de 10 días pasa a prioridad alta.
  const calcularPrioridadRuta = (diasDesdePrimeraFactura, puntuacionBase) => {
    const puntuacionNormalizada = Math.min(100, puntuacionBase);

    if (diasDesdePrimeraFactura > 10) {
      return {
        nivel: 'Alta',
        puntuacion: Math.max(80, puntuacionNormalizada)
      };
    }

    return {
      nivel: calcularNivelPrioridad(puntuacionNormalizada),
      puntuacion: puntuacionNormalizada
    };
  };

  // Calcular nivel de prioridad
  const calcularNivelPrioridad = (puntuacion) => {
    if (puntuacion >= 80) return 'Alta';
    if (puntuacion >= 60) return 'Media-Alta';
    if (puntuacion >= 40) return 'Media';
    if (puntuacion >= 20) return 'Baja';
    return 'Muy Baja';
  };

  // Función para buscar cliente
  const buscarCliente = (termino) => {
    if (!termino.trim()) return clientesConDeuda;
    
    const terminoLower = termino.toLowerCase().trim();
    
    return clientesConDeuda.filter(cliente => 
      cliente.nombre.toLowerCase().includes(terminoLower) ||
      cliente.direccion.toLowerCase().includes(terminoLower) ||
      cliente.telefono.toLowerCase().includes(terminoLower) ||
      cliente.vendedor.toLowerCase().includes(terminoLower) ||
      cliente.zona.toLowerCase().includes(terminoLower)
    );
  };

  // Función para limpiar búsqueda
  const limpiarBusqueda = () => {
    setBusquedaCliente('');
  };

  // Función para marcar cliente como visitado
  const marcarComoVisitado = async (cliente) => {
    try {
      // Intentar con Supabase primero
      const { error } = await supabase
        .from('visits_cobro')
        .insert([
          {
            cliente_id: cliente.clienteId,
            cliente_nombre: cliente.nombre,
            direccion: cliente.direccion,
            deuda_pendiente: cliente.totalDeuda,
            vendedor: cliente.vendedor,
            resultado: 'visitado',
            observaciones: 'Visita de cobranza realizada'
          }
        ]);

      if (error) throw error;

      // Actualizar estado local
      actualizarEstadoVisita(cliente.nombre, true);
      alert(`✅ ${cliente.nombre} marcado como visitado`);

      // Recargar clientes sin visitar si el panel está abierto
      if (mostrarClientesSinVisitar) {
        await cargarClientesSinVisitar30Dias();
      }

    } catch (error) {
      console.error('Error al registrar visita en Supabase:', error);
      // Fallback a localStorage
      marcarComoVisitadoLocalStorage(cliente);
    }
  };

  // Fallback a localStorage
  const marcarComoVisitadoLocalStorage = (cliente) => {
    try {
      const visitasHoy = JSON.parse(localStorage.getItem('visitasCobro') || '[]');
      
      const nuevaVisita = {
        id: Date.now(),
        clienteNombre: cliente.nombre,
        fecha: new Date().toISOString(),
        deuda: cliente.totalDeuda,
        direccion: cliente.direccion,
        vendedor: cliente.vendedor
      };
      
      visitasHoy.push(nuevaVisita);
      localStorage.setItem('visitasCobro', JSON.stringify(visitasHoy));

      actualizarEstadoVisita(cliente.nombre, true);
      alert(`✅ ${cliente.nombre} marcado como visitado`);

      // Recargar clientes sin visitar si el panel está abierto
      if (mostrarClientesSinVisitar) {
        cargarClientesSinVisitar30Dias();
      }

    } catch (error) {
      console.error('Error al registrar visita en localStorage:', error);
      alert('Error al registrar la visita');
    }
  };

  const actualizarEstadoVisita = (nombreCliente, visitado) => {
    setClientesConDeuda(prev => 
      prev.map(c => 
        c.nombre === nombreCliente 
          ? { ...c, visitadoHoy: visitado }
          : c
      )
    );

    if (rutaGenerada.length > 0) {
      setRutaGenerada(prev => 
        prev.map(paso => 
          paso.tipo === 'cliente' && paso.nombre === nombreCliente
            ? { ...paso, visitadoHoy: visitado }
            : paso
        )
      );
    }
  };

  // Cargar reporte diario
  const cargarReporteDiario = async () => {
    try {
      const hoy = new Date().toISOString().split('T')[0];
      
      const { data: visitasHoy, error } = await supabase
        .from('visits_cobro')
        .select('*')
        .gte('fecha_visita', `${hoy}T00:00:00`)
        .lte('fecha_visita', `${hoy}T23:59:59`);

      if (!error && visitasHoy) {
        setReporteDiario({
          totalVisitas: visitasHoy.length,
          visitas: visitasHoy
        });
      }
    } catch (error) {
      console.error('Error cargando reporte diario:', error);
    }
  };

  // Función para generar recordatorios
  const generarRecordatorios = () => {
    const clientesSinVisitar = clientesConDeuda
      .filter(cliente => !cliente.visitadoHoy && cliente.diasDesdePrimeraFactura > 30)
      .sort((a, b) => b.diasDesdePrimeraFactura - a.diasDesdePrimeraFactura);

    return clientesSinVisitar;
  };

  const obtenerMaxFacturaTotal = (cliente) => {
    if (!cliente?.facturasPendientes?.length) return 0;
    return Math.max(
      ...cliente.facturasPendientes.map(f => f.total || f.saldo || 0),
      0
    );
  };

  const compararClientesRuta = (a, b) => {
    const aSinAbonos = !(a.abonosPendientes?.length);
    const bSinAbonos = !(b.abonosPendientes?.length);

    if (aSinAbonos !== bSinAbonos) return aSinAbonos ? -1 : 1;

    if (b.diasDesdeUltimaFactura !== a.diasDesdeUltimaFactura) {
      return b.diasDesdeUltimaFactura - a.diasDesdeUltimaFactura;
    }

    const maxA = obtenerMaxFacturaTotal(a);
    const maxB = obtenerMaxFacturaTotal(b);
    if (maxB !== maxA) return maxB - maxA;

    return b.totalDeuda - a.totalDeuda;
  };

  const calcularScoreClienteRuta = (cliente) => {
    const sinAbonos = !(cliente.abonosPendientes?.length) ? 1 : 0;
    const maxFactura = obtenerMaxFacturaTotal(cliente);
    return (sinAbonos * 1000000) + (cliente.diasDesdeUltimaFactura * 1000) + maxFactura;
  };

  const obtenerTopClientesPorDeuda = (cantidad = 10) => {
    return [...clientesConDeuda]
      .sort((a, b) => b.totalDeuda - a.totalDeuda)
      .slice(0, cantidad);
  };

  // Función para generar ruta optimizada
  const generarRutaOptimizada = () => {
    if (clientesFiltrados.length === 0) {
      alert('No hay clientes con los filtros actuales. Limpia filtros o ajusta la búsqueda.');
      return;
    }

    // Agrupar por zona
    const clientesPorZona = {};
    
    clientesFiltrados.forEach(cliente => {
      if (!clientesPorZona[cliente.zona]) {
        clientesPorZona[cliente.zona] = [];
      }
      clientesPorZona[cliente.zona].push(cliente);
    });

    // Ordenar zonas por prioridad basada en antigüedad, facturas altas y falta de abonos
    const zonasOrdenadas = Object.keys(clientesPorZona).sort((a, b) => {
      const scoreA = clientesPorZona[a].reduce((sum, c) => sum + calcularScoreClienteRuta(c), 0);
      const scoreB = clientesPorZona[b].reduce((sum, c) => sum + calcularScoreClienteRuta(c), 0);
      return scoreB - scoreA;
    });

    // Construir ruta optimizada
    const ruta = [];
    
    zonasOrdenadas.forEach(zona => {
      // Agregar separador de zona
      ruta.push({ 
        tipo: 'zona', 
        nombre: `🚗 ZONA ${zona}`,
        info: `${clientesPorZona[zona].length} clientes`
      });
      
      // Ordenar clientes dentro de la zona por: sin abonos, antigüedad última factura, factura alta
      const clientesEnZona = [...clientesPorZona[zona]].sort(compararClientesRuta);
      
      clientesEnZona.forEach((cliente, index) => {
        ruta.push({ 
          tipo: 'cliente', 
          ...cliente,
          ordenEnRuta: ruta.length
        });
      });
    });

    setRutaGenerada(ruta);
    setMostrarMapa(true);
    
    // Scroll a la sección de ruta
    setTimeout(() => {
      document.querySelector('.ruta-generada-section')?.scrollIntoView({ 
        behavior: 'smooth' 
      });
    }, 500);
  };

  // Función para ver facturas del cliente
  const verFacturasCliente = (cliente) => {
    navigate('/facturas', { 
      state: { 
        filtroCliente: cliente.nombre
      } 
    });
  };

  // Función para ver detalles completos de la deuda
  const verDetallesDeuda = (cliente) => {
    setClienteSeleccionado(cliente);
    setMostrarDetallesDeuda(true);
  };

  // Función para cerrar modal de detalles
  const cerrarDetallesDeuda = () => {
    setMostrarDetallesDeuda(false);
    setClienteSeleccionado(null);
  };

  // Función para ir a facturas desde detalles
  const irAFacturasDesdeDetalles = () => {
    cerrarDetallesDeuda();
    verFacturasCliente(clienteSeleccionado);
  };

  const irAFacturaDirecta = (facturaId) => {
    cerrarDetallesDeuda();
    navigate(`/factura/${facturaId}`);
  };

  const irARutaGenerada = () => {
    document.querySelector('.ruta-generada-section')?.scrollIntoView({ 
      behavior: 'smooth' 
    });
  };

  const irAFiltros = () => {
    document.querySelector('.controles-principales')?.scrollIntoView({ 
      behavior: 'smooth' 
    });
  };

  // Filtrar y ordenar clientes
  const clientesFiltrados = buscarCliente(busquedaCliente)
    .filter(cliente => 
      (filtroZona === '' || cliente.zona === filtroZona) &&
      (filtroVendedor === '' || cliente.vendedor === filtroVendedor)
    )
    .sort((a, b) => {
      switch (ordenamiento) {
        case 'deuda':
          return b.totalDeuda - a.totalDeuda;
        case 'antiguedad':
          return b.diasDesdeUltimaFactura - a.diasDesdeUltimaFactura;
        case 'zona':
          return a.zona.localeCompare(b.zona);
        case 'cliente':
          return a.nombre.localeCompare(b.nombre);
        case 'vendedor':
          return a.vendedor.localeCompare(b.vendedor);
        default: // 'prioridad'
          return b.puntuacionPrioridad - a.puntuacionPrioridad;
      }
    });

  // Formatear moneda
  const formatMoneda = (valor) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(valor || 0);
  };

  const cerrarPanelAnalisisSiAplica = (cerrarPanel) => {
    if (cerrarPanel) {
      setAnalisisOpen(false);
    }
  };

  const construirMensajeClientesMas60Dias = (clientesMas60Dias) => {
    let mensaje = `📋 CLIENTES CON FACTURAS >60 DÍAS Y SALDO PENDIENTE\n\n`;
    mensaje += `Total: ${clientesMas60Dias.length} clientes\n\n`;

    clientesMas60Dias.slice(0, 25).forEach((cliente, index) => {
      mensaje += `${index + 1}. ${cliente.nombre}\n`;
      mensaje += `   📍 ${cliente.direccion}\n`;
      mensaje += `   📞 ${cliente.telefono}\n`;
      mensaje += `   💰 Deuda pendiente: ${formatMoneda(cliente.totalDeuda)}\n`;
      mensaje += `   📅 Máxima antigüedad: ${cliente.diasMaximo} días\n`;
      mensaje += `   📄 Facturas pendientes: ${cliente.totalFacturas}\n`;
      mensaje += `   👤 Vendedor: ${cliente.vendedor}\n\n`;
    });

    const deudaTotal = clientesMas60Dias.reduce((sum, c) => sum + c.totalDeuda, 0);
    const promedioDias = Math.round(
      clientesMas60Dias.reduce((sum, c) => sum + c.diasMaximo, 0) / clientesMas60Dias.length
    );
    const totalFacturas = clientesMas60Dias.reduce((sum, c) => sum + c.totalFacturas, 0);

    mensaje += `--- RESUMEN ---\n`;
    mensaje += `💰 Deuda total pendiente: ${formatMoneda(deudaTotal)}\n`;
    mensaje += `📊 Promedio días antigüedad: ${promedioDias} días\n`;
    mensaje += `👥 Total clientes críticos: ${clientesMas60Dias.length}\n`;
    mensaje += `📄 Total facturas pendientes: ${totalFacturas}`;

    return mensaje;
  };

  const manejarHistorialVisitas = async (cerrarPanel = false) => {
    await cargarHistorialVisitas();
    setMostrarHistorialVisitas(prev => !prev);
    setMostrarClientesMenosVisitados(false);
    setMostrarClientesSinVisitar(false);
    cerrarPanelAnalisisSiAplica(cerrarPanel);
  };

  const manejarClientesMenosVisitados = async (cerrarPanel = false) => {
    await cargarClientesMenosVisitados();
    setMostrarClientesMenosVisitados(prev => !prev);
    setMostrarHistorialVisitas(false);
    setMostrarClientesSinVisitar(false);
    cerrarPanelAnalisisSiAplica(cerrarPanel);
  };

  const manejarClientesMayorDeuda = (cerrarPanel = false) => {
    setMostrarMapaDeuda(prev => !prev);
    setMostrarHistorialVisitas(false);
    setMostrarClientesMenosVisitados(false);
    setMostrarClientesSinVisitar(false);
    cerrarPanelAnalisisSiAplica(cerrarPanel);
  };

  const manejarClientesSinVisitar = async (cerrarPanel = false) => {
    const clientesUrgentes = await cargarClientesSinVisitar30Dias();
    setMostrarClientesSinVisitar(prev => !prev);
    setMostrarHistorialVisitas(false);
    setMostrarClientesMenosVisitados(false);
    cerrarPanelAnalisisSiAplica(cerrarPanel);

    if (clientesUrgentes.length === 0) {
      alert('✅ ¡Excelente! No hay clientes con más de 30 días sin visita.');
    }
  };

  const manejarClientesMas60Dias = async (cerrarPanel = false) => {
    const clientesMas60Dias = await cargarClientesMas60Dias();
    cerrarPanelAnalisisSiAplica(cerrarPanel);

    if (clientesMas60Dias.length === 0) {
      return;
    }

    const mensaje = construirMensajeClientesMas60Dias(clientesMas60Dias);
    alert(mensaje);
  };

  const accionesAnalisis = [
    {
      id: 'historial-visitas',
      className: 'button analisis-action-btn',
      icono: 'fas fa-history',
      texto: 'Ver Historial de Visitas',
      onClick: manejarHistorialVisitas
    },
    {
      id: 'clientes-menos-visitados',
      className: 'button analisis-action-btn',
      icono: 'fas fa-chart-line',
      texto: 'Clientes Menos Visitados',
      onClick: manejarClientesMenosVisitados
    },
    {
      id: 'clientes-mayor-deuda',
      className: 'button analisis-action-btn',
      icono: 'fas fa-chart-bar',
      texto: 'Clientes Mayor Deuda',
      onClick: manejarClientesMayorDeuda
    },
    {
      id: 'clientes-mas-60-dias',
      className: 'button analisis-action-btn',
      icono: 'fas fa-calendar-exclamation',
      texto: 'Clientes +60 Días',
      onClick: manejarClientesMas60Dias
    }
  ];

  const renderBotonesAnalisis = () => (
    accionesAnalisis.map(accion => (
      <button
        key={accion.id}
        className={accion.className}
        onClick={() => accion.onClick(true)}
      >
        <i className={accion.icono}></i> {accion.texto}
      </button>
    ))
  );

  // Obtener zonas únicas
  const zonasUnicas = [...new Set(clientesConDeuda.map(c => c.zona))].sort();

  // Obtener vendedores únicos
  const vendedoresUnicos = [...new Set(clientesConDeuda.map(c => c.vendedor))].sort();

  // Clientes que necesitan recordatorio
  const clientesRecordatorio = generarRecordatorios();

  if (cargando) {
    return (
      <div className="rutas-cobro-container">
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Analizando deudas y generando rutas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rutas-cobro-container">
      <header className="rutas-header">
        <div className="header-main">
          <div className="header-title-group">
            <button
              className="hamburger-analisis-btn"
              onClick={() => setAnalisisOpen(!analisisOpen)}
              aria-expanded={analisisOpen}
              aria-label="Abrir menú de herramientas"
            >
              <i className="fas fa-bars"></i>
            </button>
            <h1>
              <i className="fas fa-route"></i> Rutas de Cobro Inteligentes
            </h1>
          </div>
          <button 
            className="button secondary-button"
            onClick={() => navigate('/facturas')}
          >
            <i className="fas fa-arrow-left"></i> Volver a Facturas
          </button>
        </div>
        <p className="header-subtitle">
          Sistema de priorización para visitas de cobranza
        </p>
      </header>

      <div className={`analisis-overlay ${analisisOpen ? 'active' : ''}`} onClick={() => setAnalisisOpen(false)}></div>
      <div className={`analisis-side-menu ${analisisOpen ? 'active' : ''}`}>
        <div className="analisis-menu-header">
          <h3>Opciones</h3>
          <button className="panel-close" onClick={() => setAnalisisOpen(false)} aria-label="Cerrar herramientas">✕</button>
        </div>
        <div className="analisis-menu-actions">
          {renderBotonesAnalisis()}
        </div>
      </div>

      {/* CONTROLES PRINCIPALES AGRUPADOS */}
      <div className="controles-principales">
        
        {/* Filtros de Búsqueda y Ordenamiento */}
        <div className="filtros-section">
          <div className="filtros-group">
            <div className="filtro-item">
              <label>Buscar Cliente:</label>
              <div className="search-container">
                <input
                  type="text"
                  placeholder="Buscar por nombre, dirección, teléfono..."
                  value={busquedaCliente}
                  onChange={(e) => setBusquedaCliente(e.target.value)}
                  className="search-input"
                />
                {busquedaCliente && (
                  <button 
                    className="button micro-button clear-search"
                    onClick={limpiarBusqueda}
                    title="Limpiar búsqueda"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>
            </div>
            
            <div className="filtro-item">
              <label>Filtrar por Zona:</label>
              <select 
                value={filtroZona} 
                onChange={(e) => setFiltroZona(e.target.value)}
              >
                <option value="">Todas las zonas</option>
                {zonasUnicas.map(zona => (
                  <option key={zona} value={zona}>{zona}</option>
                ))}
              </select>
            </div>
            
            <div className="filtro-item">
              <label>Filtrar por Vendedor:</label>
              <select 
                value={filtroVendedor} 
                onChange={(e) => setFiltroVendedor(e.target.value)}
              >
                <option value="">Todos los vendedores</option>
                {vendedoresUnicos.map(vendedor => (
                  <option key={vendedor} value={vendedor}>{vendedor}</option>
                ))}
              </select>
            </div>
            
            <div className="filtro-item">
              <label>Ordenar por:</label>
              <select 
                value={ordenamiento} 
                onChange={(e) => setOrdenamiento(e.target.value)}
              >
                <option value="prioridad">Prioridad (Recomendado)</option>
                <option value="deuda">Monto Deuda</option>
                <option value="antiguedad">Antigüedad (Última factura)</option>
                <option value="zona">Zona</option>
                <option value="vendedor">Vendedor</option>
                <option value="cliente">Nombre Cliente</option>
              </select>
            </div>
          </div>
          
          <button 
            className="button primary-button generar-ruta-btn"
            onClick={generarRutaOptimizada}
            disabled={clientesFiltrados.length === 0}
          >
            <i className="fas fa-route"></i> Generar Ruta Optimizada
          </button>
          <div className="ruta-hint">
            Clientes filtrados: <strong>{clientesFiltrados.length}</strong>
          </div>
        </div>
      </div>

      {/* Información de búsqueda */}
      {busquedaCliente && (
        <div className="busqueda-info">
          <div className="busqueda-header">
            <i className="fas fa-search"></i>
            <span>
              Resultados para: <strong>"{busquedaCliente}"</strong>
              <em> ({clientesFiltrados.length} clientes encontrados)</em>
            </span>
            <button 
              className="button micro-button secondary-button"
              onClick={limpiarBusqueda}
            >
              <i className="fas fa-times"></i> Limpiar búsqueda
            </button>
          </div>
        </div>
      )}

      {/* PANEL DE CLIENTES SIN VISITAR (+30 DÍAS) */}
      {mostrarClientesSinVisitar && (
        <div className="historial-visitas-panel clientes-sin-visitar-panel">
          <div className="panel-header">
            <h3>
              <i className="fas fa-exclamation-triangle"></i> Clientes Sin Visitar (+30 días)
            </h3>
            <button 
              className="button secondary-button"
              onClick={() => setMostrarClientesSinVisitar(false)}
            >
              <i className="fas fa-times"></i> Cerrar
            </button>
          </div>

          {clientesSinVisitar.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-check-circle"></i>
              <p>¡Excelente! No hay clientes con más de 30 días sin visita</p>
              <small>Todos los clientes han sido visitados recientemente</small>
            </div>
          ) : (
            <div className="clientes-sin-visitar-list">
              <div className="analisis-header">
                <h4>Clientes que Requieren Visita Urgente</h4>
                <p>{clientesSinVisitar.length} clientes sin visita por más de 30 días</p>
              </div>

              {/* Estadísticas rápidas */}
              <div className="estadisticas-urgencia">
                <div className="estadistica-urgencia">
                  <span className="urgencia-alta"></span>
                  <span>Nunca visitados: {clientesSinVisitar.filter(c => !c.ultimaVisita).length}</span>
                </div>
                <div className="estadistica-urgencia">
                  <span className="urgencia-media"></span>
                  <span>+60 días sin visita: {clientesSinVisitar.filter(c => c.diasDesdeUltimaVisita > 60).length}</span>
                </div>
                <div className="estadistica-urgencia">
                  <span className="urgencia-baja"></span>
                  <span>+30 días sin visita: {clientesSinVisitar.filter(c => c.diasDesdeUltimaVisita > 30 && c.diasDesdeUltimaVisita <= 60).length}</span>
                </div>
              </div>
              
              {clientesSinVisitar.map((cliente, index) => (
                <div key={cliente.nombre} className={`cliente-sin-visitar urgencia-${obtenerNivelUrgencia(cliente.diasDesdeUltimaVisita, !cliente.ultimaVisita)}`}>
                  <div className="cliente-urgencia-indicator">
                    {!cliente.ultimaVisita ? (
                      <i className="fas fa-exclamation-circle"></i>
                    ) : cliente.diasDesdeUltimaVisita > 60 ? (
                      <i className="fas fa-skull-crossbones"></i>
                    ) : (
                      <i className="fas fa-exclamation-triangle"></i>
                    )}
                  </div>
                  
                  <div className="cliente-info">
                    <div className="cliente-header">
                      <strong>{cliente.nombre}</strong>
                      <span className={`estado-urgencia ${obtenerNivelUrgencia(cliente.diasDesdeUltimaVisita, !cliente.ultimaVisita)}`}>
                        {!cliente.ultimaVisita ? 'NUNCA VISITADO' : `${cliente.diasDesdeUltimaVisita} DÍAS SIN VISITA`}
                      </span>
                    </div>
                    <div className="cliente-detalles">
                      <div className="detalle-item">
                        <i className="fas fa-map-marker-alt"></i>
                        <span>{cliente.direccion}</span>
                      </div>
                      <div className="detalle-item">
                        <i className="fas fa-user-tie"></i>
                        <span>Vendedor: {cliente.vendedor}</span>
                      </div>
                      <div className="detalle-item">
                        <i className="fas fa-money-bill-wave"></i>
                        <span>Deuda: {formatMoneda(cliente.totalDeuda)}</span>
                      </div>
                      {cliente.ultimaVisita && (
                        <div className="detalle-item">
                          <i className="fas fa-calendar"></i>
                          <span>Última visita: {formatFecha(cliente.ultimaVisita)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="cliente-actions">
                    <button 
                      className="button info-button micro-button"
                      onClick={() => verDetallesDeuda(cliente)}
                      title="Ver detalles de deuda"
                    >
                      <i className="fas fa-file-invoice"></i>
                    </button>
                    <button 
                      className="button primary-button"
                      onClick={() => marcarComoVisitado(cliente)}
                    >
                      <i className="fas fa-user-check"></i> Marcar Visitado
                    </button>
                  </div>
                </div>
              ))}
              
              <div className="resumen-analisis">
                <h5>Resumen de Visitas Pendientes</h5>
                <div className="resumen-stats">
                  <div className="resumen-item">
                    <span>Total clientes urgentes:</span>
                    <strong>{clientesSinVisitar.length}</strong>
                  </div>
                  <div className="resumen-item">
                    <span>Deuda total pendiente:</span>
                    <strong>{formatMoneda(clientesSinVisitar.reduce((sum, c) => sum + c.totalDeuda, 0))}</strong>
                  </div>
                  <div className="resumen-item">
                    <span>Clientes nunca visitados:</span>
                    <strong>{clientesSinVisitar.filter(c => !c.ultimaVisita).length}</strong>
                  </div>
                  <div className="resumen-item">
                    <span>Promedio días sin visita:</span>
                    <strong>
                      {Math.round(
                        clientesSinVisitar
                          .filter(c => c.ultimaVisita)
                          .reduce((sum, c) => sum + c.diasDesdeUltimaVisita, 0) / 
                        Math.max(clientesSinVisitar.filter(c => c.ultimaVisita).length, 1)
                      )} días
                    </strong>
                  </div>
                </div>
                
                <div className="recomendaciones">
                  <h6>Recomendaciones:</h6>
                  <ul>
                    <li>Prioriza clientes nunca visitados primero</li>
                    <li>Enfócate en clientes con más de 60 días sin visita</li>
                    <li>Agrupa visitas por zona para optimizar rutas</li>
                    <li>Actualiza el estado después de cada visita</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PANEL DE CLIENTES MENOS VISITADOS */}
      {mostrarClientesMenosVisitados && (
        <div className="historial-visitas-panel">
          <div className="panel-header">
            <h3>
              <i className="fas fa-chart-line"></i> Clientes Menos Visitados
            </h3>
            <button 
              className="button secondary-button"
              onClick={() => setMostrarClientesMenosVisitados(false)}
            >
              <i className="fas fa-times"></i> Cerrar
            </button>
          </div>

          {clientesMenosVisitados.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-users"></i>
              <p>No hay suficiente información para el análisis</p>
              <small>Realiza algunas visitas para ver estadísticas</small>
            </div>
          ) : (
            <div className="menos-visitados-list">
              <div className="analisis-header">
                <h4>Top {clientesMenosVisitados.length} Clientes con Menos Visitas</h4>
                <p>Clientes que requieren más atención en cobranza</p>
              </div>
              
              {clientesMenosVisitados.map((cliente, index) => (
                <div key={cliente.nombre} className="cliente-poco-visitado">
                  <div className="cliente-rank">
                    <span className="rank-number">{index + 1}</span>
                  </div>
                  <div className="cliente-info">
                    <div className="cliente-header">
                      <strong>{cliente.nombre}</strong>
                      <span className="visitas-count">
                        {cliente.visitas} visita{cliente.visitas !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="cliente-detalles">
                      <span>
                        Última visita: {calcularDiasDesdeUltimaVisita(cliente.ultimaVisita)}
                      </span>
                      {cliente.ultimaVisita && (
                        <small>
                          {formatFecha(cliente.ultimaVisita)}
                        </small>
                      )}
                    </div>
                  </div>
                  <button 
                    className="button micro-button primary-button"
                    onClick={() => {
                      const clienteEnDeuda = clientesConDeuda.find(c => c.nombre === cliente.nombre);
                      if (clienteEnDeuda) {
                        alert(`Cliente ${cliente.nombre} seleccionado. Deuda: ${formatMoneda(clienteEnDeuda.totalDeuda)} - Vendedor: ${clienteEnDeuda.vendedor}`);
                      } else {
                        alert(`Cliente ${cliente.nombre} seleccionado para visita prioritaria`);
                      }
                    }}
                  >
                    <i className="fas fa-eye"></i>
                  </button>
                </div>
              ))}
              
              <div className="resumen-analisis">
                <h5>Resumen del Análisis</h5>
                <div className="resumen-stats">
                  <div className="resumen-item">
                    <span>Total de clientes analizados:</span>
                    <strong>{new Set(clientesMenosVisitados.map(c => c.nombre)).size}</strong>
                  </div>
                  <div className="resumen-item">
                    <span>Promedio de visitas por cliente:</span>
                    <strong>
                      {(clientesMenosVisitados.reduce((sum, c) => sum + c.visitas, 0) / clientesMenosVisitados.length).toFixed(1)}
                    </strong>
                  </div>
                  <div className="resumen-item">
                    <span>Clientes con solo 1 visita:</span>
                    <strong>
                      {clientesMenosVisitados.filter(c => c.visitas === 1).length}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PANEL DE HISTORIAL DE VISITAS */}
      {mostrarHistorialVisitas && (
        <div className="historial-visitas-panel">
          <div className="panel-header">
            <h3>
              <i className="fas fa-history"></i> Historial de Visitas
            </h3>
            <button 
              className="button secondary-button"
              onClick={() => setMostrarHistorialVisitas(false)}
            >
              <i className="fas fa-times"></i> Cerrar
            </button>
          </div>

          {historialVisitas.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-search"></i>
              <p>No se encontraron visitas registradas</p>
            </div>
          ) : (
            <div className="visitas-list">
              {historialVisitas.map((visita, index) => (
                <div key={visita.id || index} className="visita-item">
                  <div className="visita-info">
                    <div className="visita-cliente">
                      <strong>{visita.cliente_nombre || visita.clienteNombre}</strong>
                      <span className="visita-fecha">
                        {formatFecha(visita.fecha_visita || visita.fecha)}
                      </span>
                    </div>
                    <div className="visita-detalles">
                      <span>Deuda: {formatMoneda(visita.deuda_pendiente || visita.deuda)}</span>
                      {visita.vendedor && <span>Vendedor: {visita.vendedor}</span>}
                      <span className="estado visitado">
                        {visita.resultado || 'Visitado'}
                      </span>
                    </div>
                  </div>
                  {visita.observaciones && (
                    <div className="visita-observaciones">
                      <small>{visita.observaciones}</small>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Notificaciones de deudas antiguas */}
      {clientesRecordatorio.length > 0 && (
        <div className="notificacion-alerta">
          <div className="alerta-header">
            <i className="fas fa-exclamation-triangle"></i>
            <h4>Recordatorios Importantes</h4>
            <button 
              className="button micro-button"
              onClick={() => setMostrarRecordatorios(!mostrarRecordatorios)}
            >
              <i className={`fas fa-chevron-${mostrarRecordatorios ? 'up' : 'down'}`}></i>
            </button>
          </div>
          {mostrarRecordatorios && (
            <div className="alerta-content">
              <p>{clientesRecordatorio.length} clientes con deudas antiguas necesitan visita urgente:</p>
              <div className="recordatorio-list">
                {clientesRecordatorio.slice(0, 5).map(cliente => (
                  <div key={cliente.nombre} className="recordatorio-item">
                    <span>{cliente.nombre}</span>
                    <span>{cliente.diasDesdePrimeraFactura} días de deuda</span>
                    <span>{formatMoneda(cliente.totalDeuda)}</span>
                    <span>{cliente.vendedor}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reporte Diario */}
      {reporteDiario && reporteDiario.totalVisitas > 0 && (
        <div className="reporte-diario">
          <h4>
            <i className="fas fa-chart-line"></i> Reporte del Día
          </h4>
          <div className="reporte-stats">
            <div className="reporte-item">
              <span>Visitas Realizadas:</span>
              <strong>{reporteDiario.totalVisitas}</strong>
            </div>
            <div className="reporte-item">
              <span>Clientes Pendientes:</span>
              <strong>{clientesConDeuda.filter(c => !c.visitadoHoy).length}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Estadísticas Rápidas */}
      <div className="estadisticas-rapidas">
        <div className="stat-card">
          <div className="stat-icon alta">
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <div className="stat-info">
            <span>Clientes Prioridad Alta</span>
            <strong>
              {clientesConDeuda.filter(c => c.nivelPrioridad === 'Alta').length}
            </strong>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon visitados">
            <i className="fas fa-check-circle"></i>
          </div>
          <div className="stat-info">
            <span>Visitados Hoy</span>
            <strong>
              {clientesConDeuda.filter(c => c.visitadoHoy).length}
            </strong>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon deuda">
            <i className="fas fa-money-bill-wave"></i>
          </div>
          <div className="stat-info">
            <span>Deuda Total Pendiente</span>
            <strong>
              {formatMoneda(clientesConDeuda.reduce((sum, c) => sum + c.totalDeuda, 0))}
            </strong>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon tiempo">
            <i className="fas fa-clock"></i>
          </div>
          <div className="stat-info">
            <span>Deuda Más Antigua</span>
            <strong>
              {clientesConDeuda.length > 0 
                ? Math.max(...clientesConDeuda.map(c => c.diasDesdePrimeraFactura)) + ' días'
                : '0 días'
              }
            </strong>
          </div>
        </div>
      </div>

      {/* Lista de Clientes con Deuda */}
      <div className="clientes-deuda-section">
        <div className="clientes-deuda-header">
          <h3>
            <i className="fas fa-list"></i> 
            Clientes con Deuda Pendiente ({clientesFiltrados.length})
            {filtroZona && ` - Zona: ${filtroZona}`}
            {filtroVendedor && ` - Vendedor: ${filtroVendedor}`}
          </h3>
          <div className="clientes-deuda-actions">
            {mostrarMapa && rutaGenerada.length > 0 && (
              <button 
                className="button info-button"
                onClick={irARutaGenerada}
              >
                <i className="fas fa-route"></i> Ir a Ruta
              </button>
            )}
            <button 
              className="button secondary-button"
              onClick={() => setMostrarListaClientes(!mostrarListaClientes)}
            >
              <i className={`fas ${mostrarListaClientes ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              {mostrarListaClientes ? 'Ocultar lista' : 'Mostrar lista'}
            </button>
          </div>
        </div>
        
        {mostrarListaClientes && (
          clientesFiltrados.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-search"></i>
              <h4>No se encontraron clientes</h4>
              <p>
                {busquedaCliente 
                  ? `No hay resultados para "${busquedaCliente}" con los filtros aplicados`
                  : 'No se encontraron clientes con deudas según los filtros aplicados'
                }
              </p>
              {(busquedaCliente || filtroZona || filtroVendedor) && (
                <button 
                  className="button primary-button"
                  onClick={() => {
                    setBusquedaCliente('');
                    setFiltroZona('');
                    setFiltroVendedor('');
                  }}
                >
                  <i className="fas fa-refresh"></i> Limpiar todos los filtros
                </button>
              )}
            </div>
          ) : (
            <div className="clientes-grid">
              {clientesFiltrados.map((cliente, index) => (
                <div key={cliente.nombre} className={`cliente-card prioridad-${cliente.nivelPrioridad.toLowerCase()} ${cliente.visitadoHoy ? 'visitado' : ''}`}>
                  <div className="cliente-header">
                    <div className="cliente-info">
                      <h4>{cliente.nombre}</h4>
                      <div className="cliente-badges">
                        <span className="zona-badge">{cliente.zona}</span>
                        <span className="vendedor-badge">{cliente.vendedor}</span>
                        {cliente.visitadoHoy && (
                          <span className="visitado-badge">
                            <i className="fas fa-check"></i> Visitado Hoy
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`prioridad-badge ${cliente.nivelPrioridad.toLowerCase()}`}>
                      {cliente.nivelPrioridad}
                    </div>
                  </div>
                  
                  <div className="cliente-details">
                    <div className="detail-item">
                      <i className="fas fa-map-marker-alt"></i>
                      <span>{cliente.direccion}</span>
                    </div>
                    {cliente.telefono !== 'Sin teléfono' && (
                      <div className="detail-item">
                        <i className="fas fa-phone"></i>
                        <span>{cliente.telefono}</span>
                      </div>
                    )}
                    <div className="detail-item">
                      <i className="fas fa-user-tie"></i>
                      <span>Vendedor: {cliente.vendedor}</span>
                    </div>
                  </div>
                  
                  <div className="deuda-info">
                    <div className="deuda-stats">
                      <div className="stat">
                        <span>Deuda Total:</span>
                        <strong>{formatMoneda(cliente.totalDeuda)}</strong>
                      </div>
                      <div className="stat">
                        <span>Facturas Pendientes:</span>
                        <span>{cliente.facturasPendientes.length}</span>
                      </div>
                    </div>
                    
                    <div className="tiempo-info">
                      <div className="tiempo-item">
                        <small>Deuda desde:</small>
                        <span>{cliente.diasDesdePrimeraFactura} días</span>
                      </div>
                      <div className="tiempo-item">
                        <small>Última factura:</small>
                        <span>{cliente.diasDesdeUltimaFactura} días</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="cliente-actions">
                    <button 
                      className="button info-button"
                      onClick={() => verDetallesDeuda(cliente)}
                    >
                      <i className="fas fa-file-invoice"></i> Ver Deuda
                    </button>
                    <button 
                      className={`button ${cliente.visitadoHoy ? 'secondary-button' : 'primary-button'}`}
                      onClick={() => marcarComoVisitado(cliente)}
                      disabled={cliente.visitadoHoy}
                    >
                      <i className={`fas ${cliente.visitadoHoy ? 'fa-check' : 'fa-user-check'}`}></i>
                      {cliente.visitadoHoy ? 'Visitado' : 'Marcar Visitado'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Mapa de Mayor Deuda */}
      {mostrarMapaDeuda && (
        <div className="mapa-deuda-section">
          <div className="mapa-deuda-header">
            <h3>
              <i className="fas fa-chart-bar"></i> Top 10 Clientes con Mayor Deuda
            </h3>
            <button 
              className="button micro-button secondary-button"
              onClick={() => setMostrarMapaDeuda(false)}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className="top-clientes-container">
            {obtenerTopClientesPorDeuda(10).map((cliente, index) => {
              const totalDeuda = clientesConDeuda.reduce((sum, c) => sum + c.totalDeuda, 0);
              const porcentaje = (cliente.totalDeuda / totalDeuda) * 100;
              const maxDeuda = Math.max(...clientesFiltrados.map(c => c.totalDeuda));
              const ancho = (cliente.totalDeuda / maxDeuda) * 100;

              return (
                <div key={cliente.nombre} className="top-cliente-item">
                  <div className="top-cliente-ranking">
                    <span className="ranking-number">{index + 1}</span>
                  </div>
                  <div className="top-cliente-info">
                    <div className="top-cliente-header-info">
                      <h4>{cliente.nombre}</h4>
                      <span className={`prioridad-badge ${cliente.nivelPrioridad.toLowerCase()}`}>
                        {cliente.nivelPrioridad}
                      </span>
                    </div>
                    <p className="top-cliente-detalles">
                      {cliente.direccion} | {cliente.zona}
                    </p>
                  </div>
                  <div className="top-cliente-bar">
                    <div className="deuda-bar-container">
                      <div 
                        className="deuda-bar-fill" 
                        style={{width: `${ancho}%`}}
                      ></div>
                    </div>
                  </div>
                  <div className="top-cliente-stats">
                    <div className="stat-mini">
                      <span className="stat-label">Deuda:</span>
                      <strong>{formatMoneda(cliente.totalDeuda)}</strong>
                    </div>
                    <div className="stat-mini">
                      <span className="stat-label">Facturas:</span>
                      <strong>{cliente.facturasPendientes.length}</strong>
                    </div>
                    <div className="stat-mini">
                      <span className="stat-label">Antigüedad:</span>
                      <strong>{cliente.diasDesdePrimeraFactura}d</strong>
                    </div>
                    <div className="stat-mini percent">
                      <span className="stat-label">% del total:</span>
                      <strong>{porcentaje.toFixed(1)}%</strong>
                    </div>
                  </div>
                  <button 
                    className="button micro-button info-button"
                    onClick={() => verDetallesDeuda(cliente)}
                    style={{marginTop: '8px', width: '100%'}}
                  >
                    <i className="fas fa-file-invoice"></i> Ver Detalles
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mapa de Ruta Generada */}
      {mostrarMapa && rutaGenerada.length > 0 && (
        <div className="ruta-generada-section">
          <div className="ruta-header">
            <h3>
              <i className="fas fa-route"></i> Ruta de Cobro Optimizada
            </h3>
            <div className="ruta-header-actions">
              <button 
                className="button info-button"
                onClick={irAFiltros}
              >
                <i className="fas fa-arrow-up"></i> Volver a Filtros
              </button>
              <button 
                className="button success-button"
                onClick={() => {
                  // Exportar ruta como texto
                  const rutaTexto = rutaGenerada.map((paso, index) => {
                    if (paso.tipo === 'zona') {
                      return `${index + 1}. ${paso.nombre} - ${paso.info}`;
                    } else {
                      return `${index + 1}. ${paso.nombre} - ${paso.direccion} - Deuda: ${formatMoneda(paso.totalDeuda)} - Vendedor: ${paso.vendedor}`;
                    }
                  }).join('\n');
                  
                  navigator.clipboard.writeText(rutaTexto);
                  alert('Ruta copiada al portapapeles');
                }}
              >
                <i className="fas fa-copy"></i> Copiar Ruta
              </button>
              <button 
                className="button secondary-button"
                onClick={() => window.print()}
              >
                <i className="fas fa-print"></i> Imprimir
              </button>
            </div>
          </div>
          
          <div className="ruta-steps">
            {rutaGenerada.map((paso, index) => (
              <div key={index} className={`ruta-step ${paso.tipo} ${paso.visitadoHoy ? 'visitado' : ''}`}>
                {paso.tipo === 'zona' ? (
                  <div className="zona-separator">
                    <i className="fas fa-car"></i>
                    <div className="zona-info">
                      <span>{paso.nombre}</span>
                      <small>{paso.info}</small>
                    </div>
                  </div>
                ) : (
                  <div className="cliente-step">
                    <div className="step-number">{index}.</div>
                    <div className="step-info">
                      <h4>
                        {paso.nombre}
                        {paso.visitadoHoy && (
                          <span className="step-visitado">
                            <i className="fas fa-check"></i> Visitado
                          </span>
                        )}
                      </h4>
                      <p>{paso.direccion}</p>
                      <div className="step-details">
                        <span>Deuda: {formatMoneda(paso.totalDeuda)}</span>
                        <span className={`prioridad ${paso.nivelPrioridad.toLowerCase()}`}>
                          {paso.nivelPrioridad}
                        </span>
                        <span>Facturas: {paso.facturasPendientes.length}</span>
                        <span>Vendedor: {paso.vendedor}</span>
                      </div>
                    </div>
                    <div className="step-actions">
                      <button 
                        className="button micro-button info-button"
                        onClick={() => verDetallesDeuda(paso)}
                      >
                        <i className="fas fa-file-invoice"></i>
                      </button>
                      <button 
                        className={`button micro-button ${paso.visitadoHoy ? 'secondary-button' : 'primary-button'}`}
                        onClick={() => marcarComoVisitado(paso)}
                        disabled={paso.visitadoHoy}
                      >
                        <i className={`fas ${paso.visitadoHoy ? 'fa-check' : 'fa-user-check'}`}></i>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="ruta-resumen">
            <h4>Resumen de la Ruta</h4>
            <div className="resumen-stats">
              <div className="resumen-item">
                <span>Total Paradas:</span>
                <strong>{rutaGenerada.filter(p => p.tipo === 'cliente').length}</strong>
              </div>
              <div className="resumen-item">
                <span>Deuda a Recuperar:</span>
                <strong>
                  {formatMoneda(
                    rutaGenerada
                      .filter(p => p.tipo === 'cliente')
                      .reduce((sum, c) => sum + c.totalDeuda, 0)
                  )}
                </strong>
              </div>
              <div className="resumen-item">
                <span>Clientes Visitados:</span>
                <strong>
                  {rutaGenerada
                    .filter(p => p.tipo === 'cliente' && p.visitadoHoy)
                    .length}
                </strong>
              </div>
              <div className="resumen-item">
                <span>Zonas a Visitar:</span>
                <strong>
                  {new Set(rutaGenerada.filter(p => p.tipo === 'zona').map(z => z.nombre)).size}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DETALLES DE DEUDA */}
      {mostrarDetallesDeuda && clienteSeleccionado && (
        <div className="modal-overlay" onClick={cerrarDetallesDeuda}>
          <div className="modal-detalles-deuda" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <i className="fas fa-money-bill-wave"></i>
                <h2>Detalles de Deuda - {clienteSeleccionado.nombre}</h2>
              </div>
              <button 
                className="button-close"
                onClick={cerrarDetallesDeuda}
              >
                ✕
              </button>
            </div>

            <div className="modal-content">
              {/* Información del Cliente */}
              <div className="seccion-detalles">
                <h3>Información del Cliente</h3>
                <div className="cliente-info-grid">
                  <div className="info-item">
                    <span className="label">Nombre:</span>
                    <span className="value">{clienteSeleccionado.nombre}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Dirección:</span>
                    <span className="value">{clienteSeleccionado.direccion}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Teléfono:</span>
                    <span className="value">{clienteSeleccionado.telefono}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Zona:</span>
                    <span className="value badge-zona">{clienteSeleccionado.zona}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Vendedor:</span>
                    <span className="value">{clienteSeleccionado.vendedor}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Última Visita:</span>
                    <span className="value">{clienteSeleccionado.ultimaVisita ? formatFecha(clienteSeleccionado.ultimaVisita) : 'Nunca visitado'}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Último Abono:</span>
                    <span className="value">{clienteSeleccionado.ultimaFechaAbono ? formatFecha(clienteSeleccionado.ultimaFechaAbono) : 'Sin abonos'}</span>
                  </div>
                </div>
              </div>

              {/* Resumen de Deuda */}
              <div className="seccion-detalles">
                <h3>Resumen de Deuda</h3>
                <div className="deuda-resumen-grid">
                  <div className="stat-deuda">
                    <span className="stat-label">Total Deuda</span>
                    <span className="stat-value total">{formatMoneda(clienteSeleccionado.totalDeuda)}</span>
                  </div>
                  <div className="stat-deuda">
                    <span className="stat-label">Facturas Pendientes</span>
                    <span className="stat-value">{clienteSeleccionado.facturasPendientes.length}</span>
                  </div>
                  <div className="stat-deuda">
                    <span className="stat-label">Desde hace</span>
                    <span className="stat-value">{clienteSeleccionado.diasDesdePrimeraFactura} días</span>
                  </div>
                  <div className="stat-deuda">
                    <span className="stat-label">Prioridad</span>
                    <span className={`stat-value prioridad-${clienteSeleccionado.nivelPrioridad?.toLowerCase() || 'media'}`}>
                      {clienteSeleccionado.nivelPrioridad || 'Media'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detalle de Facturas Pendientes */}
              <div className="seccion-detalles">
                <h3>Facturas Pendientes ({clienteSeleccionado.facturasPendientes.length})</h3>
                <div className="facturas-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>ID Factura</th>
                        <th>Total</th>
                        <th>Saldo Pendiente</th>
                        <th>Antigüedad</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clienteSeleccionado.facturasPendientes.map((factura, idx) => {
                        const hoy = new Date();
                        const fechaFactura = new Date(factura.fecha);
                        const dias = Math.floor((hoy - fechaFactura) / (1000 * 60 * 60 * 24));
                        
                        return (
                          <tr key={idx} className={dias > 60 ? 'vencida' : dias > 30 ? 'en-riesgo' : ''}>
                            <td>{formatFecha(factura.fecha)}</td>
                            <td className="factura-id">#{factura.id}</td>
                            <td>{formatMoneda(factura.total)}</td>
                            <td className="monto-pendiente">{formatMoneda(factura.saldo)}</td>
                            <td>
                              <span className={`dias-badge ${dias > 60 ? 'critico' : dias > 30 ? 'alerta' : 'normal'}`}>
                                {dias} días
                              </span>
                            </td>
                            <td>
                              <button
                                className="button micro-button info-button"
                                onClick={() => irAFacturaDirecta(factura.id)}
                              >
                                <i className="fas fa-external-link-alt"></i> Ver factura
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="total-row">
                        <td colSpan="2">TOTAL</td>
                        <td>{formatMoneda(clienteSeleccionado.facturasPendientes.reduce((sum, f) => sum + f.total, 0))}</td>
                        <td className="total-saldo">{formatMoneda(clienteSeleccionado.totalDeuda)}</td>
                        <td></td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Información de Cobranza */}
              <div className="seccion-detalles">
                <h3>Información de Cobranza</h3>
                <div className="cobranza-info">
                  <div className="info-row">
                    <span className="label">Deuda desde:</span>
                    <span className="value">{clienteSeleccionado.diasDesdePrimeraFactura} días ({formatFecha(clienteSeleccionado.facturaMasAntigua)})</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Última factura:</span>
                    <span className="value">{clienteSeleccionado.diasDesdeUltimaFactura} días ({formatFecha(clienteSeleccionado.ultimaFactura)})</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Número de facturas pendientes:</span>
                    <span className="value">{clienteSeleccionado.facturasPendientes.length}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Monto promedio por factura:</span>
                    <span className="value">
                      {formatMoneda(
                        clienteSeleccionado.totalDeuda / Math.max(clienteSeleccionado.facturasPendientes.length, 1)
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Abonos en facturas pendientes */}
              <div className="seccion-detalles">
                <h3>Abonos en Facturas Pendientes</h3>
                {clienteSeleccionado.abonosPendientes?.length ? (
                  <div className="facturas-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>ID Factura</th>
                          <th>Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clienteSeleccionado.abonosPendientes
                          .sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0))
                          .map((abono, idx) => (
                            <tr key={`${abono.facturaId}-${idx}`}>
                              <td>{abono.fecha ? formatFecha(abono.fecha) : 'Sin fecha'}</td>
                              <td className="factura-id">#{abono.facturaId}</td>
                              <td>{formatMoneda(abono.monto)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="empty-state">No hay abonos registrados para facturas pendientes.</p>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="button secondary-button"
                onClick={cerrarDetallesDeuda}
              >
                Cerrar
              </button>
              <button 
                className="button primary-button"
                onClick={irAFacturasDesdeDetalles}
              >
                <i className="fas fa-arrow-right"></i> Ver en Facturas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RutasCobro;