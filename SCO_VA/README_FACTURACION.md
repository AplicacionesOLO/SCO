# Módulo de Facturación Electrónica Costa Rica

## Descripción

Sistema completo de Facturación Electrónica conforme a los requerimientos de la Dirección General de Tributación (DGT) de Costa Rica. Implementa generación XML v4.3/4.4, firma digital, envío a API de Recepción, manejo de estados y auditoría completa.

## Características Principales

### ✅ Tipos de Documentos Soportados
- **01** - Factura Electrónica (FE)
- **02** - Nota Débito (ND)
- **03** - Nota Crédito (NC)
- **04** - Tiquete Electrónico (TE)
- **05** - Factura de Compra (FEC)
- **06** - Factura de Exportación (FEE)
- **07** - Recibo Electrónico de Pago (REP)

### ✅ Funcionalidades Implementadas
- Generación XML conforme XSD 4.3/4.4
- Firma digital XAdES-EPES CR
- Envío a API de Recepción de Hacienda
- Manejo de estados (recibido/aceptado/rechazado)
- Acuses de recepción automáticos
- Bitácora de auditoría completa
- Bandeja de comprobantes recibidos
- Mensajes receptor (aceptación/rechazo)
- Control de consecutivos por tipo
- Integración con módulos existentes

### ✅ Seguridad y Cumplimiento
- Autenticación OAuth2 con IdP de Hacienda
- Encriptación de credenciales sensibles
- Control de acceso basado en roles (RBAC)
- Validación de documentos ≤ 3 horas
- Respaldo de XML originales y firmados
- Trazabilidad completa de operaciones

## Instalación y Configuración

### 1. Requisitos Previos

```bash
# Verificar que el proyecto base esté funcionando
npm install
npm run dev
```

### 2. Variables de Entorno

Agregar al archivo `.env`:

```env
# Configuración de Hacienda (se configura desde la UI)
VITE_HACIENDA_SANDBOX_URL=https://api.comprobanteselectronicos.go.cr/recepcion-sandbox/v1
VITE_HACIENDA_PROD_URL=https://api.comprobanteselectronicos.go.cr/recepcion/v1
VITE_HACIENDA_IDP_SANDBOX=https://idp.comprobanteselectronicos.go.cr/auth/realms/rut-stag/protocol/openid-connect/token
VITE_HACIENDA_IDP_PROD=https://idp.comprobanteselectronicos.go.cr/auth/realms/rut/protocol/openid-connect/token
```

### 3. Configuración de Base de Datos

**IMPORTANTE**: Ejecutar las siguientes consultas SQL en Supabase para crear las tablas necesarias:

