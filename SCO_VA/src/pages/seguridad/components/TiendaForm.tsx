import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface Tienda {
  id: string;
  nombre: string;
  codigo: string;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

interface TiendaFormProps {
  tienda: Tienda | null;
  onClose: () => void;
  onSave: () => void;
}

export default function TiendaForm({ tienda, onClose, onSave }: TiendaFormProps) {
  const [formData, setFormData] = useState({
    nombre: '',
    codigo: '',
    direccion: '',
    telefono: '',
    email: '',
    activo: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tienda) {
      setFormData({
        nombre: tienda.nombre,
        codigo: tienda.codigo,
        direccion: tienda.direccion || '',
        telefono: tienda.telefono || '',
        email: tienda.email || '',
        activo: tienda.activo,
      });
    }
  }, [tienda]);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        nombre: formData.nombre.trim(),
        codigo: formData.codigo.trim().toUpperCase(),
        direccion: formData.direccion.trim() || null,
        telefono: formData.telefono.trim() || null,
        email: formData.email.trim() || null,
        activo: formData.activo,
        updated_at: new Date().toISOString(),
      };

      if (tienda) {
        const { error: updateError } = await supabase
          .from('tiendas')
          .update(payload)
          .eq('id', tienda.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('tiendas')
          .insert([payload]);

        if (insertError) throw insertError;
      }

      onSave();
    } catch (err: any) {
      console.error('Error guardando tienda:', err);
      if (err.code === '23505') {
        setError('Ya existe una tienda con ese código. El código debe ser único.');
      } else {
        setError(err.message || 'Error al guardar la tienda');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="w-9 h-9 flex items-center justify-center bg-emerald-100 rounded-lg mr-3">
              <i className="ri-store-2-line text-emerald-600"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {tienda ? 'Editar Tienda' : 'Nueva Tienda'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 cursor-pointer"
          >
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-start">
            <i className="ri-error-warning-line mr-2 mt-0.5 flex-shrink-0"></i>
            <span className="text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre y Código */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={100}
                value={formData.nombre}
                onChange={(e) => handleChange('nombre', e.target.value)}
                placeholder="Ej: Sucursal Central"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={20}
                value={formData.codigo}
                onChange={(e) => handleChange('codigo', e.target.value.toUpperCase())}
                placeholder="Ej: OLO-01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">Código único. Se guarda en mayúsculas.</p>
            </div>
          </div>

          {/* Dirección */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dirección
            </label>
            <textarea
              rows={2}
              maxLength={500}
              value={formData.direccion}
              onChange={(e) => handleChange('direccion', e.target.value)}
              placeholder="Dirección completa de la tienda"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm resize-none"
            />
          </div>

          {/* Teléfono y Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <div className="relative">
                <div className="w-9 h-9 absolute left-0 top-0 flex items-center justify-center pointer-events-none">
                  <i className="ri-phone-line text-gray-400 text-sm"></i>
                </div>
                <input
                  type="tel"
                  maxLength={20}
                  value={formData.telefono}
                  onChange={(e) => handleChange('telefono', e.target.value)}
                  placeholder="(506) 2222-3333"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <div className="w-9 h-9 absolute left-0 top-0 flex items-center justify-center pointer-events-none">
                  <i className="ri-mail-line text-gray-400 text-sm"></i>
                </div>
                <input
                  type="email"
                  maxLength={100}
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="tienda@empresa.com"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
          </div>

          {/* Estado activo */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-700">Estado de la tienda</p>
              <p className="text-xs text-gray-500">Las tiendas inactivas no pueden ser asignadas a usuarios</p>
            </div>
            <button
              type="button"
              onClick={() => handleChange('activo', !formData.activo)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                formData.activo ? 'bg-emerald-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.activo ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md whitespace-nowrap cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md disabled:opacity-50 whitespace-nowrap cursor-pointer flex items-center"
            >
              {loading ? (
                <>
                  <i className="ri-loader-4-line animate-spin mr-2"></i>
                  Guardando...
                </>
              ) : (
                <>
                  <i className="ri-save-line mr-2"></i>
                  {tienda ? 'Actualizar' : 'Crear Tienda'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
