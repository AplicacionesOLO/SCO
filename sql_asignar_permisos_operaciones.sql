-- ============================================================================
-- SCRIPT: Asignar permisos al rol "Operaciones"
-- PROBLEMA: El rol existe pero no tiene permisos en rol_permisos
-- SOLUCIÓN: Insertar las relaciones faltantes en rol_permisos
-- ============================================================================

-- ============================================================================
-- PASO 1: VERIFICAR ESTADO ACTUAL
-- ============================================================================

-- Ver el rol "Operaciones"
SELECT id, nombre, activo, created_at 
FROM roles 
WHERE nombre = 'Operaciones';

-- Ver permisos actuales del rol (debería estar vacío)
SELECT 
  r.nombre as rol,
  COUNT(rp.permiso_id) as cantidad_permisos
FROM roles r
LEFT JOIN rol_permisos rp ON r.id = rp.rol_id
WHERE r.nombre = 'Operaciones'
GROUP BY r.nombre;

-- ============================================================================
-- PASO 2: ASIGNAR PERMISOS AL ROL "OPERACIONES"
-- ============================================================================

-- Dashboard
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT 2, id FROM permisos 
WHERE nombre = 'dashboard:view'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Clientes
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT 2, id FROM permisos 
WHERE nombre IN (
  'clientes:view',
  'clientes:create',
  'clientes:edit'
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Productos
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT 2, id FROM permisos 
WHERE nombre IN (
  'productos:view',
  'productos:create',
  'productos:edit'
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Inventario
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT 2, id FROM permisos 
WHERE nombre IN (
  'inventario:view',
  'inventario:create',
  'inventario:edit'
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Cotizaciones
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT 2, id FROM permisos 
WHERE nombre IN (
  'cotizaciones:view',
  'cotizaciones:create',
  'cotizaciones:edit',
  'cotizaciones:approve'
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Pedidos
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT 2, id FROM permisos 
WHERE nombre IN (
  'pedidos:view',
  'pedidos:create',
  'pedidos:edit'
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Facturación
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT 2, id FROM permisos 
WHERE nombre IN (
  'facturacion:view',
  'facturacion:create'
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Mantenimiento
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT 2, id FROM permisos 
WHERE nombre = 'mantenimiento:view'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- ============================================================================
-- PASO 3: VERIFICAR PERMISOS ASIGNADOS
-- ============================================================================

-- Ver todos los permisos del rol "Operaciones"
SELECT 
  r.nombre as rol,
  p.nombre as permiso,
  rp.created_at as fecha_asignacion
FROM rol_permisos rp
JOIN roles r ON r.id = rp.rol_id
JOIN permisos p ON p.id = rp.permiso_id
WHERE r.nombre = 'Operaciones'
ORDER BY p.nombre;

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

-- ============================================================================
-- PASO 4: VERIFICAR USUARIOS CON EL ROL
-- ============================================================================

-- Ver usuarios que tienen el rol "Operaciones"
SELECT 
  u.id,
  u.email,
  u.nombre_completo,
  r.nombre as rol,
  u.activo as usuario_activo
FROM usuario_roles ur
JOIN usuarios u ON u.id = ur.usuario_id
JOIN roles r ON r.id = ur.rol_id
WHERE r.nombre = 'Operaciones'
ORDER BY u.email;

-- ============================================================================
-- PASO 5: CONSULTA COMPLETA (SIMULA LO QUE HACE EL HOOK)
-- ============================================================================

-- Esta consulta simula exactamente lo que hace useRobustPermissions
SELECT 
  u.id,
  u.email,
  u.activo,
  jsonb_agg(
    DISTINCT jsonb_build_object(
      'rol_id', ur.rol_id,
      'rol_nombre', r.nombre,
      'permisos', (
        SELECT jsonb_agg(p.nombre)
        FROM rol_permisos rp
        JOIN permisos p ON p.id = rp.permiso_id
        WHERE rp.rol_id = r.id
      )
    )
  ) as roles_y_permisos
FROM usuarios u
JOIN usuario_roles ur ON ur.usuario_id = u.id
JOIN roles r ON r.id = ur.rol_id
WHERE u.email = 'jalvarez@ologistics.com'
  AND u.activo = true
GROUP BY u.id, u.email, u.activo;

-- ============================================================================
-- RESULTADO ESPERADO
-- ============================================================================

/*
Después de ejecutar este script, deberías ver:

1. En la consulta de verificación:
   - rol: Operaciones | permiso: clientes:create
   - rol: Operaciones | permiso: clientes:edit
   - rol: Operaciones | permiso: clientes:view
   - rol: Operaciones | permiso: cotizaciones:approve
   - rol: Operaciones | permiso: cotizaciones:create
   - ... (total ~25 permisos)

2. En la consulta por módulo:
   - clientes: 3 permisos (view, create, edit)
   - cotizaciones: 4 permisos (view, create, edit, approve)
   - dashboard: 1 permiso (view)
   - facturacion: 2 permisos (view, create)
   - inventario: 3 permisos (view, create, edit)
   - mantenimiento: 1 permiso (view)
   - pedidos: 3 permisos (view, create, edit)
   - productos: 3 permisos (view, create, edit)

3. En la aplicación (después de cerrar sesión y volver a entrar):
   - ✅ Perfil → Permisos mostrará todos los permisos
   - ✅ Dashboard será accesible
   - ✅ Módulos de Clientes, Productos, etc. serán accesibles
   - ✅ Logs mostrarán: "✅ Permisos reales obtenidos: [...]"
*/
