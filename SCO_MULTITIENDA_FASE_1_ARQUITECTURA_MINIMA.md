# SCO - FASE 1: ARQUITECTURA MÍNIMA FUNCIONAL

**Sistema:** SCO (Sistema de Costeos OLO)  
**Fecha:** 2025  
**Tipo:** Arquitectura Técnica - Fase 1  
**Propósito:** Definir la arquitectura mínima para multi-tienda funcional y seguro

---

## ⚠️ ADVERTENCIA CRÍTICA

Este documento define las reglas OBLIGATORIAS e INQUEBRANTABLES para Fase 1.

**NINGUNA** implementación que viole estas reglas puede ser considerada válida.  
**NINGÚN** cambio fuera del alcance de Fase 1 está permitido.

---

## 1. FUENTE ÚNICA DE VERDAD

### 1.1 Tabla exacta

**Tabla:** `usuario_tienda_actual`

**Estructura:**

```sql
CREATE TABLE usuario_tienda_actual (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tienda_id UUID NOT NULL REFERENCES tiendas(id) ON DELETE CASCADE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(usuario_id)
);
```

**REGLA FUNDAMENTAL:**

Esta tabla es la **ÚNICA FUENTE DE VERDAD** de la tienda activa del usuario.

### 1.2 Quién escribe

**PERMITIDO escribir:**

1. ✅ **Login (signIn)** - Al autenticarse, el usuario selecciona tienda
2. ✅ **Cambio de tienda** - Usuario cambia de tienda sin hacer logout (futuro)
3. ✅ **Admin** - Puede asignar tienda a usuarios

**PROHIBIDO escribir:**

1. ❌ **Componentes de UI** - NUNCA deben escribir directamente
2. ❌ **Servicios frontend** - NUNCA deben escribir directamente
3. ❌ **Edge Functions** - NUNCA deben escribir (solo leer)

**PATRÓN OBLIGATORIO para escribir:**

```typescript
// ✅ CORRECTO: Solo en useAuth.ts
const signIn = async (email: string, password: string, storeId: string) => {
  // 1. Autenticar usuario
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) return { error };
  
  // 2. VALIDAR que usuario tiene acceso a la tienda
  const { data: acceso } = await supabase
    .from('usuario_tiendas')
    .select('id')
    .eq('usuario_id', data.session.user.id)
    .eq('tienda_id', storeId)
    .eq('activo', true)
    .single();
  
  if (!acceso) {
    return { error: { message: 'No tienes acceso a esta tienda' } };
  }
  
  // 3. Guardar tienda activa
  await supabase
    .from('usuario_tienda_actual')
    .upsert({
      usuario_id: data.session.user.id,
      tienda_id: storeId,
      updated_at: new Date().toISOString()
    });
  
  return {};
};
```

### 1.3 Quién lee

**PERMITIDO leer:**

1. ✅ **useAuth.ts** - Al cargar perfil del usuario
2. ✅ **Edge Functions** - Para validar tienda del usuario
3. ✅ **RLS Policies** - Función helper `get_current_user_store()`

**PROHIBIDO leer:**

1. ❌ **Componentes de UI** - Deben usar `useAuth().currentStore`
2. ❌ **Servicios frontend** - Deben confiar en RLS

**PATRÓN OBLIGATORIO para leer:**

```typescript
// ✅ CORRECTO: En useAuth.ts
const loadCurrentStore = async (userId: string) => {
  const { data, error } = await supabase
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
  
  if (error || !data) {
    return null;
  }
  
  return {
    id: data.tiendas.id,
    nombre: data.tiendas.nombre,
    codigo: data.tiendas.codigo
  };
};
```

### 1.4 En qué momento

**MOMENTOS DE LECTURA:**

1. ✅ **Login** - Después de autenticación exitosa
2. ✅ **Refresh (F5)** - Al recuperar sesión
3. ✅ **Cambio de tienda** - Después de actualizar la tabla
4. ✅ **Edge Functions** - En cada request

**MOMENTOS DE ESCRITURA:**

1. ✅ **Login** - Al seleccionar tienda
2. ✅ **Cambio de tienda** - Al cambiar de tienda (futuro)
3. ✅ **Asignación por Admin** - Al asignar tienda a usuario

