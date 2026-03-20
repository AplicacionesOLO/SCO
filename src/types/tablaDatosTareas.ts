// =====================================================
// TIPOS PARA TABLA DE DATOS TAREAS (ANÁLISIS EDA)
// =====================================================

export interface TareaAnalisis {
  id: string;
  caso: string; // consecutivo
  cliente: string;
  cliente_olo_5?: string;
  descripcion: string;
  solicitante: string;
  inicio: string;
  cierre: string;
  cantidad_personas: number;
  responsable: string;
  entregado_a: string;
  observaciones_va: string;
  estado: string;
  
  // Items agrupados por categoría
  items: ItemTarea[];
  
  // Totales por categoría (dinámico)
  totales_por_categoria: Record<string, number>;
  
  // Alerta de HH si hay discrepancia > 30%
  alerta_hh?: string;
  
  // Totales por categoría (compatibilidad)
  dedicados: number;
  etiquetas: number;
  hh: number;
  total_general: number;
}

export interface ItemTarea {
  id: string;
  inventario_id?: number;
  descripcion: string;
  codigo_articulo?: string | null;
  categoria: string;
  unidad_medida?: string | null;
  cantidad: number;
  precio_unitario: number;
  costo_unitario: number;
  total: number;
  costo_total: number;
}

export interface TotalesPorCliente {
  cliente: string;
  total: number;
}

export interface FiltrosTablaDatos {
  busqueda?: string;
  fecha_inicio_desde?: string;
  fecha_cierre_hasta?: string;
  estado?: string;
  cliente?: string;
}

export interface EstadisticasEDA {
  total_tareas: number;
  total_produccion: number;
  promedio_por_tarea: number;
  total_horas_hombre: number;
  total_etiquetas: number;
  total_dedicados: number;
}
