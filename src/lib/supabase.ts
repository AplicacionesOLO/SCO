import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno de Supabase');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storage: window.localStorage
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-web'
    }
  }
});

// Manejar errores de refresh token globalmente
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('[Supabase] Token refrescado correctamente');
  }
});

// Función segura para limpiar sesión inválida
export const clearInvalidSession = async () => {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // Limpiar manualmente si signOut falla
    localStorage.removeItem('sb-' + new URL(supabaseUrl).hostname + '-auth-token');
    localStorage.removeItem('supabase.auth.token');
  }
};

export const configureEmailConfirmation = async () => {};
