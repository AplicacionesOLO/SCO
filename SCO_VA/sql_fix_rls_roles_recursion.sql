-- ============================================================
-- FIX: Recursión infinita en política RLS de tabla "roles"
-- Error: 42P17 - infinite recursion detected in policy for relation "roles"
-- ============================================================
-- CAUSA: La política "admin_manage_roles" hace JOIN con la misma tabla
--        "roles" desde dentro de su propia condición USING, creando
--        un ciclo infinito.
-- SOLUCIÓN: Eliminar la política recursiva y reemplazarla con políticas
--           que usan una función SECURITY DEFINER (ya creada).
-- ============================================================

-- Paso 1: Eliminar la política problemática
DROP POLICY IF EXISTS admin_manage_roles ON public.roles;

-- Paso 2: Política de LECTURA - todos los usuarios autenticados pueden leer roles
-- (los nombres de roles no son datos sensibles)
CREATE POLICY "roles_select_authenticated"
ON public.roles
FOR SELECT
TO authenticated
USING (true);

-- Paso 3: Política de ESCRITURA - solo admins, usando función segura sin recursión
-- La función is_admin_user() ya fue creada con SECURITY DEFINER,
-- lo que evita que se dispare RLS al consultarla.
CREATE POLICY "roles_write_admin_only"
ON public.roles
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- ============================================================
-- INSTRUCCIONES:
-- 1. Ve a tu proyecto en supabase.com
-- 2. Entra a "SQL Editor"
-- 3. Pega y ejecuta este script completo
-- 4. Recarga la aplicación
-- ============================================================
