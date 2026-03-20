# MULTITIENDA 01: ESTADO ACTUAL DEL SISTEMA

[← Volver al Índice](./MULTITIENDA_00_INDICE.md)

---

## 1. ESTRUCTURA DE BASE DE DATOS

### 1.1 Tablas Core Multi-Tienda

**Tabla: `tiendas`**
```sql
CREATE TABLE tiendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL,
  codigo VARCHAR(10) NOT NULL UNIQUE,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Tabla: `usuario_tiendas` (relación N:N)**
```sql
CREATE TABLE usuario_tiendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tienda_id UUID NOT NULL REFERENCES tiendas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(usuario_id, tienda_id)
);
```

**Tabla: `usuario_tienda_actual` (tienda activa del usuario)**
```sql
CREATE TABLE usuario_tienda_actual (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE UNIQUE,
  tienda_id UUID NOT NULL REFERENCES tiendas(id) ON DELETE CASCADE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 1.2 Tablas con Soporte Multi-Tienda

**Tablas que YA tienen columna `tienda_id`:**

| Tabla | tienda_id | Estado | Índice |
|-------|-----------|--------|--------|
| `clientes` | ✅ UUID | Agregado | ✅ idx_clientes_tienda |
| `inventario` | ✅ UUID | Agregado | ✅ idx_inventario_tienda |
| `productos` | ✅ UUID | Agregado | ✅ idx_productos_tienda |
| `cotizaciones` | ✅ UUID | Agregado | ✅ idx_cotizaciones_tienda |
| `pedidos` | ✅ UUID | Agregado | ✅ idx_pedidos_tienda |
| `facturas_electronicas` | ✅ UUID | Agregado | ✅ idx_facturas_tienda |

**Ejemplo de estructura:**
```sql
ALTER TABLE clientes ADD COLUMN tienda_id UUID REFERENCES tiendas(id);
CREATE INDEX idx_clientes_tienda ON clientes(tienda_id);
```

### 1.3 Tablas Globales (Catálogo Compartido)

**Tablas SIN `tienda_id` (compartidas entre todas las tiendas):**

- `categorias` - Categorías de productos
- `categorias_inventario` - Categorías de inventario
- `unidades_medida` - Unidades de medida (kg, m, unidad, etc.)
- `paises` - Catálogo de países
- `provincias` - Catálogo de provincias
- `cantones` - Catálogo de cantones
- `distritos` - Catálogo de distritos
- `actividades_economicas` - Actividades económicas de Hacienda
- `roles` - Roles del sistema
- `permisos` - Permisos del sistema
- `rol_permisos` - Relación roles-permisos

**Razón:** Estos datos son catálogos estándar que no varían por tienda.

---

## 2. CÓDIGO FRONTEND ACTUAL

### 2.1 Hook de Autenticación (`useAuth.ts`)

**Estado de Tienda:**
```typescript
const [currentStore, setCurrentStoreState] = useState<Store | null>(null);
const [stores, setStores] = useState<Store[]>([]);
```

**Función de Carga de Tienda Actual:**
```typescript
const loadCurrentStore = useCallback(async (userId: string) => {
  try {
    console.log('🏪 [useAuth] Cargando tienda actual para usuario:', userId);
    
    const { data: currentStoreData, error } = await supabase
      .from('usuario_tienda_actual')
      .select(`
        tienda_id,
        tiendas!inner(
          id,
          nombre,
          codigo,
          activo
        )
      `)
      .eq('usuario_id', userId)
      .eq('tiendas.activo', true)
      .single();

    if (error) {
      console.error('❌ [useAuth] Error obteniendo tienda actual:', error);
      return null;
    }

    if (currentStoreData?.tiendas) {
      const store = {
        id: currentStoreData.tiendas.id,
        nombre: currentStoreData.tiendas.nombre,
        codigo: currentStoreData.tiendas.codigo
      };
      console.log('✅ [useAuth] Tienda actual cargada:', store);
      setCurrentStoreState(store);
      return store;
    }

    return null;
  } catch (err) {
    console.error('❌ [useAuth] Error en loadCurrentStore:', err);
    return null;
  }
}, []);
```

**Función de Obtener Tiendas Disponibles:**
```typescript
const getAvailableStores = async (): Promise<Store[]> => {
  try {
    console.log('🏪 [useAuth] Obteniendo tiendas disponibles...');
    const { data, error } = await supabase
      .from('tiendas')
      .select('id, nombre, codigo')
      .eq('activo', true)
      .order('nombre');

    if (error) {
      console.error('❌ [useAuth] Error obteniendo tiendas:', error);
      return [];
    }

    console.log('✅ [useAuth] Tiendas disponibles:', data?.length || 0);
    return data || [];
  } catch (err) {
    console.error('❌ [useAuth] Error en getAvailableStores:', err);
    return [];
  }
};
```

### 2.2 Página de Login (`LoginPage.tsx`)

**Carga de Tiendas al Montar:**
```typescript
useEffect(() => {
  const loadStores = async () => {
    try {
      const availableStores = await getAvailableStores();
      setStores(availableStores);
      
      // Si solo hay una tienda, seleccionarla automáticamente
      if (availableStores.length === 1) {
        setSelectedStore(availableStores[0].id);
      }
    } catch (err) {
      console.error('Error cargando tiendas:', err);
    } finally {
      setLoadingStores(false);
    }
  };

  loadStores();
}, [getAvailableStores]);
```

**Selector de Tienda en UI:**
```typescript
<div>
  <label htmlFor="store" className="block text-sm font-medium text-gray-700 mb-2">
    Tienda
  </label>
  {loadingStores ? (
    <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
      Cargando tiendas...
    </div>
  ) : stores.length === 0 ? (
    <div className="w-full px-3 py-2 border border-red-300 rounded-md bg-red-50 text-red-600 text-sm">
      No hay tiendas disponibles. Contacta al administrador.
    </div>
  ) : (
    <select
      id="store"
      name="store"
      required
      value={selectedStore}
      onChange={(e) => setSelectedStore(e.target.value)}
      className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
    >
      <option value="">Selecciona una tienda</option>
      {stores.map((store) => (
        <option key={store.id} value={store.id}>
          {store.nombre} ({store.codigo})
        </option>
      ))}
    </select>
  )}
</div>
```

**Proceso de Login:**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');

  // Validar que se haya seleccionado una tienda
  if (!selectedStore) {
    setError('Por favor selecciona una tienda');
    return;
  }

  setLoading(true);

  try {
    const { error } = await signIn(email, password, selectedStore);
    
    if (error) {
      // Manejo de errores...
    } else {
      console.log('Login exitoso, redirigiendo...');
    }
  } catch (err: any) {
    console.error('Error inesperado:', err);
    setError(`Error inesperado: ${err?.message || 'Intenta nuevamente'}`);
    setLoading(false);
  }
};
```

### 2.3 Servicios (`clienteService.ts`, `cotizacionService.ts`, etc.)

**Patrón Actual: Reciben `currentStore` como Parámetro**

```typescript
export const getClientes = async (
  filters: ClienteFilters = {},
  currentStore: { id: string } | null
) => {
  // ✅ VALIDACIÓN OBLIGATORIA
  if (!currentStore) {
    return { 
      data: [], 
      error: { message: 'No hay tienda seleccionada' } 
    };
  }

  try {
    let query = supabase
      .from('clientes')
      .select(`
        *,
        pais:paises(nombre),
        provincia:provincias(nombre),
        canton:cantones(nombre),
        distrito:distritos(nombre)
      `)
      .eq('tienda_id', currentStore.id); // ✅ FILTRO OBLIGATORIO

    // Aplicar filtros adicionales...
    if (filters.search) {
      query = query.or(`nombre.ilike.%${filters.search}%,correo_principal.ilike.%${filters.search}%`);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    return { data: data || [], error };
  } catch (error) {
    console.error('Error fetching clientes:', error);
    return { data: [], error };
  }
};
```

**Ejemplo de Creación:**
```typescript
export const createCliente = async (
  cliente: Omit<Cliente, 'id' | 'created_at' | 'updated_at'>,
  currentStore: { id: string } | null
) => {
  if (!currentStore) {
    return { 
      data: null, 
      error: { message: 'No hay tienda seleccionada' } 
    };
  }

  try {
    const { data, error } = await supabase
      .from('clientes')
      .insert([{
        ...cliente,
        tienda_id: currentStore.id // ✅ INCLUIR TIENDA_ID OBLIGATORIO
      }])
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('Error creating cliente:', error);
    return { data: null, error };
  }
};
```

---

## 3. FUNCIONES RPC EXISTENTES

### 3.1 Obtener Tiendas del Usuario

```sql
CREATE OR REPLACE FUNCTION public.get_user_stores(user_id UUID)
RETURNS TABLE(id UUID, nombre VARCHAR, codigo VARCHAR) AS $$
BEGIN
  -- Si es ROOT/ADMIN, devolver todas las tiendas
  IF EXISTS (
    SELECT 1 
    FROM public.usuario_roles ur 
    JOIN public.roles r ON ur.rol_id = r.id 
    WHERE ur.usuario_id = user_id 
    AND r.nombre IN ('root', 'admin')
  ) THEN
    RETURN QUERY 
    SELECT t.id, t.nombre, t.codigo 
    FROM public.tiendas t 
    WHERE t.activo = true;
  ELSE
    -- Devolver solo tiendas asignadas
    RETURN QUERY 
    SELECT t.id, t.nombre, t.codigo 
    FROM public.tiendas t 
    JOIN public.usuario_tiendas ut ON t.id = ut.tienda_id 
    WHERE ut.usuario_id = user_id 
    AND t.activo = true;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3.2 Obtener Tienda Actual

```sql
CREATE OR REPLACE FUNCTION public.get_current_store(user_id UUID)
RETURNS TABLE(id UUID, nombre VARCHAR, codigo VARCHAR) AS $$
BEGIN
  RETURN QUERY 
  SELECT t.id, t.nombre, t.codigo 
  FROM public.tiendas t 
  JOIN public.usuario_tienda_actual uta ON t.id = uta.tienda_id 
  WHERE uta.usuario_id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3.3 Establecer Tienda Actual

```sql
CREATE OR REPLACE FUNCTION public.set_current_store(user_id UUID, store_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO public.usuario_tienda_actual (usuario_id, tienda_id, updated_at)
  VALUES (user_id, store_id, NOW())
  ON CONFLICT (usuario_id) 
  DO UPDATE SET tienda_id = store_id, updated_at = NOW();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 4. ESTADO DE RLS (ROW LEVEL SECURITY)

### 4.1 Estado Actual

**⚠️ CRÍTICO: Actualmente NO hay políticas RLS implementadas en las tablas principales.**

```sql
-- Verificar estado de RLS
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('clientes', 'inventario', 'productos', 'cotizaciones', 'pedidos');

-- Resultado esperado actual:
-- tablename              | rowsecurity
-- -----------------------+-------------
-- clientes               | f (false)
-- inventario             | f (false)
-- productos              | f (false)
-- cotizaciones           | f (false)
-- pedidos                | f (false)
```

### 4.2 Riesgo de Seguridad

**Sin RLS, los usuarios pueden:**
- Manipular queries en el navegador (DevTools)
- Usar herramientas como Postman para acceder a datos de otras tiendas
- Cambiar el parámetro `tienda_id` en las queries
- Ver datos confidenciales de otras tiendas

**Ejemplo de vulnerabilidad:**
```typescript
// ❌ Usuario malicioso puede hacer esto en DevTools:
const { data } = await supabase
  .from('clientes')
  .select('*')
  .eq('tienda_id', '<otra_tienda_id>'); // ❌ Puede ver datos de otra tienda

// Sin RLS, esta query retornará datos de la otra tienda
```

---

## 5. FLUJO ACTUAL DE LOGIN

```
┌─────────────────────────────────────────────────────────────┐
│  FLUJO ACTUAL DE LOGIN                                       │
└─────────────────────────────────────────────────────────────┘

1. Usuario ingresa a /login
   ↓
2. LoginPage carga tiendas disponibles
   GET /tiendas WHERE activo = true
   ↓
3. Usuario selecciona tienda del dropdown
   ↓
4. Usuario ingresa email + password
   ↓
5. Clic en "Iniciar sesión"
   signIn(email, password, selectedStoreId)
   ↓
6. useAuth.signIn() ejecuta:
   a) supabase.auth.signInWithPassword({ email, password })
   b) Si éxito → Guardar tienda seleccionada:
      INSERT/UPDATE usuario_tienda_actual
      SET tienda_id = selectedStoreId
   c) loadBasicProfile(user)
      - loadCurrentStore(user.id)
      - loadUserPermissions(user.id)
   ↓
7. AuthGate verifica:
   if (loading) → Mostrar spinner
   if (needsStoreAssignment) → PendingStorePage
   if (isAuthenticated) → Renderizar <App />
   ↓
8. Usuario ve Dashboard
```

---

## 6. PROBLEMAS DETECTADOS EN ESTADO ACTUAL

### 6.1 Seguridad

| # | Problema | Severidad |
|---|----------|-----------|
| 1 | No hay RLS en tablas principales | 🔴 CRÍTICO |
| 2 | Filtro tienda_id solo en frontend | 🔴 CRÍTICO |
| 3 | Fácil de bypassear con DevTools | 🔴 CRÍTICO |

### 6.2 Persistencia

| # | Problema | Severidad |
|---|----------|-----------|
| 4 | currentStore solo en useState | 🟡 MEDIO |
| 5 | Se pierde al recargar página (F5) | 🟡 MEDIO |
| 6 | No hay backup en localStorage | 🟢 BAJO |

### 6.3 Validación

| # | Problema | Severidad |
|---|----------|-----------|
| 7 | Edge Functions sin validación de tienda | 🔴 CRÍTICO |
| 8 | No hay interceptores globales | 🟡 MEDIO |
| 9 | Servicios no validan consistentemente | 🟡 MEDIO |

---

## 7. RESUMEN DEL ESTADO ACTUAL

### ✅ Lo que Funciona

- Estructura de tablas multi-tienda creada
- Columna `tienda_id` agregada a tablas principales
- Login con selección de tienda
- Frontend carga tienda actual en Context
- Servicios reciben `currentStore` como parámetro
- Funciones RPC para gestión de tiendas

### ⚠️ Lo que Falta

- **RLS en todas las tablas** (CRÍTICO)
- Validación de tienda en Edge Functions
- Persistencia robusta de `currentStore`
- Selector de tienda en TopBar (cambio sin re-login)
- Logs estándar para depuración
- Tests automatizados

### 🔴 Riesgos Inmediatos

1. **Seguridad:** Datos de otras tiendas accesibles
2. **UX:** Tienda se pierde al recargar página
3. **Consistencia:** No hay validación en backend

---

[→ Siguiente: Problemas Detectados](./MULTITIENDA_02_PROBLEMAS.md)
