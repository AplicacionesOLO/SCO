import { useAuth } from '../../hooks/useAuth';

export default function PendingStorePage() {
  const { signOut, profile } = useAuth();

  const handleLogout = () => {
    signOut();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {/* Icono de espera */}
          <div className="mx-auto h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center mb-6">
            <i className="ri-time-line text-yellow-600 text-2xl"></i>
          </div>
          
          {/* Mensaje principal */}
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Cuenta Pendiente de Activación
          </h2>
          
          <div className="space-y-4 text-gray-600">
            <p>
              ¡Hola <strong>{profile?.nombre_completo}</strong>!
            </p>
            
            <p>
              Tu cuenta ha sido creada exitosamente, pero está pendiente de asignación de tienda por parte de un administrador.
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 text-sm">
              <div className="flex items-start">
                <i className="ri-information-line text-yellow-600 mt-0.5 mr-2"></i>
                <div>
                  <p className="font-medium text-yellow-800 mb-1">
                    ¿Qué necesitas hacer?
                  </p>
                  <p className="text-yellow-700">
                    Contacta a tu administrador del sistema para que te asigne una tienda y puedas acceder a todas las funcionalidades.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm">
              <div className="flex items-start">
                <i className="ri-mail-line text-blue-600 mt-0.5 mr-2"></i>
                <div>
                  <p className="font-medium text-blue-800 mb-1">
                    Tu información de contacto:
                  </p>
                  <p className="text-blue-700">
                    {profile?.email}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Botón de cerrar sesión */}
          <div className="mt-8">
            <button
              onClick={handleLogout}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              <i className="ri-logout-circle-line mr-2"></i>
              Cerrar Sesión
            </button>
          </div>
          
          {/* Footer informativo */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Una vez que se te asigne una tienda, podrás iniciar sesión normalmente y acceder a todas las funcionalidades del sistema.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}