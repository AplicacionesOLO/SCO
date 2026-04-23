-- Agregar columna moneda a la tabla productos
-- Ejecutar este script en el editor SQL de Supabase

ALTER TABLE productos 
ADD COLUMN IF NOT EXISTS moneda VARCHAR(3) DEFAULT 'CRC' NOT NULL;

-- Actualizar productos existentes sin moneda asignada
UPDATE productos SET moneda = 'CRC' WHERE moneda IS NULL;

-- Verificar resultado
SELECT id_producto, codigo_producto, descripcion_producto, moneda 
FROM productos 
ORDER BY id_producto 
LIMIT 10;
