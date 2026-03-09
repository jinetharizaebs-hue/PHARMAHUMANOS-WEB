import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Cargar variables de entorno
config({ path: '../.env' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el archivo .env')
  process.exit(1)
}

// Crea y exporta el cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseKey)