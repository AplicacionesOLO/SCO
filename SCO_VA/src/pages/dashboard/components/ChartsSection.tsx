
import { useState, useEffect } from 'react';
import { dashboardService, SalesData, InventoryDistribution } from '../../../services/dashboardService';

export default function ChartsSection() {
  const [activeTab, setActiveTab] = useState('ventas');
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [inventoryData, setInventoryData] = useState<InventoryDistribution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadChartsData = async () => {
      try {
        setLoading(true);
        const [sales, inventory] = await Promise.all([
          dashboardService.getSalesData(),
          dashboardService.getInventoryDistribution()
        ]);
        
        setSalesData(sales);
        setInventoryData(inventory);
      } catch (error) {
        console.error('Error cargando datos de gráficos:', error);
      } finally {
        setLoading(false);
      }
    };

    loadChartsData();
  }, []);

  const maxValue = Math.max(...salesData.map(item => item.value));

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Análisis</h3>
        </div>
        <div className="p-6 flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Análisis</h3>
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('ventas')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'ventas'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Ventas
            </button>
            <button
              onClick={() => setActiveTab('inventario')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'inventario'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Inventario
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'ventas' && (
          <div>
            {salesData.length > 0 ? (
              <div className="flex items-end justify-between h-64 space-x-2">
                {salesData.map((item, index) => (
                  <div key={index} className="flex flex-col items-center flex-1">
                    <div className="w-full bg-gray-200 rounded-t-md relative" style={{ height: '200px' }}>
                      <div
                        className="bg-blue-500 rounded-t-md absolute bottom-0 w-full transition-all duration-500"
                        style={{ height: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
                      ></div>
                    </div>
                    <div className="mt-2 text-sm font-medium text-gray-900">
                      {item.month}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Intl.NumberFormat('es-CR', {
                        style: 'currency',
                        currency: 'CRC',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      }).format(item.value)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <i className="ri-bar-chart-line text-4xl mb-2"></i>
                  <p>No hay datos de ventas disponibles</p>
                </div>
              </div>
            )}
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500">Ventas mensuales (últimos 6 meses)</p>
            </div>
          </div>
        )}

        {activeTab === 'inventario' && (
          <div>
            {inventoryData.length > 0 ? (
              <div className="space-y-4">
                {inventoryData.map((item, index) => (
                  <div key={index} className="flex items-center">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {item.category}
                        </span>
                        <div className="text-right">
                          <span className="text-sm text-gray-900 font-medium">
                            {item.value}%
                          </span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({item.count} items)
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${item.color} transition-all duration-500`}
                          style={{ width: `${item.value}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <i className="ri-pie-chart-line text-4xl mb-2"></i>
                  <p>No hay datos de inventario disponibles</p>
                </div>
              </div>
            )}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">Distribución por categorías</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
