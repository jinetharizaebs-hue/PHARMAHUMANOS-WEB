import { supabase } from './supabase.js';

async function verificarCategorias() {
  try {
    console.log('🔍 Verificando categorías disponibles en la base de datos...\n');

    const { data, error } = await supabase
      .from('categories')
      .select('id, nombre')
      .order('nombre');

    if (error) throw error;

    console.log('📋 Categorías disponibles:');
    console.log('='.repeat(50));
    data.forEach((cat, index) => {
      console.log(`${(index + 1).toString().padStart(2, ' ')}. ${cat.nombre}`);
    });
    console.log('='.repeat(50));
    console.log(`\n✅ Total: ${data.length} categorías`);

  } catch (error) {
    console.error('❌ Error verificando categorías:', error.message);
  }
}

// Ejecutar verificación
verificarCategorias();