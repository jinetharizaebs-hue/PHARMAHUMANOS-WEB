import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

const categorias = [
  'Servicios',
  'Nomina',
  'Transporte',
  'Suministros',
  'Viaticos',
  'Mantenimiento',
  'Otros'
];

const metodosPago = ['transferencia', 'efectivo', 'tarjeta', 'nequi'];

const getMesActual = () => new Date().toISOString().slice(0, 7);

const GastosContabilidadFacil = () => {
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [setupPendiente, setSetupPendiente] = useState(false);
  const [errorSetup, setErrorSetup] = useState('');
  const [filtroMes, setFiltroMes] = useState(getMesActual());
  const [gastos, setGastos] = useState([]);
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    categoria: 'Servicios',
    descripcion: '',
    monto: '',
    metodo_pago: 'transferencia',
    referencia: ''
  });

  const cargarGastos = async () => {
    setLoading(true);
    setSetupPendiente(false);
    setErrorSetup('');
    try {
      const { data, error } = await supabase
        .from('gastos_empresa')
        .select('*')
        .order('fecha', { ascending: false })
        .limit(200);

      if (error) throw error;
      setGastos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error al cargar gastos:', err);

      // Error comun en Supabase cuando la tabla aun no existe en el proyecto.
      if (err?.code === 'PGRST205' || String(err?.message || '').includes("Could not find the table 'public.gastos_empresa'")) {
        setSetupPendiente(true);
        setErrorSetup('Falta crear la tabla gastos_empresa en Supabase. Ejecuta sql/GASTOS_EMPRESA_SETUP.sql en el SQL Editor.');
        setGastos([]);
      } else {
        alert('No fue posible cargar los gastos: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarGastos();
  }, []);

  const gastosFiltrados = useMemo(() => {
    return gastos.filter((gasto) => {
      if (!filtroMes) return true;
      return String(gasto.fecha || '').startsWith(filtroMes);
    });
  }, [gastos, filtroMes]);

  const totalMes = useMemo(() => {
    return gastosFiltrados.reduce((acc, gasto) => acc + Number(gasto.monto || 0), 0);
  }, [gastosFiltrados]);

  const limpiarFormulario = () => {
    setForm({
      fecha: new Date().toISOString().split('T')[0],
      categoria: 'Servicios',
      descripcion: '',
      monto: '',
      metodo_pago: 'transferencia',
      referencia: ''
    });
  };

  const guardarGasto = async (e) => {
    e.preventDefault();

    if (!form.fecha || !form.descripcion || !form.monto) {
      alert('Completa fecha, descripcion y monto.');
      return;
    }

    const monto = Number(form.monto);
    if (!Number.isFinite(monto) || monto <= 0) {
      alert('El monto debe ser mayor a 0.');
      return;
    }

    setGuardando(true);
    try {
      const payload = {
        fecha: form.fecha,
        categoria: form.categoria,
        empleado: 'Contabilidad',
        descripcion: form.descripcion,
        monto,
        metodo_pago: form.metodo_pago,
        referencia: form.referencia || null,
        notas: null
      };

      const { error } = await supabase.from('gastos_empresa').insert([payload]);
      if (error) throw error;

      await cargarGastos();
      limpiarFormulario();
    } catch (err) {
      console.error('Error al guardar gasto:', err);
      alert('No fue posible guardar el gasto: ' + err.message);
    } finally {
      setGuardando(false);
    }
  };

  const eliminarGasto = async (id) => {
    if (!window.confirm('Deseas eliminar este gasto?')) return;

    try {
      const { error } = await supabase.from('gastos_empresa').delete().eq('id', id);
      if (error) throw error;
      setGastos((prev) => prev.filter((gasto) => gasto.id !== id));
    } catch (err) {
      console.error('Error al eliminar gasto:', err);
      alert('No fue posible eliminar el gasto: ' + err.message);
    }
  };

  return (
    <div style={{ padding: '16px', maxWidth: '1100px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Vista Facil de Gastos (Contabilidad)</h1>
      <p style={{ color: '#4b5563', marginBottom: '16px' }}>
        Registra gastos rapido y revisa el total mensual sin abrir pantallas complejas.
      </p>

      {setupPendiente && (
        <div
          style={{
            marginBottom: '16px',
            border: '1px solid #f59e0b',
            background: '#fffbeb',
            color: '#92400e',
            borderRadius: '8px',
            padding: '12px'
          }}
        >
          <strong>Configuracion pendiente:</strong> {errorSetup}
          <div style={{ marginTop: '8px' }}>
            Luego de ejecutar el script en Supabase, recarga la pagina para comenzar a registrar gastos.
          </div>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '12px',
          marginBottom: '16px'
        }}
      >
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', background: '#ffffff' }}>
          <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Total del mes</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>
            {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(totalMes)}
          </div>
        </div>

        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', background: '#ffffff' }}>
          <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Cantidad de gastos</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{gastosFiltrados.length}</div>
        </div>

        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', background: '#ffffff' }}>
          <label htmlFor="filtroMes" style={{ fontSize: '0.9rem', color: '#6b7280', display: 'block' }}>
            Mes a consultar
          </label>
          <input
            id="filtroMes"
            type="month"
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value)}
            style={{ width: '100%', marginTop: '6px', padding: '8px' }}
          />
        </div>
      </div>

      <form
        onSubmit={guardarGasto}
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '10px',
          background: '#ffffff'
        }}
      >
        <input type="date" value={form.fecha} onChange={(e) => setForm((p) => ({ ...p, fecha: e.target.value }))} />

        <select value={form.categoria} onChange={(e) => setForm((p) => ({ ...p, categoria: e.target.value }))}>
          {categorias.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Descripcion"
          value={form.descripcion}
          onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
        />

        <input
          type="number"
          min="0"
          step="100"
          placeholder="Monto"
          value={form.monto}
          onChange={(e) => setForm((p) => ({ ...p, monto: e.target.value }))}
        />

        <select value={form.metodo_pago} onChange={(e) => setForm((p) => ({ ...p, metodo_pago: e.target.value }))}>
          {metodosPago.map((metodo) => (
            <option key={metodo} value={metodo}>
              {metodo}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Referencia (opcional)"
          value={form.referencia}
          onChange={(e) => setForm((p) => ({ ...p, referencia: e.target.value }))}
        />

        <button type="submit" disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar gasto'}
        </button>
      </form>

      {loading ? (
        <p>Cargando gastos...</p>
      ) : (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflowX: 'auto', background: '#ffffff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ textAlign: 'left', padding: '10px' }}>Fecha</th>
                <th style={{ textAlign: 'left', padding: '10px' }}>Categoria</th>
                <th style={{ textAlign: 'left', padding: '10px' }}>Descripcion</th>
                <th style={{ textAlign: 'right', padding: '10px' }}>Monto</th>
                <th style={{ textAlign: 'left', padding: '10px' }}>Pago</th>
                <th style={{ textAlign: 'left', padding: '10px' }}>Accion</th>
              </tr>
            </thead>
            <tbody>
              {gastosFiltrados.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ padding: '14px', color: '#6b7280' }}>
                    No hay gastos para el filtro seleccionado.
                  </td>
                </tr>
              )}

              {gastosFiltrados.map((gasto) => (
                <tr key={gasto.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px' }}>{gasto.fecha}</td>
                  <td style={{ padding: '10px' }}>{gasto.categoria}</td>
                  <td style={{ padding: '10px' }}>{gasto.descripcion}</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600 }}>
                    {new Intl.NumberFormat('es-CO', {
                      style: 'currency',
                      currency: 'COP',
                      minimumFractionDigits: 0
                    }).format(Number(gasto.monto || 0))}
                  </td>
                  <td style={{ padding: '10px' }}>{gasto.metodo_pago}</td>
                  <td style={{ padding: '10px' }}>
                    <button onClick={() => eliminarGasto(gasto.id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default GastosContabilidadFacil;
