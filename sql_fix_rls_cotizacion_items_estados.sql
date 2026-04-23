-- ============================================================
-- FIX: RLS cotizacion_items - Permitir lectura en todos los estados
-- PROBLEMA: Los items desaparecen cuando la cotización cambia de
-- estado "borrador" a cualquier otro (enviada, aceptada, etc.)
-- CAUSA: Conflicto de políticas RLS que bloquean SELECT en 
-- cotizacion_items para cotizaciones fuera de "borrador"
-- ============================================================

-- PASO 1: Eliminar TODAS las políticas existentes en cotizacion_items
-- para evitar conflictos
DROP POLICY IF EXISTS "users_read_own_store_cotizacion_items" ON cotizacion_items;
DROP POLICY IF EXISTS "users_insert_own_store_cotizacion_items" ON cotizacion_items;
DROP POLICY IF EXISTS "users_update_own_store_cotizacion_items" ON cotizacion_items;
DROP POLICY IF EXISTS "users_delete_own_store_cotizacion_items" ON cotizacion_items;
DROP POLICY IF EXISTS "cotizacion_items_read_policy" ON cotizacion_items;
DROP POLICY IF EXISTS "cotizacion_items_insert_policy" ON cotizacion_items;
DROP POLICY IF EXISTS "cotizacion_items_update_policy" ON cotizacion_items;
DROP POLICY IF EXISTS "cotizacion_items_delete_policy" ON cotizacion_items;
DROP POLICY IF EXISTS "cotizacion_items_select_by_store" ON cotizacion_items;

-- PASO 2: Asegurar que RLS esté habilitado
ALTER TABLE cotizacion_items ENABLE ROW LEVEL SECURITY;

-- PASO 3: Crear política SELECT - Leer items de CUALQUIER cotización de la tienda
-- (sin importar el estado: borrador, enviada, aceptada, rechazada, vencida)
CREATE POLICY "cotizacion_items_select_all_states"
ON cotizacion_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM cotizaciones c
    WHERE c.id = cotizacion_items.cotizacion_id
      AND c.tienda_id = get_current_user_store()
  )
);

-- PASO 4: Crear política INSERT - Insertar items en cotizaciones de la tienda
CREATE POLICY "cotizacion_items_insert_own_store"
ON cotizacion_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM cotizaciones c
    WHERE c.id = cotizacion_items.cotizacion_id
      AND c.tienda_id = get_current_user_store()
  )
);

-- PASO 5: Crear política UPDATE - Actualizar items de cotizaciones de la tienda
CREATE POLICY "cotizacion_items_update_own_store"
ON cotizacion_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM cotizaciones c
    WHERE c.id = cotizacion_items.cotizacion_id
      AND c.tienda_id = get_current_user_store()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM cotizaciones c
    WHERE c.id = cotizacion_items.cotizacion_id
      AND c.tienda_id = get_current_user_store()
  )
);

-- PASO 6: Crear política DELETE - Eliminar items de cotizaciones de la tienda
CREATE POLICY "cotizacion_items_delete_own_store"
ON cotizacion_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM cotizaciones c
    WHERE c.id = cotizacion_items.cotizacion_id
      AND c.tienda_id = get_current_user_store()
  )
);

-- ============================================================
-- VERIFICACIÓN: Ver políticas activas después del fix
-- ============================================================
SELECT 
  policyname, 
  cmd, 
  qual
FROM pg_policies 
WHERE tablename = 'cotizacion_items'
ORDER BY cmd;
