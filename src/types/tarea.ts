// =====================================================
// TIPOS PARA EL MÓDULO DE TAREAS
// =====================================================

export interface Tarea {
  id: string;
  consecutivo: string;
  tienda_id: number;
  solicitante_id: string;
  email_solicitante: string;
  datos_formulario: Record<string, any>;
  cotizacion_id?: string;
  
  // Campos de procesamiento
  fecha_estimada_entrega?: string;
  cantidad_unidades?: number;
  descripcion_breve?: string;
  
  // Campos de análisis
  cantidad_personas?: number;
  fecha_inicio?: string;
  fecha_cierre?: string;
  entregado_a?: string;
  
  // Estado
  estado: TareaEstado;
  
  // Totales
  total_costo: number;
  
  // Auditoría
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  
  // Relaciones
  solicitante?: {
    id: string;
    email: string;
    nombre?: string;
  };
  items?: TareaItem[];
  personal_asignado?: TareaPersonalAsignado[];
}

export type TareaEstado = 
  | 'En Cola' 
  | 'En Proceso' 
  | 'Produciendo' 
  | 'Esperando suministros' 
  | 'Terminado' 
  | 'Finalizado';

export interface TareaItem {
  id: string;
  tarea_id: string;
  item_type: 'inventario' | 'producto' | 'servicio' | 'otro';
  item_id?: number;
  descripcion: string;
  cantidad: number;
  costo_unitario: number;
  total: number;
  created_at: string;
  updated_at: string;
}

// =====================================================
// NUEVOS TIPOS PARA FORMULARIO DINÁMICO
// =====================================================

export type DepartamentoSolicitante = 'Servicio al Cliente' | 'Zona Franca' | 'Otros';
export type ClienteType = 'EPA' | 'COFERSA';
export type SolicitudEPA = 'Códigos de Barra' | 'Registros sanitarios' | 'Licencias / contenedores / Pallets' | 'Traducción' | 'Suministros' | 'Usos Delta Plus' | 'Armado de sillas';
export type SolicitudCOFERSA = 'Etiquetado' | 'Cambio de imagen' | 'Licencias' | 'Suministros' | 'Re-empacar productos';
export type TipoTrabajo = 'Trabajo Interno (Stock)' | 'Clientes de Cofersa';

export interface ItemTablaSimple {
  codigo: string;
  cantidad: number;
}

export interface ItemTablaCompleta {
  descripcion: string;
  cantidad: number;
  motivo: string;
}

export interface DatosFormularioTarea {
  // Campos base
  departamento_solicitante: DepartamentoSolicitante;
  cliente?: ClienteType;
  
  // Campos condicionales EPA
  solicitud_epa?: SolicitudEPA;
  items_tabla_simple?: ItemTablaSimple[];
  items_tabla_completa?: ItemTablaCompleta[];
  
  // Campos condicionales COFERSA
  solicitud_cofersa?: SolicitudCOFERSA;
  tipo_trabajo?: TipoTrabajo;
  items_cofersa?: ItemTablaSimple[];
  
  // Archivo Excel opcional
  archivo_excel?: File | null;
}

// =====================================================
// TIPOS EXISTENTES
// =====================================================

export interface TareaConfigCampo {
  id: string;
  tienda_id: number;
  nombre_campo: string;
  tipo_campo: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox' | 'email' | 'tel';
  etiqueta: string;
  placeholder?: string;
  requerido: boolean;
  opciones?: Array<{ value: string; label: string }>;
  orden: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface TareaEncargado {
  id: string;
  tienda_id: number;
  usuario_id: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
  usuario?: {
    id: string;
    email: string;
    nombre?: string;
  };
}

export interface TareaColaborador {
  id: string;
  tienda_id: number;
  nombre: string;
  email?: string;
  telefono?: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface TareaPersonalAsignado {
  id: string;
  tarea_id: string;
  colaborador_id: string;
  created_at: string;
  colaborador?: TareaColaborador;
}

export interface CreateTareaData {
  tienda_id?: number;
  solicitante_id?: string;
  email_solicitante?: string;
  datos_formulario: Record<string, any>;
  cotizacion_id?: number;
  fecha_estimada_entrega?: string;
  cantidad_unidades?: number;
  descripcion_breve?: string;
}

export interface UpdateTareaData {
  fecha_estimada_entrega?: string;
  cantidad_unidades?: number;
  descripcion_breve?: string;
  cantidad_personas?: number;
  fecha_inicio?: string;
  fecha_cierre?: string;
  entregado_a?: string;
  estado?: TareaEstado;
  items?: Array<{
    item_type: 'inventario' | 'producto' | 'servicio' | 'otro';
    item_id?: number;
    descripcion: string;
    cantidad: number;
    costo_unitario: number;
  }>;
  personal_asignado?: string[]; // Array de IDs de colaboradores
}

export interface TareaFilters {
  estado?: TareaEstado | '';
  fecha_desde?: string;
  fecha_hasta?: string;
  busqueda?: string;
  solicitante_id?: string;
}

export interface TareaStats {
  total: number;
  en_cola: number;
  en_proceso: number;
  produciendo: number;
  esperando_suministros: number;
  terminado: number;
  finalizado: number;
}
