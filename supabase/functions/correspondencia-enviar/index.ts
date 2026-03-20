import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import nodemailer from "npm:nodemailer@6.9.13";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SMTP_HOST       = Deno.env.get("SMTP_HOST")       || "smtp.gmail.com";
const SMTP_PORT       = Number(Deno.env.get("SMTP_PORT") || "465");
const SMTP_SECURE     = (Deno.env.get("SMTP_SECURE")     || "true") === "true";
const SMTP_USER       = Deno.env.get("SMTP_USER");
const SMTP_PASS       = Deno.env.get("SMTP_PASS");
const SMTP_FROM_EMAIL = Deno.env.get("SMTP_FROM_EMAIL");
// SMTP_FROM_NAME NO se usa para el campo from — solo email plano
const SMTP_REPLY_TO   = Deno.env.get("SMTP_REPLY_TO") || SMTP_FROM_EMAIL;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface EnvioPayload {
  para: string[];
  cc?: string[];
  cco?: string[];
  asunto: string;
  cuerpo_html: string;
  regla_id?: number;
  plantilla_id?: number;
  tienda_id?: string;
  evento_origen?: string;
  metadata?: Record<string, unknown>;
  historial_id?: number;
  variables_data?: Record<string, string>;
}

function reemplazarVariables(texto: string, datos: Record<string, string>): string {
  return texto.replace(/\{\{(\w+)\}\}/g, (_match: string, key: string) => {
    return Object.prototype.hasOwnProperty.call(datos, key) ? datos[key] : `{{${key}}}`;
  });
}

function flattenMetadata(
  obj: Record<string, unknown>,
  prefix = "",
  result: Record<string, string> = {}
): Record<string, string> {
  for (const [key, val] of Object.entries(obj)) {
    const full = prefix ? `${prefix}_${key}` : key;
    if (val !== null && typeof val === "object" && !Array.isArray(val)) {
      flattenMetadata(val as Record<string, unknown>, full, result);
    } else if (val !== null && val !== undefined) {
      result[full] = String(val);
    }
  }
  return result;
}

async function crearTransporter() {
  const missing: string[] = [];
  if (!SMTP_USER)       missing.push("SMTP_USER");
  if (!SMTP_PASS)       missing.push("SMTP_PASS");
  if (!SMTP_FROM_EMAIL) missing.push("SMTP_FROM_EMAIL");

  if (missing.length > 0) {
    throw new Error(`Missing SMTP secret — Secrets faltantes: ${missing.join(", ")}`);
  }

  console.log("[SMTP] Auth user (credencial):", SMTP_USER);
  console.log("[SMTP] From visible (solo email, sin nombre):", SMTP_FROM_EMAIL);
  console.log("[SMTP] Reply-To:", SMTP_REPLY_TO);
  console.log("[SMTP] Host:", SMTP_HOST, "| Port:", SMTP_PORT, "| Secure:", SMTP_SECURE);

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  try {
    await transporter.verify();
    console.log("[SMTP] ✅ Conexión verificada con:", SMTP_USER);
  } catch (verifyErr: any) {
    const msg = verifyErr?.message || String(verifyErr);
    console.error("[SMTP] ❌ Verify falló:", msg);

    let legible = `SMTP connection failed: ${msg}`;
    if (msg.includes("535") || msg.toLowerCase().includes("invalid credentials")) {
      legible = `SMTP auth failed — Verifique SMTP_USER (${SMTP_USER}) y SMTP_PASS. Use una App Password.`;
    } else if (msg.includes("ECONNREFUSED") || msg.includes("ETIMEDOUT")) {
      legible = `SMTP connection failed — No se pudo conectar a ${SMTP_HOST}:${SMTP_PORT}`;
    }
    throw new Error(legible);
  }

  return transporter;
}

interface SendResult {
  ok: boolean;
  messageId?: string;
  accepted?: string[];
  rejected?: string[];
  response?: string;
  envelope?: unknown;
  error?: string;
}

