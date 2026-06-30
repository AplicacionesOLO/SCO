-- =====================================================
-- TABLAS PARA EL SISTEMA DE CLUSTERS Y MONITOR
-- =====================================================
-- Ejecutar en Supabase SQL Editor cuando esté conectado
-- 
-- NOTAS IMPORTANTES:
-- - tareas.id es BIGINT (no UUID)
-- - permisos.nombre es la columna de código de permiso (no permisos.codigo)
-- - El cliente se almacena en tareas.datos_formulario->>'cliente' (texto: 'EPA' | 'COFERSA')

-- =====================================================
-- 1. TABLA DE CLUSTERS
-- =====================================================
CREATE TABLE IF NOT EXISTS clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  cliente TEXT NOT NULL,
  descripcion TEXT,
  tienda_id UUID REFERENCES tiendas(id),
  activo BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE clusters IS 'Agrupaciones de tareas por cliente para el monitor de visualizadores';
COMMENT ON COLUMN clusters.cliente IS 'Valor que debe coincidir con tareas.datos_formulario->>''cliente''';

-- =====================================================
-- 2. TABLA DE USUARIOS DEL CLUSTER
-- =====================================================
CREATE TABLE IF NOT EXISTS cluster_usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cluster_id, usuario_id)
);

COMMENT ON TABLE cluster_usuarios IS 'Relación muchos-a-muchos entre clusters y usuarios visualizadores';

-- =====================================================
-- 3. TABLA DE COMENTARIOS EN TAREAS
-- =====================================================
-- ⚠️ tareas.id es BIGINT (no UUID)
CREATE TABLE IF NOT EXISTS tarea_comentarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea_id BIGINT NOT NULL REFERENCES tareas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id),
  comentario TEXT NOT NULL CHECK (char_length(comentario) <= 500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE tarea_comentarios IS 'Comentarios de visualizadores sobre tareas del cluster (máx 500 chars)';

-- =====================================================
-- ÍNDICES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_clusters_tienda ON clusters(tienda_id);
CREATE INDEX IF NOT EXISTS idx_clusters_cliente ON clusters(cliente);
CREATE INDEX IF NOT EXISTS idx_tareas_cliente_monitor ON tareas ((datos_formulario->>'cliente'));
CREATE INDEX IF NOT EXISTS idx_cluster_usuarios_cluster ON cluster_usuarios(cluster_id);
CREATE INDEX IF NOT EXISTS idx_cluster_usuarios_usuario ON cluster_usuarios(usuario_id);
CREATE INDEX IF NOT EXISTS idx_tarea_comentarios_tarea ON tarea_comentarios(tarea_id);
CREATE INDEX IF NOT EXISTS idx_tarea_comentarios_usuario ON tarea_comentarios(usuario_id);
CREATE INDEX IF NOT EXISTS idx_tarea_comentarios_created ON tarea_comentarios(created_at DESC);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- ─── CLUSTERS ────────────────────────────────────────
ALTER TABLE clusters ENABLE ROW LEVEL SECURITY;

-- Admin: control total sobre clusters
CREATE POLICY "Admin gestiona clusters" ON clusters
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'Admin'
    )
  );

-- Visualizador: solo ve los clusters donde está incluido
CREATE POLICY "Visualizador ve sus clusters" ON clusters
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cluster_usuarios cu
      WHERE cu.cluster_id = clusters.id AND cu.usuario_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'Admin'
    )
  );

-- ─── CLUSTER USUARIOS ────────────────────────────────
ALTER TABLE cluster_usuarios ENABLE ROW LEVEL SECURITY;

-- Admin: gestiona miembros de cualquier cluster
CREATE POLICY "Admin gestiona miembros de cluster" ON cluster_usuarios
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'Admin'
    )
  );

-- Cualquier usuario autenticado puede ver los miembros de su cluster
CREATE POLICY "Usuarios ven miembros de su cluster" ON cluster_usuarios
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cluster_usuarios cu2
      WHERE cu2.cluster_id = cluster_usuarios.cluster_id 
      AND cu2.usuario_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid() AND u.rol = 'Admin'
    )
  );

-- ─── COMENTARIOS ─────────────────────────────────────
ALTER TABLE tarea_comentarios ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas anteriores para reemplazarlas
DROP POLICY IF EXISTS "Ver comentarios de tareas accesibles" ON tarea_comentarios;
DROP POLICY IF EXISTS "Crear comentarios en tareas accesibles" ON tarea_comentarios;

