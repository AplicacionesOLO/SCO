-- ============================================
-- FUNCIÓN RPC PARA BÚSQUEDA VECTORIAL EN COSTBOT
-- ============================================
-- Esta función permite buscar chunks relevantes usando
-- similitud de coseno con embeddings vectoriales
-- ============================================

CREATE OR REPLACE FUNCTION match_costbot_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10,
  filter_role_scopes text[] DEFAULT ARRAY['public'],
  filter_page_scope text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  source_id text,
  source_type text,
  page_number int,
  chunk_index int,
  content text,
  role_scope text,
  page_scope text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    costbot_chunks.id,
    costbot_chunks.source_id,
    costbot_chunks.source_type,
    costbot_chunks.page_number,
    costbot_chunks.chunk_index,
    costbot_chunks.content,
    costbot_chunks.role_scope,
    costbot_chunks.page_scope,
    costbot_chunks.metadata,
    1 - (costbot_chunks.embedding <=> query_embedding) as similarity
  FROM costbot_chunks
  WHERE 
    costbot_chunks.role_scope = ANY(filter_role_scopes)
    AND (filter_page_scope IS NULL OR costbot_chunks.page_scope = filter_page_scope)
    AND 1 - (costbot_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY costbot_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Comentario de documentación
COMMENT ON FUNCTION match_costbot_chunks IS 'Busca chunks de CostBot usando similitud vectorial con filtros por rol y contexto de página';

-- ============================================
-- PRUEBA DE LA FUNCIÓN
-- ============================================
-- Para probar la función (después de tener chunks insertados):

/*
SELECT * FROM match_costbot_chunks(
  query_embedding := (SELECT embedding FROM costbot_chunks LIMIT 1), -- Usar un embedding de ejemplo
  match_threshold := 0.5,
  match_count := 5,
  filter_role_scopes := ARRAY['public', 'admin'],
  filter_page_scope := 'optimizador_cortes'
);
*/

-- ============================================
-- FUNCIÓN AUXILIAR: Obtener estadísticas de chunks
-- ============================================

CREATE OR REPLACE FUNCTION get_costbot_chunks_stats()
RETURNS TABLE (
  total_chunks bigint,
  sources_count bigint,
  role_scopes jsonb,
  page_scopes jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint as total_chunks,
    COUNT(DISTINCT source_id)::bigint as sources_count,
    jsonb_object_agg(role_scope, role_count) as role_scopes,
    jsonb_object_agg(page_scope, page_count) as page_scopes
  FROM (
    SELECT 
      role_scope,
      COUNT(*) as role_count
    FROM costbot_chunks
    GROUP BY role_scope
  ) role_stats,
  (
    SELECT 
      page_scope,
      COUNT(*) as page_count
    FROM costbot_chunks
    GROUP BY page_scope
  ) page_stats;
END;
$$;

COMMENT ON FUNCTION get_costbot_chunks_stats IS 'Obtiene estadísticas sobre los chunks almacenados en CostBot';

-- ============================================
-- FUNCIÓN AUXILIAR: Limpiar chunks de un documento
-- ============================================

CREATE OR REPLACE FUNCTION delete_costbot_document(
  document_source_id text
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count int;
BEGIN
  -- Verificar que el usuario sea administrador
  IF NOT EXISTS (
    SELECT 1 FROM usuarios u
    JOIN roles r ON u.rol_id = r.id
    WHERE u.id = auth.uid()
    AND r.nombre IN ('Administrador', 'Super Admin')
  ) THEN
    RAISE EXCEPTION 'Solo administradores pueden eliminar documentos';
  END IF;

  -- Eliminar chunks del documento
  DELETE FROM costbot_chunks
  WHERE source_id = document_source_id;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION delete_costbot_document IS 'Elimina todos los chunks de un documento específico (solo admins)';

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Verificar que las funciones se crearon correctamente
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_name LIKE 'match_costbot%' OR routine_name LIKE '%costbot%'
ORDER BY routine_name;
