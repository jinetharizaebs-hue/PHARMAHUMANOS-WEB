# Guia Docente

## Taller: Proyecto con Vite + Base de Datos + SQL (2 semanas)

## 1. Proposito pedagogico
Nivelar al estudiante que presento inasistencias y validar competencias en:
- Desarrollo frontend con Vite
- Modelado y uso de base de datos relacional
- Consultas SQL y operaciones CRUD
- Documentacion y presentacion tecnica

## 2. Competencias a evaluar
- Configura un proyecto web moderno con Vite.
- Disena e implementa una base de datos basica relacional.
- Ejecuta consultas SQL con criterio tecnico.
- Integra frontend con fuente de datos.
- Documenta y comunica su solucion.

## 3. Enunciado resumido para clase
El estudiante debe construir una aplicacion web funcional conectada a base de datos, con CRUD completo y evidencia tecnica de consultas SQL.

## 4. Alcance minimo exigible
- 3 tablas relacionadas.
- 8 consultas SQL documentadas.
- CRUD completo en interfaz.
- README con instrucciones replicables.
- Evidencias (capturas + video corto).

## 5. Cronograma sugerido (14 dias)
- Semana 1: entorno, modelo de datos, SQL base, conexion y lectura.
- Semana 2: CRUD completo, validaciones, manejo de errores, documentacion y presentacion.

## 6. Rubrica de evaluacion (100 puntos)

| Criterio | Peso | Nivel alto (100%-90%) | Nivel medio (89%-70%) | Nivel basico (69%-60%) | Nivel bajo (<60%) |
|---|---:|---|---|---|---|
| Configuracion y estructura del proyecto | 10 | Estructura limpia, ejecuta sin errores, buenas practicas | Ejecuta con detalles menores | Ejecuta parcialmente | No ejecuta |
| Diseno de base de datos | 15 | Tablas coherentes, relaciones correctas, tipos adecuados | Buena base con pequenos errores | Relaciones incompletas | Modelo incorrecto |
| Consultas SQL | 20 | Consultas variadas y correctas (JOIN, filtros, orden) | Mayoria correctas | Varias inconsistencias | Consultas no funcionales |
| Integracion app-base de datos | 15 | Conexion estable y flujo consistente | Funciona con fallos menores | Conexion intermitente | Sin integracion |
| CRUD en interfaz | 20 | Crear, leer, actualizar y eliminar sin fallos | Falta pulir 1 operacion | CRUD parcial | No funcional |
| Validaciones y manejo de errores | 10 | Validaciones completas y mensajes claros | Validaciones parciales | Validaciones minimas | Sin validaciones |
| Documentacion y presentacion | 10 | README completo, evidencias claras, buena explicacion | Documentacion suficiente | Documentacion incompleta | Sin documentacion |

Total: 100 puntos

## 7. Escala sugerida
- 90 a 100: Sobresaliente
- 80 a 89: Alto
- 70 a 79: Basico
- Menor a 70: Bajo

## 8. Evidencias que debe entregar el estudiante
1. Link de repositorio.
2. Carpeta SQL (`schema.sql`, `seed.sql`, `consultas.sql`).
3. Video de 3 a 5 minutos demostrando funcionamiento.
4. README con pasos de ejecucion.

## 9. Lista de chequeo para retroalimentacion
- El docente clona el repo y ejecuta `npm install` + `npm run dev`.
- Verifica si hay variables de entorno declaradas.
- Revisa que el CRUD sea realmente persistente en BD.
- Valida que las consultas SQL entregadas correspondan al sistema.
- Evalua claridad de comunicacion en video/README.

## 10. Observaciones pedagogicas
- Si el estudiante llega a 70-79, recomendar refuerzo en SQL JOIN y validaciones.
- Si queda por debajo de 70, solicitar plan de mejora con una semana adicional enfocada en CRUD y documentacion.
- Priorizar calidad funcional sobre complejidad visual.
