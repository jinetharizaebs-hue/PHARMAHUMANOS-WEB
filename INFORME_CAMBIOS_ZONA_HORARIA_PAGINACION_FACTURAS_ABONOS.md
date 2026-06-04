# Informe De Cambios Implementados

Fecha: 2026-06-04
Proyecto: pedido-mja-web

## 1) Corrección de zona horaria (Colombia)

### Problema reportado
Las fechas se guardaban o mostraban con un día menos en algunos módulos por usar parseo UTC (por ejemplo, `new Date('YYYY-MM-DD')` y `toISOString().split('T')[0]`).

### Solución aplicada
Se estandarizó el manejo de fecha local (America/Bogota) con funciones helper para:
- Generar fecha local para inputs.
- Parsear `YYYY-MM-DD` en horario local.
- Formatear fechas sin desfase.

### Archivos impactados
- src/components/FacturaDetalle.jsx
- src/components/InvoiceScreen.jsx
- src/components/FacturasGuardadas.jsx
- src/components/ReportesCobros.jsx
- src/components/ReporteClientesPorProducto.jsx

### Resultado
Las facturas, abonos y reportes ya no presentan desfase de fecha por zona horaria.

---

## 2) Paginación para ver todas las facturas y abonos

### Problema reportado
Solo se visualizaban hasta 1000 registros (límite por defecto en consultas Supabase/PostgREST).

### Solución aplicada
Se implementó paginación por bloques (`PAGE_SIZE = 1000`) usando consultas con `.range(from, to)` en bucle hasta traer todos los registros.

### Archivos impactados
- src/components/FacturasGuardadas.jsx
  - Carga total de `facturas`.
  - Carga total de `abonos`.
- src/components/GestionPedidos.jsx
  - Carga total de `pedidos`.

### Resultado
Ahora se visualizan registros por encima del límite de 1000, incluyendo facturas nuevas y su historial de abonos.

---

## 3) Contraseñas para editar/eliminar abonos

### Cambio solicitado
Agregar una segunda contraseña válida para operaciones sensibles de abonos.

### Solución aplicada
En edición y eliminación de abonos se dejó validación con doble clave válida:
- `edwin`
- `Maranatha0425`

### Archivo impactado
- src/components/FacturaDetalle.jsx

### Resultado
Se pueden editar y eliminar abonos con cualquiera de las dos contraseñas configuradas.

---

## 4) Nota del cliente en factura (impresión y vista)

### Cambio solicitado
Incluir las observaciones/notas del cliente en la factura, debajo del valor en letras (SON: ...).

### Solución aplicada
Se agregó extracción de la nota del cliente y su renderizado condicional en:
- Plantilla de impresión.
- Vista de detalle de factura.

Etiqueta mostrada:
- `NOTAS DEL CLIENTE:`

### Archivo impactado
- src/components/FacturaDetalle.jsx

### Resultado
Si la factura tiene nota asociada, esta aparece en impresión y en el detalle visual.

---

## 5) Cambio de nombre completo en factura y textos del sistema

### Cambio solicitado
Mostrar razón social completa:

`DISTRIBUIDORA FARMACÉUTICA MARANATHA J.A`

### Solución aplicada
Se unificó el nombre corporativo en plantillas de impresión y textos visibles del sistema (incluyendo mensajes).

### Archivos impactados
- src/components/FacturaDetalle.jsx
- src/components/GestionPedidos.jsx
- src/components/DashboardVentas.jsx

### Resultado
La razón social aparece completa y consistente en factura impresa y textos actualizados.

---

## Validación técnica

- Verificación de código completada en los componentes modificados.
- Sin errores de lint/compilación reportados en los archivos intervenidos durante la validación.

## Resumen ejecutivo

Se implementaron y verificaron los cambios solicitados en:
1. Zona horaria (fecha local Colombia).
2. Paginación para superar límite de 1000 registros.
3. Doble contraseña para editar/eliminar abonos.
4. Inclusión de notas del cliente en factura.
5. Unificación del nombre completo corporativo en impresión y textos clave.
