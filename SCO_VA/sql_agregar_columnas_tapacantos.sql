-- =====================================================
-- AGREGAR COLUMNAS PARA MEDIDAS DE TAPACANTOS
-- =====================================================
-- Este script agrega las columnas necesarias para almacenar
-- las dimensiones de los tapacantos (ancho y grosor en mm)
-- Similar a las columnas existentes para láminas
-- =====================================================

-- Agregar columnas para medidas de tapacantos
ALTER TABLE inventario 
ADD COLUMN IF NOT EXISTS ancho_tapacanto_mm NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS grosor_tapacanto_mm NUMERIC(10,2);

-- Agregar comentarios para documentación
COMMENT ON COLUMN inventario.ancho_tapacanto_mm IS 'Ancho del tapacanto en milímetros (solo para categoría TAPACANTOS)';
COMMENT ON COLUMN inventario.grosor_tapacanto_mm IS 'Grosor del tapacanto en milímetros (solo para categoría TAPACANTOS)';

-- Verificar que las columnas se crearon correctamente
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'inventario' 
AND column_name IN ('ancho_tapacanto_mm', 'grosor_tapacanto_mm')
ORDER BY column_name;
