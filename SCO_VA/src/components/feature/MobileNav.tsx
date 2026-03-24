import { useNavigate, useLocation } from 'react-router-dom';

export function MobileNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { path: '/', icon: 'ri-dashboard-line', label: 'Dashboard', permission: 'dashboard:view' },
    { path: '/inventario', icon: 'ri-archive-line', label: 'Inventario', permission: 'inventario:view' },
    { path: '/cotizaciones', icon: 'ri-file-list-3-line', label: 'Cotizaciones', permission: 'cotizaciones:view' },
    { path: '/pedidos', icon: 'ri-shopping-cart-line', label: 'Pedidos', permission: 'pedidos:view' },
    { path: '/clientes', icon: 'ri-user-line', label: 'Clientes', permission: 'clientes:view' },
    { path: '/productos', icon: 'ri-price-tag-3-line', label: 'Productos', permission: 'productos:view' },
    { path: '/facturacion', icon: 'ri-file-text-line', label: 'Facturación', permission: 'facturacion:view' },
    { path: '/mantenimiento', icon: 'ri-tools-line', label: 'Mantenimiento', permission: 'mantenimiento:view' },
    { path: '/tareas', icon: 'ri-task-line', label: 'Tareas', permission: 'tareas:view' },
    { path: '/optimizador', icon: 'ri-layout-grid-line', label: 'Optimizador', permission: 'optimizador:view' },
    // { path: '/facturacion/emision', icon: 'ri-file-add-line', label: 'Emisión', permission: 'facturacion:create' }, // DESHABILITADO TEMPORALMENTE
    { path: '/seguimiento', icon: 'ri-map-pin-line', label: 'Seguimiento', permission: 'seguimiento:view' },
    { path: '/tabla-datos-tareas', icon: 'ri-bar-chart-box-line', label: 'Análisis', permission: 'tareas:view' },
    { path: '/seguridad', icon: 'ri-shield-user-line', label: 'Seguridad', permission: 'seguridad:view' },
  ];

  const navItems = [
    { icon: 'ri-dashboard-line', label: 'Dashboard', path: '/dashboard' },
    { icon: 'ri-archive-line', label: 'Inventario', path: '/inventario' },
    { icon: 'ri-product-hunt-line', label: 'Productos', path: '/productos' },
    { icon: 'ri-user-line', label: 'Clientes', path: '/clientes' },
    {
      name: 'Cotizaciones',
      href: '/cotizaciones',
      icon: 'ri-file-list-3-line',
      current: location.pathname === '/cotizaciones'
    },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="lg:hidden">
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        {/* Logo */}
        <div className="flex items-center justify-center p-4 border-b border-gray-200">
          <img 
            src="https://static.readdy.ai/image/96746b7ba583c55b81aa58d37fd022fd/8044848901197a0577b8befd634c6da9.png"
            alt="Logo Sistema de Gestión"
            className="h-10 w-10 object-contain"
          />
        </div>
        <div className="grid grid-cols-5 h-16">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center space-y-1 transition-colors cursor-pointer ${
                isActive(item.path)
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className={`${item.icon} text-xl`}></i>
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default MobileNav;
