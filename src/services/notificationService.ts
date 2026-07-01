// =====================================================
// SERVICIO UNIFICADO DE NOTIFICACIONES
// =====================================================
// Agrega alertas de todos los módulos respetando los
// permisos de cada usuario. Usa localStorage para
// tracking de notificaciones leídas.

import { supabase } from '../lib/supabase';
import type { AppNotification, NotificacionModulo } from '../types/notificacion';
import { MODULO_PERMISSION_MAP } from '../types/notificacion';

const LS_KEY_READ = 'sco_notif_read';
const MAX_NOTIFICACIONES = 50;
const DIAS_HISTORIAL = 30;

// ─── Helpers de localStorage ──────────────────────────

function getReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY_READ);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set(parsed);
    return new Set();
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>): void {
  try {
    localStorage.setItem(LS_KEY_READ, JSON.stringify([...ids]));
  } catch {
    // Silencioso
  }
}

function markAsReadInStorage(notificationId: string): void {
  const ids = getReadIds();
  ids.add(notificationId);
  saveReadIds(ids);
}

function markAllAsReadInStorage(notificationIds: string[]): void {
  const ids = getReadIds();
  for (const nid of notificationIds) {
    ids.add(nid);
  }
  saveReadIds(ids);
}

// ─── Helpers de fecha ─────────────────────────────────

function diasAtras(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString();
}

// ─── Service ──────────────────────────────────────────

class NotificationService {

  /**
   * Determina qué módulos puede ver el usuario según sus permisos.
   * Admin ve todo.
   */
  private getModulosAccesibles(permissions: string[], isAdmin: boolean): NotificacionModulo[] {
    if (isAdmin) {
      return ['inventario', 'monitor', 'tareas', 'cotizaciones', 'pedidos', 'seguimiento'];
    }

    const modulos: NotificacionModulo[] = [];
    for (const [modulo, requiredPerms] of Object.entries(MODULO_PERMISSION_MAP)) {
      const tieneAcceso = requiredPerms.some(p => permissions.includes(p));
      if (tieneAcceso) {
        modulos.push(modulo as NotificacionModulo);
      }
    }
    return modulos;
  }

  /**
   * Obtiene todas las notificaciones para el usuario,
   * agregadas de todos los módulos que tiene acceso.
   */
  async getNotifications(
    permissions: string[],
    isAdmin: boolean,
    userId: string,
    tiendaId?: string | null
  ): Promise<AppNotification[]> {
    const modulos = this.getModulosAccesibles(permissions, isAdmin);
    
    if (modulos.length === 0) return [];

    const readIds = getReadIds();
    const promesas: Promise<AppNotification[]>[] = [];

    // Inventario: alertas de stock
    if (modulos.includes('inventario')) {
      promesas.push(this.getAlertasInventario(readIds, tiendaId));
    }

    // Monitor / Tareas: comentarios
    if (modulos.includes('monitor') || modulos.includes('tareas')) {
      promesas.push(this.getComentariosTareas(readIds, userId, isAdmin, tiendaId));
    }

    // Tareas: cambios de estado recientes
    if (modulos.includes('tareas')) {
      promesas.push(this.getCambiosEstadoTareas(readIds, tiendaId));
    }

    // Tareas: creaciones recientes
    if (modulos.includes('tareas') || modulos.includes('monitor')) {
      promesas.push(this.getTareasRecientes(readIds, tiendaId));
    }

    const resultados = await Promise.allSettled(promesas);
    
    const notificaciones: AppNotification[] = [];
    for (const r of resultados) {
      if (r.status === 'fulfilled') {
        notificaciones.push(...r.value);
      }
    }

    // Ordenar por fecha descendente, limitar
    notificaciones.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return notificaciones.slice(0, MAX_NOTIFICACIONES);
  }

  /**
   * Obtiene solo el conteo de no leídas (más rápido, para el badge).
   */
  async getUnreadCount(
    permissions: string[],
    isAdmin: boolean,
    userId: string,
    tiendaId?: string | null
  ): Promise<number> {
    const notificaciones = await this.getNotifications(permissions, isAdmin, userId, tiendaId);
    return notificaciones.filter(n => !n.leida).length;
  }

  // ═══════════════════════════════════════════════════════
  // INVENTARIO: alertas de stock
  // ═══════════════════════════════════════════════════════

