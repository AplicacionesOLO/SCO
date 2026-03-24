# SCO - Guía Oficial de Testing RLS Multi-Tienda

**Sistema:** SCO (Sistema de Costeos OLO)  
**Módulo:** Row Level Security (RLS) Multi-Tenant  
**Versión:** 1.0  
**Fecha:** 2024  
**Propósito:** Documentar cómo probar correctamente las políticas RLS y por qué el role `postgres` NO es válido para testing de seguridad.

---

## 🎯 OBJETIVO DE ESTE DOCUMENTO

Explicar de forma clara y definitiva:

1. **Por qué `postgres` bypasea RLS** y no sirve para validar seguridad multi-tenant
2. **Cómo probar correctamente RLS** simulando usuarios autenticados reales
3. **Cómo validar desde REST/Postman** (flujo real del frontend)
4. **Checklist para QA** con casos de prueba reproducibles

---

## 🚨 PROBLEMA COMÚN: "Funciona con postgres pero no con authenticated"

### Síntoma Observado

```sql
-- Como role postgres (superuser)
SELECT * FROM clientes;
-- ✅ Resultado: Devuelve TODAS las filas (incluso sin usuario_tienda_actual)

-- Como role authenticated (usuario real)
SELECT * FROM clientes;
-- ❌ Resultado: ERROR NO_CURRENT_STORE (si no existe usuario_tienda_actual)
```

### ¿Por qué sucede esto?

**RESPUESTA:** El role `postgres` es un **superuser** que **BYPASEA RLS** por diseño de PostgreSQL.

---

## 📚 EXPLICACIÓN TÉCNICA: Roles y RLS en PostgreSQL

### 1. Role `postgres` (Superuser)

**Características:**
- ✅ Acceso total a todas las tablas
- ✅ **BYPASEA Row Level Security (RLS)** automáticamente
- ✅ Ignora políticas de seguridad
- ✅ Útil para administración y debugging
- ❌ **NO SIRVE** para validar seguridad multi-tenant

**Comportamiento con RLS:**
```sql
-- Aunque la tabla tenga RLS habilitado
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes FORCE ROW LEVEL SECURITY;

-- postgres IGNORA las políticas
SELECT * FROM clientes; -- Devuelve TODO
```

**Razón:** PostgreSQL permite a superusers bypassear RLS para tareas administrativas (backups, migraciones, debugging).

---

### 2. Role `authenticated` (Usuario Real)

**Características:**
- ✅ Role estándar de Supabase para usuarios autenticados
- ✅ **RESPETA Row Level Security (RLS)**
- ✅ Solo ve datos permitidos por las políticas
- ✅ Representa el flujo real del frontend
- ✅ **CORRECTO** para validar seguridad multi-tenant

**Comportamiento con RLS:**
```sql
-- authenticated RESPETA las políticas
SELECT * FROM clientes; 
-- Solo devuelve filas donde: tienda_id = require_current_store()
```

---

### 3. Role `anon` (Usuario Anónimo)

**Características:**
- ✅ Role de Supabase para usuarios NO autenticados
- ✅ **RESPETA Row Level Security (RLS)**
- ✅ Típicamente usado para endpoints públicos
- ⚠️ En SCO, NO debería tener acceso a datos de negocio

**Uso en SCO:**
- Login/registro (antes de autenticación)
- Endpoints públicos (si existen)
- **NO** debe tener políticas en tablas de negocio

---

## ✅ CÓMO PROBAR RLS CORRECTAMENTE

### Método 1: Simulación en SQL Editor (Transacción)

Este método simula un usuario autenticado en una transacción temporal.

#### Paso 1: Configurar Contexto de Usuario

```sql
-- Iniciar transacción (para no afectar datos reales)
BEGIN;

-- Cambiar al role authenticated
SET LOCAL ROLE authenticated;

-- Simular JWT del usuario (reemplazar con UUID real)
SET LOCAL request.jwt.claims TO '{"sub": "550e8400-e29b-41d4-a716-446655440000", "role": "authenticated"}';

-- Ahora las queries se ejecutan como ese usuario
```

#### Paso 2: Probar Caso SIN Tienda Actual (Debe Fallar)

