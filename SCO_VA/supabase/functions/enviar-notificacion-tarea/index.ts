import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import nodemailer from 'npm:nodemailer@6.9.13';

const SUPABASE_URL             = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const SMTP_HOST       = Deno.env.get('SMTP_HOST')       || 'smtp.gmail.com';
const SMTP_PORT       = Number(Deno.env.get('SMTP_PORT') || '465');
const SMTP_SECURE     = (Deno.env.get('SMTP_SECURE')     || 'true') === 'true';
const SMTP_USER       = Deno.env.get('SMTP_USER');
const SMTP_PASS       = Deno.env.get('SMTP_PASS');
const SMTP_FROM_EMAIL = Deno.env.get('SMTP_FROM_EMAIL');
const SMTP_REPLY_TO   = Deno.env.get('SMTP_REPLY_TO') || SMTP_FROM_EMAIL;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface NotificacionData {
  tarea_id: number | string;
  tipo: 'creacion' | 'cambio_estado';
  estado_anterior?: string;
  estado_nuevo?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método no permitido' }), {
        status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: NotificacionData = await req.json();
    const { tarea_id, tipo, estado_anterior, estado_nuevo } = body;

    if (!tarea_id || !tipo) {
      return new Response(JSON.stringify({ error: 'Datos incompletos', recibido: body }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const missing: string[] = [];
    if (!SMTP_USER)       missing.push('SMTP_USER');
    if (!SMTP_PASS)       missing.push('SMTP_PASS');
    if (!SMTP_FROM_EMAIL) missing.push('SMTP_FROM_EMAIL');

    if (missing.length > 0) {
      const msg = `Secrets SMTP faltantes: ${missing.join(', ')}`;
      console.error('[SMTP] ❌', msg);
      return new Response(JSON.stringify({ success: false, error: msg }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[NOTIF] === INICIO ===');
    console.log('[NOTIF] tarea_id:', tarea_id, '| tipo:', tipo);
    console.log('[SMTP] Auth user:', SMTP_USER);
    console.log('[SMTP] From visible:', SMTP_FROM_EMAIL);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: tarea, error: tareaError } = await supabase
      .from('tareas')
      .select(`
        *,
        tareas_items(*),
        tienda:tiendas(id, nombre)
      `)
      .eq('id', tarea_id)
      .maybeSingle();

    if (tareaError) {
      console.error('[DB] Error consultando tarea:', tareaError);
      return new Response(JSON.stringify({ error: 'Error consultando tarea', detalle: tareaError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!tarea) {
      return new Response(JSON.stringify({ error: 'Tarea no encontrada', tarea_id }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[NOTIF] Tarea:', tarea.consecutivo, '| tienda_id:', tarea.tienda_id);

    const destinatarios: string[] = [];

    if (tarea.email_solicitante) {
      destinatarios.push(tarea.email_solicitante);
    }

    const { data: encargados } = await supabase
      .from('tareas_encargados')
      .select('usuario_id')
      .eq('tienda_id', tarea.tienda_id);

    if (encargados && encargados.length > 0) {
      const ids = encargados.map((e: any) => e.usuario_id).filter(Boolean);
      if (ids.length > 0) {
        const { data: usuariosEncargados } = await supabase
          .from('usuarios')
          .select('correo')
          .in('id', ids);

        (usuariosEncargados || []).forEach((u: any) => {
          if (u.correo && !destinatarios.includes(u.correo)) {
            destinatarios.push(u.correo);
          }
        });
      }
    }

    console.log('[NOTIF] Destinatarios:', destinatarios);

    if (destinatarios.length === 0) {
      console.log('[NOTIF] ⚠️ Sin destinatarios.');
      return new Response(JSON.stringify({ success: true, message: 'Sin destinatarios', destinatarios: [] }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    try {
      await transporter.verify();
      console.log('[SMTP] ✅ Conexión verificada:', SMTP_USER);
    } catch (verifyErr: any) {
      const msg = verifyErr?.message || String(verifyErr);
      console.error('[SMTP] ❌ Verify falló:', msg);
      return new Response(JSON.stringify({ success: false, error: `SMTP verify failed: ${msg}` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const asunto = tipo === 'creacion'
      ? buildAsunto(tarea)
      : `Cambio de Estado - Tarea ${tarea.consecutivo}`;

    const html = generarHtmlCorreo(tarea, tipo, estado_anterior, estado_nuevo);

    const mailOptions = {
      from: SMTP_FROM_EMAIL,
      to: destinatarios.join(', '),
      replyTo: SMTP_REPLY_TO || undefined,
      subject: asunto,
      html,
      text: `Tarea: ${tarea.consecutivo}\nEstado: ${estado_nuevo || tarea.estado || 'N/A'}`,
    };

    console.log('[MAIL] === PRE-ENVÍO ===');
    console.log('[MAIL] From:', mailOptions.from);
    console.log('[MAIL] To:', mailOptions.to);
    console.log('[MAIL] Subject:', asunto);

    const info = await transporter.sendMail(mailOptions);

    console.log('[MAIL] === POST-ENVÍO ===');
    console.log('[MAIL] messageId:', info.messageId);
    console.log('[MAIL] accepted:', JSON.stringify(info.accepted ?? []));
    console.log('[MAIL] rejected:', JSON.stringify(info.rejected ?? []));
    console.log('[MAIL] response:', info.response ?? 'N/A');

    const accepted = info.accepted ?? [];
    const rejected = info.rejected ?? [];

    return new Response(JSON.stringify({
      success: true,
      message: 'Correo procesado por SMTP',
      destinatarios,
      messageId: info.messageId,
      accepted,
      rejected,
      response: info.response ?? '',
      entregado_confirmado: accepted.length > 0 && rejected.length === 0,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[ERROR] General:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildAsunto(tarea: any): string {
  const df = tarea.datos_formulario || {};
  const dep = df.departamento_solicitante || '';
  const cli = df.cliente || '';
  const epa = df.solicitud_epa || '';
  const cof = df.solicitud_cofersa || '';
  const tipo = df.tipo_trabajo || '';
  const consec = tarea.consecutivo || 'TAREA';

  if (dep === 'Servicio al Cliente') {
    if (cli === 'EPA' && epa) return `Nueva Solicitud EPA — ${epa} | ${consec}`;
    if (cli === 'COFERSA' && cof) {
      const sufijo = tipo ? ` / ${tipo}` : '';
      return `Nueva Solicitud COFERSA — ${cof}${sufijo} | ${consec}`;
    }
    if (cli) return `Nueva Solicitud ${cli} | ${consec}`;
    return `Nueva Solicitud — Servicio al Cliente | ${consec}`;
  }
  if (dep) return `Nueva Solicitud — ${dep} | ${consec}`;
  return `Nueva Tarea Registrada | ${consec}`;
}

function usaTablaSimple(df: any): boolean {
  const dep = df.departamento_solicitante;
  const cli = df.cliente;
  const epa = df.solicitud_epa;
  if (dep === 'Servicio al Cliente' && cli === 'EPA') {
    return ['Códigos de Barra', 'Registros sanitarios', 'Traducción', 'Usos Delta Plus'].includes(epa);
  }
  if (dep === 'Servicio al Cliente' && cli === 'COFERSA') return true;
  return false;
}

function usaTablaCompleta(df: any): boolean {
  const dep = df.departamento_solicitante;
  const cli = df.cliente;
  const epa = df.solicitud_epa;
  if (dep === 'Servicio al Cliente' && cli === 'EPA') {
    return ['Licencias / contenedores / Pallets', 'Suministros'].includes(epa);
  }
  return false;
}

function labelTablaSimple(df: any): string {
  const cli = df.cliente;
  const epa = df.solicitud_epa;
  if (cli === 'EPA') {
    if (epa === 'Códigos de Barra')    return 'CÓDIGOS DE BARRA Y CANTIDADES';
    if (epa === 'Registros sanitarios') return 'ÍTEMS CON REGISTROS SANITARIOS';
    if (epa === 'Traducción')           return 'ÍTEMS A TRADUCIR';
    if (epa === 'Usos Delta Plus')      return 'ÍTEMS USOS DELTA PLUS';
    return 'CÓDIGOS Y CANTIDADES';
  }
  if (cli === 'COFERSA') return 'CÓDIGOS Y CANTIDADES A ETIQUETAR';
  return 'CÓDIGOS Y CANTIDADES';
}

function labelTablaCompleta(df: any): string {
  const epa = df.solicitud_epa;
  if (epa === 'Licencias / contenedores / Pallets') return 'DETALLE DE LICENCIAS / CONTENEDORES / PALLETS';
  if (epa === 'Suministros') return 'DETALLE DE SUMINISTROS';
  return 'DESCRIPCIÓN Y CANTIDADES';
}

function generarHtmlCorreo(
  tarea: any,
  tipo: string,
  estado_anterior?: string,
  estado_nuevo?: string
): string {

  const formatFecha = (f: string | null | undefined): string => {
    if (!f) return 'No especificado';
    try {
      return new Date(f).toLocaleDateString('es-CR', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      });
    } catch { return f; }
  };

  const formatFechaSolo = (f: string | null | undefined): string => {
    if (!f) return 'No especificado';
    try {
      return new Date(f).toLocaleDateString('es-CR', {
        year: 'numeric', month: '2-digit', day: '2-digit'
      });
    } catch { return f; }
  };

  const formatMoneda = (v: number | null | undefined): string => {
    if (!v && v !== 0) return '—';
    return new Intl.NumberFormat('es-CR', {
      style: 'currency', currency: 'CRC', minimumFractionDigits: 0
    }).format(v);
  };

  const val = (v: string | null | undefined, fallback = 'No especificado'): string =>
    (v && String(v).trim()) ? String(v).trim() : fallback;

  const estadoColores: Record<string, string> = {
    'En Cola': '#6B7280',
    'En Proceso': '#F59E0B',
    'Produciendo': '#3B82F6',
    'Esperando suministros': '#EF4444',
    'Terminado': '#10B981',
    'Finalizado': '#059669',
  };

  const colorEstado = (e: string) => estadoColores[e] || '#6B7280';

  const df = tarea.datos_formulario || {};
  const departamento     = df.departamento_solicitante || null;
  const cliente          = df.cliente || null;
  const solicitudEPA     = df.solicitud_epa || null;
  const solicitudCOFERSA = df.solicitud_cofersa || null;
  const tipoTrabajo      = df.tipo_trabajo || null;
  const itemsSimples     = Array.isArray(df.items_tabla_simple)   ? df.items_tabla_simple   : [];
  const itemsCompletos   = Array.isArray(df.items_tabla_completa) ? df.items_tabla_completa : [];

  const nombreTienda  = tarea.tienda?.nombre || null;
  const estadoMostrar = estado_nuevo || tarea.estado || 'En Cola';

  const esServicioCliente = departamento === 'Servicio al Cliente';
  const esZonaFranca      = departamento === 'Zona Franca';
  const esOtros           = departamento === 'Otros';
  const esEPA             = esServicioCliente && cliente === 'EPA';
  const esCOFERSA         = esServicioCliente && cliente === 'COFERSA';
  const tieneTablaSimple  = usaTablaSimple(df) && itemsSimples.length > 0;
  const tieneTablaCompleta = usaTablaCompleta(df) && itemsCompletos.length > 0;

  let tituloSolicitud = '';
  let badgeSolicitud  = '';

  if (esEPA && solicitudEPA) {
    tituloSolicitud = `EPA — ${solicitudEPA}`;
    badgeSolicitud  = `<span style="display:inline-block;padding:4px 14px;background:#10B981;color:#fff;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:0.5px;margin-right:6px;">EPA</span><span style="display:inline-block;padding:4px 14px;background:#F3F4F6;color:#374151;border-radius:20px;font-size:11px;font-weight:600;">${solicitudEPA}</span>`;
  } else if (esCOFERSA && solicitudCOFERSA) {
    const tipoLabel = tipoTrabajo ? ` / ${tipoTrabajo}` : '';
    tituloSolicitud = `COFERSA — ${solicitudCOFERSA}${tipoLabel}`;
    badgeSolicitud  = `<span style="display:inline-block;padding:4px 14px;background:#F59E0B;color:#fff;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:0.5px;margin-right:6px;">COFERSA</span><span style="display:inline-block;padding:4px 14px;background:#F3F4F6;color:#374151;border-radius:20px;font-size:11px;font-weight:600;">${solicitudCOFERSA}</span>${tipoTrabajo ? `<span style="display:inline-block;padding:4px 14px;background:#FEF3C7;color:#92400E;border-radius:20px;font-size:11px;font-weight:600;margin-left:4px;">${tipoTrabajo}</span>` : ''}`;
  } else if (esServicioCliente && cliente) {
    tituloSolicitud = `Servicio al Cliente — ${cliente}`;
  } else if (esZonaFranca) {
    tituloSolicitud = 'Zona Franca';
    badgeSolicitud  = `<span style="display:inline-block;padding:4px 14px;background:#6366F1;color:#fff;border-radius:20px;font-size:11px;font-weight:700;">ZONA FRANCA</span>`;
  } else if (esOtros) {
    tituloSolicitud = 'Solicitud General';
    badgeSolicitud  = `<span style="display:inline-block;padding:4px 14px;background:#6B7280;color:#fff;border-radius:20px;font-size:11px;font-weight:700;">GENERAL</span>`;
  } else if (departamento) {
    tituloSolicitud = departamento;
  }

  const tituloPrincipal = tipo === 'creacion' ? 'Nueva Solicitud de Trabajo' : 'Actualización de Tarea';

  let seccionEstado = '';
  if (tipo === 'cambio_estado' && estado_anterior && estado_nuevo) {
    seccionEstado = `
    <tr>
      <td colspan="2" style="padding:0 0 24px;">
        <div style="background:#F9FAFB;border-radius:8px;padding:16px;">
          <div style="font-size:10px;font-weight:700;color:#9CA3AF;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px;">CAMBIO DE ESTADO</div>
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            <span style="padding:5px 16px;background:${colorEstado(estado_anterior)};color:#fff;border-radius:20px;font-size:12px;font-weight:600;">${estado_anterior}</span>
            <span style="font-size:18px;color:#D1D5DB;">&#8594;</span>
            <span style="padding:5px 16px;background:${colorEstado(estado_nuevo)};color:#fff;border-radius:20px;font-size:12px;font-weight:600;">${estado_nuevo}</span>
          </div>
        </div>
      </td>
    </tr>`;
  } else {
    seccionEstado = `
    <tr>
      <td colspan="2" style="padding:0 0 24px;">
        <div style="background:#F9FAFB;border-radius:8px;padding:14px 16px;">
          <div style="font-size:10px;font-weight:700;color:#9CA3AF;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">ESTADO</div>
          <span style="padding:5px 16px;background:${colorEstado(estadoMostrar)};color:#fff;border-radius:20px;font-size:12px;font-weight:600;">${estadoMostrar}</span>
        </div>
      </td>
    </tr>`;
  }

  const seccionResumen = tituloSolicitud ? `
  <tr>
    <td colspan="2" style="padding:0 0 24px;">
      <div style="background:#111827;border-radius:8px;padding:16px 20px;">
        <div style="font-size:10px;font-weight:700;color:#6B7280;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">TIPO DE SOLICITUD</div>
        <div style="font-size:15px;font-weight:700;color:#F9FAFB;margin-bottom:8px;">${tituloSolicitud}</div>
        ${badgeSolicitud ? `<div style="margin-top:6px;">${badgeSolicitud}</div>` : ''}
      </div>
    </td>
  </tr>` : '';

  let seccionDatosGenerales = `
  ${sectionHeader('DATOS GENERALES')}
  ${tarea.descripcion_breve ? fila('Descripción', val(tarea.descripcion_breve)) : ''}
  ${fila('Estado', `<span style="padding:3px 12px;background:${colorEstado(estadoMostrar)};color:#fff;border-radius:20px;font-size:11px;font-weight:600;">${estadoMostrar}</span>`)}
  ${tarea.cantidad_unidades != null ? fila('Cantidad total', String(tarea.cantidad_unidades)) : ''}
  <tr><td colspan="2" style="height:16px;"></td></tr>`;

  const seccionSolicitante = `
  ${sectionHeader('SOLICITANTE')}
  ${fila('Correo', val(tarea.email_solicitante))}
  <tr><td colspan="2" style="height:16px;"></td></tr>`;

  const seccionAsignacion = nombreTienda ? `
  ${sectionHeader('ASIGNACIÓN')}
  ${fila('Tienda', nombreTienda)}
  <tr><td colspan="2" style="height:16px;"></td></tr>` : '';

  const seccionFechas = `
  ${sectionHeader('FECHAS')}
  ${fila('Fecha de creación', formatFecha(tarea.created_at))}
  ${tarea.fecha_estimada_entrega ? fila('Fecha límite de entrega', formatFechaSolo(tarea.fecha_estimada_entrega)) : ''}
  ${tarea.fecha_inicio  ? fila('Fecha de inicio',  formatFecha(tarea.fecha_inicio))  : ''}
  ${tarea.fecha_cierre  ? fila('Fecha de cierre',  formatFecha(tarea.fecha_cierre))  : ''}
  <tr><td colspan="2" style="height:16px;"></td></tr>`;

  let filasSolicitudDinamica = '';
  if (departamento)      filasSolicitudDinamica += fila('Departamento', departamento);
  if (esServicioCliente && cliente)      filasSolicitudDinamica += fila('Cliente', cliente);
  if (esEPA && solicitudEPA)             filasSolicitudDinamica += fila('Solicitud EPA', solicitudEPA);
  if (esCOFERSA && solicitudCOFERSA)    filasSolicitudDinamica += fila('Solicitud COFERSA', solicitudCOFERSA);
  if (esCOFERSA && tipoTrabajo)         filasSolicitudDinamica += fila('Tipo de trabajo', tipoTrabajo);

  const seccionDetalleSolicitud = filasSolicitudDinamica ? `
  ${sectionHeader('DETALLE DE LA SOLICITUD')}
  ${filasSolicitudDinamica}
  <tr><td colspan="2" style="height:16px;"></td></tr>` : '';

  let seccionTablaSimple = '';
  if (tieneTablaSimple) {
    const etiqueta = labelTablaSimple(df);
    const totalCant = itemsSimples.reduce((s: number, i: any) => s + (Number(i.cantidad) || 0), 0);
    const filas = itemsSimples.map((item: any) => `
      <tr>
        <td style="padding:9px 12px;border-bottom:1px solid #F3F4F6;color:#374151;font-size:13px;font-family:monospace;">${item.codigo || '—'}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #F3F4F6;color:#111827;font-size:13px;font-weight:600;text-align:right;">${item.cantidad != null ? item.cantidad : '—'}</td>
      </tr>`).join('');

    seccionTablaSimple = `
    <tr>
      <td colspan="2" style="padding:0 0 20px;">
        <div style="font-size:10px;font-weight:700;color:#9CA3AF;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;border-bottom:1px solid #F3F4F6;padding-bottom:6px;">${etiqueta}</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #E5E7EB;border-radius:6px;overflow:hidden;">
          <thead><tr style="background:#F9FAFB;">
            <th style="padding:8px 12px;text-align:left;color:#6B7280;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;">Código</th>
            <th style="padding:8px 12px;text-align:right;color:#6B7280;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;">Cantidad</th>
          </tr></thead>
          <tbody>${filas}</tbody>
          <tfoot><tr style="background:#F9FAFB;">
            <td style="padding:8px 12px;text-align:right;font-weight:700;color:#374151;font-size:12px;">Total:</td>
            <td style="padding:8px 12px;text-align:right;font-weight:700;color:#111827;font-size:13px;">${totalCant}</td>
          </tr></tfoot>
        </table>
        <p style="margin:6px 0 0;font-size:11px;color:#9CA3AF;">${itemsSimples.length} ítem${itemsSimples.length !== 1 ? 's' : ''}</p>
      </td>
    </tr>`;
  }

  let seccionTablaCompleta = '';
  if (tieneTablaCompleta) {
    const etiqueta = labelTablaCompleta(df);
    const totalCant = itemsCompletos.reduce((s: number, i: any) => s + (Number(i.cantidad) || 0), 0);
    const filas = itemsCompletos.map((item: any) => `
      <tr>
        <td style="padding:9px 12px;border-bottom:1px solid #F3F4F6;color:#374151;font-size:13px;">${item.descripcion || '—'}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #F3F4F6;color:#111827;font-size:13px;font-weight:600;text-align:center;">${item.cantidad != null ? item.cantidad : '—'}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #F3F4F6;color:#6B7280;font-size:12px;">${item.motivo || '—'}</td>
      </tr>`).join('');

    seccionTablaCompleta = `
    <tr>
      <td colspan="2" style="padding:0 0 20px;">
        <div style="font-size:10px;font-weight:700;color:#9CA3AF;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;border-bottom:1px solid #F3F4F6;padding-bottom:6px;">${etiqueta}</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #E5E7EB;border-radius:6px;overflow:hidden;">
          <thead><tr style="background:#F9FAFB;">
            <th style="padding:8px 12px;text-align:left;color:#6B7280;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;">Descripción</th>
            <th style="padding:8px 12px;text-align:center;color:#6B7280;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;">Cantidad</th>
            <th style="padding:8px 12px;text-align:left;color:#6B7280;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;">Motivo</th>
          </tr></thead>
          <tbody>${filas}</tbody>
          <tfoot><tr style="background:#F9FAFB;">
            <td style="padding:8px 12px;text-align:right;font-weight:700;color:#374151;font-size:12px;">Total:</td>
            <td style="padding:8px 12px;text-align:center;font-weight:700;color:#111827;font-size:13px;">${totalCant}</td>
            <td></td>
          </tr></tfoot>
        </table>
        <p style="margin:6px 0 0;font-size:11px;color:#9CA3AF;">${itemsCompletos.length} ítem${itemsCompletos.length !== 1 ? 's' : ''}</p>
      </td>
    </tr>`;
  }

  let seccionItemsProcesados = '';
  if (tarea.tareas_items && tarea.tareas_items.length > 0) {
    const totalGeneral = tarea.tareas_items.reduce(
      (sum: number, item: any) => sum + ((item.cantidad || 0) * (item.costo_unitario || 0)), 0
    );
    const filasProcesados = tarea.tareas_items.map((item: any) => `
      <tr>
        <td style="padding:9px 12px;border-bottom:1px solid #F3F4F6;color:#374151;font-size:13px;">${item.descripcion || '—'}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #F3F4F6;color:#374151;font-size:13px;text-align:center;">${item.cantidad ?? '—'}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #F3F4F6;color:#374151;font-size:13px;text-align:right;">${formatMoneda(item.costo_unitario)}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #F3F4F6;color:#111827;font-size:13px;font-weight:600;text-align:right;">${formatMoneda((item.cantidad || 0) * (item.costo_unitario || 0))}</td>
      </tr>`).join('');

    seccionItemsProcesados = `
    <tr>
      <td colspan="2" style="padding:0 0 20px;">
        <div style="font-size:10px;font-weight:700;color:#9CA3AF;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;border-bottom:1px solid #F3F4F6;padding-bottom:6px;">ÍTEMS PROCESADOS</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #E5E7EB;border-radius:6px;overflow:hidden;">
          <thead><tr style="background:#F9FAFB;">
            <th style="padding:8px 12px;text-align:left;color:#6B7280;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;">Descripción</th>
            <th style="padding:8px 12px;text-align:center;color:#6B7280;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;">Cant.</th>
            <th style="padding:8px 12px;text-align:right;color:#6B7280;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;">C. Unit.</th>
            <th style="padding:8px 12px;text-align:right;color:#6B7280;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;">Total</th>
          </tr></thead>
          <tbody>${filasProcesados}</tbody>
          <tfoot><tr style="background:#F9FAFB;">
            <td colspan="3" style="padding:10px 12px;text-align:right;font-weight:700;color:#374151;font-size:12px;">Total General:</td>
            <td style="padding:10px 12px;text-align:right;font-weight:700;color:#111827;font-size:14px;">${formatMoneda(totalGeneral)}</td>
          </tr></tfoot>
        </table>
      </td>
    </tr>`;
  }

  const seccionCotizacion = tarea.cotizacion_id ? `
  ${sectionHeader('REFERENCIA')}
  ${fila('Cotización vinculada', `#${tarea.cotizacion_id}`)}
  <tr><td colspan="2" style="height:8px;"></td></tr>` : '';

  let notaSinItems = '';
  if (!tieneTablaSimple && !tieneTablaCompleta && (tarea.tareas_items || []).length === 0) {
    const esArmado = esEPA && solicitudEPA === 'Armado de sillas';
    const nota = esArmado
      ? 'Esta solicitud de armado de sillas no requiere listado de ítems.'
      : esZonaFranca
        ? 'Solicitud de Zona Franca. Los detalles adicionales se gestionarán directamente con el equipo.'
        : esOtros
          ? 'Solicitud general. Los detalles adicionales se gestionarán directamente con el equipo.'
          : '';
    if (nota) {
      notaSinItems = `
      <tr>
        <td colspan="2" style="padding:0 0 20px;">
          <div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:8px;padding:14px 16px;">
            <div style="font-size:12px;color:#92400E;">${nota}</div>
          </div>
        </td>
      </tr>`;
    }
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${tituloPrincipal}</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
  <div style="max-width:640px;margin:32px auto;padding:0 16px 32px;">

    <div style="background:#111827;border-radius:12px 12px 0 0;padding:28px 32px;">
      <div style="font-size:10px;font-weight:700;color:#6B7280;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">SCO — Sistema de Gestión</div>
      <h1 style="margin:0;color:#F9FAFB;font-size:22px;font-weight:700;">${tituloPrincipal}</h1>
      ${tituloSolicitud ? `<p style="margin:6px 0 0;color:#9CA3AF;font-size:13px;">${tituloSolicitud}</p>` : ''}
    </div>

    <div style="background:#1F2937;padding:16px 32px;text-align:center;">
      <div style="font-size:10px;color:#9CA3AF;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">Número de Solicitud</div>
      <div style="display:inline-block;padding:8px 28px;background:#111827;border:2px solid #374151;border-radius:8px;font-size:22px;font-weight:800;color:#F9FAFB;letter-spacing:2px;">
        ${val(tarea.consecutivo, 'TAREA')}
      </div>
    </div>

    <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px;">
      <table style="width:100%;border-collapse:collapse;">
        ${seccionEstado}
        ${seccionResumen}
        ${seccionDatosGenerales}
        ${seccionSolicitante}
        ${seccionAsignacion}
        ${seccionFechas}
        ${seccionDetalleSolicitud}
        ${notaSinItems}
        ${seccionTablaSimple}
        ${seccionTablaCompleta}
        ${seccionItemsProcesados}
        ${seccionCotizacion}
      </table>

      <div style="margin-top:28px;padding-top:20px;border-top:1px solid #F3F4F6;">
        <p style="margin:0;font-size:13px;color:#374151;">Por favor, revisa la solicitud y procede con las acciones necesarias.</p>
        <p style="margin:8px 0 0;font-size:13px;color:#6B7280;">Saludos,<br><strong>Sistema SCO</strong></p>
      </div>
    </div>

    <div style="text-align:center;padding:20px 0 0;">
      <p style="margin:0;font-size:11px;color:#9CA3AF;">Mensaje automático generado por el sistema de gestión SCO.</p>
      <p style="margin:4px 0 0;font-size:11px;color:#D1D5DB;">Por favor no responder directamente a este correo.</p>
    </div>

  </div>
</body>
</html>`;
}

function sectionHeader(label: string): string {
  return `<tr><td colspan="2" style="padding:0 0 6px;"><div style="font-size:10px;font-weight:700;color:#9CA3AF;letter-spacing:1.5px;text-transform:uppercase;border-bottom:1px solid #F3F4F6;padding-bottom:6px;margin-bottom:2px;">${label}</div></td></tr>`;
}

function fila(label: string, value: string): string {
  return `
  <tr>
    <td style="padding:8px 0;color:#9CA3AF;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;width:160px;vertical-align:top;white-space:nowrap;">${label}</td>
    <td style="padding:8px 0 8px 12px;color:#111827;font-size:13px;font-weight:500;vertical-align:top;">${value}</td>
  </tr>`;
}