---

## 2. CONTRATO OBLIGATORIO DE TIENDA

### 2.1 Qué significa "no hay tienda"

**DEFINICIÓN:**

Un usuario **NO tiene tienda** cuando:

1. ❌ `usuario_tienda_actual` no tiene registro para ese usuario
2. ❌ `usuario_tienda_actual.tienda_id` es NULL
3. ❌ La tienda referenciada no existe en `tiendas`
4. ❌ La tienda referenciada tiene `activo = false`
5. ❌ El usuario no tiene acceso a esa tienda en `usuario_tiendas`

**ESTADOS POSIBLES:**

| Estado | Descripción | Acción |
|--------|-------------|--------|
| `null` | No hay tienda cargada | Mostrar loading o bloquear |
| `undefined` | Error al cargar tienda | Mostrar error |
| `Store` | Tienda válida | Permitir operación |

### 2.2 Qué debe pasar si no existe

**REGLA OBLIGATORIA:**

Si no hay tienda válida, el sistema **DEBE BLOQUEAR** toda operación.

**COMPORTAMIENTO OBLIGATORIO:**

```typescript
// ✅ CORRECTO: En componentes
function ClientesPage() {
  const { currentStore, isLoadingStore } = useAuth();
  
  // 1. Mostrar loading mientras carga
  if (isLoadingStore) {
    return <LoadingScreen message="Cargando tienda..." />;
  }
  
  // 2. Bloquear si no hay tienda
  if (!currentStore) {
    return <NoStoreScreen message="Selecciona una tienda para continuar" />;
  }
  
  // 3. Continuar solo si hay tienda válida
  return <ClientesContent />;
}
```

**PROHIBIDO:**

```typescript
// ❌ INCORRECTO: Continuar sin tienda
function ClientesPage() {
  const { currentStore } = useAuth();
  
  // ❌ NO validar y continuar
  return <ClientesContent />;
}

// ❌ INCORRECTO: Usar tienda por defecto
function ClientesPage() {
  const { currentStore } = useAuth();
  const store = currentStore || DEFAULT_STORE; // ❌ PROHIBIDO
  return <ClientesContent />;
}
```

### 2.3 Errores esperados

**ERRORES ESTÁNDAR:**

```typescript
// Definir errores estándar
export class TiendaNoDisponibleError extends Error {
  constructor() {
    super('No hay tienda activa. Por favor selecciona una tienda.');
    this.name = 'TiendaNoDisponibleError';
  }
}

export class AccesoDenegadoError extends Error {
  constructor() {
    super('No tienes acceso a esta tienda.');
    this.name = 'AccesoDenegadoError';
  }
}

export class TiendaInvalidaError extends Error {
  constructor() {
    super('La tienda seleccionada no es válida.');
    this.name = 'TiendaInvalidaError';
  }
}
```

**USO OBLIGATORIO:**

```typescript
// ✅ CORRECTO: Lanzar error específico
async function obtenerClientes() {
  const { currentStore } = useAuth();
  
  if (!currentStore) {
    throw new TiendaNoDisponibleError();
  }
  
  // Continuar con la operación
}
```

---

## 3. PATRÓN MÍNIMO PARA SERVICIOS

### 3.1 Qué deben recibir

**REGLA OBLIGATORIA:**

Los servicios **NO DEBEN** recibir `tienda_id` como parámetro.

**PROHIBIDO:**

```typescript
// ❌ INCORRECTO
export async function obtenerClientes(tienda_id: string) {
  const { data } = await supabase
    .from('clientes')
    .select('*')
    .eq('tienda_id', tienda_id); // ❌ Confía en parámetro
  return data;
}
```

**PERMITIDO:**

```typescript
// ✅ CORRECTO
export async function obtenerClientes() {
  // RLS filtra automáticamente por tienda del usuario
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .order('nombre', { ascending: true });
  
  if (error) throw error;
  return data;
}
```

### 3.2 Qué deben validar

**VALIDACIONES OBLIGATORIAS:**

