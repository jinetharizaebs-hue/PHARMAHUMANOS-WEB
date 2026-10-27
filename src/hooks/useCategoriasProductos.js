// src/hooks/useCategoriasProductos.js
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export const CATEGORIAS_PRODUCTOS_POR_DEFECTO = [
  'Populares', 'Genéricos', 'Medicamentos Éticos', 'Ortopédicos',
  'Hospitalarios', 'Insumos médicos', 'Dispositivos médicos'
]

// Lista editable de categorías de productos (tabla categorias_productos).
// Si la tabla aún no existe, usa la lista por defecto para no bloquear el catálogo.
export const useCategoriasProductos = () => {
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [tablaDisponible, setTablaDisponible] = useState(true)

  const cargarCategorias = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('categorias_productos')
        .select('id, nombre, activo')
        .order('nombre', { ascending: true })

      if (error) throw error

      setCategorias(data || [])
      setTablaDisponible(true)
    } catch (err) {
      console.error('Error cargando categorías (se usa la lista por defecto):', err)
      setCategorias(CATEGORIAS_PRODUCTOS_POR_DEFECTO.map((nombre, i) => ({ id: `defecto-${i}`, nombre, activo: true })))
      setTablaDisponible(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarCategorias()
  }, [])

  // Devuelve el nombre tal como quedó guardado (reutiliza la existente si solo cambia mayúsculas)
  const agregarCategoria = async (nombre) => {
    const limpio = nombre.trim().replace(/\s+/g, ' ')
    if (!limpio) throw new Error('Escribe el nombre de la categoría')

    const existente = categorias.find(c => c.nombre.toLowerCase() === limpio.toLowerCase())
    if (existente) {
      if (!existente.activo) await cambiarActivo(existente.id, true)
      return existente.nombre
    }

    const { error } = await supabase.from('categorias_productos').insert([{ nombre: limpio }])
    if (error) throw error
    await cargarCategorias()
    return limpio
  }

  const cambiarActivo = async (id, activo) => {
    const { error } = await supabase.from('categorias_productos').update({ activo }).eq('id', id)
    if (error) throw error
    await cargarCategorias()
  }

  const nombresActivos = categorias.filter(c => c.activo).map(c => c.nombre)

  return {
    categorias,
    nombresActivos,
    loading,
    tablaDisponible,
    agregarCategoria,
    cambiarActivo,
    recargar: cargarCategorias
  }
}