```sql
-- Eliminar tienda actual del usuario (si existe)
DELETE FROM usuario_tienda_actual 
WHERE usuario_id = '550e8400-e29b-41d4-a716-446655440000';

-- Intentar leer clientes
SELECT * FROM clientes;

-- ✅ RESULTADO ESPERADO: ERROR
-- ERROR: NO_CURRENT_STORE
-- DETAIL: El usuario no tiene una tienda activa configurada
```

**Explicación:**
- La función `require_current_store()` busca en `usuario_tienda_actual`
- No encuentra registro para el usuario
- Lanza excepción `NO_CURRENT_STORE`
- La política RLS bloquea el acceso

#### Paso 3: Probar Caso CON Tienda Actual (Debe Funcionar)

```sql
-- Asignar tienda actual al usuario
INSERT INTO usuario_tienda_actual (usuario_id, tienda_id)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
)
ON CONFLICT (usuario_id) 
DO UPDATE SET tienda_id = EXCLUDED.tienda_id;

-- Intentar leer clientes
SELECT * FROM clientes;

-- ✅ RESULTADO ESPERADO: Filas de la tienda 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
-- Solo devuelve clientes donde tienda_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
```

#### Paso 4: Limpiar Transacción

```sql
-- Deshacer todos los cambios (no afecta datos reales)
ROLLBACK;
```

---

### Método 2: Función de Prueba Automatizada

Usar la función `test_rls_clientes()` incluida en el script SQL.

```sql
-- Probar con usuario y tienda específicos
SELECT * FROM test_rls_clientes(
  'usuario-uuid-aqui'::uuid,
  'tienda-uuid-aqui'::uuid
);

-- ✅ RESULTADO ESPERADO:
-- test_result: 'SUCCESS'
-- message: 'RLS funciona correctamente: usuario solo ve clientes de su tienda'
-- rows_visible: 5 (ejemplo)
```

**Ventajas:**
- ✅ Automatizado
- ✅ Reproducible
- ✅ Limpia automáticamente
- ✅ Devuelve resultado claro

---

## 🌐 CÓMO VALIDAR DESDE REST/POSTMAN (Flujo Real)

Este es el método **MÁS IMPORTANTE** porque replica exactamente cómo el frontend accede a los datos.

### Prerequisitos

1. **Obtener JWT Token Real:**
   - Login en la aplicación SCO
   - Abrir DevTools > Application > Local Storage
   - Copiar el valor de `sb-<project-id>-auth-token`
   - Extraer el `access_token` del JSON

2. **Configurar Postman:**
   - Crear nueva colección "SCO RLS Tests"
   - Configurar variables de entorno:
     - `SUPABASE_URL`: https://tu-proyecto.supabase.co
     - `SUPABASE_ANON_KEY`: tu-anon-key
     - `JWT_TOKEN`: access_token del paso 1

---

### Test 1: Leer Clientes CON Tienda Actual (Debe Funcionar)

**Request:**
```http
GET {{SUPABASE_URL}}/rest/v1/clientes?select=*
Authorization: Bearer {{JWT_TOKEN}}
apikey: {{SUPABASE_ANON_KEY}}
```

**Resultado Esperado:**
```json
[
  {
    "id": "cliente-uuid-1",
    "nombre": "Cliente A",
    "tienda_id": "tu-tienda-uuid",
    ...
  },
  {
    "id": "cliente-uuid-2",
    "nombre": "Cliente B",
    "tienda_id": "tu-tienda-uuid",
    ...
  }
]
```

**Validación:**
- ✅ Status: `200 OK`
- ✅ Solo devuelve clientes de TU tienda
- ✅ NO devuelve clientes de otras tiendas

---

### Test 2: Intentar Leer Cliente de Otra Tienda (Debe Bloquear)

**Setup:**
1. Identificar un cliente de otra tienda (desde SQL Editor como postgres)
2. Copiar su UUID

**Request:**
```http
GET {{SUPABASE_URL}}/rest/v1/clientes?id=eq.<uuid-cliente-otra-tienda>&select=*
Authorization: Bearer {{JWT_TOKEN}}
apikey: {{SUPABASE_ANON_KEY}}
```

**Resultado Esperado:**
```json
[]
```

**Validación:**
- ✅ Status: `200 OK`
- ✅ Array vacío (RLS filtró el resultado)
- ✅ NO devuelve el cliente de otra tienda

---