1. ✅ **Validar que hay sesión** - Supabase lo hace automáticamente
2. ✅ **Confiar en RLS** - RLS filtra por tienda automáticamente
3. ✅ **Manejar errores** - Capturar y propagar errores

**PATRÓN OBLIGATORIO:**

```typescript
// ✅ CORRECTO: Servicio completo
export async function obtenerClientes(): Promise<Cliente[]> {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('nombre', { ascending: true });
    
    if (error) {
      // Detectar error de RLS (sin tienda)
      if (error.code === 'PGRST301') {
        throw new TiendaNoDisponibleError();
      }
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('[QUERY][clientes] Error:', error);
    throw error;
  }
}

export async function crearCliente(datos: ClienteInput): Promise<Cliente> {
  try {
    // RLS automáticamente asigna tienda_id del usuario
    const { data, error } = await supabase
      .from('clientes')
      .insert(datos)
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST301') {
        throw new TiendaNoDisponibleError();
      }
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('[QUERY][clientes] Error al crear:', error);
    throw error;
  }
}
```

### 3.3 Qué NO deben aceptar

**PROHIBIDO ABSOLUTAMENTE:**

1. ❌ **Recibir `tienda_id` como parámetro**
2. ❌ **Recibir `currentStore` como parámetro**
3. ❌ **Leer `tienda_id` de localStorage**
4. ❌ **Usar tienda por defecto**

**EJEMPLOS PROHIBIDOS:**

```typescript
// ❌ PROHIBIDO: Recibir tienda_id
export async function obtenerClientes(tienda_id: string) { }

// ❌ PROHIBIDO: Recibir currentStore
export async function obtenerClientes(currentStore: Store) { }

// ❌ PROHIBIDO: Leer de localStorage
export async function obtenerClientes() {
  const tienda_id = localStorage.getItem('currentStore');
  // ...
}

// ❌ PROHIBIDO: Usar tienda por defecto
export async function obtenerClientes() {
  const tienda_id = DEFAULT_STORE_ID;
  // ...
}
```

---

## 4. PATRÓN MÍNIMO PARA EDGE FUNCTIONS

### 4.1 Validación obligatoria de tienda

**TEMPLATE OBLIGATORIO:**

```typescript
// supabase/functions/nombre-funcion/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // 1. MANEJAR CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 2. CREAR CLIENTE SUPABASE
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // 3. VALIDAR SESIÓN (OBLIGATORIO)
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ 
          error: 'NO_AUTENTICADO', 
          message: 'Usuario no autenticado' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 4. OBTENER TIENDA ACTIVA DESDE BD (OBLIGATORIO)
    const { data: tiendaData, error: tiendaError } = await supabaseClient
      .from('usuario_tienda_actual')
      .select('tienda_id')
      .eq('usuario_id', user.id)
      .single();

    if (tiendaError || !tiendaData || !tiendaData.tienda_id) {
      return new Response(
        JSON.stringify({ 
          error: 'TIENDA_NO_DISPONIBLE', 
          message: 'No hay tienda activa para este usuario' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const tienda_id = tiendaData.tienda_id;

    // 5. VALIDAR ACCESO A LA TIENDA (OBLIGATORIO)
    const { data: accesoData, error: accesoError } = await supabaseClient
      .from('usuario_tiendas')
      .select('id')
      .eq('usuario_id', user.id)
      .eq('tienda_id', tienda_id)
      .eq('activo', true)
      .single();

    if (accesoError || !accesoData) {
      return new Response(
        JSON.stringify({ 
          error: 'ACCESO_DENEGADO', 
          message: 'Usuario no tiene acceso a esta tienda' 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 6. LÓGICA DE NEGOCIO
    // Todas las queries automáticamente filtran por tienda gracias a RLS
    const { data, error } = await supabaseClient
      .from('nombre_tabla')
      .select('*');
      // NO es necesario agregar .eq('tienda_id', tienda_id)
      // RLS lo hace automáticamente

    if (error) throw error;

    // 7. RESPUESTA EXITOSA
    return new Response(
      JSON.stringify({ success: true, data }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[ERROR]', error);
    return new Response(
      JSON.stringify({ 
        error: 'ERROR_INTERNO', 
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
```

