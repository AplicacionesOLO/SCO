-- =====================================================
-- MIGRACIÓN DE SEGURIDAD ROBUSTA
-- Implementa sistema granular de permisos con RLS
-- =====================================================

-- 1. CREAR TABLAS FALTANTES
-- =====================================================

-- Tabla usuario_roles (relación muchos a muchos)
CREATE TABLE IF NOT EXISTS public.usuario_roles (
    id BIGSERIAL PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rol_id INTEGER NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(usuario_id, rol_id)
);

-- Tabla auditoría de acciones
CREATE TABLE IF NOT EXISTS public.auditoria_acciones (
    id BIGSERIAL PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES auth.users(id),
    permiso TEXT NOT NULL,
    recurso TEXT NOT NULL,
    recurso_id INTEGER,
    ok BOOLEAN NOT NULL DEFAULT false,
    meta JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_usuario_roles_usuario_id ON public.usuario_roles(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuario_roles_rol_id ON public.usuario_roles(rol_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario_id ON public.auditoria_acciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_permiso ON public.auditoria_acciones(permiso);
CREATE INDEX IF NOT EXISTS idx_auditoria_created_at ON public.auditoria_acciones(created_at);

-- 3. FUNCIÓN HELPER PARA OBTENER PERMISOS DE USUARIO
-- =====================================================

CREATE OR REPLACE FUNCTION public.fn_usuario_permisos(uid UUID)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    permisos_array TEXT[];
BEGIN
    -- Obtener todos los permisos del usuario a través de sus roles
    SELECT ARRAY_AGG(DISTINCT p.nombre)
    INTO permisos_array
    FROM public.usuarios u
    JOIN public.usuario_roles ur ON u.id = ur.usuario_id
    JOIN public.rol_permisos rp ON ur.rol_id = rp.rol_id
    JOIN public.permisos p ON rp.permiso_id = p.id
    WHERE u.id = uid AND u.activo = true;
    
    -- Si no tiene permisos específicos, usar el rol directo (compatibilidad)
    IF permisos_array IS NULL THEN
        SELECT ARRAY_AGG(DISTINCT p.nombre)
        INTO permisos_array
        FROM public.usuarios u
        JOIN public.roles r ON u.rol = r.nombre
        JOIN public.rol_permisos rp ON r.id = rp.rol_id
        JOIN public.permisos p ON rp.permiso_id = p.id
        WHERE u.id = uid AND u.activo = true;
    END IF;
    
    RETURN COALESCE(permisos_array, ARRAY[]::TEXT[]);
END;
$$;

-- 4. SEMBRAR PERMISOS GRANULARES
-- =====================================================

-- Insertar permisos granulares con convención {modulo}:{accion}
INSERT INTO public.permisos (nombre, descripcion) VALUES
-- CLIENTES
('clientes:view', 'Ver lista de clientes'),
('clientes:view:own', 'Ver solo clientes propios'),
('clientes:create', 'Crear nuevos clientes'),
('clientes:edit', 'Editar clientes existentes'),
('clientes:edit:own', 'Editar solo clientes propios'),
('clientes:delete', 'Eliminar clientes'),
('clientes:delete:own', 'Eliminar solo clientes propios'),
('clientes:import', 'Importar clientes masivamente'),
('clientes:export', 'Exportar datos de clientes'),
('clientes:assign', 'Asignar clientes a otros usuarios'),

-- COTIZACIONES
('cotizaciones:view', 'Ver lista de cotizaciones'),
('cotizaciones:view:own', 'Ver solo cotizaciones propias'),
('cotizaciones:create', 'Crear nuevas cotizaciones'),
('cotizaciones:edit', 'Editar cotizaciones'),
('cotizaciones:edit:own', 'Editar solo cotizaciones propias'),
('cotizaciones:delete', 'Eliminar cotizaciones'),
('cotizaciones:approve', 'Aprobar cotizaciones'),
('cotizaciones:reject', 'Rechazar cotizaciones'),
('cotizaciones:convert', 'Convertir cotización a pedido'),
('cotizaciones:duplicate', 'Duplicar cotizaciones'),
('cotizaciones:export', 'Exportar cotizaciones'),
('cotizaciones:print', 'Imprimir cotizaciones'),

-- PEDIDOS
('pedidos:view', 'Ver lista de pedidos'),
('pedidos:view:own', 'Ver solo pedidos propios'),
('pedidos:create', 'Crear nuevos pedidos'),
('pedidos:edit', 'Editar pedidos'),
('pedidos:edit:own', 'Editar solo pedidos propios'),
('pedidos:delete', 'Eliminar pedidos'),
('pedidos:confirm', 'Confirmar pedidos'),
('pedidos:cancel', 'Cancelar pedidos'),
('pedidos:invoice', 'Facturar pedidos'),
('pedidos:print', 'Imprimir pedidos'),

-- INVENTARIO
('inventario:view', 'Ver inventario'),
('inventario:create', 'Crear productos'),
('inventario:edit', 'Editar productos'),
('inventario:delete', 'Eliminar productos'),
('inventario:adjust', 'Ajustar cantidades de inventario'),
('inventario:transfer', 'Transferir inventario'),
('inventario:import', 'Importar inventario masivamente'),
('inventario:export', 'Exportar inventario'),
('inventario:categories', 'Gestionar categorías'),
('inventario:thresholds', 'Configurar umbrales de inventario'),

-- FACTURAS
('facturas:view', 'Ver facturas'),
('facturas:view:own', 'Ver solo facturas propias'),
('facturas:create', 'Crear facturas'),
('facturas:edit', 'Editar facturas'),
('facturas:delete', 'Eliminar facturas'),
('facturas:send', 'Enviar facturas a Hacienda'),
('facturas:cancel', 'Anular facturas'),
('facturas:print', 'Imprimir facturas'),
('facturas:export', 'Exportar facturas'),
('facturas:config', 'Configurar parámetros de Hacienda'),

-- PRODUCTOS
('productos:view', 'Ver productos'),
('productos:create', 'Crear productos'),
('productos:edit', 'Editar productos'),
('productos:delete', 'Eliminar productos'),
('productos:bom', 'Gestionar lista de materiales (BOM)'),
('productos:export', 'Exportar productos'),

-- MANTENIMIENTO
('mantenimiento:view', 'Ver módulo de mantenimiento'),
('mantenimiento:alerts', 'Gestionar alertas de inventario'),
('mantenimiento:thresholds', 'Configurar umbrales'),
('mantenimiento:replenishment', 'Gestionar reabastecimiento'),
('mantenimiento:predictions', 'Ver predicciones de demanda'),

-- SEGURIDAD
('seguridad:view', 'Ver módulo de seguridad'),
('seguridad:users:read', 'Ver usuarios'),
('seguridad:users:create', 'Crear usuarios'),
('seguridad:users:update', 'Editar usuarios'),
('seguridad:users:delete', 'Eliminar usuarios'),
('seguridad:roles:read', 'Ver roles'),
('seguridad:roles:create', 'Crear roles'),
('seguridad:roles:update', 'Editar roles'),
('seguridad:roles:delete', 'Eliminar roles'),
('seguridad:permissions:read', 'Ver permisos'),
('seguridad:permissions:update', 'Asignar permisos'),

-- DASHBOARD
('dashboard:view', 'Ver dashboard'),
('dashboard:analytics', 'Ver análisis avanzados'),
('dashboard:reports', 'Generar reportes')

ON CONFLICT (nombre) DO NOTHING;

-- 5. CREAR ROLES BASE CON SUS PERMISOS
-- =====================================================

-- Insertar roles base si no existen
INSERT INTO public.roles (nombre, descripcion) VALUES
('Admin', 'Administrador con acceso completo'),
('Vendedor', 'Vendedor con acceso limitado a sus registros'),
('SupervisorVentas', 'Supervisor de ventas con acceso amplio'),
('EncargadoInventario', 'Encargado de inventario y productos'),
('Contador', 'Contador con acceso a facturación'),
('SoloLectura', 'Usuario con solo permisos de lectura')
ON CONFLICT (nombre) DO NOTHING;

-- Asignar permisos al rol Admin (todos los permisos)
INSERT INTO public.rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permisos p
WHERE r.nombre = 'Admin'
ON CONFLICT DO NOTHING;

-- Asignar permisos al rol Vendedor
INSERT INTO public.rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM public.roles r, public.permisos p
WHERE r.nombre = 'Vendedor' AND p.nombre IN (
    'dashboard:view',
    'clientes:view:own', 'clientes:create', 'clientes:edit:own',
    'cotizaciones:view:own', 'cotizaciones:create', 'cotizaciones:edit:own', 'cotizaciones:print',
    'pedidos:view:own', 'pedidos:create', 'pedidos:edit:own', 'pedidos:print',
    'productos:view',
    'inventario:view'
)
ON CONFLICT DO NOTHING;

-- Asignar permisos al rol SupervisorVentas
INSERT INTO public.rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM public.roles r, public.permisos p
WHERE r.nombre = 'SupervisorVentas' AND p.nombre IN (
    'dashboard:view', 'dashboard:analytics',
    'clientes:view', 'clientes:create', 'clientes:edit', 'clientes:export', 'clientes:assign',
    'cotizaciones:view', 'cotizaciones:create', 'cotizaciones:edit', 'cotizaciones:approve', 'cotizaciones:reject', 'cotizaciones:convert', 'cotizaciones:print', 'cotizaciones:export',
    'pedidos:view', 'pedidos:create', 'pedidos:edit', 'pedidos:confirm', 'pedidos:print',
    'productos:view',
    'inventario:view'
)
ON CONFLICT DO NOTHING;

-- Asignar permisos al rol EncargadoInventario
INSERT INTO public.rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM public.roles r, public.permisos p
WHERE r.nombre = 'EncargadoInventario' AND p.nombre IN (
    'dashboard:view',
    'productos:view', 'productos:create', 'productos:edit', 'productos:bom', 'productos:export',
    'inventario:view', 'inventario:create', 'inventario:edit', 'inventario:adjust', 'inventario:transfer', 'inventario:import', 'inventario:export', 'inventario:categories', 'inventario:thresholds',
    'mantenimiento:view', 'mantenimiento:alerts', 'mantenimiento:thresholds', 'mantenimiento:replenishment', 'mantenimiento:predictions'
)
ON CONFLICT DO NOTHING;

-- Asignar permisos al rol Contador
INSERT INTO public.rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM public.roles r, public.permisos p
WHERE r.nombre = 'Contador' AND p.nombre IN (
    'dashboard:view', 'dashboard:analytics', 'dashboard:reports',
    'clientes:view', 'clientes:export',
    'cotizaciones:view', 'cotizaciones:export',
    'pedidos:view', 'pedidos:invoice', 'pedidos:print',
    'facturas:view', 'facturas:create', 'facturas:edit', 'facturas:send', 'facturas:cancel', 'facturas:print', 'facturas:export', 'facturas:config'
)
ON CONFLICT DO NOTHING;

-- Asignar permisos al rol SoloLectura
INSERT INTO public.rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM public.roles r, public.permisos p
WHERE r.nombre = 'SoloLectura' AND p.nombre IN (
    'dashboard:view',
    'clientes:view', 'clientes:export',
    'cotizaciones:view', 'cotizaciones:print', 'cotizaciones:export',
    'pedidos:view', 'pedidos:print',
    'productos:view',
    'inventario:view',
    'facturas:view', 'facturas:print', 'facturas:export'
)
ON CONFLICT DO NOTHING;

-- 6. MIGRAR USUARIOS EXISTENTES AL NUEVO SISTEMA
-- =====================================================

-- Asignar roles a usuarios existentes basado en su rol actual
INSERT INTO public.usuario_roles (usuario_id, rol_id, created_by)
SELECT u.id, r.id, u.id
FROM public.usuarios u
JOIN public.roles r ON u.rol = r.nombre
WHERE NOT EXISTS (
    SELECT 1 FROM public.usuario_roles ur 
    WHERE ur.usuario_id = u.id AND ur.rol_id = r.id
);

-- 7. HABILITAR RLS EN TABLAS SENSIBLES
-- =====================================================

-- Habilitar RLS en tablas nuevas
ALTER TABLE public.usuario_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_acciones ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS en tablas existentes si no está habilitado
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facturas_electronicas ENABLE ROW LEVEL SECURITY;

-- 8. CREAR POLÍTICAS RLS
-- =====================================================

-- Políticas para usuario_roles (solo admins pueden gestionar)
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "usuario_roles_admin_all" ON public.usuario_roles;
    CREATE POLICY "usuario_roles_admin_all" ON public.usuario_roles
        FOR ALL USING (
            'seguridad:users:update' = ANY(public.fn_usuario_permisos(auth.uid()))
        );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Políticas para auditoría (solo lectura para admins)
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "auditoria_admin_read" ON public.auditoria_acciones;
    CREATE POLICY "auditoria_admin_read" ON public.auditoria_acciones
        FOR SELECT USING (
            'seguridad:view' = ANY(public.fn_usuario_permisos(auth.uid()))
        );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Políticas para clientes
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "clientes_view_policy" ON public.clientes;
    CREATE POLICY "clientes_view_policy" ON public.clientes
        FOR SELECT USING (
            'clientes:view' = ANY(public.fn_usuario_permisos(auth.uid())) OR
            ('clientes:view:own' = ANY(public.fn_usuario_permisos(auth.uid())) AND created_by = auth.uid())
        );
        
    DROP POLICY IF EXISTS "clientes_insert_policy" ON public.clientes;
    CREATE POLICY "clientes_insert_policy" ON public.clientes
        FOR INSERT WITH CHECK (
            'clientes:create' = ANY(public.fn_usuario_permisos(auth.uid()))
        );
        
    DROP POLICY IF EXISTS "clientes_update_policy" ON public.clientes;
    CREATE POLICY "clientes_update_policy" ON public.clientes
        FOR UPDATE USING (
            'clientes:edit' = ANY(public.fn_usuario_permisos(auth.uid())) OR
            ('clientes:edit:own' = ANY(public.fn_usuario_permisos(auth.uid())) AND created_by = auth.uid())
        );
        
    DROP POLICY IF EXISTS "clientes_delete_policy" ON public.clientes;
    CREATE POLICY "clientes_delete_policy" ON public.clientes
        FOR DELETE USING (
            'clientes:delete' = ANY(public.fn_usuario_permisos(auth.uid())) OR
            ('clientes:delete:own' = ANY(public.fn_usuario_permisos(auth.uid())) AND created_by = auth.uid())
        );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Políticas para cotizaciones
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "cotizaciones_view_policy" ON public.cotizaciones;
    CREATE POLICY "cotizaciones_view_policy" ON public.cotizaciones
        FOR SELECT USING (
            'cotizaciones:view' = ANY(public.fn_usuario_permisos(auth.uid())) OR
            ('cotizaciones:view:own' = ANY(public.fn_usuario_permisos(auth.uid())) AND created_by = auth.uid())
        );
        
    DROP POLICY IF EXISTS "cotizaciones_insert_policy" ON public.cotizaciones;
    CREATE POLICY "cotizaciones_insert_policy" ON public.cotizaciones
        FOR INSERT WITH CHECK (
            'cotizaciones:create' = ANY(public.fn_usuario_permisos(auth.uid()))
        );
        
    DROP POLICY IF EXISTS "cotizaciones_update_policy" ON public.cotizaciones;
    CREATE POLICY "cotizaciones_update_policy" ON public.cotizaciones
        FOR UPDATE USING (
            'cotizaciones:edit' = ANY(public.fn_usuario_permisos(auth.uid())) OR
            ('cotizaciones:edit:own' = ANY(public.fn_usuario_permisos(auth.uid())) AND created_by = auth.uid())
        );
        
    DROP POLICY IF EXISTS "cotizaciones_delete_policy" ON public.cotizaciones;
    CREATE POLICY "cotizaciones_delete_policy" ON public.cotizaciones
        FOR DELETE USING (
            'cotizaciones:delete' = ANY(public.fn_usuario_permisos(auth.uid()))
        );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Políticas para pedidos
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "pedidos_view_policy" ON public.pedidos;
    CREATE POLICY "pedidos_view_policy" ON public.pedidos
        FOR SELECT USING (
            'pedidos:view' = ANY(public.fn_usuario_permisos(auth.uid())) OR
            ('pedidos:view:own' = ANY(public.fn_usuario_permisos(auth.uid())) AND created_by = auth.uid())
        );
        
    DROP POLICY IF EXISTS "pedidos_insert_policy" ON public.pedidos;
    CREATE POLICY "pedidos_insert_policy" ON public.pedidos
        FOR INSERT WITH CHECK (
            'pedidos:create' = ANY(public.fn_usuario_permisos(auth.uid()))
        );
        
    DROP POLICY IF EXISTS "pedidos_update_policy" ON public.pedidos;
    CREATE POLICY "pedidos_update_policy" ON public.pedidos
        FOR UPDATE USING (
            'pedidos:edit' = ANY(public.fn_usuario_permisos(auth.uid())) OR
            ('pedidos:edit:own' = ANY(public.fn_usuario_permisos(auth.uid())) AND created_by = auth.uid())
        );
        
    DROP POLICY IF EXISTS "pedidos_delete_policy" ON public.pedidos;
    CREATE POLICY "pedidos_delete_policy" ON public.pedidos
        FOR DELETE USING (
            'pedidos:delete' = ANY(public.fn_usuario_permisos(auth.uid()))
        );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Políticas para facturas
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "facturas_view_policy" ON public.facturas_electronicas;
    CREATE POLICY "facturas_view_policy" ON public.facturas_electronicas
        FOR SELECT USING (
            'facturas:view' = ANY(public.fn_usuario_permisos(auth.uid())) OR
            ('facturas:view:own' = ANY(public.fn_usuario_permisos(auth.uid())) AND created_by = auth.uid())
        );
        
    DROP POLICY IF EXISTS "facturas_insert_policy" ON public.facturas_electronicas;
    CREATE POLICY "facturas_insert_policy" ON public.facturas_electronicas
        FOR INSERT WITH CHECK (
            'facturas:create' = ANY(public.fn_usuario_permisos(auth.uid()))
        );
        
    DROP POLICY IF EXISTS "facturas_update_policy" ON public.facturas_electronicas;
    CREATE POLICY "facturas_update_policy" ON public.facturas_electronicas
        FOR UPDATE USING (
            'facturas:edit' = ANY(public.fn_usuario_permisos(auth.uid()))
        );
        
    DROP POLICY IF EXISTS "facturas_delete_policy" ON public.facturas_electronicas;
    CREATE POLICY "facturas_delete_policy" ON public.facturas_electronicas
        FOR DELETE USING (
            'facturas:delete' = ANY(public.fn_usuario_permisos(auth.uid()))
        );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 9. FUNCIÓN PARA REGISTRAR AUDITORÍA
-- =====================================================

CREATE OR REPLACE FUNCTION public.fn_registrar_auditoria(
    p_permiso TEXT,
    p_recurso TEXT,
    p_recurso_id INTEGER DEFAULT NULL,
    p_ok BOOLEAN DEFAULT true,
    p_meta JSONB DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.auditoria_acciones (
        usuario_id,
        permiso,
        recurso,
        recurso_id,
        ok,
        meta
    ) VALUES (
        auth.uid(),
        p_permiso,
        p_recurso,
        p_recurso_id,
        p_ok,
        p_meta
    );
END;
$$;

-- 10. COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE public.usuario_roles IS 'Relación muchos a muchos entre usuarios y roles';
COMMENT ON TABLE public.auditoria_acciones IS 'Registro de auditoría de todas las acciones del sistema';
COMMENT ON FUNCTION public.fn_usuario_permisos(UUID) IS 'Obtiene todos los permisos de un usuario a través de sus roles';
COMMENT ON FUNCTION public.fn_registrar_auditoria(TEXT, TEXT, INTEGER, BOOLEAN, JSONB) IS 'Registra una acción en la auditoría del sistema';

-- Fin de la migración
SELECT 'Migración de seguridad completada exitosamente' as resultado;