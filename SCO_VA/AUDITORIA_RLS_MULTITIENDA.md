# 🔒 AUDITORÍA RLS MULTI-TIENDA - SISTEMA SCO

**Fecha:** 2025  
**Sistema:** SCO (Sistema de Costeos OLO)  
**Objetivo:** Verificar seguridad multi-tienda y eliminar vulnerabilidades

---

## 📋 RESUMEN EJECUTIVO

### ✅ Estado Actual del Código

**BUENAS NOTICIAS:**
- ✅ El frontend **NO usa service_role key**
- ✅ Solo usa `VITE_PUBLIC_SUPABASE_ANON_KEY` (correcto)
- ✅ Los servicios ya filtran por `currentStore.id`
- ✅ La persistencia de tienda usa `usuario_tienda_actual` (correcto)

**PROBLEMAS DETECTADOS:**
- 🔴 **RLS NO implementado correctamente** (policies débiles o inexistentes)
- 🔴 **FORCE ROW LEVEL SECURITY no habilitado** (permite bypass con postgres role)
- ⚠️ **Servicios confían en parámetro `currentStore`** (debe ser validado por RLS)

---

## 🔍 AUDITORÍA DE CÓDIGO

### 1. Cliente Supabase (src/lib/supabase.ts)

**Archivo:** `src/lib/supabase.ts`

```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storage: window.localStorage
  }
});
```

**Análisis:**
- ✅ **CORRECTO:** Usa `supabaseAnonKey` (NO service_role)
- ✅ **CORRECTO:** Configuración estándar para frontend
- ✅ **SEGURO:** No hay bypass de RLS

**Veredicto:** ✅ **SIN CAMBIOS NECESARIOS**

---

### 2. Hook de Autenticación (src/hooks/useAuth.ts)

**Archivo:** `src/hooks/useAuth.ts`

**Función crítica: `loadCurrentStore()`**

```typescript
const loadCurrentStore = useCallback(async (userId: string) => {
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
  
  // ... manejo de respuesta
}, []);
```

**Análisis:**
- ✅ **CORRECTO:** Lee desde `usuario_tienda_actual` (fuente de verdad)
- ✅ **CORRECTO:** Usa `auth.uid()` implícitamente vía sesión
- ⚠️ **ADVERTENCIA:** Esta query funciona porque `usuario_tienda_actual` debe tener RLS que permita leer el propio registro

**Veredicto:** ✅ **SIN CAMBIOS NECESARIOS** (pero requiere RLS en `usuario_tienda_actual`)

---

**Función crítica: `signIn()`**

```typescript
const signIn = async (email: string, password: string, storeId?: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (data.session?.user && storeId) {
    await supabase
      .from('usuario_tienda_actual')
      .upsert({
        usuario_id: data.session.user.id,
        tienda_id: storeId,
        updated_at: new Date().toISOString()
      });
  }
  // ...
};
```

**Análisis:**
- ✅ **CORRECTO:** Guarda tienda en `usuario_tienda_actual`
- 🔴 **PROBLEMA CRÍTICO:** **NO valida que el usuario tenga acceso a esa tienda**
- 🔴 **VULNERABILIDAD:** Un usuario puede seleccionar CUALQUIER tienda en el dropdown

**Veredicto:** 🔴 **REQUIERE CORRECCIÓN**

**Solución requerida:**
```typescript
// ANTES de hacer upsert, validar acceso
const { data: hasAccess } = await supabase
  .from('usuario_tiendas')
  .select('tienda_id')
  .eq('usuario_id', data.session.user.id)
  .eq('tienda_id', storeId)
  .eq('activo', true)
  .single();

if (!hasAccess) {
  throw new Error('No tienes acceso a esta tienda');
}

// AHORA sí hacer upsert
await supabase.from('usuario_tienda_actual').upsert(...);
```

---

### 3. Servicio de Clientes (src/services/clienteService.ts)

**Archivo:** `src/services/clienteService.ts`

**Función: `getClientes()`**

```typescript
export const getClientes = async (filters: ClienteFilters = {}, currentStore: { id: string } | null) => {
  if (!currentStore) {
    return { data: [], error: { message: 'No hay tienda seleccionada' } };
  }

  let query = supabase
    .from('clientes')
    .select('*')
    .eq('tienda_id', currentStore.id); // ⚠️ FILTRO MANUAL
  
  // ...
};
```

**Análisis:**
- ⚠️ **PATRÓN DEFENSIVO:** Filtra manualmente por `currentStore.id`
- ⚠️ **PROBLEMA:** Confía en que `currentStore` es correcto (viene del frontend)
- ⚠️ **REDUNDANTE:** Con RLS correcto, este filtro es innecesario

