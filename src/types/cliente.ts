export interface Cliente {
  id?: number;
  tipo_persona: 'fisica' | 'juridica' | 'extranjero';
  tipo_identificacion: 'cedula_fisica' | 'cedula_juridica' | 'dimex' | 'nite' | 'pasaporte';
  identificacion: string;
  nombre_razon_social: string;
  nombre_comercial?: string;
  
  // Contacto
  correo_principal: string;
  correos_adicionales?: string[];
  telefono_pais: string;
  telefono_numero?: string;
  telefono_secundario?: string;
  
  // Dirección CR
  provincia_id?: number;
  canton_id?: number;
  distrito_id?: number;
  barrio?: string;
  otras_senas?: string;
  codigo_postal?: string;
  
  // Dirección extranjero
  pais_iso?: string;
  direccion_extranjero_line1?: string;
  direccion_extranjero_line2?: string;
  
  // Fiscal
  codigo_actividad_economica?: string;
  regimen_tributario?: 'general' | 'simplificado' | 'exento' | 'otro';
  exoneracion_numero?: string;
  exoneracion_institucion?: string;
  exoneracion_porcentaje?: number;
  exoneracion_vencimiento?: string;
  
  // Preferencias comerciales
  moneda_preferida: string;
  condicion_venta_preferida?: string;
  dias_credito: number;
  limite_credito: number;
  lista_precios_id?: number;
  
  // Integración Hacienda
  hacienda_estado_validacion: 'pendiente' | 'valido' | 'no_valido' | 'error';
  hacienda_ultimo_mensaje?: string;
  hacienda_ultimo_intento?: string;
  
  activo: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface Provincia {
  id: number;
  codigo: string;
  nombre: string;
  activo: boolean;
}

export interface Canton {
  id: number;
  provincia_id: number;
  codigo: string;
  nombre: string;
  activo: boolean;
}

export interface Distrito {
  id: number;
  canton_id: number;
  codigo: string;
  nombre: string;
  activo: boolean;
}

export interface Pais {
  id: number;
  codigo_iso: string;
  nombre: string;
  activo: boolean;
}

export interface ActividadEconomica {
  id: number;
  codigo: string;
  descripcion: string;
  activo: boolean;
}

export type ClienteFormData = Omit<Cliente, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;

export interface ClienteFilters {
  search?: string;
  tipo_persona?: string;
  hacienda_estado_validacion?: string;
  activo?: boolean;
}