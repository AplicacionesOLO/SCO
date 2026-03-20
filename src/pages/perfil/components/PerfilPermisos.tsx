import React from 'react';
import { useAuth } from '../../../hooks/useAuth';

const PerfilPermisos: React.FC = () => {
  const { profile, permissions } = useAuth();

  // Agrupar permisos por módulo
  const permisosPorModulo = permissions.reduce((acc, permiso) => {
    const [modulo, ...resto] = permiso.split(':');
    if (!acc[modulo]) {
      acc[modulo] = [];
    }
    acc[modulo].push(resto.join(':'));
    return acc;
  }, {} as Record<string, string[]>);

  const modulosOrdenados = Object.keys(permisosPorModulo).sort();

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-4">Permisos y Roles</h2>

      {/* Rol Asignado */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Rol Asignado</h3>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <span className="text-blue-800 font-medium">{profile?.rol || 'Sin rol'}</span>
        </div>
      </div>

      {/* Permisos */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          Permisos ({permissions.length} permisos en {modulosOrdenados.length} módulos)
        </h3>

        {permissions.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
            <i className="ri-alert-line text-yellow-600 text-2xl mb-2"></i>
            <p className="text-yellow-800">No tienes permisos asignados</p>
            <p className="text-yellow-600 text-sm mt-1">Contacta al administrador</p>
          </div>
        ) : (
          <div className="space-y-4">
            {modulosOrdenados.map((modulo) => (
              <div key={modulo} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2 capitalize">
                  {modulo}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {permisosPorModulo[modulo].map((permiso, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                    >
                      <i className="ri-check-line mr-1"></i>
                      {permiso}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Información adicional */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          <i className="ri-information-line mr-1"></i>
          Los permisos determinan qué acciones puedes realizar en cada módulo del sistema.
        </p>
      </div>
    </div>
  );
};

export default PerfilPermisos;
