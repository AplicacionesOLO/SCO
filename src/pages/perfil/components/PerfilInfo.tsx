import { User } from '@supabase/supabase-js';
import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useNotification } from '../../../hooks/useNotification';

interface UserProfile {
  id: string;
  email: string;
  nombre_completo: string;
  rol: string;
  activo: boolean;
  permisos: string[];
}

interface PerfilInfoProps {
  user: User;
  profile: UserProfile;
}

export default function PerfilInfo({ user, profile }: PerfilInfoProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const { showNotification } = useNotification();

  // Formatear fecha de creación
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calcular último acceso (simulado por ahora)
  const getLastAccess = () => {
    return new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordData.newPassword || !passwordData.confirmPassword || !passwordData.currentPassword) {
      setPasswordError('Por favor completa todos los campos');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Las contraseñas no coinciden');
      return;
    }

    if (passwordData.newPassword === passwordData.currentPassword) {
      setPasswordError('La nueva contraseña debe ser diferente a la contraseña actual');
      return;
    }

    setIsChangingPassword(true);
    setPasswordError('');

    try {
      // Primero verificar la contraseña actual intentando hacer login
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: passwordData.currentPassword,
      });

      if (signInError) {
        setPasswordError('La contraseña actual es incorrecta');
        setIsChangingPassword(false);
        return;
      }

      // Si la verificación es exitosa, cambiar la contraseña
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) {
        // Manejar el error específico de contraseña igual
        if (error.message.includes('New password should be different')) {
          setPasswordError('La nueva contraseña debe ser diferente a la contraseña actual. Por favor elige una contraseña diferente.');
        } else {
          setPasswordError(error.message);
        }
        setIsChangingPassword(false);
        return;
      }

      // Éxito
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordModal(false);
      
      // Mostrar notificación de éxito
      const successNotification = document.createElement('div');
      successNotification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in';
      successNotification.innerHTML = `
        <div class="flex items-center gap-2">
          <i class="ri-check-line text-xl"></i>
          <span>Contraseña actualizada correctamente</span>
        </div>
      `;
      document.body.appendChild(successNotification);
      
      setTimeout(() => {
        successNotification.remove();
      }, 3000);

    } catch (error: any) {
      console.error('Error al cambiar contraseña:', error);
      if (error.message.includes('New password should be different')) {
        setPasswordError('La nueva contraseña debe ser diferente a la contraseña actual. Por favor elige una contraseña diferente.');
      } else {
        setPasswordError('Error al cambiar la contraseña. Por favor intenta nuevamente.');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Información Personal */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Información Personal</h3>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <i className="ri-edit-line mr-2"></i>
            {isEditing ? 'Cancelar' : 'Editar'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nombre Completo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre Completo
            </label>
            {isEditing ? (
              <input
                type="text"
                defaultValue={profile.nombre_completo}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              <p className="text-gray-900 bg-white px-3 py-2 rounded-lg border border-gray-200">
                {profile.nombre_completo}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Correo Electrónico
            </label>
            {isEditing ? (
              <input
                type="email"
                defaultValue={profile.email}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              <p className="text-gray-900 bg-white px-3 py-2 rounded-lg border border-gray-200">
                {profile.email}
              </p>
            )}
          </div>

          {/* ID de Usuario */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ID de Usuario
            </label>
            <p className="text-gray-600 bg-gray-100 px-3 py-2 rounded-lg border border-gray-200 font-mono text-sm">
              {user.id}
            </p>
          </div>

          {/* Rol */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rol Asignado
            </label>
            <div className="flex items-center">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                profile.rol === 'Admin' 
                  ? 'bg-purple-100 text-purple-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                <i className="ri-shield-user-line mr-1"></i>
                {profile.rol}
              </span>
            </div>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado de la Cuenta
            </label>
            <div className="flex items-center">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                profile.activo 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                <i className={`${profile.activo ? 'ri-check-line' : 'ri-close-line'} mr-1`}></i>
                {profile.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </div>

          {/* Fecha de Creación */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de Registro
            </label>
            <p className="text-gray-600 bg-gray-100 px-3 py-2 rounded-lg border border-gray-200">
              <i className="ri-calendar-line mr-2"></i>
              {formatDate(user.created_at)}
            </p>
          </div>
        </div>

        {/* Información Adicional */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-md font-medium text-gray-900 mb-4">Información de Sesión</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center">
                <i className="ri-time-line text-green-500 mr-3"></i>
                <div>
                  <p className="text-sm font-medium text-gray-900">Último Acceso</p>
                  <p className="text-sm text-gray-600">{getLastAccess()}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center">
                <i className="ri-shield-check-line text-blue-500 mr-3"></i>
                <div>
                  <p className="text-sm font-medium text-gray-900">Verificación</p>
                  <p className="text-sm text-gray-600">
                    {user.email_confirmed_at ? 'Email verificado' : 'Email pendiente'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Botones de Acción */}
        {isEditing && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex space-x-4">
              <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <i className="ri-save-line mr-2"></i>
                Guardar Cambios
              </button>
              <button 
                onClick={() => setIsEditing(false)}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                <i className="ri-close-line mr-2"></i>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Cambiar Contraseña */}
        {!isEditing && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-md font-medium text-gray-900 mb-4">Seguridad</h4>
            <button 
              onClick={() => setShowPasswordModal(true)}
              className="px-4 py-2 text-sm font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
            >
              <i className="ri-lock-line mr-2"></i>
              Cambiar Contraseña
            </button>
          </div>
        )}
      </div>

      {/* Modal Cambiar Contraseña */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                  <i className="ri-lock-line text-orange-600 text-xl"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Cambiar Contraseña</h3>
              </div>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  setPasswordError('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleChangePassword} className="p-6 space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Por seguridad, ingresa tu contraseña actual y luego tu nueva contraseña.
              </p>

              {/* Error Message */}
              {passwordError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
                  <i className="ri-error-warning-line text-xl mr-2 flex-shrink-0 mt-0.5"></i>
                  <span className="text-sm">{passwordError}</span>
                </div>
              )}

              {/* Contraseña Actual */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña Actual
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Tu contraseña actual"
                  required
                />
              </div>

              {/* Nueva Contraseña */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Mínimo 6 caracteres"
                  required
                />
              </div>

              {/* Confirmar Contraseña */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Repite la nueva contraseña"
                  required
                />
              </div>

              {/* Indicador de validación */}
              {passwordData.newPassword && (
                <div className="space-y-2 bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center text-sm">
                    <i className={`${passwordData.newPassword.length >= 6 ? 'ri-check-line text-green-500' : 'ri-close-line text-red-500'} mr-2`}></i>
                    <span className={passwordData.newPassword.length >= 6 ? 'text-green-600' : 'text-red-600'}>
                      Al menos 6 caracteres
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <i className={`${passwordData.newPassword === passwordData.confirmPassword && passwordData.confirmPassword ? 'ri-check-line text-green-500' : 'ri-close-line text-gray-400'} mr-2`}></i>
                    <span className={passwordData.newPassword === passwordData.confirmPassword && passwordData.confirmPassword ? 'text-green-600' : 'text-gray-500'}>
                      Las contraseñas coinciden
                    </span>
                  </div>
                  {passwordData.currentPassword && passwordData.newPassword && (
                    <div className="flex items-center text-sm">
                      <i className={`${passwordData.newPassword !== passwordData.currentPassword ? 'ri-check-line text-green-500' : 'ri-close-line text-red-500'} mr-2`}></i>
                      <span className={passwordData.newPassword !== passwordData.currentPassword ? 'text-green-600' : 'text-red-600'}>
                        Diferente a la contraseña actual
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Información de seguridad */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start">
                  <i className="ri-information-line text-blue-600 mr-2 mt-0.5"></i>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Recomendaciones de seguridad:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Usa al menos 8 caracteres</li>
                      <li>Combina letras mayúsculas y minúsculas</li>
                      <li>Incluye números y símbolos</li>
                      <li>No uses información personal</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    setPasswordError('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isChangingPassword}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword || passwordData.newPassword !== passwordData.confirmPassword || passwordData.newPassword.length < 6}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isChangingPassword ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Cambiando...
                    </>
                  ) : (
                    <>
                      <i className="ri-save-line mr-2"></i>
                      Cambiar Contraseña
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}