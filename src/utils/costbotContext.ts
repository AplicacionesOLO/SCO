/**
 * Utilidad para detectar el contexto de página actual
 * Usado por CostBot para enviar contexto relevante al backend
 */

export function getPageContext(): string {
  // 1. Prioridad: atributo data-costbot-context en body o root
  const bodyContext = document.body.getAttribute('data-costbot-context');
  if (bodyContext) {
    return bodyContext;
  }

  const rootContext = document.getElementById('root')?.getAttribute('data-costbot-context');
  if (rootContext) {
    return rootContext;
  }

  // 2. Mapeo desde window.location.pathname
  const pathname = window.location.pathname;

  // Mapeo de rutas a contextos
  const contextMap: Record<string, string> = {
    '/': 'home',
    '/dashboard': 'dashboard',
    '/productos': 'productos',
    '/bom': 'bom',
    '/optimizador': 'optimizador_cortes',
    '/inventario': 'inventario',
    '/clientes': 'clientes',
    '/cotizaciones': 'cotizaciones',
    '/pedidos': 'pedidos',
    '/facturacion': 'facturacion',
    '/tareas': 'tareas',
    '/seguimiento': 'seguimiento',
    '/mantenimiento': 'mantenimiento',
    '/seguridad': 'seguridad',
    '/perfil': 'perfil',
    '/tabla-datos-tareas': 'tabla_datos_tareas'
  };

  // Buscar coincidencia exacta
  if (contextMap[pathname]) {
    return contextMap[pathname];
  }

  // Buscar coincidencia parcial (para rutas con parámetros)
  for (const [route, context] of Object.entries(contextMap)) {
    if (pathname.startsWith(route)) {
      return context;
    }
  }

  // Contexto por defecto
  return 'general';
}

/**
 * Obtiene un nombre legible del contexto actual
 */
export function getPageContextLabel(context: string): string {
  const labels: Record<string, string> = {
    home: 'Inicio',
    dashboard: 'Dashboard',
    productos: 'Productos',
    bom: 'BOM (Lista de Materiales)',
    optimizador_cortes: 'Optimizador de Cortes',
    inventario: 'Inventario',
    clientes: 'Clientes',
    cotizaciones: 'Cotizaciones',
    pedidos: 'Pedidos',
    facturacion: 'Facturación',
    tareas: 'Tareas',
    seguimiento: 'Seguimiento de Pedidos',
    mantenimiento: 'Mantenimiento de Inventario',
    seguridad: 'Seguridad y Usuarios',
    perfil: 'Perfil de Usuario',
    tabla_datos_tareas: 'Tabla de Datos de Tareas',
    general: 'General'
  };

  return labels[context] || context;
}
