-- =====================================================
-- PLAN DE SANEAMIENTO COMPLETO - GESTIÓN DE USUARIOS
-- Objetivo: Sincronizar auth.users con public.usuarios
-- =====================================================

-- PASO 1: MODIFICAR ESTRUCTURA DE public.usuarios
-- =====================================================

-- Eliminar constraint de generación automática de UUID
ALTER TABLE public.usuarios ALTER COLUMN id DROP DEFAULT;

-- Agregar constraint para que id coincida con auth.users.id
-- (Esto se hará después del backfill)

-- PASO 2: BACKFILL - CREAR PERFILES FALTANTES
-- =====================================================

-- Crear perfiles en public.usuarios para usuarios de auth.users que no los tengan
INSERT INTO public.usuarios (id, email, nombre_completo, rol, activo, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'nombre_completo', 'Usuario Sin Nombre'),
    'Cliente', -- Rol por defecto
    true,
    au.created_at,
    au.updated_at
FROM auth.users au
LEFT JOIN public.usuarios pu ON au.id = pu.id
WHERE pu.id IS NULL
AND au.email IS NOT NULL
AND au.deleted_at IS NULL;

-- PASO 3: SINCRONIZAR EMAILS DIFERENTES
-- =====================================================

-- Actualizar emails en public.usuarios que no coincidan con auth.users
UPDATE public.usuarios 
SET 
    email = au.email,
    updated_at = now()
FROM auth.users au
WHERE public.usuarios.id = au.id
AND public.usuarios.email != au.email
AND au.deleted_at IS NULL;

-- PASO 4: LIMPIAR USUARIOS HUÉRFANOS EN public.usuarios
-- =====================================================

-- Marcar como inactivos usuarios en public.usuarios sin auth.users correspondiente
UPDATE public.usuarios 
SET 
    activo = false,
    updated_at = now()
WHERE id NOT IN (
    SELECT id FROM auth.users WHERE deleted_at IS NULL
)
AND activo = true;

-- PASO 5: CREAR TRIGGER PARA SINCRONIZACIÓN AUTOMÁTICA
-- =====================================================

-- Función para crear perfil automáticamente en signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.usuarios (id, email, nombre_completo, rol, activo, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'nombre_completo', 'Usuario Nuevo'),
        'Cliente', -- Rol por defecto
        true,
        NEW.created_at,
        NEW.updated_at
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para ejecutar la función en cada signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- PASO 6: FUNCIÓN PARA SINCRONIZACIÓN DE EMAILS
-- =====================================================

-- Función para sincronizar cambios de email
CREATE OR REPLACE FUNCTION public.handle_user_email_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo actualizar si el email cambió
    IF OLD.email IS DISTINCT FROM NEW.email THEN
        UPDATE public.usuarios 
        SET 
            email = NEW.email,
            updated_at = now()
        WHERE id = NEW.id;
    END IF;
    
    -- Sincronizar metadata si cambió
    IF OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data THEN
        UPDATE public.usuarios 
        SET 
            nombre_completo = COALESCE(NEW.raw_user_meta_data->>'nombre_completo', nombre_completo),
            updated_at = now()
        WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para cambios en auth.users
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_email_change();

-- PASO 7: FUNCIÓN PARA MANEJAR ELIMINACIÓN DE USUARIOS
-- =====================================================

-- Función para manejar soft delete
CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Marcar como inactivo en lugar de eliminar
    UPDATE public.usuarios 
    SET 
        activo = false,
        updated_at = now()
    WHERE id = OLD.id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para eliminación de usuarios
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
    AFTER UPDATE OF deleted_at ON auth.users
    FOR EACH ROW 
    WHEN (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
    EXECUTE FUNCTION public.handle_user_delete();

-- PASO 8: REPARAR FOREIGN KEYS EXISTENTES
-- =====================================================

-- Verificar que todas las FKs apunten a usuarios existentes
-- Si hay registros huérfanos, asignar a un usuario admin o marcar como NULL

-- Crear usuario sistema si no existe
INSERT INTO public.usuarios (id, email, nombre_completo, rol, activo)
SELECT 
    '00000000-0000-0000-0000-000000000000'::uuid,
    'sistema@empresa.com',
    'Usuario Sistema',
    'Admin',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE id = '00000000-0000-0000-0000-000000000000'::uuid
);

-- Reparar FKs huérfanas en pedidos
UPDATE public.pedidos 
SET created_by = '00000000-0000-0000-0000-000000000000'::uuid
WHERE created_by IS NOT NULL 
AND created_by NOT IN (SELECT id FROM public.usuarios WHERE activo = true);

UPDATE public.pedidos 
SET approved_by = NULL
WHERE approved_by IS NOT NULL 
AND approved_by NOT IN (SELECT id FROM public.usuarios WHERE activo = true);

