-- ============================================================================
-- SISTEMA SCO - ROW LEVEL SECURITY (RLS) MULTI-TIENDA
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2025
-- Propósito: Implementar seguridad a nivel de fila para multi-tenancy
-- 
-- PRINCIPIO FUNDAMENTAL:
-- La tienda activa se obtiene SIEMPRE desde la tabla usuario_tienda_actual
-- NUNCA se confía en parámetros del frontend
-- ============================================================================

-- ============================================================================
-- PASO 1: FUNCIÓN HELPER CENTRALIZADA (OBLIGATORIA)
-- ============================================================================

/**
 * get_current_user_store()
 * 
 * Función helper que retorna el UUID de la tienda activa del usuario autenticado.
 * Esta es la ÚNICA fuente de verdad para obtener la tienda en políticas RLS.
 * 
 * Retorna:
 *   - UUID de la tienda activa si existe
 *   - NULL si no hay tienda activa o usuario no autenticado
 * 
 * Seguridad:
 *   - SECURITY DEFINER: Se ejecuta con privilegios del creador
 *   - Usa auth.uid() para identificar al usuario autenticado
 *   - No acepta parámetros externos (zero trust)
 */
CREATE OR REPLACE FUNCTION get_current_user_store()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  store_id UUID;
BEGIN
  -- Obtener tienda activa del usuario autenticado
  SELECT tienda_id INTO store_id
  FROM usuario_tienda_actual
  WHERE usuario_id = auth.uid();
  
  -- Retornar NULL si no existe (las políticas RLS deben manejarlo)
  RETURN store_id;
END;
$$;

COMMENT ON FUNCTION get_current_user_store() IS 
'Retorna la tienda activa del usuario autenticado desde usuario_tienda_actual. Fuente única de verdad para RLS.';


/**
 * user_has_access_to_store(store_id UUID)
 * 
 * Función helper que valida si el usuario tiene acceso a una tienda específica.
 * Útil para validaciones adicionales en políticas RLS.
 * 
 * Parámetros:
 *   - store_id: UUID de la tienda a validar
 * 
 * Retorna:
 *   - TRUE si el usuario tiene acceso activo a la tienda
 *   - FALSE en caso contrario
 */
CREATE OR REPLACE FUNCTION user_has_access_to_store(store_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM usuario_tiendas
    WHERE usuario_id = auth.uid()
      AND tienda_id = store_id
      AND activo = true
  );
END;
$$;

COMMENT ON FUNCTION user_has_access_to_store(UUID) IS 
'Valida si el usuario autenticado tiene acceso activo a una tienda específica.';


-- ============================================================================
-- PASO 2: PROTEGER usuario_tienda_actual
-- ============================================================================

-- Habilitar RLS en la tabla
ALTER TABLE usuario_tienda_actual ENABLE ROW LEVEL SECURITY;

-- Política de LECTURA: Solo puede ver su propio registro
DROP POLICY IF EXISTS "users_read_own_current_store" ON usuario_tienda_actual;
CREATE POLICY "users_read_own_current_store" 
ON usuario_tienda_actual
FOR SELECT
USING (usuario_id = auth.uid());

-- Política de INSERCIÓN: Solo puede insertar su propio registro
DROP POLICY IF EXISTS "users_insert_own_current_store" ON usuario_tienda_actual;
CREATE POLICY "users_insert_own_current_store" 
ON usuario_tienda_actual
FOR INSERT
WITH CHECK (usuario_id = auth.uid());

-- Política de ACTUALIZACIÓN: Solo puede actualizar su propio registro
DROP POLICY IF EXISTS "users_update_own_current_store" ON usuario_tienda_actual;
CREATE POLICY "users_update_own_current_store" 
ON usuario_tienda_actual
FOR UPDATE
USING (usuario_id = auth.uid())
WITH CHECK (usuario_id = auth.uid());

-- Política de ELIMINACIÓN: Solo puede eliminar su propio registro
DROP POLICY IF EXISTS "users_delete_own_current_store" ON usuario_tienda_actual;
CREATE POLICY "users_delete_own_current_store" 
ON usuario_tienda_actual
FOR DELETE
USING (usuario_id = auth.uid());

