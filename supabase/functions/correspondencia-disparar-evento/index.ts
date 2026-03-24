import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EventoPayload {
  tipo_evento: string;
  tienda_id: string;
  entity_data: Record<string, unknown>;
}

interface Regla {
  id: number;
  nombre: string;
  plantilla_id: number | null;
  destinatarios_config: { tipo: string; emails?: string[]; campo_email?: string };
  cc: string[];
  cco: string[];
  condiciones: Record<string, unknown>;
  tienda_id: string | null;
  plantilla?: {
    id: number;
    asunto: string;
    cuerpo_html: string;
    variables: { nombre: string; descripcion: string }[];
  };
}

// ════════════════════════════════════════════════════════════════════════════
// UTILIDADES GENERALES
// ════════════════════════════════════════════════════════════════════════════

function reemplazarVariables(texto: string, datos: Record<string, string>): string {
  return texto.replace(/\{\{(\w+)\}\}/g, (_match: string, key: string) => {
    return Object.prototype.hasOwnProperty.call(datos, key) ? datos[key] : `{{${key}}}`;
  });
}

function formatFechaCR(f: string | null | undefined): string {
  if (!f) return "";
  try {
    return new Date(f).toLocaleDateString("es-CR", { year: "numeric", month: "2-digit", day: "2-digit" });
  } catch { return String(f); }
}

