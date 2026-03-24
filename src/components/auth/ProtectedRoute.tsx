import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
  permission?: string;
  role?: string;
  requireAuth?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  permission, 
  role, 
  requireAuth = false 
}: ProtectedRouteProps) {
  const { user, profile, loading, isAuthenticated, hasPermission, hasRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (requireAuth && isAuthenticated) {
    return <>{children}</>;
  }

  if (!requireAuth && !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (role && !hasRole(role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <i className="ri-shield-cross-line text-6xl text-red-300 mb-4"></i>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Acceso Denegado</h2>
          <p className="text-gray-500">No tienes el rol necesario para acceder a esta página</p>
        </div>
      </div>
    );
  }

  if (permission && !hasPermission(permission)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <i className="ri-lock-line text-6xl text-red-300 mb-4"></i>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Sin Permisos</h2>
          <p className="text-gray-500">No tienes permisos para acceder a esta página</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
