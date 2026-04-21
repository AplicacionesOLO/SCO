import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { showAlert, showConfirm } from '../../../utils/dialog';

interface CategoriaProducto {
  id: number;
  nombre: string;
  descripcion?: string;
  activo?: boolean;
  created_at: string;
  tienda_id: string;
}

export default function CategoriasProductosManager() {
  const [categorias, setCategorias] = useState<CategoriaProducto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editando, setEditando] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<{ nombre: string; descripcion: string }>({ nombre: '', descripcion: '' });
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nuevaCategoria, setNuevaCategoria] = useState({ nombre: '', descripcion: '' });
  const { currentStore } = useAuth();

  useEffect(() => {
    if (currentStore?.id) cargarCategorias();
  }, [currentStore]);

  const cargarCategorias = async () => {
    if (!currentStore?.id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .eq('tienda_id', currentStore.id)
        .order('nombre');
      if (error) throw error;
      setCategorias(data || []);
    } catch (err) {
      console.error('Error cargando categorías:', err);
      showAlert('Error al cargar las categorías', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const crearCategoria = async () => {
    if (!currentStore?.id) { showAlert('No hay tienda seleccionada', { type: 'warning' }); return; }
    if (!nuevaCategoria.nombre.trim()) {
      showAlert('El nombre de la categoría es obligatorio', { type: 'warning' });
      return;
    }
    try {
      setSaving(true);
      const { data: existe } = await supabase
        .from('categorias')
        .select('id')
        .eq('nombre', nuevaCategoria.nombre.trim())
        .eq('tienda_id', currentStore.id)
        .maybeSingle();

      if (existe) {
        showAlert('Ya existe una categoría con ese nombre', { type: 'warning' });
        return;
      }

      const insertData: Record<string, unknown> = {
        nombre: nuevaCategoria.nombre.trim(),
        tienda_id: currentStore.id,
      };
      if (nuevaCategoria.descripcion.trim()) {
        insertData.descripcion = nuevaCategoria.descripcion.trim();
      }

      const { error } = await supabase.from('categorias').insert([insertData]);
      if (error) throw error;

      setNuevaCategoria({ nombre: '', descripcion: '' });
      setMostrarFormulario(false);
      cargarCategorias();
      showAlert('Categoría creada exitosamente');
    } catch (err: any) {
      console.error('Error creando categoría:', err);
      if (err.code === '23505') {
        showAlert('Ya existe una categoría con ese nombre', { type: 'warning' });
      } else {
        showAlert('Error al crear la categoría', { type: 'error' });
      }
    } finally {
      setSaving(false);
    }
  };

  const iniciarEdicion = (cat: CategoriaProducto) => {
    setEditando(cat.id);
    setEditValues({ nombre: cat.nombre, descripcion: cat.descripcion || '' });
  };

  const guardarEdicion = async (id: number) => {
    if (!editValues.nombre.trim()) {
      showAlert('El nombre no puede estar vacío', { type: 'warning' });
      return;
    }
    try {
      setSaving(true);
      if (currentStore?.id) {
        const { data: existe } = await supabase
          .from('categorias')
          .select('id')
          .eq('nombre', editValues.nombre.trim())
          .eq('tienda_id', currentStore.id)
          .neq('id', id)
          .maybeSingle();

        if (existe) {
          showAlert('Ya existe una categoría con ese nombre', { type: 'warning' });
          return;
        }
      }

      const updateData: Record<string, unknown> = { nombre: editValues.nombre.trim() };
      if (editValues.descripcion.trim()) {
        updateData.descripcion = editValues.descripcion.trim();
      } else {
        updateData.descripcion = null;
      }

      const { error } = await supabase.from('categorias').update(updateData).eq('id', id);
      if (error) throw error;

      setEditando(null);
      cargarCategorias();
      showAlert('Categoría actualizada exitosamente');
    } catch (err: any) {
      console.error('Error actualizando categoría:', err);
      if (err.code === '23505') {
        showAlert('Ya existe una categoría con ese nombre', { type: 'warning' });
      } else {
        showAlert('Error al actualizar la categoría', { type: 'error' });
      }
    } finally {
      setSaving(false);
    }
  };

  const cancelarEdicion = () => {
    setEditando(null);
    setEditValues({ nombre: '', descripcion: '' });
  };

  const eliminarCategoria = async (id: number) => {
    try {
      const { data: productosUsando } = await supabase
        .from('productos')
        .select('id_producto')
        .eq('categoria_id', id)
        .limit(1);

      if (productosUsando && productosUsando.length > 0) {
        showAlert('No se puede eliminar esta categoría porque está siendo utilizada por productos', { type: 'warning' });
        return;
      }

      const ok = await showConfirm('¿Estás seguro de eliminar esta categoría? Esta acción no se puede deshacer.', {
        type: 'danger',
        title: 'Eliminar categoría',
      });
      if (!ok) return;

      setSaving(true);
      const { error } = await supabase.from('categorias').delete().eq('id', id);
      if (error) throw error;

      cargarCategorias();
      showAlert('Categoría eliminada exitosamente');
    } catch (err) {
      console.error('Error eliminando categoría:', err);
      showAlert('Error al eliminar la categoría', { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Categorías de Productos</h2>
          <p className="text-sm text-gray-500 mt-0.5">Administra las categorías para clasificar tus productos</p>
        </div>
        <button
          onClick={() => { setMostrarFormulario(true); setEditando(null); }}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap cursor-pointer text-sm font-medium"
        >
          <i className="ri-add-line mr-2"></i>
          Nueva Categoría
        </button>
      </div>

      {/* Formulario nueva categoría */}
      {mostrarFormulario && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Nueva Categoría</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={nuevaCategoria.nombre}
                onChange={(e) => setNuevaCategoria(prev => ({ ...prev, nombre: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') crearCategoria(); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
                placeholder="Ej: Muebles de sala"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <input
                type="text"
                value={nuevaCategoria.descripcion}
                onChange={(e) => setNuevaCategoria(prev => ({ ...prev, descripcion: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') crearCategoria(); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
                placeholder="Descripción opcional"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => { setMostrarFormulario(false); setNuevaCategoria({ nombre: '', descripcion: '' }); }}
              className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={crearCategoria}
              disabled={saving || !nuevaCategoria.nombre.trim()}
              className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer"
            >
              {saving ? 'Guardando...' : 'Crear Categoría'}
            </button>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Creación</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {categorias.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <div className="w-10 h-10 flex items-center justify-center">
                      <i className="ri-price-tag-3-line text-3xl"></i>
                    </div>
                    <p className="text-sm font-medium text-gray-500">No hay categorías creadas</p>
                    <p className="text-xs text-gray-400">Crea la primera categoría para clasificar tus productos</p>
                  </div>
                </td>
              </tr>
            ) : (
              categorias.map((cat) => (
                <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    {editando === cat.id ? (
                      <input
                        type="text"
                        value={editValues.nombre}
                        onChange={(e) => setEditValues(prev => ({ ...prev, nombre: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') guardarEdicion(cat.id); if (e.key === 'Escape') cancelarEdicion(); }}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
                        autoFocus
                      />
                    ) : (
                      <span className="text-sm font-medium text-gray-900">{cat.nombre}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editando === cat.id ? (
                      <input
                        type="text"
                        value={editValues.descripcion}
                        onChange={(e) => setEditValues(prev => ({ ...prev, descripcion: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') guardarEdicion(cat.id); if (e.key === 'Escape') cancelarEdicion(); }}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
                        placeholder="Descripción opcional"
                      />
                    ) : (
                      <span className="text-sm text-gray-500">{cat.descripcion || <span className="italic text-gray-300">Sin descripción</span>}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-500 whitespace-nowrap">
                    {new Date(cat.created_at).toLocaleDateString('es-ES')}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {editando === cat.id ? (
                        <>
                          <button
                            onClick={() => guardarEdicion(cat.id)}
                            disabled={saving}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors cursor-pointer"
                            title="Guardar"
                          >
                            <i className="ri-check-line"></i>
                          </button>
                          <button
                            onClick={cancelarEdicion}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                            title="Cancelar"
                          >
                            <i className="ri-close-line"></i>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => iniciarEdicion(cat)}
                            className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <i className="ri-edit-line"></i>
                          </button>
                          <button
                            onClick={() => eliminarCategoria(cat.id)}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                            title="Eliminar"
                          >
                            <i className="ri-delete-bin-line"></i>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Info */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-start gap-2">
          <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
            <i className="ri-information-line text-amber-600"></i>
          </div>
          <div className="text-sm text-amber-800">
            <p className="font-medium mb-1">Información importante:</p>
            <ul className="list-disc list-inside space-y-1 text-amber-700">
              <li>Las categorías de productos son independientes de las categorías de inventario</li>
              <li>No se pueden eliminar categorías que estén asignadas a productos existentes</li>
              <li>Puedes editar el nombre y descripción haciendo clic en el ícono de edición</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