function formatFechaCRCompleta(f: string | null | undefined): string {
  if (!f) return "";
  try {
    return new Date(f).toLocaleDateString("es-CR", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return String(f); }
}

function val(v: unknown, fallback = "No especificado"): string {
  if (v === null || v === undefined || String(v).trim() === "") return fallback;
  return String(v).trim();
}

// ════════════════════════════════════════════════════════════════════════════
// ESTADOS — COLORES Y BADGES
// ════════════════════════════════════════════════════════════════════════════

const ESTADO_COLORES: Record<string, string> = {
  "En Cola":                "#6B7280",
  "En Proceso":             "#F59E0B",
  "Produciendo":            "#3B82F6",
  "Esperando suministros":  "#EF4444",
  "Terminado":              "#10B981",
  "Finalizado":             "#059669",
};

function colorEstado(estado: string): string {
  return ESTADO_COLORES[estado] || "#6B7280";
}

function badgeEstado(estado: string): string {
  const color = colorEstado(estado);
  return `<span style="display:inline-block;padding:5px 16px;background:${color};color:#fff;border-radius:20px;font-size:13px;font-weight:600;">${estado}</span>`;
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS CONTEXT-AWARE PARA TAREAS (idéntica lógica al legacy)
// ════════════════════════════════════════════════════════════════════════════

function usaTablaSimple(df: Record<string, unknown>): boolean {
  const dep = df.departamento_solicitante;
  const cli = df.cliente;
  const epa = df.solicitud_epa;
  if (dep === "Servicio al Cliente" && cli === "EPA") {
    return ["Códigos de Barra", "Registros sanitarios", "Traducción", "Usos Delta Plus"].includes(String(epa ?? ""));
  }
  if (dep === "Servicio al Cliente" && cli === "COFERSA") return true;
  return false;
}

function usaTablaCompleta(df: Record<string, unknown>): boolean {
  const dep = df.departamento_solicitante;
  const cli = df.cliente;
  const epa = df.solicitud_epa;
  if (dep === "Servicio al Cliente" && cli === "EPA") {
    return ["Licencias / contenedores / Pallets", "Suministros"].includes(String(epa ?? ""));
  }
  return false;
}

function labelTablaSimple(df: Record<string, unknown>): string {
  const cli = df.cliente;
  const epa = df.solicitud_epa;
  if (cli === "EPA") {
    if (epa === "Códigos de Barra")    return "CÓDIGOS DE BARRA Y CANTIDADES";
    if (epa === "Registros sanitarios") return "ÍTEMS CON REGISTROS SANITARIOS";
    if (epa === "Traducción")           return "ÍTEMS A TRADUCIR";
    if (epa === "Usos Delta Plus")      return "ÍTEMS USOS DELTA PLUS";
    return "CÓDIGOS Y CANTIDADES";
  }
  if (cli === "COFERSA") return "CÓDIGOS Y CANTIDADES A ETIQUETAR";
  return "CÓDIGOS Y CANTIDADES";
}

function labelTablaCompleta(df: Record<string, unknown>): string {
  const epa = df.solicitud_epa;
  if (epa === "Licencias / contenedores / Pallets") return "DETALLE DE LICENCIAS / CONTENEDORES / PALLETS";
  if (epa === "Suministros")                        return "DETALLE DE SUMINISTROS";
  return "DESCRIPCIÓN Y CANTIDADES";
}

function buildAsuntoTarea(ed: Record<string, unknown>): string {
  const dep    = val(ed.departamento_solicitante, "");
  const cli    = val(ed.cliente, "");
  const epa    = val(ed.solicitud_epa, "");
  const cof    = val(ed.solicitud_cofersa, "");
  const tipo   = val(ed.tipo_trabajo, "");
  const consec = val(ed.consecutivo, "TAREA");

  if (dep === "Servicio al Cliente") {
    if (cli === "EPA" && epa) return `Nueva Solicitud EPA — ${epa} | ${consec}`;
    if (cli === "COFERSA" && cof) {
      const sufijo = tipo ? ` / ${tipo}` : "";
      return `Nueva Solicitud COFERSA — ${cof}${sufijo} | ${consec}`;
    }
    if (cli) return `Nueva Solicitud ${cli} | ${consec}`;
    return `Nueva Solicitud — Servicio al Cliente | ${consec}`;
  }
  if (dep) return `Nueva Solicitud — ${dep} | ${consec}`;
  return `Nueva Tarea Registrada | ${consec}`;
}

// ─── Bloque: badge + título del tipo de solicitud ───────────────────────────
function buildBloqueResumenSolicitud(ed: Record<string, unknown>): string {
  const dep  = val(ed.departamento_solicitante, "");
  const cli  = val(ed.cliente, "");
  const epa  = val(ed.solicitud_epa, "");
  const cof  = val(ed.solicitud_cofersa, "");
  const tipo = val(ed.tipo_trabajo, "");

  let titulo = "";
  let badges = "";

  if (dep === "Servicio al Cliente" && cli === "EPA" && epa) {
    titulo = `EPA — ${epa}`;
    badges = `<span style="display:inline-block;padding:4px 14px;background:#10B981;color:#fff;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:0.5px;margin-right:6px;">EPA</span>`
           + `<span style="display:inline-block;padding:4px 14px;background:#F3F4F6;color:#374151;border-radius:20px;font-size:11px;font-weight:600;">${epa}</span>`;
  } else if (dep === "Servicio al Cliente" && cli === "COFERSA" && cof) {
    const tipoLabel = tipo ? ` / ${tipo}` : "";
    titulo = `COFERSA — ${cof}${tipoLabel}`;
    badges = `<span style="display:inline-block;padding:4px 14px;background:#F59E0B;color:#fff;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:0.5px;margin-right:6px;">COFERSA</span>`
           + `<span style="display:inline-block;padding:4px 14px;background:#F3F4F6;color:#374151;border-radius:20px;font-size:11px;font-weight:600;">${cof}</span>`
           + (tipo ? `<span style="display:inline-block;padding:4px 14px;background:#FEF3C7;color:#92400E;border-radius:20px;font-size:11px;font-weight:600;margin-left:4px;">${tipo}</span>` : "");
  } else if (dep === "Zona Franca") {
    titulo = "Zona Franca";
    badges = `<span style="display:inline-block;padding:4px 14px;background:#6366F1;color:#fff;border-radius:20px;font-size:11px;font-weight:700;">ZONA FRANCA</span>`;
  } else if (dep === "Otros") {
    titulo = "Solicitud General";
    badges = `<span style="display:inline-block;padding:4px 14px;background:#6B7280;color:#fff;border-radius:20px;font-size:11px;font-weight:700;">GENERAL</span>`;
  } else if (dep === "Servicio al Cliente" && cli) {
    titulo = `Servicio al Cliente — ${cli}`;
    badges = `<span style="display:inline-block;padding:4px 14px;background:#3B82F6;color:#fff;border-radius:20px;font-size:11px;font-weight:700;">${cli}</span>`;
  } else if (dep) {
    titulo = dep;
  }

  if (!titulo) return "";

  return `<div style="background:#111827;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
  <div style="font-size:10px;font-weight:700;color:#6B7280;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">TIPO DE SOLICITUD</div>
  <div style="font-size:15px;font-weight:700;color:#F9FAFB;margin-bottom:8px;">${titulo}</div>
  ${badges ? `<div style="margin-top:6px;">${badges}</div>` : ""}
</div>`;
}

// ─── Filas HTML de detalle del formulario ────────────────────────────────────
function buildBloqueDetalleSolicitud(ed: Record<string, unknown>): string {
  const dep  = val(ed.departamento_solicitante, "");
  const cli  = val(ed.cliente, "");
  const epa  = val(ed.solicitud_epa, "");
  const cof  = val(ed.solicitud_cofersa, "");
  const tipo = val(ed.tipo_trabajo, "");

  const filaHtml = (label: string, value: string) =>
    `<tr>
      <td style="padding:8px 0;color:#9CA3AF;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;width:180px;vertical-align:top;white-space:nowrap;">${label}</td>
      <td style="padding:8px 0 8px 12px;color:#111827;font-size:13px;font-weight:500;vertical-align:top;">${value}</td>
    </tr>`;

  let filas = "";
  if (dep) filas += filaHtml("Departamento", dep);
  if (dep === "Servicio al Cliente" && cli) filas += filaHtml("Cliente", cli);
  if (epa && cli === "EPA") filas += filaHtml("Solicitud EPA", epa);
  if (cof && cli === "COFERSA") filas += filaHtml("Solicitud COFERSA", cof);
  if (tipo && cli === "COFERSA") filas += filaHtml("Tipo de trabajo", tipo);

  if (!filas) return "";

  return `<div style="margin-bottom:20px;">
  <div style="font-size:10px;font-weight:700;color:#9CA3AF;letter-spacing:1.5px;text-transform:uppercase;border-bottom:1px solid #F3F4F6;padding-bottom:6px;margin-bottom:4px;">TIPO DE SOLICITUD</div>
  <table style="width:100%;border-collapse:collapse;">${filas}</table>
</div>`;
}

// ─── Tabla HTML de ítems context-aware ──────────────────────────────────────
function buildBloqueTablaItems(ed: Record<string, unknown>): string {
  const itemsSimples   = Array.isArray(ed.items_tabla_simple)   ? ed.items_tabla_simple   as any[] : [];
  const itemsCompletos = Array.isArray(ed.items_tabla_completa) ? ed.items_tabla_completa as any[] : [];

  const tieneSimple   = usaTablaSimple(ed)   && itemsSimples.length > 0;
  const tieneCompleta = usaTablaCompleta(ed) && itemsCompletos.length > 0;

  if (!tieneSimple && !tieneCompleta) return "";

  if (tieneSimple) {
    const etiqueta  = labelTablaSimple(ed);
    const totalCant = itemsSimples.reduce((s: number, i: any) => s + (Number(i.cantidad) || 0), 0);
    const filas = itemsSimples.map((item: any) => `
      <tr>
        <td style="padding:9px 12px;border-bottom:1px solid #F3F4F6;color:#374151;font-size:13px;font-family:monospace;">${val(item.codigo, "—")}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #F3F4F6;color:#111827;font-size:13px;font-weight:600;text-align:right;">${item.cantidad != null ? item.cantidad : "—"}</td>
      </tr>`).join("");

    return `<div style="margin-bottom:20px;">
  <div style="font-size:10px;font-weight:700;color:#9CA3AF;letter-spacing:1.5px;text-transform:uppercase;border-bottom:1px solid #F3F4F6;padding-bottom:6px;margin-bottom:8px;">${etiqueta}</div>
  <table style="width:100%;border-collapse:collapse;border:1px solid #E5E7EB;border-radius:6px;overflow:hidden;">
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
  <p style="margin:6px 0 0;font-size:11px;color:#9CA3AF;">${itemsSimples.length} ítem${itemsSimples.length !== 1 ? "s" : ""}</p>
</div>`;
  }

  const etiqueta  = labelTablaCompleta(ed);
  const totalCant = itemsCompletos.reduce((s: number, i: any) => s + (Number(i.cantidad) || 0), 0);
  const filas = itemsCompletos.map((item: any) => `
    <tr>
      <td style="padding:9px 12px;border-bottom:1px solid #F3F4F6;color:#374151;font-size:13px;">${val(item.descripcion, "—")}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #F3F4F6;color:#111827;font-size:13px;font-weight:600;text-align:center;">${item.cantidad != null ? item.cantidad : "—"}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #F3F4F6;color:#6B7280;font-size:12px;">${val(item.motivo, "—")}</td>
    </tr>`).join("");

  return `<div style="margin-bottom:20px;">
  <div style="font-size:10px;font-weight:700;color:#9CA3AF;letter-spacing:1.5px;text-transform:uppercase;border-bottom:1px solid #F3F4F6;padding-bottom:6px;margin-bottom:8px;">${etiqueta}</div>
  <table style="width:100%;border-collapse:collapse;border:1px solid #E5E7EB;border-radius:6px;overflow:hidden;">
    <thead><tr style="background:#F9FAFB;">
      <th style="padding:8px 12px;text-align:left;color:#6B7280;font-size:10px;text-transform:uppercase;font-weight:700;">Descripción</th>
      <th style="padding:8px 12px;text-align:center;color:#6B7280;font-size:10px;text-transform:uppercase;font-weight:700;">Cantidad</th>
      <th style="padding:8px 12px;text-align:left;color:#6B7280;font-size:10px;text-transform:uppercase;font-weight:700;">Motivo</th>
    </tr></thead>
    <tbody>${filas}</tbody>
    <tfoot><tr style="background:#F9FAFB;">
      <td style="padding:8px 12px;text-align:right;font-weight:700;color:#374151;font-size:12px;">Total:</td>
      <td style="padding:8px 12px;text-align:center;font-weight:700;color:#111827;font-size:13px;">${totalCant}</td>
      <td></td>
    </tr></tfoot>
  </table>
  <p style="margin:6px 0 0;font-size:11px;color:#9CA3AF;">${itemsCompletos.length} ítem${itemsCompletos.length !== 1 ? "s" : ""}</p>
</div>`;
}

// ─── Nota contextual para casos sin tabla ────────────────────────────────────
function buildBloqueNotaContextual(ed: Record<string, unknown>): string {
  const dep  = val(ed.departamento_solicitante, "");
  const cli  = val(ed.cliente, "");
  const epa  = val(ed.solicitud_epa, "");
  const itemsSimples   = Array.isArray(ed.items_tabla_simple)   ? ed.items_tabla_simple   : [];
  const itemsCompletos = Array.isArray(ed.items_tabla_completa) ? ed.items_tabla_completa : [];

  const tieneTabla = (usaTablaSimple(ed) && itemsSimples.length > 0)
                  || (usaTablaCompleta(ed) && itemsCompletos.length > 0);
  if (tieneTabla) return "";

  let nota = "";
  if (dep === "Servicio al Cliente" && cli === "EPA" && epa === "Armado de sillas") {
    nota = "Esta solicitud de armado de sillas no requiere listado de ítems.";
  } else if (dep === "Zona Franca") {
    nota = "Solicitud de Zona Franca. Los detalles adicionales se gestionarán directamente con el equipo.";
  } else if (dep === "Otros") {
    nota = "Solicitud general. Los detalles adicionales se gestionarán directamente con el equipo.";
  }

  if (!nota) return "";

  return `<div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:8px;padding:14px 16px;margin-bottom:20px;">
  <div style="font-size:12px;color:#92400E;">${nota}</div>
</div>`;
}

// ─── Bloque: transición de estado (antes → después) con badges de colores ───
function buildBloqueCambioEstado(
  estadoAnterior: string,
  estadoNuevo: string,
  fechaCambio?: string
): string {
  const fechaStr = fechaCambio ? formatFechaCRCompleta(fechaCambio) : new Date().toLocaleDateString("es-CR");

  return `<div style="background:#F9FAFB;border-radius:8px;padding:20px;margin-bottom:20px;">
  <div style="font-size:10px;font-weight:700;color:#9CA3AF;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:14px;">ACTUALIZACIÓN DE ESTADO</div>
  <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px;">
    ${badgeEstado(estadoAnterior)}
    <span style="font-size:20px;color:#D1D5DB;font-weight:300;">&#8594;</span>
    ${badgeEstado(estadoNuevo)}
  </div>
  <div style="font-size:11px;color:#9CA3AF;">
    Actualizado el <strong style="color:#374151;">${fechaStr}</strong>
  </div>
</div>`;
}

// ════════════════════════════════════════════════════════════════════════════
// CONSTRUCTOR DE VARIABLES PARA PLANTILLAS
// ════════════════════════════════════════════════════════════════════════════

function buildVariablesData(
  tipoEvento: string,
  entityData: Record<string, unknown>
): Record<string, string> {
  const vars: Record<string, string> = {
    fecha_hoy: new Date().toLocaleDateString("es-CR"),
    hora_actual: new Date().toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" }),
    nombre_empresa: "OLogistics S.A.",
  };

  if (tipoEvento.startsWith("tarea.")) {
    // ─── Campos directos de la tarea ────────────────────────────────────────
    if (entityData.consecutivo)        vars.numero_tarea      = String(entityData.consecutivo);
    if (entityData.descripcion_breve)  vars.titulo_tarea      = String(entityData.descripcion_breve);
    if (entityData.descripcion_breve)  vars.descripcion_tarea = String(entityData.descripcion_breve);

    if (entityData.estado_nuevo) {
      vars.estado_tarea  = String(entityData.estado_nuevo);
      vars.estado_nuevo  = String(entityData.estado_nuevo);
    } else if (entityData.estado) {
      vars.estado_tarea = String(entityData.estado);
    }
    if (entityData.estado_anterior) vars.estado_anterior = String(entityData.estado_anterior);

    // Solicitante
    if (entityData.email_solicitante) {
      vars.email_solicitante = String(entityData.email_solicitante);
      vars.email_cliente     = String(entityData.email_solicitante);
    }
    if (entityData.nombre_solicitante) {
      vars.nombre_solicitante = String(entityData.nombre_solicitante);
      vars.nombre_cliente     = String(entityData.nombre_solicitante);
    } else if (entityData.email_solicitante) {
      const email = String(entityData.email_solicitante);
      vars.nombre_solicitante = email.includes("@") ? email.split("@")[0] : email;
      vars.nombre_cliente     = vars.nombre_solicitante;
    }

    // Fechas
    if (entityData.fecha_estimada_entrega) {
      vars.fecha_limite_tarea     = formatFechaCR(String(entityData.fecha_estimada_entrega));
      vars.fecha_estimada_entrega = vars.fecha_limite_tarea;
      vars.fecha_entrega          = vars.fecha_limite_tarea;
    }
    if (entityData.created_at) {
      vars.fecha_creacion = formatFechaCRCompleta(String(entityData.created_at));
    }
    if (entityData.fecha_cambio) {
      vars.fecha_cambio = formatFechaCRCompleta(String(entityData.fecha_cambio));
    }

    // Cantidades
    if (entityData.cantidad_unidades != null) {
      vars.cantidad_unidades = String(entityData.cantidad_unidades);
    }

    // Campos del formulario dinámico — escalares
    if (entityData.departamento_solicitante) vars.departamento = String(entityData.departamento_solicitante);
    if (entityData.cliente)                  vars.cliente      = String(entityData.cliente);
    if (entityData.solicitud_epa) {
      vars.solicitud_epa  = String(entityData.solicitud_epa);
      vars.tipo_solicitud = String(entityData.solicitud_epa);
    }
    if (entityData.solicitud_cofersa) {
      vars.solicitud_cofersa = String(entityData.solicitud_cofersa);
      vars.tipo_solicitud    = String(entityData.solicitud_cofersa);
    }
    if (entityData.tipo_trabajo) vars.tipo_trabajo = String(entityData.tipo_trabajo);
    if (entityData.cotizacion_id) vars.cotizacion_id = String(entityData.cotizacion_id);
    if (entityData.encargado_nombre) vars.encargado_tarea = String(entityData.encargado_nombre);

    // ─── BADGE INDIVIDUAL DE ESTADO ──────────────────────────────────────────
    const estadoNuevo    = String(entityData.estado_nuevo ?? entityData.estado ?? "");
    const estadoAnterior = String(entityData.estado_anterior ?? "");
    if (estadoNuevo)    vars.badge_estado_nuevo    = badgeEstado(estadoNuevo);
    if (estadoAnterior) vars.badge_estado_anterior = badgeEstado(estadoAnterior);
    if (estadoNuevo)    vars.color_estado_nuevo    = colorEstado(estadoNuevo);
    if (estadoAnterior) vars.color_estado_anterior = colorEstado(estadoAnterior);

    // ─── BLOQUES HTML PARA TAREA CREADA ─────────────────────────────────────
    if (tipoEvento === "tarea.creada") {
      vars.asunto_tarea              = buildAsuntoTarea(entityData);
      vars.bloque_resumen_solicitud  = buildBloqueResumenSolicitud(entityData);
      vars.bloque_detalle_solicitud  = buildBloqueDetalleSolicitud(entityData);
      vars.bloque_tabla_items        = buildBloqueTablaItems(entityData);
      vars.bloque_nota_contextual    = buildBloqueNotaContextual(entityData);

      const s = Array.isArray(entityData.items_tabla_simple)   ? (entityData.items_tabla_simple   as any[]).length : 0;
      const c = Array.isArray(entityData.items_tabla_completa) ? (entityData.items_tabla_completa as any[]).length : 0;
      vars.cantidad_items = String(s + c);
    }

    // ─── BLOQUES HTML PARA CAMBIO DE ESTADO ──────────────────────────────────
    if (tipoEvento === "tarea.estado_cambiado" || tipoEvento === "tarea.finalizada") {
      if (estadoAnterior && estadoNuevo) {
        vars.bloque_cambio_estado = buildBloqueCambioEstado(
          estadoAnterior,
          estadoNuevo,
          entityData.fecha_cambio ? String(entityData.fecha_cambio) : undefined
        );
      }
      // También disponible el resumen de tipo de solicitud si existen los datos del formulario
      if (entityData.departamento_solicitante) {
        vars.bloque_resumen_solicitud = buildBloqueResumenSolicitud(entityData);
        vars.bloque_detalle_solicitud = buildBloqueDetalleSolicitud(entityData);
      }
    }
  }

  if (tipoEvento.startsWith("cotizacion.")) {
    if (entityData.codigo) vars.numero_cotizacion = String(entityData.codigo);
    if (entityData.total) {
      vars.total_cotizacion = `₡ ${Number(entityData.total).toLocaleString("es-CR", { minimumFractionDigits: 2 })}`;
    }
    if (entityData.nombre_cliente) vars.nombre_cliente = String(entityData.nombre_cliente);
    if (entityData.email_cliente)  vars.email_cliente  = String(entityData.email_cliente);
  }

  if (tipoEvento.startsWith("pedido.")) {
    if (entityData.codigo ?? entityData.numero_pedido) {
      vars.numero_pedido = String(entityData.codigo ?? entityData.numero_pedido);
    }
    if (entityData.estado_nuevo ?? entityData.estado) {
      vars.estado_pedido = String(entityData.estado_nuevo ?? entityData.estado);
    }
    if (entityData.nombre_cliente) vars.nombre_cliente = String(entityData.nombre_cliente);
    if (entityData.email_cliente)  vars.email_cliente  = String(entityData.email_cliente);
  }

  return vars;
}

// ════════════════════════════════════════════════════════════════════════════
// EVALUADOR DE CONDICIONES
// ════════════════════════════════════════════════════════════════════════════

function condicionesAplican(
  condiciones: Record<string, unknown>,
  entityData: Record<string, unknown>
): boolean {
  if (!condiciones || Object.keys(condiciones).length === 0) return true;
  if (condiciones.estado_nuevo && entityData.estado_nuevo) {
    if (condiciones.estado_nuevo !== entityData.estado_nuevo) return false;
  }
  if (condiciones.estado && entityData.estado) {
    if (condiciones.estado !== entityData.estado) return false;
  }
  return true;
}

// ════════════════════════════════════════════════════════════════════════════
// SERVIDOR PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: EventoPayload = await req.json();
    const { tipo_evento, tienda_id, entity_data } = payload;

    console.log(`[Correspondencia] ======== INICIO PROCESAMIENTO ========`);
    console.log(`[Correspondencia] evento recibido: ${tipo_evento}`);
    console.log(`[Correspondencia] tienda_id recibido: ${tienda_id}`);
    console.log(`[Correspondencia] entity_data keys: ${Object.keys(entity_data ?? {}).join(", ")}`);

    if (!tipo_evento || !tienda_id) {
      return new Response(
        JSON.stringify({ error: "Faltan campos: tipo_evento, tienda_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: reglasRaw, error: reglasError } = await supabase
      .from("correspondencia_reglas")
      .select(`
        id, nombre, plantilla_id, destinatarios_config, cc, cco, condiciones, prioridad, tienda_id,
        plantilla:correspondencia_plantillas(id, asunto, cuerpo_html, variables)
      `)
      .eq("evento_trigger", tipo_evento)
      .eq("activo", true)
      .or(`tienda_id.eq.${tienda_id},tienda_id.is.null`)
      .order("prioridad", { ascending: false });

    if (reglasError) {
      console.error("[Correspondencia] Error obteniendo reglas:", reglasError);
      return new Response(
        JSON.stringify({ error: "Error consultando reglas", detail: reglasError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Correspondencia] reglas encontradas: ${reglasRaw?.length ?? 0}`);

    if (!reglasRaw || reglasRaw.length === 0) {
      console.log(`[Correspondencia] ℹ️ Sin reglas activas para evento='${tipo_evento}'`);
      return new Response(
        JSON.stringify({ ok: true, mensaje: "Sin reglas activas para este evento", disparados: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const variablesData = buildVariablesData(tipo_evento, entity_data);
    console.log(`[Correspondencia] variables construidas: [${Object.keys(variablesData).join(", ")}]`);

    const resultados: Record<string, unknown>[] = [];

    for (const regla of reglasRaw as Regla[]) {
      console.log(`[Correspondencia] ── procesando regla '${regla.nombre}' (id=${regla.id}) ──`);

      if (!condicionesAplican(regla.condiciones ?? {}, entity_data)) {
        console.log(`[Correspondencia] regla OMITIDA por condiciones`);
        resultados.push({ regla_id: regla.id, nombre: regla.nombre, omitida: true, razon: "condiciones_no_aplican" });
        continue;
      }

      const plantilla = regla.plantilla as Regla["plantilla"];
      if (!plantilla) {
        console.warn(`[Correspondencia] regla SIN PLANTILLA`);
        resultados.push({ regla_id: regla.id, nombre: regla.nombre, omitida: true, razon: "sin_plantilla" });
        continue;
      }

      let para: string[] = [];
      const config = regla.destinatarios_config ?? {};

      if (config.tipo === "dinamico" && config.campo_email) {
        const emailDinamico = entity_data[config.campo_email];
        if (emailDinamico && String(emailDinamico).includes("@")) {
          para = [String(emailDinamico)];
        }
        if (para.length === 0 && entity_data.email_solicitante) {
          para = [String(entity_data.email_solicitante)];
        }
      } else if (config.tipo === "fijo" && Array.isArray(config.emails)) {
        para = config.emails.filter((e) => e && e.includes("@"));
      }

      if (para.length === 0 && entity_data.email_solicitante) {
        para = [String(entity_data.email_solicitante)];
      }

      if (para.length === 0) {
        console.warn(`[Correspondencia] regla SIN DESTINATARIOS`);
        resultados.push({ regla_id: regla.id, nombre: regla.nombre, omitida: true, razon: "sin_destinatarios" });
        continue;
      }

      const ccFinal  = regla.cc ?? [];
      const asuntoFinal = reemplazarVariables(plantilla.asunto, variablesData);
      const cuerpoFinal = reemplazarVariables(plantilla.cuerpo_html, variablesData);

      console.log(`[Correspondencia] destinatarios: [${para.join(", ")}] | subject: '${asuntoFinal}'`);

      try {
        const envioResp = await fetch(
          `${SUPABASE_URL}/functions/v1/correspondencia-enviar`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              para,
              cc: ccFinal,
              cco: regla.cco ?? [],
              asunto: asuntoFinal,
              cuerpo_html: cuerpoFinal,
              regla_id: regla.id,
              plantilla_id: plantilla.id,
              tienda_id,
              evento_origen: tipo_evento,
              variables_data: variablesData,
              metadata: entity_data,
            }),
          }
        );

        const envioData = await envioResp.json();
        console.log(`[Correspondencia] resultado: success=${envioData.success} accepted=${JSON.stringify(envioData.accepted ?? [])} rejected=${JSON.stringify(envioData.rejected ?? [])}`);

        resultados.push({ regla_id: regla.id, nombre: regla.nombre, ...envioData });
      } catch (envioError) {
        console.error(`[Correspondencia] excepción enviando:`, envioError);
        resultados.push({ regla_id: regla.id, nombre: regla.nombre, error: String(envioError) });
      }
    }

    const exitosos = resultados.filter((r: any) => r.success === true).length;
    console.log(`[Correspondencia] ======== FIN ======== exitosos=${exitosos}/${resultados.length}`);

    return new Response(
      JSON.stringify({ ok: true, disparados: resultados.length, exitosos, resultados }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    console.error("[Correspondencia] Error general:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
