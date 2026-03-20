
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface Permiso {
  id: string;
  nombre: string;
  descripcion: string;
  created_at: string;
  updated_at: string;
}

interface PermisoFormProps {
  permiso: Permiso | null;
  onClose: () => void;
  onSave: () => void;
}

export default function PermisoForm({ permiso, onClose, onSave }: PermisoFormProps) {
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (permiso) {
      setFormData({
        nombre: permiso.nombre,
        descripcion: permiso.descripcion,
      });
    }
  }, [permiso]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (permiso) {
        // Actualizar permiso existente
        const { error } = await supabase
          .from('permisos')
          .update({
            nombre: formData.nombre,
            descripcion: formData.descripcion,
            updated_at: new Date().toISOString(),
          })
          .eq('id', permiso.id);

        if (error) throw error;
      } else {
        // Crear nuevo permiso
        const { error } = await supabase
          .from('permisos')
          .insert([{
            nombre: formData.nombre,
            descripcion: formData.descripcion,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }]);

        if (error) throw error;
      }

      onSave();
    } catch (error: any) {
      console.error('Error guardando permiso:', error);
      setError(error.message || 'Error al guardar el permiso');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {permiso ? 'Editar Permiso' : 'Nuevo Permiso'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Permiso
            </label>
            <input
              type="text"
              required
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="ej: dashboard:read, users:write"
            />
            <p className="text-xs text-gray-500 mt-1">
              Usa formato módulo:acción (ej: dashboard:read, users:write)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="Describe qué permite hacer este permiso..."
            />
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
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 whitespace-nowrap"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
