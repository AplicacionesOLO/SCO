
import { ReactNode } from 'react';
import { useAuth } from '../../hooks/useAuth';

interface PermissionButtonProps {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  hideIfNoPermission?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'icon';
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
  children: ReactNode;
}

export function PermissionButton({
  permission,
  permissions,
  requireAll = false,
  hideIfNoPermission = true,
  variant = 'primary',
  className = '',
  onClick,
  disabled = false,
  type = 'button',
  title,
  children,
}: PermissionButtonProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading, isAuthenticated } = useAuth();

  // SEGURIDAD CRÍTICA: Verificar autenticación primero
  if (!isAuthenticated) {
    if (hideIfNoPermission) return null;
    return (
      <button type="button" disabled className={`inline-flex items-center justify-center transition-colors whitespace-nowrap cursor-not-allowed opacity-50 ${getVariantClasses(variant)} ${className}`}>
        {children}
      </button>
    );
  }

  const hasAccess = () => {
    if (permission) return hasPermission(permission);
    if (permissions?.length) {
      return requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);
    }
    return true;
  };

  if (loading) {
    return (
      <button type="button" disabled className={`inline-flex items-center justify-center transition-colors whitespace-nowrap cursor-not-allowed opacity-50 ${getVariantClasses(variant)} ${className}`}>
        {children}
      </button>
    );
  }

  const access = hasAccess();
  
  // SEGURIDAD CRÍTICA: Si no tiene permisos, ocultar o deshabilitar completamente
  if (!access) {
    if (hideIfNoPermission) return null;
    
    return (
      <button 
        type="button" 
        disabled 
        title="No tienes permisos para esta acción"
        className={`inline-flex items-center justify-center transition-colors whitespace-nowrap cursor-not-allowed opacity-30 ${getVariantClasses(variant)} ${className}`}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      type={type}
      onClick={access ? onClick : undefined} // SEGURIDAD: Solo ejecutar si tiene permisos
      disabled={disabled || !access}
      title={title}
      className={`inline-flex items-center justify-center transition-colors whitespace-nowrap cursor-pointer disabled:cursor-not-allowed ${getVariantClasses(variant)} ${className}`}
    >
      {children}
    </button>
  );
}

// Función auxiliar para obtener clases de variantes
function getVariantClasses(variant: string): string {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 px-4 py-2 text-sm font-medium rounded-lg',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 disabled:bg-gray-300 disabled:text-gray-500 px-4 py-2 text-sm font-medium rounded-lg',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-300 disabled:text-gray-500 px-4 py-2 text-sm font-medium rounded-lg',
    success: 'bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500 px-4 py-2 text-sm font-medium rounded-lg',
    warning: 'bg-yellow-600 text-white hover:bg-yellow-700 disabled:bg-gray-300 disabled:text-gray-500 px-4 py-2 text-sm font-medium rounded-lg',
    icon: 'p-1 rounded hover:bg-opacity-10 disabled:opacity-50',
  };

  return variants[variant as keyof typeof variants] || variants.primary;
}
