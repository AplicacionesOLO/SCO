# 🏗️ ARQUITECTURA DE INTEGRACIÓN POR API - SCO

## 📋 Índice General

Este documento técnico describe la arquitectura completa de integración por API de SCO, diseñada para ser **multi-cliente, enterprise-ready y adaptable a cualquier ERP**.

---

## 📚 Documentos de la Arquitectura

### [01. Principios de Arquitectura](./ARQUITECTURA_API_01_PRINCIPIOS.md)
- Desacoplamiento Frontend ↔ Backend
- Patrón Adapter / Provider
- Patrón Strategy por Fuente de Datos
- Configuración por Cliente y Módulo

### [02. Modos de Operación](./ARQUITECTURA_API_02_MODOS.md)
- Modo LOCAL
- Modo API
- Modo HÍBRIDO (Recomendado)
- Diagramas de Flujo

### [03. Configuración Global](./ARQUITECTURA_API_03_CONFIGURACION.md)
- Estructura de Configuración
- ConfigManager (Singleton)
- Inicialización en la Aplicación
- UI de Configuración (Admin)

### [04. Contrato API Estándar](./ARQUITECTURA_API_04_CONTRATO.md)
- Principios del Contrato
- Autenticación (Bearer, API Key, OAuth2)
- Versionado
- Paginación
- Estructura de Respuesta
- Códigos de Error HTTP
- Rate Limiting
- Idempotencia

### [05. Módulo: Inventario](./ARQUITECTURA_API_05_INVENTARIO.md)
- Endpoints Requeridos (9 endpoints)
- Campos Obligatorios y Opcionales
- Mapeo API → Modelo Interno
- Manejo de tienda_id (Artículos Globales)
- Casos de Error

### [06. Módulo: Productos](./ARQUITECTURA_API_06_PRODUCTOS.md)
- Endpoints Requeridos (5 endpoints)
- Gestión de BOM (Bill of Materials)
- Campos Obligatorios y Opcionales
- Mapeo API → Modelo Interno
- Casos de Error

### [07. Módulo: Cotizaciones](./ARQUITECTURA_API_07_COTIZACIONES.md)
- Endpoints Requeridos (5 endpoints)
- Cálculo de Totales
- Estados de Cotización
- Conversión a Pedido
- Casos de Error

### [08. Módulo: Pedidos](./ARQUITECTURA_API_08_PEDIDOS.md)
- Endpoints Requeridos (4 endpoints)
- Estados de Pedido
- Reservas de Inventario
- Facturación
- Casos de Error

### [09. Módulo: Mantenimiento](./ARQUITECTURA_API_09_MANTENIMIENTO.md)
- Endpoints Requeridos (3 endpoints)
- Umbrales de Stock
- Alertas
- Punto de Reorden (ROP)
- Reabastecimiento

### [10. Módulo: Optimizador](./ARQUITECTURA_API_10_OPTIMIZADOR.md)
- Endpoints Requeridos (2 endpoints)
- Lectura de Materiales
- Tapacantos
- Servicios CNC
- Artículos Globales

### [11. Módulo: Seguridad](./ARQUITECTURA_API_11_SEGURIDAD.md)
- Endpoints Requeridos (4 endpoints)
- Usuarios
- Roles
- Permisos
- Auditoría

### [12. Permisos y Seguridad](./ARQUITECTURA_API_12_PERMISOS.md)
- Matriz de Permisos por Endpoint
- Validación de Permisos en API
- Roles Sugeridos
- Aplicación de :own

### [13. Estrategia de Sincronización](./ARQUITECTURA_API_13_SINCRONIZACION.md)
- API → Local (Cache)
- Local → API (Escritura)
- Solo Lectura
- Escritura Controlada
- Implementación de Cache

### [14. Estrategia de Fallos](./ARQUITECTURA_API_14_FALLOS.md)
- API No Responde
- API Devuelve Error
- Datos Incompletos
- Comportamiento Esperado del Sistema
- Tabla de Escenarios

### [15. Pruebas con Postman](./ARQUITECTURA_API_15_POSTMAN.md)
- Colecciones Sugeridas
- Variables de Entorno
- Ejemplos de Requests
- Casos OK / Error
- Scripts de Automatización

### [16. Escalabilidad](./ARQUITECTURA_API_16_ESCALABILIDAD.md)
- Conectar Nuevos ERPs
- Conectar Múltiples APIs
- Versionar Contratos
- Multi-Región
- Extensibilidad

### [17. Resumen Ejecutivo](./ARQUITECTURA_API_17_RESUMEN.md)
- Por Qué Es Multi-Cliente
- Por Qué Es Enterprise-Ready
- Por Qué Es Adaptable a Cualquier ERP
- Por Qué Es Escalable a Futuro
- Beneficios Clave
- Casos de Uso Reales
- Roadmap de Implementación

---

## 🎯 Objetivo del Documento

Definir cómo toda la aplicación SCO puede operar en **modo híbrido**:

- **Modo Local:** Base de datos interna (Supabase)
- **Modo API Externa:** Inventario, productos, precios, stock desde ERP
- **Modo Híbrido:** Combinación de ambos con cache inteligente

El sistema debe poder:
- ✅ Elegir por cliente si un módulo usa datos locales o API
- ✅ Cambiar esa fuente sin romper la aplicación
- ✅ Permitir pruebas completas desde Postman

---

## 🚀 Inicio Rápido

### Para Desarrolladores

1. **Leer primero:**
   - [01. Principios de Arquitectura](./ARQUITECTURA_API_01_PRINCIPIOS.md)
   - [02. Modos de Operación](./ARQUITECTURA_API_02_MODOS.md)
   - [04. Contrato API Estándar](./ARQUITECTURA_API_04_CONTRATO.md)

