# ✅ CHECKLIST DE VALIDACIÓN RLS MULTI-TIENDA

**Sistema:** SCO (Sistema de Costeos OLO)  
**Fecha:** 2025  
**Objetivo:** Validar que RLS funciona al 100% para la tabla `clientes` y el patrón es replicable

---

## 📋 RESUMEN DE CAMBIOS IMPLEMENTADOS

### ✅ Archivos Creados/Modificados

1. ✅ **`sql_fix_rls_clientes_multitienda.sql`** - Script SQL completo de RLS
2. ✅ **`AUDITORIA_RLS_MULTITIENDA.md`** - Auditoría de código y análisis de seguridad
3. ✅ **`src/hooks/useAuth.ts`** - Validación de acceso a tienda en login
4. ✅ **`CHECKLIST_VALIDACION_RLS_MULTITIENDA.md`** - Este documento

### ✅ Cambios Implementados

#### 1. Script SQL (`sql_fix_rls_clientes_multitienda.sql`)
- ✅ Función `require_current_store()` creada/verificada
- ✅ Limpieza de policies antiguas
- ✅ RLS habilitado y **FORZADO** en `clientes`
- ✅ 4 policies seguras (SELECT, INSERT, UPDATE, DELETE) solo para `authenticated`
- ✅ Índices de optimización
- ✅ Función de prueba `test_rls_clientes()`
- ✅ Template replicable para otras tablas

#### 2. Código Frontend (`src/hooks/useAuth.ts`)
- ✅ Validación de acceso a tienda en `signIn()`
- ✅ Consulta a `usuario_tiendas` antes de permitir login
- ✅ Cierre de sesión automático si no tiene acceso
- ✅ Mensajes de error claros

---

## 🚀 INSTRUCCIONES DE IMPLEMENTACIÓN

### Paso 1: Ejecutar Script SQL

**Opción A: Desde Supabase Dashboard**

1. Ir a Supabase Dashboard
2. Navegar a **SQL Editor**
3. Crear nueva query
4. Copiar y pegar el contenido de `sql_fix_rls_clientes_multitienda.sql`
5. Ejecutar (Run)
6. Verificar que no hay errores
7. Revisar los mensajes de `RAISE NOTICE` en la consola

**Opción B: Desde CLI**

```bash
# Conectar a Supabase
supabase db push

# O ejecutar directamente
psql -h db.xxx.supabase.co -U postgres -d postgres -f sql_fix_rls_clientes_multitienda.sql
```

**Resultado esperado:**
```
✅ Función require_current_store() existe
✅ Policies antiguas eliminadas
✅ RLS habilitado y forzado en tabla clientes
✅ Policies seguras creadas para authenticated
✅ Índices de optimización creados
✅ RLS habilitado: true | RLS forzado: true
✅ Total de policies en clientes: 4
```

---

### Paso 2: Verificar Implementación SQL

**Ejecutar en SQL Editor:**

```sql
-- 1. Verificar que RLS está habilitado y forzado
SELECT 
  relname AS tabla,
  relrowsecurity AS rls_habilitado,
  relforcerowsecurity AS rls_forzado
FROM pg_class
WHERE relname = 'clientes';

-- Resultado esperado:
-- tabla     | rls_habilitado | rls_forzado
-- clientes  | true           | true
```

```sql
-- 2. Listar todas las policies
SELECT 
  policyname AS nombre_policy,
  cmd AS operacion,
  roles AS roles_permitidos,
  qual AS condicion_using,
  with_check AS condicion_with_check
FROM pg_policies
WHERE tablename = 'clientes'
ORDER BY cmd;

-- Resultado esperado: 4 policies
-- authenticated_read_own_store_clientes   | SELECT | {authenticated}
-- authenticated_insert_own_store_clientes | INSERT | {authenticated}
-- authenticated_update_own_store_clientes | UPDATE | {authenticated}
-- authenticated_delete_own_store_clientes | DELETE | {authenticated}
```

```sql
-- 3. Verificar función require_current_store()
SELECT 
  proname AS nombre_funcion,
  prosecdef AS security_definer,
  provolatile AS volatilidad
FROM pg_proc
WHERE proname = 'require_current_store';

-- Resultado esperado:
-- nombre_funcion         | security_definer | volatilidad
-- require_current_store  | true             | s (stable)
```

---

