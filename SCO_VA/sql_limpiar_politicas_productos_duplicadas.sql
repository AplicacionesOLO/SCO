-- ============================================================================
-- LIMPIEZA DE POLÍTICAS RLS DUPLICADAS EN TABLA PRODUCTOS
-- ============================================================================
-- Problema: Existen políticas RLS duplicadas que causan conflictos
-- Solución: Eliminar políticas antiguas y mantener solo las basadas en require_current_store()
-- ============================================================================

-- 1. ELIMINAR POLÍTICAS ANTIGUAS (basadas en usuario_tiendas)
-- ============================================================================

DROP POLICY IF EXISTS "productos_select_policy" ON productos;
DROP POLICY IF EXISTS "productos_insert_policy" ON productos;
DROP POLICY IF EXISTS "productos_update_policy" ON productos;
DROP POLICY IF EXISTS "productos_delete_policy" ON productos;

-- ============================================================================
-- 2. VERIFICAR QUE SOLO QUEDAN LAS POLÍTICAS CORRECTAS
-- ============================================================================

-- Las políticas que deben permanecer son:
-- ✅ users_read_own_store_productos
-- ✅ users_insert_own_store_productos
-- ✅ users_update_own_store_productos
-- ✅ users_delete_own_store_productos

-- Verificar políticas actuales:
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN 'USING: ' || qual
    WHEN with_check IS NOT NULL THEN 'WITH CHECK: ' || with_check
    ELSE 'N/A'
  END as condition
FROM pg_policies
WHERE tablename = 'productos'
ORDER BY cmd, policyname;

-- ============================================================================
-- 3. RESULTADO ESPERADO
-- ============================================================================
-- Después de ejecutar este script, deberías ver solo 4 políticas:
--
-- | policyname                        | cmd    | condition                              |
-- |-----------------------------------|--------|----------------------------------------|
-- | users_delete_own_store_productos  | DELETE | USING: tienda_id = require_current_store() |
-- | users_insert_own_store_productos  | INSERT | WITH CHECK: tienda_id = require_current_store() |
-- | users_read_own_store_productos    | SELECT | USING: tienda_id = require_current_store() |
-- | users_update_own_store_productos  | UPDATE | USING: tienda_id = require_current_store() |
-- ============================================================================

-- ============================================================================
-- 4. NOTAS IMPORTANTES
-- ============================================================================
-- ✅ Las políticas basadas en require_current_store() son más eficientes
-- ✅ Garantizan que cada usuario solo trabaje con su tienda actual
-- ✅ Eliminan la necesidad de verificar múltiples tiendas en usuario_tiendas
-- ✅ Mejoran el rendimiento de las consultas
-- ============================================================================