### Test 3: Intentar Crear Cliente en Otra Tienda (Debe Bloquear)

**Request:**
```http
POST {{SUPABASE_URL}}/rest/v1/clientes
Authorization: Bearer {{JWT_TOKEN}}
apikey: {{SUPABASE_ANON_KEY}}
Content-Type: application/json

{
  "nombre": "Cliente Malicioso",
  "tienda_id": "otra-tienda-uuid",
  "tipo_identificacion": "01",
  "identificacion": "123456789"
}
```

**Resultado Esperado:**
```json
{
  "code": "42501",
  "message": "new row violates row-level security policy for table \"clientes\"",
  "details": null,
  "hint": null
}
```

**Validación:**
- ✅ Status: `403 Forbidden` o `400 Bad Request`
- ✅ Error de RLS
- ✅ NO se crea el cliente

---

### Test 4: Crear Cliente en TU Tienda (Debe Funcionar)

**Request:**
```http
POST {{SUPABASE_URL}}/rest/v1/clientes
Authorization: Bearer {{JWT_TOKEN}}
apikey: {{SUPABASE_ANON_KEY}}
Content-Type: application/json

{
  "nombre": "Cliente Legítimo",
  "tienda_id": "tu-tienda-uuid",
  "tipo_identificacion": "01",
  "identificacion": "987654321"
}
```

**Resultado Esperado:**
```json
{
  "id": "nuevo-cliente-uuid",
  "nombre": "Cliente Legítimo",
  "tienda_id": "tu-tienda-uuid",
  ...
}
```

**Validación:**
- ✅ Status: `201 Created`
- ✅ Cliente creado correctamente
- ✅ `tienda_id` coincide con tu tienda

---

### Test 5: Intentar Modificar Cliente de Otra Tienda (Debe Bloquear)

**Request:**
```http
PATCH {{SUPABASE_URL}}/rest/v1/clientes?id=eq.<uuid-cliente-otra-tienda>
Authorization: Bearer {{JWT_TOKEN}}
apikey: {{SUPABASE_ANON_KEY}}
Content-Type: application/json

{
  "nombre": "Nombre Modificado"
}
```

**Resultado Esperado:**
```json
{
  "code": "42501",
  "message": "new row violates row-level security policy for table \"clientes\"",
  "details": null,
  "hint": null
}
```

**Validación:**
- ✅ Status: `403 Forbidden` o `400 Bad Request`
- ✅ Error de RLS
- ✅ NO se modifica el cliente

---

### Test 6: Eliminar Cliente de Otra Tienda (Debe Bloquear)

**Request:**
```http
DELETE {{SUPABASE_URL}}/rest/v1/clientes?id=eq.<uuid-cliente-otra-tienda>
Authorization: Bearer {{JWT_TOKEN}}
apikey: {{SUPABASE_ANON_KEY}}
```

**Resultado Esperado:**
```json
[]
```

**Validación:**
- ✅ Status: `204 No Content` o `200 OK`
- ✅ NO se elimina el cliente (RLS bloqueó)
- ✅ Verificar en SQL Editor que el cliente sigue existiendo

---

### Test 7: Simular Usuario SIN Tienda Actual (Debe Bloquear)

**Setup:**
1. Eliminar `usuario_tienda_actual` del usuario en SQL Editor:
```sql
DELETE FROM usuario_tienda_actual 
WHERE usuario_id = (SELECT auth.uid());
```

2. Obtener nuevo JWT (logout/login sin seleccionar tienda)

**Request:**
```http
GET {{SUPABASE_URL}}/rest/v1/clientes?select=*
Authorization: Bearer {{JWT_TOKEN_SIN_TIENDA}}
apikey: {{SUPABASE_ANON_KEY}}
```

**Resultado Esperado:**
```json
{
  "code": "P0001",
  "message": "NO_CURRENT_STORE",
  "details": "El usuario no tiene una tienda activa configurada",
  "hint": null
}
```

**Validación:**
- ✅ Status: `400 Bad Request` o `500 Internal Server Error`
- ✅ Error `NO_CURRENT_STORE`
- ✅ NO devuelve datos

---

## 📋 CHECKLIST PARA QA

### Pre-requisitos