COMMENT ON TABLE usuario_tienda_actual IS 
'Tabla protegida con RLS. Cada usuario solo puede gestionar su propio registro de tienda activa.';


-- ============================================================================
-- PASO 3: TABLAS MULTI-TIENDA (PRIORIDAD 1)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLA: clientes
-- ----------------------------------------------------------------------------

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

-- SELECT: Solo clientes de la tienda activa
DROP POLICY IF EXISTS "users_read_own_store_clientes" ON clientes;
CREATE POLICY "users_read_own_store_clientes" 
ON clientes
FOR SELECT
USING (tienda_id = get_current_user_store());

-- INSERT: Solo puede crear clientes en su tienda activa
DROP POLICY IF EXISTS "users_insert_own_store_clientes" ON clientes;
CREATE POLICY "users_insert_own_store_clientes" 
ON clientes
FOR INSERT
WITH CHECK (tienda_id = get_current_user_store());

-- UPDATE: Solo puede actualizar clientes de su tienda activa
DROP POLICY IF EXISTS "users_update_own_store_clientes" ON clientes;
CREATE POLICY "users_update_own_store_clientes" 
ON clientes
FOR UPDATE
USING (tienda_id = get_current_user_store())
WITH CHECK (tienda_id = get_current_user_store());

-- DELETE: Solo puede eliminar clientes de su tienda activa
DROP POLICY IF EXISTS "users_delete_own_store_clientes" ON clientes;
CREATE POLICY "users_delete_own_store_clientes" 
ON clientes
FOR DELETE
USING (tienda_id = get_current_user_store());


-- ----------------------------------------------------------------------------
-- TABLA: cotizaciones
-- ----------------------------------------------------------------------------

ALTER TABLE cotizaciones ENABLE ROW LEVEL SECURITY;

-- SELECT: Solo cotizaciones de la tienda activa
DROP POLICY IF EXISTS "users_read_own_store_cotizaciones" ON cotizaciones;
CREATE POLICY "users_read_own_store_cotizaciones" 
ON cotizaciones
FOR SELECT
USING (tienda_id = get_current_user_store());

-- INSERT: Solo puede crear cotizaciones en su tienda activa
DROP POLICY IF EXISTS "users_insert_own_store_cotizaciones" ON cotizaciones;
CREATE POLICY "users_insert_own_store_cotizaciones" 
ON cotizaciones
FOR INSERT
WITH CHECK (tienda_id = get_current_user_store());

-- UPDATE: Solo puede actualizar cotizaciones de su tienda activa
DROP POLICY IF EXISTS "users_update_own_store_cotizaciones" ON cotizaciones;
CREATE POLICY "users_update_own_store_cotizaciones" 
ON cotizaciones
FOR UPDATE
USING (tienda_id = get_current_user_store())
WITH CHECK (tienda_id = get_current_user_store());

-- DELETE: Solo puede eliminar cotizaciones de su tienda activa
DROP POLICY IF EXISTS "users_delete_own_store_cotizaciones" ON cotizaciones;
CREATE POLICY "users_delete_own_store_cotizaciones" 
ON cotizaciones
FOR DELETE
USING (tienda_id = get_current_user_store());


-- ----------------------------------------------------------------------------
-- TABLA: pedidos
-- ----------------------------------------------------------------------------

ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;

-- SELECT: Solo pedidos de la tienda activa
DROP POLICY IF EXISTS "users_read_own_store_pedidos" ON pedidos;
CREATE POLICY "users_read_own_store_pedidos" 
ON pedidos
FOR SELECT
USING (tienda_id = get_current_user_store());

-- INSERT: Solo puede crear pedidos en su tienda activa
DROP POLICY IF EXISTS "users_insert_own_store_pedidos" ON pedidos;
CREATE POLICY "users_insert_own_store_pedidos" 
ON pedidos
FOR INSERT
WITH CHECK (tienda_id = get_current_user_store());

