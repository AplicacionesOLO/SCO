-- ============================================
-- MÓDULO DE SEGUIMIENTO DE PEDIDOS
-- ============================================
-- Este script crea todas las tablas necesarias para el módulo de seguimiento
-- Ejecutar en Supabase Dashboard → SQL Editor

-- 1. Tabla de estados de seguimiento (configurables)
CREATE TABLE IF NOT EXISTS seguimiento_estados (
  id SERIAL PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nombre_publico TEXT NOT NULL,
  orden INTEGER NOT NULL,
  rol_sugerido_id INTEGER REFERENCES roles(id),
  es_final BOOLEAN DEFAULT false,
  visible_cliente BOOLEAN DEFAULT true,
  color TEXT DEFAULT '#3B82F6',
  icono TEXT DEFAULT 'ri-checkbox-circle-line',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla principal de seguimiento de pedidos
CREATE TABLE IF NOT EXISTS pedido_seguimiento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  tienda_id UUID NOT NULL REFERENCES tiendas(id),
  estado_actual TEXT NOT NULL,
  responsable_id UUID REFERENCES usuarios(id),
  comentario_ultimo TEXT,
  progreso_porcentaje INTEGER DEFAULT 0,
  fecha_inicio TIMESTAMPTZ DEFAULT NOW(),
  fecha_estimada_finalizacion TIMESTAMPTZ,
  fecha_finalizacion TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pedido_id)
);

-- 3. Tabla de historial de cambios de estado
CREATE TABLE IF NOT EXISTS pedido_seguimiento_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seguimiento_id UUID NOT NULL REFERENCES pedido_seguimiento(id) ON DELETE CASCADE,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  estado_anterior TEXT,
  estado_nuevo TEXT NOT NULL,
  responsable_id UUID NOT NULL REFERENCES usuarios(id),
  comentario TEXT,
  duracion_minutos INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de transiciones permitidas (opcional pero recomendada)
CREATE TABLE IF NOT EXISTS seguimiento_transiciones (
  id SERIAL PRIMARY KEY,
  estado_origen TEXT NOT NULL,
  estado_destino TEXT NOT NULL,
  requiere_comentario BOOLEAN DEFAULT false,
  requiere_aprobacion BOOLEAN DEFAULT false,
  rol_requerido_id INTEGER REFERENCES roles(id),
  orden INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(estado_origen, estado_destino)
);

-- Insertar estados iniciales
INSERT INTO seguimiento_estados (codigo, nombre_publico, orden, es_final, visible_cliente, color, icono) VALUES
('iniciando_produccion', 'Iniciando Producción', 1, false, true, '#3B82F6', 'ri-play-circle-line'),
('alistando_suministros', 'Alistando Suministros', 2, false, true, '#8B5CF6', 'ri-inbox-line'),
('preparando_orden', 'Preparando Orden', 3, false, true, '#EC4899', 'ri-file-list-3-line'),
('produciendo_orden', 'Produciendo Orden', 4, false, true, '#F59E0B', 'ri-tools-line'),
('orden_preparada', 'Orden Preparada', 5, false, true, '#10B981', 'ri-checkbox-circle-line'),
('orden_finalizada', 'Orden Finalizada', 6, false, true, '#06B6D4', 'ri-check-double-line'),
('orden_lista_para_entregar', 'Lista para Entregar', 7, false, true, '#14B8A6', 'ri-truck-line'),
('orden_entregada', 'Orden Entregada', 8, true, true, '#22C55E', 'ri-check-line')
ON CONFLICT (codigo) DO NOTHING;

