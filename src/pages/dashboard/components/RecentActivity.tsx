interface Activity {
  id: number;
  type: string;
  description: string;
  user: string;
  timestamp: string;
  status: 'success' | 'info' | 'warning' | 'error';
}

interface RecentActivityProps {
  activities: Activity[];
  loading?: boolean;
}

export default function RecentActivity({ activities, loading }: RecentActivityProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'info':
        return 'bg-blue-100 text-blue-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (type: string) => {
    switch (type) {
      case 'cotizacion':
        return 'ri-file-text-line';
      case 'inventario':
        return 'ri-archive-line';
      case 'solicitud':
        return 'ri-customer-service-line';
      case 'producto':
        return 'ri-product-hunt-line';
      case 'pedido':
        return 'ri-shopping-cart-line';
      case 'cliente':
        return 'ri-user-line';
      default:
        return 'ri-information-line';
    }
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Actividad Reciente</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-3 animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Actividad Reciente</h3>
        <p className="text-sm text-gray-500 mt-1">Últimas acciones en el sistema</p>
      </div>
      <div className="p-6">
        {activities.length > 0 ? (
          <>
            <div className="flow-root">
              <ul className="-mb-8">
                {activities.map((activity, index) => (
                  <li key={activity.id}>
                    <div className="relative pb-8">
                      {index !== activities.length - 1 && (
                        <span
                          className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                          aria-hidden="true"
                        />
                      )}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${getStatusColor(activity.status)}`}>
                            <i className={`${getStatusIcon(activity.type)} text-sm`}></i>
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-gray-900">
                              {activity.description}
                            </p>
                            <p className="text-sm text-gray-500">
                              por <span className="font-medium">{activity.user}</span>
                            </p>
                          </div>
                          <div className="text-right text-sm whitespace-nowrap text-gray-500">
                            {activity.timestamp}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-6">
              <button className="w-full text-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer whitespace-nowrap transition-colors">
                Ver toda la actividad
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <i className="ri-history-line text-5xl mb-3"></i>
            <p className="text-lg font-medium">No hay actividad reciente</p>
            <p className="text-sm">Las acciones del sistema aparecerán aquí</p>
          </div>
        )}
      </div>
    </div>
  );
}