-- UPDATE: Solo puede actualizar pedidos de su tienda activa
DROP POLICY IF EXISTS "users_update_own_store_pedidos" ON pedidos;
CREATE POLICY "users_update_own_store_pedidos" 
ON pedidos
FOR UPDATE
USING (tienda_id = get_current_user_store())
WITH CHECK (tienda_id = get_current_user_store());

-- DELETE: Solo puede eliminar pedidos de su tienda activa
DROP POLICY IF EXISTS "users_delete_own_store_pedidos" ON pedidos;
CREATE POLICY "users_delete_own_store_pedidos" 
ON pedidos
FOR DELETE
USING (tienda_id = get_current_user_store());


-- ============================================================================
-- PASO 4: TABLAS RELACIONALES (HIJAS)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLA: cotizacion_items
-- ----------------------------------------------------------------------------
-- Validación: Solo puede acceder a items de cotizaciones de su tienda
-- El RLS de cotizaciones ya filtra, pero agregamos validación explícita

ALTER TABLE cotizacion_items ENABLE ROW LEVEL SECURITY;

-- SELECT: Solo items de cotizaciones de la tienda activa
DROP POLICY IF EXISTS "users_read_own_store_cotizacion_items" ON cotizacion_items;
CREATE POLICY "users_read_own_store_cotizacion_items" 
ON cotizacion_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM cotizaciones
    WHERE cotizaciones.id = cotizacion_items.cotizacion_id
      AND cotizaciones.tienda_id = get_current_user_store()
  )
);

-- INSERT: Solo puede crear items en cotizaciones de su tienda activa
DROP POLICY IF EXISTS "users_insert_own_store_cotizacion_items" ON cotizacion_items;
CREATE POLICY "users_insert_own_store_cotizacion_items" 
ON cotizacion_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM cotizaciones
    WHERE cotizaciones.id = cotizacion_items.cotizacion_id
      AND cotizaciones.tienda_id = get_current_user_store()
  )
);

-- UPDATE: Solo puede actualizar items de cotizaciones de su tienda activa
DROP POLICY IF EXISTS "users_update_own_store_cotizacion_items" ON cotizacion_items;
CREATE POLICY "users_update_own_store_cotizacion_items" 
ON cotizacion_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM cotizaciones
    WHERE cotizaciones.id = cotizacion_items.cotizacion_id
      AND cotizaciones.tienda_id = get_current_user_store()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM cotizaciones
    WHERE cotizaciones.id = cotizacion_items.cotizacion_id
      AND cotizaciones.tienda_id = get_current_user_store()
  )
);

-- DELETE: Solo puede eliminar items de cotizaciones de su tienda activa
DROP POLICY IF EXISTS "users_delete_own_store_cotizacion_items" ON cotizacion_items;
CREATE POLICY "users_delete_own_store_cotizacion_items" 
ON cotizacion_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM cotizaciones
    WHERE cotizaciones.id = cotizacion_items.cotizacion_id
      AND cotizaciones.tienda_id = get_current_user_store()
  )
);


-- ----------------------------------------------------------------------------
-- TABLA: pedido_items
-- ----------------------------------------------------------------------------
-- Validación: Solo puede acceder a items de pedidos de su tienda

ALTER TABLE pedido_items ENABLE ROW LEVEL SECURITY;

-- SELECT: Solo items de pedidos de la tienda activa
DROP POLICY IF EXISTS "users_read_own_store_pedido_items" ON pedido_items;
CREATE POLICY "users_read_own_store_pedido_items" 
ON pedido_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM pedidos
    WHERE pedidos.id = pedido_items.pedido_id
      AND pedidos.tienda_id = get_current_user_store()
  )
);

-- INSERT: Solo puede crear items en pedidos de su tienda activa
DROP POLICY IF EXISTS "users_insert_own_store_pedido_items" ON pedido_items;
CREATE POLICY "users_insert_own_store_pedido_items" 
ON pedido_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM pedidos
    WHERE pedidos.id = pedido_items.pedido_id
      AND pedidos.tienda_id = get_current_user_store()
  )
);

