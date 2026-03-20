import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';

interface Categoria {
  id_categoria: number;
  nombre_categoria: string;
  activo: boolean;
}

interface InventarioFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedCategoria: string;
  onCategoriaChange: (value: string) => void;
  categorias?: Categoria[];
  sortBy: string;
  onSortByChange: (value: string) => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (value: 'asc' | 'desc') => void;
}

export default function InventarioFilters({
  searchTerm,
  onSearchChange,
  selectedCategoria,
  onCategoriaChange,
  categorias: categoriasExternas,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
}: InventarioFiltersProps) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const { currentStore } = useAuth();

  useEffect(() => {
    if (categoriasExternas) {
      setCategorias(categoriasExternas);
    } else if (currentStore?.id) {
      cargarCategorias();
    }
  }, [categoriasExternas, currentStore]);

  const cargarCategorias = async () => {
    if (!currentStore?.id) return;
    try {
      const { data, error } = await supabase
        .from('categorias_inventario')
        .select('id_categoria, nombre_categoria, activo')
        .eq('tienda_id', currentStore.id)
        .eq('activo', true)
        .order('nombre_categoria');

      if (error) throw error;
      setCategorias(data || []);
    } catch (error) {
      console.error('Error cargando categorías:', error);
    }
  };

  const sortOptions = [
    { value: 'codigo_articulo', label: 'Código' },
    { value: 'descripcion_articulo', label: 'Descripción' },
    { value: 'cantidad_articulo', label: 'Cantidad' },
    { value: 'costo_articulo', label: 'Costo' },
    { value: 'precio_articulo', label: 'Precio' },
    { value: 'created_at', label: 'Fecha de creación' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Búsqueda */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Buscar
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Código o descripción..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i className="ri-search-line text-gray-400"></i>
            </div>
          </div>
        </div>

        {/* Categoría */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Categoría de Inventario
          </label>
          <div className="relative">
            <select
              value={selectedCategoria}
              onChange={(e) => onCategoriaChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8 appearance-none bg-white"
            >
              <option value="todas">Todas las categorías</option>
              {categorias.map((cat) => (
                <option key={cat.id_categoria} value={cat.id_categoria.toString()}>
                  {cat.nombre_categoria}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <i className="ri-arrow-down-s-line text-gray-400"></i>
            </div>
          </div>
        </div>

        {/* Ordenar por */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ordenar por
          </label>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value)}
              className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <i className="ri-arrow-down-s-line text-gray-400"></i>
            </div>
          </div>
        </div>

        {/* Orden */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Orden
          </label>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => onSortOrderChange('asc')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
                sortOrder === 'asc'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <i className="ri-arrow-up-line mr-1"></i>
              Asc
            </button>
            <button
              onClick={() => onSortOrderChange('desc')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors border-l border-gray-300 cursor-pointer ${
                sortOrder === 'desc'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <i className="ri-arrow-down-line mr-1"></i>
              Desc
            </button>
          </div>
        </div>
      </div>

      {/* Resumen de filtros activos */}
      {(searchTerm || selectedCategoria !== 'todas') && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-600">Filtros activos:</span>
            {searchTerm && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Búsqueda: "{searchTerm}"
                <button
                  onClick={() => onSearchChange('')}
                  className="ml-1 text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  <i className="ri-close-line"></i>
                </button>
              </span>
            )}
            {selectedCategoria !== 'todas' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Categoría: {categorias.find(c => c.id_categoria.toString() === selectedCategoria)?.nombre_categoria}
                <button
                  onClick={() => onCategoriaChange('todas')}
                  className="ml-1 text-purple-600 hover:text-purple-800 cursor-pointer"
                >
                  <i className="ri-close-line"></i>
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
