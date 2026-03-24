/**
 * Matriz visual para gestión de permisos por roles
 * Interfaz administrativa para asignar permisos granulares
 */

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useNotification } from '../../hooks/useNotification';
import NotificationPopup from '../base/NotificationPopup';

interface Permission {
  id: number;
  nombre: string;
  descripcion: string;
}

interface Role {
  id: number;
  nombre: string;
  descripcion: string;
}

interface RolePermission {
  rol_id: number;
  permiso_id: number;
}

interface PermissionGroup {
  module: string;
  permissions: Permission[];
}

interface PermissionMatrixProps {
  onSave?: () => void;
  className?: string;
}

export function PermissionMatrix({ onSave, className = '' }: PermissionMatrixProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [error, setError] = useState<string>('');
  const { notification, showNotification, hideNotification } = useNotification();

  // Cargar datos iniciales
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('*')
        .order('nombre');

      if (rolesError) throw rolesError;

      const { data: permissionsData, error: permissionsError } = await supabase
        .from('permisos')
        .select('*')
        .order('nombre');

      if (permissionsError) throw permissionsError;

      const { data: rolePermissionsData, error: rolePermissionsError } = await supabase
        .from('rol_permisos')
        .select('rol_id, permiso_id');

      if (rolePermissionsError) throw rolePermissionsError;

      setRoles(rolesData || []);
      setPermissions(permissionsData || []);
      setRolePermissions(rolePermissionsData || []);
    } catch (error) {
      setError('Error al cargar los datos de permisos');
    } finally {
      setLoading(false);
    }
  };

  // Agrupar permisos por módulo
  const permissionGroups = useMemo((): PermissionGroup[] => {
    const groups = new Map<string, Permission[]>();

    permissions.forEach(permission => {
      const module = permission.nombre.split(':')[0];
      if (!groups.has(module)) {
        groups.set(module, []);
      }
      groups.get(module)!.push(permission);
    });

    return Array.from(groups.entries()).map(([module, perms]) => ({
      module,
      permissions: perms.sort((a, b) => a.nombre.localeCompare(b.nombre))
    }));
  }, [permissions]);

  // Filtrar permisos según búsqueda y módulo seleccionado
  const filteredGroups = useMemo(() => {
    let filtered = permissionGroups;

    // Filtrar por módulo
    if (selectedModule !== 'all') {
      filtered = filtered.filter(group => group.module === selectedModule);
    }

    // Filtrar por término de búsqueda
    if (searchTerm) {
      filtered = filtered.map(group => ({
        ...group,
        permissions: group.permissions.filter(
          perm => 
            perm.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            perm.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })).filter(group => group.permissions.length > 0);
    }

    return filtered;
  }, [permissionGroups, selectedModule, searchTerm]);

  // Verificar si un rol tiene un permiso
  const hasPermission = (roleId: number, permissionId: number): boolean => {
    return rolePermissions.some(rp => rp.rol_id === roleId && rp.permiso_id === permissionId);
  };

  // Toggle permiso para un rol
  const togglePermission = (roleId: number, permissionId: number) => {
    const exists = hasPermission(roleId, permissionId);
    
    if (exists) {
      // Remover permiso
      setRolePermissions(prev => 
        prev.filter(rp => !(rp.rol_id === roleId && rp.permiso_id === permissionId))
      );
    } else {
      // Agregar permiso
      setRolePermissions(prev => [
        ...prev,
        { rol_id: roleId, permiso_id: permissionId }
      ]);
    }
  };

  // Seleccionar/deseleccionar todos los permisos de un módulo para un rol
  const toggleModulePermissions = (roleId: number, module: string) => {
    const modulePermissions = permissionGroups.find(g => g.module === module)?.permissions || [];
    const allSelected = modulePermissions.every(perm => hasPermission(roleId, perm.id));

    if (allSelected) {
      // Deseleccionar todos
      setRolePermissions(prev => 
        prev.filter(rp => 
          rp.rol_id !== roleId || 
          !modulePermissions.some(perm => perm.id === rp.permiso_id)
        )
      );
    } else {
      // Seleccionar todos
      const newPermissions = modulePermissions
        .filter(perm => !hasPermission(roleId, perm.id))
        .map(perm => ({ rol_id: roleId, permiso_id: perm.id }));
      
      setRolePermissions(prev => [...prev, ...newPermissions]);
    }
  };

  // Aplicar plantilla de rol
  const applyRoleTemplate = (roleId: number, template: string) => {
    // Primero limpiar permisos existentes del rol
    setRolePermissions(prev => prev.filter(rp => rp.rol_id !== roleId));

    let templatePermissions: string[] = [];

    switch (template) {
      case 'admin':
        templatePermissions = permissions.map(p => p.nombre);
        break;
      case 'vendedor':
        templatePermissions = [
          'dashboard:view',
          'clientes:view:own', 'clientes:create', 'clientes:edit:own',
          'cotizaciones:view:own', 'cotizaciones:create', 'cotizaciones:edit:own', 'cotizaciones:print',
          'pedidos:view:own', 'pedidos:create', 'pedidos:edit:own', 'pedidos:print',
          'productos:view', 'inventario:view',
          'seguimiento:view:own'
        ];
        break;
      case 'supervisor':
        templatePermissions = [
          'dashboard:view', 'dashboard:analytics',
          'clientes:view', 'clientes:create', 'clientes:edit', 'clientes:export',
          'cotizaciones:view', 'cotizaciones:create', 'cotizaciones:edit', 'cotizaciones:approve', 'cotizaciones:reject', 'cotizaciones:convert', 'cotizaciones:print', 'cotizaciones:export',
          'pedidos:view', 'pedidos:create', 'pedidos:edit', 'pedidos:confirm', 'pedidos:print',
          'productos:view', 'inventario:view',
          'seguimiento:view', 'seguimiento:edit',
          'tareas:view', 'tareas:create', 'tareas:edit', 'tareas:assign'
        ];
        break;
      case 'contador':
        templatePermissions = [
          'dashboard:view', 'dashboard:analytics', 'dashboard:reports',
          'clientes:view', 'clientes:export',
          'cotizaciones:view', 'cotizaciones:export',
          'pedidos:view', 'pedidos:invoice', 'pedidos:print',
          'facturas:view', 'facturas:create', 'facturas:edit', 'facturas:send', 'facturas:cancel', 'facturas:print', 'facturas:export', 'facturas:config',
          'seguimiento:view'
        ];
        break;
      case 'inventario':
        templatePermissions = [
          'dashboard:view',
          'productos:view', 'productos:create', 'productos:edit', 'productos:bom', 'productos:export',
          'inventario:view', 'inventario:create', 'inventario:edit', 'inventario:adjust', 'inventario:transfer', 'inventario:import', 'inventario:export', 'inventario:categories', 'inventario:thresholds',
          'mantenimiento:view', 'mantenimiento:alerts', 'mantenimiento:thresholds', 'mantenimiento:replenishment', 'mantenimiento:predictions',
          'optimizador:view', 'optimizador:create', 'optimizador:optimize', 'optimizador:export'
        ];
        break;
      case 'produccion':
        templatePermissions = [
          'dashboard:view',
          'pedidos:view', 'pedidos:print',
          'productos:view', 'productos:bom',
          'inventario:view', 'inventario:adjust',
          'seguimiento:view', 'seguimiento:edit',
          'tareas:view', 'tareas:edit', 'tareas:complete',
          'optimizador:view', 'optimizador:create', 'optimizador:optimize', 'optimizador:export'
        ];
        break;
      case 'lectura':
        templatePermissions = [
          'dashboard:view',
          'clientes:view', 'clientes:export',
          'cotizaciones:view', 'cotizaciones:print', 'cotizaciones:export',
          'pedidos:view', 'pedidos:print',
          'productos:view', 'inventario:view',
          'facturas:view', 'facturas:print', 'facturas:export',
          'seguimiento:view',
          'tareas:view',
          'mantenimiento:view'
        ];
        break;
    }

    // Agregar permisos de la plantilla
    const newPermissions = permissions
      .filter(perm => templatePermissions.includes(perm.nombre))
      .map(perm => ({ rol_id: roleId, permiso_id: perm.id }));

    setRolePermissions(prev => [...prev, ...newPermissions]);
  };

  // Guardar cambios
  const saveChanges = async () => {
    try {
      setSaving(true);
      setError('');

      const { error: deleteError } = await supabase
        .from('rol_permisos')
        .delete()
        .neq('id', 0);

      if (deleteError) throw deleteError;

      if (rolePermissions.length > 0) {
        const { error: insertError } = await supabase
          .from('rol_permisos')
          .insert(rolePermissions);

        if (insertError) throw insertError;
      }

      showNotification('Permisos guardados correctamente', 'success');
      onSave?.();
    } catch (error) {
      setError('Error al guardar los cambios');
      showNotification('Error al guardar los permisos', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <NotificationPopup
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={hideNotification}
      />
      
      <div className={`bg-white rounded-lg shadow ${className}`}>
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Matriz de Permisos</h2>
              <p className="text-sm text-gray-600">Gestiona los permisos por rol de forma visual</p>
            </div>
            <button
              onClick={saveChanges}
              disabled={saving}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center whitespace-nowrap"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <i className="ri-save-line mr-2"></i>
                  Guardar Cambios
                </>
              )}
            </button>
          </div>

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Buscar permisos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <div className="sm:w-48">
              <select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="all">Todos los módulos</option>
                {permissionGroups.map(group => (
                  <option key={group.module} value={group.module}>
                    {group.module.charAt(0).toUpperCase() + group.module.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center">
                <i className="ri-error-warning-line text-red-500 mr-2"></i>
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            </div>
          )}
        </div>

        {/* Plantillas rápidas */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Plantillas Rápidas</h3>
          <div className="space-y-3">
            {roles.map(role => (
              <div key={role.id} className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-sm font-medium text-gray-700 min-w-[120px]">{role.nombre}:</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => applyRoleTemplate(role.id, 'admin')}
                    className="px-3 py-1.5 text-xs bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 whitespace-nowrap"
                    title="Acceso total al sistema"
                  >
                    <i className="ri-admin-line mr-1"></i>
                    Admin
                  </button>
                  <button
                    onClick={() => applyRoleTemplate(role.id, 'vendedor')}
                    className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 whitespace-nowrap"
                    title="Ventas y cotizaciones propias"
                  >
                    <i className="ri-user-line mr-1"></i>
                    Vendedor
                  </button>
                  <button
                    onClick={() => applyRoleTemplate(role.id, 'supervisor')}
                    className="px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 whitespace-nowrap"
                    title="Supervisión de ventas y operaciones"
                  >
                    <i className="ri-shield-user-line mr-1"></i>
                    Supervisor
                  </button>
                  <button
                    onClick={() => applyRoleTemplate(role.id, 'contador')}
                    className="px-3 py-1.5 text-xs bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 whitespace-nowrap"
                    title="Facturación y reportes financieros"
                  >
                    <i className="ri-calculator-line mr-1"></i>
                    Contador
                  </button>
                  <button
                    onClick={() => applyRoleTemplate(role.id, 'inventario')}
                    className="px-3 py-1.5 text-xs bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 whitespace-nowrap"
                    title="Gestión de inventario y productos"
                  >
                    <i className="ri-archive-line mr-1"></i>
                    Inventario
                  </button>
                  <button
                    onClick={() => applyRoleTemplate(role.id, 'produccion')}
                    className="px-3 py-1.5 text-xs bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 whitespace-nowrap"
                    title="Producción, tareas y optimizador"
                  >
                    <i className="ri-tools-line mr-1"></i>
                    Producción
                  </button>
                  <button
                    onClick={() => applyRoleTemplate(role.id, 'lectura')}
                    className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 whitespace-nowrap"
                    title="Solo visualización de datos"
                  >
                    <i className="ri-eye-line mr-1"></i>
                    Solo Lectura
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Matriz de permisos */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                  Permiso
                </th>
                {roles.map(role => (
                  <th key={role.id} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                    {role.nombre}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredGroups.map(group => (
                <React.Fragment key={group.module}>
                  {/* Header del módulo */}
                  <tr className="bg-blue-50">
                    <td className="px-6 py-3 text-sm font-medium text-blue-900 sticky left-0 bg-blue-50 z-10">
                      <div className="flex items-center">
                        <i className="ri-folder-line mr-2"></i>
                        {group.module.charAt(0).toUpperCase() + group.module.slice(1)}
                      </div>
                    </td>
                    {roles.map(role => (
                      <td key={role.id} className="px-3 py-3 text-center">
                        <button
                          onClick={() => toggleModulePermissions(role.id, group.module)}
                          className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 whitespace-nowrap"
                        >
                          Todo
                        </button>
                      </td>
                    ))}
                  </tr>
                  
                  {/* Permisos del módulo */}
                  {group.permissions.map(permission => (
                    <tr key={permission.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 sticky left-0 bg-white z-10">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {permission.nombre}
                          </div>
                          <div className="text-xs text-gray-500">
                            {permission.descripcion}
                          </div>
                        </div>
                      </td>
                      {roles.map(role => (
                        <td key={role.id} className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={hasPermission(role.id, permission.id)}
                            onChange={() => togglePermission(role.id, permission.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {filteredGroups.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            <i className="ri-search-line text-2xl mb-2"></i>
            <p>No se encontraron permisos que coincidan con los filtros</p>
          </div>
        )}
      </div>
    </>
  );
}