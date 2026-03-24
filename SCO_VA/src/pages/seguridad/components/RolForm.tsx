
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface Rol {
  id: string;
  nombre: string;
  descripcion: string;
  created_at: string;
  updated_at: string;
}

interface Permiso {
  id: string;
  nombre: string;
  descripcion: string;
}

interface RolFormProps {
  rol: Rol | null;
  onClose: () => void;
  onSave: () => void;
}

export default function RolForm({ rol, onClose, onSave }: RolFormProps) {
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
  });
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [permisosSeleccionados, setPermisosSeleccionados] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    cargarPermisos();
    if (rol) {
      setFormData({
        nombre: rol.nombre,
        descripcion: rol.descripcion,
      });
      cargarPermisosRol(rol.id);
    }
  }, [rol]);

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
    }
  };

  const cargarPermisosRol = async (rolId: string) => {
    try {
      const { data, error } = await supabase
        .from('rol_permisos')
        .select('permiso_id')
        .eq('rol_id', rolId);

      if (error) throw error;
      
      const permisosIds = data?.map(rp => rp.permiso_id) || [];
      setPermisosSeleccionados(permisosIds);
    } catch (error) {
      console.error('Error cargando permisos del rol:', error);
    }
  };

  const handlePermisoChange = (permisoId: string, checked: boolean) => {
    if (checked) {
      setPermisosSeleccionados([...permisosSeleccionados, permisoId]);
    } else {
      setPermisosSeleccionados(permisosSeleccionados.filter(id => id !== permisoId));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let rolId: string;

      if (rol) {
        // Actualizar rol existente
        const { error } = await supabase
          .from('roles')
          .update({
            nombre: formData.nombre,
            descripcion: formData.descripcion,
          })
          .eq('id', rol.id);

        if (error) throw error;
        rolId = rol.id;
      } else {
        // Crear nuevo rol
        const { data, error } = await supabase
          .from('roles')
          .insert([{
            nombre: formData.nombre,
            descripcion: formData.descripcion,
          }])
          .select()
          .single();

        if (error) throw error;
        rolId = data.id;
      }

      // Actualizar permisos del rol
      if (rol) {
        // Eliminar permisos existentes
        await supabase
          .from('rol_permisos')
          .delete()
          .eq('rol_id', rolId);
      }

      // Insertar nuevos permisos
      if (permisosSeleccionados.length > 0) {
        const rolPermisos = permisosSeleccionados.map(permisoId => ({
          rol_id: rolId,
          permiso_id: permisoId,
        }));

        const { error: permisosError } = await supabase
          .from('rol_permisos')
          .insert(rolPermisos);

        if (permisosError) throw permisosError;
      }

      onSave();
    } catch (error: any) {
      console.error('Error guardando rol:', error);
      setError(error.message || 'Error al guardar el rol');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {rol ? 'Editar Rol' : 'Nuevo Rol'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del Rol
              </label>
              <input
                type="text"
                required
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <input
                type="text"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Permisos
            </label>
            <div className="border border-gray-200 rounded-md p-4 max-h-60 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {permisos.map((permiso) => (
                  <div key={permiso.id} className="flex items-start">
                    <input
                      type="checkbox"
                      id={`permiso-${permiso.id}`}
                      checked={permisosSeleccionados.includes(permiso.id)}
                      onChange={(e) => handlePermisoChange(permiso.id, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
                    />
                    <label htmlFor={`permiso-${permiso.id}`} className="ml-2 block text-sm">
                      <div className="font-medium text-gray-900">{permiso.nombre}</div>
                      {permiso.descripcion && (
                        <div className="text-gray-500 text-xs">{permiso.descripcion}</div>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md whitespace-nowrap"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-7

              00 rounded-md disabled:opacity-50 whitespace-nowrap"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
