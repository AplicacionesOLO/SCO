-- ============================================================
-- FIX v2: RLS cotizacion_items con SECURITY DEFINER
-- PROBLEMA RAIZ: La política RLS de cotizacion_items hace un
-- SELECT sobre cotizaciones (que también tiene RLS). Esto crea
-- una cadena de RLS que puede bloquear el acceso.
-- SOLUCIÓN: Usar una función SECURITY DEFINER que evalúa el
-- acceso bypaseando la RLS de cotizaciones en la subconsulta.
-- ============================================================

-- PASO 1: Crear función helper SECURITY DEFINER
-- Esta función corre con privilegios del owner (bypasea RLS en la subconsulta)
CREATE OR REPLACE FUNCTION fn_check_cotizacion_item_access(p_cotizacion_id bigint)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM cotizaciones c
    WHERE c.id = p_cotizacion_id
      AND c.tienda_id = get_current_user_store()
  );
$$;

-- PASO 2: Eliminar TODAS las políticas existentes en cotizacion_items
DROP POLICY IF EXISTS "users_read_own_store_cotizacion_items" ON cotizacion_items;
DROP POLICY IF EXISTS "users_insert_own_store_cotizacion_items" ON cotizacion_items;
DROP POLICY IF EXISTS "users_update_own_store_cotizacion_items" ON cotizacion_items;
DROP POLICY IF EXISTS "users_delete_own_store_cotizacion_items" ON cotizacion_items;
DROP POLICY IF EXISTS "cotizacion_items_read_policy" ON cotizacion_items;
DROP POLICY IF EXISTS "cotizacion_items_insert_policy" ON cotizacion_items;
DROP POLICY IF EXISTS "cotizacion_items_update_policy" ON cotizacion_items;
DROP POLICY IF EXISTS "cotizacion_items_delete_policy" ON cotizacion_items;
DROP POLICY IF EXISTS "cotizacion_items_select_all_states" ON cotizacion_items;
DROP POLICY IF EXISTS "cotizacion_items_insert_own_store" ON cotizacion_items;
DROP POLICY IF EXISTS "cotizacion_items_update_own_store" ON cotizacion_items;
DROP POLICY IF EXISTS "cotizacion_items_delete_own_store" ON cotizacion_items;
DROP POLICY IF EXISTS "cotizacion_items_select_by_store" ON cotizacion_items;

-- PASO 3: Asegurar RLS activo
ALTER TABLE cotizacion_items ENABLE ROW LEVEL SECURITY;

-- PASO 4: Política SELECT usando la función SECURITY DEFINER
CREATE POLICY "cotizacion_items_select_v2"
ON cotizacion_items
FOR SELECT
USING (fn_check_cotizacion_item_access(cotizacion_id));

-- PASO 5: Política INSERT
CREATE POLICY "cotizacion_items_insert_v2"
ON cotizacion_items
FOR INSERT
WITH CHECK (fn_check_cotizacion_item_access(cotizacion_id));

-- PASO 6: Política UPDATE
CREATE POLICY "cotizacion_items_update_v2"
ON cotizacion_items
FOR UPDATE
USING (fn_check_cotizacion_item_access(cotizacion_id))
WITH CHECK (fn_check_cotizacion_item_access(cotizacion_id));

-- PASO 7: Política DELETE
CREATE POLICY "cotizacion_items_delete_v2"
ON cotizacion_items
FOR DELETE
USING (fn_check_cotizacion_item_access(cotizacion_id));

-- ============================================================
-- VERIFICACIÓN: Debería mostrar las 4 políticas _v2
-- ============================================================
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'cotizacion_items'
ORDER BY cmd;

-- ============================================================
-- DIAGNÓSTICO ADICIONAL: Ver si hay items huérfanos
-- (cotizaciones con subtotal > 0 pero sin items)
-- ============================================================
SELECT 
  c.id,
  c.codigo,
  c.estado,
  c.subtotal,
  COUNT(ci.id) AS total_items
FROM cotizaciones c
LEFT JOIN cotizacion_items ci ON ci.cotizacion_id = c.id
WHERE c.subtotal > 0
GROUP BY c.id, c.codigo, c.estado, c.subtotal
HAVING COUNT(ci.id) = 0
ORDER BY c.id DESC;
