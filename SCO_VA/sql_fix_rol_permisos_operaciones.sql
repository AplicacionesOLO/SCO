-- =====================================================
-- SCRIPT DE REPARACIÓN: Asignar permisos al rol "Operaciones"
-- =====================================================

-- PASO 1: Verificar estructura actual
-- =====================================================
SELECT 'PASO 1: Verificando estructura actual...' as paso;

-- Ver el rol Operaciones
SELECT 
  id,
  nombre,
  descripcion
FROM roles 
WHERE nombre = 'Operaciones';

-- Ver permisos actuales del rol (debería estar vacío)
SELECT 
  r.nombre as rol,
  COUNT(rp.id) as cantidad_permisos
FROM roles r
LEFT JOIN rol_permisos rp ON r.id = rp.rol_id
WHERE r.nombre = 'Operaciones'
GROUP BY r.nombre;

-- PASO 2: Agregar restricción UNIQUE si no existe
-- =====================================================
SELECT 'PASO 2: Agregando restricción UNIQUE...' as paso;

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
        
        RAISE NOTICE 'Restricción UNIQUE agregada exitosamente';
    ELSE
        RAISE NOTICE 'Restricción UNIQUE ya existe';
    END IF;
END $$;

-- PASO 3: Insertar permisos para el rol "Operaciones"
-- =====================================================
SELECT 'PASO 3: Insertando permisos...' as paso;

-- Dashboard
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT 
  (SELECT id FROM roles WHERE nombre = 'Operaciones'),
  id 
FROM permisos 
WHERE nombre = 'dashboard:view'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Clientes
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT 
  (SELECT id FROM roles WHERE nombre = 'Operaciones'),
  id 
FROM permisos 
WHERE nombre IN ('clientes:view', 'clientes:create', 'clientes:edit', 'clientes:export')
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Productos
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT 
  (SELECT id FROM roles WHERE nombre = 'Operaciones'),
  id 
FROM permisos 
WHERE nombre IN ('productos:view', 'productos:create', 'productos:edit', 'productos:export')
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Inventario
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT 
  (SELECT id FROM roles WHERE nombre = 'Operaciones'),
  id 
FROM permisos 
WHERE nombre IN ('inventario:view', 'inventario:create', 'inventario:edit', 'inventario:export', 'inventario:categories')
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Cotizaciones
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT 
  (SELECT id FROM roles WHERE nombre = 'Operaciones'),
  id 
FROM permisos 
WHERE nombre IN ('cotizaciones:view', 'cotizaciones:create', 'cotizaciones:edit', 'cotizaciones:approve', 'cotizaciones:print', 'cotizaciones:export')
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Pedidos
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT 
  (SELECT id FROM roles WHERE nombre = 'Operaciones'),
  id 
FROM permisos 
WHERE nombre IN ('pedidos:view', 'pedidos:create', 'pedidos:edit', 'pedidos:confirm', 'pedidos:print')
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Facturación
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT 
  (SELECT id FROM roles WHERE nombre = 'Operaciones'),
  id 
FROM permisos 
WHERE nombre IN ('facturas:view', 'facturas:create', 'facturas:print', 'facturas:export')
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Mantenimiento
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT 
  (SELECT id FROM roles WHERE nombre = 'Operaciones'),
  id 
FROM permisos 
WHERE nombre IN ('mantenimiento:view', 'mantenimiento:alerts')
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- PASO 4: Verificar permisos insertados
-- =====================================================
SELECT 'PASO 4: Verificando permisos insertados...' as paso;

-- Contar permisos por módulo
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

-- Ver todos los permisos asignados
SELECT 
  r.nombre as rol,
  p.nombre as permiso,
  p.descripcion
FROM rol_permisos rp
JOIN roles r ON r.id = rp.rol_id
JOIN permisos p ON p.id = rp.permiso_id
WHERE r.nombre = 'Operaciones'
ORDER BY p.nombre;

-- PASO 5: Verificar usuario jalvarez
-- =====================================================
SELECT 'PASO 5: Verificando usuario jalvarez...' as paso;

-- Ver datos del usuario
SELECT 
  u.id,
  u.email,
  u.nombre_completo,
  u.activo,
  u.rol as rol_legacy
FROM usuarios u
WHERE u.email = 'jalvarez@ologistics.com';

-- Ver roles asignados al usuario
SELECT 
  u.email,
  r.nombre as rol,
  ur.created_at as fecha_asignacion
FROM usuarios u
JOIN usuario_roles ur ON u.id = ur.usuario_id
JOIN roles r ON r.id = ur.rol_id
WHERE u.email = 'jalvarez@ologistics.com';

-- Ver permisos efectivos del usuario (usando la función)
SELECT 
  u.email,
  UNNEST(fn_usuario_permisos(u.id)) as permiso
FROM usuarios u
WHERE u.email = 'jalvarez@ologistics.com'
ORDER BY permiso;

-- RESUMEN FINAL
-- =====================================================
SELECT 'RESUMEN FINAL' as titulo;

SELECT 
  'Total de permisos asignados al rol Operaciones' as descripcion,
  COUNT(*) as cantidad
FROM rol_permisos rp
JOIN roles r ON r.id = rp.rol_id
WHERE r.nombre = 'Operaciones';

SELECT '✅ Script completado exitosamente' as resultado;
