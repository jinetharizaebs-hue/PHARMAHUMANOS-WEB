import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';
import './CampanaCatalogo.css';

const PAGE_SIZE = 1000;
const SALDO_EPSILON = 0.01;
const STORAGE_KEY = 'campana_catalogo_historial_envios';
const PUBLIC_URL_STORAGE_KEY = 'campana_catalogo_url_publica';

const DEFAULT_REGLAS = {
  maxSaldoPendiente: 250000,
  maxFacturasPendientes: 2,
  maxDiasAtraso: 30,
  minClasificacion: 3,
  diasReenvio: 20
};

const fetchAllRows = async (tabla) => {
  let from = 0;
  let rows = [];

  while (true) {
    const { data, error } = await supabase
      .from(tabla)
      .select('*')
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    const batch = data || [];
    rows = [...rows, ...batch];

    if (batch.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return rows;
};

const normalizarTelefonoWhatsApp = (telefono) => {
  const digits = String(telefono || '').replace(/\D/g, '');

  if (!digits) {
    return '';
  }

  if (digits.length === 10 && digits.startsWith('3')) {
    return `57${digits}`;
  }

  if (digits.length === 12 && digits.startsWith('57')) {
    return digits;
  }

  if (digits.length === 13 && digits.startsWith('573')) {
    return digits;
  }

  return digits.length >= 10 ? digits : '';
};

const parseFecha = (fecha) => {
  const parsed = fecha ? new Date(fecha) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
};

const calcularDiasDesde = (fecha) => {
  const parsed = parseFecha(fecha);

  if (!parsed) {
    return 0;
  }

  return Math.max(0, Math.floor((Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24)));
};

const formatearMoneda = (valor) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(valor || 0);

const formatearFecha = (fecha) => {
  const parsed = parseFecha(fecha);

  if (!parsed) {
    return 'Sin registro';
  }

  return parsed.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const normalizarTexto = (valor) =>
  String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const cargarHistorialEnvios = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error leyendo historial de campaña:', error);
    return {};
  }
};

const guardarHistorialEnvios = (historial) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(historial));
};

const getViteEnv = () => {
  if (typeof globalThis !== 'undefined' && globalThis.__APP_ENV__) {
    return globalThis.__APP_ENV__;
  }

  return {};
};

const normalizarBaseUrl = (url) => String(url || '').trim().replace(/\/$/, '');

