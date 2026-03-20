import { supabase } from '../lib/supabase';

export interface InventarioThreshold {
  id: number;
  articulo_id: number;
  min_qty: number;
  max_qty: number;
  safety_stock: number;
  reorder_point: number;
  lead_time_dias: number;
  lote_minimo: number;
  activo: boolean;
}

export interface InventarioNivel {
  id: number;
  articulo_id: number;
  on_hand: number;
  reservado: number;
  disponible: number;
}

export interface InventarioAlerta {
  id: number;
  articulo_id: number;
  tipo: 'below_min' | 'below_rop' | 'stockout';
  detalle: any;
  leida: boolean;
  created_at: string;
}

export interface ReplenishmentOrder {
  id: number;
  articulo_id: number;
  qty_sugerida: number;
  motivo: 'below_min' | 'below_rop';
  estado: 'borrador' | 'emitida' | 'completada' | 'cancelada';
  generado_por: string;
  notas?: string;
  created_at: string;
  updated_at: string;
}

export interface InventarioMovimiento {
  id: number;
  articulo_id: number;
  tipo: 'ajuste' | 'venta' | 'reserva' | 'liberacion' | 'compra';
  cantidad: number;
  referencia_type?: string;
  referencia_id?: number;
  notas?: string;
  usuario_id: string;
  created_at: string;
}

export class MantenimientoService {
  // ===== THRESHOLDS =====
  static async obtenerThresholds() {
    const { data, error } = await supabase
      .from('inventario_thresholds')
      .select(`
        *,
        inventario:inventario!inner(
          codigo_articulo,
          descripcion_articulo
        )
      `)
      .eq('activo', true)
      .order('id');

    if (error) throw error;
    return data;
  }

  static async obtenerThresholdsConNiveles() {
    const thresholds = await this.obtenerThresholds();
    if (!thresholds || thresholds.length === 0) return [];

    const articuloIds = thresholds.map(t => t.articulo_id);

    const { data: niveles } = await supabase
      .from('inventario_niveles')
      .select('*')
      .in('articulo_id', articuloIds);

    const { data: inventarioData } = await supabase
      .from('inventario')
      .select('id_articulo, cantidad_articulo')
      .in('id_articulo', articuloIds);

    const inventarioMap: Record<number, number> = {};
    inventarioData?.forEach(item => {
      inventarioMap[item.id_articulo] = Number(item.cantidad_articulo) || 0;
    });

    // Mapa de niveles registrados
    const nivelesMap = ((niveles || []).reduce((acc, nivel) => {
      acc[nivel.articulo_id] = {
        on_hand: Number(nivel.on_hand),
        reservado: Number(nivel.reservado),
        disponible: Number(nivel.on_hand) - Number(nivel.reservado)
      };
      return acc;
    }, {} as Record<number, any>));

    // Para artículos sin registro en inventario_niveles, usar inventario principal como fallback
    // y auto-crear el registro
    const nivelesRegistrados = new Set(Object.keys(nivelesMap).map(Number));
    const articulosSinNivel = articuloIds.filter(id => !nivelesRegistrados.has(id));

    if (articulosSinNivel.length > 0) {
      const registrosACrear = articulosSinNivel.map(id => ({
        articulo_id: id,
        on_hand: inventarioMap[id] ?? 0,
        reservado: 0
      }));
      await supabase.from('inventario_niveles').upsert(registrosACrear, { onConflict: 'articulo_id' });

      articulosSinNivel.forEach(id => {
        const qty = inventarioMap[id] ?? 0;
        nivelesMap[id] = { on_hand: qty, reservado: 0, disponible: qty };
      });
    }

    // Combinar thresholds con niveles
    return thresholds.map(threshold => ({
      ...threshold,
      inventario_niveles: nivelesMap[threshold.articulo_id] || {
        on_hand: 0,
        reservado: 0,
        disponible: 0
      }
    }));
  }

  static async actualizarThreshold(id: number, data: Partial<InventarioThreshold>) {
    const { error } = await supabase
      .from('inventario_thresholds')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
  }

  static async crearThreshold(data: Omit<InventarioThreshold, 'id'>) {
    const { error } = await supabase
      .from('inventario_thresholds')
      .insert(data);

    if (error) throw error;
  }

