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
    // Crear cliente Supabase con service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🔄 Iniciando polling de estados Hacienda CR...')

    // 1. Buscar facturas en proceso con intentos < 10
    const { data: facturas, error: facturaError } = await supabase
      .from('facturas_electronicas')
      .select('id, location, intentos, ultimo_intento_at, clave, consecutivo')
      .eq('estado_hacienda', 'en_proceso')
      .lt('intentos', 10)
      .not('location', 'is', null)

    if (facturaError) {
      console.error('❌ Error consultando facturas:', facturaError)
      throw facturaError
    }

    console.log(`📋 Encontradas ${facturas?.length || 0} facturas para consultar`)

    let procesadas = 0
    let aceptadas = 0
    let rechazadas = 0

    // 2. Procesar cada factura
    for (const factura of facturas || []) {
      try {
        // Calcular backoff exponencial: 10s, 20s, 40s, 80s...
        const backoffSeconds = Math.min(10 * Math.pow(2, factura.intentos), 300) // máx 5 min
        const tiempoEspera = new Date(factura.ultimo_intento_at)
        tiempoEspera.setSeconds(tiempoEspera.getSeconds() + backoffSeconds)

        // Si aún no es tiempo de reintentar, saltar
        if (new Date() < tiempoEspera) {
          console.log(`⏳ Factura ${factura.id}: esperando backoff (${backoffSeconds}s)`)
          continue
        }

        console.log(`🔍 Consultando estado factura ${factura.id} (intento ${factura.intentos + 1})`)

        // 3. Obtener token OAuth2 para Hacienda
        const tokenResponse = await obtenerTokenHacienda()
        if (!tokenResponse.success) {
          throw new Error(`Error obteniendo token: ${tokenResponse.error}`)
        }

        // 4. Consultar estado en Hacienda usando Location
        const estadoResponse = await fetch(factura.location, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${tokenResponse.token}`,
            'Content-Type': 'application/json'
          }
        })

        const responseData = await estadoResponse.json()
        
        // 5. Registrar comunicación en auditoría
        await supabase.from('hacienda_envios').insert({
          factura_id: factura.id,
          tipo_operacion: 'consulta',
          request_data: { location: factura.location },
          response_data: responseData,
          status_code: estadoResponse.status,
          success: estadoResponse.ok
        })

        // 6. Actualizar intentos
        await supabase
          .from('facturas_electronicas')
          .update({
            intentos: factura.intentos + 1,
            ultimo_intento_at: new Date().toISOString()
          })
          .eq('id', factura.id)

        // 7. Procesar respuesta según estado
        if (estadoResponse.ok && responseData.ind_estado) {
          const estado = responseData.ind_estado.toLowerCase()

          if (estado === 'aceptado') {
            console.log(`✅ Factura ${factura.id} ACEPTADA por Hacienda`)
            
            // Actualizar estado a aceptado
            await supabase
              .from('facturas_electronicas')
              .update({
                estado_hacienda: 'aceptado',
                aceptado_at: new Date().toISOString()
              })
              .eq('id', factura.id)

            // Disparar consumo de inventario
            const consumeResponse = await fetch(`${supabaseUrl}/functions/v1/consume-inventory`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ factura_id: factura.id })
            })

            if (!consumeResponse.ok) {
              console.error(`❌ Error consumiendo inventario para factura ${factura.id}`)
            }

            aceptadas++

          } else if (estado === 'rechazado') {
            console.log(`❌ Factura ${factura.id} RECHAZADA por Hacienda`)
            
            // Actualizar estado a rechazado
            await supabase
              .from('facturas_electronicas')
              .update({
                estado_hacienda: 'rechazado',
                rechazo_motivo: responseData.detalle_mensaje || 'Factura rechazada por Hacienda'
              })
              .eq('id', factura.id)

            rechazadas++

          } else {
            console.log(`⏳ Factura ${factura.id} aún en proceso: ${estado}`)
          }
        } else {
          console.log(`⚠️ Respuesta no válida para factura ${factura.id}`)
        }

        procesadas++

      } catch (error) {
        console.error(`❌ Error procesando factura ${factura.id}:`, error)
        
        // Si supera máximo de intentos, marcar como error
        if (factura.intentos >= 9) {
          await supabase
            .from('facturas_electronicas')
            .update({
              estado_hacienda: 'error',
              rechazo_motivo: `Error tras ${factura.intentos + 1} intentos: ${error.message}`
            })
            .eq('id', factura.id)

          // Enviar alerta a administradores
          await enviarAlertaAdmin(factura.id, `Factura ${factura.consecutivo} falló tras múltiples intentos`)
        }
      }
    }

    console.log(`✅ Polling completado: ${procesadas} procesadas, ${aceptadas} aceptadas, ${rechazadas} rechazadas`)

    return new Response(
      JSON.stringify({
        success: true,
        procesadas,
        aceptadas,
        rechazadas,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('❌ Error en polling Hacienda:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})

// Función para obtener token OAuth2 de Hacienda
async function obtenerTokenHacienda() {
  try {
    const clientId = Deno.env.get('HACIENDA_CLIENT_ID')
    const clientSecret = Deno.env.get('HACIENDA_CLIENT_SECRET')
    const tokenUrl = Deno.env.get('HACIENDA_TOKEN_URL') || 'https://idp.comprobanteselectronicos.go.cr/auth/realms/rut/protocol/openid_connect/token'

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId!,
        client_secret: clientSecret!
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`)
    }

    const data = await response.json()
    return { success: true, token: data.access_token }

  } catch (error) {
    console.error('❌ Error obteniendo token Hacienda:', error)
    return { success: false, error: error.message }
  }
}

// Función para enviar alertas a administradores
async function enviarAlertaAdmin(facturaId: string, mensaje: string) {
  try {
    // Aquí puedes integrar con tu sistema de notificaciones
    // Por ejemplo: email, Slack, webhook, etc.
    console.log(`🚨 ALERTA ADMIN: ${mensaje} (Factura: ${facturaId})`)
    
    // Ejemplo de webhook (opcional)
    const webhookUrl = Deno.env.get('ADMIN_WEBHOOK_URL')
    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'factura_error',
          factura_id: facturaId,
          mensaje,
          timestamp: new Date().toISOString()
        })
      })
    }
  } catch (error) {
    console.error('❌ Error enviando alerta admin:', error)
  }
}