-- ============================================
-- MÓDULO: OPTIMIZADOR DE CORTES 2D
-- Descripción: Sistema completo de optimización de cortes 2D
-- para cotización de muebles con cálculo de materiales,
-- tapacantos, horas máquina y representación gráfica
-- ============================================

-- Tabla: proyectos_optimizador
-- Almacena los proyectos de optimización creados por los usuarios
CREATE TABLE IF NOT EXISTS proyectos_optimizador (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  modo VARCHAR(20) NOT NULL CHECK (modo IN ('bom', 'manual')),
  producto_bom_id INTEGER REFERENCES productos(id) ON DELETE SET NULL,
  producto_bom_nombre VARCHAR(255),
  piezas JSONB NOT NULL DEFAULT '[]'::jsonb,
  configuracion JSONB NOT NULL DEFAULT '{
    "espesor_sierra": 3,
    "margen_seguridad": 5,
    "permitir_rotacion": true,
    "optimizar_desperdicio": true
  }'::jsonb,
  resultado JSONB,
  tienda_id UUID NOT NULL REFERENCES tiendas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX idx_proyectos_optimizador_tienda ON proyectos_optimizador(tienda_id);
CREATE INDEX idx_proyectos_optimizador_usuario ON proyectos_optimizador(usuario_id);
CREATE INDEX idx_proyectos_optimizador_producto_bom ON proyectos_optimizador(producto_bom_id);
CREATE INDEX idx_proyectos_optimizador_modo ON proyectos_optimizador(modo);
CREATE INDEX idx_proyectos_optimizador_created_at ON proyectos_optimizador(created_at DESC);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_proyectos_optimizador_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_proyectos_optimizador_updated_at
  BEFORE UPDATE ON proyectos_optimizador
  FOR EACH ROW
  EXECUTE FUNCTION update_proyectos_optimizador_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE proyectos_optimizador ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver proyectos de su tienda
CREATE POLICY "Usuarios pueden ver proyectos de su tienda"
  ON proyectos_optimizador
  FOR SELECT
  USING (
    tienda_id IN (
      SELECT tienda_id 
      FROM usuario_tiendas 
      WHERE usuario_id = auth.uid()
    )
  );

-- Política: Los usuarios pueden crear proyectos en su tienda actual
CREATE POLICY "Usuarios pueden crear proyectos en su tienda"
  ON proyectos_optimizador
  FOR INSERT
  WITH CHECK (
    tienda_id IN (
      SELECT tienda_id 
      FROM usuario_tiendas 
      WHERE usuario_id = auth.uid()
    )
    AND usuario_id = auth.uid()
  );

-- Política: Los usuarios pueden actualizar sus propios proyectos
CREATE POLICY "Usuarios pueden actualizar sus proyectos"
  ON proyectos_optimizador
  FOR UPDATE
  USING (
    usuario_id = auth.uid()
    AND tienda_id IN (
      SELECT tienda_id 
      FROM usuario_tiendas 
      WHERE usuario_id = auth.uid()
    )
  );

-- Política: Los usuarios pueden eliminar sus propios proyectos
CREATE POLICY "Usuarios pueden eliminar sus proyectos"
  ON proyectos_optimizador
  FOR DELETE
  USING (
    usuario_id = auth.uid()
    AND tienda_id IN (
      SELECT tienda_id 
      FROM usuario_tiendas 
      WHERE usuario_id = auth.uid()
    )
  );

-- ============================================
-- CAMPOS ADICIONALES EN INVENTARIO
-- Para soportar láminas con dimensiones
-- ============================================

-- Agregar campos si no existen
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventario' AND column_name = 'largo_lamina'
  ) THEN
    ALTER TABLE inventario ADD COLUMN largo_lamina NUMERIC(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventario' AND column_name = 'ancho_lamina'
  ) THEN
    ALTER TABLE inventario ADD COLUMN ancho_lamina NUMERIC(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventario' AND column_name = 'espesor'
  ) THEN
    ALTER TABLE inventario ADD COLUMN espesor NUMERIC(10,2);
  END IF;
