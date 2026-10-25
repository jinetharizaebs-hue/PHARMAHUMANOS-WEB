// src/lib/__tests__/consultas.test.js
import { obtenerTodasLasFilas } from '../consultas'

// Simula una consulta de Supabase sobre una tabla de `total` filas
const crearTablaFalsa = (total) => {
  const llamadas = []
  const crearConsulta = () => {
    const consulta = {
      order: jest.fn(() => consulta),
      range: jest.fn(async (desde, hasta) => {
        llamadas.push([desde, hasta])
        const filas = []
        for (let id = desde; id <= Math.min(hasta, total - 1); id++) filas.push({ id })
        return { data: filas, error: null }
      })
    }
    return consulta
  }
  return { crearConsulta, llamadas }
}

describe('obtenerTodasLasFilas', () => {
  test('trae más de 1000 filas pidiendo varias páginas', async () => {
    const { crearConsulta, llamadas } = crearTablaFalsa(2500)
    const filas = await obtenerTodasLasFilas(crearConsulta)
    expect(filas).toHaveLength(2500)
    expect(llamadas).toEqual([[0, 999], [1000, 1999], [2000, 2999]])
  })

  test('con exactamente 1000 filas termina tras una consulta extra', async () => {
    const { crearConsulta, llamadas } = crearTablaFalsa(1000)
    expect(await obtenerTodasLasFilas(crearConsulta)).toHaveLength(1000)
    expect(llamadas).toHaveLength(2)
  })

  test('propaga el error de Supabase', async () => {
    const consulta = {
      order: () => consulta,
      range: async () => ({ data: null, error: new Error('fallo de red') })
    }
    await expect(obtenerTodasLasFilas(() => consulta)).rejects.toThrow('fallo de red')
  })
})
