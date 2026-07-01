// =====================================================
// SERVICIO PARA EL MÓDULO DE MONITOR (CLUSTERS)
// =====================================================
// Siempre usa datos reales de Supabase.
// - LIVE_FULL  → Supabase + tablas de monitor (clusters, cluster_usuarios, tarea_comentarios)
// - LIVE_HYBRID → Supabase + tareas accesible pero sin tablas de monitor (clusters sintéticos)
//
// "tareas" es la fuente de verdad de liveness.
// Si podemos leer tareas, el sistema está operativo.

import { supabase } from '../lib/supabase';
import type {
  ClusterConUsuarios,
  TareaComentario,
  MonitorFilters,
  MonitorStats,
  MonitorMode,
  MonitorDebugInfo
} from '../types/monitor';
import type { Tarea } from '../types/tarea';
class MonitorService {
  private mode: MonitorMode = 'LIVE_FULL';
  private modeReason: string = 'Inicializando...';

  // Flags de diagnóstico
  private supabaseUrl: string | null = null;
  private tareasAccessible = false;
  private clustersTableExists = false;
  private clusterUsuariosTableExists = false;
  private tareaComentariosTableExists = false;

  private connectionChecked = false;
  private connectionCheckPromise: Promise<void> | null = null;

  constructor() {
    this.connectionCheckPromise = this.detectConnection();
  }

  // ═══════════════════════════════════════════════════════
  // DETECCIÓN DE CONEXIÓN
  // ═══════════════════════════════════════════════════════

  private async detectConnection(): Promise<void> {
    if (this.connectionChecked) return;

    this.supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL || null;

    // ── Paso 0: ¿Hay URL de Supabase? ──────────────────
    if (!this.supabaseUrl) {
      this.mode = 'LIVE_HYBRID';
      this.modeReason = 'No hay VITE_PUBLIC_SUPABASE_URL configurada en .env. Se intentará conexión igual.';
      this.connectionChecked = true;
      this.logDiagnostic();
      return;
    }

    // ── Paso 1: ¿Podemos leer tareas? (liveness check) ──
    try {
      const { data: tareasCheck, error: tareasError } = await supabase
        .from('tareas')
        .select('id')
        .limit(1);

      if (tareasError) {
        // PGRST205 = tabla no encontrada, 42P01 = relación no existe
        if (tareasError.code === 'PGRST205' || tareasError.code === '42P01') {
          this.mode = 'LIVE_HYBRID';
          this.modeReason = `Supabase conectado pero la tabla 'tareas' no existe: ${tareasError.message}`;
        } else if (tareasError.code === 'PGRST301' || tareasError.code === '401') {
          // Error de RLS o autenticación
          this.mode = 'LIVE_HYBRID';
          this.modeReason = `Supabase conectado pero error de permisos en tareas: ${tareasError.message}`;
        } else {
          this.mode = 'LIVE_HYBRID';
          this.modeReason = `Supabase conectado pero error al leer tareas: ${tareasError.code} - ${tareasError.message}`;
        }
        this.connectionChecked = true;
        this.logDiagnostic();
        return;
      }

      // tareas es accesible → el sistema está vivo
      this.tareasAccessible = true;

    } catch (err: any) {
      this.mode = 'LIVE_HYBRID';
      this.modeReason = `Error de red o conexión al consultar tareas: ${err?.message || String(err)}`;
      this.connectionChecked = true;
      this.logDiagnostic();
      return;
    }

    // ── Paso 2: ¿Existen las tablas del monitor? ────────
    await this.checkMonitorTables();

    // ── Paso 3: Determinar modo final ───────────────────
    if (this.clustersTableExists && this.clusterUsuariosTableExists && this.tareaComentariosTableExists) {
      this.mode = 'LIVE_FULL';
      this.modeReason = 'Supabase conectado, tareas y tablas del monitor operativas';
    } else {
      this.mode = 'LIVE_HYBRID';
      const faltantes: string[] = [];
      if (!this.clustersTableExists) faltantes.push('clusters');
      if (!this.clusterUsuariosTableExists) faltantes.push('cluster_usuarios');
      if (!this.tareaComentariosTableExists) faltantes.push('tarea_comentarios');
      this.modeReason = `Supabase conectado, tareas operativas. Tablas pendientes: ${faltantes.join(', ')}. Clusters generados desde datos_formulario->>cliente.`;
    }

    this.connectionChecked = true;
    this.logDiagnostic();
  }

