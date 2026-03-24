import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import PerfilLayout from './components/PerfilLayout';
import PerfilInfo from './components/PerfilInfo';
import PerfilPermisos from './components/PerfilPermisos';

export default function PerfilPage() {
  const { user, profile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('info');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <i className="ri-user-line text-6xl text-gray-300 mb-4"></i>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Acceso no autorizado</h2>
          <p className="text-gray-500">Debes iniciar sesión para ver tu perfil</p>
        </div>
      </div>
    );
  }

  return (
    <PerfilLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <i className="ri-user-line text-2xl text-blue-600"></i>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>
              <p className="text-gray-600">Gestiona tu información personal y configuración</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('info')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'info'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="ri-user-line mr-2"></i>
                Información Personal
              </button>
              <button
                onClick={() => setActiveTab('permisos')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'permisos'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="ri-shield-user-line mr-2"></i>
                Permisos y Roles
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'info' && <PerfilInfo user={user} profile={profile} />}
            {activeTab === 'permisos' && <PerfilPermisos profile={profile} />}
          </div>
        </div>
      </div>
    </PerfilLayout>
  );
}