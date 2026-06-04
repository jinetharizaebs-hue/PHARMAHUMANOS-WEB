# Informe De Corrección

Fecha: 2026-06-04  
Proyecto: pedido-mja-web  
Módulo: Gestión de Pedidos y Facturación

## 1. Situación reportada

Se identificó que algunos pedidos continuaban en estado Pendiente aun después de haber sido facturados.

Esto generó:
- Acumulación de pedidos pendientes no reales.
- Riesgo de reprocesar pedidos ya atendidos.
- Confusión en seguimiento operativo del equipo comercial.

## 2. Causa raíz

El flujo Cargar como Factura trasladaba información comercial del pedido a facturación, pero no transportaba ni actualizaba el identificador del pedido original para cerrar su estado automáticamente.

## 3. Solución implementada

Se aplicaron dos ajustes:

1. Al cargar pedido como factura, ahora también viaja el pedido_id.
2. Al guardar la factura, si existe pedido_id de origen, se actualiza el pedido a estado entregado con fecha_actualizacion.

## 4. Archivos intervenidos

- src/components/GestionPedidos.jsx
- src/components/InvoiceScreen.jsx

## 5. Resultado esperado

- Los nuevos pedidos facturados desde Gestión de Pedidos dejan de quedar en Pendiente.
- El estado del pedido queda sincronizado con la facturación.
- Se reduce el rezago operativo en la cola de pendientes.

## 6. Validación

Se validó que no se generaran errores de compilación en los archivos intervenidos.

## 7. Recomendación operativa

Para pedidos históricos que ya quedaron pendientes antes de esta mejora, realizar una depuración inicial y marcarlos según su estado real.
