import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import RolForm from './RolForm';
import { showAlert, showConfirm } from '../../../utils/dialog';

interface Rol {
  id: string;
  nombre: string;
  descripcion: string;
  created_at: string;
  updated_at: string;
}

// Cambiar export default por export named
export function RolesTab() {
  const [roles, setRoles] = useState<Rol[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRol, setEditingRol] = useState<Rol | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    cargarRoles();
  }, []);

  const cargarRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('nombre');

      if (error) throw error;
      setRoles(data || []);
    } catch (error) {
      console.error('Error cargando roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (rol: Rol) => {
    setEditingRol(rol);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const ok = await showConfirm('¿Estás seguro de que deseas eliminar este rol?');
    if (!ok) return;

    try {
      // Verificar si hay usuarios con este rol
      const { data: usuarios } = await supabase
        .from('usuarios')
        .select('id')
        .eq('rol', roles.find(r => r.id === id)?.nombre);

      if (usuarios && usuarios.length > 0) {
        showAlert('No se puede eliminar este rol porque hay usuarios asignados a él.', { type: 'warning' });
        return;
      }

      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await cargarRoles();
    } catch (error) {
      console.error('Error eliminando rol:', error);
      showAlert('Error al eliminar el rol', { type: 'error' });
    }
  };

  const rolesFiltrados = roles.filter(rol =>
    rol.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rol.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
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
            placeholder="Buscar roles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>

        <button
          onClick={() => {
            setEditingRol(null);
            setShowForm(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap"
        >
          <i className="ri-add-line mr-2"></i>
          Nuevo Rol
        </button>
      </div>

      {/* Grid de Roles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rolesFiltrados.map((rol) => (
          <div key={rol.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <i className="ri-shield-user-line text-blue-600"></i>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{rol.nombre}</h3>
                  <p className="text-sm text-gray-500">
                    Creado: {new Date(rol.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleEdit(rol)}
                  className="text-blue-600 hover:text-blue-900"
                  title="Editar"
                >
                  <i className="ri-edit-line"></i>
                </button>
                <button
                  onClick={() => handleDelete(rol.id)}
                  className="text-red-600 hover:text-red-900"
                  title="Eliminar"
                >
                  <i className="ri-delete-bin-line"></i>
                </button>
              </div>
            </div>

            <p className="text-gray-600 text-sm mb-4">
              {rol.descripcion || 'Sin descripción'}
            </p>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                Última actualización: {new Date(rol.updated_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {rolesFiltrados.length === 0 && (
        <div className="text-center py-12">
          <i className="ri-shield-user-line text-gray-400 text-4xl mb-4"></i>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay roles</h3>
          <p className="text-gray-500">No se encontraron roles con los filtros aplicados.</p>
        </div>
      )}

      {/* Modal de Formulario */}
      {showForm && (
        <RolForm
          rol={editingRol}
          onClose={() => {
            setShowForm(false);
            setEditingRol(null);
          }}
          onSave={() => {
            setShowForm(false);
            setEditingRol(null);
            cargarRoles();
          }}
        />
      )}
    </div>
  );
}