async function enviarCorreo(
  payload: EnvioPayload & { asunto: string; cuerpo_html: string }
): Promise<SendResult> {
  try {
    const transporter = await crearTransporter();

    const mailOptions = {
      // ── CAMBIO: from usa solo el email plano, sin display name ────────────
      from: SMTP_FROM_EMAIL,
      to: payload.para.join(", "),
      cc: payload.cc?.join(", ") || undefined,
      bcc: payload.cco?.join(", ") || undefined,
      replyTo: SMTP_REPLY_TO || undefined,
      subject: payload.asunto,
      html: payload.cuerpo_html,
      text: payload.cuerpo_html.replace(/<[^>]+>/g, ""),
    };

    // ── LOG ANTES DE ENVIAR ────────────────────────────────────────────────
    console.log("[MAIL] === PRE-ENVÍO ===");
    console.log("[MAIL] Auth SMTP user:", SMTP_USER);
    console.log("[MAIL] From visible (solo email):", mailOptions.from);
    console.log("[MAIL] To:", mailOptions.to);
    if (mailOptions.cc)  console.log("[MAIL] CC:", mailOptions.cc);
    if (mailOptions.bcc) console.log("[MAIL] BCC:", mailOptions.bcc);
    console.log("[MAIL] Subject:", mailOptions.subject);

    const info = await transporter.sendMail(mailOptions);

    // ── LOG DESPUÉS DE ENVIAR ──────────────────────────────────────────────
    console.log("[MAIL] === POST-ENVÍO ===");
    console.log("[MAIL] messageId:", info.messageId);
    console.log("[MAIL] accepted:", JSON.stringify(info.accepted ?? []));
    console.log("[MAIL] rejected:", JSON.stringify(info.rejected ?? []));
    console.log("[MAIL] response:", info.response ?? "N/A");
    console.log("[MAIL] envelope:", JSON.stringify(info.envelope ?? {}));

    const accepted = info.accepted ?? [];
    const rejected = info.rejected ?? [];

    if (rejected.length > 0) {
      console.error("[MAIL] ❌ SMTP rechazó destinatarios:", rejected);
    }

    if (accepted.length === 0) {
      console.warn("[MAIL] ⚠️ accepted vacío — posible problema de entrega");
    } else {
      console.log("[MAIL] ✅ SMTP aceptó destinatarios:", accepted);
    }

    return {
      ok: rejected.length === 0,
      messageId: info.messageId,
      accepted: accepted as string[],
      rejected: rejected as string[],
      response: info.response ?? "",
      envelope: info.envelope,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[MAIL] ❌ Error en sendMail:", msg);
    return { ok: false, error: msg };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: EnvioPayload = await req.json();

    if (!payload.para?.length || !payload.asunto || !payload.cuerpo_html) {
      return new Response(
        JSON.stringify({ error: "Faltan campos requeridos: para, asunto, cuerpo_html" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const datosVariables: Record<string, string> = {
      fecha_hoy: new Date().toLocaleDateString("es-CR"),
      hora_actual: new Date().toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" }),
      ...(payload.metadata ? flattenMetadata(payload.metadata) : {}),
      ...(payload.variables_data ?? {}),
    };

    const asuntoFinal = reemplazarVariables(payload.asunto, datosVariables);
    const cuerpoFinal = reemplazarVariables(payload.cuerpo_html, datosVariables);
    const payloadFinal: EnvioPayload = { ...payload, asunto: asuntoFinal, cuerpo_html: cuerpoFinal };

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── Registrar intento en historial ────────────────────────────────────
    let historialId = payload.historial_id;
    if (!historialId) {
      const { data: hist } = await supabase
        .from("correspondencia_historial")
        .insert({
          tienda_id: payload.tienda_id ?? null,
          regla_id: payload.regla_id ?? null,
          plantilla_id: payload.plantilla_id ?? null,
          para: payload.para,
          cc: payload.cc ?? [],
          cco: payload.cco ?? [],
          asunto: asuntoFinal,
          cuerpo_html: cuerpoFinal,
          estado: "pendiente",
          intentos: 0,
          evento_origen: payload.evento_origen ?? "manual",
          metadata: { ...payload.metadata, variables_data: datosVariables },
        })
        .select("id")
        .maybeSingle();
      historialId = hist?.id;
    }

    await supabase
      .from("correspondencia_historial")
      .update({ intentos: 1, ultimo_intento: new Date().toISOString(), estado: "enviando" })
      .eq("id", historialId);

    // ── Enviar ────────────────────────────────────────────────────────────
    const resultado = await enviarCorreo(payloadFinal);

    if (resultado.ok) {
      await supabase
        .from("correspondencia_historial")
        .update({
          estado: "enviado",
          enviado_en: new Date().toISOString(),
          error_detalle: null,
          message_id: resultado.messageId ?? null,
          smtp_accepted: resultado.accepted ?? [],
          smtp_rejected: resultado.rejected ?? [],
          smtp_response: resultado.response ?? null,
        })
        .eq("id", historialId);

      return new Response(
        JSON.stringify({
          success: true,
          historial_id: historialId,
          messageId: resultado.messageId,
          accepted: resultado.accepted,
          rejected: resultado.rejected,
          response: resultado.response,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      const errorMsg = resultado.error
        || (resultado.rejected?.length ? `SMTP rechazó: ${resultado.rejected.join(", ")}` : "Error desconocido");

      await supabase
        .from("correspondencia_historial")
        .update({
          estado: "error",
          error_detalle: errorMsg,
          message_id: resultado.messageId ?? null,
          smtp_accepted: resultado.accepted ?? [],
          smtp_rejected: resultado.rejected ?? [],
          smtp_response: resultado.response ?? null,
        })
        .eq("id", historialId);

      return new Response(
        JSON.stringify({
          success: false,
          error: errorMsg,
          historial_id: historialId,
          messageId: resultado.messageId ?? null,
          accepted: resultado.accepted ?? [],
          rejected: resultado.rejected ?? [],
          response: resultado.response ?? null,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err: unknown) {
    console.error("[ERROR] General:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
