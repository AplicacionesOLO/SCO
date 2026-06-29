-- =====================================================
-- SEED: Permisos de Control de Menú (menu:*)
-- =====================================================
-- Ejecutar en Supabase SQL Editor para registrar
-- los permisos de visibilidad de módulos en el menú lateral.
-- Estos aparecerán como grupo "Menú" en:
--   Seguridad → Permisos → Matriz de Permisos
-- =====================================================

-- ============================================
-- PASO 1: Insertar todos los permisos menu:*
-- ============================================
INSERT INTO permisos (nombre, modulo, descripcion)
SELECT 'menu:dashboard', 'menu', 'Mostrar Dashboard en menú lateral'
WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE nombre = 'menu:dashboard');

INSERT INTO permisos (nombre, modulo, descripcion)
SELECT 'menu:clientes', 'menu', 'Mostrar Clientes en menú lateral'
WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE nombre = 'menu:clientes');

INSERT INTO permisos (nombre, modulo, descripcion)
SELECT 'menu:productos', 'menu', 'Mostrar Productos en menú lateral'
WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE nombre = 'menu:productos');

INSERT INTO permisos (nombre, modulo, descripcion)
SELECT 'menu:inventario', 'menu', 'Mostrar Inventario en menú lateral'
WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE nombre = 'menu:inventario');

INSERT INTO permisos (nombre, modulo, descripcion)
SELECT 'menu:mantenimiento', 'menu', 'Mostrar Mantenimiento en menú lateral'
WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE nombre = 'menu:mantenimiento');

INSERT INTO permisos (nombre, modulo, descripcion)
SELECT 'menu:cotizaciones', 'menu', 'Mostrar Cotizaciones en menú lateral'
WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE nombre = 'menu:cotizaciones');

INSERT INTO permisos (nombre, modulo, descripcion)
SELECT 'menu:pedidos', 'menu', 'Mostrar Pedidos en menú lateral'
WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE nombre = 'menu:pedidos');

INSERT INTO permisos (nombre, modulo, descripcion)
SELECT 'menu:seguimiento', 'menu', 'Mostrar Seguimiento en menú lateral'
WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE nombre = 'menu:seguimiento');

INSERT INTO permisos (nombre, modulo, descripcion)
SELECT 'menu:tareas', 'menu', 'Mostrar Tareas en menú lateral'
WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE nombre = 'menu:tareas');

INSERT INTO permisos (nombre, modulo, descripcion)
SELECT 'menu:analisis-tareas', 'menu', 'Mostrar Análisis de Tareas en menú lateral'
WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE nombre = 'menu:analisis-tareas');

INSERT INTO permisos (nombre, modulo, descripcion)
SELECT 'menu:reporte-dia', 'menu', 'Mostrar Reporte del Día en menú lateral'
WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE nombre = 'menu:reporte-dia');

INSERT INTO permisos (nombre, modulo, descripcion)
SELECT 'menu:correspondencia', 'menu', 'Mostrar Correspondencia en menú lateral'
WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE nombre = 'menu:correspondencia');

INSERT INTO permisos (nombre, modulo, descripcion)
SELECT 'menu:facturacion', 'menu', 'Mostrar Facturación en menú lateral'
WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE nombre = 'menu:facturacion');

INSERT INTO permisos (nombre, modulo, descripcion)
SELECT 'menu:facturacion-emision', 'menu', 'Mostrar Emisión de Factura en menú lateral'
WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE nombre = 'menu:facturacion-emision');

INSERT INTO permisos (nombre, modulo, descripcion)
SELECT 'menu:seguridad', 'menu', 'Mostrar Seguridad en menú lateral'
WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE nombre = 'menu:seguridad');

INSERT INTO permisos (nombre, modulo, descripcion)
SELECT 'menu:costbot-admin', 'menu', 'Mostrar CostBot Admin en menú lateral'
WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE nombre = 'menu:costbot-admin');

INSERT INTO permisos (nombre, modulo, descripcion)
SELECT 'menu:monitor', 'menu', 'Mostrar Monitor en menú lateral'
WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE nombre = 'menu:monitor');

INSERT INTO permisos (nombre, modulo, descripcion)
SELECT 'menu:optimizador', 'menu', 'Mostrar Optimizador 2D en menú lateral'
WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE nombre = 'menu:optimizador');

-- ============================================
-- PASO 2: Asignar TODOS los menu:* al rol Admin
-- ============================================
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permisos p
WHERE r.nombre = 'Admin'
  AND p.nombre LIKE 'menu:%'
  AND NOT EXISTS (
    SELECT 1 FROM rol_permisos rp
    WHERE rp.rol_id = r.id AND rp.permiso_id = p.id
  );

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Listar todos los permisos de menú insertados
SELECT id, nombre, modulo, descripcion
FROM permisos
WHERE nombre LIKE 'menu:%'
ORDER BY nombre;

-- Ver cuántos menu:* tiene cada rol
SELECT r.nombre AS rol, COUNT(rp.permiso_id) AS permisos_menu_asignados
FROM roles r
LEFT JOIN rol_permisos rp ON r.id = rp.rol_id
LEFT JOIN permisos p ON rp.permiso_id = p.id AND p.nombre LIKE 'menu:%'
GROUP BY r.id, r.nombre
ORDER BY r.nombre;