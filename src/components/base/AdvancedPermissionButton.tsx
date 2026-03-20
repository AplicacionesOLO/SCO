import React from 'react';
import { useAdvancedPermissions } from '../../hooks/useAdvancedPermissions';
import { PermissionKey } from '../../types/permissions';

interface AdvancedPermissionButtonProps {
  permission: PermissionKey;
  resourceOwnerId?: string;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  title?: string;
  type?: 'button' | 'submit' | 'reset';
  loading?: boolean;
}

export default function AdvancedPermissionButton({
  permission,
  resourceOwnerId,
  children,
  onClick,
  className = '',
  variant = 'primary',
  size = 'md',
  disabled = false,
  title,
  type = 'button',
  loading = false,
  ...props
}: AdvancedPermissionButtonProps) {
  const { checkPermission } = useAdvancedPermissions();

  // Verificar si el usuario tiene el permiso necesario
  const hasPermission = checkPermission(permission, { resourceOwnerId });

  // Si no tiene permiso, no renderizar el botón
  if (!hasPermission) {
    return null;
  }

  // Clases base del botón
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors whitespace-nowrap cursor-pointer';

  // Clases por variante
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    success: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white focus:ring-yellow-500',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 border border-gray-300 focus:ring-gray-500',
  };

  // Clases por tamaño
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  // Clases de estado
  const stateClasses = {
    disabled: 'opacity-50 cursor-not-allowed',
    loading: 'opacity-75 cursor-wait',
  };

  const buttonClasses = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    disabled && stateClasses.disabled,
    loading && stateClasses.loading,
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      className={buttonClasses}
      {...props}
    >
      {loading && (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
      )}
      {children}
    </button>
  );
}