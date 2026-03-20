// =====================================================
// HOOK useAuth MEJORADO - INTEGRACIÓN CON RPC me()
// =====================================================

import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface UserProfile {
  id: string;
  email: string;
  nombre_completo: string;
  rol: string;
  activo: boolean;
  roles: string[];
  permisos: string[];
  authenticated: boolean;
  needs_profile_creation?: boolean;
  last_sign_in?: string;
  created_at?: string;
  updated_at?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signUp: (email: string, password: string, userData: any) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
  hasPermission: (permission: string, ownerId?: string) => boolean;
  hasRole: (role: string) => boolean;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: { nombre_completo?: string }) => Promise<{ error?: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuthProvider() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Función para obtener perfil usando RPC me()
  const fetchProfile = useCallback(async (): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase.rpc('me');
      if (error) return null;
      if (data?.error) return null;
      return data as UserProfile;
    } catch {
      return null;
    }
  }, []);

  // Función para refrescar perfil
  const refreshProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const profileData = await fetchProfile();
      setProfile(profileData);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [user, fetchProfile]);

  // Inicializar autenticación
  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          if (mounted) setLoading(false);
          return;
        }

        if (session?.user && mounted) {
          setUser(session.user);
          const profileData = await fetchProfile();
          setProfile(profileData);
          if (profileData?.needs_profile_creation) {
            setTimeout(() => refreshProfile(), 1000);
          }
        }
        
        if (mounted) setLoading(false);
      } catch {
        if (mounted) setLoading(false);
      }
    }

    initializeAuth();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          const profileData = await fetchProfile();
          setProfile(profileData);
          setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Función de login
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error };
      return {};
    } catch (error) {
      return { error };
    }
  };

  // Función de registro
  const signUp = async (email: string, password: string, userData: any) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });

      if (error) {
        return { error };
      }

      return { data };
    } catch (error) {
      return { error };
    }
  };

  // Función de logout
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // silently ignore
    }
  };

  // Función para verificar permisos
  const hasPermission = useCallback((permission: string, ownerId?: string): boolean => {
    if (!profile || !profile.authenticated) {
      return false;
    }

    // Verificar permiso exacto
    if (profile.permisos.includes(permission)) {
      return true;
    }

    // Verificar permiso :own si se proporciona ownerId
    if (ownerId && profile.permisos.includes(`${permission}:own`)) {
      return ownerId === profile.id;
    }

    return false;
  }, [profile]);

  // Función para verificar roles
  const hasRole = useCallback((role: string): boolean => {
    if (!profile || !profile.authenticated) {
      return false;
    }
    
    return profile.roles.includes(role);
  }, [profile]);

  // Función para actualizar perfil
  const updateProfile = async (data: { nombre_completo?: string }) => {
    try {
      const { data: result, error } = await supabase.rpc('update_my_profile', {
        new_nombre_completo: data.nombre_completo
      });

      if (error) {
        return { error };
      }

      // Actualizar estado local
      setProfile(result);
      return {};
    } catch (error) {
      return { error };
    }
  };

  return {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    hasPermission,
    hasRole,
    refreshProfile,
    updateProfile,
  };
}

export { AuthContext };

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}