**Veredicto:** ⚠️ **PUEDE SIMPLIFICARSE** (pero no es urgente)

**Patrón recomendado con RLS:**
```typescript
// CON RLS CORRECTO, NO NECESITAS FILTRAR MANUALMENTE
export const getClientes = async (filters: ClienteFilters = {}) => {
  // RLS filtra automáticamente por tienda actual
  let query = supabase
    .from('clientes')
    .select('*');
  // NO necesitas .eq('tienda_id', currentStore.id)
  
  // ...
};
```

**Beneficios:**
- ✅ Código más simple
- ✅ Imposible olvidar el filtro
- ✅ Seguridad en la base de datos (no en el código)

---

**Función: `createCliente()`**

```typescript
export const createCliente = async (cliente: Omit<Cliente, 'id'>, currentStore: { id: string } | null) => {
  if (!currentStore) {
    return { data: null, error: { message: 'No hay tienda seleccionada' } };
  }

  const { data, error } = await supabase
    .from('clientes')
    .insert([{
      ...cliente,
      tienda_id: currentStore.id // ⚠️ INCLUYE TIENDA_ID MANUALMENTE
    }])
    .select()
    .single();
  
  // ...
};
```

**Análisis:**
- ⚠️ **PATRÓN DEFENSIVO:** Incluye `tienda_id` manualmente
- ⚠️ **PROBLEMA:** Confía en que `currentStore.id` es correcto
- ⚠️ **REDUNDANTE:** Con RLS correcto, la policy INSERT valida automáticamente

**Veredicto:** ⚠️ **PUEDE SIMPLIFICARSE** (pero no es urgente)

**Patrón recomendado con RLS:**
```typescript
// CON RLS CORRECTO, PUEDES INCLUIR tienda_id PERO RLS LO VALIDA
export const createCliente = async (cliente: Omit<Cliente, 'id'>) => {
  // Obtener tienda actual desde BD (no desde parámetro)
  const { data: { user } } = await supabase.auth.getUser();
  const { data: tiendaActual } = await supabase
    .from('usuario_tienda_actual')
    .select('tienda_id')
    .eq('usuario_id', user.id)
    .single();
  
  if (!tiendaActual?.tienda_id) {
    throw new Error('No hay tienda activa');
  }
  
  // Incluir tienda_id desde fuente confiable
  const { data, error } = await supabase
    .from('clientes')
    .insert([{
      ...cliente,
      tienda_id: tiendaActual.tienda_id // ✅ Desde BD, no desde parámetro
    }])
    .select()
    .single();
  
  // RLS valida que tienda_id = require_current_store()
};
```

---

### 4. Edge Functions

**Archivo:** `supabase/functions/*/index.ts`

**Análisis general:**
- ✅ Las Edge Functions usan el token JWT del usuario (correcto)
- ⚠️ Algunas pueden usar service_role key internamente (para operaciones privilegiadas)
- ⚠️ Si usan service_role, **DEBEN validar tienda manualmente**

**Patrón recomendado:**
```typescript
// En Edge Functions que usan service_role
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // Bypasea RLS
);

// ⚠️ OBLIGATORIO: Validar tienda manualmente
const { data: tiendaActual } = await supabaseAdmin
  .from('usuario_tienda_actual')
  .select('tienda_id')
  .eq('usuario_id', user.id)
  .single();

if (!tiendaActual?.tienda_id) {
  return new Response(
    JSON.stringify({ error: 'NO_CURRENT_STORE' }),
    { status: 400 }
  );
}

// Usar tiendaActual.tienda_id en queries
```

**Veredicto:** ⚠️ **REQUIERE REVISIÓN** (auditar cada Edge Function)

---

## 🔧 CAMBIOS REQUERIDOS

### 🔴 CRÍTICO (Implementar YA)

#### 1. Ejecutar Script SQL de RLS

**Archivo:** `sql_fix_rls_clientes_multitienda.sql`

**Acción:**
```bash
# Ejecutar en Supabase SQL Editor
psql -h db.xxx.supabase.co -U postgres -d postgres -f sql_fix_rls_clientes_multitienda.sql
```

**Resultado esperado:**
- ✅ RLS habilitado y FORZADO en `clientes`
- ✅ 4 policies seguras creadas (SELECT, INSERT, UPDATE, DELETE)
- ✅ Función `require_current_store()` creada/verificada
- ✅ Índices de optimización creados

---

#### 2. Validar Acceso a Tienda en Login

**Archivo:** `src/hooks/useAuth.ts`