### 4.2 Qué está prohibido recibir desde frontend

**PROHIBIDO ABSOLUTAMENTE:**

```typescript
// ❌ PROHIBIDO: Recibir tienda_id del request
const body = await req.json();
const { tienda_id } = body; // ❌ NUNCA HACER ESTO

// ❌ PROHIBIDO: Usar tienda_id del header
const tienda_id = req.headers.get('X-Tienda-ID'); // ❌ NUNCA HACER ESTO

// ❌ PROHIBIDO: Usar tienda_id del query param
const url = new URL(req.url);
const tienda_id = url.searchParams.get('tienda_id'); // ❌ NUNCA HACER ESTO
```

**PERMITIDO:**

```typescript
// ✅ CORRECTO: Obtener tienda desde BD
const { data: tiendaData } = await supabaseClient
  .from('usuario_tienda_actual')
  .select('tienda_id')
  .eq('usuario_id', user.id)
  .single();

const tienda_id = tiendaData.tienda_id;
```

### 4.3 Cómo deben fallar si no hay tienda válida

**RESPUESTAS ESTÁNDAR:**

```typescript
// 1. Usuario no autenticado
return new Response(
  JSON.stringify({ 
    error: 'NO_AUTENTICADO', 
    message: 'Usuario no autenticado',
    code: 401
  }),
  { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);

// 2. No hay tienda activa
return new Response(
  JSON.stringify({ 
    error: 'TIENDA_NO_DISPONIBLE', 
    message: 'No hay tienda activa para este usuario',
    code: 400
  }),
  { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);

// 3. Usuario no tiene acceso a la tienda
return new Response(
  JSON.stringify({ 
    error: 'ACCESO_DENEGADO', 
    message: 'Usuario no tiene acceso a esta tienda',
    code: 403
  }),
  { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);

// 4. Error interno
return new Response(
  JSON.stringify({ 
    error: 'ERROR_INTERNO', 
    message: error.message,
    code: 500
  }),
  { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);
```

---

## 5. CAMBIOS PERMITIDOS EN FASE 1

### 5.1 ✅ PERMITIDO

**Base de Datos:**

1. ✅ Agregar RLS a tablas críticas
2. ✅ Crear función `get_current_user_store()`
3. ✅ Crear políticas de RLS
4. ✅ Agregar índices para performance

**Backend:**

1. ✅ Modificar Edge Functions para validar tienda
2. ✅ Agregar validación de acceso en login
3. ✅ Crear funciones helper de RLS

**Frontend:**

1. ✅ Modificar `useAuth.ts` para validar acceso
2. ✅ Modificar `LoginPage.tsx` para mostrar solo tiendas asignadas
3. ✅ Agregar validación de tienda en componentes críticos
4. ✅ Crear componentes de error (NoStoreScreen, LoadingScreen)

**Servicios:**

1. ✅ Eliminar parámetro `tienda_id` de servicios
2. ✅ Agregar manejo de errores estándar
3. ✅ Confiar en RLS para filtrado

### 5.2 ❌ PROHIBIDO

**Base de Datos:**

1. ❌ Cambiar nombres de tablas
2. ❌ Cambiar nombres de columnas
3. ❌ Eliminar columnas existentes
4. ❌ Cambiar tipos de datos
5. ❌ Eliminar relaciones FK

**UI/UX:**

1. ❌ Cambiar estilos CSS
2. ❌ Cambiar textos de interfaz
3. ❌ Cambiar flujos de navegación
4. ❌ Agregar nuevas páginas
5. ❌ Modificar componentes visuales

**Lógica de Negocio:**

1. ❌ Cambiar cálculos de cotizaciones
2. ❌ Cambiar lógica de inventario
3. ❌ Cambiar flujos de facturación
4. ❌ Cambiar algoritmos del optimizador

**Módulos Completos:**

1. ❌ Refactorizar módulo de Facturación
2. ❌ Refactorizar módulo de Tareas
3. ❌ Refactorizar módulo de Optimizador
4. ❌ Refactorizar módulo de CostBot

**Integraciones:**

