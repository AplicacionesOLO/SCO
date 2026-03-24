
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface Notificacion {
  id: string;
  tipo: 'stock_critico' | 'nueva_alerta' | 'orden_completada' | 'umbral_actualizado';
  titulo: string;
  mensaje: string;
  timestamp: string;
  leida: boolean;
  datos?: any;
}

interface NotificacionesRealTimeProps {
  onNuevaNotificacion?: (notificacion: Notificacion) => void;
}

export default function NotificacionesRealTime({ onNuevaNotificacion }: NotificacionesRealTimeProps) {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [mostrarPanel, setMostrarPanel] = useState(false);
  const [noLeidas, setNoLeidas] = useState(0);

  useEffect(() => {
    // Cargar notificaciones iniciales
    cargarNotificaciones();

    // Suscribirse a cambios en tiempo real
    const subscription = supabase
      .channel('inventario_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'inventario_alertas'
        },
        (payload) => {
          handleNuevaAlerta(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'inventario_niveles'
        },
        (payload) => {
          handleCambioNivel(payload.new, payload.old);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'replenishment_orders'
        },
        (payload) => {
          handleCambioOrden(payload.new, payload.old);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const cargarNotificaciones = async () => {
    try {
      // Simular notificaciones basadas en alertas recientes
      const { data: alertas } = await supabase
        .from('inventario_alertas')
        .select(`
          *,
          inventario!inner(codigo_articulo, descripcion_articulo)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      const notificacionesGeneradas: Notificacion[] = alertas?.map(alerta => ({
        id: `alerta_${alerta.id}`,
        tipo: 'nueva_alerta',
        titulo: getTituloAlerta(alerta.tipo),
        mensaje: `${alerta.inventario.codigo_articulo} - ${alerta.inventario.descripcion_articulo}`,
        timestamp: alerta.created_at,
        leida: alerta.leida,
        datos: alerta
      })) || [];

      setNotificaciones(notificacionesGeneradas);
      setNoLeidas(notificacionesGeneradas.filter(n => !n.leida).length);
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
    }
  };

  const handleNuevaAlerta = async (nuevaAlerta: any) => {
    try {
      // Obtener datos del artículo
      const { data: inventario } = await supabase
        .from('inventario')
        .select('codigo_articulo, descripcion_articulo')
        .eq('Id_Articulo', nuevaAlerta.articulo_id)
        .single();

      if (!inventario) return;

      const notificacion: Notificacion = {
        id: `alerta_${nuevaAlerta.id}`,
        tipo: 'nueva_alerta',
        titulo: getTituloAlerta(nuevaAlerta.tipo),
        mensaje: `${inventario.codigo_articulo} - ${inventario.descripcion_articulo}`,
        timestamp: nuevaAlerta.created_at,
        leida: false,
        datos: nuevaAlerta
      };

      setNotificaciones(prev => [notificacion, ...prev.slice(0, 9)]);
      setNoLeidas(prev => prev + 1);

      // Mostrar notificación push si el navegador lo soporta
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notificacion.titulo, {
          body: notificacion.mensaje,
          icon: '/favicon.ico',
          tag: notificacion.id
        });
      }

      // Callback externo
      if (onNuevaNotificacion) {
        onNuevaNotificacion(notificacion);
      }
    } catch (error) {
      console.error('Error procesando nueva alerta:', error);
    }
  };

  const handleCambioNivel = async (nuevoNivel: any, nivelAnterior: any) => {
    // Detectar cambios críticos en niveles de stock
    if (nuevoNivel.disponible <= 0 && nivelAnterior.disponible > 0) {
      const { data: inventario } = await supabase
        .from('inventario')
        .select('codigo_articulo, descripcion_articulo')
        .eq('Id_Articulo', nuevoNivel.articulo_id)
        .single();

      if (inventario) {
        const notificacion: Notificacion = {
          id: `stock_critico_${nuevoNivel.articulo_id}_${Date.now()}`,
          tipo: 'stock_critico',
          titulo: '🔴 Stock Agotado',
          mensaje: `${inventario.codigo_articulo} se ha quedado sin stock`,
          timestamp: new Date().toISOString(),
          leida: false,
          datos: { nivel: nuevoNivel, inventario }
        };

        setNotificaciones(prev => [notificacion, ...prev.slice(0, 9)]);
        setNoLeidas(prev => prev + 1);
      }
    }
  };

  const handleCambioOrden = (nuevaOrden: any, ordenAnterior: any) => {
    // Detectar cuando una orden se completa
    if (nuevaOrden.estado === 'completada' && ordenAnterior.estado !== 'completada') {
      const notificacion: Notificacion = {
        id: `orden_completada_${nuevaOrden.id}`,
        tipo: 'orden_completada',
        titulo: '✅ Orden Completada',
        mensaje: `Orden de reabastecimiento #${nuevaOrden.id} completada`,
        timestamp: new Date().toISOString(),
        leida: false,
        datos: nuevaOrden
      };

      setNotificaciones(prev => [notificacion, ...prev.slice(0, 9)]);
      setNoLeidas(prev => prev + 1);
    }
  };

  const getTituloAlerta = (tipo: string) => {
    switch (tipo) {
      case 'stockout':
        return '🔴 Sin Stock';
      case 'below_min':
        return '🟠 Bajo Mínimo';
      case 'below_rop':
        return '🟡 Bajo ROP';
      default:
        return '⚠️ Alerta';
    }
  };

  const marcarComoLeida = async (notificacionId: string) => {
    try {
      const notificacion = notificaciones.find(n => n.id === notificacionId);
      if (!notificacion || notificacion.leida) return;

      // Si es una alerta, marcarla como leída en la base de datos
      if (notificacion.tipo === 'nueva_alerta' && notificacion.datos) {
        await supabase
          .from('inventario_alertas')
          .update({ leida: true })
          .eq('id', notificacion.datos.id);
      }

      // Actualizar estado local
      setNotificaciones(prev =>
        prev.map(n =>
          n.id === notificacionId ? { ...n, leida: true } : n
        )
      );
      setNoLeidas(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marcando notificación como leída:', error);
    }
  };

  const marcarTodasComoLeidas = async () => {
    try {
      // Marcar todas las alertas como leídas
      const alertasIds = notificaciones
        .filter(n => n.tipo === 'nueva_alerta' && !n.leida && n.datos)
        .map(n => n.datos.id);

      if (alertasIds.length > 0) {
        await supabase
          .from('inventario_alertas')
          .update({ leida: true })
          .in('id', alertasIds);
      }

      // Actualizar estado local
      setNotificaciones(prev =>
        prev.map(n => ({ ...n, leida: true }))
      );
      setNoLeidas(0);
    } catch (error) {
      console.error('Error marcando todas como leídas:', error);
    }
  };

  const solicitarPermisoNotificaciones = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification('Notificaciones activadas', {
          body: 'Ahora recibirás alertas de inventario en tiempo real',
          icon: '/favicon.ico'
        });
      }
    }
  };

  const formatearTiempo = (timestamp: string) => {
    const fecha = new Date(timestamp);
    const ahora = new Date();
    const diferencia = ahora.getTime() - fecha.getTime();
    const minutos = Math.floor(diferencia / (1000 * 60));
    const horas = Math.floor(diferencia / (1000 * 60 * 60));
    const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));

    if (minutos < 1) return 'Ahora';
    if (minutos < 60) return `${minutos}m`;
    if (horas < 24) return `${horas}h`;
    return `${dias}d`;
  };

  return (
    <div className="relative">
      {/* Botón de notificaciones */}
      <button
        onClick={() => setMostrarPanel(!mostrarPanel)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <i className="ri-notification-line text-xl"></i>
        {noLeidas > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {/* Panel de notificaciones */}
      {mostrarPanel && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Notificaciones</h3>
              <div className="flex items-center space-x-2">
                {/* Botón para solicitar permisos */}
                {'Notification' in window && Notification.permission === 'default' && (
                  <button
                    onClick={solicitarPermisoNotificaciones}
                    className="text-xs text-blue-600 hover:text-blue-700"
                    title="Activar notificaciones push"
                  >
                    <i className="ri-notification-off-line"></i>
                  </button>
                )}
                
                {noLeidas > 0 && (
                  <button
                    onClick={marcarTodasComoLeidas}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    Marcar todas
                  </button>
                )}
                
                <button
                  onClick={() => setMostrarPanel(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line"></i>
                </button>
              </div>
            </div>
          </div>

          {/* Lista de notificaciones */}
          <div className="max-h-96 overflow-y-auto">
            {notificaciones.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <i className="ri-notification-off-line text-2xl mb-2"></i>
                <p>No hay notificaciones</p>
              </div>
            ) : (
              notificaciones.map((notificacion) => (
                <div
                  key={notificacion.id}
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                    !notificacion.leida ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => marcarComoLeida(notificacion.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900">
                          {notificacion.titulo}
                        </span>
                        {!notificacion.leida && (
                          <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full"></span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {notificacion.mensaje}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 ml-2">
                      {formatearTiempo(notificacion.timestamp)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notificaciones.length > 0 && (
            <div className="p-3 border-t border-gray-200 text-center">
              <button
                onClick={() => {
                  setMostrarPanel(false);
                  // Aquí podrías navegar a una página de todas las notificaciones
                }}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Ver todas las notificaciones
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
