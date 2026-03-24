-- =====================================================
-- SCRIPT DE DETECCIÓN Y REPARACIÓN DE USUARIOS HUÉRFANOS
-- =====================================================

-- FUNCIÓN PARA DETECTAR PROBLEMAS DE INTEGRIDAD
CREATE OR REPLACE FUNCTION public.detectar_problemas_usuarios()
RETURNS TABLE (
    problema TEXT,
    tabla TEXT,
    cantidad BIGINT,
    descripcion TEXT,
    sql_reparacion TEXT
) AS $$
BEGIN
    RETURN QUERY
    
    -- 1. Usuarios en auth.users sin perfil en public.usuarios
    SELECT 
        'usuarios_sin_perfil'::TEXT,
        'auth.users → public.usuarios'::TEXT,
        COUNT(*)::BIGINT,
        'Usuarios autenticados sin perfil extendido'::TEXT,
        'INSERT INTO public.usuarios (id, email, nombre_completo, rol, activo) SELECT id, email, COALESCE(raw_user_meta_data->>''nombre_completo'', ''Usuario''), ''Cliente'', true FROM auth.users WHERE id NOT IN (SELECT id FROM public.usuarios) AND deleted_at IS NULL;'::TEXT
    FROM auth.users au
    LEFT JOIN public.usuarios pu ON au.id = pu.id
    WHERE pu.id IS NULL AND au.deleted_at IS NULL
    
    UNION ALL
    
    -- 2. Perfiles en public.usuarios sin usuario en auth.users
    SELECT 
        'perfiles_huerfanos'::TEXT,
        'public.usuarios → auth.users'::TEXT,
        COUNT(*)::BIGINT,
        'Perfiles sin usuario de autenticación correspondiente'::TEXT,
        'UPDATE public.usuarios SET activo = false WHERE id NOT IN (SELECT id FROM auth.users WHERE deleted_at IS NULL);'::TEXT
    FROM public.usuarios pu
    LEFT JOIN auth.users au ON pu.id = au.id
    WHERE au.id IS NULL OR au.deleted_at IS NOT NULL
    
    UNION ALL
    
    -- 3. Usuarios activos sin rol asignado
    SELECT 
        'usuarios_sin_rol'::TEXT,
        'public.usuarios → public.usuario_roles'::TEXT,
        COUNT(*)::BIGINT,
        'Usuarios activos sin rol en usuario_roles'::TEXT,
        'INSERT INTO public.usuario_roles (usuario_id, rol_id) SELECT u.id, r.id FROM public.usuarios u CROSS JOIN public.roles r WHERE u.activo = true AND r.nombre = ''Cliente'' AND u.id NOT IN (SELECT usuario_id FROM public.usuario_roles);'::TEXT
    FROM public.usuarios u
    LEFT JOIN public.usuario_roles ur ON u.id = ur.usuario_id
    WHERE u.activo = true AND ur.usuario_id IS NULL
    
    UNION ALL
    
    -- 4. Emails diferentes entre auth.users y public.usuarios
    SELECT 
        'emails_desincronizados'::TEXT,
        'auth.users ≠ public.usuarios'::TEXT,
        COUNT(*)::BIGINT,
        'Emails diferentes entre tablas de auth y perfil'::TEXT,
        'UPDATE public.usuarios SET email = au.email FROM auth.users au WHERE public.usuarios.id = au.id AND public.usuarios.email != au.email;'::TEXT
    FROM public.usuarios pu
    JOIN auth.users au ON pu.id = au.id
    WHERE pu.email != au.email AND au.deleted_at IS NULL
    
    UNION ALL
    
    -- 5. Referencias FK huérfanas en pedidos.created_by
    SELECT 
        'pedidos_created_by_huerfano'::TEXT,
        'public.pedidos.created_by'::TEXT,
        COUNT(*)::BIGINT,
        'Pedidos con created_by que no existe en usuarios'::TEXT,
        'UPDATE public.pedidos SET created_by = NULL WHERE created_by NOT IN (SELECT id FROM public.usuarios WHERE activo = true);'::TEXT
    FROM public.pedidos p
    WHERE p.created_by IS NOT NULL 
    AND p.created_by NOT IN (SELECT id FROM public.usuarios WHERE activo = true)
    
    UNION ALL
    
    -- 6. Referencias FK huérfanas en pedidos.approved_by
    SELECT 
        'pedidos_approved_by_huerfano'::TEXT,
        'public.pedidos.approved_by'::TEXT,
        COUNT(*)::BIGINT,
        'Pedidos con approved_by que no existe en usuarios'::TEXT,
        'UPDATE public.pedidos SET approved_by = NULL WHERE approved_by NOT IN (SELECT id FROM public.usuarios WHERE activo = true);'::TEXT
    FROM public.pedidos p
    WHERE p.approved_by IS NOT NULL 
    AND p.approved_by NOT IN (SELECT id FROM public.usuarios WHERE activo = true)
    
    UNION ALL
    
    -- 7. Referencias FK huérfanas en facturas_electronicas.created_by
    SELECT 
        'facturas_created_by_huerfano'::TEXT,
        'public.facturas_electronicas.created_by'::TEXT,
        COUNT(*)::BIGINT,
        'Facturas con created_by que no existe en usuarios'::TEXT,
        'UPDATE public.facturas_electronicas SET created_by = NULL WHERE created_by NOT IN (SELECT id FROM public.usuarios WHERE activo = true);'::TEXT
    FROM public.facturas_electronicas f
    WHERE f.created_by IS NOT NULL 
    AND f.created_by NOT IN (SELECT id FROM public.usuarios WHERE activo = true)
    
    UNION ALL
    
    -- 8. Referencias FK huérfanas en inventario_movimientos.usuario_id
    SELECT 
        'inventario_usuario_huerfano'::TEXT,
        'public.inventario_movimientos.usuario_id'::TEXT,
        COUNT(*)::BIGINT,
        'Movimientos de inventario con usuario_id que no existe'::TEXT,
        'UPDATE public.inventario_movimientos SET usuario_id = NULL WHERE usuario_id NOT IN (SELECT id FROM public.usuarios WHERE activo = true);'::TEXT
    FROM public.inventario_movimientos im
    WHERE im.usuario_id IS NOT NULL 
    AND im.usuario_id NOT IN (SELECT id FROM public.usuarios WHERE activo = true)
    
    UNION ALL
    
    -- 9. Usuario_roles huérfanos
    SELECT 
        'usuario_roles_huerfanos'::TEXT,
        'public.usuario_roles'::TEXT,
        COUNT(*)::BIGINT,
        'Asignaciones de rol a usuarios que no existen'::TEXT,
        'DELETE FROM public.usuario_roles WHERE usuario_id NOT IN (SELECT id FROM public.usuarios WHERE activo = true);'::TEXT
    FROM public.usuario_roles ur
    WHERE ur.usuario_id NOT IN (SELECT id FROM public.usuarios WHERE activo = true)
    
    UNION ALL
    
    -- 10. Roles duplicados para el mismo usuario
    SELECT 
        'roles_duplicados'::TEXT,
        'public.usuario_roles'::TEXT,
        COUNT(*)::BIGINT,
        'Usuarios con el mismo rol asignado múltiples veces'::TEXT,
        'DELETE FROM public.usuario_roles WHERE id NOT IN (SELECT MIN(id) FROM public.usuario_roles GROUP BY usuario_id, rol_id);'::TEXT
    FROM (
        SELECT usuario_id, rol_id, COUNT(*) as duplicados
        FROM public.usuario_roles 
        GROUP BY usuario_id, rol_id 
        HAVING COUNT(*) > 1
    ) duplicates;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FUNCIÓN PARA EJECUTAR TODAS LAS REPARACIONES AUTOMÁTICAMENTE