### Paso 3: Reiniciar Aplicación

```bash
# Si estás en desarrollo local
npm run dev

# O recargar la página en el navegador
# Presionar F5 o Ctrl+R
```

---

## 🧪 PRUEBAS MANUALES EN LA APLICACIÓN

### Test 1: Login con Tienda Válida

**Pasos:**
1. Abrir la aplicación en el navegador
2. Ir a `/login`
3. Ingresar credenciales de un usuario válido
4. Seleccionar una tienda a la que el usuario **SÍ tiene acceso**
5. Hacer clic en "Iniciar Sesión"

**Resultado esperado:**
- ✅ Login exitoso
- ✅ Redirige al dashboard
- ✅ Puede ver el módulo de Clientes
- ✅ Puede ver clientes de su tienda

**Resultado NO esperado:**
- ❌ Error de autenticación
- ❌ No redirige al dashboard

---

### Test 2: Login con Tienda NO Válida (Simulación)

**Setup previo (SQL Editor):**
```sql
-- Crear usuario de prueba sin acceso a ninguna tienda
-- (O eliminar acceso temporal)
DELETE FROM usuario_tiendas 
WHERE usuario_id = 'uuid-del-usuario-prueba';
```

**Pasos:**
1. Intentar hacer login con ese usuario
2. Seleccionar cualquier tienda

**Resultado esperado:**
- ✅ Login rechazado
- ✅ Mensaje: "No tienes acceso a la tienda seleccionada. Contacta al administrador."
- ✅ Sesión cerrada automáticamente
- ✅ Permanece en página de login

**Resultado NO esperado:**
- ❌ Login exitoso (sería una vulnerabilidad)

---

### Test 3: Ver Clientes con Tienda Actual

**Pasos:**
1. Login exitoso con tienda válida
2. Navegar a módulo "Clientes"
3. Observar la lista de clientes

**Resultado esperado:**
- ✅ Muestra clientes de la tienda actual
- ✅ Todos los clientes tienen el mismo `tienda_id`
- ✅ NO muestra clientes de otras tiendas

**Verificación adicional (DevTools):**
```javascript
// Abrir DevTools > Console
// Ejecutar:
console.table(
  document.querySelectorAll('[data-tienda-id]')
);

// Todos deben tener el mismo tienda_id
```

---

### Test 4: Intentar Ver Clientes sin Tienda Actual

**Setup previo (SQL Editor):**
```sql
-- Eliminar tienda actual del usuario
DELETE FROM usuario_tienda_actual 
WHERE usuario_id = 'tu-user-id';
```

**Pasos:**
1. Refrescar la página (F5)
2. Intentar navegar a módulo "Clientes"

**Resultado esperado:**
- ✅ NO muestra clientes (lista vacía)
- ✅ Mensaje de error: "No hay tienda seleccionada"
- O bien:
- ✅ Redirige a página de selección de tienda

**Resultado NO esperado:**
- ❌ Muestra clientes de cualquier tienda

---

### Test 5: Crear Cliente

**Pasos:**
1. Login con tienda válida
2. Navegar a módulo "Clientes"
3. Hacer clic en "Nuevo Cliente"
4. Llenar formulario
5. Guardar

**Resultado esperado:**
- ✅ Cliente creado exitosamente
- ✅ Cliente tiene `tienda_id` de la tienda actual
- ✅ Cliente aparece en la lista

**Verificación (SQL Editor):**
```sql
-- Verificar que el cliente se creó con el tienda_id correcto
SELECT id, nombre, tienda_id 
FROM clientes 
WHERE id = 'uuid-del-cliente-recien-creado';

-- tienda_id debe coincidir con la tienda actual del usuario
```

---

### Test 6: Editar Cliente

**Pasos:**
1. Login con tienda válida
2. Navegar a módulo "Clientes"
3. Seleccionar un cliente de la lista
4. Hacer clic en "Editar"
5. Modificar algún campo
6. Guardar

**Resultado esperado:**
- ✅ Cliente actualizado exitosamente
- ✅ `tienda_id` NO cambió
- ✅ Cambios reflejados en la lista

---

### Test 7: Eliminar Cliente

**Pasos:**
1. Login con tienda válida
2. Navegar a módulo "Clientes"
3. Seleccionar un cliente de prueba
4. Hacer clic en "Eliminar"
5. Confirmar eliminación

