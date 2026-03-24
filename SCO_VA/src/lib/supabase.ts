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
    // Configuración simplificada sin flowType problemático
    storage: window.localStorage
  },
  // Configuración de red mejorada
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-web'
    }
  }
});

// Configurar políticas de confirmación por email
export const configureEmailConfirmation = async () => {
  // Esta configuración debe hacerse en el panel de Supabase
  // Authentication > Settings > Email Confirmation: Enabled
};
