-- =====================================================
-- MIGRACIÓN: Sistema de Facturación Electrónica CR
-- Descripción: Tablas y estructuras para integración con Hacienda CR
-- =====================================================

-- 1. Actualizar tabla facturas_electronicas con columnas para Hacienda CR
ALTER TABLE facturas_electronicas 
ADD COLUMN IF NOT EXISTS estado_hacienda TEXT CHECK (estado_hacienda IN ('borrador','enviado','en_proceso','aceptado','rechazado','error')) DEFAULT 'en_proceso',
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS intentos SMALLINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS ultimo_intento_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS aceptado_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rechazo_motivo TEXT,
ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;

-- Índices para optimizar consultas de polling
CREATE INDEX IF NOT EXISTS idx_facturas_estado_hacienda ON facturas_electronicas(estado_hacienda, ultimo_intento_at);
CREATE INDEX IF NOT EXISTS idx_facturas_idempotency ON facturas_electronicas(idempotency_key);

-- 2. Actualizar tabla pedidos para vinculación con facturas
ALTER TABLE pedidos 
ADD COLUMN IF NOT EXISTS factura_id UUID REFERENCES facturas_electronicas(id),
ADD COLUMN IF NOT EXISTS factura_unica_ref TEXT UNIQUE;

-- 3. Crear tabla inventario_reservas para control de stock
CREATE TABLE IF NOT EXISTS inventario_reservas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    articulo_id BIGINT NOT NULL REFERENCES inventario(id),
    pedido_id UUID NOT NULL REFERENCES pedidos(id),
    cantidad NUMERIC(18,3) NOT NULL,
    vence_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
    estado TEXT CHECK (estado IN ('activa','liberada','consumida')) DEFAULT 'activa',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para reservas
CREATE INDEX IF NOT EXISTS idx_reservas_pedido ON inventario_reservas(pedido_id);
CREATE INDEX IF NOT EXISTS idx_reservas_articulo ON inventario_reservas(articulo_id);
CREATE INDEX IF NOT EXISTS idx_reservas_estado ON inventario_reservas(estado, vence_at);

-- 4. Crear tabla inventario_niveles para control de stock en tiempo real
CREATE TABLE IF NOT EXISTS inventario_niveles (
    articulo_id BIGINT PRIMARY KEY REFERENCES inventario(id),
    on_hand NUMERIC(18,3) DEFAULT 0,
    reservado NUMERIC(18,3) DEFAULT 0,
    disponible NUMERIC(18,3) GENERATED ALWAYS AS (on_hand - reservado) STORED,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Poblar inventario_niveles con datos existentes
INSERT INTO inventario_niveles (articulo_id, on_hand, reservado)
SELECT id, COALESCE(stock_actual, 0), 0
FROM inventario
ON CONFLICT (articulo_id) DO NOTHING;

-- 5. Actualizar tabla inventario_movimientos para trazabilidad completa
ALTER TABLE inventario_movimientos 
ADD COLUMN IF NOT EXISTS tipo TEXT CHECK (tipo IN ('venta','compra','ajuste','reserva','liberacion')) DEFAULT 'ajuste',
ADD COLUMN IF NOT EXISTS referencia_tipo TEXT,
ADD COLUMN IF NOT EXISTS referencia_id UUID,
ADD COLUMN IF NOT EXISTS notas TEXT;

-- 6. Crear tabla inventario_unidad_conversion para conversiones automáticas
CREATE TABLE IF NOT EXISTS inventario_unidad_conversion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_u TEXT NOT NULL,
    to_u TEXT NOT NULL,
    factor NUMERIC(10,6) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(from_u, to_u)
);

-- Insertar conversiones básicas de unidades
INSERT INTO inventario_unidad_conversion (from_u, to_u, factor) VALUES
-- Longitud
('mm', 'cm', 0.1),
('cm', 'mm', 10),
('cm', 'm', 0.01),
('m', 'cm', 100),
('mm', 'm', 0.001),
('m', 'mm', 1000),
-- Peso
('g', 'kg', 0.001),
('kg', 'g', 1000),
-- Tiempo
('s', 'min', 0.0166667),
('min', 's', 60),
('min', 'h', 0.0166667),
('h', 'min', 60),
('s', 'h', 0.000277778),
('h', 's', 3600)
ON CONFLICT (from_u, to_u) DO NOTHING;

-- 7. Crear tabla hacienda_envios para auditoría de comunicaciones
CREATE TABLE IF NOT EXISTS hacienda_envios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    factura_id UUID NOT NULL REFERENCES facturas_electronicas(id),
    tipo_operacion TEXT NOT NULL, -- 'envio', 'consulta', 'recepcion'
    request_data JSONB,
    response_data JSONB,
    status_code INTEGER,
    success BOOLEAN DEFAULT false,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para auditoría