  private async getAlertasInventario(
    readIds: Set<string>,
    _tiendaId?: string | null
  ): Promise<AppNotification[]> {
    try {
      const desde = diasAtras(DIAS_HISTORIAL);
      
      let query = supabase
        .from('inventario_alertas')
        .select(`
          id, tipo, leida, created_at, articulo_id,
          inventario!inner(codigo_articulo, descripcion_articulo)
        `)
        .gte('created_at', desde)
        .order('created_at', { ascending: false })
        .limit(MAX_NOTIFICACIONES);

      const { data, error } = await query;

      if (error) {
        console.warn('[NotificationService] Error cargando alertas inventario:', error.message);
        return [];
      }

      return (data || []).map((alerta: any) => {
        const codigo = alerta.inventario?.codigo_articulo || 'N/A';
        const desc = alerta.inventario?.descripcion_articulo || '';
        const nid = `inv_${alerta.id}`;
        const leida = alerta.leida || readIds.has(nid);

        const { titulo, mensaje } = this.formatAlertaInventario(alerta.tipo, codigo, desc);

        return {
          id: nid,
          modulo: 'inventario' as const,
          tipo: alerta.tipo,
          titulo,
          mensaje,
          link: '/mantenimiento',
          created_at: alerta.created_at,
          leida,
          source_id: String(alerta.id),
          source_table: 'inventario_alertas',
        };
      });
    } catch (err: any) {
      console.warn('[NotificationService] Error en getAlertasInventario:', err.message);
      return [];
    }
  }

  private formatAlertaInventario(tipo: string, codigo: string, desc: string): { titulo: string; mensaje: string } {
    const descripcion = desc ? `${codigo} — ${desc}` : codigo;
    switch (tipo) {
      case 'stockout':
        return { titulo: 'Stock Agotado', mensaje: `${descripcion} se quedó sin existencias` };
      case 'below_min':
        return { titulo: 'Stock Bajo Mínimo', mensaje: `${descripcion} está por debajo del nivel mínimo` };
      case 'below_rop':
        return { titulo: 'Punto de Reorden', mensaje: `${descripcion} alcanzó el punto de reorden` };
      default:
        return { titulo: 'Alerta de Inventario', mensaje: descripcion };
    }
  }

  // ═══════════════════════════════════════════════════════
  // MONITOR / TAREAS: comentarios
  // ═══════════════════════════════════════════════════════