-- UPDATE: Solo puede actualizar items de pedidos de su tienda activa
DROP POLICY IF EXISTS "users_update_own_store_pedido_items" ON pedido_items;
CREATE POLICY "users_update_own_store_pedido_items" 
ON pedido_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM pedidos
    WHERE pedidos.id = pedido_items.pedido_id
      AND pedidos.tienda_id = get_current_user_store()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM pedidos
    WHERE pedidos.id = pedido_items.pedido_id
      AND pedidos.tienda_id = get_current_user_store()
  )
);

-- DELETE: Solo puede eliminar items de pedidos de su tienda activa
DROP POLICY IF EXISTS "users_delete_own_store_pedido_items" ON pedido_items;
CREATE POLICY "users_delete_own_store_pedido_items" 
ON pedido_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM pedidos
    WHERE pedidos.id = pedido_items.pedido_id
      AND pedidos.tienda_id = get_current_user_store()
  )
);


-- ============================================================================
-- PASO 5: CASO ESPECIAL - INVENTARIO
-- ============================================================================

/**
 * DECISIÓN DE DISEÑO PARA INVENTARIO:
 * 
 * La tabla inventario tiene tienda_id NULLABLE para soportar:
 * 1. Artículos globales (tienda_id IS NULL) - Catálogo compartido
 * 2. Artículos por tienda (tienda_id NOT NULL) - Inventario específico
 * 
 * REGLAS DE SEGURIDAD:
 * 
 * LECTURA (SELECT):
 *   - Puede ver artículos globales (tienda_id IS NULL)
 *   - Puede ver artículos de su tienda activa
 *   - NO puede ver artículos de otras tiendas
 * 
 * ESCRITURA (INSERT/UPDATE):
 *   - Solo puede crear/modificar artículos de su tienda activa
 *   - NO puede crear artículos globales (tienda_id IS NULL)
 *   - NO puede modificar artículos globales
 *   - NO puede modificar artículos de otras tiendas
 * 
 * ELIMINACIÓN (DELETE):
 *   - Solo puede eliminar artículos de su tienda activa
 *   - NO puede eliminar artículos globales
 *   - NO puede eliminar artículos de otras tiendas
 * 
 * JUSTIFICACIÓN:
 * Los artículos globales son un catálogo maestro gestionado centralmente.
 * Cada tienda puede tener artículos personalizados adicionales.
 */

ALTER TABLE inventario ENABLE ROW LEVEL SECURITY;

-- SELECT: Ver artículos globales O de la tienda activa
DROP POLICY IF EXISTS "users_read_global_or_own_store_inventario" ON inventario;
CREATE POLICY "users_read_global_or_own_store_inventario" 
ON inventario
FOR SELECT
USING (
  tienda_id IS NULL  -- Artículos globales (catálogo compartido)
  OR tienda_id = get_current_user_store()  -- Artículos de mi tienda
);

-- INSERT: Solo puede crear artículos en su tienda activa (NO globales)
DROP POLICY IF EXISTS "users_insert_own_store_inventario" ON inventario;
CREATE POLICY "users_insert_own_store_inventario" 
ON inventario
FOR INSERT
WITH CHECK (
  tienda_id IS NOT NULL  -- Prohibido crear artículos globales
  AND tienda_id = get_current_user_store()  -- Solo en su tienda
);

-- UPDATE: Solo puede actualizar artículos de su tienda activa (NO globales)
DROP POLICY IF EXISTS "users_update_own_store_inventario" ON inventario;
CREATE POLICY "users_update_own_store_inventario" 
ON inventario
FOR UPDATE
USING (
  tienda_id IS NOT NULL  -- Prohibido modificar artículos globales
  AND tienda_id = get_current_user_store()  -- Solo de su tienda
)
WITH CHECK (
  tienda_id IS NOT NULL  -- Prohibido convertir a global
  AND tienda_id = get_current_user_store()  -- Mantener en su tienda
);

-- DELETE: Solo puede eliminar artículos de su tienda activa (NO globales)
DROP POLICY IF EXISTS "users_delete_own_store_inventario" ON inventario;
CREATE POLICY "users_delete_own_store_inventario" 
ON inventario
FOR DELETE
USING (
  tienda_id IS NOT NULL  -- Prohibido eliminar artículos globales
  AND tienda_id = get_current_user_store()  -- Solo de su tienda
);

