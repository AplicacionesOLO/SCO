import { DashboardStats } from '../../../services/dashboardService';

interface StatsCardsProps {
  stats: DashboardStats;
  loading?: boolean;
}

export default function StatsCards({ stats, loading }: StatsCardsProps) {
  const cards = [
    {
      title: 'Total Inventario',
      value: stats.totalInventory.toLocaleString(),
      subtitle: 'artículos',
      icon: 'ri-archive-line',
      color: 'bg-blue-500',
      change: stats.lowStockItems > 0 ? `${stats.lowStockItems} bajo stock` : 'Stock normal',
      changeType: stats.lowStockItems > 0 ? 'warning' : 'positive'
    },
    {
      title: 'Valor Total',
      value: new Intl.NumberFormat('es-CR', {
        style: 'currency',
        currency: 'CRC',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(stats.totalValue),
      subtitle: 'valorizado',
      icon: 'ri-money-dollar-circle-line',
      color: 'bg-green-500',
      change: 'Actualizado',
      changeType: 'positive'
    },
    {
      title: 'Cotizaciones Activas',
      value: stats.activeQuotes.toString(),
      subtitle: 'en proceso',
      icon: 'ri-file-text-line',
      color: 'bg-yellow-500',
      change: stats.activeQuotes > 0 ? 'Activas' : 'Sin cotizaciones',
      changeType: stats.activeQuotes > 0 ? 'positive' : 'neutral'
    },
    {
      title: 'Solicitudes Pendientes',
      value: stats.pendingRequests.toString(),
      subtitle: 'por revisar',
      icon: 'ri-customer-service-line',
      color: 'bg-red-500',
      change: stats.pendingRequests > 0 ? 'Requieren atención' : 'Al día',
      changeType: stats.pendingRequests > 0 ? 'negative' : 'positive'
    },
    {
      title: 'Total Clientes',
      value: stats.totalClients.toString(),
      subtitle: 'registrados',
      icon: 'ri-user-line',
      color: 'bg-purple-500',
      change: 'Activos',
      changeType: 'positive'
    },
    {
      title: 'Productos con BOM',
      value: stats.productsWithBOM.toString(),
      subtitle: 'configurados',
      icon: 'ri-product-hunt-line',
      color: 'bg-indigo-500',
      change: 'Configurados',
      changeType: 'positive'
    }
  ];

  const getChangeColor = (changeType: string) => {
    switch (changeType) {
      case 'positive':
        return 'text-green-600';
      case 'negative':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white overflow-hidden shadow rounded-lg animate-pulse">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gray-200 rounded-md"></div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-16 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {cards.map((card, index) => (
        <div key={index} className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow duration-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 ${card.color} rounded-md flex items-center justify-center`}>
                  <i className={`${card.icon} text-white text-lg`}></i>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {card.title}
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {card.value}
                    </div>
                    <div className="ml-2 flex items-baseline text-sm font-semibold">
                      <span className={getChangeColor(card.changeType)}>
                        {card.change}
                      </span>
                    </div>
                  </dd>
                  <dd className="text-sm text-gray-500">
                    {card.subtitle}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
