export type EstadoCorreo = 'pendiente' | 'enviando' | 'enviado' | 'error' | 'reintentando';

export type EventoTrigger =
  | 'manual'
  | 'tarea.creada'
  | 'tarea.estado_cambiado'
  | 'tarea.finalizada'
  | 'cotizacion.creada'
  | 'pedido.creado'
  | 'pedido.estado_cambiado';

export interface VariablePlantilla {
  nombre: string;
  descripcion: string;
}

export interface DestinatariosConfig {
  tipo: 'fijo' | 'dinamico';
  emails?: string[];
  campo_email?: string;
}

export interface CorrespondenciaPlantilla {
  id: number;
  tienda_id: string | null;
  nombre: string;
  descripcion: string | null;
  asunto: string;
  cuerpo_html: string;
  variables: VariablePlantilla[];
  activo: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CorrespondenciaRegla {
  id: number;
  tienda_id: string | null;
  nombre: string;
  descripcion: string | null;
  evento_trigger: EventoTrigger;
  condiciones: Record<string, unknown>;
  plantilla_id: number | null;
  destinatarios_config: DestinatariosConfig;
  cc: string[];
  cco: string[];
  activo: boolean;
  prioridad: number;
  max_reintentos: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  plantilla?: Pick<CorrespondenciaPlantilla, 'id' | 'nombre' | 'asunto'>;
}

export interface CorrespondenciaHistorial {
  id: number;
  tienda_id: string | null;
  regla_id: number | null;
  plantilla_id: number | null;
  para: string[];
  cc: string[];
  cco: string[];
  asunto: string;
  cuerpo_html: string | null;
  estado: EstadoCorreo;
  intentos: number;
  ultimo_intento: string | null;
  proximo_reintento: string | null;
  error_detalle: string | null;
  metadata: Record<string, unknown>;
  evento_origen: string | null;
  enviado_en: string | null;
  created_at: string;
  updated_at: string;
  regla?: Pick<CorrespondenciaRegla, 'id' | 'nombre'>;
  plantilla?: Pick<CorrespondenciaPlantilla, 'id' | 'nombre'>;
}

export interface CreatePlantillaData {
  tienda_id?: string | null;
  nombre: string;
  descripcion?: string;
  asunto: string;
  cuerpo_html: string;
  variables?: VariablePlantilla[];
  activo?: boolean;
}

export interface CreateReglaData {
  tienda_id?: string | null;
  nombre: string;
  descripcion?: string;
  evento_trigger: EventoTrigger;
  condiciones?: Record<string, unknown>;
  plantilla_id?: number | null;
  destinatarios_config?: DestinatariosConfig;
  cc?: string[];
  cco?: string[];
  activo?: boolean;
  prioridad?: number;
  max_reintentos?: number;
}

export interface EnvioManualPayload {
  para: string[];
  cc?: string[];
  cco?: string[];
  asunto: string;
  cuerpo_html: string;
  plantilla_id?: number;
  tienda_id?: string;
  evento_origen?: string;
  metadata?: Record<string, unknown>;
  /** Valores de variables dinámicas para reemplazar en asunto y cuerpo */
  variables_data?: Record<string, string>;
}

export interface HistorialFiltros {
  estado?: EstadoCorreo | '';
  fecha_desde?: string;
  fecha_hasta?: string;
  busqueda?: string;
}

export interface CorrespondenciaStats {
  total: number;
  enviados: number;
  errores: number;
  pendientes: number;
  tasa_exito: number;
}