  static async eliminarThreshold(id: number) {
    const { error } = await supabase
      .from('inventario_thresholds')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ===== NIVELES DE INVENTARIO =====
  static async obtenerNiveles() {
    const { data, error } = await supabase
      .from('inventario_niveles')
      .select(`
        *,
        inventario:inventario!inner(
          codigo_articulo,
          descripcion_articulo
        )
      `)
      .order('articulo_id');

    if (error) throw error;
    return data;
  }

  static async obtenerNivelPorArticulo(articulo_id: number) {
    const { data, error } = await supabase
      .from('inventario_niveles')
      .select('*')
      .eq('articulo_id', articulo_id)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
    return data;
  }

  static async actualizarNivel(articulo_id: number, on_hand: number, reservado: number = 0) {
    // Usar upsert para crear o actualizar
    const { error } = await supabase
      .from('inventario_niveles')
      .upsert(
        {
          articulo_id,
          on_hand,
          reservado,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'articulo_id'
        }
      );

    if (error) throw error;
  }

  // ===== ALERTAS =====
  static async obtenerAlertas(soloNoLeidas: boolean = true) {
    let query = supabase
      .from('inventario_alertas')
      .select(`
        *,
        inventario:inventario!inner(
          codigo_articulo,
          descripcion_articulo
        )
      `)
      .order('created_at', { ascending: false });

    if (soloNoLeidas) {
      query = query.eq('leida', false);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  static async marcarAlertaLeida(id: number) {
    const { error } = await supabase
      .from('inventario_alertas')
      .update({ leida: true })
      .eq('id', id);

    if (error) throw error;
  }

  static async marcarMultiplesAlertasLeidas(ids: number[]) {
    const { error } = await supabase
      .from('inventario_alertas')
      .update({ leida: true })
      .in('id', ids);

    if (error) throw error;
  }

  static async eliminarAlertas(ids: number[]) {
    const { error } = await supabase
      .from('inventario_alertas')
      .delete()
      .in('id', ids);

    if (error) throw error;
  }

  static async crearAlerta(data: Omit<InventarioAlerta, 'id' | 'created_at'>) {
    const { error } = await supabase
      .from('inventario_alertas')
      .insert(data);

    if (error) throw error;
  }

  // ===== ÓRDENES DE REABASTECIMIENTO =====
  static async obtenerReplenishmentOrders() {
    const { data, error } = await supabase
      .from('replenishment_orders')
      .select(`
        *,
        inventario:inventario!inner(
          codigo_articulo,
          descripcion_articulo
        )
      `)
      .in('estado', ['borrador', 'emitida'])
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async obtenerTodasReplenishmentOrders() {
    const { data, error } = await supabase
      .from('replenishment_orders')
      .select(`
        *,
        inventario:inventario!inner(
          codigo_articulo,
          descripcion_articulo
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async crearReplenishmentOrder(
    data: Omit<ReplenishmentOrder, 'id' | 'created_at' | 'updated_at'>
  ) {
    const { error } = await supabase
      .from('replenishment_orders')
      .insert(data);

    if (error) throw error;
  }

  static async actualizarEstadoReplenishment(id: number, estado: string, notas?: string) {
    const updateData: any = {
      estado,
      updated_at: new Date().toISOString()
    };

    if (notas !== undefined) {
      updateData.notas = notas;
    }

    const { error } = await supabase
      .from('replenishment_orders')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
  }

  static async actualizarEstadoReplenishmentMasivo(ids: number[], estado: string) {
    const { error } = await supabase
      .from('replenishment_orders')
      .update({
        estado,
        updated_at: new Date().toISOString()
      })
      .in('id', ids);

    if (error) throw error;
  }

  static async eliminarReplenishmentOrders(ids: number[]) {
    const { error } = await supabase
      .from('replenishment_orders')
      .delete()
      .in('id', ids);

    if (error) throw error;
  }

  // ===== MOVIMIENTOS DE INVENTARIO =====
  static async obtenerMovimientos(articulo_id?: number, limit: number = 100) {
    let query = supabase
      .from('inventario_movimientos')
      .select(`
        *,
        inventario:inventario!inner(
          codigo_articulo,
          descripcion_articulo
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (articulo_id) {
      query = query.eq('articulo_id', articulo_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  static async crearMovimiento(data: Omit<InventarioMovimiento, 'id' | 'created_at'>) {
    const { error } = await supabase
      .from('inventario_movimientos')
      .insert(data);

    if (error) throw error;
  }

  // ===== CONFIGURACIÓN =====
  static async obtenerConfiguracion() {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .order('key');

    if (error) throw error;
    return data;
  }

  static async actualizarConfiguracion(key: string, value: string) {
    const { error } = await supabase
      .from('settings')
      .upsert({
        key,
        value,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key'
      });

    if (error) throw error;
  }

  // ===== CÁLCULOS INTELIGENTES =====
  static async calcularROP(articulo_id: number, demanda_promedio_dia?: number): Promise<number> {
    // Obtener threshold y configuración
    const [thresholdResult, configResult] = await Promise.all([
      supabase
        .from('inventario_thresholds')
        .select('*')
        .eq('articulo_id', articulo_id)
        .single(),
      supabase
        .from('settings')
        .select('*')
        .eq('key', 'demanda_promedio_dia')
        .single()
    ]);

    if (thresholdResult.error) {
      throw new Error('Error obteniendo threshold para cálculo de ROP');
    }

    const threshold = thresholdResult.data;
    const demandaDia = demanda_promedio_dia || 
      (configResult.data ? parseFloat(configResult.data.value) : 5.0);

    // ROP = safety_stock + (demanda_promedio_dia * lead_time_dias)
    return threshold.safety_stock + demandaDia * threshold.lead_time_dias;
  }

  static async calcularQtySugerida(articulo_id: number): Promise<number> {
    // Obtener threshold y nivel actual
    const [thresholdResult, nivelResult] = await Promise.all([
      supabase
        .from('inventario_thresholds')
        .select('*')
        .eq('articulo_id', articulo_id)
        .single(),
      supabase
        .from('inventario_niveles')
        .select('*')
        .eq('articulo_id', articulo_id)
        .single()
    ]);

    if (thresholdResult.error) {
      throw new Error('Error obteniendo threshold para cálculo de cantidad sugerida');
    }

    const threshold = thresholdResult.data;
    
    // Si no hay nivel, asumir disponible = 0
    const disponible = nivelResult.data ? 
      (nivelResult.data.on_hand - nivelResult.data.reservado) : 0;

    // qty_sugerida = max(max_qty - disponible, 0)
    let qtySugerida = Math.max(threshold.max_qty - disponible, 0);

    // Ajustar por lote mínimo si aplica
    if (threshold.lote_minimo > 0) {
      qtySugerida = Math.ceil(qtySugerida / threshold.lote_minimo) * threshold.lote_minimo;
    }

    return qtySugerida;
  }

  static calcularSemaforo(threshold: InventarioThreshold, nivel?: InventarioNivel) {
    const disponible = nivel ? (nivel.on_hand - nivel.reservado) : 0;
    
    if (disponible <= 0 || disponible < threshold.min_qty) {
      return { 
        color: 'bg-red-500', 
        label: 'Crítico', 
        textColor: 'text-red-700',
        nivel: 'critico'
      };
    } else if (disponible < threshold.reorder_point) {
      return { 
        color: 'bg-yellow-500', 
        label: 'Advertencia', 
        textColor: 'text-yellow-700',
        nivel: 'advertencia'
      };
    } else {
      return { 
        color: 'bg-green-500', 
        label: 'Normal', 
        textColor: 'text-green-700',
        nivel: 'normal'
      };
    }
  }

  // ===== GENERACIÓN AUTOMÁTICA =====
  static async generarAlertasAutomaticas() {
    // Obtener thresholds con niveles
    const thresholdsConNiveles = await this.obtenerThresholdsConNiveles();
    
    const alertasACrear = [];

    for (const threshold of thresholdsConNiveles) {
      const nivel = threshold.inventario_niveles;
      const disponible = nivel.disponible;
      
      let tipo: 'below_min' | 'below_rop' | 'stockout' | null = null;

      if (disponible <= 0) {
        tipo = 'stockout';
      } else if (disponible < threshold.min_qty) {
        tipo = 'below_min';
      } else if (disponible < threshold.reorder_point) {
        tipo = 'below_rop';
      }

      if (tipo) {
        // Verificar si ya existe una alerta similar no leída
        const { data: alertaExistente } = await supabase
          .from('inventario_alertas')
          .select('id')
          .eq('articulo_id', threshold.articulo_id)
          .eq('tipo', tipo)
          .eq('leida', false)
          .single();

        if (!alertaExistente) {
          alertasACrear.push({
            articulo_id: threshold.articulo_id,
            tipo,
            detalle: {
              disponible,
              min_qty: threshold.min_qty,
              reorder_point: threshold.reorder_point,
              articulo_codigo: threshold.inventario.codigo_articulo,
              articulo_descripcion: threshold.inventario.descripcion_articulo
            },
            leida: false
          });
        }
      }
    }

    if (alertasACrear.length > 0) {
      const { error: insertError } = await supabase
        .from('inventario_alertas')
        .insert(alertasACrear);

      if (insertError) throw insertError;
    }

    return alertasACrear.length;
  }

  static async generarOrdenesReabastecimiento(usuario_id: string) {
    // Obtener thresholds con niveles
    const thresholdsConNiveles = await this.obtenerThresholdsConNiveles();
    
    const ordenesACrear = [];

    for (const threshold of thresholdsConNiveles) {
      const nivel = threshold.inventario_niveles;
      const disponible = nivel.disponible;

      // Verificar si necesita reabastecimiento
      if (disponible < threshold.reorder_point) {
        // Verificar si ya existe una orden pendiente
        const { data: ordenExistente } = await supabase
          .from('replenishment_orders')
          .select('id')
          .eq('articulo_id', threshold.articulo_id)
          .in('estado', ['borrador', 'emitida'])
          .single();

        if (!ordenExistente) {
          const qtySugerida = await this.calcularQtySugerida(threshold.articulo_id);

          if (qtySugerida > 0) {
            ordenesACrear.push({
              articulo_id: threshold.articulo_id,
              qty_sugerida: qtySugerida,
              motivo: disponible < threshold.min_qty ? 'below_min' : 'below_rop',
              estado: 'borrador',
              generado_por: usuario_id
            });
          }
        }
      }
    }

    if (ordenesACrear.length > 0) {
      const { error: insertError } = await supabase
        .from('replenishment_orders')
        .insert(ordenesACrear);

      if (insertError) throw insertError;
    }

    return ordenesACrear.length;
  }

  // ===== RECALCULAR ROP MASIVO =====
  static async recalcularROPMasivo() {
    // Obtener configuración de demanda promedio
    const { data: config } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'demanda_promedio_dia')
      .single();

    const demandaPromedioDia = config ? parseFloat(config.value) : 5.0;

    // Obtener todos los thresholds activos
    const { data: thresholds, error } = await supabase
      .from('inventario_thresholds')
      .select('*')
      .eq('activo', true);

    if (error) throw error;

    // Recalcular ROP para cada threshold
    const updates = (thresholds || []).map(threshold => ({
      id: threshold.id,
      reorder_point: threshold.safety_stock + (demandaPromedioDia * threshold.lead_time_dias)
    }));

    // Actualizar en lotes para mejor rendimiento
    for (const update of updates) {
      await this.actualizarThreshold(update.id, { 
        reorder_point: update.reorder_point 
      });
    }

    return updates.length;
  }

  // ===== APROBACIÓN DE COTIZACIONES =====
  static async procesarAprobacionCotizacion(cotizacion_id: number, usuario_id: string) {
    // Verificar si ya se procesó
    const { data: cotizacion, error: cotizacionError } = await supabase
      .from('cotizaciones')
      .select('stock_descargado_at, estado')
      .eq('id', cotizacion_id)
      .single();

    if (cotizacionError) throw cotizacionError;

    if (cotizacion.stock_descargado_at) {
      throw new Error('Esta cotización ya fue procesada anteriormente');
    }

    // Obtener items de la cotización
    const { data: items, error: itemsError } = await supabase
      .from('cotizacion_items')
      .select(`
        *,
        inventario:inventario(id_articulo),
        producto:productos(*)
      `)
      .eq('cotizacion_id', cotizacion_id);

    if (itemsError) throw itemsError;

    const movimientos = [];
    const articulosAfectados = [];

    // Procesar cada item
    for (const item of items || []) {
      if (item.inventario) {
        // Es un artículo de inventario directo
        const cantidadRequerida = item.cantidad;

        // Verificar disponibilidad
        const nivel = await this.obtenerNivelPorArticulo(item.inventario.id_articulo);
        
        if (!nivel) {
          throw new Error(`No se encontró nivel de inventario para ${item.inventario.codigo_articulo}`);
        }

        const disponible = nivel.on_hand - nivel.reservado;

        if (disponible < cantidadRequerida) {
          throw new Error(
            `Stock insuficiente para ${item.inventario.codigo_articulo}. Disponible: ${disponible}, Requerido: ${cantidadRequerida}`
          );
        }

        // Preparar movimiento
        movimientos.push({
          articulo_id: item.inventario.id_articulo,
          tipo: 'venta',
          cantidad: -cantidadRequerida, // Negativo porque es una salida
          referencia_type: 'cotizacion',
          referencia_id: cotizacion_id,
          notas: `Venta por cotización #${cotizacion_id}`,
          usuario_id
        });

        articulosAfectados.push({
          articulo_id: item.inventario.id_articulo,
          cantidad: cantidadRequerida
        });
      } else if (item.producto) {
        // Es un producto con BOM - expandir componentes
        const { data: bomItems, error: bomError } = await supabase
          .from('bom_items')
          .select(`
            *,
            inventario:inventario!inner(*)
          `)
          .eq('producto_id', item.producto.id);

        if (bomError) throw bomError;

        for (const bomItem of bomItems || []) {
          const cantidadRequerida = bomItem.cantidad_x_unidad * item.cantidad;

          // Verificar disponibilidad
          const nivel = await this.obtenerNivelPorArticulo(bomItem.inventario.id_articulo);
          
          if (!nivel) {
            throw new Error(`No se encontró nivel de inventario para ${bomItem.inventario.codigo_articulo}`);
          }

          const disponible = nivel.on_hand - nivel.reservado;

          if (disponible < cantidadRequerida) {
            throw new Error(
              `Stock insuficiente para componente ${bomItem.inventario.codigo_articulo}. Disponible: ${disponible}, Requerido: ${cantidadRequerida}`
            );
          }

          // Preparar movimiento
          movimientos.push({
            articulo_id: bomItem.inventario.id_articulo,
            tipo: 'venta',
            cantidad: -cantidadRequerida,
            referencia_type: 'cotizacion',
            referencia_id: cotizacion_id,
            notas: `Venta por cotización #${cotizacion_id} - Componente de ${item.producto.nombre_producto}`,
            usuario_id
          });

          articulosAfectados.push({
            articulo_id: bomItem.inventario.id_articulo,
            cantidad: cantidadRequerida
          });
        }
      }
    }

    // Ejecutar transacción
    try {
      // 1. Crear movimientos
      if (movimientos.length > 0) {
        const { error: movimientosError } = await supabase
          .from('inventario_movimientos')
          .insert(movimientos);

        if (movimientosError) throw movimientosError;
      }

      // 2. Actualizar niveles de inventario
      for (const articulo of articulosAfectados) {
        const nivelActual = await this.obtenerNivelPorArticulo(articulo.articulo_id);
        if (nivelActual) {
          const nuevoOnHand = nivelActual.on_hand - articulo.cantidad;
          await this.actualizarNivel(articulo.articulo_id, nuevoOnHand, nivelActual.reservado);
        }
      }

      // 3. Marcar cotización como procesada
      const { error: cotizacionUpdateError } = await supabase
        .from('cotizaciones')
        .update({
          estado: 'aprobada',
          stock_descargado_at: new Date().toISOString()
        })
        .eq('id', cotizacion_id);

      if (cotizacionUpdateError) throw cotizacionUpdateError;

      // 4. Generar alertas automáticas para artículos afectados
      await this.generarAlertasAutomaticas();

      return {
        movimientos_creados: movimientos.length,
        articulos_afectados: articulosAfectados.length
      };
    } catch (error: any) {
      throw new Error(`Error procesando aprobación de cotización: ${error.message}`);
    }
  }
}
