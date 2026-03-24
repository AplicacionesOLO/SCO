// Tipos para el módulo de Seguimiento de Pedidos

export interface SeguimientoEstado {
  id: number;
  codigo: string;
  nombre_publico: string;
  orden: number;
  rol_sugerido_id?: number;
  es_final: boolean;
  visible_cliente: boolean;
  color: string;
  icono: string;
  created_at: string;
  updated_at: string;
}

export interface PedidoSeguimiento {
  id: string;
  pedido_id: number;
  tienda_id: string;
  estado_actual: string;
  responsable_id?: string;
  responsable?: {
    id: string;
    nombre_completo: string;
    email: string;
  };
  comentario_ultimo?: string;
  progreso_porcentaje: number;
  fecha_inicio: string;
  fecha_estimada_finalizacion?: string;
  fecha_finalizacion?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  pedido?: {
    id: number;
    codigo: string;
    estado: string;
    total: number;
    cliente?: {
      nombre: string;
    };
  };
}

export interface SeguimientoHistorial {
  id: string;
  seguimiento_id: string;
  pedido_id: number;
  estado_anterior?: string;
  estado_nuevo: string;
  responsable_id: string;
  responsable?: {
    id: string;
    nombre_completo: string;
    email: string;
  };
  comentario?: string;
  duracion_minutos?: number;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface SeguimientoTransicion {
  id: number;
  estado_origen: string;
  estado_destino: string;
  requiere_comentario: boolean;
  requiere_aprobacion: boolean;
  rol_requerido_id?: number;
  orden: number;
  activo: boolean;
  created_at: string;
}

export interface CreateSeguimientoRequest {
  pedido_id: number;
  tienda_id: string;
  estado_actual?: string;
  responsable_id?: string;
  comentario_ultimo?: string;
}

export interface UpdateSeguimientoEstadoRequest {
  seguimiento_id: string;
  estado_nuevo: string;
  comentario?: string;
  responsable_id?: string;
}

export interface SeguimientoFilters {
  estado?: string;
  responsable_id?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  search?: string;
}

export interface SeguimientoKanbanColumn {
  estado: SeguimientoEstado;
  seguimientos: PedidoSeguimiento[];
  count: number;
}

export interface SeguimientoStats {
  total: number;
  por_estado: Record<string, number>;
  tiempo_promedio_por_estado: Record<string, number>;
  en_tiempo: number;
  retrasados: number;
}
