-- =====================================================
-- MÓDULO DE TAREAS - MIGRACIÓN COMPLETA
-- Sistema de gestión de tareas con formulario dinámico
-- =====================================================

-- =====================================================
-- 1. TABLAS PRINCIPALES
-- =====================================================

-- Tabla principal de tareas
CREATE TABLE IF NOT EXISTS public.tareas (
    id BIGSERIAL PRIMARY KEY,
    tienda_id UUID NOT NULL REFERENCES public.tiendas(id) ON DELETE CASCADE,
    consecutivo VARCHAR(20) NOT NULL, -- VA0001, VA0002, etc.
    solicitante_id UUID NOT NULL REFERENCES auth.users(id),
    email_solicitante VARCHAR(255) NOT NULL,
    datos_formulario JSONB NOT NULL DEFAULT '{}', -- Datos crudos del formulario
    descripcion_breve TEXT, -- Descripción corta para listados
    
    -- Campos de análisis
    cantidad_unidades INTEGER,
    cantidad_personas INTEGER,
    fecha_inicio TIMESTAMPTZ,
    fecha_cierre TIMESTAMPTZ,
    fecha_estimada_entrega TIMESTAMPTZ,
    entregado_a VARCHAR(255),
    
    -- Estado y costos
    estado VARCHAR(50) NOT NULL DEFAULT 'En Cola' CHECK (estado IN (
        'En Cola', 
        'En Proceso', 
        'Produciendo', 
        'Esperando suministros', 
        'Terminado', 
        'Finalizado'
    )),
    total_costo DECIMAL(15,2) DEFAULT 0,
    
    -- Integración con cotizaciones
    cotizacion_id BIGINT REFERENCES public.cotizaciones(id),
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    UNIQUE(tienda_id, consecutivo)
);

-- Tabla de items/consumos de inventario
CREATE TABLE IF NOT EXISTS public.tareas_items (
    id BIGSERIAL PRIMARY KEY,
    tarea_id BIGINT NOT NULL REFERENCES public.tareas(id) ON DELETE CASCADE,
    producto_id BIGINT REFERENCES public.productos(id),
    inventario_id BIGINT REFERENCES public.inventario(id),
    descripcion TEXT NOT NULL,
    cantidad DECIMAL(15,3) NOT NULL,
    costo_unitario DECIMAL(15,2) NOT NULL,
    costo_total DECIMAL(15,2) GENERATED ALWAYS AS (cantidad * costo_unitario) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de configuración de campos del formulario
CREATE TABLE IF NOT EXISTS public.tareas_config_campos (
    id BIGSERIAL PRIMARY KEY,
    tienda_id UUID NOT NULL REFERENCES public.tiendas(id) ON DELETE CASCADE,
    nombre_campo VARCHAR(100) NOT NULL,
    etiqueta VARCHAR(255) NOT NULL,
    tipo_campo VARCHAR(50) NOT NULL CHECK (tipo_campo IN (
        'text', 'textarea', 'number', 'date', 'datetime', 
        'select', 'checkbox', 'radio', 'email', 'tel'
    )),
    opciones JSONB, -- Para select, radio, checkbox
    requerido BOOLEAN DEFAULT false,
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tienda_id, nombre_campo)
);