-- Reparar FKs huérfanas en facturas
UPDATE public.facturas_electronicas 
SET created_by = '00000000-0000-0000-0000-000000000000'::uuid
WHERE created_by IS NOT NULL 
AND created_by NOT IN (SELECT id FROM public.usuarios WHERE activo = true);

-- Reparar FKs huérfanas en inventario_movimientos
UPDATE public.inventario_movimientos 
SET usuario_id = '00000000-0000-0000-0000-000000000000'::uuid
WHERE usuario_id IS NOT NULL 
AND usuario_id NOT IN (SELECT id FROM public.usuarios WHERE activo = true);

-- Reparar FKs huérfanas en replenishment_orders
UPDATE public.replenishment_orders 
SET generado_por = '00000000-0000-0000-0000-000000000000'::uuid
WHERE generado_por IS NOT NULL 
AND generado_por NOT IN (SELECT id FROM public.usuarios WHERE activo = true);

-- Eliminar usuario_roles huérfanos
DELETE FROM public.usuario_roles 
WHERE usuario_id NOT IN (SELECT id FROM public.usuarios WHERE activo = true);

-- PASO 9: JOB DE RECONCILIACIÓN DIARIA (OPCIONAL)
-- =====================================================

-- Función para reconciliación diaria
CREATE OR REPLACE FUNCTION public.reconciliar_usuarios_diario()
RETURNS INTEGER AS $$
DECLARE
    usuarios_sincronizados INTEGER := 0;
    usuario_record RECORD;
BEGIN
    -- Sincronizar usuarios nuevos en auth.users
    FOR usuario_record IN 
        SELECT au.id, au.email, au.raw_user_meta_data, au.created_at, au.updated_at
        FROM auth.users au
        LEFT JOIN public.usuarios pu ON au.id = pu.id
        WHERE pu.id IS NULL 
        AND au.deleted_at IS NULL
        AND au.email IS NOT NULL
    LOOP
        INSERT INTO public.usuarios (id, email, nombre_completo, rol, activo, created_at, updated_at)
        VALUES (
            usuario_record.id,
            usuario_record.email,
            COALESCE(usuario_record.raw_user_meta_data->>'nombre_completo', 'Usuario Sincronizado'),
            'Cliente',
            true,
            usuario_record.created_at,
            usuario_record.updated_at
        );
        
        usuarios_sincronizados := usuarios_sincronizados + 1;
    END LOOP;
    
    -- Marcar como inactivos usuarios eliminados en auth
    UPDATE public.usuarios 
    SET activo = false, updated_at = now()
    WHERE activo = true
    AND id NOT IN (
        SELECT id FROM auth.users WHERE deleted_at IS NULL
    );
    
    RETURN usuarios_sincronizados;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 10: VERIFICACIONES FINALES
-- =====================================================

-- Función para verificar integridad
CREATE OR REPLACE FUNCTION public.verificar_integridad_usuarios()
RETURNS TABLE (
    tipo TEXT,
    cantidad BIGINT,
    descripcion TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'auth_sin_perfil'::TEXT,
        COUNT(*)::BIGINT,
        'Usuarios en auth.users sin perfil en public.usuarios'::TEXT
    FROM auth.users au
    LEFT JOIN public.usuarios pu ON au.id = pu.id
    WHERE pu.id IS NULL AND au.deleted_at IS NULL
    
    UNION ALL
    
    SELECT 
        'perfil_sin_auth'::TEXT,
        COUNT(*)::BIGINT,
        'Perfiles en public.usuarios sin usuario en auth.users'::TEXT
    FROM public.usuarios pu
    LEFT JOIN auth.users au ON pu.id = au.id
    WHERE au.id IS NULL OR au.deleted_at IS NOT NULL
    
    UNION ALL
    
    SELECT 
        'usuarios_sin_rol'::TEXT,
        COUNT(*)::BIGINT,
        'Usuarios activos sin rol asignado'::TEXT
    FROM public.usuarios u
    LEFT JOIN public.usuario_roles ur ON u.id = ur.usuario_id
    WHERE u.activo = true AND ur.usuario_id IS NULL
    
    UNION ALL
    
    SELECT 
        'emails_diferentes'::TEXT,
        COUNT(*)::BIGINT,
        'Usuarios con emails diferentes entre auth.users y public.usuarios'::TEXT
    FROM public.usuarios pu
    JOIN auth.users au ON pu.id = au.id
    WHERE pu.email != au.email AND au.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ejecutar verificación inicial
SELECT * FROM public.verificar_integridad_usuarios();

-- =====================================================
-- SANEAMIENTO COMPLETADO
-- =====================================================