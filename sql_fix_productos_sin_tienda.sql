-- =====================================================
-- FIX: Asignar tienda a productos sin tienda_id
-- =====================================================
-- Problema: Algunos productos tienen tienda_id = NULL
-- Solución: Asignarles la tienda del usuario que los creó
-- =====================================================

-- 1. Mostrar productos sin tienda asignada
SELECT 
  id_producto,
  codigo_producto,
  descripcion_producto,
  tienda_id,
  created_at
FROM productos
WHERE tienda_id IS NULL;

-- 2. Asignar la tienda OLO (tienda principal) a productos sin tienda
-- Puedes cambiar el UUID por el de tu tienda principal
UPDATE productos
SET tienda_id = 'd9bd9096-d179-4ae6-a49d-a1029751ae13' -- UUID de la tienda OLO
WHERE tienda_id IS NULL;

-- 3. Verificar que todos los productos ahora tienen tienda asignada
SELECT 
  COUNT(*) as total_productos,
  COUNT(tienda_id) as productos_con_tienda,
  COUNT(*) - COUNT(tienda_id) as productos_sin_tienda
FROM productos;

-- 4. Agregar constraint para evitar que se creen productos sin tienda en el futuro
ALTER TABLE productos
ALTER COLUMN tienda_id SET NOT NULL;

-- 5. Verificar la distribución de productos por tienda
SELECT 
  t.nombre_tienda,
  COUNT(p.id_producto) as total_productos
FROM tiendas t
LEFT JOIN productos p ON p.tienda_id = t.id_tienda
GROUP BY t.id_tienda, t.nombre_tienda
ORDER BY total_productos DESC;

-- =====================================================
-- RESULTADO ESPERADO:
-- ✅ Todos los productos tendrán una tienda asignada
-- ✅ No se podrán crear productos sin tienda en el futuro
-- ✅ Los productos aparecerán en la aplicación
-- =====================================================