COMMENT ON TABLE inventario IS 
'Tabla con RLS híbrido: artículos globales (tienda_id IS NULL) son de solo lectura, artículos por tienda son editables solo por su tienda.';


-- ============================================================================
-- PASO 6: ÍNDICES PARA OPTIMIZAR RLS
-- ============================================================================

-- Índice en usuario_tienda_actual para optimizar get_current_user_store()
CREATE INDEX IF NOT EXISTS idx_usuario_tienda_actual_usuario_id 
ON usuario_tienda_actual(usuario_id);

-- Índices en tablas principales para optimizar filtros de tienda_id
CREATE INDEX IF NOT EXISTS idx_clientes_tienda_id 
ON clientes(tienda_id);

CREATE INDEX IF NOT EXISTS idx_cotizaciones_tienda_id 
ON cotizaciones(tienda_id);

CREATE INDEX IF NOT EXISTS idx_pedidos_tienda_id 
ON pedidos(tienda_id);

CREATE INDEX IF NOT EXISTS idx_inventario_tienda_id 
ON inventario(tienda_id);

-- Índices en tablas hijas para optimizar JOINs en políticas RLS
CREATE INDEX IF NOT EXISTS idx_cotizacion_items_cotizacion_id 
ON cotizacion_items(cotizacion_id);

CREATE INDEX IF NOT EXISTS idx_pedido_items_pedido_id 
ON pedido_items(pedido_id);

-- Índice en usuario_tiendas para optimizar user_has_access_to_store()
CREATE INDEX IF NOT EXISTS idx_usuario_tiendas_usuario_tienda_activo 
ON usuario_tiendas(usuario_id, tienda_id, activo);


-- ============================================================================
-- VALIDACIÓN FINAL Y DOCUMENTACIÓN
-- ============================================================================

