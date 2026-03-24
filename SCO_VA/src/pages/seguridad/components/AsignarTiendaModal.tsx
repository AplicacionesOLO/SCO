import { useState, useEffect } from 'react';
import { usuariosPendientesService, UsuarioPendiente, TiendaDisponible } from '../../../services/usuariosPendientesService';
import { useNotification } from '../../../hooks/useNotification';

interface AsignarTiendaModalProps {
  usuario: UsuarioPendiente;
  onClose: () => void;
  onSuccess: () => void;
}

export function AsignarTiendaModal({ usuario, onClose, onSuccess }: AsignarTiendaModalProps) {
  const [tiendas, setTiendas] = useState<TiendaDisponible[]>([]);
  const [selectedTienda, setSelectedTienda] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTiendas, setLoadingTiendas] = useState(true);
  const { showNotification } = useNotification();

  useEffect(() => {
    cargarTiendas();
  }, []);

  const cargarTiendas = async () => {
    try {
      setLoadingTiendas(true);
      const data = await usuariosPendientesService.obtenerTiendasDisponibles();
      setTiendas(data);
      
      // Si solo hay una tienda, seleccionarla automáticamente
      if (data.length === 1) {
        setSelectedTienda(data[0].id);
      }
    } catch (error) {
      console.error('Error cargando tiendas:', error);
      showNotification('Error al cargar tiendas disponibles', 'error');
    } finally {
      setLoadingTiendas(false);
    }
  };

  const handleAsignar = async () => {
    if (!selectedTienda) {
      showNotification('Por favor selecciona una tienda', 'error');
      return;
    }

    try {
      setLoading(true);
      await usuariosPendientesService.asignarTienda({
        usuario_id: usuario.id,
        tienda_id: selectedTienda
      });
      
      onSuccess();
    } catch (error) {
      console.error('Error asignando tienda:', error);
      showNotification('Error al asignar la tienda', 'error');
    } finally {
      setLoading(false);
    }
  };

  const tiendaSeleccionada = tiendas.find(t => t.id === selectedTienda);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Asignar Tienda a Usuario
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Información del Usuario */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Información del Usuario
            </h4>
            <div className="space-y-2">
              <div className="flex items-center">
                <i className="ri-user-line text-gray-400 mr-2"></i>
                <span className="text-sm text-gray-600">Nombre:</span>
                <span className="text-sm font-medium text-gray-900 ml-2">
                  {usuario.nombre_completo}
                </span>
              </div>
              <div className="flex items-center">
                <i className="ri-mail-line text-gray-400 mr-2"></i>
                <span className="text-sm text-gray-600">Email:</span>
                <span className="text-sm font-medium text-gray-900 ml-2">
                  {usuario.email}
                </span>
              </div>
              <div className="flex items-center">
                <i className="ri-shield-user-line text-gray-400 mr-2"></i>
                <span className="text-sm text-gray-600">Rol:</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 ml-2">
                  {usuario.rol}
                </span>
              </div>
              <div className="flex items-center">
                <i className="ri-calendar-line text-gray-400 mr-2"></i>
                <span className="text-sm text-gray-600">Registro:</span>
                <span className="text-sm font-medium text-gray-900 ml-2">
                  {new Date(usuario.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Estado Actual */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <i className="ri-time-line text-yellow-600 mt-0.5 mr-2"></i>
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Estado Actual: Pendiente de Asignación de Tienda
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Este usuario no puede acceder al sistema hasta que se le asigne una tienda.
                </p>
              </div>
            </div>
          </div>

          {/* Selección de Tienda */}
          <div>
            <label htmlFor="tienda" className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar Tienda *
            </label>
            
            {loadingTiendas ? (
              <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2"></div>
                  Cargando tiendas...
                </div>
              </div>
            ) : tiendas.length === 0 ? (
              <div className="w-full px-3 py-2 border border-red-300 rounded-md bg-red-50 text-red-600 text-sm">
                <div className="flex items-center">
                  <i className="ri-error-warning-line mr-2"></i>
                  No hay tiendas disponibles
                </div>
              </div>
            ) : (
              <select
                id="tienda"
                value={selectedTienda}
                onChange={(e) => setSelectedTienda(e.target.value)}
                className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              >
                <option value="">Selecciona una tienda</option>
                {tiendas.map((tienda) => (
                  <option key={tienda.id} value={tienda.id}>
                    {tienda.nombre} ({tienda.codigo})
                  </option>
                ))}
              </select>
            )}
            
            {tiendaSeleccionada && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-start">
                  <i className="ri-store-line text-blue-600 mt-0.5 mr-2"></i>
                  <div>
                    <p className="text-sm font-medium text-blue-800">
                      Tienda Seleccionada: {tiendaSeleccionada.nombre}
                    </p>
                    <p className="text-sm text-blue-700">
                      Código: {tiendaSeleccionada.codigo}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Información Importante */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <i className="ri-information-line text-blue-600 mt-0.5 mr-2"></i>
              <div>
                <p className="text-sm font-medium text-blue-800 mb-1">
                  ¿Qué sucederá al asignar la tienda?
                </p>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• El usuario podrá iniciar sesión normalmente</li>
                  <li>• Tendrá acceso a todas las funcionalidades del sistema</li>
                  <li>• La tienda seleccionada será su tienda por defecto</li>
                  <li>• Podrá cambiar de tienda si tiene permisos</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 whitespace-nowrap"
          >
            Cancelar
          </button>
          
          <button
            onClick={handleAsignar}
            disabled={loading || !selectedTienda || loadingTiendas || tiendas.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Asignando...
              </div>
            ) : (
              <>
                <i className="ri-check-line mr-2"></i>
                Asignar Tienda
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}