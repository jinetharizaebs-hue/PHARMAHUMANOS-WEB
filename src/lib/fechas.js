// Fechas de la base de datos.
// facturas.fecha y abonos.fecha son TIMESTAMPTZ: la app guarda solo el día
// ("2026-10-24") y Supabase lo devuelve como "2026-10-24T00:00:00+00:00".
// Con new Date(valor) ese instante, en hora de Colombia (UTC-5), cae el día
// anterior a las 7 p. m. Por eso siempre se trabaja con la parte AAAA-MM-DD.

// "2026-10-24T00:00:00+00:00" | "2026-10-24" | Date -> "2026-10-24"
export const fechaDia = (valor) => {
  if (!valor) return '';
  if (valor instanceof Date) {
    if (Number.isNaN(valor.getTime())) return '';
    const anio = valor.getFullYear();
    const mes = String(valor.getMonth() + 1).padStart(2, '0');
    const dia = String(valor.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }
  const texto = String(valor);
  return /^\d{4}-\d{2}-\d{2}/.test(texto) ? texto.slice(0, 10) : '';
};

// Date a medianoche local del día guardado (para getMonth, getDate, comparar)
export const fechaLocal = (valor) => {
  const dia = fechaDia(valor);
  if (!dia) return null;
  const [anio, mes, d] = dia.split('-').map(Number);
  return new Date(anio, mes - 1, d);
};

// Hoy en hora local como "AAAA-MM-DD" (toISOString daría el día siguiente después de las 7 p. m.)
export const hoyLocal = () => fechaDia(new Date());

// "2026-10-31" -> "2026-11-01". Para filtrar rangos con .lt(): incluye todo el último día
export const diaSiguiente = (valor) => {
  const fecha = fechaLocal(valor);
  if (!fecha) return '';
  fecha.setDate(fecha.getDate() + 1);
  return fechaDia(fecha);
};

// "2026-10-24" -> "24/10/2026"
export const formatoFechaCO = (valor) => {
  const fecha = fechaLocal(valor);
  return fecha ? fecha.toLocaleDateString('es-CO') : '';
};
