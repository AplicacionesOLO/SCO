
import { useState, useEffect } from 'react';
import { ArticuloInventario } from '../../../types/optimizador';
import { buscarArticulosInventario } from '../../../services/optimizadorService';

interface SelectorLaminaBaseProps {
  laminaSeleccionada: ArticuloInventario | null;
  onSeleccionar: (lamina: ArticuloInventario) => void;
  currentStore: { id: string; nombre: string } | null;
}

export default function SelectorLaminaBase({ laminaSeleccionada, onSeleccionar, currentStore }: SelectorLaminaBaseProps) {
  const [busqueda, setBusqueda] = useState('');
  const [laminas, setLaminas] = useState<ArticuloInventario[]>([]);
  const [loading, setLoading] = useState(false);
  const [mostrarResultados, setMostrarResultados] = useState(false);

  useEffect(() => {
    console.log('🔄 [SELECTOR LAMINA] useEffect disparado', {
      busqueda,
      longitud: busqueda.length,
      currentStore: currentStore?.id,
      currentStoreNombre: currentStore?.nombre
    });

    if (!currentStore?.id) {
      console.warn('⚠️ [SELECTOR LAMINA] No se puede buscar - tienda no disponible');
      setLaminas([]);
      setMostrarResultados(false);
      return;
    }

    if (busqueda.length >= 2) {
      buscarLaminas();
    } else {
      console.log('⚠️ [SELECTOR LAMINA] Búsqueda muy corta, limpiando resultados');
      setLaminas([]);
      setMostrarResultados(false);
    }
  }, [busqueda, currentStore]);

  const buscarLaminas = async () => {
    if (!currentStore?.id) {
      console.error('❌ [SELECTOR LAMINA] No se puede buscar - tienda no disponible');
      return;
    }

    console.log('🚀 [SELECTOR LAMINA] Iniciando búsqueda de láminas', {
      busqueda,
      currentStore: currentStore?.id,
      currentStoreNombre: currentStore?.nombre
    });

    setLoading(true);
    try {
      const { data } = await buscarArticulosInventario(busqueda, 'lamina', currentStore);
      
      console.log('✅ [SELECTOR LAMINA] Búsqueda completada', {
        resultados: data?.length || 0,
        laminas: data?.map(l => ({
          codigo: l.codigo_articulo,
          descripcion: l.descripcion_articulo,
          dimensiones: `${l.largo_lamina}x${l.ancho_lamina}`,
          categoria: l.categoria_nombre
        }))
      });

      setLaminas(data || []);
      setMostrarResultados(true);
    } catch (error) {
      console.error('❌ [SELECTOR LAMINA] Error en búsqueda:', error);
      setLaminas([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    console.log('⌨️ [SELECTOR LAMINA] Input cambió:', valor);
    setBusqueda(valor);
  };

  const handleInputFocus = () => {
    console.log('👁️ [SELECTOR LAMINA] Input enfocado');
    if (laminas.length > 0) {
      setMostrarResultados(true);
    }
  };

  const handleSeleccionar = (lamina: ArticuloInventario) => {
    console.log('✨ [SELECTOR LAMINA] Lámina seleccionada:', {
      codigo: lamina.codigo_articulo,
      descripcion: lamina.descripcion_articulo,
      dimensiones: `${lamina.largo_lamina}x${lamina.ancho_lamina}`
    });
    onSeleccionar(lamina);
    setBusqueda('');
    setMostrarResultados(false);
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Lámina Base
      </label>
      
      {/* Input de búsqueda */}
      <div className="relative">
        <input
          type="text"
          value={busqueda}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder="Buscar lámina (ej: melamina, MDF, tablero...)"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={!currentStore?.id}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <i className="ri-loader-4-line animate-spin text-gray-400"></i>
          </div>
        )}
      </div>

      {/* Mensaje cuando no hay tienda */}
      {!currentStore?.id && (
        <p className="mt-2 text-sm text-amber-600">
          <i className="ri-alert-line mr-1"></i>
          Debes tener una tienda asignada para buscar láminas
        </p>
      )}

      {/* Lámina seleccionada */}
      {laminaSeleccionada && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="font-medium text-gray-900">
                {laminaSeleccionada.codigo_articulo}
              </p>
              <p className="text-sm text-gray-600">
                {laminaSeleccionada.descripcion_articulo}
              </p>
              <p className="text-sm text-blue-600 mt-1">
                <i className="ri-ruler-line mr-1"></i>
                {laminaSeleccionada.largo_lamina} × {laminaSeleccionada.ancho_lamina} mm
              </p>
              {laminaSeleccionada.categoria_nombre && (
                <span className="inline-block mt-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                  {laminaSeleccionada.categoria_nombre}
                </span>
              )}
            </div>
            <button
              onClick={() => onSeleccionar(null as any)}
              className="ml-2 text-gray-400 hover:text-red-500"
              title="Limpiar selección"
            >
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>
        </div>
      )}

      {/* Resultados de búsqueda */}
      {mostrarResultados && laminas.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto backdrop-blur-sm bg-white/95">
          {laminas.map((lamina) => (
            <button
              key={lamina.id}
              onClick={() => handleSeleccionar(lamina)}
              className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {lamina.codigo_articulo}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {lamina.descripcion_articulo}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-sm text-blue-600">
                      <i className="ri-ruler-line mr-1"></i>
                      {lamina.largo_lamina} × {lamina.ancho_lamina} mm
                    </span>
                    {lamina.categoria_nombre && (
                      <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                        {lamina.categoria_nombre}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Sin resultados */}
      {mostrarResultados && laminas.length === 0 && !loading && busqueda.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 backdrop-blur-sm bg-white/95">
          <p className="text-gray-500 text-center">
            <i className="ri-search-line text-2xl mb-2 block"></i>
            No se encontraron láminas para "{busqueda}"
          </p>
          <p className="text-xs text-gray-400 text-center mt-2">
            Intenta con: melamina, MDF, tablero, aglomerado, etc.
          </p>
        </div>
      )}
    </div>
  );
}