CREATE INDEX IF NOT EXISTS idx_hacienda_envios_factura ON hacienda_envios(factura_id);
CREATE INDEX IF NOT EXISTS idx_hacienda_envios_tipo ON hacienda_envios(tipo_operacion, created_at);

-- 8. Crear tabla auditoria_facturacion para trazabilidad completa
CREATE TABLE IF NOT EXISTS auditoria_facturacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id),
    accion TEXT NOT NULL,
    entidad TEXT NOT NULL,
    entidad_id UUID NOT NULL,
    meta JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para auditoría
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria_facturacion(usuario_id, created_at);
CREATE INDEX IF NOT EXISTS idx_auditoria_entidad ON auditoria_facturacion(entidad, entidad_id);

-- 9. Función para obtener factor de conversión de unidades
CREATE OR REPLACE FUNCTION get_conversion_factor(from_unit TEXT, to_unit TEXT)
RETURNS NUMERIC AS $$
BEGIN
    -- Si las unidades son iguales, factor = 1
    IF from_unit = to_unit THEN
        RETURN 1;
    END IF;
    
    -- Buscar conversión directa
    RETURN (
        SELECT factor 
        FROM inventario_unidad_conversion 
        WHERE from_u = from_unit AND to_u = to_unit
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql;

-- 10. Función para registrar auditoría
CREATE OR REPLACE FUNCTION registrar_auditoria(
    p_usuario_id UUID,
    p_accion TEXT,
    p_entidad TEXT,
    p_entidad_id UUID,
    p_meta JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    audit_id UUID;
BEGIN
    INSERT INTO auditoria_facturacion (usuario_id, accion, entidad, entidad_id, meta)
    VALUES (p_usuario_id, p_accion, p_entidad, p_entidad_id, p_meta)
    RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$$ LANGUAGE plpgsql;

-- 11. Trigger para actualizar timestamp en inventario_niveles
CREATE OR REPLACE FUNCTION update_inventario_niveles_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_inventario_niveles_timestamp
    BEFORE UPDATE ON inventario_niveles
    FOR EACH ROW
    EXECUTE FUNCTION update_inventario_niveles_timestamp();

-- 12. Trigger para inicializar estado_hacienda al crear factura
CREATE OR REPLACE FUNCTION init_factura_hacienda_state()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo si no se especifica estado_hacienda
    IF NEW.estado_hacienda IS NULL THEN
        NEW.estado_hacienda = 'en_proceso';
    END IF;
    
    -- Inicializar timestamp de último intento
    IF NEW.ultimo_intento_at IS NULL THEN
        NEW.ultimo_intento_at = now();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_init_factura_hacienda_state
    BEFORE INSERT ON facturas_electronicas
    FOR EACH ROW
    EXECUTE FUNCTION init_factura_hacienda_state();

-- 13. Función para liberar reservas vencidas (ejecutar por cron)
CREATE OR REPLACE FUNCTION liberar_reservas_vencidas()
RETURNS INTEGER AS $$
DECLARE
    reservas_liberadas INTEGER := 0;
    reserva RECORD;
BEGIN
    -- Buscar reservas vencidas
    FOR reserva IN 
        SELECT r.id, r.articulo_id, r.cantidad
        FROM inventario_reservas r
        WHERE r.estado = 'activa' 
        AND r.vence_at < now()
    LOOP
        -- Liberar reserva en inventario_niveles
        UPDATE inventario_niveles 
        SET reservado = reservado - reserva.cantidad
        WHERE articulo_id = reserva.articulo_id;
        
        -- Marcar reserva como liberada
        UPDATE inventario_reservas 
        SET estado = 'liberada', updated_at = now()
        WHERE id = reserva.id;
        
        -- Registrar movimiento
        INSERT INTO inventario_movimientos (
            articulo_id, tipo, cantidad, referencia_tipo, referencia_id, notas
        ) VALUES (
            reserva.articulo_id, 'liberacion', reserva.cantidad, 
            'reserva_vencida', reserva.id, 'Liberación automática por vencimiento'
        );
        
        reservas_liberadas := reservas_liberadas + 1;
    END LOOP;
    
    RETURN reservas_liberadas;
END;
$$ LANGUAGE plpgsql;

-- 14. Habilitar Row Level Security en tablas críticas
ALTER TABLE inventario_reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario_niveles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hacienda_envios ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria_facturacion ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (ajustar según roles específicos)
CREATE POLICY "Usuarios autenticados pueden ver reservas" ON inventario_reservas
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden ver niveles" ON inventario_niveles
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Solo service_role puede modificar niveles" ON inventario_niveles
    FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- MIGRACIÓN COMPLETADA
-- =====================================================