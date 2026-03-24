
import { useAuth } from './useAuth';
import { PermissionKey } from '../types/permissions';

interface PermissionCheckOptions {
  resourceOwnerId?: string;
  strict?: boolean;
}

export const useAdvancedPermissions = () => {
  const { user, hasPermission } = useAuth();

  const checkPermission = (
    permission: PermissionKey, 
    options: PermissionCheckOptions = {}
  ): boolean => {
    const { resourceOwnerId, strict = false } = options;

    // Si no hay usuario autenticado, denegar acceso
    if (!user) return false;

    // Verificar permiso directo
    if (hasPermission(permission)) return true;

    // Si es un permiso "own", verificar si el usuario es el propietario
    if (permission.includes(':own') && resourceOwnerId) {
      return user.id === resourceOwnerId;
    }

    // Si no tiene el permiso específico, verificar si tiene el permiso general
    if (permission.includes(':own')) {
      const generalPermission = permission.replace(':own', '') as PermissionKey;
      if (hasPermission(generalPermission)) return true;
    }

    // En modo estricto, solo permitir permisos exactos
    if (strict) return false;

    // Verificar permisos de nivel superior
    const [module, action] = permission.split(':');
    
    // Si tiene permisos de administrador del módulo
    if (hasPermission(`${module}:admin` as PermissionKey)) return true;
    
    // Si es Admin completo
    if (user.rol === 'Admin') return true;

    return false;
  };

  const canView = (module: string, resourceOwnerId?: string) => {
    return checkPermission(`${module}:view` as PermissionKey, { resourceOwnerId }) ||
           checkPermission(`${module}:view:own` as PermissionKey, { resourceOwnerId });
  };

  const canCreate = (module: string) => {
    return checkPermission(`${module}:create` as PermissionKey);
  };

  const canEdit = (module: string, resourceOwnerId?: string) => {
    return checkPermission(`${module}:edit` as PermissionKey, { resourceOwnerId }) ||
           checkPermission(`${module}:edit:own` as PermissionKey, { resourceOwnerId });
  };

  const canDelete = (module: string, resourceOwnerId?: string) => {
    return checkPermission(`${module}:delete` as PermissionKey, { resourceOwnerId }) ||
           checkPermission(`${module}:delete:own` as PermissionKey, { resourceOwnerId });
  };

  const canPerformAction = (module: string, action: string, resourceOwnerId?: string) => {
    return checkPermission(`${module}:${action}` as PermissionKey, { resourceOwnerId });
  };

  // Funciones específicas por módulo
  const permissions = {
    // Clientes
    clientes: {
      canView: (resourceOwnerId?: string) => canView('clientes', resourceOwnerId),
      canCreate: () => canCreate('clientes'),
      canEdit: (resourceOwnerId?: string) => canEdit('clientes', resourceOwnerId),
      canDelete: (resourceOwnerId?: string) => canDelete('clientes', resourceOwnerId),
      canImport: () => checkPermission('clientes:import'),
      canExport: () => checkPermission('clientes:export'),
      canAssign: () => checkPermission('clientes:assign'),
    },

    // Cotizaciones
    cotizaciones: {
      canView: (resourceOwnerId?: string) => canView('cotizaciones', resourceOwnerId),
      canCreate: () => canCreate('cotizaciones'),
      canEdit: (resourceOwnerId?: string) => canEdit('cotizaciones', resourceOwnerId),
      canDelete: (resourceOwnerId?: string) => canDelete('cotizaciones', resourceOwnerId),
      canApprove: () => checkPermission('cotizaciones:approve'),
      canReject: () => checkPermission('cotizaciones:reject'),
      canConvert: () => checkPermission('cotizaciones:convert'),
      canDuplicate: () => checkPermission('cotizaciones:duplicate'),
      canExport: () => checkPermission('cotizaciones:export'),
      canPrint: () => checkPermission('cotizaciones:print'),
    },

    // Pedidos
    pedidos: {
      canView: (resourceOwnerId?: string) => canView('pedidos', resourceOwnerId),
      canCreate: () => canCreate('pedidos'),
      canEdit: (resourceOwnerId?: string) => canEdit('pedidos', resourceOwnerId),
      canDelete: (resourceOwnerId?: string) => canDelete('pedidos', resourceOwnerId),
      canConfirm: () => checkPermission('pedidos:confirm'),
      canCancel: () => checkPermission('pedidos:cancel'),
      canInvoice: () => checkPermission('pedidos:invoice'),
      canPrint: () => checkPermission('pedidos:print'),
    },

    // Inventario
    inventario: {
      canView: () => checkPermission('inventario:view'),
      canCreate: () => canCreate('inventario'),
      canEdit: () => canEdit('inventario'),
      canDelete: () => canDelete('inventario'),
      canAdjust: () => checkPermission('inventario:adjust'),
      canTransfer: () => checkPermission('inventario:transfer'),
      canImport: () => checkPermission('inventario:import'),
      canExport: () => checkPermission('inventario:export'),
      canManageCategories: () => checkPermission('inventario:categories'),
      canManageThresholds: () => checkPermission('inventario:thresholds'),
    },

    // Productos
    productos: {
      canView: () => checkPermission('productos:view'),
      canCreate: () => canCreate('productos'),
      canEdit: () => canEdit('productos'),
      canDelete: () => canDelete('productos'),
      canManageBOM: () => checkPermission('productos:bom'),
      canManagePricing: () => checkPermission('productos:pricing'),
      canExport: () => checkPermission('productos:export'),
    },

    // Facturación
    facturas: {
      canView: (resourceOwnerId?: string) => canView('facturas', resourceOwnerId),
      canCreate: () => canCreate('facturas'),
      canEdit: (resourceOwnerId?: string) => canEdit('facturas', resourceOwnerId),
      canDelete: (resourceOwnerId?: string) => canDelete('facturas', resourceOwnerId),
      canSend: () => checkPermission('facturas:send'),
      canCancel: () => checkPermission('facturas:cancel'),
      canPrint: () => checkPermission('facturas:print'),
      canExport: () => checkPermission('facturas:export'),
      canConfig: () => checkPermission('facturas:config'),
    },

    // Mantenimiento
    mantenimiento: {
      canView: () => checkPermission('mantenimiento:view'),
      canViewAlerts: () => checkPermission('mantenimiento:alerts'),
      canManageThresholds: () => checkPermission('mantenimiento:thresholds'),
      canManageReplenishment: () => checkPermission('mantenimiento:replenishment'),
      canViewPredictions: () => checkPermission('mantenimiento:predictions'),
      canConfig: () => checkPermission('mantenimiento:config'),
    },

    // Seguridad
    seguridad: {
      canView: () => checkPermission('seguridad:view'),
      canViewUsers: () => checkPermission('seguridad:users:view'),
      canCreateUsers: () => checkPermission('seguridad:users:create'),
      canEditUsers: () => checkPermission('seguridad:users:edit'),
      canDeleteUsers: () => checkPermission('seguridad:users:delete'),
      canActivateUsers: () => checkPermission('seguridad:users:activate'),
      canViewRoles: () => checkPermission('seguridad:roles:view'),
      canCreateRoles: () => checkPermission('seguridad:roles:create'),
      canEditRoles: () => checkPermission('seguridad:roles:edit'),
      canDeleteRoles: () => checkPermission('seguridad:roles:delete'),
      canViewPermissions: () => checkPermission('seguridad:permissions:view'),
      canCreatePermissions: () => checkPermission('seguridad:permissions:create'),
      canEditPermissions: () => checkPermission('seguridad:permissions:edit'),
      canDeletePermissions: () => checkPermission('seguridad:permissions:delete'),
      canAssignPermissions: () => checkPermission('seguridad:permissions:assign'),
    },

    // Dashboard
    dashboard: {
      canView: () => checkPermission('dashboard:view'),
      canViewStats: () => checkPermission('dashboard:stats'),
      canViewCharts: () => checkPermission('dashboard:charts'),
      canExport: () => checkPermission('dashboard:export'),
    },

    // Perfil
    perfil: {
      canView: () => checkPermission('perfil:view'),
      canEdit: () => checkPermission('perfil:edit'),
      canChangePassword: () => checkPermission('perfil:password'),
    },
  };

  return {
    checkPermission,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canPerformAction,
    permissions,
  };
};
