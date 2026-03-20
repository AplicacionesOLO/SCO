
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function CallbackPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Procesando callback de autenticación...');
        
        // Obtener los parámetros de la URL
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error en callback:', error);
          setError('Error al confirmar el correo electrónico');
          return;
        }

        if (data.session?.user) {
          console.log('Usuario confirmado exitosamente:', data.session.user.id);
          
          // Crear perfil en BD ahora que el email está confirmado
          try {
            const user = data.session.user;
            
            // Verificar si el usuario ya existe en la tabla
            const { data: existingUser } = await supabase
              .from('usuarios')
              .select('id')
              .eq('email', user.email)
              .single();

            const perfilData = {
              id: user.id,
              email: user.email,
              nombre_completo: user.user_metadata?.nombre_completo || user.email || 'Usuario',
              rol: 'Usuario',
              activo: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            if (existingUser) {
              console.log('Usuario ya existe en BD, actualizando información...');
              await supabase
                .from('usuarios')
                .update({
                  nombre_completo: perfilData.nombre_completo,
                  updated_at: new Date().toISOString(),
                })
                .eq('email', user.email);
            } else {
              console.log('Creando perfil en BD...');
              await supabase
                .from('usuarios')
                .insert([perfilData]);
            }
            
            console.log('Perfil creado/actualizado exitosamente');
          } catch (profileError) {
            console.error('Error creando perfil en BD:', profileError);
            // No es crítico, el usuario puede usar la aplicación
          }
          
          // Redirigir al dashboard
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 2000);
        } else {
          console.log('No hay sesión activa');
          setError('No se pudo confirmar el correo electrónico');
        }
      } catch (error) {
        console.error('Error procesando callback:', error);
        setError('Error inesperado al confirmar el correo');
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Confirmando tu correo electrónico...
          </h2>
          <p className="text-gray-600">
            Por favor espera mientras procesamos tu confirmación
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <i className="ri-error-warning-line text-red-600 text-xl"></i>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Error de Confirmación
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Ir al Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
          <i className="ri-check-line text-green-600 text-xl"></i>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          ¡Correo Confirmado Exitosamente!
        </h2>
        <p className="text-gray-600 mb-4">
          Tu cuenta ha sido verificada. Redirigiendo al dashboard...
        </p>
        <div className="animate-pulse text-blue-600">
          Redirigiendo en unos segundos...
        </div>
      </div>
    </div>
  );
}
