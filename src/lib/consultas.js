// Supabase devuelve como máximo 1000 filas por consulta. Para informes que
// necesitan todos los registros, se piden por páginas hasta terminar.
//
// Uso: const facturas = await obtenerTodasLasFilas(() =>
//        supabase.from('facturas').select('id, total').gte('fecha', desde));
// La función debe crear la consulta de nuevo en cada llamada.

const TAMANO_PAGINA = 1000;

export const obtenerTodasLasFilas = async (crearConsulta, tamanoPagina = TAMANO_PAGINA) => {
  const filas = [];

  for (let desde = 0; ; desde += tamanoPagina) {
    // Orden por id como desempate: sin un orden estable las páginas pueden repetir o saltar filas
    const { data, error } = await crearConsulta()
      .order('id', { ascending: true })
      .range(desde, desde + tamanoPagina - 1);

    if (error) throw error;

    const pagina = data || [];
    filas.push(...pagina);
    if (pagina.length < tamanoPagina) return filas;
  }
};
