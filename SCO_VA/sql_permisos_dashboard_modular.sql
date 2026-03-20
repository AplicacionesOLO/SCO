-- =====================================================
-- SISTEMA DE PERMISOS GRANULARES PARA DASHBOARD MODULAR
-- =====================================================
-- Descripción: Agrega permisos específicos para cada card
--              del dashboard, permitiendo control granular
--              de qué módulos puede ver cada usuario
-- Autor: Sistema OLO
-- Fecha: 2024
-- =====================================================

BEGIN;

-- =====================================================
-- 1. INSERTAR PERMISOS DE DASHBOARD MODULAR
-- =====================================================

DO $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔐 [PERMISOS DASHBOARD] Iniciando inserción de permisos modulares...';

  -- Dashboard - Permisos generales
  INSERT INTO public.permisos (nombre_permiso, descripcion_permiso, modulo)
  VALUES 
    ('dashboard:view', 'Ver dashboard principal', 'Dashboard'),
    ('dashboard:stats', 'Ver estadísticas generales', 'Dashboard'),
    ('dashboard:charts', 'Ver gráficos y análisis', 'Dashboard'),
    ('dashboard:export', 'Exportar datos del dashboard', 'Dashboard')
  ON CONFLICT (nombre_permiso) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '✅ [PERMISOS DASHBOARD] Permisos generales insertados: %', v_count;

  -- Dashboard - Permisos por módulo (Cards)
  INSERT INTO public.permisos (nombre_permiso, descripcion_permiso, modulo)
  VALUES 
    ('dashboard:module:inventario', 'Ver card de Inventario en dashboard', 'Dashboard'),
    ('dashboard:module:cotizaciones', 'Ver card de Cotizaciones en dashboard', 'Dashboard'),
    ('dashboard:module:pedidos', 'Ver card de Pedidos en dashboard', 'Dashboard'),
    ('dashboard:module:clientes', 'Ver card de Clientes en dashboard', 'Dashboard'),
    ('dashboard:module:productos', 'Ver card de Productos en dashboard', 'Dashboard'),
    ('dashboard:module:facturacion', 'Ver card de Facturación en dashboard', 'Dashboard'),
    ('dashboard:module:mantenimiento', 'Ver card de Mantenimiento en dashboard', 'Dashboard'),
    ('dashboard:module:tareas', 'Ver card de Tareas en dashboard', 'Dashboard'),
    ('dashboard:module:optimizador', 'Ver card de Optimizador en dashboard', 'Dashboard'),
    ('dashboard:module:seguimiento', 'Ver card de Seguimiento en dashboard', 'Dashboard'),
    ('dashboard:module:analisis-tareas', 'Ver card de Análisis de Tareas en dashboard', 'Dashboard'),
    ('dashboard:module:seguridad', 'Ver card de Seguridad en dashboard', 'Dashboard')
  ON CONFLICT (nombre_permiso) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '✅ [PERMISOS DASHBOARD] Permisos de módulos insertados: %', v_count;

END $$;

-- =====================================================
-- 2. ASIGNAR PERMISOS A ROL ADMINISTRADOR
-- =====================================================

DO $$
DECLARE
  v_admin_rol_id INTEGER;
  v_super_admin_rol_id INTEGER;
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE '👑 [PERMISOS DASHBOARD] Asignando permisos a roles administrativos...';

  -- Obtener IDs de roles administrativos
  SELECT id_rol INTO v_admin_rol_id 
  FROM public.roles 
  WHERE nombre_rol = 'Administrador' 
  LIMIT 1;

  SELECT id_rol INTO v_super_admin_rol_id 
  FROM public.roles 
  WHERE nombre_rol = 'Super Administrador' 
  LIMIT 1;

  -- Asignar todos los permisos de dashboard a Administrador
  IF v_admin_rol_id IS NOT NULL THEN
    INSERT INTO public.rol_permisos (rol_id, permiso_id)
    SELECT v_admin_rol_id, p.id_permiso
    FROM public.permisos p
    WHERE p.nombre_permiso LIKE 'dashboard:%'
    ON CONFLICT (rol_id, permiso_id) DO NOTHING;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '✅ [PERMISOS DASHBOARD] Permisos asignados a Administrador: %', v_count;
  ELSE
    RAISE WARNING '⚠️ [PERMISOS DASHBOARD] No se encontró el rol Administrador';
  END IF;

  -- Asignar todos los permisos de dashboard a Super Administrador
  IF v_super_admin_rol_id IS NOT NULL THEN
    INSERT INTO public.rol_permisos (rol_id, permiso_id)
    SELECT v_super_admin_rol_id, p.id_permiso
    FROM public.permisos p
    WHERE p.nombre_permiso LIKE 'dashboard:%'
    ON CONFLICT (rol_id, permiso_id) DO NOTHING;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '✅ [PERMISOS DASHBOARD] Permisos asignados a Super Administrador: %', v_count;
  ELSE
    RAISE WARNING '⚠️ [PERMISOS DASHBOARD] No se encontró el rol Super Administrador';
  END IF;

