import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { showAlert } from '../../../utils/dialog';

interface PrediccionData {
  articulo_id: number;
  codigo_articulo: string;
  descripcion_articulo: string;
  demanda_historica: number[];
  prediccion_30_dias: number;
  prediccion_60_dias: number;
  prediccion_90_dias: number;
  tendencia: 'creciente' | 'decreciente' | 'estable';
  confianza: number;
  rop_sugerido: number;
  max_sugerido: number;
}

export default function PrediccionDemanda() {
  const [predicciones, setPredicciones] = useState<PrediccionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTendencia, setFiltroTendencia] = useState<string>('todas');
  const [ordenPor, setOrdenPor] = useState<'demanda' | 'confianza' | 'tendencia'>('demanda');

  useEffect(() => {
    calcularPredicciones();
  }, []);

  const calcularPredicciones = async () => {
    try {
      setLoading(true);

      // Obtener movimientos históricos de los últimos 6 meses
      const fechaInicio = new Date();
      fechaInicio.setMonth(fechaInicio.getMonth() - 6);

      const { data: movimientos } = await supabase
        .from('inventario_movimientos')
        .select(`
          articulo_id,
          cantidad,
          created_at,
          inventario!inner(codigo_articulo, descripcion_articulo)
        `)
        .eq('tipo', 'venta')
        .gte('created_at', fechaInicio.toISOString())
        .order('created_at');

      if (!movimientos || movimientos.length === 0) {
        setPredicciones([]);
        return;
      }

      // Agrupar por artículo y calcular predicciones
      const articulosMap = new Map<number, any>();

      movimientos.forEach(mov => {
        const articuloId = mov.articulo_id;
        if (!articulosMap.has(articuloId)) {
          articulosMap.set(articuloId, {
            articulo_id: articuloId,
            codigo_articulo: mov.inventario.codigo_articulo,
            descripcion_articulo: mov.inventario.descripcion_articulo,
            movimientos: []
          });
        }
        articulosMap.get(articuloId).movimientos.push({
          cantidad: Math.abs(mov.cantidad),
          fecha: new Date(mov.created_at)
        });
      });

      // Calcular predicciones para cada artículo
      const prediccionesCalculadas: PrediccionData[] = [];

      for (const [articuloId, datos] of articulosMap) {
        const prediccion = calcularPrediccionArticulo(datos);
        if (prediccion) {
          prediccionesCalculadas.push(prediccion);
        }
      }

      setPredicciones(prediccionesCalculadas);
    } catch (error) {
      console.error('Error calculando predicciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const calcularPrediccionArticulo = (datos: any): PrediccionData | null => {
    const movimientos = datos.movimientos;
    if (movimientos.length < 3) return null; // Necesitamos al menos 3 puntos de datos

    // Agrupar por semana para suavizar la demanda
    const demandaSemanal = agruparPorSemana(movimientos);
    if (demandaSemanal.length < 4) return null; // Al menos 4 semanas de datos

    // Calcular tendencia usando regresión lineal simple
    const { pendiente, intercepto, r2 } = regresionLineal(demandaSemanal);
    
    // Calcular promedio móvil para suavizar
    const promedioMovil = calcularPromedioMovil(demandaSemanal, 4);
    
    // Predicciones basadas en tendencia y estacionalidad
    const demandaPromedio = demandaSemanal.reduce((sum, val) => sum + val, 0) / demandaSemanal.length;
    const variabilidad = calcularVariabilidad(demandaSemanal);
    
    // Predicciones (convertir de semanal a mensual)
    const prediccion30 = Math.max(0, (demandaPromedio + pendiente * 4) * 4.33); // 4.33 semanas por mes
    const prediccion60 = Math.max(0, (demandaPromedio + pendiente * 8) * 4.33 * 2);
    const prediccion90 = Math.max(0, (demandaPromedio + pendiente * 12) * 4.33 * 3);

    // Determinar tendencia
    let tendencia: 'creciente' | 'decreciente' | 'estable' = 'estable';
    if (Math.abs(pendiente) > demandaPromedio * 0.1) {
      tendencia = pendiente > 0 ? 'creciente' : 'decreciente';
    }

    // Confianza basada en R² y cantidad de datos
    const confianza = Math.min(95, Math.max(30, r2 * 100 * (movimientos.length / 20)));

    // Sugerir nuevos umbrales basados en predicción
    const leadTime = 2; // Asumimos 2 semanas de lead time
    const safetyFactor = 1.5; // Factor de seguridad
    
    const ropSugerido = Math.ceil(prediccion30 / 4 * leadTime * safetyFactor);
    const maxSugerido = Math.ceil(prediccion60 / 2); // 2 meses de stock máximo

    return {
      articulo_id: datos.articulo_id,
      codigo_articulo: datos.codigo_articulo,
      descripcion_articulo: datos.descripcion_articulo,
      demanda_historica: demandaSemanal,
      prediccion_30_dias: Math.round(prediccion30),
      prediccion_60_dias: Math.round(prediccion60),
      prediccion_90_dias: Math.round(prediccion90),
      tendencia,
      confianza: Math.round(confianza),
      rop_sugerido: ropSugerido,
      max_sugerido: maxSugerido
    };
  };

  const agruparPorSemana = (movimientos: any[]) => {
    const semanas = new Map<string, number>();
    
    movimientos.forEach(mov => {
      const fecha = new Date(mov.fecha);
      const inicioSemana = new Date(fecha);
      inicioSemana.setDate(fecha.getDate() - fecha.getDay());
      const claveSeamana = inicioSemana.toISOString().split('T')[0];
      
      semanas.set(claveSeamana, (semanas.get(claveSeamana) || 0) + mov.cantidad);
    });

    return Array.from(semanas.values()).sort();
  };

  const regresionLineal = (datos: number[]) => {
    const n = datos.length;
    const x = datos.map((_, i) => i);
    const y = datos;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const pendiente = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercepto = (sumY - pendiente * sumX) / n;

    // Calcular R²
    const yMean = sumY / n;
    const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const ssRes = y.reduce((sum, yi, i) => sum + Math.pow(yi - (pendiente * x[i] + intercepto), 2), 0);
    const r2 = 1 - (ssRes / ssTotal);

    return { pendiente, intercepto, r2: Math.max(0, r2) };
  };

  const calcularPromedioMovil = (datos: number[], ventana: number) => {
    const resultado = [];
    for (let i = ventana - 1; i < datos.length; i++) {
      const suma = datos.slice(i - ventana + 1, i + 1).reduce((a, b) => a + b, 0);
      resultado.push(suma / ventana);
    }
    return resultado;
  };

  const calcularVariabilidad = (datos: number[]) => {
    const promedio = datos.reduce((a, b) => a + b, 0) / datos.length;
    const varianza = datos.reduce((sum, val) => sum + Math.pow(val - promedio, 2), 0) / datos.length;
    return Math.sqrt(varianza);
  };

  const aplicarUmbralesSugeridos = async (prediccion: PrediccionData) => {
    try {
      const { error } = await supabase
        .from('inventario_thresholds')
        .upsert({
          articulo_id: prediccion.articulo_id,
          min_qty: Math.ceil(prediccion.rop_sugerido * 0.7),
          max_qty: prediccion.max_sugerido,
          safety_stock: Math.ceil(prediccion.rop_sugerido * 0.3),
          reorder_point: prediccion.rop_sugerido,
          lead_time_dias: 14,
          activo: true
        }, {
          onConflict: 'articulo_id'
        });

      if (error) {
        console.error('Error aplicando umbrales:', error);
        showAlert('Error al aplicar umbrales sugeridos');
      } else {
        showAlert('Umbrales aplicados exitosamente');
        calcularPredicciones();
      }
    } catch (error) {
      console.error('Error aplicando umbrales:', error);
    }
  };

  const prediccionesFiltradas = predicciones
    .filter(p => filtroTendencia === 'todas' || p.tendencia === filtroTendencia)
    .sort((a, b) => {
      switch (ordenPor) {
        case 'demanda':
          return b.prediccion_30_dias - a.prediccion_30_dias;
        case 'confianza':
          return b.confianza - a.confianza;
        case 'tendencia':
          return a.tendencia.localeCompare(b.tendencia);
        default:
          return 0;
      }
    });

  const getTendenciaIcon = (tendencia: string) => {
    switch (tendencia) {
      case 'creciente':
        return 'ri-arrow-up-line text-green-600';
      case 'decreciente':
        return 'ri-arrow-down-line text-red-600';
      default:
        return 'ri-arrow-right-line text-gray-600';
    }
  };

  const getConfianzaColor = (confianza: number) => {
    if (confianza >= 80) return 'text-green-600 bg-green-100';
    if (confianza >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Predicción de Demanda</h1>
          <p className="text-gray-600">Análisis predictivo basado en machine learning</p>
        </div>
        <button
          onClick={calcularPredicciones}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <i className="ri-refresh-line mr-2"></i>
          Recalcular
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filtrar por tendencia
            </label>
            <select
              value={filtroTendencia}
              onChange={(e) => setFiltroTendencia(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="todas">Todas</option>
              <option value="creciente">Creciente</option>
              <option value="estable">Estable</option>
              <option value="decreciente">Decreciente</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ordenar por
            </label>
            <select
              value={ordenPor}
              onChange={(e) => setOrdenPor(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="demanda">Demanda predicha</option>
              <option value="confianza">Confianza</option>
              <option value="tendencia">Tendencia</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de predicciones */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Artículo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tendencia
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Predicción 30d
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Predicción 60d
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Predicción 90d
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confianza
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ROP Sugerido
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {prediccionesFiltradas.map((prediccion) => (
                <tr key={prediccion.articulo_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {prediccion.codigo_articulo}
                      </div>
                      <div className="text-sm text-gray-500">
                        {prediccion.descripcion_articulo}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <i className={`${getTendenciaIcon(prediccion.tendencia)} mr-2`}></i>
                      <span className="text-sm text-gray-900 capitalize">
                        {prediccion.tendencia}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {prediccion.prediccion_30_dias.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {prediccion.prediccion_60_dias.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {prediccion.prediccion_90_dias.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getConfianzaColor(prediccion.confianza)}`}>
                      {prediccion.confianza}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      ROP: {prediccion.rop_sugerido}
                    </div>
                    <div className="text-sm text-gray-500">
                      Max: {prediccion.max_sugerido}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => aplicarUmbralesSugeridos(prediccion)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                      title="Aplicar umbrales sugeridos"
                    >
                      <i className="ri-check-line"></i>
                    </button>
                    <button
                      className="text-gray-600 hover:text-gray-900"
                      title="Ver detalles"
                    >
                      <i className="ri-eye-line"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {prediccionesFiltradas.length === 0 && (
          <div className="text-center py-12">
            <i className="ri-bar-chart-line text-4xl text-gray-400 mb-4"></i>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay predicciones disponibles
            </h3>
            <p className="text-gray-500">
              Se necesitan al menos 3 movimientos de venta en los últimos 6 meses para generar predicciones.
            </p>
          </div>
        )}
      </div>

      {/* Información sobre el algoritmo */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <i className="ri-information-line text-blue-600 text-lg mr-3 mt-0.5"></i>
          <div>
            <h4 className="font-medium text-blue-800 mb-2">Sobre las Predicciones</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <p>• Las predicciones se basan en análisis de regresión lineal de datos históricos</p>
              <p>• Se requieren al menos 4 semanas de datos de ventas para generar predicciones confiables</p>
              <p>• La confianza se calcula basada en la correlación (R²) y cantidad de datos disponibles</p>
              <p>• Los umbrales sugeridos incluyen factores de seguridad y lead time estimado</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