- [ ] Script SQL `sql_fix_rls_clientes_multitienda.sql` ejecutado
- [ ] RLS habilitado en tabla `clientes`
- [ ] FORCE RLS habilitado en tabla `clientes`
- [ ] Función `require_current_store()` creada
- [ ] Políticas para role `authenticated` creadas
- [ ] Al menos 2 tiendas con datos de prueba
- [ ] Al menos 2 usuarios con acceso a tiendas diferentes

---

### Tests en SQL Editor (Como Authenticated)

#### Test SQL-1: Usuario SIN Tienda Actual

- [ ] Ejecutar transacción con `SET LOCAL ROLE authenticated`
- [ ] Configurar `request.jwt.claims` con UUID de usuario real
- [ ] Eliminar registro de `usuario_tienda_actual`
- [ ] Ejecutar `SELECT * FROM clientes`
- [ ] **Resultado esperado:** ERROR `NO_CURRENT_STORE`
- [ ] Ejecutar `ROLLBACK`

#### Test SQL-2: Usuario CON Tienda Actual

- [ ] Ejecutar transacción con `SET LOCAL ROLE authenticated`
- [ ] Configurar `request.jwt.claims` con UUID de usuario real
- [ ] Insertar/actualizar `usuario_tienda_actual` con tienda válida
- [ ] Ejecutar `SELECT * FROM clientes`
- [ ] **Resultado esperado:** Solo clientes de esa tienda
- [ ] Verificar que NO aparecen clientes de otras tiendas
- [ ] Ejecutar `ROLLBACK`

#### Test SQL-3: Función de Prueba Automatizada

- [ ] Ejecutar `SELECT * FROM test_rls_clientes(usuario_uuid, tienda_uuid)`
- [ ] **Resultado esperado:** `test_result = 'SUCCESS'`
- [ ] Verificar `rows_visible` > 0
- [ ] Verificar mensaje de éxito

---

### Tests en Postman/REST (Flujo Real)

#### Test REST-1: Leer Clientes (Con Tienda)

- [ ] Obtener JWT token válido (con tienda activa)
- [ ] GET `/rest/v1/clientes?select=*`
- [ ] **Resultado esperado:** Status 200, array con clientes de tu tienda
- [ ] Verificar que todos tienen `tienda_id` = tu tienda
- [ ] Verificar que NO aparecen clientes de otras tiendas

#### Test REST-2: Leer Cliente Específico de Otra Tienda

- [ ] Identificar UUID de cliente de otra tienda
- [ ] GET `/rest/v1/clientes?id=eq.<uuid>&select=*`
- [ ] **Resultado esperado:** Status 200, array vacío `[]`
- [ ] Verificar que RLS filtró el resultado

#### Test REST-3: Crear Cliente en Otra Tienda

- [ ] POST `/rest/v1/clientes` con `tienda_id` de otra tienda
- [ ] **Resultado esperado:** Status 403/400, error de RLS
- [ ] Verificar que NO se creó el cliente

#### Test REST-4: Crear Cliente en Tu Tienda

- [ ] POST `/rest/v1/clientes` con `tienda_id` de tu tienda
- [ ] **Resultado esperado:** Status 201, cliente creado
- [ ] Verificar que `tienda_id` coincide con tu tienda

#### Test REST-5: Modificar Cliente de Otra Tienda

- [ ] PATCH `/rest/v1/clientes?id=eq.<uuid-otra-tienda>`
- [ ] **Resultado esperado:** Status 403/400, error de RLS
- [ ] Verificar que NO se modificó el cliente

#### Test REST-6: Modificar Cliente de Tu Tienda

- [ ] PATCH `/rest/v1/clientes?id=eq.<uuid-tu-tienda>`
- [ ] **Resultado esperado:** Status 200, cliente modificado
- [ ] Verificar cambios aplicados

#### Test REST-7: Eliminar Cliente de Otra Tienda

- [ ] DELETE `/rest/v1/clientes?id=eq.<uuid-otra-tienda>`
- [ ] **Resultado esperado:** Status 204/200, pero cliente NO eliminado
- [ ] Verificar en SQL Editor que el cliente sigue existiendo

#### Test REST-8: Eliminar Cliente de Tu Tienda

- [ ] DELETE `/rest/v1/clientes?id=eq.<uuid-tu-tienda>`
- [ ] **Resultado esperado:** Status 204, cliente eliminado
- [ ] Verificar en SQL Editor que el cliente fue eliminado

