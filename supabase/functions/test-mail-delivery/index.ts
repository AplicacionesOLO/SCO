import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import nodemailer from "npm:nodemailer@6.9.13";

// ─── SMTP secrets ─────────────────────────────────────────────────────────────
const SMTP_HOST       = Deno.env.get("SMTP_HOST")       || "smtp.gmail.com";
const SMTP_PORT       = Number(Deno.env.get("SMTP_PORT") || "465");
const SMTP_SECURE     = (Deno.env.get("SMTP_SECURE")     || "true") === "true";
const SMTP_USER       = Deno.env.get("SMTP_USER");
const SMTP_PASS       = Deno.env.get("SMTP_PASS");
const SMTP_FROM_EMAIL = Deno.env.get("SMTP_FROM_EMAIL");
const SMTP_FROM_NAME  = Deno.env.get("SMTP_FROM_NAME")  || "O Logistics";
const SMTP_REPLY_TO   = Deno.env.get("SMTP_REPLY_TO")   || SMTP_FROM_EMAIL;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { to, useAliasFrom = true } = body as { to: string; useAliasFrom?: boolean };

    if (!to || !to.includes("@")) {
      return new Response(
        JSON.stringify({ error: "Campo 'to' requerido con email válido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Validar secrets ─────────────────────────────────────────────────────
    const missing: string[] = [];
    if (!SMTP_USER)       missing.push("SMTP_USER");
    if (!SMTP_PASS)       missing.push("SMTP_PASS");
    if (!SMTP_FROM_EMAIL) missing.push("SMTP_FROM_EMAIL");

    if (missing.length > 0) {
      return new Response(
        JSON.stringify({ error: `Secrets SMTP faltantes: ${missing.join(", ")}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Determinar FROM según modo de prueba ──────────────────────────────
    // PRUEBA A: useAliasFrom=true  → from = no-reply-sco@ologistics.com (alias)
    // PRUEBA B: useAliasFrom=false → from = aplicacionesolo@ologistics.com (cuenta real)
    const fromEmail   = useAliasFrom ? SMTP_FROM_EMAIL! : SMTP_USER!;
    const fromDisplay = useAliasFrom
      ? `${SMTP_FROM_NAME} <${SMTP_FROM_EMAIL}>`
      : `${SMTP_FROM_NAME} (TEST) <${SMTP_USER}>`;

    const configUsada = {
      smtp_host: SMTP_HOST,
      smtp_port: SMTP_PORT,
      smtp_secure: SMTP_SECURE,
      smtp_auth_user: SMTP_USER,
      from_visible: fromDisplay,
      from_email_used: fromEmail,
      reply_to: SMTP_REPLY_TO,
      prueba: useAliasFrom ? "A - Alias visible" : "B - Cuenta real directa",
    };

    console.log("[TEST-MAIL] Configuración:", JSON.stringify(configUsada));
    console.log("[TEST-MAIL] Destinatario:", to);

    // ── Crear transporter ──────────────────────────────────────────────────
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,  // SIEMPRE la cuenta real para auth
        pass: SMTP_PASS,
      },
    });

    // ── Verificar conexión ─────────────────────────────────────────────────
    let verifyOk = false;
    let verifyError = "";
    try {
      await transporter.verify();
      verifyOk = true;
      console.log("[TEST-MAIL] ✅ SMTP verify OK con auth user:", SMTP_USER);
    } catch (ve: any) {
      verifyError = ve?.message || String(ve);
      console.error("[TEST-MAIL] ❌ SMTP verify FALLÓ:", verifyError);
      return new Response(
        JSON.stringify({
          success: false,
          error: `SMTP verify falló: ${verifyError}`,
          config: configUsada,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Asunto y cuerpo del test ──────────────────────────────────────────
    const subject = `[TEST ${useAliasFrom ? "A - ALIAS" : "B - CUENTA REAL"}] Prueba de entrega SMTP — ${new Date().toISOString()}`;
    const html = `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px;">
        <h2 style="color:#1F2937;">Prueba de Entrega SMTP</h2>
        <table style="border-collapse:collapse;width:100%;font-size:14px;">
          <tr><td style="padding:6px;color:#6B7280;font-weight:600;">Prueba:</td><td style="padding:6px;">${configUsada.prueba}</td></tr>
          <tr style="background:#F9FAFB;"><td style="padding:6px;color:#6B7280;font-weight:600;">Auth user:</td><td style="padding:6px;">${SMTP_USER}</td></tr>
          <tr><td style="padding:6px;color:#6B7280;font-weight:600;">From visible:</td><td style="padding:6px;">${fromDisplay}</td></tr>
          <tr style="background:#F9FAFB;"><td style="padding:6px;color:#6B7280;font-weight:600;">Reply-To:</td><td style="padding:6px;">${SMTP_REPLY_TO}</td></tr>
          <tr><td style="padding:6px;color:#6B7280;font-weight:600;">Destinatario:</td><td style="padding:6px;">${to}</td></tr>
          <tr style="background:#F9FAFB;"><td style="padding:6px;color:#6B7280;font-weight:600;">Fecha/Hora:</td><td style="padding:6px;">${new Date().toISOString()}</td></tr>
        </table>
        <p style="margin-top:16px;font-size:12px;color:#9CA3AF;">
          Si recibes este correo de <strong>Prueba ${useAliasFrom ? "A (alias)" : "B (cuenta real)"}</strong>, 
          confirma cuál FROM aparece en tu cliente de correo.
        </p>
      </div>
    `;

    // ── Enviar ────────────────────────────────────────────────────────────
    console.log("[TEST-MAIL] Enviando a:", to, "| From:", fromDisplay);

    const info = await transporter.sendMail({
      from: fromDisplay,
      to,
      replyTo: SMTP_REPLY_TO || undefined,
      subject,
      html,
      text: `Prueba SMTP: ${configUsada.prueba} | Auth: ${SMTP_USER} | From: ${fromDisplay}`,
    });

    const result = {
      success: true,
      prueba: configUsada.prueba,
      config: configUsada,
      messageId: info.messageId,
      accepted: info.accepted ?? [],
      rejected: info.rejected ?? [],
      response: info.response ?? "",
      envelope: info.envelope ?? {},
      entregado_correctamente: Array.isArray(info.accepted) && info.accepted.length > 0,
      verify_ok: verifyOk,
    };

    console.log("[TEST-MAIL] Resultado:", JSON.stringify({
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
    }));

    if (!result.entregado_correctamente) {
      console.warn("[TEST-MAIL] ⚠️ accepted está vacío — SMTP aceptó pero no confirmó destinatario:", to);
    } else {
      console.log("[TEST-MAIL] ✅ SMTP aceptó al destinatario:", info.accepted);
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    console.error("[TEST-MAIL] Error general:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
