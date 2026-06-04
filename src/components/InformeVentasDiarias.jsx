import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './InformeVentasDiarias.css';

const PAGE_SIZE = 1000;

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

const formatMoney = (value = 0) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const formatDateLong = (isoDate) => {
  const date = parseLocalDate(isoDate);
  if (!date) return isoDate || 'Sin fecha';

  return date.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const formatMonthName = (monthKey) => {
  const [year, month] = String(monthKey || '').split('-').map(Number);
  if (!year || !month) return monthKey || 'Sin mes';

  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('es-CO', {
    month: 'long',
    year: 'numeric'
  });
};

const fetchAllFacturas = async (fromDate, toDate) => {
  let from = 0;
  let allRows = [];

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('facturas')
      .select('id, fecha, total, vendedor, cliente')
      .gte('fecha', fromDate)
      .lte('fecha', toDate)
      .order('fecha', { ascending: false })
      .range(from, to);

    if (error) throw error;

    const batch = data || [];
    allRows = allRows.concat(batch);

    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return allRows;
};

const InformeVentasDiarias = () => {
  const navigate = useNavigate();
  const [cargando, setCargando] = useState(true);
  const [facturas, setFacturas] = useState([]);
  const [filtroVendedor, setFiltroVendedor] = useState('todos');
  const [fechaInicio, setFechaInicio] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [fechaFin, setFechaFin] = useState(() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return toLocalDateKey(lastDay);
  });

  useEffect(() => {
    const cargarFacturas = async () => {
      try {
        setCargando(true);
        const data = await fetchAllFacturas(fechaInicio, fechaFin);
        setFacturas(data);
      } catch (error) {
        console.error('Error cargando facturas para informe diario:', error);
        alert('No se pudo cargar el informe de ventas diarias.');
      } finally {
        setCargando(false);
      }
    };

    cargarFacturas();
  }, [fechaInicio, fechaFin]);

  const vendedores = useMemo(() => {
    const names = new Set();
    facturas.forEach((f) => {
      if (f.vendedor) names.add(f.vendedor);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'es'));
  }, [facturas]);

  const facturasFiltradas = useMemo(() => {
    if (filtroVendedor === 'todos') return facturas;
    return facturas.filter((f) => f.vendedor === filtroVendedor);
  }, [facturas, filtroVendedor]);

  const resumenGeneral = useMemo(() => {
    const total = facturasFiltradas.reduce((sum, factura) => sum + (parseFloat(factura.total) || 0), 0);
    const cantidad = facturasFiltradas.length;
    const promedio = cantidad ? total / cantidad : 0;

    return { total, cantidad, promedio };
  }, [facturasFiltradas]);

  const resumenPorVendedor = useMemo(() => {
    const grouped = facturasFiltradas.reduce((acc, factura) => {
      const vendedor = factura.vendedor || 'Sin vendedor';
      const total = parseFloat(factura.total) || 0;

      if (!acc[vendedor]) {
        acc[vendedor] = { vendedor, facturas: 0, total: 0, promedio: 0 };
      }

      acc[vendedor].facturas += 1;
      acc[vendedor].total += total;
      return acc;
    }, {});

    return Object.values(grouped)
      .map((row) => ({
        ...row,
        promedio: row.facturas ? row.total / row.facturas : 0
      }))
      .sort((a, b) => b.total - a.total);
  }, [facturasFiltradas]);

  const ventasPorDia = useMemo(() => {
    const grouped = facturasFiltradas.reduce((acc, factura) => {
      const fecha = factura.fecha || 'Sin fecha';
      const total = parseFloat(factura.total) || 0;

      if (!acc[fecha]) {
        acc[fecha] = { fecha, facturas: 0, total: 0, promedio: 0 };
      }

      acc[fecha].facturas += 1;
      acc[fecha].total += total;
      return acc;
    }, {});

    return Object.values(grouped)
      .map((row) => ({
        ...row,
        promedio: row.facturas ? row.total / row.facturas : 0
      }))
      .sort((a, b) => {
        const dateA = parseLocalDate(a.fecha) || new Date(0);
        const dateB = parseLocalDate(b.fecha) || new Date(0);
        return dateB - dateA;
      });
  }, [facturasFiltradas]);

  const ventasPorMes = useMemo(() => {
    const grouped = facturasFiltradas.reduce((acc, factura) => {
      const date = parseLocalDate(factura.fecha);
      if (!date) return acc;

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const total = parseFloat(factura.total) || 0;

      if (!acc[key]) {
        acc[key] = { mes: key, facturas: 0, total: 0, promedio: 0 };
      }

      acc[key].facturas += 1;
      acc[key].total += total;
      return acc;
    }, {});

    return Object.values(grouped)
      .map((row) => ({
        ...row,
        promedio: row.facturas ? row.total / row.facturas : 0
      }))
      .sort((a, b) => b.mes.localeCompare(a.mes));
  }, [facturasFiltradas]);

  return (
    <div className="informe-ventas-diarias">
      <div className="ivd-header">
        <h1><i className="fas fa-chart-line"></i> Informe de Ventas Diarias</h1>
        <button className="ivd-back-btn" onClick={() => navigate('/facturas')}>
          <i className="fas fa-arrow-left"></i> Volver a Facturas
        </button>
      </div>

      <div className="ivd-filtros-card">
        <div className="ivd-filtros-grid">
          <label>
            Fecha Inicio:
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              max={fechaFin || undefined}
            />
          </label>

          <label>
            Fecha Fin:
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              min={fechaInicio || undefined}
              max={toLocalDateKey()}
            />
          </label>

          <label>
            Vendedor:
            <select value={filtroVendedor} onChange={(e) => setFiltroVendedor(e.target.value)}>
              <option value="todos">Todos los vendedores</option>
              {vendedores.map((vendedor) => (
                <option key={vendedor} value={vendedor}>
                  {vendedor}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="ivd-resumen-cards">
          <div className="ivd-card">
            <i className="fas fa-money-bill-wave"></i>
            <span>Total ventas</span>
            <strong>{formatMoney(resumenGeneral.total)}</strong>
          </div>

          <div className="ivd-card">
            <i className="fas fa-file-invoice"></i>
            <span>Cantidad de facturas</span>
            <strong>{resumenGeneral.cantidad}</strong>
          </div>

          <div className="ivd-card">
            <i className="fas fa-calculator"></i>
            <span>Promedio por venta</span>
            <strong>{formatMoney(resumenGeneral.promedio)}</strong>
          </div>
        </div>
      </div>

      {cargando ? (
        <div className="ivd-loading">Cargando informe...</div>
      ) : (
        <>
          <section className="ivd-table-section">
            <h2><i className="fas fa-users"></i> Resumen por Vendedor</h2>
            <table>
              <thead>
                <tr>
                  <th>Vendedor</th>
                  <th>Facturas</th>
                  <th>Total</th>
                  <th>Promedio</th>
                </tr>
              </thead>
              <tbody>
                {resumenPorVendedor.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="ivd-empty">No hay datos para este rango.</td>
                  </tr>
                ) : (
                  resumenPorVendedor.map((row) => (
                    <tr key={row.vendedor}>
                      <td>{row.vendedor}</td>
                      <td>{row.facturas}</td>
                      <td className="ivd-money">{formatMoney(row.total)}</td>
                      <td>{formatMoney(row.promedio)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>

          <section className="ivd-table-section">
            <h2><i className="fas fa-calendar-day"></i> Ventas por Día</h2>
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Facturas</th>
                  <th>Total ventas</th>
                  <th>Promedio</th>
                </tr>
              </thead>
              <tbody>
                {ventasPorDia.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="ivd-empty">No hay datos para este rango.</td>
                  </tr>
                ) : (
                  ventasPorDia.map((row) => (
                    <tr key={row.fecha}>
                      <td>{formatDateLong(row.fecha)}</td>
                      <td>{row.facturas}</td>
                      <td className="ivd-money">{formatMoney(row.total)}</td>
                      <td>{formatMoney(row.promedio)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>

          <section className="ivd-table-section">
            <h2><i className="fas fa-calendar-alt"></i> Ventas por Mes</h2>
            <table>
              <thead>
                <tr>
                  <th>Mes</th>
                  <th>Facturas</th>
                  <th>Total ventas</th>
                  <th>Promedio</th>
                </tr>
              </thead>
              <tbody>
                {ventasPorMes.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="ivd-empty">No hay datos para este rango.</td>
                  </tr>
                ) : (
                  ventasPorMes.map((row) => (
                    <tr key={row.mes}>
                      <td>{formatMonthName(row.mes)}</td>
                      <td>{row.facturas}</td>
                      <td className="ivd-money">{formatMoney(row.total)}</td>
                      <td>{formatMoney(row.promedio)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
};

export default InformeVentasDiarias;
