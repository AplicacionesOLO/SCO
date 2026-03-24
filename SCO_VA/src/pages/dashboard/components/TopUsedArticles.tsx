
import { TopUsedArticle } from '../../../services/dashboardService';

interface TopUsedArticlesProps {
  articles: TopUsedArticle[];
  loading?: boolean;
}

export default function TopUsedArticles({ articles, loading }: TopUsedArticlesProps) {
  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">10 Artículos Más Usados</h3>
        </div>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-gray-200 rounded"></div>
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
        <h3 className="text-lg font-medium text-gray-900">10 Artículos Más Usados</h3>
        <p className="text-sm text-gray-500">Artículos más utilizados en productos (BOM)</p>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {articles.length === 0 ? (
            <div className="text-center py-8">
              <i className="ri-archive-line text-4xl text-gray-300 mb-4"></i>
              <p className="text-gray-500">No hay datos de artículos en productos</p>
            </div>
          ) : (
            articles.map((article, index) => (
              <div key={article.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                    index === 0 ? 'bg-yellow-500' : 
                    index === 1 ? 'bg-gray-400' : 
                    index === 2 ? 'bg-orange-600' : 'bg-green-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{article.nombre}</h4>
                    <p className="text-sm text-gray-500">Código: {article.codigo}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <p className="text-lg font-semibold text-blue-600">{article.total_productos}</p>
                      <p className="text-xs text-gray-500">Productos</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-green-600">{article.total_cantidad_usada.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">Cantidad Total</p>
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
