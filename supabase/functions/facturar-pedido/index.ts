import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers constantes
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "authorization,content-type,apikey,x-client-info,x-supabase-auth,x-correlation-id"
};

// Helper para respuestas JSON consistentes
const jsonResponse = (obj: any, status = 200) =>
  new Response(JSON.stringify(obj), { 
    status, 
    headers: { ...CORS, "Content-Type": "application/json" } 
  });

serve(async (req) => {
  // Manejar OPTIONS para CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  // Generar correlation ID para trazabilidad
  const correlationId = req.headers.get('x-correlation-id') || crypto.randomUUID();
  
  try {
    console.log(`🚀 [${correlationId}] Iniciando proceso de facturación`);

    // Validar método
    if (req.method !== 'POST') {
      console.error(`❌ [${correlationId}] Método no permitido: ${req.method}`);
      return jsonResponse({
        ok: false,
        code: 'METHOD_NOT_ALLOWED',
        message: `Método ${req.method} no permitido. Use POST.`,
        correlationId
      }, 405);
    }

    // Parsear input
    let input;
    try {
      input = await req.json();
      console.log(`📥 [${correlationId}] Input recibido:`, input);
    } catch (e) {
      console.error(`❌ [${correlationId}] Error parseando JSON:`, e);
      return jsonResponse({
        ok: false,
        code: 'INVALID_JSON',
        message: 'El cuerpo de la petición debe ser JSON válido',
        correlationId
      }, 400);
    }

    // Validar campos requeridos
    const { pedido_id, condicion_venta, moneda, tipo_cambio, observaciones } = input;
    
    if (!pedido_id) {
      console.error(`❌ [${correlationId}] pedido_id faltante`);
      return jsonResponse({
        ok: false,
        code: 'MISSING_REQUIRED_FIELD',
        message: 'El campo pedido_id es requerido',
        correlationId
      }, 400);
    }

    // Inicializar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Log a debug_log
    await supabase.from('debug_log').insert({
      correlation_id: correlationId,
      ctx: 'facturar-pedido',
      level: 'info',
      message: 'Proceso iniciado',
      data: { input, timestamp: new Date().toISOString() }
    });

    // 1. Obtener el usuario autenticado
    const authHeader = req.headers.get('Authorization');
    let created_by: string;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        console.error(`❌ [${correlationId}] Error de autenticación:`, authError);
        return jsonResponse({
          ok: false,
          code: 'AUTH_ERROR',
          message: 'Usuario no autenticado',
          correlationId
        }, 401);
      }
      
      created_by = user.id;
      console.log(`✅ [${correlationId}] Usuario autenticado:`, created_by);
    } else {
      // Fallback: buscar un usuario válido
      console.log(`⚠️ [${correlationId}] No hay token de autenticación, buscando usuario válido...`);
      const { data: usuarios, error: usuariosError } = await supabase
        .from('usuarios')
        .select('id')
        .limit(1);

      if (usuariosError || !usuarios || usuarios.length === 0) {
        console.error(`❌ [${correlationId}] No se encontraron usuarios:`, usuariosError);
        return jsonResponse({
          ok: false,
          code: 'NO_USERS_FOUND',
          message: 'No se encontraron usuarios válidos en el sistema',
          correlationId,
          pgError: usuariosError
        }, 400);
      }

      created_by = usuarios[0].id;
      console.log(`✅ [${correlationId}] Usuario válido encontrado:`, created_by);
    }

    // 2. Mapear tipo de documento
    const tipoDocumentoMap: Record<string, string> = {
      '01': 'FE', // Factura Electrónica
      '02': 'ND', // Nota de Débito
      '03': 'NC', // Nota de Crédito
      '04': 'TE'  // Tiquete Electrónico
    };

    const tipo_documento = tipoDocumentoMap['01'] || 'FE'; // Default FE
    console.log(`🔧 [${correlationId}] Tipo documento mapeado: 01 → ${tipo_documento}`);

    // 3. Mapear condición de venta
    const condicionVentaMap: Record<string, string> = {
      '01': 'contado',
      '02': 'credito'
    };

    const condicion_venta_mapped = condicionVentaMap[condicion_venta] || 'contado';
    console.log(`🔧 [${correlationId}] Condición venta mapeada: ${condicion_venta} → ${condicion_venta_mapped}`);

    // 4. Buscar pedido con todos los datos necesarios - CORREGIDO: usar 'total' en lugar de 'total_general'
    console.log(`📦 [${correlationId}] Buscando pedido ${pedido_id}...`);
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos')
      .select(`
        id, 
        cliente_id, 
        subtotal, 
        descuento_total, 
        impuesto_total, 
        total,
        estado,
        clientes!inner(id, nombre_razon_social, identificacion)
      `)
      .eq('id', pedido_id)
      .single();

    if (pedidoError || !pedido) {
      console.error(`❌ [${correlationId}] Error buscando pedido:`, pedidoError);
      return jsonResponse({
        ok: false,
        code: 'PEDIDO_NOT_FOUND',
        message: `No se encontró el pedido con ID ${pedido_id}`,
        correlationId,
        pgError: pedidoError
      }, 400);
    }

    console.log(`✅ [${correlationId}] Pedido encontrado:`, { 
      id: pedido.id, 
      cliente_id: pedido.cliente_id,
      cliente_nombre: pedido.clientes?.nombre_razon_social,
      estado: pedido.estado,
      total: pedido.total
    });

    // Validar que el pedido esté confirmado
    if (pedido.estado !== 'confirmado') {
      console.error(`❌ [${correlationId}] Pedido no está confirmado: ${pedido.estado}`);
      return jsonResponse({
        ok: false,
        code: 'INVALID_PEDIDO_STATE',
        message: `Solo se pueden facturar pedidos confirmados. Estado actual: ${pedido.estado}`,
        correlationId
      }, 400);
    }

    // 5. Generar consecutivo y clave
    const fechaActual = new Date();
    const dia = String(fechaActual.getDate()).padStart(2, '0');
    const mes = String(fechaActual.getMonth() + 1).padStart(2, '0');
    const año = String(fechaActual.getFullYear());
    const año2 = año.slice(-2);
    const hora = String(fechaActual.getHours()).padStart(2, '0');
    const minuto = String(fechaActual.getMinutes()).padStart(2, '0');
    const segundo = String(fechaActual.getSeconds()).padStart(2, '0');
    
    // Consecutivo de 20 caracteres: YYYYMMDDHHMMSS + 6 dígitos secuenciales
    const secuencial = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
    const consecutivo = `${año}${mes}${dia}${hora}${minuto}${segundo}${secuencial}`.slice(0, 20);
    
    // Clave de 50 dígitos según formato de Hacienda CR
    const paisCodigo = '506'; // Costa Rica (3 dígitos)
    const fechaFormato = `${dia}${mes}${año2}`; // DDMMYY (6 dígitos)
    const cedula = '000000000000'; // 12 dígitos
    const situacion = '1'; // 1 = Normal (1 dígito)
    const codigoSeguridad = String(Math.floor(Math.random() * 100000000)).padStart(8, '0'); // 8 dígitos
    
    // 3 + 6 + 12 + 20 + 1 + 8 = 50 dígitos
    const clave = `${paisCodigo}${fechaFormato}${cedula}${consecutivo}${situacion}${codigoSeguridad}`;
    
    console.log(`🔐 [${correlationId}] Clave generada: ${clave} (${clave.length} dígitos)`);
    console.log(`📋 [${correlationId}] Consecutivo generado: ${consecutivo} (${consecutivo.length} caracteres)`);

    // 6. Preparar datos de factura - CORREGIDO: usar pedido.total en lugar de pedido.total_general
    const facturaData = {
      // Campos requeridos (NOT NULL)
      numero_consecutivo: consecutivo,
      clave_numerica: clave,
      tipo_documento: tipo_documento,
      estado: 'borrador',
      cliente_id: Number(pedido.cliente_id),
      created_by: created_by,
      fecha_emision: fechaActual.toISOString(),
      condicion_venta: condicion_venta_mapped,
      moneda: moneda || 'CRC',
      tipo_cambio: Number(tipo_cambio) || 1,
      subtotal: Number(pedido.subtotal) || 0,
      descuento_total: Number(pedido.descuento_total) || 0,
      impuesto_total: Number(pedido.impuesto_total) || 0,
      total_general: Number(pedido.total) || 0,
      
      // Campos opcionales (NULLABLE)
      pedido_id: Number(pedido_id),
      cotizacion_id: null,
      fecha_vencimiento: null,
      plazo_credito: 0,
      xml_firmado: null,
      respuesta_hacienda: null,
      mensaje_hacienda: null,
      fecha_procesamiento: null,
      notas: observaciones || null,
      referencia_externa: null,
      clave: clave,
      consecutivo: consecutivo,
      estado_local: 'borrador',
      medio_pago: '01',
      observaciones: observaciones || null
    };

    console.log(`💾 [${correlationId}] Intentando insertar factura...`);

    // Log detallado antes del insert
    await supabase.from('debug_log').insert({
      correlation_id: correlationId,
      ctx: 'facturar-pedido',
      level: 'info',
      message: 'Intentando insertar factura',
      data: { facturaData, stage: 'before_insert' }
    });

    // 7. Insertar factura
    const { data: facturaCreada, error: facturaError } = await supabase
      .from('facturas_electronicas')
      .insert(facturaData)
      .select()
      .single();

    if (facturaError) {
      console.error(`❌ [${correlationId}] Error al insertar factura:`, facturaError);
      
      // Log del error
      await supabase.from('debug_log').insert({
        correlation_id: correlationId,
        ctx: 'facturar-pedido',
        level: 'error',
        message: 'Error insertando factura',
        data: { 
          facturaError, 
          facturaData, 
          stage: 'insert_factura_failed',
          pgCode: facturaError.code,
          pgMessage: facturaError.message,
          pgDetails: facturaError.details,
          pgHint: facturaError.hint
        }
      });

      // Mapear errores PostgreSQL específicos
      let errorCode = 'DB_INSERT_FAIL';
      let errorMessage = facturaError.message || 'Error desconocido al insertar factura';

      switch (facturaError.code) {
        case '23502':
          errorCode = 'MISSING_REQUIRED_FIELD';
          errorMessage = `Campo requerido faltante: ${facturaError.message}`;
          break;
        case '22001':
          errorCode = 'VALUE_TOO_LONG';
          errorMessage = `Valor demasiado largo: ${facturaError.message}`;
          break;
        case '23503':
          errorCode = 'FK_VIOLATION';
          errorMessage = `Referencia inválida: ${facturaError.message}`;
          break;
        case '23514':
          errorCode = 'CHECK_VIOLATION';
          errorMessage = `Violación de restricción: ${facturaError.message}`;
          break;
        case '42703':
          errorCode = 'COLUMN_NOT_FOUND';
          errorMessage = `Columna no encontrada: ${facturaError.message}`;
          break;
      }

      return jsonResponse({
        ok: false,
        code: errorCode,
        message: errorMessage,
        correlationId,
        stage: 'insert_factura',
        pgError: {
          code: facturaError.code,
          message: facturaError.message,
          details: facturaError.details,
          hint: facturaError.hint
        }
      }, 400);
    }

    console.log(`✅ [${correlationId}] Factura creada exitosamente:`, { id: facturaCreada.id });

    // 8. Copiar items del pedido a factura_items
    console.log(`📝 [${correlationId}] Copiando items del pedido...`);
    
    const { data: pedidoItems, error: itemsError } = await supabase
      .from('pedido_items')
      .select('*')
      .eq('pedido_id', pedido_id);

    if (itemsError) {
      console.error(`❌ [${correlationId}] Error obteniendo items del pedido:`, itemsError);
    } else if (pedidoItems && pedidoItems.length > 0) {
      const facturaItems = pedidoItems.map(item => ({
        factura_id: facturaCreada.id,
        item_type: item.item_type || 'producto',
        item_id: item.item_id,
        descripcion: item.descripcion,
        unidad: item.unidad || 'UND',
        cantidad: item.cantidad,
        precio_unit: item.precio_unit,
        descuento_pct: item.descuento_pct || 0,
        impuesto_pct: item.impuesto_pct || 13,
        total: item.total
      }));

      const { error: insertItemsError } = await supabase
        .from('factura_items')
        .insert(facturaItems);

      if (insertItemsError) {
        console.error(`❌ [${correlationId}] Error insertando items de factura:`, insertItemsError);
      } else {
        console.log(`✅ [${correlationId}] Items copiados a factura_items: ${facturaItems.length} items`);
      }
    }

    // 9. Actualizar estado del pedido a 'facturado'
    console.log(`📝 [${correlationId}] Actualizando estado del pedido...`);
    const { error: updatePedidoError } = await supabase
      .from('pedidos')
      .update({ estado: 'facturado' })
      .eq('id', pedido_id);

    if (updatePedidoError) {
      console.error(`❌ [${correlationId}] Error actualizando estado del pedido:`, updatePedidoError);
    } else {
      console.log(`✅ [${correlationId}] Estado del pedido actualizado a 'facturado'`);
    }

    // 10. Marcar reservas de inventario como consumidas
    console.log(`📦 [${correlationId}] Actualizando reservas de inventario...`);
    const { error: reservasError } = await supabase
      .from('inventario_reservas')
      .update({ estado: 'consumida' })
      .eq('pedido_id', pedido_id)
      .eq('estado', 'activa');

    if (reservasError) {
      console.error(`❌ [${correlationId}] Error actualizando reservas:`, reservasError);
    } else {
      console.log(`✅ [${correlationId}] Reservas de inventario marcadas como consumidas`);
    }

    // Log de éxito
    await supabase.from('debug_log').insert({
      correlation_id: correlationId,
      ctx: 'facturar-pedido',
      level: 'info',
      message: 'Proceso completado exitosamente',
      data: { 
        facturaId: facturaCreada.id,
        consecutivo,
        clave,
        stage: 'completed'
      }
    });

    console.log(`🎉 [${correlationId}] Proceso completado exitosamente`);

    // 11. Respuesta de éxito
    return jsonResponse({
      success: true,
      consecutivo: consecutivo,
      clave: clave,
      estado: 'borrador',
      factura_id: facturaCreada.id,
      correlationId
    }, 200);

  } catch (error: any) {
    console.error(`💥 [${correlationId}] Error inesperado:`, error);
    
    // Log del error inesperado
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await supabase.from('debug_log').insert({
        correlation_id: correlationId,
        ctx: 'facturar-pedido',
        level: 'error',
        message: 'Error inesperado en catch',
        data: { 
          error: error.message,
          stack: error.stack,
          stage: 'unexpected_error'
        }
      });
    } catch (logError) {
      console.error(`❌ [${correlationId}] Error logging to debug_log:`, logError);
    }

    return jsonResponse({
      ok: false,
      code: error.code || 'UNEXPECTED_ERROR',
      message: error.message || String(error),
      correlationId,
      stage: 'unexpected_catch',
      meta: { stack: error.stack }
    }, 500);
  }
})