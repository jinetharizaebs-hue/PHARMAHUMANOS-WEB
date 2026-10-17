// Descarga las imágenes de productos que están en Cloudinary a una carpeta local.
//
// Toma las URLs de productos.imagen_url (Supabase) y, para cada una, intenta:
//   1. La URL pública (CDN).
//   2. La descarga firmada por API (api.cloudinary.com/.../download), usando tu API key/secret.
//      Esta vía no pasa por la CDN y puede funcionar aunque la entrega pública esté bloqueada.
//
// Uso:
//   node rescatar_cloudinary.js --probar     -> intenta solo 3 imágenes
//   node rescatar_cloudinary.js              -> descarga todas (salta las ya descargadas)
//   node rescatar_cloudinary.js --comprimir  -> igual, pero guarda en WebP 800 px (ocupa ~10 veces menos)
//
// Variables (en ../.env, scripts/.env o el entorno):
//   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
//   CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET   (Cloudinary > Settings > API Keys)

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const CARPETA = path.join(__dirname, '..', 'rescate-imagenes-cloudinary', 'tynjloyv');
const PARALELO = 5;
const probar = process.argv.includes('--probar');
// --comprimir: guarda directamente en WebP (máx. 800 px), para ahorrar espacio en disco
const comprimir = process.argv.includes('--comprimir');

const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

if (!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY) {
  console.error('Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en ../.env');
  process.exit(1);
}
if (!CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.warn('Aviso: sin CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET solo se intentará la URL pública.\n');
}

const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);

async function obtenerUrls() {
  const urls = new Set();
  const lote = 1000;
  for (let desde = 0; ; desde += lote) {
    const { data, error } = await supabase
      .from('productos')
      .select('id, imagen_url')
      .order('id')
      .range(desde, desde + lote - 1);
    if (error) throw error;
    data.forEach(p => p.imagen_url?.includes('res.cloudinary.com') && urls.add(p.imagen_url.trim()));
    if (data.length < lote) break;
  }
  return [...urls];
}

// https://res.cloudinary.com/<cloud>/image/upload/v123/<carpeta>/<id>.<ext>
function interpretarUrl(url) {
  const m = url.match(/res\.cloudinary\.com\/([^/]+)\/(image|video|raw)\/(upload|private|authenticated)\/(?:v\d+\/)?(.+)$/);
  if (!m) return null;
  const [, cloud, recurso, tipo, resto] = m;
  const ext = path.extname(resto);
  return { cloud, recurso, tipo, publicId: resto.slice(0, -ext.length), formato: ext.slice(1) };
}

function urlDescargaFirmada({ cloud, recurso, tipo, publicId, formato }) {
  const params = { format: formato, public_id: publicId, timestamp: Math.floor(Date.now() / 1000), type: tipo };
  const base = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  const signature = crypto.createHash('sha1').update(base + CLOUDINARY_API_SECRET).digest('hex');
  const qs = new URLSearchParams({ ...params, api_key: CLOUDINARY_API_KEY, signature });
  return `https://api.cloudinary.com/v1_1/${cloud}/${recurso}/download?${qs}`;
}

async function bajar(url, intentos = 4) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(60000) });
      if (!r.ok) return { ok: false, estado: r.status, detalle: r.headers.get('x-cld-error') || '' };
      return { ok: true, buffer: Buffer.from(await r.arrayBuffer()) };
    } catch (error) {
      if (i >= intentos) return { ok: false, estado: 'red', detalle: error.cause?.code || error.message };
      await new Promise(res => setTimeout(res, 3000 * i));
    }
  }
}

async function rescatar(url) {
  const nombre = path.basename(url);
  const destino = path.join(CARPETA, nombre);
  const destinoWebp = path.join(CARPETA, path.basename(nombre, path.extname(nombre)) + '.webp');
  if (fs.existsSync(destino) || fs.existsSync(destinoWebp)) return { url, estado: 'ya_existia' };

  const guardar = async buffer => {
    if (!comprimir) return fs.writeFileSync(destino, buffer);
    const webp = await sharp(buffer)
      .rotate()
      .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer();
    fs.writeFileSync(destinoWebp, webp);
  };

  const intentos = [];
  const publica = await bajar(url);
  if (publica.ok) {
    await guardar(publica.buffer);
    return { url, estado: 'ok_cdn' };
  }
  intentos.push(`cdn ${publica.estado} ${publica.detalle}`.trim());

  const info = interpretarUrl(url);
  if (info && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
    const api = await bajar(urlDescargaFirmada(info));
    if (api.ok) {
      await guardar(api.buffer);
      return { url, estado: 'ok_api' };
    }
    intentos.push(`api ${api.estado} ${api.detalle}`.trim());
  }
  return { url, estado: 'fallo', detalle: intentos.join(' | ') };
}

async function main() {
  fs.mkdirSync(CARPETA, { recursive: true });
  let urls = await obtenerUrls();
  console.log(`URLs de Cloudinary en productos: ${urls.length}`);
  if (probar) {
    urls = urls.filter(u => !fs.existsSync(path.join(CARPETA, path.basename(u)))).slice(0, 3);
    console.log('Modo prueba: 3 imágenes');
  }

  const resultados = [];
  for (let i = 0; i < urls.length; i += PARALELO) {
    resultados.push(...await Promise.all(urls.slice(i, i + PARALELO).map(rescatar)));
    if (!probar && resultados.length % 100 < PARALELO) console.log(`  ${resultados.length}/${urls.length}`);
  }

  const conteo = resultados.reduce((c, r) => ({ ...c, [r.estado]: (c[r.estado] || 0) + 1 }), {});
  console.log('\n=== RESUMEN ===', conteo);

  const fallos = resultados.filter(r => r.estado === 'fallo');
  if (fallos.length) {
    const archivo = path.join(CARPETA, 'fallos_rescate.txt');
    fs.writeFileSync(archivo, fallos.map(f => `${f.url}\t${f.detalle}`).join('\n') + '\n');
    console.log(`Fallos guardados en ${archivo}`);
    console.log('Ejemplo:', fallos[0].detalle);
  }
}

main().catch(error => {
  console.error('Error:', error.message || error);
  process.exit(1);
});
