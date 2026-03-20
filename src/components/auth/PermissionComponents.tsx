// =====================================================
// COMPONENTE PermissionWrapper MEJORADO
// =====================================================

import { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';

interface PermissionWrapperProps {
  permission: string;
  ownerId?: string;
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionWrapper({ 
  permission, 
  ownerId, 
  fallback = null, 
  children 
}: PermissionWrapperProps) {
  const { hasPermission, loading } = useAuth();

  // Mostrar loading mientras se cargan permisos
  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 rounded h-8 w-24"></div>
    );
  }

  // Verificar permiso
  const allowed = hasPermission(permission, ownerId);

  if (!allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// =====================================================
// COMPONENTE PermissionButton MEJORADO
// =====================================================

import { ButtonHTMLAttributes } from 'react';

interface PermissionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  permission: string;
  ownerId?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: ReactNode;
}

export function PermissionButton({
  permission,
  ownerId,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  children,
  ...props
}: PermissionButtonProps) {
  const { hasPermission, loading: authLoading } = useAuth();

  const allowed = hasPermission(permission, ownerId);
  const isLoading = authLoading || loading;
  const isDisabled = disabled || isLoading || !allowed;

  // Si no tiene permiso, no mostrar el botón
  if (!allowed && !authLoading) {
    return null;
  }

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
    primary: 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900 disabled:bg-gray-100',
    danger: 'bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-300',
    success: 'bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-300'
  };

  const buttonClasses = `
    ${baseClasses}
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
    ${className}
  `.trim();

  return (
    <button
      className={buttonClasses}
      disabled={isDisabled}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
}

// =====================================================
// HOOK usePermissions SIMPLIFICADO
// =====================================================

import { useAuth } from './useAuth';

export function usePermissions() {
  const { hasPermission, hasRole, profile, loading } = useAuth();

  // Funciones de conveniencia para módulos específicos
  const can = {
    // Clientes
    viewClientes: (ownerId?: string) => hasPermission('clientes:view', ownerId),
    createClientes: () => hasPermission('clientes:create'),
    editClientes: (ownerId?: string) => hasPermission('clientes:edit', ownerId),
    deleteClientes: (ownerId?: string) => hasPermission('clientes:delete', ownerId),
    
    // Cotizaciones
    viewCotizaciones: (ownerId?: string) => hasPermission('cotizaciones:view', ownerId),
    createCotizaciones: () => hasPermission('cotizaciones:create'),
    editCotizaciones: (ownerId?: string) => hasPermission('cotizaciones:edit', ownerId),
    approveCotizaciones: () => hasPermission('cotizaciones:approve'),
    
    // Pedidos
    viewPedidos: (ownerId?: string) => hasPermission('pedidos:view', ownerId),
    createPedidos: () => hasPermission('pedidos:create'),
    editPedidos: (ownerId?: string) => hasPermission('pedidos:edit', ownerId),
    confirmPedidos: () => hasPermission('pedidos:confirm'),
    invoicePedidos: () => hasPermission('pedidos:invoice'),
    printPedidos: () => hasPermission('pedidos:print'),
    deletePedidos: (ownerId?: string) => hasPermission('pedidos:delete', ownerId),
    
    // Inventario
    viewInventario: () => hasPermission('inventario:view'),
    editInventario: () => hasPermission('inventario:edit'),
    adjustInventario: () => hasPermission('inventario:adjust'),
    
    // Facturas
    viewFacturas: (ownerId?: string) => hasPermission('facturas:view', ownerId),
    createFacturas: () => hasPermission('facturas:create'),
    sendFacturas: () => hasPermission('facturas:send'),
    
    // Seguridad
    manageUsers: () => hasPermission('seguridad:users:update'),
    manageRoles: () => hasPermission('seguridad:roles:update'),
    
    // Dashboard
    viewDashboard: () => hasPermission('dashboard:view'),
    viewAnalytics: () => hasPermission('dashboard:analytics')
  };

  return {
    hasPermission,
    hasRole,
    can,
    profile,
    loading,
    isAdmin: hasRole('Admin'),
    isVendedor: hasRole('Vendedor'),
    isSupervisor: hasRole('SupervisorVentas'),
    isContador: hasRole('Contador')
  };
}