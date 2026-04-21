-- =============================================
-- FIX: Políticas RLS para tabla 'categorias'
-- Permite a usuarios autenticados gestionar
-- categorías de su propia tienda
-- =============================================

-- 1. Habilitar RLS si no está habilitado
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;

-- 2. Política SELECT: ver categorías de la tienda actual
DROP POLICY IF EXISTS "categorias_select_tienda" ON categorias;
CREATE POLICY "categorias_select_tienda"
  ON categorias FOR SELECT
  USING (
    tienda_id = (
      SELECT tienda_id FROM usuario_tienda_actual
      WHERE usuario_id = auth.uid()
    )
  );

-- 3. Política INSERT: crear categorías en la tienda actual
DROP POLICY IF EXISTS "categorias_insert_tienda" ON categorias;
CREATE POLICY "categorias_insert_tienda"
  ON categorias FOR INSERT
  WITH CHECK (
    tienda_id = (
      SELECT tienda_id FROM usuario_tienda_actual
      WHERE usuario_id = auth.uid()
    )
  );

-- 4. Política UPDATE: editar categorías de la tienda actual
DROP POLICY IF EXISTS "categorias_update_tienda" ON categorias;
CREATE POLICY "categorias_update_tienda"
  ON categorias FOR UPDATE
  USING (
    tienda_id = (
      SELECT tienda_id FROM usuario_tienda_actual
      WHERE usuario_id = auth.uid()
    )
  )
  WITH CHECK (
    tienda_id = (
      SELECT tienda_id FROM usuario_tienda_actual
      WHERE usuario_id = auth.uid()
    )
  );

-- 5. Política DELETE: eliminar categorías de la tienda actual
DROP POLICY IF EXISTS "categorias_delete_tienda" ON categorias;
CREATE POLICY "categorias_delete_tienda"
  ON categorias FOR DELETE
  USING (
    tienda_id = (
      SELECT tienda_id FROM usuario_tienda_actual
      WHERE usuario_id = auth.uid()
    )
  );
