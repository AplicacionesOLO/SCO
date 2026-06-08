// =====================================================
// SERVICIO PARA EL MÓDULO DE MONITOR (CLUSTERS)
// =====================================================
// Máquina de 3 estados:
//   LIVE_FULL  → Supabase + tablas de monitor existentes
//   LIVE_HYBRID → Supabase + tareas accesible pero sin tablas de monitor
//   MOCK       → Sin Supabase o sin acceso a tareas
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
import { MOCK_CLUSTERS, MOCK_COMENTARIOS, MOCK_MONITOR_STATS } from '../mocks/monitorData';

class MonitorService {
  private mode: MonitorMode = 'MOCK';
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
      this.mode = 'MOCK';
      this.modeReason = 'No hay VITE_PUBLIC_SUPABASE_URL configurada en .env';
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
          this.mode = 'MOCK';
          this.modeReason = `Supabase conectado pero la tabla 'tareas' no existe: ${tareasError.message}`;
        } else if (tareasError.code === 'PGRST301' || tareasError.code === '401') {
          // Error de RLS o autenticación
          this.mode = 'MOCK';
          this.modeReason = `Supabase conectado pero error de permisos en tareas: ${tareasError.message}`;
        } else {
          this.mode = 'MOCK';
          this.modeReason = `Supabase conectado pero error al leer tareas: ${tareasError.code} - ${tareasError.message}`;
        }
        this.connectionChecked = true;
        this.logDiagnostic();
        return;
      }

      // tareas es accesible → el sistema está vivo
      this.tareasAccessible = true;

    } catch (err: any) {
      this.mode = 'MOCK';
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
   * - LIVE_HYBRID: clusters sintéticos desde DISTINCT datos_formulario->>cliente
   * - MOCK: datos de prueba
   */
  async getClusters(): Promise<ClusterConUsuarios[]> {
    await this.ensureConnectionChecked();

    if (this.mode === 'MOCK') {
      return MOCK_CLUSTERS.filter(c => c.activo);
    }

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
      if (!clusters || clusters.length === 0) return [];

      return this.enrichClustersWithCounts(clusters);
    } catch (err: any) {
      console.warn('[MonitorService] Error en getClusters (LIVE_FULL), degradando a sintéticos:', err.message);
      return this.getSyntheticClusters();
    }
  }

  /**
   * Obtener los clusters a los que pertenece un usuario.
   * Admin ve todos los clusters activos sin filtro de membresía.
   * En HYBRID no hay cluster_usuarios → devuelve todos los sintéticos.
   */
  async getClustersPorUsuario(usuarioId: string, rol?: string): Promise<ClusterConUsuarios[]> {
    await this.ensureConnectionChecked();

    // Admin ve todos los clusters activos, sin pasar por cluster_usuarios
    if (rol === 'Admin') {
      if (this.mode === 'MOCK') {
        return MOCK_CLUSTERS.filter(c => c.activo);
      }
      if (this.mode === 'LIVE_HYBRID') {
        return this.getSyntheticClusters();
      }
      // LIVE_FULL: Admin → todos los clusters activos
      return this.getClusters();
    }

    if (this.mode === 'MOCK') {
      const mockFiltrados = MOCK_CLUSTERS.filter(c =>
        c.activo && c.usuarios.some(u => u.usuario_id === usuarioId)
      );
      return mockFiltrados.length > 0 ? mockFiltrados : MOCK_CLUSTERS.filter(c => c.activo);
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

    if (this.mode === 'MOCK') {
      return this.getMockTareasPorCliente(cliente, filtros);
    }

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

      if (filtros?.busqueda) {
        const q = `%${filtros.busqueda}%`;
        query = query.or(`consecutivo.ilike.${q},descripcion_breve.ilike.${q}`);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []) as Tarea[];
    } catch (err: any) {
      console.warn('[MonitorService] Error en getTareasPorCluster:', err.message);
      if (this.mode === 'LIVE_HYBRID') {
        // En hybrid sin fallback a mocks: devolver vacío con warning visible
        console.warn('[MonitorService] No se pudieron cargar tareas reales. Verificá RLS y permisos.');
        return [];
      }
      return this.getMockTareasPorCliente(cliente, filtros);
    }
  }

  // ═══════════════════════════════════════════════════════
  // ESTADÍSTICAS
  // ═══════════════════════════════════════════════════════

  async getStats(cliente: string): Promise<MonitorStats> {
    await this.ensureConnectionChecked();

    if (this.mode === 'MOCK') {
      return MOCK_MONITOR_STATS[cliente] || {
        total: 0, en_cola: 0, en_proceso: 0, produciendo: 0,
        esperando_suministros: 0, finalizado: 0
      };
    }

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

  async getComentarios(tareaId: string): Promise<TareaComentario[]> {
    await this.ensureConnectionChecked();

    if (this.mode === 'MOCK') {
      return MOCK_COMENTARIOS.filter(c => c.tarea_id === tareaId);
    }

    if (this.mode === 'LIVE_HYBRID') {
      // Tabla tarea_comentarios no existe todavía
      return [];
    }

    // LIVE_FULL
    try {
      const { data, error } = await supabase
        .from('tarea_comentarios')
        .select('*')
        .eq('tarea_id', tareaId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      return data.map(c => ({
        id: c.id,
        tarea_id: String(c.tarea_id),
        usuario_id: c.usuario_id,
        comentario: c.comentario,
        created_at: c.created_at,
        usuario: {
          id: c.usuario_id,
          email: '',
          nombre_completo: undefined
        }
      }));
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

    if (this.mode === 'MOCK') {
      const nuevo: TareaComentario = {
        id: `com-${Date.now()}`,
        tarea_id: tareaId,
        usuario_id: usuarioId,
        usuario: usuario || { id: usuarioId, email: 'usuario@example.com' },
        comentario,
        created_at: new Date().toISOString()
      };
      MOCK_COMENTARIOS.push(nuevo);
      return nuevo;
    }

    if (this.mode === 'LIVE_HYBRID') {
      throw new Error(
        'Comentarios no disponibles. Las tablas del monitor (tarea_comentarios) aún no existen. ' +
        'Ejecutá sql_clusters_monitor.sql en Supabase para habilitar esta función.'
      );
    }

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

      const df = tarea.datos_formulario as any;
      const cliente = df?.cliente;

      if (!cliente) return;

      // 2. Obtener los IDs de clusters que cubren este cliente
      const { data: clustersDelCliente } = await supabase
        .from('clusters')
        .select('id')
        .eq('cliente', cliente)
        .eq('activo', true);

      if (!clustersDelCliente || clustersDelCliente.length === 0) return;

      const clusterIds = clustersDelCliente.map(c => c.id);

      // 3. Obtener usuarios de esos clusters
      const { data: miembros } = await supabase
        .from('cluster_usuarios')
        .select('usuario_id')
        .in('cluster_id', clusterIds);

      const destinatariosCluster = (miembros || []).map(m => m.usuario_id);

      // 4. Disparar evento de correspondencia
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
            destinatarios_cluster: destinatariosCluster
          }
        }
      });
    } catch (err: any) {
      console.warn('[MonitorService] No se pudo disparar evento de correspondencia:', err.message);
    }
  }

  // ═══════════════════════════════════════════════════════
  // MOCK DATA (respaldo última instancia)
  // ═══════════════════════════════════════════════════════

  private getMockTareasPorCliente(cliente: string, filtros?: MonitorFilters): Tarea[] {
    const now = new Date();
    const estadosBase = ['En Cola', 'En Proceso', 'Produciendo', 'Esperando suministros', 'Finalizado'] as const;

    const cantidad = cliente === 'COFERSA' ? 12 : 8;
    const prefijo = cliente === 'COFERSA' ? 'COF' : 'EPA';
    const descripcionesCofersa = [
      'Etiquetado de productos nueva línea',
      'Cambio de imagen empaque primario',
      'Re-empacar productos lote B-2026',
      'Suministros para línea de producción A',
      'Licencias de importación lote marzo',
      'Etiquetado bilingüe para exportación',
      'Cambio de imagen cajas display',
      'Re-empacar devoluciones cliente X',
      'Suministros etiquetas holográficas',
      'Licencias renovación anual',
      'Etiquetado promocional temporada',
      'Cambio de imagen catálogo digital'
    ];
    const descripcionesEPA = [
      'Códigos de barra producto nuevo',
      'Registros sanitarios línea cosméticos',
      'Licencias contenedor mayo 2026',
      'Traducción manuales al inglés',
      'Suministros material empaque',
      'Usos Delta Plus certificación',
      'Armado de sillas exhibición',
      'Códigos de barra actualización masiva'
    ];

    const descs = cliente === 'COFERSA' ? descripcionesCofersa : descripcionesEPA;

    const tareasMock: Tarea[] = [];
    for (let i = 0; i < cantidad; i++) {
      const diasAtras = Math.floor(Math.random() * 30);
      const fecha = new Date(now);
      fecha.setDate(fecha.getDate() - diasAtras);

      const estadoIndex = Math.min(Math.floor(i / (cantidad / estadosBase.length)), estadosBase.length - 1);
      const estado = estadosBase[estadoIndex];

      const fechaEstimada = new Date(fecha);
      fechaEstimada.setDate(fechaEstimada.getDate() + 7 + Math.floor(Math.random() * 14));

      tareasMock.push({
        id: `mock-${prefijo}-${String(i + 1).padStart(3, '0')}`,
        consecutivo: `${prefijo}-2026-${String(i + 1).padStart(4, '0')}`,
        tienda_id: 1,
        solicitante_id: `user-${100 + i}`,
        email_solicitante: 'solicitante@example.com',
        datos_formulario: {
          cliente,
          departamento_solicitante: i % 2 === 0 ? 'Servicio al Cliente' : 'Zona Franca',
          solicitud_cofersa: cliente === 'COFERSA' ? (['Etiquetado', 'Cambio de imagen', 'Re-empacar productos', 'Suministros', 'Licencias'] as const)[i % 5] : undefined,
          solicitud_epa: cliente === 'EPA' ? (['Códigos de Barra', 'Registros sanitarios', 'Licencias / contenedores / Pallets', 'Traducción', 'Suministros', 'Usos Delta Plus', 'Armado de sillas'] as const)[i % 7] : undefined
        },
        fecha_estimada_entrega: fechaEstimada.toISOString().split('T')[0],
        cantidad_unidades: 100 + Math.floor(Math.random() * 900),
        descripcion_breve: descs[i] || `Tarea ${i + 1}`,
        estado,
        total_costo: 50000 + Math.floor(Math.random() * 450000),
        created_at: fecha.toISOString(),
        updated_at: fecha.toISOString()
      });
    }

    let resultado = tareasMock;

    if (filtros?.estado) {
      resultado = resultado.filter(t => t.estado === filtros.estado);
    }
    if (filtros?.busqueda) {
      const q = filtros.busqueda.toLowerCase();
      resultado = resultado.filter(t =>
        t.consecutivo?.toLowerCase().includes(q) ||
        t.descripcion_breve?.toLowerCase().includes(q) ||
        t.email_solicitante?.toLowerCase().includes(q)
      );
    }

    return resultado;
  }
}

export const monitorService = new MonitorService();
export default monitorService;