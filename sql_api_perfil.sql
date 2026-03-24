-- =====================================================
-- API DE PERFIL - FUNCIÓN RPC me() Y FRONTEND
-- =====================================================

-- PASO 1: FUNCIÓN RPC public.me() (SECURITY DEFINER)
-- =====================================================

-- Función que devuelve perfil completo del usuario autenticado
CREATE OR REPLACE FUNCTION public.me()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_profile JSON;
    user_permissions TEXT[];
    user_roles TEXT[];
BEGIN
    -- Verificar que el usuario esté autenticado
    IF auth.uid() IS NULL THEN
        RETURN json_build_object(
            'error', 'No autenticado',
            'authenticated', false
        );
    END IF;
    
    -- Obtener permisos del usuario
    user_permissions := public.fn_usuario_permisos(auth.uid());
    
    -- Obtener roles del usuario
    SELECT ARRAY_AGG(r.nombre)
    INTO user_roles
    FROM public.usuarios u
    JOIN public.usuario_roles ur ON u.id = ur.usuario_id
    JOIN public.roles r ON ur.rol_id = r.id
    WHERE u.id = auth.uid() AND u.activo = true;
    
    -- Construir perfil completo
    SELECT json_build_object(
        'id', u.id,
        'email', u.email,
        'nombre_completo', u.nombre_completo,
        'rol', u.rol,
        'activo', u.activo,
        'created_at', u.created_at,
        'updated_at', u.updated_at,
        'roles', COALESCE(user_roles, ARRAY[]::TEXT[]),
        'permisos', COALESCE(user_permissions, ARRAY[]::TEXT[]),
        'authenticated', true,
        'last_sign_in', (
            SELECT last_sign_in_at 
            FROM auth.users 
            WHERE id = auth.uid()
        )
    )
    INTO user_profile
    FROM public.usuarios u
    WHERE u.id = auth.uid() AND u.activo = true;
    
    -- Si no se encuentra el perfil, crear uno básico
    IF user_profile IS NULL THEN
        -- Obtener datos básicos de auth.users
        SELECT json_build_object(
            'id', au.id,
            'email', au.email,
            'nombre_completo', COALESCE(au.raw_user_meta_data->>'nombre_completo', 'Usuario Sin Perfil'),
            'rol', 'Cliente',
            'activo', false,
            'created_at', au.created_at,
            'updated_at', au.updated_at,
            'roles', ARRAY[]::TEXT[],
            'permisos', ARRAY[]::TEXT[],
            'authenticated', true,
            'needs_profile_creation', true,
            'last_sign_in', au.last_sign_in_at
        )
        INTO user_profile
        FROM auth.users au
        WHERE au.id = auth.uid();
    END IF;
    
    RETURN user_profile;
END;
$$;

-- Otorgar permisos de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION public.me() TO authenticated;

-- PASO 2: FUNCIÓN PARA VERIFICAR PERMISOS ESPECÍFICOS
-- =====================================================

-- Función para verificar un permiso específico desde el frontend
CREATE OR REPLACE FUNCTION public.has_permission(
    permission_name TEXT,
    resource_owner_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_permissions TEXT[];
BEGIN
    -- Verificar autenticación
    IF auth.uid() IS NULL THEN
        RETURN false;
    END IF;
    
    -- Obtener permisos del usuario
    user_permissions := public.fn_usuario_permisos(auth.uid());
    
    -- Verificar permiso exacto
    IF permission_name = ANY(user_permissions) THEN
        RETURN true;
    END IF;
    
    -- Verificar permiso :own si se proporciona resource_owner_id
    IF resource_owner_id IS NOT NULL AND 
       (permission_name || ':own') = ANY(user_permissions) AND
       resource_owner_id = auth.uid() THEN
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$;

-- Otorgar permisos de ejecución
GRANT EXECUTE ON FUNCTION public.has_permission(TEXT, UUID) TO authenticated;

-- PASO 3: FUNCIÓN PARA ACTUALIZAR PERFIL PROPIO
-- =====================================================

-- Función para que el usuario actualice su propio perfil
CREATE OR REPLACE FUNCTION public.update_my_profile(
    new_nombre_completo TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_profile JSON;
BEGIN
    -- Verificar autenticación
    IF auth.uid() IS NULL THEN
        RETURN json_build_object('error', 'No autenticado');
    END IF;
    
    -- Actualizar perfil
    UPDATE public.usuarios 
    SET 
        nombre_completo = COALESCE(new_nombre_completo, nombre_completo),
        updated_at = now()
    WHERE id = auth.uid();
    
    -- Retornar perfil actualizado
    RETURN public.me();
END;
$$;

-- Otorgar permisos de ejecución
GRANT EXECUTE ON FUNCTION public.update_my_profile(TEXT) TO authenticated;

-- =====================================================
-- CÓDIGO FRONTEND - HOOKS Y COMPONENTES
-- =====================================================