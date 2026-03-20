-- =====================================================
-- SISTEMA DE PERMISOS COMPACTO - ROLES Y PERMISOS
-- =====================================================

-- PASO 1: INSERTAR PERMISOS (ON CONFLICT DO NOTHING)
-- =====================================================
INSERT INTO public.permisos (nombre, descripcion, modulo) VALUES
('clientes:view', 'Ver clientes', 'clientes'),
('clientes:create', 'Crear clientes', 'clientes'),
('clientes:edit', 'Editar clientes', 'clientes'),
('clientes:delete', 'Eliminar clientes', 'clientes'),
('productos:view', 'Ver productos', 'productos'),
('productos:create', 'Crear productos', 'productos'),
('productos:edit', 'Editar productos', 'productos'),
('productos:delete', 'Eliminar productos', 'productos'),
('cotizaciones:view', 'Ver cotizaciones', 'cotizaciones'),
('cotizaciones:create', 'Crear cotizaciones', 'cotizaciones'),
('cotizaciones:edit', 'Editar cotizaciones', 'cotizaciones'),
('cotizaciones:delete', 'Eliminar cotizaciones', 'cotizaciones'),
('pedidos:view', 'Ver pedidos', 'pedidos'),
('pedidos:create', 'Crear pedidos', 'pedidos'),
('pedidos:edit', 'Editar pedidos', 'pedidos'),
('pedidos:delete', 'Eliminar pedidos', 'pedidos'),
('inventario:view', 'Ver inventario', 'inventario'),
('inventario:create', 'Crear inventario', 'inventario'),
('inventario:edit', 'Editar inventario', 'inventario'),
('inventario:delete', 'Eliminar inventario', 'inventario'),
('facturacion:view', 'Ver facturación', 'facturacion'),
('facturacion:create', 'Crear facturas', 'facturacion'),
('facturacion:edit', 'Editar facturas', 'facturacion'),
('facturacion:delete', 'Eliminar facturas', 'facturacion'),
('dashboard:view', 'Ver dashboard', 'dashboard'),
('seguridad:view', 'Ver seguridad', 'seguridad'),
('seguridad:create', 'Crear usuarios/roles', 'seguridad'),
('seguridad:edit', 'Editar usuarios/roles', 'seguridad'),
('seguridad:delete', 'Eliminar usuarios/roles', 'seguridad'),
('mantenimiento:view', 'Ver mantenimiento', 'mantenimiento'),
('mantenimiento:create', 'Crear alertas', 'mantenimiento'),
('mantenimiento:edit', 'Editar umbrales', 'mantenimiento'),
('mantenimiento:delete', 'Eliminar alertas', 'mantenimiento')
ON CONFLICT (nombre) DO NOTHING;

-- PASO 2: LIMPIAR PERMISOS ACTUALES DE ROLES
-- =====================================================
DELETE FROM public.rol_permisos;

-- PASO 3: ASIGNAR PERMISOS POR ROL
-- =====================================================

-- ROL: ADMIN (TODOS LOS PERMISOS)
INSERT INTO public.rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permisos p
WHERE r.nombre = 'Admin';

-- ROL: VENDEDOR
INSERT INTO public.rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permisos p
WHERE r.nombre = 'Vendedor'
AND p.nombre IN (
  'clientes:view',
  'clientes:create',
  'productos:view',
  'cotizaciones:view',
  'cotizaciones:create',
  'cotizaciones:edit',
  'pedidos:view',
  'pedidos:create',
  'pedidos:edit',
  'inventario:view',
  'facturacion:view',
  'facturacion:create',
  'dashboard:view'
);

-- ROL: CLIENTE
INSERT INTO public.rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permisos p
WHERE r.nombre = 'Cliente'
AND p.nombre IN (
  'clientes:view',
  'productos:view',
  'cotizaciones:view',
  'pedidos:view',
  'inventario:view',
  'dashboard:view'
);

-- ROL: LECTURA
INSERT INTO public.rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permisos p
WHERE r.nombre = 'Lectura'
AND p.nombre LIKE '%:view';

-- PASO 4: VALIDACIÓN AUTOMÁTICA
-- =====================================================
DO $$
DECLARE
  admin_permisos INT;
  vendedor_permisos INT;
  vendedor_tiene_delete BOOLEAN;
  vendedor_tiene_productos_edit BOOLEAN;
  total_permisos INT;
BEGIN
  SELECT COUNT(*) INTO total_permisos FROM public.permisos;
  
  SELECT COUNT(*) INTO admin_permisos
  FROM public.rol_permisos rp
  JOIN public.roles r ON rp.rol_id = r.id
  WHERE r.nombre = 'Admin';
  
  SELECT COUNT(*) INTO vendedor_permisos
  FROM public.rol_permisos rp
  JOIN public.roles r ON rp.rol_id = r.id
  WHERE r.nombre = 'Vendedor';
  
  SELECT EXISTS(
    SELECT 1 FROM public.rol_permisos rp
    JOIN public.roles r ON rp.rol_id = r.id
    JOIN public.permisos p ON rp.permiso_id = p.id
    WHERE r.nombre = 'Vendedor' AND p.nombre = 'clientes:delete'
  ) INTO vendedor_tiene_delete;
  
  SELECT EXISTS(
    SELECT 1 FROM public.rol_permisos rp
    JOIN public.roles r ON rp.rol_id = r.id
    JOIN public.permisos p ON rp.permiso_id = p.id
    WHERE r.nombre = 'Vendedor' AND p.nombre IN ('productos:edit', 'productos:delete', 'productos:create')
  ) INTO vendedor_tiene_productos_edit;
  
  RAISE NOTICE '✅ Admin tiene % de % permisos', admin_permisos, total_permisos;
  RAISE NOTICE '✅ Vendedor tiene % permisos', vendedor_permisos;
  
  IF vendedor_tiene_delete THEN
    RAISE NOTICE '❌ ERROR: Vendedor tiene permiso clientes:delete (NO DEBERÍA)';
  ELSE
    RAISE NOTICE '✅ Vendedor NO tiene permiso clientes:delete (correcto)';
  END IF;
  
  IF vendedor_tiene_productos_edit THEN
    RAISE NOTICE '❌ ERROR: Vendedor tiene permisos de modificación en productos (NO DEBERÍA)';
  ELSE
    RAISE NOTICE '✅ Vendedor NO tiene permisos de modificación en productos (correcto)';
  END IF;
END $$;

-- PASO 5: CONSULTA DE VERIFICACIÓN
-- =====================================================
SELECT 
  r.nombre AS rol,
  COUNT(p.id) AS total_permisos,
  STRING_AGG(p.nombre, ', ' ORDER BY p.nombre) AS permisos
FROM public.roles r
LEFT JOIN public.rol_permisos rp ON r.id = rp.rol_id
LEFT JOIN public.permisos p ON rp.permiso_id = p.id
GROUP BY r.nombre
ORDER BY r.nombre;
