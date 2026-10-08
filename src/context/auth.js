import { createContext, useContext } from 'react';

export const AuthContext = createContext(null);
export const validRoles = ['superadmin', 'admin', 'contabilidad', 'inventario', 'vendedor', 'cliente'];

export const mapAuthUser = (authUser) => {
  if (!authUser) return null;

  return {
    id: authUser.id,
    username: authUser.user_metadata?.username
      || authUser.user_metadata?.full_name
      || authUser.email,
    email: authUser.email,
    role: authUser.app_metadata?.role
  };
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro del proveedor de autenticación');
  }
  return context;
};
