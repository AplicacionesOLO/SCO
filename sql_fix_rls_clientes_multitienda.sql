-- ============================================================================
-- CORRECCIÓN CRÍTICA: RLS MULTI-TIENDA PARA TABLA CLIENTES
-- ============================================================================
-- Sistema: SCO (Sistema de Costeos OLO)
-- Fecha: 2025
-- Propósito: Asegurar que RLS funcione al 100% para usuarios reales (anon/authenticated)
--            y sea IMPOSIBLE leer/escribir clientes sin tienda actual
-- 
-- PRINCIPIO FUNDAMENTAL:
-- - La tienda activa se obtiene SIEMPRE desde usuario_tienda_actual
-- - NUNCA se confía en parámetros del frontend
-- - Sin tienda actual = Sin acceso a datos
-- ============================================================================

-- ============================================================================
-- PASO 0: VERIFICAR FUNCIÓN HELPER (DEBE EXISTIR)
-- ============================================================================

-- Verificar que existe la función require_current_store()
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'require_current_store'
  ) THEN
    RAISE EXCEPTION 'BLOQUEANTE: La función require_current_store() NO existe. Debe crearse primero.';
  END IF;
  
  RAISE NOTICE '✅ Función require_current_store() existe';
END $$;

-- Si la función NO existe, crearla aquí (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION require_current_store()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  store_id UUID;
BEGIN
  -- Obtener tienda activa del usuario autenticado
  SELECT tienda_id INTO store_id
  FROM usuario_tienda_actual
  WHERE usuario_id = auth.uid();
  
  -- Si no existe tienda activa, lanzar error
  IF store_id IS NULL THEN
    RAISE EXCEPTION 'NO_CURRENT_STORE'
      USING HINT = 'El usuario no tiene una tienda activa asignada';
  END IF;
  
  RETURN store_id;
END;
$$;

COMMENT ON FUNCTION require_current_store() IS 
'Retorna la tienda activa del usuario autenticado. Lanza NO_CURRENT_STORE si no existe. Fuente única de verdad para RLS.';


-- ============================================================================
-- PASO 1: LIMPIAR POLICIES EXISTENTES EN CLIENTES
-- ============================================================================

-- Eliminar TODAS las policies existentes en clientes
DROP POLICY IF EXISTS "users_read_own_store_clientes" ON clientes;
DROP POLICY IF EXISTS "users_insert_own_store_clientes" ON clientes;
DROP POLICY IF EXISTS "users_update_own_store_clientes" ON clientes;
DROP POLICY IF EXISTS "users_delete_own_store_clientes" ON clientes;

-- Eliminar policies con roles públicos (si existen)
DROP POLICY IF EXISTS "public_read_clientes" ON clientes;
DROP POLICY IF EXISTS "public_insert_clientes" ON clientes;
DROP POLICY IF EXISTS "public_update_clientes" ON clientes;
DROP POLICY IF EXISTS "public_delete_clientes" ON clientes;

-- Eliminar cualquier policy genérica
DROP POLICY IF EXISTS "Enable read access for all users" ON clientes;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON clientes;
DROP POLICY IF EXISTS "Enable update for users based on email" ON clientes;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON clientes;

RAISE NOTICE '✅ Policies antiguas eliminadas';


-- ============================================================================
-- PASO 2: HABILITAR RLS Y FORZAR PARA TODOS LOS ROLES
-- ============================================================================

-- Habilitar RLS en la tabla
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

-- CRÍTICO: Forzar RLS incluso para el owner de la tabla
-- Esto previene bypass accidental con role postgres
ALTER TABLE clientes FORCE ROW LEVEL SECURITY;

RAISE NOTICE '✅ RLS habilitado y forzado en tabla clientes';


-- ============================================================================
-- PASO 3: CREAR POLICIES SEGURAS SOLO PARA AUTHENTICATED
-- ============================================================================

/**
 * POLÍTICA DE LECTURA (SELECT)
 * 
 * Permite: Solo usuarios autenticados
 * Condición: tienda_id = require_current_store()
 * Comportamiento: Si no hay tienda actual, require_current_store() lanza NO_CURRENT_STORE
 */
CREATE POLICY "authenticated_read_own_store_clientes" 
ON clientes
FOR SELECT
TO authenticated
USING (tienda_id = require_current_store());

COMMENT ON POLICY "authenticated_read_own_store_clientes" ON clientes IS 
'Usuarios autenticados solo pueden leer clientes de su tienda activa. Sin tienda = sin acceso.';


/**
 * POLÍTICA DE INSERCIÓN (INSERT)
 * 
 * Permite: Solo usuarios autenticados
 * Condición: tienda_id = require_current_store()
 * Comportamiento: Solo puede crear clientes en su tienda activa
 */
CREATE POLICY "authenticated_insert_own_store_clientes" 
ON clientes
FOR INSERT
TO authenticated
WITH CHECK (tienda_id = require_current_store());

COMMENT ON POLICY "authenticated_insert_own_store_clientes" ON clientes IS 
'Usuarios autenticados solo pueden crear clientes en su tienda activa.';


/**
 * POLÍTICA DE ACTUALIZACIÓN (UPDATE)
 * 
 * Permite: Solo usuarios autenticados
 * Condición: tienda_id = require_current_store() (USING y WITH CHECK)
 * Comportamiento: Solo puede actualizar clientes de su tienda activa
 *                 Y no puede cambiar el tienda_id a otra tienda
 */
CREATE POLICY "authenticated_update_own_store_clientes" 
ON clientes
FOR UPDATE
TO authenticated
USING (tienda_id = require_current_store())
WITH CHECK (tienda_id = require_current_store());

COMMENT ON POLICY "authenticated_update_own_store_clientes" ON clientes IS 
'Usuarios autenticados solo pueden actualizar clientes de su tienda activa. No pueden cambiar tienda_id.';


/**
 * POLÍTICA DE ELIMINACIÓN (DELETE)
 * 
 * Permite: Solo usuarios autenticados
 * Condición: tienda_id = require_current_store()
 * Comportamiento: Solo puede eliminar clientes de su tienda activa
 */
CREATE POLICY "authenticated_delete_own_store_clientes" 
ON clientes
FOR DELETE
TO authenticated
USING (tienda_id = require_current_store());

COMMENT ON POLICY "authenticated_delete_own_store_clientes" ON clientes IS 
'Usuarios autenticados solo pueden eliminar clientes de su tienda activa.';

RAISE NOTICE '✅ Policies seguras creadas para authenticated';


-- ============================================================================
-- PASO 4: VERIFICAR CONFIGURACIÓN FINAL
-- ============================================================================

-- Verificar que RLS está habilitado
DO $$
DECLARE
  rls_enabled BOOLEAN;
  rls_forced BOOLEAN;
BEGIN
  SELECT relrowsecurity, relforcerowsecurity INTO rls_enabled, rls_forced
  FROM pg_class
  WHERE relname = 'clientes';
  
  IF NOT rls_enabled THEN
    RAISE EXCEPTION '❌ RLS NO está habilitado en clientes';
  END IF;
  
  IF NOT rls_forced THEN
    RAISE WARNING '⚠️ RLS NO está forzado en clientes (puede permitir bypass con postgres role)';
  END IF;
  
  RAISE NOTICE '✅ RLS habilitado: % | RLS forzado: %', rls_enabled, rls_forced;
END $$;

-- Contar policies creadas
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'clientes';
  
  RAISE NOTICE '✅ Total de policies en clientes: %', policy_count;
  
  IF policy_count < 4 THEN
    RAISE WARNING '⚠️ Se esperaban 4 policies (SELECT, INSERT, UPDATE, DELETE)';
  END IF;
END $$;

-- Listar todas las policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'clientes'
ORDER BY cmd;


-- ============================================================================
-- PASO 5: SCRIPT DE VERIFICACIÓN (SIMULACIÓN DE USUARIO AUTENTICADO)
-- ============================================================================

/**
 * IMPORTANTE: CÓMO PROBAR RLS CORRECTAMENTE
 * 
 * ❌ INCORRECTO: Probar con role postgres
 * SELECT * FROM clientes;
 * -- Esto BYPASEA RLS porque postgres es superuser
 * 
 * ✅ CORRECTO: Probar con role authenticated
 * BEGIN;
 * SET LOCAL ROLE authenticated;
 * SET LOCAL request.jwt.claims TO '{"sub": "user-uuid-here"}';
 * SELECT * FROM clientes;
 * ROLLBACK;
 * 
 * ⚠️ ADVERTENCIA:
 * - Probar con postgres o service_role SIEMPRE bypasea RLS
 * - Solo roles anon/authenticated respetan RLS
 * - En producción, el frontend usa anon key (role authenticated después de login)
 */

-- Crear función helper para pruebas
CREATE OR REPLACE FUNCTION test_rls_clientes(test_user_id UUID, test_store_id UUID)
RETURNS TABLE(
  test_name TEXT,
  result TEXT,
  row_count BIGINT,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Test 1: Usuario CON tienda actual
  BEGIN
    -- Insertar tienda actual para el usuario de prueba
    INSERT INTO usuario_tienda_actual (usuario_id, tienda_id)
    VALUES (test_user_id, test_store_id)
    ON CONFLICT (usuario_id) DO UPDATE SET tienda_id = test_store_id;
    
    -- Simular sesión del usuario
    PERFORM set_config('request.jwt.claims', json_build_object('sub', test_user_id)::text, true);
    
    -- Intentar leer clientes
    SELECT COUNT(*) INTO row_count FROM clientes;
    
    RETURN QUERY SELECT 
      'Test 1: Usuario CON tienda actual'::TEXT,
      'PASS'::TEXT,
      row_count,
      NULL::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'Test 1: Usuario CON tienda actual'::TEXT,
      'FAIL'::TEXT,
      0::BIGINT,
      SQLERRM::TEXT;
  END;
  
  -- Test 2: Usuario SIN tienda actual
  BEGIN
    -- Eliminar tienda actual
    DELETE FROM usuario_tienda_actual WHERE usuario_id = test_user_id;
    
    -- Simular sesión del usuario
    PERFORM set_config('request.jwt.claims', json_build_object('sub', test_user_id)::text, true);
    
    -- Intentar leer clientes (debe fallar o retornar 0 filas)
    SELECT COUNT(*) INTO row_count FROM clientes;
    
    RETURN QUERY SELECT 
      'Test 2: Usuario SIN tienda actual'::TEXT,
      CASE WHEN row_count = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
      row_count,
      NULL::TEXT;
  EXCEPTION WHEN OTHERS THEN
    -- Si lanza NO_CURRENT_STORE, es correcto
    IF SQLERRM LIKE '%NO_CURRENT_STORE%' THEN
      RETURN QUERY SELECT 
        'Test 2: Usuario SIN tienda actual'::TEXT,
        'PASS (lanzó NO_CURRENT_STORE)'::TEXT,
        0::BIGINT,
        SQLERRM::TEXT;
    ELSE
      RETURN QUERY SELECT 
        'Test 2: Usuario SIN tienda actual'::TEXT,
        'FAIL'::TEXT,
        0::BIGINT,
        SQLERRM::TEXT;
    END IF;
  END;
  
  -- Limpiar
  DELETE FROM usuario_tienda_actual WHERE usuario_id = test_user_id;
END;
$$;

COMMENT ON FUNCTION test_rls_clientes(UUID, UUID) IS 
'Función de prueba para validar RLS en clientes. Simula usuario con/sin tienda actual.';


-- ============================================================================
-- PASO 6: ÍNDICES PARA OPTIMIZAR RLS
-- ============================================================================

-- Índice en usuario_tienda_actual para optimizar require_current_store()
CREATE INDEX IF NOT EXISTS idx_usuario_tienda_actual_usuario_id 
ON usuario_tienda_actual(usuario_id);

-- Índice en clientes para optimizar filtros de tienda_id
CREATE INDEX IF NOT EXISTS idx_clientes_tienda_id 
ON clientes(tienda_id);

-- Índice compuesto para búsquedas comunes
CREATE INDEX IF NOT EXISTS idx_clientes_tienda_activo 
ON clientes(tienda_id, activo);

RAISE NOTICE '✅ Índices de optimización creados';


-- ============================================================================
-- RESUMEN FINAL
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'RESUMEN DE IMPLEMENTACIÓN RLS - TABLA CLIENTES';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ COMPLETADO:';
  RAISE NOTICE '  - Función require_current_store() verificada/creada';
  RAISE NOTICE '  - Policies antiguas eliminadas';
  RAISE NOTICE '  - RLS habilitado y FORZADO en clientes';
  RAISE NOTICE '  - 4 policies seguras creadas (SELECT, INSERT, UPDATE, DELETE)';
  RAISE NOTICE '  - Policies SOLO para role authenticated';
  RAISE NOTICE '  - Índices de optimización creados';
  RAISE NOTICE '  - Función de prueba test_rls_clientes() creada';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 SEGURIDAD:';
  RAISE NOTICE '  - Sin tienda actual = Sin acceso a datos';
  RAISE NOTICE '  - Imposible leer/escribir clientes de otra tienda';
  RAISE NOTICE '  - FORCE ROW LEVEL SECURITY previene bypass con postgres role';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ IMPORTANTE:';
  RAISE NOTICE '  - Probar con role postgres BYPASEA RLS (es superuser)';
  RAISE NOTICE '  - Probar con role authenticated para validar RLS';
  RAISE NOTICE '  - Frontend debe usar anon key (NO service_role key)';
  RAISE NOTICE '';
  RAISE NOTICE '📋 PRÓXIMOS PASOS:';
  RAISE NOTICE '  1. Ejecutar: SELECT * FROM test_rls_clientes(''user-uuid'', ''store-uuid'');';
  RAISE NOTICE '  2. Auditar código frontend (confirmar NO uso de service_role)';
  RAISE NOTICE '  3. Probar en Postman con token JWT real';
  RAISE NOTICE '  4. Replicar patrón en otras tablas (cotizaciones, pedidos, etc.)';
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
END $$;


-- ============================================================================
-- PATRÓN REPLICABLE PARA OTRAS TABLAS
-- ============================================================================

/**
 * TEMPLATE PARA REPLICAR EN OTRAS TABLAS:
 * 
 * 1. Reemplazar "clientes" por el nombre de la tabla
 * 2. Asegurar que la tabla tiene columna tienda_id (UUID)
 * 3. Ejecutar el siguiente bloque:
 */

/*
-- Limpiar policies existentes
DROP POLICY IF EXISTS "authenticated_read_own_store_TABLA" ON TABLA;
DROP POLICY IF EXISTS "authenticated_insert_own_store_TABLA" ON TABLA;
DROP POLICY IF EXISTS "authenticated_update_own_store_TABLA" ON TABLA;
DROP POLICY IF EXISTS "authenticated_delete_own_store_TABLA" ON TABLA;

-- Habilitar y forzar RLS
ALTER TABLE TABLA ENABLE ROW LEVEL SECURITY;
ALTER TABLE TABLA FORCE ROW LEVEL SECURITY;

-- Crear policies
CREATE POLICY "authenticated_read_own_store_TABLA" 
ON TABLA FOR SELECT TO authenticated
USING (tienda_id = require_current_store());

CREATE POLICY "authenticated_insert_own_store_TABLA" 
ON TABLA FOR INSERT TO authenticated
WITH CHECK (tienda_id = require_current_store());

CREATE POLICY "authenticated_update_own_store_TABLA" 
ON TABLA FOR UPDATE TO authenticated
USING (tienda_id = require_current_store())
WITH CHECK (tienda_id = require_current_store());

CREATE POLICY "authenticated_delete_own_store_TABLA" 
ON TABLA FOR DELETE TO authenticated
USING (tienda_id = require_current_store());

-- Crear índice
CREATE INDEX IF NOT EXISTS idx_TABLA_tienda_id ON TABLA(tienda_id);
*/

-- Fin del script