1. ❌ Modificar integración con Hacienda
2. ❌ Modificar Edge Functions de CostBot
3. ❌ Cambiar configuración de Supabase Auth

---

## 6. ALCANCE EXACTO DE FASE 1

### 6.1 Objetivos de Fase 1

**OBJETIVO PRINCIPAL:**

Implementar la capa de seguridad mínima para que el sistema multi-tienda sea funcional y seguro.

**OBJETIVOS ESPECÍFICOS:**

1. ✅ Implementar RLS en tablas críticas
2. ✅ Validar acceso a tienda en login
3. ✅ Proteger `usuario_tienda_actual`
4. ✅ Actualizar Edge Functions críticas
5. ✅ Eliminar parámetro `tienda_id` de servicios críticos

### 6.2 Tablas críticas para Fase 1

**PRIORIDAD 1 (BLOQUEANTE):**

1. ✅ `usuario_tienda_actual` - Proteger tienda activa
2. ✅ `clientes` - Datos personales
3. ✅ `cotizaciones` - Información comercial
4. ✅ `pedidos` - Información comercial
5. ✅ `inventario` - Datos de stock

**PRIORIDAD 2 (ALTA):**

6. ✅ `cotizacion_items` - Items de cotización
7. ✅ `pedido_items` - Items de pedido
8. ✅ `inventario_movimientos` - Historial de inventario
9. ✅ `inventario_niveles` - Niveles de stock

**PRIORIDAD 3 (MEDIA - Fase 2):**

10. ⏳ `facturas_electronicas` - Facturación (Fase 2)
11. ⏳ `factura_items` - Items de factura (Fase 2)
12. ⏳ `tareas` - Tareas (Fase 2)
13. ⏳ `optimizador_proyectos_temp` - Optimizador (Fase 2)

### 6.3 Edge Functions críticas para Fase 1

**PRIORIDAD 1:**

1. ✅ `Get User Permissions` - Ya validada (según código)
2. ✅ `Consume Inventory` - Crítica para inventario
3. ✅ `Facturar Pedido` - Crítica para facturación

**PRIORIDAD 2 (Fase 2):**

4. ⏳ `Poll Hacienda Status` - Facturación (Fase 2)
5. ⏳ `Enviar Notificación Tarea` - Tareas (Fase 2)
6. ⏳ `CostBot Query Handler` - CostBot (Fase 2)
7. ⏳ `CostBot Ingest PDF` - CostBot (Fase 2)

### 6.4 Servicios críticos para Fase 1

**PRIORIDAD 1:**

1. ✅ `clienteService.ts` - Clientes
2. ✅ `cotizacionService.ts` - Cotizaciones
3. ✅ `pedidoService.ts` - Pedidos
4. ✅ `productosService.ts` - Productos (inventario)

**PRIORIDAD 2 (Fase 2):**

5. ⏳ `haciendaService.ts` - Facturación (Fase 2)
6. ⏳ `tareaService.ts` - Tareas (Fase 2)
7. ⏳ `optimizadorService.ts` - Optimizador (Fase 2)

---

## 7. CRITERIOS DE VALIDACIÓN DE FASE 1

### 7.1 Checklist técnico

**RLS:**

- [ ] Función `get_current_user_store()` creada
- [ ] RLS habilitado en `usuario_tienda_actual`
- [ ] RLS habilitado en `clientes`
- [ ] RLS habilitado en `cotizaciones`
- [ ] RLS habilitado en `pedidos`
- [ ] RLS habilitado en `inventario`
- [ ] Políticas de SELECT creadas
- [ ] Políticas de INSERT creadas
- [ ] Políticas de UPDATE creadas
- [ ] Políticas de DELETE creadas

**Login:**

- [ ] `getAvailableStores()` filtra por usuario
- [ ] `signIn()` valida acceso a tienda
- [ ] Error si usuario no tiene acceso
- [ ] UPSERT solo si validación exitosa

**Edge Functions:**

- [ ] Template aplicado a funciones críticas
- [ ] Validación de sesión implementada
- [ ] Obtención de tienda desde BD
- [ ] Validación de acceso implementada
- [ ] Respuestas de error estándar

**Servicios:**

