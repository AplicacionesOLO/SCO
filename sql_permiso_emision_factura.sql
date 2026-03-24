-- =====================================================
-- PERMISO ESPECÍFICO PARA EMISIÓN DE FACTURA
-- =====================================================
-- Este script crea un permiso específico para el módulo
-- "Emisión de Factura" que está deshabilitado por defecto.
-- 
-- Para habilitar este módulo en un rol específico:
-- 1. Ve a Seguridad → Roles
-- 2. Selecciona el rol deseado
-- 3. En la matriz de permisos, busca "Facturación"
-- 4. Marca el checkbox "Ver módulo de Emisión de Factura (experimental)"
-- =====================================================

-- 1. CREAR EL PERMISO ESPECÍFICO
INSERT INTO public.permisos (nombre_permiso, descripcion_permiso, modulo)
VALUES (
  'facturacion:emision:view',
  'Ver módulo de Emisión de Factura (experimental)',
  'Facturación'
)
ON CONFLICT (nombre_permiso) DO NOTHING;

-- 2. VERIFICAR QUE EL PERMISO SE CREÓ CORRECTAMENTE
SELECT 
  id_permiso,
  nombre_permiso,
  descripcion_permiso,
  modulo,
  created_at
FROM public.permisos
WHERE nombre_permiso = 'facturacion:emision:view';

-- =====================================================
-- NOTA IMPORTANTE:
-- =====================================================
-- Este permiso NO se asigna automáticamente a ningún rol.
-- Esto significa que el módulo "Emisión de Factura" estará
-- OCULTO en el menú para todos los usuarios hasta que
-- manualmente asignes este permiso a los roles que lo necesiten.
--
-- Para asignar manualmente a un rol específico (ejemplo: Administrador):
-- =====================================================

-- EJEMPLO: Asignar a Administrador (DESCOMENTA SI LO NECESITAS)
/*
INSERT INTO public.rol_permisos (rol_id, permiso_id)
SELECT 
  r.id_rol,
  p.id_permiso
FROM public.roles r
CROSS JOIN public.permisos p
WHERE r.nombre_rol = 'Administrador'
AND p.nombre_permiso = 'facturacion:emision:view'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;
*/

-- EJEMPLO: Asignar a Super Administrador (DESCOMENTA SI LO NECESITAS)
/*
INSERT INTO public.rol_permisos (rol_id, permiso_id)
SELECT 
  r.id_rol,
  p.id_permiso
FROM public.roles r
CROSS JOIN public.permisos p
WHERE r.nombre_rol = 'Super Administrador'
AND p.nombre_permiso = 'facturacion:emision:view'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;
*/

-- =====================================================
-- VERIFICAR ASIGNACIONES (después de asignar manualmente)
-- =====================================================
/*
SELECT 
  r.nombre_rol,
  p.nombre_permiso,
  p.descripcion_permiso
FROM public.roles r
JOIN public.rol_permisos rp ON r.id_rol = rp.rol_id
JOIN public.permisos p ON rp.permiso_id = p.id_permiso
WHERE p.nombre_permiso = 'facturacion:emision:view'
ORDER BY r.nombre_rol;
*/

-- =====================================================
-- LOGS DE DEPURACIÓN
-- =====================================================
-- Para verificar que el permiso funciona correctamente,
-- revisa la consola del navegador (F12 → Console) y busca:
-- [SIDEBAR] 🔐 Verificando permiso: facturacion:emision:view
-- [SIDEBAR] ✅ Permiso concedido: facturacion:emision:view
-- [SIDEBAR] ❌ Permiso denegado: facturacion:emision:view
-- =====================================================
