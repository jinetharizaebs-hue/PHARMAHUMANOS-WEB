import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import InvoiceScreen from './components/InvoiceScreen';
import FacturasGuardadas from './components/FacturasGuardadas';
import FacturaDetalle from './components/FacturaDetalle';
import ReportesCobros from './components/ReportesCobros';
import CatalogoProductos from './components/CatalogoProductos';
import CatalogoClientes from './components/CatalogoClientes';
import ClientesScreen from './components/ClientesScreen';
import GestionPedidos from './components/GestionPedidos';
import Login from './components/Login';
import NotFound from './components/NotFound';
import Navigation from './components/Navigation';
import GestionInventario from './components/GestionInventario';
import DashboardVentas from './components/DashboardVentas';
import MallMap from './components/MallMap';
import RutasCobro from './components/RutasCobro';
import GastosScreen from './components/GastosScreen';
import GastosEmpresa from './components/GastosEmpresa';
import GastosContabilidadFacil from './components/GastosContabilidadFacil';
import CuentasPorPagar from './components/CuentasPorPagar';
import ContabilidadScreen from './components/ContabilidadScreen';
import HistorialMovimientos from './components/HistorialMovimientos';
import AuditoriaProductos from './components/AuditoriaProductos';
import ReporteClientesPorProducto from './components/ReporteClientesPorProducto';

// Contexto de autenticación
const AuthContext = createContext();

// Hook personalizado para usar el contexto de autenticación
const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

// Exportar por separado
export { AuthContext, useAuth };

