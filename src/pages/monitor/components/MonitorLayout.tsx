import type { ReactNode } from 'react';
import type { ClusterConUsuarios, MonitorStats } from '../../../types/monitor';

interface MonitorLayoutProps {
  cluster: ClusterConUsuarios | null;
  clusters: ClusterConUsuarios[];
  stats: MonitorStats | null;
  onClusterChange: (cluster: ClusterConUsuarios) => void;
  children: ReactNode;
  unreadCount?: number;
}

export default function MonitorLayout({
  cluster,
  clusters,
  stats,
  onClusterChange,
  children,
  unreadCount = 0
}: MonitorLayoutProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background-50">
      {/* Header del Monitor */}
      <header className="bg-white border-b border-background-200/70 px-4 md:px-6 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-accent-100 flex items-center justify-center flex-shrink-0 relative">
              <i className="ri-eye-line text-xl text-accent-700"></i>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground-950">
                Monitor de Tareas
              </h1>
              <p className="text-sm text-foreground-600">
                Vista de seguimiento para clientes
              </p>
            </div>
          </div>

          {/* Selector de Cluster */}
          {clusters.length > 1 && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-foreground-600 whitespace-nowrap">Cluster:</span>
              <div className="flex bg-background-100 rounded-full p-1 gap-1">
                {clusters.map(c => (
                  <button
                    key={c.id}
                    onClick={() => onClusterChange(c)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                      cluster?.id === c.id
                        ? 'bg-primary-500 text-background-50'
                        : 'text-foreground-700 hover:bg-background-200'
                    }`}
                  >
                    {c.nombre}
                    <span className={`ml-1.5 text-xs ${
                      cluster?.id === c.id ? 'text-background-50/80' : 'text-foreground-500'
                    }`}>
                      ({c.cantidad_tareas})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Mini stats */}
        {stats && cluster && (
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-background-100 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-foreground-700"></div>
              <span className="text-xs text-foreground-600">Total: <strong className="text-foreground-950">{stats.total}</strong></span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary-100 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-secondary-500"></div>
              <span className="text-xs text-foreground-600">En Cola: <strong className="text-foreground-950">{stats.en_cola}</strong></span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-accent-100 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-accent-500"></div>
              <span className="text-xs text-foreground-600">En Proceso: <strong className="text-foreground-950">{stats.en_proceso + stats.produciendo}</strong></span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-background-200/70 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-foreground-400"></div>
              <span className="text-xs text-foreground-600">Finalizado: <strong className="text-foreground-950">{stats.finalizado}</strong></span>
            </div>
          </div>
        )}
      </header>

      {/* Contenido principal */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}