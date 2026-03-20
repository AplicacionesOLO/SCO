import { useAuth } from './useAuth';

export const useRobustPermissions = () => {
  const { permissions, profile } = useAuth();

  const hasPermission = (permission: string): boolean => {
    if (!permission) return true;
    if (permissions.includes(permission)) return true;
    const ownVariant = `${permission}:own`;
    if (permissions.includes(ownVariant)) return true;
    return false;
  };

  const canRead = (module: string): boolean => {
    const viewPermission = `${module}:view`;
    const viewOwnPermission = `${module}:view:own`;
    return permissions.includes(viewPermission) || permissions.includes(viewOwnPermission);
  };

  const canWrite = (module: string): boolean => {
    const createPermission = `${module}:create`;
    const createOwnPermission = `${module}:create:own`;
    const editPermission = `${module}:edit`;
    const editOwnPermission = `${module}:edit:own`;
    return permissions.includes(createPermission) || 
           permissions.includes(createOwnPermission) ||
           permissions.includes(editPermission) ||
           permissions.includes(editOwnPermission);
  };

  const canDelete = (module: string): boolean => {
    const deletePermission = `${module}:delete`;
    const deleteOwnPermission = `${module}:delete:own`;
    return permissions.includes(deletePermission) || permissions.includes(deleteOwnPermission);
  };

  const isAdmin = profile?.rol === 'Admin';

  return {
    permissions,
    hasPermission,
    canRead,
    canWrite,
    canDelete,
    isAdmin,
  };
};
