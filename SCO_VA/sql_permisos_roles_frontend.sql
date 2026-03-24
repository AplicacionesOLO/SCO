-- =====================================================
-- CONFIGURACIÓN COMPLETA DE PERMISOS PARA FRONTEND
-- Sistema de Gestión - Control Granular de Acciones
-- =====================================================

-- 1. CREAR PERMISOS GRANULARES PARA TODOS LOS MÓDULOS
-- =====================================================

-- Permisos para Clientes
INSERT INTO permisos (nombre, descripcion, modulo) VALUES
('clientes:view', 'Ver lista y detalles de clientes', 'clientes'),
('clientes:create', 'Crear nuevos clientes', 'clientes'),
('clientes:edit', 'Editar clientes existentes', 'clientes'),
('clientes:delete', 'Eliminar clientes', 'clientes')
ON CONFLICT (nombre) DO NOTHING;

-- Permisos para Productos
INSERT INTO permisos (nombre, descripcion, modulo) VALUES
('productos:view', 'Ver lista y detalles de productos', 'productos'),
('productos:create', 'Crear nuevos productos', 'productos'),
('productos:edit', 'Editar productos existentes', 'productos'),
('productos:delete', 'Eliminar productos', 'productos')
ON CONFLICT (nombre) DO NOTHING;

-- Permisos para Cotizaciones
INSERT INTO permisos (nombre, descripcion, modulo) VALUES
('cotizaciones:view', 'Ver lista y detalles de cotizaciones', 'cotizaciones'),
('cotizaciones:create', 'Crear nuevas cotizaciones', 'cotizaciones'),
('cotizaciones:edit', 'Editar cotizaciones existentes', 'cotizaciones'),
('cotizaciones:delete', 'Eliminar cotizaciones', 'cotizaciones')
ON CONFLICT (nombre) DO NOTHING;

-- Permisos para Pedidos
INSERT INTO permisos (nombre, descripcion, modulo) VALUES
('pedidos:view', 'Ver lista y detalles de pedidos', 'pedidos'),
('pedidos:create', 'Crear nuevos pedidos', 'pedidos'),
('pedidos:edit', 'Editar pedidos existentes', 'pedidos'),
('pedidos:delete', 'Eliminar pedidos', 'pedidos')
ON CONFLICT (nombre) DO NOTHING;

-- Permisos para Inventario
INSERT INTO permisos (nombre, descripcion, modulo) VALUES
('inventario:view', 'Ver inventario y stock', 'inventario'),
('inventario:create', 'Agregar productos al inventario', 'inventario'),
('inventario:edit', 'Modificar inventario y stock', 'inventario'),
('inventario:delete', 'Eliminar productos del inventario', 'inventario')
ON CONFLICT (nombre) DO NOTHING;

-- Permisos para Facturación
INSERT INTO permisos (nombre, descripcion, modulo) VALUES
('facturacion:view', 'Ver facturas y comprobantes', 'facturacion'),
('facturacion:create', 'Crear nuevas facturas', 'facturacion'),
('facturacion:edit', 'Editar facturas existentes', 'facturacion'),
('facturacion:delete', 'Anular facturas', 'facturacion')
ON CONFLICT (nombre) DO NOTHING;

-- Permisos para Dashboard
INSERT INTO permisos (nombre, descripcion, modulo) VALUES
('dashboard:view', 'Ver dashboard y reportes', 'dashboard'),
('dashboard:export', 'Exportar reportes', 'dashboard')
ON CONFLICT (nombre) DO NOTHING;

-- Permisos para Mantenimiento
INSERT INTO permisos (nombre, descripcion, modulo) VALUES
('mantenimiento:view', 'Ver configuraciones de mantenimiento', 'mantenimiento'),
('mantenimiento:edit', 'Modificar configuraciones de mantenimiento', 'mantenimiento')
ON CONFLICT (nombre) DO NOTHING;

-- Permisos para Seguridad
INSERT INTO permisos (nombre, descripcion, modulo) VALUES
('seguridad:view', 'Ver usuarios, roles y permisos', 'seguridad'),
('seguridad:create', 'Crear usuarios, roles y permisos', 'seguridad'),
('seguridad:edit', 'Editar usuarios, roles y permisos', 'seguridad'),
('seguridad:delete', 'Eliminar usuarios, roles y permisos', 'seguridad')
ON CONFLICT (nombre) DO NOTHING;

