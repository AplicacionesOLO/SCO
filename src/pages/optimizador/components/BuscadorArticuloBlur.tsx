import { useState, useEffect, useRef } from 'react';
import { ArticuloInventario } from '../../../types/optimizador';
import { buscarArticulosInventario } from '../../../services/optimizadorService';

interface Props {
  tipoArticulo?: 'lamina' | 'tapacanto' | 'hh' | 'consumible' | 'perforacion' | 'mecanizado' | null; // 🔧 Agregado 'mecanizado'
  onSeleccionar: (articulo: ArticuloInventario) => void;
  onCancelar?: () => void;
  placeholder?: string;
  permitirLimpiar?: boolean;
  onLimpiar?: () => void;
  tiendaActual?: { id: string; nombre: string } | null;
}

export default function BuscadorArticuloBlur({
  tipoArticulo = null, // 🔧 Por defecto busca en TODAS las categorías
  onSeleccionar,
  onCancelar,
  placeholder = 'Buscar artículo...',
  permitirLimpiar = false,
  onLimpiar,
  tiendaActual
}: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [articulos, setArticulos] = useState<ArticuloInventario[]>([]);
  const [loading, setLoading] = useState(false);
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log('🎯 [BUSCADOR BLUR] Componente montado', {
      tipoArticulo,
      placeholder,
      tiendaActual: tiendaActual?.id
    });
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    console.log('🔄 [BUSCADOR BLUR] useEffect búsqueda', {
      busqueda,
      longitud: busqueda.length,
      tipoArticulo,
      tiendaActual: tiendaActual?.id
    });

    const timer = setTimeout(() => {
      if (busqueda.length >= 2) {
        console.log('⏰ [BUSCADOR BLUR] Timer completado, iniciando búsqueda');
        buscarArticulos();
      } else {
        console.log('⚠️ [BUSCADOR BLUR] Búsqueda muy corta, limpiando resultados');
        setArticulos([]);
        setBusquedaRealizada(false);
        setMostrarResultados(false);
      }
    }, 300);

    return () => {
      console.log('🧹 [BUSCADOR BLUR] Limpiando timer');
      clearTimeout(timer);
    };
  }, [busqueda, tiendaActual]);

  useEffect(() => {
    // 🔧 Solo agregar listener si onCancelar está definido
    if (!onCancelar) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        console.log('👆 [BUSCADOR BLUR] Click fuera del componente, cancelando');
        onCancelar();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onCancelar]);

  const buscarArticulos = async () => {
    if (!tiendaActual) {
      console.error('❌ [BUSCADOR BLUR] No hay tienda seleccionada');
      setArticulos([]);
      setBusquedaRealizada(false);
      return;
    }

    console.log('🚀 [BUSCADOR BLUR] Iniciando búsqueda', {
      busqueda,
      tipoArticulo: tipoArticulo || 'TODAS LAS CATEGORÍAS',
      tiendaActual: tiendaActual?.id
    });

    setLoading(true);
    setBusquedaRealizada(false);
    try {
      // 🔧 Pasar tipoArticulo (puede ser null para búsqueda general)
      const { data } = await buscarArticulosInventario(busqueda, tipoArticulo, tiendaActual);
      
      console.log('✅ [BUSCADOR BLUR] Búsqueda completada', {
        resultados: data?.length || 0,
        articulos: data?.map(a => ({
          codigo: a.codigo_articulo,
          descripcion: a.descripcion_articulo,
          categoria: a.categoria_nombre,
          tipo: a.tipo_articulo
        }))
      });

      setArticulos(data || []);
      setMostrarResultados(true);
      setBusquedaRealizada(true);
    } catch (error) {
      console.error('❌ [BUSCADOR BLUR] Error buscando artículos:', error);
      setArticulos([]);
      setBusquedaRealizada(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSeleccionar = (articulo: ArticuloInventario) => {
    console.log('✨ [BUSCADOR BLUR] Artículo seleccionado', {
      id: articulo.id,
      codigo: articulo.codigo_articulo,
      descripcion: articulo.descripcion_articulo,
      tipo: articulo.tipo_articulo
    });

    onSeleccionar(articulo);
    setMostrarResultados(false);
    setBusquedaRealizada(false);
    // 🔧 Limpiar búsqueda después de seleccionar
    setBusqueda('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && onCancelar) {
      console.log('⌨️ [BUSCADOR BLUR] ESC presionado, cancelando');
      onCancelar();
    }
  };

  return (
    <div ref={containerRef} className="relative z-50">
      <div className="flex gap-1">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={busqueda}
            onChange={(e) => {
              console.log('⌨️ [BUSCADOR BLUR] Input onChange', {
                valor: e.target.value,
                longitud: e.target.value.length
              });
              setBusqueda(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              console.log('👁️ [BUSCADOR BLUR] Input enfocado');
            }}
            placeholder={placeholder}
            className="w-full px-3 py-1.5 pl-9 text-sm border-2 border-blue-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-600 shadow-lg"
            autoComplete="off"
          />
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-blue-500"></i>
          {loading && (
            <i className="ri-loader-4-line animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-blue-500"></i>
          )}
        </div>
        
        {permitirLimpiar && onLimpiar && (
          <button
            onClick={() => {
              console.log('🧹 [BUSCADOR BLUR] Botón limpiar presionado');
              onLimpiar();
            }}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm whitespace-nowrap"
            title="Limpiar selección"
          >
            <i className="ri-close-line"></i>
          </button>
        )}
        
        {/* 🔧 Solo mostrar botón cancelar si la función existe */}
        {onCancelar && (
          <button
            onClick={() => {
              console.log('❌ [BUSCADOR BLUR] Botón cancelar presionado');
              onCancelar();
            }}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            title="Cancelar"
          >
            <i className="ri-close-line"></i>
          </button>
        )}
      </div>

      {/* Resultados con backdrop blur */}
      {mostrarResultados && articulos.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-md border-2 border-blue-500 rounded-lg shadow-2xl max-h-80 overflow-y-auto z-50 min-w-[600px]">
          <div className="p-2">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2 bg-gray-50 rounded-t-lg">
              {articulos.length} resultado{articulos.length !== 1 ? 's' : ''} encontrado{articulos.length !== 1 ? 's' : ''}
            </div>
            {articulos.map((articulo) => (
              <button
                key={articulo.id}
                onClick={() => handleSeleccionar(articulo)}
                className="w-full p-3 hover:bg-blue-50 transition-colors text-left border-b border-gray-100 last:border-0 rounded-lg"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
                      {articulo.codigo_articulo.substring(0, 2).toUpperCase()}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded font-semibold whitespace-nowrap">
                        {articulo.codigo_articulo}
                      </span>
                      {articulo.categoria_nombre && (
                        <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded whitespace-nowrap">
                          {articulo.categoria_nombre}
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-medium text-gray-900 mb-1">
                      {articulo.descripcion_articulo}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-600 flex-wrap">
                      {articulo.largo_lamina && articulo.ancho_lamina && (
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          <i className="ri-ruler-line"></i>
                          {articulo.largo_lamina} × {articulo.ancho_lamina} mm
                        </span>
                      )}
                      {articulo.espesor && (
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          <i className="ri-stack-line"></i>
                          {articulo.espesor} mm
                        </span>
                      )}
                      {articulo.precio_unitario != null && (
                        <span className="flex items-center gap-1 text-green-600 font-semibold whitespace-nowrap">
                          <i className="ri-price-tag-3-line"></i>
                          ₡{articulo.precio_unitario.toLocaleString('es-CR')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sin resultados */}
      {mostrarResultados && busquedaRealizada && busqueda.length >= 2 && !loading && articulos.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-md border-2 border-gray-300 rounded-lg shadow-xl p-6 text-center z-50 min-w-[400px]">
          <i className="ri-search-line text-4xl text-gray-400 mb-2"></i>
          <p className="text-sm text-gray-600">
            No se encontraron artículos para "{busqueda}"
          </p>
          {tipoArticulo && (
            <p className="text-xs text-gray-500 mt-1">
              Tipo: {tipoArticulo}
            </p>
          )}
        </div>
      )}

      {/* Ayuda inicial */}
      {!busquedaRealizada && busqueda.length > 0 && busqueda.length < 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-md border-2 border-gray-300 rounded-lg shadow-xl p-4 text-center z-50 min-w-[400px]">
          <i className="ri-information-line text-2xl text-blue-500 mb-2"></i>
          <p className="text-xs text-gray-600">
            Escribe al menos 2 caracteres para buscar
          </p>
        </div>
      )}
    </div>
  );
}
