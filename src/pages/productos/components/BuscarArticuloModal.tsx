import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import CrearArticuloModal from './CrearArticuloModal';
import DetalleComponenteModal from './DetalleComponenteModal';

interface Articulo {
  id_articulo: number;
  codigo_articulo: string;
  descripcion_articulo: string;
  precio_articulo: number;
  categoria?: {
    nombre_categoria: string;
  };
  unidad?: {
    nombre: string;
    simbolo: string;
  };
}

interface Props {
  onSeleccionar: (articulo: Articulo, cantidad: number, unidadId: number, precioAjustado: number) => void;
  onCerrar: () => void;
}

export default function BuscarArticuloModal({ onSeleccionar, onCerrar }: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCrearModal, setShowCrearModal] = useState(false);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [articuloSeleccionado, setArticuloSeleccionado] = useState<Articulo | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const { currentStore } = useAuth();

  useEffect(() => {
    if (busqueda.trim().length >= 2) {
      // Debounced search
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        buscarArticulos();
      }, 300);
    } else {
      setArticulos([]);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [busqueda]);

  const buscarArticulos = async () => {
    if (!currentStore?.id) {
      setArticulos([]);
      return;
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('inventario')
        .select(`
          id_articulo,
          codigo_articulo,
          descripcion_articulo,
          precio_articulo,
          categoria:categorias_inventario(nombre_categoria),
          unidad:unidades_medida(nombre, simbolo)
        `)
        .eq('tienda_id', currentStore.id)
        .or(`descripcion_articulo.ilike.%${busqueda}%,codigo_articulo.ilike.%${busqueda}%,id_articulo.eq.${isNaN(parseInt(busqueda)) ? 0 : parseInt(busqueda)}`)
        .limit(10);

      if (error) throw error;
      setArticulos(data || []);
    } catch (err) {
      console.error('Error buscando artículos:', err);
    } finally {
      setLoading(false);
    }
  };

  const seleccionarArticulo = (articulo: Articulo) => {
    setArticuloSeleccionado(articulo);
    setShowDetalleModal(true);
  };

  const confirmarSeleccion = (cantidad: number, unidadId: number, precioAjustado: number) => {
    if (articuloSeleccionado) {
      onSeleccionar(articuloSeleccionado, cantidad, unidadId, precioAjustado);
    }
  };

  const onArticuloCreado = (nuevoArticulo: Articulo) => {
    setShowCrearModal(false);
    setArticuloSeleccionado(nuevoArticulo);
    setShowDetalleModal(true);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Buscar o Crear Artículo/Servicio
            </h3>
            <button
              onClick={onCerrar}
              className="text-gray-400 hover:text-gray-600"
            >
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>

          {/* Buscador */}
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i className="ri-search-line text-gray-400"></i>
            </div>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, ID o Código..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              autoFocus
            />
            {loading && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>

          {/* Resultados */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {!currentStore?.id && (
              <div className="text-center py-8 text-red-500">
                <i className="ri-store-3-line text-3xl mb-2"></i>
                <p>No hay tienda seleccionada</p>
              </div>
            )}

            {currentStore?.id && busqueda.trim().length < 2 && (
              <div className="text-center py-8 text-gray-500">
                <i className="ri-search-line text-3xl mb-2"></i>
                <p>Escribe al menos 2 caracteres para buscar</p>
              </div>
            )}

            {currentStore?.id && busqueda.trim().length >= 2 && articulos.length === 0 && !loading && (
              <div className="text-center py-8">
                <i className="ri-file-search-line text-3xl text-gray-400 mb-2"></i>
                <p className="text-gray-500 mb-4">No se encontraron artículos</p>
                <button
                  onClick={() => setShowCrearModal(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
                >
                  <i className="ri-add-line mr-2"></i>
                  Crear Nuevo Artículo
                </button>
              </div>
            )}

            {articulos.map((articulo) => (
              <div
                key={articulo.id_articulo}
                onClick={() => seleccionarArticulo(articulo)}
                className="p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">
                        {articulo.descripcion_articulo}
                      </span>
                      {articulo.categoria && (
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                          {articulo.categoria.nombre_categoria}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      Código: {articulo.codigo_articulo} | ID: {articulo.id_articulo}
                    </div>
                    {articulo.unidad && (
                      <div className="text-xs text-gray-400">
                        Unidad base: {articulo.unidad.nombre} ({articulo.unidad.simbolo})
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-600">
                      ₡{articulo.precio_articulo.toLocaleString('es-CR', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })}
                    </div>
                    <div className="text-xs text-gray-500">por unidad</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Botón crear nuevo si hay resultados */}
          {currentStore?.id && busqueda.trim().length >= 2 && articulos.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <button
                onClick={() => setShowCrearModal(true)}
                className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
              >
                <i className="ri-add-line mr-2"></i>
                ¿No encuentras lo que buscas? Crear nuevo artículo
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal crear artículo */}
      {showCrearModal && (
        <CrearArticuloModal
          nombreInicial={busqueda}
          onCreado={onArticuloCreado}
          onCerrar={() => setShowCrearModal(false)}
        />
      )}

      {/* Modal detalle componente */}
      {showDetalleModal && articuloSeleccionado && (
        <DetalleComponenteModal
          articulo={articuloSeleccionado}
          onConfirmar={confirmarSeleccion}
          onCerrar={() => {
            setShowDetalleModal(false);
            setArticuloSeleccionado(null);
          }}
        />
      )}
    </div>
  );
}