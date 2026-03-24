-- =====================================================
-- SEGURIDAD (RLS/POLICIES) - POLÍTICAS MINIMALISTAS
-- =====================================================

-- PASO 1: POLÍTICAS PARA public.usuarios
-- =====================================================

-- Política: Solo el dueño puede leer/editar su perfil, admin puede todo
DROP POLICY IF EXISTS "usuarios_self_read" ON public.usuarios;
CREATE POLICY "usuarios_self_read" ON public.usuarios
    FOR SELECT USING (
        id = auth.uid() OR 
        'seguridad:users:read' = ANY(public.fn_usuario_permisos(auth.uid()))
    );

DROP POLICY IF EXISTS "usuarios_self_update" ON public.usuarios;
CREATE POLICY "usuarios_self_update" ON public.usuarios
    FOR UPDATE USING (
        id = auth.uid() OR 
        'seguridad:users:update' = ANY(public.fn_usuario_permisos(auth.uid()))
    );

DROP POLICY IF EXISTS "usuarios_admin_insert" ON public.usuarios;
CREATE POLICY "usuarios_admin_insert" ON public.usuarios
    FOR INSERT WITH CHECK (
        'seguridad:users:create' = ANY(public.fn_usuario_permisos(auth.uid()))
    );

DROP POLICY IF EXISTS "usuarios_admin_delete" ON public.usuarios;
CREATE POLICY "usuarios_admin_delete" ON public.usuarios
    FOR DELETE USING (
        'seguridad:users:delete' = ANY(public.fn_usuario_permisos(auth.uid()))
    );

-- PASO 2: POLÍTICAS PARA ROLES Y PERMISOS (SOLO ADMIN)
-- =====================================================

-- Habilitar RLS en tablas de seguridad
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rol_permisos ENABLE ROW LEVEL SECURITY;

-- Políticas para roles (solo admin)
DROP POLICY IF EXISTS "roles_admin_all" ON public.roles;
CREATE POLICY "roles_admin_all" ON public.roles
    FOR ALL USING (
        'seguridad:roles:read' = ANY(public.fn_usuario_permisos(auth.uid()))
    );

-- Políticas para permisos (solo admin)
DROP POLICY IF EXISTS "permisos_admin_all" ON public.permisos;
CREATE POLICY "permisos_admin_all" ON public.permisos
    FOR ALL USING (
        'seguridad:permissions:read' = ANY(public.fn_usuario_permisos(auth.uid()))
    );

-- Políticas para rol_permisos (solo admin)
DROP POLICY IF EXISTS "rol_permisos_admin_all" ON public.rol_permisos;
CREATE POLICY "rol_permisos_admin_all" ON public.rol_permisos
    FOR ALL USING (
        'seguridad:permissions:update' = ANY(public.fn_usuario_permisos(auth.uid()))
    );

-- PASO 3: POLÍTICA PARA usuario_roles (SOLO ADMIN)
-- =====================================================

DROP POLICY IF EXISTS "usuario_roles_admin_all" ON public.usuario_roles;
CREATE POLICY "usuario_roles_admin_all" ON public.usuario_roles
    FOR ALL USING (
        'seguridad:users:update' = ANY(public.fn_usuario_permisos(auth.uid()))
    );

-- PASO 4: HABILITAR RLS EN TABLA usuarios
-- =====================================================

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ROLES Y PERMISOS - SEMILLAS COMPLETAS
-- =====================================================

-- PASO 1: ASEGURAR ROLES BASE EXISTEN
-- =====================================================

INSERT INTO public.roles (nombre, descripcion) VALUES
('Admin', 'Administrador con acceso completo al sistema'),
('SupervisorVentas', 'Supervisor de ventas con acceso amplio'),
('Vendedor', 'Vendedor con acceso limitado a sus registros'),
('EncargadoInventario', 'Encargado de inventario y productos'),
('Contador', 'Contador con acceso a facturación y reportes'),
('SoloLectura', 'Usuario con permisos de solo lectura')
ON CONFLICT (nombre) DO UPDATE SET descripcion = EXCLUDED.descripcion;

-- PASO 2: CATÁLOGO COMPLETO DE PERMISOS GRANULARES
-- =====================================================

INSERT INTO public.permisos (nombre, descripcion, modulo) VALUES
-- DASHBOARD
('dashboard:view', 'Ver dashboard principal', 'dashboard'),
('dashboard:analytics', 'Ver análisis avanzados', 'dashboard'),
('dashboard:reports', 'Generar reportes ejecutivos', 'dashboard'),

