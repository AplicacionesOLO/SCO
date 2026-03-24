import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { factura_id } = await req.json()

    if (!factura_id) {
      throw new Error('factura_id es requerido')
    }

    // Crear cliente Supabase con service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log(`🔄 Iniciando consumo de inventario para factura ${factura_id}`)

    // 1. Buscar factura y pedido asociado
    const { data: factura, error: facturaError } = await supabase
      .from('facturas_electronicas')
      .select(`
        id, clave, consecutivo, total, cliente_id,
        pedidos!inner(id, estado, cliente_id)
      `)
      .eq('id', factura_id)
      .eq('estado_hacienda', 'aceptado')
      .single()

    if (facturaError || !factura) {
      throw new Error(`Factura no encontrada o no está aceptada: ${facturaError?.message}`)
    }

    const pedido = factura.pedidos
    console.log(`📦 Procesando pedido ${pedido.id}`)

    // 2. Verificar que no se haya procesado antes (idempotencia)
    const { data: yaConsumido } = await supabase
      .from('inventario_movimientos')
      .select('id')
      .eq('referencia_tipo', 'factura')
      .eq('referencia_id', factura_id)
      .eq('tipo', 'venta')
      .limit(1)

    if (yaConsumido && yaConsumido.length > 0) {
      console.log(`⚠️ Inventario ya consumido para factura ${factura_id}`)
      return new Response(
        JSON.stringify({ success: true, message: 'Ya procesado anteriormente' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Obtener reservas activas del pedido
    const { data: reservas, error: reservasError } = await supabase
      .from('inventario_reservas')
      .select(`
        id, articulo_id, cantidad,
        inventario!inner(id, codigo, nombre, unidad_medida)
      `)
      .eq('pedido_id', pedido.id)
      .eq('estado', 'activa')

    if (reservasError) {
      throw new Error(`Error obteniendo reservas: ${reservasError.message}`)
    }

    if (!reservas || reservas.length === 0) {
      throw new Error('No se encontraron reservas activas para el pedido')
    }

    console.log(`📋 Encontradas ${reservas.length} reservas para consumir`)

    // 4. Procesar cada artículo en transacción
    const movimientos = []
    const reservasConsumidas = []

    for (const reserva of reservas) {
      const articulo = reserva.inventario

      try {
        console.log(`🔍 Procesando artículo ${articulo.codigo} - Cantidad: ${reserva.cantidad}`)

        // 4a. Obtener factor de conversión si es necesario
        let cantidadReal = reserva.cantidad
        
        // Si hay BOM o conversiones, aplicar aquí
        // Por ahora usamos cantidad directa, pero se puede expandir
        const factor = await obtenerFactorConversion(articulo.unidad_medida, articulo.unidad_medida)
        cantidadReal = reserva.cantidad * (factor || 1)

        // 4b. Bloquear y verificar stock disponible
        const { data: nivel, error: nivelError } = await supabase
          .from('inventario_niveles')
          .select('on_hand, reservado, disponible')
          .eq('articulo_id', articulo.id)
          .single()

        if (nivelError) {
          throw new Error(`Error obteniendo nivel de inventario: ${nivelError.message}`)
        }

        if (!nivel || nivel.on_hand < cantidadReal) {
          throw new Error(`Stock insuficiente para ${articulo.codigo}. Disponible: ${nivel?.on_hand || 0}, Requerido: ${cantidadReal}`)
        }

        // 4c. Actualizar inventario_niveles (descontar on_hand y reservado)
        const { error: updateError } = await supabase
          .from('inventario_niveles')
          .update({
            on_hand: nivel.on_hand - cantidadReal,
            reservado: nivel.reservado - cantidadReal
          })
          .eq('articulo_id', articulo.id)

        if (updateError) {
          throw new Error(`Error actualizando inventario: ${updateError.message}`)
        }

        // 4d. Crear movimiento de inventario
        movimientos.push({
          articulo_id: articulo.id,
          tipo: 'venta',
          cantidad: -cantidadReal, // Negativo porque es salida
          referencia_tipo: 'factura',
          referencia_id: factura_id,
          notas: `Venta factura ${factura.consecutivo} - Pedido ${pedido.id}`
        })

        // 4e. Marcar reserva como consumida
        reservasConsumidas.push(reserva.id)

        console.log(`✅ Artículo ${articulo.codigo} procesado correctamente`)

      } catch (error) {
        console.error(`❌ Error procesando artículo ${articulo.codigo}:`, error)
        throw new Error(`Error en artículo ${articulo.codigo}: ${error.message}`)
      }
    }

    // 5. Insertar todos los movimientos
    if (movimientos.length > 0) {
      const { error: movimientosError } = await supabase
        .from('inventario_movimientos')
        .insert(movimientos)

      if (movimientosError) {
        throw new Error(`Error insertando movimientos: ${movimientosError.message}`)
      }
    }

    // 6. Marcar reservas como consumidas
    if (reservasConsumidas.length > 0) {
      const { error: reservasError } = await supabase
        .from('inventario_reservas')
        .update({ 
          estado: 'consumida',
          updated_at: new Date().toISOString()
        })
        .in('id', reservasConsumidas)

      if (reservasError) {
        throw new Error(`Error actualizando reservas: ${reservasError.message}`)
      }
    }

    // 7. Actualizar estado del pedido
    const { error: pedidoError } = await supabase
      .from('pedidos')
      .update({
        estado: 'facturado',
        facturado_at: new Date().toISOString(),
        factura_id: factura_id
      })
      .eq('id', pedido.id)

    if (pedidoError) {
      throw new Error(`Error actualizando pedido: ${pedidoError.message}`)
    }

    // 8. Confirmar factura como aceptada
    const { error: facturaUpdateError } = await supabase
      .from('facturas_electronicas')
      .update({
        estado_hacienda: 'aceptado',
        aceptado_at: new Date().toISOString()
      })
      .eq('id', factura_id)

    if (facturaUpdateError) {
      console.error('⚠️ Error actualizando estado factura:', facturaUpdateError)
    }

    // 9. Registrar auditoría
    await supabase.from('auditoria_facturacion').insert({
      usuario_id: null, // Sistema automático
      accion: 'consumir_inventario',
      entidad: 'factura',
      entidad_id: factura_id,
      meta: {
        pedido_id: pedido.id,
        articulos_procesados: reservas.length,
        movimientos_creados: movimientos.length
      }
    })

    // 10. Enviar email al cliente (opcional)
    try {
      await enviarEmailFactura(factura_id, factura.cliente_id)
    } catch (emailError) {
      console.error('⚠️ Error enviando email:', emailError)
      // No fallar por error de email
    }

    console.log(`✅ Consumo de inventario completado para factura ${factura_id}`)

    return new Response(
      JSON.stringify({
        success: true,
        factura_id,
        pedido_id: pedido.id,
        articulos_procesados: reservas.length,
        movimientos_creados: movimientos.length,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('❌ Error consumiendo inventario:', error)
    
    // Registrar error en auditoría
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )
      
      await supabase.from('auditoria_facturacion').insert({
        usuario_id: null,
        accion: 'error_consumo_inventario',
        entidad: 'factura',
        entidad_id: req.json().factura_id || 'unknown',
        meta: { error: error.message }
      })
    } catch (auditError) {
      console.error('❌ Error registrando auditoría:', auditError)
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})

// Función para obtener factor de conversión entre unidades
async function obtenerFactorConversion(fromUnit: string, toUnit: string): Promise<number> {
  try {
    if (fromUnit === toUnit) return 1

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data, error } = await supabase
      .from('inventario_unidad_conversion')
      .select('factor')
      .eq('from_u', fromUnit)
      .eq('to_u', toUnit)
      .single()

    if (error || !data) {
      console.log(`⚠️ No se encontró conversión ${fromUnit} → ${toUnit}, usando factor 1`)
      return 1
    }

    return data.factor
  } catch (error) {
    console.error('❌ Error obteniendo factor conversión:', error)
    return 1
  }
}

// Función para enviar email con factura al cliente
async function enviarEmailFactura(facturaId: string, clienteId: string) {
  try {
    // Aquí puedes integrar con tu servicio de email
    // Por ejemplo: SendGrid, Resend, etc.
    console.log(`📧 Enviando email factura ${facturaId} a cliente ${clienteId}`)
    
    // Ejemplo básico (implementar según tu proveedor de email)
    const emailWebhook = Deno.env.get('EMAIL_WEBHOOK_URL')
    if (emailWebhook) {
      await fetch(emailWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'factura_aceptada',
          factura_id: facturaId,
          cliente_id: clienteId,
          timestamp: new Date().toISOString()
        })
      })
    }
  } catch (error) {
    console.error('❌ Error enviando email:', error)
    throw error
  }
}