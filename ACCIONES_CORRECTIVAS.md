# 🔧 **ACCIONES CORRECTIVAS INMEDIATAS**
## **Lista de Fixes Prioritarios P0/P1**

---

## 🚨 **PRIORIDAD P0 (CRÍTICO - EJECUTAR INMEDIATAMENTE)**

### **1. Crear Función RPC me() - CRÍTICO**
```sql
-- Ejecutar: sql_api_perfil.sql
-- Impacto: Frontend no puede obtener permisos del usuario
-- Tiempo: 2 minutos
```

### **2. Habilitar Triggers de Sincronización - CRÍTICO**
```sql
-- Ejecutar: sql_saneamiento_usuarios.sql (PASO 5-7)
-- Impacto: Nuevos usuarios no crean perfil automáticamente
-- Tiempo: 3 minutos
```

### **3. Reparar Referencias FK Huérfanas - CRÍTICO**
```sql
-- Ejecutar función de reparación automática
SELECT * FROM public.reparar_usuarios_automatico();
-- Impacto: Errores de integridad referencial
-- Tiempo: 5 minutos
```

### **4. Reemplazar useAuth Actual - CRÍTICO**
```bash
# Reemplazar src/hooks/useAuth.ts con useAuth_mejorado.ts
# Impacto: Sistema de permisos no funciona correctamente
# Tiempo: 2 minutos
```

### **5. Crear Perfiles Faltantes - CRÍTICO**
```sql
-- Backfill de usuarios sin perfil
INSERT INTO public.usuarios (id, email, nombre_completo, rol, activo)
SELECT au.id, au.email, 'Usuario Migrado', 'Cliente', true
FROM auth.users au
LEFT JOIN public.usuarios pu ON au.id = pu.id
WHERE pu.id IS NULL AND au.deleted_at IS NULL;
-- Impacto: Usuarios no pueden usar la aplicación
-- Tiempo: 1 minuto
```

---

## ⚠️ **PRIORIDAD P1 (ALTO - EJECUTAR HOY)**

### **6. Implementar Políticas RLS Faltantes**
```sql
-- Ejecutar: sql_seguridad_roles.sql (PASO 1-4)
-- Impacto: Usuarios pueden ver datos que no deberían
-- Tiempo: 10 minutos
```

### **7. Asignar Roles a Usuarios Sin Rol**
```sql
-- Asignar rol Cliente por defecto
INSERT INTO public.usuario_roles (usuario_id, rol_id)
SELECT u.id, r.id FROM public.usuarios u, public.roles r
WHERE u.activo = true AND r.nombre = 'Cliente'
AND u.id NOT IN (SELECT usuario_id FROM public.usuario_roles);
-- Impacto: Usuarios sin permisos
-- Tiempo: 2 minutos
```

### **8. Actualizar Componentes de Permisos**
```bash
# Reemplazar componentes con PermissionComponents.tsx
# Impacto: Botones no respetan permisos granulares
# Tiempo: 15 minutos
```

### **9. Configurar Edge Function para Permisos**
```sql
-- Crear función has_permission() para uso desde Edge Functions
-- Impacto: Edge Functions no pueden validar permisos
-- Tiempo: 5 minutos
```

### **10. Verificar Integridad Completa**
```sql
-- Ejecutar verificación post-reparación
SELECT * FROM public.verificar_integridad_post_reparacion();
-- Impacto: Problemas ocultos sin detectar
-- Tiempo: 2 minutos
```

---

## 📋 **CHECKLIST DE INTEGRACIÓN FRONTEND**

### **✅ Tareas Completadas:**
- [x] Sistema de permisos granular implementado
- [x] Tablas de roles y permisos creadas
- [x] Migraciones de seguridad ejecutadas
- [x] Función fn_usuario_permisos() creada

### **🔄 Tareas Pendientes:**

#### **1. Reemplazar Hook useAuth**
```typescript
// ANTES (src/hooks/useAuth.ts)
const hasPermission = () => true; // Siempre true

// DESPUÉS (useAuth_mejorado.ts)
const hasPermission = (permission: string, ownerId?: string) => {
  // Validación real contra base de datos
};
```

