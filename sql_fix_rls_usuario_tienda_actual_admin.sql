-- ============================================================================
-- CORRECCIÓN RLS: usuario_tienda_actual - PERMITIR ADMINS ASIGNAR TIENDAS
-- ============================================================================
-- Sistema: SCO (Sistema de Costeos OLO)
-- Fecha: 2025
-- Propósito: Permitir que usuarios con rol Admin puedan asignar tiendas a otros usuarios
--            manteniendo la seguridad para usuarios normales
-- 
-- PROBLEMA ACTUAL:
-- - Las políticas RLS solo permiten que cada usuario modifique su propia tienda
-- - Cuando un Admin intenta asignar una tienda a otro usuario, RLS lo bloquea
-- - Error: "new row violates row-level security policy for table usuario_tienda_actual"
-- 
-- SOLUCIÓN:
-- - Crear política especial para Admins que les permita gestionar cualquier usuario
-- - Mantener política restrictiva para usuarios normales
-- ============================================================================

-- ============================================================================
-- PASO 1: VERIFICAR Y HABILITAR RLS
-- ============================================================================

-- Habilitar RLS si no está habilitado
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class 
    WHERE relname = 'usuario_tienda_actual' 
    AND relrowsecurity = true
  ) THEN
    ALTER TABLE usuario_tienda_actual ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✅ RLS habilitado en usuario_tienda_actual';
  ELSE
    RAISE NOTICE '✅ RLS ya estaba habilitado en usuario_tienda_actual';
  END IF;
END $$;

-- ============================================================================
-- PASO 2: LIMPIAR POLÍTICAS EXISTENTES
-- ============================================================================

-- Eliminar políticas antiguas que puedan estar causando conflictos
DROP POLICY IF EXISTS "users_manage_own_current_store" ON usuario_tienda_actual;
DROP POLICY IF EXISTS "authenticated_read_own_current_store" ON usuario_tienda_actual;
DROP POLICY IF EXISTS "authenticated_update_own_current_store" ON usuario_tienda_actual;
DROP POLICY IF EXISTS "authenticated_insert_own_current_store" ON usuario_tienda_actual;
DROP POLICY IF EXISTS "authenticated_delete_own_current_store" ON usuario_tienda_actual;
DROP POLICY IF EXISTS "admin_manage_all_current_stores" ON usuario_tienda_actual;
DROP POLICY IF EXISTS "public_read_current_store" ON usuario_tienda_actual;

RAISE NOTICE '✅ Políticas antiguas eliminadas';

-- ============================================================================
-- PASO 3: CREAR POLÍTICAS SEGURAS
-- ============================================================================

/**
 * POLÍTICA 1: Usuarios normales pueden leer su propia tienda actual
 * 
 * Permite: Solo usuarios autenticados
 * Condición: usuario_id = auth.uid()
 * Operación: SELECT
 */
CREATE POLICY "authenticated_read_own_current_store"
ON usuario_tienda_actual
FOR SELECT
TO authenticated
USING (
  usuario_id = auth.uid()
  OR
  -- Admins pueden leer cualquier tienda
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.rol = 'Admin'
    AND usuarios.activo = true
  )
);

COMMENT ON POLICY "authenticated_read_own_current_store" ON usuario_tienda_actual IS
'Usuarios pueden leer su propia tienda actual. Admins pueden leer cualquier tienda.';

/**
 * POLÍTICA 2: Usuarios normales pueden insertar/actualizar su propia tienda
 * 
 * Permite: Solo usuarios autenticados
 * Condición: usuario_id = auth.uid() O es Admin
 * Operación: INSERT, UPDATE
 */
CREATE POLICY "authenticated_manage_own_current_store"
ON usuario_tienda_actual
FOR INSERT
TO authenticated
WITH CHECK (
  usuario_id = auth.uid()
  OR
  -- Admins pueden insertar para cualquier usuario
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.rol = 'Admin'
    AND usuarios.activo = true
  )
);

COMMENT ON POLICY "authenticated_manage_own_current_store" ON usuario_tienda_actual IS
'Usuarios pueden insertar su propia tienda actual. Admins pueden insertar para cualquier usuario.';

/**
 * POLÍTICA 3: Actualización de tienda actual
 * 
 * Permite: Solo usuarios autenticados
 * Condición: usuario_id = auth.uid() O es Admin
 * Operación: UPDATE
 */
CREATE POLICY "authenticated_update_current_store"
ON usuario_tienda_actual
FOR UPDATE
TO authenticated
USING (
  usuario_id = auth.uid()
  OR
  -- Admins pueden actualizar cualquier tienda
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.rol = 'Admin'
    AND usuarios.activo = true
  )
)
WITH CHECK (
  usuario_id = auth.uid()
  OR
  -- Admins pueden actualizar cualquier tienda
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.rol = 'Admin'
    AND usuarios.activo = true
  )
);

COMMENT ON POLICY "authenticated_update_current_store" ON usuario_tienda_actual IS
'Usuarios pueden actualizar su propia tienda actual. Admins pueden actualizar cualquier tienda.';

/**
 * POLÍTICA 4: Eliminación de tienda actual
 * 
 * Permite: Solo usuarios autenticados
 * Condición: usuario_id = auth.uid() O es Admin
 * Operación: DELETE
 */
