import {
  agruparUtilidadPorPeriodo,
  calcularRentabilidadFactura,
  obtenerCostoUnitario,
  obtenerPrecioVentaUnitario,
  resolverFuenteCosto,
  usaCostoFallback
} from '../rentabilidadUtils'

describe('rentabilidadUtils', () => {
  describe('obtenerPrecioVentaUnitario', () => {
    test('prioriza precio_venta sobre precio y venta', () => {
      expect(obtenerPrecioVentaUnitario({ precio_venta: 10000, precio: 9000, venta: 8000 })).toBe(10000)
    })

    test('usa venta si no existe precio_venta ni precio', () => {
      expect(obtenerPrecioVentaUnitario({ venta: 15000 })).toBe(15000)
    })
  })

  describe('obtenerCostoUnitario', () => {
    test('usa costo_compra cuando existe', () => {
      expect(obtenerCostoUnitario({ costo_compra: 8000, precio_venta: 10000 })).toBe(8000)
    })

    test('usa costo_de_compra cuando existe', () => {
      expect(obtenerCostoUnitario({ costo_de_compra: 12000, venta: 15000 })).toBe(12000)
    })

    test('aplica fallback del 80% de venta cuando el costo viene en cero', () => {
      expect(obtenerCostoUnitario({ costo_compra: 0, venta: 10000 })).toBe(8000)
    })
  })

  describe('usaCostoFallback', () => {
    test('detecta cuando el costo es estimado', () => {
      expect(usaCostoFallback({ costo_compra: 0, venta: 10000 })).toBe(true)
    })

    test('detecta cuando el costo es real', () => {
      expect(usaCostoFallback({ costo_de_compra: 8000, venta: 10000 })).toBe(false)
    })
  })

  describe('resolverFuenteCosto', () => {
    test('retorna Real cuando todo el costo es real', () => {
      expect(resolverFuenteCosto({ totalProductos: 3, productosFallback: 0 })).toBe('Real')
    })

    test('retorna Estimado cuando todo viene por fallback', () => {
      expect(resolverFuenteCosto({ totalProductos: 2, productosFallback: 2 })).toBe('Estimado')
    })

    test('retorna Mixto cuando hay combinación', () => {
      expect(resolverFuenteCosto({ totalProductos: 4, productosFallback: 1 })).toBe('Mixto')
    })
  })

  describe('calcularRentabilidadFactura', () => {
    test('calcula costo y utilidad con costo real guardado', () => {
      const resultado = calcularRentabilidadFactura([
        { cantidad: 2, precio_venta: 10000, costo_compra: 8000 },
        { cantidad: 1, precio: 5000, costo_de_compra: 4000 }
      ])

      expect(resultado).toEqual({
        costoTotal: 20000,
        utilidadTotal: 5000,
        productosFallback: 0,
        totalProductos: 2,
        usaCostoEstimado: false,
        fuenteCosto: 'Real'
      })
    })

    test('estima utilidad del 20% cuando no hay costo en la factura', () => {
      const resultado = calcularRentabilidadFactura([
        { cantidad: 3, venta: 10000, costo_compra: 0 }
      ])

      expect(resultado.costoTotal).toBe(24000)
      expect(resultado.utilidadTotal).toBe(6000)
      expect(resultado.usaCostoEstimado).toBe(true)
      expect(resultado.fuenteCosto).toBe('Estimado')
    })
  })

  describe('agruparUtilidadPorPeriodo', () => {
    const ventas = [
      { fecha: '2026-03-25', total: 100000, costoTotal: 80000, utilidadTotal: 20000, usaCostoEstimado: false },
      { fecha: '2026-03-25', total: 50000, costoTotal: 40000, utilidadTotal: 10000, usaCostoEstimado: true },
      { fecha: '2026-03-24', total: 200000, costoTotal: 160000, utilidadTotal: 40000, usaCostoEstimado: false },
      { fecha: '2026-02-10', total: 300000, costoTotal: 240000, utilidadTotal: 60000, usaCostoEstimado: true }
    ]

    test('agrupa utilidad diaria correctamente', () => {
      const resultado = agruparUtilidadPorPeriodo(ventas, 'diaria')

      expect(resultado[0]).toMatchObject({
        periodoKey: '2026-03-25',
        facturas: 2,
        facturasEstimadas: 1,
        ventaTotal: 150000,
        costoTotal: 120000,
        utilidadTotal: 30000,
        margen: 20,
        fuenteCosto: 'Mixto'
      })
    })

    test('agrupa utilidad mensual correctamente', () => {
      const resultado = agruparUtilidadPorPeriodo(ventas, 'mensual')

      expect(resultado[0]).toMatchObject({
        periodoKey: '2026-03',
        facturas: 3,
        facturasEstimadas: 1,
        ventaTotal: 350000,
        costoTotal: 280000,
        utilidadTotal: 70000,
        margen: 20,
        fuenteCosto: 'Mixto'
      })
      expect(resultado[1]).toMatchObject({
        periodoKey: '2026-02',
        facturas: 1,
        facturasEstimadas: 1,
        utilidadTotal: 60000,
        fuenteCosto: 'Estimado'
      })
    })
  })
})