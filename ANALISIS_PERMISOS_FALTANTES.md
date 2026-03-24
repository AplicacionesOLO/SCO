# 🔐 ANÁLISIS DETALLADO DE PERMISOS FALTANTES EN LA MATRIZ

## 📋 ÍNDICE
1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Metodología de Análisis](#metodología-de-análisis)
3. [Permisos Actuales en el Sistema](#permisos-actuales-en-el-sistema)
4. [Permisos Faltantes por Módulo](#permisos-faltantes-por-módulo)
5. [Acciones Faltantes Detectadas](#acciones-faltantes-detectadas)
6. [Recomendaciones de Implementación](#recomendaciones-de-implementación)

---

## 1. RESUMEN EJECUTIVO

### Estado Actual
El sistema cuenta con **13 módulos principales** con permisos definidos en `src/types/permissions.ts`. Sin embargo, al analizar el código de cada módulo, se detectaron **múltiples acciones que NO tienen permisos asociados** en la matriz de seguridad.

### Hallazgos Principales
- ✅ **Permisos bien implementados**: Dashboard, Clientes, Cotizaciones, Pedidos, Inventario básico
- ⚠️ **Permisos parcialmente implementados**: Productos, Facturación, Tareas, Optimizador
- ❌ **Permisos faltantes críticos**: Mantenimiento, Seguimiento, Tabla de Datos, Seguridad (acciones específicas)

### Impacto
- **Seguridad**: Acciones sin control de permisos pueden ser ejecutadas por usuarios no autorizados
- **Auditoría**: Imposible rastrear quién puede hacer qué
- **Roles**: Los roles predefinidos no cubren todas las funcionalidades

---

## 2. METODOLOGÍA DE ANÁLISIS

### Proceso de Análisis
1. **Revisión de `permissions.ts`**: Identificar permisos definidos
2. **Análisis de cada módulo**: Revisar componentes y servicios
3. **Detección de acciones**: Identificar botones, formularios, funciones
4. **Comparación**: Contrastar acciones vs permisos definidos
5. **Clasificación**: Categorizar por criticidad (Alta, Media, Baja)

### Criterios de Criticidad
- **Alta**: Acciones que modifican datos críticos o afectan múltiples registros
- **Media**: Acciones que modifican datos individuales o generan reportes
- **Baja**: Acciones de visualización o consulta

---

## 3. PERMISOS ACTUALES EN EL SISTEMA

### Permisos Definidos en `src/types/permissions.ts`

```typescript
// CLIENTES (10 permisos) ✅ COMPLETO
'clientes:view'
'clientes:view:own'
'clientes:create'
'clientes:edit'
'clientes:edit:own'
'clientes:delete'
'clientes:delete:own'
'clientes:import'
'clientes:export'
'clientes:assign'

// COTIZACIONES (11 permisos) ✅ COMPLETO
'cotizaciones:view'
'cotizaciones:view:own'
'cotizaciones:create'
'cotizaciones:edit'
'cotizaciones:edit:own'
'cotizaciones:delete'
'cotizaciones:approve'
'cotizaciones:reject'
'cotizaciones:convert'
'cotizaciones:duplicate'
'cotizaciones:export'
'cotizaciones:print'

// PEDIDOS (9 permisos) ✅ COMPLETO
'pedidos:view'
'pedidos:view:own'
'pedidos:create'
'pedidos:edit'
'pedidos:edit:own'
'pedidos:delete'
'pedidos:confirm'
'pedidos:cancel'
'pedidos:invoice'
'pedidos:print'

// INVENTARIO (10 permisos) ✅ COMPLETO
'inventario:view'
'inventario:create'
'inventario:edit'
'inventario:delete'
'inventario:adjust'
'inventario:transfer'
'inventario:import'
'inventario:export'
'inventario:categories'
'inventario:thresholds'

// PRODUCTOS (7 permisos) ⚠️ PARCIAL
'productos:view'
'productos:create'
'productos:edit'
'productos:delete'
'productos:bom'
'productos:pricing'
'productos:export'

// FACTURACIÓN (10 permisos) ⚠️ PARCIAL
'facturacion:view'
'facturacion:view:own'
'facturacion:create'
'facturacion:edit'
'facturacion:delete'
'facturacion:send'
'facturacion:cancel'
'facturacion:print'
'facturacion:export'
'facturacion:config'

// MANTENIMIENTO (6 permisos) ❌ INCOMPLETO
'mantenimiento:view'
'mantenimiento:alerts'
'mantenimiento:thresholds'
'mantenimiento:replenishment'
'mantenimiento:predictions'
'mantenimiento:config'

// SEGUIMIENTO (5 permisos) ❌ INCOMPLETO
'seguimiento:view'
'seguimiento:view:own'
'seguimiento:create'
'seguimiento:edit'
'seguimiento:delete'

// TAREAS (7 permisos) ⚠️ PARCIAL
'tareas:view'
'tareas:view:own'
'tareas:create'
'tareas:update'
'tareas:update:own'
'tareas:delete'
'tareas:manage'
'tareas:export'

// OPTIMIZADOR (6 permisos) ⚠️ PARCIAL
'optimizador:view'
'optimizador:create'
'optimizador:edit'
'optimizador:delete'
'optimizador:export'
'optimizador:bom'

// SEGURIDAD (16 permisos) ⚠️ PARCIAL
'seguridad:view'
'seguridad:users:view'
'seguridad:users:create'
'seguridad:users:edit'
'seguridad:users:delete'
'seguridad:users:activate'
'seguridad:roles:view'
'seguridad:roles:create'
'seguridad:roles:edit'
'seguridad:roles:delete'
'seguridad:permissions:view'
'seguridad:permissions:create'
'seguridad:permissions:edit'
'seguridad:permissions:delete'
'seguridad:permissions:assign'
'seguridad:usuarios:view_pendientes' // ⚠️ Inconsistencia en nomenclatura

// DASHBOARD (4 permisos) ✅ COMPLETO
'dashboard:view'
'dashboard:stats'
'dashboard:charts'
'dashboard:export'

// PERFIL (3 permisos) ✅ COMPLETO
'perfil:view'
'perfil:edit'
'perfil:password'
```

**Total de permisos definidos: 104 permisos**

---

## 4. PERMISOS FALTANTES POR MÓDULO

### 4.1 MÓDULO: PRODUCTOS

#### Acciones Detectadas sin Permiso

**1. Activar/Inactivar Producto** (Criticidad: ALTA)
```typescript
// Ubicación: src/pages/productos/page.tsx
const handleInactivarProducto = async (id: number) => {
  // Cambia el estado activo del producto
  await supabase.from('productos').update({ activo: nuevoEstado }).eq('id_producto', id);
}
```
**Permiso faltante**: `productos:activate`

**2. Búsqueda de Artículos para BOM** (Criticidad: MEDIA)
```typescript
// Ubicación: src/pages/productos/components/BuscarArticuloModal.tsx
// Permite buscar artículos de inventario para agregar al BOM
```
**Permiso faltante**: `productos:bom:search`

**3. Crear Artículo Rápido desde BOM** (Criticidad: MEDIA)
```typescript
// Ubicación: src/pages/productos/components/CrearArticuloModal.tsx
// Permite crear artículos de inventario sin salir del formulario de producto
```
**Permiso faltante**: `productos:bom:create_article`

**4. Ver Detalle de Componente BOM** (Criticidad: BAJA)
```typescript
// Ubicación: src/pages/productos/components/DetalleComponenteModal.tsx
// Muestra información detallada de un componente del BOM
```
**Permiso faltante**: `productos:bom:view_detail`

**5. Eliminar Componente del BOM** (Criticidad: ALTA)
```typescript
// Ubicación: src/pages/productos/components/BOMTable.tsx
// Permite eliminar componentes individuales del BOM
```
**Permiso faltante**: `productos:bom:delete_item`

**6. Editar Componente del BOM** (Criticidad: ALTA)
```typescript
// Ubicación: src/pages/productos/components/BOMTable.tsx
// Permite editar cantidad, precio de componentes del BOM
```
**Permiso faltante**: `productos:bom:edit_item`

#### Resumen Productos
- **Permisos actuales**: 7
- **Permisos faltantes**: 6
- **Total recomendado**: 13

---

### 4.2 MÓDULO: FACTURACIÓN

#### Acciones Detectadas sin Permiso

**1. Firmar Factura** (Criticidad: ALTA)
```typescript
// Ubicación: src/pages/facturacion/page.tsx
const handleFirmarFactura = async (factura: FacturaElectronica) => {
  // Firma digitalmente la factura con certificado .p12
}
```
**Permiso faltante**: `facturacion:sign`

**2. Consultar Estado en Hacienda** (Criticidad: MEDIA)
```typescript
// Ubicación: src/pages/facturacion/page.tsx
const handleConsultarEstado = async (factura: FacturaElectronica) => {
  // Consulta el estado de la factura en la API de Hacienda
}
```
**Permiso faltante**: `facturacion:query_status`

**3. Ver Comprobantes Recibidos** (Criticidad: MEDIA)
```typescript
// Ubicación: src/pages/facturacion/components/ComprobantesRecibidos.tsx
// Pestaña completa para gestionar comprobantes recibidos de proveedores
```
**Permiso faltante**: `facturacion:view_received`

**4. Importar Comprobante Recibido** (Criticidad: MEDIA)
```typescript
// Ubicación: src/pages/facturacion/components/ComprobantesRecibidos.tsx
// Permite importar XML de facturas recibidas
```
**Permiso faltante**: `facturacion:import_received`

**5. Validar Comprobante Recibido** (Criticidad: MEDIA)
```typescript
// Ubicación: src/pages/facturacion/components/ComprobantesRecibidos.tsx
// Valida XML de comprobante recibido contra esquema de Hacienda
```
**Permiso faltante**: `facturacion:validate_received`

**6. Reenviar a Hacienda** (Criticidad: ALTA)
```typescript
// Acción implícita: Reenviar factura rechazada o con error
```
**Permiso faltante**: `facturacion:resend`

**7. Descargar XML** (Criticidad: BAJA)
```typescript
// Acción implícita: Descargar XML firmado de la factura
```
**Permiso faltante**: `facturacion:download_xml`

**8. Ver Auditoría de Envíos** (Criticidad: MEDIA)
```typescript
// Tabla: hacienda_envios
// Ver historial completo de envíos a Hacienda
```
**Permiso faltante**: `facturacion:view_audit`

#### Resumen Facturación
- **Permisos actuales**: 10
- **Permisos faltantes**: 8
- **Total recomendado**: 18

---

### 4.3 MÓDULO: MANTENIMIENTO

#### Acciones Detectadas sin Permiso

**1. Crear Umbral** (Criticidad: ALTA)
```typescript
// Ubicación: src/pages/mantenimiento/components/ThresholdsTable.tsx
// Permite crear nuevos umbrales de inventario
```
**Permiso faltante**: `mantenimiento:thresholds:create`

**2. Editar Umbral** (Criticidad: ALTA)
```typescript
// Ubicación: src/pages/mantenimiento/components/ThresholdsTable.tsx
// Permite editar umbrales existentes (min, max, ROP, safety stock)
```
**Permiso faltante**: `mantenimiento:thresholds:edit`

**3. Eliminar Umbral** (Criticidad: ALTA)
```typescript
// Ubicación: src/pages/mantenimiento/components/ThresholdsTable.tsx
// Permite eliminar umbrales
```
**Permiso faltante**: `mantenimiento:thresholds:delete`

**4. Recalcular ROP Masivo** (Criticidad: ALTA)
```typescript
// Ubicación: src/services/mantenimientoService.ts
static async recalcularROPMasivo() {
  // Recalcula punto de reorden para todos los artículos
}
```
**Permiso faltante**: `mantenimiento:thresholds:recalculate`

**5. Marcar Alerta como Leída** (Criticidad: BAJA)
```typescript
// Ubicación: src/pages/mantenimiento/components/AlertasTable.tsx
// Permite marcar alertas individuales como leídas
```
**Permiso faltante**: `mantenimiento:alerts:mark_read`

**6. Eliminar Alertas** (Criticidad: MEDIA)
```typescript
// Ubicación: src/pages/mantenimiento/components/AlertasTable.tsx
// Permite eliminar alertas
```
**Permiso faltante**: `mantenimiento:alerts:delete`

**7. Generar Alertas Automáticas** (Criticidad: ALTA)
```typescript
// Ubicación: src/services/mantenimientoService.ts
static async generarAlertasAutomaticas() {
  // Genera alertas basadas en umbrales
}
```
**Permiso faltante**: `mantenimiento:alerts:generate`

**8. Crear Orden de Reabastecimiento** (Criticidad: ALTA)
```typescript
// Ubicación: src/pages/mantenimiento/components/ReplenishmentTable.tsx
// Permite crear órdenes manualmente
```
**Permiso faltante**: `mantenimiento:replenishment:create`

**9. Editar Orden de Reabastecimiento** (Criticidad: MEDIA)
```typescript
// Ubicación: src/pages/mantenimiento/components/ReplenishmentTable.tsx
// Permite editar cantidad sugerida, notas
```
**Permiso faltante**: `mantenimiento:replenishment:edit`

**10. Eliminar Orden de Reabastecimiento** (Criticidad: MEDIA)
```typescript
// Ubicación: src/pages/mantenimiento/components/ReplenishmentTable.tsx
// Permite eliminar órdenes
```
**Permiso faltante**: `mantenimiento:replenishment:delete`

**11. Aprobar Orden de Reabastecimiento** (Criticidad: ALTA)
```typescript
// Ubicación: src/pages/mantenimiento/components/ReplenishmentTable.tsx
// Cambia estado de borrador a emitida
```
**Permiso faltante**: `mantenimiento:replenishment:approve`

**12. Completar Orden de Reabastecimiento** (Criticidad: ALTA)
```typescript
// Ubicación: src/pages/mantenimiento/components/ReplenishmentTable.tsx
// Marca orden como completada y actualiza inventario
```
**Permiso faltante**: `mantenimiento:replenishment:complete`

**13. Cancelar Orden de Reabastecimiento** (Criticidad: MEDIA)
```typescript
// Ubicación: src/pages/mantenimiento/components/ReplenishmentTable.tsx
// Cancela orden
```
**Permiso faltante**: `mantenimiento:replenishment:cancel`

**14. Generar Órdenes Automáticas** (Criticidad: ALTA)
```typescript
// Ubicación: src/services/mantenimientoService.ts
static async generarOrdenesReabastecimiento(usuario_id: string) {
  // Genera órdenes automáticamente basadas en ROP
}
```
**Permiso faltante**: `mantenimiento:replenishment:generate`

**15. Ver KPIs** (Criticidad: BAJA)
```typescript
// Ubicación: src/pages/mantenimiento/components/DashboardKPIs.tsx
// Vista de indicadores clave de rendimiento
```
**Permiso faltante**: `mantenimiento:kpis:view`

**16. Importar Umbrales** (Criticidad: MEDIA)
```typescript
// Ubicación: src/pages/mantenimiento/components/ImportarUmbrales.tsx
// Importación masiva de umbrales desde Excel
```
**Permiso faltante**: `mantenimiento:thresholds:import`

**17. Exportar Umbrales** (Criticidad: BAJA)
```typescript
// Acción implícita: Exportar umbrales a Excel
```
**Permiso faltante**: `mantenimiento:thresholds:export`

**18. Procesar Aprobación de Cotización** (Criticidad: ALTA)
```typescript
// Ubicación: src/services/mantenimientoService.ts
static async procesarAprobacionCotizacion(cotizacion_id: number, usuario_id: string) {
  // Descarga inventario automáticamente al aprobar cotización
}
```
**Permiso faltante**: `mantenimiento:process_quote`

#### Resumen Mantenimiento
- **Permisos actuales**: 6
- **Permisos faltantes**: 18
- **Total recomendado**: 24

---

### 4.4 MÓDULO: SEGUIMIENTO

#### Acciones Detectadas sin Permiso

**1. Cambiar Estado de Solicitud** (Criticidad: ALTA)
```typescript
// Ubicación: src/pages/seguimiento/components/CambiarEstadoModal.tsx
// Permite cambiar el estado de una solicitud
```
**Permiso faltante**: `seguimiento:change_status`

**2. Ver Detalle de Solicitud** (Criticidad: BAJA)
```typescript
// Ubicación: src/pages/seguimiento/components/SeguimientoDetalleModal.tsx
// Muestra información detallada de la solicitud
```
**Permiso faltante**: `seguimiento:view_detail`

**3. Ver Historial de Estados** (Criticidad: MEDIA)
```typescript
// Ubicación: src/services/seguimientoService.ts
async getHistorialEstados(solicitudId: string)
// Muestra historial completo de cambios de estado
```
**Permiso faltante**: `seguimiento:view_history`

**4. Drag & Drop (Cambio de Estado)** (Criticidad: ALTA)
```typescript
// Ubicación: src/pages/seguimiento/components/SeguimientoKanban.tsx
const handleDragEnd = async (solicitudId: number, nuevoEstadoId: number)
// Permite arrastrar solicitudes entre columnas para cambiar estado
```
**Permiso faltante**: `seguimiento:drag_drop`

**5. Gestionar Estados** (Criticidad: ALTA)
```typescript
// Acción implícita: Crear, editar, eliminar estados personalizados
```
**Permiso faltante**: `seguimiento:manage_states`

**6. Exportar Seguimiento** (Criticidad: BAJA)
```typescript
// Acción implícita: Exportar solicitudes a Excel
```
**Permiso faltante**: `seguimiento:export`

**7. Ver Estadísticas** (Criticidad: BAJA)
```typescript
// Ubicación: src/services/seguimientoService.ts
async getStats(): Promise<SeguimientoStats>
// Muestra total, en proceso, completados, atrasados
```
**Permiso faltante**: `seguimiento:view_stats`

#### Resumen Seguimiento
- **Permisos actuales**: 5
- **Permisos faltantes**: 7
- **Total recomendado**: 12

---

### 4.5 MÓDULO: TAREAS

#### Acciones Detectadas sin Permiso

**1. Procesar Tarea** (Criticidad: ALTA)
```typescript
// Ubicación: src/pages/tareas/components/TareaProcesarModal.tsx
// Modal completo para procesar tarea (cambiar estado, agregar items, asignar personal)
```
**Permiso faltante**: `tareas:process`

**2. Cambiar Estado de Tarea** (Criticidad: ALTA)
```typescript
// Ubicación: src/pages/tareas/components/TareaProcesarModal.tsx
// Permite cambiar entre: En Cola, En Proceso, Produciendo, Esperando suministros, Terminado, Finalizado
```
**Permiso faltante**: `tareas:change_status`

**3. Asignar Personal** (Criticidad: ALTA)
```typescript
// Ubicación: src/pages/tareas/components/TareaProcesarModal.tsx
// Permite asignar colaboradores a la tarea
```
**Permiso faltante**: `tareas:assign_personnel`

**4. Agregar Items a Tarea** (Criticidad: MEDIA)
```typescript
// Ubicación: src/pages/tareas/components/TareaProcesarModal.tsx
// Permite agregar productos/materiales a la tarea
```
**Permiso faltante**: `tareas:add_items`

**5. Eliminar Items de Tarea** (Criticidad: MEDIA)
```typescript
// Ubicación: src/pages/tareas/components/TareaProcesarModal.tsx
// Permite eliminar items de la tarea
```
**Permiso faltante**: `tareas:delete_items`

**6. Configurar Encargados** (Criticidad: ALTA)
```typescript
// Ubicación: src/pages/tareas/components/ConfigEncargadosModal.tsx
// Permite configurar qué usuarios son encargados/líderes de tareas
```
**Permiso faltante**: `tareas:manage:leaders`

**7. Gestionar Colaboradores** (Criticidad: ALTA)
```typescript
// Ubicación: src/pages/tareas/components/ColaboradoresModal.tsx
// Permite crear, editar, eliminar colaboradores
```
**Permiso faltante**: `tareas:manage:collaborators`

**8. Crear Colaborador** (Criticidad: MEDIA)
```typescript
// Ubicación: src/pages/tareas/components/ColaboradoresModal.tsx
// Permite crear nuevos colaboradores
```
**Permiso faltante**: `tareas:manage:collaborators:create`

**9. Editar Colaborador** (Criticidad: MEDIA)
```typescript
// Ubicación: src/pages/tareas/components/ColaboradoresModal.tsx
// Permite editar datos de colaboradores
```
**Permiso faltante**: `tareas:manage:collaborators:edit`

**10. Eliminar Colaborador** (Criticidad: MEDIA)
```typescript
// Ubicación: src/pages/tareas/components/ColaboradoresModal.tsx
// Permite eliminar colaboradores
```
**Permiso faltante**: `tareas:manage:collaborators:delete`

**11. Importar desde Cotización** (Criticidad: MEDIA)
```typescript
// Ubicación: src/services/tareaService.ts
async importarDesdeCotizacion(cotizacionId: string): Promise<TareaItem[]>
// Importa items desde una cotización
```
**Permiso faltante**: `tareas:import_from_quote`

**12. Ver Configuración de Campos** (Criticidad: BAJA)
```typescript
// Ubicación: src/services/tareaService.ts
async getConfigCampos(): Promise<TareaConfigCampo[]>
// Ver campos configurables del formulario de tareas
```
**Permiso faltante**: `tareas:view_config`

**13. Editar Configuración de Campos** (Criticidad: ALTA)
```typescript
// Acción implícita: Configurar qué campos aparecen en el formulario de tareas
```
**Permiso faltante**: `tareas:edit_config`

#### Resumen Tareas
- **Permisos actuales**: 7
- **Permisos faltantes**: 13
- **Total recomendado**: 20

---

### 4.6 MÓDULO: OPTIMIZADOR

#### Acciones Detectadas sin Permiso

**1. Ejecutar Optimización** (Criticidad: ALTA)
```typescript
// Ubicación: src/pages/optimizador/page.tsx
const handleOptimizar = () => {
  const resultado = optimizarCortes(piezas, configuracion);
}
```
**Permiso faltante**: `optimizador:optimize`

**2. Configurar Parámetros** (Criticidad: MEDIA)
```typescript
// Ubicación: src/pages/optimizador/components/ConfiguracionModal.tsx
// Permite configurar kerf, margen, rotación, optimización de desperdicio
```
**Permiso faltante**: `optimizador:configure`

**3. Agregar Pieza Manual** (Criticidad: MEDIA)
```typescript
// Ubicación: src/pages/optimizador/components/FormularioPiezaManual.tsx
// Permite agregar piezas manualmente
```
**Permiso faltante**: `optimizador:add_piece`

**4. Editar Pieza** (Criticidad: MEDIA)
```typescript
// Ubicación: src/pages/optimizador/components/EditorPiezas.tsx
const handleEditarPieza = (index: number, piezaEditada: PiezaCorte)
```
**Permiso faltante**: `optimizador:edit_piece`

**5. Eliminar Pieza** (Criticidad: MEDIA)
```typescript
// Ubicación: src/pages/optimizador/components/EditorPiezas.tsx
const handleEliminarPieza = (index: number)
```
**Permiso faltante**: `optimizador:delete_piece`

**6. Limpiar Proyecto** (Criticidad: MEDIA)
```typescript
// Ubicación: src/pages/optimizador/page.tsx
const handleLimpiar = () => {
  setPiezas([]);
  setResultado(null);
}
```
**Permiso faltante**: `optimizador:clear`

**7. Guardar Proyecto** (Criticidad: MEDIA)
```typescript
// Ubicación: src/pages/optimizador/page.tsx
const handleGuardarProyecto = () => {
  // Exporta proyecto a Excel
}
```
**Permiso faltante**: `optimizador:save`

**8. Cargar Proyecto** (Criticidad: MEDIA)
```typescript
// Ubicación: src/pages/optimizador/components/ImportarExcelModal.tsx
// Importa proyecto desde Excel
```
**Permiso faltante**: `optimizador:load`

**9. Importar desde Excel** (Criticidad: MEDIA)
```typescript
// Ubicación: src/pages/optimizador/components/ImportarExcelModal.tsx
// Importa piezas desde archivo Excel
```
**Permiso faltante**: `optimizador:import`

**10. Crear Cotización desde Resultado** (Criticidad: ALTA)
```typescript
// Ubicación: src/pages/optimizador/components/CrearCotizacionModal.tsx
// Genera cotización con los resultados de la optimización
```
**Permiso faltante**: `optimizador:create_quote`

**11. Seleccionar Lámina Base** (Criticidad: MEDIA)
```typescript
// Ubicación: src/pages/optimizador/components/SelectorLaminaBase.tsx
// Permite seleccionar lámina base para optimización
```
**Permiso faltante**: `optimizador:select_sheet`

**12. Buscar Artículos** (Criticidad: BAJA)
```typescript
// Ubicación: src/pages/optimizador/components/BuscadorArticuloBlur.tsx
// Buscar láminas, tapacantos en inventario
```
**Permiso faltante**: `optimizador:search_articles`

**13. Ver Visualización de Cortes** (Criticidad: BAJA)
```typescript
// Ubicación: src/pages/optimizador/components/VisualizadorCortes.tsx
// Visualización gráfica de los cortes optimizados
```
**Permiso faltante**: `optimizador:view_visualization`

**14. Ver Panel de Resultados** (Criticidad: BAJA)
```typescript
// Ubicación: src/pages/optimizador/components/PanelResultados.tsx
// Ver métricas y costos de la optimización
```
**Permiso faltante**: `optimizador:view_results`

#### Resumen Optimizador
- **Permisos actuales**: 6
- **Permisos faltantes**: 14
- **Total recomendado**: 20

---

### 4.7 MÓDULO: SEGURIDAD

#### Acciones Detectadas sin Permiso

**1. Asignar Tienda a Usuario** (Criticidad: ALTA)
```typescript
// Ubicación: src/pages/seguridad/components/AsignarTiendaModal.tsx
// Permite asignar una o más tiendas a un usuario
```
**Permiso faltante**: `seguridad:users:assign_store`

**2. Remover Tienda de Usuario** (Criticidad: ALTA)
```typescript
// Ubicación: src/pages/seguridad/components/AsignarTiendaModal.tsx
// Permite remover asignación de tienda
```
**Permiso faltante**: `seguridad:users:remove_store`

**3. Cambiar Tienda Actual** (Criticidad: MEDIA)
```typescript
// Ubicación: src/pages/seguridad/components/AsignarTiendaModal.tsx
// Permite cambiar la tienda activa del usuario
```
**Permiso faltante**: `seguridad:users:change_current_store`

**4. Aprobar Usuario Pendiente** (Criticidad: ALTA)
```typescript
// Ubicación: src/pages/seguridad/components/UsuariosPendientesTab.tsx
// Permite aprobar usuarios que están esperando asignación de tienda
```
**Permiso faltante**: `seguridad:users:approve_pending`

**5. Rechazar Usuario Pendiente** (Criticidad: ALTA)
```typescript
// Ubicación: src/pages/seguridad/components/UsuariosPendientesTab.tsx
// Permite rechazar usuarios pendientes
```
**Permiso faltante**: `seguridad:users:reject_pending`

**6. Asignar Rol a Usuario** (Criticidad: ALTA)
```typescript
// Ubicación: src/pages/seguridad/components/UsuarioForm.tsx
// Permite asignar rol a usuario
```
**Permiso faltante**: `seguridad:users:assign_role`

**7. Ver Matriz de Permisos** (Criticidad: MEDIA)
```typescript
// Ubicación: src/components/security/PermissionMatrix.tsx
// Vista completa de permisos por rol
```
**Permiso faltante**: `seguridad:permissions:view_matrix`

**8. Editar Matriz de Permisos** (Criticidad: ALTA)
```typescript
// Ubicación: src/components/security/PermissionMatrix.tsx
// Permite editar permisos masivamente desde la matriz
```
**Permiso faltante**: `seguridad:permissions:edit_matrix`

**9. Cambiar Contraseña de Usuario** (Criticidad: ALTA)
```typescript
// Acción implícita: Admin cambia contraseña de otro usuario
```
**Permiso faltante**: `seguridad:users:change_password`

**10. Ver Auditoría de Acciones** (Criticidad: MEDIA)
```typescript
// Tabla: auditoria_acciones
// Ver historial de acciones de usuarios
```
**Permiso faltante**: `seguridad:view_audit`

**11. Exportar Usuarios** (Criticidad: BAJA)
```typescript
// Acción implícita: Exportar lista de usuarios a Excel
```
**Permiso faltante**: `seguridad:users:export`

**12. Exportar Roles** (Criticidad: BAJA)
```typescript
// Acción implícita: Exportar roles y permisos a Excel
```
**Permiso faltante**: `seguridad:roles:export`

#### Resumen Seguridad
- **Permisos actuales**: 16
- **Permisos faltantes**: 12
- **Total recomendado**: 28

---

### 4.8 MÓDULO: TABLA DE DATOS DE TAREAS

#### Acciones Detectadas sin Permiso

**1. Ver Tabla de Datos** (Criticidad: BAJA)
```typescript
// Ubicación: src/pages/tabla-datos-tareas/page.tsx
// Vista completa del módulo
```
**Permiso faltante**: `tabla_datos:view`

**2. Filtrar Datos** (Criticidad: BAJA)
```typescript
// Ubicación: src/pages/tabla-datos-tareas/components/TablaDatosFiltros.tsx
// Permite filtrar por estado, fecha, cliente
```
**Permiso faltante**: `tabla_datos:filter`

**3. Ver Totales por Cliente** (Criticidad: MEDIA)
```typescript
// Ubicación: src/pages/tabla-datos-tareas/components/TotalesClientesCard.tsx
// Muestra totales agrupados por cliente
```
**Permiso faltante**: `tabla_datos:view_totals`

**4. Exportar a Excel** (Criticidad: MEDIA)
```typescript
// Ubicación: src/pages/tabla-datos-tareas/page.tsx
const handleExportarExcel = async () => {
  await tablaDatosTareasService.exportarExcel(filtros);
}
```
**Permiso faltante**: `tabla_datos:export`

**5. Ver Tabla por Estado** (Criticidad: BAJA)
```typescript
// Ubicación: src/pages/tabla-datos-tareas/components/TablaPorEstado.tsx
// Vista de tareas agrupadas por estado
```
**Permiso faltante**: `tabla_datos:view_by_status`

#### Resumen Tabla de Datos
- **Permisos actuales**: 0 (módulo sin permisos definidos)
- **Permisos faltantes**: 5
- **Total recomendado**: 5

---

### 4.9 MÓDULO: COSTBOT (Asistente IA)

#### Acciones Detectadas sin Permiso

**1. Usar CostBot** (Criticidad: MEDIA)
```typescript
// Ubicación: src/components/costbot/CostBotWidget.tsx
// Widget de chat con IA
```
**Permiso faltante**: `costbot:use`

**2. Ver Historial de Conversaciones** (Criticidad: BAJA)
```typescript
// Acción implícita: Ver conversaciones anteriores
```
**Permiso faltante**: `costbot:view_history`

**3. Administrar CostBot** (Criticidad: ALTA)
```typescript
// Ubicación: src/components/costbot/CostBotAdmin.tsx
// Panel de administración de CostBot
```
**Permiso faltante**: `costbot:admin`

**4. Ingerir Documentos** (Criticidad: ALTA)
```typescript
// Ubicación: src/services/costbotIngestService.ts
// Permite subir PDFs para RAG
```
**Permiso faltante**: `costbot:ingest_documents`

**5. Eliminar Documentos** (Criticidad: ALTA)
```typescript
// Acción implícita: Eliminar documentos ingresados
```
**Permiso faltante**: `costbot:delete_documents`

**6. Ver Documentos Ingresados** (Criticidad: BAJA)
```typescript
// Acción implícita: Ver lista de documentos en el sistema RAG
```
**Permiso faltante**: `costbot:view_documents`

#### Resumen CostBot
- **Permisos actuales**: 0 (módulo sin permisos definidos)
- **Permisos faltantes**: 6
- **Total recomendado**: 6

---

## 5. ACCIONES FALTANTES DETECTADAS

### 5.1 Acciones Globales (Aplican a Múltiples Módulos)

**1. Importar desde Excel** (Criticidad: MEDIA)
- Módulos afectados: Clientes ✅, Inventario ✅, Productos ❌, Mantenimiento ❌
- Permisos faltantes:
  - `productos:import`
  - `mantenimiento:thresholds:import`

**2. Exportar a Excel** (Criticidad: BAJA)
- Módulos afectados: Clientes ✅, Cotizaciones ✅, Inventario ✅, Productos ✅, Tareas ✅, Seguimiento ❌, Tabla Datos ❌
- Permisos faltantes:
  - `seguimiento:export`
  - `tabla_datos:export`

**3. Activar/Inactivar** (Criticidad: ALTA)
- Módulos afectados: Usuarios ✅, Productos ❌, Inventario ❌
- Permisos faltantes:
  - `productos:activate`
  - `inventario:activate`

**4. Ver Detalle** (Criticidad: BAJA)
- Módulos afectados: Seguimiento ❌, Productos (BOM) ❌
- Permisos faltantes:
  - `seguimiento:view_detail`
  - `productos:bom:view_detail`

**5. Ver Historial/Auditoría** (Criticidad: MEDIA)
- Módulos afectados: Seguimiento ❌, Facturación ❌, Seguridad ❌
- Permisos faltantes:
  - `seguimiento:view_history`
  - `facturacion:view_audit`
  - `seguridad:view_audit`

---

### 5.2 Acciones Específicas Críticas

**1. Procesamiento de Cotizaciones Aprobadas** (Criticidad: ALTA)
```typescript
// Ubicación: src/services/mantenimientoService.ts
static async procesarAprobacionCotizacion(cotizacion_id: number, usuario_id: string)
```
**Impacto**: Descarga inventario automáticamente
**Permiso faltante**: `mantenimiento:process_quote`

**2. Recálculo Masivo de ROP** (Criticidad: ALTA)
```typescript
// Ubicación: src/services/mantenimientoService.ts
static async recalcularROPMasivo()
```
**Impacto**: Recalcula puntos de reorden para todos los artículos
**Permiso faltante**: `mantenimiento:thresholds:recalculate`

**3. Generación Automática de Alertas** (Criticidad: ALTA)
```typescript
// Ubicación: src/services/mantenimientoService.ts
static async generarAlertasAutomaticas()
```
**Impacto**: Genera alertas masivas basadas en umbrales
**Permiso faltante**: `mantenimiento:alerts:generate`

**4. Generación Automática de Órdenes** (Criticidad: ALTA)
```typescript
// Ubicación: src/services/mantenimientoService.ts
static async generarOrdenesReabastecimiento(usuario_id: string)
```
**Impacto**: Genera órdenes de reabastecimiento automáticas
**Permiso faltante**: `mantenimiento:replenishment:generate`

**5. Firma Digital de Facturas** (Criticidad: ALTA)
```typescript
// Ubicación: src/services/haciendaService.ts
async signXML(xml: string, settings: HaciendaSettings): Promise<string>
```
**Impacto**: Firma digitalmente facturas con certificado
**Permiso faltante**: `facturacion:sign`

**6. Asignación de Tiendas** (Criticidad: ALTA)
```typescript
// Ubicación: src/pages/seguridad/components/AsignarTiendaModal.tsx
```
**Impacto**: Controla acceso a datos de tiendas
**Permiso faltante**: `seguridad:users:assign_store`

**7. Aprobación de Usuarios Pendientes** (Criticidad: ALTA)
```typescript
// Ubicación: src/pages/seguridad/components/UsuariosPendientesTab.tsx
```
**Impacto**: Permite acceso al sistema
**Permiso faltante**: `seguridad:users:approve_pending`

---

## 6. RECOMENDACIONES DE IMPLEMENTACIÓN

### 6.1 Priorización por Criticidad

#### PRIORIDAD 1 - CRÍTICA (Implementar Inmediatamente)
**Total: 35 permisos**

**Mantenimiento (8 permisos)**:
- `mantenimiento:thresholds:create`
- `mantenimiento:thresholds:edit`
- `mantenimiento:thresholds:delete`
- `mantenimiento:thresholds:recalculate`
- `mantenimiento:alerts:generate`
- `mantenimiento:replenishment:approve`
- `mantenimiento:replenishment:complete`
- `mantenimiento:process_quote`

**Seguridad (7 permisos)**:
- `seguridad:users:assign_store`
- `seguridad:users:remove_store`
- `seguridad:users:approve_pending`
- `seguridad:users:reject_pending`
- `seguridad:users:assign_role`
- `seguridad:permissions:edit_matrix`
- `seguridad:users:change_password`

**Facturación (3 permisos)**:
- `facturacion:sign`
- `facturacion:resend`
- `facturacion:query_status`

**Productos (3 permisos)**:
- `productos:activate`
- `productos:bom:delete_item`
- `productos:bom:edit_item`

**Tareas (6 permisos)**:
- `tareas:process`
- `tareas:change_status`
- `tareas:assign_personnel`
- `tareas:manage:leaders`
- `tareas:manage:collaborators`
- `tareas:edit_config`

**Seguimiento (2 permisos)**:
- `seguimiento:change_status`
- `seguimiento:drag_drop`

**Optimizador (3 permisos)**:
- `optimizador:optimize`
- `optimizador:create_quote`
- `optimizador:save`

**CostBot (3 permisos)**:
- `costbot:admin`
- `costbot:ingest_documents`
- `costbot:delete_documents`

---

#### PRIORIDAD 2 - ALTA (Implementar en 2-4 semanas)
**Total: 28 permisos**

**Mantenimiento (6 permisos)**:
- `mantenimiento:replenishment:create`
- `mantenimiento:replenishment:generate`
- `mantenimiento:alerts:delete`
- `mantenimiento:replenishment:edit`
- `mantenimiento:replenishment:delete`
- `mantenimiento:replenishment:cancel`

**Facturación (5 permisos)**:
- `facturacion:view_received`
- `facturacion:import_received`
- `facturacion:validate_received`
- `facturacion:view_audit`
- `facturacion:download_xml`

**Productos (2 permisos)**:
- `productos:bom:search`
- `productos:bom:create_article`

**Tareas (5 permisos)**:
- `tareas:add_items`
- `tareas:delete_items`
- `tareas:manage:collaborators:create`
- `tareas:manage:collaborators:edit`
- `tareas:manage:collaborators:delete`

**Seguimiento (2 permisos)**:
- `seguimiento:manage_states`
- `seguimiento:view_history`

**Optimizador (5 permisos)**:
- `optimizador:add_piece`
- `optimizador:edit_piece`
- `optimizador:delete_piece`
- `optimizador:configure`
- `optimizador:import`

**Seguridad (3 permisos)**:
- `seguridad:users:change_current_store`
- `seguridad:permissions:view_matrix`
- `seguridad:view_audit`

---

#### PRIORIDAD 3 - MEDIA (Implementar en 1-2 meses)
**Total: 20 permisos**

**Mantenimiento (4 permisos)**:
- `mantenimiento:thresholds:import`
- `mantenimiento:thresholds:export`
- `mantenimiento:alerts:mark_read`
- `mantenimiento:kpis:view`

**Facturación (0 permisos)**: Ya cubiertos en prioridades anteriores

**Productos (1 permiso)**:
- `productos:bom:view_detail`

**Tareas (3 permisos)**:
- `tareas:import_from_quote`
- `tareas:view_config`
- `tareas:manage:collaborators` (ya existe, pero necesita subdivisión)

**Seguimiento (2 permisos)**:
- `seguimiento:view_detail`
- `seguimiento:view_stats`

**Optimizador (5 permisos)**:
- `optimizador:clear`
- `optimizador:load`
- `optimizador:select_sheet`
- `optimizador:search_articles`
- `optimizador:view_results`

**Tabla de Datos (3 permisos)**:
- `tabla_datos:view`
- `tabla_datos:view_totals`
- `tabla_datos:export`

**Seguridad (2 permisos)**:
- `seguridad:users:export`
- `seguridad:roles:export`

---

#### PRIORIDAD 4 - BAJA (Implementar cuando sea posible)
**Total: 8 permisos**

**Optimizador (1 permiso)**:
- `optimizador:view_visualization`

**Seguimiento (1 permiso)**:
- `seguimiento:export`

**Tabla de Datos (2 permisos)**:
- `tabla_datos:filter`
- `tabla_datos:view_by_status`

**CostBot (3 permisos)**:
- `costbot:use`
- `costbot:view_history`
- `costbot:view_documents`

**Mantenimiento (1 permiso)**:
- `mantenimiento:predictions` (ya existe, pero sin implementación)

---

### 6.2 Plan de Implementación Sugerido

#### FASE 1 - Seguridad Crítica (Semana 1-2)
**Objetivo**: Asegurar acciones críticas del sistema

1. Implementar permisos de **Seguridad** (7 permisos)
2. Implementar permisos de **Mantenimiento** críticos (8 permisos)
3. Implementar permisos de **Facturación** críticos (3 permisos)

**Total Fase 1: 18 permisos**

#### FASE 2 - Funcionalidades Core (Semana 3-4)
**Objetivo**: Cubrir funcionalidades principales de módulos

1. Implementar permisos de **Productos** (6 permisos)
2. Implementar permisos de **Tareas** críticos (6 permisos)
3. Implementar permisos de **Optimizador** críticos (3 permisos)
4. Implementar permisos de **Seguimiento** críticos (2 permisos)

**Total Fase 2: 17 permisos**

#### FASE 3 - Completar Módulos (Semana 5-8)
**Objetivo**: Completar permisos de todos los módulos

1. Completar permisos de **Mantenimiento** (10 permisos restantes)
2. Completar permisos de **Facturación** (5 permisos restantes)
3. Completar permisos de **Tareas** (7 permisos restantes)
4. Completar permisos de **Optimizador** (11 permisos restantes)
5. Completar permisos de **Seguimiento** (5 permisos restantes)

**Total Fase 3: 38 permisos**

#### FASE 4 - Módulos Nuevos y Refinamiento (Semana 9-12)
**Objetivo**: Agregar permisos a módulos sin definición

1. Implementar permisos de **Tabla de Datos** (5 permisos)
2. Implementar permisos de **CostBot** (6 permisos)
3. Implementar permisos de **Seguridad** restantes (5 permisos)
4. Refinamiento y pruebas

**Total Fase 4: 16 permisos**

---

### 6.3 Estructura de Permisos Recomendada

#### Formato Estándar
```typescript
'modulo:recurso:accion[:scope]'
```

#### Ejemplos de Nomenclatura Consistente

**Acciones CRUD Básicas**:
```typescript
'modulo:view'           // Ver lista
'modulo:view:own'       // Ver solo propios
'modulo:view_detail'    // Ver detalle individual
'modulo:create'         // Crear
'modulo:edit'           // Editar
'modulo:edit:own'       // Editar solo propios
'modulo:delete'         // Eliminar
'modulo:delete:own'     // Eliminar solo propios
```

**Acciones de Gestión**:
```typescript
'modulo:manage'                    // Gestión general
'modulo:manage:subrecurso'         // Gestión de subrecurso
'modulo:manage:subrecurso:create'  // Crear subrecurso
'modulo:manage:subrecurso:edit'    // Editar subrecurso
'modulo:manage:subrecurso:delete'  // Eliminar subrecurso
```

**Acciones de Importación/Exportación**:
```typescript
'modulo:import'         // Importar
'modulo:export'         // Exportar
'modulo:print'          // Imprimir
```

**Acciones de Estado**:
```typescript
'modulo:activate'       // Activar/Desactivar
'modulo:approve'        // Aprobar
'modulo:reject'         // Rechazar
'modulo:cancel'         // Cancelar
'modulo:change_status'  // Cambiar estado
```

**Acciones Específicas**:
```typescript
'modulo:accion_especifica'  // Acción única del módulo
```

---

### 6.4 Actualización de Roles Predefinidos

Una vez implementados los nuevos permisos, actualizar los grupos de permisos en `src/types/permissions.ts`:

#### Administrador Completo
- Agregar TODOS los nuevos permisos (91 adicionales)
- **Total**: 195 permisos

#### Supervisor de Ventas
- Agregar: `optimizador:*` (todos los permisos del optimizador)
- Agregar: `tareas:view`, `tareas:create`, `tareas:process`
- **Total**: ~45 permisos

#### Encargado de Inventario
- Agregar: `mantenimiento:*` (todos los permisos de mantenimiento)
- Agregar: `optimizador:view`, `optimizador:optimize`, `optimizador:export`
- **Total**: ~35 permisos

#### Encargado de Producción
- Agregar: `tareas:*` (todos los permisos de tareas)
- Agregar: `optimizador:*` (todos los permisos del optimizador)
- Agregar: `tabla_datos:*` (todos los permisos de tabla de datos)
- **Total**: ~40 permisos

#### Contador
- Agregar: `facturacion:*` (todos los permisos de facturación)
- **Total**: ~25 permisos

---

### 6.5 Implementación Técnica

#### Paso 1: Actualizar `src/types/permissions.ts`
```typescript
export const PERMISSIONS = {
  // ... permisos existentes ...
  
  // NUEVOS PERMISOS - PRODUCTOS
  'productos:activate': 'Activar/desactivar productos',
  'productos:bom:search': 'Buscar artículos para BOM',
  'productos:bom:create_article': 'Crear artículo rápido desde BOM',
  'productos:bom:view_detail': 'Ver detalle de componente BOM',
  'productos:bom:delete_item': 'Eliminar componente del BOM',
  'productos:bom:edit_item': 'Editar componente del BOM',
  
  // NUEVOS PERMISOS - FACTURACIÓN
  'facturacion:sign': 'Firmar facturas digitalmente',
  'facturacion:query_status': 'Consultar estado en Hacienda',
  'facturacion:view_received': 'Ver comprobantes recibidos',
  'facturacion:import_received': 'Importar comprobantes recibidos',
  'facturacion:validate_received': 'Validar comprobantes recibidos',
  'facturacion:resend': 'Reenviar a Hacienda',
  'facturacion:download_xml': 'Descargar XML',
  'facturacion:view_audit': 'Ver auditoría de envíos',
  
  // ... continuar con todos los permisos faltantes ...
} as const;
```

#### Paso 2: Actualizar Componentes con Validación de Permisos
```typescript
// Ejemplo: src/pages/productos/page.tsx
import { PermissionButton } from '../../components/base/PermissionButton';

<PermissionButton
  permission="productos:activate"
  onClick={() => handleInactivarProducto(producto.id)}
>
  {producto.activo ? 'Inactivar' : 'Activar'}
</PermissionButton>
```

#### Paso 3: Actualizar Base de Datos
```sql
-- Insertar nuevos permisos en la tabla permisos
INSERT INTO permisos (module, resource, action, scope, descripcion) VALUES
('productos', 'producto', 'activate', 'all', 'Activar/desactivar productos'),
('productos', 'bom', 'search', 'all', 'Buscar artículos para BOM'),
('productos', 'bom', 'create_article', 'all', 'Crear artículo rápido desde BOM'),
-- ... continuar con todos los permisos ...
```

#### Paso 4: Asignar Permisos a Roles
```sql
-- Asignar nuevos permisos al rol Admin
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT 
  (SELECT id FROM roles WHERE nombre = 'Admin'),
  id
FROM permisos
WHERE module IN ('productos', 'facturacion', 'mantenimiento', 'seguimiento', 'tareas', 'optimizador', 'seguridad', 'tabla_datos', 'costbot');
```

#### Paso 5: Actualizar Edge Function `me-permissions`
```typescript
// supabase/functions/me-permissions/index.ts
// Ya está implementado correctamente, solo verificar que funcione con nuevos permisos
```

---

## 📊 RESUMEN FINAL

### Estadísticas Generales

| Módulo | Permisos Actuales | Permisos Faltantes | Total Recomendado | % Completitud |
|--------|-------------------|-------------------|-------------------|---------------|
| Dashboard | 4 | 0 | 4 | 100% ✅ |
| Clientes | 10 | 0 | 10 | 100% ✅ |
| Inventario | 10 | 0 | 10 | 100% ✅ |
| Cotizaciones | 11 | 0 | 11 | 100% ✅ |
| Pedidos | 9 | 0 | 9 | 100% ✅ |
| Perfil | 3 | 0 | 3 | 100% ✅ |
| **Productos** | **7** | **6** | **13** | **54%** ⚠️ |
| **Facturación** | **10** | **8** | **18** | **56%** ⚠️ |
| **Tareas** | **7** | **13** | **20** | **35%** ⚠️ |
| **Optimizador** | **6** | **14** | **20** | **30%** ⚠️ |
| **Seguridad** | **16** | **12** | **28** | **57%** ⚠️ |
| **Seguimiento** | **5** | **7** | **12** | **42%** ⚠️ |
| **Mantenimiento** | **6** | **18** | **24** | **25%** ❌ |
| **Tabla Datos** | **0** | **5** | **5** | **0%** ❌ |
| **CostBot** | **0** | **6** | **6** | **0%** ❌ |
| **TOTAL** | **104** | **89** | **193** | **54%** |

### Conclusiones

1. **Cobertura Actual**: El sistema tiene **54% de cobertura** de permisos
2. **Permisos Faltantes**: Se detectaron **89 permisos faltantes**
3. **Módulos Críticos**: Mantenimiento, Tabla de Datos y CostBot requieren atención urgente
4. **Riesgo de Seguridad**: Múltiples acciones críticas sin control de permisos

### Recomendación Final

**Implementar los permisos faltantes en 4 fases durante 12 semanas**, priorizando:
1. ✅ Seguridad crítica (Semana 1-2)
2. ✅ Funcionalidades core (Semana 3-4)
3. ✅ Completar módulos (Semana 5-8)
4. ✅ Módulos nuevos (Semana 9-12)

Esto garantizará un sistema robusto, seguro y completamente auditable.

---

**Documento generado**: 2025-01-XX
**Versión**: 1.0
**Autor**: Análisis Automatizado del Sistema OLO