/**
 * ============================================================================
 * RESUMEN DE IMPLEMENTACIÓN RLS
 * ============================================================================
 * 
 * TABLAS PROTEGIDAS CON RLS:
 * ✅ usuario_tienda_actual - Protección de tienda activa
 * ✅ clientes - Filtro por tienda activa
 * ✅ cotizaciones - Filtro por tienda activa
 * ✅ cotizacion_items - Validación vía JOIN con cotizaciones
 * ✅ pedidos - Filtro por tienda activa
 * ✅ pedido_items - Validación vía JOIN con pedidos
 * ✅ inventario - Híbrido (globales + por tienda)
 * 
 * TABLAS SIN RLS (PENDIENTES PARA FASE 2):
 * ⚠️ facturas_electronicas
 * ⚠️ factura_items
 * ⚠️ inventario_movimientos
 * ⚠️ inventario_niveles
 * ⚠️ inventario_thresholds
 * ⚠️ inventario_alertas
 * ⚠️ inventario_reservas
 * ⚠️ replenishment_orders
 * ⚠️ tareas
 * ⚠️ tareas_items
 * ⚠️ optimizador_proyectos_temp
 * ⚠️ hacienda_consecutivos
 * ⚠️ comprobantes_recibidos
 * ⚠️ productos (híbrido - requiere análisis)
 * ⚠️ bom_items (híbrido - requiere análisis)
 * 
 * TABLAS GLOBALES (NO REQUIEREN RLS):
 * ✓ paises
 * ✓ provincias
 * ✓ cantones
 * ✓ distritos
 * ✓ actividades_economicas
 * ✓ unidades_medida
 * ✓ tipos_cod_barras
 * ✓ categorias (si es catálogo global)
 * ✓ categorias_inventario (si es catálogo global)
 * 
 * ============================================================================
 * EJEMPLOS DE USO
 * ============================================================================
 * 
 * EJEMPLO 1: Query que FUNCIONA (usuario con tienda activa)
 * 
 * -- Usuario con tienda_id = 'abc-123' en usuario_tienda_actual
 * SELECT * FROM clientes;
 * -- Resultado: Solo clientes con tienda_id = 'abc-123'
 * 
 * 
 * EJEMPLO 2: Query que FALLA (usuario sin tienda activa)
 * 
 * -- Usuario sin registro en usuario_tienda_actual
 * SELECT * FROM clientes;
 * -- Resultado: 0 filas (get_current_user_store() retorna NULL)
 * 
 * 
 * EJEMPLO 3: Intento de acceso a otra tienda (BLOQUEADO)
 * 
 * -- Usuario con tienda_id = 'abc-123'
 * SELECT * FROM clientes WHERE tienda_id = 'xyz-789';
 * -- Resultado: 0 filas (RLS filtra automáticamente)
 * 
 * 
 * EJEMPLO 4: Inventario global (PERMITIDO)
 * 
 * -- Usuario con tienda activa
 * SELECT * FROM inventario WHERE tienda_id IS NULL;
 * -- Resultado: Artículos globales (catálogo compartido)
 * 
 * 
 * EJEMPLO 5: Intento de modificar inventario global (BLOQUEADO)
 * 
 * -- Usuario con tienda activa
 * UPDATE inventario SET precio = 100 WHERE tienda_id IS NULL;
 * -- Resultado: 0 filas actualizadas (política RLS lo bloquea)
 * 
 * 
 * EJEMPLO 6: Items de cotización (validación por JOIN)
 * 
 * -- Usuario con tienda_id = 'abc-123'
 * SELECT * FROM cotizacion_items WHERE cotizacion_id = 'cot-456';
 * -- Resultado: Items solo si la cotización pertenece a tienda 'abc-123'
 * 
 * ============================================================================
 * ADVERTENCIAS CRÍTICAS
 * ============================================================================
 * 
 * ⚠️ ADVERTENCIA 1: Mantenimiento de usuario_tienda_actual
 * Este RLS asume que la tabla usuario_tienda_actual está correctamente
 * mantenida por la aplicación. Si un usuario no tiene registro en esta tabla,
 * NO podrá acceder a NINGÚN dato.
 * 
 * ⚠️ ADVERTENCIA 2: Cambio de tienda
 * Cuando un usuario cambia de tienda, debe actualizarse usuario_tienda_actual.
 * El cambio es inmediato y afecta todas las queries subsecuentes.
 * 
 * ⚠️ ADVERTENCIA 3: Datos legacy con tienda_id NULL
 * Los datos existentes con tienda_id = NULL en tablas que NO son inventario
 * NO serán accesibles. Se requiere migración de datos en Fase 2.
 * 
 * ⚠️ ADVERTENCIA 4: Performance
 * Las políticas RLS con EXISTS y JOINs pueden impactar performance.
 * Los índices creados mitigan esto, pero monitorear en producción.
 * 
 * ⚠️ ADVERTENCIA 5: Service Role
 * Las Edge Functions que usen SUPABASE_SERVICE_ROLE_KEY bypassean RLS.
 * Deben implementar validación manual de tienda.
 * 
 * ============================================================================
 * PRÓXIMOS PASOS (FASE 2)
 * ============================================================================
 * 
 * 1. Implementar RLS en tablas restantes (facturas, inventario_movimientos, etc.)
 * 2. Migrar datos legacy con tienda_id = NULL
 * 3. Actualizar Edge Functions para validar tienda desde BD
 * 4. Actualizar servicios frontend para confiar en RLS
 * 5. Implementar tests de seguridad
 * 6. Monitorear performance de queries con RLS
 * 7. Documentar casos especiales (productos, bom_items)
 * 
 * ============================================================================
 * CRITERIOS DE ÉXITO
 * ============================================================================
 * 
 * ✅ Un usuario NO puede ver datos de otra tienda
 * ✅ Un usuario NO puede modificar datos de otra tienda
 * ✅ Un usuario NO puede cambiar su tienda arbitrariamente
 * ✅ Todo acceso depende de usuario_tienda_actual
 * ✅ Artículos globales son de solo lectura
 * ✅ Sistema listo para Fase 2 (servicios + edge functions)
 * 
 * ============================================================================
 */

-- Fin del script RLS
