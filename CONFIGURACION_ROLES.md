# Configuración de Roles en el Sistema EBS

## 📋 Roles Disponibles

### 1. **SUPERADMIN** 🔐
**El rol más privilegiado del sistema**

**Acceso:**
- ✅ Todas las funcionalidades de Admin
- ✅ **Reporte Exclusivo: "Clientes por Producto"** (solo superadmin)
- ✅ Reportes avanzados
- ✅ Auditoría completa
- ✅ Dashboard de ventas
- ✅ Gestión de gastos
- ✅ Dashboard de contabilidad

**Menú especial:** "Reportes Exclusivos" con acceso a:
- Clientes por Producto
- Auditoría de Productos
- Historial de Movimientos
- Dashboard de Ventas

---

### 2. **ADMIN** 👨‍💼
**Administrador general del sistema**

**Acceso:**
- ✅ Crear facturas
- ✅ Ver facturas guardadas
- ✅ Gestión de clientes
- ✅ Auditoría de productos
- ✅ Reportes de cobros
- ✅ Gestión de gastos
- ✅ Gestión de inventario
- ❌ Reporte "Clientes por Producto" (solo para superadmin)

---

### 3. **CONTABILIDAD** 💰
**Gestión contable y financiera**

**Acceso:**
- ✅ Ver facturas guardadas
- ✅ Reportes de cobros
- ✅ Gestión de gastos
- ✅ Dashboard de contabilidad
- ✅ Rutas de cobro
- ✅ Gestión de pedidos
- ✅ Dashboard de ventas
- ✅ Catálogo (lectura)
- ❌ Crear facturas
- ❌ Reporte "Clientes por Producto"

---

### 4. **INVENTARIO** (inv) 📦
**Gestión de bodega y stock**

**Acceso:**
- ✅ Gestión de inventario
- ✅ Gestión de pedidos
- ✅ Catálogo productos (completo)
- ✅ Auditoría de productos
- ❌ Crear/editar facturas (solo lectura)
- ❌ Gestión de clientes
- ❌ Reportes

---

### 5. **VENDEDOR** 🏪
**Ventas y atención al cliente**

**Acceso:**
- ✅ Crear facturas
- ✅ Ver facturas propias
- ✅ Catálogo (lectura)
- ✅ Reportes de cobros
- ✅ Gestión de pedidos
- ✅ Gestión de gastos
- ❌ Auditoría
- ❌ Gestión de inventario

---

### 6. **CLIENTE** 👥
**Cliente final del sistema (acceso limitado)**

**Acceso:**
- ✅ Ver catálogo de productos
- ❌ Crear facturas
- ❌ Acceso administrativo

---

## 🔐 Crear usuarios y asignar roles en Supabase Auth

Las cuentas del equipo se autentican con correo y contraseña de Supabase Auth. No agregues usuarios ni contraseñas al código fuente ni a `user_metadata`.

1. Configura `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en el entorno de despliegue.
2. En Supabase, crea cada cuenta desde **Authentication → Users** con el correo real del colaborador y una contraseña única y robusta. Desactiva el registro público si solo el equipo debe tener cuentas.
3. Asigna el rol desde el SQL Editor de Supabase, usando una cuenta administradora. La aplicación solo confía en `app_metadata.role`:

```sql
UPDATE auth.users
SET raw_app_meta_data =
  COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
WHERE email = 'usuario@empresa.com'
RETURNING id, email;
```

Usa solo uno de estos roles: `superadmin`, `admin`, `contabilidad`, `inventario`, `vendedor` o `cliente`. Sustituye `admin` por el rol correspondiente y confirma que el `UPDATE` devuelve exactamente la cuenta esperada. Los cambios de rol requieren volver a iniciar sesión.

`app_metadata` no puede ser modificado por el usuario desde el cliente como `user_metadata`. Las restricciones de rutas del frontend son solo una ayuda de navegación: protege también las tablas y operaciones con políticas RLS de Supabase. No publiques la clave `service_role` en variables `VITE_*` ni en el navegador.

Antes de desplegar, revisa y ejecuta `sql/SUPABASE_COMPREHENSIVE_PERMISSIONS.sql` en el SQL Editor del proyecto Supabase. El script retira permisos anónimos de inserción, actualización y eliminación de abonos y de eliminación de productos/facturas/detalles. Insertar abonos queda permitido a `admin`, `superadmin`, `contabilidad` y `vendedor`; actualizar o eliminar registros sensibles queda reservado a `admin` y `superadmin`. La confirmación de cambios sensibles vuelve a validar la contraseña real de esa cuenta con Supabase Auth, no una clave compartida del frontend.

---

## 📊 Matriz de Acceso por Rol

| Funcionalidad | Superadmin | Admin | Contabilidad | Inventario | Vendedor | Cliente |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Nueva Factura | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Facturas Guardadas | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Clientes por Producto** | **✅** | ❌ | ❌ | ❌ | ❌ | ❌ |
| Auditoría Productos | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Reportes de Cobros | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Gestión de Gastos | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Gestión de Inventario | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Dashboard Ventas | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Dashboard Contabilidad | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Catálogo Completo | ✅ | ✅ | ✅ (lectura) | ✅ | ✅ (lectura) | ✅ (lectura) |
| Gestión Clientes | ✅ | ✅ | ✅ (lectura) | ❌ | ✅ (limitado) | ❌ |

---

## 🚀 Próximos Pasos

Para expandir funcionalidades exclusivas de Superadmin:

1. **Agregar más reportes analíticos** (análisis de ventas, tendencias, etc.)
2. **Panel de control de usuarios** (gestionar roles desde la interfaz)
3. **Auditoría de accesos** (quién accedió, cuándo, qué vio)
4. **Reportes de rentabilidad** por producto/cliente
5. **Análisis predictivos** de demanda
6. **Control de permisos granulares** por módulo

---

## 📝 Notas Importantes

- El rol se obtiene de `app_metadata` asignado por un administrador
- Las cuentas y contraseñas se administran en Supabase Auth; las credenciales antiguas expuestas deben rotarse y no reutilizarse
- Las políticas RLS de Supabase deben autorizar las operaciones de datos
- Los cambios de rol se aplican en el siguiente login
- Superadmin es el único que puede ver "Clientes por Producto"
- Se recomienda tener máximo 1-2 cuentas de Superadmin por empresa
- Todos los cambios de rol deben ser registrados para auditoría

---

**Última actualización:** 10 de febrero de 2026
