# 🎯 DASHBOARD MODULAR CON PERMISOS GRANULARES

## 📋 RESUMEN

He implementado un **sistema de dashboard modular elegante** con **cards por módulo** y **permisos granulares**. Cada usuario verá únicamente los módulos a los que tiene acceso según sus permisos.

---

## ✅ LO QUE SE HA IMPLEMENTADO

### **1. Componentes Nuevos** 🎨

#### **`ModuleCard.tsx`**
- Card elegante y profesional para cada módulo
- Diseño con barra de color superior
- Icono grande y distintivo
- Valor principal destacado
- Indicador de cambio/estado con colores
- Hover effect con animación
- Click para navegar al módulo
- Estado de carga (skeleton)
- Logs de depuración en consola

**Características visuales:**
```
┌─────────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ ← Barra de color
│                                     │
│  Inventario              [📦]      │ ← Título + Icono
│  Control de stock y artículos      │ ← Descripción
│                                     │
│  5,644                             │ ← Valor principal
│  artículos en stock                │ ← Subtítulo
│                                     │
│  ⚠️ 12 bajo stock          →       │ ← Estado + Flecha
└─────────────────────────────────────┘
```

#### **`ModularDashboard.tsx`**
- Dashboard principal con grid de módulos
- Filtrado automático por permisos
- Header con contador de módulos disponibles
- Mensaje informativo si no hay acceso
- Logs detallados de permisos
- Grid responsive (1-4 columnas según pantalla)

**12 Módulos implementados:**
1. 📦 **Inventario** - Control de stock y artículos
2. 📄 **Cotizaciones** - Gestión de cotizaciones
3. 🛒 **Pedidos** - Gestión de pedidos
4. 👤 **Clientes** - Base de datos de clientes
5. 🏷️ **Productos** - Catálogo de productos
6. 💰 **Facturación** - Facturación electrónica
7. 🔧 **Mantenimiento** - Control de inventario avanzado
8. ✅ **Tareas** - Gestión de tareas y producción
9. 📐 **Optimizador** - Optimización de cortes 2D
10. 📍 **Seguimiento** - Seguimiento de pedidos
11. 📊 **Análisis de Tareas** - Análisis y reportes
12. 🔐 **Seguridad** - Usuarios, roles y permisos

---

### **2. Sistema de Permisos** 🔐

#### **Permisos Generales del Dashboard:**
```typescript
'dashboard:view'    // Ver dashboard principal
'dashboard:stats'   // Ver estadísticas generales
'dashboard:charts'  // Ver gráficos y análisis
'dashboard:export'  // Exportar datos del dashboard
```

#### **Permisos por Módulo (Cards):**
```typescript
'dashboard:module:inventario'       // Ver card de Inventario
'dashboard:module:cotizaciones'     // Ver card de Cotizaciones
'dashboard:module:pedidos'          // Ver card de Pedidos
'dashboard:module:clientes'         // Ver card de Clientes
'dashboard:module:productos'        // Ver card de Productos
'dashboard:module:facturacion'      // Ver card de Facturación
'dashboard:module:mantenimiento'    // Ver card de Mantenimiento
'dashboard:module:tareas'           // Ver card de Tareas
'dashboard:module:optimizador'      // Ver card de Optimizador
'dashboard:module:seguimiento'      // Ver card de Seguimiento
'dashboard:module:analisis-tareas'  // Ver card de Análisis de Tareas
'dashboard:module:seguridad'        // Ver card de Seguridad
```

---

### **3. Asignación de Permisos por Rol** 👥

#### **Administrador / Super Administrador:**
✅ Todos los permisos del dashboard
✅ Todos los módulos visibles

#### **Vendedor:**
✅ `dashboard:view`, `dashboard:stats`
✅ Módulos: Clientes, Cotizaciones, Pedidos, Productos, Inventario, Optimizador

#### **Supervisor de Ventas:**
✅ `dashboard:view`, `dashboard:stats`, `dashboard:charts`, `dashboard:export`
✅ Módulos: Clientes, Cotizaciones, Pedidos, Productos, Inventario, Facturación, Optimizador, Tareas

