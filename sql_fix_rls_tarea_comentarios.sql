-- ============================================================================
-- FIX RLS: tarea_comentarios — Permitir ver comentarios a usuarios de tienda
-- ============================================================================
-- Problema: La política SELECT de tarea_comentarios solo permite ver comentarios
-- si el usuario es solicitante, miembro de cluster, Admin o Visualizador.
-- Usuarios con rol "Valor Agregado" (u otros) que ven tareas por tienda vía
-- usuario_tienda_actual NO podían ver comentarios.
--
-- Solución: Agregar la condición de usuario_tienda_actual a las políticas de
-- tarea_comentarios (SELECT e INSERT), igual que la política de tareas.
--
-- ⚠️ Ejecutar esto en el SQL Editor de Supabase (Dashboard → SQL Editor → New query)
-- ============================================================================

-- 1. Eliminar política SELECT actual
DROP POLICY IF EXISTS "Ver comentarios de tareas accesibles" ON tarea_comentarios;

-- 2. Recrear política SELECT con condición usuario_tienda_actual
CREATE POLICY "Ver comentarios de tareas accesibles" ON tarea_comentarios
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM tareas t
      WHERE t.id = tarea_comentarios.tarea_id
      AND (
        -- El usuario es el solicitante de la tarea
        t.solicitante_id = auth.uid()
        -- O el usuario tiene la tienda asignada en usuario_tienda_actual
        OR EXISTS (
          SELECT 1 FROM usuario_tienda_actual uta
          WHERE uta.usuario_id = auth.uid()
          AND uta.tienda_id = t.tienda_id
        )
        -- O el usuario pertenece a un cluster activo del cliente
        OR EXISTS (
          SELECT 1 FROM cluster_usuarios cu
          JOIN clusters c ON c.id = cu.cluster_id
          WHERE cu.usuario_id = auth.uid()
          AND c.cliente = (t.datos_formulario ->> 'cliente')
          AND c.activo = true
        )
        -- O es Admin
        OR EXISTS (
          SELECT 1 FROM usuarios u
          WHERE u.id = auth.uid() AND u.rol = 'Admin'
        )
        -- O es Visualizador del cliente
        OR EXISTS (
          SELECT 1 FROM usuarios u
          WHERE u.id = auth.uid()
          AND u.rol LIKE 'Visualizador %'
          AND upper(trim(replace(u.rol, 'Visualizador ', ''))) = upper(trim(COALESCE((t.datos_formulario ->> 'cliente'), '')))
        )
      )
    )
  );

-- 3. Eliminar política INSERT actual
DROP POLICY IF EXISTS "Crear comentarios en tareas accesibles" ON tarea_comentarios;

-- 4. Recrear política INSERT con la misma condición de acceso a tareas
CREATE POLICY "Crear comentarios en tareas accesibles" ON tarea_comentarios
  FOR INSERT
  TO public
  WITH CHECK (
    auth.uid() = usuario_id
    AND EXISTS (
      SELECT 1 FROM tareas t
      WHERE t.id = tarea_comentarios.tarea_id
      AND (
        t.solicitante_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM usuario_tienda_actual uta
          WHERE uta.usuario_id = auth.uid()
          AND uta.tienda_id = t.tienda_id
        )
        OR EXISTS (
          SELECT 1 FROM cluster_usuarios cu
          JOIN clusters c ON c.id = cu.cluster_id
          WHERE cu.usuario_id = auth.uid()
          AND c.cliente = (t.datos_formulario ->> 'cliente')
          AND c.activo = true
        )
        OR EXISTS (
          SELECT 1 FROM usuarios u
          WHERE u.id = auth.uid() AND u.rol = 'Admin'
        )
        OR EXISTS (
          SELECT 1 FROM usuarios u
          WHERE u.id = auth.uid()
          AND u.rol LIKE 'Visualizador %'
          AND upper(trim(replace(u.rol, 'Visualizador ', ''))) = upper(trim(COALESCE((t.datos_formulario ->> 'cliente'), '')))
        )
      )
    )
  );

-- ============================================================================
-- Verificación: confirmar que las políticas quedaron bien
-- ============================================================================

SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'tarea_comentarios';