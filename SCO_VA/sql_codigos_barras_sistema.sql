-- =====================================================
-- SISTEMA DE CÓDIGOS DE BARRAS PARA INVENTARIO
-- =====================================================
-- Este script crea la infraestructura necesaria para
-- manejar códigos de barras de diferentes tipos en el
-- sistema de inventario de forma escalable y flexible.
-- =====================================================

-- =====================================================
-- PASO 1: Crear tabla tipos_cod_barras
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tipos_cod_barras (
  id_tipo_cod_barras serial NOT NULL,
  descripcion_tipo_cod_barras character varying(100) NOT NULL,
  formato_valido character varying(255) NULL,
  activo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tipos_cod_barras_pkey PRIMARY KEY (id_tipo_cod_barras),
  CONSTRAINT tipos_cod_barras_descripcion_key UNIQUE (descripcion_tipo_cod_barras)
);

-- =====================================================
-- PASO 2: Insertar tipos de códigos de barras comunes
-- =====================================================
INSERT INTO public.tipos_cod_barras (descripcion_tipo_cod_barras, formato_valido) VALUES
('EAN-13', '^[0-9]{13}$'),
('EAN-8', '^[0-9]{8}$'),
('UPC-A', '^[0-9]{12}$'),
('UPC-E', '^[0-9]{8}$'),
('Code 128', '^[\x00-\x7F]+$'),
('Code 39', '^[A-Z0-9\-\.\ \$\/\+\%]+$'),
('ITF-14', '^[0-9]{14}$'),
('QR Code', NULL),
('Datamatrix', NULL),
('Code 93', '^[A-Z0-9\-\.\ \$\/\+\%]+$')
ON CONFLICT (descripcion_tipo_cod_barras) DO NOTHING;

-- =====================================================
-- PASO 3: Agregar columnas a la tabla inventario
-- =====================================================
DO $$ 
BEGIN
  -- Agregar columna cod_barras
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'inventario' 
    AND column_name = 'cod_barras'
  ) THEN
    ALTER TABLE public.inventario 
    ADD COLUMN cod_barras character varying(100) NULL;
    RAISE NOTICE 'Columna cod_barras agregada exitosamente';
  ELSE
    RAISE NOTICE 'Columna cod_barras ya existe';
  END IF;

  -- Agregar columna tipo_cod_barras
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'inventario' 
    AND column_name = 'tipo_cod_barras'
  ) THEN
    ALTER TABLE public.inventario 
    ADD COLUMN tipo_cod_barras integer NULL;
    RAISE NOTICE 'Columna tipo_cod_barras agregada exitosamente';
  ELSE
    RAISE NOTICE 'Columna tipo_cod_barras ya existe';
  END IF;
END $$;

-- =====================================================
-- PASO 4: Agregar constraint de clave foránea
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'inventario_tipo_cod_barras_fkey'
    AND table_name = 'inventario'
  ) THEN
    ALTER TABLE public.inventario
    ADD CONSTRAINT inventario_tipo_cod_barras_fkey 
    FOREIGN KEY (tipo_cod_barras) 
    REFERENCES public.tipos_cod_barras(id_tipo_cod_barras);
    RAISE NOTICE 'Constraint de clave foránea agregado exitosamente';
  ELSE
    RAISE NOTICE 'Constraint de clave foránea ya existe';
  END IF;
END $$;

-- =====================================================
-- PASO 5: Crear índice para búsqueda rápida
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_inventario_cod_barras 
ON public.inventario(cod_barras) 
WHERE cod_barras IS NOT NULL;

-- =====================================================
-- PASO 6: Agregar comentarios para documentación
-- =====================================================
COMMENT ON TABLE public.tipos_cod_barras IS 'Catálogo de tipos de códigos de barras soportados por el sistema';
COMMENT ON COLUMN public.tipos_cod_barras.id_tipo_cod_barras IS 'ID único del tipo de código de barras';
COMMENT ON COLUMN public.tipos_cod_barras.descripcion_tipo_cod_barras IS 'Nombre descriptivo del tipo de código de barras (ej: EAN-13, Code 128)';
COMMENT ON COLUMN public.tipos_cod_barras.formato_valido IS 'Expresión regular para validar el formato del código de barras';
COMMENT ON COLUMN public.tipos_cod_barras.activo IS 'Indica si el tipo de código de barras está activo en el sistema';

COMMENT ON COLUMN public.inventario.cod_barras IS 'Código de barras del artículo';
COMMENT ON COLUMN public.inventario.tipo_cod_barras IS 'Tipo de código de barras (FK a tipos_cod_barras)';

-- =====================================================
-- PASO 7: Habilitar RLS (Row Level Security)
-- =====================================================
ALTER TABLE public.tipos_cod_barras ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PASO 8: Crear políticas de seguridad
-- =====================================================

