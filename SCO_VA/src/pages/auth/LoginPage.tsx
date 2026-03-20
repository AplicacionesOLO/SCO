import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

interface Store {
  id: string;
  nombre: string;
  codigo: string;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedStore, setSelectedStore] = useState('');
  const [stores, setStores] = useState<Store[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Siempre redirigir al dashboard: evita que el "from" de una sesión anterior
  // de un rol superior sea accesible a un usuario con menos permisos.
  const from = '/dashboard';

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, from]);

  // ✅ NUEVA FUNCIÓN: Cargar tiendas del usuario DESPUÉS de autenticarse
  const loadUserStores = async (userId: string): Promise<Store[]> => {
    try {
      setLoadingStores(true);
      
      const { data, error } = await supabase
        .from('usuario_tiendas')
        .select('tienda_id, tiendas(id, nombre, codigo, activo)')
        .eq('usuario_id', userId)
        .eq('activo', true);

      if (error) {
        setError('Error al cargar tus tiendas. Intenta nuevamente.');
        setStores([]);
        return [];
      }

      const userStores = (data || [])
        .filter(ut => ut.tiendas && ut.tiendas.activo)
        .map(ut => ({
          id: ut.tiendas.id,
          nombre: ut.tiendas.nombre,
          codigo: ut.tiendas.codigo
        }));

      setStores(userStores);
      
      if (userStores.length === 1) {
        setSelectedStore(userStores[0].id);
      }

      return userStores;
    } catch (err) {
      setError('Error al cargar tus tiendas. Intenta nuevamente.');
      setStores([]);
      return [];
    } finally {
      setLoadingStores(false);
    }
  };

  // ✅ NUEVO FLUJO: Autenticación en dos pasos
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // PASO 1: Si no hay tiendas cargadas, primero autenticar para obtenerlas
    if (stores.length === 0) {
      setLoading(true);
      
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) {
          if (error.message?.includes('Invalid login credentials')) {
            setError('Email o contraseña incorrectos');
          } else if (error.message?.includes('Email not confirmed')) {
            setError('Tu cuenta aún no ha sido confirmada. Por favor revisa tu correo electrónico y haz clic en el enlace de confirmación. Si no recibiste el correo, contacta al administrador.');
          } else if (error.message?.includes('Email link is invalid or has expired')) {
            setError('El enlace de confirmación ha expirado. Por favor solicita un nuevo enlace de confirmación.');
          } else if (error.message?.includes('User not found')) {
            setError('No existe una cuenta con este correo electrónico');
          } else {
            setError(`Error al iniciar sesión: ${error.message || 'Intenta nuevamente'}`);
          }
          
          setLoading(false);
          return;
        }
        
        if (!data.session?.user) {
          setError('Error al iniciar sesión. Intenta nuevamente.');
          setLoading(false);
          return;
        }
        
        const loadedStores = await loadUserStores(data.session.user.id);
        
        setLoading(false);
        
        if (loadedStores.length === 0) {
          setError('No tienes tiendas asignadas. Contacta al administrador.');
          await supabase.auth.signOut();
        }
        
        return;
      } catch (err: any) {
        setError(`Error inesperado: ${err?.message || 'Intenta nuevamente'}`);
        setLoading(false);
        return;
      }
    }

    // PASO 2: Ya hay tiendas cargadas, validar selección y completar login
    if (!selectedStore) {
      setError('Por favor selecciona una tienda');
      return;
    }

    setLoading(true);

    try {
      const { error } = await signIn(email, password, selectedStore);
      
      if (error) {
        setError(`Error al iniciar sesión: ${error.message || 'Intenta nuevamente'}`);
        setLoading(false);
        
        // Si el error es de acceso a tienda, limpiar y volver a PASO 1
        if (error.message?.includes('No tienes acceso')) {
          setStores([]);
          setSelectedStore('');
        }
      }
    } catch (err: any) {
      setError(`Error inesperado: ${err?.message || 'Intenta nuevamente'}`);
      setLoading(false);
    }
  };

  // Mostrar loading si está autenticando
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-20 w-20 mb-4 flex items-center justify-center">
            <img 
              src="https://static.readdy.ai/image/96746b7ba583c55b81aa58d37fd022fd/8044848901197a0577b8befd634c6da9.png" 
              alt="Logo del Sistema" 
              className="h-16 w-auto object-contain"
            />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            SCO
          </h2>
          <p className="text-gray-600">
            Ingresa a tu cuenta para continuar
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={stores.length > 0}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={stores.length > 0}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 w-10 h-full flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer"
                  tabIndex={-1}
                >
                  <i className={showPassword ? 'ri-eye-off-line text-base' : 'ri-eye-line text-base'} />
                </button>
              </div>
            </div>

            {/* Mostrar selector de tienda solo después de autenticar */}
            {stores.length > 0 && (
              <div>
                <label htmlFor="store" className="block text-sm font-medium text-gray-700 mb-2">
                  Selecciona tu tienda
                </label>
                {loadingStores ? (
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                    Cargando tus tiendas...
                  </div>
                ) : (
                  <select
                    id="store"
                    name="store"
                    required
                    value={selectedStore}
                    onChange={(e) => setSelectedStore(e.target.value)}
                    className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Selecciona una tienda</option>
                    {stores.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.nombre} ({store.codigo})
                      </option>
                    ))}
                  </select>
                )}
                
                {/* Botón para cambiar de usuario */}
                <button
                  type="button"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    setStores([]);
                    setSelectedStore('');
                    setEmail('');
                    setPassword('');
                    setError('');
                  }}
                  className="mt-2 text-sm text-indigo-600 hover:text-indigo-500"
                >
                  ← Usar otra cuenta
                </button>
              </div>
            )}

            {error && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <p className="text-sm text-yellow-700">{error}</p>
              </div>
            )}

            {stores.length === 0 && (
              <div className="flex items-center justify-between">
                <Link
                  to="/auth/forgot-password"
                  className="text-sm text-indigo-600 hover:text-indigo-500"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || loadingStores}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {stores.length === 0 ? 'Verificando...' : 'Iniciando sesión...'}
                </div>
              ) : (
                stores.length === 0 ? 'Continuar' : 'Iniciar sesión'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              ¿No tienes una cuenta?{' '}
              <Link
                to="/auth/register"
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Regístrate aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
