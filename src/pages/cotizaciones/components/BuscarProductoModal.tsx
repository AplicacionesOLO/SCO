import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';

interface BuscarProductoModalProps {
  onSelect: (producto: any) => void;
  onClose: () => void;
}

export function BuscarProductoModal({ onSelect, onClose }: BuscarProductoModalProps) {
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('');
  const [categorias, setCategorias] = useState<any[]>([]);
  const { currentStore } = useAuth();

  useEffect(() => {
    if (currentStore?.id) {
      cargarCategorias();
      cargarProductos();
    }
  }, [currentStore]);

  useEffect(() => {
    if (currentStore?.id) cargarProductos();
  }, [busqueda, categoria]);

  const cargarCategorias = async () => {
    if (!currentStore?.id) return;
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('id, nombre')
        .eq('tienda_id', currentStore.id)
        .order('nombre');
      if (error) throw error;
      setCategorias(data || []);
    } catch (error) {
      console.error('Error cargando categorías:', error);
    }
  };

  const cargarProductos = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('productos')
        .select('id_producto, codigo_producto, descripcion_producto, categoria_id, costo_total_bom')
        .eq('activo', true);

      if (busqueda.trim()) {
        query = query.or(`codigo_producto.ilike.%${busqueda}%,descripcion_producto.ilike.%${busqueda}%`);
      }

      if (categoria) {
        query = query.eq('categoria_id', categoria);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      setProductos(data || []);
    } catch (error) {
      console.error('Error cargando productos:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Buscar Producto</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar por código o nombre
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Escriba para buscar..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <i className="ri-search-line absolute left-3 top-2.5 text-gray-400 text-sm"></i>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm pr-8"
              >
                <option value="">Todas las categorías</option>
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Lista de productos */}
          <div className="border border-gray-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Cargando productos...</p>
              </div>
            ) : productos.length === 0 ? (
              <div className="p-8 text-center">
                <i className="ri-inbox-line text-4xl text-gray-400 mb-4"></i>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay productos</h3>
                <p className="text-gray-600">No se encontraron productos con los criterios de búsqueda.</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Código
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Descripción
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Precio
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {productos.map((producto) => (
                    <tr key={producto.id_producto} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{producto.codigo_producto}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{producto.descripcion_producto}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        ₡{(producto.costo_total_bom || 0).toLocaleString('es-CR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => onSelect(producto)}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 cursor-pointer whitespace-nowrap"
                        >
                          Seleccionar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
