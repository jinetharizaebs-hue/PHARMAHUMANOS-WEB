export const toNumber = (valor) => {
  const parsed = parseFloat(valor)
  return Number.isFinite(parsed) ? parsed : 0
}

export const obtenerPrecioVentaUnitario = (producto = {}) => {
  return toNumber(producto?.precio_venta ?? producto?.precio ?? producto?.venta)
}

export const obtenerCostoUnitario = (producto = {}) => {
  const costo = toNumber(producto?.costo_compra ?? producto?.costo_de_compra)
  if (costo > 0) return costo

  const precioVenta = obtenerPrecioVentaUnitario(producto)
  return precioVenta > 0 ? precioVenta * 0.8 : 0
}

export const usaCostoFallback = (producto = {}) => {
  const costo = toNumber(producto?.costo_compra ?? producto?.costo_de_compra)
  const precioVenta = obtenerPrecioVentaUnitario(producto)
  return !(costo > 0) && precioVenta > 0
}

export const resolverFuenteCosto = ({ totalProductos = 0, productosFallback = 0, facturas = 0, facturasEstimadas = 0 } = {}) => {
  if (totalProductos > 0) {
    if (productosFallback === 0) return 'Real'
    if (productosFallback === totalProductos) return 'Estimado'
    return 'Mixto'
  }

  if (facturas > 0) {
    if (facturasEstimadas === 0) return 'Real'
    if (facturasEstimadas === facturas) return 'Estimado'
    return 'Mixto'
  }

  return 'Sin datos'
}

export const calcularRentabilidadFactura = (productosFactura = []) => {
  const productos = Array.isArray(productosFactura) ? productosFactura : []
  const productosFallback = productos.filter((producto) => usaCostoFallback(producto)).length

  const costoTotal = productos.reduce((sum, producto) => {
    const cantidad = parseInt(producto?.cantidad, 10) || 0
    return sum + (obtenerCostoUnitario(producto) * cantidad)
  }, 0)

  const utilidadTotal = productos.reduce((sum, producto) => {
    const cantidad = parseInt(producto?.cantidad, 10) || 0
    const precioVenta = obtenerPrecioVentaUnitario(producto)
    const costoUnitario = obtenerCostoUnitario(producto)
    return sum + ((precioVenta - costoUnitario) * cantidad)
  }, 0)

  return {
    costoTotal,
    utilidadTotal,
    productosFallback,
    totalProductos: productos.length,
    usaCostoEstimado: productosFallback > 0,
    fuenteCosto: resolverFuenteCosto({ totalProductos: productos.length, productosFallback })
  }
}

export const agruparUtilidadPorPeriodo = (ventas = [], periodicidad = 'diaria') => {
  const acumulado = (Array.isArray(ventas) ? ventas : []).reduce((mapa, venta) => {
    let fechaBase = ''
    if (typeof venta?.fecha === 'string') {
      fechaBase = venta.fecha.slice(0, 10)
    } else if (venta?.fecha) {
      const fecha = new Date(venta.fecha)
      if (!Number.isNaN(fecha.getTime())) {
        fechaBase = fecha.toISOString().slice(0, 10)
      }
    }

    if (!fechaBase) return mapa

    const periodoKey = periodicidad === 'mensual' ? fechaBase.slice(0, 7) : fechaBase
    if (!mapa[periodoKey]) {
      mapa[periodoKey] = {
        periodoKey,
        facturas: 0,
        facturasEstimadas: 0,
        ventaTotal: 0,
        costoTotal: 0,
        utilidadTotal: 0
      }
    }

    mapa[periodoKey].facturas += 1
  mapa[periodoKey].facturasEstimadas += venta?.usaCostoEstimado ? 1 : 0
    mapa[periodoKey].ventaTotal += toNumber(venta?.total)
    mapa[periodoKey].costoTotal += toNumber(venta?.costoTotal)
    mapa[periodoKey].utilidadTotal += toNumber(venta?.utilidadTotal)

    return mapa
  }, {})

  return Object.values(acumulado)
    .map((item) => ({
      ...item,
      margen: item.ventaTotal > 0 ? (item.utilidadTotal / item.ventaTotal) * 100 : 0,
      fuenteCosto: resolverFuenteCosto({ facturas: item.facturas, facturasEstimadas: item.facturasEstimadas })
    }))
    .sort((a, b) => b.periodoKey.localeCompare(a.periodoKey))
}