2. **Implementar módulo:**
   - Leer documento del módulo específico (05-11)
   - Implementar Provider según contrato
   - Configurar en UI de administración

3. **Probar:**
   - [15. Pruebas con Postman](./ARQUITECTURA_API_15_POSTMAN.md)

### Para Arquitectos

1. **Revisar arquitectura completa:**
   - Todos los documentos en orden
   - Especial atención a [13. Sincronización](./ARQUITECTURA_API_13_SINCRONIZACION.md) y [14. Fallos](./ARQUITECTURA_API_14_FALLOS.md)

2. **Evaluar escalabilidad:**
   - [16. Escalabilidad](./ARQUITECTURA_API_16_ESCALABILIDAD.md)

### Para Product Managers

1. **Entender valor de negocio:**
   - [17. Resumen Ejecutivo](./ARQUITECTURA_API_17_RESUMEN.md)

2. **Casos de uso:**
   - Sección "Casos de Uso Reales" en Resumen Ejecutivo

---

## 📊 Resumen de Endpoints por Módulo

| Módulo | Endpoints | Lectura | Escritura | Críticos |
|--------|-----------|---------|-----------|----------|
| **Inventario** | 9 | 3 | 6 | Buscar, Stock, Reservar |
| **Productos** | 5 | 2 | 3 | Obtener con BOM |
| **Cotizaciones** | 5 | 2 | 3 | Crear, Aprobar |
| **Pedidos** | 4 | 2 | 2 | Confirmar, Facturar |
| **Mantenimiento** | 3 | 2 | 1 | Alertas, Umbrales |
| **Optimizador** | 2 | 1 | 1 | Crear Proyecto |
| **Seguridad** | 4 | 2 | 2 | Usuarios, Roles |
| **TOTAL** | **32** | **14** | **18** | - |

---

## 🔐 Matriz de Roles y Permisos

| Rol | Nivel | Módulos con Acceso Completo | Restricciones |
|-----|-------|----------------------------|---------------|
| **Super Admin** | Global | Todos | Ninguna |
| **Administrador** | Tenant | Todos excepto Super Admin | Solo su tenant |
| **Supervisor** | Tienda | Dashboard, Inventario, Cotizaciones, Pedidos | Solo su(s) tienda(s) |
| **Operador** | Tienda | Dashboard, Inventario, Cotizaciones | Solo lectura en Pedidos |
| **Vendedor** | Tienda | Dashboard, Clientes, Cotizaciones | Solo sus cotizaciones |
| **Bodeguero** | Tienda | Inventario, Mantenimiento | Solo su tienda |

---

## 🔄 Modos de Operación por Cliente

### Configuración Típica: Startup
```json
{
  "inventario": "LOCAL",
  "productos": "LOCAL",
  "cotizaciones": "LOCAL",
  "pedidos": "LOCAL",
  "mantenimiento": "LOCAL"
}
```

### Configuración Típica: Empresa Mediana
```json
{
  "inventario": "HYBRID",
  "productos": "API",
  "cotizaciones": "LOCAL",
  "pedidos": "LOCAL",
  "mantenimiento": "HYBRID"
}
```

### Configuración Típica: Enterprise
```json
{
  "inventario": "API",
  "productos": "API",
  "cotizaciones": "API",
  "pedidos": "API",
  "mantenimiento": "API"
}
```

---

## 📈 Beneficios de Esta Arquitectura

### 1. Multi-Cliente
- ✅ Configuración por tenant
- ✅ Aislamiento de datos
- ✅ Flexibilidad total

### 2. Enterprise-Ready
- ✅ Seguridad robusta (JWT, RBAC)
- ✅ Resiliencia ante fallos
- ✅ Observabilidad completa
- ✅ Escalabilidad horizontal

### 3. Adaptable a Cualquier ERP
- ✅ Contrato API estándar
- ✅ Mapeo de campos configurable
- ✅ Providers personalizados
- ✅ Modo híbrido flexible

### 4. Escalable a Futuro
- ✅ Arquitectura modular
- ✅ Versionado de contratos
- ✅ Multi-región
- ✅ Extensibilidad

---

## 🛠️ Stack Tecnológico

### Frontend
- React 19
- TypeScript
- TailwindCSS
- React Router

### Backend
- Supabase (PostgreSQL + Edge Functions)
- Row Level Security (RLS)
- JWT Authentication

### Integraciones
- REST APIs
- IndexedDB (Cache)
- Postman (Testing)

---

## 📞 Soporte

Para preguntas sobre esta arquitectura:
- **Documentación Técnica:** Ver documentos específicos (01-17)
- **Implementación:** Consultar con equipo de desarrollo
- **Configuración:** Ver [03. Configuración Global](./ARQUITECTURA_API_03_CONFIGURACION.md)

---

**Documento generado:** 2025-01-22  
**Versión:** 1.0  
**Estado:** ✅ Completo - Listo para Implementación

---

## 📝 Notas Importantes

⚠️ **IMPORTANTE:** Este es un documento técnico de arquitectura. **NO modifica código existente**. Solo define cómo debe implementarse la integración por API.

✅ **Próximos Pasos:**
1. Revisar y aprobar arquitectura
2. Implementar APIProvider para módulo piloto
3. Configurar integración con ERP de cliente piloto
4. Probar con Postman
5. Iterar y expandir a otros módulos

---

## 🔗 Enlaces Rápidos

- [Ver todos los documentos](.)
- [Principios de Arquitectura](./ARQUITECTURA_API_01_PRINCIPIOS.md)
- [Contrato API](./ARQUITECTURA_API_04_CONTRATO.md)
- [Pruebas con Postman](./ARQUITECTURA_API_15_POSTMAN.md)
- [Resumen Ejecutivo](./ARQUITECTURA_API_17_RESUMEN.md)
