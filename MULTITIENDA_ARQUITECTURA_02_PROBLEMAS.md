# 2️⃣ Problemas Detectados - Multi-Tienda SCO

> Análisis de vulnerabilidades, riesgos y problemas actuales del sistema multi-tienda

---

## 📋 Índice

1. [Seguridad Crítica](#1-seguridad-crítica)
2. [Persistencia de Tienda](#2-persistencia-de-tienda)
3. [Inconsistencias en Servicios](#3-inconsistencias-en-servicios)
4. [UX/UI](#4-uxui)
5. [Resumen de Riesgos](#5-resumen-de-riesgos)

---

## 1. Seguridad Crítica

### 🔴 Problema 1: Sin RLS - Vulnerabilidad Crítica

#### Descripción del Problema

Actualmente, las tablas NO tienen políticas de Row Level Security (RLS) activas. Esto significa que la seguridad depende 100% del frontend.

#### Código Vulnerable

```typescript
// Frontend envía tienda_id
const { data } = await supabase
  .from('clientes')
  .select('*')
  .eq('tienda_id', currentStore.id); // ← Controlado por el cliente
```

#### Ataque Posible

Un usuario malicioso puede abrir DevTools o usar Postman:

```javascript
// Desde DevTools o Postman
const { data } = await supabase
  .from('clientes')
  .select('*')
  .eq('tienda_id', '999'); // ← Acceso a otra tienda

// O peor aún, sin filtro:
const { data } = await supabase
  .from('clientes')
  .select('*'); // ← Ve TODOS los clientes de TODAS las tiendas
```

#### Impacto

- ✅ Usuario autenticado puede ver datos de CUALQUIER tienda
- ✅ Puede modificar/eliminar datos de otras tiendas
- ✅ Puede extraer información confidencial
- ✅ Violación de privacidad entre clientes
- ✅ Incumplimiento de normativas de protección de datos

#### Severidad

🔴 **CRÍTICA** - Debe resolverse INMEDIATAMENTE

#### Solución

Implementar RLS en todas las tablas (ver documento 05_RLS):

```sql
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clientes_por_tienda"
ON clientes FOR ALL
USING (tienda_id = (auth.jwt() ->> 'tienda_id')::uuid)
WITH CHECK (tienda_id = (auth.jwt() ->> 'tienda_id')::uuid);
```

---

### 🔴 Problema 2: Edge Functions Sin Validación

#### Descripción del Problema

Las Edge Functions actuales reciben `tienda_id` del body del request y NO validan que el usuario tenga acceso a esa tienda.

#### Código Vulnerable

```typescript
// Edge Function actual
const { tienda_id, pedido_id } = await req.json();

// NO valida que el usuario tenga acceso a esa tienda
const { data } = await supabase
  .from('pedidos')
  .select('*')
  .eq('tienda_id', tienda_id); // ← Confía en el cliente
```

#### Ataque Posible

```javascript
// Atacante con token válido
fetch('https://xxx.supabase.co/functions/v1/facturar-pedido', {
  method: 'POST',
  headers: { 
    'Authorization': 'Bearer VALID_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    pedido_id: 123,
    tienda_id: '999' // ← Tienda de otro cliente
  })
});
```

#### Impacto

- ✅ Facturar pedidos de otras tiendas
- ✅ Consumir inventario de otras tiendas
- ✅ Acceder a datos sensibles de otras tiendas
- ✅ Modificar configuraciones de otras tiendas

#### Edge Functions Afectadas

1. `facturar-pedido` - Puede facturar pedidos de cualquier tienda
2. `consume-inventory` - Puede consumir inventario de cualquier tienda
3. `costbot-query` - Puede buscar en documentos de cualquier tienda
4. `poll-hacienda-status` - Puede consultar facturas de cualquier tienda
5. `enviar-notificacion-tarea` - Puede enviar notificaciones de cualquier tienda

#### Severidad

🔴 **CRÍTICA** - Debe resolverse INMEDIATAMENTE

#### Solución

Validar tienda en cada Edge Function:

```typescript
// 1. Obtener usuario del token
const { data: { user } } = await supabase.auth.getUser(token);

// 2. Obtener tienda del usuario desde BD (FUENTE DE VERDAD)
const { data: userStore } = await supabase
  .from('usuario_tienda_actual')
  .select('tienda_id')
  .eq('usuario_id', user.id)
  .single();

// 3. Validar que el tienda_id del request coincida
if (requestBody.tienda_id !== userStore.tienda_id) {
  return new Response('Forbidden', { status: 403 });
}

// 4. Usar tienda de BD, NO del request
const { data } = await supabase
  .from('pedidos')
  .select('*')
  .eq('tienda_id', userStore.tienda_id); // ← Usar tienda de BD
```

---

## 2. Persistencia de Tienda

### ⚠️ Problema 3: Pérdida de Contexto al Recargar

#### Descripción del Problema

`currentStore` vive en React Context (memoria). Al recargar la página (F5), se pierde el estado y debe volver a consultar `usuario_tienda_actual`.

#### Flujo Actual

```
Usuario trabaja en Tienda A
    ↓
Presiona F5 (recargar)
    ↓
React Context se resetea
    ↓
currentStore = null (temporalmente)
    ↓
useAuth consulta usuario_tienda_actual
    ↓
currentStore se restaura
```

#### Impacto

- ⚠️ Delay de 200-500ms en carga inicial
- ⚠️ Pantalla en blanco mientras carga
- ⚠️ Posible inconsistencia si cambió en otra pestaña
- ⚠️ Mala experiencia de usuario

#### Severidad

🟡 **MEDIA** - No es crítico pero afecta UX

#### Solución

Opción 1: Cachear en localStorage (con validación):

```typescript
// Al cargar tienda
localStorage.setItem('currentStoreId', store.id);

// Al iniciar app
const cachedStoreId = localStorage.getItem('currentStoreId');
if (cachedStoreId) {
  // Validar que siga siendo válida
  const { data } = await supabase
    .from('usuario_tienda_actual')
    .select('tienda_id')
    .eq('usuario_id', user.id)
    .single();
  
  if (data?.tienda_id === cachedStoreId) {
    // Usar caché
  } else {
    // Caché inválida, limpiar
    localStorage.removeItem('currentStoreId');
  }
}
```

Opción 2: JWT Custom Claims (recomendado):

```typescript
// Inyectar tienda_id en el JWT
// Leer directamente del token sin consultar BD
const token = await supabase.auth.getSession();
const tiendaId = token.user.user_metadata.tienda_id;
```

---

### ⚠️ Problema 4: Cambio de Tienda Sin Limpiar Estado

#### Descripción del Problema

Al cambiar de tienda, el estado en memoria (React Query cache, estados locales) sigue siendo de la tienda anterior.

#### Código Problemático

```typescript
// Usuario cambia de tienda
setCurrentStore(newStore);

// Pero los datos en memoria siguen siendo de la tienda anterior:
// - React Query cache
// - Estados locales (useState)
// - Datos en componentes
```

#### Impacto

- ⚠️ Mezcla de datos entre tiendas
- ⚠️ Bugs difíciles de reproducir
- ⚠️ Datos incorrectos mostrados al usuario
- ⚠️ Posibles errores en operaciones

#### Ejemplo de Bug

```
Usuario está en Tienda A
    ↓
Ve lista de clientes de Tienda A (en caché)
    ↓
Cambia a Tienda B
    ↓
Sigue viendo clientes de Tienda A (caché no limpiada)
    ↓
Crea nuevo cliente pensando que está en Tienda B
    ↓
Cliente se crea en Tienda B pero ve lista de Tienda A
    ↓
Confusión total
```

#### Severidad

🟡 **ALTA** - Puede causar errores graves

#### Solución

Limpiar TODO el estado al cambiar tienda:

```typescript
const changeStore = async (newStoreId: string) => {
  // 1. Actualizar BD
  await updateCurrentStore(newStoreId);
  
  // 2. Limpiar caché de React Query
  queryClient.clear();
  
  // 3. Resetear estados locales
  // (difícil de hacer manualmente)
  
  // 4. Solución simple: recargar página
  window.location.reload();
};
```

---

## 3. Inconsistencias en Servicios

### ⚠️ Problema 5: Validación Inconsistente

#### Descripción del Problema

Algunos servicios validan que `currentStore` exista, otros NO.

#### Código Inconsistente

**Servicio que SÍ valida:**

```typescript
export const getClientes = async (currentStore: CurrentStore | null) => {
  if (!currentStore) {
    throw new Error('No hay tienda seleccionada');
  }
  
  const { data } = await supabase
    .from('clientes')
    .select('*')
    .eq('tienda_id', currentStore.id);
  
  return data;
};
```

**Servicio que NO valida:**

```typescript
export const getProductos = async (currentStore: CurrentStore | null) => {
  // ❌ No valida currentStore
  const { data } = await supabase
    .from('productos')
    .select('*')
    .eq('tienda_id', currentStore.id); // ← Puede ser null → Error
  
  return data;
};
```

#### Impacto

- ⚠️ Errores inesperados en runtime
- ⚠️ Mensajes de error poco claros
- ⚠️ Difícil de depurar
- ⚠️ Inconsistencia en comportamiento

#### Servicios Afectados

Revisar todos los servicios en:
- `src/services/clienteService.ts`
- `src/services/cotizacionService.ts`
- `src/services/pedidoService.ts`
- `src/services/productosService.ts`
- `src/services/dashboardService.ts`
- `src/services/mantenimientoService.ts`
- `src/services/optimizadorService.ts`
- `src/services/seguimientoService.ts`
- `src/services/tareaService.ts`

#### Severidad

🟡 **MEDIA** - Afecta estabilidad

#### Solución

Estandarizar validación en TODOS los servicios:

```typescript
// Helper function
const requireStore = (currentStore: CurrentStore | null): CurrentStore => {
  if (!currentStore) {
    throw new Error('[STORE] No hay tienda seleccionada');
  }
  return currentStore;
};

// Usar en todos los servicios
export const getProductos = async (currentStore: CurrentStore | null) => {
  const store = requireStore(currentStore); // ← Validación obligatoria
  
  const { data } = await supabase
    .from('productos')
    .select('*')
    .eq('tienda_id', store.id);
  
  return data;
};
```

---

### ⚠️ Problema 6: Catálogos Globales vs Por Tienda

#### Descripción del Problema

No hay regla clara sobre qué tablas son globales y cuáles son por tienda.

#### Ejemplos Ambiguos

**¿`categorias` es global o por tienda?**

```typescript
// Opción 1: Global (sin tienda_id)
INSERT INTO categorias (nombre) VALUES ('Madera');

// Opción 2: Por tienda (con tienda_id)
INSERT INTO categorias (nombre, tienda_id) VALUES ('Madera', 'tienda-1');

// Opción 3: Híbrido (tienda_id nullable)
INSERT INTO categorias (nombre, tienda_id) VALUES ('Madera', NULL); -- Global
INSERT INTO categorias (nombre, tienda_id) VALUES ('Madera Premium', 'tienda-1'); -- Por tienda
```

**¿`unidades_medida` es global o por tienda?**

Actualmente es global, pero ¿debería permitir unidades personalizadas por tienda?

#### Impacto

- ⚠️ Confusión en desarrollo
- ⚠️ Queries incorrectas
- ⚠️ Filtros mal aplicados
- ⚠️ Datos duplicados o inconsistentes

#### Severidad

🟢 **BAJA** - Pero debe definirse claramente

#### Solución

Definir regla clara en documentación (ver documento 03_ARQUITECTURA_OBJETIVO):

**Tablas Globales (sin tienda_id):**
- Geografía (provincias, cantones, distritos)
- Actividades económicas
- Unidades de medida estándar
- Tipos de códigos de barras

**Tablas Por Tienda (con tienda_id NOT NULL):**
- Clientes
- Productos
- Inventario
- Cotizaciones
- Pedidos
- Facturas
- Tareas

**Tablas Híbridas (tienda_id nullable):**
- Categorías (pueden ser globales o personalizadas)
- Categorías de inventario

---

## 4. UX/UI

### ⚠️ Problema 7: Sin Indicador Visual de Tienda Activa

#### Descripción del Problema

El usuario no ve claramente qué tienda está usando actualmente.

#### Impacto

- ⚠️ Confusión al tener múltiples pestañas abiertas
- ⚠️ Puede realizar operaciones en tienda incorrecta
- ⚠️ Difícil de identificar en qué contexto está trabajando

#### Severidad

🟡 **MEDIA** - Afecta UX

#### Solución

Agregar indicador visual en TopBar o Sidebar:

```typescript
<div className="flex items-center gap-2 px-3 py-1.5 bg-teal-50 border border-teal-200 rounded-lg">
  <i className="ri-store-2-line text-teal-600"></i>
  <span className="text-sm font-medium text-teal-700">
    {currentStore.nombre}
  </span>
  <span className="text-xs text-teal-500">
    ({currentStore.codigo})
  </span>
</div>
```

---

### ⚠️ Problema 8: Sin Bloqueo de Navegación Sin Tienda

#### Descripción del Problema

Si `currentStore` es null, el usuario puede navegar a páginas que requieren tienda. Las páginas fallan al intentar cargar datos.

#### Flujo Problemático

```
Usuario hace login
    ↓
No tiene tiendas asignadas
    ↓
currentStore = null
    ↓
Puede navegar a /clientes
    ↓
Página intenta cargar clientes
    ↓
Error: "No hay tienda seleccionada"
    ↓
Pantalla rota
```

#### Impacto

- ⚠️ Errores en runtime
- ⚠️ Pantallas rotas
- ⚠️ Mala experiencia de usuario
- ⚠️ Confusión sobre qué hacer

#### Severidad

🟡 **ALTA** - Afecta UX crítico

#### Solución

Implementar ProtectedRoute que valide tienda:

```typescript
export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, currentStore, loading } = useAuth();

  if (loading) {
    return <StoreLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!currentStore) {
    return <Navigate to="/pending-store" replace />;
  }

  return <>{children}</>;
};
```

---

## 5. Resumen de Riesgos

### Tabla de Riesgos

| # | Problema | Severidad | Impacto | Prioridad |
|---|----------|-----------|---------|-----------|
| 1 | Sin RLS | 🔴 CRÍTICA | Fuga de datos entre tiendas | P0 - INMEDIATO |
| 2 | Edge Functions sin validación | 🔴 CRÍTICA | Acceso no autorizado | P0 - INMEDIATO |
| 3 | Pérdida de contexto al recargar | 🟡 MEDIA | Delay en carga | P2 - Semana 2 |
| 4 | Cambio de tienda sin limpiar | 🟡 ALTA | Mezcla de datos | P1 - Semana 1 |
| 5 | Validación inconsistente | 🟡 MEDIA | Errores inesperados | P1 - Semana 1 |
| 6 | Catálogos ambiguos | 🟢 BAJA | Confusión | P3 - Semana 3 |
| 7 | Sin indicador visual | 🟡 MEDIA | Confusión de usuario | P2 - Semana 2 |
| 8 | Sin bloqueo de navegación | 🟡 ALTA | Pantallas rotas | P1 - Semana 1 |

### Priorización

**P0 - INMEDIATO (Semana 1):**
- Problema 1: Implementar RLS
- Problema 2: Validar Edge Functions

**P1 - CRÍTICO (Semana 1):**
- Problema 4: Limpiar estado al cambiar tienda
- Problema 5: Estandarizar validaciones
- Problema 8: Bloquear navegación sin tienda

**P2 - ALTO (Semana 2):**
- Problema 3: Mejorar persistencia
- Problema 7: Agregar indicador visual

**P3 - MEDIO (Semana 3):**
- Problema 6: Definir catálogos

---

## 📊 Impacto por Módulo

### Módulos Más Afectados

1. **Facturación** - Riesgo de facturar pedidos de otras tiendas
2. **Inventario** - Riesgo de consumir inventario de otras tiendas
3. **Clientes** - Riesgo de ver/editar clientes de otras tiendas
4. **Productos** - Riesgo de ver/editar productos de otras tiendas
5. **Cotizaciones** - Riesgo de ver/editar cotizaciones de otras tiendas

### Módulos Menos Afectados

1. **Dashboard** - Solo visualización (pero datos incorrectos)
2. **Seguridad** - Administración global
3. **CostBot** - Búsqueda en documentos (pero puede ver de otras tiendas)

---

## 🎯 Próximos Pasos

1. **Leer:** [03_ARQUITECTURA_OBJETIVO.md](./MULTITIENDA_ARQUITECTURA_03_ARQUITECTURA_OBJETIVO.md)
2. **Implementar:** [05_RLS.md](./MULTITIENDA_ARQUITECTURA_05_RLS.md)
3. **Validar:** [10_PLAN_IMPLEMENTACION.md](./MULTITIENDA_ARQUITECTURA_10_PLAN_IMPLEMENTACION.md)

---

**Documento:** 02_PROBLEMAS  
**Versión:** 1.0  
**Última actualización:** Enero 2025
