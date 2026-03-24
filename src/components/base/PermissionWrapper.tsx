
import { ReactNode } from 'react';
import { useAuth } from '../../hooks/useAuth';

interface PermissionWrapperProps {
  permission?: string;
  role?: string;
  module?: string;
  action?: 'read' | 'write' | 'delete';
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionWrapper({
  permission,
  role,
  module,
  action,
  children,
  fallback = null
}: PermissionWrapperProps) {
  const { hasPermission, hasRole, canRead, canWrite, canDelete, isAuthenticated, loading } = useAuth();

  // SEGURIDAD CRÍTICA: Verificar autenticación primero
  if (!isAuthenticated || loading) {
    return <>{fallback}</>;
  }

  // Verificar permisos de forma estricta
  const hasAccess = () => {
    // Verificar rol específico
    if (role && !hasRole(role)) return false;
    
    // Verificar permiso específico
    if (permission && !hasPermission(permission)) return false;
    
    // Verificar permisos por módulo y acción
    if (module && action) {
      switch (action) {
        case 'read':
          return canRead(module);
        case 'write':
          return canWrite(module);
        case 'delete':
          return canDelete(module);
        default:
          return false;
      }
    }
    
    return true;
  };

  // SEGURIDAD CRÍTICA: Solo mostrar contenido si tiene acceso
  if (!hasAccess()) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