const esOrigenLocal = (url) => {
  const normalizedUrl = normalizarBaseUrl(url);

  if (!normalizedUrl) {
    return true;
  }

  try {
    const parsed = new URL(normalizedUrl);
    return ['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname);
  } catch (error) {
    return true;
  }
};

const obtenerBaseUrlInicial = () => {
  const storedUrl = localStorage.getItem(PUBLIC_URL_STORAGE_KEY);
  const env = getViteEnv();
  const envUrl = env.VITE_PUBLIC_CATALOG_BASE_URL || env.VITE_PUBLIC_APP_URL || '';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const candidateUrl = storedUrl || envUrl || origin;

  return esOrigenLocal(candidateUrl) ? '' : normalizarBaseUrl(candidateUrl);
};

const CampanaCatalogo = () => {
  const [clientes, setClientes] = useState([]);
  const [facturas, setFacturas] = useState([]);
  const [abonos, setAbonos] = useState([]);
  const [reglas, setReglas] = useState(DEFAULT_REGLAS);
  const [historialEnvios, setHistorialEnvios] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mostrarNoAptos, setMostrarNoAptos] = useState(false);
  const [soloConTelefono, setSoloConTelefono] = useState(true);
  const [segmentoCliente, setSegmentoCliente] = useState('todos');
  const [mensajeAccion, setMensajeAccion] = useState('');
  const [publicBaseUrl, setPublicBaseUrl] = useState(obtenerBaseUrlInicial);
  const [publicBaseUrlInput, setPublicBaseUrlInput] = useState(obtenerBaseUrlInicial);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Todas');
  const [categoriasDisponibles, setCategoriasDisponibles] = useState(['Todas']);

  const categoriasCliente = useMemo(() => {
    const categorias = clientes
      .map((cliente) => String(cliente.categoria || cliente.centro_comercial || cliente.segmento || '').trim())
      .filter(Boolean);

    return [...new Map(categorias.map((categoria) => [normalizarTexto(categoria), categoria])).entries()]
      .sort((left, right) => left[1].localeCompare(right[1], 'es'));
  }, [clientes]);

  const opcionesSegmento = useMemo(() => {
    const categorias = categoriasCliente.map(([valor, etiqueta]) => ({
      value: `categoria:${valor}`,
      label: etiqueta
    }));

    return [
      { value: 'todos', label: 'Todos los clientes' },
      { value: 'sin-categoria', label: 'Solo sin categoría' },
      ...categorias
    ];
  }, [categoriasCliente]);

  useEffect(() => {
    setHistorialEnvios(cargarHistorialEnvios());
  }, []);

  useEffect(() => {
    const normalizedUrl = normalizarBaseUrl(publicBaseUrl);

    if (normalizedUrl) {
      localStorage.setItem(PUBLIC_URL_STORAGE_KEY, normalizedUrl);
    } else {
      localStorage.removeItem(PUBLIC_URL_STORAGE_KEY);
    }
  }, [publicBaseUrl]);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setCargando(true);
        setError('');

        const [clientesData, facturasData, abonosData, productosData] = await Promise.all([
          fetchAllRows('clientes'),
          fetchAllRows('facturas'),
          fetchAllRows('abonos'),
          supabase.from('productos').select('categoria').eq('activo', true)
        ]);

        const categorias = [...new Set((productosData?.data || [])
          .map((producto) => String(producto.categoria || '').trim())
          .filter(Boolean))]
          .sort((izquierda, derecha) => izquierda.localeCompare(derecha, 'es'));

        setClientes(clientesData || []);
        setFacturas(facturasData || []);
        setAbonos(abonosData || []);
        setCategoriasDisponibles(['Todas', ...categorias]);
      } catch (loadError) {
        console.error('Error cargando datos de campaña:', loadError);
        setError('No fue posible cargar la campaña de catálogo.');
      } finally {
        setCargando(false);
      }
    };

    cargarDatos();
  }, []);

  const resumenCampana = useMemo(() => {
    const abonosPorFactura = abonos.reduce((accumulator, abono) => {
      const facturaId = abono.factura_id;
      if (!facturaId) {
        return accumulator;
      }

      accumulator[facturaId] = (accumulator[facturaId] || 0) + (Number(abono.monto) || 0);
      return accumulator;
    }, {});

    const campaignRows = clientes.map((cliente) => {
      const facturasCliente = facturas.filter((factura) => {
        const coincideId = factura.cliente_id && String(factura.cliente_id) === String(cliente.id);
        const coincideNombre =
          String(factura.cliente || '').trim().toLowerCase() === String(cliente.nombre || '').trim().toLowerCase();

        return coincideId || coincideNombre;
      });

      const facturasPendientes = facturasCliente
        .map((factura) => {
          const total = Number(factura.total) || 0;
          const totalAbonado = abonosPorFactura[factura.id] || 0;
          const saldo = total - totalAbonado;
          const saldoPendiente = Math.abs(saldo) < SALDO_EPSILON ? 0 : saldo;

          return {
            id: factura.id,
            fecha: factura.fecha,
            total,
            saldo: saldoPendiente,
            diasAtraso: calcularDiasDesde(factura.fecha)
          };
        })
        .filter((factura) => factura.saldo > SALDO_EPSILON);

      const totalSaldoPendiente = facturasPendientes.reduce((sum, factura) => sum + factura.saldo, 0);
      const maxDiasAtraso = facturasPendientes.length
        ? Math.max(...facturasPendientes.map((factura) => factura.diasAtraso))
        : 0;
      const telefonoWhatsApp = normalizarTelefonoWhatsApp(cliente.telefono);
      const historial = historialEnvios[cliente.id] || historialEnvios[cliente.nombre] || null;
      const diasDesdeUltimoEnvio = historial?.fecha ? calcularDiasDesde(historial.fecha) : null;
      const clasificacion = Number(cliente.clasificacion) || 0;
      const razonesBloqueo = [];

      if (!telefonoWhatsApp) {
        razonesBloqueo.push('Sin teléfono válido para WhatsApp');
      }

      if (clasificacion < reglas.minClasificacion) {
        razonesBloqueo.push(`Clasificación menor a ${reglas.minClasificacion} estrellas`);
      }

      if (totalSaldoPendiente > reglas.maxSaldoPendiente) {
        razonesBloqueo.push(`Saldo pendiente superior a ${formatearMoneda(reglas.maxSaldoPendiente)}`);
      }

      if (facturasPendientes.length > reglas.maxFacturasPendientes) {
        razonesBloqueo.push(`Más de ${reglas.maxFacturasPendientes} facturas pendientes`);
      }

      if (maxDiasAtraso > reglas.maxDiasAtraso) {
        razonesBloqueo.push(`Factura más atrasada supera ${reglas.maxDiasAtraso} días`);
      }

      if (diasDesdeUltimoEnvio !== null && diasDesdeUltimoEnvio < reglas.diasReenvio) {
        razonesBloqueo.push(`Se le envió catálogo hace ${diasDesdeUltimoEnvio} días`);
      }

      const puntaje =
        (clasificacion * 25) +
        Math.max(0, 25 - facturasPendientes.length * 8) +
        Math.max(0, 25 - Math.round(totalSaldoPendiente / 10000)) +
        Math.max(0, 25 - maxDiasAtraso);

      return {
        ...cliente,
        telefonoWhatsApp,
        clasificacion,
        totalSaldoPendiente,
        facturasPendientes,
        cantidadFacturasPendientes: facturasPendientes.length,
        maxDiasAtraso,
        ultimaFechaEnvio: historial?.fecha || null,
        ultimoCanalEnvio: historial?.canal || null,
        diasDesdeUltimoEnvio,
        apto: razonesBloqueo.length === 0,
        razonesBloqueo,
        puntajeCampana: puntaje
      };
    });

    const clientesSegmentados = campaignRows.filter((cliente) => {
      const categoriaCliente = normalizarTexto(cliente.categoria || cliente.centro_comercial || cliente.segmento || '');

      if (segmentoCliente === 'sin-categoria') {
        return !categoriaCliente;
      }

      if (segmentoCliente === 'droguerias') {
        return categoriaCliente === 'droguerias';
      }

      if (segmentoCliente.startsWith('categoria:')) {
        return categoriaCliente === segmentoCliente.slice('categoria:'.length);
      }

      if (segmentoCliente.startsWith('centro:')) {
        return normalizarTexto(cliente.centro_comercial) === segmentoCliente.slice('centro:'.length);
      }

      return true;
    });

    const aptos = clientesSegmentados
      .filter((cliente) => (soloConTelefono ? !!cliente.telefonoWhatsApp : true))
      .filter((cliente) => cliente.apto)
      .sort((left, right) => right.puntajeCampana - left.puntajeCampana);

    const noAptos = clientesSegmentados
      .filter((cliente) => cliente.razonesBloqueo.length > 0)
      .sort((left, right) => right.totalSaldoPendiente - left.totalSaldoPendiente);

    const enviadosRecientes = clientesSegmentados.filter(
      (cliente) => cliente.diasDesdeUltimoEnvio !== null && cliente.diasDesdeUltimoEnvio < reglas.diasReenvio
    ).length;

    return {
      aptos,
      noAptos,
      totalClientes: clientesSegmentados.length,
      enviadosRecientes,
      ultimaActualizacion: new Date().toISOString()
    };
  }, [abonos, clientes, facturas, historialEnvios, reglas, segmentoCliente, soloConTelefono]);

  const construirUrlCatalogo = (cliente = null, categoria = categoriaSeleccionada) => {
    if (!publicBaseUrl || esOrigenLocal(publicBaseUrl)) {
      return '';
    }

    const params = new URLSearchParams();

    if (categoria && categoria !== 'Todas') {
      params.set('categoria', categoria);
    }

    if (cliente) {
      if (cliente.nombre) {
        params.set('cliente', cliente.nombre.trim());
      }

      const telefonoCliente = cliente.telefonoWhatsApp || normalizarTelefonoWhatsApp(cliente.telefono);
      if (telefonoCliente) {
        params.set('telefono', telefonoCliente);
      }

      if (cliente.direccion) {
        params.set('direccion', cliente.direccion.trim());
      }

      if (cliente.id) {
        params.set('clienteId', String(cliente.id));
      }
    }

    const queryString = params.toString();
    return `${normalizarBaseUrl(publicBaseUrl)}/catalogo-clientes${queryString ? `?${queryString}` : ''}`;
  };

  const linkCatalogo = construirUrlCatalogo();
  const linkCompartibleDisponible = Boolean(linkCatalogo) && !esOrigenLocal(linkCatalogo);

  const registrarEnvio = (cliente, canal) => {
    const nextHistory = {
      ...historialEnvios,
      [cliente.id]: {
        fecha: new Date().toISOString(),
        canal
      }
    };

    setHistorialEnvios(nextHistory);
    guardarHistorialEnvios(nextHistory);
  };

  const manejarCambioRegla = (campo, valor) => {
    setReglas((prev) => ({
      ...prev,
      [campo]: Number(valor) || 0
    }));
  };

  const guardarUrlPublica = () => {
    const normalizedUrl = normalizarBaseUrl(publicBaseUrlInput);

    if (!normalizedUrl) {
      setPublicBaseUrl('');
      setMensajeAccion('Debes ingresar la URL pública real de la plataforma para compartirla.');
      return;
    }

    if (esOrigenLocal(normalizedUrl)) {
      setMensajeAccion('La URL pública no puede ser localhost. Usa la dirección real de tu plataforma desplegada.');
      return;
    }

    try {
      const parsed = new URL(normalizedUrl);
      setPublicBaseUrl(parsed.origin);
      setPublicBaseUrlInput(parsed.origin);
      setMensajeAccion(`URL pública guardada: ${parsed.origin}`);
    } catch (error) {
      setMensajeAccion('La URL pública no es válida. Ejemplo: https://tu-dominio.com');
    }
  };

  const copiarLink = async (cliente = null) => {
    const linkFinal = cliente ? construirUrlCatalogo(cliente, categoriaSeleccionada) : linkCatalogo;

    if (!linkFinal || esOrigenLocal(linkFinal)) {
      setMensajeAccion('Configura primero la URL pública real de la plataforma antes de copiar o compartir el link.');
      return;
    }

    try {
      await navigator.clipboard.writeText(linkFinal);

      if (cliente) {
        registrarEnvio(cliente, 'copia-link');
        setMensajeAccion(`Link copiado para ${cliente.nombre} con categoría ${categoriaSeleccionada === 'Todas' ? 'general' : categoriaSeleccionada}.`);
      } else {
        setMensajeAccion(`Link general del catálogo copiado con categoría ${categoriaSeleccionada === 'Todas' ? 'general' : categoriaSeleccionada}.`);
      }
    } catch (copyError) {
      console.error('Error copiando link:', copyError);
      setMensajeAccion('No se pudo copiar el link automáticamente.');
    }
  };

  const enviarPorWhatsApp = (cliente) => {
    if (!cliente.telefonoWhatsApp) {
      setMensajeAccion(`El cliente ${cliente.nombre} no tiene un teléfono válido.`);
      return;
    }

    const linkFinal = construirUrlCatalogo(cliente, categoriaSeleccionada);
    if (!linkFinal || esOrigenLocal(linkFinal)) {
      setMensajeAccion('No se puede enviar por WhatsApp mientras la URL pública siga vacía o apunte a localhost.');
      return;
    }

    const mensajePlano = [
      `Hola ${cliente.nombre},`,
      'Te comparto nuestro catálogo digital de Distribuciones Pharmahumanos para que revises productos y puedas hacer tu pedido fácilmente.',
      '',
      linkFinal
    ].join('\n');

    const mensaje = encodeURIComponent(mensajePlano);

    window.open(`https://wa.me/${cliente.telefonoWhatsApp}?text=${mensaje}`, '_blank', 'noopener,noreferrer');
    registrarEnvio(cliente, 'whatsapp');
    setMensajeAccion(`Se abrió WhatsApp para ${cliente.nombre} con categoría ${categoriaSeleccionada === 'Todas' ? 'general' : categoriaSeleccionada}.`);
  };

  return (
    <div className="campana-catalogo-page">
      <div className="campana-catalogo-shell">
        <header className="campana-hero">
          <div>
            <span className="campana-eyebrow">Campaña Catálogo</span>
            <h1>Clientes aptos para compartir la plataforma</h1>
            <p>
              La campaña prioriza clientes con cartera sana, pocas facturas pendientes y buen historial para compartir
              el catálogo sin exponer datos sensibles en la URL.
            </p>
          </div>
          <div className="campana-hero-actions">
            <button className="campaign-btn campaign-btn-secondary" onClick={() => copiarLink()}>
              Copiar link general
            </button>
            <a
              className="campaign-btn campaign-btn-primary"
              href={linkCompartibleDisponible ? linkCatalogo : '#'}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => {
                if (!linkCompartibleDisponible) {
                  event.preventDefault();
                  setMensajeAccion('Configura la URL pública real antes de abrir o compartir el catálogo.');
                }
              }}
            >
              Ver catálogo público
            </a>
          </div>
        </header>

        <section className="criterios-panel url-config-panel">
          <div className="panel-header">
            <h2>URL pública para compartir</h2>
            <p>
              Esta es la dirección que se enviará al cliente. Debe ser la URL real desplegada, no la del entorno local.
            </p>
          </div>

          <div className="url-config-grid">
            <label className="url-config-field">
              <span>Base pública de la plataforma</span>
              <input
                type="url"
                placeholder="https://tu-dominio.com"
                value={publicBaseUrlInput}
                onChange={(event) => setPublicBaseUrlInput(event.target.value)}
              />
            </label>
            <button className="campaign-btn campaign-btn-primary" onClick={guardarUrlPublica}>
              Guardar URL pública
            </button>
          </div>

          <div className="url-helper-block">
            <span className="url-helper-label">Link final que se compartirá</span>
            <strong>{linkCompartibleDisponible ? linkCatalogo : 'Configura una URL pública válida'}</strong>
          </div>

          {!linkCompartibleDisponible && (
            <div className="url-warning">
              El envío por WhatsApp está bloqueado hasta que definas una URL pública real. Si mandas `localhost`, el cliente no podrá abrir el enlace.
            </div>
          )}
        </section>

        <section className="criterios-panel">
          <div className="panel-header">
            <h2>Selección de categoría del catálogo</h2>
            <p>
              La categoría elegida se añadirá automáticamente a la URL que se comparte con cada cliente.
            </p>
          </div>

          <div className="url-config-grid">
            <label className="url-config-field">
              <span>Categoría para el cliente</span>
              <select
                value={categoriaSeleccionada}
                onChange={(event) => setCategoriaSeleccionada(event.target.value)}
              >
                {categoriasDisponibles.map((categoria) => (
                  <option key={categoria} value={categoria}>
                    {categoria}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="url-helper-block">
            <span className="url-helper-label">Vista previa del link</span>
            <strong>{linkCompartibleDisponible ? linkCatalogo : 'Configura una URL pública válida'}</strong>
          </div>
        </section>

        <section className="recordatorio-banner">
          <div>
            <strong>Recordatorio visible</strong>
            <p>
              Hoy tienes {resumenCampana.aptos.length} cliente(s) aptos para compartir el catálogo y {resumenCampana.enviadosRecientes}{' '}
              contacto(s) en enfriamiento por envío reciente.
            </p>
          </div>
          <div className="recordatorio-meta">
            <span>Actualizado: {formatearFecha(resumenCampana.ultimaActualizacion)}</span>
            <label>
              <input
                type="checkbox"
                checked={soloConTelefono}
                onChange={(event) => setSoloConTelefono(event.target.checked)}
              />
              Solo mostrar clientes con WhatsApp
            </label>
          </div>
        </section>

        <section className="criterios-panel campaign-segment-panel">
          <div className="panel-header">
            <h2>Segmento de campaña</h2>
            <p>Selecciona qué tipo de clientes quieres incluir antes de enviar el catálogo.</p>
          </div>
          <label>
            <span>Enviar campaña a</span>
            <div className="segmento-campana-lista">
              {opcionesSegmento.map((opcion) => (
                <button
                  key={opcion.value}
                  type="button"
                  className={`segmento-campana-item ${segmentoCliente === opcion.value ? 'active' : ''}`}
                  onClick={() => setSegmentoCliente(opcion.value)}
                >
                  {segmentoCliente === opcion.value && <span className="segmento-check">✓</span>}
                  {opcion.label}
                </button>
              ))}
            </div>
          </label>
        </section>

        {mensajeAccion && <div className="campana-feedback">{mensajeAccion}</div>}
        {error && <div className="campana-error">{error}</div>}

        <section className="criterios-panel">
          <div className="panel-header">
            <h2>Lógica de negocio aplicada</h2>
            <p>Estos criterios deciden quién entra a la campaña y quién se bloquea temporalmente.</p>
          </div>

          <div className="criterios-grid">
            <label>
              <span>Saldo pendiente máximo</span>
              <input
                type="number"
                min="0"
                value={reglas.maxSaldoPendiente}
                onChange={(event) => manejarCambioRegla('maxSaldoPendiente', event.target.value)}
              />
            </label>
            <label>
              <span>Facturas pendientes máximas</span>
              <input
                type="number"
                min="0"
                value={reglas.maxFacturasPendientes}
                onChange={(event) => manejarCambioRegla('maxFacturasPendientes', event.target.value)}
              />
            </label>
            <label>
              <span>Días máximos de atraso</span>
              <input
                type="number"
                min="0"
                value={reglas.maxDiasAtraso}
                onChange={(event) => manejarCambioRegla('maxDiasAtraso', event.target.value)}
              />
            </label>
            <label>
              <span>Clasificación mínima</span>
              <input
                type="number"
                min="1"
                max="5"
                value={reglas.minClasificacion}
                onChange={(event) => manejarCambioRegla('minClasificacion', event.target.value)}
              />
            </label>
            <label>
              <span>Días para reenviar catálogo</span>
              <input
                type="number"
                min="1"
                value={reglas.diasReenvio}
                onChange={(event) => manejarCambioRegla('diasReenvio', event.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="campana-stats">
          <article className="stat-card eligible">
            <span className="stat-label">Aptos</span>
            <strong>{resumenCampana.aptos.length}</strong>
            <p>Clientes recomendados para compartir catálogo hoy.</p>
          </article>
          <article className="stat-card blocked">
            <span className="stat-label">No aptos</span>
            <strong>{resumenCampana.noAptos.length}</strong>
            <p>Clientes con deuda alta, atraso o envío reciente.</p>
          </article>
          <article className="stat-card total">
            <span className="stat-label">Total evaluados</span>
            <strong>{resumenCampana.totalClientes}</strong>
            <p>Base revisada entre clientes, facturas y abonos.</p>
          </article>
        </section>

        <section className="clientes-section">
          <div className="panel-header">
            <h2>Clientes aptos para compartir catálogo</h2>
            <p>Ordenados por mejor oportunidad comercial según clasificación y nivel de cartera.</p>
          </div>

          {cargando ? (
            <div className="empty-state">Cargando campaña...</div>
          ) : resumenCampana.aptos.length === 0 ? (
            <div className="empty-state">
              No hay clientes aptos con las reglas actuales. Ajusta los criterios para ampliar la campaña.
            </div>
          ) : (
            <div className="campaign-grid">
              {resumenCampana.aptos.map((cliente) => (
                <article key={cliente.id} className="campaign-card eligible-card">
                  <div className="campaign-card-top">
                    <div>
                      <h3>{cliente.nombre}</h3>
                      <p>{cliente.centro_comercial || 'Sin centro comercial'}</p>
                    </div>
                    <span className="score-chip">Score {cliente.puntajeCampana}</span>
                  </div>

                  <div className="campaign-metrics">
                    <div>
                      <span>Clasificación</span>
                      <strong>{cliente.clasificacion} ★</strong>
                    </div>
                    <div>
                      <span>Saldo pendiente</span>
                      <strong>{formatearMoneda(cliente.totalSaldoPendiente)}</strong>
                    </div>
                  </div>

                  <div className="campaign-details">
                    <span>Tel: {cliente.telefono || 'Sin registro'}</span>
                    <span>Último envío: {formatearFecha(cliente.ultimaFechaEnvio)}</span>
                  </div>

                  <div className="campaign-actions">
                    <button className="campaign-btn campaign-btn-primary" onClick={() => enviarPorWhatsApp(cliente)}>
                      Enviar por WhatsApp
                    </button>
                    <button className="campaign-btn campaign-btn-secondary" onClick={() => copiarLink(cliente)}>
                      Copiar link
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="clientes-section muted-section">
          <div className="panel-header panel-header-inline">
            <div>
              <h2>Clientes no aptos ahora</h2>
              <p>Esta lista sirve como recordatorio de por qué aún no conviene enviarles la plataforma.</p>
            </div>
            <button className="campaign-btn campaign-btn-secondary" onClick={() => setMostrarNoAptos((prev) => !prev)}>
              {mostrarNoAptos ? 'Ocultar detalle' : 'Mostrar detalle'}
            </button>
          </div>

          {mostrarNoAptos && (
            <div className="campaign-grid blocked-grid">
              {resumenCampana.noAptos.map((cliente) => (
                <article key={cliente.id} className="campaign-card blocked-card">
                  <div className="campaign-card-top">
                    <div>
                      <h3>{cliente.nombre}</h3>
                      <p>{cliente.centro_comercial || 'Sin centro comercial'}</p>
                    </div>
                    <span className="blocked-chip">Bloqueado</span>
                  </div>

                  <div className="campaign-metrics compact-metrics">
                    <div>
                      <span>Saldo</span>
                      <strong>{formatearMoneda(cliente.totalSaldoPendiente)}</strong>
                    </div>
                    <div>
                      <span>Pendientes</span>
                      <strong>{cliente.cantidadFacturasPendientes}</strong>
                    </div>
                    <div>
                      <span>Atraso</span>
                      <strong>{cliente.maxDiasAtraso} días</strong>
                    </div>
                  </div>

                  <ul className="blocked-reasons">
                    {cliente.razonesBloqueo.map((razon) => (
                      <li key={razon}>{razon}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default CampanaCatalogo;
