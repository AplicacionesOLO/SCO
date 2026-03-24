
import { TopQuotingClient } from '../../../services/dashboardService';

interface TopQuotingClientsProps {
  clients: TopQuotingClient[];
  loading?: boolean;
}

export default function TopQuotingClients({ clients, loading }: TopQuotingClientsProps) {
  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Top 5 Clientes Generadores</h3>
        </div>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
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
        <h3 className="text-lg font-medium text-gray-900">Top 5 Clientes Generadores</h3>
        <p className="text-sm text-gray-500">Clientes que más cotizaciones han solicitado</p>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {clients.length === 0 ? (
            <div className="text-center py-8">
              <i className="ri-user-heart-line text-4xl text-gray-300 mb-4"></i>
              <p className="text-gray-500">No hay datos de clientes con cotizaciones</p>
            </div>
          ) : (
            clients.map((client, index) => (
              <div key={client.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100 hover:from-green-100 hover:to-emerald-100 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                    index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : 
                    index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-600' : 
                    index === 2 ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                    'bg-gradient-to-r from-green-400 to-green-600'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{client.nombre}</h4>
                    {client.empresa && (
                      <p className="text-sm text-gray-600">{client.empresa}</p>
                    )}
                    <div className="flex items-center mt-1">
                      <i className="ri-building-line text-xs text-gray-400 mr-1"></i>
                      <span className="text-xs text-gray-500">Cliente #{client.id}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <p className="text-xl font-bold text-blue-600">{client.total_cotizaciones}</p>
                      <p className="text-xs text-gray-500">Cotizaciones</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-green-600">
                        {new Intl.NumberFormat('es-CR', {
                          style: 'currency',
                          currency: 'CRC',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        }).format(client.valor_total)}
                      </p>
                      <p className="text-xs text-gray-500">Valor Total</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