// Componente para proteger rutas según el rol
const ProtectedRoute = ({ children, requiredRoles = [] }) => {
  const { user, isLoading, checkSession } = useAuth();
  const location = useLocation();

  // Verificación de sesión al montar el componente
  useEffect(() => {
    if (!isLoading && user) {
      const isSessionValid = checkSession();
      if (!isSessionValid) {
        console.log('Sesión expirada o inválida');
      }
    }
  }, [location.pathname, user, isLoading, checkSession]);

  // Estado de carga
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Redirección si no está autenticado
  if (!user) {
    console.log(`Redirigiendo a login desde: ${location.pathname}`);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verificar roles si se especifican (admin siempre tiene acceso)
  if (requiredRoles.length > 0 && user.role !== 'admin' && !requiredRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Renderizar contenido protegido
  return children;
};

// Componente para manejar los metatags específicos de cada página
const PageMeta = ({ title, description }) => {
  return (
    <Helmet>
      <title>{title || 'Catálogo e-business store(EBS)'}</title>
      <meta name="description" content={description || 'Sistema de gestión y catálogo de productos e-business store(EBS)'} />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
      <meta name="theme-color" content="#4CAF50" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content="e-business store(EBS)" />
      
      {/* Open Graph tags para compartir */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title || 'Catálogo e-business store(EBS)'} />
      <meta property="og:description" content={description || 'Sistema de gestión y catálogo de productos'} />
      
      {/* Prevenir indexación en desarrollo */}
      {process.env.NODE_ENV === 'development' && (
        <meta name="robots" content="noindex, nofollow" />
      )}
    </Helmet>
  );
};

// Wrapper components para manejar navegación
const ClientesScreenWrapper = () => {
  const navigate = useNavigate();
  
  return (
    <ClientesScreen 
      onVolver={() => navigate('/facturacion')} // O la ruta que prefieras
      onSeleccionarCliente={(cliente) => {
        // Lógica para cuando se selecciona un cliente
        console.log('Cliente seleccionado:', cliente);
        // Puedes navegar a otra pantalla o mantenerte aquí
      }}
    />
  );
};

const CatalogoProductosWrapper = ({ mode }) => {
  const navigate = useNavigate();
  
  return (
    <CatalogoProductos 
      mode={mode}
      onVolver={() => navigate(-1)}
    />
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verificación de sesión al cargar la app
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  // Función de login
  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  // Función de logout
  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  // Función para verificar la sesión
  const checkSession = () => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      logout();
      return false;
    }
    return true;
  };

  const value = {
    user,
    isLoading,
    login,
    logout,
    checkSession,
    isAuthenticated: !!user
  };

  return (
    <HelmetProvider>
      <AuthContext.Provider value={value}>
        <Router>
          {/* Metatags globales */}
          <PageMeta />
          
          {/* Navigation siempre visible */}
          <Navigation />
          
          <Routes>
            {/* Ruta pública principal - Catálogo para todos */}
            <Route path="/" element={
              <>
                <PageMeta 
                  title="Catálogo Digital - e-business store(EBS)" 
                  description="Catálogo digital de productos e-business store(EBS). Ing. Edwin Marín 3004583117"
                />
                <CatalogoClientes />
              </>
            } />
            
            {/* Ruta pública del catálogo */}
            <Route path="/catalogo-clientes" element={
              <>
                <PageMeta 
                  title="Catálogo Digital - e-business store(EBS)" 
                  description="Catálogo digital de productos e-business store(EBS). Ing. Edwin Marín 3004583117"
                />
                <CatalogoClientes />
              </>
            } />
            
            {/* Login para equipo */}
            <Route path="/login" element={
              <>
                <PageMeta title="Iniciar Sesión - e-business store(EBS)" description="Inicia sesión en el sistema e-business store(EBS)" />
                {user ? <Navigate to="/facturacion" replace /> : <Login />}
              </>
            } />
            
            {/* RUTA PRINCIPAL DE FACTURACIÓN - InvoiceScreen */}
            <Route path="/facturacion" element={
              <ProtectedRoute requiredRoles={['superadmin', 'admin', 'vendedor', 'inventario']}>
                <>
                  <PageMeta title="Facturación - e-business store(EBS)" description="Sistema de facturación e-business store(EBS)" />
                  <InvoiceScreen />
                </>
              </ProtectedRoute>
            } />

            {/* Ruta para Nueva Factura - También lleva a InvoiceScreen */}
            <Route path="/nueva-factura" element={
              <ProtectedRoute requiredRoles={['superadmin', 'admin', 'vendedor', 'inventario']}>
                <>
                  <PageMeta title="Nueva Factura - e-business store(EBS)" description="Crear nueva factura" />
                  <InvoiceScreen />
                </>
              </ProtectedRoute>
            } />
            
            {/* Ruta principal después del login según rol */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <>
                  <PageMeta title="Dashboard - e-business store(EBS)" description="Panel de control del sistema e-business store(EBS)" />
                  {user?.role === 'cliente' ? 
                    <CatalogoProductosWrapper mode="cliente" /> : 
                    <DashboardVentas />
                  }
                </>
              </ProtectedRoute>
            } />
            
            {/* Rutas para administrador, contabilidad, inventario y vendedor */}
            <Route path="/facturas" element={
              <ProtectedRoute requiredRoles={['superadmin', 'admin', 'contabilidad', 'inventario', 'vendedor']}>
                <>
                  <PageMeta title="Facturas Guardadas - e-business store(EBS)" description="Gestión de facturas del sistema e-business store(EBS)" />
                  <FacturasGuardadas />
                </>
              </ProtectedRoute>
            } />
            
            {/* NUEVA RUTA: Rutas de Cobro Inteligentes */}
            <Route path="/rutas-cobro" element={
              <ProtectedRoute requiredRoles={['superadmin', 'admin', 'contabilidad', 'vendedor']}>
                <>
                  <PageMeta 
                    title="Rutas de Cobro Inteligentes - e-business store(EBS)" 
                    description="Sistema de priorización para visitas de cobranza optimizadas" 
                  />
                  <RutasCobro />
                </>
              </ProtectedRoute>
            } />
            
            {/* Nueva ruta para Dashboard de Ventas */}
            <Route path="/dashboard-ventas" element={
              <ProtectedRoute requiredRoles={['superadmin', 'admin', 'contabilidad']}>
                <>
                  <PageMeta title="Dashboard de Ventas - e-business store(EBS)" description="Panel de control y análisis de ventas" />
                  <DashboardVentas />
                </>
              </ProtectedRoute>
            } />
            
            {/* Ruta para el Mapa de Locales */}
            <Route path="/mapa-locales" element={
              <ProtectedRoute requiredRoles={['superadmin', 'admin']}>
                <>
                  <PageMeta title="Mapa de Locales - e-business store(EBS)" description="Mapa interactivo de locales y ubicaciones" />
                  <MallMap />
                </>
              </ProtectedRoute>
            } />
            
            <Route path="/factura/:id" element={
              <ProtectedRoute requiredRoles={['superadmin', 'admin', 'inventario', 'contabilidad', 'vendedor']}>
                <>
                  <PageMeta title="Detalle de Factura - e-business store(EBS)" description="Detalle completo de la factura" />
                  <FacturaDetalle />
                </>
              </ProtectedRoute>
            } />
            
            <Route path="/reportes-cobros" element={
              <ProtectedRoute requiredRoles={['superadmin', 'admin', 'contabilidad', 'vendedor']}>
                <>
                  <PageMeta title="Reportes de Cobros - e-business store(EBS)" description="Reportes y análisis de cobros" />
                  <ReportesCobros />
                </>
              </ProtectedRoute>
            } />

            {/* Ruta para Reporte de Clientes por Producto */}
            <Route path="/reporte-clientes-producto" element={
              <ProtectedRoute requiredRoles={['superadmin']}>
                <>
                  <PageMeta title="Clientes por Producto - e-business store(EBS)" description="Reporte de clientes que compraron cada producto" />
                  <ReporteClientesPorProducto />
                </>
              </ProtectedRoute>
            } />

            {/* Ruta para Gestión de Gastos */}
            <Route path="/gastos" element={
              <ProtectedRoute requiredRoles={['superadmin', 'admin', 'contabilidad', 'vendedor']}>
                <>
                  <PageMeta title="Gestión de Gastos - e-business store(EBS)" description="Control y análisis de gastos" />
                  <GastosScreen />
                </>
              </ProtectedRoute>
            } />

            {/* Ruta para Cuentas por Pagar */}
            <Route path="/cuentas-por-pagar" element={
              <ProtectedRoute requiredRoles={['superadmin', 'admin', 'contabilidad']}>
                <>
                  <PageMeta title="Cuentas por Pagar - e-business store(EBS)" description="Gestión de pagos a proveedores" />
                  <CuentasPorPagar />
                </>
              </ProtectedRoute>
            } />

            {/* Ruta para Gastos de la Empresa */}
            <Route path="/gastos-empresa" element={
              <ProtectedRoute requiredRoles={['superadmin', 'admin', 'contabilidad']}>
                <>
                  <PageMeta title="Gastos de la Empresa - e-business store(EBS)" description="Control de gastos operacionales" />
                  <GastosEmpresa />
                </>
              </ProtectedRoute>
            } />

            {/* Ruta simple para registrar gastos contables */}
            <Route path="/contabilidad-gastos" element={
              <ProtectedRoute requiredRoles={['superadmin', 'admin', 'contabilidad']}>
                <>
                  <PageMeta title="Gastos Facil - e-business store(EBS)" description="Registro rapido de gastos para contabilidad" />
                  <GastosContabilidadFacil />
                </>
              </ProtectedRoute>
            } />

            {/* Ruta para Dashboard de Contabilidad */}
            <Route path="/dashboard-contabilidad" element={
              <ProtectedRoute requiredRoles={['superadmin', 'admin', 'contabilidad', 'vendedor']}>
                <>
                  <PageMeta title="Dashboard de Contabilidad - e-business store(EBS)" description="Panel de control contable" />
                  <ContabilidadScreen />
                </>
              </ProtectedRoute>
            } />
            
            <Route path="/catalogo" element={
              <ProtectedRoute requiredRoles={['superadmin', 'admin', 'inventario', 'contabilidad', 'vendedor']}>
                <>
                  <PageMeta title="Catálogo de Productos - e-business store(EBS)" description="Gestión del catálogo de productos" />
                  {/* Modo de catálogo según rol: contabilidad en solo lectura */}
                  {user?.role === 'contabilidad' 
                    ? <CatalogoProductosWrapper mode="contabilidad" /> 
                    : <CatalogoProductosWrapper mode="admin" />}
                </>
              </ProtectedRoute>
            } />
            
            {/* Rutas para gestión de inventario */}
            <Route path="/movimientos" element={
              <ProtectedRoute requiredRoles={['superadmin', 'admin', 'inventario']}>
                <>
                  <PageMeta title="Historial de Movimientos - e-business store(EBS)" description="Auditoría de cambios de inventario" />
                  <HistorialMovimientos />
                </>
              </ProtectedRoute>
            } />

            <Route path="/auditoria-productos" element={
              <ProtectedRoute requiredRoles={['superadmin', 'admin', 'inventario']}>
                <>
                  <PageMeta title="Auditoría de Productos - e-business store(EBS)" description="Seguimiento de cambios en catálogo" />
                  <AuditoriaProductos />
                </>
              </ProtectedRoute>
            } />

            <Route path="/gestion-inventario" element={
              <ProtectedRoute requiredRoles={['superadmin', 'admin', 'inventario']}>
                <>
                  <PageMeta title="Gestión de Inventario - e-business store(EBS)" description="Control y gestión del inventario" />
                  <GestionInventario />
                </>
              </ProtectedRoute>
            } />
            
            {/* Rutas para gestión de pedidos */}
            <Route path="/gestion-pedidos" element={
              <ProtectedRoute requiredRoles={['superadmin', 'admin', 'vendedor', 'inventario', 'contabilidad']}>
                <>
                  <PageMeta title="Gestión de Pedidos - e-business store(EBS)" description="Seguimiento y gestión de pedidos" />
                  <GestionPedidos mode="vendedor" />
                </>
              </ProtectedRoute>
            } />
            
                        {/* Rutas para vendedor - CLIENTES CORREGIDO */}
            <Route path="/clientes" element={
              <ProtectedRoute requiredRoles={['superadmin', 'admin', 'vendedor', 'inventario', 'contabilidad']}>
                <>
                  <PageMeta title="Gestión de Clientes - e-business store(EBS)" description="Administración de clientes del sistema" />
                  <ClientesScreenWrapper />
                </>
              </ProtectedRoute>
            } />
            
            {/* Ruta para cliente */}
            <Route path="/catalogo-cliente" element={
              <ProtectedRoute requiredRoles={['cliente']}>
                <>
                  <PageMeta title="Catálogo - e-business store(EBS)" description="Catálogo exclusivo para clientes" />
                  <CatalogoProductosWrapper mode="cliente" />
                </>
              </ProtectedRoute>
            } />
            
            {/* Rutas adicionales */}
            <Route path="/unauthorized" element={
              <>
                <PageMeta title="Acceso No Autorizado - e-business store(EBS)" description="No tienes permisos para acceder a esta página" />
                <div className="flex justify-center items-center h-screen">
                  <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-600">Acceso no autorizado</h1>
                    <p className="text-gray-600">No tienes permisos para acceder a esta página</p>
                  </div>
                </div>
              </>
            } />
            
            <Route path="*" element={
              <>
                <PageMeta title="Página No Encontrada - e-business store(EBS)" description="La página que buscas no existe" />
                <NotFound />
              </>
            } />
          </Routes>
        </Router>
      </AuthContext.Provider>
    </HelmetProvider>
  );
}

export default App;