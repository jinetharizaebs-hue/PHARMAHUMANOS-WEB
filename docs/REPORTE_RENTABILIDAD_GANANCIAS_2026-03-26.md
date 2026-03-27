# REPORTE DE CAMBIOS - RENTABILIDAD Y GANANCIA

Fecha: 2026-03-26
Commit: 82414e7
Rama: main

## 1. Objetivo

Se implemento una mejora completa para registrar, calcular y reportar la ganancia de las ventas a partir del costo de compra y el precio de venta de los productos.

El objetivo principal fue permitir que el sistema muestre:

- costo de compra por producto,
- utilidad por producto en cada factura,
- utilidad total por factura,
- reporte de utilidad diaria y mensual,
- distincion entre costo real y costo estimado.

## 2. Problema atendido

Antes de este cambio, el sistema almacenaba y mostraba ventas, pero no permitia medir la utilidad real por producto ni por factura.

Adicionalmente, en algunos casos el costo aparecia en cero dentro de facturas antiguas o datos incompletos, lo que provocaba que el margen saliera en 100%, generando una lectura incorrecta de la ganancia.

## 3. Cambios implementados

### 3.1 Catalogo de productos

Se agrego soporte para costo de compra en el catalogo de productos.

Archivo impactado:
- src/components/CatalogoProductos.jsx

Cambios principales:
- inclusion del campo costo_compra en el formulario,
- validacion del costo en creacion y edicion,
- guardado del costo en Supabase,
- manejo de error si la columna aun no existe en la base de datos.

### 3.2 Facturacion

Se actualizo la logica de facturacion para calcular rentabilidad en tiempo real.

Archivo impactado:
- src/components/InvoiceScreen.jsx

Cambios principales:
- calculo de precio de venta y costo de compra por item,
- calculo de utilidad unitaria,
- calculo de utilidad total por linea,
- compatibilidad con nombres de campo costo_compra y costo_de_compra,
- compatibilidad con nombres de venta precio, precio_venta o venta.

Formula aplicada:

- utilidad unitaria = precio de venta - costo de compra
- utilidad total = utilidad unitaria x cantidad

### 3.3 Vista previa y detalle de factura

Se agrego visibilidad de la rentabilidad dentro de las facturas.

Archivos impactados:
- src/components/FacturaPreview.jsx
- src/components/FacturaDetalle.jsx

Cambios principales:
- columna de costo unitario,
- columna de utilidad,
- total de utilidad en la factura,
- inclusion de utilidad en el contenido copiado del detalle.

### 3.4 Dashboard y reportes de utilidad

Se amplio el dashboard para mostrar utilidad diaria y mensual.

Archivos impactados:
- src/components/DashboardVentas.jsx
- src/components/DashboardVentas.css

Cambios principales:
- resumen de utilidad total,
- tabla de utilidad diaria,
- tabla de utilidad mensual,
- calculo de margen,
- selector de periodicidad Dia o Mes,
- indicador visual de fuente del costo: Real, Estimado o Mixto.

Interpretacion de estados:

- Real: el costo fue tomado desde datos reales guardados.
- Estimado: el costo fue calculado por fallback.
- Mixto: el periodo contiene mezcla de costos reales y estimados.

### 3.5 Utilidad compartida y pruebas

Se centralizo la logica de rentabilidad para que dashboard y pruebas usen la misma base.

Archivos impactados:
- src/lib/rentabilidadUtils.js
- src/lib/__tests__/rentabilidadUtils.test.js

Capacidades agregadas:
- lectura flexible de venta,
- lectura flexible de costo,
- fallback de costo cuando viene en cero,
- agrupacion de utilidad por dia,
- agrupacion de utilidad por mes,
- clasificacion de fuente de costo.

## 4. Regla de negocio aplicada

Cuando una factura no tiene costo real guardado, el sistema estima el costo usando la regla definida para este caso:

- costo estimado = venta x 0.80
- utilidad estimada = venta x 0.20

Esto evita que el dashboard muestre una utilidad falsa del 100% cuando el costo se encuentra en cero.

## 5. Scripts SQL creados

Archivos creados:
- sql/AGREGAR_COSTO_COMPRA_PRODUCTOS.sql
- sql/DESCUENTO_20_PORCIENTO_PRECIOS.sql

Finalidad:
- agregar columna de costo de compra si no existe,
- poblar costo desde el valor de venta con descuento del 20%,
- dejar una base consistente para los reportes de utilidad.

## 6. Validacion realizada

Se ejecutaron pruebas unitarias para validar la logica de rentabilidad.

Resultado:
- 14 pruebas aprobadas
- 0 fallos

Se valido:
- lectura correcta de precio de venta,
- lectura correcta de costo real,
- fallback del 80% de costo cuando corresponde,
- utilidad total por factura,
- agrupacion diaria,
- agrupacion mensual,
- clasificacion Real, Estimado y Mixto.

## 7. Impacto funcional

Con este cambio, el sistema ya permite:

- conocer la ganancia por producto,
- conocer la ganancia por factura,
- conocer la utilidad diaria,
- conocer la utilidad mensual,
- detectar si la ganancia fue calculada con costo real o estimado.

## 8. Recomendacion operativa

Para que los reportes reflejen utilidad real y no estimada, se recomienda:

1. mantener actualizado el costo de compra de cada producto,
2. verificar que los productos nuevos guarden costo correctamente,
3. usar el indicador Real, Estimado o Mixto para interpretar el reporte,
4. ejecutar los scripts SQL si aun hay productos con costo en cero.

## 9. Resumen ejecutivo

Se implemento exitosamente el modulo de rentabilidad sobre el flujo de ventas existente. El sistema ahora puede calcular y reportar utilidad por producto, factura, dia y mes, con soporte para datos historicos y con proteccion contra lecturas incorrectas cuando el costo no esta presente.