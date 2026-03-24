import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface KPIData {
  rotacionInventario: number;
  valorInventarioTotal: number;
  articulosBajoMinimo: number;
  ordenesReabastecimiento: number;
  alertasActivas: number;
  eficienciaStock: number;
  costoAlmacenamiento: number;
  tiempoPromedioReposicion: number;
}

interface MovimientoTendencia {
  fecha: string;
  entradas: number;
  salidas: number;
  valor: number;
}

export default function DashboardKPIs() {
  const [kpis, setKpis] = useState<KPIData>({
    rotacionInventario: 0,
    valorInventarioTotal: 0,
    articulosBajoMinimo: 0,
    ordenesReabastecimiento: 0,
    alertasActivas: 0,
    eficienciaStock: 0,
    costoAlmacenamiento: 0,
    tiempoPromedioReposicion: 0
  });
  const [tendencias, setTendencias] = useState<MovimientoTendencia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadKPIs();
    loadTendencias();
  }, []);

  const loadKPIs = async () => {
    try {
      // Valor total: obtener niveles + precio del artículo por separado
      const { data: nivelesData } = await supabase
        .from('inventario_niveles')
        .select('articulo_id, on_hand');

      const { data: inventarioData } = await supabase
        .from('inventario')
        .select('id_articulo, precio_articulo');

      const precioMap: Record<number, number> = {};
      inventarioData?.forEach(item => {
        precioMap[item.id_articulo] = item.precio_articulo || 0;
      });

      const valorTotal = nivelesData?.reduce((sum, item) => {
        return sum + (Number(item.on_hand) * (precioMap[item.articulo_id] || 0));
      }, 0) || 0;

      // Artículos bajo mínimo: obtener thresholds y niveles por separado
      const { data: allThresholds } = await supabase
        .from('inventario_thresholds')
        .select('articulo_id, min_qty, max_qty, safety_stock, reorder_point')
        .eq('activo', true);

      const articuloIds = allThresholds?.map(t => t.articulo_id) || [];
      let nivelesPorArticulo: Record<number, number> = {};

      if (articuloIds.length > 0) {
        const { data: nivelesItems } = await supabase
          .from('inventario_niveles')
          .select('articulo_id, on_hand, reservado')
          .in('articulo_id', articuloIds);

        nivelesItems?.forEach(n => {
          nivelesPorArticulo[n.articulo_id] = Number(n.on_hand) - Number(n.reservado);
        });
      }

      const articulosBajoMinimo = allThresholds?.filter(t => {
        const disponible = nivelesPorArticulo[t.articulo_id] ?? 0;
        return disponible < Number(t.min_qty);
      }).length || 0;

      const articulosOptimos = allThresholds?.filter(t => {
        const disponible = nivelesPorArticulo[t.articulo_id] ?? 0;
        return disponible >= Number(t.min_qty) && disponible <= Number(t.max_qty);
      }).length || 0;

      const eficiencia = allThresholds?.length
        ? (articulosOptimos / allThresholds.length) * 100
        : 0;

      // Alertas activas
      const { data: alertas } = await supabase
        .from('inventario_alertas')
        .select('id')
        .eq('leida', false);

      // Órdenes pendientes
      const { data: ordenes } = await supabase
        .from('replenishment_orders')
        .select('id')
        .in('estado', ['borrador', 'emitida']);

      // Movimientos del último mes para rotación
      const fechaInicio = new Date();
      fechaInicio.setMonth(fechaInicio.getMonth() - 1);

      const { data: movimientos } = await supabase
        .from('inventario_movimientos')
        .select('cantidad, tipo')
        .eq('tipo', 'venta')
        .gte('created_at', fechaInicio.toISOString());

      const ventasUltimoMes = movimientos?.reduce((sum, mov) => sum + Math.abs(Number(mov.cantidad)), 0) || 0;
      const rotacion = valorTotal > 0 ? (ventasUltimoMes * 12) / valorTotal : 0;

      // Tiempo promedio de reposición desde thresholds
      const leadTimePromedio = allThresholds?.length
        ? allThresholds.reduce((sum, t) => sum + (t.safety_stock || 7), 0) / allThresholds.length
        : 7;

      setKpis({
        rotacionInventario: rotacion,
        valorInventarioTotal: valorTotal,
        articulosBajoMinimo,
        ordenesReabastecimiento: ordenes?.length || 0,
        alertasActivas: alertas?.length || 0,
        eficienciaStock: eficiencia,
        costoAlmacenamiento: valorTotal * 0.15,
        tiempoPromedioReposicion: Math.round(leadTimePromedio)
      });
    } catch (error) {
      console.error('Error cargando KPIs:', error);
    }
  };

  const loadTendencias = async () => {
    try {
      const fechaInicio = new Date();
      fechaInicio.setDate(fechaInicio.getDate() - 30);

      // Obtener movimientos sin join a precio (calculamos valor con precio del inventario)
      const { data: movimientos } = await supabase
        .from('inventario_movimientos')
        .select('created_at, cantidad, tipo, articulo_id')
        .gte('created_at', fechaInicio.toISOString())
        .order('created_at');

      // Obtener precios de artículos involucrados
      const articuloIds = [...new Set(movimientos?.map(m => m.articulo_id) || [])];
      let preciosMov: Record<number, number> = {};

      if (articuloIds.length > 0) {
        const { data: precios } = await supabase
          .from('inventario')
          .select('id_articulo, precio_articulo')
          .in('id_articulo', articuloIds);

        precios?.forEach(p => {
          preciosMov[p.id_articulo] = p.precio_articulo || 0;
        });
      }

      const movimientosPorFecha = movimientos?.reduce((acc, mov) => {
        const fecha = new Date(mov.created_at).toISOString().split('T')[0];
        if (!acc[fecha]) {
          acc[fecha] = { entradas: 0, salidas: 0, valor: 0 };
        }

        const precio = preciosMov[mov.articulo_id] || 0;
        const valor = Math.abs(Number(mov.cantidad)) * precio;

        if (['compra', 'ajuste'].includes(mov.tipo) && Number(mov.cantidad) > 0) {
          acc[fecha].entradas += Math.abs(Number(mov.cantidad));
        } else if (['venta', 'reserva'].includes(mov.tipo)) {
          acc[fecha].salidas += Math.abs(Number(mov.cantidad));
        }

        acc[fecha].valor += valor;
        return acc;
      }, {} as Record<string, { entradas: number; salidas: number; valor: number }>) || {};

      const tendenciasArray = Object.entries(movimientosPorFecha)
        .map(([fecha, datos]) => ({ fecha, ...datos }))
        .sort((a, b) => a.fecha.localeCompare(b.fecha));

      setTendencias(tendenciasArray);
    } catch (error) {
      console.error('Error cargando tendencias:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC'
    }).format(value);
  };

  const formatNumber = (value: number, decimals = 1) => {
    return new Intl.NumberFormat('es-CR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
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
          <h1 className="text-2xl font-bold text-gray-900">Dashboard de KPIs</h1>
          <p className="text-gray-600">Métricas de rotación y eficiencia del inventario</p>
        </div>
        <button
          onClick={() => {
            loadKPIs();
            loadTendencias();
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <i className="ri-refresh-line mr-2"></i>
          Actualizar
        </button>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Rotación de Inventario */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Rotación Anual</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(kpis.rotacionInventario)}x</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <i className="ri-refresh-line text-blue-600 text-xl"></i>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {kpis.rotacionInventario > 6 ? 'Excelente' : kpis.rotacionInventario > 3 ? 'Bueno' : 'Mejorable'}
          </p>
        </div>

        {/* Valor Total */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Valor Total</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(kpis.valorInventarioTotal)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <i className="ri-money-dollar-circle-line text-green-600 text-xl"></i>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Inventario total</p>
        </div>

        {/* Eficiencia */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Eficiencia Stock</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(kpis.eficienciaStock)}%</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <i className="ri-speed-up-line text-purple-600 text-xl"></i>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {kpis.eficienciaStock > 80 ? 'Excelente' : kpis.eficienciaStock > 60 ? 'Bueno' : 'Crítico'}
          </p>
        </div>

        {/* Alertas Activas */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Alertas Activas</p>
              <p className="text-2xl font-bold text-gray-900">{kpis.alertasActivas}</p>
            </div>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              kpis.alertasActivas > 5 ? 'bg-red-100' : kpis.alertasActivas > 0 ? 'bg-yellow-100' : 'bg-green-100'
            }`}>
              <i className={`text-xl ${
                kpis.alertasActivas > 5 ? 'ri-alarm-warning-line text-red-600' : 
                kpis.alertasActivas > 0 ? 'ri-error-warning-line text-yellow-600' : 
                'ri-checkbox-circle-line text-green-600'
              }`}></i>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Requieren atención</p>
        </div>
      </div>

      {/* Métricas Adicionales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resumen de Stock */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen de Stock</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Artículos bajo mínimo</span>
              <span className="font-semibold text-red-600">{kpis.articulosBajoMinimo}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Órdenes pendientes</span>
              <span className="font-semibold text-blue-600">{kpis.ordenesReabastecimiento}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Tiempo promedio reposición</span>
              <span className="font-semibold text-gray-900">{kpis.tiempoPromedioReposicion} días</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Costo almacenamiento anual</span>
              <span className="font-semibold text-gray-900">{formatCurrency(kpis.costoAlmacenamiento)}</span>
            </div>
          </div>
        </div>

        {/* Tendencia de Movimientos */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tendencia de Movimientos (30 días)</h3>
          <div className="space-y-3">
            {tendencias.slice(-7).map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {new Date(item.fecha).toLocaleDateString('es-CR')}
                </span>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-900">{item.entradas}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-900">{item.salidas}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(item.valor)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-gray-600">Entradas</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                <span className="text-gray-600">Salidas</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recomendaciones */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recomendaciones Inteligentes</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {kpis.rotacionInventario < 3 && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <i className="ri-lightbulb-line text-yellow-600 text-lg mr-3 mt-0.5"></i>
                <div>
                  <h4 className="font-medium text-yellow-800">Mejorar Rotación</h4>
                  <p className="text-sm text-yellow-700">
                    La rotación está por debajo del promedio. Considera revisar políticas de compra y promociones.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {kpis.articulosBajoMinimo > 5 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <i className="ri-alarm-warning-line text-red-600 text-lg mr-3 mt-0.5"></i>
                <div>
                  <h4 className="font-medium text-red-800">Stock Crítico</h4>
                  <p className="text-sm text-red-700">
                    Múltiples artículos bajo mínimo. Generar órdenes de reabastecimiento urgente.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {kpis.eficienciaStock > 85 && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start">
                <i className="ri-checkbox-circle-line text-green-600 text-lg mr-3 mt-0.5"></i>
                <div>
                  <h4 className="font-medium text-green-800">Excelente Gestión</h4>
                  <p className="text-sm text-green-700">
                    La eficiencia de stock es excelente. Mantener las políticas actuales.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {kpis.ordenesReabastecimiento === 0 && kpis.articulosBajoMinimo > 0 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <i className="ri-truck-line text-blue-600 text-lg mr-3 mt-0.5"></i>
                <div>
                  <h4 className="font-medium text-blue-800">Generar Órdenes</h4>
                  <p className="text-sm text-blue-700">
                    Hay artículos bajo mínimo sin órdenes de reabastecimiento. Generar automáticamente.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
