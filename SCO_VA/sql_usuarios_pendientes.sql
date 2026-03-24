-- =====================================================
-- SISTEMA DE USUARIOS PENDIENTES DE ASIGNACIÓN DE TIENDA
-- =====================================================
-- Este script agrega la funcionalidad para manejar usuarios
-- que están pendientes de asignación de tienda por un Admin.

-- 1. AGREGAR NUEVOS PERMISOS
-- =====================================================
INSERT INTO public.permisos (nombre, descripcion, modulo, accion) VALUES
('seguridad:usuarios:view_pendientes', 'Ver usuarios pendientes de asignación de tienda', 'seguridad', 'view_pendientes'),
('seguridad:usuarios:asignar_tienda', 'Asignar tienda a usuarios pendientes', 'seguridad', 'asignar_tienda'),
('seguridad:usuarios:rechazar_registro', 'Rechazar registro de usuarios pendientes', 'seguridad', 'rechazar_registro')
ON CONFLICT (nombre) DO NOTHING;

-- 2. ASIGNAR PERMISOS AL ROL ADMIN
-- =====================================================
-- Obtener el ID del rol Admin
DO $$
DECLARE
    admin_role_id UUID;
    permiso_id UUID;
BEGIN
    -- Buscar el rol Admin
    SELECT id INTO admin_role_id FROM public.roles WHERE nombre = 'Admin' LIMIT 1;
    
    IF admin_role_id IS NOT NULL THEN
        -- Asignar permiso view_pendientes
        SELECT id INTO permiso_id FROM public.permisos WHERE nombre = 'seguridad:usuarios:view_pendientes';
        IF permiso_id IS NOT NULL THEN
            INSERT INTO public.rol_permisos (rol_id, permiso_id, created_at, updated_at)
            VALUES (admin_role_id, permiso_id, NOW(), NOW())
            ON CONFLICT (rol_id, permiso_id) DO NOTHING;
        END IF;
        
        -- Asignar permiso asignar_tienda
        SELECT id INTO permiso_id FROM public.permisos WHERE nombre = 'seguridad:usuarios:asignar_tienda';
        IF permiso_id IS NOT NULL THEN
            INSERT INTO public.rol_permisos (rol_id, permiso_id, created_at, updated_at)
            VALUES (admin_role_id, permiso_id, NOW(), NOW())
            ON CONFLICT (rol_id, permiso_id) DO NOTHING;
        END IF;
        
        -- Asignar permiso rechazar_registro
        SELECT id INTO permiso_id FROM public.permisos WHERE nombre = 'seguridad:usuarios:rechazar_registro';
        IF permiso_id IS NOT NULL THEN
            INSERT INTO public.rol_permisos (rol_id, permiso_id, created_at, updated_at)
            VALUES (admin_role_id, permiso_id, NOW(), NOW())
            ON CONFLICT (rol_id, permiso_id) DO NOTHING;
        END IF;
        
        RAISE NOTICE 'Permisos asignados al rol Admin exitosamente';
    ELSE
        RAISE NOTICE 'No se encontró el rol Admin';
    END IF;
END $$;

