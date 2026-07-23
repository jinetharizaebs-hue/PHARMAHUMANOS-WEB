import { useState } from 'react';
import MovimientosInventario from './MovimientosInventario';
import HistorialInventario from './HistorialInventario';
import MejoresProductos from './MejoresProductos';
import './DashboardProducts.css';
export default function GestionInventario() {
  const [vistaActual, setVistaActual] = useState('movimientos');

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navegación con botones azules */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2">
            <button
              onClick={() => setVistaActual('movimientos')}
              className={`nav-button primary ${vistaActual === 'movimientos' ? 'active' : ''}`}
            >
              📥 Registrar Movimiento
            </button>
            <button
              onClick={() => setVistaActual('historial')}
              className={`nav-button primary ${vistaActual === 'historial' ? 'active' : ''}`}
            >
              📊 Ver Historial
            </button>
            <button
              onClick={() => setVistaActual('mejores')}
              className={`nav-button primary ${vistaActual === 'mejores' ? 'active' : ''}`}
            >
              🏆 Mejores Productos
            </button>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="w-full py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        <div className="w-full">
          {vistaActual === 'movimientos' && <MovimientosInventario />}
          {vistaActual === 'historial' && <HistorialInventario />}
          {vistaActual === 'mejores' && <MejoresProductos />}
        </div>
      </div>
    </div>
  );
}