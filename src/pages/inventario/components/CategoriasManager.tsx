import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { showAlert, showConfirm } from '../../../utils/dialog';

interface Categoria {
  id: number;
  nombre: string;
  descripcion?: string;
  created_at: string;
  tienda_id: string;
}

export default function CategoriasManager() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null);
  const [formData, setFormData] = useState({ nombre: '', descripcion: '' });
  const [error, setError] = useState('');
  const { currentStore } = useAuth();

  useEffect(() => {
    if (currentStore?.id) cargarCategorias();
  }, [currentStore]);

  const cargarCategorias = async () => {
    if (!currentStore?.id) return;
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .eq('tienda_id', currentStore.id)
        .order('nombre');
      if (error) throw error;
      setCategorias(data || []);
    } catch (err) {
      console.error('Error cargando categorías:', err);
      setError('Error al cargar las categorías');
    } finally {
      setLoading(false);
    }
  };

  const validarNombreUnico = async (nombre: string, idExcluir?: number) => {
    if (!currentStore?.id) return false;
    const { data } = await supabase
      .from('categorias')
      .select('id')
      .eq('tienda_id', currentStore.id)
      .ilike('nombre', nombre.trim())
      .neq('id', idExcluir || 0);
    return data?.length === 0;
  };

  const guardarCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!currentStore?.id) { setError('No hay tienda seleccionada'); return; }

    const nombreTrimmed = formData.nombre.trim();
    if (!nombreTrimmed) { setError('El nombre es requerido'); return; }

    const esUnico = await validarNombreUnico(nombreTrimmed, editingCategoria?.id);
    if (!esUnico) { setError('Ya existe una categoría con este nombre'); return; }

    try {
      if (editingCategoria) {
        const { error } = await supabase
          .from('categorias')
          .update({ nombre: nombreTrimmed, descripcion: formData.descripcion.trim() || null })
          .eq('id', editingCategoria.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('categorias')
          .insert({ nombre: nombreTrimmed, descripcion: formData.descripcion.trim() || null, tienda_id: currentStore.id });
        if (error) throw error;
      }
      await cargarCategorias();
      cerrarForm();
    } catch (err) {
      console.error('Error guardando categoría:', err);
      setError('Error al guardar la categoría');
    }
  };

  const eliminarCategoria = async (id: number) => {
    const ok = await showConfirm('¿Estás seguro de eliminar esta categoría?');
    if (!ok) return;
    try {
      const { data: articulos } = await supabase
        .from('inventario')
        .select('id_articulo')
        .eq('categoria_id', id)
        .limit(1);
      if (articulos && articulos.length > 0) {
        setError('No se puede eliminar una categoría que tiene artículos asociados');
        return;
      }
      const { error } = await supabase.from('categorias').delete().eq('id', id);
      if (error) throw error;
      await cargarCategorias();
    } catch (err) {
      console.error('Error eliminando categoría:', err);
      setError('Error al eliminar la categoría');
    }
  };

  const editarCategoria = (categoria: Categoria) => {
    setEditingCategoria(categoria);
    setFormData({ nombre: categoria.nombre, descripcion: categoria.descripcion || '' });
    setShowForm(true);
  };

  const cerrarForm = () => {
    setShowForm(false);
    setEditingCategoria(null);
    setFormData({ nombre: '', descripcion: '' });
    setError('');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Gestión de Categorías</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          <i className="ri-add-line mr-2"></i>
          Nueva Categoría
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Formulario Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingCategoria ? 'Editar Categoría' : 'Nueva Categoría'}
            </h3>
            
            <form onSubmit={guardarCategoria} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nombre de la categoría"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Descripción opcional"
                  rows={3}
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                >
                  {editingCategoria ? 'Actualizar' : 'Crear'}
                </button>
                <button
                  type="button"
                  onClick={cerrarForm}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors whitespace-nowrap"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de Categorías */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {categorias.length === 0 ? (
          <div className="text-center py-12">
            <i className="ri-folder-line text-4xl text-gray-400 mb-4"></i>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay categorías</h3>
            <p className="text-gray-500 mb-4">Crea tu primera categoría para organizar tu inventario</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              Crear Categoría
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
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
                {categorias.map((categoria) => (
                  <tr key={categoria.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {categoria.nombre}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500">
                        {categoria.descripcion || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(categoria.created_at).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => editarCategoria(categoria)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        <i className="ri-edit-line"></i>
                      </button>
                      <button
                        onClick={() => eliminarCategoria(categoria.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <i className="ri-delete-bin-line"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}