#### **2. Actualizar Componentes con Permisos**
```typescript
// ANTES
<button onClick={handleEdit}>Editar</button>

// DESPUÉS
<PermissionButton permission="pedidos:edit" ownerId={pedido.created_by}>
  Editar
</PermissionButton>
```

#### **3. Implementar Validación en Formularios**
```typescript
// Agregar validaciones como:
const { can } = usePermissions();

if (!can.editPedidos(pedido.created_by)) {
  return <div>Sin permisos para editar</div>;
}
```

#### **4. Actualizar Navegación**
```typescript
// Ocultar enlaces según permisos
<PermissionWrapper permission="inventario:view">
  <NavLink to="/inventario">Inventario</NavLink>
</PermissionWrapper>
```

#### **5. Validar Acciones en Tablas**
```typescript
// En PedidosTable.tsx, CotizacionesTable.tsx, etc.
// Reemplazar botones fijos con PermissionButton
```

---

## 🎯 **MATRIZ MÓDULO → ACCIONES → PERMISOS**

| **Módulo** | **Acción** | **Permiso Requerido** | **Permiso :own** |
|------------|------------|----------------------|------------------|
| **Clientes** | Ver lista | `clientes:view` | `clientes:view:own` |
| | Crear | `clientes:create` | - |
| | Editar | `clientes:edit` | `clientes:edit:own` |
| | Eliminar | `clientes:delete` | `clientes:delete:own` |
| | Exportar | `clientes:export` | - |
| **Cotizaciones** | Ver lista | `cotizaciones:view` | `cotizaciones:view:own` |
| | Crear | `cotizaciones:create` | - |
| | Editar | `cotizaciones:edit` | `cotizaciones:edit:own` |
| | Aprobar | `cotizaciones:approve` | - |
| | Convertir | `cotizaciones:convert` | - |
| | Imprimir | `cotizaciones:print` | - |
| **Pedidos** | Ver lista | `pedidos:view` | `pedidos:view:own` |
| | Crear | `pedidos:create` | - |
| | Editar | `pedidos:edit` | `pedidos:edit:own` |
| | Confirmar | `pedidos:confirm` | - |
| | Facturar | `pedidos:invoice` | - |
| | Eliminar | `pedidos:delete` | `pedidos:delete:own` |
| | Imprimir | `pedidos:print` | - |
| **Inventario** | Ver | `inventario:view` | - |
| | Crear artículos | `inventario:create` | - |
| | Editar | `inventario:edit` | - |
| | Ajustar stock | `inventario:adjust` | - |
| | Configurar umbrales | `inventario:thresholds` | - |
| **Facturas** | Ver lista | `facturas:view` | `facturas:view:own` |
| | Crear | `facturas:create` | - |
| | Enviar Hacienda | `facturas:send` | - |
| | Anular | `facturas:cancel` | - |
| | Configurar | `facturas:config` | - |
| **Seguridad** | Ver usuarios | `seguridad:users:read` | - |
| | Crear usuarios | `seguridad:users:create` | - |
| | Editar usuarios | `seguridad:users:update` | - |
| | Gestionar roles | `seguridad:roles:update` | - |
| | Asignar permisos | `seguridad:permissions:update` | - |

---

## ⏱️ **TIEMPO ESTIMADO TOTAL: 45 MINUTOS**

### **Orden de Ejecución Recomendado:**
1. **SQL Scripts** (15 min) - Reparar base de datos
2. **Frontend Hooks** (10 min) - Actualizar useAuth
3. **Componentes** (15 min) - Implementar PermissionButton/Wrapper
4. **Verificación** (5 min) - Probar funcionalidad

### **Resultado Final:**
- ✅ Sistema de usuarios completamente sincronizado
- ✅ Permisos granulares funcionando
- ✅ Seguridad robusta con RLS
- ✅ Frontend que respeta permisos
- ✅ Auditoría completa implementada