# 📚 DOCUMENTACIÓN COMPLETA DEL SISTEMA OLO
## Sistema ERP Empresarial para Gestión Logística y Manufactura

**Versión:** 2.0  
**Última Actualización:** Enero 2025  
**Nivel de Documentación:** Corporativo Premium  

---

## 📑 TABLA DE CONTENIDOS

1. [Visión General](#-visión-general)
2. [Arquitectura del Sistema](#-arquitectura-del-sistema)
3. [Módulos del Sistema](#-módulos-del-sistema)
4. [Diagramas UML](#-diagramas-uml)
5. [Flujos de Error y Manejo de Excepciones](#-flujos-de-error-y-manejo-de-excepciones)
6. [Glosario Técnico Ampliado](#-glosario-técnico-ampliado)
7. [Manual de APIs Internas](#-manual-de-apis-internas)
8. [Métricas y KPIs del Sistema](#-métricas-y-kpis-del-sistema)
9. [Sistema de Seguridad](#-sistema-de-seguridad)
10. [Sistema Multi-Tienda](#-sistema-multi-tienda)
11. [Flujos de Trabajo Principales](#-flujos-de-trabajo-principales)
12. [Base de Datos](#-base-de-datos)
13. [Optimizaciones](#-optimizaciones)

---

## 🎯 VISIÓN GENERAL

**OLO (Overseas Logistics Operations)** es un sistema ERP empresarial completo para gestión logística y manufactura.

### Características Principales
- ✅ **Multi-Tienda**: Soporte para múltiples sucursales con datos aislados
- ✅ **Multi-Usuario**: Sistema de roles y permisos granulares
- ✅ **Tiempo Real**: Actualizaciones en vivo con Supabase Realtime
- ✅ **Optimización 2D**: Algoritmo de corte de láminas
- ✅ **Facturación Electrónica**: Integración con Hacienda CR
- ✅ **Mantenimiento Predictivo**: Alertas automáticas de inventario
- ✅ **CostBot**: Asistente IA con RAG para consultas de costos

### Stack Tecnológico
```
Frontend: React 19 + TypeScript + Vite + TailwindCSS
Backend: Supabase (PostgreSQL + Edge Functions + Auth + Realtime)
Integraciones: Hacienda CR API, OpenAI (CostBot)
Infraestructura: Edge Computing, Row Level Security (RLS)
```

---

## 🏗️ ARQUITECTURA DEL SISTEMA

### Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────┐
│                        CAPA DE PRESENTACIÓN                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   React 19   │  │  TailwindCSS │  │  TypeScript  │          │
│  │   + Vite     │  │   Styling    │  │  Type Safety │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      CAPA DE SERVICIOS                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Services    │  │    Hooks     │  │   Context    │          │
│  │  (API Calls) │  │  (useAuth,   │  │  (Global     │          │
│  │              │  │   usePerms)  │  │   State)     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE EDGE FUNCTIONS                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ facturar-    │  │  consume-    │  │  costbot-    │          │
│  │  pedido      │  │  inventory   │  │   query      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ poll-        │  │ me-          │  │  enviar-     │          │
│  │ hacienda     │  │ permissions  │  │  notificacion│          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    CAPA DE DATOS (PostgreSQL)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Supabase    │  │  Row Level   │  │  Realtime    │          │
│  │  PostgreSQL  │  │  Security    │  │  Subscriptions│         │
│  │  (50+ tablas)│  │  (RLS)       │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    INTEGRACIONES EXTERNAS                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Hacienda CR │  │   OpenAI     │  │   Email      │          │
│  │  (Factura    │  │  (CostBot    │  │  (Notif.)    │          │
│  │   Electrónica)│  │   RAG)       │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 MÓDULOS DEL SISTEMA

### 1. DASHBOARD
**Ubicación**: `src/pages/dashboard/`

**Propósito**: Panel de control con métricas en tiempo real

**Componentes**:
- `StatsCards.tsx`: Estadísticas generales
- `ChartsSection.tsx`: Gráficos de ventas
- `TopQuotedProducts.tsx`: Productos más cotizados
- `TopUsedArticles.tsx`: Artículos más usados
- `TopQuotingUsers.tsx`: Usuarios destacados
- `TopQuotingClients.tsx`: Clientes VIP

**Métricas**:
- Total inventario y valor
- Cotizaciones activas
- Solicitudes pendientes
- Clientes totales
- Productos con BOM
- Artículos con stock bajo

---

### 2. CLIENTES
**Ubicación**: `src/pages/clientes/`

**Propósito**: Gestión de clientes con validación de Hacienda CR

**Funcionalidades**:
- CRUD completo de clientes
- Validación de identificación (cédula física, jurídica, DIMEX, NITE, pasaporte)
- Integración con API de Hacienda para validación
- Geolocalización (país, provincia, cantón, distrito)
- Importación masiva desde Excel
- Búsqueda avanzada

**Campos Principales**:
```typescript
- tipo_identificacion
- identificacion
- nombre_razon_social
- correo_principal
- telefono_numero
- ubicación (provincia, cantón, distrito)
- actividad_economica_id
- exoneracion (tipo, número, institución, vencimiento)
- hacienda_estado_validacion
```

---

### 3. INVENTARIO
**Ubicación**: `src/pages/inventario/`

**Propósito**: Gestión de artículos con categorías especiales

**Categorías Especiales**:
- **LAMINAS**: Con dimensiones (largo, ancho, espesor) para optimizador
- **TAPACANTOS**: Para bordes de piezas
- **HH (Horas Hombre)**: Servicios
- **CONSUMIBLES**: Materiales consumibles
- **PERFORACION**: Servicios de perforación

**Funcionalidades**:
- CRUD de artículos
- Cálculo automático de precio (costo + ganancia%)
- Búsqueda en tiempo real
- Importación/Exportación Excel
- Gestión de categorías
- Dimensiones especiales para láminas

**Campos Clave**:
```typescript
- codigo_articulo
- descripcion_articulo
- cantidad_articulo
- costo_articulo
- ganancia_articulo (%)
- precio_articulo (calculado)
- espesor_mm, largo_lamina_mm, ancho_lamina_mm (para láminas)
```

---

### 4. PRODUCTOS
**Ubicación**: `src/pages/productos/`

**Propósito**: Productos con lista de materiales (BOM)

**Funcionalidades**:
- CRUD de productos
- Gestión de BOM (Bill of Materials)
- Cálculo automático de costo total desde BOM
- Búsqueda de artículos para agregar al BOM
- Creación rápida de artículos
- Paginación avanzada (10, 50, 100 registros)
- Activar/Inactivar productos

**Estructura BOM**:
```typescript
BOMItem {
  id_componente: number (referencia a inventario)
  cantidad_x_unidad: number
  precio_ajustado: number
}

costo_total_producto = Σ (cantidad_x_unidad * precio_ajustado)
```

---

### 5. COTIZACIONES
**Ubicación**: `src/pages/cotizaciones/`

**Propósito**: Gestión de cotizaciones normales y del optimizador

**Tipos de Cotizaciones**:

1. **Cotización Normal**
   - Items son productos del catálogo
   - Cálculo manual de precios

2. **Cotización del Optimizador** 🆕
   - Creada desde módulo Optimizador 2D
   - Items son piezas optimizadas
   - Incluye costos de material, tapacantos, HH
   - Metadata con información del proyecto
   - Encabezado personalizado con logo

**Estados**:
- Borrador → Enviada → Aceptada/Rechazada

**Funcionalidades**:
- CRUD completo
- Duplicar cotización
- Convertir a pedido
- Impresión y PDF
- Filtros avanzados
- Búsqueda en tiempo real

**Cálculos**:
```typescript
item.subtotal = (cantidad * precio_unitario) * (1 - descuento/100)
cotizacion.subtotal = Σ item.subtotal
cotizacion.descuento_valor = subtotal * (descuento_global/100)
cotizacion.base_imponible = subtotal - descuento_valor
cotizacion.impuesto_valor = base_imponible * (impuestos/100)
cotizacion.total = base_imponible + impuesto_valor + flete + otros
```

---

### 6. PEDIDOS
**Ubicación**: `src/pages/pedidos/`

**Propósito**: Gestión de pedidos con reservas de inventario

**Estados**:
1. **Borrador**: En creación, editable
2. **Confirmado**: Crea reservas de inventario
3. **Facturado**: Descarga inventario
4. **Cancelado**: Libera reservas

**Funcionalidades**:
- CRUD de pedidos
- Crear desde cotización aceptada
- Reservas automáticas de inventario
- Liberación de reservas al cancelar
- Facturación integrada
- Panel de seguimiento

**Flujo de Reservas**:
```
Confirmar → Validar stock → Crear reservas → Estado: confirmado
Cancelar → Eliminar reservas → Estado: cancelado
Facturar → Descargar inventario → Eliminar reservas → Estado: facturado
```

---

### 7. FACTURACIÓN ELECTRÓNICA
**Ubicación**: `src/pages/facturacion/`

**Propósito**: Facturación electrónica integrada con Hacienda CR

**Tipos de Documentos**:
- 01: Factura Electrónica
- 02: Nota de Débito
- 03: Nota de Crédito
- 04: Tiquete Electrónico

**Flujo de Facturación**:
```
1. Crear factura (borrador)
2. Generar XML según esquema Hacienda v4.3
3. Firmar XML con certificado .p12 (XAdES-EPES)
4. Enviar a API de Hacienda
5. Consultar estado periódicamente
6. Actualizar estado (aceptado/rechazado)
```

**Configuración Requerida**:
- Ambiente (sandbox/producción)
- Cédula emisor
- Código actividad económica
- Usuario y password IDP
- Certificado digital .p12
- Password del certificado

**Edge Functions**:
- `facturar-pedido`: Facturar pedido completo
- `poll-hacienda-status`: Consultar estado

---

### 8. OPTIMIZADOR DE CORTES 2D
**Ubicación**: `src/pages/optimizador/`

**Propósito**: Optimización de cortes de láminas para minimizar desperdicio

**Modos de Operación**:
1. **Manual**: Agregar piezas manualmente
2. **BOM**: Cargar piezas desde producto existente

**Algoritmo de Optimización**:
```
1. Agrupar piezas por material
2. Para cada grupo:
   a. Validar restricciones de veta
   b. Ordenar por área (descendente)
   c. Aplicar algoritmo Guillotine 2D
   d. Colocar piezas respetando veta
   e. Calcular costos
3. Retornar resultado con métricas
```

**Validación de Veta**:
- **Veta S (Paralela)**: Lado largo de pieza paralelo a veta de lámina
- **Veta X (Perpendicular)**: Lado largo perpendicular a veta
- **Veta N (Sin veta)**: Cualquier orientación

**Cálculo de Costos**:
```typescript
// Material (proporcional al área)
costo_material = (area_pieza / area_lamina) * precio_lamina

// Tapacantos
costo_tapacantos = Σ (metros_lineales / 1000) * precio_unitario

// Horas Hombre (estimado)
segundos_corte = (perimetro / 10) + 5
costo_hh = segundos_corte * costo_hh_por_segundo

// Total
costo_total = costo_material + costo_tapacantos + costo_hh
```

**Funcionalidades**:
- Optimización automática
- Visualización gráfica de cortes
- Exportación a Excel
- Importación desde Excel
- Crear cotización desde resultado
- Guardar/Cargar proyectos

---

### 9. TAREAS
**Ubicación**: `src/pages/tareas/`

**Propósito**: Gestión de tareas de producción

**Estados**:
1. En Cola
2. En Proceso
3. Produciendo
4. Esperando suministros
5. Terminado
6. Finalizado

**Funcionalidades**:
- CRUD de tareas
- Consecutivo automático
- Formulario dinámico configurable
- Asignación de colaboradores
- Gestión de items/materiales
- Cálculo de costos
- Notificaciones por email (opcional)
- Exportación a Excel

**Edge Functions**:
- `enviar-notificacion-tarea`: Notificaciones automáticas

---

### 10. SEGUIMIENTO
**Ubicación**: `src/pages/seguimiento/`

**Propósito**: Seguimiento de solicitudes con estados personalizables

**Vistas**:
- **Kanban**: Tablero con columnas por estado
- **Timeline**: Línea de tiempo

**Funcionalidades**:
- Drag & Drop para cambiar estados
- Historial de cambios
- Filtros avanzados
- Estadísticas (total, en proceso, completados, atrasados)

---

### 11. MANTENIMIENTO DE INVENTARIO
**Ubicación**: `src/pages/mantenimiento/`

**Propósito**: Mantenimiento predictivo con alertas automáticas

**Conceptos Clave**:

**Punto de Reorden (ROP)**:
```
ROP = safety_stock + (demanda_promedio_dia * lead_time_dias)
```

**Cantidad Sugerida**:
```
qty_sugerida = max(max_qty - disponible, 0)
// Ajustada por lote mínimo
```

**Semáforo de Estado**:
- 🔴 **CRÍTICO**: disponible ≤ 0 o < min_qty
- 🟡 **ADVERTENCIA**: disponible < reorder_point
- 🟢 **NORMAL**: disponible ≥ reorder_point

**Funcionalidades**:
- Gestión de umbrales (min, max, ROP, safety stock)
- Alertas automáticas
- Órdenes de reabastecimiento sugeridas
- Predicción de demanda
- KPIs en tiempo real
- Recálculo masivo de ROP
- Procesamiento de cotizaciones aprobadas

---

### 12. SEGURIDAD
**Ubicación**: `src/pages/seguridad/`

**Propósito**: Administración de usuarios, roles y permisos

**Funcionalidades**:
- Gestión de usuarios
- Asignación de tiendas
- Gestión de roles
- Asignación de permisos
- Matriz de permisos
- Usuarios pendientes
- Activar/Desactivar usuarios
- Cambiar contraseña

**Grupos de Permisos Predefinidos**:
- Administrador Completo
- Vendedor
- Supervisor de Ventas
- Encargado de Inventario
- Encargado de Producción
- Contador
- Solo Lectura

---

### 13. PERFIL
**Ubicación**: `src/pages/perfil/`

**Propósito**: Gestión del perfil de usuario

**Funcionalidades**:
- Ver información personal
- Editar datos de perfil
- Cambiar contraseña
- Ver permisos asignados
- Ver roles asignados

---

### 14. TABLA DE DATOS DE TAREAS
**Ubicación**: `src/pages/tabla-datos-tareas/`

**Propósito**: Análisis de datos de tareas

**Funcionalidades**:
- Vista de tareas por estado
- Totales por cliente
- Filtros avanzados
- Exportación a Excel

---

### 15. COSTBOT (Asistente IA)
**Ubicación**: `src/components/costbot/`

**Propósito**: Asistente inteligente con RAG para consultas de costos

**Funcionalidades**:
- Consultas en lenguaje natural
- Búsqueda semántica en documentos PDF
- Respuestas contextualizadas
- Ingesta de documentos (facturas, cotizaciones, manuales)
- Historial de conversaciones

**Edge Functions**:
- `costbot-query`: Procesar consultas con OpenAI
- `costbot-ingest-pdf`: Extraer y vectorizar documentos

---

## 🎨 DIAGRAMAS UML

### Diagrama de Secuencia: Confirmar Pedido

```
┌──────┐         ┌──────────┐         ┌──────────┐         ┌──────────┐
│Usuario│         │ Frontend │         │  Service │         │ Supabase │
└───┬──┘         └────┬─────┘         └────┬─────┘         └────┬─────┘
    │                 │                     │                     │
    │ 1. Click       │                     │                     │
    │ "Confirmar"    │                     │                     │
    ├───────────────>│                     │                     │
    │                │                     │                     │
    │                │ 2. confirmarPedido()│                     │
    │                ├────────────────────>│                     │
    │                │                     │                     │
    │                │                     │ 3. SELECT pedido    │
    │                │                     ├────────────────────>│
    │                │                     │                     │
    │                │                     │ 4. Pedido data      │
    │                │                     │<────────────────────┤
    │                │                     │                     │
    │                │                     │ 5. Validar estado   │
    │                │                     │ (debe ser borrador) │
    │                │                     │                     │
    │                │                     │ 6. SELECT items     │
    │                │                     ├────────────────────>│
    │                │                     │                     │
    │                │                     │ 7. Items data       │
    │                │                     │<────────────────────┤
    │                │                     │                     │
    │                │                     │ 8. Validar stock    │
    │                │                     │ disponible          │
    │                │                     ├────────────────────>│
    │                │                     │                     │
    │                │                     │ 9. Stock OK         │
    │                │                     │<────────────────────┤
    │                │                     │                     │
    │                │                     │ 10. INSERT reservas │
    │                │                     ├────────────────────>│
    │                │                     │                     │
    │                │                     │ 11. Reservas creadas│
    │                │                     │<────────────────────┤
    │                │                     │                     │
    │                │                     │ 12. UPDATE pedido   │
    │                │                     │ estado='confirmado' │
    │                │                     ├────────────────────>│
    │                │                     │                     │
    │                │                     │ 13. Pedido updated  │
    │                │                     │<────────────────────┤
    │                │                     │                     │
    │                │ 14. Success         │                     │
    │                │<────────────────────┤                     │
    │                │                     │                     │
    │ 15. Mostrar    │                     │                     │
    │ confirmación   │                     │                     │
    │<───────────────┤                     │                     │
    │                │                     │                     │
```

---

### Diagrama de Secuencia: Facturar Pedido

```
┌──────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│Usuario│    │ Frontend │    │Edge Func │    │ Supabase │    │Hacienda  │
└───┬──┘    └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘
    │            │                │                │                │
    │ 1. Click  │                │                │                │
    │ "Facturar"│                │                │                │
    ├──────────>│                │                │                │
    │            │                │                │                │
    │            │ 2. POST        │                │                │
    │            │ /facturar-     │                │                │
    │            │ pedido         │                │                │
    │            ├───────────────>│                │                │
    │            │                │                │                │
    │            │                │ 3. Validar    │                │
    │            │                │ autenticación │                │
    │            │                │                │                │
    │            │                │ 4. SELECT     │                │
    │            │                │ pedido        │                │
    │            │                ├───────────────>│                │
    │            │                │                │                │
    │            │                │ 5. Pedido data│                │
    │            │                │<───────────────┤                │
    │            │                │                │                │
    │            │                │ 6. Generar    │                │
    │            │                │ consecutivo   │                │
    │            │                │ y clave (50)  │                │
    │            │                │                │                │
    │            │                │ 7. INSERT     │                │
    │            │                │ factura       │                │
    │            │                ├───────────────>│                │
    │            │                │                │                │
    │            │                │ 8. Factura    │                │
    │            │                │ creada        │                │
    │            │                │<───────────────┤                │
    │            │                │                │                │
    │            │                │ 9. INSERT     │                │
    │            │                │ factura_items │                │
    │            │                ├───────────────>│                │
    │            │                │                │                │
    │            │                │ 10. Generar   │                │
    │            │                │ XML v4.3      │                │
    │            │                │                │                │
    │            │                │ 11. Firmar XML│                │
    │            │                │ (XAdES-EPES)  │                │
    │            │                │                │                │
    │            │                │ 12. POST XML  │                │
    │            │                │ firmado       │                │
    │            │                ├───────────────────────────────>│
    │            │                │                │                │
    │            │                │ 13. Respuesta │                │
    │            │                │ Hacienda      │                │
    │            │                │<───────────────────────────────┤
    │            │                │                │                │
    │            │                │ 14. UPDATE    │                │
    │            │                │ factura estado│                │
    │            │                ├───────────────>│                │
    │            │                │                │                │
    │            │                │ 15. UPDATE    │                │
    │            │                │ pedido estado │                │
    │            │                │ ='facturado'  │                │
    │            │                ├───────────────>│                │
    │            │                │                │                │
    │            │                │ 16. UPDATE    │                │
    │            │                │ reservas      │                │
    │            │                │ ='consumida'  │                │
    │            │                ├───────────────>│                │
    │            │                │                │                │
    │            │ 17. Success    │                │                │
    │            │<───────────────┤                │                │
    │            │                │                │                │
    │ 18. Mostrar│                │                │                │
    │ factura    │                │                │                │
    │<───────────┤                │                │                │
    │            │                │                │                │
```

---

### Diagrama de Estados: Pedido

```
                    ┌──────────────┐
                    │   BORRADOR   │
                    │              │
                    │ - Editable   │
                    │ - Sin reservas│
                    └──────┬───────┘
                           │
                           │ confirmar()
                           │
                           ↓
                    ┌──────────────┐
                    │ CONFIRMADO   │
                    │              │
                    │ - No editable│
                    │ - Con reservas│
                    └──┬───────┬───┘
                       │       │
          cancelar()   │       │ facturar()
                       │       │
                       ↓       ↓
              ┌────────────┐  ┌────────────┐
              │ CANCELADO  │  │ FACTURADO  │
              │            │  │            │
              │ - Reservas │  │ - Inventario│
              │   liberadas│  │   consumido│
              └────────────┘  └────────────┘
```

---

### Diagrama de Estados: Factura Electrónica

```
                    ┌──────────────┐
                    │   BORRADOR   │
                    │              │
                    │ - XML no     │
                    │   generado   │
                    └──────┬───────┘
                           │
                           │ firmar()
                           │
                           ↓
                    ┌──────────────┐
                    │   FIRMADA    │
                    │              │
                    │ - XML firmado│
                    │ - No enviada │
                    └──────┬───────┘
                           │
                           │ enviar()
                           │
                           ↓
                    ┌──────────────┐
                    │   ENVIADA    │
                    │              │
                    │ - Esperando  │
                    │   respuesta  │
                    └──┬───────┬───┘
                       │       │
        poll_status()  │       │ poll_status()
                       │       │
                       ↓       ↓
              ┌────────────┐  ┌────────────┐
              │  ACEPTADA  │  │ RECHAZADA  │
              │            │  │            │
              │ - Válida   │  │ - Revisar  │
              │ - Consumir │  │   errores  │
              │   inventario│  │            │
              └────────────┘  └────────────┘
```

---

### Diagrama de Estados: Seguimiento de Solicitudes

```
    ┌──────────┐
    │  NUEVA   │
    │          │
    └────┬─────┘
         │
         │ asignar()
         │
         ↓
    ┌──────────┐
    │ ASIGNADA │
    │          │
    └────┬─────┘
         │
         │ iniciar()
         │
         ↓
    ┌──────────┐
    │EN PROCESO│
    │          │
    └─┬──────┬─┘
      │      │
      │      │ pausar()
      │      │
      │      ↓
      │  ┌──────────┐
      │  │ PAUSADA  │
      │  │          │
      │  └────┬─────┘
      │       │
      │       │ reanudar()
      │       │
      │       ↓
      │  ┌──────────┐
      │  │EN PROCESO│
      │  │          │
      │  └────┬─────┘
      │       │
      │ completar()
      │       │
      ↓       ↓
    ┌──────────┐
    │COMPLETADA│
    │          │
    └──────────┘
```

---

## ⚠️ FLUJOS DE ERROR Y MANEJO DE EXCEPCIONES

### 1. Error: Stock Insuficiente al Confirmar Pedido

**Escenario**: Usuario intenta confirmar un pedido pero no hay stock suficiente

**Flujo**:
```
1. Usuario hace clic en "Confirmar Pedido"
2. Sistema valida stock disponible para cada item
3. Si stock < cantidad_requerida:
   ├─> Mostrar error: "Stock insuficiente para [nombre_articulo]"
   ├─> Mostrar disponible: X unidades
   ├─> Mostrar requerido: Y unidades
   ├─> Sugerir: "Ajustar cantidad o reabastecer inventario"
   └─> Mantener pedido en estado "borrador"
4. Usuario puede:
   ├─> Editar cantidades
   ├─> Eliminar items sin stock
   └─> Esperar reabastecimiento
```

**Código de Error**: `INSUFFICIENT_STOCK`

**Respuesta HTTP**: `400 Bad Request`

**Payload**:
```json
{
  "ok": false,
  "code": "INSUFFICIENT_STOCK",
  "message": "Stock insuficiente para confirmar pedido",
  "details": [
    {
      "articulo_id": 123,
      "articulo_nombre": "Lámina MDF 18mm",
      "disponible": 5,
      "requerido": 10,
      "faltante": 5
    }
  ]
}
```

---

### 2. Error: Edge Function No Puede Firmar XML

**Escenario**: La Edge Function `facturar-pedido` falla al firmar el XML

**Flujo**:
```
1. Edge Function intenta firmar XML con certificado .p12
2. Posibles causas de error:
   ├─> Certificado expirado
   ├─> Password incorrecto
   ├─> Certificado corrupto
   └─> Formato XML inválido
3. Sistema captura error y registra en debug_log
4. Respuesta al frontend con código específico
5. Factura queda en estado "borrador"
6. Usuario puede:
   ├─> Verificar configuración de certificado
   ├─> Actualizar certificado
   └─> Reintentar firma
```

**Código de Error**: `XML_SIGN_FAILED`

**Respuesta HTTP**: `500 Internal Server Error`

**Payload**:
```json
{
  "ok": false,
  "code": "XML_SIGN_FAILED",
  "message": "Error al firmar XML de factura",
  "correlationId": "uuid-1234",
  "stage": "sign_xml",
  "details": {
    "reason": "CERT_EXPIRED",
    "cert_expiry": "2024-12-31",
    "suggestion": "Actualice el certificado digital en Configuración"
  }
}
```

---

### 3. Error: Reserva Duplicada

**Escenario**: Se intenta crear una reserva que ya existe

**Flujo**:
```
1. Sistema intenta crear reserva de inventario
2. PostgreSQL detecta violación de constraint UNIQUE
3. Error capturado en servicio
4. Sistema verifica si reserva existente es válida
5. Si reserva válida:
   ├─> Usar reserva existente
   └─> Continuar flujo normal
6. Si reserva inválida (expirada):
   ├─> Eliminar reserva antigua
   ├─> Crear nueva reserva
   └─> Continuar flujo normal
```

**Código de Error**: `DUPLICATE_RESERVATION`

**Respuesta HTTP**: `409 Conflict`

**Payload**:
```json
{
  "ok": false,
  "code": "DUPLICATE_RESERVATION",
  "message": "Ya existe una reserva activa para este pedido",
  "details": {
    "pedido_id": 456,
    "reserva_id": 789,
    "created_at": "2025-01-15T10:30:00Z",
    "expires_at": "2025-01-22T10:30:00Z"
  }
}
```

---

### 4. Error: Pedido Intenta Facturarse Dos Veces

**Escenario**: Se intenta facturar un pedido que ya fue facturado

**Flujo**:
```
1. Usuario hace clic en "Facturar Pedido"
2. Edge Function valida estado del pedido
3. Si estado == "facturado":
   ├─> Rechazar operación
   ├─> Mostrar error: "Pedido ya facturado"
   ├─> Mostrar factura existente
   └─> Ofrecer ver factura
4. Usuario puede:
   ├─> Ver factura existente
   ├─> Imprimir factura
   └─> Crear nota de crédito (si necesita anular)
```

**Código de Error**: `ALREADY_INVOICED`

**Respuesta HTTP**: `400 Bad Request`

**Payload**:
```json
{
  "ok": false,
  "code": "ALREADY_INVOICED",
  "message": "Este pedido ya fue facturado",
  "details": {
    "pedido_id": 456,
    "factura_id": 789,
    "factura_consecutivo": "00100001010000012345",
    "factura_fecha": "2025-01-15T14:30:00Z",
    "factura_estado": "aceptada"
  }
}
```

---

### 5. Error: Hacienda Rechaza Consecutivo

**Escenario**: Hacienda CR rechaza la factura por consecutivo inválido

**Flujo**:
```
1. Edge Function envía XML firmado a Hacienda
2. Hacienda responde con rechazo
3. Razón: Consecutivo duplicado o formato inválido
4. Sistema registra respuesta en factura
5. Factura queda en estado "rechazada"
6. Sistema genera nuevo consecutivo
7. Usuario puede:
   ├─> Ver mensaje de rechazo de Hacienda
   ├─> Reenviar con nuevo consecutivo
   └─> Contactar soporte si persiste
```

**Código de Error**: `HACIENDA_REJECTED`

**Respuesta HTTP**: `400 Bad Request`

**Payload**:
```json
{
  "ok": false,
  "code": "HACIENDA_REJECTED",
  "message": "Hacienda rechazó la factura",
  "details": {
    "factura_id": 789,
    "hacienda_code": "300",
    "hacienda_message": "Consecutivo duplicado",
    "consecutivo_rechazado": "00100001010000012345",
    "nuevo_consecutivo": "00100001010000012346",
    "suggestion": "Reintente con el nuevo consecutivo generado"
  }
}
```

---

### 6. Error: Optimizador - Pieza No Cabe en Lámina

**Escenario**: Una pieza es más grande que la lámina disponible

**Flujo**:
```
1. Usuario ejecuta optimización
2. Algoritmo valida dimensiones de cada pieza
3. Si pieza.largo > lamina.largo O pieza.ancho > lamina.ancho:
   ├─> Marcar pieza como "sin asignar"
   ├─> Agregar a lista de piezas_sin_asignar
   └─> Continuar con otras piezas
4. Al finalizar, mostrar:
   ├─> Resultado de optimización
   ├─> Lista de piezas sin asignar
   └─> Razón: "Dimensiones exceden lámina"
5. Usuario puede:
   ├─> Ajustar dimensiones de pieza
   ├─> Seleccionar lámina más grande
   └─> Dividir pieza en partes más pequeñas
```

**Código de Error**: `PIECE_TOO_LARGE`

**Mensaje**:
```
⚠️ Piezas sin asignar (3):
- Pieza "Tapa Superior": 2500×1850mm excede lámina 2440×1220mm
- Pieza "Panel Lateral": 2600×600mm excede lámina 2440×1220mm
- Pieza "Base": 2500×800mm excede lámina 2440×1220mm

Sugerencia: Seleccione una lámina más grande o ajuste las dimensiones
```

---

### 7. Error: Validación de Veta Fallida

**Escenario**: Pieza con veta S no puede colocarse respetando orientación

**Flujo**:
```
1. Algoritmo intenta colocar pieza con veta S
2. Validación: lado_largo_pieza debe ser ≤ lado_largo_lamina
3. Si validación falla:
   ├─> Marcar pieza como inválida
   ├─> Agregar a piezas_sin_asignar
   └─> Registrar razón específica
4. Mostrar advertencia al usuario
5. Usuario puede:
   ├─> Cambiar veta a "N" (sin restricción)
   ├─> Rotar pieza manualmente
   └─> Seleccionar lámina con orientación correcta
```

**Código de Error**: `GRAIN_CONSTRAINT_VIOLATION`

**Mensaje**:
```
⚠️ Restricción de veta no cumplida:
- Pieza "Puerta Principal" (1850×600mm, Veta S)
- Requiere: lado largo (1850mm) ≤ lado largo lámina (1220mm)
- Solución: Cambiar a Veta N o usar lámina 2440×1220mm rotada
```

---

### 8. Error: Usuario Sin Permisos

**Escenario**: Usuario intenta acceder a funcionalidad sin permisos

**Flujo**:
```
1. Usuario hace clic en acción protegida
2. Sistema valida permisos del usuario
3. Si permiso no existe:
   ├─> Bloquear acción
   ├─> Mostrar mensaje: "No tiene permisos"
   ├─> Registrar intento en auditoría
   └─> Sugerir contactar administrador
4. Usuario puede:
   ├─> Solicitar permisos a administrador
   └─> Ver sus permisos actuales en Perfil
```

**Código de Error**: `PERMISSION_DENIED`

**Respuesta HTTP**: `403 Forbidden`

**Payload**:
```json
{
  "ok": false,
  "code": "PERMISSION_DENIED",
  "message": "No tiene permisos para realizar esta acción",
  "details": {
    "required_permission": "pedidos:facturar",
    "user_permissions": ["pedidos:view", "pedidos:create"],
    "suggestion": "Contacte al administrador para solicitar el permiso 'pedidos:facturar'"
  }
}
```

---

### 9. Error: Timeout en Edge Function

**Escenario**: Edge Function excede tiempo límite de ejecución

**Flujo**:
```
1. Edge Function inicia proceso largo (ej: optimización compleja)
2. Tiempo de ejecución > 60 segundos (límite Deno)
3. Deno termina función con timeout
4. Frontend recibe error 504 Gateway Timeout
5. Sistema registra timeout en logs
6. Usuario ve mensaje: "Operación tomó demasiado tiempo"
7. Sugerencias:
   ├─> Reducir cantidad de piezas
   ├─> Simplificar configuración
   └─> Dividir operación en lotes más pequeños
```

**Código de Error**: `FUNCTION_TIMEOUT`

**Respuesta HTTP**: `504 Gateway Timeout`

**Payload**:
```json
{
  "ok": false,
  "code": "FUNCTION_TIMEOUT",
  "message": "La operación excedió el tiempo límite",
  "details": {
    "function": "optimizar-cortes",
    "timeout_seconds": 60,
    "suggestion": "Reduzca la cantidad de piezas o simplifique la configuración"
  }
}
```

---

### 10. Error: RLS Bloquea Acceso a Datos

**Escenario**: Row Level Security bloquea acceso a datos de otra tienda

**Flujo**:
```
1. Usuario intenta acceder a registro de otra tienda
2. PostgreSQL RLS evalúa políticas
3. Si tienda_id != usuario.tienda_actual:
   ├─> Bloquear acceso
   ├─> Retornar 0 registros
   └─> No revelar existencia del registro
4. Frontend muestra: "No se encontraron registros"
5. Sistema registra intento en auditoría
```

**Código de Error**: `RLS_ACCESS_DENIED`

**Respuesta HTTP**: `403 Forbidden`

**Payload**:
```json
{
  "ok": false,
  "code": "RLS_ACCESS_DENIED",
  "message": "No tiene acceso a este recurso",
  "details": {
    "reason": "El recurso pertenece a otra tienda",
    "suggestion": "Verifique que está en la tienda correcta"
  }
}
```

---

## 📖 GLOSARIO TÉCNICO AMPLIADO

### A

**API (Application Programming Interface)**
Interfaz de programación que permite la comunicación entre diferentes componentes del sistema.

**Artículo**
Elemento individual del inventario (materia prima, producto terminado, servicio).

**Auditoría**
Registro de todas las acciones críticas realizadas en el sistema para trazabilidad.

### B

**BOM (Bill of Materials)**
Lista de materiales que componen un producto. Incluye:
- Componentes (artículos del inventario)
- Cantidades por unidad
- Precios ajustados
- Unidades de medida

Ejemplo:
```
Producto: Mesa de Comedor
BOM:
  - Tablero MDF 18mm: 1 unidad
  - Patas de madera: 4 unidades
  - Tornillos: 16 unidades
  - Barniz: 0.5 litros
```

**Base Imponible**
Monto sobre el cual se calculan los impuestos. Fórmula:
```
base_imponible = subtotal - descuentos
```

### C

**Clave Numérica**
Identificador único de 50 dígitos para facturas electrónicas según formato de Hacienda CR:
```
Formato: PPPDDDMMYYCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCS
PPP: Código país (506 para Costa Rica)
DDMMYY: Fecha emisión
CCCCCCCCCCCC: Cédula emisor (12 dígitos)
CCCCCCCCCCCCCCCCCCCC: Consecutivo (20 dígitos)
S: Situación (1=Normal, 2=Contingencia, 3=Sin internet)
CCCCCCCC: Código seguridad (8 dígitos)
```

**Consecutivo**
Número secuencial único de 20 dígitos para identificar facturas:
```
Formato: YYYYMMDDHHMMSSNNNNNN
YYYY: Año
MM: Mes
DD: Día
HH: Hora
MM: Minuto
SS: Segundo
NNNNNN: Secuencial (6 dígitos)
```

**CostBot**
Asistente de IA con tecnología RAG (Retrieval Augmented Generation) que permite consultar información de costos, precios y documentos mediante lenguaje natural.

### D

**Descuento Global**
Descuento aplicado al total de la cotización/pedido, después de calcular subtotales individuales.

**Disponible (Stock)**
Cantidad de inventario disponible para venta. Fórmula:
```
disponible = on_hand - reservado - comprometido
```

### E

**Edge Function**
Función serverless ejecutada en el edge (cerca del usuario) usando Deno. Ventajas:
- Baja latencia
- Escalabilidad automática
- Aislamiento de seguridad
- Acceso a Service Role Key

**Espesor de Sierra (Kerf)**
Ancho del corte de la sierra, típicamente 3-5mm. Se debe considerar en optimización para evitar piezas más pequeñas de lo esperado.

**Exoneración**
Exención de impuestos otorgada por Hacienda a ciertas entidades (hospitales, embajadas, etc.).

### F

**Factura Electrónica**
Documento tributario digital firmado electrónicamente y validado por Hacienda CR. Tipos:
- 01: Factura Electrónica (FE)
- 02: Nota de Débito (ND)
- 03: Nota de Crédito (NC)
- 04: Tiquete Electrónico (TE)

**Factor de Conversión**
Multiplicador para convertir entre unidades de medida:
```
Ejemplo: 1 metro = 1000 milímetros
Factor: 1000
```

### G

**Ganancia (%)**
Porcentaje de margen de utilidad sobre el costo. Fórmula:
```
precio_venta = costo * (1 + ganancia/100)
```

**Guillotine 2D**
Algoritmo de optimización de cortes que divide recursivamente el espacio en rectángulos.

### H

**Hacienda CR**
Dirección General de Tributación de Costa Rica. Entidad que valida y aprueba facturas electrónicas.

**HH (Horas Hombre)**
Unidad de medida para servicios de mano de obra. Se cobra por tiempo de trabajo.

### I

**Idempotencia**
Propiedad de una operación que puede ejecutarse múltiples veces sin cambiar el resultado después de la primera ejecución.

**Inventario Reservado**
Cantidad de inventario apartada para pedidos confirmados pero no facturados.

**Item Compuesto**
Producto que contiene un BOM (lista de materiales). Se ensambla a partir de componentes.

### J

**JWT (JSON Web Token)**
Token de autenticación que contiene información del usuario codificada y firmada.

### K

**KPI (Key Performance Indicator)**
Indicador clave de rendimiento para medir el éxito de operaciones.

**Kerf**
Ver "Espesor de Sierra".

### L

**Lámina Base**
Lámina completa de material (MDF, melamina, etc.) desde la cual se cortan piezas. Tiene dimensiones estándar (ej: 2440×1220mm).

**Lead Time**
Tiempo de espera desde que se solicita un artículo hasta que está disponible.

### M

**Margen de Seguridad**
Espacio adicional alrededor de cada pieza en optimización para evitar errores de corte.

**Metadata**
Datos adicionales almacenados en formato JSON que complementan la información principal de un registro.

**Multi-Tienda**
Arquitectura que permite que múltiples sucursales usen el mismo sistema con datos aislados.

### N

**Nota de Crédito**
Documento que anula total o parcialmente una factura.

**Nota de Débito**
Documento que aumenta el monto de una factura previamente emitida.

### O

**On Hand (Stock)**
Cantidad física de inventario disponible en bodega.

**Optimización 2D**
Proceso de calcular la mejor distribución de piezas en láminas para minimizar desperdicio.

### P

**Permiso Granular**
Permiso específico con formato `modulo:accion[:scope]`. Ejemplos:
- `clientes:view` - Ver todos los clientes
- `clientes:edit:own` - Editar solo clientes propios
- `pedidos:facturar` - Facturar pedidos

**Pieza**
Elemento individual que se corta de una lámina en el optimizador.

**Punto de Reorden (ROP)**:
```
ROP = safety_stock + (demanda_promedio_dia * lead_time_dias)
```

### R

**RAG (Retrieval Augmented Generation)**
Técnica de IA que combina búsqueda de información con generación de texto para respuestas más precisas.

**Realtime**
Tecnología de Supabase que permite suscribirse a cambios en la base de datos en tiempo real.

**Reserva Blanda**
Reserva temporal de inventario que puede ser liberada automáticamente si expira.

**Reserva Dura**
Reserva permanente de inventario que solo se libera manualmente o al facturar.

**RLS (Row Level Security)**
Sistema de seguridad de PostgreSQL que filtra filas según políticas definidas.

**ROP**
Ver "Punto de Reorden".

### S

**Safety Stock (Stock de Seguridad)**
Cantidad mínima de inventario para prevenir quiebres de stock por variaciones en demanda o lead time.

**Secuencial**
Número consecutivo que se incrementa automáticamente.

**Service Role Key**
Clave de Supabase con permisos administrativos que bypasea RLS. Solo se usa en Edge Functions.

**SKU (Stock Keeping Unit)**
Código único que identifica un artículo en inventario.

**Subtotal**
Suma de precios de items antes de aplicar descuentos e impuestos.

### T

**Tapacanto**
Material adhesivo que se aplica a los bordes de piezas cortadas para darles acabado.

**Tipo de Cambio**
Tasa de conversión entre monedas (ej: USD a CRC).

**Tiquete Electrónico**
Factura simplificada para ventas al consumidor final.

### U

**Umbral**
Valor límite que dispara una acción (ej: umbral mínimo de inventario).

**Unidad de Medida**
Forma de cuantificar artículos (unidades, metros, litros, kilogramos, etc.).

### V

**Veta**
Dirección de las fibras en materiales de madera. Tipos:
- **Veta S (Paralela)**: Lado largo paralelo a veta de lámina
- **Veta X (Perpendicular)**: Lado largo perpendicular a veta
- **Veta N (Sin veta)**: Cualquier orientación

**Vectorización**
Proceso de convertir texto en vectores numéricos para búsqueda semántica.

### X

**XAdES-EPES**
Estándar de firma electrónica avanzada usado en facturas electrónicas de Costa Rica.

**XML**
Formato de documento estructurado usado para facturas electrónicas.

---

## 🔌 MANUAL DE APIs INTERNAS

### Endpoints de Servicios Frontend

#### 1. Cliente Service

**Obtener Clientes**
```typescript
GET /api/clientes
Query Params:
  - search?: string
  - tipo_identificacion?: string
  - provincia_id?: number
  - page?: number
  - limit?: number

Response:
{
  data: Cliente[],
  total: number,
  page: number,
  limit: number
}
```

**Crear Cliente**
```typescript
POST /api/clientes
Body:
{
  tipo_identificacion: string,
  identificacion: string,
  nombre_razon_social: string,
  correo_principal: string,
  telefono_numero: string,
  provincia_id: number,
  canton_id: number,
  distrito_id: number,
  otras_senas: string
}

Response:
{
  data: Cliente,
  message: "Cliente creado exitosamente"
}
```

**Actualizar Cliente**
```typescript
PUT /api/clientes/:id
Body: Partial<Cliente>

Response:
{
  data: Cliente,
  message: "Cliente actualizado exitosamente"
}
```

**Eliminar Cliente**
```typescript
DELETE /api/clientes/:id

Response:
{
  message: "Cliente eliminado exitosamente"
}
```

---

#### 2. Inventario Service

**Obtener Artículos**
```typescript
GET /api/inventario
Query Params:
  - search?: string
  - categoria_id?: number
  - activo?: boolean
  - page?: number
  - limit?: number

Response:
{
  data: Articulo[],
  total: number
}
```

**Crear Artículo**
```typescript
POST /api/inventario
Body:
{
  codigo_articulo: string,
  descripcion_articulo: string,
  categoria_id: number,
  costo_articulo: number,
  ganancia_articulo: number,
  espesor_mm?: number,
  largo_lamina_mm?: number,
  ancho_lamina_mm?: number
}

Response:
{
  data: Articulo,
  message: "Artículo creado exitosamente"
}
```

**Actualizar Stock**
```typescript
PATCH /api/inventario/:id/stock
Body:
{
  cantidad: number,
  tipo: 'entrada' | 'salida',
  notas?: string
}

Response:
{
  data: {
    articulo_id: number,
    stock_anterior: number,
    stock_nuevo: number,
    movimiento_id: number
  }
}
```

---

#### 3. Cotización Service

**Obtener Cotizaciones**
```typescript
GET /api/cotizaciones
Query Params:
  - cliente_id?: number
  - estado?: string
  - fecha_desde?: string
  - fecha_hasta?: string

Response:
{
  data: Cotizacion[]
}
```

**Crear Cotización**
```typescript
POST /api/cotizaciones
Body:
{
  cliente_id: number,
  fecha_emision: string,
  fecha_vencimiento: string,
  moneda: string,
  tipo_cambio: number,
  items: [
    {
      producto_id: number,
      cantidad: number,
      precio_unitario: number,
      descuento: number
    }
  ],
  descuento_global: number,
  impuestos: number,
  metadata?: {
    tipo?: 'normal' | 'optimizador',
    proyecto_id?: number
  }
}

Response:
{
  data: Cotizacion,
  message: "Cotización creada exitosamente"
}
```

**Duplicar Cotización**
```typescript
POST /api/cotizaciones/:id/duplicar

Response:
{
  data: Cotizacion,
  message: "Cotización duplicada exitosamente"
}
```

**Cambiar Estado**
```typescript
PATCH /api/cotizaciones/:id/estado
Body:
{
  estado: 'borrador' | 'enviada' | 'aprobada' | 'rechazada'
}

Response:
{
  data: Cotizacion,
  message: "Estado actualizado exitosamente"
}
```

---

#### 4. Pedido Service

**Crear Pedido desde Cotización**
```typescript
POST /api/pedidos/desde-cotizacion
Body:
{
  cotizacion_id: number
}

Response:
{
  data: Pedido,
  message: "Pedido creado desde cotización"
}
```

**Confirmar Pedido**
```typescript
POST /api/pedidos/:id/confirmar

Response:
{
  data: {
    pedido_id: number,
    estado: 'confirmado',
    reservas_creadas: number
  },
  message: "Pedido confirmado exitosamente"
}
```

**Cancelar Pedido**
```typescript
POST /api/pedidos/:id/cancelar

Response:
{
  data: {
    pedido_id: number,
    estado: 'cancelado',
    reservas_liberadas: number
  },
  message: "Pedido cancelado exitosamente"
}
```

---

#### 5. Optimizador Service

**Buscar Láminas**
```typescript
GET /api/optimizador/laminas
Query Params:
  - search?: string
  - espesor_mm?: number

Response:
{
  data: ArticuloInventario[]
}
```

**Buscar Tapacantos**
```typescript
GET /api/optimizador/tapacantos
Query Params:
  - search?: string

Response:
{
  data: ArticuloInventario[]
}
```

**Optimizar Cortes**
```typescript
POST /api/optimizador/optimizar
Body:
{
  piezas: PiezaCorte[],
  configuracion: {
    espesor_sierra: number,
    margen_seguridad: number,
    permitir_rotacion: boolean
  }
}

Response:
{
  data: ResultadoOptimizacion,
  message: "Optimización completada"
}
```

**Guardar Proyecto**
```typescript
POST /api/optimizador/proyectos
Body:
{
  nombre: string,
  descripcion: string,
  modo: 'manual' | 'bom',
  piezas: PiezaCorte[],
  configuracion: ConfiguracionCorte,
  resultado?: ResultadoOptimizacion
}

Response:
{
  data: ProyectoOptimizador,
  message: "Proyecto guardado exitosamente"
}
```

---

### Edge Functions

#### 1. facturar-pedido

**Endpoint**: `POST /functions/v1/facturar-pedido`

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Body**:
```json
{
  "pedido_id": 123,
  "condicion_venta": "01",
  "moneda": "CRC",
  "tipo_cambio": 1,
  "observaciones": "Factura de prueba"
}
```

**Response Success (200)**:
```json
{
  "success": true,
  "consecutivo": "20250115143000123456",
  "clave": "50615012500000000000201501151430001234561012345678",
  "estado": "borrador",
  "factura_id": 789,
  "correlationId": "uuid-1234-5678"
}
```

**Response Error (400)**:
```json
{
  "ok": false,
  "code": "PEDIDO_NOT_FOUND",
  "message": "No se encontró el pedido con ID 123",
  "correlationId": "uuid-1234-5678"
}
```

---

#### 2. consume-inventory

**Endpoint**: `POST /functions/v1/consume-inventory`

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Body**:
```json
{
  "factura_id": 789
}
```

**Response Success (200)**:
```json
{
  "success": true,
  "factura_id": 789,
  "pedido_id": 456,
  "articulos_procesados": 5,
  "movimientos_creados": 5,
  "timestamp": "2025-01-15T14:30:00Z"
}
```

**Response Error (500)**:
```json
{
  "error": "Stock insuficiente para Lámina MDF 18mm. Disponible: 5, Requerido: 10"
}
```

---

#### 3. me-permissions

**Endpoint**: `GET /functions/v1/me-permissions`

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

**Response Success (200)**:
```json
{
  "user_id": "uuid-user-123",
  "permissions": [
    "clientes:view",
    "clientes:create",
    "clientes:edit",
    "pedidos:view",
    "pedidos:create",
    "pedidos:confirmar"
  ],
  "roles": [
    {
      "id": 1,
      "nombre": "Vendedor",
      "descripcion": "Rol de vendedor"
    }
  ],
  "tienda_actual": {
    "id": "uuid-tienda-1",
    "nombre": "Sucursal Central"
  }
}
```

---

#### 4. poll-hacienda-status

**Endpoint**: `POST /functions/v1/poll-hacienda-status`

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Body**:
```json
{
  "factura_id": 789
}
```

**Response Success (200)**:
```json
{
  "success": true,
  "factura_id": 789,
  "estado_hacienda": "aceptado",
  "mensaje_hacienda": "Comprobante aceptado",
  "fecha_procesamiento": "2025-01-15T14:35:00Z"
}
```

---

#### 5. costbot-query

**Endpoint**: `POST /functions/v1/costbot-query`

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Body**:
```json
{
  "query": "¿Cuál es el precio de la lámina MDF 18mm?",
  "conversation_id": "uuid-conv-123"
}
```

**Response Success (200)**:
```json
{
  "success": true,
  "answer": "El precio de la lámina MDF 18mm es de ₡25,000 por unidad según la última actualización.",
  "sources": [
    {
      "document": "Lista de Precios 2025",
      "page": 3,
      "relevance": 0.95
    }
  ],
  "conversation_id": "uuid-conv-123"
}
```

---

#### 6. costbot-ingest-pdf

**Endpoint**: `POST /functions/v1/costbot-ingest-pdf`

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: multipart/form-data
```

**Body**:
```
file: <PDF_FILE>
metadata: {
  "title": "Lista de Precios 2025",
  "category": "precios"
}
```

**Response Success (200)**:
```json
{
  "success": true,
  "document_id": "uuid-doc-123",
  "chunks_created": 45,
  "message": "Documento procesado exitosamente"
}
```

---

#### 7. enviar-notificacion-tarea

**Endpoint**: `POST /functions/v1/enviar-notificacion-tarea`

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Body**:
```json
{
  "tarea_id": 456,
  "tipo": "asignacion",
  "destinatarios": ["user1@example.com", "user2@example.com"]
}
```

**Response Success (200)**:
```json
{
  "success": true,
  "emails_enviados": 2,
  "message": "Notificaciones enviadas exitosamente"
}
```

---

## 📊 MÉTRICAS Y KPIs DEL SISTEMA

### KPIs de Inventario

#### 1. Porcentaje de Utilización de Inventario
```
Fórmula: (Inventario Usado / Inventario Total) × 100

Objetivo: > 80%
Crítico: < 60%

Interpretación:
- > 85%: Excelente utilización
- 70-85%: Buena utilización
- 60-70%: Mejorable
- < 60%: Inventario excesivo o productos obsoletos
```

#### 2. Rotación de Inventario
```
Fórmula: Costo de Ventas / Inventario Promedio

Objetivo: > 6 veces/año (cada 2 meses)
Crítico: < 3 veces/año

Interpretación:
- > 8: Rotación muy rápida (posible falta de stock)
- 6-8: Rotación óptima
- 4-6: Rotación aceptable
- < 4: Rotación lenta (capital inmovilizado)
```

#### 3. Días de Inventario
```
Fórmula: (Inventario Promedio / Costo de Ventas) × 365

Objetivo: < 60 días
Crítico: > 90 días

Interpretación:
- < 45 días: Excelente disponibilidad
- 45-60 días: Bueno
- 60-90 días: Mejorable
- > 90 días: Exceso de inventario
```

#### 4. Tasa de Quiebre de Stock
```
Fórmula: (Días con Stock Agotado / Días Totales) × 100

Objetivo: < 5%
Crítico: > 10%

Interpretación:
- 0-2%: Excelente disponibilidad
- 2-5%: Buena disponibilidad
- 5-10%: Mejorable
- > 10%: Problemas de abastecimiento
```

#### 5. Exactitud de Inventario
```
Fórmula: (Conteo Físico / Conteo Sistema) × 100

Objetivo: > 95%
Crítico: < 90%

Interpretación:
- > 98%: Excelente control
- 95-98%: Buen control
- 90-95%: Control aceptable
- < 90%: Problemas de control
```

---

### KPIs de Optimización de Láminas

#### 1. Porcentaje de Aprovechamiento de Láminas
```
Fórmula: (Área Utilizada / Área Total) × 100

Objetivo: > 85%
Crítico: < 70%

Interpretación:
- > 90%: Excelente optimización
- 85-90%: Buena optimización
- 75-85%: Optimización aceptable
- < 75%: Desperdicio excesivo
```

#### 2. Costo de Desperdicio
```
Fórmula: (Área Sobrante / Área Total) × Costo Lámina

Objetivo: < 15% del costo total
Crítico: > 25%

Interpretación:
- < 10%: Excelente eficiencia
- 10-15%: Buena eficiencia
- 15-25%: Mejorable
- > 25%: Ineficiente
```

#### 3. Tiempo Promedio de Optimización
```
Fórmula: Tiempo Total / Número de Proyectos

Objetivo: < 5 segundos
Crítico: > 15 segundos

Interpretación:
- < 3 seg: Excelente rendimiento
- 3-5 seg: Buen rendimiento
- 5-10 seg: Aceptable
- > 10 seg: Lento (optimizar algoritmo)
```

#### 4. Tasa de Piezas Sin Asignar
```
Fórmula: (Piezas Sin Asignar / Total Piezas) × 100

Objetivo: < 5%
Crítico: > 15%

Interpretación:
- 0%: Perfecto
- 0-5%: Excelente
- 5-10%: Bueno
- 10-15%: Mejorable
- > 15%: Problemas de configuración
```

---

### KPIs de Ventas

#### 1. Tasa de Conversión Cotización → Pedido
```
Fórmula: (Cotizaciones Aprobadas / Total Cotizaciones) × 100

Objetivo: > 40%
Crítico: < 25%

Interpretación:
- > 50%: Excelente conversión
- 40-50%: Buena conversión
- 30-40%: Conversión aceptable
- < 30%: Problemas en proceso de venta
```

#### 2. Tiempo Promedio de Cierre
```
Fórmula: Promedio(Fecha Aprobación - Fecha Creación)

Objetivo: < 7 días
Crítico: > 15 días

Interpretación:
- < 3 días: Excelente velocidad
- 3-7 días: Buena velocidad
- 7-15 días: Lento
- > 15 días: Muy lento
```

#### 3. Valor Promedio de Pedido
```
Fórmula: Total Ventas / Número de Pedidos

Objetivo: Depende del negocio
Tendencia: Creciente

Interpretación:
- Creciente: Buena estrategia de upselling
- Estable: Mantener estrategia
- Decreciente: Revisar estrategia de precios
```

#### 4. Margen Real vs Estimado
```
Fórmula: ((Precio Venta - Costo Real) / Precio Venta) × 100

Objetivo: Margen Real ≥ Margen Estimado
Crítico: Margen Real < 80% Margen Estimado

Interpretación:
- ≥ 100%: Excelente control de costos
- 90-100%: Buen control
- 80-90%: Control aceptable
- < 80%: Problemas de estimación
```

---

### KPIs de Facturación Electrónica

#### 1. Tasa de Aceptación de Hacienda
```
Fórmula: (Facturas Aceptadas / Total Facturas) × 100

Objetivo: > 95%
Crítico: < 90%

Interpretación:
- > 98%: Excelente calidad
- 95-98%: Buena calidad
- 90-95%: Mejorable
- < 90%: Problemas de configuración
```

#### 2. Tiempo Promedio de Procesamiento
```
Fórmula: Promedio(Fecha Aceptación - Fecha Envío)

Objetivo: < 5 minutos
Crítico: > 15 minutos

Interpretación:
- < 2 min: Excelente
- 2-5 min: Bueno
- 5-10 min: Aceptable
- > 10 min: Lento (revisar Hacienda)
```

#### 3. Tasa de Reintento
```
Fórmula: (Facturas Reenviadas / Total Facturas) × 100

Objetivo: < 5%
Crítico: > 15%

Interpretación:
- < 3%: Excelente estabilidad
- 3-5%: Buena estabilidad
- 5-10%: Mejorable
- > 10%: Problemas de conectividad
```

---

### KPIs de Seguimiento y Tareas

#### 1. Tiempo Promedio en Cada Estado
```
Fórmula: Promedio(Fecha Cambio Estado - Fecha Estado Anterior)

Objetivo: Depende del proceso
Tendencia: Decreciente

Estados a medir:
- Nueva → Asignada: < 1 hora
- Asignada → En Proceso: < 4 horas
- En Proceso → Completada: < 48 horas
```

#### 2. Tasa de Cumplimiento de Plazos
```
Fórmula: (Tareas Completadas a Tiempo / Total Tareas) × 100

Objetivo: > 90%
Crítico: < 75%

Interpretación:
- > 95%: Excelente gestión
- 90-95%: Buena gestión
- 80-90%: Mejorable
- < 80%: Problemas de planificación
```

#### 3. Tareas Atrasadas
```
Fórmula: Tareas con Fecha Vencimiento < Hoy y Estado != Completada

Objetivo: < 5% del total
Crítico: > 15%

Interpretación:
- 0-3%: Excelente control
- 3-5%: Buen control
- 5-10%: Control aceptable
- > 10%: Problemas de gestión
```

---

### KPIs de Sistema

#### 1. Tiempo de Respuesta de API
```
Fórmula: Promedio(Tiempo Respuesta) por endpoint

Objetivo: < 500ms
Crítico: > 2000ms

Interpretación:
- < 200ms: Excelente
- 200-500ms: Bueno
- 500-1000ms: Aceptable
- > 1000ms: Lento (optimizar)
```

#### 2. Tasa de Error de API
```
Fórmula: (Requests con Error / Total Requests) × 100

Objetivo: < 1%
Crítico: > 5%

Interpretación:
- < 0.5%: Excelente estabilidad
- 0.5-1%: Buena estabilidad
- 1-3%: Mejorable
- > 3%: Problemas de estabilidad
```

#### 3. Disponibilidad del Sistema (Uptime)
```
Fórmula: (Tiempo Disponible / Tiempo Total) × 100

Objetivo: > 99.5%
Crítico: < 99%

Interpretación:
- > 99.9%: Excelente (< 8.76 horas/año down)
- 99.5-99.9%: Bueno (< 43.8 horas/año down)
- 99-99.5%: Aceptable (< 87.6 horas/año down)
- < 99%: Problemas (> 87.6 horas/año down)
```

#### 4. Uso de Edge Functions
```
Fórmula: Total Invocaciones / Mes

Objetivo: Dentro del plan contratado
Crítico: > 90% del límite

Interpretación:
- < 70% límite: Uso normal
- 70-85% límite: Monitorear
- 85-95% límite: Planear upgrade
- > 95% límite: Upgrade urgente
```

---

### Dashboard de KPIs Recomendado

```
┌─────────────────────────────────────────────────────────────┐
│                    DASHBOARD EJECUTIVO                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  INVENTARIO                    VENTAS                        │
│  ├─ Utilización: 82% 🟢       ├─ Conversión: 45% 🟢        │
│  ├─ Rotación: 7.2x 🟢         ├─ Tiempo Cierre: 5d 🟢      │
│  ├─ Días Stock: 51d 🟢        ├─ Valor Promedio: ₡450K 🟢  │
│  └─ Quiebres: 3% 🟢           └─ Margen Real: 28% 🟢       │
│                                                              │
│  OPTIMIZACIÓN                  FACTURACIÓN                   │
│  ├─ Aprovechamiento: 87% 🟢   ├─ Aceptación: 97% 🟢        │
│  ├─ Desperdicio: 13% 🟢       ├─ Tiempo Proc: 3min 🟢      │
│  ├─ Tiempo Opt: 4s 🟢         ├─ Reintento: 4% 🟢          │
│  └─ Sin Asignar: 2% 🟢        └─ Facturas/Día: 45 🟢       │
│                                                              │
│  TAREAS                        SISTEMA                       │
│  ├─ Cumplimiento: 92% 🟢      ├─ Uptime: 99.8% 🟢          │
│  ├─ Atrasadas: 4% 🟢          ├─ API Response: 320ms 🟢    │
│  ├─ Tiempo Prom: 36h 🟢       ├─ Error Rate: 0.7% 🟢       │
│  └─ En Proceso: 23 🟢         └─ Edge Calls: 12K/mes 🟢    │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Leyenda:
🟢 Dentro del objetivo
🟡 Mejorable
🔴 Crítico
```

---

## 🔐 SISTEMA DE SEGURIDAD

### Autenticación
- Supabase Auth con JWT
- Sesiones persistentes
- Refresh tokens automáticos

### Permisos Granulares
Formato: `modulo:accion[:scope]`

Ejemplos:
- `clientes:view` - Ver todos los clientes
- `clientes:view:own` - Ver solo clientes propios
- `clientes:create` - Crear clientes
- `clientes:edit` - Editar cualquier cliente
- `clientes:edit:own` - Editar solo clientes propios

### Row Level Security (RLS)
Todas las tablas tienen políticas RLS que:
- Filtran por tienda_id automáticamente
- Validan permisos del usuario
- Permiten acceso solo a datos autorizados

### Edge Functions para Seguridad
- `me-permissions`: Obtiene permisos del usuario (bypasea RLS con Service Role Key)

---

## 🏪 SISTEMA MULTI-TIENDA

### Arquitectura
Cada usuario tiene:
1. Asignación a una o más tiendas (`usuario_tiendas`)
2. Una tienda activa actual (`usuario_tienda_actual`)
3. Todos los datos filtrados por `tienda_id`

### Filtrado Automático
Todos los servicios filtran automáticamente por la tienda actual del usuario:

```typescript
const { data: tiendaActual } = await supabase
  .from('usuario_tienda_actual')
  .select('tienda_id')
  .eq('usuario_id', user.id)
  .single();

const { data } = await supabase
  .from('clientes')
  .select('*')
  .eq('tienda_id', tiendaActual.tienda_id);
```

---

## 🔄 FLUJOS DE TRABAJO PRINCIPALES

### Cotización → Pedido → Factura
```
1. Crear cotización → Agregar items → Calcular totales
2. Enviar cotización → Cliente acepta
3. Convertir a pedido → Confirmar pedido
4. Crear reservas de inventario
5. Facturar pedido → Generar XML → Firmar → Enviar a Hacienda
6. Descargar inventario → Liberar reservas
```

### Optimización de Cortes
```
1. Seleccionar modo (Manual/BOM)
2. Agregar/Cargar piezas
3. Configurar parámetros (kerf, margen, rotación)
4. Ejecutar optimización
5. Ver resultados y costos
6. Exportar a Excel o Crear cotización
```

### Mantenimiento de Inventario
```
1. Configurar umbrales (min, max, ROP, safety stock)
2. Sistema monitorea niveles automáticamente
3. Genera alertas cuando nivel < ROP
4. Genera órdenes de reabastecimiento sugeridas
5. Aprobar y emitir órdenes
6. Recibir inventario → Actualizar niveles
```

---

## 📊 BASE DE DATOS

### Tablas Principales (50+ tablas)

**Autenticación**:
- usuarios, roles, permisos, rol_permisos, usuario_roles

**Multi-Tienda**:
- tiendas, usuario_tiendas, usuario_tienda_actual

**Clientes**:
- clientes, paises, provincias, cantones, distritos, actividades_economicas

**Inventario**:
- inventario, categorias_inventario, unidades_medida
- inventario_niveles, inventario_movimientos, inventario_reservas
- inventario_thresholds, inventario_alertas

**Productos**:
- productos, categorias, bom_items

**Ventas**:
- cotizaciones, cotizacion_items
- pedidos, pedido_items

**Facturación**:
- facturas_electronicas, factura_items
- hacienda_consecutivos, comprobantes_recibidos

**Tareas**:
- tareas, tareas_items, tareas_consecutivos
- tareas_config_campos, tareas_encargados, tareas_colaboradores
- tareas_personal_asignado

**Otros**:
- solicitudes, solicitud_estados
- optimizador_proyectos_temp
- costbot_chunks
- settings, auditoria_acciones, debug_log

---

## 🚀 OPTIMIZACIONES

### Rendimiento
- Búsqueda en tiempo real sin debounce
- Paginación del lado del servidor
- Caché de permisos en cliente
- Edge Functions para operaciones pesadas
- Lazy loading de componentes
- Queries optimizadas (select específico)

### Tiempos de Carga Objetivo
- Dashboard: < 2 segundos
- Listados: < 1 segundo
- Búsquedas: < 500ms
- Optimización 2D: < 5 segundos (100 piezas)

---

## 📝 CONCLUSIÓN

Sistema ERP completo con:
- ✅ 14 módulos integrados
- ✅ Seguridad avanzada (RLS + Permisos granulares)
- ✅ Multi-tienda
- ✅ Optimización 2D
- ✅ Facturación electrónica
- ✅ Mantenimiento predictivo
- ✅ Arquitectura moderna y escalable
- ✅ Documentación nivel corporativo premium

---

**Documento generado por:** Sistema OLO  
**Versión:** 2.0 Premium  
**Fecha:** Enero 2025  
**Contacto:** soporte@olo.com
