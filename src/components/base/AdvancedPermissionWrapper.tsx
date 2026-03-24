import React from 'react';
import { useAdvancedPermissions } from '../../hooks/useAdvancedPermissions';
import { PermissionKey } from '../../types/permissions';

interface AdvancedPermissionWrapperProps {
  permission: PermissionKey;
  resourceOwnerId?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  strict?: boolean;
}

export default function AdvancedPermissionWrapper({
  permission,
  resourceOwnerId,
  children,
  fallback = null,
  strict = false,
}: AdvancedPermissionWrapperProps) {
  const { checkPermission } = useAdvancedPermissions();

  // Verificar si el usuario tiene el permiso necesario
  const hasPermission = checkPermission(permission, { resourceOwnerId, strict });

  // Si no tiene permiso, mostrar fallback o nada
  if (!hasPermission) {
    return <>{fallback}</>;
  }

  // Si tiene permiso, renderizar el contenido
  return <>{children}</>;
}