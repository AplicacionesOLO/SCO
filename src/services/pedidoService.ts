import { supabase } from '../lib/supabase';
import { Pedido } from '../types/pedido';

interface UpdatePedidoData {
  cliente_id: number;
  moneda: string;
  tipo_cambio: number;
  notas?: string;
  subtotal: number;
  descuento_total: number;
  impuesto_total: number;
  total: number;
  items?: Array<{
    item_type: string;
    item_id: number;
    descripcion: string;
    unidad: string;
    cantidad: number;
    precio_unit: number;
    descuento_pct?: number;
    impuesto_pct?: number;
    total: number;
    meta_json?: any;
  }>;
}

interface CreatePedidoData extends UpdatePedidoData {
  codigo?: string;
  fecha_pedido?: string;
  fecha_entrega?: string;
  estado?: string;
}

class PedidoService {
  // Obtener lista de pedidos con filtros
  async getPedidos(filters?: {
    estado?: string;
    cliente_id?: number | null;
    fecha_desde?: string;
    fecha_hasta?: string;
  }): Promise<Pedido[]> {
    // Obtener usuario autenticado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Obtener tienda actual del usuario
    const { data: tiendaActual } = await supabase
      .from('usuario_tienda_actual')
      .select('tienda_id')
      .eq('usuario_id', user.id)
      .single();

    if (!tiendaActual) throw new Error('No hay tienda asignada');

    // Construir query base - CORREGIDO: Eliminada la relación incorrecta con producto_id
    let query = supabase
      .from('pedidos')
      .select(`
        *,
        cliente:clientes(
          id,
          nombre_razon_social,
          identificacion
        ),
        pedido_items(
          id,
          item_type,
          item_id,
          descripcion,
          unidad,
          cantidad,
          precio_unit,
          descuento_pct,
          impuesto_pct,
          total,
          meta_json
        )
      `)
      .eq('tienda_id', tiendaActual.tienda_id)
      .order('created_at', { ascending: false });

    // Aplicar filtros
    if (filters?.estado) {
      query = query.eq('estado', filters.estado);
    }

    if (filters?.cliente_id) {
      query = query.eq('cliente_id', filters.cliente_id);
    }

    if (filters?.fecha_desde) {
      query = query.gte('created_at', filters.fecha_desde);
    }

    if (filters?.fecha_hasta) {
      query = query.lte('created_at', filters.fecha_hasta);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Mapear pedido_items a items para compatibilidad
    const pedidosConItems = (data || []).map(pedido => ({
      ...pedido,
      items: pedido.pedido_items || []
    }));

    return pedidosConItems;
  }

  // Obtener pedido por ID
  async getPedidoById(id: number): Promise<Pedido | null> {
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          *,
          clientes!inner(
            id,
            nombre_razon_social,
            identificacion
          ),
          pedido_items(
            id,
            item_type,
            item_id,
            descripcion,
            unidad,
            cantidad,
            precio_unit,
            descuento_pct,
            impuesto_pct,
            total,
            meta_json
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      
      // Mapear pedido_items a items para compatibilidad
      return {
        ...data,
        items: data.pedido_items || []
      } as Pedido;
    } catch {
      return null;
    }
  }

  // Crear pedido
  async createPedido(data: CreatePedidoData): Promise<Pedido> {
    try {
      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Obtener tienda actual
      const { data: tiendaData } = await supabase
        .from('usuario_tienda_actual')
        .select('tienda_id')
        .eq('usuario_id', user.id)
        .single();

      if (!tiendaData) throw new Error('No hay tienda asignada');

      // Crear pedido principal
      const { data: pedido, error: pedidoError } = await supabase
        .from('pedidos')
        .insert({
          codigo: data.codigo || `PED-${Date.now()}`,
          cliente_id: data.cliente_id,
          moneda: data.moneda,
          tipo_cambio: data.tipo_cambio,
          subtotal: data.subtotal,
          descuento_total: data.descuento_total,
          impuesto_total: data.impuesto_total,
          total: data.total,
          estado: data.estado || 'borrador',
          notas: data.notas,
          tienda_id: tiendaData.tienda_id,
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (pedidoError) throw pedidoError;

      // Crear items si se proporcionan
      if (data.items && data.items.length > 0) {
        const items = data.items.map(item => ({
          pedido_id: pedido.id,
          item_type: item.item_type,
          item_id: item.item_id,
          descripcion: item.descripcion,
          unidad: item.unidad,
          cantidad: item.cantidad,
          precio_unit: item.precio_unit,
          descuento_pct: item.descuento_pct || 0,
          impuesto_pct: item.impuesto_pct || 13,
          total: item.total,
          meta_json: item.meta_json
        }));

        const { error: itemsError } = await supabase
          .from('pedido_items')
          .insert(items);

        if (itemsError) throw itemsError;

        // Crear reservas de inventario solo si está en borrador
        if (pedido.estado === 'borrador') {
          await this.crearReservasInventario(pedido.id, data.items);
        }
      }

      return this.getPedidoById(pedido.id) as Promise<Pedido>;
    } catch (error) {
      throw error;
    }
  }

  // Crear pedido desde cotización
  async createPedidoFromCotizacion(cotizacionId: number): Promise<Pedido> {
    try {
      // Obtener cotización completa
      const { data: cotizacion, error: cotizacionError } = await supabase
        .from('cotizaciones')
        .select(`
          *,
          cotizacion_items (*)
        `)
        .eq('id', cotizacionId)
        .single();

      if (cotizacionError) throw cotizacionError;
      if (!cotizacion) throw new Error('Cotización no encontrada');

      // Validar que esté aprobada
      if (cotizacion.estado !== 'aprobada' && cotizacion.estado !== 'Aprobada') {
        throw new Error('Solo se pueden crear pedidos desde cotizaciones aprobadas');
      }

      // Convertir items de cotización a items de pedido
      const pedidoItems = cotizacion.cotizacion_items.map((item: any) => ({
        item_type: 'producto',
        item_id: item.producto_id,
        descripcion: item.descripcion,
        unidad: 'UN',
        cantidad: item.cantidad,
        precio_unit: item.precio_unitario,
        descuento_pct: item.descuento || 0,
        impuesto_pct: 13,
        total: item.subtotal,
        meta_json: null
      }));

      // Crear datos del pedido
      const pedidoData: CreatePedidoData = {
        codigo: `PED-${cotizacion.numero_cotizacion || cotizacion.codigo || Date.now()}`,
        cliente_id: cotizacion.cliente_id,
        moneda: 'CRC',
        tipo_cambio: 1,
        subtotal: cotizacion.subtotal,
        descuento_total: cotizacion.descuento_global || cotizacion.descuento_general || 0,
        impuesto_total: cotizacion.impuestos || cotizacion.impuesto || 0,
        total: cotizacion.total,
        estado: 'borrador',
        notas: `Generado desde cotización #${cotizacion.numero_cotizacion || cotizacion.codigo}. ${cotizacion.notas || cotizacion.observaciones || ''}`.trim(),
        items: pedidoItems
      };

      return await this.createPedido(pedidoData);
    } catch (error) {
      throw error;
    }
  }

  // Actualizar pedido
  async updatePedido(id: number, data: UpdatePedidoData): Promise<Pedido> {
    // Permitir actualizar si está en borrador o confirmado (no facturado ni cancelado)
    const pedidoActual = await this.getPedidoById(id);
    if (!pedidoActual) {
      throw new Error('Pedido no encontrado');
    }
    
    if (pedidoActual.estado === 'facturado') {
      throw new Error('No se pueden editar pedidos que ya han sido facturados');
    }
    
    if (pedidoActual.estado === 'cancelado') {
      throw new Error('No se pueden editar pedidos cancelados');
    }

    // Actualizar pedido
    const { error: pedidoError } = await supabase
      .from('pedidos')
      .update({
        cliente_id: data.cliente_id,
        moneda: data.moneda,
        tipo_cambio: data.tipo_cambio,
        notas: data.notas,
        subtotal: data.subtotal,
        descuento_total: data.descuento_total,
        impuesto_total: data.impuesto_total,
        total: data.total,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (pedidoError) throw pedidoError;

    // Actualizar items si se proporcionan
    if (data.items) {
      // Eliminar items existentes
      await supabase.from('pedido_items').delete().eq('pedido_id', id);
      
      // Liberar reservas existentes solo si está en borrador
      if (pedidoActual.estado === 'borrador') {
        await this.liberarReservas(id);
      }

      // Crear nuevos items
      if (data.items.length > 0) {
        const items = data.items.map(item => ({
          pedido_id: id,
          item_type: item.item_type,
          item_id: item.item_id,
          descripcion: item.descripcion,
          unidad: item.unidad,
          cantidad: item.cantidad,
          precio_unit: item.precio_unit,
          descuento_pct: item.descuento_pct || 0,
          impuesto_pct: item.impuesto_pct || 13,
          total: item.total,
          meta_json: item.meta_json
        }));

        const { error: itemsError } = await supabase
          .from('pedido_items')
          .insert(items);

        if (itemsError) throw itemsError;

        // Crear nuevas reservas solo si está en borrador
        if (pedidoActual.estado === 'borrador') {
          await this.crearReservasInventario(id, data.items);
        }
      }
    }

    return this.getPedidoById(id) as Promise<Pedido>;
  }

  // Liberar reservas de inventario
  private async liberarReservas(pedidoId: number): Promise<void> {
    try {
      const { error } = await supabase.from('inventario_reservas').delete().eq('pedido_id', pedidoId);
      if (error) throw error;
    } catch (error) {
      throw error;
    }
  }

  // Crear reservas de inventario
  private async crearReservasInventario(pedidoId: number, items: any[]): Promise<void> {
    try {
      const itemsInventario = items.filter(item => item.item_type === 'inventario');
      if (itemsInventario.length === 0) return;

      const idsArticulos = itemsInventario.map(item => item.item_id);
      const { data: articulosExistentes, error: validacionError } = await supabase
        .from('inventario').select('id').in('id', idsArticulos);

      if (validacionError) throw validacionError;

      const idsExistentes = (articulosExistentes || []).map(a => a.id);
      const itemsValidos = itemsInventario.filter(item => idsExistentes.includes(item.item_id));
      if (itemsValidos.length === 0) return;

      const reservas = itemsValidos.map(item => ({
        pedido_id: pedidoId,
        id_articulo: item.item_id,
        cantidad: item.cantidad,
        vence_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        estado: 'activa'
      }));

      const { error } = await supabase.from('inventario_reservas').insert(reservas);
      if (error) throw error;
    } catch (error) {
      throw error;
    }
  }

  // Confirmar pedido
  async confirmarPedido(id: number, userId: string): Promise<void> {
    try {
      const pedido = await this.getPedidoById(id);
      if (!pedido) throw new Error('Pedido no encontrado');
      if (pedido.estado !== 'borrador') throw new Error('Solo se pueden confirmar pedidos en estado borrador');

      const { error } = await supabase.from('pedidos').update({ estado: 'confirmado', updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    } catch (error) {
      throw error;
    }
  }

  // Cancelar pedido
  async cancelarPedido(id: number, userId: string): Promise<void> {
    try {
      const pedido = await this.getPedidoById(id);
      if (!pedido) throw new Error('Pedido no encontrado');
      if (pedido.estado === 'facturado') throw new Error('No se pueden cancelar pedidos facturados');
      if (pedido.estado === 'cancelado') throw new Error('El pedido ya está cancelado');

      await this.liberarReservas(id);

      const { error } = await supabase.from('pedidos').update({ estado: 'cancelado', updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    } catch (error) {
      throw error;
    }
  }

  // Eliminar pedido
  async deletePedido(id: number): Promise<void> {
    try {
      const pedido = await this.getPedidoById(id);
      if (!pedido) throw new Error('Pedido no encontrado');
      if (pedido.estado !== 'borrador' && pedido.estado !== 'cancelado') throw new Error('Solo se pueden eliminar pedidos en estado borrador o cancelado');

      await this.liberarReservas(id);
      await supabase.from('pedido_items').delete().eq('pedido_id', id);
      const { error } = await supabase.from('pedidos').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      throw error;
    }
  }
}

// Exportar instancia del servicio
export const pedidoService = new PedidoService();
export default pedidoService;
