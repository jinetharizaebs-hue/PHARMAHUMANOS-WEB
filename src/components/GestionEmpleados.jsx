import React, { useState } from 'react';

// Administrar la lista de empleados que aparece al registrar gastos.
// Los empleados no se borran: se desactivan para conservar el historial.
const GestionEmpleados = ({ empleados, tablaDisponible, agregarEmpleado, cambiarActivo }) => {
  const [nombre, setNombre] = useState('');
  const [guardando, setGuardando] = useState(false);

  const agregar = async (e) => {
    e.preventDefault();
    const limpio = nombre.trim();
    if (!limpio) return;

    if (empleados.some(emp => emp.nombre.toLowerCase() === limpio.toLowerCase())) {
      alert('Ese empleado ya está en la lista.');
      return;
    }

    setGuardando(true);
    try {
      await agregarEmpleado(limpio);
      setNombre('');
    } catch (err) {
      alert('No se pudo agregar el empleado: ' + err.message);
    } finally {
      setGuardando(false);
    }
  };

  const alternar = async (empleado) => {
    const accion = empleado.activo ? 'desactivar' : 'activar';
    if (!window.confirm(`¿Seguro que deseas ${accion} a ${empleado.nombre}?`)) return;

    try {
      await cambiarActivo(empleado.id, !empleado.activo);
    } catch (err) {
      alert(`No se pudo ${accion} el empleado: ` + err.message);
    }
  };

  if (!tablaDisponible) {
    return (
      <div className="setup-notice">
        Para editar empleados, ejecuta <strong>sql/EMPLEADOS_Y_CATEGORIAS_GASTOS.sql</strong> en Supabase.
        Mientras tanto se usa la lista por defecto.
      </div>
    );
  }

  return (
    <div className="ge-empleados">
      <form className="ge-empleados-form" onSubmit={agregar}>
        <input
          type="text"
          placeholder="Nombre del empleado"
          value={nombre}
          maxLength={100}
          onChange={(e) => setNombre(e.target.value)}
        />
        <button type="submit" className="btn-nuevo" disabled={guardando || !nombre.trim()}>
          {guardando ? 'Guardando...' : '➕ Agregar'}
        </button>
      </form>

      {empleados.length === 0 ? (
        <p>Aún no hay empleados registrados.</p>
      ) : (
        <ul className="ge-empleados-lista">
          {empleados.map(emp => (
            <li key={emp.id} className={emp.activo ? '' : 'inactivo'}>
              <span>{emp.nombre}{!emp.activo && ' (inactivo)'}</span>
              <button type="button" onClick={() => alternar(emp)}>
                {emp.activo ? 'Desactivar' : 'Activar'}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="ge-empleados-nota">
        Desactivar quita al empleado de las listas, pero conserva sus gastos anteriores.
      </p>
    </div>
  );
};

export default GestionEmpleados;