#### **Encargado de Inventario:**
✅ `dashboard:view`, `dashboard:stats`
✅ Módulos: Inventario, Productos, Mantenimiento, Optimizador

#### **Contador:**
✅ `dashboard:view`, `dashboard:stats`, `dashboard:charts`, `dashboard:export`
✅ Módulos: Facturación, Pedidos, Clientes

#### **Encargado de Producción:**
✅ `dashboard:view`, `dashboard:stats`
✅ Módulos: Tareas, Análisis de Tareas, Inventario, Productos, Optimizador

#### **Solo Lectura:**
✅ `dashboard:view`, `dashboard:stats`, `dashboard:charts`
✅ Módulos: Todos en modo lectura

---

### **4. Logs de Depuración** 🔍

El sistema incluye logs detallados en consola para depuración:

```javascript
// En ModuleCard.tsx
[DASHBOARD CARD] 🎯 Click en card: Inventario
[DASHBOARD CARD] 🔗 Navegando a: /inventario

// En ModularDashboard.tsx
[MODULAR DASHBOARD] 🚀 Iniciando carga de datos del dashboard
[MODULAR DASHBOARD] 📊 Obteniendo estadísticas...
[MODULAR DASHBOARD] ✅ Estadísticas obtenidas: {...}
[MODULAR DASHBOARD] 🔐 Módulo "Inventario": {permission: "inventario:view", hasAccess: true, canRead: true}
[MODULAR DASHBOARD] 📊 Módulos visibles: 8/12
[MODULAR DASHBOARD] 🏁 Carga completada

// En DashboardPage.tsx
[DASHBOARD PAGE] 🚀 Iniciando carga del dashboard
[DASHBOARD PAGE] 🎯 Permisos del usuario: {canViewCharts: true, canViewStats: true}
[DASHBOARD PAGE] 📊 Cargando actividad reciente...
[DASHBOARD PAGE] ✅ Actividad reciente obtenida: 10 registros
[DASHBOARD PAGE] 📈 Cargando datos de análisis...
[DASHBOARD PAGE] ✅ Datos de análisis obtenidos: {productos: 5, articulos: 8, usuarios: 3, clientes: 12}
```

---

## 🗄️ INSTALACIÓN DE PERMISOS EN BASE DE DATOS

### **IMPORTANTE:** 
Por seguridad, el sistema no puede ejecutar automáticamente los INSERT en las tablas de permisos. Debes ejecutar el SQL manualmente en tu **consola de Supabase**.

### **Paso 1: Abrir SQL Editor en Supabase**
1. Ve a tu proyecto en Supabase
2. Haz clic en **"SQL Editor"** en el menú lateral
3. Haz clic en **"New query"**

### **Paso 2: Ejecutar el SQL**

Copia y pega el siguiente SQL en el editor:

