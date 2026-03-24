
export interface Cotizacion {
  id?: number;
  codigo: string;
  cliente_id?: number; // Cambiado de string a number
  estado: 'borrador' | 'enviada' | 'aceptada' | 'rechazada' | 'vencida';
  fecha_emision: string;
  fecha_vencimiento?: string;
  moneda: string;
  tipo_cambio: number;
  descuento_global: number;
  descuento_valor: number;
  impuestos: number;
  flete: number;
  otros: number;
  subtotal: number;
  total: number;
  created_at?: string;
  updated_at?: string;
  // Relaciones
  cliente?: {
    id: number; // Cambiado de string a number
    nombre: string;
    identificacion: string;
    email: string;
  };
  items?: CotizacionItem[];
}

export interface CotizacionItem {
  id?: number;
  cotizacion_id?: number;
  producto_id?: number;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  descuento: number;
  subtotal: number;
  // Relaciones
  producto?: {
    id: number;
    codigo: string;
    nombre: string;
    precio_venta: number;
  };
}

export interface CotizacionFormData {
  cliente_id: string; // Se mantiene como string en el form, se convierte en el service
  fecha_vencimiento: string;
  moneda: string;
  tipo_cambio: number;
  descuento_global: number;
  flete: number;
  otros: number;
  items: CotizacionItem[];
  estado?: string;
  fecha_emision?: string;
  descuento_valor?: number;
  impuestos?: number;
  subtotal?: number;
  total?: number;
}

export interface CotizacionFilters {
  search?: string;
  estado?: string;
  cliente_id?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  moneda?: string;
}
