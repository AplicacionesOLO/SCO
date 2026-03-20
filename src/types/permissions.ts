// Tipos para el sistema de permisos granular
export interface Permission {
  id: string;
  module: string;
  resource: string;
  action: string;
  scope?: 'own' | 'team' | 'all';
  conditions?: Record<string, any>;
}

export interface PermissionCheck {
  module: string;
  resource: string;
  action: string;
  scope?: 'own' | 'team' | 'all';
  resourceId?: string;
  userId?: string;
}

// Definición de permisos por módulo
export const PERMISSIONS = {
  // Dashboard - Permisos granulares por módulo
  'dashboard:view': 'Ver dashboard principal',
  'dashboard:stats': 'Ver estadísticas generales',
  'dashboard:charts': 'Ver gráficos y análisis',
  'dashboard:export': 'Exportar datos del dashboard',
  'dashboard:module:inventario': 'Ver card de Inventario en dashboard',
  'dashboard:module:cotizaciones': 'Ver card de Cotizaciones en dashboard',
  'dashboard:module:pedidos': 'Ver card de Pedidos en dashboard',
  'dashboard:module:clientes': 'Ver card de Clientes en dashboard',
  'dashboard:module:productos': 'Ver card de Productos en dashboard',
  'dashboard:module:facturacion': 'Ver card de Facturación en dashboard',
  'dashboard:module:mantenimiento': 'Ver card de Mantenimiento en dashboard',
  'dashboard:module:tareas': 'Ver card de Tareas en dashboard',
  'dashboard:module:optimizador': 'Ver card de Optimizador en dashboard',
  'dashboard:module:seguimiento': 'Ver card de Seguimiento en dashboard',
  'dashboard:module:analisis-tareas': 'Ver card de Análisis de Tareas en dashboard',
  'dashboard:module:seguridad': 'Ver card de Seguridad en dashboard',

  // Clientes
  'clientes:view': 'Ver lista de clientes',
  'clientes:view:own': 'Ver solo clientes propios',
  'clientes:create': 'Crear nuevos clientes',
  'clientes:edit': 'Editar clientes existentes',
  'clientes:edit:own': 'Editar solo clientes propios',
  'clientes:delete': 'Eliminar clientes',
  'clientes:delete:own': 'Eliminar solo clientes propios',
  'clientes:import': 'Importar clientes masivamente',
  'clientes:export': 'Exportar datos de clientes',
  'clientes:assign': 'Asignar clientes a otros usuarios',

  // Cotizaciones
  'cotizaciones:view': 'Ver lista de cotizaciones',
  'cotizaciones:view:own': 'Ver solo cotizaciones propias',
  'cotizaciones:create': 'Crear nuevas cotizaciones',
  'cotizaciones:edit': 'Editar cotizaciones',
  'cotizaciones:edit:own': 'Editar solo cotizaciones propias',
  'cotizaciones:delete': 'Eliminar cotizaciones',
  'cotizaciones:approve': 'Aprobar cotizaciones',
  'cotizaciones:reject': 'Rechazar cotizaciones',
  'cotizaciones:convert': 'Convertir a pedido',
  'cotizaciones:duplicate': 'Duplicar cotizaciones',
  'cotizaciones:export': 'Exportar cotizaciones',
  'cotizaciones:print': 'Imprimir cotizaciones',

  // Pedidos
  'pedidos:view': 'Ver lista de pedidos',
  'pedidos:view:own': 'Ver solo pedidos propios',
  'pedidos:create': 'Crear nuevos pedidos',
  'pedidos:edit': 'Editar pedidos',
  'pedidos:edit:own': 'Editar solo pedidos propios',
  'pedidos:delete': 'Eliminar pedidos',
  'pedidos:confirm': 'Confirmar pedidos',
  'pedidos:cancel': 'Cancelar pedidos',
  'pedidos:invoice': 'Facturar pedidos',
  'pedidos:print': 'Imprimir pedidos',

  // Inventario
  'inventario:view': 'Ver inventario',
  'inventario:create': 'Crear productos en inventario',
  'inventario:edit': 'Editar productos del inventario',
  'inventario:delete': 'Eliminar productos del inventario',
  'inventario:adjust': 'Ajustar cantidades de inventario',
  'inventario:transfer': 'Transferir inventario',
  'inventario:import': 'Importar inventario',
  'inventario:export': 'Exportar inventario',
  'inventario:categories': 'Gestionar categorías',
  'inventario:thresholds': 'Configurar umbrales',

  // Productos
  'productos:view': 'Ver productos',
  'productos:create': 'Crear productos',
  'productos:edit': 'Editar productos',
  'productos:delete': 'Eliminar productos',
  'productos:bom': 'Gestionar lista de materiales (BOM)',
  'productos:pricing': 'Gestionar precios',
  'productos:export': 'Exportar productos',

  // Facturación
  'facturacion:view': 'Ver facturas',
  'facturacion:view:own': 'Ver solo facturas propias',
  'facturacion:create': 'Crear facturas',
  'facturacion:edit': 'Editar facturas',
  'facturacion:delete': 'Eliminar facturas',
  'facturacion:send': 'Enviar facturas a Hacienda',
  'facturacion:cancel': 'Anular facturas',
  'facturacion:print': 'Imprimir facturas',
  'facturacion:export': 'Exportar facturas',
  'facturacion:config': 'Configurar parámetros de Hacienda',
  'facturacion:emision:view': 'Ver módulo de Emisión de Factura (experimental)',

  // Mantenimiento
  'mantenimiento:view': 'Ver módulo de mantenimiento',
  'mantenimiento:alerts': 'Ver alertas de inventario',
  'mantenimiento:thresholds': 'Configurar umbrales',
  'mantenimiento:replenishment': 'Gestionar reabastecimiento',
  'mantenimiento:predictions': 'Ver predicciones de demanda',
  'mantenimiento:config': 'Configurar parámetros del sistema',

  // Seguimiento
  'seguimiento:view': 'Ver módulo de seguimiento',
  'seguimiento:view:own': 'Ver solo seguimientos propios',
  'seguimiento:create': 'Crear seguimientos',
  'seguimiento:edit': 'Editar seguimientos',
  'seguimiento:delete': 'Eliminar seguimientos',

  // Tareas
  'tareas:view': 'Ver lista de tareas',
  'tareas:view:own': 'Ver solo tareas propias',
  'tareas:create': 'Crear nuevas tareas',
  'tareas:update': 'Actualizar tareas',
  'tareas:update:own': 'Actualizar solo tareas propias',
  'tareas:delete': 'Eliminar tareas',
  'tareas:manage': 'Gestionar encargados y colaboradores',
  'tareas:export': 'Exportar datos de tareas',

  // Optimizador de Cortes 2D
  'optimizador:view': 'Ver módulo de optimizador',
  'optimizador:create': 'Crear proyectos de optimización',
  'optimizador:edit': 'Editar proyectos de optimización',
  'optimizador:delete': 'Eliminar proyectos de optimización',
  'optimizador:export': 'Exportar resultados a Excel',
  'optimizador:bom': 'Cargar piezas desde BOM',

  // Seguridad
  'seguridad:view': 'Ver módulo de seguridad',
  'seguridad:users:view': 'Ver usuarios',
  'seguridad:users:create': 'Crear usuarios',
  'seguridad:users:edit': 'Editar usuarios',
  'seguridad:users:delete': 'Eliminar usuarios',
  'seguridad:users:activate': 'Activar/desactivar usuarios',
  'seguridad:roles:view': 'Ver roles',
  'seguridad:roles:create': 'Crear roles',
  'seguridad:roles:edit': 'Editar roles',
  'seguridad:roles:delete': 'Eliminar roles',
  'seguridad:permissions:view': 'Ver permisos',
  'seguridad:permissions:create': 'Crear permisos',
  'seguridad:permissions:edit': 'Editar permisos',
  'seguridad:permissions:delete': 'Eliminar permisos',
  'seguridad:permissions:assign': 'Asignar permisos a roles',

  // Perfil
  'perfil:view': 'Ver perfil propio',
  'perfil:edit': 'Editar perfil propio',
  'perfil:password': 'Cambiar contraseña propia',
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

// Grupos de permisos para facilitar asignación
export const PERMISSION_GROUPS = {
  'Administrador Completo': [
    // Dashboard completo
    'dashboard:view', 'dashboard:stats', 'dashboard:charts', 'dashboard:export',
    'dashboard:module:inventario', 'dashboard:module:cotizaciones', 'dashboard:module:pedidos',
    'dashboard:module:clientes', 'dashboard:module:productos', 'dashboard:module:facturacion',
    'dashboard:module:mantenimiento', 'dashboard:module:tareas', 'dashboard:module:optimizador',
    'dashboard:module:seguimiento', 'dashboard:module:analisis-tareas', 'dashboard:module:seguridad',
    // Clientes
    'clientes:view', 'clientes:create', 'clientes:edit', 'clientes:delete', 'clientes:import', 'clientes:export', 'clientes:assign',
    // Cotizaciones
    'cotizaciones:view', 'cotizaciones:create', 'cotizaciones:edit', 'cotizaciones:delete', 'cotizaciones:approve', 'cotizaciones:reject', 'cotizaciones:convert', 'cotizaciones:duplicate', 'cotizaciones:export', 'cotizaciones:print',
    // Pedidos
    'pedidos:view', 'pedidos:create', 'pedidos:edit', 'pedidos:delete', 'pedidos:confirm', 'pedidos:cancel', 'pedidos:invoice', 'pedidos:print',
    // Inventario
    'inventario:view', 'inventario:create', 'inventario:edit', 'inventario:delete', 'inventario:adjust', 'inventario:transfer', 'inventario:import', 'inventario:export', 'inventario:categories', 'inventario:thresholds',
    // Productos
    'productos:view', 'productos:create', 'productos:edit', 'productos:delete', 'productos:bom', 'productos:pricing', 'productos:export',
    // Facturación
    'facturacion:view', 'facturacion:create', 'facturacion:edit', 'facturacion:delete', 'facturacion:send', 'facturacion:cancel', 'facturacion:print', 'facturacion:export', 'facturacion:config',
    // Mantenimiento
    'mantenimiento:view', 'mantenimiento:alerts', 'mantenimiento:thresholds', 'mantenimiento:replenishment', 'mantenimiento:predictions', 'mantenimiento:config',
    // Seguimiento
    'seguimiento:view', 'seguimiento:create', 'seguimiento:edit', 'seguimiento:delete',
    // Tareas
    'tareas:view', 'tareas:create', 'tareas:update', 'tareas:delete', 'tareas:manage', 'tareas:export',
    // Optimizador
    'optimizador:view', 'optimizador:create', 'optimizador:edit', 'optimizador:delete', 'optimizador:export', 'optimizador:bom',
    // Seguridad
    'seguridad:view', 'seguridad:users:view', 'seguridad:users:create', 'seguridad:users:edit', 'seguridad:users:delete', 'seguridad:users:activate', 'seguridad:roles:view', 'seguridad:roles:create', 'seguridad:roles:edit', 'seguridad:roles:delete', 'seguridad:permissions:view', 'seguridad:permissions:create', 'seguridad:permissions:edit', 'seguridad:permissions:delete', 'seguridad:permissions:assign',
    // Perfil
    'perfil:view', 'perfil:edit', 'perfil:password'
  ],
  
  'Vendedor': [
    // Dashboard básico
    'dashboard:view', 'dashboard:stats',
    'dashboard:module:clientes', 'dashboard:module:cotizaciones', 'dashboard:module:pedidos',
    'dashboard:module:productos', 'dashboard:module:inventario', 'dashboard:module:optimizador',
    // Clientes
    'clientes:view:own', 'clientes:create', 'clientes:edit:own', 'clientes:export',
    // Cotizaciones
    'cotizaciones:view:own', 'cotizaciones:create', 'cotizaciones:edit:own', 'cotizaciones:duplicate', 'cotizaciones:export', 'cotizaciones:print',
    // Pedidos
    'pedidos:view:own', 'pedidos:create', 'pedidos:edit:own', 'pedidos:print',
    // Inventario y Productos
    'inventario:view', 'productos:view',
    // Optimizador
    'optimizador:view', 'optimizador:create', 'optimizador:bom', 'optimizador:export',
    // Tareas
    'tareas:view:own', 'tareas:create',
    // Perfil
    'perfil:view', 'perfil:edit', 'perfil:password'
  ],
  
  'Supervisor de Ventas': [
    // Dashboard completo
    'dashboard:view', 'dashboard:stats', 'dashboard:charts', 'dashboard:export',
    'dashboard:module:clientes', 'dashboard:module:cotizaciones', 'dashboard:module:pedidos',
    'dashboard:module:productos', 'dashboard:module:inventario', 'dashboard:module:facturacion',
    'dashboard:module:optimizador', 'dashboard:module:tareas',
    // Clientes
    'clientes:view', 'clientes:create', 'clientes:edit', 'clientes:export', 'clientes:assign',
    // Cotizaciones
    'cotizaciones:view', 'cotizaciones:create', 'cotizaciones:edit', 'cotizaciones:approve', 'cotizaciones:reject', 'cotizaciones:convert', 'cotizaciones:duplicate', 'cotizaciones:export', 'cotizaciones:print',
    // Pedidos
    'pedidos:view', 'pedidos:create', 'pedidos:edit', 'pedidos:confirm', 'pedidos:invoice', 'pedidos:print',
    // Inventario y Productos
    'inventario:view', 'productos:view',
    // Facturación
    'facturacion:view', 'facturacion:create', 'facturacion:send', 'facturacion:print', 'facturacion:export',
    // Optimizador
    'optimizador:view', 'optimizador:create', 'optimizador:edit', 'optimizador:bom', 'optimizador:export',
    // Tareas
    'tareas:view', 'tareas:create', 'tareas:update', 'tareas:manage',
    // Perfil
    'perfil:view', 'perfil:edit', 'perfil:password'
  ],
  
  'Encargado de Inventario': [
    // Dashboard de inventario
    'dashboard:view', 'dashboard:stats',
    'dashboard:module:inventario', 'dashboard:module:productos', 'dashboard:module:mantenimiento',
    'dashboard:module:optimizador',
    // Inventario
    'inventario:view', 'inventario:create', 'inventario:edit', 'inventario:delete', 'inventario:adjust', 'inventario:transfer', 'inventario:import', 'inventario:export', 'inventario:categories', 'inventario:thresholds',
    // Productos
    'productos:view', 'productos:create', 'productos:edit', 'productos:bom', 'productos:pricing', 'productos:export',
    // Optimizador
    'optimizador:view', 'optimizador:create', 'optimizador:edit', 'optimizador:bom', 'optimizador:export',
    // Mantenimiento
    'mantenimiento:view', 'mantenimiento:alerts', 'mantenimiento:thresholds', 'mantenimiento:replenishment', 'mantenimiento:predictions',
    // Perfil
    'perfil:view', 'perfil:edit', 'perfil:password'
  ],
  
  'Contador': [
    // Dashboard financiero
    'dashboard:view', 'dashboard:stats', 'dashboard:charts', 'dashboard:export',
    'dashboard:module:facturacion', 'dashboard:module:pedidos', 'dashboard:module:clientes',
    // Facturación
    'facturacion:view', 'facturacion:create', 'facturacion:edit', 'facturacion:send', 'facturacion:cancel', 'facturacion:print', 'facturacion:export', 'facturacion:config',
    // Pedidos
    'pedidos:view', 'pedidos:invoice',
    // Clientes
    'clientes:view', 'clientes:export',
    // Perfil
    'perfil:view', 'perfil:edit', 'perfil:password'
  ],
  
  'Encargado de Producción': [
    // Dashboard de producción
    'dashboard:view', 'dashboard:stats',
    'dashboard:module:tareas', 'dashboard:module:analisis-tareas', 'dashboard:module:inventario',
    'dashboard:module:productos', 'dashboard:module:optimizador',
    // Tareas
    'tareas:view', 'tareas:create', 'tareas:update', 'tareas:manage', 'tareas:export',
    // Inventario
    'inventario:view', 'inventario:adjust',
    // Productos
    'productos:view',
    // Optimizador
    'optimizador:view', 'optimizador:create', 'optimizador:bom', 'optimizador:export',
    // Perfil
    'perfil:view', 'perfil:edit', 'perfil:password'
  ],
  
  'Solo Lectura': [
    // Dashboard básico
    'dashboard:view', 'dashboard:stats', 'dashboard:charts',
    'dashboard:module:clientes', 'dashboard:module:cotizaciones', 'dashboard:module:pedidos',
    'dashboard:module:inventario', 'dashboard:module:productos', 'dashboard:module:facturacion',
    'dashboard:module:tareas', 'dashboard:module:optimizador',
    // Clientes
    'clientes:view', 'clientes:export',
    // Cotizaciones
    'cotizaciones:view', 'cotizaciones:export', 'cotizaciones:print',
    // Pedidos
    'pedidos:view', 'pedidos:print',
    // Inventario y Productos
    'inventario:view', 'productos:view',
    // Facturación
    'facturacion:view', 'facturacion:print', 'facturacion:export',
    // Tareas
    'tareas:view',
    // Optimizador
    'optimizador:view',
    // Perfil
    'perfil:view', 'perfil:edit', 'perfil:password'
  ]
};