-- 2. LIMPIAR PERMISOS ACTUALES DE ROLES
-- =====================================

-- Eliminar todas las asignaciones actuales para reconfigurar desde cero
DELETE FROM rol_permisos WHERE rol_id IN (
  SELECT id FROM roles WHERE nombre IN ('Admin', 'Vendedor', 'Cliente', 'Lectura')
);

-- 3. CONFIGURAR PERMISOS POR ROL
-- ===============================

-- ROL: ADMIN - TODOS LOS PERMISOS
-- ================================
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permisos p
WHERE r.nombre = 'Admin';

-- ROL: VENDEDOR - PERMISOS ESPECÍFICOS
-- ====================================
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'Vendedor'
AND p.nombre IN (
  -- Clientes: view, create (NO edit, NO delete)
  'clientes:view',
  'clientes:create',
  
  -- Productos: solo view (NO create, NO edit, NO delete)
  'productos:view',
  
  -- Cotizaciones: view, create, edit
  'cotizaciones:view',
  'cotizaciones:create',
  'cotizaciones:edit',
  
  -- Pedidos: view, create, edit
  'pedidos:view',
  'pedidos:create',
  'pedidos:edit',
  
  -- Inventario: solo view
  'inventario:view',
  
  -- Facturación: view, create
  'facturacion:view',
  'facturacion:create',
  
  -- Dashboard: view
  'dashboard:view'
);

-- ROL: CLIENTE - SOLO LECTURA EN MÓDULOS ESPECÍFICOS
-- ==================================================
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'Cliente'
AND p.nombre IN (
  'clientes:view',
  'productos:view',
  'cotizaciones:view',
  'pedidos:view',
  'inventario:view',
  'dashboard:view'
);

-- ROL: LECTURA - SOLO VIEW EN TODOS LOS MÓDULOS
-- =============================================
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'Lectura'
AND p.nombre LIKE '%:view';

-- 4. SCRIPTS DE VALIDACIÓN AUTOMÁTICA
-- ===================================

DO $$
DECLARE
  admin_permisos_count INTEGER;
  vendedor_clientes_edit INTEGER;
  vendedor_productos_create INTEGER;
  cliente_create_permisos INTEGER;
  lectura_non_view_permisos INTEGER;
BEGIN
  -- Verificar que Admin tiene todos los permisos
  SELECT COUNT(*) INTO admin_permisos_count
  FROM rol_permisos rp
  JOIN roles r ON r.id = rp.rol_id
  WHERE r.nombre = 'Admin';
  
  IF admin_permisos_count >= 30 THEN
    RAISE NOTICE '✅ Admin tiene todos los permisos: % de %', admin_permisos_count, (SELECT COUNT(*) FROM permisos);
  ELSE
    RAISE NOTICE '❌ Admin NO tiene todos los permisos: % de %', admin_permisos_count, (SELECT COUNT(*) FROM permisos);
  END IF;
  
  -- Verificar que Vendedor NO tiene clientes:edit
  SELECT COUNT(*) INTO vendedor_clientes_edit
  FROM rol_permisos rp
  JOIN roles r ON r.id = rp.rol_id
  JOIN permisos p ON p.id = rp.permiso_id
  WHERE r.nombre = 'Vendedor' AND p.nombre = 'clientes:edit';
  
  IF vendedor_clientes_edit = 0 THEN
    RAISE NOTICE '✅ Vendedor NO tiene permiso clientes:edit (correcto)';
  ELSE
    RAISE NOTICE '❌ Vendedor SÍ tiene permiso clientes:edit (incorrecto)';
  END IF;
  
  -- Verificar que Vendedor NO tiene productos:create
  SELECT COUNT(*) INTO vendedor_productos_create
  FROM rol_permisos rp
  JOIN roles r ON r.id = rp.rol_id
  JOIN permisos p ON p.id = rp.permiso_id
  WHERE r.nombre = 'Vendedor' AND p.nombre = 'productos:create';
  
  IF vendedor_productos_create = 0 THEN
    RAISE NOTICE '✅ Vendedor NO tiene permisos de modificación en productos (correcto)';
  ELSE
    RAISE NOTICE '❌ Vendedor SÍ tiene permisos de modificación en productos (incorrecto)';
  END IF;
  
  -- Verificar que Cliente NO tiene permisos de create/edit/delete
  SELECT COUNT(*) INTO cliente_create_permisos
  FROM rol_permisos rp
  JOIN roles r ON r.id = rp.rol_id
  JOIN permisos p ON p.id = rp.permiso_id
  WHERE r.nombre = 'Cliente' 
  AND (p.nombre LIKE '%:create' OR p.nombre LIKE '%:edit' OR p.nombre LIKE '%:delete');
  
  IF cliente_create_permisos = 0 THEN
    RAISE NOTICE '✅ Cliente solo tiene permisos de lectura (correcto)';
  ELSE
    RAISE NOTICE '❌ Cliente tiene permisos de modificación (incorrecto): %', cliente_create_permisos;
  END IF;
  
  -- Verificar que Lectura solo tiene permisos :view
  SELECT COUNT(*) INTO lectura_non_view_permisos
  FROM rol_permisos rp
  JOIN roles r ON r.id = rp.rol_id
  JOIN permisos p ON p.id = rp.permiso_id
  WHERE r.nombre = 'Lectura' 
  AND p.nombre NOT LIKE '%:view';
  
  IF lectura_non_view_permisos = 0 THEN
    RAISE NOTICE '✅ Lectura solo tiene permisos de vista (correcto)';
  ELSE
    RAISE NOTICE '❌ Lectura tiene permisos que no son de vista (incorrecto): %', lectura_non_view_permisos;
  END IF;
  