CREATE POLICY "authenticated_delete_current_store"
ON usuario_tienda_actual
FOR DELETE
TO authenticated
USING (
  usuario_id = auth.uid()
  OR
  -- Admins pueden eliminar cualquier tienda
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.rol = 'Admin'
    AND usuarios.activo = true
  )
);

COMMENT ON POLICY "authenticated_delete_current_store" ON usuario_tienda_actual IS
'Usuarios pueden eliminar su propia tienda actual. Admins pueden eliminar cualquier tienda.';

RAISE NOTICE '✅ Políticas seguras creadas';

-- ============================================================================
-- PASO 4: VERIFICAR CONFIGURACIÓN FINAL
-- ============================================================================

-- Verificar que RLS está habilitado
DO $$
DECLARE
  rls_enabled BOOLEAN;
BEGIN
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'usuario_tienda_actual';
  
  IF NOT rls_enabled THEN
    RAISE EXCEPTION '❌ RLS NO está habilitado en usuario_tienda_actual';
  END IF;
  
  RAISE NOTICE '✅ RLS habilitado: %', rls_enabled;
END $$;

-- Contar políticas creadas
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'usuario_tienda_actual';
  
  RAISE NOTICE '✅ Total de políticas en usuario_tienda_actual: %', policy_count;
  
  IF policy_count < 4 THEN
    RAISE WARNING '⚠️ Se esperaban 4 políticas (SELECT, INSERT, UPDATE, DELETE)';
  END IF;
END $$;

-- Listar todas las políticas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'usuario_tienda_actual'
ORDER BY cmd, policyname;

-- ============================================================================
-- PASO 5: APLICAR MISMAS POLÍTICAS A usuario_tiendas
-- ============================================================================

-- Habilitar RLS en usuario_tiendas si no está habilitado
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class 
    WHERE relname = 'usuario_tiendas' 
    AND relrowsecurity = true
  ) THEN
    ALTER TABLE usuario_tiendas ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✅ RLS habilitado en usuario_tiendas';
  ELSE
    RAISE NOTICE '✅ RLS ya estaba habilitado en usuario_tiendas';
  END IF;
END $$;

-- Limpiar políticas existentes en usuario_tiendas
DROP POLICY IF EXISTS "users_read_own_stores" ON usuario_tiendas;
DROP POLICY IF EXISTS "users_manage_own_stores" ON usuario_tiendas;
DROP POLICY IF EXISTS "authenticated_read_own_stores" ON usuario_tiendas;
DROP POLICY IF EXISTS "authenticated_manage_own_stores" ON usuario_tiendas;
DROP POLICY IF EXISTS "admin_manage_all_stores" ON usuario_tiendas;

-- Crear políticas para usuario_tiendas
CREATE POLICY "authenticated_read_stores"
ON usuario_tiendas
FOR SELECT
TO authenticated
USING (
  usuario_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.rol = 'Admin'
    AND usuarios.activo = true
  )
);

CREATE POLICY "authenticated_insert_stores"
ON usuario_tiendas
FOR INSERT
TO authenticated
WITH CHECK (
  usuario_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.rol = 'Admin'
    AND usuarios.activo = true
  )
);

CREATE POLICY "authenticated_update_stores"
ON usuario_tiendas
FOR UPDATE
TO authenticated
USING (
  usuario_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.rol = 'Admin'
    AND usuarios.activo = true
  )
)
WITH CHECK (
  usuario_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.rol = 'Admin'
    AND usuarios.activo = true
  )
);

CREATE POLICY "authenticated_delete_stores"
ON usuario_tiendas
FOR DELETE
TO authenticated
USING (
  usuario_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.rol = 'Admin'
    AND usuarios.activo = true
  )
);

RAISE NOTICE '✅ Políticas creadas en usuario_tiendas';

-- ============================================================================
-- RESUMEN FINAL
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'RESUMEN DE IMPLEMENTACIÓN RLS - TABLAS DE TIENDAS';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ COMPLETADO:';
  RAISE NOTICE '  - RLS habilitado en usuario_tienda_actual';
  RAISE NOTICE '  - RLS habilitado en usuario_tiendas';
  RAISE NOTICE '  - Políticas antiguas eliminadas';
  RAISE NOTICE '  - 4 políticas seguras creadas en cada tabla';
  RAISE NOTICE '  - Admins pueden gestionar tiendas de cualquier usuario';
  RAISE NOTICE '  - Usuarios normales solo pueden gestionar su propia tienda';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 SEGURIDAD:';
  RAISE NOTICE '  - Usuarios normales: Solo su propia tienda';
  RAISE NOTICE '  - Admins: Pueden gestionar cualquier tienda';
  RAISE NOTICE '  - Validación de rol Admin activo en cada operación';
  RAISE NOTICE '';
  RAISE NOTICE '✅ AHORA PUEDES:';
  RAISE NOTICE '  - Como Admin: Asignar tiendas a cualquier usuario';
  RAISE NOTICE '  - Como Admin: Cambiar la tienda activa de cualquier usuario';
  RAISE NOTICE '  - Como Admin: Eliminar asignaciones de tienda';
  RAISE NOTICE '  - Como Usuario: Solo gestionar tu propia tienda';
  RAISE NOTICE '';
  RAISE NOTICE '📋 PRÓXIMOS PASOS:';
  RAISE NOTICE '  1. Refrescar la aplicación (F5)';
  RAISE NOTICE '  2. Intentar asignar una tienda a un usuario';
  RAISE NOTICE '  3. Verificar que funciona correctamente';
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
END $$;