  private async checkMonitorTables(): Promise<void> {
    // 1. clusters
    const { data: _, error: clustersError } = await supabase
      .from('clusters')
      .select('id')
      .limit(1);

    this.clustersTableExists = !clustersError;

    // 2. cluster_usuarios
    const { data: __, error: cuError } = await supabase
      .from('cluster_usuarios')
      .select('id')
      .limit(1);

    this.clusterUsuariosTableExists = !cuError;

    // 3. tarea_comentarios
    const { data: ___, error: tcError } = await supabase
      .from('tarea_comentarios')
      .select('id')
      .limit(1);

    this.tareaComentariosTableExists = !tcError;
  }

  private logDiagnostic(): void {
    // Solo para info interna — el banner usa getDebugInfo()
  }

  private async ensureConnectionChecked(): Promise<void> {
    if (this.connectionCheckPromise) {
      await this.connectionCheckPromise;
    }
  }

  // ═══════════════════════════════════════════════════════
  // DIAGNÓSTICO PÚBLICO
  // ═══════════════════════════════════════════════════════

  getDebugInfo(): MonitorDebugInfo {
    return {
      mode: this.mode,
      reason: this.modeReason,
      supabaseUrl: this.supabaseUrl,
      supabaseConnected: this.supabaseUrl !== null && this.tareasAccessible,
      tareasAccessible: this.tareasAccessible,
      clustersTableExists: this.clustersTableExists,
      clusterUsuariosTableExists: this.clusterUsuariosTableExists,
      tareaComentariosTableExists: this.tareaComentariosTableExists
    };
  }

  getMode(): MonitorMode {
    return this.mode;
  }

  // ═══════════════════════════════════════════════════════
  // CLUSTERS
  // ═══════════════════════════════════════════════════════

  /**
   * Obtener todos los clusters visibles para el usuario actual.
   * - LIVE_FULL: desde tablas clusters + cluster_usuarios + tareas
   *   (fallback a sintéticos si la tabla clusters está vacía)
   * - LIVE_HYBRID: clusters sintéticos desde DISTINCT datos_formulario->>cliente
   */
  async getClusters(): Promise<ClusterConUsuarios[]> {
    await this.ensureConnectionChecked();

    if (this.mode === 'LIVE_HYBRID') {
      return this.getSyntheticClusters();
    }

    // LIVE_FULL: cargar desde tablas reales
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: clusters, error } = await supabase
        .from('clusters')
        .select(`*, cluster_usuarios (id, usuario_id, created_at)`)
        .eq('activo', true)
        .order('nombre', { ascending: true });

      if (error) throw error;

      // 🆕 Fallback a clusters sintéticos si la tabla está vacía
      if (!clusters || clusters.length === 0) {
        console.warn('[MonitorService] Tabla clusters vacía en LIVE_FULL — generando sintéticos desde tareas');
        return this.getSyntheticClusters();
      }