- [ ] Parámetro `tienda_id` eliminado
- [ ] Manejo de errores estándar
- [ ] Logs implementados

**Componentes:**

- [ ] Validación de `currentStore` en páginas críticas
- [ ] Loading state mientras carga tienda
- [ ] Error state si no hay tienda

### 7.2 Tests manuales

**Test 1: Login con tienda válida**

```
1. Usuario abre /login
2. Ve solo tiendas asignadas en dropdown
3. Selecciona tienda
4. Ingresa credenciales
5. Login exitoso
6. Redirige a /dashboard
7. currentStore está disponible
```

**Test 2: Login con tienda no asignada**

```
1. Usuario intenta hacer login con tienda no asignada (vía DevTools)
2. Sistema rechaza con error "No tienes acceso a esta tienda"
3. No se guarda en usuario_tienda_actual
4. Usuario permanece en /login
```

**Test 3: Acceso a datos de otra tienda (DevTools)**

```
1. Usuario autenticado con tienda A
2. Abre DevTools
3. Ejecuta query con tienda_id de tienda B
4. RLS bloquea la query
5. No retorna datos
```

**Test 4: Modificar usuario_tienda_actual (DevTools)**

```
1. Usuario autenticado con tienda A
2. Abre DevTools
3. Intenta UPDATE en usuario_tienda_actual con tienda B
4. RLS bloquea la operación
5. Tienda activa no cambia
```

**Test 5: Refresh (F5)**

```
1. Usuario autenticado con tienda A
2. Hace F5
3. Sistema recupera tienda desde BD
4. currentStore se restaura
5. Usuario continúa en la misma tienda
```

**Test 6: Edge Function sin tienda**

```
1. Usuario sin tienda asignada
2. Llama a Edge Function
3. Edge Function retorna error 400
4. Mensaje: "No hay tienda activa para este usuario"
```

**Test 7: Servicio sin tienda**

```
1. Usuario sin tienda asignada
2. Llama a servicio (ej: obtenerClientes)
3. RLS bloquea la query
4. Servicio lanza TiendaNoDisponibleError
5. UI muestra mensaje de error
```

### 7.3 Indicadores de éxito

**FASE 1 COMPLETA cuando:**

1. ✅ RLS implementado en 5 tablas críticas
2. ✅ Login valida acceso a tienda
3. ✅ usuario_tienda_actual protegida con RLS
4. ✅ 3 Edge Functions críticas actualizadas
5. ✅ 4 servicios críticos sin parámetro tienda_id
6. ✅ Todos los tests manuales pasan
7. ✅ No hay errores en consola
8. ✅ Sistema funciona para usuarios honestos
9. ✅ Sistema bloquea ataques básicos (DevTools)

**MÉTRICAS:**

- **Cobertura RLS:** 5/5 tablas críticas (100%)
- **Edge Functions:** 3/3 críticas actualizadas (100%)
- **Servicios:** 4/4 críticos actualizados (100%)
- **Tests:** 7/7 tests manuales pasan (100%)

---

## 8. ORDEN DE IMPLEMENTACIÓN

### 8.1 Paso 1: Base de Datos (RLS)

**Duración estimada:** 2-3 horas

**Tareas:**

1. Crear función `get_current_user_store()`
2. Habilitar RLS en `usuario_tienda_actual`
3. Crear políticas para `usuario_tienda_actual`
4. Habilitar RLS en `clientes`
5. Crear políticas para `clientes`
6. Habilitar RLS en `cotizaciones` y `cotizacion_items`
7. Crear políticas para cotizaciones
8. Habilitar RLS en `pedidos` y `pedido_items`
9. Crear políticas para pedidos
10. Habilitar RLS en `inventario`
11. Crear políticas para inventario

**Validación:**

```sql
-- Verificar que RLS está habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('usuario_tienda_actual', 'clientes', 'cotizaciones', 'pedidos', 'inventario');

-- Resultado esperado: rowsecurity = true para todas
```

### 8.2 Paso 2: Login (Validación de acceso)

**Duración estimada:** 1-2 horas

**Tareas:**