**Función:** `signIn()`

**Cambio:**
```typescript
const signIn = async (email: string, password: string, storeId?: string) => {
  // ... autenticación ...
  
  if (data.session?.user && storeId) {
    // ✅ NUEVO: Validar que el usuario tiene acceso a la tienda
    const { data: hasAccess, error: accessError } = await supabase
      .from('usuario_tiendas')
      .select('tienda_id')
      .eq('usuario_id', data.session.user.id)
      .eq('tienda_id', storeId)
      .eq('activo', true)
      .single();
    
    if (accessError || !hasAccess) {
      console.error('❌ Usuario no tiene acceso a la tienda seleccionada');
      return { error: { message: 'No tienes acceso a esta tienda' } };
    }
    
    // AHORA sí guardar tienda actual
    await supabase
      .from('usuario_tienda_actual')
      .upsert({
        usuario_id: data.session.user.id,
        tienda_id: storeId,
        updated_at: new Date().toISOString()
      });
    
    // ... resto del código ...
  }
};
```

**Justificación:**
- 🔒 Previene que un usuario seleccione una tienda no autorizada
- 🔒 Valida contra `usuario_tiendas` (fuente de verdad de asignaciones)

---

#### 3. Proteger `usuario_tienda_actual` con RLS

**Ya incluido en el script SQL**, pero verificar:

```sql
-- Verificar que existe
SELECT * FROM pg_policies WHERE tablename = 'usuario_tienda_actual';

-- Debe tener 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- Todas deben tener: USING (usuario_id = auth.uid())
```

---

### ⚠️ RECOMENDADO (Implementar después)

#### 4. Simplificar Servicios (Confiar en RLS)

**Archivos afectados:**
- `src/services/clienteService.ts`
- `src/services/cotizacionService.ts`
- `src/services/pedidoService.ts`
- Todos los servicios que filtran por `currentStore.id`

**Cambio:**
```typescript
// ANTES (patrón actual)
export const getClientes = async (filters: ClienteFilters = {}, currentStore: { id: string } | null) => {
  if (!currentStore) {
    return { data: [], error: { message: 'No hay tienda seleccionada' } };
  }
  
  let query = supabase
    .from('clientes')
    .select('*')
    .eq('tienda_id', currentStore.id); // ⚠️ Filtro manual
  // ...
};

// DESPUÉS (patrón con RLS)
export const getClientes = async (filters: ClienteFilters = {}) => {
  // RLS filtra automáticamente por tienda actual
  let query = supabase
    .from('clientes')
    .select('*');
  // NO necesitas .eq('tienda_id', ...)
  
  // Si no hay tienda actual, RLS retorna 0 filas o lanza error
  // ...
};
```

**Beneficios:**
- ✅ Código más simple (menos parámetros)
- ✅ Imposible olvidar el filtro
- ✅ Seguridad centralizada en BD

**Riesgo:**
- ⚠️ Cambio grande (afecta muchos archivos)
- ⚠️ Requiere testing exhaustivo

**Recomendación:** Implementar DESPUÉS de validar que RLS funciona al 100%

---

#### 5. Auditar Edge Functions

**Acción:**
- Revisar cada Edge Function en `supabase/functions/`
- Identificar cuáles usan `SUPABASE_SERVICE_ROLE_KEY`
- Agregar validación manual de tienda en esas funciones

**Template de validación:**
```typescript
// En Edge Functions con service_role
const { data: tiendaActual, error } = await supabaseAdmin
  .from('usuario_tienda_actual')
  .select('tienda_id')
  .eq('usuario_id', user.id)
  .single();

if (error || !tiendaActual?.tienda_id) {
  return new Response(
    JSON.stringify({ error: 'NO_CURRENT_STORE' }),
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  );
}

const currentStoreId = tiendaActual.tienda_id;
// Usar currentStoreId en todas las queries
```

---

## ✅ CHECKLIST DE VALIDACIÓN

### Pre-implementación

- [ ] Backup de base de datos
- [ ] Backup de código actual
- [ ] Revisar este documento completo

### Implementación

- [ ] Ejecutar `sql_fix_rls_clientes_multitienda.sql` en Supabase
- [ ] Verificar que no hay errores en la ejecución
- [ ] Verificar que las 4 policies se crearon correctamente
- [ ] Agregar validación de acceso en `signIn()` (useAuth.ts)
- [ ] Commit de cambios

### Validación SQL

