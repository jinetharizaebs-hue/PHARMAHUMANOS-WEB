// Catálogo único de gastos: lo usan Gestión de Gastos, Gastos de Empresa y Gastos Fácil.
// Para agregar una categoría basta con añadirla aquí.

export const CATEGORIAS_GASTO = [
  { value: 'Nómina', label: '👥 Nómina' },
  { value: 'Arriendo', label: '🏢 Arriendo' },
  { value: 'Servicios', label: '🔌 Servicios' },
  { value: 'EPS', label: '🏥 EPS' },
  { value: 'Transporte', label: '🚗 Transporte' },
  { value: 'Gasolina', label: '⛽ Gasolina' },
  { value: 'Parqueadero', label: '🅿️ Parqueadero' },
  { value: 'Pasajes', label: '🚌 Pasajes' },
  { value: 'Viáticos', label: '✈️ Viáticos' },
  { value: 'Comida', label: '🍽️ Comida' },
  { value: 'Suministros', label: '📦 Suministros' },
  { value: 'Mantenimiento', label: '🔧 Mantenimiento' },
  { value: 'Marketing', label: '📢 Marketing' },
  { value: 'Capacitación', label: '📚 Capacitación' },
  { value: 'Créditos', label: '🏦 Créditos' },
  { value: 'Fechas Especiales', label: '🎉 Fechas Especiales' },
  { value: 'Ofrenda', label: '🙏 Ofrenda' },
  { value: 'Cuidado Personal', label: '🧴 Cuidado Personal' },
  { value: 'Antigripal Cuidado Respiratorio', label: '💊 Antigripal Cuidado Respiratorio' },
  { value: 'Otros', label: '📝 Otros' }
];

export const METODOS_PAGO = [
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'nequi', label: 'Nequi' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'cheque', label: 'Cheque' }
];

// Se usan si la tabla empleados aún no existe en Supabase
export const EMPLEADOS_POR_DEFECTO = ['Alan Diaz', 'Jhon Diaz', 'Andrea Gutiérrez'];

// Nombres antiguos o escritos distinto -> categoría del catálogo
const EQUIVALENCIAS_CATEGORIA = {
  nomina: 'Nómina',
  viaticos: 'Viáticos',
  viajes: 'Viáticos',
  capacitacion: 'Capacitación',
  creditos: 'Créditos',
  materiales: 'Suministros',
  'compras oficina': 'Suministros',
  arreglos: 'Mantenimiento',
  varios: 'Otros'
};

const sinTildes = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const CATEGORIA_POR_CLAVE = CATEGORIAS_GASTO.reduce((acc, cat) => {
  acc[sinTildes(cat.value)] = cat.value;
  return acc;
}, {});

export const normalizarCategoria = (categoria) => {
  if (!categoria) return 'Otros';
  const clave = sinTildes(String(categoria));
  return EQUIVALENCIAS_CATEGORIA[clave] || CATEGORIA_POR_CLAVE[clave] || 'Otros';
};

export const etiquetaCategoria = (categoria) => {
  const valor = normalizarCategoria(categoria);
  return CATEGORIAS_GASTO.find(cat => cat.value === valor)?.label || valor;
};

export const etiquetaMetodoPago = (metodo) =>
  METODOS_PAGO.find(m => m.value === metodo)?.label || metodo || '-';
