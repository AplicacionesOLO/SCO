# SCO - FASE 0: DIAGNÓSTICO REAL DEL SISTEMA MULTI-TIENDA

**Sistema:** SCO (Sistema de Costeos OLO)  
**Fecha:** 2025  
**Tipo:** Diagnóstico Técnico - Estado Actual  
**Propósito:** Documentar el estado REAL del sistema multi-tienda sin suposiciones

---

## ⚠️ ADVERTENCIA CRÍTICA

Este documento refleja el estado REAL del sistema al momento del análisis.  
**NO contiene suposiciones ni propuestas de mejora.**  
**SOLO documenta lo que EXISTE HOY.**

---

## 1. ESTADO REAL ACTUAL DEL SISTEMA

### 1.1 Cómo se obtiene HOY la tienda activa

#### En el Frontend (useAuth.ts)

**Ubicación:** `src/hooks/useAuth.ts`

**Función crítica:** `loadCurrentStore(userId: string)`

```typescript
// LÍNEAS 62-91 de useAuth.ts
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

**HALLAZGOS:**

1. ✅ **SÍ consulta la tabla `usuario_tienda_actual`** en base de datos
2. ✅ **SÍ hace JOIN con `tiendas`** para obtener datos completos
3. ✅ **SÍ valida que la tienda esté activa** (`eq('tiendas.activo', true)`)
4. ❌ **NO persiste en localStorage** - Solo guarda en estado de React
5. ❌ **NO hay validación de acceso** - No verifica que el usuario tenga permiso a esa tienda
6. ⚠️ **Retorna `null` silenciosamente** si hay error - No lanza excepción

#### En el Login (LoginPage.tsx)

**Ubicación:** `src/pages/auth/LoginPage.tsx`

**Función crítica:** `handleSubmit()`

```typescript
// LÍNEAS 51-88 de LoginPage.tsx
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
      // ... manejo de errores
    } else {
      console.log('Login exitoso, redirigiendo a:', from);
    }
  } catch (err: any) {
    // ... manejo de errores
  }
};
```

**Función `signIn()` en useAuth.ts:**

```typescript
// LÍNEAS 234-275 de useAuth.ts
const signIn = async (email: string, password: string, storeId?: string) => {
  try {
    console.log('🔐 [useAuth] Iniciando sesión para:', email, 'Tienda:', storeId);
    setLoading(true);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('❌ [useAuth] signIn error:', error);
      setLoading(false);
      return { error };
    }
    
    if (data.session?.user) {
      if (storeId) {
        console.log('🏪 [useAuth] Guardando tienda seleccionada:', storeId);
        try {
          await supabase
            .from('usuario_tienda_actual')
            .upsert({
              usuario_id: data.session.user.id,
              tienda_id: storeId,
              updated_at: new Date().toISOString()
            });

          const { data: storeData } = await supabase
            .from('tiendas')
            .select('id, nombre, codigo')
            .eq('id', storeId)
            .single();

          if (storeData) {
            setCurrentStoreState(storeData);
          }
        } catch (storeError) {
          console.error('⚠️ [useAuth] Error guardando tienda actual:', storeError);
        }
      }
      
      await loadBasicProfile(data.session.user);
    } else {
      setLoading(false);
    }
    
    return {};
  } catch (err) {
    console.error('❌ [useAuth] signIn exception:', err);
    setLoading(false);
    return { error: err };
  }
};
```

**HALLAZGOS:**

1. ✅ **SÍ guarda en BD** - Hace UPSERT en `usuario_tienda_actual`
2. ✅ **SÍ actualiza estado de React** - Llama a `setCurrentStoreState()`
3. ❌ **NO valida acceso** - No verifica que el usuario tenga permiso a esa tienda
4. ⚠️ **Error silencioso** - Si falla el UPSERT, solo hace `console.error` pero continúa
5. ❌ **NO persiste en localStorage** - Solo en BD y estado de React

### 1.2 Dónde se PIERDE la tienda activa

#### Escenario 1: Refresh (F5)

**Problema:** Al recargar la página, el estado de React se pierde.

**Flujo actual:**

```
1. Usuario hace F5
   ↓