**Resultado esperado:**
- ✅ Cliente eliminado exitosamente
- ✅ Cliente desaparece de la lista

---

## 🔬 PRUEBAS CON POSTMAN

### Setup Inicial

**1. Obtener Token JWT:**

```javascript
// Opción A: Desde DevTools
// 1. Login en la app
// 2. Abrir DevTools > Application > Local Storage
// 3. Buscar clave que contenga "auth-token"
// 4. Copiar el valor de "access_token"

// Opción B: Desde Console
localStorage.getItem('sb-xxx-auth-token');
// Copiar el access_token del JSON
```

**2. Configurar Variables en Postman:**

```
baseUrl: https://xxx.supabase.co
anonKey: tu-anon-key-aqui
accessToken: token-jwt-copiado
```

---

### Test 1: GET Clientes (Con Tienda Actual)

**Request:**
```http
GET {{baseUrl}}/rest/v1/clientes?select=*
Authorization: Bearer {{accessToken}}
apikey: {{anonKey}}
```

**Resultado esperado:**
- ✅ Status: `200 OK`
- ✅ Body: Array de clientes
- ✅ Todos tienen el mismo `tienda_id`

**Ejemplo de respuesta:**
```json
[
  {
    "id": "uuid-1",
    "nombre": "Cliente 1",
    "tienda_id": "tienda-abc-123",
    ...
  },
  {
    "id": "uuid-2",
    "nombre": "Cliente 2",
    "tienda_id": "tienda-abc-123",
    ...
  }
]
```

---

### Test 2: GET Clientes (Sin Tienda Actual)

**Setup previo:**
```sql
-- Ejecutar en SQL Editor
DELETE FROM usuario_tienda_actual 
WHERE usuario_id = 'tu-user-id';
```

**Request:**
```http
GET {{baseUrl}}/rest/v1/clientes?select=*
Authorization: Bearer {{accessToken}}
apikey: {{anonKey}}
```

**Resultado esperado:**
- ✅ Status: `200 OK`
- ✅ Body: Array vacío `[]`

O bien:
- ✅ Status: `400 Bad Request` o `500 Internal Server Error`
- ✅ Body: `{ "message": "NO_CURRENT_STORE", ... }`

---

### Test 3: GET Clientes de Otra Tienda (Intento de Bypass)

**Request:**
```http
GET {{baseUrl}}/rest/v1/clientes?tienda_id=eq.otra-tienda-uuid&select=*
Authorization: Bearer {{accessToken}}
apikey: {{anonKey}}
```

**Resultado esperado:**
- ✅ Status: `200 OK`
- ✅ Body: Array vacío `[]` (RLS filtra automáticamente)

**Resultado NO esperado:**
- ❌ Clientes de la otra tienda (sería una vulnerabilidad crítica)

---

### Test 4: POST Cliente (Crear en Tienda Actual)

**Request:**
```http
POST {{baseUrl}}/rest/v1/clientes
Authorization: Bearer {{accessToken}}
apikey: {{anonKey}}
Content-Type: application/json
Prefer: return=representation

{
  "nombre": "Cliente Test RLS",
  "tipo_cliente": "persona_fisica",
  "correo_principal": "test-rls@example.com",
  "telefono": "88888888",
  "activo": true,
  "tienda_id": "tu-tienda-actual-uuid"
}
```

**Resultado esperado:**
- ✅ Status: `201 Created`
- ✅ Body: Cliente creado con `tienda_id` correcto

---

### Test 5: POST Cliente en Otra Tienda (Intento de Bypass)

**Request:**
```http
POST {{baseUrl}}/rest/v1/clientes
Authorization: Bearer {{accessToken}}
apikey: {{anonKey}}
Content-Type: application/json
Prefer: return=representation

{
  "nombre": "Cliente Hack Test",
  "tipo_cliente": "persona_fisica",
  "correo_principal": "hack@example.com",
  "telefono": "99999999",
  "activo": true,
  "tienda_id": "otra-tienda-uuid-diferente"
}
```

**Resultado esperado:**
- ✅ Status: `400 Bad Request` o `403 Forbidden` o `500 Internal Server Error`
- ✅ Body: Error (RLS bloquea la inserción)
- ✅ Mensaje contiene "NO_CURRENT_STORE" o "new row violates row-level security policy"

