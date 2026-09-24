import { fetchAllProducts } from '../productQueries';

describe('fetchAllProducts', () => {
  test('recupera más de 1000 productos usando paginación', async () => {
    const page1 = Array.from({ length: 1000 }, (_, index) => ({ id: index + 1, nombre: `Producto ${index + 1}` }));
    const page2 = Array.from({ length: 350 }, (_, index) => ({ id: index + 1001, nombre: `Producto ${index + 1001}` }));

    const rangeMock = jest
      .fn()
      .mockImplementationOnce(() => Promise.resolve({ data: page1, error: null }))
      .mockImplementationOnce(() => Promise.resolve({ data: page2, error: null }))
      .mockImplementationOnce(() => Promise.resolve({ data: [], error: null }));

    const supabaseClient = {
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        range: rangeMock,
      })),
    };

    const productos = await fetchAllProducts({
      supabaseClient,
      select: '*',
      orderBy: 'nombre',
      ascending: true,
    });

    expect(productos).toHaveLength(1350);
    expect(rangeMock).toHaveBeenCalledTimes(2);
    expect(supabaseClient.from).toHaveBeenCalledWith('productos');
  });
});
