import { useState, useEffect } from 'react';
import { usuariosPendientesService, UsuarioPendiente, TiendaDisponible } from '../../../services/usuariosPendientesService';
import { PermissionButton } from '../../../components/base/PermissionButton';
import { useNotification } from '../../../hooks/useNotification';
import { AsignarTiendaModal } from './AsignarTiendaModal';
import { showConfirm } from '../../../utils/dialog';

export function UsuariosPendientesTab() {
  const [usuarios, setUsuarios] = useState<UsuarioPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAsignarModal, setShowAsignarModal] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState<UsuarioPendiente | null>(null);
  const { showNotification } = useNotification();

  useEffect(() => {
    cargarUsuariosPendientes();
  }, []);

  const cargarUsuariosPendientes = async () => {
    try {
      setLoading(true);
      const data = await usuariosPendientesService.obtenerUsuariosPendientes();
      setUsuarios(data);
    } catch (error) {
      console.error('Error cargando usuarios pendientes:', error);
      showNotification('Error al cargar usuarios pendientes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAsignarTienda = (usuario: UsuarioPendiente) => {
    setSelectedUsuario(usuario);
    setShowAsignarModal(true);
  };

  const handleRechazarRegistro = async (usuario: UsuarioPendiente) => {
    const ok = await showConfirm(`¿Estás seguro de que deseas rechazar el registro de ${usuario.nombre_completo}?`);
    if (!ok) return;

    try {
      await usuariosPendientesService.rechazarRegistro(usuario.id);
      showNotification('Registro rechazado exitosamente', 'success');
      await cargarUsuariosPendientes();
    } catch (error) {
      console.error('Error rechazando registro:', error);
      showNotification('Error al rechazar el registro', 'error');
    }
  };

  const handleAsignacionExitosa = () => {
    setShowAsignarModal(false);
    setSelectedUsuario(null);
    cargarUsuariosPendientes();
    showNotification('Tienda asignada exitosamente', 'success');
  };

  const usuariosFiltrados = usuarios.filter(usuario => 
    usuario.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    usuario.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header y Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Usuarios Pendientes</h3>
          <p className="text-sm text-gray-600">
            Usuarios que necesitan asignación de tienda para acceder al sistema
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative">
            <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
            <input
              type="text"
              placeholder="Buscar usuarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
          
          <button
            onClick={cargarUsuariosPendientes}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap"
            title="Actualizar lista"
          >
            <i className="ri-refresh-line"></i>
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <i className="ri-time-line text-yellow-600 text-xl"></i>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-yellow-800">Usuarios Pendientes</p>
              <p className="text-2xl font-bold text-yellow-900">{usuarios.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <i className="ri-user-add-line text-blue-600 text-xl"></i>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-800">Registros Hoy</p>
              <p className="text-2xl font-bold text-blue-900">
                {usuarios.filter(u => {
                  const today = new Date().toDateString();
                  const userDate = new Date(u.created_at).toDateString();
                  return today === userDate;
                }).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <i className="ri-check-line text-green-600 text-xl"></i>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">Usuarios Activos</p>
              <p className="text-2xl font-bold text-green-900">
                {usuarios.filter(u => u.activo).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de Usuarios Pendientes */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha Registro
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {usuariosFiltrados.map((usuario) => (
                <tr key={usuario.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {usuario.nombre_completo}
                      </div>
                      <div className="text-sm text-gray-500">
                        {usuario.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {usuario.rol}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-2 w-2 bg-yellow-400 rounded-full mr-2"></div>
                      <span className="text-sm text-yellow-700 font-medium">
                        Pendiente de tienda
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      <div>{new Date(usuario.created_at).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(usuario.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <PermissionButton
                        permission="seguridad:usuarios:asignar_tienda"
                        onClick={() => handleAsignarTienda(usuario)}
                        className="text-green-600 hover:text-green-900"
                        title="Asignar tienda"
                      >
                        <i className="ri-store-line"></i>
                      </PermissionButton>
                      
                      <PermissionButton
                        permission="seguridad:usuarios:rechazar_registro"
                        onClick={() => handleRechazarRegistro(usuario)}
                        className="text-red-600 hover:text-red-900"
                        title="Rechazar registro"
                      >
                        <i className="ri-close-line"></i>
                      </PermissionButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {usuariosFiltrados.length === 0 && (
          <div className="text-center py-12">
            {usuarios.length === 0 ? (
              <>
                <i className="ri-check-double-line text-green-400 text-4xl mb-4"></i>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  ¡Excelente! No hay usuarios pendientes
                </h3>
                <p className="text-gray-500">
                  Todos los usuarios registrados tienen tienda asignada.
                </p>
              </>
            ) : (
              <>
                <i className="ri-search-line text-gray-400 text-4xl mb-4"></i>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No se encontraron usuarios
                </h3>
                <p className="text-gray-500">
                  No hay usuarios que coincidan con tu búsqueda.
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Modal de Asignación de Tienda */}
      {showAsignarModal && selectedUsuario && (
        <AsignarTiendaModal
          usuario={selectedUsuario}
          onClose={() => {
            setShowAsignarModal(false);
            setSelectedUsuario(null);
          }}
          onSuccess={handleAsignacionExitosa}
        />
      )}
    </div>
  );
}