**Resultado NO esperado:**
- ❌ Status: `201 Created` (sería una vulnerabilidad crítica)

---

### Test 6: PATCH Cliente de Otra Tienda (Intento de Bypass)

**Request:**
```http
PATCH {{baseUrl}}/rest/v1/clientes?id=eq.cliente-de-otra-tienda-uuid
Authorization: Bearer {{accessToken}}
apikey: {{anonKey}}
Content-Type: application/json
Prefer: return=representation

{
  "nombre": "Intento de Modificación"
}
```

**Resultado esperado:**
- ✅ Status: `200 OK`
- ✅ Body: Array vacío `[]` (no se actualizó nada)

O bien:
- ✅ Status: `404 Not Found`

**Resultado NO esperado:**
- ❌ Cliente actualizado (sería una vulnerabilidad crítica)

---

### Test 7: DELETE Cliente de Otra Tienda (Intento de Bypass)

**Request:**
```http
DELETE {{baseUrl}}/rest/v1/clientes?id=eq.cliente-de-otra-tienda-uuid
Authorization: Bearer {{accessToken}}
apikey: {{anonKey}}
```

**Resultado esperado:**
- ✅ Status: `204 No Content` (pero no eliminó nada)

O bien:
- ✅ Status: `404 Not Found`

**Verificación:**
```sql
-- El cliente de la otra tienda debe seguir existiendo
SELECT * FROM clientes WHERE id = 'cliente-de-otra-tienda-uuid';
```

---

## 🔍 PRUEBAS AVANZADAS EN SQL EDITOR

### Test 1: Simular Usuario Autenticado CON Tienda

```sql
-- Configurar contexto de usuario autenticado
BEGIN;

-- Simular role authenticated
SET LOCAL ROLE authenticated;

-- Simular JWT claims (reemplazar con UUID real)
SET LOCAL request.jwt.claims TO '{"sub": "uuid-del-usuario-aqui"}';

-- Asegurar que el usuario tiene tienda actual
INSERT INTO usuario_tienda_actual (usuario_id, tienda_id)
VALUES ('uuid-del-usuario-aqui', 'uuid-de-tienda-aqui')
ON CONFLICT (usuario_id) DO UPDATE SET tienda_id = 'uuid-de-tienda-aqui';

-- Intentar leer clientes
SELECT id, nombre, tienda_id FROM clientes LIMIT 5;

-- Resultado esperado: Solo clientes de 'uuid-de-tienda-aqui'

ROLLBACK;
```

---

### Test 2: Simular Usuario Autenticado SIN Tienda

```sql
-- Configurar contexto de usuario autenticado
BEGIN;

-- Simular role authenticated
SET LOCAL ROLE authenticated;

-- Simular JWT claims
SET LOCAL request.jwt.claims TO '{"sub": "uuid-del-usuario-aqui"}';

-- Eliminar tienda actual
DELETE FROM usuario_tienda_actual WHERE usuario_id = 'uuid-del-usuario-aqui';

-- Intentar leer clientes
SELECT id, nombre, tienda_id FROM clientes LIMIT 5;

-- Resultado esperado: 
-- ERROR: NO_CURRENT_STORE
-- O bien: 0 filas

ROLLBACK;
```

---

### Test 3: Usar Función de Prueba

```sql
-- Ejecutar función de prueba con UUIDs reales
SELECT * FROM test_rls_clientes(
  'uuid-del-usuario-prueba',
  'uuid-de-tienda-prueba'
);

-- Resultado esperado:
-- test_name                          | result | row_count | error_message
-- Test 1: Usuario CON tienda actual  | PASS   | N         | NULL
-- Test 2: Usuario SIN tienda actual  | PASS   | 0         | NO_CURRENT_STORE
```

---

### Test 4: Verificar que Postgres Bypasea RLS (Esperado)

```sql
-- Como postgres (superuser)
SELECT COUNT(*) FROM clientes;

-- Resultado: Cuenta TODOS los clientes de TODAS las tiendas
-- Esto es ESPERADO porque postgres bypasea RLS

-- Verificar que RLS está forzado
SELECT relforcerowsecurity FROM pg_class WHERE relname = 'clientes';

-- Resultado: true
-- Nota: FORCE RLS no afecta a superusers, solo a owners
```

---

## ✅ CHECKLIST FINAL DE VALIDACIÓN