#### Test REST-9: Usuario SIN Tienda Actual

- [ ] Eliminar `usuario_tienda_actual` del usuario
- [ ] Obtener nuevo JWT (logout/login sin tienda)
- [ ] GET `/rest/v1/clientes?select=*`
- [ ] **Resultado esperado:** Status 400/500, error `NO_CURRENT_STORE`
- [ ] Verificar que NO devuelve datos

---

### Tests en la Aplicación (UI)

#### Test UI-1: Login con Tienda Válida

- [ ] Hacer login seleccionando tienda válida
- [ ] Navegar a módulo Clientes
- [ ] **Resultado esperado:** Lista de clientes de tu tienda
- [ ] Verificar que NO aparecen clientes de otras tiendas

#### Test UI-2: Login con Tienda Inválida

- [ ] Intentar hacer login seleccionando tienda no autorizada (si es posible)
- [ ] **Resultado esperado:** Error "No tienes acceso a esta tienda"
- [ ] Sesión NO iniciada

#### Test UI-3: Crear Cliente

- [ ] Navegar a módulo Clientes
- [ ] Crear nuevo cliente (NO especificar tienda_id manualmente)
- [ ] **Resultado esperado:** Cliente creado en tu tienda automáticamente
- [ ] Verificar en SQL Editor que `tienda_id` = tu tienda

#### Test UI-4: Modificar Cliente

- [ ] Navegar a módulo Clientes
- [ ] Editar cliente existente
- [ ] **Resultado esperado:** Cambios guardados correctamente
- [ ] Verificar que `tienda_id` NO cambió

#### Test UI-5: Eliminar Cliente

- [ ] Navegar a módulo Clientes
- [ ] Eliminar cliente existente
- [ ] **Resultado esperado:** Cliente eliminado correctamente
- [ ] Verificar en SQL Editor que el cliente fue eliminado

#### Test UI-6: Refresh de Página (F5)

- [ ] Navegar a módulo Clientes
- [ ] Presionar F5 (refresh)
- [ ] **Resultado esperado:** Página recarga, sigue mostrando clientes de tu tienda
- [ ] Verificar que NO se perdió la tienda activa

#### Test UI-7: Cambio de Ruta

- [ ] Navegar a módulo Clientes
- [ ] Cambiar a otro módulo (Dashboard, Inventario, etc.)
- [ ] Regresar a Clientes
- [ ] **Resultado esperado:** Sigue mostrando clientes de tu tienda
- [ ] Verificar que NO se perdió la tienda activa

---

### Tests Avanzados (Seguridad)

#### Test ADV-1: Manipular JWT en DevTools

- [ ] Abrir DevTools > Application > Local Storage
- [ ] Modificar manualmente el `access_token` (cambiar UUID de usuario)
- [ ] Intentar acceder a Clientes
- [ ] **Resultado esperado:** Error de autenticación o datos vacíos
- [ ] Verificar que NO se accede a datos de otro usuario

#### Test ADV-2: Manipular Request en Network Tab

- [ ] Abrir DevTools > Network
- [ ] Interceptar request a `/rest/v1/clientes`
- [ ] Modificar query para agregar `?tienda_id=eq.<otra-tienda>`
- [ ] **Resultado esperado:** Array vacío o error de RLS
- [ ] Verificar que RLS filtró el resultado

#### Test ADV-3: SQL Injection en Filtros

- [ ] Intentar filtrar clientes con: `?nombre=eq.' OR '1'='1`
- [ ] **Resultado esperado:** Error de sintaxis o array vacío
- [ ] Verificar que NO se bypasseó RLS

#### Test ADV-4: Acceso Directo a API sin JWT

- [ ] Hacer request a `/rest/v1/clientes` SIN header `Authorization`
- [ ] **Resultado esperado:** Status 401 Unauthorized
- [ ] Verificar que NO se accede a datos

---

## 🎓 CONCEPTOS CLAVE PARA ENTENDER

### 1. ¿Qué es Row Level Security (RLS)?

**Definición:** Mecanismo de PostgreSQL que filtra automáticamente las filas de una tabla según políticas de seguridad definidas.

**Analogía:** Es como un "filtro invisible" que se aplica a TODAS las queries (SELECT, INSERT, UPDATE, DELETE) sin que el código de la aplicación tenga que preocuparse.

