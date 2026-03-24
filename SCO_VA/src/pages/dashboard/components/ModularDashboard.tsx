import { useState, useEffect } from 'react';
import ModuleCard from './ModuleCard';
import { usePermissions } from '../../../hooks/usePermissions';
import { dashboardService, DashboardStats } from '../../../services/dashboardService';

export default function ModularDashboard() {
  const { hasPermission, canRead } = usePermissions();
  const [stats, setStats] = useState<DashboardStats>({
    totalInventory: 0,
    totalValue: 0,
    activeQuotes: 0,
    pendingRequests: 0,
    totalClients: 0,
    productsWithBOM: 0,
    lowStockItems: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const statsData = await dashboardService.getStats();
      setStats(statsData);
    } catch (error) {
      // silencioso
    } finally {
      setLoading(false);
    }
  };

  // Definición de módulos con sus permisos
  const modules = [
    // INVENTARIO
    {
      id: 'inventario',
      permission: 'inventario:view',
      title: 'Inventario',
      description: 'Control de stock y artículos',
      icon: 'ri-archive-line',
      color: 'bg-blue-600',
      gradient: 'bg-gradient-to-r from-blue-500 to-blue-600',
      value: stats.totalInventory.toLocaleString(),
      subtitle: 'artículos en stock',
      change: stats.lowStockItems > 0 ? `${stats.lowStockItems} bajo stock` : 'Stock normal',
      changeType: stats.lowStockItems > 0 ? 'warning' as const : 'positive' as const,
      route: '/inventario'
    },
    // COTIZACIONES
    {
      id: 'cotizaciones',
      permission: 'cotizaciones:view',
      title: 'Cotizaciones',
      description: 'Gestión de cotizaciones',
      icon: 'ri-file-text-line',
      color: 'bg-purple-600',
      gradient: 'bg-gradient-to-r from-purple-500 to-purple-600',
      value: stats.activeQuotes.toString(),
      subtitle: 'cotizaciones activas',
      change: stats.activeQuotes > 0 ? 'En proceso' : 'Sin cotizaciones',
      changeType: stats.activeQuotes > 0 ? 'positive' as const : 'neutral' as const,
      route: '/cotizaciones'
    },
    // PEDIDOS
    {
      id: 'pedidos',
      permission: 'pedidos:view',
      title: 'Pedidos',
      description: 'Gestión de pedidos',
      icon: 'ri-shopping-cart-line',
      color: 'bg-green-600',
      gradient: 'bg-gradient-to-r from-green-500 to-green-600',
      value: stats.pendingRequests.toString(),
      subtitle: 'pedidos pendientes',
      change: stats.pendingRequests > 0 ? 'Requieren atención' : 'Al día',
      changeType: stats.pendingRequests > 0 ? 'warning' as const : 'positive' as const,
      route: '/pedidos'
    },
    // CLIENTES
    {
      id: 'clientes',
      permission: 'clientes:view',
      title: 'Clientes',
      description: 'Base de datos de clientes',
      icon: 'ri-user-line',
      color: 'bg-indigo-600',
      gradient: 'bg-gradient-to-r from-indigo-500 to-indigo-600',
      value: stats.totalClients.toString(),
      subtitle: 'clientes registrados',
      change: 'Activos',
      changeType: 'positive' as const,
      route: '/clientes'
    },
    // PRODUCTOS
    {
      id: 'productos',
      permission: 'productos:view',
      title: 'Productos',
      description: 'Catálogo de productos',
      icon: 'ri-product-hunt-line',
      color: 'bg-orange-600',
      gradient: 'bg-gradient-to-r from-orange-500 to-orange-600',
      value: stats.productsWithBOM.toString(),
      subtitle: 'productos con BOM',
      change: 'Configurados',
      changeType: 'positive' as const,
      route: '/productos'
    },
    // FACTURACIÓN
    {
      id: 'facturacion',
      permission: 'facturacion:view',
      title: 'Facturación',
      description: 'Facturación electrónica',
      icon: 'ri-file-list-3-line',
      color: 'bg-teal-600',
      gradient: 'bg-gradient-to-r from-teal-500 to-teal-600',
      value: new Intl.NumberFormat('es-CR', {
        style: 'currency',
        currency: 'CRC',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(stats.totalValue),
      subtitle: 'valor total facturado',
      change: 'Actualizado',
      changeType: 'positive' as const,
      route: '/facturacion'
    },
    // MANTENIMIENTO
    {
      id: 'mantenimiento',
      permission: 'mantenimiento:view',
      title: 'Mantenimiento',
      description: 'Control de inventario avanzado',
      icon: 'ri-tools-line',
      color: 'bg-red-600',
      gradient: 'bg-gradient-to-r from-red-500 to-red-600',
      value: stats.lowStockItems.toString(),
      subtitle: 'alertas activas',
      change: stats.lowStockItems > 0 ? 'Requiere atención' : 'Todo normal',
      changeType: stats.lowStockItems > 0 ? 'negative' as const : 'positive' as const,
      route: '/mantenimiento'
    },
    // TAREAS
    {
      id: 'tareas',
      permission: 'tareas:view',
      title: 'Tareas',
      description: 'Gestión de tareas y producción',
      icon: 'ri-task-line',
      color: 'bg-pink-600',
      gradient: 'bg-gradient-to-r from-pink-500 to-pink-600',
      value: '0',
      subtitle: 'tareas pendientes',
      change: 'Al día',
      changeType: 'positive' as const,
      route: '/tareas'
    },
    // OPTIMIZADOR
    {
      id: 'optimizador',
      permission: 'optimizador:view',
      title: 'Optimizador',
      description: 'Optimización de cortes 2D',
      icon: 'ri-layout-grid-line',
      color: 'bg-cyan-600',
      gradient: 'bg-gradient-to-r from-cyan-500 to-cyan-600',
      value: '0',
      subtitle: 'proyectos activos',
      change: 'Disponible',
      changeType: 'positive' as const,
      route: '/optimizador'
    },
    // SEGUIMIENTO
    {
      id: 'seguimiento',
      permission: 'seguimiento:view',
      title: 'Seguimiento',
      description: 'Seguimiento de pedidos',
      icon: 'ri-map-pin-line',
      color: 'bg-lime-600',
      gradient: 'bg-gradient-to-r from-lime-500 to-lime-600',
      value: '0',
      subtitle: 'pedidos en seguimiento',
      change: 'Actualizado',
      changeType: 'positive' as const,
      route: '/seguimiento'
    },
    // ANÁLISIS DE TAREAS
    {
      id: 'tabla-datos-tareas',
      permission: 'tareas:view',
      title: 'Análisis de Tareas',
      description: 'Análisis y reportes de tareas',
      icon: 'ri-bar-chart-box-line',
      color: 'bg-amber-600',
      gradient: 'bg-gradient-to-r from-amber-500 to-amber-600',
      value: '0',
      subtitle: 'tareas analizadas',
      change: 'Disponible',
      changeType: 'positive' as const,
      route: '/tabla-datos-tareas'
    },
    // SEGURIDAD
    {
      id: 'seguridad',
      permission: 'seguridad:view',
      title: 'Seguridad',
      description: 'Usuarios, roles y permisos',
      icon: 'ri-shield-user-line',
      color: 'bg-slate-600',
      gradient: 'bg-gradient-to-r from-slate-500 to-slate-600',
      value: '0',
      subtitle: 'usuarios activos',
      change: 'Configurado',
      changeType: 'positive' as const,
      route: '/seguridad'
    }
  ];

  // Filtrar módulos según permisos
  const visibleModules = modules.filter(module => {
    const hasAccess = hasPermission(module.permission) || canRead(module.id);
    return hasAccess;
  });

  if (visibleModules.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <i className="ri-lock-line text-4xl text-yellow-600 mb-3"></i>
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">
          Sin acceso a módulos
        </h3>
        <p className="text-yellow-700">
          No tienes permisos para acceder a ningún módulo del sistema.
          <br />
          Contacta al administrador para solicitar acceso.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Panel de Control</h1>
            <p className="text-blue-100">
              Acceso rápido a tus módulos autorizados
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
            <div className="text-sm text-blue-100">Módulos disponibles</div>
            <div className="text-2xl font-bold">{visibleModules.length}</div>
          </div>
        </div>
      </div>

      {/* Grid de módulos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {visibleModules.map((module) => (
          <ModuleCard
            key={module.id}
            title={module.title}
            description={module.description}
            icon={module.icon}
            color={module.color}
            gradient={module.gradient}
            value={module.value}
            subtitle={module.subtitle}
            change={module.change}
            changeType={module.changeType}
            route={module.route}
            loading={loading}
          />
        ))}
      </div>

      {/* Información adicional */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <i className="ri-information-line text-2xl text-blue-600"></i>
          </div>
          <div className="ml-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              Información del Dashboard
            </h3>
            <p className="text-sm text-gray-600">
              Este dashboard muestra únicamente los módulos a los que tienes acceso según tus permisos.
              Si necesitas acceso a módulos adicionales, contacta al administrador del sistema.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