-- Política de lectura para todos los usuarios autenticados
DROP POLICY IF EXISTS "Permitir lectura de tipos de códigos de barras" ON public.tipos_cod_barras;
CREATE POLICY "Permitir lectura de tipos de códigos de barras"
ON public.tipos_cod_barras
FOR SELECT
TO authenticated
USING (activo = true);

-- Política de escritura solo para administradores
DROP POLICY IF EXISTS "Permitir escritura de tipos de códigos de barras a admins" ON public.tipos_cod_barras;
CREATE POLICY "Permitir escritura de tipos de códigos de barras a admins"
ON public.tipos_cod_barras
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.usuario_roles ur
    JOIN public.roles r ON ur.rol_id = r.id_rol
    WHERE ur.usuario_id = auth.uid()
    AND r.nombre_rol IN ('Administrador', 'Super Administrador')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.usuario_roles ur
    JOIN public.roles r ON ur.rol_id = r.id_rol
    WHERE ur.usuario_id = auth.uid()
    AND r.nombre_rol IN ('Administrador', 'Super Administrador')
  )
);

-- =====================================================
-- PASO 9: Función auxiliar para validar código de barras
-- =====================================================
CREATE OR REPLACE FUNCTION public.validar_codigo_barras(
  p_codigo_barras text,
  p_tipo_cod_barras integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_formato_valido text;
BEGIN
  -- Obtener el formato válido del tipo de código de barras
  SELECT formato_valido INTO v_formato_valido
  FROM public.tipos_cod_barras
  WHERE id_tipo_cod_barras = p_tipo_cod_barras
  AND activo = true;

  -- Si no hay formato válido definido, aceptar cualquier código
  IF v_formato_valido IS NULL THEN
    RETURN true;
  END IF;

  -- Validar el código contra la expresión regular
  RETURN p_codigo_barras ~ v_formato_valido;
END;
$$;

COMMENT ON FUNCTION public.validar_codigo_barras IS 'Valida un código de barras contra el formato definido para su tipo';

-- =====================================================
-- PASO 10: Función para detectar tipo de código automáticamente
-- =====================================================
CREATE OR REPLACE FUNCTION public.detectar_tipo_codigo_barras(
  p_codigo_barras text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tipo_id integer;
  v_formato text;
BEGIN
  -- Intentar detectar el tipo basándose en los formatos
  FOR v_tipo_id, v_formato IN 
    SELECT id_tipo_cod_barras, formato_valido
    FROM public.tipos_cod_barras
    WHERE activo = true
    AND formato_valido IS NOT NULL
    ORDER BY id_tipo_cod_barras
  LOOP
    IF p_codigo_barras ~ v_formato THEN
      RETURN v_tipo_id;
    END IF;
  END LOOP;

  -- Si no se detectó ningún tipo, retornar NULL
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.detectar_tipo_codigo_barras IS 'Detecta automáticamente el tipo de código de barras basándose en su formato';

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================
DO $$
DECLARE
  v_count_tipos integer;
  v_count_columnas integer;
BEGIN
  -- Verificar tipos de códigos de barras
  SELECT COUNT(*) INTO v_count_tipos FROM public.tipos_cod_barras;
  RAISE NOTICE '✅ Tipos de códigos de barras registrados: %', v_count_tipos;

  -- Verificar columnas en inventario
  SELECT COUNT(*) INTO v_count_columnas
  FROM information_schema.columns
  WHERE table_name = 'inventario'
  AND column_name IN ('cod_barras', 'tipo_cod_barras');
  RAISE NOTICE '✅ Columnas agregadas a inventario: %/2', v_count_columnas;

  IF v_count_tipos >= 10 AND v_count_columnas = 2 THEN
    RAISE NOTICE '🎉 Sistema de códigos de barras instalado correctamente';
  ELSE
    RAISE WARNING '⚠️ Verificar la instalación del sistema de códigos de barras';
  END IF;
END $$;

-- =====================================================
-- EJEMPLOS DE USO
-- =====================================================

-- Ejemplo 1: Insertar un artículo con código de barras EAN-13
-- UPDATE public.inventario
-- SET cod_barras = '1234567890123', tipo_cod_barras = 1
-- WHERE id_articulo = 1;

-- Ejemplo 2: Validar un código de barras
-- SELECT public.validar_codigo_barras('1234567890123', 1);

-- Ejemplo 3: Detectar automáticamente el tipo de código
-- SELECT public.detectar_tipo_codigo_barras('1234567890123');

-- Ejemplo 4: Buscar artículos por código de barras
-- SELECT * FROM public.inventario WHERE cod_barras = '1234567890123';

-- Ejemplo 5: Listar todos los tipos de códigos de barras disponibles
-- SELECT * FROM public.tipos_cod_barras WHERE activo = true ORDER BY descripcion_tipo_cod_barras;
