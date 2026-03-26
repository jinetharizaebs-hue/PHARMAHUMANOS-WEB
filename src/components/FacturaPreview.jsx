import React from 'react';
import './FacturaPreview.css';

const FacturaPreview = ({ factura, onVolver, onGuardar, cargando }) => {
  return (
    <div className="factura-container">
      <h1>VISTA PREVIA</h1>
      
      <div className="datos-factura">
        <div className="fila-datos">
          <div className="columna-datos">
            <p><b>Cliente:</b> {factura.cliente || "No especificado"}</p>
            <p><b>Fecha:</b> {factura.fecha || "No especificada"}</p>
            <p><b>Vendedor:</b> {factura.vendedor || "No especificado"}</p>
          </div>
          <div className="columna-datos">
            <p><b>Dirección:</b> {factura.direccion || "No especificada"}</p>
            <p><b>Teléfono:</b> {factura.telefono || "No especificado"}</p>
            <p><b>Correo:</b> {factura.correo || "No especificado"}</p>
          </div>
        </div>
      </div>

      <table className="tabla-productos">
        <thead>
          <tr>
            <th>Cantidad</th>
            <th>Producto</th>
            <th>Costo Unit.</th>
            <th>Precio Unit.</th>
            <th>Utilidad</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {factura.productos?.map((p) => (
            <tr key={p.id}>
              <td>{p.cantidad || 0}</td>
              <td>{p.nombre || "Sin nombre"}</td>
              <td>${(p.costo_compra || 0).toFixed(2)}</td>
              <td>${(p.precio || 0).toFixed(2)}</td>
              <td>${((p.utilidad_total ?? (((p.precio || 0) - (p.costo_compra || 0)) * (p.cantidad || 0))) || 0).toFixed(2)}</td>
              <td>${((p.cantidad || 0) * (p.precio || 0)).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="total">
        <h3>TOTAL: ${factura.total?.toFixed(2) || "0.00"}</h3>
        <h3>
          UTILIDAD: ${
            (factura.productos || []).reduce((sum, p) => {
              const utilidad = p.utilidad_total ?? (((p.precio || 0) - (p.costo_compra || 0)) * (p.cantidad || 0));
              return sum + (utilidad || 0);
            }, 0).toFixed(2)
          }
        </h3>
      </div>

      <div className="botones">
        <button onClick={onVolver} className="boton-volver" disabled={cargando}>
          {cargando ? 'CARGANDO...' : 'VOLVER'}
        </button>
        <button onClick={onGuardar} className="boton-guardar" disabled={cargando}>
          {cargando ? 'GUARDANDO...' : 'GUARDAR'}
        </button>
      </div>
    </div>
  );
};

export default FacturaPreview;