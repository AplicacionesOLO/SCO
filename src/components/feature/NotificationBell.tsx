// =====================================================
// NotificationBell — Campanita unificada de notificaciones
// =====================================================
// Dropdown con badge de no leídas, agrupado por módulo,
// click para navegar, marcar como leído individual o todo.

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';
import type { AppNotification, NotificacionModulo } from '../../types/notificacion';
import { TIPO_ICONO, TIPO_COLOR } from '../../types/notificacion';

const MODULO_LABEL: Record<NotificacionModulo, string> = {
  inventario: 'Inventario',
  monitor: 'Monitor',
  tareas: 'Tareas',
  cotizaciones: 'Cotizaciones',
  pedidos: 'Pedidos',
  seguimiento: 'Seguimiento',
};

const MODULO_ICON: Record<NotificacionModulo, string> = {
  inventario: 'ri-store-line',
  monitor: 'ri-eye-line',
  tareas: 'ri-task-line',
  cotizaciones: 'ri-file-text-line',
  pedidos: 'ri-shopping-cart-line',
  seguimiento: 'ri-route-line',
};

function formatearTiempo(timestamp: string): string {
  const fecha = new Date(timestamp);
  const ahora = new Date();
  const diffMs = ahora.getTime() - fecha.getTime();
  const mins = Math.floor(diffMs / 60000);
  const hrs = Math.floor(diffMs / 3600000);
  const dias = Math.floor(diffMs / 86400000);

  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins}m`;
  if (hrs < 24) return `Hace ${hrs}h`;
  if (dias < 7) return `Hace ${dias}d`;
  return fecha.toLocaleDateString('es-CR', { month: 'short', day: 'numeric' });
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notificaciones, noLeidas, loading, markAsRead, markAllAsRead, refetch } = useNotifications();

  // Cerrar dropdown al hacer click afuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(prev => !prev);
    if (!isOpen) {
      refetch();
    }
  };

  const handleNotificationClick = (notif: AppNotification) => {
    markAsRead(notif.id);
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  // Agrupar por módulo
  const agrupadas = notificaciones.reduce((acc, n) => {
    if (!acc[n.modulo]) acc[n.modulo] = [];
    acc[n.modulo].push(n);
    return acc;
  }, {} as Record<string, AppNotification[]>);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón campanita */}
      <button
        onClick={handleToggle}
        className="relative p-2 rounded-lg hover:bg-background-100 transition-colors cursor-pointer"
        title="Notificaciones"
      >
        <i className="ri-notification-line text-xl text-foreground-600"></i>
        {noLeidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {noLeidas > 99 ? '99+' : noLeidas}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.12)] border border-background-200/70 z-50 overflow-hidden animate-[slide-down_0.2s_ease-out]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-background-100">
            <h3 className="font-semibold text-foreground-900 text-sm">
              Notificaciones
              {noLeidas > 0 && (
                <span className="ml-2 text-xs font-normal text-foreground-500">
                  ({noLeidas} sin leer)
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2">
              {noLeidas > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-primary-500 hover:text-primary-600 font-medium cursor-pointer whitespace-nowrap"
                >
                  Marcar todas
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-foreground-400 hover:text-foreground-600 cursor-pointer"
              >
                <i className="ri-close-line"></i>
              </button>
            </div>
          </div>

          {/* Lista */}
          <div className="max-h-[420px] overflow-y-auto">
            {loading && notificaciones.length === 0 && (
              <div className="flex items-center justify-center py-12">
                <i className="ri-loader-4-line animate-spin text-xl text-foreground-400"></i>
              </div>
            )}

            {!loading && notificaciones.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-background-100 flex items-center justify-center mb-3">
                  <i className="ri-notification-off-line text-xl text-foreground-400"></i>
                </div>
                <p className="text-sm text-foreground-500">No hay notificaciones</p>
                <p className="text-xs text-foreground-400 mt-1">Te avisaremos cuando haya novedades</p>
              </div>
            )}

            {!loading && notificaciones.length > 0 && (
              <div>
                {Object.entries(agrupadas).map(([modulo, notifs]) => (
                  <div key={modulo}>
                    {/* Encabezado de módulo */}
                    <div className="px-5 py-2 bg-background-50/80 border-b border-background-100/50 flex items-center gap-2">
                      <i className={`${MODULO_ICON[modulo as NotificacionModulo] || 'ri-notification-line'} text-xs text-foreground-500`}></i>
                      <span className="text-[11px] font-semibold text-foreground-500 uppercase tracking-wider">
                        {MODULO_LABEL[modulo as NotificacionModulo] || modulo}
                      </span>
                      <span className="text-[10px] text-foreground-400 ml-auto">
                        {notifs.length}
                      </span>
                    </div>

                    {/* Notificaciones del módulo */}
                    {notifs.map((notif) => (
                      <button
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`w-full text-left px-5 py-3 border-b border-background-100/50 hover:bg-background-50 transition-colors cursor-pointer flex items-start gap-3 ${
                          !notif.leida ? 'bg-primary-50/40' : ''
                        }`}
                      >
                        {/* Icono del tipo */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${TIPO_COLOR[notif.tipo].split(' ')[0]}`}>
                          <i className={`${TIPO_ICONO[notif.tipo]} text-sm ${TIPO_COLOR[notif.tipo].split(' ')[1]}`}></i>
                        </div>

                        {/* Contenido */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground-900 truncate">
                              {notif.titulo}
                            </p>
                            {!notif.leida && (
                              <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0"></span>
                            )}
                          </div>
                          <p className="text-xs text-foreground-600 mt-0.5 line-clamp-2">
                            {notif.mensaje}
                          </p>
                          <p className="text-[10px] text-foreground-400 mt-1">
                            {formatearTiempo(notif.created_at)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notificaciones.length > 0 && (
            <div className="px-5 py-3 border-t border-background-100 text-center bg-background-50/50">
              <span className="text-xs text-foreground-400">
                Mostrando últimas {notificaciones.length} notificaciones
              </span>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}