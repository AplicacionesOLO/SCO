-- SISTEMA MULTI-TIENDA COMPLETO - MIGRACIÓN A OLO
-- A) CREAR TABLAS Y TIENDA OLO
CREATE TABLE IF NOT EXISTS public.tiendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL,
  codigo VARCHAR(10) NOT NULL UNIQUE,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.usuario_tiendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  tienda_id UUID NOT NULL REFERENCES public.tiendas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(usuario_id, tienda_id)
);

CREATE TABLE IF NOT EXISTS public.usuario_tienda_actual (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE UNIQUE,
  tienda_id UUID NOT NULL REFERENCES public.tiendas(id) ON DELETE CASCADE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar tienda OLO
INSERT INTO public.tiendas (nombre, codigo) VALUES ('OLO', 'OLO') ON CONFLICT (codigo) DO NOTHING;

-- B) AGREGAR TIENDA_ID Y MIGRAR DATOS
DO $$ 
DECLARE olo_id UUID;
BEGIN
  SELECT id INTO olo_id FROM public.tiendas WHERE codigo = 'OLO';
  
  -- Agregar columnas tienda_id
  ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS tienda_id UUID REFERENCES public.tiendas(id);
  ALTER TABLE public.inventario ADD COLUMN IF NOT EXISTS tienda_id UUID REFERENCES public.tiendas(id);
  ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS tienda_id UUID REFERENCES public.tiendas(id);
  ALTER TABLE public.cotizaciones ADD COLUMN IF NOT EXISTS tienda_id UUID REFERENCES public.tiendas(id);
  ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS tienda_id UUID REFERENCES public.tiendas(id);
  ALTER TABLE public.facturas_electronicas ADD COLUMN IF NOT EXISTS tienda_id UUID REFERENCES public.tiendas(id);
  
  -- Migrar datos existentes a OLO
  UPDATE public.clientes SET tienda_id = olo_id WHERE tienda_id IS NULL;
  UPDATE public.inventario SET tienda_id = olo_id WHERE tienda_id IS NULL;
  UPDATE public.productos SET tienda_id = olo_id WHERE tienda_id IS NULL;
  UPDATE public.cotizaciones SET tienda_id = olo_id WHERE tienda_id IS NULL;
  UPDATE public.pedidos SET tienda_id = olo_id WHERE tienda_id IS NULL;
  UPDATE public.facturas_electronicas SET tienda_id = olo_id WHERE tienda_id IS NULL;
  
  -- Asignar usuarios a OLO
  INSERT INTO public.usuario_tiendas (usuario_id, tienda_id)
  SELECT id, olo_id FROM public.usuarios ON CONFLICT DO NOTHING;
  
  -- Establecer OLO como tienda actual
  INSERT INTO public.usuario_tienda_actual (usuario_id, tienda_id)
  SELECT id, olo_id FROM public.usuarios ON CONFLICT (usuario_id) DO UPDATE SET tienda_id = olo_id;
END $$;

-- C) CREAR ÍNDICES
CREATE INDEX IF NOT EXISTS idx_clientes_tienda ON public.clientes(tienda_id);
CREATE INDEX IF NOT EXISTS idx_inventario_tienda ON public.inventario(tienda_id);
CREATE INDEX IF NOT EXISTS idx_productos_tienda ON public.productos(tienda_id);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_tienda ON public.cotizaciones(tienda_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_tienda ON public.pedidos(tienda_id);

-- D) FUNCIONES RPC
CREATE OR REPLACE FUNCTION public.get_user_stores(user_id UUID)
RETURNS TABLE(id UUID, nombre VARCHAR, codigo VARCHAR) AS $$
BEGIN
  -- Si es ROOT/ADMIN, devolver todas las tiendas
  IF EXISTS (SELECT 1 FROM public.usuario_roles ur JOIN public.roles r ON ur.rol_id = r.id 
             WHERE ur.usuario_id = user_id AND r.nombre IN ('root', 'admin')) THEN
    RETURN QUERY SELECT t.id, t.nombre, t.codigo FROM public.tiendas t WHERE t.activo = true;
  ELSE
    -- Devolver solo tiendas asignadas
    RETURN QUERY SELECT t.id, t.nombre, t.codigo FROM public.tiendas t 
                 JOIN public.usuario_tiendas ut ON t.id = ut.tienda_id 
                 WHERE ut.usuario_id = user_id AND t.activo = true;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_current_store(user_id UUID)
RETURNS TABLE(id UUID, nombre VARCHAR, codigo VARCHAR) AS $$
BEGIN
  RETURN QUERY SELECT t.id, t.nombre, t.codigo FROM public.tiendas t 
               JOIN public.usuario_tienda_actual uta ON t.id = uta.tienda_id 
               WHERE uta.usuario_id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.set_current_store(user_id UUID, store_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO public.usuario_tienda_actual (usuario_id, tienda_id, updated_at)
  VALUES (user_id, store_id, NOW())
  ON CONFLICT (usuario_id) DO UPDATE SET tienda_id = store_id, updated_at = NOW();
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- E) FUNCIÓN ME() ACTUALIZADA
CREATE OR REPLACE FUNCTION public.me()
RETURNS JSON AS $$
DECLARE
  current_user_id UUID;
  user_data JSON;
  user_roles JSON;
  user_permissions JSON;
  user_stores JSON;
  current_store JSON;
  result JSON;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN '{"isAuthenticated": false}'::JSON;
  END IF;

  -- Datos del usuario
  SELECT to_json(u) INTO user_data FROM (
    SELECT id, email, nombre, apellido, telefono, activo, created_at
    FROM public.usuarios WHERE id = current_user_id
  ) u;

  -- Roles del usuario
  SELECT COALESCE(json_agg(r), '[]'::json) INTO user_roles FROM (
    SELECT r.id, r.nombre, r.descripcion
    FROM public.roles r
    JOIN public.usuario_roles ur ON r.id = ur.rol_id
    WHERE ur.usuario_id = current_user_id
  ) r;

  -- Permisos del usuario
  SELECT COALESCE(json_agg(DISTINCT p), '[]'::json) INTO user_permissions FROM (
    SELECT p.id, p.nombre, p.descripcion
    FROM public.permisos p
    JOIN public.rol_permisos rp ON p.id = rp.permiso_id
    JOIN public.usuario_roles ur ON rp.rol_id = ur.rol_id
    WHERE ur.usuario_id = current_user_id
  ) p;

  -- Tiendas del usuario
  SELECT COALESCE(json_agg(s), '[]'::json) INTO user_stores FROM (
    SELECT * FROM public.get_user_stores(current_user_id)
  ) s;

  -- Tienda actual
  SELECT to_json(cs) INTO current_store FROM (
    SELECT * FROM public.get_current_store(current_user_id) LIMIT 1
  ) cs;

  -- Resultado final
  result := json_build_object(
    'isAuthenticated', true,
    'user', user_data,
    'roles', user_roles,
    'permissions', user_permissions,
    'stores', user_stores,
    'current_store', current_store
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;