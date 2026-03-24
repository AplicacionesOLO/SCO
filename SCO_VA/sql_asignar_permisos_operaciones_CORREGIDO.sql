-- ============================================================================
-- ASIGNAR PERMISOS AL ROL "OPERACIONES" - VERSIÓN CORREGIDA
-- ============================================================================
-- Este script asigna todos los permisos necesarios al rol "Operaciones"
-- y verifica que la estructura de la base de datos sea correcta
-- ============================================================================

-- PASO 1: Verificar que el rol "Operaciones" existe
-- ============================================================================
SELECT '=== PASO 1: VERIFICAR ROL OPERACIONES ===' as paso;

SELECT 
  id,
  nombre,
  descripcion,
  created_at
FROM roles
WHERE nombre = 'Operaciones';

-- Si no existe, crearlo
INSERT INTO roles (nombre, descripcion)
VALUES ('Operaciones', 'Rol para operaciones generales del sistema')
ON CONFLICT (nombre) DO NOTHING;


-- PASO 2: Verificar restricción UNIQUE en rol_permisos
-- ============================================================================
SELECT '=== PASO 2: VERIFICAR RESTRICCIÓN UNIQUE ===' as paso;

-- Agregar restricción UNIQUE si no existe
DO $$ 
BEGIN
    -- Verificar si la restricción ya existe
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'rol_permisos_rol_id_permiso_id_key'
    ) THEN
        -- Agregar restricción UNIQUE
        ALTER TABLE rol_permisos 
        ADD CONSTRAINT rol_permisos_rol_id_permiso_id_key 
        UNIQUE (rol_id, permiso_id);
        
        RAISE NOTICE '✅ Restricción UNIQUE agregada a rol_permisos';
    ELSE
        RAISE NOTICE '✅ Restricción UNIQUE ya existe en rol_permisos';
    END IF;
END $$;


-- PASO 3: Limpiar permisos duplicados si existen
-- ============================================================================
SELECT '=== PASO 3: LIMPIAR DUPLICADOS ===' as paso;

-- Eliminar duplicados manteniendo solo el más antiguo
DELETE FROM rol_permisos
WHERE id NOT IN (
    SELECT MIN(id)
    FROM rol_permisos
    GROUP BY rol_id, permiso_id
);


-- PASO 4: Insertar permisos para el rol "Operaciones"
-- ============================================================================
SELECT '=== PASO 4: ASIGNAR PERMISOS ===' as paso;