```sql
-- =====================================================
-- PERMISOS DEL DASHBOARD MODULAR
-- =====================================================

-- 1. INSERTAR PERMISOS GENERALES
INSERT INTO public.permisos (nombre_permiso, descripcion_permiso, modulo)
VALUES 
  ('dashboard:view', 'Ver dashboard principal', 'Dashboard'),
  ('dashboard:stats', 'Ver estadísticas generales', 'Dashboard'),
  ('dashboard:charts', 'Ver gráficos y análisis', 'Dashboard'),
  ('dashboard:export', 'Exportar datos del dashboard', 'Dashboard')
ON CONFLICT (nombre_permiso) DO NOTHING;

-- 2. INSERTAR PERMISOS DE MÓDULOS (CARDS)
INSERT INTO public.permisos (nombre_permiso, descripcion_permiso, modulo)
VALUES 
  ('dashboard:module:inventario', 'Ver card de Inventario en dashboard', 'Dashboard'),
  ('dashboard:module:cotizaciones', 'Ver card de Cotizaciones en dashboard', 'Dashboard'),
  ('dashboard:module:pedidos', 'Ver card de Pedidos en dashboard', 'Dashboard'),
  ('dashboard:module:clientes', 'Ver card de Clientes en dashboard', 'Dashboard'),
  ('dashboard:module:productos', 'Ver card de Productos en dashboard', 'Dashboard'),
  ('dashboard:module:facturacion', 'Ver card de Facturación en dashboard', 'Dashboard'),
  ('dashboard:module:mantenimiento', 'Ver card de Mantenimiento en dashboard', 'Dashboard'),
  ('dashboard:module:tareas', 'Ver card de Tareas en dashboard', 'Dashboard'),
  ('dashboard:module:optimizador', 'Ver card de Optimizador en dashboard', 'Dashboard'),
  ('dashboard:module:seguimiento', 'Ver card de Seguimiento en dashboard', 'Dashboard'),
  ('dashboard:module:analisis-tareas', 'Ver card de Análisis de Tareas en dashboard', 'Dashboard'),
  ('dashboard:module:seguridad', 'Ver card de Seguridad en dashboard', 'Dashboard')
ON CONFLICT (nombre_permiso) DO NOTHING;

-- 3. ASIGNAR A ADMINISTRADORES
INSERT INTO public.rol_permisos (rol_id, permiso_id)
SELECT r.id_rol, p.id_permiso
FROM public.roles r
CROSS JOIN public.permisos p
WHERE r.nombre_rol IN ('Administrador', 'Super Administrador')
AND p.nombre_permiso LIKE 'dashboard:%'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- 4. ASIGNAR A VENDEDOR
INSERT INTO public.rol_permisos (rol_id, permiso_id)
SELECT r.id_rol, p.id_permiso
FROM public.roles r
CROSS JOIN public.permisos p
WHERE r.nombre_rol = 'Vendedor'
AND p.nombre_permiso IN (
  'dashboard:view', 'dashboard:stats',
  'dashboard:module:clientes', 'dashboard:module:cotizaciones', 'dashboard:module:pedidos',
  'dashboard:module:productos', 'dashboard:module:inventario', 'dashboard:module:optimizador'
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- 5. ASIGNAR A SUPERVISOR DE VENTAS
INSERT INTO public.rol_permisos (rol_id, permiso_id)
SELECT r.id_rol, p.id_permiso
FROM public.roles r
CROSS JOIN public.permisos p
WHERE r.nombre_rol = 'Supervisor de Ventas'
AND p.nombre_permiso IN (
  'dashboard:view', 'dashboard:stats', 'dashboard:charts', 'dashboard:export',
  'dashboard:module:clientes', 'dashboard:module:cotizaciones', 'dashboard:module:pedidos',
  'dashboard:module:productos', 'dashboard:module:inventario', 'dashboard:module:facturacion',
  'dashboard:module:optimizador', 'dashboard:module:tareas'
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- 6. ASIGNAR A ENCARGADO DE INVENTARIO
INSERT INTO public.rol_permisos (rol_id, permiso_id)
SELECT r.id_rol, p.id_permiso
FROM public.roles r
CROSS JOIN public.permisos p
WHERE r.nombre_rol = 'Encargado de Inventario'
AND p.nombre_permiso IN (
  'dashboard:view', 'dashboard:stats',
  'dashboard:module:inventario', 'dashboard:module:productos', 'dashboard:module:mantenimiento',
  'dashboard:module:optimizador'
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- 7. ASIGNAR A CONTADOR
INSERT INTO public.rol_permisos (rol_id, permiso_id)
SELECT r.id_rol, p.id_permiso
FROM public.roles r
CROSS JOIN public.permisos p
WHERE r.nombre_rol = 'Contador'
AND p.nombre_permiso IN (
  'dashboard:view', 'dashboard:stats', 'dashboard:charts', 'dashboard:export',
  'dashboard:module:facturacion', 'dashboard:module:pedidos', 'dashboard:module:clientes'
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- 8. ASIGNAR A ENCARGADO DE PRODUCCIÓN
INSERT INTO public.rol_permisos (rol_id, permiso_id)
SELECT r.id_rol, p.id_permiso
FROM public.roles r
CROSS JOIN public.permisos p
WHERE r.nombre_rol = 'Encargado de Producción'
AND p.nombre_permiso IN (
  'dashboard:view', 'dashboard:stats',
  'dashboard:module:tareas', 'dashboard:module:analisis-tareas', 'dashboard:module:inventario',
  'dashboard:module:productos', 'dashboard:module:optimizador'
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- 9. ASIGNAR A SOLO LECTURA
INSERT INTO public.rol_permisos (rol_id, permiso_id)
SELECT r.id_rol, p.id_permiso
FROM public.roles r
CROSS JOIN public.permisos p
WHERE r.nombre_rol = 'Solo Lectura'
AND p.nombre_permiso IN (
  'dashboard:view', 'dashboard:stats', 'dashboard:charts',
  'dashboard:module:clientes', 'dashboard:module:cotizaciones', 'dashboard:module:pedidos',
  'dashboard:module:inventario', 'dashboard:module:productos', 'dashboard:module:facturacion',
  'dashboard:module:tareas', 'dashboard:module:optimizador'
)
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- 10. VERIFICAR INSTALACIÓN
SELECT 
  'Permisos de dashboard insertados' as tipo,
  COUNT(*) as total
FROM public.permisos
WHERE nombre_permiso LIKE 'dashboard:%'

UNION ALL

SELECT 
  'Asignaciones de permisos' as tipo,
  COUNT(*) as total
FROM public.rol_permisos rp
JOIN public.permisos p ON rp.permiso_id = p.id_permiso
WHERE p.nombre_permiso LIKE 'dashboard:%';
```

