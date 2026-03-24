import { useState, useEffect } from 'react';
import DashboardLayout from './components/DashboardLayout';
import ModularDashboard from './components/ModularDashboard';
import ChartsSection from './components/ChartsSection';
import RecentActivity from './components/RecentActivity';
import TopQuotedProducts from './components/TopQuotedProducts';
import TopUsedArticles from './components/TopUsedArticles';
import TopQuotingUsers from './components/TopQuotingUsers';
import TopQuotingClients from './components/TopQuotingClients';
import { usePermissions } from '../../hooks/usePermissions';
import { 
  dashboardService, 
  RecentActivity as RecentActivityType,
  TopQuotedProduct,
  TopUsedArticle,
  TopQuotingUser,
  TopQuotingClient
} from '../../services/dashboardService';

export default function DashboardPage() {
  const { hasPermission } = usePermissions();
  const [recentActivity, setRecentActivity] = useState<RecentActivityType[]>([]);
  const [topQuotedProducts, setTopQuotedProducts] = useState<TopQuotedProduct[]>([]);
  const [topUsedArticles, setTopUsedArticles] = useState<TopUsedArticle[]>([]);
  const [topQuotingUsers, setTopQuotingUsers] = useState<TopQuotingUser[]>([]);
  const [topQuotingClients, setTopQuotingClients] = useState<TopQuotingClient[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // Verificar permisos para secciones avanzadas
  const canViewCharts = hasPermission('dashboard:charts');
  const canViewStats = hasPermission('dashboard:stats');

  useEffect(() => {
    loadActivityData();
    if (canViewStats) {
      loadAnalyticsData();
    }
  }, [canViewStats]);

  const loadActivityData = async () => {
    try {
      setActivityLoading(true);
      const activityData = await dashboardService.getRecentActivity();
      setRecentActivity(activityData);
    } catch (error) {
      // silencioso
    } finally {
      setActivityLoading(false);
    }
  };

  const loadAnalyticsData = async () => {
    try {
      setAnalyticsLoading(true);
      
      const [productsData, articlesData, usersData, clientsData] = await Promise.all([
        dashboardService.getTopQuotedProducts(),
        dashboardService.getTopUsedArticles(),
        dashboardService.getTopQuotingUsers(),
        dashboardService.getTopQuotingClients()
      ]);

      setTopQuotedProducts(productsData);
      setTopUsedArticles(articlesData);
      setTopQuotingUsers(usersData);
      setTopQuotingClients(clientsData);
    } catch (error) {
      // silencioso
    } finally {
      setAnalyticsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Dashboard Modular con Cards de Módulos */}
        <ModularDashboard />

        {/* Gráficos y Actividad Reciente - Solo si tiene permisos */}
        {canViewCharts && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ChartsSection />
            <RecentActivity activities={recentActivity} loading={activityLoading} />
          </div>
        )}

        {/* Sección de Análisis - Solo si tiene permisos */}
        {canViewStats && (
          <>
            <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-xl p-6 text-white shadow-lg">
              <h2 className="text-2xl font-bold mb-2">Análisis de Rendimiento</h2>
              <p className="text-purple-100">Métricas clave de productividad y ventas</p>
            </div>

            {/* Top Productos y Artículos */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <TopQuotedProducts products={topQuotedProducts} loading={analyticsLoading} />
              <TopUsedArticles articles={topUsedArticles} loading={analyticsLoading} />
            </div>

            {/* Top Usuarios y Clientes */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <TopQuotingUsers users={topQuotingUsers} loading={analyticsLoading} />
              <TopQuotingClients clients={topQuotingClients} loading={analyticsLoading} />
            </div>

            {/* Resumen Ejecutivo */}
            <div className="bg-white shadow-sm rounded-xl border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Resumen Ejecutivo</h3>
                <p className="text-sm text-gray-500">Indicadores clave de rendimiento</p>
              </div>
              <div className="p-6">
                {analyticsLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <i className="ri-trophy-line text-3xl text-blue-600 mb-2"></i>
                      <h4 className="font-semibold text-gray-900">Producto Estrella</h4>
                      <p className="text-sm text-gray-600 mt-1 truncate">
                        {topQuotedProducts.length > 0 ? topQuotedProducts[0].nombre : 'Sin datos'}
                      </p>
                      <p className="text-xs text-blue-600 font-medium">
                        {topQuotedProducts.length > 0 ? `${topQuotedProducts[0].total_cotizaciones} cotizaciones` : ''}
                      </p>
                    </div>
                    
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <i className="ri-archive-line text-3xl text-green-600 mb-2"></i>
                      <h4 className="font-semibold text-gray-900">Artículo Clave</h4>
                      <p className="text-sm text-gray-600 mt-1 truncate">
                        {topUsedArticles.length > 0 ? topUsedArticles[0].nombre : 'Sin datos'}
                      </p>
                      <p className="text-xs text-green-600 font-medium">
                        {topUsedArticles.length > 0 ? `${topUsedArticles[0].total_productos} productos` : ''}
                      </p>
                    </div>
                    
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <i className="ri-user-star-line text-3xl text-purple-600 mb-2"></i>
                      <h4 className="font-semibold text-gray-900">Usuario Destacado</h4>
                      <p className="text-sm text-gray-600 mt-1 truncate">
                        {topQuotingUsers.length > 0 ? topQuotingUsers[0].nombre : 'Sin datos'}
                      </p>
                      <p className="text-xs text-purple-600 font-medium">
                        {topQuotingUsers.length > 0 ? `${topQuotingUsers[0].total_cotizaciones} cotizaciones` : ''}
                      </p>
                    </div>
                    
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <i className="ri-user-heart-line text-3xl text-yellow-600 mb-2"></i>
                      <h4 className="font-semibold text-gray-900">Cliente VIP</h4>
                      <p className="text-sm text-gray-600 mt-1 truncate">
                        {topQuotingClients.length > 0 ? topQuotingClients[0].nombre : 'Sin datos'}
                      </p>
                      <p className="text-xs text-yellow-600 font-medium">
                        {topQuotingClients.length > 0 ? `${topQuotingClients[0].total_cotizaciones} cotizaciones` : ''}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