```sql
-- Configuración de Hacienda
CREATE TABLE hacienda_settings (
  id SERIAL PRIMARY KEY,
  cedula_emisor VARCHAR(20) NOT NULL,
  codigo_actividad_economica VARCHAR(10) NOT NULL,
  sucursal VARCHAR(3) DEFAULT '001',
  terminal VARCHAR(5) DEFAULT '00001',
  ambiente VARCHAR(20) DEFAULT 'sandbox' CHECK (ambiente IN ('sandbox', 'produccion')),
  usuario_idp VARCHAR(100) NOT NULL,
  password_idp_encrypted TEXT NOT NULL,
  certificado_p12_path TEXT,
  certificado_password_encrypted TEXT,
  proveedor_sistema VARCHAR(100),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Consecutivos por tipo de documento
CREATE TABLE hacienda_consecutivos (
  id SERIAL PRIMARY KEY,
  tipo_documento VARCHAR(3) NOT NULL,
  sucursal VARCHAR(3) NOT NULL,
  terminal VARCHAR(5) NOT NULL,
  consecutivo_actual INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tipo_documento, sucursal, terminal)
);

-- Facturas electrónicas
CREATE TABLE facturas_electronicas (
  id SERIAL PRIMARY KEY,
  clave VARCHAR(50) UNIQUE NOT NULL,
  consecutivo VARCHAR(20) NOT NULL,
  tipo_documento VARCHAR(3) NOT NULL,
  cliente_id INTEGER REFERENCES clientes(id),
  fecha_emision TIMESTAMP NOT NULL,
  moneda VARCHAR(3) DEFAULT 'CRC',
  tipo_cambio DECIMAL(10,4) DEFAULT 1.0000,
  condicion_venta VARCHAR(2) DEFAULT '01',
  plazo_credito INTEGER DEFAULT 0,
  medio_pago VARCHAR(2) DEFAULT '01',
  estado_local VARCHAR(20) DEFAULT 'borrador',
  estado_hacienda VARCHAR(20),
  subtotal DECIMAL(18,4) NOT NULL DEFAULT 0,
  descuento_total DECIMAL(18,4) DEFAULT 0,
  impuesto_total DECIMAL(18,4) DEFAULT 0,
  total DECIMAL(18,4) NOT NULL DEFAULT 0,
  xml_original TEXT,
  xml_firmado TEXT,
  hash_documento VARCHAR(100),
  observaciones TEXT,
  referencia_clave VARCHAR(50),
  referencia_codigo VARCHAR(2),
  referencia_razon TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Líneas de factura
CREATE TABLE factura_lineas (
  id SERIAL PRIMARY KEY,
  factura_id INTEGER REFERENCES facturas_electronicas(id) ON DELETE CASCADE,
  numero_linea INTEGER NOT NULL,
  codigo_articulo VARCHAR(50),
  descripcion TEXT NOT NULL,
  unidad_medida VARCHAR(10) DEFAULT 'Unid',
  cantidad DECIMAL(10,4) NOT NULL,
  precio_unitario DECIMAL(18,4) NOT NULL,
  descuento_porcentaje DECIMAL(5,2) DEFAULT 0,
  descuento_monto DECIMAL(18,4) DEFAULT 0,
  subtotal_linea DECIMAL(18,4) NOT NULL,
  impuesto_porcentaje DECIMAL(5,2) DEFAULT 13.00,
  impuesto_monto DECIMAL(18,4) DEFAULT 0,
  total_linea DECIMAL(18,4) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Envíos a Hacienda
CREATE TABLE hacienda_envios (
  id SERIAL PRIMARY KEY,
  factura_id INTEGER REFERENCES facturas_electronicas(id),
  tipo_envio VARCHAR(20) NOT NULL,
  request_payload TEXT,
  response_payload TEXT,
  status_code INTEGER,
  location_header TEXT,
  estado VARCHAR(20),
  intentos INTEGER DEFAULT 0,
  ultimo_intento TIMESTAMP,
  proximo_intento TIMESTAMP,
  error_mensaje TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Comprobantes recibidos
CREATE TABLE comprobantes_recibidos (
  id SERIAL PRIMARY KEY,
  clave VARCHAR(50) UNIQUE NOT NULL,
  emisor_cedula VARCHAR(20) NOT NULL,
  emisor_nombre VARCHAR(200),
  fecha_emision TIMESTAMP NOT NULL,
  tipo_documento VARCHAR(3) NOT NULL,
  moneda VARCHAR(3),
  total DECIMAL(18,4),
  xml_comprobante TEXT,
  estado_receptor VARCHAR(20) DEFAULT 'pendiente',
  fecha_respuesta TIMESTAMP,
  xml_respuesta TEXT,
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Auditoría
CREATE TABLE hacienda_auditoria (
  id SERIAL PRIMARY KEY,
  usuario_id UUID,
  accion VARCHAR(50) NOT NULL,
  tabla_afectada VARCHAR(50),
  registro_id INTEGER,
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Función para obtener siguiente consecutivo (transaccional)
CREATE OR REPLACE FUNCTION get_next_consecutivo(
  p_tipo_documento VARCHAR(3),
  p_sucursal VARCHAR(3) DEFAULT '001',
  p_terminal VARCHAR(5) DEFAULT '00001'
) RETURNS INTEGER AS $$
DECLARE
  v_consecutivo INTEGER;
BEGIN
  -- Insertar si no existe
  INSERT INTO hacienda_consecutivos (tipo_documento, sucursal, terminal, consecutivo_actual)
  VALUES (p_tipo_documento, p_sucursal, p_terminal, 0)
  ON CONFLICT (tipo_documento, sucursal, terminal) DO NOTHING;
  
  -- Actualizar y obtener siguiente consecutivo
  UPDATE hacienda_consecutivos 
  SET consecutivo_actual = consecutivo_actual + 1,
      updated_at = NOW()
  WHERE tipo_documento = p_tipo_documento 
    AND sucursal = p_sucursal 
    AND terminal = p_terminal
  RETURNING consecutivo_actual INTO v_consecutivo;
  
  RETURN v_consecutivo;
END;
$$ LANGUAGE plpgsql;

-- Insertar consecutivos iniciales
INSERT INTO hacienda_consecutivos (tipo_documento, sucursal, terminal, consecutivo_actual) VALUES
('01', '001', '00001', 0),
('02', '001', '00001', 0),
('03', '001', '00001', 0),
('04', '001', '00001', 0),
('05', '001', '00001', 0),
('06', '001', '00001', 0),
('07', '001', '00001', 0)
ON CONFLICT DO NOTHING;
```