### **Paso 3: Ejecutar**
1. Haz clic en **"Run"** o presiona `Ctrl+Enter`
2. Verás los resultados de la verificación al final
3. Deberías ver algo como:
   ```
   Permisos de dashboard insertados: 16
   Asignaciones de permisos: 80+
   ```

---

## 🎨 DISEÑO Y CARACTERÍSTICAS

### **Colores por Módulo:**

| Módulo | Color | Gradiente |
|--------|-------|-----------|
| Inventario | Azul (`bg-blue-600`) | `from-blue-500 to-blue-600` |
| Cotizaciones | Púrpura (`bg-purple-600`) | `from-purple-500 to-purple-600` |
| Pedidos | Verde (`bg-green-600`) | `from-green-500 to-green-600` |
| Clientes | Índigo (`bg-indigo-600`) | `from-indigo-500 to-indigo-600` |
| Productos | Naranja (`bg-orange-600`) | `from-orange-500 to-orange-600` |
| Facturación | Teal (`bg-teal-600`) | `from-teal-500 to-teal-600` |
| Mantenimiento | Rojo (`bg-red-600`) | `from-red-500 to-red-600` |
| Tareas | Rosa (`bg-pink-600`) | `from-pink-500 to-pink-600` |
| Optimizador | Cian (`bg-cyan-600`) | `from-cyan-500 to-cyan-600` |
| Seguimiento | Lima (`bg-lime-600`) | `from-lime-500 to-lime-600` |
| Análisis | Ámbar (`bg-amber-600`) | `from-amber-500 to-amber-600` |
| Seguridad | Gris (`bg-slate-600`) | `from-slate-500 to-slate-600` |

### **Estados de Cambio:**

| Tipo | Color | Icono |
|------|-------|-------|
| `positive` | Verde (`text-green-600 bg-green-50`) | `ri-arrow-up-line` |
| `negative` | Rojo (`text-red-600 bg-red-50`) | `ri-arrow-down-line` |
| `warning` | Amarillo (`text-yellow-600 bg-yellow-50`) | `ri-alert-line` |
| `neutral` | Gris (`text-gray-600 bg-gray-50`) | `ri-information-line` |

### **Responsive:**
- **Móvil:** 1 columna
- **Tablet:** 2 columnas
- **Desktop:** 3 columnas
- **XL:** 4 columnas