END $$;

-- Comentarios en las columnas
COMMENT ON COLUMN inventario.largo_lamina IS 'Largo de la lámina en milímetros (para materiales 2D)';
COMMENT ON COLUMN inventario.ancho_lamina IS 'Ancho de la lámina en milímetros (para materiales 2D)';
COMMENT ON COLUMN inventario.espesor IS 'Espesor del material en milímetros';

-- ============================================
-- PERMISOS DEL MÓDULO OPTIMIZADOR
-- ============================================

-- Insertar permisos si no existen
INSERT INTO permisos (nombre, descripcion, modulo, created_at)
VALUES 
  ('optimizador:view', 'Ver módulo de optimizador', 'optimizador', NOW()),
  ('optimizador:create', 'Crear proyectos de optimización', 'optimizador', NOW()),
  ('optimizador:edit', 'Editar proyectos de optimización', 'optimizador', NOW()),
  ('optimizador:delete', 'Eliminar proyectos de optimización', 'optimizador', NOW()),
  ('optimizador:export', 'Exportar resultados a Excel', 'optimizador', NOW()),
  ('optimizador:bom', 'Cargar piezas desde BOM', 'optimizador', NOW())
ON CONFLICT (nombre) DO NOTHING;

-- ============================================
-- DATOS DE EJEMPLO (OPCIONAL)
-- ============================================

-- Insertar categorías para láminas y tapacantos si no existen
INSERT INTO categorias_inventario (nombre, descripcion, created_at)
VALUES 
  ('LAMINAS', 'Láminas y tableros para corte 2D', NOW()),
  ('TAPACANTOS', 'Tapacantos y bordes', NOW())
ON CONFLICT (nombre) DO NOTHING;

-- ============================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ============================================

COMMENT ON TABLE proyectos_optimizador IS 'Proyectos de optimización de cortes 2D para cotización de muebles';
COMMENT ON COLUMN proyectos_optimizador.modo IS 'Modo de trabajo: bom (desde producto) o manual (piezas personalizadas)';
COMMENT ON COLUMN proyectos_optimizador.piezas IS 'Array JSON con las piezas a optimizar (dimensiones, material, tapacantos, etc.)';
COMMENT ON COLUMN proyectos_optimizador.configuracion IS 'Configuración del algoritmo de optimización (espesor sierra, rotación, etc.)';
COMMENT ON COLUMN proyectos_optimizador.resultado IS 'Resultado de la optimización (láminas, aprovechamiento, costos, etc.)';

-- ============================================
-- FUNCIONES AUXILIARES
-- ============================================

-- Función para obtener estadísticas de proyectos
CREATE OR REPLACE FUNCTION get_estadisticas_optimizador(p_tienda_id UUID)
RETURNS TABLE (
  total_proyectos BIGINT,
  proyectos_bom BIGINT,
  proyectos_manual BIGINT,
  aprovechamiento_promedio NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_proyectos,
    COUNT(*) FILTER (WHERE modo = 'bom')::BIGINT as proyectos_bom,
    COUNT(*) FILTER (WHERE modo = 'manual')::BIGINT as proyectos_manual,
    AVG((resultado->>'porcentaje_aprovechamiento_global')::NUMERIC) as aprovechamiento_promedio
  FROM proyectos_optimizador
  WHERE tienda_id = p_tienda_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FINALIZACIÓN
-- ============================================

-- Mensaje de confirmación
DO $$ 
BEGIN
  RAISE NOTICE 'Migración 005_modulo_optimizador_cortes.sql completada exitosamente';
  RAISE NOTICE 'Tabla proyectos_optimizador creada';
  RAISE NOTICE 'Campos adicionales en inventario agregados';
  RAISE NOTICE 'Permisos del módulo optimizador insertados';
  RAISE NOTICE 'RLS configurado correctamente';
END $$;
