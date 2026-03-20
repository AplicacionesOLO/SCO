import { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { getProductos } from '../../../services/productosService';

interface Props {
  onSeleccionar: (productoId: number, productoNombre: string) => void;
}

export default function SelectorProductoBOM({ onSeleccionar }: Props) {
  const { tiendaActual } = useAuth();
  const [productos, setProductos] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarProductos();
  }, [tiendaActual]);

  const cargarProductos = async () => {
    setLoading(true);
    try {
      const { data } = await getProductos({ activo: true }, tiendaActual);
      setProductos(data || []);
    } catch (error) {
      console.error('Error cargando productos:', error);
    } finally {
      setLoading(false);
    }
  };

  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.codigo.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar producto por nombre o código..."
          className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <i className="ri-loader-4-line animate-spin text-3xl text-gray-400"></i>
          <p className="text-gray-600 mt-2">Cargando productos...</p>
        </div>
      ) : productosFiltrados.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
          {productosFiltrados.map((producto) => (
            <button
              key={producto.id}
              onClick={() => onSeleccionar(producto.id, producto.nombre)}
              className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className="ri-product-hunt-line text-blue-600 text-xl"></i>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded">
                      {producto.codigo}
                    </span>
                    <span className="font-semibold text-gray-900">{producto.nombre}</span>
                  </div>
                  {producto.descripcion && (
                    <p className="text-sm text-gray-600 line-clamp-1">{producto.descripcion}</p>
                  )}
                </div>
                <i className="ri-arrow-right-line text-gray-400"></i>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <i className="ri-inbox-line text-3xl text-gray-400 mb-2"></i>
          <p className="text-gray-600">
            {busqueda ? 'No se encontraron productos' : 'No hay productos disponibles'}
          </p>
        </div>
      )}
    </div>
  );
}
