
import { TopQuotingUser } from '../../../services/dashboardService';

interface TopQuotingUsersProps {
  users: TopQuotingUser[];
  loading?: boolean;
}

export default function TopQuotingUsers({ users, loading }: TopQuotingUsersProps) {
  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Top 3 Usuarios Generadores</h3>
        </div>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
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
        <h3 className="text-lg font-medium text-gray-900">Top 3 Usuarios Generadores</h3>
        <p className="text-sm text-gray-500">Usuarios que más cotizaciones han generado</p>
      </div>
      <div className="p-6">
        <div className="space-y-6">
          {users.length === 0 ? (
            <div className="text-center py-8">
              <i className="ri-user-line text-4xl text-gray-300 mb-4"></i>
              <p className="text-gray-500">No hay datos de usuarios con cotizaciones</p>
            </div>
          ) : (
            users.map((user, index) => (
              <div key={user.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                    index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : 
                    index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-600' : 
                    'bg-gradient-to-r from-orange-400 to-orange-600'
                  }`}>
                    <i className="ri-trophy-line text-lg"></i>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{user.nombre}</h4>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    <div className="flex items-center mt-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800' :
                        index === 1 ? 'bg-gray-100 text-gray-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        #{index + 1} Lugar
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{user.total_cotizaciones}</p>
                        <p className="text-xs text-gray-500">Cotizaciones</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold text-green-600">
                          {new Intl.NumberFormat('es-CR', {
                            style: 'currency',
                            currency: 'CRC',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                          }).format(user.valor_total)}
                        </p>
                        <p className="text-xs text-gray-500">Valor Total</p>
                      </div>
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
