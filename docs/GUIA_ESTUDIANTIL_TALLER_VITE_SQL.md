# Guia Estudiantil

## Taller: Proyecto con Vite + Base de Datos + SQL

## 1. Contexto
Este taller esta pensado para recuperar y fortalecer los temas vistos en clase:
- Creacion de proyectos con Vite
- Conexion a base de datos
- Consultas SQL (CRUD)
- Presentacion de resultados en una aplicacion web

Duracion total: 2 semanas
Modalidad: individual

## 2. Objetivo general
Construir una aplicacion web funcional con Vite conectada a una base de datos, permitiendo crear, consultar, actualizar y eliminar informacion (CRUD).

## 3. Resultado esperado
Al finalizar debes entregar una app que:
- Muestre datos desde la base de datos
- Permita registrar nuevos datos
- Permita editar y eliminar datos
- Incluya consultas SQL documentadas
- Tenga README de instalacion y uso

## 4. Stack sugerido
- Frontend: Vite + React
- Base de datos: PostgreSQL (o Supabase)
- Backend (opcional): Node + Express
- Control de versiones: Git + GitHub

## 5. Plan de trabajo (2 semanas)

## Semana 1
### Dia 1
- Instalar Node.js y crear el proyecto con Vite.
- Crear repositorio en GitHub y hacer primer commit.

### Dia 2
- Definir tema del proyecto (ejemplo: inventario de farmacia, biblioteca, tienda escolar).
- Disenar modelo de base de datos (minimo 3 tablas relacionadas).

### Dia 3
- Crear las tablas con SQL.
- Insertar datos de prueba.

### Dia 4
- Escribir y probar consultas SQL:
- SELECT
- WHERE
- ORDER BY
- JOIN

### Dia 5
- Conectar la app a la base de datos.
- Mostrar una lista de registros en pantalla.

## Semana 2
### Dia 6
- Crear formulario para insertar datos (INSERT).

### Dia 7
- Editar datos existentes (UPDATE).

### Dia 8
- Eliminar registros con confirmacion (DELETE).

### Dia 9
- Agregar busqueda o filtros por categoria/nombre.

### Dia 10
- Validar campos obligatorios y tipos de dato.

### Dia 11
- Manejar errores en interfaz (mensajes claros para usuario).

### Dia 12
- Ajustar estilo basico y mejorar experiencia de usuario.

### Dia 13
- Preparar documentacion final y capturas.

### Dia 14
- Entrega final + video de 3 a 5 minutos explicando el proyecto.

## 6. Entregables obligatorios
1. Repositorio GitHub con el proyecto completo.
2. Carpeta `sql/` con:
- `schema.sql` (estructura de tablas)
- `seed.sql` (datos iniciales)
- `consultas.sql` (consultas utilizadas)
3. README.md con:
- nombre del proyecto
- objetivo
- tecnologias usadas
- pasos para ejecutar
- variables de entorno
4. Evidencias:
- capturas de pantalla del CRUD
- video corto demostrativo

## 7. Requisitos minimos
- Minimo 3 tablas relacionadas.
- Minimo 8 consultas SQL diferentes.
- CRUD funcional (crear, leer, actualizar, eliminar).
- Aplicacion ejecutando sin errores criticos.

## 8. Recomendaciones
- Haz commits pequenos y frecuentes.
- Nombra bien archivos y variables.
- Prueba cada consulta SQL antes de integrarla en la app.
- Usa mensajes de error entendibles.

## 9. Criterios de evaluacion
La nota se asignara con rubrica oficial del taller (ver guia docente).

## 10. Checklist antes de entregar
- El proyecto corre con `npm install` y `npm run dev`.
- Se puede conectar a la base de datos.
- El CRUD funciona completo.
- README y archivos SQL estan completos.
- Se envio link del repositorio y evidencias.
