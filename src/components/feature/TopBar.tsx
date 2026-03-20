import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import ConfirmationDialog from '../base/ConfirmationDialog';

interface TopBarProps {
  onToggleSidebar: () => void;
}

export default function TopBar({ onToggleSidebar }: TopBarProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showContactSuccessDialog, setShowContactSuccessDialog] = useState(false);
  const navigate = useNavigate();
  const { user, profile, signOut, stores, currentStore, setCurrentStore } = useAuth();
  const { hasPermission } = usePermissions();
  const isAdmin = hasPermission('seguridad:view');

  const handleStoreChange = async (storeId: string) => {
    try {
      await setCurrentStore(storeId);
    } catch (error) {
      // store change error handled silently
    }
  };

  const handleProfileClick = () => {
    setShowUserMenu(false);
    navigate('/perfil');
  };

  const handleConfigClick = () => {
    setShowUserMenu(false);
    navigate('/seguridad');
  };

  const handleContactClick = () => {
    setShowUserMenu(false);
    setShowContactModal(true);
  };

  const handleLogout = async () => {
    setShowUserMenu(false);
    setShowLogoutDialog(true);
  };

  const confirmLogout = async () => {
    setShowLogoutDialog(false);
    try {
      await signOut();
    } catch (error) {
      window.location.href = '/login';
    }
  };

  const closeContactModal = () => {
    setShowContactModal(false);
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowContactSuccessDialog(true);
    setShowContactModal(false);
  };

  // Obtener iniciales del usuario
  const getUserInitials = () => {
    if (!profile?.nombre_completo) return 'U';
    const names = profile.nombre_completo.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return profile.nombre_completo[0].toUpperCase();
  };

  // Obtener nombre para mostrar
  const getDisplayName = () => {
    if (!profile?.nombre_completo) return 'Usuario';
    return profile.nombre_completo;
  };

  // Obtener email para mostrar
  const getDisplayEmail = () => {
    if (!profile?.email) return user?.email || 'Sin email';
    return profile.email;
  };

  // Navegar a inicio
  const handleLogoClick = () => {
    navigate('/dashboard');
  };

  return (
    <>
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer lg:hidden"
              title="Abrir menú"
            >
              <i className="ri-menu-line text-xl text-gray-600"></i>
            </button>
            
            {/* Logo mejorado en TopBar - AHORA CLICKEABLE */}
            <div 
              onClick={handleLogoClick}
              className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
              title="Ir al inicio"
            >
              <div className="w-10 h-10 flex items-center justify-center">
                <img 
                  src="https://static.readdy.ai/image/96746b7ba583c55b81aa58d37fd022fd/8044848901197a0577b8befd634c6da9.png" 
                  alt="Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: '"Pacifico", serif' }}>
                  SCO
                </h1>
                <p className="text-sm text-gray-500 -mt-1">Sistema de Costeos OLO</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Selector de Tienda */}
            {currentStore && (
              <div className="hidden md:flex items-center space-x-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
                <i className="ri-store-2-line text-blue-600"></i>
                <span className="text-sm font-medium text-blue-900">{currentStore.nombre}</span>
              </div>
            )}

            {/* Botones de acción */}
            <button 
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              title="Notificaciones"
            >
              <i className="ri-notification-line text-xl text-gray-600"></i>
              {/* Badge de notificaciones */}
              <span className="absolute -mt-8 ml-4 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            
            <button 
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              title="Búsqueda global"
            >
              <i className="ri-search-line text-xl text-gray-600"></i>
            </button>

            {/* Menú de usuario */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                title="Menú de usuario"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-white text-sm font-medium">{getUserInitials()}</span>
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-sm font-medium text-gray-900">{getDisplayName()}</div>
                  <div className="text-xs text-gray-500">{getDisplayEmail()}</div>
                </div>
                <i className={`ri-arrow-${showUserMenu ? 'up' : 'down'}-s-line text-gray-600 transition-transform`}></i>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center shadow-sm">
                        <span className="text-white text-lg font-medium">{getUserInitials()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{getDisplayName()}</div>
                        <div className="text-xs text-gray-500 truncate">{getDisplayEmail()}</div>
                        {profile?.rol && (
                          <div className="text-xs text-purple-600 font-medium mt-1">
                            <i className="ri-shield-user-line mr-1"></i>
                            {profile.rol}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Tienda actual en el menú */}
                  {currentStore && (
                    <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
                      <div className="flex items-center space-x-2">
                        <i className="ri-store-2-line text-blue-600 text-sm"></i>
                        <div>
                          <p className="text-xs text-gray-600">Tienda actual:</p>
                          <p className="text-sm font-medium text-blue-900">{currentStore.nombre}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="py-1">
                    <button 
                      onClick={handleProfileClick}
                      className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <i className="ri-user-line mr-3 text-gray-400 w-4"></i>
                      Mi Perfil
                    </button>
                    {isAdmin && (
                      <button 
                        onClick={handleConfigClick}
                        className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        <i className="ri-settings-line mr-3 text-gray-400 w-4"></i>
                        Configuración
                      </button>
                    )}
                    <button 
                      onClick={handleContactClick}
                      className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <i className="ri-phone-line mr-3 text-gray-400 w-4"></i>
                      Contáctenos
                    </button>
                    <hr className="my-1" />
                    <button 
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <i className="ri-logout-box-line mr-3 w-4"></i>
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Contacto */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Contáctenos</h3>
              <button
                onClick={closeContactModal}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            
            <form onSubmit={handleContactSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Asunto
                  </label>
                  <select 
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer"
                  >
                    <option value="">Seleccione un asunto</option>
                    <option value="soporte_tecnico">Soporte Técnico</option>
                    <option value="consulta_comercial">Consulta Comercial</option>
                    <option value="reporte_error">Reporte de Error</option>
                    <option value="solicitud_mejora">Solicitud de Mejora</option>
                    <option value="capacitacion">Capacitación</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prioridad
                  </label>
                  <select 
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer"
                  >
                    <option value="">Seleccione prioridad</option>
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Crítica</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mensaje
                  </label>
                  <textarea
                    required
                    rows={4}
                    maxLength={500}
                    placeholder="Describa su consulta o problema..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-colors"
                  ></textarea>
                  <p className="text-xs text-gray-500 mt-1">Máximo 500 caracteres</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono de contacto (opcional)
                  </label>
                  <input
                    type="tel"
                    placeholder="Ej: +506 8888-8888"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={closeContactModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Enviar Mensaje
                </button>
              </div>
            </form>

            {/* Información de contacto adicional */}
            <div className="px-6 pb-6 border-t border-gray-200 pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Otros medios de contacto:</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <i className="ri-mail-line text-blue-500"></i>
                  <span>soporte@sco.com</span>
                </div>
                <div className="flex items-center space-x-2">
                  <i className="ri-phone-line text-green-500"></i>
                  <span>+506 2222-2222</span>
                </div>
                <div className="flex items-center space-x-2">
                  <i className="ri-whatsapp-line text-green-500"></i>
                  <span>+506 8888-8888</span>
                </div>
                <div className="flex items-center space-x-2">
                  <i className="ri-time-line text-orange-500"></i>
                  <span>Lun-Vie: 8:00 AM - 6:00 PM</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Success Dialog */}
      <ConfirmationDialog
        isOpen={showContactSuccessDialog}
        onClose={() => setShowContactSuccessDialog(false)}
        onConfirm={() => setShowContactSuccessDialog(false)}
        title="Mensaje Enviado"
        message={
          <div className="text-center">
            <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-4">
              <i className="ri-check-line text-2xl text-green-600"></i>
            </div>
            <p className="text-gray-600">
              ✅ Mensaje enviado exitosamente. Nos pondremos en contacto pronto.
            </p>
          </div>
        }
        type="success"
        confirmText="Entendido"
        showCancel={false}
      />

      {/* Dialog de Confirmación de Logout */}
      <ConfirmationDialog
        isOpen={showLogoutDialog}
        type="warning"
        title="Cerrar Sesión"
        message="¿Está seguro que desea cerrar sesión? Deberá iniciar sesión nuevamente para acceder al sistema."
        confirmText="Sí, Cerrar Sesión"
        cancelText="Cancelar"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutDialog(false)}
      />
    </>
  );
}
