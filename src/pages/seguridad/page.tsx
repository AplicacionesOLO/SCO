import React, { useState } from 'react';
import { SeguridadLayout } from './components/SeguridadLayout';
import { UsuariosTab } from './components/UsuariosTab';
import { UsuariosPendientesTab } from './components/UsuariosPendientesTab';
import { RolesTab } from './components/RolesTab';
import { PermisosTab } from './components/PermisosTab';
import { PermissionMatrix } from '../../components/security/PermissionMatrix';
import { PermissionWrapper } from '../../components/base/PermissionWrapper';
import { supabase } from '../../lib/supabase';
import { TiendasTab } from './components/TiendasTab';

type TabType = 'usuarios' | 'pendientes' | 'roles' | 'permisos' | 'matriz' | 'tiendas' | 'password';

export default function SeguridadPage() {
  const [activeTab, setActiveTab] = useState<TabType>('usuarios');
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const tabs = [
    { id: 'usuarios' as TabType, name: 'Usuarios', icon: 'ri-user-line' },
    { 
      id: 'pendientes' as TabType, 
      name: 'Usuarios Pendientes', 
      icon: 'ri-time-line',
      permission: 'seguridad:usuarios:view_pendientes'
    },
    { id: 'roles' as TabType, name: 'Roles', icon: 'ri-shield-user-line' },
    { id: 'permisos' as TabType, name: 'Permisos', icon: 'ri-key-line' },
    { id: 'matriz' as TabType, name: 'Matriz de Permisos', icon: 'ri-grid-line' },
    {
      id: 'tiendas' as TabType,
      name: 'Tiendas',
      icon: 'ri-store-2-line',
      permission: 'tiendas:view'
    },
    { id: 'password' as TabType, name: 'Cambiar Contraseña', icon: 'ri-lock-password-line' }
  ];

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    // Validaciones
    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Por favor complete todos los campos' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Las contraseñas no coinciden' });
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      setPasswordMessage({ type: 'success', text: 'Contraseña actualizada exitosamente' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      console.error('Error cambiando contraseña:', error);
      setPasswordMessage({ type: 'error', text: error.message || 'Error al cambiar la contraseña' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const renderPasswordTab = () => (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cambiar Contraseña</h3>
        
        {passwordMessage && (
          <div className={`p-4 rounded-lg mb-4 ${
            passwordMessage.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            <div className="flex items-center">
              <i className={`${passwordMessage.type === 'success' ? 'ri-check-line' : 'ri-error-warning-line'} mr-2`}></i>
              {passwordMessage.text}
            </div>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nueva Contraseña
            </label>
            <input
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ingrese la nueva contraseña"
              minLength={6}
            />
            <p className="text-xs text-gray-500 mt-1">Mínimo 6 caracteres</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar Nueva Contraseña
            </label>
            <input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Confirme la nueva contraseña"
            />
          </div>

          <button
            type="submit"
            disabled={passwordLoading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors cursor-pointer whitespace-nowrap"
          >
            {passwordLoading ? (
              <>
                <i className="ri-loader-4-line animate-spin mr-2"></i>
                Actualizando...
              </>
            ) : (
              <>
                <i className="ri-lock-password-line mr-2"></i>
                Cambiar Contraseña
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'usuarios':
        return <UsuariosTab />;
      case 'pendientes':
        return (
          <PermissionWrapper permission="seguridad:usuarios:view_pendientes">
            <UsuariosPendientesTab />
          </PermissionWrapper>
        );
      case 'roles':
        return <RolesTab />;
      case 'permisos':
        return <PermisosTab />;
      case 'matriz':
        return (
          <PermissionMatrix 
            onSave={() => {
              console.log('Permisos guardados exitosamente');
            }}
          />
        );
      case 'password':
        return renderPasswordTab();
      case 'tiendas':
        return (
          <PermissionWrapper permission="tiendas:view">
            <TiendasTab />
          </PermissionWrapper>
        );
      default:
        return null;
    }
  };

  return (
    <SeguridadLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Seguridad</h1>
          <p className="text-gray-600">Gestiona usuarios, roles y permisos del sistema</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              // Si la pestaña requiere permisos, verificar antes de mostrarla
              if (tab.permission) {
                return (
                  <PermissionWrapper key={tab.id} permission={tab.permission}>
                    <button
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center cursor-pointer ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <i className={`${tab.icon} mr-2`}></i>
                      {tab.name}
                    </button>
                  </PermissionWrapper>
                );
              }

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center cursor-pointer ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <i className={`${tab.icon} mr-2`}></i>
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {renderTabContent()}
        </div>
      </div>
    </SeguridadLayout>
  );
}