- [ ] Ejecutar: `SELECT * FROM pg_policies WHERE tablename = 'clientes';`
- [ ] Confirmar 4 policies (SELECT, INSERT, UPDATE, DELETE)
- [ ] Confirmar que todas son `TO authenticated`
- [ ] Ejecutar: `SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'clientes';`
- [ ] Confirmar ambos son `true`

### Validación con Usuario Real

- [ ] Crear usuario de prueba en Supabase Auth
- [ ] Asignar tienda al usuario en `usuario_tiendas`
- [ ] Establecer tienda actual en `usuario_tienda_actual`
- [ ] Login en la app con ese usuario
- [ ] Verificar que puede ver clientes de su tienda
- [ ] Verificar que NO puede ver clientes de otra tienda

### Validación sin Tienda

- [ ] Eliminar registro de `usuario_tienda_actual` para el usuario de prueba
- [ ] Refrescar la app (F5)
- [ ] Intentar acceder a módulo Clientes
- [ ] Verificar que NO muestra datos (0 filas o error)
- [ ] Verificar mensaje de error apropiado

### Validación en Postman

Ver sección siguiente: **PRUEBAS EN POSTMAN**

---

## 🧪 PRUEBAS EN POSTMAN

### Setup Inicial

1. **Obtener Token JWT:**
   - Login en la app
   - Abrir DevTools > Application > Local Storage
   - Buscar `sb-xxx-auth-token`
   - Copiar el `access_token`

2. **Configurar Postman:**
   - Crear nueva colección "SCO - RLS Tests"
   - Agregar variable `{{baseUrl}}`: `https://xxx.supabase.co`
   - Agregar variable `{{anonKey}}`: Tu anon key
   - Agregar variable `{{accessToken}}`: Token JWT copiado

---

### Test 1: Leer Clientes CON Tienda Actual

**Request:**
```http
GET {{baseUrl}}/rest/v1/clientes
Authorization: Bearer {{accessToken}}
apikey: {{anonKey}}
```

**Resultado esperado:**
- ✅ Status: 200 OK
- ✅ Body: Array de clientes de la tienda actual
- ✅ Todos los clientes tienen el mismo `tienda_id`

**Resultado NO esperado:**
- ❌ Clientes de múltiples tiendas
- ❌ Error 401/403

---

### Test 2: Leer Clientes SIN Tienda Actual

**Setup:**
```sql
-- Ejecutar en Supabase SQL Editor
DELETE FROM usuario_tienda_actual WHERE usuario_id = 'tu-user-id';
```

**Request:**
```http
GET {{baseUrl}}/rest/v1/clientes
Authorization: Bearer {{accessToken}}
apikey: {{anonKey}}
```

**Resultado esperado:**
- ✅ Status: 200 OK
- ✅ Body: Array vacío `[]`
- O bien:
- ✅ Status: 400/500
- ✅ Body: `{ "error": "NO_CURRENT_STORE" }`

**Resultado NO esperado:**
- ❌ Clientes de cualquier tienda

---

### Test 3: Intentar Leer Clientes de Otra Tienda

**Request:**
```http
GET {{baseUrl}}/rest/v1/clientes?tienda_id=eq.otra-tienda-uuid
Authorization: Bearer {{accessToken}}
apikey: {{anonKey}}
```

**Resultado esperado:**
- ✅ Status: 200 OK
- ✅ Body: Array vacío `[]` (RLS filtra automáticamente)

**Resultado NO esperado:**
- ❌ Clientes de la otra tienda

---

### Test 4: Crear Cliente en Tienda Actual

**Request:**
```http
POST {{baseUrl}}/rest/v1/clientes
Authorization: Bearer {{accessToken}}
apikey: {{anonKey}}
Content-Type: application/json

{
  "nombre": "Cliente Test RLS",
  "tipo_cliente": "persona_fisica",
  "correo_principal": "test@example.com",
  "tienda_id": "tu-tienda-actual-uuid"
}
```

**Resultado esperado:**
- ✅ Status: 201 Created
- ✅ Body: Cliente creado con `tienda_id` correcto

---

### Test 5: Intentar Crear Cliente en Otra Tienda

**Request:**
```http
POST {{baseUrl}}/rest/v1/clientes
Authorization: Bearer {{accessToken}}
apikey: {{anonKey}}
Content-Type: application/json

{
  "nombre": "Cliente Test RLS Hack",
  "tipo_cliente": "persona_fisica",
  "correo_principal": "hack@example.com",
  "tienda_id": "otra-tienda-uuid"
}
```

**Resultado esperado:**
- ✅ Status: 400/403/500
- ✅ Body: Error (RLS bloquea la inserción)

**Resultado NO esperado:**
- ❌ Status: 201 Created (sería una vulnerabilidad)