-- CLIENTES
('clientes:view', 'Ver todos los clientes', 'clientes'),
('clientes:view:own', 'Ver solo clientes propios', 'clientes'),
('clientes:create', 'Crear nuevos clientes', 'clientes'),
('clientes:edit', 'Editar cualquier cliente', 'clientes'),
('clientes:edit:own', 'Editar solo clientes propios', 'clientes'),
('clientes:delete', 'Eliminar cualquier cliente', 'clientes'),
('clientes:delete:own', 'Eliminar solo clientes propios', 'clientes'),
('clientes:import', 'Importar clientes masivamente', 'clientes'),
('clientes:export', 'Exportar datos de clientes', 'clientes'),
('clientes:assign', 'Asignar clientes a otros usuarios', 'clientes'),

-- PRODUCTOS
('productos:view', 'Ver catálogo de productos', 'productos'),
('productos:create', 'Crear nuevos productos', 'productos'),
('productos:edit', 'Editar productos existentes', 'productos'),
('productos:delete', 'Eliminar productos', 'productos'),
('productos:bom', 'Gestionar lista de materiales (BOM)', 'productos'),
('productos:export', 'Exportar catálogo de productos', 'productos'),

-- INVENTARIO
('inventario:view', 'Ver inventario actual', 'inventario'),
('inventario:create', 'Crear artículos de inventario', 'inventario'),
('inventario:edit', 'Editar artículos de inventario', 'inventario'),
('inventario:delete', 'Eliminar artículos de inventario', 'inventario'),
('inventario:adjust', 'Realizar ajustes de inventario', 'inventario'),
('inventario:transfer', 'Transferir inventario entre ubicaciones', 'inventario'),
('inventario:import', 'Importar inventario masivamente', 'inventario'),
('inventario:export', 'Exportar datos de inventario', 'inventario'),
('inventario:categories', 'Gestionar categorías de inventario', 'inventario'),
('inventario:thresholds', 'Configurar umbrales de inventario', 'inventario'),

-- COTIZACIONES
('cotizaciones:view', 'Ver todas las cotizaciones', 'cotizaciones'),
('cotizaciones:view:own', 'Ver solo cotizaciones propias', 'cotizaciones'),
('cotizaciones:create', 'Crear nuevas cotizaciones', 'cotizaciones'),
('cotizaciones:edit', 'Editar cualquier cotización', 'cotizaciones'),
('cotizaciones:edit:own', 'Editar solo cotizaciones propias', 'cotizaciones'),
('cotizaciones:delete', 'Eliminar cotizaciones', 'cotizaciones'),
('cotizaciones:approve', 'Aprobar cotizaciones', 'cotizaciones'),
('cotizaciones:reject', 'Rechazar cotizaciones', 'cotizaciones'),
('cotizaciones:convert', 'Convertir cotización a pedido', 'cotizaciones'),
('cotizaciones:duplicate', 'Duplicar cotizaciones', 'cotizaciones'),
('cotizaciones:export', 'Exportar cotizaciones', 'cotizaciones'),
('cotizaciones:print', 'Imprimir cotizaciones', 'cotizaciones'),

-- PEDIDOS
('pedidos:view', 'Ver todos los pedidos', 'pedidos'),
('pedidos:view:own', 'Ver solo pedidos propios', 'pedidos'),
('pedidos:create', 'Crear nuevos pedidos', 'pedidos'),
('pedidos:edit', 'Editar cualquier pedido', 'pedidos'),
('pedidos:edit:own', 'Editar solo pedidos propios', 'pedidos'),
('pedidos:delete', 'Eliminar cualquier pedido', 'pedidos'),
('pedidos:delete:own', 'Eliminar solo pedidos propios', 'pedidos'),
('pedidos:confirm', 'Confirmar pedidos', 'pedidos'),
('pedidos:cancel', 'Cancelar pedidos', 'pedidos'),
('pedidos:invoice', 'Facturar pedidos', 'pedidos'),
('pedidos:print', 'Imprimir pedidos', 'pedidos'),

-- FACTURAS
('facturas:view', 'Ver todas las facturas', 'facturas'),
('facturas:view:own', 'Ver solo facturas propias', 'facturas'),
('facturas:create', 'Crear facturas', 'facturas'),
('facturas:edit', 'Editar facturas', 'facturas'),
('facturas:delete', 'Eliminar facturas', 'facturas'),
('facturas:send', 'Enviar facturas a Hacienda', 'facturas'),
('facturas:cancel', 'Anular facturas en Hacienda', 'facturas'),
('facturas:print', 'Imprimir facturas', 'facturas'),
('facturas:export', 'Exportar facturas', 'facturas'),
('facturas:config', 'Configurar parámetros de Hacienda', 'facturas'),

-- MANTENIMIENTO
('mantenimiento:view', 'Ver módulo de mantenimiento', 'mantenimiento'),
('mantenimiento:alerts', 'Gestionar alertas de inventario', 'mantenimiento'),
('mantenimiento:thresholds', 'Configurar umbrales de stock', 'mantenimiento'),
('mantenimiento:replenishment', 'Gestionar órdenes de reabastecimiento', 'mantenimiento'),
('mantenimiento:predictions', 'Ver predicciones de demanda', 'mantenimiento'),