---

## 🔍 CÓMO DEPURAR

### **1. Ver logs en consola del navegador:**
```
F12 → Console
```

### **2. Buscar logs específicos:**
```javascript
// Filtrar por módulo
[DASHBOARD CARD]
[MODULAR DASHBOARD]
[DASHBOARD PAGE]
[DEBUG PERMISOS]
```

### **3. Verificar permisos de un usuario:**
```javascript
// En la consola del navegador
console.log(window.localStorage.getItem('sb-[tu-proyecto]-auth-token'))
```

### **4. Verificar permisos en base de datos:**
```sql
-- Ver permisos de un usuario específico
SELECT 
  u.email,
  r.nombre_rol,
  p.nombre_permiso,
  p.descripcion_permiso
FROM usuarios u
JOIN usuario_roles ur ON u.id_usuario = ur.usuario_id
JOIN roles r ON ur.rol_id = r.id_rol
JOIN rol_permisos rp ON r.id_rol = rp.rol_id
JOIN permisos p ON rp.permiso_id = p.id_permiso
WHERE u.email = 'usuario@ejemplo.com'
AND p.nombre_permiso LIKE 'dashboard:%'
ORDER BY p.nombre_permiso;
```

---

## 📊 MATRIZ DE PERMISOS

Puedes ver y editar los permisos del dashboard en:

**Seguridad → Roles → [Seleccionar Rol] → Permisos**

Los permisos del dashboard aparecerán en la sección **"Dashboard"** con checkboxes para:
- ✅ Ver dashboard principal
- ✅ Ver estadísticas generales
- ✅ Ver gráficos y análisis
- ✅ Exportar datos del dashboard
- ✅ Ver card de Inventario en dashboard
- ✅ Ver card de Cotizaciones en dashboard
- ✅ ... (y así para cada módulo)

---

## 🚀 PRÓXIMOS PASOS

1. ✅ **Ejecutar el SQL** en Supabase SQL Editor
2. ✅ **Recargar la aplicación** (Ctrl+F5)
3. ✅ **Verificar el dashboard** - Deberías ver solo los módulos autorizados
4. ✅ **Probar con diferentes usuarios** - Cada rol verá diferentes módulos
5. ✅ **Ajustar permisos** si es necesario en Seguridad → Roles

---

## 💡 VENTAJAS DEL SISTEMA

| Ventaja | Descripción |
|---------|-------------|
| **Seguridad** | Control granular de acceso por módulo |
| **Escalable** | Fácil agregar nuevos módulos |
| **Profesional** | Diseño elegante y moderno |
| **Depurable** | Logs detallados en consola |
| **Flexible** | Permisos configurables por rol |
| **Responsive** | Adaptado a todos los dispositivos |
| **Performante** | Carga optimizada de datos |
| **Mantenible** | Código limpio y documentado |

---

## 📝 NOTAS IMPORTANTES

1. **Los permisos de módulo (`dashboard:module:*`) son independientes de los permisos del módulo en sí**
   - Ejemplo: Un usuario puede tener `dashboard:module:inventario` (ver card) pero NO tener `inventario:view` (acceder al módulo)
   - En este caso, verá el card pero al hacer clic será redirigido a "Sin acceso"

2. **El sistema usa lógica OR para permisos**
   - Si tienes `inventario:view` O `inventario:view:own`, verás el card de Inventario
   - Esto permite flexibilidad en la asignación de permisos

3. **Los logs son solo para desarrollo**
   - En producción, puedes deshabilitarlos comentando los `console.log()`

4. **El SQL es idempotente**
   - Puedes ejecutarlo múltiples veces sin problemas
   - Usa `ON CONFLICT DO NOTHING` para evitar duplicados

---

## 🎉 ¡LISTO!

El sistema de dashboard modular está completamente implementado y listo para usar. Solo falta ejecutar el SQL en Supabase y disfrutar de un dashboard profesional con control granular de permisos.

**¿Necesitas ayuda con algo más?** 🚀
