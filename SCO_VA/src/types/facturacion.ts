// Tipos para el módulo de Facturación Electrónica Costa Rica

export interface HaciendaSettings {
  id?: number;
  cedula_emisor: string;
  codigo_actividad_economica: string;
  sucursal: string;
  terminal: string;
  ambiente: 'sandbox' | 'produccion';
  usuario_idp: string;
  password_idp_encrypted: string;
  certificado_p12_path?: string;
  certificado_password_encrypted?: string;
  proveedor_sistema?: string;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface HaciendaConsecutivo {
  id?: number;
  tipo_documento: string;
  sucursal: string;
  terminal: string;
  consecutivo_actual: number;
  created_at?: string;
  updated_at?: string;
}

export interface FacturaElectronica {
  id?: number;
  clave: string;
  consecutivo: string;
  tipo_documento: string;
  cliente_id?: number;
  cliente?: any;
  fecha_emision: string;
  moneda: string;
  tipo_cambio: number;
  condicion_venta: string;
  plazo_credito: number;
  medio_pago: string;
  estado_local: 'borrador' | 'firmado' | 'enviado' | 'aceptado' | 'rechazado';
  estado_hacienda?: 'recibido' | 'aceptado' | 'rechazado';
  subtotal: number;
  descuento_total: number;
  impuesto_total: number;
  total: number;
  xml_original?: string;
  xml_firmado?: string;
  hash_documento?: string;
  observaciones?: string;
  referencia_clave?: string;
  referencia_codigo?: string;
  referencia_razon?: string;
  lineas?: FacturaLinea[];
  created_at?: string;
  updated_at?: string;
}

export interface FacturaLinea {
  id?: number;
  factura_id?: number;
  numero_linea: number;
  codigo_articulo?: string;
  descripcion: string;
  unidad_medida: string;
  cantidad: number;
  precio_unitario: number;
  descuento_porcentaje: number;
  descuento_monto: number;
  subtotal_linea: number;
  impuesto_porcentaje: number;
  impuesto_monto: number;
  total_linea: number;
  created_at?: string;
}

export interface HaciendaEnvio {
  id?: number;
  factura_id?: number;
  tipo_envio: 'factura' | 'mensaje_receptor';
  request_payload?: string;
  response_payload?: string;
  status_code?: number;
  location_header?: string;
  estado: 'enviado' | 'consultando' | 'completado' | 'error';
  intentos: number;
  ultimo_intento?: string;
  proximo_intento?: string;
  error_mensaje?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ComprobanteRecibido {
  id?: number;
  clave: string;
  emisor_cedula: string;
  emisor_nombre?: string;
  fecha_emision: string;
  tipo_documento: string;
  moneda?: string;
  total?: number;
  xml_comprobante?: string;
  estado_receptor: 'pendiente' | 'aceptado' | 'rechazado';
  fecha_respuesta?: string;
  xml_respuesta?: string;
  observaciones?: string;
  created_at?: string;
  updated_at?: string;
}

export interface HaciendaAuditoria {
  id?: number;
  usuario_id?: string;
  accion: string;
  tabla_afectada?: string;
  registro_id?: number;
  datos_anteriores?: any;
  datos_nuevos?: any;
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

export interface HaciendaResponse {
  clave: string;
  fecha: string;
  ind_estado: string;
  respuesta_xml?: string;
}

export const TIPOS_DOCUMENTO = {
  '01': 'Factura Electrónica',
  '02': 'Nota Débito',
  '03': 'Nota Crédito',
  '04': 'Tiquete Electrónico',
  '05': 'Factura Compra',
  '06': 'Factura Exportación',
  '07': 'Recibo Electrónico'
};

export const CONDICIONES_VENTA = {
  '01': 'Contado',
  '02': 'Crédito',
  '03': 'Consignación',
  '04': 'Apartado',
  '05': 'Arrendamiento con opción de compra',
  '06': 'Arrendamiento en función financiera',
  '99': 'Otros'
};

export const MEDIOS_PAGO = {
  '01': 'Efectivo',
  '02': 'Tarjeta',
  '03': 'Cheque',
  '04': 'Transferencia',
  '05': 'Recaudado por terceros',
  '99': 'Otros'
};

export const CODIGOS_REFERENCIA = {
  '01': 'Anula documento de referencia',
  '02': 'Corrige texto documento de referencia',
  '03': 'Corrige monto',
  '04': 'Referencia a otro documento',
  '05': 'Sustituye comprobante provisional por contingencia',
  '99': 'Otros'
};

export const UNIDADES_MEDIDA = {
  'Unid': 'Unidad',
  'Kg': 'Kilogramo',
  'g': 'Gramo',
  'L': 'Litro',
  'mL': 'Mililitro',
  'm': 'Metro',
  'cm': 'Centímetro',
  'm²': 'Metro cuadrado',
  'm³': 'Metro cúbico',
  'h': 'Hora',
  'min': 'Minuto',
  'Sp': 'Servicio profesional',
  'St': 'Servicio técnico',
  'Otros': 'Otros'
};