**Ejemplo:**
```sql
-- Sin RLS: Devuelve TODAS las filas
SELECT * FROM clientes; -- 1000 filas

-- Con RLS: Devuelve solo filas permitidas
SELECT * FROM clientes; -- 50 filas (solo de tu tienda)
```

---

### 2. ¿Qué es FORCE ROW LEVEL SECURITY?

**Definición:** Configuración que obliga a que RLS se aplique incluso para el owner de la tabla.

**Sin FORCE:**
```sql
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
-- postgres (owner) bypasea RLS
-- authenticated respeta RLS
```

**Con FORCE:**
```sql
ALTER TABLE clientes FORCE ROW LEVEL SECURITY;
-- postgres (owner) RESPETA RLS (excepto superusers)
-- authenticated respeta RLS
```

**Uso en SCO:** Habilitado para prevenir bypass accidental.

---

### 3. ¿Qué es require_current_store()?

**Definición:** Función SQL que obtiene la tienda activa del usuario desde `usuario_tienda_actual`.

**Código:**
```sql
CREATE OR REPLACE FUNCTION require_current_store()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tienda_id uuid;
BEGIN
  SELECT tienda_id INTO v_tienda_id
  FROM usuario_tienda_actual
  WHERE usuario_id = auth.uid();
  
  IF v_tienda_id IS NULL THEN
    RAISE EXCEPTION 'NO_CURRENT_STORE'
      USING DETAIL = 'El usuario no tiene una tienda activa configurada';
  END IF;
  
  RETURN v_tienda_id;
END;
$$;
```

**Uso en Políticas:**
```sql
CREATE POLICY "authenticated_read_own_store_clientes"
ON clientes FOR SELECT TO authenticated
USING (tienda_id = require_current_store());
```

**Ventajas:**
- ✅ Fuente única de verdad
- ✅ Centralizada (un solo lugar)
- ✅ Segura (SECURITY DEFINER)
- ✅ Reutilizable (todas las tablas)

---

### 4. ¿Qué es auth.uid()?

**Definición:** Función de Supabase que retorna el UUID del usuario autenticado desde el JWT.

**Ejemplo:**
```sql
SELECT auth.uid(); -- '550e8400-e29b-41d4-a716-446655440000'
```

**Uso:** Identificar al usuario actual en políticas RLS y funciones SQL.

---

### 5. ¿Qué es request.jwt.claims?

**Definición:** Variable de sesión que contiene los claims del JWT del usuario.

**Estructura:**
```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "role": "authenticated",
  "email": "usuario@ejemplo.com",
  ...
}
```

**Uso en Testing:**
```sql
SET LOCAL request.jwt.claims TO '{"sub": "uuid-aqui", "role": "authenticated"}';
```

---

## 🚨 ERRORES COMUNES Y SOLUCIONES

### Error 1: "RLS funciona con postgres pero no con authenticated"

**Causa:** Estás probando con role `postgres` (superuser) que bypasea RLS.

**Solución:** Probar con role `authenticated` en transacción:
```sql
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "uuid", "role": "authenticated"}';
-- Tus queries aquí
ROLLBACK;
```

---

### Error 2: "NO_CURRENT_STORE aunque tengo usuario_tienda_actual"

**Causa:** El UUID en `request.jwt.claims` no coincide con el de `usuario_tienda_actual`.

**Solución:** Verificar que el UUID es correcto:
```sql
-- Ver UUID real del usuario
SELECT usuario_id FROM usuario_tienda_actual;

-- Usar ese UUID en el test
SET LOCAL request.jwt.claims TO '{"sub": "<uuid-correcto>", "role": "authenticated"}';
```

---

### Error 3: "Postman devuelve datos de todas las tiendas"

**Causa:** Estás usando `SUPABASE_SERVICE_ROLE_KEY` en lugar de `SUPABASE_ANON_KEY`.

**Solución:** Usar `anon key` y JWT de usuario:
```http
Authorization: Bearer <jwt-token-usuario>
apikey: <supabase-anon-key>
```

---

### Error 4: "Frontend devuelve array vacío aunque hay datos"

**Causa:** El usuario no tiene registro en `usuario_tienda_actual`.