-- Tabla de encargados/líderes por tienda
CREATE TABLE IF NOT EXISTS public.tareas_encargados (
    id BIGSERIAL PRIMARY KEY,
    tienda_id UUID NOT NULL REFERENCES public.tiendas(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(tienda_id, usuario_id)
);

-- Tabla de colaboradores disponibles
CREATE TABLE IF NOT EXISTS public.tareas_colaboradores (
    id BIGSERIAL PRIMARY KEY,
    tienda_id UUID NOT NULL REFERENCES public.tiendas(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    telefono VARCHAR(50),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de personal asignado a tareas
CREATE TABLE IF NOT EXISTS public.tareas_personal_asignado (
    id BIGSERIAL PRIMARY KEY,
    tarea_id BIGINT NOT NULL REFERENCES public.tareas(id) ON DELETE CASCADE,
    colaborador_id BIGINT NOT NULL REFERENCES public.tareas_colaboradores(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tarea_id, colaborador_id)
);

-- Tabla de consecutivos por tienda
CREATE TABLE IF NOT EXISTS public.tareas_consecutivos (
    tienda_id UUID PRIMARY KEY REFERENCES public.tiendas(id) ON DELETE CASCADE,
    ultimo_numero INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_tareas_tienda_id ON public.tareas(tienda_id);
CREATE INDEX IF NOT EXISTS idx_tareas_solicitante_id ON public.tareas(solicitante_id);
CREATE INDEX IF NOT EXISTS idx_tareas_estado ON public.tareas(estado);
CREATE INDEX IF NOT EXISTS idx_tareas_consecutivo ON public.tareas(consecutivo);
CREATE INDEX IF NOT EXISTS idx_tareas_created_at ON public.tareas(created_at);

CREATE INDEX IF NOT EXISTS idx_tareas_items_tarea_id ON public.tareas_items(tarea_id);
CREATE INDEX IF NOT EXISTS idx_tareas_items_producto_id ON public.tareas_items(producto_id);
CREATE INDEX IF NOT EXISTS idx_tareas_items_inventario_id ON public.tareas_items(inventario_id);

CREATE INDEX IF NOT EXISTS idx_tareas_config_tienda_id ON public.tareas_config_campos(tienda_id);
CREATE INDEX IF NOT EXISTS idx_tareas_encargados_tienda_id ON public.tareas_encargados(tienda_id);
CREATE INDEX IF NOT EXISTS idx_tareas_encargados_usuario_id ON public.tareas_encargados(usuario_id);
CREATE INDEX IF NOT EXISTS idx_tareas_colaboradores_tienda_id ON public.tareas_colaboradores(tienda_id);
CREATE INDEX IF NOT EXISTS idx_tareas_personal_tarea_id ON public.tareas_personal_asignado(tarea_id);

-- =====================================================
-- 3. FUNCIÓN PARA GENERAR CONSECUTIVO AUTOMÁTICO
-- =====================================================

CREATE OR REPLACE FUNCTION public.generar_consecutivo_tarea(p_tienda_id UUID)
RETURNS VARCHAR(20)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_numero INTEGER;
    v_consecutivo VARCHAR(20);
BEGIN
    -- Obtener y actualizar el consecutivo de forma atómica
    INSERT INTO public.tareas_consecutivos (tienda_id, ultimo_numero, updated_at)
    VALUES (p_tienda_id, 1, NOW())
    ON CONFLICT (tienda_id) 
    DO UPDATE SET 
        ultimo_numero = public.tareas_consecutivos.ultimo_numero + 1,
        updated_at = NOW()
    RETURNING ultimo_numero INTO v_numero;
    
    -- Formatear como VA0001, VA0002, etc.
    v_consecutivo := 'VA' || LPAD(v_numero::TEXT, 4, '0');
    
    RETURN v_consecutivo;
END;
$$;

-- =====================================================
-- 4. TRIGGERS
-- =====================================================

-- Trigger para generar consecutivo automático
CREATE OR REPLACE FUNCTION public.before_insert_tarea_consecutivo()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Solo generar si no viene consecutivo
    IF NEW.consecutivo IS NULL OR NEW.consecutivo = '' THEN
        NEW.consecutivo := public.generar_consecutivo_tarea(NEW.tienda_id);
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_before_insert_tarea_consecutivo ON public.tareas;
CREATE TRIGGER trigger_before_insert_tarea_consecutivo
    BEFORE INSERT ON public.tareas
    FOR EACH ROW
    EXECUTE FUNCTION public.before_insert_tarea_consecutivo();

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_tareas_updated_at ON public.tareas;
CREATE TRIGGER trigger_tareas_updated_at
    BEFORE UPDATE ON public.tareas
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_tareas_config_updated_at ON public.tareas_config_campos;
CREATE TRIGGER trigger_tareas_config_updated_at
    BEFORE UPDATE ON public.tareas_config_campos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_tareas_colaboradores_updated_at ON public.tareas_colaboradores;
CREATE TRIGGER trigger_tareas_colaboradores_updated_at
    BEFORE UPDATE ON public.tareas_colaboradores
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tareas_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tareas_config_campos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tareas_encargados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tareas_colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tareas_personal_asignado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tareas_consecutivos ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS RLS - TAREAS
-- =====================================================

-- SELECT: Ver tareas de su tienda
DROP POLICY IF EXISTS "Usuarios ven tareas de su tienda" ON public.tareas;
CREATE POLICY "Usuarios ven tareas de su tienda" ON public.tareas
    FOR SELECT
    USING (
        tienda_id IN (
            SELECT tienda_id 
            FROM public.usuario_tienda_actual 
            WHERE usuario_id = auth.uid()
        )
    );

-- INSERT: Crear tareas con permiso tareas:create
DROP POLICY IF EXISTS "Usuarios crean tareas con permiso" ON public.tareas;
CREATE POLICY "Usuarios crean tareas con permiso" ON public.tareas
    FOR INSERT
    WITH CHECK (
        tienda_id IN (
            SELECT tienda_id 
            FROM public.usuario_tienda_actual 
            WHERE usuario_id = auth.uid()
        )
        AND (
            'tareas:create' = ANY(public.fn_usuario_permisos(auth.uid()))
            OR 'admin:all' = ANY(public.fn_usuario_permisos(auth.uid()))
        )
    );

-- UPDATE: Editar tareas con permiso tareas:update
DROP POLICY IF EXISTS "Usuarios editan tareas con permiso" ON public.tareas;
CREATE POLICY "Usuarios editan tareas con permiso" ON public.tareas
    FOR UPDATE
    USING (
        tienda_id IN (
            SELECT tienda_id 
            FROM public.usuario_tienda_actual 
            WHERE usuario_id = auth.uid()
        )
        AND (
            'tareas:update' = ANY(public.fn_usuario_permisos(auth.uid()))
            OR 'admin:all' = ANY(public.fn_usuario_permisos(auth.uid()))
        )
    );

-- DELETE: Eliminar tareas con permiso tareas:delete
DROP POLICY IF EXISTS "Usuarios eliminan tareas con permiso" ON public.tareas;
CREATE POLICY "Usuarios eliminan tareas con permiso" ON public.tareas
    FOR DELETE
    USING (
        tienda_id IN (
            SELECT tienda_id 
            FROM public.usuario_tienda_actual 
            WHERE usuario_id = auth.uid()
        )
        AND (
            'tareas:delete' = ANY(public.fn_usuario_permisos(auth.uid()))
            OR 'admin:all' = ANY(public.fn_usuario_permisos(auth.uid()))
        )
    );

-- =====================================================
-- POLÍTICAS RLS - TAREAS_ITEMS
-- =====================================================

-- SELECT: Ver items de tareas de su tienda
DROP POLICY IF EXISTS "Usuarios ven items de su tienda" ON public.tareas_items;
CREATE POLICY "Usuarios ven items de su tienda" ON public.tareas_items
    FOR SELECT
    USING (
        tarea_id IN (
            SELECT id FROM public.tareas 
            WHERE tienda_id IN (
                SELECT tienda_id 
                FROM public.usuario_tienda_actual 
                WHERE usuario_id = auth.uid()
            )
        )
    );

-- INSERT/UPDATE/DELETE: Gestionar items con permiso tareas:update
DROP POLICY IF EXISTS "Usuarios gestionan items con permiso" ON public.tareas_items;
CREATE POLICY "Usuarios gestionan items con permiso" ON public.tareas_items
    FOR ALL
    USING (
        tarea_id IN (
            SELECT id FROM public.tareas 
            WHERE tienda_id IN (
                SELECT tienda_id 
                FROM public.usuario_tienda_actual 
                WHERE usuario_id = auth.uid()
            )
        )
        AND (
            'tareas:update' = ANY(public.fn_usuario_permisos(auth.uid()))
            OR 'admin:all' = ANY(public.fn_usuario_permisos(auth.uid()))
        )
    );

-- =====================================================
-- POLÍTICAS RLS - TAREAS_CONSECUTIVOS
-- =====================================================

-- SELECT: Ver consecutivos de su tienda
DROP POLICY IF EXISTS "Usuarios ven consecutivos de su tienda" ON public.tareas_consecutivos;
CREATE POLICY "Usuarios ven consecutivos de su tienda" ON public.tareas_consecutivos
    FOR SELECT
    USING (
        tienda_id IN (
            SELECT tienda_id 
            FROM public.usuario_tienda_actual 
            WHERE usuario_id = auth.uid()
        )
    );

-- INSERT/UPDATE: Usuarios autenticados gestionan consecutivos de su tienda
DROP POLICY IF EXISTS "Usuarios gestionan consecutivos de su tienda" ON public.tareas_consecutivos;
CREATE POLICY "Usuarios gestionan consecutivos de su tienda" ON public.tareas_consecutivos
    FOR ALL
    USING (
        tienda_id IN (
            SELECT tienda_id 
            FROM public.usuario_tienda_actual 
            WHERE usuario_id = auth.uid()
        )
    )
    WITH CHECK (
        tienda_id IN (
            SELECT tienda_id 
            FROM public.usuario_tienda_actual 
            WHERE usuario_id = auth.uid()
        )
    );

-- =====================================================
-- POLÍTICAS RLS - TAREAS_CONFIG_CAMPOS
-- =====================================================

-- SELECT: Ver configuración de su tienda
DROP POLICY IF EXISTS "Usuarios ven config de su tienda" ON public.tareas_config_campos;
CREATE POLICY "Usuarios ven config de su tienda" ON public.tareas_config_campos
    FOR SELECT
    USING (
        tienda_id IN (
            SELECT tienda_id 
            FROM public.usuario_tienda_actual 
            WHERE usuario_id = auth.uid()
        )
    );

-- INSERT/UPDATE/DELETE: Solo con permiso tareas:manage
DROP POLICY IF EXISTS "Usuarios gestionan config con permiso" ON public.tareas_config_campos;
CREATE POLICY "Usuarios gestionan config con permiso" ON public.tareas_config_campos
    FOR ALL
    USING (
        tienda_id IN (
            SELECT tienda_id 
            FROM public.usuario_tienda_actual 
            WHERE usuario_id = auth.uid()
        )
        AND (
            'tareas:manage' = ANY(public.fn_usuario_permisos(auth.uid()))
            OR 'admin:all' = ANY(public.fn_usuario_permisos(auth.uid()))
        )
    );

-- =====================================================
-- POLÍTICAS RLS - TAREAS_ENCARGADOS
-- =====================================================

-- SELECT: Ver encargados de su tienda
DROP POLICY IF EXISTS "Usuarios ven encargados de su tienda" ON public.tareas_encargados;
CREATE POLICY "Usuarios ven encargados de su tienda" ON public.tareas_encargados
    FOR SELECT
    USING (
        tienda_id IN (
            SELECT tienda_id 
            FROM public.usuario_tienda_actual 
            WHERE usuario_id = auth.uid()
        )
    );

-- INSERT/UPDATE/DELETE: Solo con permiso tareas:manage
DROP POLICY IF EXISTS "Usuarios gestionan encargados con permiso" ON public.tareas_encargados;
CREATE POLICY "Usuarios gestionan encargados con permiso" ON public.tareas_encargados
    FOR ALL
    USING (
        tienda_id IN (
            SELECT tienda_id 
            FROM public.usuario_tienda_actual 
            WHERE usuario_id = auth.uid()
        )
        AND (
            'tareas:manage' = ANY(public.fn_usuario_permisos(auth.uid()))
            OR 'admin:all' = ANY(public.fn_usuario_permisos(auth.uid()))
        )
    );

-- =====================================================
-- POLÍTICAS RLS - TAREAS_COLABORADORES
-- =====================================================

-- SELECT: Ver colaboradores de su tienda
DROP POLICY IF EXISTS "Usuarios ven colaboradores de su tienda" ON public.tareas_colaboradores;
CREATE POLICY "Usuarios ven colaboradores de su tienda" ON public.tareas_colaboradores
    FOR SELECT
    USING (
        tienda_id IN (
            SELECT tienda_id 
            FROM public.usuario_tienda_actual 
            WHERE usuario_id = auth.uid()
        )
    );

-- INSERT/UPDATE/DELETE: Solo con permiso tareas:manage
DROP POLICY IF EXISTS "Usuarios gestionan colaboradores con permiso" ON public.tareas_colaboradores;
CREATE POLICY "Usuarios gestionan colaboradores con permiso" ON public.tareas_colaboradores
    FOR ALL
    USING (
        tienda_id IN (
            SELECT tienda_id 
            FROM public.usuario_tienda_actual 
            WHERE usuario_id = auth.uid()
        )
        AND (
            'tareas:manage' = ANY(public.fn_usuario_permisos(auth.uid()))
            OR 'admin:all' = ANY(public.fn_usuario_permisos(auth.uid()))
        )
    );

-- =====================================================
-- POLÍTICAS RLS - TAREAS_PERSONAL_ASIGNADO
-- =====================================================

-- SELECT: Ver personal asignado de su tienda
DROP POLICY IF EXISTS "Usuarios ven personal de su tienda" ON public.tareas_personal_asignado;
CREATE POLICY "Usuarios ven personal de su tienda" ON public.tareas_personal_asignado
    FOR SELECT
    USING (
        tarea_id IN (
            SELECT id FROM public.tareas 
            WHERE tienda_id IN (
                SELECT tienda_id 
                FROM public.usuario_tienda_actual 
                WHERE usuario_id = auth.uid()
            )
        )
    );

-- INSERT/UPDATE/DELETE: Solo con permiso tareas:update
DROP POLICY IF EXISTS "Usuarios gestionan personal con permiso" ON public.tareas_personal_asignado;
CREATE POLICY "Usuarios gestionan personal con permiso" ON public.tareas_personal_asignado
    FOR ALL
    USING (
        tarea_id IN (
            SELECT id FROM public.tareas 
            WHERE tienda_id IN (
                SELECT tienda_id 
                FROM public.usuario_tienda_actual 
                WHERE usuario_id = auth.uid()
            )
        )
        AND (
            'tareas:update' = ANY(public.fn_usuario_permisos(auth.uid()))
            OR 'admin:all' = ANY(public.fn_usuario_permisos(auth.uid()))
        )
    );

-- =====================================================
-- 6. DATOS INICIALES
-- =====================================================

-- Insertar configuración de campos por defecto para todas las tiendas
INSERT INTO public.tareas_config_campos (tienda_id, nombre_campo, etiqueta, tipo_campo, requerido, orden)
SELECT 
    t.id,
    'descripcion',
    'Descripción de la tarea',
    'textarea',
    true,
    1
FROM public.tiendas t
WHERE NOT EXISTS (
    SELECT 1 FROM public.tareas_config_campos 
    WHERE tienda_id = t.id AND nombre_campo = 'descripcion'
);

INSERT INTO public.tareas_config_campos (tienda_id, nombre_campo, etiqueta, tipo_campo, requerido, orden)
SELECT 
    t.id,
    'cantidad',
    'Cantidad de unidades',
    'number',
    false,
    2
FROM public.tiendas t
WHERE NOT EXISTS (
    SELECT 1 FROM public.tareas_config_campos 
    WHERE tienda_id = t.id AND nombre_campo = 'cantidad'
);

INSERT INTO public.tareas_config_campos (tienda_id, nombre_campo, etiqueta, tipo_campo, requerido, orden)
SELECT 
    t.id,
    'fecha_requerida',
    'Fecha requerida',
    'date',
    false,
    3
FROM public.tiendas t
WHERE NOT EXISTS (
    SELECT 1 FROM public.tareas_config_campos 
    WHERE tienda_id = t.id AND nombre_campo = 'fecha_requerida'
);

-- =====================================================
-- 7. COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE public.tareas IS 'Tabla principal de tareas con formulario dinámico y consecutivo automático';
COMMENT ON TABLE public.tareas_items IS 'Items y consumos de inventario asociados a tareas';
COMMENT ON TABLE public.tareas_config_campos IS 'Configuración de campos del formulario dinámico por tienda';
COMMENT ON TABLE public.tareas_encargados IS 'Encargados/líderes que reciben notificaciones de nuevas tareas';
COMMENT ON TABLE public.tareas_colaboradores IS 'Personal disponible para asignar a tareas';
COMMENT ON TABLE public.tareas_personal_asignado IS 'Personal asignado a cada tarea específica';
COMMENT ON TABLE public.tareas_consecutivos IS 'Control de consecutivos automáticos por tienda';

COMMENT ON FUNCTION public.generar_consecutivo_tarea(UUID) IS 'Genera consecutivo automático VA0001, VA0002, etc. de forma segura en concurrencia';

-- Fin de la migración
SELECT 'Migración del módulo de Tareas completada exitosamente' as resultado;
