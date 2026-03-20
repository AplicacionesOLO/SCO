import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { useState } from 'react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuth();
  const { hasPermission, hasRole, permissions, isAdmin } = usePermissions();
  const [isHovered, setIsHovered] = useState(false);

  const menuItems = [
    {
      name: 'Dashboard',
      icon: 'ri-dashboard-line',
      path: '/dashboard',
      permission: 'dashboard:view'
    },
    {
      name: 'Clientes',
      icon: 'ri-user-line',
      path: '/clientes',
      permission: 'clientes:view'
    },
    {
      name: 'Productos',
      icon: 'ri-product-hunt-line',
      path: '/productos',
      permission: 'productos:view'
    },
    {
      name: 'Inventario',
      icon: 'ri-store-line',
      path: '/inventario',
      permission: 'inventario:view'
    },
    {
      name: 'Mantenimiento',
      icon: 'ri-tools-line',
      path: '/mantenimiento',
      permission: 'mantenimiento:view'
    },
    {
      name: 'Cotizaciones',
      icon: 'ri-file-text-line',
      path: '/cotizaciones',
      permission: 'cotizaciones:view'
    },
    {
      name: 'Pedidos',
      icon: 'ri-shopping-cart-line',
      path: '/pedidos',
      permission: 'pedidos:view'
    },
    {
      name: 'Seguimiento',
      icon: 'ri-route-line',
      path: '/seguimiento',
      permission: 'seguimiento:view'
    },
    {
      name: 'Tareas',
      icon: 'ri-task-line',
      path: '/tareas',
      permission: 'tareas:view'
    },
    {
      name: 'Análisis Tareas',
      icon: 'ri-bar-chart-box-line',
      path: '/tabla-datos-tareas',
      permission: 'tareas:view'
    },
    {
      name: 'Correspondencia',
      icon: 'ri-mail-send-line',
      path: '/correspondencia',
      requireAuth: true
    },
    {
      name: 'Facturación',
      icon: 'ri-bill-line',
      path: '/facturacion',
      permission: 'facturacion:view'
    },
    {
      name: 'Emisión de Factura',
      icon: 'ri-file-add-line',
      path: '/facturacion/emision',
      permission: 'facturacion:emision:view'
    },
    {
      name: 'Seguridad',
      icon: 'ri-shield-user-line',
      path: '/seguridad',
      role: 'Admin'
    },
    {
      name: 'CostBot Admin',
      icon: 'ri-robot-line',
      path: '/costbot-admin',
      role: 'Admin'
    },
    {
      name: 'Perfil',
      icon: 'ri-user-settings-line',
      path: '/perfil',
      requireAuth: true
    }
  ];

  const shouldShowItem = (item: typeof menuItems[0]) => {
    // Admin ve todo siempre
    if (isAdmin) return true;

    if (item.role) {
      return hasRole(item.role);
    }
    if (item.permission) {
      // Verificación directa con :view
      if (hasPermission(item.permission)) return true;

      // Si el usuario tiene CUALQUIER permiso del módulo, mostrar el ítem
      // Ej: si tiene tareas:create o tareas:update pero no tareas:view, igual se muestra
      const baseModule = item.permission.split(':')[0];
      return permissions.some(p => p === baseModule || p.startsWith(`${baseModule}:`));
    }
    if (item.requireAuth) {
      return !!user;
    }
    return true;
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <>
      {/* Overlay para móvil */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar con hover toggle */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          bg-white border-r border-gray-200
          transform transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isHovered ? 'lg:w-64' : 'lg:w-20'}
        `}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          <Link to="/dashboard" className="flex items-center space-x-3 overflow-hidden">
            <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
              <img 
                src="https://static.readdy.ai/image/96746b7ba583c55b81aa58d37fd022fd/8044848901197a0577b8befd634c6da9.png" 
                alt="Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <div className={`transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'lg:opacity-0 lg:w-0'}`}>
              <h1 className="text-xl font-bold text-gray-900 whitespace-nowrap" style={{ fontFamily: '"Pacifico", serif' }}>
                SCO
              </h1>
              <p className="text-xs text-gray-500 -mt-1 whitespace-nowrap">Sistema de Costeos OLO</p>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        {/* Menú */}
        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
          {menuItems.filter(shouldShowItem).map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={`
                flex items-center space-x-3 px-4 py-3 rounded-lg
                transition-colors duration-200 cursor-pointer
                ${
                  isActive(item.path)
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              <i className={`${item.icon} text-xl flex-shrink-0`}></i>
              <span className={`transition-opacity duration-300 whitespace-nowrap ${isHovered ? 'opacity-100' : 'lg:opacity-0 lg:w-0 lg:hidden'}`}>
                {item.name}
              </span>
            </Link>
          ))}

          {/* Optimizador de Cortes 2D */}
          {hasPermission('optimizador:view') && (
            <Link
              to="/optimizador"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer ${
                location.pathname === '/optimizador'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <i className="ri-layout-grid-line text-xl flex-shrink-0"></i>
              <span className={`font-medium transition-opacity duration-300 whitespace-nowrap ${isHovered ? 'opacity-100' : 'lg:opacity-0 lg:w-0 lg:hidden'}`}>
                Optimizador 2D
              </span>
            </Link>
          )}
        </nav>
      </aside>
    </>
  );
}
