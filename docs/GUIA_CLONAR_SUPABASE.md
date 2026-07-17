# Guía rápida para clonar la base de datos a una nueva instancia de Supabase

## 1. Crear el nuevo proyecto en Supabase
- Entrar a https://supabase.com
- Crear un nuevo proyecto
- Esperar a que el proyecto quede listo

## 2. Obtener la URL de conexión directa de la nueva base
- Ir a Supabase Dashboard -> Project Settings -> Database
- Copiar la cadena de conexión directa (direct connection)
- Formato esperado:

```bash
postgresql://postgres:TU_PASSWORD@db.TU_PROYECTO.supabase.co:5432/postgres
```

## 3. Restaurar el dump del proyecto actual
Este repositorio ya trae un respaldo en:

```bash
backup_origen.dump
```

Ejecuta el script:

```bash
cd /Users/edwinmarin/PHARMAHUMANOS-WEB
chmod +x scripts/restore-supabase-dump.sh
export SUPABASE_DATABASE_URL='postgresql://postgres:TU_PASSWORD@db.TU_PROYECTO.supabase.co:5432/postgres'
./scripts/restore-supabase-dump.sh
```

## 4. Actualizar la app para que use la nueva base
En la raíz del proyecto, actualiza el archivo .env con las credenciales del nuevo proyecto:

```env
VITE_SUPABASE_URL=https://TU_NUEVO_PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_NUEVA_ANON_KEY
```

Luego reinicia el proyecto:

```bash
npm run dev
```

## 5. Verificar que la app se conecte
Prueba una consulta simple desde la app o desde el SQL Editor:

```sql
select * from productos limit 5;
```
