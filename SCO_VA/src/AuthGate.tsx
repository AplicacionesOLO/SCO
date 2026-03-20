import { useAuth } from './hooks/useAuth';
import PendingStorePage from './pages/auth/PendingStorePage';

interface AuthGateProps {
  children: React.ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const { loading, isAuthenticated, needsStoreAssignment, user, profile } = useAuth();

  // Mostrar loading mientras se verifica la autenticación
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // Si el usuario está autenticado pero necesita asignación de tienda
  if (user && profile && needsStoreAssignment) {
    return <PendingStorePage />;
  }

  // Si está autenticado y tiene tienda asignada, mostrar la aplicación
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Si no está autenticado, mostrar la aplicación (que redirigirá al login)
  return <>{children}</>;
}