-- Dashboard
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'Operaciones' 
AND p.nombre IN (
    'dashboard:view'
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Clientes (permisos completos)
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'Operaciones' 
AND p.nombre IN (
    'clientes:view',
    'clientes:create',
    'clientes:edit',
    'clientes:delete',
    'clientes:export',
    'clientes:import',
    'clientes:assign'
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Productos
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'Operaciones' 
AND p.nombre IN (
    'productos:view',
    'productos:create',
    'productos:edit',
    'productos:export'
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Inventario
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'Operaciones' 
AND p.nombre IN (
    'inventario:view',
    'inventario:create',
    'inventario:edit',
    'inventario:export',
    'inventario:categories'
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Cotizaciones
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'Operaciones' 
AND p.nombre IN (
    'cotizaciones:view',
    'cotizaciones:create',
    'cotizaciones:edit',
    'cotizaciones:approve',
    'cotizaciones:print',
    'cotizaciones:export'
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Pedidos
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'Operaciones' 
AND p.nombre IN (
    'pedidos:view',
    'pedidos:create',
    'pedidos:edit',
    'pedidos:confirm',
    'pedidos:print'
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Facturación
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'Operaciones' 
AND p.nombre IN (
    'facturas:view',
    'facturas:create',
    'facturas:print',
    'facturas:export'
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Mantenimiento
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'Operaciones' 
AND p.nombre IN (
    'mantenimiento:view',
    'mantenimiento:alerts'
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;


-- PASO 5: Verificar permisos insertados
-- ============================================================================
SELECT '=== PASO 5: VERIFICAR PERMISOS INSERTADOS ===' as paso;

SELECT 
  SPLIT_PART(p.nombre, ':', 1) as modulo,
  COUNT(*) as cantidad_permisos,
  STRING_AGG(SPLIT_PART(p.nombre, ':', 2), ', ' ORDER BY p.nombre) as acciones
FROM rol_permisos rp
JOIN roles r ON r.id = rp.rol_id
JOIN permisos p ON p.id = rp.permiso_id
WHERE r.nombre = 'Operaciones'
GROUP BY SPLIT_PART(p.nombre, ':', 1)
ORDER BY modulo;

-- Lista completa de permisos
SELECT 
  r.nombre as rol,
  p.nombre as permiso,
  p.descripcion
FROM rol_permisos rp
JOIN roles r ON r.id = rp.rol_id
JOIN permisos p ON p.id = rp.permiso_id
WHERE r.nombre = 'Operaciones'
ORDER BY p.nombre;


-- PASO 6: Verificar usuario jalvarez
-- ============================================================================
SELECT '=== PASO 6: VERIFICAR USUARIO JALVAREZ ===' as paso;

-- Datos del usuario
SELECT 
  u.id,
  u.email,
  u.nombre_completo,
  u.activo,
  u.rol as rol_legacy
FROM usuarios u
WHERE u.email = 'jalvarez@ologistics.com';

-- Roles asignados
SELECT 
  ur.rol_id,
  r.nombre as rol_nombre,
  r.descripcion
FROM usuario_roles ur
JOIN roles r ON r.id = ur.rol_id
WHERE ur.usuario_id IN (
  SELECT id FROM usuarios WHERE email = 'jalvarez@ologistics.com'
);

-- Permisos efectivos (usando la función del sistema)
SELECT 
  u.email,
  u.nombre_completo,
  public.fn_usuario_permisos(u.id) as permisos_efectivos
FROM usuarios u
WHERE u.email = 'jalvarez@ologistics.com';


-- PASO 7: Asignar rol "Operaciones" a jalvarez si no lo tiene
-- ============================================================================
SELECT '=== PASO 7: ASIGNAR ROL A JALVAREZ ===' as paso;

-- Obtener el ID del rol "Operaciones"
DO $$ 
DECLARE
    v_rol_id INTEGER;
    v_usuario_id UUID;
BEGIN
    -- Obtener ID del rol
    SELECT id INTO v_rol_id
    FROM roles
    WHERE nombre = 'Operaciones';
    
    -- Obtener ID del usuario
    SELECT id INTO v_usuario_id
    FROM usuarios
    WHERE email = 'jalvarez@ologistics.com';
    
    -- Verificar que ambos existen
    IF v_rol_id IS NULL THEN
        RAISE EXCEPTION '❌ Rol "Operaciones" no encontrado';
    END IF;
    
    IF v_usuario_id IS NULL THEN
        RAISE EXCEPTION '❌ Usuario jalvarez@ologistics.com no encontrado';
    END IF;
    
    -- Asignar rol al usuario
    INSERT INTO usuario_roles (usuario_id, rol_id, created_by)
    VALUES (v_usuario_id, v_rol_id, v_usuario_id)
    ON CONFLICT (usuario_id, rol_id) DO NOTHING;
    
    RAISE NOTICE '✅ Rol "Operaciones" asignado a jalvarez@ologistics.com';
END $$;


-- PASO 8: RESUMEN FINAL
-- ============================================================================
SELECT '=== PASO 8: RESUMEN FINAL ===' as paso;

WITH resumen AS (
  SELECT 
    u.email,
    u.nombre_completo,
    u.activo as usuario_activo,
    STRING_AGG(DISTINCT r.nombre, ', ') as roles_asignados,
    COUNT(DISTINCT rp.permiso_id) as total_permisos
  FROM usuarios u
  LEFT JOIN usuario_roles ur ON ur.usuario_id = u.id
  LEFT JOIN roles r ON r.id = ur.rol_id
  LEFT JOIN rol_permisos rp ON rp.rol_id = r.id
  WHERE u.email = 'jalvarez@ologistics.com'
  GROUP BY u.id, u.email, u.nombre_completo, u.activo
)
SELECT 
  email,
  nombre_completo,
  usuario_activo,
  roles_asignados,
  total_permisos,
  CASE 
    WHEN total_permisos = 0 THEN '❌ SIN PERMISOS'
    WHEN total_permisos < 10 THEN '⚠️ PERMISOS LIMITADOS'
    ELSE '✅ PERMISOS COMPLETOS'
  END as estado
FROM resumen;


-- PASO 9: Verificar permisos por módulo para jalvarez
-- ============================================================================
SELECT '=== PASO 9: PERMISOS POR MÓDULO (JALVAREZ) ===' as paso;

SELECT 
  SPLIT_PART(p.nombre, ':', 1) as modulo,
  COUNT(*) as cantidad_permisos,
  STRING_AGG(SPLIT_PART(p.nombre, ':', 2), ', ' ORDER BY p.nombre) as acciones
FROM usuarios u
JOIN usuario_roles ur ON ur.usuario_id = u.id
JOIN rol_permisos rp ON rp.rol_id = ur.rol_id
JOIN permisos p ON p.id = rp.permiso_id
WHERE u.email = 'jalvarez@ologistics.com'
GROUP BY SPLIT_PART(p.nombre, ':', 1)
ORDER BY modulo;


-- ============================================================================
-- SCRIPT COMPLETADO
-- ============================================================================
SELECT '✅ SCRIPT COMPLETADO EXITOSAMENTE' as resultado;
