-- =====================================================
-- SEED: Permisos del módulo Monitor
-- =====================================================
-- Ejecutar en Supabase SQL Editor para registrar
-- los permisos de Monitor en la tabla "permisos".
-- Estos permisos aparecerán luego en:
--   Seguridad → Permisos (listado)
--   Seguridad → Roles → Editar Rol (checkboxes)
-- =====================================================

-- 1. monitor:view — Ver el monitor de tareas por cluster
INSERT INTO permisos (nombre, descripcion)
SELECT 'monitor:view', 'Ver monitor de tareas por cluster'
WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE nombre = 'monitor:view');

-- 2. monitor:comment — Agregar comentarios en el monitor
INSERT INTO permisos (nombre, descripcion)
SELECT 'monitor:comment', 'Agregar comentarios en el monitor'
WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE nombre = 'monitor:comment');

-- Verificación
SELECT id, nombre, descripcion, created_at
FROM permisos
WHERE nombre IN ('monitor:view', 'monitor:comment')
ORDER BY nombre;