-- ============================================================
-- SCRIPT PARA ASIGNAR PERMISOS AL ROL OPERACIONES
-- ============================================================
-- Este script asigna 34 permisos al rol "Operaciones" (ID=2)
-- Incluye permisos para todos los módulos operativos
-- ============================================================

-- PASO 1: Limpiar permisos existentes del rol Operaciones
-- (Ejecutar solo si quieres empezar desde cero)
DELETE FROM rol_permisos WHERE rol_id = 2;

-- PASO 2: Asignar permisos por módulo
-- ============================================================

-- Dashboard (4 permisos)
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT 2, id FROM permisos WHERE nombre IN (
  'dashboard:view',
  'dashboard:stats',
  'dashboard:charts',
  'dashboard:reports'
)
ON CONFLICT DO NOTHING;

-- Clientes (5 permisos)
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT 2, id FROM permisos WHERE nombre IN (
  'clientes:view',
  'clientes:create',
  'clientes:edit',
  'clientes:delete',
  'clientes:assign'
)
ON CONFLICT DO NOTHING;

-- Productos (4 permisos)
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT 2, id FROM permisos WHERE nombre IN (
  'productos:view',
  'productos:create',
  'productos:edit',
  'productos:delete'
)
ON CONFLICT DO NOTHING;

-- Inventario (4 permisos)
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT 2, id FROM permisos WHERE nombre IN (
  'inventario:view',
  'inventario:create',
  'inventario:edit',
  'inventario:delete'
)
ON CONFLICT DO NOTHING;

-- Cotizaciones (5 permisos)
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT 2, id FROM permisos WHERE nombre IN (
  'cotizaciones:view',
  'cotizaciones:create',
  'cotizaciones:edit',
  'cotizaciones:delete',
  'cotizaciones:approve'
)
ON CONFLICT DO NOTHING;

-- Pedidos (4 permisos)
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT 2, id FROM permisos WHERE nombre IN (
  'pedidos:view',
  'pedidos:create',
  'pedidos:edit',
  'pedidos:delete'
)
ON CONFLICT DO NOTHING;

-- Facturación (4 permisos)
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT 2, id FROM permisos WHERE nombre IN (
  'facturacion:view',
  'facturacion:create',
  'facturacion:edit',
  'facturacion:delete'
)
ON CONFLICT DO NOTHING;

-- Mantenimiento (4 permisos)
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT 2, id FROM permisos WHERE nombre IN (
  'mantenimiento:view',
  'mantenimiento:create',
  'mantenimiento:edit',
  'mantenimiento:delete'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- VERIFICACIÓN: Contar permisos asignados
-- ============================================================
SELECT 
  r.nombre as rol,
  COUNT(rp.id) as total_permisos
FROM roles r
LEFT JOIN rol_permisos rp ON r.id = rp.rol_id
WHERE r.id = 2
GROUP BY r.id, r.nombre;

-- ============================================================
-- VERIFICACIÓN DETALLADA: Ver todos los permisos asignados
-- ============================================================
SELECT 
  r.nombre as rol,
  p.nombre as permiso,
  p.descripcion
FROM roles r
JOIN rol_permisos rp ON r.id = rp.rol_id
JOIN permisos p ON rp.permiso_id = p.id
WHERE r.id = 2
ORDER BY p.nombre;