-- SEGURIDAD
('seguridad:view', 'Ver módulo de seguridad', 'seguridad'),
('seguridad:users:read', 'Ver lista de usuarios', 'seguridad'),
('seguridad:users:create', 'Crear nuevos usuarios', 'seguridad'),
('seguridad:users:update', 'Editar usuarios existentes', 'seguridad'),
('seguridad:users:delete', 'Eliminar usuarios', 'seguridad'),
('seguridad:roles:read', 'Ver roles del sistema', 'seguridad'),
('seguridad:roles:create', 'Crear nuevos roles', 'seguridad'),
('seguridad:roles:update', 'Editar roles existentes', 'seguridad'),
('seguridad:roles:delete', 'Eliminar roles', 'seguridad'),
('seguridad:permissions:read', 'Ver permisos del sistema', 'seguridad'),
('seguridad:permissions:update', 'Asignar/quitar permisos', 'seguridad')

ON CONFLICT (nombre) DO UPDATE SET 
    descripcion = EXCLUDED.descripcion,
    modulo = EXCLUDED.modulo;

-- PASO 3: ASIGNACIÓN DE PERMISOS A ROLES
-- =====================================================

-- Limpiar asignaciones existentes para reconfigurar
DELETE FROM public.rol_permisos;

-- ROL: Admin (TODOS LOS PERMISOS)
INSERT INTO public.rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permisos p
WHERE r.nombre = 'Admin';

-- ROL: SupervisorVentas
INSERT INTO public.rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM public.roles r, public.permisos p
WHERE r.nombre = 'SupervisorVentas' AND p.nombre IN (
    'dashboard:view', 'dashboard:analytics',
    'clientes:view', 'clientes:create', 'clientes:edit', 'clientes:export', 'clientes:assign',
    'productos:view',
    'inventario:view',
    'cotizaciones:view', 'cotizaciones:create', 'cotizaciones:edit', 'cotizaciones:approve', 'cotizaciones:reject', 'cotizaciones:convert', 'cotizaciones:duplicate', 'cotizaciones:print', 'cotizaciones:export',
    'pedidos:view', 'pedidos:create', 'pedidos:edit', 'pedidos:confirm', 'pedidos:print'
);

-- ROL: Vendedor
INSERT INTO public.rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM public.roles r, public.permisos p
WHERE r.nombre = 'Vendedor' AND p.nombre IN (
    'dashboard:view',
    'clientes:view:own', 'clientes:create', 'clientes:edit:own',
    'productos:view',
    'inventario:view',
    'cotizaciones:view:own', 'cotizaciones:create', 'cotizaciones:edit:own', 'cotizaciones:print',
    'pedidos:view:own', 'pedidos:create', 'pedidos:edit:own', 'pedidos:print'
);

-- ROL: EncargadoInventario
INSERT INTO public.rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM public.roles r, public.permisos p
WHERE r.nombre = 'EncargadoInventario' AND p.nombre IN (
    'dashboard:view',
    'productos:view', 'productos:create', 'productos:edit', 'productos:bom', 'productos:export',
    'inventario:view', 'inventario:create', 'inventario:edit', 'inventario:adjust', 'inventario:transfer', 'inventario:import', 'inventario:export', 'inventario:categories', 'inventario:thresholds',
    'mantenimiento:view', 'mantenimiento:alerts', 'mantenimiento:thresholds', 'mantenimiento:replenishment', 'mantenimiento:predictions'
);

-- ROL: Contador
INSERT INTO public.rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM public.roles r, public.permisos p
WHERE r.nombre = 'Contador' AND p.nombre IN (
    'dashboard:view', 'dashboard:analytics', 'dashboard:reports',
    'clientes:view', 'clientes:export',
    'cotizaciones:view', 'cotizaciones:export',
    'pedidos:view', 'pedidos:invoice', 'pedidos:print',
    'facturas:view', 'facturas:create', 'facturas:edit', 'facturas:send', 'facturas:cancel', 'facturas:print', 'facturas:export', 'facturas:config'
);

-- ROL: SoloLectura
INSERT INTO public.rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM public.roles r, public.permisos p
WHERE r.nombre = 'SoloLectura' AND p.nombre IN (
    'dashboard:view',
    'clientes:view', 'clientes:export',
    'productos:view',
    'inventario:view',
    'cotizaciones:view', 'cotizaciones:print', 'cotizaciones:export',
    'pedidos:view', 'pedidos:print',
    'facturas:view', 'facturas:print', 'facturas:export'
);

-- =====================================================
-- SEGURIDAD COMPLETADA
-- =====================================================