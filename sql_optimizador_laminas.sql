-- =====================================================
-- OPTIMIZADOR DE CORTES 2D - SISTEMA DE LÁMINAS
-- =====================================================
-- Este script agrega los campos necesarios para manejar
-- dimensiones de láminas en el inventario y optimizar
-- el aprovechamiento de cada lámina antes de usar otra.
-- =====================================================

-- 1. Agregar campos de dimensiones de lámina al inventario
ALTER TABLE inventario 
ADD COLUMN IF NOT EXISTS espesor_mm DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS largo_lamina_mm DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS ancho_lamina_mm DECIMAL(10,2);

-- 2. Crear índice para búsquedas rápidas por categoría de láminas
CREATE INDEX IF NOT EXISTS idx_inventario_categoria_lamina 
ON inventario(categoria_id) 
WHERE categoria_id IN (
  SELECT id FROM categorias_inventario 
  WHERE nombre ILIKE '%lámina%' OR nombre ILIKE '%lamina%'
);

-- 3. Comentarios para documentación
COMMENT ON COLUMN inventario.espesor_mm IS 'Espesor de la lámina en milímetros (ej. 16, 18, 19). Solo para artículos con categoría "Lámina"';
COMMENT ON COLUMN inventario.largo_lamina_mm IS 'Largo de la lámina completa en milímetros (ej. 2800, 2500). Solo para artículos con categoría "Lámina"';
COMMENT ON COLUMN inventario.ancho_lamina_mm IS 'Ancho de la lámina completa en milímetros (ej. 2070, 1830). Solo para artículos con categoría "Lámina"';

-- 4. Crear tabla para guardar proyectos de optimización (si no existe)
CREATE TABLE IF NOT EXISTS proyectos_optimizador (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  modo VARCHAR(20) NOT NULL CHECK (modo IN ('bom', 'manual')),
  producto_bom_id INTEGER REFERENCES productos(id_producto),
  piezas JSONB NOT NULL DEFAULT '[]',
  configuracion JSONB NOT NULL DEFAULT '{}',
  resultado JSONB,
  tienda_id UUID NOT NULL REFERENCES tiendas(id),
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Índices para proyectos_optimizador
CREATE INDEX IF NOT EXISTS idx_proyectos_optimizador_tienda 
ON proyectos_optimizador(tienda_id);

CREATE INDEX IF NOT EXISTS idx_proyectos_optimizador_usuario 
ON proyectos_optimizador(usuario_id);

CREATE INDEX IF NOT EXISTS idx_proyectos_optimizador_created 
ON proyectos_optimizador(created_at DESC);

-- 6. RLS para proyectos_optimizador
ALTER TABLE proyectos_optimizador ENABLE ROW LEVEL SECURITY;

-- Política de lectura: usuarios pueden ver proyectos de su tienda
CREATE POLICY "Usuarios pueden ver proyectos de su tienda" 
ON proyectos_optimizador
FOR SELECT
USING (
  tienda_id IN (
    SELECT tienda_id FROM usuario_tiendas 
    WHERE usuario_id = auth.uid()
  )
);

-- Política de inserción: usuarios pueden crear proyectos en su tienda
CREATE POLICY "Usuarios pueden crear proyectos en su tienda" 
ON proyectos_optimizador
FOR INSERT
WITH CHECK (
  tienda_id IN (
    SELECT tienda_id FROM usuario_tiendas 
    WHERE usuario_id = auth.uid()
  )
  AND usuario_id = auth.uid()
);

-- Política de actualización: usuarios pueden actualizar sus propios proyectos
CREATE POLICY "Usuarios pueden actualizar sus proyectos" 
ON proyectos_optimizador
FOR UPDATE
USING (usuario_id = auth.uid())
WITH CHECK (usuario_id = auth.uid());

-- Política de eliminación: usuarios pueden eliminar sus propios proyectos
CREATE POLICY "Usuarios pueden eliminar sus proyectos" 
ON proyectos_optimizador
FOR DELETE
USING (usuario_id = auth.uid());

-- 7. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_proyectos_optimizador_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_proyectos_optimizador_updated_at
BEFORE UPDATE ON proyectos_optimizador
FOR EACH ROW
EXECUTE FUNCTION update_proyectos_optimizador_updated_at();

-- =====================================================
-- DATOS DE EJEMPLO (OPCIONAL)
-- =====================================================
-- Puedes descomentar esto para agregar datos de ejemplo

/*
-- Ejemplo: Actualizar una melamina existente con dimensiones
UPDATE inventario 
SET 
  espesor_mm = 19,
  largo_lamina_mm = 2800,
  ancho_lamina_mm = 2070
WHERE codigo_articulo = 'MEL-19-2800x2070'
  AND categoria_id IN (SELECT id FROM categorias_inventario WHERE nombre ILIKE '%lámina%');

-- Ejemplo: Actualizar otra melamina
UPDATE inventario 
SET 
  espesor_mm = 18,
  largo_lamina_mm = 2500,
  ancho_lamina_mm = 1830
WHERE codigo_articulo = 'MEL-18-2500x1830'
  AND categoria_id IN (SELECT id FROM categorias_inventario WHERE nombre ILIKE '%lámina%');
*/

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Consulta para verificar que los campos se agregaron correctamente
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'inventario'
  AND column_name IN ('espesor_mm', 'largo_lamina_mm', 'ancho_lamina_mm')
ORDER BY ordinal_position;

-- Consulta para ver láminas con dimensiones configuradas
SELECT 
  codigo_articulo,
  descripcion_articulo,
  espesor_mm,
  largo_lamina_mm,
  ancho_lamina_mm,
  precio_articulo
FROM inventario
WHERE espesor_mm IS NOT NULL
  OR largo_lamina_mm IS NOT NULL
  OR ancho_lamina_mm IS NOT NULL
LIMIT 10;
