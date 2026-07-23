import { supabase } from './supabase'

// Funciones para tu sistema EBS
export const supabaseApi = {
  // === CLIENTES ===
  async obtenerClientes() {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('activo', true)
        .order('nombre')
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error obteniendo clientes:', error)
      throw error
    }
  },

  async crearCliente(cliente) {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .insert([{
          nombre: cliente.nombre,
          direccion: cliente.direccion || null,
          telefono: cliente.telefono || null,
          correo: cliente.correo || null,
          clasificacion: cliente.clasificacion || 3
        }])
        .select()
      
      if (error) throw error
      return data[0]
    } catch (error) {
      console.error('Error creando cliente:', error)
      throw error
    }
  },

  async actualizarCliente(id, cliente) {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .update(cliente)
        .eq('id', id)
        .select()
      
      if (error) throw error
      return data[0]
    } catch (error) {
      console.error('Error actualizando cliente:', error)
      throw error
    }
  },

  // === PRODUCTOS ===
  async obtenerProductos() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories:categories (
            id,
            nombre
          )
        `)
        .order('nombre', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo productos:', error);
      throw error;
    }
  },

  async crearProducto(producto) {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([{
          codigo: producto.codigo || null,
          nombre: producto.nombre,
          precio: parseFloat(producto.precio),
          categoria_id: producto.categoria_id || null,
          stock: parseInt(producto.stock) || 0,
          description: producto.descripcion || null,
          activo: producto.activo !== undefined ? producto.activo : true,
          imagen_url: producto.imagenUrl || null,
          imagen_public_id: producto.imagenPublicId || null
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creando producto:', error);
      throw error;
    }
  },

  async actualizarProducto(id, producto) {
    try {
      const { data, error } = await supabase
        .from('products')
        .update({
          codigo: producto.codigo || null,
          nombre: producto.nombre,
          precio: parseFloat(producto.precio),
          categoria_id: producto.categoria_id || null,
          stock: parseInt(producto.stock) || 0,
          description: producto.descripcion || null,
          activo: producto.activo,
          imagen_url: producto.imagenUrl || null,
          imagen_public_id: producto.imagenPublicId || null
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error actualizando producto:', error);
      throw error;
    }
  },

  // === FACTURAS ===
  async obtenerFacturas() {
    try {
      const { data, error } = await supabase
        .from('facturas')
        .select(`
          *,
          clientes (
            id,
            nombre,
            telefono,
            correo
          ),
          vendedores (
            id,
            nombre
          )
        `)
        .order('fecha', { ascending: false })
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error obteniendo facturas:', error)
      throw error
    }
  },

  async crearFactura(factura) {
    try {
      const { data, error } = await supabase
        .from('facturas')
        .insert([{
          cliente_id: factura.cliente_id,
          fecha: factura.fecha,
          vendedor_id: factura.vendedor_id,
          direccion: factura.direccion || null,
          telefono: factura.telefono || null,
          correo: factura.correo || null,
          total: parseFloat(factura.total)
        }])
        .select()
      
      if (error) throw error
      return data[0]
    } catch (error) {
      console.error('Error creando factura:', error)
      throw error
    }
  },

  // === DETALLES DE FACTURA ===
  async crearDetallesFactura(detalles) {
    try {
      const { data, error } = await supabase
        .from('detalles_factura')
        .insert(detalles.map(detalle => ({
          factura_id: detalle.factura_id,
          producto_id: detalle.producto_id,
          cantidad: parseInt(detalle.cantidad),
          precio_unitario: parseFloat(detalle.precio_unitario)
        })))
        .select()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creando detalles factura:', error)
      throw error
    }
  },

  async obtenerDetallesFactura(facturaId) {
    try {
      const { data, error } = await supabase
        .from('detalles_factura')
        .select(`
          *,
          productos (
            id,
            nombre,
            codigo,
            precio
          )
        `)
        .eq('factura_id', facturaId)
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error obteniendo detalles factura:', error)
      throw error
    }
  },

  // === ABONOS ===
  async crearAbono(abono) {
    try {
      const observaciones = [abono.metodo_pago, abono.nota]
        .filter(text => text && text.toString().trim() !== '')
        .join(' | ');

      const { data, error } = await supabase
        .from('abonos')
        .insert([{
          factura_id: abono.factura_id,
          monto: parseFloat(abono.monto),
          fecha: abono.fecha,
          observaciones: observaciones || null
        }])
        .select()
      
      if (error) throw error
      return {
        ...data[0],
        nota: abono.nota || data[0].observaciones || '',
        metodo: abono.metodo_pago || 'Efectivo'
      }
    } catch (error) {
      console.error('Error creando abono:', error)
      throw error
    }
  },

  async obtenerAbonosFactura(facturaId) {
    try {
      const { data, error } = await supabase
        .from('abonos')
        .select('*')
        .eq('factura_id', facturaId)
        .order('fecha', { ascending: false })
      
      if (error) throw error
      return (data || []).map(abono => ({
        ...abono,
        nota: abono.nota || abono.observaciones || '',
        metodo: abono.metodo || abono.metodo_pago || 'Efectivo'
      }))
    } catch (error) {
      console.error('Error obteniendo abonos:', error)
      throw error
    }
  },

  // === CATEGORÍAS ===
async obtenerCategorias() {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id, nombre, description')
      .order('nombre', { ascending: true });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error obteniendo categorías:', error);
    throw new Error('No se pudieron cargar las categorías. Por favor, intenta nuevamente.');
  }
},
  // === VENDEDORES ===
  async obtenerVendedores() {
    try {
      const { data, error } = await supabase
        .from('vendedores')
        .select('*')
        .eq('activo', true)
        .order('nombre')
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error obteniendo vendedores:', error)
      throw error
    }
  }
}