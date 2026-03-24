-- ============================================================================
-- DIAGNÓSTICO COMPLETO CORREGIDO: Usuario jalvarez@ologistics.com
-- ============================================================================
-- Este script verifica toda la cadena de permisos con la estructura REAL
-- ============================================================================

-- PASO 1: Verificar datos básicos del usuario
-- ============================================================================
SELECT '=== PASO 1: DATOS DEL USUARIO ===' as paso;

SELECT 
  u.id,
  u.email,
  u.nombre_completo,  -- ✅ CORREGIDO: era "nombre"
  u.activo,
  u.rol as rol_legacy,
  u.created_at
FROM usuarios u
WHERE u.email = 'jalvarez@ologistics.com';


-- PASO 2: Verificar roles asignados en usuario_roles
-- ============================================================================
SELECT '=== PASO 2: ROLES ASIGNADOS ===' as paso;

SELECT 
  ur.rol_id as usuario_rol_id,  -- ✅ CORREGIDO: era "ur.id"
  ur.usuario_id,
  ur.rol_id,
  r.nombre as rol_nombre,
  r.descripcion as rol_descripcion,  -- ✅ CORREGIDO: roles NO tiene columna "activo"
  ur.created_at
FROM usuario_roles ur
JOIN roles r ON r.id = ur.rol_id
WHERE ur.usuario_id IN (
  SELECT id FROM usuarios WHERE email = 'jalvarez@ologistics.com'
);


-- PASO 3: Verificar permisos del rol en rol_permisos
-- ============================================================================
SELECT '=== PASO 3: PERMISOS DEL ROL ===' as paso;

SELECT 
  rp.id as rol_permiso_id,
  rp.rol_id,
  r.nombre as rol_nombre,
  rp.permiso_id,
  p.nombre as permiso_nombre,
  p.descripcion
FROM rol_permisos rp
JOIN roles r ON r.id = rp.rol_id
JOIN permisos p ON p.id = rp.permiso_id
WHERE rp.rol_id IN (
  SELECT ur.rol_id 
  FROM usuario_roles ur
  WHERE ur.usuario_id IN (
    SELECT id FROM usuarios WHERE email = 'jalvarez@ologistics.com'
  )
)
ORDER BY p.nombre;


-- PASO 4: Contar permisos por usuario (jalvarez vs admin)
-- ============================================================================
SELECT '=== PASO 4: COMPARACIÓN CON ADMIN ===' as paso;

SELECT 
  u.email,
  u.nombre_completo,  -- ✅ CORREGIDO
  u.rol as rol_legacy,
  COUNT(DISTINCT ur.rol_id) as cantidad_roles,
  COUNT(DISTINCT rp.permiso_id) as cantidad_permisos,
  STRING_AGG(DISTINCT r.nombre, ', ') as roles_asignados
FROM usuarios u
LEFT JOIN usuario_roles ur ON ur.usuario_id = u.id
LEFT JOIN roles r ON r.id = ur.rol_id
LEFT JOIN rol_permisos rp ON rp.rol_id = ur.rol_id
WHERE u.email IN ('jalvarez@ologistics.com', 'admin@ologistics.com')
GROUP BY u.id, u.email, u.nombre_completo, u.rol
ORDER BY u.email;


-- PASO 5: Verificar duplicidad en usuario_roles
-- ============================================================================
SELECT '=== PASO 5: VERIFICAR DUPLICADOS ===' as paso;

SELECT 
  usuario_id,
  rol_id,
  COUNT(*) as cantidad_duplicados,
  STRING_AGG(rol_id::text, ', ') as ids_duplicados  -- ✅ CORREGIDO: mostrar rol_id
FROM usuario_roles
WHERE usuario_id IN (
  SELECT id FROM usuarios WHERE email = 'jalvarez@ologistics.com'
)
GROUP BY usuario_id, rol_id
HAVING COUNT(*) > 1;


-- PASO 6: Verificar todos los roles y sus permisos
-- ============================================================================
SELECT '=== PASO 6: TODOS LOS ROLES Y SUS PERMISOS ===' as paso;

SELECT 
  r.id as rol_id,
  r.nombre as rol_nombre,
  r.descripcion,  -- ✅ CORREGIDO: roles NO tiene "activo"
  COUNT(rp.permiso_id) as cantidad_permisos
FROM roles r
LEFT JOIN rol_permisos rp ON rp.rol_id = r.id
GROUP BY r.id, r.nombre, r.descripcion
ORDER BY r.id;


-- PASO 7: Verificar si el usuario tiene tienda asignada
-- ============================================================================
SELECT '=== PASO 7: TIENDAS ASIGNADAS ===' as paso;

SELECT 
  ut.usuario_id,
  ut.tienda_id,
  t.nombre as tienda_nombre,
  t.codigo as tienda_codigo,
  ut.activo as asignacion_activa,
  ut.created_at
FROM usuario_tiendas ut
JOIN tiendas t ON t.id = ut.tienda_id
WHERE ut.usuario_id IN (
  SELECT id FROM usuarios WHERE email = 'jalvarez@ologistics.com'
);


-- PASO 8: Verificar tienda actual del usuario
-- ============================================================================
SELECT '=== PASO 8: TIENDA ACTUAL ===' as paso;

SELECT 
  uta.usuario_id,
  uta.tienda_id,
  t.nombre as tienda_nombre,
  t.codigo as tienda_codigo,
  t.activo as tienda_activa,
  uta.updated_at
