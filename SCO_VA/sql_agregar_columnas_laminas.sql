-- =====================================================
-- AGREGAR COLUMNAS PARA OPTIMIZADOR DE LÁMINAS
-- =====================================================
-- Este script agrega las columnas necesarias para manejar
-- las dimensiones de las láminas en el módulo optimizador
-- =====================================================

-- Agregar columnas para dimensiones de láminas
ALTER TABLE inventario 
ADD COLUMN IF NOT EXISTS espesor_mm NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS largo_lamina_mm NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS ancho_lamina_mm NUMERIC(10,2);

-- Agregar comentarios para documentación
COMMENT ON COLUMN inventario.espesor_mm IS 'Espesor de la lámina en milímetros (ej. 16, 18, 19)';
COMMENT ON COLUMN inventario.largo_lamina_mm IS 'Largo completo de la lámina en milímetros (ej. 2800, 2500)';
COMMENT ON COLUMN inventario.ancho_lamina_mm IS 'Ancho completo de la lámina en milímetros (ej. 2070, 1830)';

-- =====================================================
-- EJEMPLOS DE USO
-- =====================================================

-- Ejemplo 1: Actualizar una melamina 19mm de 2800x2070
-- UPDATE inventario 
-- SET 
--   espesor_mm = 19,
--   largo_lamina_mm = 2800,
--   ancho_lamina_mm = 2070
-- WHERE codigo_articulo = 'MEL-19-2800x2070';

-- Ejemplo 2: Actualizar una melamina 18mm de 2500x1830
-- UPDATE inventario 
-- SET 
--   espesor_mm = 18,
--   largo_lamina_mm = 2500,
--   ancho_lamina_mm = 1830
-- WHERE codigo_articulo = 'MEL-18-2500x1830';

-- Ejemplo 3: Actualizar una melamina 16mm de 2800x2070
-- UPDATE inventario 
-- SET 
--   espesor_mm = 16,
--   largo_lamina_mm = 2800,
--   ancho_lamina_mm = 2070
-- WHERE codigo_articulo = 'MEL-16-2800x2070';

-- =====================================================
-- VERIFICAR COLUMNAS AGREGADAS
-- =====================================================

-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'inventario' 
-- AND column_name IN ('espesor_mm', 'largo_lamina_mm', 'ancho_lamina_mm')
-- ORDER BY column_name;
