# 📘 Manual de Integración API - Sistema OLO

## Índice General de Documentación

Este manual está dividido en múltiples archivos para facilitar su lectura y mantenimiento.

### 📑 Archivos de Documentación

1. **API_DOCS_01_INTRODUCCION.md** - Introducción y Arquitectura
   - Propósito del documento
   - Arquitectura general
   - Modos de operación
   - URLs base

2. **API_DOCS_02_AUTENTICACION.md** - Autenticación y Seguridad
   - Flujo de autenticación
   - Endpoints de login/logout
   - Matriz de roles y permisos
   - Validación de permisos

3. **API_DOCS_03_MULTI_SUCURSAL.md** - Arquitectura Multi-Sucursal
   - Jerarquía de datos
   - Reglas de aislamiento
   - Cambio de tienda actual

4. **API_DOCS_04_DASHBOARD.md** - Módulo Dashboard
   - KPIs generales
   - Top productos y clientes
   - Gráficos de ventas

5. **API_DOCS_05_CLIENTES.md** - Módulo Clientes
   - CRUD completo de clientes
   - Importación/exportación masiva
   - Gestión de información fiscal

6. **API_DOCS_06_PRODUCTOS.md** - Módulo Productos
   - Gestión de productos
   - BOM (Bill of Materials)
   - Verificación de disponibilidad

7. **API_DOCS_07_INVENTARIO.md** - Módulo Inventario
   - Gestión de artículos
   - Movimientos y reservas
   - Integración con API externa
   - Artículos globales

8. **API_DOCS_08_COTIZACIONES.md** - Módulo Cotizaciones
   - CRUD de cotizaciones
   - Cálculo de totales
   - Conversión a pedidos

9. **API_DOCS_09_PEDIDOS.md** - Módulo Pedidos
   - Gestión de pedidos
   - Estados y seguimiento
   - Pagos y facturación

10. **API_DOCS_10_OPTIMIZADOR.md** - Módulo Optimizador 2D
    - Proyectos de optimización
    - Tapacantos con grosor
    - Servicios CNC
    - Creación de cotizaciones

11. **API_DOCS_11_FACTURACION.md** - Módulo Facturación
    - Facturación electrónica
    - Integración con Hacienda CR
    - Comprobantes recibidos

12. **API_DOCS_12_TAREAS.md** - Módulo Tareas
    - Gestión de tareas
    - Asignación de responsables
    - Seguimiento de estados

13. **API_DOCS_13_MANTENIMIENTO.md** - Módulo Mantenimiento
    - Umbrales de inventario
    - Alertas de stock
    - Reabastecimiento

14. **API_DOCS_14_SEGURIDAD.md** - Módulo Seguridad
    - Gestión de usuarios
    - Roles y permisos
    - Auditoría

15. **API_DOCS_15_COSTBOT.md** - Módulo CostBot Admin
    - Consultas RAG
    - Ingesta de documentos
    - Estadísticas

16. **API_DOCS_16_POSTMAN.md** - Guía de Postman
    - Configuración de colecciones
    - Variables de entorno
    - Flujos de prueba

17. **API_DOCS_17_ERRORES.md** - Códigos de Error
    - Códigos HTTP estándar
    - Errores personalizados
    - Formato de respuestas

18. **API_DOCS_18_OBSERVABILIDAD.md** - Observabilidad y Logs
    - Trace ID
    - Logs estructurados
    - Métricas clave

---

## 🚀 Inicio Rápido

### 1. Autenticación
```bash
POST /auth/login
{
  "email": "usuario@empresa.com",
  "password": "Password123!",
  "tenant_id": "uuid-tenant-123"
}
```

### 2. Headers Requeridos
```
Authorization: Bearer <access_token>
Content-Type: application/json
X-Tenant-ID: <tenant_id>
X-Tienda-ID: <tienda_id>
X-Trace-ID: <uuid-trace>
```

### 3. Ejemplo de Request
```bash
GET /inventario?page=1&limit=20
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-Tenant-ID: uuid-tenant-123
X-Tienda-ID: uuid-tienda-789
```

---

## 📊 Resumen de Endpoints

| Módulo | Endpoints | Descripción |
|--------|-----------|-------------|
| Dashboard | 4 | KPIs, gráficos, rankings |
| Clientes | 7 | CRUD + import/export |
| Productos | 7 | CRUD + BOM |
| Inventario | 11 | CRUD + movimientos + reservas |
| Cotizaciones | 8 | CRUD + conversión a pedido |
| Pedidos | 9 | CRUD + estados + facturación |
| Optimizador 2D | 9 | Proyectos + optimización |
| Facturación | 14 | Facturas electrónicas + Hacienda |
| Tareas | 9 | CRUD + asignación |
| Mantenimiento | 8 | Umbrales + alertas |
| Seguridad | 14 | Usuarios + roles + permisos |
| CostBot | 5 | Consultas + ingesta |
| **TOTAL** | **~150+** | Endpoints documentados |

---

## 🔐 Roles y Permisos

### Roles Principales
- **Super Administrador**: Acceso total
- **Administrador**: Gestión completa del tenant
- **Supervisor**: Supervisión y reportes
- **Operador**: Operaciones diarias
- **Vendedor**: Cotizaciones y pedidos
- **Bodeguero**: Inventario

### Permisos por Módulo
Cada módulo tiene permisos específicos:
- `view` - Ver datos
- `create` - Crear registros
- `update` - Actualizar registros
- `delete` - Eliminar registros
- Permisos especiales según módulo

---

## 🌐 Modos de Operación

| Modo | Inventario | Productos | Clientes |
|------|------------|-----------|----------|
| **LOCAL** | ✅ Local | ✅ Local | ✅ Local |
| **API** | 🌐 API Externa | 🌐 API Externa | 🌐 API Externa |
| **HYBRID** | 🌐 API Externa | ✅ Local | ✅ Local |

---

## 📞 Soporte

Para más información o soporte técnico:
- **Email**: soporte@sistemaolo.com
- **Documentación**: https://docs.sistemaolo.com
- **API Status**: https://status.sistemaolo.com

---

**Versión:** 1.0  
**Fecha:** Enero 2025  
**Última actualización:** 2025-01-22