---

### Test 6: Actualizar Cliente de Otra Tienda

**Request:**
```http
PATCH {{baseUrl}}/rest/v1/clientes?id=eq.cliente-de-otra-tienda-uuid
Authorization: Bearer {{accessToken}}
apikey: {{anonKey}}
Content-Type: application/json

{
  "nombre": "Intento de Hack"
}
```

**Resultado esperado:**
- ✅ Status: 200 OK
- ✅ Body: Array vacío `[]` (no se actualizó nada)
- O bien:
- ✅ Status: 404 Not Found

**Resultado NO esperado:**
- ❌ Cliente actualizado (sería una vulnerabilidad)

---

### Test 7: Eliminar Cliente de Otra Tienda

**Request:**
```http
DELETE {{baseUrl}}/rest/v1/clientes?id=eq.cliente-de-otra-tienda-uuid
Authorization: Bearer {{accessToken}}
apikey: {{anonKey}}
```

**Resultado esperado:**
- ✅ Status: 204 No Content (pero no eliminó nada)
- O bien:
- ✅ Status: 404 Not Found

**Resultado NO esperado:**
- ❌ Cliente eliminado (sería una vulnerabilidad)

---

## 📊 INDICADORES DE ÉXITO

### ✅ RLS Funciona al 100% Si:

1. ✅ Usuario CON tienda actual puede leer/escribir clientes de su tienda
2. ✅ Usuario SIN tienda actual NO puede leer/escribir ningún cliente
3. ✅ Usuario NO puede leer clientes de otra tienda (aunque intente filtrar manualmente)
4. ✅ Usuario NO puede crear clientes en otra tienda (aunque envíe otro `tienda_id`)
5. ✅ Usuario NO puede actualizar clientes de otra tienda
6. ✅ Usuario NO puede eliminar clientes de otra tienda
7. ✅ Probar con role `postgres` en SQL Editor bypasea RLS (esperado)
8. ✅ Probar con role `authenticated` en SQL Editor respeta RLS

---

## 🚨 SEÑALES DE ALERTA

### ❌ RLS NO Funciona Si:

1. ❌ Usuario puede ver clientes de múltiples tiendas
2. ❌ Usuario sin tienda actual puede ver datos
3. ❌ Usuario puede crear cliente con `tienda_id` de otra tienda
4. ❌ Usuario puede actualizar cliente de otra tienda
5. ❌ Probar con role `authenticated` en SQL Editor NO respeta RLS

---

## 📝 NOTAS FINALES

### Sobre Probar con Role Postgres

**⚠️ IMPORTANTE:**

```sql
-- ❌ ESTO BYPASEA RLS (postgres es superuser)
SELECT * FROM clientes;

-- ✅ ESTO RESPETA RLS (simula usuario autenticado)
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "user-uuid-here"}';
SELECT * FROM clientes;
ROLLBACK;
```

**Conclusión:**
- Probar con `postgres` role NO es válido para validar RLS
- Siempre probar con `authenticated` role o con token JWT real

---

### Sobre Service Role en Frontend

**✅ CONFIRMADO:**
- El código actual NO usa service_role key en frontend
- Solo usa anon key (correcto)
- No hay bypass de RLS desde el cliente

---

### Sobre Simplificar Servicios

**Recomendación:**
- Implementar RLS primero
- Validar que funciona al 100%
- DESPUÉS simplificar servicios (eliminar filtros manuales)
- Hacerlo gradualmente (tabla por tabla)

---

## 🎯 PRÓXIMOS PASOS

### Fase 1: Clientes (AHORA)
1. ✅ Ejecutar script SQL de RLS
2. ✅ Agregar validación en login
3. ✅ Probar con Postman
4. ✅ Validar en la app

### Fase 2: Otras Tablas (DESPUÉS)
1. Replicar patrón en `cotizaciones`
2. Replicar patrón en `pedidos`
3. Replicar patrón en `inventario` (caso especial)
4. Replicar patrón en `facturas_electronicas`
5. Auditar Edge Functions

### Fase 3: Optimización (FUTURO)
1. Simplificar servicios (eliminar filtros manuales)
2. Eliminar parámetro `currentStore` de servicios
3. Confiar 100% en RLS

---

## 📚 REFERENCIAS

- **Script SQL:** `sql_fix_rls_clientes_multitienda.sql`
- **Documentación Supabase RLS:** https://supabase.com/docs/guides/auth/row-level-security
- **Documentación PostgreSQL RLS:** https://www.postgresql.org/docs/current/ddl-rowsecurity.html

---

**Fin del documento de auditoría**
