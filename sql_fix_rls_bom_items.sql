-- ============================================================================
-- CORRECCIÓN RLS PARA TABLA bom_items
-- ============================================================================
-- Problema: La tabla bom_items no tiene políticas RLS correctas, causando
-- error 42501 al insertar componentes BOM desde el formulario de productos.
--
-- Solución: Crear políticas RLS que validen acceso vía product_id -> productos.tienda_id
-- usando el patrón consistente con el resto del sistema (usuario_tienda_actual + auth.uid()).
--
-- INSTRUCCIONES: Ejecuta este script completo en el Editor SQL de Supabase.
-- ============================================================================

-- 1. Habilitar RLS en bom_items (si no está habilitado)
ALTER TABLE bom_items ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas existentes de bom_items (si las hay)
DROP POLICY IF EXISTS "bom_items_select_policy" ON bom_items;
DROP POLICY IF EXISTS "bom_items_insert_policy" ON bom_items;
DROP POLICY IF EXISTS "bom_items_update_policy" ON bom_items;
DROP POLICY IF EXISTS "bom_items_delete_policy" ON bom_items;

-- 3. Política SELECT: Ver items BOM de productos de la tienda activa del usuario
CREATE POLICY "bom_items_select_policy" ON bom_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM productos p
    JOIN usuario_tienda_actual uta ON p.tienda_id = uta.tienda_id
    WHERE p.id_producto = bom_items.product_id
      AND uta.usuario_id = auth.uid()
  )
);

-- 4. Política INSERT: Insertar items BOM solo en productos de la tienda activa del usuario
CREATE POLICY "bom_items_insert_policy" ON bom_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM productos p
    JOIN usuario_tienda_actual uta ON p.tienda_id = uta.tienda_id
    WHERE p.id_producto = bom_items.product_id
      AND uta.usuario_id = auth.uid()
  )
);

-- 5. Política UPDATE: Actualizar items BOM solo de productos de la tienda activa del usuario
CREATE POLICY "bom_items_update_policy" ON bom_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM productos p
    JOIN usuario_tienda_actual uta ON p.tienda_id = uta.tienda_id
    WHERE p.id_producto = bom_items.product_id
      AND uta.usuario_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM productos p
    JOIN usuario_tienda_actual uta ON p.tienda_id = uta.tienda_id
    WHERE p.id_producto = bom_items.product_id
      AND uta.usuario_id = auth.uid()
  )
);

-- 6. Política DELETE: Eliminar items BOM solo de productos de la tienda activa del usuario
CREATE POLICY "bom_items_delete_policy" ON bom_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM productos p
    JOIN usuario_tienda_actual uta ON p.tienda_id = uta.tienda_id
    WHERE p.id_producto = bom_items.product_id
      AND uta.usuario_id = auth.uid()
  )
);

-- 7. Crear índice para optimizar el JOIN con productos
CREATE INDEX IF NOT EXISTS idx_bom_items_product_id ON bom_items(product_id);

-- 8. Verificar políticas creadas
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
WHERE tablename = 'bom_items'
ORDER BY policyname;
