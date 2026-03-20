-- ============================================
-- CORRECCIÓN DE POLÍTICAS RLS PARA PRODUCTOS
-- ============================================
-- Este script corrige el error 403 al crear productos
-- Ejecutar en: Supabase Dashboard > SQL Editor

-- 1. Eliminar políticas existentes que puedan estar causando conflicto
DROP POLICY IF EXISTS "productos_select_policy" ON productos;
DROP POLICY IF EXISTS "productos_insert_policy" ON productos;
DROP POLICY IF EXISTS "productos_update_policy" ON productos;
DROP POLICY IF EXISTS "productos_delete_policy" ON productos;

-- 2. Crear políticas RLS correctas para productos

-- SELECT: Ver productos de la tienda actual del usuario
CREATE POLICY "productos_select_policy" ON productos
FOR SELECT
TO authenticated
USING (
  tienda_id IN (
    SELECT tienda_id 
    FROM usuario_tiendas 
    WHERE usuario_id = auth.uid() 
    AND activo = true
  )
);

-- INSERT: Crear productos en tiendas asignadas al usuario
CREATE POLICY "productos_insert_policy" ON productos
FOR INSERT
TO authenticated
WITH CHECK (
  tienda_id IN (
    SELECT tienda_id 
    FROM usuario_tiendas 
    WHERE usuario_id = auth.uid() 
    AND activo = true
  )
);

-- UPDATE: Actualizar productos de tiendas asignadas
CREATE POLICY "productos_update_policy" ON productos
FOR UPDATE
TO authenticated
USING (
  tienda_id IN (
    SELECT tienda_id 
    FROM usuario_tiendas 
    WHERE usuario_id = auth.uid() 
    AND activo = true
  )
)
WITH CHECK (
  tienda_id IN (
    SELECT tienda_id 
    FROM usuario_tiendas 
    WHERE usuario_id = auth.uid() 
    AND activo = true
  )
);

-- DELETE: Eliminar productos de tiendas asignadas
CREATE POLICY "productos_delete_policy" ON productos
FOR DELETE
TO authenticated
USING (
  tienda_id IN (
    SELECT tienda_id 
    FROM usuario_tiendas 
    WHERE usuario_id = auth.uid() 
    AND activo = true
  )
);

-- 3. Verificar que RLS esté habilitado
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;

-- 4. Verificar las políticas creadas
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
WHERE tablename = 'productos'
ORDER BY policyname;