CREATE OR REPLACE FUNCTION public.reparar_usuarios_automatico()
RETURNS TABLE (
    paso INTEGER,
    accion TEXT,
    registros_afectados BIGINT,
    estado TEXT
) AS $$
DECLARE
    registros_afectados BIGINT;
    paso_actual INTEGER := 1;
BEGIN
    -- PASO 1: Crear perfiles faltantes
    INSERT INTO public.usuarios (id, email, nombre_completo, rol, activo, created_at, updated_at)
    SELECT 
        au.id,
        au.email,
        COALESCE(au.raw_user_meta_data->>'nombre_completo', 'Usuario Migrado'),
        'Cliente',
        true,
        au.created_at,
        au.updated_at
    FROM auth.users au
    LEFT JOIN public.usuarios pu ON au.id = pu.id
    WHERE pu.id IS NULL 
    AND au.deleted_at IS NULL 
    AND au.email IS NOT NULL;
    
    GET DIAGNOSTICS registros_afectados = ROW_COUNT;
    RETURN QUERY SELECT paso_actual, 'Crear perfiles faltantes'::TEXT, registros_afectados, 'COMPLETADO'::TEXT;
    paso_actual := paso_actual + 1;
    
    -- PASO 2: Sincronizar emails
    UPDATE public.usuarios 
    SET email = au.email, updated_at = now()
    FROM auth.users au
    WHERE public.usuarios.id = au.id
    AND public.usuarios.email != au.email
    AND au.deleted_at IS NULL;
    
    GET DIAGNOSTICS registros_afectados = ROW_COUNT;
    RETURN QUERY SELECT paso_actual, 'Sincronizar emails'::TEXT, registros_afectados, 'COMPLETADO'::TEXT;
    paso_actual := paso_actual + 1;
    
    -- PASO 3: Marcar perfiles huérfanos como inactivos
    UPDATE public.usuarios 
    SET activo = false, updated_at = now()
    WHERE id NOT IN (
        SELECT id FROM auth.users WHERE deleted_at IS NULL
    ) AND activo = true;
    
    GET DIAGNOSTICS registros_afectados = ROW_COUNT;
    RETURN QUERY SELECT paso_actual, 'Desactivar perfiles huérfanos'::TEXT, registros_afectados, 'COMPLETADO'::TEXT;
    paso_actual := paso_actual + 1;
    
    -- PASO 4: Asignar rol Cliente a usuarios sin rol
    INSERT INTO public.usuario_roles (usuario_id, rol_id)
    SELECT u.id, r.id
    FROM public.usuarios u
    CROSS JOIN public.roles r
    WHERE u.activo = true 
    AND r.nombre = 'Cliente'
    AND u.id NOT IN (SELECT usuario_id FROM public.usuario_roles);
    
    GET DIAGNOSTICS registros_afectados = ROW_COUNT;
    RETURN QUERY SELECT paso_actual, 'Asignar rol Cliente por defecto'::TEXT, registros_afectados, 'COMPLETADO'::TEXT;
    paso_actual := paso_actual + 1;
    
    -- PASO 5: Limpiar usuario_roles huérfanos
    DELETE FROM public.usuario_roles 
    WHERE usuario_id NOT IN (SELECT id FROM public.usuarios WHERE activo = true);
    
    GET DIAGNOSTICS registros_afectados = ROW_COUNT;
    RETURN QUERY SELECT paso_actual, 'Limpiar usuario_roles huérfanos'::TEXT, registros_afectados, 'COMPLETADO'::TEXT;
    paso_actual := paso_actual + 1;
    
    -- PASO 6: Eliminar roles duplicados
    DELETE FROM public.usuario_roles 
    WHERE id NOT IN (
        SELECT MIN(id) 
        FROM public.usuario_roles 
        GROUP BY usuario_id, rol_id
    );
    
    GET DIAGNOSTICS registros_afectados = ROW_COUNT;
    RETURN QUERY SELECT paso_actual, 'Eliminar roles duplicados'::TEXT, registros_afectados, 'COMPLETADO'::TEXT;
    paso_actual := paso_actual + 1;
    
    -- PASO 7: Crear usuario sistema si no existe
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
    
    GET DIAGNOSTICS registros_afectados = ROW_COUNT;
    RETURN QUERY SELECT paso_actual, 'Crear usuario sistema'::TEXT, registros_afectados, 'COMPLETADO'::TEXT;
    paso_actual := paso_actual + 1;
    
    -- PASO 8: Reparar FKs huérfanas en pedidos
    UPDATE public.pedidos 
    SET created_by = '00000000-0000-0000-0000-000000000000'::uuid
    WHERE created_by IS NOT NULL 
    AND created_by NOT IN (SELECT id FROM public.usuarios WHERE activo = true);
    
    GET DIAGNOSTICS registros_afectados = ROW_COUNT;
    RETURN QUERY SELECT paso_actual, 'Reparar pedidos.created_by'::TEXT, registros_afectados, 'COMPLETADO'::TEXT;
    paso_actual := paso_actual + 1;
    
    -- PASO 9: Reparar FKs huérfanas en facturas
    UPDATE public.facturas_electronicas 
    SET created_by = '00000000-0000-0000-0000-000000000000'::uuid
    WHERE created_by IS NOT NULL 
    AND created_by NOT IN (SELECT id FROM public.usuarios WHERE activo = true);
    
    GET DIAGNOSTICS registros_afectados = ROW_COUNT;
    RETURN QUERY SELECT paso_actual, 'Reparar facturas.created_by'::TEXT, registros_afectados, 'COMPLETADO'::TEXT;
    paso_actual := paso_actual + 1;
    
    -- PASO 10: Reparar FKs huérfanas en inventario
    UPDATE public.inventario_movimientos 
    SET usuario_id = '00000000-0000-0000-0000-000000000000'::uuid
    WHERE usuario_id IS NOT NULL 
    AND usuario_id NOT IN (SELECT id FROM public.usuarios WHERE activo = true);
    
    GET DIAGNOSTICS registros_afectados = ROW_COUNT;
    RETURN QUERY SELECT paso_actual, 'Reparar inventario_movimientos.usuario_id'::TEXT, registros_afectados, 'COMPLETADO'::TEXT;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FUNCIÓN PARA VERIFICACIÓN POST-REPARACIÓN