**Solución:** Verificar y crear registro:
```sql
-- Verificar
SELECT * FROM usuario_tienda_actual WHERE usuario_id = auth.uid();

-- Crear si no existe
INSERT INTO usuario_tienda_actual (usuario_id, tienda_id)
VALUES (auth.uid(), '<tienda-uuid>');
```

---

### Error 5: "RLS bloquea INSERT aunque tienda_id es correcto"

**Causa:** La política `WITH CHECK` está validando contra `require_current_store()`.

**Solución:** Asegurarse de que el `tienda_id` en el INSERT coincide con `require_current_store()`:
```sql
-- ❌ INCORRECTO
INSERT INTO clientes (nombre, tienda_id) 
VALUES ('Cliente', 'otra-tienda-uuid');

-- ✅ CORRECTO
INSERT INTO clientes (nombre, tienda_id) 
VALUES ('Cliente', require_current_store());
```

---

## 📊 MATRIZ DE ROLES Y PERMISOS

| Role | Bypasea RLS | Uso | Válido para Testing |
|------|-------------|-----|---------------------|
| `postgres` | ✅ SÍ (superuser) | Administración, debugging | ❌ NO |
| `service_role` | ✅ SÍ (configurado) | Edge Functions con privilegios | ❌ NO |
| `authenticated` | ❌ NO | Usuarios autenticados | ✅ SÍ |
| `anon` | ❌ NO | Usuarios anónimos | ✅ SÍ (endpoints públicos) |

---

## 🎯 RESUMEN EJECUTIVO

### ✅ LO QUE DEBES RECORDAR

1. **postgres bypasea RLS** → NO sirve para validar seguridad
2. **authenticated respeta RLS** → Usar para testing
3. **Probar en transacción** → `SET LOCAL ROLE authenticated`
4. **Probar con Postman** → Flujo real del frontend
5. **require_current_store()** → Fuente única de verdad
6. **FORCE RLS** → Previene bypass accidental

### ❌ LO QUE NO DEBES HACER

1. ❌ Probar con role `postgres` y asumir que RLS funciona
2. ❌ Usar `service_role` en frontend
3. ❌ Confiar en `localStorage` como fuente de verdad
4. ❌ Pasar `tienda_id` como parámetro en servicios
5. ❌ Hardcodear UUIDs en queries

### ✅ LO QUE SÍ DEBES HACER

1. ✅ Probar con role `authenticated` en transacción
2. ✅ Validar con Postman (flujo real)
3. ✅ Confiar en `usuario_tienda_actual` como fuente de verdad
4. ✅ Usar `require_current_store()` en todas las políticas
5. ✅ Habilitar FORCE RLS en todas las tablas multi-tenant

---

## 📚 REFERENCIAS

### Documentación Oficial

- [PostgreSQL Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers)

### Documentación Interna SCO

- `sql_fix_rls_clientes_multitienda.sql` - Script SQL de implementación
- `AUDITORIA_RLS_MULTITIENDA.md` - Auditoría de seguridad
- `CHECKLIST_VALIDACION_RLS_MULTITIENDA.md` - Checklist de validación
- `SCO_MULTITIENDA_FASE_0_DIAGNOSTICO.md` - Diagnóstico del sistema
- `SCO_MULTITIENDA_FASE_1_ARQUITECTURA_MINIMA.md` - Arquitectura mínima

---

## 📝 NOTAS FINALES

### Para Desarrolladores

- Este documento es la **fuente de verdad** para testing de RLS
- Cualquier duda sobre "por qué no funciona con postgres" → Leer sección "Explicación Técnica"
- Antes de reportar un bug de RLS → Ejecutar checklist completo

### Para QA

- Ejecutar checklist completo antes de aprobar release
- Documentar resultados de cada test
- Reportar cualquier desviación del comportamiento esperado

### Para DevOps

- Verificar que RLS está habilitado en producción
- Monitorear logs de errores `NO_CURRENT_STORE`
- Validar que no se usa `service_role` en frontend

---

**Fin del documento**

---

## 🔄 HISTORIAL DE CAMBIOS

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | 2024 | Versión inicial - Documentación completa de testing RLS |

---

**Documento generado para:** Sistema SCO (Sistema de Costeos OLO)  
**Módulo:** Row Level Security Multi-Tienda  
**Autor:** Equipo de Desarrollo SCO  
**Última actualización:** 2024
