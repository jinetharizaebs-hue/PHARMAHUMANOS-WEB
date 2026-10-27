// src/hooks/__tests__/useCategoriasProductos.test.js
import { renderHook, act, waitFor } from '@testing-library/react'
import { supabase } from '../../lib/supabase'
import { useCategoriasProductos, CATEGORIAS_PRODUCTOS_POR_DEFECTO } from '../useCategoriasProductos'

jest.mock('../../lib/supabase', () => ({ supabase: { from: jest.fn() } }))

// Simula la tabla categorias_productos en memoria
const crearTablaFalsa = (filas, { errorLectura = null } = {}) => {
  const tabla = filas.map(f => ({ ...f }))
  const operaciones = { insert: [], update: [] }
  supabase.from.mockImplementation(() => ({
    select: () => ({
      order: async () => (errorLectura
        ? { data: null, error: errorLectura }
        : { data: [...tabla].sort((a, b) => a.nombre.localeCompare(b.nombre)), error: null })
    }),
    insert: async (nuevas) => {
      operaciones.insert.push(...nuevas)
      nuevas.forEach(n => tabla.push({ id: tabla.length + 1, activo: true, ...n }))
      return { error: null }
    },
    update: (cambios) => ({
      eq: async (_campo, id) => {
        operaciones.update.push({ id, ...cambios })
        Object.assign(tabla.find(f => f.id === id), cambios)
        return { error: null }
      }
    })
  }))
  return { tabla, operaciones }
}

const montar = async () => {
  const hook = renderHook(() => useCategoriasProductos())
  await waitFor(() => expect(hook.result.current.loading).toBe(false))
  return hook
}

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('useCategoriasProductos', () => {
  test('carga la tabla y solo ofrece las categorías activas', async () => {
    crearTablaFalsa([
      { id: 1, nombre: 'Genéricos', activo: true },
      { id: 2, nombre: 'Genericos', activo: false },
      { id: 3, nombre: 'Ortopédicos', activo: true }
    ])
    const { result } = await montar()
    expect(result.current.tablaDisponible).toBe(true)
    expect(result.current.categorias).toHaveLength(3)
    expect(result.current.nombresActivos).toEqual(['Genéricos', 'Ortopédicos'])
  })

  test('si la tabla no existe usa la lista por defecto', async () => {
    crearTablaFalsa([], { errorLectura: new Error('relation does not exist') })
    const { result } = await montar()
    expect(result.current.tablaDisponible).toBe(false)
    expect(result.current.nombresActivos).toEqual(CATEGORIAS_PRODUCTOS_POR_DEFECTO)
  })

  test('crea una categoría nueva limpiando espacios', async () => {
    const { operaciones } = crearTablaFalsa([{ id: 1, nombre: 'Genéricos', activo: true }])
    const { result } = await montar()
    let nombre
    await act(async () => { nombre = await result.current.agregarCategoria('  Cuidado   bebé ') })
    expect(nombre).toBe('Cuidado bebé')
    expect(operaciones.insert).toEqual([{ nombre: 'Cuidado bebé' }])
    expect(result.current.nombresActivos).toContain('Cuidado bebé')
  })

  test('no duplica una categoría que solo cambia en mayúsculas', async () => {
    const { operaciones } = crearTablaFalsa([{ id: 1, nombre: 'Genéricos', activo: true }])
    const { result } = await montar()
    let nombre
    await act(async () => { nombre = await result.current.agregarCategoria('genéricos') })
    expect(nombre).toBe('Genéricos')
    expect(operaciones.insert).toHaveLength(0)
  })

  test('volver a crear una categoría oculta la muestra de nuevo', async () => {
    const { operaciones } = crearTablaFalsa([{ id: 7, nombre: 'Hospitalarios', activo: false }])
    const { result } = await montar()
    await act(async () => { await result.current.agregarCategoria('Hospitalarios') })
    expect(operaciones.insert).toHaveLength(0)
    expect(operaciones.update).toEqual([{ id: 7, activo: true }])
    expect(result.current.nombresActivos).toEqual(['Hospitalarios'])
  })

  test('rechaza un nombre vacío', async () => {
    const { operaciones } = crearTablaFalsa([])
    const { result } = await montar()
    await expect(result.current.agregarCategoria('   ')).rejects.toThrow('Escribe el nombre')
    expect(operaciones.insert).toHaveLength(0)
  })

  test('ocultar una categoría la quita de la lista sin borrarla', async () => {
    const { tabla } = crearTablaFalsa([
      { id: 1, nombre: 'Genéricos', activo: true },
      { id: 2, nombre: 'Populares', activo: true }
    ])
    const { result } = await montar()
    await act(async () => { await result.current.cambiarActivo(2, false) })
    expect(result.current.nombresActivos).toEqual(['Genéricos'])
    expect(tabla).toHaveLength(2)
  })
})