### Pre-implementación
- [ ] Backup de base de datos realizado
- [ ] Backup de código actual realizado
- [ ] Documento de auditoría revisado

### Implementación SQL
- [ ] Script `sql_fix_rls_clientes_multitienda.sql` ejecutado sin errores
- [ ] Función `require_current_store()` existe y funciona
- [ ] RLS habilitado en `clientes` (verificado)
- [ ] RLS **FORZADO** en `clientes` (verificado)
- [ ] 4 policies creadas (SELECT, INSERT, UPDATE, DELETE)
- [ ] Todas las policies son `TO authenticated`
- [ ] Índices de optimización creados

### Implementación Código
- [ ] Cambios en `src/hooks/useAuth.ts` aplicados
- [ ] Validación de acceso a tienda en `signIn()` funciona
- [ ] Aplicación reiniciada

### Pruebas Manuales en App
- [ ] Test 1: Login con tienda válida ✅
- [ ] Test 2: Login con tienda NO válida (rechazado) ✅
- [ ] Test 3: Ver clientes con tienda actual ✅
- [ ] Test 4: Ver clientes sin tienda actual (vacío) ✅
- [ ] Test 5: Crear cliente ✅
- [ ] Test 6: Editar cliente ✅
- [ ] Test 7: Eliminar cliente ✅

### Pruebas con Postman
- [ ] Test 1: GET clientes con tienda ✅
- [ ] Test 2: GET clientes sin tienda (vacío) ✅
- [ ] Test 3: GET clientes de otra tienda (vacío) ✅
- [ ] Test 4: POST cliente en tienda actual ✅
- [ ] Test 5: POST cliente en otra tienda (bloqueado) ✅
- [ ] Test 6: PATCH cliente de otra tienda (bloqueado) ✅
- [ ] Test 7: DELETE cliente de otra tienda (bloqueado) ✅

### Pruebas SQL
- [ ] Test 1: Usuario CON tienda (funciona) ✅
- [ ] Test 2: Usuario SIN tienda (bloqueado) ✅
- [ ] Test 3: Función `test_rls_clientes()` ejecutada ✅
- [ ] Test 4: Postgres bypasea RLS (esperado) ✅

### Validación Final
- [ ] Usuario NO puede ver clientes de otra tienda
- [ ] Usuario NO puede crear clientes en otra tienda
- [ ] Usuario NO puede modificar clientes de otra tienda
- [ ] Usuario NO puede eliminar clientes de otra tienda
- [ ] Usuario sin tienda NO puede acceder a datos
- [ ] Login rechaza tiendas no autorizadas

---

## 🎯 CRITERIOS DE ÉXITO

### ✅ RLS Funciona al 100% Si:

1. ✅ Todos los tests manuales pasan
2. ✅ Todos los tests de Postman pasan
3. ✅ Todos los tests SQL pasan
4. ✅ NO hay vulnerabilidades detectadas
5. ✅ Usuario sin tienda NO puede acceder a datos
6. ✅ Usuario NO puede acceder a datos de otra tienda
7. ✅ Login valida acceso a tienda correctamente

---

## 🚨 SEÑALES DE ALERTA

### ❌ RLS NO Funciona Si:

1. ❌ Usuario puede ver clientes de múltiples tiendas
2. ❌ Usuario sin tienda puede ver datos
3. ❌ Usuario puede crear cliente con `tienda_id` de otra tienda
4. ❌ Usuario puede modificar cliente de otra tienda
5. ❌ Login permite seleccionar tienda no autorizada
6. ❌ Postman permite bypass de RLS

**Si alguna señal de alerta aparece:**
1. 🛑 **DETENER** el deploy a producción
2. 🔍 Revisar logs de Supabase
3. 🔍 Revisar policies en `pg_policies`
4. 🔍 Verificar que RLS está forzado
5. 📞 Contactar al equipo de desarrollo

---

## 📊 REPORTE DE RESULTADOS

### Template de Reporte

