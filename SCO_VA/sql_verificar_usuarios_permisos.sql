-- =====================================================
-- CONSULTA CORREGIDA: VERIFICAR USUARIOS Y PERMISOS
-- =====================================================

-- Ver todos los usuarios con sus roles y permisos
SELECT 
  u.email,
  u.nombre,
  r.nombre as rol,
  COUNT(rp.permiso_id) as total_permisos
FROM usuarios u
LEFT JOIN usuario_roles ur ON u.id = ur.usuario_id
LEFT JOIN roles r ON ur.rol_id = r.id
LEFT JOIN rol_permisos rp ON r.id = rp.rol_id
GROUP BY u.id, u.email, u.nombre, r.nombre
ORDER BY u.email;

-- Ver permisos detallados por usuario
SELECT 
  u.email,
  u.nombre as nombre_usuario,
  r.nombre as rol,
  p.modulo,
  p.nombre as permiso,
  p.descripcion
FROM usuarios u
LEFT JOIN usuario_roles ur ON u.id = ur.usuario_id
LEFT JOIN roles r ON ur.rol_id = r.id
LEFT JOIN rol_permisos rp ON r.id = rp.rol_id
LEFT JOIN permisos p ON rp.permiso_id = p.id
ORDER BY u.email, p.modulo, p.nombre;

-- Verificar usuarios sin roles asignados
SELECT 
  u.email,
  u.nombre,
  'SIN ROL ASIGNADO' as estado
FROM usuarios u
LEFT JOIN usuario_roles ur ON u.id = ur.usuario_id
WHERE ur.rol_id IS NULL;
