import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './InformeCobrosDiarios.css';

const PAGE_SIZE = 1000;

const toLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseLocalDate = (value) => {
  if (!value || typeof value !== 'string') return null;

  // Fecha simple YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  // Soporta ISO 8601 completo con hora y zona
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  return null;
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

const fetchAllRows = async (table, columns = '*', orderColumn = 'id', ascending = false) => {
  let from = 0;
  let allRows = [];

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from(table)
      .select(columns)
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

const InformeCobrosDiarios = () => {
  const navigate = useNavigate();
  const [cargando, setCargando] = useState(true);
  const [abonos, setAbonos] = useState([]);
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
    const cargarAbonos = async () => {
      try {
        setCargando(true);

        const [abonosData, facturasData] = await Promise.all([
          fetchAllRows('abonos', 'id, factura_id, fecha, monto', 'fecha', false),
          fetchAllRows('facturas', 'id, vendedor, cliente', 'id', false)
        ]);

        const facturaMap = new Map((facturasData || []).map((factura) => [factura.id, factura]));

        const abonosEnriquecidos = (abonosData || []).map((abono) => {
          const factura = facturaMap.get(abono.factura_id);
          return {
            ...abono,
            vendedor: factura?.vendedor || 'Sin vendedor',
            cliente: factura?.cliente || 'Sin cliente'
          };
        });

        setAbonos(abonosEnriquecidos);
      } catch (error) {
        console.error('Error cargando abonos para informe diario:', error);
        alert('No se pudo cargar el informe de cobros diarios.');
      } finally {
        setCargando(false);
      }
    };

    cargarAbonos();
  }, []);

  const vendedores = useMemo(() => {
    const names = new Set();
    abonos.forEach((a) => {
      if (a.vendedor) names.add(a.vendedor);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'es'));
  }, [abonos]);

  const abonosFiltrados = useMemo(() => {
    const startDate = fechaInicio ? parseLocalDate(fechaInicio) : null;
    const endDate = fechaFin ? parseLocalDate(fechaFin) : null;

    return abonos.filter((abono) => {
      const date = parseLocalDate(abono.fecha);
      if (!date) return false;

      if (startDate && date < startDate) return false;
      if (endDate && date > endDate) return false;
      if (filtroVendedor !== 'todos' && abono.vendedor !== filtroVendedor) return false;

      return true;
    });
  }, [abonos, fechaInicio, fechaFin, filtroVendedor]);

  const resumenGeneral = useMemo(() => {
    const total = abonosFiltrados.reduce((sum, abono) => sum + (parseFloat(abono.monto) || 0), 0);
    const cantidad = abonosFiltrados.length;
    const promedio = cantidad ? total / cantidad : 0;

    return { total, cantidad, promedio };
  }, [abonosFiltrados]);

  const resumenPorVendedor = useMemo(() => {
    const grouped = abonosFiltrados.reduce((acc, abono) => {
      const vendedor = abono.vendedor || 'Sin vendedor';
      const monto = parseFloat(abono.monto) || 0;

      if (!acc[vendedor]) {
        acc[vendedor] = { vendedor, cobros: 0, total: 0, promedio: 0 };
      }

      acc[vendedor].cobros += 1;
      acc[vendedor].total += monto;
      return acc;
    }, {});

    return Object.values(grouped)
      .map((row) => ({
        ...row,
        promedio: row.cobros ? row.total / row.cobros : 0
      }))
      .sort((a, b) => b.total - a.total);
  }, [abonosFiltrados]);

  const cobrosPorDia = useMemo(() => {
    const grouped = abonosFiltrados.reduce((acc, abono) => {
      const fecha = abono.fecha || 'Sin fecha';
      const monto = parseFloat(abono.monto) || 0;

      if (!acc[fecha]) {
        acc[fecha] = { fecha, cobros: 0, total: 0, promedio: 0 };
      }

      acc[fecha].cobros += 1;
      acc[fecha].total += monto;
      return acc;
    }, {});

    return Object.values(grouped)
      .map((row) => ({
        ...row,
        promedio: row.cobros ? row.total / row.cobros : 0
      }))
      .sort((a, b) => {
        const dateA = parseLocalDate(a.fecha) || new Date(0);
        const dateB = parseLocalDate(b.fecha) || new Date(0);
        return dateB - dateA;
      });
  }, [abonosFiltrados]);

  const cobrosPorMes = useMemo(() => {
    const grouped = abonosFiltrados.reduce((acc, abono) => {
      const date = parseLocalDate(abono.fecha);
      if (!date) return acc;

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monto = parseFloat(abono.monto) || 0;

      if (!acc[key]) {
        acc[key] = { mes: key, cobros: 0, total: 0, promedio: 0 };
      }

      acc[key].cobros += 1;
      acc[key].total += monto;
      return acc;
    }, {});

    return Object.values(grouped)
      .map((row) => ({
        ...row,
        promedio: row.cobros ? row.total / row.cobros : 0
      }))
      .sort((a, b) => b.mes.localeCompare(a.mes));
  }, [abonosFiltrados]);

  return (
    <div className="informe-cobros-diarios">
      <div className="icd-header">
        <h1><i className="fas fa-money-check-alt"></i> Informe de Cobros Diarios</h1>
        <button className="icd-back-btn" onClick={() => navigate('/facturas')}>
          <i className="fas fa-arrow-left"></i> Volver a Facturas
        </button>
      </div>

      <div className="icd-filtros-card">
        <div className="icd-filtros-grid">
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

        <div className="icd-resumen-cards">
          <div className="icd-card">
            <i className="fas fa-hand-holding-usd"></i>
            <span>Total cobrado</span>
            <strong>{formatMoney(resumenGeneral.total)}</strong>
          </div>

          <div className="icd-card">
            <i className="fas fa-receipt"></i>
            <span>Cantidad de cobros</span>
            <strong>{resumenGeneral.cantidad}</strong>
          </div>

          <div className="icd-card">
            <i className="fas fa-calculator"></i>
            <span>Promedio por cobro</span>
            <strong>{formatMoney(resumenGeneral.promedio)}</strong>
          </div>
        </div>
      </div>

      {cargando ? (
        <div className="icd-loading">Cargando informe...</div>
      ) : (
        <>
          <section className="icd-table-section">
            <h2><i className="fas fa-users"></i> Resumen por Vendedor</h2>
            <table>
              <thead>
                <tr>
                  <th>Vendedor</th>
                  <th>Cobros</th>
                  <th>Total</th>
                  <th>Promedio</th>
                </tr>
              </thead>
              <tbody>
                {resumenPorVendedor.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="icd-empty">No hay datos para este rango.</td>
                  </tr>
                ) : (
                  resumenPorVendedor.map((row) => (
                    <tr key={row.vendedor}>
                      <td>{row.vendedor}</td>
                      <td>{row.cobros}</td>
                      <td className="icd-money">{formatMoney(row.total)}</td>
                      <td>{formatMoney(row.promedio)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>

          <section className="icd-table-section">
            <h2><i className="fas fa-calendar-day"></i> Cobros por Día</h2>
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cobros</th>
                  <th>Total cobrado</th>
                  <th>Promedio</th>
                </tr>
              </thead>
              <tbody>
                {cobrosPorDia.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="icd-empty">No hay datos para este rango.</td>
                  </tr>
                ) : (
                  cobrosPorDia.map((row) => (
                    <tr key={row.fecha}>
                      <td>{formatDateLong(row.fecha)}</td>
                      <td>{row.cobros}</td>
                      <td className="icd-money">{formatMoney(row.total)}</td>
                      <td>{formatMoney(row.promedio)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>

          <section className="icd-table-section">
            <h2><i className="fas fa-calendar-alt"></i> Cobros por Mes</h2>
            <table>
              <thead>
                <tr>
                  <th>Mes</th>
                  <th>Cobros</th>
                  <th>Total cobrado</th>
                  <th>Promedio</th>
                </tr>
              </thead>
              <tbody>
                {cobrosPorMes.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="icd-empty">No hay datos para este rango.</td>
                  </tr>
                ) : (
                  cobrosPorMes.map((row) => (
                    <tr key={row.mes}>
                      <td>{formatMonthName(row.mes)}</td>
                      <td>{row.cobros}</td>
                      <td className="icd-money">{formatMoney(row.total)}</td>
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

export default InformeCobrosDiarios;