END $$;

-- 5. CONSULTAS DE VERIFICACIÓN
-- ============================

-- Ver permisos por rol
SELECT 
  r.nombre as rol,
  COUNT(p.id) as total_permisos,
  STRING_AGG(p.nombre, ', ' ORDER BY p.nombre) as permisos
FROM roles r
LEFT JOIN rol_permisos rp ON r.id = rp.rol_id
LEFT JOIN permisos p ON p.id = rp.permiso_id
WHERE r.nombre IN ('Admin', 'Vendedor', 'Cliente', 'Lectura')
GROUP BY r.nombre
ORDER BY r.nombre;

-- Ver permisos específicos de Vendedor
SELECT 
  p.modulo,
  p.nombre,
  p.descripcion
FROM roles r
JOIN rol_permisos rp ON r.id = rp.rol_id
JOIN permisos p ON p.id = rp.permiso_id
WHERE r.nombre = 'Vendedor'
ORDER BY p.modulo, p.nombre;

-- Verificar que los permisos críticos están bien configurados
SELECT 
  'clientes:edit' as permiso,
  CASE WHEN EXISTS (
    SELECT 1 FROM rol_permisos rp 
    JOIN roles r ON r.id = rp.rol_id 
    JOIN permisos p ON p.id = rp.permiso_id 
    WHERE r.nombre = 'Vendedor' AND p.nombre = 'clientes:edit'
  ) THEN '❌ Vendedor SÍ tiene este permiso (MALO)' 
    ELSE '✅ Vendedor NO tiene este permiso (BUENO)' 
  END as estado

UNION ALL

SELECT 
  'productos:create' as permiso,
  CASE WHEN EXISTS (
    SELECT 1 FROM rol_permisos rp 
    JOIN roles r ON r.id = rp.rol_id 
    JOIN permisos p ON p.id = rp.permiso_id 
    WHERE r.nombre = 'Vendedor' AND p.nombre = 'productos:create'
  ) THEN '❌ Vendedor SÍ tiene este permiso (MALO)' 
    ELSE '✅ Vendedor NO tiene este permiso (BUENO)' 
  END as estado;

-- =====================================================
-- CONFIGURACIÓN COMPLETADA
-- =====================================================

RAISE NOTICE '';
RAISE NOTICE '🎉 CONFIGURACIÓN DE PERMISOS COMPLETADA';
RAISE NOTICE '';
RAISE NOTICE '📋 RESUMEN DE CONFIGURACIÓN:';
RAISE NOTICE '   🔴 Admin: Acceso total a todo';
RAISE NOTICE '   🟡 Vendedor: Clientes (view, create), Productos (view), Cotizaciones/Pedidos (view, create, edit)';
RAISE NOTICE '   🟢 Cliente: Solo lectura en módulos principales';
RAISE NOTICE '   🔵 Lectura: Solo lectura en todos los módulos';
RAISE NOTICE '';
RAISE NOTICE '✅ El sistema de permisos está listo para usar en el frontend';
RAISE NOTICE '✅ Recarga la aplicación para ver los cambios';