FROM usuario_tienda_actual uta
JOIN tiendas t ON t.id = uta.tienda_id
WHERE uta.usuario_id IN (
  SELECT id FROM usuarios WHERE email = 'jalvarez@ologistics.com'
);


-- PASO 9: Verificar estructura completa (simulando el hook)
-- ============================================================================
SELECT '=== PASO 9: ESTRUCTURA COMPLETA (COMO EL HOOK) ===' as paso;

WITH usuario_data AS (
  SELECT 
    u.id,
    u.email,
    u.nombre_completo,  -- ✅ CORREGIDO
    u.activo,
    json_agg(
      json_build_object(
        'rol_id', ur.rol_id,
        'roles', json_build_object(
          'id', r.id,
          'nombre', r.nombre,
          'rol_permisos', (
            SELECT json_agg(
              json_build_object(
                'permisos', json_build_object(
                  'nombre', p.nombre,
                  'descripcion', p.descripcion
                )
              )
            )
            FROM rol_permisos rp
            JOIN permisos p ON p.id = rp.permiso_id
            WHERE rp.rol_id = r.id
          )
        )
      )
    ) as usuario_roles
  FROM usuarios u
  LEFT JOIN usuario_roles ur ON ur.usuario_id = u.id
  LEFT JOIN roles r ON r.id = ur.rol_id
  WHERE u.email = 'jalvarez@ologistics.com'
  GROUP BY u.id, u.email, u.nombre_completo, u.activo
)
SELECT 
  id,
  email,
  nombre_completo,
  activo,
  usuario_roles
FROM usuario_data;


-- PASO 10: RESUMEN Y DIAGNÓSTICO
-- ============================================================================
SELECT '=== PASO 10: RESUMEN Y DIAGNÓSTICO ===' as paso;

WITH diagnostico AS (
  SELECT 
    u.email,
    u.nombre_completo,  -- ✅ CORREGIDO
    u.activo as usuario_activo,
    CASE WHEN ur.rol_id IS NOT NULL THEN '✅' ELSE '❌' END as tiene_rol,
    CASE WHEN r.id IS NOT NULL THEN '✅' ELSE '❌' END as rol_existe,
    CASE WHEN COUNT(rp.permiso_id) > 0 THEN '✅' ELSE '❌' END as tiene_permisos,
    COUNT(rp.permiso_id) as cantidad_permisos,
    r.nombre as rol_nombre
  FROM usuarios u
  LEFT JOIN usuario_roles ur ON ur.usuario_id = u.id
  LEFT JOIN roles r ON r.id = ur.rol_id
  LEFT JOIN rol_permisos rp ON rp.rol_id = r.id
  WHERE u.email = 'jalvarez@ologistics.com'
  GROUP BY u.id, u.email, u.nombre_completo, u.activo, ur.rol_id, r.id, r.nombre
)
SELECT 
  email,
  nombre_completo,
  usuario_activo,
  tiene_rol,
  rol_existe,
  tiene_permisos,
  cantidad_permisos,
  rol_nombre,
  CASE 
    WHEN tiene_rol = '❌' THEN '🔴 PROBLEMA: Usuario sin rol asignado en usuario_roles'
    WHEN rol_existe = '❌' THEN '🔴 PROBLEMA: Rol no existe en tabla roles'
    WHEN tiene_permisos = '❌' THEN '🔴 PROBLEMA: Rol sin permisos en rol_permisos'
    ELSE '✅ TODO CORRECTO'
  END as diagnostico
FROM diagnostico;


-- PASO 11: Verificar permisos agrupados por módulo
-- ============================================================================
SELECT '=== PASO 11: PERMISOS POR MÓDULO ===' as paso;

WITH permisos_usuario AS (
  SELECT DISTINCT p.nombre
  FROM usuarios u
  JOIN usuario_roles ur ON ur.usuario_id = u.id
  JOIN rol_permisos rp ON rp.rol_id = ur.rol_id
  JOIN permisos p ON p.id = rp.permiso_id
  WHERE u.email = 'jalvarez@ologistics.com'
)
SELECT 
  SPLIT_PART(nombre, ':', 1) as modulo,
  COUNT(*) as cantidad_permisos,
  STRING_AGG(SPLIT_PART(nombre, ':', 2), ', ' ORDER BY nombre) as acciones
FROM permisos_usuario
GROUP BY SPLIT_PART(nombre, ':', 1)
ORDER BY modulo;


-- PASO 12: Comparar con usuario Admin
-- ============================================================================
SELECT '=== PASO 12: COMPARACIÓN DETALLADA CON ADMIN ===' as paso;

WITH permisos_por_usuario AS (
  SELECT 
    u.email,
    u.nombre_completo,
    COUNT(DISTINCT p.id) as total_permisos,
    STRING_AGG(DISTINCT r.nombre, ', ') as roles,
    json_agg(DISTINCT p.nombre ORDER BY p.nombre) as lista_permisos
  FROM usuarios u
  LEFT JOIN usuario_roles ur ON ur.usuario_id = u.id
  LEFT JOIN roles r ON r.id = ur.rol_id
  LEFT JOIN rol_permisos rp ON rp.rol_id = r.id
  LEFT JOIN permisos p ON p.id = rp.permiso_id
  WHERE u.email IN ('jalvarez@ologistics.com', 'admin@ologistics.com')
  GROUP BY u.id, u.email, u.nombre_completo
)
SELECT * FROM permisos_por_usuario
ORDER BY email;