      return this.enrichClustersWithCounts(clusters);
    } catch (err: any) {
      console.warn('[MonitorService] Error en getClusters (LIVE_FULL), degradando a sintéticos:', err.message);
      return this.getSyntheticClusters();
    }
  }

  /**
   * Obtener los clusters a los que pertenece un usuario.
   * Admin ve todos los clusters activos sin filtro de membresía.
   * Roles Visualizador* ven solo clusters de su cliente asignado.
   * En HYBRID no hay cluster_usuarios → devuelve todos los sintéticos.
   */
  async getClustersPorUsuario(usuarioId: string, rol?: string): Promise<ClusterConUsuarios[]> {
    await this.ensureConnectionChecked();

    // Admin ve todos los clusters activos, sin pasar por cluster_usuarios
    if (rol === 'Admin') {
      if (this.mode === 'LIVE_HYBRID') {
        return this.getSyntheticClusters();
      }
      // LIVE_FULL: Admin → todos los clusters activos
      return this.getClusters();
    }

    // 🆕 Visualizador: filtrar por cliente extraído del nombre del rol
    if (rol?.startsWith('Visualizador ')) {
      const visualizadorClient = rol.replace('Visualizador ', '').trim().toUpperCase();
      
      let allClusters: ClusterConUsuarios[];
      if (this.mode === 'LIVE_HYBRID') {
        allClusters = await this.getSyntheticClusters();
      } else {
        // LIVE_FULL: obtener todos los clusters activos sin filtro de membresía
        try {
          const { data: clusters } = await supabase
            .from('clusters')
            .select('*')
            .eq('activo', true)
            .order('nombre', { ascending: true });

          // 🆕 Fallback a sintéticos si la tabla clusters está vacía
          if (!clusters || clusters.length === 0) {
            console.warn('[MonitorService] Tabla clusters vacía para Visualizador — generando sintéticos desde tareas');
            allClusters = await this.getSyntheticClusters();
          } else {
            allClusters = await this.enrichClustersWithCounts(clusters);
          }
        } catch (err: any) {
          console.warn('[MonitorService] Error en getClustersPorUsuario (Visualizador), degradando a sintéticos:', err.message);
          allClusters = await this.getSyntheticClusters();
        }
      }

      // Filtrar solo clusters cuyo cliente coincida con el extraído del rol
      return allClusters.filter(c => (c.cliente || '').toUpperCase() === visualizadorClient);
    }

    if (this.mode === 'LIVE_HYBRID') {
      // Sin cluster_usuarios no podemos filtrar por membresía → todos los sintéticos
      return this.getSyntheticClusters();
    }

    // LIVE_FULL — usuario no-admin: filtrar por membresía en cluster_usuarios
    try {
      const { data: membresias, error } = await supabase
        .from('cluster_usuarios')
        .select('cluster_id')
        .eq('usuario_id', usuarioId);

      if (error) throw error;
      if (!membresias || membresias.length === 0) return [];

      const clusterIds = membresias.map(m => m.cluster_id);

      const { data: clusters, error: clusterError } = await supabase
        .from('clusters')
        .select(`*, cluster_usuarios (id, usuario_id, created_at)`)
        .in('id', clusterIds)
        .eq('activo', true)
        .order('nombre', { ascending: true });

      if (clusterError) throw clusterError;
      if (!clusters || clusters.length === 0) return [];

      return this.enrichClustersWithCounts(clusters);
    } catch (err: any) {
      console.warn('[MonitorService] Error en getClustersPorUsuario:', err.message);
      return this.getSyntheticClusters();
    }
  }

  // ═══════════════════════════════════════════════════════
  // CLUSTERS SINTÉTICOS (MODO HYBRID)
  // ═══════════════════════════════════════════════════════

  /**
   * Genera clusters a partir de valores DISTINCT de datos_formulario->>cliente
   * en la tabla tareas. Un cluster sintético por cada valor de cliente encontrado.
   */
  private async getSyntheticClusters(): Promise<ClusterConUsuarios[]> {
    try {
      // Obtener valores únicos de cliente + conteo de tareas por cliente
      const { data: tareas, error } = await supabase
        .from('tareas')
        .select('datos_formulario');

      if (error) throw error;
      if (!tareas || tareas.length === 0) return [];

      // Agrupar por cliente
      const clienteMap = new Map<string, number>();
      for (const t of tareas) {
        const df = t.datos_formulario as any;
        const cliente = df?.cliente?.toString().trim();
        if (cliente && cliente.length > 0) {
          clienteMap.set(cliente, (clienteMap.get(cliente) || 0) + 1);
        }
      }

      if (clienteMap.size === 0) return [];

      const now = new Date().toISOString();
      const syntheticClusters: ClusterConUsuarios[] = [];

      for (const [cliente, count] of clienteMap) {
        syntheticClusters.push({
          id: `synthetic-${cliente.toLowerCase().replace(/\s+/g, '-')}`,
          nombre: cliente,
          cliente,
          descripcion: `Cluster generado desde tareas (${cliente}) — ejecutá sql_clusters_monitor.sql para crear las tablas reales`,
          activo: true,
          tienda_id: undefined,
          created_at: now,
          updated_at: now,
          created_by: undefined,
          usuarios: [],
          cantidad_usuarios: 0,
          cantidad_tareas: count
        });
      }

      // Ordenar alfabéticamente
      syntheticClusters.sort((a, b) => a.nombre.localeCompare(b.nombre));

      return syntheticClusters;
    } catch (err: any) {
      console.warn('[MonitorService] Error generando clusters sintéticos:', err.message);
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════
  // HELPERS DE CLUSTERS
  // ═══════════════════════════════════════════════════════

  private async enrichClustersWithCounts(clusters: any[]): Promise<ClusterConUsuarios[]> {
    return Promise.all(
      clusters.map(async (c: any) => {
        const { count } = await supabase
          .from('tareas')
          .select('id', { count: 'exact', head: true })
          .filter('datos_formulario->>cliente', 'eq', c.cliente);

        return {
          id: c.id,
          nombre: c.nombre,
          cliente: c.cliente,
          descripcion: c.descripcion,
          activo: c.activo,
          tienda_id: c.tienda_id,
          created_at: c.created_at,
          updated_at: c.updated_at,
          created_by: c.created_by,
          usuarios: (c.cluster_usuarios || []).map((cu: any) => ({
            id: cu.id,
            cluster_id: c.id,
            usuario_id: cu.usuario_id,
            created_at: cu.created_at
          })),
          cantidad_usuarios: (c.cluster_usuarios || []).length,
          cantidad_tareas: count || 0
        };
      })
    );
  }

  // ═══════════════════════════════════════════════════════
  // TAREAS POR CLUSTER
  // ═══════════════════════════════════════════════════════

  async getTareasPorCluster(
    cliente: string,
    filtros?: MonitorFilters
  ): Promise<Tarea[]> {
    await this.ensureConnectionChecked();

    // LIVE_FULL y LIVE_HYBRID: query directo a tareas
    try {
      let query = supabase
        .from('tareas')
        .select('*')
        .filter('datos_formulario->>cliente', 'eq', cliente)
        .order('created_at', { ascending: false });

      if (filtros?.estado) {
        query = query.eq('estado', filtros.estado);
      }

      if (filtros?.fechaDesde) {
        query = query.gte('created_at', `${filtros.fechaDesde}T00:00:00`);
      }

      if (filtros?.fechaHasta) {
        query = query.lte('created_at', `${filtros.fechaHasta}T23:59:59`);
      }

      if (filtros?.busqueda) {
        const q = `%${filtros.busqueda}%`;
        query = query.or(`consecutivo.ilike.${q},descripcion_breve.ilike.${q}`);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []) as Tarea[];
    } catch (err: any) {
      console.warn('[MonitorService] Error en getTareasPorCluster:', err.message);
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════
  // ESTADÍSTICAS
  // ═══════════════════════════════════════════════════════

  async getStats(cliente: string): Promise<MonitorStats> {
    await this.ensureConnectionChecked();

    try {
      const { data, error } = await supabase
        .from('tareas')
        .select('estado')
        .filter('datos_formulario->>cliente', 'eq', cliente);

      if (error) throw error;

      const arr = data || [];
      return {
        total: arr.length,
        en_cola: arr.filter(t => t.estado === 'En Cola').length,
        en_proceso: arr.filter(t => t.estado === 'En Proceso').length,
        produciendo: arr.filter(t => t.estado === 'Produciendo').length,
        esperando_suministros: arr.filter(t => t.estado === 'Esperando suministros').length,
        finalizado: arr.filter(t => t.estado === 'Finalizado').length
      };
    } catch (err: any) {
      console.warn('[MonitorService] Error en getStats:', err.message);
      return {
        total: 0, en_cola: 0, en_proceso: 0, produciendo: 0,
        esperando_suministros: 0, finalizado: 0
      };
    }
  }

  // ═══════════════════════════════════════════════════════
  // COMENTARIOS
  // ═══════════════════════════════════════════════════════

  /**
   * Obtiene un digest ligero con la fecha del último comentario y el conteo
   * para cada tarea. Útil para determinar notificaciones no leídas sin
   * cargar todos los comentarios.
   */
  async getLatestCommentDigests(tareaIds: string[]): Promise<Map<string, { latestAt: string; count: number }>> {
    await this.ensureConnectionChecked();

    const result = new Map<string, { latestAt: string; count: number }>();

    if (tareaIds.length === 0) return result;

    // LIVE_FULL
    try {
      const numericIds = tareaIds.map(id => parseInt(id, 10)).filter(n => !isNaN(n));
      if (numericIds.length === 0) return result;

      const { data, error } = await supabase
        .from('tarea_comentarios')
        .select('tarea_id, created_at')
        .in('tarea_id', numericIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        for (const row of data) {
          const tid = String(row.tarea_id);
          const existing = result.get(tid);
          if (!existing) {
            result.set(tid, { latestAt: row.created_at, count: 1 });
          } else {
            result.set(tid, { latestAt: existing.latestAt, count: existing.count + 1 });
          }
        }
      }
    } catch (err: any) {
      console.warn('[MonitorService] Error en getLatestCommentDigests:', err.message);
    }

    return result;
  }

  async getComentarios(tareaId: string): Promise<TareaComentario[]> {
    await this.ensureConnectionChecked();

    // LIVE_FULL: traer comentarios con info real del usuario
    try {
      const { data, error } = await supabase
        .from('tarea_comentarios')
        .select('*')
        .eq('tarea_id', tareaId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Obtener datos reales de los usuarios que comentaron
      const userIds = [...new Set(data.map(c => c.usuario_id))];
      const { data: usuariosData, error: usuariosError } = await supabase
        .from('usuarios')
        .select('id, email, nombre_completo')
        .in('id', userIds);

      if (usuariosError) {
        console.warn('[MonitorService] Error cargando usuarios de comentarios:', usuariosError.message);
      }

      const usuariosMap = new Map(
        (usuariosData || []).map(u => [u.id, u])
      );

      return data.map(c => {
        const usuarioInfo = usuariosMap.get(c.usuario_id);
        return {
          id: c.id,
          tarea_id: String(c.tarea_id),
          usuario_id: c.usuario_id,
          comentario: c.comentario,
          created_at: c.created_at,
          usuario: {
            id: c.usuario_id,
            email: usuarioInfo?.email || '',
            nombre_completo: usuarioInfo?.nombre_completo || undefined
          }
        };
      });
    } catch (err: any) {
      console.warn('[MonitorService] Error en getComentarios:', err.message);
      return [];
    }
  }

  async addComentario(
    tareaId: string,
    usuarioId: string,
    comentario: string,
    usuario?: { id: string; email: string; nombre_completo?: string }
  ): Promise<TareaComentario> {
    await this.ensureConnectionChecked();

    // LIVE_FULL
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('tarea_comentarios')
        .insert({
          tarea_id: parseInt(tareaId, 10),
          usuario_id: user.id,
          comentario
        })
        .select()
        .single();

      if (error) throw error;

      const result: TareaComentario = {
        id: data.id,
        tarea_id: String(data.tarea_id),
        usuario_id: data.usuario_id,
        comentario: data.comentario,
        created_at: data.created_at,
        usuario: usuario || { id: user.id, email: user.email || '' }
      };

      this.dispararEventoComentario(tareaId, data.id, user.id, comentario);

      return result;
    } catch (err: any) {
      console.warn('[MonitorService] Error agregando comentario:', err.message);
      throw err;
    }
  }

  // ═══════════════════════════════════════════════════════
  // CORRESPONDENCIA
  // ═══════════════════════════════════════════════════════

  private async dispararEventoComentario(
    tareaId: string,
    comentarioId: string,
    usuarioId: string,
    comentario: string
  ): Promise<void> {
    // Solo disparar en LIVE_FULL (necesita clusters + cluster_usuarios)
    if (this.mode !== 'LIVE_FULL') return;

    try {
      // 1. Obtener la tarea
      const { data: tarea } = await supabase
        .from('tareas')
        .select('tienda_id, consecutivo, descripcion_breve, datos_formulario, email_solicitante')
        .eq('id', tareaId)
        .single();

      if (!tarea) return;

      // 2. Obtener info del usuario que comentó
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('correo, nombre_completo')
        .eq('id', usuarioId)
        .maybeSingle();

      const autorNombre = usuarioData?.nombre_completo || usuarioData?.correo || 'Usuario';
      const autorEmail = usuarioData?.correo || '';

      // 3. Disparar notificación SMTP directa al admin de la tienda
      console.log('[MonitorService] Enviando notificación SMTP por comentario en tarea:', tareaId);
      
      const { error: notifError } = await supabase.functions.invoke('enviar-notificacion-tarea', {
        body: {
          tarea_id: tareaId,
          tipo: 'comentario',
          comentario,
          comentario_autor: autorNombre,
          comentario_autor_email: autorEmail
        }
      });

      if (notifError) {
        console.warn('[MonitorService] Error al enviar notificación SMTP de comentario:', notifError);
      } else {
        console.log('[MonitorService] Notificación SMTP de comentario enviada correctamente');
      }

      // 4. También disparar evento de correspondencia (para reglas adicionales si existen)
      const df = tarea.datos_formulario as any;
      const cliente = df?.cliente;

      if (cliente) {
        const { data: clustersDelCliente } = await supabase
          .from('clusters')
          .select('id')
          .eq('cliente', cliente)
          .eq('activo', true);

        let destinatariosCluster: string[] = [];
        if (clustersDelCliente && clustersDelCliente.length > 0) {
          const clusterIds = clustersDelCliente.map(c => c.id);
          const { data: miembros } = await supabase
            .from('cluster_usuarios')
            .select('usuario_id')
            .in('cluster_id', clusterIds);
          destinatariosCluster = (miembros || []).map(m => m.usuario_id);
        }

        await supabase.functions.invoke('correspondencia-disparar-evento', {
          body: {
            evento: 'tarea.comentario_agregado',
            tienda_id: tarea.tienda_id,
            entity_data: {
              tarea_id: tareaId,
              comentario_id: comentarioId,
              usuario_id: usuarioId,
              comentario,
              consecutivo: tarea.consecutivo,
              descripcion_breve: tarea.descripcion_breve,
              cliente,
              email_solicitante: tarea.email_solicitante,
              destinatarios_cluster: destinatariosCluster,
              comentario_autor: autorNombre,
              comentario_autor_email: autorEmail
            }
          }
        });
      }
    } catch (err: any) {
      console.warn('[MonitorService] No se pudo disparar evento de correspondencia:', err.message);
    }
  }

}

export const monitorService = new MonitorService();
export default monitorService;