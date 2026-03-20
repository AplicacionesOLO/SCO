import { supabase } from '../lib/supabase';
import { getPageContext } from '../utils/costbotContext';
import type { CostBotRequest, CostBotResponse, CostBotMessage, CostBotHistory } from '../types/costbot';

/**
 * Servicio para interactuar con CostBot
 */

// 🔧 CORRECCIÓN: Usar la URL correcta de Supabase Edge Function
const SUPABASE_URL = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
const COSTBOT_ENDPOINT = `${SUPABASE_URL}/functions/v1/costbot-query`;

const HISTORY_KEY_PREFIX = 'costbot_history';

/**
 * Obtiene información del usuario autenticado
 */
async function getUserInfo(): Promise<{ userId: string; role: string | number }> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Usuario no autenticado');

  const { data: userData, error } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .maybeSingle();

  const role = userData?.rol || 'guest';

  return { userId: user.id, role };
}

/**
 * Envía una pregunta a CostBot
 */
export async function sendQuestionToCostBot(question: string): Promise<CostBotResponse> {
  const session = await supabase.auth.getSession();
  
  if (!session.data.session) {
    throw new Error('No hay sesión activa');
  }

  const user = session.data.session.user;
  
  // Obtener rol del usuario desde metadata
  const userRole = user.user_metadata?.role || 'guest';
  
  // Obtener contexto de página actual
  const pageContext = getPageContext();

  const payload = {
    userId: user.id,
    role: userRole,
    pageContext,
    question
  };

  const { data, error } = await supabase.functions.invoke('costbot-query', {
    body: payload
  });

  if (error) {
    console.error('❌ [COSTBOT] Error al invocar función:', error);
    throw new Error(error.message || 'Error al contactar con CostBot');
  }

  if (!data || !data.answer) {
    throw new Error('Respuesta inválida del servidor');
  }

  return data as CostBotResponse;
}

/**
 * Guarda el historial de conversación en localStorage
 */
export function saveChatHistory(userId: string | number, pageContext: string, messages: CostBotMessage[]): void {
  try {
    const history: CostBotHistory = {
      userId,
      pageContext,
      messages,
      lastUpdated: Date.now()
    };

    const key = `${HISTORY_KEY_PREFIX}::${userId}::${pageContext}`;
    localStorage.setItem(key, JSON.stringify(history));
  } catch {
    // silently ignore
  }
}

/**
 * Carga el historial de conversación desde localStorage
 */
export function loadChatHistory(userId: string | number, pageContext: string): CostBotMessage[] {
  try {
    const key = `${HISTORY_KEY_PREFIX}::${userId}::${pageContext}`;
    const stored = localStorage.getItem(key);

    if (!stored) return [];

    const history: CostBotHistory = JSON.parse(stored);

    if (history.userId !== userId || history.pageContext !== pageContext) return [];

    return history.messages;
  } catch {
    return [];
  }
}

/**
 * Limpia el historial de un contexto específico
 */
export function clearChatHistory(userId: string | number, pageContext: string): void {
  try {
    const key = `${HISTORY_KEY_PREFIX}::${userId}::${pageContext}`;
    localStorage.removeItem(key);
  } catch {
    // silently ignore
  }
}

/**
 * Obtiene todos los contextos con historial guardado
 */
export function getAllHistoryContexts(userId: string | number): string[] {
  try {
    const contexts: string[] = [];
    const prefix = `${HISTORY_KEY_PREFIX}::${userId}::`;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const context = key.replace(prefix, '');
        contexts.push(context);
      }
    }

    return contexts;
  } catch {
    return [];
  }
}