  private async getComentariosTareas(
    readIds: Set<string>,
    userId: string,
    isAdmin: boolean,
    tiendaId?: string | null
  ): Promise<AppNotification[]> {
    try {
      const desde = diasAtras(DIAS_HISTORIAL);

      // Obtener comentarios recientes con info de tarea y usuario
      const { data, error } = await supabase
        .from('tarea_comentarios')
        .select(`
          id, tarea_id, usuario_id, comentario, created_at,
          tarea:tareas!inner(id, consecutivo, descripcion_breve, tienda_id, datos_formulario)
        `)
        .gte('created_at', desde)
        .order('created_at', { ascending: false })
        .limit(MAX_NOTIFICACIONES);

      if (error) {
        console.warn('[NotificationService] Error cargando comentarios:', error.message);
        return [];
      }

      // Filtrar por tienda si no es admin
      const comentarios = tiendaId && !isAdmin
        ? (data || []).filter((c: any) => c.tarea?.tienda_id === tiendaId)
        : (data || []);

      // Obtener nombres de usuarios
      const userIds = [...new Set(comentarios.map((c: any) => c.usuario_id))];
      let usuariosMap = new Map<string, string>();
      
      if (userIds.length > 0) {
        const { data: usuariosData } = await supabase
          .from('usuarios')
          .select('id, nombre_completo')
          .in('id', userIds);
        
        (usuariosData || []).forEach((u: any) => {
          usuariosMap.set(u.id, u.nombre_completo || 'Usuario');
        });
      }

      return comentarios.map((c: any) => {
        const nid = `com_${c.id}`;
        const leida = readIds.has(nid);
        const autor = usuariosMap.get(c.usuario_id) || 'Usuario';
        const consecutivo = c.tarea?.consecutivo || 'TAREA';
        const snippet = c.comentario?.length > 80 
          ? c.comentario.substring(0, 80) + '...' 
          : c.comentario || '';

        return {
          id: nid,
          modulo: 'monitor' as const,
          tipo: 'comentario' as const,
          titulo: `Comentario en ${consecutivo}`,
          mensaje: `${autor}: ${snippet}`,
          link: '/monitor',
          created_at: c.created_at,
          leida,
          source_id: String(c.id),
          source_table: 'tarea_comentarios',
        };
      });
    } catch (err: any) {
      console.warn('[NotificationService] Error en getComentariosTareas:', err.message);
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════
  // TAREAS: cambios de estado recientes
  // ═══════════════════════════════════════════════════════

  private async getCambiosEstadoTareas(
    readIds: Set<string>,
    tiendaId?: string | null
  ): Promise<AppNotification[]> {
    try {
      const desde = diasAtras(DIAS_HISTORIAL);

      // Usamos updated_at para detectar tareas cuyo estado cambió recientemente
      let query = supabase
        .from('tareas')
        .select('id, consecutivo, descripcion_breve, estado, updated_at, created_at, tienda_id')
        .gte('updated_at', desde)
        .neq('estado', 'En Cola')
        .order('updated_at', { ascending: false })
        .limit(MAX_NOTIFICACIONES);

      if (tiendaId) {
        query = query.eq('tienda_id', tiendaId);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('[NotificationService] Error cargando cambios de estado:', error.message);
        return [];
      }

      // Solo incluir tareas que realmente fueron actualizadas (no recién creadas en otro estado)
      return (data ||[])
        .filter((t: any) => t.updated_at !== t.created_at)
        .map((t: any) => {
          const nid = `est_${t.id}_${t.updated_at}`;
          const leida = readIds.has(nid);

          return {
            id: nid,
            modulo: 'tareas' as const,
            tipo: 'cambio_estado' as const,
            titulo: `Estado: ${t.estado}`,
            mensaje: `${t.consecutivo || 'TAREA'} — ${t.descripcion_breve || 'Sin descripción'} ahora está en "${t.estado}"`,
            link: '/tareas',
            created_at: t.updated_at,
            leida,
            source_id: String(t.id),
            source_table: 'tareas',
          };
        });
    } catch (err: any) {
      console.warn('[NotificationService] Error en getCambiosEstadoTareas:', err.message);
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════
  // TAREAS: creaciones recientes
  // ═══════════════════════════════════════════════════════

  private async getTareasRecientes(
    readIds: Set<string>,
    tiendaId?: string | null
  ): Promise<AppNotification[]> {
    try {
      const desde = diasAtras(7); // Solo última semana para creaciones

      let query = supabase
        .from('tareas')
        .select('id, consecutivo, descripcion_breve, created_at, tienda_id')
        .gte('created_at', desde)
        .order('created_at', { ascending: false })
        .limit(20);

      if (tiendaId) {
        query = query.eq('tienda_id', tiendaId);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('[NotificationService] Error cargando tareas recientes:', error.message);
        return [];
      }

      return (data || []).map((t: any) => {
        const nid = `tarea_${t.id}`;
        const leida = readIds.has(nid);

        return {
          id: nid,
          modulo: 'tareas' as const,
          tipo: 'creacion' as const,
          titulo: 'Nueva Tarea',
          mensaje: `${t.consecutivo || 'TAREA'} — ${t.descripcion_breve || 'Sin descripción'}`,
          link: '/tareas',
          created_at: t.created_at,
          leida,
          source_id: String(t.id),
          source_table: 'tareas',
        };
      });
    } catch (err: any) {
      console.warn('[NotificationService] Error en getTareasRecientes:', err.message);
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════
  // MARCAR COMO LEÍDO
  // ═══════════════════════════════════════════════════════

  async markAsRead(notificationId: string): Promise<void> {
    markAsReadInStorage(notificationId);

    // Si es una alerta de inventario, también actualizar en DB
    if (notificationId.startsWith('inv_')) {
      const alertaId = notificationId.replace('inv_', '');
      try {
        await supabase
          .from('inventario_alertas')
          .update({ leida: true })
          .eq('id', alertaId);
      } catch {
        // Silencioso
      }
    }
  }

  async markAllAsRead(notificationIds: string[]): Promise<void> {
    markAllAsReadInStorage(notificationIds);

    // Marcar alertas de inventario en DB
    const alertaIds = notificationIds
      .filter(nid => nid.startsWith('inv_'))
      .map(nid => nid.replace('inv_', ''));

    if (alertaIds.length > 0) {
      try {
        await supabase
          .from('inventario_alertas')
          .update({ leida: true })
          .in('id', alertaIds);
      } catch {
        // Silencioso
      }
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;