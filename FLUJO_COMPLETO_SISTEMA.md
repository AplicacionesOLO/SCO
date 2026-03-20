# 🔄 FLUJO COMPLETO DEL SISTEMA - DESDE COTIZACIÓN HASTA FACTURACIÓN

## 📋 ÍNDICE
1. [Flujo General](#flujo-general)
2. [Módulo de Cotizaciones](#1-módulo-de-cotizaciones)
3. [Módulo de Pedidos](#2-módulo-de-pedidos)
4. [Módulo de Inventario (Proceso Paralelo)](#3-módulo-de-inventario-proceso-paralelo)
5. [Módulo de Seguimiento](#4-módulo-de-seguimiento)
6. [Módulo de Facturación Electrónica](#5-módulo-de-facturación-electrónica)
7. [Módulo de Seguridad y Permisos](#6-módulo-de-seguridad-y-permisos)
8. [Módulo Multi-Tienda](#7-módulo-multi-tienda)
9. [Tablas Principales](#tablas-principales)
10. [Ejemplo Completo](#ejemplo-completo-paso-a-paso)

---

## 🔄 FLUJO GENERAL

```
┌─────────────┐     ┌─────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────┐
│ COTIZACIÓN  │────▶│ PEDIDO  │────▶│ SEGUIMIENTO  │────▶│ FACTURACIÓN  │────▶│ HACIENDA │
│             │     │         │     │              │     │              │     │          │
│ - Borrador  │     │ - Borr. │     │ - Recibido   │     │ - Borrador   │     │ - Envío  │
│ - Enviada   │     │ - Conf. │     │ - Revisión   │     │ - Procesando │     │ - Acepta │
│ - Aprobada  │     │ - Fact. │     │ - Aprobado   │     │ - Aceptada   │     │ - Rechaz │
│ - Rechazada │     │ - Canc. │     │ - Producción │     │ - Rechazada  │     │          │
│ - Vencida   │     │ - Venc. │     │ - Empaque    │     │ - Anulada    │     │          │
│             │     │         │     │ - Envío      │     │              │     │          │
│             │     │         │     │ - Tránsito   │     │              │     │          │
│             │     │         │     │ - Entregado  │     │              │     │          │
└─────────────┘     └────┬────┘     └──────────────┘     └──────────────┘     └──────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │  INVENTARIO  │
                  │              │
                  │ - Reservas   │
                  │ - Consumo    │
                  │ - Movimientos│
                  └──────────────┘
```

---

## 1. MÓDULO DE COTIZACIONES

### 📊 **Estados de Cotización**
- `borrador` - En edición
- `enviada` - Enviada al cliente
- `aprobada` - Cliente aprobó
- `rechazada` - Cliente rechazó
- `vencida` - Expiró fecha de validez

### 🔄 **Proceso**

#### **1.1 Crear Cotización**
```typescript
// Página: /cotizaciones
// Acción: Click en "Nueva Cotización"

1. Seleccionar cliente (modal búsqueda)
2. Agregar productos/servicios:
   - Buscar producto (modal)
   - Si es producto con BOM:
     * Obtiene componentes de bom_items
     * Calcula costo total automáticamente
     * Muestra desglose de componentes
   - Si es artículo de inventario:
     * Usa precio_venta del inventario
3. Configurar cantidades, descuentos, impuestos
4. Calcular totales automáticamente
5. Guardar en estado "borrador"
```

**Tablas involucradas:**
- `cotizaciones` - Encabezado
- `cotizacion_items` - Líneas de detalle

#### **1.2 Aprobar Cotización**
```typescript
// Acción: Click en "Aprobar" en la tabla de cotizaciones

1. Cambiar estado a "aprobada"
2. Habilitar botón "Crear Pedido"
```

#### **1.3 Crear Pedido desde Cotización**
```typescript
// Acción: Click en "Crear Pedido" desde cotización aprobada

1. Copiar datos de cotización a pedido
2. Mapear cotizacion_items → pedido_items
3. Crear pedido en estado "borrador"
4. Navegar a página de edición de pedido
```

---

## 2. MÓDULO DE PEDIDOS

### 📊 **Estados de Pedido**
- `borrador` - En edición, inventario reservado
- `confirmado` - Confirmado, inventario consumido
- `facturado` - Ya tiene factura electrónica
- `cancelado` - Cancelado, reservas liberadas
- `vencido` - Expiró fecha de entrega

### 🔄 **Proceso**

#### **2.1 Crear Pedido (Manual o desde Cotización)**
```typescript
// Página: /pedidos
// Acción: Click en "Nuevo Pedido" o desde cotización

1. Seleccionar cliente
2. Agregar items:
   - Productos con BOM
   - Artículos de inventario
   - Servicios
3. Configurar cantidades, precios, descuentos
4. Guardar en estado "borrador"
5. ✅ ACCIÓN AUTOMÁTICA: Reservar inventario
```

**Tablas involucradas:**
- `pedidos` - Encabezado
- `pedido_items` - Líneas de detalle
- `inventario_reservas` - Reservas de stock

#### **2.2 Reservar Inventario (Automático)**
```typescript
// Se ejecuta al crear/editar pedido en estado "borrador"

Para cada item del pedido:
  Si item_type = 'producto':
    1. Obtener componentes BOM del producto
    2. Para cada componente:
       - Crear registro en inventario_reservas
       - Actualizar stock_reservado en inventario
       - cantidad_reservada = cantidad_componente * cantidad_pedido

  Si item_type = 'inventario':
    1. Crear registro en inventario_reservas
    2. Actualizar stock_reservado en inventario
    3. cantidad_reservada = cantidad_pedido
```

**Ejemplo:**
```
Pedido: 2 unidades de "Mueble en L"
BOM del Mueble:
  - Tablero MDF: 5 unidades
  - Tapacanto: 10 metros
  - Tornillos: 20 unidades

Reservas creadas:
  - Tablero MDF: 10 unidades (5 * 2)
  - Tapacanto: 20 metros (10 * 2)
  - Tornillos: 40 unidades (20 * 2)
```

#### **2.3 Confirmar Pedido**
```typescript
// Acción: Click en "Confirmar Pedido"

1. Cambiar estado a "confirmado"
2. ✅ ACCIÓN AUTOMÁTICA: Consumir inventario
3. Crear solicitud en módulo de seguimiento
```

#### **2.4 Consumir Inventario (Automático)**
```typescript
// Edge Function: consume-inventory
// Se ejecuta al confirmar pedido

POST /functions/v1/consume-inventory
Body: { pedido_id: 123 }

Proceso:
1. Obtener items del pedido
2. Para cada item:
   Si item_type = 'producto':
     - Obtener componentes BOM
     - Para cada componente:
       * Restar del stock_actual en inventario
       * Liberar reserva (eliminar de inventario_reservas)
       * Crear movimiento en inventario_movimientos
       * tipo_movimiento = 'salida'
       * motivo = 'Consumo por pedido #XXX'

   Si item_type = 'inventario':
     - Restar del stock_actual
     - Liberar reserva
     - Crear movimiento

3. Validar stock disponible antes de consumir
4. Si no hay stock suficiente, rechazar operación
```

**Tablas involucradas:**
- `inventario` - Actualiza stock_actual, stock_reservado
- `inventario_reservas` - Elimina reservas
- `inventario_movimientos` - Registra salidas

---

## 3. MÓDULO DE INVENTARIO (Proceso Paralelo)

### 📊 **Tablas Principales**
- `inventario` - Artículos/materias primas
- `productos` - Productos terminados
- `bom_items` - Bill of Materials (componentes de productos)
- `inventario_reservas` - Stock reservado por pedidos
- `inventario_movimientos` - Historial de entradas/salidas

### 🔄 **Proceso de Reservas**

#### **3.1 Crear Reserva (Al crear pedido en borrador)**
```sql
-- Insertar reserva
INSERT INTO inventario_reservas (pedido_id, inventario_id, cantidad_reservada)
VALUES (123, 456, 10);

-- Actualizar stock reservado
UPDATE inventario
SET stock_reservado = stock_reservado + 10
WHERE id = 456;
```

#### **3.2 Liberar Reserva (Al cancelar pedido)**
```sql
-- Eliminar reserva
DELETE FROM inventario_reservas
WHERE pedido_id = 123;

-- Actualizar stock reservado
UPDATE inventario
SET stock_reservado = stock_reservado - 10
WHERE id = 456;
```

#### **3.3 Consumir Inventario (Al confirmar pedido)**
```sql
-- Restar del stock actual
UPDATE inventario
SET stock_actual = stock_actual - 10,
    stock_reservado = stock_reservado - 10
WHERE id = 456;

-- Registrar movimiento
INSERT INTO inventario_movimientos (
  inventario_id, tipo_movimiento, cantidad, motivo, pedido_id
)
VALUES (456, 'salida', 10, 'Consumo por pedido #PED-123', 123);

-- Eliminar reserva
DELETE FROM inventario_reservas
WHERE pedido_id = 123 AND inventario_id = 456;
```

### 📊 **Cálculo de Stock Disponible**
```sql
stock_disponible = stock_actual - stock_reservado
```

**Ejemplo:**
```
Artículo: Tablero MDF
- stock_actual: 100 unidades
- stock_reservado: 30 unidades
- stock_disponible: 70 unidades

Si llega un nuevo pedido que requiere 80 unidades:
❌ NO se puede reservar (solo hay 70 disponibles)
```

---

## 4. MÓDULO DE SEGUIMIENTO

### 📊 **Estados Configurables**
Los estados se definen en la tabla `solicitud_estados` y pueden ser personalizados:

**Estados por defecto:**
1. `recibido` - Solicitud recibida
2. `en_revision` - En revisión
3. `aprobado` - Aprobado para producción
4. `en_produccion` - En proceso de fabricación
5. `en_empaque` - Empacando producto
6. `listo_envio` - Listo para enviar
7. `en_transito` - En camino al cliente
8. `entregado` - Entregado al cliente

### 🔄 **Proceso**

#### **4.1 Crear Solicitud (Automático al confirmar pedido)**
```typescript
// Se ejecuta al confirmar pedido

1. Crear registro en tabla solicitudes:
   - pedido_id
   - cliente_id
   - titulo = "Pedido #XXX"
   - descripcion = Notas del pedido
   - estado_id = ID del estado inicial (ej: "recibido")

2. Crear primer registro en historial:
   - solicitud_id
   - estado_anterior = null
   - estado_nuevo = "recibido"
   - comentario = "Solicitud creada automáticamente"
   - usuario_id
```

**Tablas involucradas:**
- `solicitudes` - Solicitud principal
- `solicitud_historial` - Historial de cambios de estado

#### **4.2 Cambiar Estado**
```typescript
// Página: /seguimiento
// Acción: Arrastrar tarjeta en Kanban o click en "Cambiar Estado"

1. Validar transición permitida (solicitud_transiciones)
2. Actualizar estado_id en solicitudes
3. Crear registro en solicitud_historial:
   - estado_anterior
   - estado_nuevo
   - comentario (opcional)
   - usuario_id
   - fecha_cambio
```

#### **4.3 Vista Kanban**
```typescript
// Página: /seguimiento
// Vista: Tablero Kanban con drag & drop

Columnas = Estados configurados
Tarjetas = Solicitudes agrupadas por estado

Funcionalidades:
- Arrastrar y soltar para cambiar estado
- Ver detalles de solicitud (modal)
- Ver historial completo de cambios
- Filtrar por cliente, fecha, estado
```

---

## 5. MÓDULO DE FACTURACIÓN ELECTRÓNICA

### 📊 **Estados de Factura**
- `borrador` - En edición
- `procesando` - Enviando a Hacienda
- `aceptada` - Aceptada por Hacienda
- `rechazada` - Rechazada por Hacienda
- `anulada` - Anulada

### 🔄 **Proceso Completo**

#### **5.1 Crear Factura desde Pedido**
```typescript
// Página: /facturacion
// Acción: Click en "Facturar" desde pedido confirmado

1. Validar que pedido esté en estado "confirmado"
2. Cargar datos del pedido:
   - Cliente
   - Items
   - Totales
3. Configurar encabezado de factura:
   - Tipo de documento (01=Factura, 02=Nota Débito, etc.)
   - Condición de venta (01=Contado, 02=Crédito, etc.)
   - Medio de pago (01=Efectivo, 02=Tarjeta, etc.)
   - Plazo de crédito (si aplica)
4. Revisar/editar items si es necesario
5. Click en "Emitir Factura"
```

#### **5.2 Emitir Factura (Edge Function)**
```typescript
// Edge Function: facturar-pedido
// Endpoint: POST /functions/v1/facturar-pedido

Body: {
  pedido_id: 123,
  tipo_documento: '01',
  condicion_venta: '01',
  medio_pago: '01',
  plazo_credito: 0,
  items: [...],
  notas: 'Notas adicionales'
}

Proceso:
1. Validar pedido existe y está confirmado
2. Obtener configuración de Hacienda de la tienda
3. Generar consecutivo (20 caracteres):
   - Formato: SSSEEETTTNNNNNNNNNN
   - SSS = Sucursal (001)
   - EEE = Terminal (001)
   - TTT = Tipo documento (001)
   - NNNNNNNNNN = Número secuencial (10 dígitos)

4. Generar clave numérica (50 dígitos):
   - Formato: PPPAADDMMYYYYTTTNNNNNNNNNNSSSSSSSSS
   - PPP = País (506 = Costa Rica)
   - AA = Día
   - DD = Día
   - MM = Mes
   - YYYY = Año
   - TTT = Tipo documento
   - NNNNNNNNNN = Consecutivo
   - SSSSSSSS = Código de seguridad (8 dígitos aleatorios)

5. Crear registro en facturas_electronicas:
   - pedido_id
   - consecutivo
   - clave
   - tipo_documento
   - condicion_venta
   - medio_pago
   - subtotal, descuento, impuesto, total
   - estado = 'procesando'

6. Copiar items a factura_items

7. Generar XML según formato Hacienda v4.3:
   - Encabezado
   - Emisor (datos de la tienda)
   - Receptor (datos del cliente)
   - Líneas de detalle
   - Resumen de totales

8. Firmar XML con certificado digital:
   - Usar certificado .p12 de la tienda
   - Algoritmo: SHA256withRSA

9. Enviar a API de Hacienda:
   - Endpoint: https://api.comprobanteselectronicos.go.cr/recepcion/v1/recepcion
   - Headers: Authorization (Bearer token)
   - Body: XML firmado en base64

10. Registrar envío en hacienda_envios:
    - factura_id
    - clave
    - xml_enviado
    - fecha_envio
    - estado = 'enviado'

11. Actualizar estado de factura a 'procesando'

12. Retornar respuesta:
    {
      success: true,
      factura_id: 456,
      consecutivo: '00100100100000000123',
      clave: '50612012024010100000000123456789012',
      estado: 'procesando'
    }
```

**Tablas involucradas:**
- `facturas_electronicas` - Factura principal
- `factura_items` - Líneas de detalle
- `hacienda_envios` - Registro de envíos a Hacienda
- `hacienda_consecutivos` - Control de consecutivos

#### **5.3 Consultar Estado en Hacienda (Edge Function)**
```typescript
// Edge Function: poll-hacienda-status
// Se ejecuta automáticamente cada X minutos

Proceso:
1. Obtener facturas en estado 'procesando'
2. Para cada factura:
   - Consultar estado en API Hacienda
   - Endpoint: GET /recepcion/v1/recepcion/{clave}
   
3. Actualizar estado según respuesta:
   - Si estado = 'aceptado':
     * Actualizar factura a 'aceptada'
     * Actualizar pedido a 'facturado'
     * Notificar al cliente (email/SMS)
   
   - Si estado = 'rechazado':
     * Actualizar factura a 'rechazada'
     * Registrar motivo de rechazo
     * Notificar al usuario

4. Actualizar hacienda_envios con respuesta
```

#### **5.4 Actualizar Pedido a Facturado**
```typescript
// Se ejecuta cuando factura es aceptada por Hacienda

1. Actualizar estado de pedido a 'facturado'
2. Registrar factura_id en pedido
3. Actualizar seguimiento (si aplica)
```

---

## 6. MÓDULO DE SEGURIDAD Y PERMISOS

### 📊 **Roles Predefinidos**
- `admin` - Administrador total
- `gerente` - Gerente de tienda
- `vendedor` - Vendedor
- `operador` - Operador de producción
- `contador` - Contador/Facturación

### 🔄 **Sistema de Permisos**

#### **6.1 Estructura de Permisos**
```typescript
Formato: modulo:accion

Módulos:
- cotizaciones
- pedidos
- inventario
- seguimiento
- facturacion
- clientes
- productos
- seguridad

Acciones:
- ver
- crear
- editar
- eliminar
- aprobar
- facturar
- anular
```

**Ejemplos:**
- `cotizaciones:ver` - Ver cotizaciones
- `cotizaciones:crear` - Crear cotizaciones
- `pedidos:facturar` - Facturar pedidos
- `facturacion:anular` - Anular facturas

#### **6.2 Asignación de Permisos**
```typescript
// Página: /seguridad
// Tab: Roles

1. Crear/editar rol
2. Asignar permisos al rol
3. Asignar rol a usuarios
```

**Tablas involucradas:**
- `roles` - Roles del sistema
- `permisos` - Permisos disponibles
- `rol_permisos` - Relación roles-permisos
- `usuario_roles` - Relación usuarios-roles

#### **6.3 Validación de Permisos**

**Frontend:**
```typescript
// Hook: usePermissions()
const { hasPermission } = usePermissions();

if (hasPermission('pedidos:facturar')) {
  // Mostrar botón "Facturar"
}
```

**Backend (RLS):**
```sql
-- Política de seguridad en pedidos
CREATE POLICY "usuarios_ver_pedidos_tienda"
ON pedidos FOR SELECT
USING (
  tienda_id IN (
    SELECT tienda_id 
    FROM usuario_tiendas 
    WHERE usuario_id = auth.uid()
  )
  AND
  EXISTS (
    SELECT 1 FROM usuario_permisos_view
    WHERE usuario_id = auth.uid()
    AND permiso = 'pedidos:ver'
  )
);
```

---

## 7. MÓDULO MULTI-TIENDA

### 📊 **Estructura**
- Cada usuario puede tener acceso a múltiples tiendas
- Cada usuario tiene una tienda "actual" seleccionada
- Los datos se filtran por la tienda actual

### 🔄 **Proceso**

#### **7.1 Asignar Tiendas a Usuario**
```typescript
// Página: /seguridad
// Tab: Usuarios
// Acción: Click en "Asignar Tiendas"

1. Seleccionar usuario
2. Seleccionar tiendas a asignar
3. Guardar en usuario_tiendas
```

**Tablas involucradas:**
- `tiendas` - Tiendas del sistema
- `usuario_tiendas` - Relación usuarios-tiendas
- `usuario_tienda_actual` - Tienda actual del usuario

#### **7.2 Cambiar Tienda Actual**
```typescript
// Componente: TopBar
// Acción: Selector de tienda

1. Mostrar tiendas asignadas al usuario
2. Al seleccionar tienda:
   - Actualizar usuario_tienda_actual
   - Recargar datos de la página
   - Filtrar por nueva tienda
```

#### **7.3 Filtrado por Tienda**
```typescript
// Todas las consultas incluyen filtro por tienda

// Ejemplo: Obtener pedidos
const { data: tiendaActual } = await supabase
  .from('usuario_tienda_actual')
  .select('tienda_id')
  .eq('usuario_id', user.id)
  .single();

const { data: pedidos } = await supabase
  .from('pedidos')
  .select('*')
  .eq('tienda_id', tiendaActual.tienda_id);
```

---

## 📦 TABLAS PRINCIPALES

### **Cotizaciones**
- `cotizaciones` - Encabezado de cotización
- `cotizacion_items` - Líneas de detalle

### **Pedidos**
- `pedidos` - Encabezado de pedido
- `pedido_items` - Líneas de detalle

### **Inventario**
- `inventario` - Artículos/materias primas
- `productos` - Productos terminados
- `bom_items` - Componentes de productos (Bill of Materials)
- `inventario_reservas` - Stock reservado por pedidos
- `inventario_movimientos` - Historial de movimientos
- `inventario_thresholds` - Umbrales de stock mínimo/máximo
- `inventario_alertas` - Alertas de stock bajo

### **Seguimiento**
- `solicitudes` - Solicitudes de seguimiento
- `solicitud_estados` - Estados configurables
- `solicitud_historial` - Historial de cambios de estado
- `solicitud_transiciones` - Transiciones permitidas entre estados

### **Facturación**
- `facturas_electronicas` - Facturas electrónicas
- `factura_items` - Líneas de detalle de facturas
- `hacienda_envios` - Registro de envíos a Hacienda
- `hacienda_consecutivos` - Control de consecutivos

### **Seguridad**
- `usuarios` - Usuarios del sistema
- `roles` - Roles del sistema
- `permisos` - Permisos disponibles
- `rol_permisos` - Relación roles-permisos
- `usuario_roles` - Relación usuarios-roles

### **Multi-Tienda**
- `tiendas` - Tiendas del sistema
- `usuario_tiendas` - Relación usuarios-tiendas
- `usuario_tienda_actual` - Tienda actual del usuario

### **Clientes**
- `clientes` - Clientes del sistema

---

## 🎯 EJEMPLO COMPLETO PASO A PASO

### **Escenario:**
Cliente "Muebles XYZ" solicita 2 unidades de "Mueble en L" y 1 servicio de "Instalación"

---

### **PASO 1: CREAR COTIZACIÓN**

**Usuario:** Vendedor Juan
**Página:** `/cotizaciones`

1. Click en "Nueva Cotización"
2. Buscar y seleccionar cliente "Muebles XYZ"
3. Agregar producto "Mueble en L":
   - Cantidad: 2
   - Precio unitario: ₡150,000 (calculado desde BOM)
   - Descuento: 5%
   - Impuesto: 13%
   - **BOM del Mueble en L:**
     * Tablero MDF: 5 unidades × ₡8,000 = ₡40,000
     * Tapacanto: 10 metros × ₡500 = ₡5,000
     * Tornillos: 20 unidades × ₡50 = ₡1,000
     * Mano de obra: 1 servicio × ₡50,000 = ₡50,000
     * **Costo total BOM:** ₡96,000
     * **Precio venta:** ₡150,000 (margen 56%)

4. Agregar servicio "Instalación":
   - Cantidad: 1
   - Precio unitario: ₡25,000
   - Descuento: 0%
   - Impuesto: 13%

5. **Totales calculados:**
   - Subtotal: ₡325,000
   - Descuento: ₡15,000 (5% sobre muebles)
   - Subtotal con descuento: ₡310,000
   - Impuesto (13%): ₡40,300
   - **Total: ₡350,300**

6. Guardar cotización en estado "borrador"
7. Enviar cotización al cliente (cambiar a "enviada")

**Tablas afectadas:**
```sql
-- cotizaciones
INSERT INTO cotizaciones (
  codigo, cliente_id, subtotal, descuento_global, 
  impuestos, total, estado
)
VALUES (
  'COT-2024-001', 123, 325000, 15000, 
  40300, 350300, 'enviada'
);

-- cotizacion_items
INSERT INTO cotizacion_items (cotizacion_id, producto_id, descripcion, cantidad, precio_unitario, descuento, subtotal)
VALUES 
  (1, 456, 'Mueble en L', 2, 150000, 15000, 285000),
  (1, NULL, 'Instalación', 1, 25000, 0, 25000);
```

---

### **PASO 2: APROBAR COTIZACIÓN**

**Usuario:** Cliente (externo) o Gerente (interno)
**Página:** `/cotizaciones`

1. Cliente revisa cotización
2. Cliente aprueba cotización
3. Sistema cambia estado a "aprobada"
4. Habilita botón "Crear Pedido"

**Tablas afectadas:**
```sql
UPDATE cotizaciones
SET estado = 'aprobada'
WHERE id = 1;
```

---

### **PASO 3: CREAR PEDIDO DESDE COTIZACIÓN**

**Usuario:** Vendedor Juan
**Página:** `/cotizaciones`

1. Click en "Crear Pedido" desde cotización aprobada
2. Sistema copia datos de cotización a pedido
3. Crea pedido en estado "borrador"
4. **✅ ACCIÓN AUTOMÁTICA: Reservar inventario**

**Tablas afectadas:**
```sql
-- pedidos
INSERT INTO pedidos (
  codigo, cliente_id, moneda, tipo_cambio,
  subtotal, descuento_total, impuesto_total, total,
  estado, tienda_id, created_by
)
VALUES (
  'PED-2024-001', 123, 'CRC', 1,
  325000, 15000, 40300, 350300,
  'borrador', 1, 'uuid-juan'
);

-- pedido_items
INSERT INTO pedido_items (pedido_id, item_type, item_id, descripcion, cantidad, precio_unit, total)
VALUES 
  (1, 'producto', 456, 'Mueble en L', 2, 150000, 285000),
  (1, 'servicio', NULL, 'Instalación', 1, 25000, 25000);

-- inventario_reservas (para componentes BOM del Mueble en L)
INSERT INTO inventario_reservas (pedido_id, inventario_id, cantidad_reservada)
VALUES 
  (1, 101, 10),  -- Tablero MDF: 5 × 2 = 10 unidades
  (1, 102, 20),  -- Tapacanto: 10 × 2 = 20 metros
  (1, 103, 40);  -- Tornillos: 20 × 2 = 40 unidades

-- inventario (actualizar stock_reservado)
UPDATE inventario SET stock_reservado = stock_reservado + 10 WHERE id = 101;
UPDATE inventario SET stock_reservado = stock_reservado + 20 WHERE id = 102;
UPDATE inventario SET stock_reservado = stock_reservado + 40 WHERE id = 103;
```

**Estado del inventario después de reservar:**
```
Tablero MDF (id: 101):
  - stock_actual: 100
  - stock_reservado: 10 (antes: 0)
  - stock_disponible: 90

Tapacanto (id: 102):
  - stock_actual: 200
  - stock_reservado: 20 (antes: 0)
  - stock_disponible: 180

Tornillos (id: 103):
  - stock_actual: 500
  - stock_reservado: 40 (antes: 0)
  - stock_disponible: 460
```

---

### **PASO 4: CONFIRMAR PEDIDO**

**Usuario:** Vendedor Juan o Gerente
**Página:** `/pedidos`

1. Revisar pedido
2. Click en "Confirmar Pedido"
3. Sistema cambia estado a "confirmado"
4. **✅ ACCIÓN AUTOMÁTICA: Consumir inventario**
5. **✅ ACCIÓN AUTOMÁTICA: Crear solicitud de seguimiento**

**Tablas afectadas:**
```sql
-- pedidos
UPDATE pedidos
SET estado = 'confirmado'
WHERE id = 1;

-- Edge Function: consume-inventory
-- Ejecuta las siguientes operaciones:

-- inventario (restar stock_actual y stock_reservado)
UPDATE inventario SET 
  stock_actual = stock_actual - 10,
  stock_reservado = stock_reservado - 10
WHERE id = 101;

UPDATE inventario SET 
  stock_actual = stock_actual - 20,
  stock_reservado = stock_reservado - 20
WHERE id = 102;

UPDATE inventario SET 
  stock_actual = stock_actual - 40,
  stock_reservado = stock_reservado - 40
WHERE id = 103;

-- inventario_movimientos (registrar salidas)
INSERT INTO inventario_movimientos (inventario_id, tipo_movimiento, cantidad, motivo, pedido_id)
VALUES 
  (101, 'salida', 10, 'Consumo por pedido #PED-2024-001', 1),
  (102, 'salida', 20, 'Consumo por pedido #PED-2024-001', 1),
  (103, 'salida', 40, 'Consumo por pedido #PED-2024-001', 1);

-- inventario_reservas (liberar reservas)
DELETE FROM inventario_reservas WHERE pedido_id = 1;

-- solicitudes (crear solicitud de seguimiento)
INSERT INTO solicitudes (pedido_id, cliente_id, titulo, descripcion, estado_id)
VALUES (1, 123, 'Pedido #PED-2024-001', 'Mueble en L × 2 + Instalación', 1);

-- solicitud_historial (primer registro)
INSERT INTO solicitud_historial (solicitud_id, estado_anterior, estado_nuevo, comentario, usuario_id)
VALUES (1, NULL, 1, 'Solicitud creada automáticamente', 'uuid-juan');
```

**Estado del inventario después de consumir:**
```
Tablero MDF (id: 101):
  - stock_actual: 90 (antes: 100)
  - stock_reservado: 0 (antes: 10)
  - stock_disponible: 90

Tapacanto (id: 102):
  - stock_actual: 180 (antes: 200)
  - stock_reservado: 0 (antes: 20)
  - stock_disponible: 180

Tornillos (id: 103):
  - stock_actual: 460 (antes: 500)
  - stock_reservado: 0 (antes: 40)
  - stock_disponible: 460
```

---

### **PASO 5: SEGUIMIENTO DEL PEDIDO**

**Usuario:** Operador de Producción
**Página:** `/seguimiento`

1. Ver tablero Kanban con solicitudes
2. Solicitud aparece en columna "Recibido"
3. Arrastrar a "En Revisión"
4. Sistema registra cambio de estado

**Tablas afectadas:**
```sql
-- solicitudes
UPDATE solicitudes
SET estado_id = 2  -- En Revisión
WHERE id = 1;

-- solicitud_historial
INSERT INTO solicitud_historial (solicitud_id, estado_anterior, estado_nuevo, comentario, usuario_id)
VALUES (1, 1, 2, 'Movido a revisión', 'uuid-operador');
```

5. Continuar moviendo por los estados:
   - En Revisión → Aprobado
   - Aprobado → En Producción
   - En Producción → En Empaque
   - En Empaque → Listo para Envío
   - Listo para Envío → En Tránsito
   - En Tránsito → Entregado

Cada cambio se registra en `solicitud_historial`.

---

### **PASO 6: FACTURAR PEDIDO**

**Usuario:** Contador o Gerente
**Página:** `/facturacion`

1. Click en "Facturar" desde pedido confirmado
2. Revisar datos del pedido
3. Configurar encabezado:
   - Tipo documento: 01 (Factura Electrónica)
   - Condición venta: 01 (Contado)
   - Medio pago: 02 (Tarjeta)
   - Plazo crédito: 0
4. Revisar items (ya cargados desde pedido)
5. Click en "Emitir Factura"

**Edge Function: facturar-pedido**
```typescript
POST /functions/v1/facturar-pedido
Body: {
  pedido_id: 1,
  tipo_documento: '01',
  condicion_venta: '01',
  medio_pago: '02',
  plazo_credito: 0
}

Proceso:
1. Generar consecutivo: 00100100100000000001
2. Generar clave: 50612012024010100000000001123456789
3. Crear factura en estado 'procesando'
4. Copiar items del pedido
5. Generar XML según formato Hacienda v4.3
6. Firmar XML con certificado digital
7. Enviar a API Hacienda
8. Registrar envío
```

**Tablas afectadas:**
```sql
-- facturas_electronicas
INSERT INTO facturas_electronicas (
  pedido_id, tipo_documento, consecutivo, clave,
  fecha_emision, condicion_venta, medio_pago,
  moneda, tipo_cambio, subtotal, descuento, impuesto, total,
  estado, tienda_id, created_by
)
VALUES (
  1, '01', '00100100100000000001', '50612012024010100000000001123456789',
  '2024-12-01T10:30:00', '01', '02',
  'CRC', 1, 325000, 15000, 40300, 350300,
  'procesando', 1, 'uuid-contador'
);

-- factura_items
INSERT INTO factura_items (factura_id, item_type, item_id, descripcion, cantidad, precio_unitario, total)
VALUES 
  (1, 'producto', 456, 'Mueble en L', 2, 150000, 285000),
  (1, 'servicio', NULL, 'Instalación', 1, 25000, 25000);

-- hacienda_envios
INSERT INTO hacienda_envios (factura_id, clave, xml_enviado, fecha_envio, estado)
VALUES (1, '50612012024010100000000001123456789', '<XML>...</XML>', NOW(), 'enviado');
```

---

### **PASO 7: CONSULTAR ESTADO EN HACIENDA**

**Edge Function: poll-hacienda-status**
Se ejecuta automáticamente cada 5 minutos

```typescript
Proceso:
1. Obtener facturas en estado 'procesando'
2. Para cada factura:
   - Consultar estado en API Hacienda
   - GET /recepcion/v1/recepcion/{clave}

3. Respuesta de Hacienda:
   {
     "clave": "50612012024010100000000001123456789",
     "estado": "aceptado",
     "fecha": "2024-12-01T10:35:00"
   }

4. Actualizar factura a 'aceptada'
5. Actualizar pedido a 'facturado'
6. Notificar al cliente
```

**Tablas afectadas:**
```sql
-- facturas_electronicas
UPDATE facturas_electronicas
SET estado = 'aceptada',
    fecha_aceptacion = '2024-12-01T10:35:00'
WHERE id = 1;

-- pedidos
UPDATE pedidos
SET estado = 'facturado',
    factura_id = 1
WHERE id = 1;

-- hacienda_envios
UPDATE hacienda_envios
SET estado = 'aceptado',
    respuesta_hacienda = '{"estado": "aceptado", ...}'
WHERE factura_id = 1;
```

---

### **PASO 8: NOTIFICAR AL CLIENTE**

**Sistema:** Envío automático de email/SMS

```
Para: cliente@mueblesxyz.com
Asunto: Factura Electrónica #00100100100000000001

Estimado cliente,

Su factura electrónica ha sido procesada exitosamente:

- Consecutivo: 00100100100000000001
- Clave: 50612012024010100000000001123456789
- Total: ₡350,300.00
- Estado: Aceptada por Hacienda

Puede descargar su factura en formato PDF desde:
https://sistema.com/facturas/download/1

Gracias por su compra.
```

---

### **PASO 9: ACTUALIZAR SEGUIMIENTO**

**Usuario:** Operador de Envío
**Página:** `/seguimiento`

1. Mover solicitud a "Entregado"
2. Agregar comentario: "Entregado el 05/12/2024 a las 14:30"
3. Sistema registra cambio final

**Tablas afectadas:**
```sql
-- solicitudes
UPDATE solicitudes
SET estado_id = 8  -- Entregado
WHERE id = 1;

-- solicitud_historial
INSERT INTO solicitud_historial (solicitud_id, estado_anterior, estado_nuevo, comentario, usuario_id)
VALUES (1, 7, 8, 'Entregado el 05/12/2024 a las 14:30', 'uuid-operador');
```

---

## ✅ RESUMEN DEL FLUJO COMPLETO

```
1. ✅ Cotización creada (Vendedor)
2. ✅ Cotización aprobada (Cliente/Gerente)
3. ✅ Pedido creado desde cotización (Vendedor)
4. ✅ Inventario reservado automáticamente (Sistema)
5. ✅ Pedido confirmado (Vendedor/Gerente)
6. ✅ Inventario consumido automáticamente (Sistema)
7. ✅ Solicitud de seguimiento creada (Sistema)
8. ✅ Seguimiento actualizado (Operador)
9. ✅ Factura emitida a Hacienda (Contador)
10. ✅ Estado consultado en Hacienda (Sistema)
11. ✅ Factura aceptada (Hacienda)
12. ✅ Cliente notificado (Sistema)
13. ✅ Seguimiento finalizado (Operador)
```

---

## 🎯 PUNTOS CLAVE

### **Automatizaciones del Sistema:**
1. ✅ Reserva de inventario al crear pedido en borrador
2. ✅ Consumo de inventario al confirmar pedido
3. ✅ Creación de solicitud de seguimiento al confirmar pedido
4. ✅ Generación de consecutivo y clave de factura
5. ✅ Envío automático a Hacienda
6. ✅ Consulta periódica de estado en Hacienda
7. ✅ Notificación al cliente cuando factura es aceptada
8. ✅ Actualización de estado de pedido a "facturado"

### **Validaciones Importantes:**
1. ✅ Solo se pueden crear pedidos desde cotizaciones aprobadas
2. ✅ Solo se pueden confirmar pedidos en estado "borrador"
3. ✅ Solo se pueden facturar pedidos en estado "confirmado"
4. ✅ No se pueden editar pedidos facturados
5. ✅ No se puede consumir inventario si no hay stock suficiente
6. ✅ Las transiciones de estado deben estar permitidas en solicitud_transiciones

### **Seguridad:**
1. ✅ Permisos granulares por módulo y acción
2. ✅ RLS (Row Level Security) en todas las tablas
3. ✅ Filtrado por tienda en todas las consultas
4. ✅ Validación de permisos en frontend y backend
5. ✅ Certificado digital para firmar facturas

---

**Este es el flujo completo del sistema desde que se genera una cotización hasta que se factura y se entrega al cliente.** 🎉