-- Insertar transiciones permitidas (flujo lineal básico)
INSERT INTO seguimiento_transiciones (estado_origen, estado_destino, requiere_comentario, orden) VALUES
('iniciando_produccion', 'alistando_suministros', false, 1),
('alistando_suministros', 'preparando_orden', false, 2),
('preparando_orden', 'produciendo_orden', false, 3),
('produciendo_orden', 'orden_preparada', false, 4),
('orden_preparada', 'orden_finalizada', false, 5),
('orden_finalizada', 'orden_lista_para_entregar', false, 6),
('orden_lista_para_entregar', 'orden_entregada', true, 7)
ON CONFLICT (estado_origen, estado_destino) DO NOTHING;

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_pedido_seguimiento_pedido_id ON pedido_seguimiento(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedido_seguimiento_tienda_id ON pedido_seguimiento(tienda_id);
CREATE INDEX IF NOT EXISTS idx_pedido_seguimiento_estado ON pedido_seguimiento(estado_actual);
CREATE INDEX IF NOT EXISTS idx_pedido_seguimiento_responsable ON pedido_seguimiento(responsable_id);
CREATE INDEX IF NOT EXISTS idx_seguimiento_historial_seguimiento_id ON pedido_seguimiento_historial(seguimiento_id);
CREATE INDEX IF NOT EXISTS idx_seguimiento_historial_pedido_id ON pedido_seguimiento_historial(pedido_id);
CREATE INDEX IF NOT EXISTS idx_seguimiento_historial_created_at ON pedido_seguimiento_historial(created_at DESC);

-- Habilitar RLS
ALTER TABLE seguimiento_estados ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_seguimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_seguimiento_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguimiento_transiciones ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para seguimiento_estados (lectura pública para autenticados)
CREATE POLICY "Permitir lectura estados a autenticados"
ON seguimiento_estados FOR SELECT
TO authenticated
USING (true);

-- Políticas RLS para pedido_seguimiento (multi-tienda)
CREATE POLICY "Usuarios ven seguimiento de su tienda"
ON pedido_seguimiento FOR SELECT
TO authenticated
USING (
  tienda_id IN (
    SELECT tienda_id FROM usuario_tiendas 
    WHERE usuario_id = auth.uid()
  )
);

CREATE POLICY "Usuarios crean seguimiento en su tienda"
ON pedido_seguimiento FOR INSERT
TO authenticated
WITH CHECK (
  tienda_id IN (
    SELECT tienda_id FROM usuario_tiendas 
    WHERE usuario_id = auth.uid()
  )
);

CREATE POLICY "Usuarios actualizan seguimiento de su tienda"
ON pedido_seguimiento FOR UPDATE
TO authenticated
USING (
  tienda_id IN (
    SELECT tienda_id FROM usuario_tiendas 
    WHERE usuario_id = auth.uid()
  )
);

-- Políticas RLS para pedido_seguimiento_historial
CREATE POLICY "Usuarios ven historial de su tienda"
ON pedido_seguimiento_historial FOR SELECT
TO authenticated
USING (
  pedido_id IN (
    SELECT id FROM pedidos 
    WHERE tienda_id IN (
      SELECT tienda_id FROM usuario_tiendas 
      WHERE usuario_id = auth.uid()
    )
  )
);

CREATE POLICY "Usuarios crean historial en su tienda"
ON pedido_seguimiento_historial FOR INSERT
TO authenticated
WITH CHECK (
  pedido_id IN (
    SELECT id FROM pedidos 
    WHERE tienda_id IN (
      SELECT tienda_id FROM usuario_tiendas 
      WHERE usuario_id = auth.uid()
    )
  )
);

-- Políticas RLS para seguimiento_transiciones
CREATE POLICY "Permitir lectura transiciones a autenticados"
ON seguimiento_transiciones FOR SELECT
TO authenticated
USING (true);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_seguimiento_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE TRIGGER trigger_update_seguimiento_updated_at
BEFORE UPDATE ON pedido_seguimiento
FOR EACH ROW
EXECUTE FUNCTION update_seguimiento_updated_at();

-- Función para crear seguimiento automáticamente cuando un pedido es aprobado/facturado
CREATE OR REPLACE FUNCTION crear_seguimiento_automatico()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo crear seguimiento si el estado cambió a 'confirmado' o 'facturado'
  IF (NEW.estado IN ('confirmado', 'facturado') AND 
      (OLD.estado IS NULL OR OLD.estado NOT IN ('confirmado', 'facturado'))) THEN
    
    -- Verificar si ya existe un seguimiento
    IF NOT EXISTS (SELECT 1 FROM pedido_seguimiento WHERE pedido_id = NEW.id) THEN
      -- Crear registro de seguimiento
      INSERT INTO pedido_seguimiento (
        pedido_id,
        tienda_id,
        estado_actual,
        responsable_id,
        progreso_porcentaje,
        comentario_ultimo
      ) VALUES (
        NEW.id,
        NEW.tienda_id,
        'iniciando_produccion',
        NEW.usuario_id,
        0,
        'Seguimiento iniciado automáticamente'
      );
      
      -- Crear primera entrada en el historial
      INSERT INTO pedido_seguimiento_historial (
        seguimiento_id,
        pedido_id,
        estado_anterior,
        estado_nuevo,
        responsable_id,
        comentario
      ) VALUES (
        (SELECT id FROM pedido_seguimiento WHERE pedido_id = NEW.id),
        NEW.id,
        NULL,
        'iniciando_produccion',
        NEW.usuario_id,
        'Seguimiento iniciado automáticamente al confirmar/facturar pedido'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para crear seguimiento automáticamente
CREATE TRIGGER trigger_crear_seguimiento_automatico
AFTER INSERT OR UPDATE OF estado ON pedidos
FOR EACH ROW
EXECUTE FUNCTION crear_seguimiento_automatico();

-- Habilitar Realtime para las tablas
ALTER PUBLICATION supabase_realtime ADD TABLE pedido_seguimiento;
ALTER PUBLICATION supabase_realtime ADD TABLE pedido_seguimiento_historial;

-- Insertar permisos para el módulo de seguimiento
INSERT INTO permisos (nombre, descripcion, modulo) VALUES
('seguimiento:view', 'Ver seguimiento de pedidos', 'seguimiento'),
('seguimiento:view:own', 'Ver seguimiento de pedidos propios', 'seguimiento'),
('seguimiento:update', 'Actualizar estado de seguimiento', 'seguimiento'),
('seguimiento:assign', 'Asignar responsables a seguimiento', 'seguimiento'),
('seguimiento:manage', 'Gestión completa de seguimiento', 'seguimiento')
ON CONFLICT (nombre) DO NOTHING;

-- Verificar que todo se creó correctamente
SELECT 'Tablas creadas:' as resultado;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%seguimiento%'
ORDER BY table_name;

SELECT 'Estados insertados:' as resultado;
SELECT COUNT(*) as total_estados FROM seguimiento_estados;

SELECT 'Transiciones insertadas:' as resultado;
SELECT COUNT(*) as total_transiciones FROM seguimiento_transiciones;

SELECT 'Permisos insertados:' as resultado;
SELECT nombre FROM permisos WHERE modulo = 'seguimiento';