END $$;

-- =====================================================
-- 3. ASIGNAR PERMISOS A OTROS ROLES SEGÚN PERFIL
-- =====================================================

DO $$
DECLARE
  v_vendedor_rol_id INTEGER;
  v_supervisor_rol_id INTEGER;
  v_inventario_rol_id INTEGER;
  v_contador_rol_id INTEGER;
  v_produccion_rol_id INTEGER;
  v_lectura_rol_id INTEGER;
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE '👥 [PERMISOS DASHBOARD] Asignando permisos a roles específicos...';

  -- Obtener IDs de roles
  SELECT id_rol INTO v_vendedor_rol_id FROM public.roles WHERE nombre_rol = 'Vendedor' LIMIT 1;
  SELECT id_rol INTO v_supervisor_rol_id FROM public.roles WHERE nombre_rol = 'Supervisor de Ventas' LIMIT 1;
  SELECT id_rol INTO v_inventario_rol_id FROM public.roles WHERE nombre_rol = 'Encargado de Inventario' LIMIT 1;
  SELECT id_rol INTO v_contador_rol_id FROM public.roles WHERE nombre_rol = 'Contador' LIMIT 1;
  SELECT id_rol INTO v_produccion_rol_id FROM public.roles WHERE nombre_rol = 'Encargado de Producción' LIMIT 1;
  SELECT id_rol INTO v_lectura_rol_id FROM public.roles WHERE nombre_rol = 'Solo Lectura' LIMIT 1;

  -- VENDEDOR: Dashboard básico + módulos de ventas
  IF v_vendedor_rol_id IS NOT NULL THEN
    INSERT INTO public.rol_permisos (rol_id, permiso_id)
    SELECT v_vendedor_rol_id, p.id_permiso
    FROM public.permisos p
    WHERE p.nombre_permiso IN (
      'dashboard:view', 'dashboard:stats',
      'dashboard:module:clientes', 'dashboard:module:cotizaciones', 'dashboard:module:pedidos',
      'dashboard:module:productos', 'dashboard:module:inventario', 'dashboard:module:optimizador'
    )
    ON CONFLICT (rol_id, permiso_id) DO NOTHING;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '✅ [PERMISOS DASHBOARD] Permisos asignados a Vendedor: %', v_count;
  END IF;

  -- SUPERVISOR DE VENTAS: Dashboard completo + módulos de ventas y facturación
  IF v_supervisor_rol_id IS NOT NULL THEN
    INSERT INTO public.rol_permisos (rol_id, permiso_id)
    SELECT v_supervisor_rol_id, p.id_permiso
    FROM public.permisos p
    WHERE p.nombre_permiso IN (
      'dashboard:view', 'dashboard:stats', 'dashboard:charts', 'dashboard:export',
      'dashboard:module:clientes', 'dashboard:module:cotizaciones', 'dashboard:module:pedidos',
      'dashboard:module:productos', 'dashboard:module:inventario', 'dashboard:module:facturacion',
      'dashboard:module:optimizador', 'dashboard:module:tareas'
    )
    ON CONFLICT (rol_id, permiso_id) DO NOTHING;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '✅ [PERMISOS DASHBOARD] Permisos asignados a Supervisor de Ventas: %', v_count;
  END IF;

  -- ENCARGADO DE INVENTARIO: Dashboard + módulos de inventario
  IF v_inventario_rol_id IS NOT NULL THEN
    INSERT INTO public.rol_permisos (rol_id, permiso_id)
    SELECT v_inventario_rol_id, p.id_permiso
    FROM public.permisos p
    WHERE p.nombre_permiso IN (
      'dashboard:view', 'dashboard:stats',
      'dashboard:module:inventario', 'dashboard:module:productos', 'dashboard:module:mantenimiento',
      'dashboard:module:optimizador'
    )
    ON CONFLICT (rol_id, permiso_id) DO NOTHING;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '✅ [PERMISOS DASHBOARD] Permisos asignados a Encargado de Inventario: %', v_count;
  END IF;

  -- CONTADOR: Dashboard + módulos financieros
  IF v_contador_rol_id IS NOT NULL THEN
    INSERT INTO public.rol_permisos (rol_id, permiso_id)
    SELECT v_contador_rol_id, p.id_permiso
    FROM public.permisos p
    WHERE p.nombre_permiso IN (
      'dashboard:view', 'dashboard:stats', 'dashboard:charts', 'dashboard:export',
      'dashboard:module:facturacion', 'dashboard:module:pedidos', 'dashboard:module:clientes'
    )
    ON CONFLICT (rol_id, permiso_id) DO NOTHING;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '✅ [PERMISOS DASHBOARD] Permisos asignados a Contador: %', v_count;
  END IF;

  -- ENCARGADO DE PRODUCCIÓN: Dashboard + módulos de producción
  IF v_produccion_rol_id IS NOT NULL THEN
    INSERT INTO public.rol_permisos (rol_id, permiso_id)
    SELECT v_produccion_rol_id, p.id_permiso
    FROM public.permisos p
    WHERE p.nombre_permiso IN (
      'dashboard:view', 'dashboard:stats',
      'dashboard:module:tareas', 'dashboard:module:analisis-tareas', 'dashboard:module:inventario',
      'dashboard:module:productos', 'dashboard:module:optimizador'
    )
    ON CONFLICT (rol_id, permiso_id) DO NOTHING;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '✅ [PERMISOS DASHBOARD] Permisos asignados a Encargado de Producción: %', v_count;
  END IF;

  -- SOLO LECTURA: Dashboard básico + todos los módulos en modo lectura
  IF v_lectura_rol_id IS NOT NULL THEN
    INSERT INTO public.rol_permisos (rol_id, permiso_id)
    SELECT v_lectura_rol_id, p.id_permiso
    FROM public.permisos p
    WHERE p.nombre_permiso IN (
      'dashboard:view', 'dashboard:stats', 'dashboard:charts',
      'dashboard:module:clientes', 'dashboard:module:cotizaciones', 'dashboard:module:pedidos',
      'dashboard:module:inventario', 'dashboard:module:productos', 'dashboard:module:facturacion',
      'dashboard:module:tareas', 'dashboard:module:optimizador'
    )
    ON CONFLICT (rol_id, permiso_id) DO NOTHING;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '✅ [PERMISOS DASHBOARD] Permisos asignados a Solo Lectura: %', v_count;
  END IF;

