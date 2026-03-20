
import React from 'react';
import { useRobustPermissions } from '../../hooks/useRobustPermissions';

interface PermissionWrapperProps {
  permission: string;
  ownerId?: string;
  resourceId?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  strict?: boolean;
}

export function RobustPermissionWrapper({
  permission,
  ownerId,
  resourceId,
  children,
  fallback = null,
  strict = false
}: PermissionWrapperProps) {
  const { hasPermission, userPermissions } = useRobustPermissions();

  // Verificar si está cargando
  const isLoading = userPermissions?.loading || false;
  
  if (isLoading) {
    return <div className="animate-pulse bg-gray-200 h-8 w-24 rounded"></div>;
  }

  const allowed = hasPermission({ permission, ownerId, resourceId, strict });

  if (!allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface PermissionButtonWrapperProps {
  permission: string;
  ownerId?: string;
  resourceId?: string;
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function PermissionButtonWrapper({
  permission,
  ownerId,
  resourceId,
  children,
  disabled = false,
  onClick,
  className = '',
  variant = 'primary',
  size = 'md',
  loading = false
}: PermissionButtonWrapperProps) {
  const { hasPermission, userPermissions } = useRobustPermissions();

  const allowed = hasPermission({ permission, ownerId, resourceId });
  const isLoading = userPermissions?.loading || false;
  const isDisabled = disabled || loading || isLoading || !allowed;

  // Clases base del botón
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors whitespace-nowrap';
  
  // Clases por tamaño
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  // Clases por variante
  const variantClasses = {
    primary: isDisabled 
      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
      : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500',
    secondary: isDisabled 
      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
      : 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-2 focus:ring-gray-500',
    danger: isDisabled 
      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
      : 'bg-red-600 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500',
    ghost: isDisabled 
      ? 'text-gray-400 cursor-not-allowed' 
      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:ring-2 focus:ring-gray-500',
    outline: isDisabled 
      ? 'border border-gray-300 text-gray-400 cursor-not-allowed' 
      : 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-gray-500'
  };

  // Si no tiene permisos, no mostrar el botón
  if (!allowed) {
    return null;
  }

  const buttonClasses = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;

  return (
    <button
      type="button"
      className={buttonClasses}
      disabled={isDisabled}
      onClick={isDisabled ? undefined : onClick}
    >
      {(loading || isLoading) && (
        <i className="ri-loader-4-line animate-spin mr-2"></i>
      )}
      {children}
    </button>
  );
}