CREATE OR REPLACE FUNCTION public.verificar_integridad_post_reparacion()
RETURNS TABLE (
    verificacion TEXT,
    resultado TEXT,
    estado TEXT
) AS $$
BEGIN
    RETURN QUERY
    
    -- Verificar que no hay usuarios sin perfil
    SELECT 
        'Usuarios sin perfil'::TEXT,
        CASE 
            WHEN COUNT(*) = 0 THEN 'OK - No hay usuarios sin perfil'
            ELSE 'ERROR - ' || COUNT(*) || ' usuarios sin perfil'
        END::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT
    FROM auth.users au
    LEFT JOIN public.usuarios pu ON au.id = pu.id
    WHERE pu.id IS NULL AND au.deleted_at IS NULL
    
    UNION ALL
    
    -- Verificar que no hay usuarios sin rol
    SELECT 
        'Usuarios sin rol'::TEXT,
        CASE 
            WHEN COUNT(*) = 0 THEN 'OK - Todos los usuarios tienen rol'
            ELSE 'ERROR - ' || COUNT(*) || ' usuarios sin rol'
        END::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT
    FROM public.usuarios u
    LEFT JOIN public.usuario_roles ur ON u.id = ur.usuario_id
    WHERE u.activo = true AND ur.usuario_id IS NULL
    
    UNION ALL
    
    -- Verificar que no hay FKs huérfanas en pedidos
    SELECT 
        'FKs huérfanas en pedidos'::TEXT,
        CASE 
            WHEN COUNT(*) = 0 THEN 'OK - No hay FKs huérfanas'
            ELSE 'ERROR - ' || COUNT(*) || ' FKs huérfanas'
        END::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT
    FROM public.pedidos p
    WHERE p.created_by IS NOT NULL 
    AND p.created_by NOT IN (SELECT id FROM public.usuarios WHERE activo = true)
    
    UNION ALL
    
    -- Verificar función me() funciona
    SELECT 
        'Función me() operativa'::TEXT,
        CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'me' AND routine_schema = 'public')
            THEN 'OK - Función me() existe'
            ELSE 'ERROR - Función me() no existe'
        END::TEXT,
        CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'me' AND routine_schema = 'public')
            THEN 'PASS' 
            ELSE 'FAIL' 
        END::TEXT
    
    UNION ALL
    
    -- Verificar triggers de sincronización
    SELECT 
        'Triggers de sincronización'::TEXT,
        CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created')
            THEN 'OK - Triggers configurados'
            ELSE 'ERROR - Triggers faltantes'
        END::TEXT,
        CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created')
            THEN 'PASS' 
            ELSE 'FAIL' 
        END::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMANDOS PARA EJECUTAR LA REPARACIÓN
-- =====================================================

-- 1. DETECTAR PROBLEMAS
-- SELECT * FROM public.detectar_problemas_usuarios();

-- 2. EJECUTAR REPARACIÓN AUTOMÁTICA
-- SELECT * FROM public.reparar_usuarios_automatico();

-- 3. VERIFICAR INTEGRIDAD POST-REPARACIÓN
-- SELECT * FROM public.verificar_integridad_post_reparacion();

-- =====================================================
-- SCRIPT COMPLETADO
-- =====================================================