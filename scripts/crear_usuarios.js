import { supabase } from './supabase.js'

// Datos de usuarios de ejemplo
const usuariosAInsertar = [
  { usuario: 'admin', contraseña: 'admin123', rol: 'Administrador' },
  { usuario: 'vendedor1', contraseña: 'vend1234', rol: 'Vendedor' },
  { usuario: 'vendedor2', contraseña: 'vend5678', rol: 'Vendedor' },
  { usuario: 'gerente', contraseña: 'ger1234', rol: 'Gerente' },
  { usuario: 'soporte', contraseña: 'sop1234', rol: 'Soporte' }
]

const insertarUsuarios = async () => {
  try {
    console.log('📋 Iniciando inserción de usuarios...\n')

    for (const usuario of usuariosAInsertar) {
      const { data, error } = await supabase
        .from('usuarios')
        .insert([usuario])

      if (error) {
        console.log(`❌ Error al insertar ${usuario.usuario}:`, error.message)
      } else {
        console.log(`✅ Usuario creado: ${usuario.usuario} (Rol: ${usuario.rol})`)
      }
    }

    // Mostrar todos los usuarios
    console.log('\n📊 Usuarios en la base de datos:\n')
    const { data, error } = await supabase.from('usuarios').select('*')
    
    if (error) {
      console.log('Error al consultar:', error.message)
    } else {
      console.table(data)
      console.log(`\n✅ Total usuarios: ${data.length}`)
    }

  } catch (error) {
    console.error('Error:', error)
  }
}

insertarUsuarios()
