-- ============================================
-- TABLA TEMPORAL PARA PROYECTOS DEL OPTIMIZADOR 2D
-- ============================================
-- Esta tabla almacena temporalmente los proyectos del optimizador
-- hasta que se genere la cotización correspondiente

CREATE TABLE IF NOT EXISTS optimizador_proyectos_temp (
  id_proyecto UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id_tienda UUID NOT NULL REFERENCES tiendas(id) ON DELETE CASCADE,
  
  -- Información del proyecto
  nombre_proyecto TEXT,
  fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
  
  -- Piezas cargadas (array de objetos JSON)
  -- Cada pieza contiene: descripcion, largo, ancho, cantidad, veta, 
  -- tapacanto_superior, tapacanto_inferior, tapacanto_izquierdo, tapacanto_derecho,
  -- cnc1, cnc2, codigo_material, nombre_material
  piezas JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Resultados de optimización por material
  -- Estructura: { "codigo_material": { laminas_usadas, aprovechamiento, costo_total, detalle_laminas: [...] } }
  resultados_optimizacion JSONB DEFAULT '{}'::jsonb,
  
  -- Resumen general del proyecto
  resumen JSONB DEFAULT '{
    "total_laminas": 0,
    "aprovechamiento_promedio": 0,
    "total_piezas": 0,
    "costo_total": 0,
    "costo_materiales": 0,
    "costo_tapacantos": 0,
    "costo_horas_maquina": 0,
    "area_utilizada": 0,
    "area_sobrante": 0
  }'::jsonb,
  
  -- Estado del proyecto
  estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'cotizado', 'archivado')),
  
  -- Cotización generada (si existe)
  id_cotizacion INTEGER REFERENCES cotizaciones(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_opt_proyectos_usuario ON optimizador_proyectos_temp(id_usuario);
CREATE INDEX IF NOT EXISTS idx_opt_proyectos_tienda ON optimizador_proyectos_temp(id_tienda);
CREATE INDEX IF NOT EXISTS idx_opt_proyectos_estado ON optimizador_proyectos_temp(estado);
CREATE INDEX IF NOT EXISTS idx_opt_proyectos_cotizacion ON optimizador_proyectos_temp(id_cotizacion);
CREATE INDEX IF NOT EXISTS idx_opt_proyectos_fecha ON optimizador_proyectos_temp(fecha_creacion DESC);

-- ============================================
-- TRIGGER PARA ACTUALIZAR updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_optimizador_proyectos_temp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_optimizador_proyectos_temp_updated_at
  BEFORE UPDATE ON optimizador_proyectos_temp
  FOR EACH ROW
  EXECUTE FUNCTION update_optimizador_proyectos_temp_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE optimizador_proyectos_temp ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver sus propios proyectos de su tienda
CREATE POLICY "Usuarios pueden ver sus propios proyectos"
  ON optimizador_proyectos_temp
  FOR SELECT
  USING (
    id_usuario = auth.uid() 
    AND id_tienda IN (
      SELECT tienda_id 
      FROM usuario_tiendas 
      WHERE usuario_id = auth.uid()
    )
  );

-- Política: Los usuarios pueden insertar proyectos en sus tiendas
CREATE POLICY "Usuarios pueden crear proyectos en sus tiendas"
  ON optimizador_proyectos_temp
  FOR INSERT
  WITH CHECK (
    id_usuario = auth.uid()
    AND id_tienda IN (
      SELECT tienda_id 
      FROM usuario_tiendas 
      WHERE usuario_id = auth.uid()
    )
  );

-- Política: Los usuarios pueden actualizar sus propios proyectos
CREATE POLICY "Usuarios pueden actualizar sus propios proyectos"
  ON optimizador_proyectos_temp
  FOR UPDATE
  USING (id_usuario = auth.uid())
  WITH CHECK (id_usuario = auth.uid());

-- Política: Los usuarios pueden eliminar sus propios proyectos
CREATE POLICY "Usuarios pueden eliminar sus propios proyectos"
  ON optimizador_proyectos_temp
  FOR DELETE
  USING (id_usuario = auth.uid());

-- ============================================
-- FUNCIÓN PARA LIMPIAR PROYECTOS ANTIGUOS
-- ============================================
-- Esta función elimina proyectos con más de 7 días que no estén cotizados

CREATE OR REPLACE FUNCTION limpiar_proyectos_optimizador_antiguos()
RETURNS INTEGER AS $$
DECLARE
  proyectos_eliminados INTEGER;
BEGIN
  DELETE FROM optimizador_proyectos_temp
  WHERE 
    estado = 'activo'
    AND fecha_creacion < NOW() - INTERVAL '7 days'
    AND id_cotizacion IS NULL;
  
  GET DIAGNOSTICS proyectos_eliminados = ROW_COUNT;
  
  RETURN proyectos_eliminados;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON TABLE optimizador_proyectos_temp IS 'Tabla temporal para almacenar proyectos del optimizador 2D hasta que se genere la cotización';
COMMENT ON COLUMN optimizador_proyectos_temp.piezas IS 'Array JSON con todas las piezas cargadas en el optimizador';
COMMENT ON COLUMN optimizador_proyectos_temp.resultados_optimizacion IS 'Resultados de optimización por material (láminas, aprovechamiento, costos)';
COMMENT ON COLUMN optimizador_proyectos_temp.resumen IS 'Resumen general del proyecto con totales y métricas';
COMMENT ON COLUMN optimizador_proyectos_temp.estado IS 'Estado del proyecto: activo (en edición), cotizado (ya se generó cotización), archivado';
COMMENT ON COLUMN optimizador_proyectos_temp.id_cotizacion IS 'ID de la cotización generada a partir de este proyecto';
