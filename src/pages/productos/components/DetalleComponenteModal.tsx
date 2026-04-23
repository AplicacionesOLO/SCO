import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { formatCurrencyWithSymbol, getCurrencySymbol } from '../../../lib/currency';

interface Articulo {
  id_articulo: number;
  codigo_articulo: string;
  descripcion_articulo: string;
  precio_articulo: number;
  categoria?: {
    nombre: string;
  };
  unidad?: {
    nombre: string;
    simbolo: string;
  };
}

interface Props {
  articulo: Articulo;
  moneda?: string;
  onConfirmar: (cantidad: number, unidadId: number, precioAjustado: number) => void;
  onCerrar: () => void;
}

export default function DetalleComponenteModal({ articulo, moneda = 'CRC', onConfirmar, onCerrar }: Props) {
  const [cantidad, setCantidad] = useState('1.00');
  const [unidadId, setUnidadId] = useState('');
  const [unidades, setUnidades] = useState<any[]>([]);
  const [precioAjustado, setPrecioAjustado] = useState(0);
  const [factorConversion, setFactorConversion] = useState(1);
  const [error, setError] = useState('');
  const { currentStore } = useAuth();

  useEffect(() => {
    cargarUnidades();
  }, []);

  useEffect(() => {
    calcularPrecioAjustado();
  }, [cantidad, unidadId, factorConversion]);

  const cargarUnidades = async () => {
    const { data } = await supabase
      .from('unidades_medida')
      .select('*')
      .eq('tienda_id', currentStore?.id ?? '')
      .order('grupo, nombre');
    
    setUnidades(data || []);
    
    // Seleccionar la unidad base del artículo por defecto
    if (articulo.unidad && data) {
      const unidadBase = data.find(u => u.nombre === articulo.unidad?.nombre);
      if (unidadBase) {
        setUnidadId(unidadBase.id.toString());
      }
    }
  };

  const calcularFactorConversion = async (unidadDestinoId: string) => {
    if (!unidadDestinoId || !articulo.unidad) return;

    try {
      // Obtener unidad base del artículo
      const { data: unidadBase } = await supabase
        .from('unidades_medida')
        .select('*')
        .eq('nombre', articulo.unidad.nombre)
        .eq('tienda_id', currentStore?.id ?? '')
        .maybeSingle();

      // Obtener unidad destino
      const { data: unidadDestino } = await supabase
        .from('unidades_medida')
        .select('*')
        .eq('id', parseInt(unidadDestinoId))
        .eq('tienda_id', currentStore?.id ?? '')
        .maybeSingle();

      if (unidadBase && unidadDestino) {
        // Verificar que sean del mismo grupo
        if (unidadBase.grupo !== unidadDestino.grupo) {
          setError(`No se puede convertir de ${unidadBase.grupo} a ${unidadDestino.grupo}`);
          return;
        }

        // Calcular factor de conversión
        // Factor = (cantidad_en_unidad_destino / cantidad_en_unidad_base)
        const factor = unidadDestino.factor_base / unidadBase.factor_base;
        setFactorConversion(factor);
        setError('');
      }
    } catch (err) {
      console.error('Error calculando conversión:', err);
      setError('Error en la conversión de unidades');
    }
  };

  const calcularPrecioAjustado = () => {
    const cantidadNum = parseFloat(cantidad) || 0;
    const precioBase = articulo.precio_articulo;
    
    // Precio ajustado = cantidad_solicitada * factor_conversion * precio_base
    const precio = cantidadNum * factorConversion * precioBase;
    setPrecioAjustado(precio);
  };

  const manejarCambioUnidad = (nuevaUnidadId: string) => {
    setUnidadId(nuevaUnidadId);
    calcularFactorConversion(nuevaUnidadId);
  };

  const manejarCambioCantidad = (valor: string) => {
    // Permitir solo números con hasta 2 decimales
    const regex = /^\d*\.?\d{0,2}$/;
    if (regex.test(valor) || valor === '') {
      setCantidad(valor);
    }
  };

  const confirmar = () => {
    const cantidadNum = parseFloat(cantidad);
    
    if (!cantidadNum || cantidadNum <= 0) {
      setError('La cantidad debe ser mayor a 0');
      return;
    }
    
    if (!unidadId) {
      setError('Selecciona una unidad');
      return;
    }
    
    if (error) {
      return;
    }

    onConfirmar(cantidadNum, parseInt(unidadId), precioAjustado);
  };

  const getUnidadesPorGrupo = () => {
    const grupos: { [key: string]: any[] } = {};
    unidades.forEach(unidad => {
      if (!grupos[unidad.grupo]) {
        grupos[unidad.grupo] = [];
      }
      grupos[unidad.grupo].push(unidad);
    });
    return grupos;
  };

  const unidadesPorGrupo = getUnidadesPorGrupo();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-lg">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Configurar Componente
            </h3>
            <button
              onClick={onCerrar}
              className="text-gray-400 hover:text-gray-600"
            >
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>

          {/* Información del artículo */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 mb-1">
                  {articulo.descripcion_articulo}
                </h4>
                <div className="text-sm text-gray-500">
                  Código: {articulo.codigo_articulo}
                </div>
                {articulo.categoria && (
                  <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mt-1">
                    {articulo.categoria.nombre}
                  </span>
                )}
              </div>
              <div className="text-right">
                <div className="font-semibold text-green-600">
                  {formatCurrencyWithSymbol(articulo.precio_articulo, moneda)}
                </div>
                <div className="text-xs text-gray-500">
                  por {articulo.unidad?.simbolo || 'unidad'}
                </div>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                  moneda === 'USD' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {getCurrencySymbol(moneda)} {moneda}
                </span>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cantidad por unidad para {articulo.descripcion_articulo} *
              </label>
              <input
                type="text"
                value={cantidad}
                onChange={(e) => manejarCambioCantidad(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1.00"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Cantidad necesaria de este componente por unidad del producto final (máximo 2 decimales)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unidad de Medida *
              </label>
              <select
                value={unidadId}
                onChange={(e) => manejarCambioUnidad(e.target.value)}
                className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Seleccionar unidad</option>
                {Object.entries(unidadesPorGrupo).map(([grupo, unidadesGrupo]) => (
                  <optgroup key={grupo} label={grupo.charAt(0).toUpperCase() + grupo.slice(1)}>
                    {unidadesGrupo.map(unidad => (
                      <option key={unidad.id} value={unidad.id}>
                        {unidad.nombre} ({unidad.simbolo})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {factorConversion !== 1 && !error && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-sm text-blue-800">
                  <i className="ri-information-line mr-1"></i>
                  Factor de conversión: {factorConversion.toFixed(6)}
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  {cantidad} {unidades.find(u => u.id === parseInt(unidadId))?.simbolo} = {(parseFloat(cantidad) * factorConversion).toFixed(4)} {articulo.unidad?.simbolo}
                </div>
              </div>
            )}

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="font-medium text-green-900">Precio Total del Componente:</span>
                <span className="text-xl font-bold text-green-900">
                  {formatCurrencyWithSymbol(precioAjustado, moneda)}
                </span>
              </div>
              <div className="text-xs text-green-700 mt-1">
                {cantidad} × {factorConversion.toFixed(4)} × {getCurrencySymbol(moneda)}{articulo.precio_articulo.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-6">
            <button
              onClick={confirmar}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-check-line mr-2"></i>
              Agregar Componente
            </button>
            <button
              onClick={onCerrar}
              className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors whitespace-nowrap"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
