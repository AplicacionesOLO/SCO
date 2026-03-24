import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import PermisoForm from './PermisoForm';
import NotificationPopup from '../../../components/base/NotificationPopup';
import { useNotification } from '../../../hooks/useNotification';
import { showConfirm } from '../../../utils/dialog';

interface Permiso {
  id: string;
  nombre: string;
  descripcion: string;
  created_at: string;
  updated_at: string;
}

// Cambiar export default por export named
export function PermisosTab() {
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPermiso, setEditingPermiso] = useState<Permiso | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { notification, showSuccess, showError, hideNotification } = useNotification();

  useEffect(() => {
    cargarPermisos();
  }, []);

  const cargarPermisos = async () => {
    try {
      const { data, error } = await supabase
        .from('permisos')
        .select('*')
        .order('nombre');

      if (error) throw error;
      setPermisos(data || []);
    } catch (error) {
      console.error('Error cargando permisos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (permiso: Permiso) => {
    setEditingPermiso(permiso);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const ok = await showConfirm('¿Estás seguro de que deseas eliminar este permiso?');
    if (!ok) return;

    try {
      // Verificar si hay roles con este permiso
      const { data: rolPermisos } = await supabase
        .from('rol_permisos')
        .select('id')
        .eq('permiso_id', id);

      if (rolPermisos && rolPermisos.length > 0) {
        showError('Error', 'No se puede eliminar este permiso porque está asignado a uno o más roles.');
        return;
      }

      const { error } = await supabase
        .from('permisos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      showSuccess('Éxito', 'Permiso eliminado correctamente');
      await cargarPermisos();
    } catch (error) {
      console.error('Error eliminando permiso:', error);
      showError('Error', 'Error al eliminar el permiso');
    }
  };

  const permisosFiltrados = permisos.filter(permiso =>
    permiso.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    permiso.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
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
      {/* Filtros y Acciones */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
          <input
            type="text"
            placeholder="Buscar permisos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>

        <button
          onClick={() => {
            setEditingPermiso(null);
            setShowForm(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap"
        >
          <i className="ri-add-line mr-2"></i>
          Nuevo Permiso
        </button>
      </div>

      {/* Tabla de Permisos */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permiso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha Creación
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {permisosFiltrados.map((permiso) => (
                <tr key={permiso.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                        <i className="ri-key-line text-green-600"></i>
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {permiso.nombre}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {permiso.descripcion || 'Sin descripción'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(permiso.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleEdit(permiso)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Editar"
                      >
                        <i className="ri-edit-line"></i>
                      </button>
                      <button
                        onClick={() => handleDelete(permiso.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Eliminar"
                      >
                        <i className="ri-delete-bin-line"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {permisosFiltrados.length === 0 && (
          <div className="text-center py-12">
            <i className="ri-key-line text-gray-400 text-4xl mb-4"></i>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay permisos</h3>
            <p className="text-gray-500">No se encontraron permisos con los filtros aplicados.</p>
          </div>
        )}
      </div>

      {/* Modal de Formulario */}
      {showForm && (
        <PermisoForm
          permiso={editingPermiso}
          onClose={() => {
            setShowForm(false);
            setEditingPermiso(null);
          }}
          onSave={() => {
            setShowForm(false);
            setEditingPermiso(null);
            cargarPermisos();
          }}
        />
      )}

      {/* Notification Popup */}
      <NotificationPopup
        isOpen={notification.isOpen}
        type={notification.type}
        message={notification.message}
        onClose={hideNotification}
      />
    </div>
  );
}
