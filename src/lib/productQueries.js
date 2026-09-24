export async function fetchAllProducts({
  supabaseClient,
  table = 'productos',
  select = '*',
  orderBy = null,
  ascending = true,
  filters = [],
  pageSize = 1000,
} = {}) {
  if (!supabaseClient) {
    throw new Error('Se requiere un cliente de Supabase para consultar productos.');
  }

  const allRows = [];
  let offset = 0;

  while (true) {
    let query = supabaseClient
      .from(table)
      .select(select);

    if (orderBy) {
      query = query.order(orderBy, { ascending });
    }

    filters.forEach(({ field, operator, value }) => {
      switch (operator) {
        case 'eq':
          query = query.eq(field, value);
          break;
        case 'gt':
          query = query.gt(field, value);
          break;
        case 'gte':
          query = query.gte(field, value);
          break;
        case 'lt':
          query = query.lt(field, value);
          break;
        case 'lte':
          query = query.lte(field, value);
          break;
        case 'in':
          query = query.in(field, value);
          break;
        default:
          break;
      }
    });

    const { data, error } = await query.range(offset, offset + pageSize - 1);

    if (error) {
      throw error;
    }

    const rows = data || [];
    allRows.push(...rows);

    if (rows.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return allRows;
}
