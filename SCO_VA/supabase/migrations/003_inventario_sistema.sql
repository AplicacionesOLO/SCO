-- =====================================================
-- MIGRACIÓN: Sistema de Inventario Completo
-- Descripción: Crea todas las tablas necesarias para el sistema
-- =====================================================

-- Tabla de categorías
CREATE TABLE IF NOT EXISTS categorias (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de unidades de medida
CREATE TABLE IF NOT EXISTS unidades (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  abreviacion VARCHAR(10),
  tipo VARCHAR(50), -- peso, volumen, longitud, cantidad, etc.
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de artículos/productos
CREATE TABLE IF NOT EXISTS articulos (
  id SERIAL PRIMARY KEY,
  codigo_articulo VARCHAR(50) NOT NULL UNIQUE,
  descripcion_articulo TEXT NOT NULL,
  cantidad_articulo DECIMAL(10,2) DEFAULT 0,
  costo_articulo DECIMAL(10,2) NOT NULL,
  precio_venta DECIMAL(10,2),
  ganancia_articulo DECIMAL(5,2) DEFAULT 0,
  categoria_id INTEGER REFERENCES categorias(id),
  unidad_id INTEGER REFERENCES unidades(id),
  activo BOOLEAN DEFAULT true,
  stock_minimo DECIMAL(10,2) DEFAULT 0,
  stock_maximo DECIMAL(10,2),
  ubicacion VARCHAR(100),
  proveedor VARCHAR(200),
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de clientes
CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  codigo_cliente VARCHAR(50) UNIQUE,
  nombre VARCHAR(200) NOT NULL,
  email VARCHAR(100),
  telefono VARCHAR(20),
  direccion TEXT,
  ciudad VARCHAR(100),
  pais VARCHAR(100) DEFAULT 'Costa Rica',
  tipo_cliente VARCHAR(50) DEFAULT 'Regular', -- Regular, VIP, Mayorista
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de cotizaciones
CREATE TABLE IF NOT EXISTS cotizaciones (
  id SERIAL PRIMARY KEY,
  numero_cotizacion VARCHAR(50) NOT NULL UNIQUE,
  cliente_id INTEGER REFERENCES clientes(id),
  fecha_cotizacion DATE DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE,
  subtotal DECIMAL(12,2) DEFAULT 0,
  impuestos DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  estado VARCHAR(50) DEFAULT 'Borrador', -- Borrador, Enviada, Aprobada, Rechazada, Vencida
  notas TEXT,
  condiciones_pago TEXT,
  tiempo_entrega VARCHAR(100),
  validez_oferta VARCHAR(100),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de líneas de cotización
CREATE TABLE IF NOT EXISTS cotizacion_lineas (
  id SERIAL PRIMARY KEY,
  cotizacion_id INTEGER REFERENCES cotizaciones(id) ON DELETE CASCADE,
  articulo_id INTEGER REFERENCES articulos(id),
  cantidad DECIMAL(10,2) NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  descuento DECIMAL(5,2) DEFAULT 0,
  subtotal DECIMAL(12,2) NOT NULL,
  orden INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de pedidos
CREATE TABLE IF NOT EXISTS pedidos (
  id SERIAL PRIMARY KEY,
  numero_pedido VARCHAR(50) NOT NULL UNIQUE,
  cotizacion_id INTEGER REFERENCES cotizaciones(id),
  cliente_id INTEGER REFERENCES clientes(id),
  fecha_pedido DATE DEFAULT CURRENT_DATE,
  fecha_entrega_estimada DATE,
  subtotal DECIMAL(12,2) DEFAULT 0,
  impuestos DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  estado VARCHAR(50) DEFAULT 'Pendiente', -- Pendiente, En Proceso, Completado, Cancelado
  notas TEXT,
  direccion_entrega TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de líneas de pedido
CREATE TABLE IF NOT EXISTS pedido_lineas (
  id SERIAL PRIMARY KEY,
  pedido_id INTEGER REFERENCES pedidos(id) ON DELETE CASCADE,
  articulo_id INTEGER REFERENCES articulos(id),
  cantidad DECIMAL(10,2) NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  descuento DECIMAL(5,2) DEFAULT 0,
  subtotal DECIMAL(12,2) NOT NULL,
  orden INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- DATOS INICIALES
-- =====================================================

-- Insertar unidades básicas
INSERT INTO unidades (nombre, abreviacion, tipo) VALUES
('Unidad', 'Und', 'cantidad'),
('Metros', 'm', 'longitud'),
('Litros', 'L', 'volumen'),
('Kilogramos', 'kg', 'peso'),
('Horas', 'h', 'tiempo'),
('Piezas', 'pzs', 'cantidad'),
('Cajas', 'caja', 'cantidad'),
('Paquetes', 'paq', 'cantidad'),
('Rollos', 'rollo', 'cantidad'),
('Hojas', 'hoja', 'cantidad'),
('Pares', 'par', 'cantidad'),
('Juegos', 'juego', 'cantidad'),
('Gramos', 'g', 'peso'),
('Centímetros', 'cm', 'longitud'),
('Mililitros', 'ml', 'volumen'),
('Galones', 'gal', 'volumen'),
('Libras', 'lb', 'peso'),
('Onzas', 'oz', 'peso'),
('Yardas', 'yd', 'longitud'),
('Pulgadas', 'in', 'longitud')
ON CONFLICT (nombre) DO NOTHING;

-- Insertar categorías básicas
INSERT INTO categorias (nombre, descripcion) VALUES
('ETIQUETAS', 'Etiquetas y materiales de identificación'),
('EMBALAJE', 'Materiales de embalaje y empaque'),
('MAQUINA', 'Equipos y maquinaria'),
('HH', 'Horas hombre y servicios'),
('DEDICADOS', 'Productos dedicados y especializados'),
('HABLADORES', 'Material publicitario y señalización'),
('Ferretería', 'Productos de ferretería general'),
('Eléctricos', 'Materiales y componentes eléctricos'),
('Pinturas', 'Pinturas y acabados'),
('Plomería', 'Materiales de plomería'),
('Herramientas', 'Herramientas y equipos')
ON CONFLICT (nombre) DO NOTHING;

-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_articulos_codigo ON articulos(codigo_articulo);
CREATE INDEX IF NOT EXISTS idx_articulos_descripcion ON articulos(descripcion_articulo);
CREATE INDEX IF NOT EXISTS idx_articulos_categoria ON articulos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_articulos_activo ON articulos(activo);

CREATE INDEX IF NOT EXISTS idx_clientes_codigo ON clientes(codigo_cliente);
CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes(nombre);
CREATE INDEX IF NOT EXISTS idx_clientes_activo ON clientes(activo);

CREATE INDEX IF NOT EXISTS idx_cotizaciones_numero ON cotizaciones(numero_cotizacion);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_cliente ON cotizaciones(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_estado ON cotizaciones(estado);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_fecha ON cotizaciones(fecha_cotizacion);

CREATE INDEX IF NOT EXISTS idx_pedidos_numero ON pedidos(numero_pedido);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente ON pedidos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_fecha ON pedidos(fecha_pedido);

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at automáticamente
CREATE TRIGGER update_articulos_updated_at BEFORE UPDATE ON articulos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categorias_updated_at BEFORE UPDATE ON categorias
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cotizaciones_updated_at BEFORE UPDATE ON cotizaciones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pedidos_updated_at BEFORE UPDATE ON pedidos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- POLÍTICAS RLS (Row Level Security)
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE articulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotizacion_lineas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_lineas ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (permitir todo para usuarios autenticados)
-- Estas se pueden refinar según los permisos específicos del sistema

CREATE POLICY "Usuarios autenticados pueden ver categorias" ON categorias
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden modificar categorias" ON categorias
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden ver unidades" ON unidades
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden modificar unidades" ON unidades
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden ver articulos" ON articulos
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden modificar articulos" ON articulos
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden ver clientes" ON clientes
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden modificar clientes" ON clientes
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden ver cotizaciones" ON cotizaciones
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden modificar cotizaciones" ON cotizaciones
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden ver cotizacion_lineas" ON cotizacion_lineas
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden modificar cotizacion_lineas" ON cotizacion_lineas
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden ver pedidos" ON pedidos
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden modificar pedidos" ON pedidos
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden ver pedido_lineas" ON pedido_lineas
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden modificar pedido_lineas" ON pedido_lineas
    FOR ALL USING (auth.role() = 'authenticated');