export interface Pedido {
  id: number;
  codigo: string;
  cliente_id: number;
  cliente?: {
    id: number;
    nombre: string;
    nombre_razon_social?: string;
    identificacion: string;
    email?: string;
    telefono?: string;
    direccion?: string;
  };
  moneda: string;
  tipo_cambio: number;
  estado: 'borrador' | 'confirmado' | 'facturado' | 'cancelado' | 'vencido';
  referencia_cotizacion_id?: number;
  cotizacion?: {
    id: number;
    numero_cotizacion: string;
  };
  factura_id?: number;
  factura_estado_hacienda?: string;
  notas?: string;
  subtotal: number;
  descuento_total: number;
  impuesto_total: number;
  total: number;
  created_by: number;
  approved_by?: number;
  confirmado_at?: string;
  facturado_at?: string;
  cancelado_at?: string;
  created_at: string;
  updated_at: string;
  items: PedidoItem[];
}

export interface PedidoItem {
  id?: number;
  pedido_id?: number;
  item_type: 'inventario' | 'producto' | 'servicio';
  item_id?: number;
  codigo_articulo?: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  descuento_porcentaje: number;
  descuento_monto: number;
  impuesto_porcentaje: number;
  impuesto_monto: number;
  subtotal_linea: number;
  total_linea: number;
  meta_json?: {
    bom_items?: Array<{
      id: number;
      codigo: string;
      descripcion: string;
      cantidad_por_unidad: number;
      cantidad_total: number;
      unidad: string;
      precio_unitario: number;
      total: number;
    }>;
  };
}

export interface InventarioReserva {
  id: number;
  articulo_id: number;
  articulo?: {
    codigo: string;
    descripcion: string;
    unidad: string;
    stock_actual: number;
  };
  pedido_id?: number;
  cotizacion_id?: number;
  cantidad: number;
  cantidad_consumida: number;
  vence_at: string;
  estado: 'activa' | 'liberada' | 'consumida';
  notas?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePedidoRequest {
  cliente_id: number;
  moneda?: string;
  tipo_cambio?: number;
  referencia_cotizacion_id?: number;
  notas?: string;
  items: Omit<PedidoItem, 'id' | 'pedido_id' | 'subtotal_linea' | 'total_linea' | 'descuento_monto' | 'impuesto_monto'>[];
}

export interface UpdatePedidoRequest extends Partial<CreatePedidoRequest> {
  id: number;
}

export interface PedidoFilters {
  cliente_id?: number;
  estado?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  search?: string;
}

export const ESTADOS_PEDIDO = {
  borrador: { label: 'Borrador', color: 'bg-gray-100 text-gray-800' },
  confirmado: { label: 'Confirmado', color: 'bg-blue-100 text-blue-800' },
  facturado: { label: 'Facturado', color: 'bg-green-100 text-green-800' },
  cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
  vencido: { label: 'Vencido', color: 'bg-orange-100 text-orange-800' }
} as const;