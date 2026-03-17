# Guia: Conexion a Base de Datos MySQL en un Proyecto Vite

## 1. Objetivo
Aprender a conectar una aplicacion hecha con Vite a una base de datos MySQL de forma correcta y segura.

## 2. Idea clave (muy importante)
En Vite (frontend) **no debes conectar MySQL directamente**.
La conexion a MySQL se hace desde un backend (API), por ejemplo con Node.js + Express.

Arquitectura recomendada:
- Frontend: Vite + React
- Backend: Node.js + Express
- Base de datos: MySQL

Flujo:
1. El frontend hace una peticion HTTP (`fetch` o `axios`) al backend.
2. El backend consulta MySQL.
3. El backend responde JSON al frontend.

## 3. Requisitos previos
- Node.js instalado
- MySQL instalado y corriendo
- Proyecto frontend (Vite)
- Carpeta backend (Express)

## 4. Crear backend para MySQL
En una carpeta `server/` (o `backend/`):

```bash
mkdir server
cd server
npm init -y
npm install express mysql2 cors dotenv
```

## 5. Variables de entorno (backend)
Crear archivo `server/.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=pedido_mja
PORT=4000
```

Nota:
- Este `.env` es del backend.
- Nunca expongas estas credenciales en frontend.

## 6. Conexion MySQL con pool (recomendado)
Crear `server/db.js`:

```js
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
```

## 7. API minima con Express
Crear `server/index.js`:

```js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS ok');
    res.json({ ok: true, db: rows[0].ok });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/productos', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, nombre, precio, categoria FROM productos ORDER BY nombre ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`API corriendo en http://localhost:${port}`);
});
```

Ejecutar backend:

```bash
cd server
node index.js
```

## 8. Consumir API desde Vite
En frontend (ejemplo React):

```js
const response = await fetch('http://localhost:4000/api/productos');
const data = await response.json();
console.log(data);
```

## 9. Consultas SQL tipicas
- SELECT:
```sql
SELECT * FROM productos;
```

- INSERT:
```sql
INSERT INTO productos (nombre, precio, categoria) VALUES ('Acetaminofen', 3500, 'Antigripal');
```

- UPDATE:
```sql
UPDATE productos SET precio = 3800 WHERE id = 1;
```

- DELETE:
```sql
DELETE FROM productos WHERE id = 1;
```

## 10. Errores comunes y solucion

## Error 1: `ER_ACCESS_DENIED_ERROR`
Causa:
- Usuario o password incorrectos.

Solucion:
- Verificar `DB_USER` y `DB_PASSWORD` en `server/.env`.

## Error 2: `ECONNREFUSED 127.0.0.1:3306`
Causa:
- MySQL no esta iniciado o puerto incorrecto.

Solucion:
- Iniciar servicio MySQL.
- Validar puerto `DB_PORT`.

## Error 3: `Unknown database 'pedido_mja'`
Causa:
- Base de datos no existe.

Solucion:
- Crear DB en MySQL:
```sql
CREATE DATABASE pedido_mja;
```

## Error 4: `Table 'pedido_mja.productos' doesn't exist`
Causa:
- Tabla faltante.

Solucion:
- Crear tabla o corregir nombre de tabla en query.

## Error 5: CORS bloqueado en navegador
Causa:
- Backend no tiene `cors()` habilitado.

Solucion:
- Agregar `app.use(cors())` en Express.

## Error 6: Frontend muestra `Failed to fetch`
Causa:
- Backend apagado o URL incorrecta.

Solucion:
- Revisar que backend corra en `http://localhost:4000`.
- Verificar endpoint exacto.

## Error 7: `Cannot read properties of undefined` con variables de entorno
Causa:
- `.env` no cargado o variable mal escrita.

Solucion:
- Confirmar `require('dotenv').config()` al inicio.
- Reiniciar backend despues de cambiar `.env`.

## 11. Seguridad basica recomendada
- Nunca exponer credenciales MySQL en frontend.
- Usar consultas parametrizadas (evita SQL injection):

```js
const [rows] = await pool.query('SELECT * FROM productos WHERE id = ?', [id]);
```

- Definir usuario MySQL con permisos minimos.

## 12. Checklist rapido
- MySQL encendido.
- `server/.env` correcto.
- Backend Express corriendo.
- Endpoint `/api/health` responde ok.
- Frontend consulta al backend (no directo a MySQL).

## 13. Comandos utiles
```bash
# Backend
cd server
npm install
node index.js

# Frontend (en otra terminal)
cd /ruta/de/tu/proyecto-vite
npm install
npm run dev
```

## 14. Resumen final
Para Vite + MySQL, la conexion correcta siempre es:
- Vite (cliente) -> API Node/Express -> MySQL

Si intentas conectar MySQL directo desde React, tendras problemas de seguridad y arquitectura.
