// src/lib/__tests__/fechas.test.js
import { fechaDia, fechaLocal, diaSiguiente } from '../fechas'

describe('fechas', () => {
  test('fechaDia reduce el TIMESTAMPTZ de Supabase al día guardado', () => {
    expect(fechaDia('2026-10-01T00:00:00+00:00')).toBe('2026-10-01')
    expect(fechaDia('2026-10-24')).toBe('2026-10-24')
    expect(fechaDia(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05')
    expect(fechaDia(null)).toBe('')
    expect(fechaDia('no es fecha')).toBe('')
  })

  test('fechaLocal deja una venta del día 1 en su mes', () => {
    const fecha = fechaLocal('2026-10-01T00:00:00+00:00')
    expect(fecha.getMonth()).toBe(9)
    expect(fecha.getDate()).toBe(1)
    expect(fechaLocal('2026-01-01T00:00:00+00:00').getFullYear()).toBe(2026)
    expect(fechaLocal('')).toBeNull()
  })

  test('diaSiguiente cruza fin de mes, de año y bisiestos', () => {
    expect(diaSiguiente('2026-10-31')).toBe('2026-11-01')
    expect(diaSiguiente('2026-12-31')).toBe('2027-01-01')
    expect(diaSiguiente('2028-02-28')).toBe('2028-02-29')
  })
})