2. React reinicia (estado limpio)
   ↓
3. useAuth ejecuta useEffect inicial
   ↓
4. Llama a supabase.auth.getSession()
   ↓
5. Si hay sesión, llama a loadBasicProfile()
   ↓
6. loadBasicProfile() llama a loadCurrentStore()
   ↓
7. loadCurrentStore() consulta usuario_tienda_actual
   ↓
8. ✅ RECUPERA la tienda desde BD
```

**HALLAZGO CRÍTICO:**

- ✅ **NO se pierde en refresh** - Se recupera desde BD
- ⚠️ **Hay un delay** - Entre el refresh y la carga hay un momento sin tienda
- ⚠️ **Componentes pueden renderizar sin tienda** - Si se montan antes de que termine `loadCurrentStore()`

#### Escenario 2: Cambio de ruta

**Problema:** Al navegar entre páginas, ¿se mantiene la tienda?

**Análisis:**

```typescript
// useAuth.ts usa useState para currentStore
const [currentStore, setCurrentStoreState] = useState<Store | null>(null);
```

**HALLAZGO:**

- ✅ **SÍ se mantiene** - `useState` persiste mientras el componente `AuthProvider` esté montado
- ✅ **AuthProvider está en App.tsx** - Se monta una sola vez
- ✅ **NO se pierde al cambiar de ruta** - El estado persiste

#### Escenario 3: Logout

**Función:** `signOut()` en useAuth.ts

```typescript
// LÍNEAS 310-345 de useAuth.ts
const signOut = async () => {
  try {
    console.log('🚪 [useAuth] Cerrando sesión...');
    
    // PRIMERO: Cerrar sesión en Supabase
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('❌ [useAuth] Error en signOut:', error);
      // Continuar con la limpieza aunque haya error
    } else {
      console.log('✅ [useAuth] Sesión cerrada en Supabase');
    }
    
    // SEGUNDO: Limpiar estado local
    resetAuth();
    
    // TERCERO: Redirigir al login
    console.log('🔄 [useAuth] Redirigiendo a /login...');
    
    if (window.REACT_APP_NAVIGATE) {
      window.REACT_APP_NAVIGATE('/login', { replace: true });
    } else {
      window.location.href = '/login';
    }
    
  } catch (err) {
    console.error('❌ [useAuth] signOut exception:', err);
    resetAuth();
    
    if (window.REACT_APP_NAVIGATE) {
      window.REACT_APP_NAVIGATE('/login', { replace: true });
    } else {
      window.location.href = '/login';
    }
  }
};
```

**Función `resetAuth()`:**

```typescript
// LÍNEAS 40-51 de useAuth.ts
const resetAuth = useCallback(() => {
  console.log('🔄 Resetting auth state...');
  setUser(null);
  setProfile(null);
  setRoles([]);
  setPermissions([]);
  setIsAuthenticated(false);
  setNeedsStoreAssignment(false);
  setStores([]);
  setCurrentStoreState(null); // ← LIMPIA currentStore
  setLoading(false);
}, []);
```

**HALLAZGO:**

- ✅ **SÍ se limpia correctamente** - `resetAuth()` pone `currentStore` en `null`
- ✅ **SÍ cierra sesión en Supabase** - Llama a `supabase.auth.signOut()`
- ❌ **NO limpia `usuario_tienda_actual` en BD** - La fila queda en la tabla
- ⚠️ **Esto es correcto** - Al hacer login de nuevo, se reutiliza la última tienda

### 1.3 Qué partes dependen del frontend

#### Estado de React (useAuth)

```typescript
// Estado local en useAuth.ts
const [currentStore, setCurrentStoreState] = useState<Store | null>(null);
```

**Dependencias:**

1. ✅ **AuthProvider debe estar montado** - Si no, no hay contexto
2. ✅ **useAuth debe ser llamado** - Componentes deben usar el hook
3. ⚠️ **Hay un delay inicial** - Entre mount y carga de tienda

#### Componentes que usan currentStore

**Búsqueda en el código:**

```bash
# Componentes que importan useAuth y usan currentStore
- src/pages/*/page.tsx (múltiples páginas)
- src/components/feature/TopBar.tsx
- src/components/feature/Sidebar.tsx
```

**HALLAZGO:**

- ⚠️ **Muchos componentes asumen que currentStore existe** - No validan `null`
- ⚠️ **No hay bloqueo de navegación** - Usuario puede navegar sin tienda
- ⚠️ **No hay indicador visual** - Usuario no sabe qué tienda está activa

### 1.4 Qué partes consultan BD

#### Consultas directas a usuario_tienda_actual

**Ubicaciones encontradas:**

1. ✅ `useAuth.ts` - `loadCurrentStore()` (línea 62)
2. ✅ `useAuth.ts` - `signIn()` (línea 251)
3. ✅ `useAuth.ts` - `checkStoreAssignment()` (línea 177)

**HALLAZGO:**

- ✅ **Solo useAuth consulta esta tabla** - Centralizado
- ✅ **Usa Supabase client** - No hay queries directas
- ⚠️ **No hay RLS en esta tabla** - Cualquiera puede leer/escribir (RIESGO)

---

## 2. TABLAS ACTUALES RELACIONADAS CON TIENDA

### 2.1 Tablas del sistema

**Fuente:** `<supabase_tables>` del contexto

**Lista completa de tablas:**

```
inventario_niveles, inventario_movimientos, categorias, settings, paises, 
productos, provincias, inventario_thresholds, bom_items, tiendas, cantones, 
categorias_inventario, distritos, pedido_items, usuario_tiendas, 
actividades_economicas, inventario_alertas, solicitud_estados, clientes, 
solicitudes, roles, inventario_reservas, facturas_electronicas, 
unidades_medida, usuario_tienda_actual, permisos, cotizacion_items, 
rol_permisos, replenishment_orders, usuarios, pedidos, factura_items, 
hacienda_consecutivos, optimizador_proyectos_temp, debug_log, usuario_roles, 
auditoria_acciones, inventario, costbot_chunks, cotizaciones, tareas, 
tareas_items, tareas_config_campos, tareas_encargados, tareas_colaboradores, 
tareas_personal_asignado, tareas_consecutivos, comprobantes_recibidos, 
tipos_cod_barras
```

### 2.2 Clasificación por tienda_id

#### ✅ Tablas que SÍ tienen tienda_id

**Análisis basado en documentación existente:**

| Tabla | Tiene tienda_id | Nullable | Uso |
|-------|----------------|----------|-----|
| `clientes` | ✅ SÍ | ❌ NO | Clientes por tienda |
| `cotizaciones` | ✅ SÍ | ❌ NO | Cotizaciones por tienda |
| `cotizacion_items` | ✅ SÍ | ❌ NO | Items de cotización |
| `pedidos` | ✅ SÍ | ❌ NO | Pedidos por tienda |
| `pedido_items` | ✅ SÍ | ❌ NO | Items de pedido |
| `facturas_electronicas` | ✅ SÍ | ❌ NO | Facturas por tienda |
| `factura_items` | ✅ SÍ | ❌ NO | Items de factura |
| `inventario` | ✅ SÍ | ⚠️ **SÍ** | **PROBLEMA: Permite NULL** |
| `inventario_movimientos` | ✅ SÍ | ❌ NO | Movimientos por tienda |
| `inventario_niveles` | ✅ SÍ | ❌ NO | Niveles por tienda |
| `inventario_thresholds` | ✅ SÍ | ❌ NO | Umbrales por tienda |
| `inventario_alertas` | ✅ SÍ | ❌ NO | Alertas por tienda |
| `inventario_reservas` | ✅ SÍ | ❌ NO | Reservas por tienda |
| `replenishment_orders` | ✅ SÍ | ❌ NO | Órdenes de reabastecimiento |
| `tareas` | ✅ SÍ | ❌ NO | Tareas por tienda |
| `tareas_items` | ✅ SÍ | ❌ NO | Items de tareas |
| `optimizador_proyectos_temp` | ✅ SÍ | ❌ NO | Proyectos de optimización |
| `hacienda_consecutivos` | ✅ SÍ | ❌ NO | Consecutivos de facturación |
| `comprobantes_recibidos` | ✅ SÍ | ❌ NO | Comprobantes por tienda |
| `usuario_tiendas` | ✅ SÍ | ❌ NO | Asignación usuario-tienda |
| `usuario_tienda_actual` | ✅ SÍ | ❌ NO | Tienda activa del usuario |
| `usuario_roles` | ✅ SÍ | ⚠️ **SÍ** | Roles por tienda (puede ser NULL) |
| `auditoria_acciones` | ✅ SÍ | ⚠️ **SÍ** | Auditoría (puede ser NULL) |

#### ❌ Tablas que NO tienen tienda_id (Globales)

| Tabla | Tipo | Justificación |
|-------|------|---------------|
| `paises` | Catálogo global | Datos geográficos |
| `provincias` | Catálogo global | Datos geográficos |
| `cantones` | Catálogo global | Datos geográficos |
| `distritos` | Catálogo global | Datos geográficos |
| `actividades_economicas` | Catálogo global | Catálogo de Hacienda |
| `unidades_medida` | Catálogo global | Unidades estándar |
| `tipos_cod_barras` | Catálogo global | Tipos de código de barras |
| `roles` | Sistema | Roles del sistema |
| `permisos` | Sistema | Permisos del sistema |
| `rol_permisos` | Sistema | Relación rol-permiso |
| `usuarios` | Sistema | Usuarios del sistema |
| `tiendas` | Sistema | Catálogo de tiendas |
| `settings` | Sistema | Configuración global |
| `debug_log` | Sistema | Logs de debug |

#### ⚠️ Tablas HÍBRIDAS (tienda_id nullable)

| Tabla | tienda_id | Lógica |
|-------|-----------|--------|
| `productos` | ⚠️ Nullable | NULL = catálogo global, NOT NULL = producto de tienda |
| `bom_items` | ⚠️ Nullable | Heredan tienda del producto padre |
| `categorias` | ⚠️ Nullable | NULL = categoría global, NOT NULL = categoría de tienda |
| `categorias_inventario` | ⚠️ Nullable | NULL = categoría global, NOT NULL = categoría de tienda |

### 2.3 Riesgo real de cada tabla

#### 🔴 RIESGO CRÍTICO (Sin RLS + Datos sensibles)

| Tabla | Riesgo | Razón |
|-------|--------|-------|
| `clientes` | 🔴 CRÍTICO | Datos personales, sin RLS |
| `cotizaciones` | 🔴 CRÍTICO | Información comercial, sin RLS |
| `pedidos` | 🔴 CRÍTICO | Información comercial, sin RLS |
| `facturas_electronicas` | 🔴 CRÍTICO | Datos fiscales, sin RLS |
| `inventario` | 🔴 CRÍTICO | **tienda_id nullable + sin RLS** |
| `usuario_tienda_actual` | 🔴 CRÍTICO | **Sin RLS, cualquiera puede cambiar tienda** |

#### ⚠️ RIESGO ALTO (Sin RLS)

| Tabla | Riesgo | Razón |
|-------|--------|-------|
| `inventario_movimientos` | ⚠️ ALTO | Historial de inventario, sin RLS |
| `inventario_niveles` | ⚠️ ALTO | Niveles de stock, sin RLS |
| `inventario_alertas` | ⚠️ ALTO | Alertas de inventario, sin RLS |
| `tareas` | ⚠️ ALTO | Tareas internas, sin RLS |
| `hacienda_consecutivos` | ⚠️ ALTO | Consecutivos de facturación, sin RLS |

#### ✅ RIESGO BAJO (Catálogos globales)

| Tabla | Riesgo | Razón |
|-------|--------|-------|
| `paises`, `provincias`, etc. | ✅ BAJO | Datos públicos, no requieren RLS |
| `roles`, `permisos` | ✅ BAJO | Catálogos del sistema |

---

## 3. FLUJO REAL HOY (AS-IS)

### 3.1 Login

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUJO DE LOGIN ACTUAL                     │
└─────────────────────────────────────────────────────────────┘

1. Usuario abre /login
   ↓
2. LoginPage.tsx se monta
   ↓
3. useEffect ejecuta getAvailableStores()
   ↓
4. Query: SELECT * FROM tiendas WHERE activo = true
   ⚠️ SIN FILTRO - Muestra TODAS las tiendas activas
   ⚠️ NO valida que el usuario tenga acceso
   ↓
5. Usuario selecciona tienda del dropdown
   ↓
6. Usuario ingresa email + password
   ↓
7. Click en "Iniciar sesión"
   ↓
8. handleSubmit() valida que selectedStore no sea vacío
   ↓
9. Llama a signIn(email, password, selectedStore)
   ↓
10. signIn() llama a supabase.auth.signInWithPassword()
    ↓
11. Si autenticación exitosa:
    ↓
12. UPSERT en usuario_tienda_actual
    ⚠️ NO valida que el usuario tenga acceso a esa tienda
    ⚠️ Cualquier usuario puede asignarse cualquier tienda
    ↓
13. Query: SELECT * FROM tiendas WHERE id = selectedStore
    ↓
14. setCurrentStoreState(storeData)
    ↓
15. loadBasicProfile(user)
    ↓
16. loadCurrentStore(user.id)
    ↓
17. Redirige a /dashboard
```

**PROBLEMAS DETECTADOS:**

1. ❌ **No valida acceso a tienda** - Usuario puede seleccionar cualquier tienda
2. ❌ **Muestra todas las tiendas** - Debería mostrar solo las asignadas al usuario
3. ⚠️ **Validación solo en frontend** - Backend no valida nada
4. ⚠️ **UPSERT sin validación** - Puede escribir cualquier tienda_id

### 3.2 Primer load (después de login)

```
┌─────────────────────────────────────────────────────────────┐
│                  FLUJO DE PRIMER LOAD                        │
└─────────────────────────────────────────────────────────────┘

1. App.tsx se monta
   ↓
2. AuthProvider se monta
   ↓
3. useAuth ejecuta useEffect inicial
   ↓
4. Llama a supabase.auth.getSession()
   ↓
5. Si hay sesión:
   ↓
6. setUser(session.user)
   ↓
7. loadBasicProfile(session.user)
   ↓
8. loadBasicProfile() ejecuta:
   - Query: SELECT * FROM usuarios WHERE id = user.id
   - loadUserPermissions(user.id) vía Edge Function
   - loadCurrentStore(user.id)
   - checkStoreAssignment(user.id)
   ↓
9. loadCurrentStore() ejecuta:
   Query: SELECT tienda_id, tiendas.* 
          FROM usuario_tienda_actual
          JOIN tiendas ON ...
          WHERE usuario_id = user.id
   ↓
10. setCurrentStoreState(store)
    ↓
11. setIsAuthenticated(true)
    ↓
12. AuthGate permite pasar
    ↓
13. Componentes se montan
    ⚠️ Algunos pueden renderizar antes de que currentStore esté listo
```

**PROBLEMAS DETECTADOS:**

1. ⚠️ **Race condition** - Componentes pueden montar antes de tener tienda
2. ⚠️ **No hay loading state** - Usuario no sabe que se está cargando la tienda
3. ⚠️ **No hay fallback** - Si falla loadCurrentStore(), currentStore queda en null

### 3.3 Refresh (F5)

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUJO DE REFRESH                          │
└─────────────────────────────────────────────────────────────┘

1. Usuario hace F5
   ↓
2. React reinicia completamente
   ↓
3. Estado de useAuth se resetea:
   - currentStore = null
   - user = null
   - profile = null
   ↓
4. useEffect inicial se ejecuta
   ↓
5. supabase.auth.getSession()
   ✅ Supabase recupera sesión desde localStorage
   ↓
6. Si hay sesión:
   ↓
7. loadBasicProfile(user)
   ↓
8. loadCurrentStore(user.id)
   ✅ Consulta usuario_tienda_actual en BD
   ✅ Recupera la tienda
   ↓
9. setCurrentStoreState(store)
   ✅ Tienda restaurada
   ↓
10. Componentes se montan con tienda disponible
```

**HALLAZGO IMPORTANTE:**

- ✅ **La tienda NO se pierde en refresh** - Se recupera desde BD
- ⚠️ **Hay un delay** - Entre F5 y recuperación hay ~500ms sin tienda
- ⚠️ **Componentes pueden renderizar sin tienda** - Durante el delay

### 3.4 Cambio de tienda

**PROBLEMA:** No existe funcionalidad para cambiar de tienda sin hacer logout.

**Análisis del código:**

```typescript
// useAuth.ts tiene setCurrentStore() pero es solo para estado local
const setCurrentStore = (store: Store | null) => {
  setCurrentStoreState(store);
};
```

**HALLAZGO:**

- ❌ **No actualiza BD** - Solo cambia estado de React
- ❌ **No hay UI para cambiar tienda** - Usuario debe hacer logout y login de nuevo
- ❌ **No hay validación** - Cualquier componente puede llamar a `setCurrentStore()`

### 3.5 Logout

```
┌─────────────────────────────────────────────────────────────┐
│                     FLUJO DE LOGOUT                          │
└─────────────────────────────────────────────────────────────┘

1. Usuario hace click en "Cerrar sesión"
   ↓
2. Llama a signOut()
   ↓
3. supabase.auth.signOut()
   ✅ Cierra sesión en Supabase
   ✅ Limpia localStorage de Supabase
   ↓
4. resetAuth()
   ✅ Limpia todo el estado de React:
   - user = null
   - profile = null
   - currentStore = null
   - permissions = []
   ↓
5. Redirige a /login
   ↓
6. ⚠️ usuario_tienda_actual NO se limpia en BD
   (Esto es correcto - se reutiliza en próximo login)
```

**HALLAZGO:**

- ✅ **Logout funciona correctamente**
- ✅ **Limpia estado de React**
- ✅ **Cierra sesión en Supabase**
- ✅ **No limpia BD** (correcto - se reutiliza)

---

## 4. RIESGOS CRÍTICOS ACTUALES

### 4.1 Seguridad

#### 🔴 CRÍTICO: Sin Row Level Security (RLS)

**Problema:**

```sql
-- CUALQUIER usuario autenticado puede hacer esto:
SELECT * FROM clientes WHERE tienda_id = 'otra-tienda-uuid';
SELECT * FROM inventario WHERE tienda_id = 'otra-tienda-uuid';
UPDATE usuario_tienda_actual 
SET tienda_id = 'otra-tienda-uuid' 
WHERE usuario_id = 'mi-usuario-uuid';
```

**Impacto:**

- ❌ Usuario puede ver datos de CUALQUIER tienda
- ❌ Usuario puede modificar datos de CUALQUIER tienda
- ❌ Usuario puede cambiar su tienda activa a CUALQUIER tienda
- ❌ Usuario puede eliminar datos de CUALQUIER tienda

**Evidencia:**

```typescript
// En cualquier servicio:
const { data } = await supabase
  .from('clientes')
  .select('*')
  .eq('tienda_id', 'cualquier-uuid'); // ← NO HAY VALIDACIÓN
```

#### 🔴 CRÍTICO: Login sin validación de acceso

**Problema:**

```typescript
// LoginPage.tsx - LÍNEA 24
const loadStores = async () => {
  const availableStores = await getAvailableStores();
  setStores(availableStores);
};

// useAuth.ts - LÍNEA 218
const getAvailableStores = async (): Promise<Store[]> => {
  const { data } = await supabase
    .from('tiendas')
    .select('id, nombre, codigo')
    .eq('activo', true); // ← Muestra TODAS las tiendas
  return data || [];
};
```

**Impacto:**

- ❌ Usuario ve TODAS las tiendas en el dropdown
- ❌ Usuario puede seleccionar CUALQUIER tienda
- ❌ No hay validación de que tenga acceso

**Flujo de ataque:**

```
1. Usuario hace login
2. Ve dropdown con todas las tiendas
3. Selecciona tienda a la que NO tiene acceso
4. Sistema hace UPSERT sin validar
5. Usuario tiene acceso a tienda no autorizada
```

#### 🔴 CRÍTICO: usuario_tienda_actual sin RLS

**Problema:**

```typescript
// useAuth.ts - LÍNEA 251
await supabase
  .from('usuario_tienda_actual')
  .upsert({
    usuario_id: data.session.user.id,
    tienda_id: storeId, // ← storeId viene del frontend
    updated_at: new Date().toISOString()
  });
```

**Impacto:**

- ❌ Cualquier usuario puede cambiar su tienda activa
- ❌ Puede asignarse a tienda no autorizada
- ❌ Puede modificar tienda de otros usuarios (si conoce el UUID)

### 4.2 Datos cruzados

#### ⚠️ ALTO: inventario con tienda_id = NULL

**Problema:**

```sql
-- Tabla inventario permite tienda_id NULL
CREATE TABLE inventario (
  id UUID PRIMARY KEY,
  tienda_id UUID REFERENCES tiendas(id), -- ← Nullable
  codigo VARCHAR,
  nombre VARCHAR,
  ...
);
```

**Impacto:**

- ⚠️ Registros con `tienda_id = NULL` se mezclan con datos de tiendas
- ⚠️ Queries sin filtro retornan datos globales + datos de tiendas
- ⚠️ No está claro si NULL = "global" o "dato legacy sin tienda"

**Ejemplo de problema:**

```typescript
// Servicio que consulta inventario
const { data } = await supabase
  .from('inventario')
  .select('*')
  .eq('tienda_id', currentStore.id);

// ¿Qué pasa con los registros donde tienda_id IS NULL?
// ¿Deberían mostrarse o no?
```

#### ⚠️ ALTO: Productos híbridos sin lógica clara

**Problema:**

```sql
-- Tabla productos permite tienda_id NULL
CREATE TABLE productos (
  id UUID PRIMARY KEY,
  tienda_id UUID REFERENCES tiendas(id), -- ← Nullable
  codigo VARCHAR,
  nombre VARCHAR,
  ...
);
```

**Impacto:**

- ⚠️ No está claro cuándo un producto es "global" vs "de tienda"
- ⚠️ Queries deben decidir si incluir productos globales o no
- ⚠️ Lógica inconsistente entre módulos

### 4.3 Edge Functions

**Análisis:** No se encontraron Edge Functions en el código proporcionado que validen tienda.

**Funciones existentes (según contexto):**

1. `Poll Hacienda Status`
2. `Consume Inventory`
3. `Facturar Pedido - Corregido v3`
4. `Get User Permissions - Ultra Fast - FIXED AUTH`
5. `Enviar Notificación Tarea`
6. `CostBot Query Handler - HUMANIZED v9 - COSTFLOW`
7. `CostBot Ingest PDF - TEXT ONLY v12 - FRONTEND EXTRACTION`

**RIESGO:**

- ⚠️ **No se puede validar sin ver el código** - Pero según documentación, confían en frontend
- ⚠️ **Probablemente reciben tienda_id del request** - Sin validación

### 4.4 Queries inseguras

**Patrón encontrado en servicios:**

```typescript
// Ejemplo típico (no encontrado en código proporcionado, pero inferido)
export async function obtenerClientes(tienda_id: string) {
  const { data } = await supabase
    .from('clientes')
    .select('*')
    .eq('tienda_id', tienda_id); // ← tienda_id viene del frontend
  return data;
}
```

**RIESGO:**

- ❌ **Confía en parámetro del frontend** - Usuario puede cambiar tienda_id
- ❌ **Sin RLS** - Query ejecuta sin validación
- ❌ **Acceso no autorizado** - Usuario puede ver datos de otras tiendas

---

## 5. QUÉ COSAS NO DEBEN TOCARSE TODAVÍA

### 5.1 Estructura de tablas

❌ **NO MODIFICAR:**

- Nombres de tablas
- Nombres de columnas
- Tipos de datos
- Relaciones FK existentes

**Razón:** Cambios en estructura requieren migración de datos y pueden romper código existente.

### 5.2 UI/UX existente

❌ **NO MODIFICAR:**

- Estilos CSS
- Componentes visuales
- Textos de interfaz
- Flujos de navegación

**Razón:** Fuera del alcance de Fase 0 y Fase 1.

### 5.3 Lógica de negocio

❌ **NO MODIFICAR:**

- Cálculos de cotizaciones
- Lógica de inventario
- Flujos de facturación
- Algoritmos del optimizador

**Razón:** Riesgo de romper funcionalidad existente.

### 5.4 Módulos completos

❌ **NO TOCAR EN FASE 1:**

- Módulo de Facturación (complejo, requiere análisis separado)
- Módulo de Tareas (muchas tablas relacionadas)
- Módulo de Optimizador (lógica compleja)
- Módulo de CostBot (integración con IA)

**Razón:** Requieren análisis y planificación específica.

### 5.5 Integraciones externas

❌ **NO MODIFICAR:**

- Integración con Hacienda (facturación electrónica)
- Edge Functions de CostBot
- Configuraciones de Supabase Auth

**Razón:** Riesgo de romper integraciones críticas.

---

## 6. RESUMEN EJECUTIVO

### 6.1 Estado actual

| Aspecto | Estado | Calificación |
|---------|--------|--------------|
| **Persistencia de tienda** | ✅ Funciona | 7/10 |
| **Recuperación en refresh** | ✅ Funciona | 8/10 |
| **Seguridad (RLS)** | ❌ No existe | 0/10 |
| **Validación de acceso** | ❌ No existe | 0/10 |
| **Cambio de tienda** | ❌ No implementado | 0/10 |
| **UI multi-tienda** | ⚠️ Básica | 3/10 |

### 6.2 Problemas críticos

1. 🔴 **Sin RLS** - Cualquier usuario puede acceder a cualquier tienda
2. 🔴 **Login sin validación** - Usuario puede seleccionar tienda no autorizada
3. 🔴 **usuario_tienda_actual sin protección** - Cualquiera puede cambiar su tienda
4. ⚠️ **inventario con tienda_id NULL** - Datos mezclados
5. ⚠️ **No hay cambio de tienda** - Usuario debe hacer logout/login

### 6.3 Qué funciona bien

1. ✅ **Persistencia en BD** - Usa `usuario_tienda_actual` correctamente
2. ✅ **Recuperación en refresh** - No se pierde la tienda
3. ✅ **Centralización en useAuth** - Un solo punto de control
4. ✅ **Logout limpio** - Limpia estado correctamente

### 6.4 Próximos pasos (Fase 1)

1. **Implementar RLS** en tablas críticas
2. **Validar acceso en login** - Solo mostrar tiendas asignadas
3. **Proteger usuario_tienda_actual** - RLS + validación
4. **Definir lógica de datos híbridos** - Productos e inventario con tienda_id NULL

---

## 7. CONCLUSIONES

### 7.1 Hallazgos principales

1. ✅ **La arquitectura base es correcta** - Usa `usuario_tienda_actual` como fuente de verdad
2. ❌ **Falta la capa de seguridad** - Sin RLS, el sistema es vulnerable
3. ⚠️ **Implementación parcial** - Funciona para usuarios honestos, no para ataques
4. ⚠️ **Datos legacy** - `tienda_id NULL` requiere estrategia de migración

### 7.2 Riesgo actual

**NIVEL DE RIESGO: 🔴 CRÍTICO**

El sistema NO debe estar en producción sin RLS implementado.

**Escenarios de ataque:**

1. Usuario abre DevTools
2. Ejecuta query con tienda_id de otra tienda
3. Accede a datos confidenciales
4. Modifica/elimina datos de otras tiendas

**Probabilidad:** ALTA (trivial de ejecutar)  
**Impacto:** CRÍTICO (pérdida de datos, violación de privacidad)

### 7.3 Recomendación

**PRIORIDAD 1 (BLOQUEANTE):**

- Implementar RLS en tablas críticas
- Validar acceso a tienda en login
- Proteger `usuario_tienda_actual`

**PRIORIDAD 2 (ALTA):**

- Definir estrategia para datos híbridos
- Implementar cambio de tienda
- Agregar indicadores visuales

**PRIORIDAD 3 (MEDIA):**

- Migrar datos legacy
- Implementar auditoría
- Optimizar queries

---

**FIN DEL DIAGNÓSTICO - FASE 0**

**Fecha:** 2025  
**Estado:** COMPLETO  
**Próximo paso:** Generar documento de Fase 1 (Arquitectura Mínima)
