// src/hooks/useAuth.ts
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, clearInvalidSession } from '../lib/supabase';

interface UserProfile {
  id: string;
  email: string;
  nombre_completo: string;
  rol: string;
  activo: boolean;
  permisos: string[];
}

interface Store {
  id: string;
  nombre: string;
  codigo: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  roles: string[];
  permissions: string[];
  loading: boolean;
  isAuthenticated: boolean;
  needsStoreAssignment: boolean;

  stores: Store[];
  currentStore: Store | null;
  setCurrentStore: (store: Store | null) => void;

  signIn: (email: string, password: string, storeId?: string) => Promise<{ error?: any }>;
  signUp: (email: string, password: string, metadata: any, storeId?: string) => Promise<{ error?: any; success?: boolean; message?: string }>;
  signOut: () => Promise<void>;

  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  hasRole: (role: string) => boolean;

  canRead: (module: string) => boolean;
  canWrite: (module: string) => boolean;
  canDelete: (module: string) => boolean;

  refetch: () => Promise<void>;
  getAvailableStores: () => Promise<Store[]>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function useAuthProvider(): AuthContextType {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [needsStoreAssignment, setNeedsStoreAssignment] = useState<boolean>(false);

  const [stores, setStores] = useState<Store[]>([]);
  const [currentStore, setCurrentStoreState] = useState<Store | null>(null);

  const resetAuth = useCallback(() => {
    setUser(null);
    setProfile(null);
    setRoles([]);
    setPermissions([]);
    setIsAuthenticated(false);
    setNeedsStoreAssignment(false);
    setStores([]);
    setCurrentStoreState(null);
    setLoading(false);
  }, []);

  const getCurrentStore = async (userId: string) => {
    try {
      const { data: currentStoreData, error } = await supabase
        .from('usuario_tienda_actual')
        .select('tienda_id, tiendas(id, nombre, codigo, activo)')
        .eq('usuario_id', userId)
        .maybeSingle();

      if (error) return null;
      if (!currentStoreData) return null;

      if (currentStoreData?.tiendas && currentStoreData.tiendas.activo) {
        return {
          id: currentStoreData.tiendas.id,
          nombre: currentStoreData.tiendas.nombre,
          codigo: currentStoreData.tiendas.codigo
        };
      }

      return null;
    } catch {
      return null;
    }
  };

  const loadUserPermissions = useCallback(async (userId: string) => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) return [];

      const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/me-permissions`;
      
      const response = await fetch(edgeFunctionUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) return [];
        return [];
      }

      const data = await response.json();
      
      if (!data.isAuthenticated || !data.permissions) return [];

      return data.permissions;
    } catch {
      return [];
    }
  }, []);

  const checkStoreAssignment = useCallback(async (userId: string) => {
    try {
      const { data: userStores, error: storesError } = await supabase
        .from('usuario_tiendas')
        .select('tienda_id')
        .eq('usuario_id', userId)
        .eq('activo', true);

      if (storesError) return false;

      const { data: currentStoreData, error: currentStoreError } = await supabase
        .from('usuario_tienda_actual')
        .select('tienda_id')
        .eq('usuario_id', userId)
        .single();

      if (currentStoreError && currentStoreError.code !== 'PGRST116') return false;

      const hasStores = userStores && userStores.length > 0;
      const hasCurrentStore = currentStoreData && currentStoreData.tienda_id;

      return hasStores && hasCurrentStore;
    } catch {
      return false;
    }
  }, []);

  const loadCurrentStore = useCallback(async (userId: string) => {
    try {
      const store = await getCurrentStore(userId);
      setCurrentStoreState(store ?? null);
    } catch {
      setCurrentStoreState(null);
    }
  }, []);

  const loadBasicProfile = useCallback(
    async (authUser: User) => {
      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (error || !data) {
          setProfile({
            id: authUser.id,
            email: authUser.email ?? '',
            nombre_completo:
              (authUser.user_metadata as any)?.nombre_completo ??
              authUser.email ??
              '',
            rol: 'Cliente',
            activo: true,
            permisos: []
          });
          setRoles(['Cliente']);
          setPermissions([]);
        } else {
          const userPermissions = await loadUserPermissions(authUser.id);
          
          setProfile({
            id: data.id,
            email: data.email,
            nombre_completo: data.nombre_completo,
            rol: data.rol,
            activo: data.activo,
            permisos: userPermissions
          });
          setRoles([data.rol]);
          setPermissions(userPermissions);
        }

        await loadCurrentStore(authUser.id);

        const hasStoreAssignment = await checkStoreAssignment(authUser.id);
        setNeedsStoreAssignment(!hasStoreAssignment);

        if (hasStoreAssignment) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        resetAuth();
      } finally {
        setLoading(false);
      }
    },
    [resetAuth, checkStoreAssignment, loadCurrentStore, loadUserPermissions]
  );

  const getAvailableStores = async (): Promise<Store[]> => {
    try {
      const { data, error } = await supabase
        .from('tiendas')
        .select('id, nombre, codigo')
        .eq('activo', true)
        .order('nombre');

      if (error) return [];

      return data || [];
    } catch {
      return [];
    }
  };

  const signIn = async (email: string, password: string, storeId?: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        setLoading(false);
        return { error };
      }
      
      if (data.session?.user) {
        if (storeId) {
          try {
            const { data: hasAccess, error: accessError } = await supabase
              .from('usuario_tiendas')
              .select('tienda_id')
              .eq('usuario_id', data.session.user.id)
              .eq('tienda_id', storeId)
              .eq('activo', true)
              .single();
            
            if (accessError || !hasAccess) {
              await supabase.auth.signOut();
              setLoading(false);
              return { 
                error: { 
                  message: 'No tienes acceso a la tienda seleccionada. Contacta al administrador.' 
                } 
              };
            }
            
            await supabase
              .from('usuario_tienda_actual')
              .upsert({
                usuario_id: data.session.user.id,
                tienda_id: storeId,
                updated_at: new Date().toISOString()
              });

            const { data: storeData } = await supabase
              .from('tiendas')
              .select('id, nombre, codigo')
              .eq('id', storeId)
              .single();

            if (storeData) {
              setCurrentStoreState(storeData);
            }
          } catch {
            await supabase.auth.signOut();
            setLoading(false);
            return { 
              error: { 
                message: 'Error al configurar la tienda. Intenta nuevamente.' 
              } 
            };
          }
        }
        
        await loadBasicProfile(data.session.user);
      } else {
        setLoading(false);
      }
      
      return {};
    } catch (err) {
      setLoading(false);
      return { error: err };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    metadata: any,
    storeId?: string
  ) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });

      if (error) return { error };

      return {
        success: true,
        message: 'Cuenta creada exitosamente. Un administrador debe asignarte una tienda antes de que puedas acceder al sistema.',
      };
    } catch (err) {
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      resetAuth();
      
      if (window.REACT_APP_NAVIGATE) {
        window.REACT_APP_NAVIGATE('/login', { replace: true });
      } else {
        window.location.href = '/login';
      }
    } catch {
      resetAuth();
      if (window.REACT_APP_NAVIGATE) {
        window.REACT_APP_NAVIGATE('/login', { replace: true });
      } else {
        window.location.href = '/login';
      }
    }
  };

  const setCurrentStore = (store: Store | null) => {
    setCurrentStoreState(store);
  };

  const hasPermission = (permission: string): boolean => {
    if (!isAuthenticated || !profile) return false;
    if (profile.rol === 'Admin') return true;
    if (permissions.includes(permission)) return true;
    const ownVariant = `${permission}:own`;
    if (permissions.includes(ownVariant)) return true;
    return false;
  };

  const hasAnyPermission = (list: string[]): boolean => {
    if (!isAuthenticated || !profile) return false;
    if (profile.rol === 'Admin') return true;
    if (!list || list.length === 0) return true;
    return list.some(permission => {
      if (permissions.includes(permission)) return true;
      const ownVariant = `${permission}:own`;
      if (permissions.includes(ownVariant)) return true;
      return false;
    });
  };

  const hasAllPermissions = (list: string[]): boolean => {
    if (!isAuthenticated || !profile) return false;
    if (profile.rol === 'Admin') return true;
    if (!list || list.length === 0) return true;
    return list.every(permission => {
      if (permissions.includes(permission)) return true;
      const ownVariant = `${permission}:own`;
      if (permissions.includes(ownVariant)) return true;
      return false;
    });
  };

  const hasRole = (role: string): boolean => {
    if (!isAuthenticated || !profile) return false;
    if (!role) return true;
    return profile.rol === 'Admin' || roles.includes(role);
  };

  const canRead = (module: string): boolean => {
    if (profile?.rol === 'Admin') return true;
    return hasPermission(`${module}:view`);
  };
  
  const canWrite = (module: string): boolean => {
    if (profile?.rol === 'Admin') return true;
    return hasAnyPermission([`${module}:create`, `${module}:edit`]);
  };
  
  const canDelete = (module: string): boolean => {
    if (profile?.rol === 'Admin') return true;
    return hasPermission(`${module}:delete`);
  };

  const refetch = async () => {
    if (!user) return;
    await loadBasicProfile(user);
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;

        if (error) {
          // Si el error es de refresh token inválido, limpiar sesión silenciosamente
          if (error.message?.includes('Invalid Refresh Token') || 
              error.message?.includes('Refresh Token Not Found')) {
            await clearInvalidSession();
            resetAuth();
            return;
          }
          resetAuth();
          return;
        }

        const session = data.session;

        if (session?.user) {
          setUser(session.user);
          await loadBasicProfile(session.user);
        } else {
          resetAuth();
        }
      } catch (err: any) {
        if (!mounted) return;
        // Si el error es de refresh token, limpiar sesión silenciosamente
        if (err?.message?.includes('Invalid Refresh Token') || 
            err?.message?.includes('Refresh Token Not Found')) {
          await clearInvalidSession();
        }
        resetAuth();
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT') {
          resetAuth();
          return;
        }

        if (event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            setUser(session.user);
          }
          return;
        }

        if (session?.user) {
          setUser(session.user);
          loadBasicProfile(session.user);
        } else {
          resetAuth();
        }
      }
    );

    return () => {
      mounted = false;
      listener?.subscription.unsubscribe();
    };
  }, [loadBasicProfile, resetAuth]);

  return {
    user,
    profile,
    roles,
    permissions,
    loading,
    isAuthenticated,
    needsStoreAssignment,
    stores,
    currentStore,
    setCurrentStore,
    signIn,
    signUp,
    signOut,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    canRead,
    canWrite,
    canDelete,
    refetch,
    getAvailableStores,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useAuthProvider();
  return React.createElement(
    AuthContext.Provider,
    { value: auth },
    children
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return ctx;
}
