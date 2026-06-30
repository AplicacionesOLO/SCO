import { useState, useEffect, useMemo } from 'react';
import Sidebar from '../../components/feature/Sidebar';
import TopBar from '../../components/feature/TopBar';
import MonitorLayout from './components/MonitorLayout';
import MonitorTaskCard from './components/MonitorTaskCard';
import ComentarioModal from './components/ComentarioModal';
import { monitorService } from '../../services/monitorService';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { useUnreadComments } from '../../hooks/useUnreadComments';
import type { TareaCommentDigest } from '../../hooks/useUnreadComments';
import type { Tarea } from '../../types/tarea';
import type { ClusterConUsuarios, TareaComentario, MonitorFilters, MonitorStats, MonitorDebugInfo } from '../../types/monitor';

export default function MonitorPage() {
  const { user, profile, isAuthenticated } = useAuth();
  const { hasPermission } = usePermissions();
  
  const canComment = hasPermission('monitor:comment');
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [clusters, setClusters] = useState<ClusterConUsuarios[]>([]);
  const [clusterActual, setClusterActual] = useState<ClusterConUsuarios | null>(null);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [stats, setStats] = useState<MonitorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comentarios, setComentarios] = useState<TareaComentario[]>([]);
  const [comentariosLoading, setComentariosLoading] = useState(false);
  
  const [showComentarios, setShowComentarios] = useState(false);
  const [tareaSeleccionada, setTareaSeleccionada] = useState<Tarea | null>(null);
  
  const [debugInfo, setDebugInfo] = useState<MonitorDebugInfo | null>(null);
  const [comentarioError, setComentarioError] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [commentDigests, setCommentDigests] = useState<TareaCommentDigest[]>([]);
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);
  
  const [filtros, setFiltros] = useState<MonitorFilters>({
    estado: '',
    busqueda: ''
  });

  // Cargar clusters del usuario autenticado
  useEffect(() => {
    if (isAuthenticated && user) {
      cargarClusters();
    }
  }, [isAuthenticated, user]);

  const cargarClusters = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);

      const rol = profile?.rol;

      const clustersUsuario = await monitorService.getClustersPorUsuario(user.id, rol);
      
      if (clustersUsuario.length > 0) {
        setClusters(clustersUsuario);
      } else {
        // Para visualizadores: no hacer fallback a todos los clusters
        if (rol?.startsWith('Visualizador ')) {
          setClusters([]);
        } else {
          const todosClusters = await monitorService.getClusters();
          setClusters(todosClusters);
        }
      }

      // Obtener info de diagnóstico
      setDebugInfo(monitorService.getDebugInfo());
    } catch (err) {
      console.error('Error cargando clusters:', err);
      setError('No se pudieron cargar los clusters. Verificá tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-seleccionar primer cluster al cargar
  useEffect(() => {
    if (clusters.length > 0 && !clusterActual) {
      setClusterActual(clusters[0]);
    }
  }, [clusters, clusterActual]);

  // Cargar tareas cuando cambia cluster o filtros
  useEffect(() => {
    if (clusterActual) {
      cargarTareas();
    }
  }, [clusterActual, filtros]);

  const cargarTareas = async () => {
    if (!clusterActual) return;
    
    try {
      setLoading(true);
      setError(null);

      const tareasFiltradas = await monitorService.getTareasPorCluster(
        clusterActual.cliente,
        filtros
      );

      setTareas(tareasFiltradas);

      // Cargar digest de comentarios para notificaciones no leídas
      if (tareasFiltradas.length > 0) {
        const tareaIds = tareasFiltradas.map(t => t.id);
        const digestMap = await monitorService.getLatestCommentDigests(tareaIds);
        const digests: TareaCommentDigest[] = [];
        digestMap.forEach((val, tareaId) => {
          digests.push({
            tareaId,
            latestCommentAt: val.latestAt,
            commentCount: val.count
          });
        });
        setCommentDigests(digests);
      } else {
        setCommentDigests([]);
      }
      
      const statsData = await monitorService.getStats(clusterActual.cliente);
      setStats(statsData);
    } catch (err) {
      console.error('Error cargando tareas:', err);
      setError('No se pudieron cargar las tareas. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Cambiar cluster
  const handleClusterChange = (cluster: ClusterConUsuarios) => {
    setClusterActual(cluster);
    setFiltros({ estado: '', busqueda: '' });
    setFilterUnreadOnly(false);
  };

  // Abrir comentarios de una tarea
  const handleVerComentarios = async (tarea: Tarea) => {
    setTareaSeleccionada(tarea);
    setComentariosLoading(true);
    setShowComentarios(true);
    markAsRead(String(tarea.id));
    
    try {
      const coms = await monitorService.getComentarios(tarea.id);
      setComentarios(coms);
    } catch (err) {
      console.error('Error cargando comentarios:', err);
      setComentarios([]);
    } finally {
      setComentariosLoading(false);
    }
  };

  // Agregar comentario (abre el modal si no está abierto)
  const handleAgregarComentario = async (tarea: Tarea) => {
    if (!canComment) return;
    if (!showComentarios || tareaSeleccionada?.id !== tarea.id) {
      await handleVerComentarios(tarea);
    }
  };

  // Enviar nuevo comentario
  const handleEnviarComentario = async (comentario: string) => {
    if (!tareaSeleccionada || !user) return;
    
    setComentarioError(null);
    
    try {
      await monitorService.addComentario(
        tareaSeleccionada.id,
        user.id,
        comentario,
        {
          id: user.id,
          email: user.email || '',
          nombre_completo: profile?.nombre_completo
        }
      );
      
      // Marcar como leído para el autor del comentario
      markAsRead(String(tareaSeleccionada.id));

      // Refrescar el digest de esta tarea para que el badge se actualice
      try {
        const digestMap = await monitorService.getLatestCommentDigests([tareaSeleccionada.id]);
        const val = digestMap.get(String(tareaSeleccionada.id));
        setCommentDigests(prev => {
          const filtered = prev.filter(d => d.tareaId !== String(tareaSeleccionada.id));
          if (val) {
            filtered.push({
              tareaId: String(tareaSeleccionada.id),
              latestCommentAt: val.latestAt,
              commentCount: val.count
            });
          }
          return filtered;
        });
      } catch {
        // No bloqueamos si falla el refresh del digest
      }
      
      await cargarComentarios(tareaSeleccionada.id);
    } catch (err: any) {
      console.error('Error al enviar comentario:', err);
      setComentarioError(err.message || 'No se pudo enviar el comentario.');
      throw err;
    }
  };

  const handleBusquedaChange = (value: string) => {
    setFiltros(prev => ({ ...prev, busqueda: value }));
  };

  const handleEstadoChange = (estado: string) => {
    setFiltros(prev => ({ ...prev, estado: estado as MonitorFilters['estado'] }));
  };

  const cargarComentarios = async (tareaId: string) => {
    try {
      const coms = await monitorService.getComentarios(tareaId);
      setComentarios(coms);
    } catch (err) {
      console.error('Error refrescando comentarios:', err);
    }
  };

  // ─── COMENTARIOS NO LEÍDOS ──────────────────────────

  const {
    unreadTareaIds,
    unreadCounts,
    hasUnread,
    totalUnread,
    markAsRead,
    getLatestCommentDate
  } = useUnreadComments(user?.id || '', commentDigests);

  // Ordenar tareas: no leídas primero por fecha de comentario (más reciente primero), luego el resto por created_at
  const tareasOrdenadas = useMemo(() => {
    const unread: Tarea[] = [];
    const read: Tarea[] = [];

    for (const t of tareas) {
      if (unreadTareaIds.has(String(t.id))) {
        unread.push(t);
      } else {
        read.push(t);
      }
    }

    unread.sort((a, b) => {
      const dateA = getLatestCommentDate(String(a.id));
      const dateB = getLatestCommentDate(String(b.id));
      if (dateA && dateB) return new Date(dateB).getTime() - new Date(dateA).getTime();
      if (dateA) return -1;
      if (dateB) return 1;
      return 0;
    });

    return [...unread, ...read];
  }, [tareas, unreadTareaIds, getLatestCommentDate]);

  const handleToggleUnreadFilter = () => {
    setFilterUnreadOnly(prev => !prev);
  };

  // Aplicar filtro de "solo no leídas" sobre las tareas ya ordenadas
  const tareasVisibles = useMemo(() => {
    if (filterUnreadOnly) {
      return tareasOrdenadas.filter(t => unreadTareaIds.has(String(t.id)));
    }
    return tareasOrdenadas;
  }, [tareasOrdenadas, filterUnreadOnly, unreadTareaIds]);

  // ─── RENDER ──────────────────────────────────────────

  return (
    <div className="flex h-screen bg-background-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        
        <MonitorLayout
          cluster={clusterActual}
          clusters={clusters}
          stats={stats}
          onClusterChange={handleClusterChange}
          unreadCount={totalUnread}
          filterUnreadOnly={filterUnreadOnly}
          onToggleUnreadFilter={handleToggleUnreadFilter}
        >
          {/* Banner de diagnóstico */}
          {debugInfo && !bannerDismissed && (
            <div className={`mb-4 px-4 py-3 rounded-lg border flex items-start gap-3 text-sm ${
              debugInfo.mode === 'LIVE_FULL'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : debugInfo.mode === 'LIVE_HYBRID'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}>
              <span className="mt-0.5">
                {debugInfo.mode === 'LIVE_FULL' && <i className="ri-check-double-fill text-emerald-600 text-base"></i>}
                {debugInfo.mode === 'LIVE_HYBRID' && <i className="ri-alert-fill text-amber-600 text-base"></i>}
                {debugInfo.mode === 'MOCK' && <i className="ri-close-circle-fill text-red-600 text-base"></i>}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium">
                  {debugInfo.mode === 'LIVE_FULL' && 'Sistema operativo normal'}
                  {debugInfo.mode === 'LIVE_HYBRID' && 'Sistema operativo — tablas del monitor pendientes'}
                  {debugInfo.mode === 'MOCK' && 'Usando datos de demostración'}
                </p>
                <p className="text-xs opacity-80 mt-0.5">
                  {debugInfo.reason}
                </p>
                {debugInfo.mode === 'LIVE_HYBRID' && (
                  <p className="text-xs mt-2 opacity-80">
                    Los clusters se generan desde <code className="bg-amber-100 px-1 rounded">datos_formulario→cliente</code> en tareas.
                    Comentarios no disponibles. Ejecutá <code className="bg-amber-100 px-1 rounded">sql_clusters_monitor.sql</code> para activar todas las funciones.
                  </p>
                )}
                {debugInfo.mode === 'MOCK' && (
                  <p className="text-xs mt-2 opacity-80">
                    Configurá <code className="bg-red-100 px-1 rounded">VITE_PUBLIC_SUPABASE_URL</code> y <code className="bg-red-100 px-1 rounded">VITE_PUBLIC_SUPABASE_ANON_KEY</code> en el .env.
                  </p>
                )}
              </div>
              <button
                onClick={() => setBannerDismissed(true)}
                className="text-current opacity-50 hover:opacity-100 transition-opacity cursor-pointer whitespace-nowrap ml-2"
                aria-label="Cerrar banner"
              >
                <i className="ri-close-line"></i>
              </button>
            </div>
          )}

          {/* Barra de filtros */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="flex-1 relative">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400"></i>
              <input
                type="text"
                placeholder="Buscar por consecutivo o descripción..."
                value={filtros.busqueda || ''}
                onChange={(e) => handleBusquedaChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-background-200/70 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-white"
              />
            </div>
            <select
              value={filtros.estado || ''}
              onChange={(e) => handleEstadoChange(e.target.value)}
              className="px-3 py-2 text-sm border border-background-200/70 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-white sm:w-48"
            >
              <option value="">Todos los estados</option>
              <option value="En Cola">En Cola</option>
              <option value="En Proceso">En Proceso</option>
              <option value="Produciendo">Produciendo</option>
              <option value="Esperando suministros">Esperando suministros</option>
              <option value="Finalizado">Finalizado</option>
            </select>
          </div>

          {/* Estados de carga / error / vacío */}
          {error && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center max-w-sm">
                <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-4">
                  <i className="ri-error-warning-line text-2xl text-red-600"></i>
                </div>
                <h3 className="text-base font-semibold text-foreground-900 mb-2">Error al cargar</h3>
                <p className="text-sm text-foreground-500 mb-4">{error}</p>
                <button
                  onClick={cargarClusters}
                  className="px-4 py-2 bg-primary-500 text-background-50 rounded-lg hover:bg-primary-600 transition-colors cursor-pointer text-sm font-medium whitespace-nowrap"
                >
                  Reintentar
                </button>
              </div>
            </div>
          )}

          {!error && loading && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <i className="ri-loader-4-line animate-spin text-3xl text-foreground-400"></i>
                <p className="text-sm text-foreground-500 mt-3">Cargando tareas...</p>
              </div>
            </div>
          )}

          {!error && !loading && clusters.length === 0 && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center max-w-sm">
                <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 flex items-center justify-center mb-4">
                  <i className="ri-user-location-line text-2xl text-amber-600"></i>
                </div>
                <h3 className="text-base font-semibold text-foreground-900 mb-2">
                  Sin clusters asignados
                </h3>
                <p className="text-sm text-foreground-500">
                  {profile?.rol?.startsWith('Visualizador ')
                    ? `No hay un cluster configurado para el cliente de tu rol (${profile.rol.replace('Visualizador ', '')}). Contactá al administrador para que cree el cluster correspondiente.`
                    : 'No tenés clusters asignados. Contactá al administrador para que te agregue a uno.'
                  }
                </p>
              </div>
            </div>
          )}

          {!error && !loading && tareasVisibles.length === 0 && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center max-w-sm">
                <div className="w-16 h-16 mx-auto rounded-full bg-background-100 flex items-center justify-center mb-4">
                  <i className="ri-inbox-line text-2xl text-foreground-400"></i>
                </div>
                <h3 className="text-base font-semibold text-foreground-900 mb-2">
                  {filterUnreadOnly ? '¡Todo al día!' : 'No hay tareas'}
                </h3>
                <p className="text-sm text-foreground-500">
                  {filterUnreadOnly
                    ? 'No tenés tareas con comentarios sin leer. ¡Buen trabajo!'
                    : filtros.estado || filtros.busqueda
                    ? 'No se encontraron tareas con los filtros actuales. Intentá ajustar la búsqueda.'
                    : `No hay tareas registradas para el cluster ${clusterActual?.nombre || 'seleccionado'}.`
                  }
                </p>
                {filterUnreadOnly && (
                  <button
                    onClick={handleToggleUnreadFilter}
                    className="mt-4 px-4 py-2 bg-accent-100 text-accent-700 rounded-lg hover:bg-accent-200 transition-colors cursor-pointer text-sm font-medium whitespace-nowrap"
                  >
                    Ver todas las tareas
                  </button>
                )}
              </div>
            </div>
          )}

          {!error && !loading && tareasVisibles.length > 0 && (
            <>
              <div className="space-y-3">
                {tareasVisibles.map((tarea, idx) => {
                  const isUnread = unreadTareaIds.has(String(tarea.id));
                  const unreadCount = unreadCounts.get(String(tarea.id)) || 0;

                  // Mostrar separador entre no leídos y leídas
                  const prevWasUnread = idx > 0 && unreadTareaIds.has(String(tareasVisibles[idx - 1].id));
                  const showSeparator = !isUnread && prevWasUnread;

                  return (
                    <div key={tarea.id}>
                      {showSeparator && (
                        <div className="flex items-center gap-3 mb-3 pt-1">
                          <div className="flex-1 h-px bg-background-200/70"></div>
                          <span className="text-xs font-medium text-foreground-500 whitespace-nowrap">
                            Tareas leídas
                          </span>
                          <div className="flex-1 h-px bg-background-200/70"></div>
                        </div>
                      )}
                      <MonitorTaskCard
                        tarea={tarea}
                        comentarios={[]}
                        canComment={canComment}
                        hasUnreadComment={isUnread}
                        unreadCommentCount={unreadCount}
                        onVerComentarios={handleVerComentarios}
                        onAgregarComentario={handleAgregarComentario}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-foreground-500">
                <span>
                  Mostrando {tareasVisibles.length} tarea{tareasVisibles.length !== 1 ? 's' : ''}
                </span>
                {unreadTareaIds.size > 0 && (
                  <span className="flex items-center gap-1.5 text-red-600 font-medium">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    {unreadTareaIds.size} sin leer
                  </span>
                )}
              </div>
            </>
          )}
        </MonitorLayout>
      </div>

      {/* Modal de comentarios */}
      <ComentarioModal
        isOpen={showComentarios}
        onClose={() => { setShowComentarios(false); setTareaSeleccionada(null); setComentarioError(null); }}
        tarea={tareaSeleccionada}
        comentarios={comentarios}
        loading={comentariosLoading}
        onEnviar={handleEnviarComentario}
        currentUserId={user?.id}
        error={comentarioError}
      />
    </div>
  );
}