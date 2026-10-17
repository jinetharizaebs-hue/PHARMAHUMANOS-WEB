// Migra las imágenes de productos (descargadas de Cloudinary) a Supabase Storage.
//
// 1. Busca para cada producto su imagen en la carpeta local (por el nombre del archivo
//    de su imagen_url o por imagen_public_id).
// 2. La comprime a WebP (máx. 800 px, calidad 75).
// 3. La sube al bucket público "productos" y actualiza productos.imagen_url.
//
// Uso:
//   node migrar_imagenes_storage.js <carpeta_imagenes>              -> modo prueba (no sube ni modifica nada)
//   node migrar_imagenes_storage.js <carpeta_imagenes> --ejecutar   -> sube y actualiza la base de datos
//
// Variables requeridas (se leen de ../.env o del entorno):
//   VITE_SUPABASE_URL (../.env)
//   SUPABASE_SERVICE_ROLE_KEY  (scripts/.env, solo para --ejecutar; NO la guardes en el .env del frontend)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const BUCKET = 'productos';
const MAX_LADO = 800;
const CALIDAD = 75;
const EXTENSIONES = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.heic'];

const carpeta = process.argv[2];
const ejecutar = process.argv.includes('--ejecutar');

if (!carpeta || !fs.existsSync(carpeta)) {
  console.error('Uso: node migrar_imagenes_storage.js <carpeta_imagenes> [--ejecutar]');
  process.exit(1);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = ejecutar
  ? process.env.SUPABASE_SERVICE_ROLE_KEY
  : process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(ejecutar
    ? 'Falta SUPABASE_SERVICE_ROLE_KEY (Supabase > Project Settings > API > service_role).'
    : 'Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en ../.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Índice de archivos locales por nombre sin extensión
const archivosLocales = new Map();
for (const archivo of fs.readdirSync(carpeta)) {
  const ext = path.extname(archivo).toLowerCase();
  if (!EXTENSIONES.includes(ext)) continue;
  archivosLocales.set(path.basename(archivo, path.extname(archivo)), path.join(carpeta, archivo));
}

async function obtenerProductos() {
  const productos = [];
  const lote = 1000;
  for (let desde = 0; ; desde += lote) {
    const { data, error } = await supabase
      .from('productos')
      .select('id, codigo, nombre, imagen_url, imagen_public_id')
      .order('id')
      .range(desde, desde + lote - 1);
    if (error) throw error;
    productos.push(...data);
    if (data.length < lote) break;
  }
  return productos;
}

function buscarArchivo(producto) {
  const candidatos = [];
  if (producto.imagen_url) {
    const nombre = decodeURIComponent(producto.imagen_url.split('?')[0].split('/').pop() || '');
    candidatos.push(path.basename(nombre, path.extname(nombre)));
  }
  if (producto.imagen_public_id) {
    candidatos.push(producto.imagen_public_id.split('/').pop());
  }
  for (const c of candidatos) {
    if (archivosLocales.has(c)) return archivosLocales.get(c);
  }
  return null;
}

async function asegurarBucket() {
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (data) return;
  const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
  if (error) throw error;
  console.log(`Bucket "${BUCKET}" creado (público).`);
}

async function main() {
  console.log(ejecutar ? '=== MODO EJECUCIÓN ===' : '=== MODO PRUEBA (no se sube ni modifica nada) ===');
  console.log(`Imágenes locales encontradas: ${archivosLocales.size}`);

  const productos = await obtenerProductos();
  const pendientes = productos.filter(p => p.imagen_url && p.imagen_url.includes('res.cloudinary.com'));
  console.log(`Productos: ${productos.length} | con imagen en Cloudinary: ${pendientes.length}`);

  if (ejecutar) await asegurarBucket();

  const marca = new Date().toISOString().replace(/[:.]/g, '-');
  const registro = path.join(__dirname, `migracion_imagenes_${marca}.csv`);
  const lineas = ['id,codigo,estado,imagen_url_anterior,imagen_url_nueva,kb_original,kb_final'];

  let ok = 0, sinArchivo = 0, errores = 0, bytesOriginal = 0, bytesFinal = 0;

  for (const producto of pendientes) {
    const archivo = buscarArchivo(producto);
    if (!archivo) {
      sinArchivo++;
      lineas.push(`${producto.id},"${producto.codigo ?? ''}",sin_archivo,${producto.imagen_url},,,`);
      continue;
    }

    try {
      const original = fs.statSync(archivo).size;
      const meta = await sharp(archivo).metadata();
      // Si ya está en WebP y del tamaño correcto (rescatada con --comprimir), se sube tal cual
      const yaComprimida = meta.format === 'webp' && Math.max(meta.width, meta.height) <= MAX_LADO;
      const buffer = yaComprimida
        ? fs.readFileSync(archivo)
        : await sharp(archivo)
          .rotate()
          .resize({ width: MAX_LADO, height: MAX_LADO, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: CALIDAD })
          .toBuffer();

      bytesOriginal += original;
      bytesFinal += buffer.length;

      let nuevaUrl = '';
      if (ejecutar) {
        const ruta = `${producto.id}.webp`;
        const { error: errorSubida } = await supabase.storage
          .from(BUCKET)
          .upload(ruta, buffer, { contentType: 'image/webp', upsert: true, cacheControl: '31536000' });
        if (errorSubida) throw errorSubida;

        nuevaUrl = supabase.storage.from(BUCKET).getPublicUrl(ruta).data.publicUrl;
        const { error: errorUpdate } = await supabase
          .from('productos')
          .update({ imagen_url: nuevaUrl, imagen_public_id: ruta })
          .eq('id', producto.id);
        if (errorUpdate) throw errorUpdate;
      }

      ok++;
      lineas.push(`${producto.id},"${producto.codigo ?? ''}",${ejecutar ? 'migrado' : 'listo'},${producto.imagen_url},${nuevaUrl},${Math.round(original / 1024)},${Math.round(buffer.length / 1024)}`);
      if (ok % 50 === 0) console.log(`  ${ok} procesadas...`);
    } catch (error) {
      errores++;
      lineas.push(`${producto.id},"${producto.codigo ?? ''}",error: ${String(error.message || error).replace(/[,\n]/g, ' ')},${producto.imagen_url},,,`);
    }
  }

  fs.writeFileSync(registro, lineas.join('\n') + '\n');

  const mb = b => (b / 1024 / 1024).toFixed(1);
  console.log('\n=== RESUMEN ===');
  console.log(`${ejecutar ? 'Migradas' : 'Listas para migrar'}: ${ok}`);
  console.log(`Sin archivo local: ${sinArchivo}`);
  console.log(`Errores: ${errores}`);
  console.log(`Peso: ${mb(bytesOriginal)} MB -> ${mb(bytesFinal)} MB`);
  console.log(`Registro (sirve para revertir): ${registro}`);
}

main().catch(error => {
  console.error('Error:', error.message || error);
  process.exit(1);
});
