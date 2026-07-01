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
  // Tarea
  tarea_id?: number | string;
  tipo: 'creacion' | 'cambio_estado' | 'comentario' | 'alerta_inventario';
  estado_anterior?: string;
  estado_nuevo?: string;

  // Comentario
  comentario?: string;
  comentario_autor?: string;
  comentario_autor_email?: string;

  // Alerta inventario
  articulo_id?: number;
  alerta_tipo?: string;
  articulo_codigo?: string;
  articulo_descripcion?: string;
  disponible?: number;
  min_qty?: number;
  reorder_point?: number;
  tienda_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Metodo no permitido' }), {
        status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: NotificacionData = await req.json();
    const { tipo } = body;

    if (!tipo) {
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

    console.log('[NOTIF] === INICIO === tipo:', tipo);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ─── RUTEO POR TIPO ──────────────────────────────
    if (tipo === 'alerta_inventario') {
      return await handleAlertaInventario(supabase, body);
    }

    if (tipo === 'comentario') {
      return await handleComentario(supabase, body);
    }

    // creacion / cambio_estado
    return await handleTarea(supabase, body);

  } catch (error: any) {
    console.error('[ERROR] General:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ═══════════════════════════════════════════════════════
// HANDLER: ALERTA DE INVENTARIO
// ═══════════════════════════════════════════════════════

async function handleAlertaInventario(supabase: any, body: NotificacionData) {
  const { alerta_tipo, articulo_codigo, articulo_descripcion, disponible, min_qty, reorder_point, tienda_id } = body;

  console.log('[INV] Alerta:', alerta_tipo, '| Artículo:', articulo_codigo);

  // Buscar destinatarios: admins de la tienda + usuarios con permiso inventario
  const destinatarios: string[] = [];

  // Admins del sistema
  const { data: admins } = await supabase
    .from('usuarios')
    .select('correo')
    .eq('rol', 'Admin')
    .eq('activo', true);

  (admins || []).forEach((a: any) => {
    if (a.correo && !destinatarios.includes(a.correo)) {
      destinatarios.push(a.correo);
    }
  });

  // Si hay tienda, buscar usuarios de esa tienda
  if (tienda_id) {
    const { data: usuariosTienda } = await supabase
      .from('usuario_tiendas')
      .select('usuario_id')
      .eq('tienda_id', tienda_id)
      .eq('activo', true);

    if (usuariosTienda && usuariosTienda.length > 0) {
      const ids = usuariosTienda.map((ut: any) => ut.usuario_id);
      const { data: users } = await supabase
        .from('usuarios')
        .select('correo')
        .in('id', ids)
        .eq('activo', true);

      (users || []).forEach((u: any) => {
        if (u.correo && !destinatarios.includes(u.correo)) {
          destinatarios.push(u.correo);
        }
      });
    }
  }

  console.log('[INV] Destinatarios:', destinatarios);

  if (destinatarios.length === 0) {
    return new Response(JSON.stringify({ success: true, message: 'Sin destinatarios', destinatarios: [] }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { titulo, color } = getInfoAlerta(alerta_tipo || '');
  const asunto = `${titulo}: ${articulo_codigo || 'N/A'} — ${articulo_descripcion || 'Artículo'}`;

  const html = generarHtmlAlertaInventario({
    alerta_tipo: alerta_tipo || '',
    titulo,
    color,
    articulo_codigo: articulo_codigo || 'N/A',
    articulo_descripcion: articulo_descripcion || '',
    disponible: disponible ?? 0,
    min_qty: min_qty ?? 0,
    reorder_point: reorder_point ?? 0,
  });

  return await enviarCorreo(destinatarios, asunto, html);
}

function getInfoAlerta(tipo: string): { titulo: string; color: string } {
  switch (tipo) {
    case 'stockout':   return { titulo: 'STOCK AGOTADO', color: '#EF4444' };
    case 'below_min':  return { titulo: 'STOCK BAJO MÍNIMO', color: '#F97316' };
    case 'below_rop':  return { titulo: 'PUNTO DE REORDEN', color: '#EAB308' };
    default:           return { titulo: 'ALERTA DE INVENTARIO', color: '#6B7280' };
  }
}

function generarHtmlAlertaInventario(data: any): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
<div style="max-width:560px;margin:32px auto;padding:0 16px 32px;">

<div style="background:${data.color};border-radius:12px 12px 0 0;padding:24px 28px;">
  <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">SCO — Alerta de Inventario</div>
  <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">${data.titulo}</h1>
</div>

<div style="background:#fff;padding:28px;border-radius:0 0 12px 12px;">
  <div style="background:#F9FAFB;border-radius:8px;padding:20px;margin-bottom:20px;">
    <h2 style="margin:0 0 4px;font-size:18px;color:#111827;font-weight:700;">${data.articulo_codigo}</h2>
    <p style="margin:0;font-size:14px;color:#6B7280;">${data.articulo_descripcion}</p>
  </div>

  <table style="width:100%;border-collapse:collapse;">
    <tr>
      <td style="padding:12px 0;color:#9CA3AF;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;width:180px;">Stock disponible</td>
      <td style="padding:12px 0 12px 12px;color:#EF4444;font-size:22px;font-weight:800;">${data.disponible}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#9CA3AF;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Nivel mínimo</td>
      <td style="padding:8px 0 8px 12px;color:#111827;font-size:14px;font-weight:600;">${data.min_qty}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#9CA3AF;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Punto de reorden</td>
      <td style="padding:8px 0 8px 12px;color:#111827;font-size:14px;font-weight:600;">${data.reorder_point}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#9CA3AF;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Déficit</td>
      <td style="padding:8px 0 8px 12px;color:#EF4444;font-size:14px;font-weight:700;">${Math.max(0, data.min_qty - data.disponible)} unidades</td>
    </tr>
  </table>

  <div style="margin-top:24px;padding:16px;background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;">
    <p style="margin:0;font-size:13px;color:#991B1B;">
      <strong>Acción requerida:</strong> Este artículo necesita reabastecimiento urgente. 
      Por favor, revisá el módulo de Mantenimiento para generar una orden de compra.
    </p>
  </div>

  <div style="margin-top:24px;padding-top:16px;border-top:1px solid #F3F4F6;">
    <p style="margin:0;font-size:12px;color:#6B7280;">Saludos,<br><strong>Sistema SCO</strong></p>
  </div>
</div>

<div style="text-align:center;padding:16px 0 0;">
  <p style="margin:0;font-size:10px;color:#9CA3AF;">Mensaje automático del sistema de gestión SCO. No responder.</p>
</div>

</div></body></html>`;
}

// ═══════════════════════════════════════════════════════
// HANDLER: COMENTARIO
// ═══════════════════════════════════════════════════════

async function handleComentario(supabase: any, body: NotificacionData) {
  const { tarea_id, comentario, comentario_autor, comentario_autor_email } = body;

  if (!tarea_id) {
    return new Response(JSON.stringify({ error: 'tarea_id requerido para comentario' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log('[COM] tarea_id:', tarea_id, '| autor:', comentario_autor);

  // Obtener la tarea
  const { data: tarea } = await supabase
    .from('tareas')
    .select('consecutivo, descripcion_breve, tienda_id, email_solicitante, datos_formulario')
    .eq('id', tarea_id)
    .maybeSingle();

  if (!tarea) {
    return new Response(JSON.stringify({ error: 'Tarea no encontrada' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const destinatarios: string[] = [];

  // Solicitante de la tarea
  if (tarea.email_solicitante && tarea.email_solicitante !== comentario_autor_email) {
    destinatarios.push(tarea.email_solicitante);
  }

  // Encargados de la tienda
  const { data: encargados } = await supabase
    .from('tareas_encargados')
    .select('usuario_id')
    .eq('tienda_id', tarea.tienda_id);

  if (encargados && encargados.length > 0) {
    const ids = encargados.map((e: any) => e.usuario_id).filter(Boolean);
    if (ids.length > 0) {
      const { data: users } = await supabase
        .from('usuarios')
        .select('correo')
        .in('id', ids)
        .neq('correo', comentario_autor_email || '');

      (users || []).forEach((u: any) => {
        if (u.correo && !destinatarios.includes(u.correo)) {
          destinatarios.push(u.correo);
        }
      });
    }
  }

  // Miembros del cluster
  const df = tarea.datos_formulario as any;
  const cliente = df?.cliente;
  if (cliente) {
    const { data: clusters } = await supabase
      .from('clusters')
      .select('id')
      .eq('cliente', cliente)
      .eq('activo', true);

    if (clusters && clusters.length > 0) {
      const clusterIds = clusters.map((c: any) => c.id);
      const { data: miembros } = await supabase
        .from('cluster_usuarios')
        .select('usuario_id')
        .in('cluster_id', clusterIds);

      if (miembros && miembros.length > 0) {
        const memberIds = miembros.map((m: any) => m.usuario_id);
        const { data: memberUsers } = await supabase
          .from('usuarios')
          .select('correo')
          .in('id', memberIds)
          .neq('correo', comentario_autor_email || '');

        (memberUsers || []).forEach((u: any) => {
          if (u.correo && !destinatarios.includes(u.correo)) {
            destinatarios.push(u.correo);
          }
        });
      }
    }
  }

  console.log('[COM] Destinatarios:', destinatarios);

  if (destinatarios.length === 0) {
    return new Response(JSON.stringify({ success: true, message: 'Sin destinatarios adicionales' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const consecutivo = tarea.consecutivo || 'TAREA';
  const autor = comentario_autor || 'Usuario';
  const snippet = (comentario || '').length > 120
    ? comentario!.substring(0, 120) + '...'
    : (comentario || '');

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
<div style="max-width:560px;margin:32px auto;padding:0 16px 32px;">

<div style="background:#6366F1;border-radius:12px 12px 0 0;padding:24px 28px;">
  <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">SCO — Monitor</div>
  <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">Nuevo comentario</h1>
</div>

<div style="background:#fff;padding:28px;border-radius:0 0 12px 12px;">
  <div style="background:#F9FAFB;border-radius:8px;padding:16px;margin-bottom:20px;">
    <div style="font-size:10px;color:#9CA3AF;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;">Tarea</div>
    <div style="font-size:16px;font-weight:700;color:#111827;">${consecutivo}</div>
    <div style="font-size:13px;color:#6B7280;margin-top:2px;">${tarea.descripcion_breve || ''}</div>
  </div>

  <div style="border-left:3px solid #6366F1;padding:12px 16px;margin-bottom:16px;background:#F5F3FF;border-radius:0 8px 8px 0;">
    <div style="font-size:11px;color:#6366F1;font-weight:700;margin-bottom:4px;">${autor} escribió:</div>
    <div style="font-size:14px;color:#374151;line-height:1.5;">${snippet}</div>
  </div>

  <div style="margin-top:20px;padding-top:16px;border-top:1px solid #F3F4F6;">
    <p style="margin:0;font-size:12px;color:#6B7280;">Saludos,<br><strong>Sistema SCO</strong></p>
  </div>
</div>

<div style="text-align:center;padding:16px 0 0;">
  <p style="margin:0;font-size:10px;color:#9CA3AF;">Mensaje automático del sistema SCO. No responder.</p>
</div>

</div></body></html>`;

  const asunto = `Nuevo comentario en ${consecutivo} — ${autor}`;

  return await enviarCorreo(destinatarios, asunto, html);
}

// ═══════════════════════════════════════════════════════
// HANDLER: TAREA (creacion / cambio_estado)
// ═══════════════════════════════════════════════════════

async function handleTarea(supabase: any, body: NotificacionData) {
  const { tarea_id, tipo, estado_anterior, estado_nuevo } = body;

  if (!tarea_id) {
    return new Response(JSON.stringify({ error: 'tarea_id requerido' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log('[TAREA] tarea_id:', tarea_id, '| tipo:', tipo);

  const { data: tarea, error: tareaError } = await supabase
    .from('tareas')
    .select(`*, tareas_items(*), tienda:tiendas(id, nombre)`)
    .eq('id', tarea_id)
    .maybeSingle();

  if (tareaError || !tarea) {
    console.error('[DB] Error consultando tarea:', tareaError);
    return new Response(JSON.stringify({ error: 'Error consultando tarea', detalle: tareaError?.message }), {
      status: tareaError ? 500 : 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

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

  console.log('[TAREA] Destinatarios:', destinatarios);

  if (destinatarios.length === 0) {
    return new Response(JSON.stringify({ success: true, message: 'Sin destinatarios' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const asunto = tipo === 'creacion'
    ? buildAsunto(tarea)
    : `Cambio de Estado - Tarea ${tarea.consecutivo}`;

  const html = generarHtmlCorreo(tarea, tipo, estado_anterior, estado_nuevo);

  return await enviarCorreo(destinatarios, asunto, html);
}

// ═══════════════════════════════════════════════════════
// ENVÍO DE CORREO COMÚN
// ═══════════════════════════════════════════════════════

async function enviarCorreo(destinatarios: string[], asunto: string, html: string) {
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  try {
    await transporter.verify();
    console.log('[SMTP] ✅ Conexión verificada');
  } catch (verifyErr: any) {
    const msg = verifyErr?.message || String(verifyErr);
    console.error('[SMTP] ❌ Verify falló:', msg);
    return new Response(JSON.stringify({ success: false, error: `SMTP verify failed: ${msg}` }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const mailOptions = {
    from: SMTP_FROM_EMAIL,
    to: destinatarios.join(', '),
    replyTo: SMTP_REPLY_TO || undefined,
    subject: asunto,
    html,
    text: asunto,
  };

  console.log('[MAIL] Enviando a:', mailOptions.to);
  const info = await transporter.sendMail(mailOptions);

  console.log('[MAIL] messageId:', info.messageId, '| accepted:', JSON.stringify(info.accepted ?? []));

  return new Response(JSON.stringify({
    success: true,
    message: 'Correo enviado',
    destinatarios,
    messageId: info.messageId,
    accepted: info.accepted ?? [],
    rejected: info.rejected ?? [],
  }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ═══════════════════════════════════════════════════════
// HELPERS DE TAREA (mantenidos del original)
// ═══════════════════════════════════════════════════════

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

function formatFecha(f: string | null | undefined): string {
  if (!f) return 'No especificado';
  try {
    return new Date(f).toLocaleDateString('es-CR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return f; }
}

function formatFechaSolo(f: string | null | undefined): string {
  if (!f) return 'No especificado';
  try {
    return new Date(f).toLocaleDateString('es-CR', {
      year: 'numeric', month: '2-digit', day: '2-digit'
    });
  } catch { return f; }
}

function formatMoneda(v: number | null | undefined): string {
  if (!v && v !== 0) return '—';
  return new Intl.NumberFormat('es-CR', {
    style: 'currency', currency: 'CRC', minimumFractionDigits: 0
  }).format(v);
}

function val(v: string | null | undefined, fallback = 'No especificado'): string {
  return (v && String(v).trim()) ? String(v).trim() : fallback;
}

const estadoColores: Record<string, string> = {
  'En Cola': '#6B7280',
  'En Proceso': '#F59E0B',
  'Produciendo': '#3B82F6',
  'Esperando suministros': '#EF4444',
  'Terminado': '#10B981',
  'Finalizado': '#059669',
};

function colorEstado(e: string) { return estadoColores[e] || '#6B7280'; }

function generarHtmlCorreo(
  tarea: any, tipo: string, estado_anterior?: string, estado_nuevo?: string
): string {
  const df = tarea.datos_formulario || {};
  const departamento = df.departamento_solicitante || null;
  const cliente = df.cliente || null;
  const solicitudEPA = df.solicitud_epa || null;
  const solicitudCOFERSA = df.solicitud_cofersa || null;
  const tipoTrabajo = df.tipo_trabajo || null;
  const esServicioCliente = departamento === 'Servicio al Cliente';
  const esEPA = esServicioCliente && cliente === 'EPA';
  const esCOFERSA = esServicioCliente && cliente === 'COFERSA';
  const nombreTienda = tarea.tienda?.nombre || null;
  const estadoMostrar = estado_nuevo || tarea.estado || 'En Cola';
  const tituloPrincipal = tipo === 'creacion' ? 'Nueva Solicitud de Trabajo' : 'Actualización de Tarea';

  let tituloSolicitud = '';
  if (esEPA && solicitudEPA) tituloSolicitud = `EPA — ${solicitudEPA}`;
  else if (esCOFERSA && solicitudCOFERSA) {
    const tipoLabel = tipoTrabajo ? ` / ${tipoTrabajo}` : '';
    tituloSolicitud = `COFERSA — ${solicitudCOFERSA}${tipoLabel}`;
  } else if (esServicioCliente && cliente) tituloSolicitud = `Servicio al Cliente — ${cliente}`;
  else if (departamento === 'Zona Franca') tituloSolicitud = 'Zona Franca';
  else if (departamento === 'Otros') tituloSolicitud = 'Solicitud General';

  let seccionEstado = '';
  if (tipo === 'cambio_estado' && estado_anterior && estado_nuevo) {
    seccionEstado = `<tr><td colspan="2" style="padding:0 0 24px;"><div style="background:#F9FAFB;border-radius:8px;padding:16px;"><div style="font-size:10px;font-weight:700;color:#9CA3AF;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px;">CAMBIO DE ESTADO</div><div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;"><span style="padding:5px 16px;background:${colorEstado(estado_anterior)};color:#fff;border-radius:20px;font-size:12px;font-weight:600;">${estado_anterior}</span><span style="font-size:18px;color:#D1D5DB;">&#8594;</span><span style="padding:5px 16px;background:${colorEstado(estado_nuevo)};color:#fff;border-radius:20px;font-size:12px;font-weight:600;">${estado_nuevo}</span></div></div></td></tr>`;
  } else {
    seccionEstado = `<tr><td colspan="2" style="padding:0 0 24px;"><div style="background:#F9FAFB;border-radius:8px;padding:14px 16px;"><div style="font-size:10px;font-weight:700;color:#9CA3AF;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">ESTADO</div><span style="padding:5px 16px;background:${colorEstado(estadoMostrar)};color:#fff;border-radius:20px;font-size:12px;font-weight:600;">${estadoMostrar}</span></div></td></tr>`;
  }

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${tituloPrincipal}</title></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
<div style="max-width:640px;margin:32px auto;padding:0 16px 32px;">
<div style="background:#111827;border-radius:12px 12px 0 0;padding:28px 32px;"><div style="font-size:10px;font-weight:700;color:#6B7280;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">SCO — Sistema de Gestión</div><h1 style="margin:0;color:#F9FAFB;font-size:22px;font-weight:700;">${tituloPrincipal}</h1>${tituloSolicitud ? `<p style="margin:6px 0 0;color:#9CA3AF;font-size:13px;">${tituloSolicitud}</p>` : ''}</div>
<div style="background:#1F2937;padding:16px 32px;text-align:center;"><div style="font-size:10px;color:#9CA3AF;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">Número de Solicitud</div><div style="display:inline-block;padding:8px 28px;background:#111827;border:2px solid #374151;border-radius:8px;font-size:22px;font-weight:800;color:#F9FAFB;letter-spacing:2px;">${val(tarea.consecutivo, 'TAREA')}</div></div>
<div style="background:#fff;padding:32px;border-radius:0 0 12px 12px;"><table style="width:100%;border-collapse:collapse;">
${seccionEstado}
<tr><td colspan="2" style="padding:0 0 20px;"><div style="font-size:10px;font-weight:700;color:#9CA3AF;letter-spacing:1.5px;text-transform:uppercase;border-bottom:1px solid #F3F4F6;padding-bottom:6px;">DATOS GENERALES</div></td></tr>
${tarea.descripcion_breve ? fila('Descripción', val(tarea.descripcion_breve)) : ''}
${fila('Estado', `<span style="padding:3px 12px;background:${colorEstado(estadoMostrar)};color:#fff;border-radius:20px;font-size:11px;font-weight:600;">${estadoMostrar}</span>`)}
${tarea.cantidad_unidades != null ? fila('Cantidad total', String(tarea.cantidad_unidades)) : ''}
<tr><td colspan="2" style="height:12px;"></td></tr>
${fila('Correo solicitante', val(tarea.email_solicitante))}
${nombreTienda ? fila('Tienda', nombreTienda) : ''}
<tr><td colspan="2" style="height:12px;"></td></tr>
${fila('Fecha de creación', formatFecha(tarea.created_at))}
${tarea.fecha_estimada_entrega ? fila('Fecha límite', formatFechaSolo(tarea.fecha_estimada_entrega)) : ''}
</table>
<div style="margin-top:28px;padding-top:20px;border-top:1px solid #F3F4F6;"><p style="margin:0;font-size:13px;color:#374151;">Por favor, revisá la solicitud y procedé con las acciones necesarias.</p><p style="margin:8px 0 0;font-size:13px;color:#6B7280;">Saludos,<br><strong>Sistema SCO</strong></p></div></div>
<div style="text-align:center;padding:20px 0 0;"><p style="margin:0;font-size:11px;color:#9CA3AF;">Mensaje automático del sistema SCO. No responder.</p></div></div></body></html>`;
}

function fila(label: string, value: string): string {
  return `<tr><td style="padding:8px 0;color:#9CA3AF;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;width:160px;vertical-align:top;white-space:nowrap;">${label}</td><td style="padding:8px 0 8px 12px;color:#111827;font-size:13px;font-weight:500;vertical-align:top;">${value}</td></tr>`;
}
