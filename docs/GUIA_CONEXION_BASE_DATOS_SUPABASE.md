# Guia: Conexion a Base de Datos (Supabase) + Errores Comunes

## 1. Objetivo
Esta guia explica como conectar tu proyecto Vite con Supabase y como resolver los errores que mas se repiten en desarrollo y despliegue.

## 2. Requisitos previos
- Node.js instalado
- Proyecto creado con Vite
- Proyecto creado en Supabase
- Tablas creadas en Supabase (ejemplo: `productos`, `pedidos`)

## 3. Variables de entorno en Vite
En la raiz del proyecto, crea o valida un archivo `.env`:

```env
VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY
```

Importante:
- En Vite, las variables del frontend deben iniciar con `VITE_`.
- Nunca pongas la `service_role` en el frontend.

## 4. Cliente Supabase (estructura recomendada)
Tu proyecto ya tiene esta logica en:
- `src/lib/supabase.js`
- `src/components/supabaseClient.js`

Recomendacion: usar un solo cliente central (por ejemplo `src/lib/supabase.js`) y reutilizarlo en todos los componentes.

Ejemplo de cliente:

```js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el entorno.');
}

export const supabase = createClient(
  supabaseUrl || 'https://example.supabase.co',
  supabaseKey || 'public-anon-key-placeholder'
);
```

## 5. Prueba minima de conexion
Prueba desde un componente:

```js
const { data, error } = await supabase.from('productos').select('*').limit(1);

if (error) {
  console.error('Error Supabase:', error.message);
} else {
  console.log('Conexion OK:', data);
}
```

Si devuelve datos, la conexion esta bien.

## 6. Configuracion en Vercel
Para que funcione en produccion:
1. Ir a Vercel -> Project -> Settings -> Environment Variables.
2. Agregar:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
3. Guardar y hacer redeploy.

Si en local funciona y en Vercel no, casi siempre faltan estas variables en Vercel.

## 7. Errores comunes y solucion

## Error 1: "Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY"
Causa:
- No existe `.env` o esta mal escrito.

Solucion:
- Verificar nombres exactos de variables.
- Reiniciar `npm run dev` despues de cambiar `.env`.

## Error 2: "Failed to fetch" o timeout de red
Causa:
- URL incorrecta o problema de red.

Solucion:
- Revisar `VITE_SUPABASE_URL`.
- Probar URL en navegador.
- Verificar bloqueo por firewall/proxy.

## Error 3: "Invalid API key" / 401
Causa:
- `VITE_SUPABASE_ANON_KEY` equivocada o incompleta.

Solucion:
- Copiar de nuevo la anon key desde Supabase.
- Confirmar que no tenga espacios extras.

## Error 4: "relation \"tabla\" does not exist"
Causa:
- Tabla no creada o nombre distinto.

Solucion:
- Validar nombre real en Supabase SQL Editor.
- Confirmar esquema (por defecto `public`).

## Error 5: "new row violates row-level security policy"
Causa:
- RLS activado sin politica para SELECT/INSERT/UPDATE/DELETE.

Solucion:
- Crear politicas RLS segun el caso.
- Para pruebas controladas, habilitar politica temporal de lectura/escritura.

## Error 6: En local funciona, en Vercel falla
Causa:
- Variables de entorno no configuradas en Vercel.

Solucion:
- Configurar variables en Vercel.
- Hacer redeploy.

## Error 7: Datos vacios sin error
Causa:
- Filtro demasiado restrictivo o politicas RLS bloqueando lectura.

Solucion:
- Probar `select('*').limit(5)` sin filtros.
- Revisar politicas de lectura.

## 8. Checklist rapido de diagnostico
- `.env` existe y tiene `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
- Reiniciaste servidor despues de cambiar variables.
- La tabla existe en Supabase.
- Politicas RLS permiten la operacion.
- Variables tambien estan configuradas en Vercel.

## 9. Buenas practicas
- Mantener un solo archivo cliente de Supabase.
- No exponer claves sensibles en frontend.
- Manejar `error.message` en UI para soporte rapido.
- Documentar queries SQL usadas por cada modulo.

## 10. Comandos utiles
```bash
# Instalar dependencias
npm install

# Levantar proyecto local
npm run dev

# Verificar estado git antes de subir cambios
git status --short

# Subir cambios de conexion/documentacion
git add .
git commit -m "Agregar guia de conexion a Supabase y errores comunes"
git push origin main
```
