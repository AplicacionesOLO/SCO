-- =====================================================
-- HABILITAR LECTURA DE TABLAS DE PERMISOS PARA USUARIOS AUTENTICADOS
-- =====================================================
-- Este script corrige el problema de RLS que impide que el frontend
-- cargue los permisos del usuario desde las tablas:
-- - permisos
-- - rol_permisos
-- - roles
-- - usuario_roles
-- =====================================================

-- 1. HABILITAR RLS EN LAS TABLAS (si no está habilitado)
-- =====================================================

ALTER TABLE public.permisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rol_permisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuario_roles ENABLE ROW LEVEL SECURITY;

-- 2. CREAR POLÍTICAS DE LECTURA PARA USUARIOS AUTENTICADOS
-- =====================================================

-- Política para leer la tabla permisos
DROP POLICY IF EXISTS "Permitir lectura permisos a autenticados" ON public.permisos;
CREATE POLICY "Permitir lectura permisos a autenticados"
ON public.permisos
FOR SELECT
TO authenticated
USING (true);

-- Política para leer la tabla rol_permisos
DROP POLICY IF EXISTS "Permitir lectura rol_permisos a autenticados" ON public.rol_permisos;
CREATE POLICY "Permitir lectura rol_permisos a autenticados"
ON public.rol_permisos
FOR SELECT
TO authenticated
USING (true);

-- Política para leer la tabla roles
DROP POLICY IF EXISTS "Permitir lectura roles a autenticados" ON public.roles;
CREATE POLICY "Permitir lectura roles a autenticados"
ON public.roles
FOR SELECT
TO authenticated
USING (true);

-- Política para leer la tabla usuario_roles
DROP POLICY IF EXISTS "Permitir lectura usuario_roles a autenticados" ON public.usuario_roles;
CREATE POLICY "Permitir lectura usuario_roles a autenticados"
ON public.usuario_roles
FOR SELECT
TO authenticated
USING (true);

-- 3. VERIFICAR QUE LAS POLÍTICAS SE CREARON CORRECTAMENTE
-- =====================================================

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN ('permisos', 'rol_permisos', 'roles', 'usuario_roles')
ORDER BY tablename, policyname;

-- 4. PROBAR QUE LA CONSULTA FUNCIONA
-- =====================================================

-- Esta consulta debería retornar los permisos del usuario jalvarez
-- Reemplaza el UUID con el ID real del usuario jalvarez
SELECT 
    u.id,
    u.email,
    u.nombre_completo,
    u.rol,
    ur.rol_id,
    r.nombre as rol_nombre,
    rp.permiso_id,
    p.nombre as permiso_nombre
FROM usuarios u
JOIN usuario_roles ur ON ur.usuario_id = u.id
JOIN roles r ON r.id = ur.rol_id
JOIN rol_permisos rp ON rp.rol_id = r.id
JOIN permisos p ON p.id = rp.permiso_id
WHERE u.email = 'jalvarez@ologistics.com'
ORDER BY p.nombre;

-- Fin del script
SELECT '✅ Políticas RLS de lectura habilitadas correctamente' as resultado;
