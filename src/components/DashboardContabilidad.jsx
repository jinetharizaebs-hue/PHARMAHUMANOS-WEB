import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { supabase } from '../lib/supabase';
import { fetchAllProducts } from '../lib/productQueries';
import { calcularRentabilidadFactura } from '../lib/rentabilidadUtils';
import './DashboardContabilidad.css';

// El mes de un vistazo: ventas, cobros, gastos, pagos a proveedores y utilidad,
// más lo que deben los clientes y lo que se debe a proveedores.

const MESES_GRAFICA = 6;
const MESES_HISTORIA = 24; // cuántos meses atrás se pueden consultar
const COLOR_VENTAS = '#2a78d6';
const COLOR_COSTOS = '#eb6834';

const hoy = () => new Date().toLocaleDateString('en-CA'); // AAAA-MM-DD en hora local
const mesActual = () => hoy().slice(0, 7);

const desplazarMes = (mes, delta) => {
  const [anio, m] = mes.split('-').map(Number);
  const fecha = new Date(anio, m - 1 + delta, 1);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
};

const nombreMes = (mes, formato = 'long') => {
  const [anio, m] = mes.split('-').map(Number);
  const texto = new Date(anio, m - 1, 1).toLocaleDateString('es-CO', { month: formato, year: 'numeric' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

const formatCurrency = (num) => new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0
}).format(num || 0);

const formatCorto = (num) => {
  const abs = Math.abs(num);
  if (abs >= 1e6) return `$${(num / 1e6).toFixed(1)} M`;
  if (abs >= 1e3) return `$${Math.round(num / 1e3)} mil`;
  return `$${Math.round(num)}`;
};

const fechaCorta = (valor) => String(valor || '').slice(0, 10);
const diasEntre = (desde, hasta) => Math.floor((new Date(`${hasta}T00:00:00`) - new Date(`${desde}T00:00:00`)) / 86400000);
const sumar = (lista, campo) => lista.reduce((sum, item) => sum + (Number(item[campo]) || 0), 0);

const TRAMOS_CARTERA = [
  { clave: '0-30', etiqueta: '0 a 30 días', max: 30 },
  { clave: '31-60', etiqueta: '31 a 60 días', max: 60 },
  { clave: '61-90', etiqueta: '61 a 90 días', max: 90 },
  { clave: '90+', etiqueta: 'Más de 90 días', max: Infinity }
];

const Tarjeta = ({ titulo, valor, detalle, variacion, tono, invertirColor = false }) => {
  const subeEsBueno = !invertirColor;
  const claseVariacion = variacion === null || variacion === undefined
    ? ''
    : ((variacion >= 0) === subeEsBueno ? 'bueno' : 'malo');
  return (
    <div className={`dc-tarjeta ${tono || ''}`}>
      <div className="dc-tarjeta-titulo">{titulo}</div>
      <div className="dc-tarjeta-valor">{formatCurrency(valor)}</div>
      {detalle && <div className="dc-tarjeta-detalle">{detalle}</div>}
      {variacion !== null && variacion !== undefined && (
        <div className={`dc-variacion ${claseVariacion}`}>
          {variacion >= 0 ? '▲' : '▼'} {Math.abs(variacion).toFixed(0)}% vs. mes anterior
        </div>
      )}
    </div>
  );
};

const DashboardContabilidad = () => {
  const [mes, setMes] = useState(mesActual());
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [tablasConError, setTablasConError] = useState([]);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      setError('');
      const desde = `${desplazarMes(mesActual(), -(MESES_HISTORIA + MESES_GRAFICA))}-01`;

      // Todas las facturas (sin productos) para la cartera; con productos solo
      // las del periodo consultable, para calcular el costo de la mercancía
      // Cada tabla se carga por separado: si una falla (p. ej. permisos),
      // el resto del dashboard se muestra igual y se avisa cuál faltó
      const fallidas = [];
      const cargar = async (opciones) => {
        try {
          return await fetchAllProducts({ supabaseClient: supabase, ...opciones });
        } catch (err) {
          console.error(`Error cargando ${opciones.table}:`, err);
          fallidas.push(`${opciones.table} (${err.message})`);
          return [];
        }
      };

      const [facturas, facturasConProductos, abonos, gastos, pagosProveedores, facturasProveedores] = await Promise.all([
        cargar({ table: 'facturas', select: 'id, fecha, total, cliente' }),
        cargar({ table: 'facturas', select: 'id, productos', filters: [{ field: 'fecha', operator: 'gte', value: desde }] }),
        cargar({ table: 'abonos', select: 'factura_id, monto, fecha' }),
        cargar({ table: 'gastos_empresa', select: 'fecha, monto', filters: [{ field: 'fecha', operator: 'gte', value: desde }] }),
        cargar({ table: 'pagos_proveedores', select: 'fecha, monto', filters: [{ field: 'fecha', operator: 'gte', value: desde }] }),
        cargar({ table: 'facturas_proveedores', select: 'id, numero_factura, saldo, fecha_vencimiento, proveedores(nombre)' })
      ]);
      setTablasConError([...new Set(fallidas)]);

      const productosPorFactura = facturasConProductos.reduce((acc, f) => {
        acc[f.id] = f.productos;
        return acc;
      }, {});

      setDatos({
        facturas: facturas.map(f => ({ ...f, fecha: fechaCorta(f.fecha), total: Number(f.total) || 0, productos: productosPorFactura[f.id] || [] })),
        abonos: abonos.map(a => ({ ...a, fecha: fechaCorta(a.fecha), monto: Number(a.monto) || 0 })),
        gastos: gastos.map(g => ({ ...g, fecha: fechaCorta(g.fecha) })),
        pagosProveedores: pagosProveedores.map(p => ({ ...p, fecha: fechaCorta(p.fecha) })),
        facturasProveedores
      });
    } catch (err) {
      console.error('Error cargando dashboard de contabilidad:', err);
      setError('No fue posible cargar la información: ' + (err.message || 'error desconocido'));
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  if (cargando) {
    return <div className="dc-container"><p className="dc-vacio">⏳ Cargando contabilidad...</p></div>;
  }

  if (error || !datos) {
    return (
      <div className="dc-container">
        <div className="dc-error">{error}</div>
        <button className="dc-boton" onClick={cargarDatos}>Reintentar</button>
      </div>
    );
  }

  // ========================
  // RESULTADOS POR MES
  // ========================
  const resultadoDelMes = (m) => {
    const facturasMes = datos.facturas.filter(f => f.fecha.startsWith(m));
    let costoMercancia = 0;
    let costoEstimado = false;
    facturasMes.forEach(f => {
      const rentabilidad = calcularRentabilidadFactura(f.productos);
      costoMercancia += rentabilidad.costoTotal;
      if (rentabilidad.usaCostoEstimado) costoEstimado = true;
    });

    const ventas = sumar(facturasMes, 'total');
    const gastos = sumar(datos.gastos.filter(g => g.fecha.startsWith(m)), 'monto');
    const cobrado = sumar(datos.abonos.filter(a => a.fecha.startsWith(m)), 'monto');
    const pagosProveedores = sumar(datos.pagosProveedores.filter(p => p.fecha.startsWith(m)), 'monto');

    return {
      mes: m,
      ventas,
      numeroVentas: facturasMes.length,
      costoMercancia,
      costoEstimado,
      gastos,
      utilidad: ventas - costoMercancia - gastos,
      cobrado,
      pagosProveedores,
      flujoCaja: cobrado - gastos - pagosProveedores
    };
  };

  const actual = resultadoDelMes(mes);
  const anterior = resultadoDelMes(desplazarMes(mes, -1));
  const historico = Array.from({ length: MESES_GRAFICA }, (_, i) => resultadoDelMes(desplazarMes(mes, i - MESES_GRAFICA + 1)));
  const datosGrafica = historico.map(r => ({
    mes: nombreMes(r.mes, 'short'),
    Ventas: r.ventas,
    'Costos y gastos': r.costoMercancia + r.gastos
  }));
  const margen = actual.ventas > 0 ? (actual.utilidad / actual.ventas) * 100 : null;

  // ========================
  // CARTERA (lo que deben los clientes, a hoy)
  // ========================
  const abonadoPorFactura = datos.abonos.reduce((acc, a) => {
    acc[a.factura_id] = (acc[a.factura_id] || 0) + a.monto;
    return acc;
  }, {});
  const fechaHoy = hoy();
  const facturasPendientes = datos.facturas
    .map(f => ({ ...f, saldo: f.total - (abonadoPorFactura[f.id] || 0), dias: diasEntre(f.fecha, fechaHoy) }))
    .filter(f => f.saldo > 1);
  const totalPorCobrar = sumar(facturasPendientes, 'saldo');
  const tramos = TRAMOS_CARTERA.map((tramo, i) => {
    const min = i === 0 ? -Infinity : TRAMOS_CARTERA[i - 1].max;
    const lista = facturasPendientes.filter(f => f.dias > min && f.dias <= tramo.max);
    return { ...tramo, total: sumar(lista, 'saldo'), cantidad: lista.length };
  });
  const deudaPorCliente = Object.values(facturasPendientes.reduce((acc, f) => {
    const cliente = f.cliente || 'Sin nombre';
    acc[cliente] = acc[cliente] || { cliente, saldo: 0, facturas: 0, diasMax: 0 };
    acc[cliente].saldo += f.saldo;
    acc[cliente].facturas += 1;
    acc[cliente].diasMax = Math.max(acc[cliente].diasMax, f.dias);
    return acc;
  }, {})).sort((a, b) => b.saldo - a.saldo);

  // ========================
  // PROVEEDORES (lo que se debe, a hoy)
  // ========================
  const facturasPorPagar = datos.facturasProveedores
    .map(f => ({ ...f, saldo: Number(f.saldo) || 0, vence: fechaCorta(f.fecha_vencimiento) }))
    .filter(f => f.saldo !== 0);
  const totalPorPagar = sumar(facturasPorPagar, 'saldo');
  const vencidas = facturasPorPagar.filter(f => f.saldo > 0 && f.vence && f.vence < fechaHoy);
  const proximas = facturasPorPagar
    .filter(f => f.saldo > 0 && f.vence && f.vence >= fechaHoy && diasEntre(fechaHoy, f.vence) <= 7)
    .sort((a, b) => a.vence.localeCompare(b.vence));

  const comparar = (valorActual, valorAnterior) => {
    if (!valorAnterior) return null;
    return ((valorActual - valorAnterior) / Math.abs(valorAnterior)) * 100;
  };

  return (
    <div className="dc-container">
      <div className="dc-header">
        <h1>📊 Dashboard de Contabilidad</h1>
        <label className="dc-mes">
          Mes
          <input
            type="month"
            value={mes}
            min={desplazarMes(mesActual(), -MESES_HISTORIA)}
            max={mesActual()}
            onChange={(e) => setMes(e.target.value || mesActual())}
          />
        </label>
      </div>

      {tablasConError.length > 0 && (
        <div className="dc-error">
          ⚠️ Algunas cifras están incompletas porque no se pudo leer: {tablasConError.join(', ')}.
          Si dice "permission denied", ejecuta <strong>sql/PERMISOS_CONTABILIDAD.sql</strong> en Supabase.
        </div>
      )}

      {/* RESULTADO DEL MES */}
      <h2 className="dc-seccion">Resultado de {nombreMes(mes)}</h2>
      <div className="dc-tarjetas">
        <Tarjeta
          titulo="Ventas facturadas"
          valor={actual.ventas}
          detalle={`${actual.numeroVentas} facturas`}
          variacion={comparar(actual.ventas, anterior.ventas)}
        />
        <Tarjeta
          titulo="Costo de la mercancía"
          valor={actual.costoMercancia}
          detalle={actual.costoEstimado ? '⚠️ Incluye costos estimados (80% del precio)' : 'Según costo de compra'}
        />
        <Tarjeta
          titulo="Gastos operativos"
          valor={actual.gastos}
          detalle={<Link to="/gastos">Ver gastos →</Link>}
          variacion={comparar(actual.gastos, anterior.gastos)}
          invertirColor
        />
        <Tarjeta
          titulo="Utilidad estimada"
          valor={actual.utilidad}
          detalle={margen !== null ? `Margen ${margen.toFixed(1)}% sobre ventas` : 'Sin ventas este mes'}
          tono={actual.utilidad >= 0 ? 'positivo' : 'negativo'}
        />
      </div>

      <h2 className="dc-seccion">Dinero que entró y salió en {nombreMes(mes)}</h2>
      <div className="dc-tarjetas">
        <Tarjeta titulo="Cobrado a clientes" valor={actual.cobrado} variacion={comparar(actual.cobrado, anterior.cobrado)} />
        <Tarjeta titulo="Gastos pagados" valor={actual.gastos} />
        <Tarjeta titulo="Pagado a proveedores" valor={actual.pagosProveedores} />
        <Tarjeta
          titulo="Flujo de caja"
          valor={actual.flujoCaja}
          detalle="Cobrado − gastos − pagos a proveedores"
          tono={actual.flujoCaja >= 0 ? 'positivo' : 'negativo'}
        />
      </div>

      {/* TENDENCIA */}
      <div className="dc-caja">
        <h3>Ventas contra costos y gastos · últimos {MESES_GRAFICA} meses</h3>
        <div className="dc-grafica">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={datosGrafica} barGap={2} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8e8e6" />
              <XAxis dataKey="mes" tick={{ fill: '#52514e', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={formatCorto} tick={{ fill: '#52514e', fontSize: 12 }} axisLine={false} tickLine={false} width={70} />
              <Tooltip formatter={(valor) => formatCurrency(valor)} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
              <Legend />
              <Bar dataKey="Ventas" fill={COLOR_VENTAS} radius={[4, 4, 0, 0]} maxBarSize={36} />
              <Bar dataKey="Costos y gastos" fill={COLOR_COSTOS} radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="dc-tabla-wrapper">
          <table className="dc-tabla">
            <thead>
              <tr>
                <th>Mes</th>
                <th>Ventas</th>
                <th>Costo mercancía</th>
                <th>Gastos</th>
                <th>Utilidad</th>
                <th>Cobrado</th>
              </tr>
            </thead>
            <tbody>
              {historico.map(r => (
                <tr key={r.mes} className={r.mes === mes ? 'actual' : ''}>
                  <td>{nombreMes(r.mes, 'short')}</td>
                  <td>{formatCurrency(r.ventas)}</td>
                  <td>{formatCurrency(r.costoMercancia)}{r.costoEstimado ? ' *' : ''}</td>
                  <td>{formatCurrency(r.gastos)}</td>
                  <td className={r.utilidad >= 0 ? 'positivo' : 'negativo'}>{formatCurrency(r.utilidad)}</td>
                  <td>{formatCurrency(r.cobrado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {historico.some(r => r.costoEstimado) && (
            <p className="dc-nota">* Algunos productos no tienen costo de compra registrado; se estimó en el 80% del precio de venta.</p>
          )}
        </div>
      </div>

      {/* SALDOS A HOY */}
      <h2 className="dc-seccion">Saldos a hoy</h2>
      <div className="dc-columnas">
        <div className="dc-caja">
          <div className="dc-caja-header">
            <h3>💵 Te deben los clientes</h3>
            <Link to="/reportes-cobros">Reportes de cobros →</Link>
          </div>
          <div className="dc-grande">{formatCurrency(totalPorCobrar)}</div>
          <div className="dc-tramos">
            {tramos.map(t => (
              <div key={t.clave} className={`dc-tramo tramo-${t.clave.replace('+', 'mas')}`}>
                <span>{t.etiqueta}</span>
                <strong>{formatCurrency(t.total)}</strong>
                <small>{t.cantidad} facturas</small>
              </div>
            ))}
          </div>
          <h4>Clientes con mayor saldo</h4>
          {deudaPorCliente.length === 0 ? (
            <p className="dc-vacio">Ningún cliente tiene saldo pendiente. 🎉</p>
          ) : (
            <ul className="dc-lista">
              {deudaPorCliente.slice(0, 5).map(c => (
                <li key={c.cliente}>
                  <span>{c.cliente}<small>{c.facturas} facturas · la más antigua de {c.diasMax} días</small></span>
                  <strong>{formatCurrency(c.saldo)}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="dc-caja">
          <div className="dc-caja-header">
            <h3>🏦 Debes a proveedores</h3>
            <Link to="/cuentas-por-pagar">Cuentas por pagar →</Link>
          </div>
          <div className="dc-grande">{formatCurrency(totalPorPagar)}</div>
          {vencidas.length > 0 && (
            <div className="dc-alerta">
              ⚠️ {vencidas.length} {vencidas.length === 1 ? 'factura vencida' : 'facturas vencidas'} por {formatCurrency(sumar(vencidas, 'saldo'))}
            </div>
          )}
          <h4>Vencen en los próximos 7 días</h4>
          {proximas.length === 0 ? (
            <p className="dc-vacio">Nada vence esta semana.</p>
          ) : (
            <ul className="dc-lista">
              {proximas.map(f => (
                <li key={f.id}>
                  <span>{f.proveedores?.nombre || 'Proveedor'}<small>Factura {f.numero_factura} · vence {new Date(`${f.vence}T00:00:00`).toLocaleDateString('es-CO')}</small></span>
                  <strong>{formatCurrency(f.saldo)}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardContabilidad;