END $$;

-- =====================================================
-- 4. VERIFICACIÓN DE PERMISOS INSERTADOS
-- =====================================================

DO $$
DECLARE
  v_total_permisos INTEGER;
  v_total_asignaciones INTEGER;
BEGIN
  RAISE NOTICE '🔍 [PERMISOS DASHBOARD] Verificando instalación...';

  -- Contar permisos de dashboard
  SELECT COUNT(*) INTO v_total_permisos
  FROM public.permisos
  WHERE nombre_permiso LIKE 'dashboard:%';

  RAISE NOTICE '📊 [PERMISOS DASHBOARD] Total de permisos de dashboard: %', v_total_permisos;

  -- Contar asignaciones de permisos de dashboard
  SELECT COUNT(*) INTO v_total_asignaciones
  FROM public.rol_permisos rp
  JOIN public.permisos p ON rp.permiso_id = p.id_permiso
  WHERE p.nombre_permiso LIKE 'dashboard:%';

  RAISE NOTICE '📊 [PERMISOS DASHBOARD] Total de asignaciones: %', v_total_asignaciones;

  -- Mostrar resumen por rol
  RAISE NOTICE '📋 [PERMISOS DASHBOARD] Resumen por rol:';
  
  FOR rec IN (
    SELECT 
      r.nombre_rol,
      COUNT(rp.permiso_id) as total_permisos
    FROM public.roles r
    LEFT JOIN public.rol_permisos rp ON r.id_rol = rp.rol_id
    LEFT JOIN public.permisos p ON rp.permiso_id = p.id_permiso
    WHERE p.nombre_permiso LIKE 'dashboard:%'
    GROUP BY r.nombre_rol
    ORDER BY total_permisos DESC
  ) LOOP
    RAISE NOTICE '  • %: % permisos', rec.nombre_rol, rec.total_permisos;
  END LOOP;

END $$;

-- =====================================================
-- 5. MENSAJE FINAL
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 ========================================';
  RAISE NOTICE '🎉 INSTALACIÓN COMPLETADA EXITOSAMENTE';
  RAISE NOTICE '🎉 ========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Sistema de permisos modulares para dashboard instalado';
  RAISE NOTICE '✅ Permisos asignados a roles según perfil';
  RAISE NOTICE '✅ Dashboard ahora muestra solo módulos autorizados';
  RAISE NOTICE '';
  RAISE NOTICE '📝 PRÓXIMOS PASOS:';
  RAISE NOTICE '   1. Recargar la aplicación frontend';
  RAISE NOTICE '   2. Verificar que cada usuario ve solo sus módulos';
  RAISE NOTICE '   3. Ajustar permisos en Seguridad > Roles si es necesario';
  RAISE NOTICE '';
END $$;

COMMIT;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