1. Modificar `getAvailableStores()` en `useAuth.ts`
2. Agregar validación de acceso en `signIn()`
3. Actualizar `LoginPage.tsx` (si es necesario)
4. Probar login con tienda válida
5. Probar login con tienda no asignada

**Validación:**

- Usuario solo ve tiendas asignadas
- Login rechaza tienda no asignada
- Error claro si no tiene acceso

### 8.3 Paso 3: Edge Functions

**Duración estimada:** 2-3 horas

**Tareas:**

1. Actualizar `Consume Inventory`
2. Actualizar `Facturar Pedido`
3. Verificar `Get User Permissions` (ya validada)
4. Probar cada Edge Function
5. Verificar logs

**Validación:**

- Edge Functions validan tienda
- Rechazan si no hay tienda
- Logs claros en consola

### 8.4 Paso 4: Servicios Frontend

**Duración estimada:** 2-3 horas

**Tareas:**

1. Actualizar `clienteService.ts`
2. Actualizar `cotizacionService.ts`
3. Actualizar `pedidoService.ts`
4. Actualizar `productosService.ts`
5. Probar cada servicio

**Validación:**

- Servicios no reciben `tienda_id`
- Confían en RLS
- Manejan errores correctamente

### 8.5 Paso 5: Componentes (Validación UI)

**Duración estimada:** 1-2 horas

**Tareas:**

1. Agregar validación en `ClientesPage`
2. Agregar validación en `CotizacionesPage`
3. Agregar validación en `PedidosPage`
4. Agregar validación en `InventarioPage`
5. Crear `NoStoreScreen` component
6. Crear `LoadingScreen` component

**Validación:**

- Páginas bloquean sin tienda
- Loading state visible
- Error state claro

### 8.6 Paso 6: Tests y Validación

**Duración estimada:** 1-2 horas

**Tareas:**

1. Ejecutar 7 tests manuales
2. Verificar logs en consola
3. Probar con DevTools
4. Probar con Postman
5. Documentar resultados

**Validación:**

- Todos los tests pasan
- No hay errores en consola
- Sistema bloquea ataques

---

## 9. RESUMEN EJECUTIVO

### 9.1 Alcance de Fase 1

**QUÉ SE HACE:**

1. ✅ RLS en 5 tablas críticas
2. ✅ Validación de acceso en login
3. ✅ Protección de usuario_tienda_actual
4. ✅ Actualización de 3 Edge Functions críticas
5. ✅ Actualización de 4 servicios críticos
6. ✅ Validación en componentes críticos

**QUÉ NO SE HACE:**

1. ❌ RLS en todas las tablas (solo críticas)
2. ❌ Cambio de tienda sin logout (Fase 2)
3. ❌ Migración de datos legacy (Fase 2)
4. ❌ Indicadores visuales de tienda (Fase 2)
5. ❌ Auditoría completa (Fase 2)

### 9.2 Tiempo estimado

**TOTAL:** 9-15 horas

- Paso 1 (RLS): 2-3 horas
- Paso 2 (Login): 1-2 horas
- Paso 3 (Edge Functions): 2-3 horas
- Paso 4 (Servicios): 2-3 horas
- Paso 5 (Componentes): 1-2 horas
- Paso 6 (Tests): 1-2 horas

### 9.3 Riesgos

**RIESGO BAJO:**

- RLS puede romper queries existentes
- Usuarios sin tienda asignada quedarán bloqueados
- Edge Functions pueden fallar si no tienen tienda

**MITIGACIÓN:**

- Probar en ambiente de desarrollo primero
- Asignar tiendas a todos los usuarios antes de deploy
- Logs claros para debugging

### 9.4 Criterio de éxito

**FASE 1 ES EXITOSA SI:**

1. ✅ Sistema funciona para usuarios honestos
2. ✅ Sistema bloquea ataques básicos (DevTools)
3. ✅ No hay errores en consola
4. ✅ Todos los tests manuales pasan
5. ✅ RLS implementado en tablas críticas
6. ✅ Login valida acceso correctamente

---

**FIN DE FASE 1 - ARQUITECTURA MÍNIMA**

**Fecha:** 2025  
**Estado:** COMPLETO  
**Próximo paso:** Implementar Fase 1 según este documento
