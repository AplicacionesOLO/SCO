-- ============================================
-- PERMISOS PARA EL MÓDULO DE SEGUIMIENTO
-- ============================================
-- Ejecutar en Supabase Dashboard → SQL Editor

-- Insertar permisos para el módulo de seguimiento
INSERT INTO permisos (nombre, descripcion, modulo) VALUES
('seguimiento:view', 'Ver seguimiento de pedidos', 'seguimiento'),
('seguimiento:view:own', 'Ver seguimiento de pedidos propios', 'seguimiento'),
('seguimiento:update', 'Actualizar estado de seguimiento', 'seguimiento'),
('seguimiento:assign', 'Asignar responsables a seguimiento', 'seguimiento'),
('seguimiento:manage', 'Gestión completa de seguimiento', 'seguimiento')
ON CONFLICT (nombre) DO NOTHING;

-- Asignar permisos al rol Admin (todos los permisos)
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT 
  r.id,
  p.id
FROM roles r
CROSS JOIN permisos p
WHERE r.nombre = 'Admin'
AND p.modulo = 'seguimiento'
AND NOT EXISTS (
  SELECT 1 FROM rol_permisos rp 
  WHERE rp.rol_id = r.id AND rp.permiso_id = p.id
);

-- Asignar permisos al rol Operaciones (view, view:own, update)
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT 
  r.id,
  p.id
FROM roles r
CROSS JOIN permisos p
WHERE r.nombre = 'Operaciones'
AND p.nombre IN (
  'seguimiento:view',
  'seguimiento:view:own',
  'seguimiento:update'
)
AND NOT EXISTS (
  SELECT 1 FROM rol_permisos rp 
  WHERE rp.rol_id = r.id AND rp.permiso_id = p.id
);

-- Asignar permisos al rol Producción (view, view:own, update, assign)
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT 
  r.id,
  p.id
FROM roles r
CROSS JOIN permisos p
WHERE r.nombre = 'Produccion'
AND p.nombre IN (
  'seguimiento:view',
  'seguimiento:view:own',
  'seguimiento:update',
  'seguimiento:assign'
)
AND NOT EXISTS (
  SELECT 1 FROM rol_permisos rp 
  WHERE rp.rol_id = r.id AND rp.permiso_id = p.id
);

-- Verificar permisos insertados
SELECT 
  r.nombre as rol,
  p.nombre as permiso,
  p.descripcion
FROM rol_permisos rp
JOIN roles r ON r.id = rp.rol_id
JOIN permisos p ON p.id = rp.permiso_id
WHERE p.modulo = 'seguimiento'
ORDER BY r.nombre, p.nombre;

-- Contar permisos por rol
SELECT 
  r.nombre as rol,
  COUNT(rp.permiso_id) as total_permisos_seguimiento
FROM roles r
LEFT JOIN rol_permisos rp ON rp.rol_id = r.id
LEFT JOIN permisos p ON p.id = rp.permiso_id AND p.modulo = 'seguimiento'
WHERE r.nombre IN ('Admin', 'Operaciones', 'Produccion')
GROUP BY r.id, r.nombre
ORDER BY r.nombre;
