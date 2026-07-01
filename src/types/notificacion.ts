// =====================================================
// TIPOS PARA EL SISTEMA UNIFICADO DE NOTIFICACIONES
// =====================================================

export type NotificacionModulo = 'inventario' | 'monitor' | 'tareas' | 'cotizaciones' | 'pedidos' | 'seguimiento';

export type NotificacionTipo = 'stockout' | 'below_min' | 'below_rop' | 'comentario' | 'cambio_estado' | 'creacion' | 'advertencia' | 'info';

export interface AppNotification {
  id: string;
  modulo: NotificacionModulo;
  tipo: NotificacionTipo;
  titulo: string;
  mensaje: string;
  link: string;
  created_at: string;
  leida: boolean;
  source_id?: string;
  source_table?: string;
}

export interface NotificationCounts {
  total: number;
  porModulo: Record<NotificacionModulo, number>;
}

export const MODULO_PERMISSION_MAP: Record<NotificacionModulo, string[]> = {
  inventario: ['inventario:view', 'menu:inventario', 'mantenimiento:view', 'menu:mantenimiento'],
  monitor: ['monitor:view', 'menu:monitor'],
  tareas: ['tareas:view', 'menu:tareas'],
  cotizaciones: ['cotizaciones:view', 'menu:cotizaciones'],
  pedidos: ['pedidos:view', 'menu:pedidos'],
  seguimiento: ['seguimiento:view', 'menu:seguimiento'],
};

export const TIPO_ICONO: Record<NotificacionTipo, string> = {
  stockout: 'ri-alert-fill',
  below_min: 'ri-error-warning-fill',
  below_rop: 'ri-error-warning-line',
  comentario: 'ri-chat-3-line',
  cambio_estado: 'ri-arrow-left-right-line',
  creacion: 'ri-add-circle-line',
  advertencia: 'ri-alert-line',
  info: 'ri-information-line',
};

export const TIPO_COLOR: Record<NotificacionTipo, string> = {
  stockout: 'bg-red-100 text-red-700',
  below_min: 'bg-orange-100 text-orange-700',
  below_rop: 'bg-yellow-100 text-yellow-700',
  comentario: 'bg-blue-100 text-blue-700',
  cambio_estado: 'bg-indigo-100 text-indigo-700',
  creacion: 'bg-green-100 text-green-700',
  advertencia: 'bg-amber-100 text-amber-700',
  info: 'bg-gray-100 text-gray-700',
};