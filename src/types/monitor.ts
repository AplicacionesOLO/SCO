// =====================================================
// TIPOS PARA EL MÓDULO DE MONITOR (CLUSTERS & VISUALIZADOR)
// =====================================================

import type { Tarea, TareaEstado } from './tarea';

// ─── CLUSTER ────────────────────────────────────────────

export interface Cluster {
  id: string;
  nombre: string;
  cliente: string;
  descripcion?: string;
  activo: boolean;
  tienda_id?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface ClusterUsuario {
  id: string;
  cluster_id: string;
  usuario_id: string;
  usuario?: ClusterUsuarioInfo;
  created_at: string;
}

export interface ClusterUsuarioInfo {
  id: string;
  email: string;
  nombre_completo?: string;
}

export interface ClusterConUsuarios extends Cluster {
  usuarios: ClusterUsuario[];
  cantidad_usuarios: number;
  cantidad_tareas: number;
}

// ─── COMENTARIOS ────────────────────────────────────────

export interface TareaComentario {
  id: string;
  tarea_id: string;
  usuario_id: string;
  usuario?: {
    id: string;
    email: string;
    nombre_completo?: string;
  };
  comentario: string;
  created_at: string;
}

// ─── FILTROS DEL MONITOR ────────────────────────────────

export interface MonitorFilters {
  estado?: TareaEstado | '';
  busqueda?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

// ─── STATS DEL MONITOR ──────────────────────────────────

export interface MonitorStats {
  total: number;
  en_cola: number;
  en_proceso: number;
  produciendo: number;
  esperando_suministros: number;
  finalizado: number;
}

// ─── CONTEXTO DEL MONITOR ───────────────────────────────

export interface MonitorContexto {
  cluster: Cluster | null;
  tareas: Tarea[];
  stats: MonitorStats;
  loading: boolean;
  filtros: MonitorFilters;
}

// ─── DIAGNÓSTICO ────────────────────────────────────────

export type MonitorMode = 'LIVE_FULL' | 'LIVE_HYBRID';

export interface MonitorDebugInfo {
  mode: MonitorMode;
  reason: string;
  supabaseUrl: string | null;
  supabaseConnected: boolean;
  tareasAccessible: boolean;
  clustersTableExists: boolean;
  clusterUsuariosTableExists: boolean;
  tareaComentariosTableExists: boolean;
}