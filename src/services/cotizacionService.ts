// Import statements
import { supabase } from '../lib/supabase';

class CotizacionService {
  /**
   * Obtener la tienda activa del usuario autenticado
   */
  private static async obtenerTiendaActual(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return null;
      }

      const { data, error } = await supabase
        .from('usuario_tienda_actual')
        .select('tienda_id')
        .eq('usuario_id', user.id)
        .single();

      if (error) {
        return null;
      }

      return data?.tienda_id || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Obtener tipo de cambio del Banco Central de Costa Rica (BCCR)
   */
  static async obtenerTipoCambioBCCR(): Promise<number> {
    try {
      try {
        const response = await fetch('https://gee.bccr.fi.cr/indicadoreseconomicos/Cuadros/frmVerCatCuadro.aspx?idioma=1&CodCuadro=%20400');
        if (response.ok) {
          return 540.00;
        }
      } catch {
        // use default
      }
      return 540.00;
    } catch {
      return 540.00;
    }
  }

  /**
   * Obtener todas las cotizaciones con filtros opcionales
   */
  static async obtenerCotizaciones(filters?: any) {
    try {
      let query = supabase
        .from('cotizaciones')
        .select(`
          *,
          clientes (
            id,
            nombre_razon_social,
            identificacion,
            correo_principal,
            telefono_numero
          )
        `)
        .order('created_at', { ascending: false });

      if (filters?.cliente_id) query = query.eq('cliente_id', filters.cliente_id);
      if (filters?.estado) query = query.eq('estado', filters.estado);
      if (filters?.moneda) query = query.eq('moneda', filters.moneda);
      if (filters?.fecha_desde) query = query.gte('fecha_emision', filters.fecha_desde);
      if (filters?.fecha_hasta) query = query.lte('fecha_emision', filters.fecha_hasta);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener una cotización por ID
   */
  static async obtenerCotizacionPorId(id: number) {
    try {
      const { data, error } = await supabase
        .from('cotizaciones')
        .select(`
          *,
          clientes (
            id,
            nombre_razon_social,
            identificacion,
            correo_principal,
            telefono_numero,
            otras_senas
          )
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Actualizar cotización existente
   */
  static async actualizarCotizacion(id: number, cotizacionData: any) {
    try {
      const cotizacionFormatted = {
        cliente_id: parseInt(cotizacionData.cliente_id),
        estado: cotizacionData.estado,
        fecha_emision: cotizacionData.fecha_emision,
        fecha_vencimiento: cotizacionData.fecha_vencimiento,
        moneda: cotizacionData.moneda,
        tipo_cambio: this.formatNumericValue(cotizacionData.tipo_cambio, 'exchange'),
        descuento_global: this.formatNumericValue(cotizacionData.descuento_global || 0, 'percentage'),
        descuento_valor: this.formatNumericValue(cotizacionData.descuento_valor || 0, 'currency'),
        impuestos: this.formatNumericValue(cotizacionData.impuestos, 'tax'),
        flete: this.formatNumericValue(cotizacionData.flete || 0, 'currency'),
        otros: this.formatNumericValue(cotizacionData.otros || 0, 'currency'),
        subtotal: this.formatNumericValue(cotizacionData.subtotal, 'currency'),
        total: this.formatNumericValue(cotizacionData.total, 'currency'),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('cotizaciones')
        .update(cotizacionFormatted)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Actualizar items si se proporcionan
      if (cotizacionData.items && cotizacionData.items.length > 0) {
        // Eliminar items existentes
        await supabase
          .from('cotizacion_items')
          .delete()
          .eq('cotizacion_id', id);

        // Insertar nuevos items
        const items = cotizacionData.items.map((item: any) => ({
          cotizacion_id: id,
          producto_id: item.producto_id,
          tipo_item: item.tipo_item || 'normal',
          descripcion: item.descripcion,
          cantidad: this.formatNumericValue(item.cantidad, 'quantity'),
          precio_unitario: this.formatNumericValue(item.precio_unitario, 'quantity'),
          descuento: this.formatNumericValue(item.descuento || 0, 'item_discount'),
          subtotal: this.formatNumericValue(item.subtotal, 'quantity')
        }));

        await supabase
          .from('cotizacion_items')
          .insert(items);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Eliminar cotización
   */
  static async eliminarCotizacion(id: number) {
    try {
      await supabase
        .from('cotizacion_items')
        .delete()
        .eq('cotizacion_id', id);

      const { error } = await supabase
        .from('cotizaciones')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Duplicar cotización
   */
  static async duplicarCotizacion(id: number) {
    try {
      const { data: cotizacionOriginal, error: errorCotizacion } = await supabase
        .from('cotizaciones')
        .select('*')
        .eq('id', id)
        .single();

      if (errorCotizacion) throw errorCotizacion;

      const { data: itemsOriginales, error: errorItems } = await supabase
        .from('cotizacion_items')
        .select('*')
        .eq('cotizacion_id', id);

      if (errorItems) throw errorItems;

      const timestamp = Date.now();
      const codigo = `COT-${timestamp.toString().slice(-8)}`;
      const nuevaCotizacion = {
        ...cotizacionOriginal,
        id: undefined,
        codigo,
        estado: 'borrador',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: cotizacionCreada, error: errorCrear } = await supabase
        .from('cotizaciones')
        .insert(nuevaCotizacion)
        .select()
        .single();

      if (errorCrear) throw errorCrear;

      // Duplicar items
      if (itemsOriginales && itemsOriginales.length > 0) {
        const nuevosItems = itemsOriginales.map((item: any) => ({
          ...item,
          id: undefined,
          cotizacion_id: cotizacionCreada.id
        }));

        await supabase
          .from('cotizacion_items')
          .insert(nuevosItems);
      }

      return cotizacionCreada;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cambiar estado de cotización
   */
  static async cambiarEstado(id: number, nuevoEstado: string) {
    try {
      const { data, error } = await supabase
        .from('cotizaciones')
        .update({ 
          estado: nuevoEstado,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Crear nueva cotización
   */
  static async crearCotizacion(cotizacionData: any) {
    try {
      // 🔧 OBTENER TIENDA ACTUAL DEL USUARIO
      const tiendaId = await this.obtenerTiendaActual();
      
      if (!tiendaId) {
        throw new Error('No tienes una tienda activa asignada. Por favor, selecciona una tienda antes de crear la cotización.');
      }

      // 🔍 LOG DETALLADO: Verificar metadata
      if (cotizacionData.metadata) {
        // log metadata
      }

      // Generar código de cotización automático basado en timestamp
      const timestamp = Date.now();
      const codigo = `COT-${timestamp.toString().slice(-8)}`;

      // Formatear valores numéricos para evitar overflow con tipos específicos
      const cotizacionFormatted = {
        codigo,
        tienda_id: tiendaId, // 🔧 AGREGAR TIENDA_ID
        cliente_id: parseInt(cotizacionData.cliente_id),
        estado: cotizacionData.estado,
        fecha_emision: cotizacionData.fecha_emision,
        fecha_vencimiento: cotizacionData.fecha_vencimiento,
        moneda: cotizacionData.moneda,
        tipo_cambio: this.formatNumericValue(cotizacionData.tipo_cambio, 'exchange'),
        descuento_global: this.formatNumericValue(cotizacionData.descuento_global || 0, 'percentage'),
        descuento_valor: this.formatNumericValue(cotizacionData.descuento_valor || 0, 'currency'),
        impuestos: this.formatNumericValue(cotizacionData.impuestos, 'tax'),
        flete: this.formatNumericValue(cotizacionData.flete || 0, 'currency'),
        otros: this.formatNumericValue(cotizacionData.otros || 0, 'currency'),
        subtotal: this.formatNumericValue(cotizacionData.subtotal, 'currency'),
        total: this.formatNumericValue(cotizacionData.total, 'currency'),
        metadata: cotizacionData.metadata || null,
        created_at: new Date().toISOString()
      };

      // Crear cotización
      const { data: cotizacion, error: cotizacionError } = await supabase
        .from('cotizaciones')
        .insert(cotizacionFormatted)
        .select()
        .single();

      if (cotizacionError) throw cotizacionError;

      // 🆕 PROCESAR ITEMS - Soporta dos estructuras:
      // 1. items_optimizador + items_inventario (nueva estructura del optimizador)
      // 2. items (estructura tradicional)
      
      const itemsOptimizador = cotizacionData.items_optimizador || [];
      const itemsInventario = cotizacionData.items_inventario || [];
      const itemsTradicionales = cotizacionData.items || [];

      const totalItems = itemsOptimizador.length + itemsInventario.length + itemsTradicionales.length;

      if (totalItems > 0) {
        const itemsParaGuardar = [];

        // 🆕 PROCESAR ITEMS DEL OPTIMIZADOR
        if (itemsOptimizador.length > 0) {
          itemsOptimizador.forEach((item: any, index: number) => {
            // Construir texto de tapacantos
            const tapacantos = [];
            if (item.tapacanto_superior) tapacantos.push(`Sup: ${item.tapacanto_superior}`);
            if (item.tapacanto_inferior) tapacantos.push(`Inf: ${item.tapacanto_inferior}`);
            if (item.tapacanto_izquierdo) tapacantos.push(`Izq: ${item.tapacanto_izquierdo}`);
            if (item.tapacanto_derecho) tapacantos.push(`Der: ${item.tapacanto_derecho}`);
            
            const tapacantosText = tapacantos.length > 0 ? tapacantos.join(', ') : 'Sin tapacantos';

            // Construir texto de material
            const materialText = item.material_codigo && item.material_nombre 
              ? `${item.material_codigo} - ${item.material_nombre}`
              : item.material_codigo || item.material_nombre || 'Sin especificar';

            // Construir texto de dimensiones
            const dimensionesText = item.largo && item.ancho 
              ? `${item.largo} × ${item.ancho} mm`
              : '-';

            // 🔧 LOG: Verificar datos CNC recibidos
            // log cnc data

            const itemData = {
              cotizacion_id: cotizacion.id,
              producto_id: null,
              tipo_item: 'optimizador',
              descripcion: item.descripcion || `Pieza ${index + 1}`,
              dimensiones: dimensionesText,
              material: materialText,
              tapacantos: tapacantosText,
              cnc1: '', // Dejar vacío (legacy)
              cnc2: '', // Dejar vacío (legacy)
              cantidad: this.formatNumericValue(item.cantidad, 'quantity'),
              precio_unitario: this.formatNumericValue(item.precio_unitario, 'quantity'),
              descuento: this.formatNumericValue(item.descuento || 0, 'item_discount'),
              subtotal: this.formatNumericValue(item.subtotal, 'quantity'),
              datos_optimizador: {
                descripcion: item.descripcion,
                largo: item.largo,
                ancho: item.ancho,
                material_codigo: item.material_codigo,
                material_nombre: item.material_nombre,
                veta: item.veta,
                tapacanto_superior: item.tapacanto_superior,
                tapacanto_inferior: item.tapacanto_inferior,
                tapacanto_izquierdo: item.tapacanto_izquierdo,
                tapacanto_derecho: item.tapacanto_derecho,
                // 🔧 GUARDAR CNC CON ESTRUCTURA FIJA
                cnc1_codigo: item.cnc1_codigo || '',
                cnc1_cantidad: item.cnc1_cantidad || 0,
                cnc2_codigo: item.cnc2_codigo || '',
                cnc2_cantidad: item.cnc2_cantidad || 0,
                // 🔧 GUARDAR COSTOS CALCULADOS
                costo_material: item.costo_material || 0,
                costo_tapacantos: item.costo_tapacantos || 0,
                costo_cnc: item.costo_cnc || 0,
                costo_total: item.costo_total || 0
              }
            };

            itemsParaGuardar.push(itemData);
          });
        }

        // 🆕 PROCESAR ITEMS DEL INVENTARIO
        if (itemsInventario.length > 0) {
          itemsInventario.forEach((item: any) => {
            const itemData = {
              cotizacion_id: cotizacion.id,
              producto_id: item.inventario_id || null,
              tipo_item: 'optimizador',
              descripcion: `${item.codigo} - ${item.descripcion}`,
              dimensiones: null,
              material: null,
              tapacantos: null,
              cnc1: null,
              cnc2: null,
              cantidad: this.formatNumericValue(item.cantidad, 'quantity'),
              precio_unitario: this.formatNumericValue(item.precio_unitario, 'quantity'),
              descuento: this.formatNumericValue(item.descuento || 0, 'item_discount'),
              subtotal: this.formatNumericValue(item.subtotal, 'quantity'),
              datos_optimizador: null
            };

            itemsParaGuardar.push(itemData);
          });
        }

        // PROCESAR ITEMS TRADICIONALES (compatibilidad con cotizaciones normales)
        if (itemsTradicionales.length > 0) {
          // Obtener información de productos
          const productosIds = itemsTradicionales
            .map((item: any) => item.producto_id)
            .filter((id: any) => id);

          let productos = [];
          if (productosIds.length > 0) {
            const { data: productosData } = await supabase
              .from('productos')
              .select('id_producto, descripcion_producto')
              .in('id_producto', productosIds);
            productos = productosData || [];
          }

          itemsTradicionales.forEach((item: any) => {
            const producto = productos.find((p: any) => p.id_producto === item.producto_id);
            const itemData = {
              cotizacion_id: cotizacion.id,
              producto_id: item.producto_id,
              tipo_item: 'normal',
              descripcion: producto?.descripcion_producto || `Producto ID: ${item.producto_id}`,
              dimensiones: null,
              material: null,
              tapacantos: null,
              cnc1: null,
              cnc2: null,
              cantidad: this.formatNumericValue(item.cantidad, 'quantity'),
              precio_unitario: this.formatNumericValue(item.precio_unitario, 'quantity'),
              descuento: this.formatNumericValue(item.descuento || 0, 'item_discount'),
              subtotal: this.formatNumericValue(item.subtotal, 'quantity'),
              datos_optimizador: null
            };

            itemsParaGuardar.push(itemData);
          });
        }

        const { error: itemsError } = await supabase
          .from('cotizacion_items')
          .insert(itemsParaGuardar);

        if (itemsError) {
          throw itemsError;
        }
      }

      return cotizacion;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Formatear valores numéricos según el tipo para evitar overflow
   */
  private static formatNumericValue(value: any, type: 'exchange' | 'percentage' | 'tax' | 'currency' | 'quantity' | 'item_discount'): number {
    if (value === null || value === undefined || value === '') return 0;
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 0;
    switch (type) {
      case 'exchange':
      case 'percentage':
      case 'tax':
        return Math.min(Math.max(numValue, 0), 999.99);
      default:
        return Math.min(Math.max(numValue, 0), 999999.99);
    }
  }
}

// ✅ Exportar tanto como default como named export para compatibilidad
export { CotizacionService };
export default CotizacionService;