### 4. Configuración de Permisos RBAC

Agregar los siguientes permisos en el módulo de seguridad:

```sql
-- Permisos de Facturación Electrónica
INSERT INTO permisos (nombre, descripcion, modulo) VALUES
('facturas.view', 'Ver facturas electrónicas', 'facturacion'),
('facturas.create', 'Crear facturas electrónicas', 'facturacion'),
('facturas.update', 'Editar facturas electrónicas', 'facturacion'),
('facturas.delete', 'Eliminar facturas electrónicas', 'facturacion'),
('facturas.sign', 'Firmar facturas electrónicas', 'facturacion'),
('facturas.send', 'Enviar facturas a Hacienda', 'facturacion'),
('facturas.resend', 'Reenviar facturas a Hacienda', 'facturacion'),
('facturas.cancel', 'Anular facturas electrónicas', 'facturacion'),
('recepcion.view', 'Ver comprobantes recibidos', 'facturacion'),
('recepcion.accept', 'Aceptar comprobantes recibidos', 'facturacion'),
('recepcion.reject', 'Rechazar comprobantes recibidos', 'facturacion'),
('hacienda.config.view', 'Ver configuración de Hacienda', 'facturacion'),
('hacienda.config.update', 'Actualizar configuración de Hacienda', 'facturacion'),
('comprobantes.export', 'Exportar comprobantes', 'facturacion'),
('auditoria.view', 'Ver auditoría de facturación', 'facturacion');
```

### 5. Configuración Inicial

1. **Acceder al módulo**: Navegar a `/facturacion`
2. **Configurar Hacienda**: 
   - Ir a la pestaña "Configuración Hacienda"
   - Completar todos los campos requeridos
   - Probar la conexión con el botón "Probar Conexión"

## Guía de Uso

### 1. Configuración Inicial de Hacienda

#### Datos Requeridos:
- **Cédula Jurídica del Emisor**: Formato 3-101-123456
- **Código de Actividad Económica**: Asignado por Hacienda
- **Credenciales IdP**: Usuario y contraseña proporcionados por Hacienda
- **Certificado Digital**: Archivo .p12 y contraseña

#### Pasos:
1. Registrarse en el portal de Hacienda para facturación electrónica
2. Obtener credenciales del IdP
3. Adquirir certificado digital de autoridad certificadora reconocida
4. Configurar en la pantalla de "Configuración Hacienda"
5. Probar conexión en ambiente sandbox
6. Solicitar paso a producción a Hacienda

### 2. Emisión de Facturas

#### Crear Nueva Factura:
1. Clic en "Nueva Factura"
2. Seleccionar tipo de documento y cliente
3. Agregar líneas de productos/servicios
4. Verificar totales automáticos
5. Guardar como borrador

#### Proceso de Envío:
1. **Firmar**: Genera XML y aplica firma digital
2. **Enviar**: Transmite a API de Recepción de Hacienda
3. **Consultar Estado**: Verifica respuesta de Hacienda

### 3. Gestión de Comprobantes Recibidos

#### Bandeja de Recepción:
- Ver comprobantes recibidos de otros emisores
- Aceptar o rechazar comprobantes
- Generar mensajes receptor automáticos

### 4. Integración con Módulos Existentes

