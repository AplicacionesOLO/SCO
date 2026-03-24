-- ============================================
-- CONFIGURACIÓN DE COSTBOT RAG
-- ============================================
-- Este script crea la infraestructura necesaria para
-- el sistema RAG (Retrieval-Augmented Generation) de CostBot
-- 
-- INSTRUCCIONES:
-- 1. Ejecuta este script en el SQL Editor de Supabase
-- 2. Verifica que la extensión pgvector esté habilitada
-- 3. Confirma que los índices se crearon correctamente
-- ============================================

-- Paso 1: Habilitar extensión pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Paso 2: Crear tabla para chunks de conocimiento
CREATE TABLE IF NOT EXISTS costbot_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Información del documento fuente
  source_id TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'pdf',
  page_number INTEGER,
  chunk_index INTEGER NOT NULL,
  
  -- Contenido del chunk
  content TEXT NOT NULL,
  
  -- Alcance por rol y página
  role_scope TEXT NOT NULL DEFAULT 'public',
  page_scope TEXT NOT NULL DEFAULT 'general',
  
  -- Metadatos adicionales
  metadata JSONB DEFAULT '{}',
  
  -- Vector embedding (1536 dimensiones para text-embedding-3-small de OpenAI)
  embedding vector(1536),
  
  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Paso 3: Crear índices para búsquedas eficientes

-- Índice vectorial para búsquedas de similitud (ivfflat)
CREATE INDEX IF NOT EXISTS costbot_chunks_embedding_idx 
ON costbot_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Índices para filtrado por rol y página
CREATE INDEX IF NOT EXISTS costbot_chunks_role_scope_idx ON costbot_chunks(role_scope);
CREATE INDEX IF NOT EXISTS costbot_chunks_page_scope_idx ON costbot_chunks(page_scope);
CREATE INDEX IF NOT EXISTS costbot_chunks_source_id_idx ON costbot_chunks(source_id);

-- Índice compuesto para búsquedas filtradas
CREATE INDEX IF NOT EXISTS costbot_chunks_scope_idx ON costbot_chunks(role_scope, page_scope);

-- Paso 4: Configurar Row Level Security (RLS)
ALTER TABLE costbot_chunks ENABLE ROW LEVEL SECURITY;

-- Política: Todos los usuarios autenticados pueden leer chunks
-- (el filtrado por rol se hace en la aplicación)
CREATE POLICY "Todos pueden leer chunks según su rol"
ON costbot_chunks FOR SELECT
TO authenticated
USING (true);

-- Política: Solo administradores pueden insertar chunks
CREATE POLICY "Solo admins pueden insertar chunks"
ON costbot_chunks FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios u
    JOIN roles r ON u.rol_id = r.id
    WHERE u.id = auth.uid()
    AND r.nombre IN ('Administrador', 'Super Admin')
  )
);

-- Política: Solo administradores pueden actualizar chunks
CREATE POLICY "Solo admins pueden actualizar chunks"
ON costbot_chunks FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios u
    JOIN roles r ON u.rol_id = r.id
    WHERE u.id = auth.uid()
    AND r.nombre IN ('Administrador', 'Super Admin')
  )
);

-- Política: Solo administradores pueden eliminar chunks
CREATE POLICY "Solo admins pueden eliminar chunks"
ON costbot_chunks FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios u
    JOIN roles r ON u.rol_id = r.id
    WHERE u.id = auth.uid()
    AND r.nombre IN ('Administrador', 'Super Admin')
  )
);

-- Paso 5: Agregar comentarios para documentación
COMMENT ON TABLE costbot_chunks IS 'Almacena chunks de documentos con embeddings para RAG en CostBot';
COMMENT ON COLUMN costbot_chunks.source_id IS 'ID lógico del documento (nombre del PDF, ID interno, etc.)';
COMMENT ON COLUMN costbot_chunks.source_type IS 'Tipo de fuente: pdf, manual_interno, api_doc, etc.';
COMMENT ON COLUMN costbot_chunks.page_number IS 'Número de página original del documento';
COMMENT ON COLUMN costbot_chunks.chunk_index IS 'Índice del chunk dentro del documento';
COMMENT ON COLUMN costbot_chunks.content IS 'Texto del chunk';
COMMENT ON COLUMN costbot_chunks.role_scope IS 'Alcance por rol: public, admin, supervisor, operador, etc.';
COMMENT ON COLUMN costbot_chunks.page_scope IS 'Alcance por página: general, dashboard, bom, optimizador_cortes, etc.';
COMMENT ON COLUMN costbot_chunks.metadata IS 'Metadatos adicionales (filename, section, timestamp, etc.)';
COMMENT ON COLUMN costbot_chunks.embedding IS 'Vector embedding del chunk (1536 dimensiones para text-embedding-3-small de OpenAI)';

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Ejecuta estas consultas para verificar que todo se creó correctamente:

-- Verificar que la tabla existe
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_name = 'costbot_chunks';

-- Verificar índices
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'costbot_chunks';

-- Verificar políticas RLS
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'costbot_chunks';

-- ============================================
-- DATOS DE EJEMPLO (OPCIONAL)
-- ============================================
-- Puedes insertar algunos chunks de ejemplo para probar:

/*
INSERT INTO costbot_chunks (
  source_id,
  source_type,
  page_number,
  chunk_index,
  content,
  role_scope,
  page_scope,
  metadata
) VALUES 
(
  'manual_optimizador_v1',
  'pdf',
  1,
  1,
  'El Optimizador de Cortes 2D permite calcular el aprovechamiento óptimo de láminas de material. Para agregar piezas manualmente, haz clic en el botón "Agregar Pieza" y completa los campos de largo, ancho y cantidad.',
  'public',
  'optimizador_cortes',
  '{"filename": "Manual_Optimizador.pdf", "section": "Introducción"}'
),
(
  'manual_inventario_v1',
  'pdf',
  3,
  1,
  'El módulo de Inventario permite gestionar el stock de materiales. Puedes configurar alertas de inventario bajo y umbrales de reposición automática.',
  'public',
  'inventario',
  '{"filename": "Manual_Inventario.pdf", "section": "Gestión de Stock"}'
);
*/