-- Ver comentarios: solo si tenés acceso al cluster de esa tarea (o sos admin, o Visualizador por rol)
CREATE POLICY "Ver comentarios de tareas accesibles" ON tarea_comentarios
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tareas t
      WHERE t.id = tarea_comentarios.tarea_id
      AND (
        -- El solicitante de la tarea puede ver comentarios
        t.solicitante_id = auth.uid()
        OR
        -- Miembro del cluster que cubre el cliente de la tarea
        EXISTS (
          SELECT 1 FROM cluster_usuarios cu
          JOIN clusters c ON c.id = cu.cluster_id
          WHERE cu.usuario_id = auth.uid()
          AND c.cliente = (t.datos_formulario->>'cliente')
          AND c.activo = true
        )
        OR
        -- Admin ve todo
        EXISTS (
          SELECT 1 FROM usuarios u
          WHERE u.id = auth.uid() AND u.rol = 'Admin'
        )
        OR
        -- 🆕 Visualizador: acceso por nombre de rol (sin depender de cluster_usuarios)
        -- Ej: "Visualizador Cofersa" → ve tareas con cliente = 'COFERSA'
        EXISTS (
          SELECT 1 FROM usuarios u
          WHERE u.id = auth.uid() 
          AND u.rol LIKE 'Visualizador %'
          AND UPPER(TRIM(REPLACE(u.rol, 'Visualizador ', ''))) = UPPER(TRIM(COALESCE(t.datos_formulario->>'cliente', '')))
        )
      )
    )
  );

-- Crear comentarios: solo si sos miembro del cluster que cubre esa tarea (o Visualizador por rol)
CREATE POLICY "Crear comentarios en tareas accesibles" ON tarea_comentarios
  FOR INSERT WITH CHECK (
    auth.uid() = usuario_id
    AND
    EXISTS (
      SELECT 1 FROM tareas t
      WHERE t.id = tarea_comentarios.tarea_id
      AND (
        t.solicitante_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM cluster_usuarios cu
          JOIN clusters c ON c.id = cu.cluster_id
          WHERE cu.usuario_id = auth.uid()
          AND c.cliente = (t.datos_formulario->>'cliente')
          AND c.activo = true
        )
        OR
        EXISTS (
          SELECT 1 FROM usuarios u
          WHERE u.id = auth.uid() AND u.rol = 'Admin'
        )
        OR
        -- 🆕 Visualizador por nombre de rol
        EXISTS (
          SELECT 1 FROM usuarios u
          WHERE u.id = auth.uid() 
          AND u.rol LIKE 'Visualizador %'
          AND UPPER(TRIM(REPLACE(u.rol, 'Visualizador ', ''))) = UPPER(TRIM(COALESCE(t.datos_formulario->>'cliente', '')))
        )
      )
    )
  );

-- =====================================================
-- TRIGGER: actualizar updated_at en clusters
-- =====================================================
CREATE OR REPLACE FUNCTION update_cluster_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cluster_updated_at ON clusters;
CREATE TRIGGER trigger_cluster_updated_at
  BEFORE UPDATE ON clusters
  FOR EACH ROW
  EXECUTE FUNCTION update_cluster_updated_at();

-- =====================================================
-- PERMISOS: Insertar permisos del monitor
-- ⚠️ La columna se llama 'nombre' (no 'codigo')
-- =====================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'permisos'
  ) THEN
    INSERT INTO permisos (nombre, descripcion, modulo)
    VALUES
      ('monitor:view', 'Ver monitor de tareas por cluster', 'monitor'),
      ('monitor:comment', 'Agregar comentarios en el monitor', 'monitor')
    ON CONFLICT (nombre) DO NOTHING;
  END IF;
END $$;

-- =====================================================
-- ROL: Crear rol Visualizador si no existe
-- =====================================================
DO $$
DECLARE
  v_visualizador_id INTEGER;
  v_permiso_view_id INTEGER;
  v_permiso_comment_id INTEGER;
BEGIN
  -- Crear rol Visualizador si no existe
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'roles'
  ) THEN
    INSERT INTO roles (nombre, descripcion)
    VALUES ('Visualizador', 'Rol con acceso solo al monitor de tareas por cluster')
    ON CONFLICT (nombre) DO NOTHING
    RETURNING id INTO v_visualizador_id;

    -- Si no se insertó (ya existía), obtener el ID
    IF v_visualizador_id IS NULL THEN
      SELECT id INTO v_visualizador_id FROM roles WHERE nombre = 'Visualizador';
    END IF;

    -- Obtener IDs de los permisos del monitor
    SELECT id INTO v_permiso_view_id FROM permisos WHERE nombre = 'monitor:view';
    SELECT id INTO v_permiso_comment_id FROM permisos WHERE nombre = 'monitor:comment';

    -- Asignar permisos al rol Visualizador
    IF v_visualizador_id IS NOT NULL AND v_permiso_view_id IS NOT NULL THEN
      INSERT INTO rol_permisos (rol_id, permiso_id)
      VALUES (v_visualizador_id, v_permiso_view_id)
      ON CONFLICT DO NOTHING;
    END IF;

    IF v_visualizador_id IS NOT NULL AND v_permiso_comment_id IS NOT NULL THEN
      INSERT INTO rol_permisos (rol_id, permiso_id)
      VALUES (v_visualizador_id, v_permiso_comment_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END $$;