#### Desde Cotizaciones:
```typescript
// Al aprobar una cotización, crear factura electrónica
const crearFacturaDesdeCotzacion = async (cotizacionId: number) => {
  const cotizacion = await getCotizacionById(cotizacionId);
  
  const facturaData = {
    tipo_documento: '01', // Factura Electrónica
    cliente_id: cotizacion.cliente_id,
    fecha_emision: new Date().toISOString(),
    lineas: cotizacion.items.map(item => ({
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      // ... otros campos
    }))
  };
  
  return await haciendaService.saveFactura(facturaData);
};
```

## Arquitectura del Sistema

### Servicios Principales

#### HaciendaService
- Gestión de configuración
- Generación y firma de XML
- Comunicación con API de Hacienda
- Manejo de tokens OAuth2

#### Componentes UI
- **FacturacionPage**: Página principal con tabs
- **FacturacionForm**: Formulario de creación/edición
- **FacturacionTable**: Lista de facturas con acciones
- **ConfiguracionHacienda**: Configuración del sistema
- **ComprobantesRecibidos**: Bandeja de recepción

### Flujo de Datos

```
1. Usuario crea factura → Borrador en BD
2. Usuario firma → XML generado + Firma XAdES
3. Usuario envía → POST a API Hacienda
4. Sistema consulta → GET estado desde Location header
5. Hacienda responde → Actualización de estado en BD
```

### Seguridad

#### Encriptación
- Contraseñas IdP encriptadas en BD
- Certificados almacenados de forma segura
- Tokens OAuth2 con expiración automática

#### Control de Acceso
- Permisos granulares por acción
- Middleware de autenticación en todas las rutas
- Auditoría completa de operaciones

## Ambientes

### Sandbox (Pruebas)
- **API**: https://api.comprobanteselectronicos.go.cr/recepcion-sandbox/v1
- **IdP**: https://idp.comprobanteselectronicos.go.cr/auth/realms/rut-stag/protocol/openid-connect/token
- **Uso**: Desarrollo y pruebas

### Producción
- **API**: https://api.comprobanteselectronicos.go.cr/recepcion/v1
- **IdP**: https://idp.comprobanteselectronicos.go.cr/auth/realms/rut/protocol/openid-connect/token
- **Uso**: Operación real con Hacienda

## Troubleshooting

### Problemas Comunes

#### Error de Autenticación
```
Error: No se pudo obtener token de acceso
```
**Solución**: Verificar credenciales IdP en configuración

#### Error de Firma
```
Error: Error firmando XML
```
**Solución**: Verificar certificado .p12 y contraseña

#### Error de Envío
```
Error: HTTP 400/500 en envío
```
**Solución**: Verificar XML generado y conectividad

### Logs y Auditoría

Todos los eventos se registran en:
- **hacienda_envios**: Requests/responses a Hacienda
- **hacienda_auditoria**: Acciones de usuarios
- Console del navegador: Errores de desarrollo

## Mantenimiento

### Respaldos
- XML originales y firmados en BD
- Configuración de Hacienda
- Logs de auditoría

### Monitoreo
- Estados de facturas pendientes
- Errores de envío recurrentes
- Expiración de certificados

### Actualizaciones
- Nuevas versiones de XSD de Hacienda
- Cambios en API de Recepción
- Actualizaciones de certificados

## Soporte

Para soporte técnico:
1. Revisar logs en tabla `hacienda_auditoria`
2. Verificar configuración en `hacienda_settings`
3. Consultar documentación oficial de Hacienda
4. Contactar al equipo de desarrollo

## Documentación Oficial

- [Portal de Facturación Electrónica](https://www.hacienda.go.cr/ATV/ComprobanteElectronico/frmAnexosResoluciones.aspx)
- [Esquemas XSD v4.3](https://www.hacienda.go.cr/ATV/ComprobanteElectronico/docs/esquemas/2016/v4.3/)
- [API de Recepción v1](https://api.comprobanteselectronicos.go.cr/recepcion/v1/api-docs)
- [Guía de Implementación](https://www.hacienda.go.cr/ATV/ComprobanteElectronico/docs/Guia_Implementacion_FE.pdf)

---

**Versión**: 1.0.0  
**Última actualización**: Diciembre 2024  
**Compatibilidad**: XSD v4.3/4.4, API Recepción v1