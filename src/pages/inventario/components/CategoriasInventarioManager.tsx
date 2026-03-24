import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { showAlert, showConfirm } from '../../../utils/dialog';

interface CategoriaInventario {
  id_categoria: number;
  nombre_categoria: string;
  descripcion_categoria?: string;
  activo: boolean;
  created_at: string;
  tienda_id: string;
}

interface CategoriasInventarioManagerProps {
  onClose: () => void;
}

export default function CategoriasInventarioManager({ onClose }: CategoriasInventarioManagerProps) {
  const [categorias, setCategorias] = useState<CategoriaInventario[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editando, setEditando] = useState<number | null>(null);
  const [nuevaCategoria, setNuevaCategoria] = useState({
    nombre_categoria: '',
    descripcion_categoria: ''
  });
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const { currentStore } = useAuth();

  useEffect(() => {
    if (currentStore?.id) cargarCategorias();
  }, [currentStore]);

  const cargarCategorias = async () => {
    if (!currentStore?.id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('categorias_inventario')
        .select('*')
        .eq('tienda_id', currentStore.id)
        .order('nombre_categoria');

      if (error) throw error;
      setCategorias(data || []);
    } catch (error) {
      console.error('Error cargando categorías de inventario:', error);
      showAlert('Error al cargar las categorías de inventario', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const crearCategoria = async () => {
    if (!currentStore?.id) { showAlert('No hay tienda seleccionada', { type: 'warning' }); return; }
    if (!nuevaCategoria.nombre_categoria.trim()) {
      showAlert('El nombre de la categoría es obligatorio', { type: 'warning' });
      return;
    }

    try {
      setSaving(true);

      // Pre-validar duplicado en la misma tienda
      const { data: existe } = await supabase
        .from('categorias_inventario')
        .select('id_categoria')
        .eq('nombre_categoria', nuevaCategoria.nombre_categoria.trim())
        .eq('tienda_id', currentStore.id)
        .maybeSingle();

      if (existe) {
        showAlert('Ya existe una categoría con ese nombre en esta tienda', { type: 'warning' });
        return;
      }

      const { error } = await supabase
        .from('categorias_inventario')
        .insert([{
          nombre_categoria: nuevaCategoria.nombre_categoria.trim(),
          descripcion_categoria: nuevaCategoria.descripcion_categoria.trim() || null,
          activo: true,
          tienda_id: currentStore.id
        }]);

      if (error) throw error;

      setNuevaCategoria({ nombre_categoria: '', descripcion_categoria: '' });
      setMostrarFormulario(false);
      cargarCategorias();
      showAlert('Categoría creada exitosamente');
    } catch (error: any) {
      console.error('Error creando categoría:', error);
      if (error.code === '23505') {
        showAlert('Ya existe una categoría con ese nombre en esta tienda', { type: 'warning' });
      } else {
        showAlert('Error al crear la categoría', { type: 'error' });
      }
    } finally {
      setSaving(false);
    }
  };

  const actualizarCategoria = async (id: number, datos: Partial<CategoriaInventario>) => {
    try {
      setSaving(true);

      // Pre-validar duplicado si se está cambiando el nombre
      if (datos.nombre_categoria && currentStore?.id) {
        const { data: existe } = await supabase
          .from('categorias_inventario')
          .select('id_categoria')
          .eq('nombre_categoria', datos.nombre_categoria.trim())
          .eq('tienda_id', currentStore.id)
          .neq('id_categoria', id)
          .maybeSingle();

        if (existe) {
          showAlert('Ya existe una categoría con ese nombre en esta tienda', { type: 'warning' });
          setEditando(null);
          cargarCategorias();
          return;
        }
      }

      const { error } = await supabase
        .from('categorias_inventario')
        .update(datos)
        .eq('id_categoria', id);

      if (error) throw error;

      setEditando(null);
      cargarCategorias();
      showAlert('Categoría actualizada exitosamente');
    } catch (error: any) {
      console.error('Error actualizando categoría:', error);
      if (error.code === '23505') {
        showAlert('Ya existe una categoría con ese nombre en esta tienda', { type: 'warning' });
      } else {
        showAlert('Error al actualizar la categoría', { type: 'error' });
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleEstadoCategoria = async (id: number, estadoActual: boolean) => {
    try {
      const { data: articulosUsando, error: errorVerificacion } = await supabase
        .from('inventario')
        .select('id_articulo')
        .eq('categoria_inventario_id', id)
        .limit(1);

      if (errorVerificacion) throw errorVerificacion;

      if (articulosUsando && articulosUsando.length > 0 && estadoActual) {
        showAlert('No se puede desactivar esta categoría porque está siendo utilizada por artículos del inventario', { type: 'warning' });
        return;
      }

      await actualizarCategoria(id, { activo: !estadoActual });
    } catch (error) {
      console.error('Error cambiando estado de categoría:', error);
      showAlert('Error al cambiar el estado de la categoría', { type: 'error' });
    }
  };

  const eliminarCategoria = async (id: number) => {
    try {
      const { data: articulosUsando, error: errorVerificacion } = await supabase
        .from('inventario')
        .select('id_articulo')
        .eq('categoria_inventario_id', id)
        .limit(1);

      if (errorVerificacion) throw errorVerificacion;

      if (articulosUsando && articulosUsando.length > 0) {
        showAlert('No se puede eliminar esta categoría porque está siendo utilizada por artículos del inventario', { type: 'warning' });
        return;
      }

      const ok = await showConfirm('¿Estás seguro de que deseas eliminar esta categoría? Esta acción no se puede deshacer.');
      if (!ok) return;

      setSaving(true);
      const { error } = await supabase
        .from('categorias_inventario')
        .delete()
        .eq('id_categoria', id);

      if (error) throw error;

      cargarCategorias();
      showAlert('Categoría eliminada exitosamente');
    } catch (error) {
      console.error('Error eliminando categoría:', error);
      showAlert('Error al eliminar la categoría', { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Cargando categorías</h3>
          <p className="text-sm text-gray-600">Obteniendo categorías de inventario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Gestión de Categorías de Inventario
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg cursor-pointer"
          title="Cerrar"
        >
          <i className="ri-close-line text-2xl"></i>
        </button>
      </div>

      {/* Botón para nueva categoría */}
      <div className="mb-6">
        <button
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer"
        >
          <i className="ri-add-line mr-2"></i>
          Nueva Categoría de Inventario
        </button>
      </div>

      {/* Formulario para nueva categoría */}
      {mostrarFormulario && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Nueva Categoría</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre *
              </label>
              <input
                type="text"
                value={nuevaCategoria.nombre_categoria}
                onChange={(e) => setNuevaCategoria(prev => ({ ...prev, nombre_categoria: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nombre de la categoría"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <input
                type="text"
                value={nuevaCategoria.descripcion_categoria}
                onChange={(e) => setNuevaCategoria(prev => ({ ...prev, descripcion_categoria: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Descripción opcional"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => {
                setMostrarFormulario(false);
                setNuevaCategoria({ nombre_categoria: '', descripcion_categoria: '' });
              }}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={crearCategoria}
              disabled={saving || !nuevaCategoria.nombre_categoria.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer"
            >
              {saving ? 'Creando...' : 'Crear Categoría'}
            </button>
          </div>
        </div>
      )}

      {/* Lista de categorías */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nombre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Descripción
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha Creación
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {categorias.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  <i className="ri-folder-line text-4xl mb-4 block"></i>
                  No se encontraron categorías de inventario
                </td>
              </tr>
            ) : (
              categorias.map((categoria) => (
                <tr key={categoria.id_categoria} className={`hover:bg-gray-50 ${!categoria.activo ? 'opacity-60' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editando === categoria.id_categoria ? (
                      <input
                        type="text"
                        defaultValue={categoria.nombre_categoria}
                        onBlur={(e) => {
                          if (e.target.value.trim() !== categoria.nombre_categoria) {
                            actualizarCategoria(categoria.id_categoria, { nombre_categoria: e.target.value.trim() });
                          } else {
                            setEditando(null);
                          }
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                          }
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                    ) : (
                      <div className="text-sm font-medium text-gray-900">
                        {categoria.nombre_categoria}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600 max-w-xs truncate">
                      {categoria.descripcion_categoria || 'Sin descripción'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => toggleEstadoCategoria(categoria.id_categoria, categoria.activo)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                        categoria.activo 
                          ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                    >
                      {categoria.activo ? 'Activa' : 'Inactiva'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                    {new Date(categoria.created_at).toLocaleDateString('es-ES')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setEditando(categoria.id_categoria)}
                        className="text-blue-600 hover:text-blue-900 transition-colors p-1"
                        title="Editar nombre"
                      >
                        <i className="ri-edit-line"></i>
                      </button>
                      <button
                        onClick={() => eliminarCategoria(categoria.id_categoria)}
                        className="text-red-600 hover:text-red-900 transition-colors p-1"
                        title="Eliminar"
                      >
                        <i className="ri-delete-bin-line"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start">
          <i className="ri-information-line text-yellow-600 mt-0.5 mr-2"></i>
          <div className="text-sm text-yellow-800">
            <p className="font-medium mb-1">Información importante:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Las categorías de inventario son independientes de las categorías de productos</li>
              <li>No se pueden eliminar categorías que estén siendo utilizadas por artículos</li>
              <li>Al desactivar una categoría, los artículos existentes mantienen su categoría</li>
              <li>Las categorías inactivas no aparecen en los formularios de nuevos artículos</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}