-- 3. FUNCIÓN PARA OBTENER USUARIOS PENDIENTES
-- =====================================================
CREATE OR REPLACE FUNCTION get_usuarios_pendientes()
RETURNS TABLE (
    id UUID,
    email TEXT,
    nombre_completo TEXT,
    rol TEXT,
    activo BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.nombre_completo,
        u.rol,
        u.activo,
        u.created_at,
        u.updated_at
    FROM public.usuarios u
    WHERE u.id NOT IN (
        SELECT DISTINCT ut.usuario_id 
        FROM public.usuario_tiendas ut 
        WHERE ut.activo = true
    )
    AND u.activo = true
    ORDER BY u.created_at DESC;
END;
$$;

-- 4. FUNCIÓN PARA ASIGNAR TIENDA A USUARIO
-- =====================================================
CREATE OR REPLACE FUNCTION asignar_tienda_usuario(
    p_usuario_id UUID,
    p_tienda_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    usuario_existe BOOLEAN := FALSE;
    tienda_existe BOOLEAN := FALSE;
    ya_asignada BOOLEAN := FALSE;
BEGIN
    -- Verificar que el usuario existe y está activo
    SELECT EXISTS(
        SELECT 1 FROM public.usuarios 
        WHERE id = p_usuario_id AND activo = true
    ) INTO usuario_existe;
    
    IF NOT usuario_existe THEN
        RAISE EXCEPTION 'Usuario no encontrado o inactivo';
    END IF;
    
    -- Verificar que la tienda existe y está activa
    SELECT EXISTS(
        SELECT 1 FROM public.tiendas 
        WHERE id = p_tienda_id AND activo = true
    ) INTO tienda_existe;
    
    IF NOT tienda_existe THEN
        RAISE EXCEPTION 'Tienda no encontrada o inactiva';
    END IF;
    
    -- Verificar que el usuario no tenga ya una tienda asignada
    SELECT EXISTS(
        SELECT 1 FROM public.usuario_tiendas 
        WHERE usuario_id = p_usuario_id AND activo = true
    ) INTO ya_asignada;
    
    IF ya_asignada THEN
        RAISE EXCEPTION 'El usuario ya tiene una tienda asignada';
    END IF;
    
    -- Insertar en usuario_tiendas
    INSERT INTO public.usuario_tiendas (
        usuario_id, 
        tienda_id, 
        activo, 
        created_at, 
        updated_at
    ) VALUES (
        p_usuario_id, 
        p_tienda_id, 
        true, 
        NOW(), 
        NOW()
    );
    
    -- Insertar o actualizar en usuario_tienda_actual
    INSERT INTO public.usuario_tienda_actual (
        usuario_id, 
        tienda_id, 
        updated_at
    ) VALUES (
        p_usuario_id, 
        p_tienda_id, 
        NOW()
    )
    ON CONFLICT (usuario_id) 
    DO UPDATE SET 
        tienda_id = p_tienda_id,
        updated_at = NOW();
    
    RETURN TRUE;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error asignando tienda: %', SQLERRM;
END;
$$;

-- 5. FUNCIÓN PARA VERIFICAR SI UN USUARIO TIENE TIENDA ASIGNADA
-- =====================================================
CREATE OR REPLACE FUNCTION usuario_tiene_tienda_asignada(p_usuario_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    tiene_tienda BOOLEAN := FALSE;
    tiene_tienda_actual BOOLEAN := FALSE;
BEGIN
    -- Verificar en usuario_tiendas
    SELECT EXISTS(
        SELECT 1 FROM public.usuario_tiendas 
        WHERE usuario_id = p_usuario_id AND activo = true
    ) INTO tiene_tienda;
    
    -- Verificar en usuario_tienda_actual
    SELECT EXISTS(
        SELECT 1 FROM public.usuario_tienda_actual 
        WHERE usuario_id = p_usuario_id
    ) INTO tiene_tienda_actual;
    
    RETURN tiene_tienda AND tiene_tienda_actual;
END;
$$;

-- 6. POLÍTICA RLS PARA LAS NUEVAS FUNCIONES
-- =====================================================
-- Habilitar RLS en las tablas si no está habilitado
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuario_tiendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuario_tienda_actual ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiendas ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios puedan ver sus propios datos
CREATE POLICY "usuarios_can_view_own_data" ON public.usuarios
    FOR SELECT USING (auth.uid() = id);

-- Política para que los admins puedan ver todos los usuarios
CREATE POLICY "admins_can_view_all_usuarios" ON public.usuarios
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.usuarios u
            JOIN public.usuario_roles ur ON u.id = ur.usuario_id
            JOIN public.roles r ON ur.rol_id = r.id
            WHERE u.id = auth.uid() AND r.nombre = 'Admin'
        )
    );

-- 7. COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================
COMMENT ON FUNCTION get_usuarios_pendientes() IS 
'Obtiene la lista de usuarios que están pendientes de asignación de tienda';

COMMENT ON FUNCTION asignar_tienda_usuario(UUID, UUID) IS 
'Asigna una tienda a un usuario pendiente, creando registros en usuario_tiendas y usuario_tienda_actual';

COMMENT ON FUNCTION usuario_tiene_tienda_asignada(UUID) IS 
'Verifica si un usuario tiene una tienda asignada correctamente';

-- 8. VERIFICACIÓN FINAL
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '=== VERIFICACIÓN DEL SISTEMA DE USUARIOS PENDIENTES ===';
    RAISE NOTICE 'Permisos creados: %', (SELECT COUNT(*) FROM public.permisos WHERE nombre LIKE 'seguridad:usuarios:%');
    RAISE NOTICE 'Funciones creadas: get_usuarios_pendientes, asignar_tienda_usuario, usuario_tiene_tienda_asignada';
    RAISE NOTICE 'Políticas RLS aplicadas a las tablas principales';
    RAISE NOTICE '=== INSTALACIÓN COMPLETADA ===';
END $$;