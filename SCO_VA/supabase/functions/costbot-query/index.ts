import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY   = Deno.env.get("OPENAI_API_KEY")   ?? "";
const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")      ?? "";
const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const EMBEDDING_MODEL  = "text-embedding-3-small";
const CHAT_MODEL       = "gpt-4o-mini";
const MAX_CHUNKS       = 8;
const MAX_TOKENS       = 1800;

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(origin) });
  }

  try {
    const body = await req.json();
    const userMessage: string  = body.message ?? "";
    const roleFilter:  string  = body.role     ?? "";   // "" = público
    const history:     any[]   = body.history  ?? [];

    if (!userMessage.trim()) {
      return new Response(
        JSON.stringify({ error: "mensaje vacío" }),
        { status: 400, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE);

    // ── 1. Embedding del mensaje ──────────────────────────────────
    const embResp = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: userMessage }),
    });
    if (!embResp.ok) throw new Error(`Embedding error ${embResp.status}`);
    const embData  = await embResp.json();
    const queryVec = embData.data[0].embedding as number[];

    // ── 2. RAG: buscar chunks relevantes ─────────────────────────
    let rpcParams: any = { query_embedding: queryVec, match_count: MAX_CHUNKS };
    if (roleFilter) rpcParams.role_filter = roleFilter;

    const { data: chunks, error: rpcError } = await supabase
      .rpc(roleFilter ? "match_chunks_by_role" : "match_chunks", rpcParams);

    if (rpcError) console.error("RPC error:", rpcError.message);

    const context = (chunks ?? [])
      .map((c: any) => c.content as string)
      .join("\n\n---\n\n")
      .slice(0, 6000);

    // ── 3. Construir prompt ───────────────────────────────────────
    const hasContext = context.trim().length > 0;

    const systemPrompt = hasContext
      ? `Eres CostBot, el asistente inteligente del sistema SCO. Tu personalidad es amigable, profesional y servicial.

CONTEXTO DISPONIBLE:
${context}

INSTRUCCIONES IMPORTANTES:
- Responde SIEMPRE en el mismo idioma en que el usuario escribe (español si escribe en español, inglés si escribe en inglés, etc.)
- Usa ÚNICAMENTE la información del contexto para responder sobre el sistema SCO
- Si la pregunta no está en el contexto, di honestamente que no tienes esa información específica
- Sé conversacional y natural, NO robótico
- Usa listas con viñetas cuando sea útil para organizar información
- Si el usuario saluda, responde el saludo y pregunta en qué puedes ayudar
- Máximo 400 palabras por respuesta`
      : `Eres CostBot, el asistente inteligente del sistema SCO. Tu personalidad es amigable, profesional y servicial.

INSTRUCCIONES:
- Responde SIEMPRE en el mismo idioma en que el usuario escribe
- No tienes documentación cargada en este momento para responder preguntas específicas del sistema
- Para saludos y preguntas generales, responde amablemente
- Si preguntan sobre funciones del sistema SCO, explica que necesitas documentación cargada para responder con precisión
- Cuando el usuario haga una pregunta sobre el sistema y no tengas contexto, sugiere al administrador cargar documentación PDF
- Para preguntas fuera del sistema: "${
      "Entiendo tu pregunta, pero mi especialidad es ayudarte con información específica del sistema SCO. ¿Hay algo sobre [menciona temas de los documentos] en lo que pueda ayudarte?"
    }"
- Máximo 300 palabras`;

    // ── 4. Historial de conversación ──────────────────────────────
    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-6).map((h: any) => ({
        role: h.role as "user" | "assistant",
        content: h.content as string,
      })),
      { role: "user", content: userMessage },
    ];

    // ── 5. Llamada al LLM ─────────────────────────────────────────
    const chatResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages: chatMessages,
        max_tokens: MAX_TOKENS,
        temperature: 0.7,
      }),
    });
    if (!chatResp.ok) {
      const errText = await chatResp.text();
      throw new Error(`Chat error ${chatResp.status}: ${errText}`);
    }
    const chatData = await chatResp.json();
    const answer   = chatData.choices?.[0]?.message?.content ?? "Lo siento, no pude generar una respuesta.";

    return new Response(
      JSON.stringify({
        answer,
        chunks_used: (chunks ?? []).length,
        has_context: hasContext,
        greetings: {
          general: '¡Hola! 👋 Soy CostBot, tu asistente para el sistema SCO. Estoy aquí para ayudarte con cualquier duda. ¿En qué puedo asistirte hoy?'
        }
      }),
      { headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("CostBot error:", err);
    return new Response(
      JSON.stringify({ error: err.message ?? "Error interno" }),
      { status: 500, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
    );
  }
});
