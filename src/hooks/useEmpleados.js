// src/hooks/useEmpleados.js
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { EMPLEADOS_POR_DEFECTO } from '../lib/gastosCatalogos'

// Lista editable de empleados para registrar gastos (tabla empleados).
// Si la tabla aún no existe, usa la lista por defecto para no bloquear las pantallas.
export const useEmpleados = () => {
  const [empleados, setEmpleados] = useState([])
  const [loading, setLoading] = useState(true)
  const [tablaDisponible, setTablaDisponible] = useState(true)

  const cargarEmpleados = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('empleados')
        .select('id, nombre, activo')
        .order('nombre', { ascending: true })

      if (error) throw error

      setEmpleados(data || [])
      setTablaDisponible(true)
    } catch (err) {
      console.error('Error cargando empleados (se usa la lista por defecto):', err)
      setEmpleados(EMPLEADOS_POR_DEFECTO.map((nombre, i) => ({ id: `defecto-${i}`, nombre, activo: true })))
      setTablaDisponible(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarEmpleados()
  }, [])

  const agregarEmpleado = async (nombre) => {
    const { error } = await supabase.from('empleados').insert([{ nombre: nombre.trim() }])
    if (error) throw error
    await cargarEmpleados()
  }

  const cambiarActivo = async (id, activo) => {
    const { error } = await supabase.from('empleados').update({ activo }).eq('id', id)
    if (error) throw error
    await cargarEmpleados()
  }

  // Nombres para los selectores: solo activos, más "Otro" al final
  const nombresActivos = [
    ...empleados.filter(e => e.activo).map(e => e.nombre),
    'Otro'
  ]

  return {
    empleados,
    nombresActivos,
    loading,
    tablaDisponible,
    agregarEmpleado,
    cambiarActivo,
    recargar: cargarEmpleados
  }
}
