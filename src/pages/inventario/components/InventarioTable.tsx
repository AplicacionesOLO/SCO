import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { useNotification } from '../../../hooks/useNotification';
import NotificationPopup from '../../../components/base/NotificationPopup';
import ConfirmationDialog from '../../../components/base/ConfirmationDialog';

interface Articulo {
  id_articulo: number;
  codigo_articulo: string;
  descripcion_articulo: string;
  cantidad_articulo: number;
  costo_articulo: number;
  ganancia_articulo: number;
  precio_articulo: number;
  categoria_id: number;
  unidad_medida_id?: number;
  activo: boolean;
  created_at: string;
  categorias_inventario?: {
    id_categoria: number;
    nombre_categoria: string;
  };
  unidades_medida?: {
    id: number;
    nombre: string;
    simbolo: string;
  };
}

interface InventarioTableProps {
  searchTerm: string;
  selectedCategoria: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onEditar: (articulo: Articulo) => void;
  refreshTrigger: number;
}

export default function InventarioTable({
  searchTerm,
  selectedCategoria,
  sortBy,
  sortOrder,
  onEditar,
  refreshTrigger,
}: InventarioTableProps) {
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentStore } = useAuth();
  const { notification, showSuccess, showError, showWarning, hideNotification, confirmation, showConfirmation, hideConfirmation } = useNotification();

  useEffect(() => {
    cargarArticulos();
  }, [searchTerm, selectedCategoria, sortBy, sortOrder, refreshTrigger, currentStore]);

  const cargarArticulos = async () => {
    if (!currentStore?.id) {
      setArticulos([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [inventarioRes, categoriasRes] = await Promise.all([
        supabase
          .from('inventario')
          .select(`
            *,
            unidades_medida(id, nombre, simbolo)
          `)
          .eq('tienda_id', currentStore.id),
        supabase
          .from('categorias_inventario')
          .select('id_categoria, nombre_categoria')
      ]);

      if (inventarioRes.error) throw inventarioRes.error;
      if (categoriasRes.error) throw categoriasRes.error;

      let inventarioData = inventarioRes.data || [];
      const categoriasData = categoriasRes.data || [];

      const articulosConCategorias = inventarioData.map(articulo => ({
        ...articulo,
        categorias_inventario: categoriasData.find(cat => cat.id_categoria === articulo.categoria_id) || null
      }));

      let articulosFiltrados = articulosConCategorias;

      if (searchTerm) {
        articulosFiltrados = articulosFiltrados.filter(articulo =>
          articulo.codigo_articulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          articulo.descripcion_articulo?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      if (selectedCategoria && selectedCategoria !== 'todas') {
        articulosFiltrados = articulosFiltrados.filter(articulo =>
          articulo.categoria_id === parseInt(selectedCategoria)
        );
      }

      articulosFiltrados.sort((a, b) => {
        let aValue = a[sortBy as keyof Articulo];
        let bValue = b[sortBy as keyof Articulo];

        if (aValue == null) aValue = '';
        if (bValue == null) bValue = '';

        aValue = aValue.toString();
        bValue = bValue.toString();

        if (sortOrder === 'asc') {
          return aValue.localeCompare(bValue);
        } else {
          return bValue.localeCompare(aValue);
        }
      });

      setArticulos(articulosFiltrados);
    } catch (error) {
      console.error('Error cargando artículos:', error);

      try {
        let fallbackQuery = supabase
          .from('inventario')
          .select('*')
          .eq('tienda_id', currentStore.id);

        if (searchTerm) {
          fallbackQuery = fallbackQuery.or(`codigo_articulo.ilike.%${searchTerm}%,descripcion_articulo.ilike.%${searchTerm}%`);
        }

        if (selectedCategoria && selectedCategoria !== 'todas') {
          fallbackQuery = fallbackQuery.eq('categoria_id', parseInt(selectedCategoria));
        }

        fallbackQuery = fallbackQuery.order(sortBy, { ascending: sortOrder === 'asc' });

        const { data: fallbackData, error: fallbackError } = await fallbackQuery;

        if (fallbackError) throw fallbackError;

        const { data: categoriasFallback } = await supabase
          .from('categorias_inventario')
          .select('id_categoria, nombre_categoria');

        const articulosConCategoriasFallback = (fallbackData || []).map(articulo => ({
          ...articulo,
          categorias_inventario: categoriasFallback?.find(cat => cat.id_categoria === articulo.categoria_id) || null
        }));

        setArticulos(articulosConCategoriasFallback);
      } catch (fallbackError) {
        console.error('Error en fallback:', fallbackError);
        setArticulos([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleEstadoArticulo = async (id: number, estadoActual: boolean) => {
    try {
      const { error } = await supabase
        .from('inventario')
        .update({ activo: !estadoActual })
        .eq('id_articulo', id);

      if (error) throw error;
      
      // Actualizar el estado local
      setArticulos(prev => prev.map(articulo => 
        articulo.id_articulo === id 
          ? { ...articulo, activo: !estadoActual }
          : articulo
      ));
    } catch (error) {
      console.error('Error actualizando estado:', error);
      showError('Error al actualizar el estado del artículo', 'No se pudo actualizar el estado del artículo');
    }
  };

  const handleEliminar = async (id: number) => {
    showConfirmation(
      'danger',
      '¿Eliminar artículo?',
      '¿Está seguro que desea eliminar este artículo? Esta acción no se puede deshacer.',
      async () => {
        try {
          // Primero verificar si el artículo está siendo usado
          const { data: bomCheck } = await supabase
            .from('bom_items')
            .select('id_bom_item')
            .eq('id_componente', id)
            .limit(1);

          if (bomCheck && bomCheck.length > 0) {
            showWarning('Artículo en uso', 'Este artículo está siendo utilizado como componente en la lista de materiales de otros productos. Para eliminarlo, primero debe ir al módulo de Productos y eliminarlo de las listas de materiales.');
            return;
          }

          const { data: cotizacionCheck } = await supabase
            .from('cotizacion_items')
            .select('id_cotizacion_item')
            .eq('id_articulo', id)
            .limit(1);

          if (cotizacionCheck && cotizacionCheck.length > 0) {
            showWarning('Artículo en uso', 'Este artículo está siendo utilizado en cotizaciones. Para eliminarlo, primero debe eliminar las cotizaciones que lo contienen.');
            return;
          }

          const { data: pedidoCheck } = await supabase
            .from('pedido_items')
            .select('id_pedido_item')
            .eq('id_articulo', id)
            .limit(1);

          if (pedidoCheck && pedidoCheck.length > 0) {
            showWarning('Artículo en uso', 'Este artículo está siendo utilizado en pedidos. Para eliminarlo, primero debe eliminar los pedidos que lo contienen.');
            return;
          }

          // Si no está siendo usado, proceder con la eliminación
          const { error } = await supabase
            .from('inventario')
            .delete()
            .eq('id_articulo', id);

          if (error) {
            // Manejar error de clave foránea
            if (error.code === '23503') {
              showWarning('Artículo en uso', 'Este artículo está siendo utilizado en otros registros del sistema. Para eliminarlo, primero debe eliminar las referencias en otros módulos.');
              return;
            }
            throw error;
          }

          // Registrar movimiento de eliminación
          const articuloAEliminar = articulos.find(a => a.id_articulo === id);
          if (articuloAEliminar) {
            const { data: { user } } = await supabase.auth.getUser();
            const stockActual = Number(articuloAEliminar.cantidad_articulo);
            if (stockActual > 0) {
              await supabase.from('inventario_movimientos').insert({
                articulo_id: id,
                tipo: 'eliminacion',
                cantidad: -stockActual,
                stock_anterior: stockActual,
                stock_posterior: 0,
                referencia_type: 'inventario',
                referencia_id: id,
                notas: `Artículo eliminado del sistema — Código: ${articuloAEliminar.codigo_articulo} · ${articuloAEliminar.descripcion_articulo}`,
                usuario_id: user?.id || null,
              });
            }
          }
          
          // Actualizar la lista local
          setArticulos(prev => prev.filter(articulo => articulo.id_articulo !== id));
          showSuccess('Artículo eliminado', 'El artículo ha sido eliminado exitosamente');
        } catch (error: any) {
          console.error('Error eliminando artículo:', error);
          
          // Manejar diferentes tipos de errores
          if (error.code === '23503') {
            showWarning('Artículo en uso', 'Este artículo está siendo utilizado en otros registros del sistema. Para eliminarlo, primero debe eliminar las referencias en otros módulos.');
          } else {
            showError('Error al eliminar', 'No se pudo eliminar el artículo. Por favor, inténtelo nuevamente.');
          }
        }
      }
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando inventario...</p>
        </div>
      </div>
    );
  }

  if (articulos.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-8 text-center">
          <i className="ri-archive-line text-4xl text-gray-400 mb-4"></i>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay artículos</h3>
          <p className="text-gray-600">
            {searchTerm || selectedCategoria !== 'todas'
              ? 'No se encontraron artículos con los filtros aplicados.'
              : 'Comience agregando artículos a su inventario.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descripción
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Costo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Precio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {articulos.map((articulo) => (
                  <tr key={articulo.id_articulo} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {articulo.codigo_articulo}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-xs truncate" title={articulo.descripcion_articulo}>
                        {articulo.descripcion_articulo}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {articulo.categorias_inventario ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {articulo.categorias_inventario.nombre_categoria}
                        </span>
                      ) : (
                        <span className="text-gray-400">Sin categoría</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`font-medium ${
                        articulo.cantidad_articulo <= 10 ? 'text-red-600' : 
                        articulo.cantidad_articulo <= 50 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {articulo.cantidad_articulo}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {articulo.unidades_medida ? (
                        <span className="text-gray-600">
                          {articulo.unidades_medida.simbolo}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₡{articulo.costo_articulo?.toLocaleString() || '0'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₡{articulo.precio_articulo?.toLocaleString() || '0'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleEstadoArticulo(articulo.id_articulo, articulo.activo)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                          articulo.activo
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        {articulo.activo ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => onEditar(articulo)}
                          className="text-blue-600 hover:text-blue-900 cursor-pointer"
                          title="Editar artículo"
                        >
                          <i className="ri-edit-line"></i>
                        </button>
                        <button
                          onClick={() => handleEliminar(articulo.id_articulo)}
                          className="text-red-600 hover:text-red-900 cursor-pointer"
                          title="Eliminar artículo"
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
        </div>
        <NotificationPopup
          isOpen={notification.isOpen}
          onClose={hideNotification}
          title={notification.title}
          message={notification.message}
          type={notification.type}
        />
      </div>

      <ConfirmationDialog
        isOpen={confirmation.isOpen}
        type={confirmation.type}
        title={confirmation.title}
        message={confirmation.message}
        onConfirm={confirmation.onConfirm}
        onCancel={confirmation.onCancel}
      />
    </>
  );
}