```markdown
# Reporte de Validación RLS - Clientes

**Fecha:** [FECHA]
**Ejecutado por:** [NOMBRE]
**Ambiente:** [Desarrollo/Staging/Producción]

## Resultados

### Implementación SQL
- [ ] Script ejecutado: ✅ / ❌
- [ ] RLS habilitado: ✅ / ❌
- [ ] RLS forzado: ✅ / ❌
- [ ] Policies creadas: ✅ / ❌

### Pruebas Manuales
- [ ] Login con tienda válida: ✅ / ❌
- [ ] Login con tienda inválida: ✅ / ❌
- [ ] Ver clientes: ✅ / ❌
- [ ] Crear cliente: ✅ / ❌
- [ ] Editar cliente: ✅ / ❌
- [ ] Eliminar cliente: ✅ / ❌

### Pruebas Postman
- [ ] GET clientes: ✅ / ❌
- [ ] POST cliente: ✅ / ❌
- [ ] PATCH cliente: ✅ / ❌
- [ ] DELETE cliente: ✅ / ❌
- [ ] Intentos de bypass: ✅ Bloqueados / ❌ Permitidos

### Pruebas SQL
- [ ] Usuario con tienda: ✅ / ❌
- [ ] Usuario sin tienda: ✅ / ❌
- [ ] Función de prueba: ✅ / ❌

## Conclusión

- [ ] ✅ RLS funciona al 100%
- [ ] ⚠️ RLS funciona parcialmente (detallar)
- [ ] ❌ RLS NO funciona (detallar)

## Observaciones

[Agregar observaciones, errores encontrados, etc.]

## Próximos Pasos

[Listar próximos pasos según resultados]
```

---

## 🔄 REPLICAR EN OTRAS TABLAS

### Patrón Replicable

Una vez validado que RLS funciona al 100% en `clientes`, replicar en:

1. **Prioridad Alta:**
   - [ ] `cotizaciones`
   - [ ] `pedidos`
   - [ ] `facturas_electronicas`

2. **Prioridad Media:**
   - [ ] `inventario` (caso especial: híbrido)
   - [ ] `productos` (caso especial: híbrido)
   - [ ] `tareas`

3. **Prioridad Baja:**
   - [ ] `inventario_movimientos`
   - [ ] `inventario_niveles`
   - [ ] `optimizador_proyectos_temp`

### Template SQL para Replicar

```sql
-- Reemplazar "TABLA" por el nombre de la tabla

-- Limpiar policies existentes
DROP POLICY IF EXISTS "authenticated_read_own_store_TABLA" ON TABLA;
DROP POLICY IF EXISTS "authenticated_insert_own_store_TABLA" ON TABLA;
DROP POLICY IF EXISTS "authenticated_update_own_store_TABLA" ON TABLA;
DROP POLICY IF EXISTS "authenticated_delete_own_store_TABLA" ON TABLA;

-- Habilitar y forzar RLS
ALTER TABLE TABLA ENABLE ROW LEVEL SECURITY;
ALTER TABLE TABLA FORCE ROW LEVEL SECURITY;

-- Crear policies
CREATE POLICY "authenticated_read_own_store_TABLA" 
ON TABLA FOR SELECT TO authenticated
USING (tienda_id = require_current_store());

CREATE POLICY "authenticated_insert_own_store_TABLA" 
ON TABLA FOR INSERT TO authenticated
WITH CHECK (tienda_id = require_current_store());

CREATE POLICY "authenticated_update_own_store_TABLA" 
ON TABLA FOR UPDATE TO authenticated
USING (tienda_id = require_current_store())
WITH CHECK (tienda_id = require_current_store());

CREATE POLICY "authenticated_delete_own_store_TABLA" 
ON TABLA FOR DELETE TO authenticated
USING (tienda_id = require_current_store());

-- Crear índice
CREATE INDEX IF NOT EXISTS idx_TABLA_tienda_id ON TABLA(tienda_id);
```

---

## 📚 REFERENCIAS

- **Script SQL:** `sql_fix_rls_clientes_multitienda.sql`
- **Auditoría:** `AUDITORIA_RLS_MULTITIENDA.md`
- **Documentación Supabase RLS:** https://supabase.com/docs/guides/auth/row-level-security
- **Documentación PostgreSQL RLS:** https://www.postgresql.org/docs/current/ddl-rowsecurity.html

---

## 📞 SOPORTE

Si encuentras problemas durante la validación:

1. Revisar logs de Supabase (Dashboard > Logs)
2. Revisar console del navegador (DevTools > Console)
3. Ejecutar queries de diagnóstico en SQL Editor
4. Consultar documento de auditoría
5. Contactar al equipo de desarrollo

---

**Fin del checklist de validación**
