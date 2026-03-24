# 🏢 Arquitectura Multi-Tienda - Sistema SCO

> **Sistema de Costeos OLO (SCO)**  
> Documentación Técnica de Multi-Tenancy  
> Versión: 1.0  
> Fecha: Enero 2025

---

## 📋 Índice General

Esta documentación está dividida en módulos independientes para facilitar su lectura y mantenimiento.

### 📚 Documentos Disponibles

1. **[MULTITIENDA_ARQUITECTURA_01_ESTADO_ACTUAL.md](./MULTITIENDA_ARQUITECTURA_01_ESTADO_ACTUAL.md)**
   - Estructura de base de datos actual
   - Tablas con `tienda_id`
   - Flujo de login existente
   - Servicios frontend actuales
   - Edge Functions desplegadas
   - Estado de RLS

2. **[MULTITIENDA_ARQUITECTURA_02_PROBLEMAS.md](./MULTITIENDA_ARQUITECTURA_02_PROBLEMAS.md)**
   - Vulnerabilidades de seguridad críticas
   - Problemas de persistencia
   - Inconsistencias en servicios
   - Riesgos actuales

3. **[MULTITIENDA_ARQUITECTURA_03_ARQUITECTURA_OBJETIVO.md](./MULTITIENDA_ARQUITECTURA_03_ARQUITECTURA_OBJETIVO.md)**
   - Modelo de tenancy
   - Fuente única de verdad
   - Separación de datos
   - Reglas obligatorias

4. **[MULTITIENDA_ARQUITECTURA_04_FLUJO_COMPLETO.md](./MULTITIENDA_ARQUITECTURA_04_FLUJO_COMPLETO.md)**
   - Flujo end-to-end ideal
   - Código de implementación
   - Login y selección de tienda
   - Cambio de tienda
   - Recarga de página

5. **[MULTITIENDA_ARQUITECTURA_05_RLS.md](./MULTITIENDA_ARQUITECTURA_05_RLS.md)**
   - Principios de Row Level Security
   - Políticas por tabla
   - Políticas por módulo
   - Excepciones para administradores

6. **[MULTITIENDA_ARQUITECTURA_06_SERVICIOS_API.md](./MULTITIENDA_ARQUITECTURA_06_SERVICIOS_API.md)**
   - Patrón obligatorio para servicios frontend
   - Template para Edge Functions
   - Helper functions
   - Reglas de validación

7. **[MULTITIENDA_ARQUITECTURA_07_UX_UI.md](./MULTITIENDA_ARQUITECTURA_07_UX_UI.md)**
   - Selector de tienda
   - Indicador visual
   - Estados de carga
   - Bloqueo de navegación

8. **[MULTITIENDA_ARQUITECTURA_08_ERRORES_DIAGNOSTICO.md](./MULTITIENDA_ARQUITECTURA_08_ERRORES_DIAGNOSTICO.md)**
   - Errores comunes
   - Logs recomendados
   - Herramientas de diagnóstico
   - Scripts de validación

9. **[MULTITIENDA_ARQUITECTURA_09_MATRIZ_MODULOS.md](./MULTITIENDA_ARQUITECTURA_09_MATRIZ_MODULOS.md)**
   - Análisis por módulo
   - Tablas consultadas
   - Filtros obligatorios
   - Riesgos específicos

10. **[MULTITIENDA_ARQUITECTURA_10_PLAN_IMPLEMENTACION.md](./MULTITIENDA_ARQUITECTURA_10_PLAN_IMPLEMENTACION.md)**
    - Fases del plan
    - Orden de implementación
    - Scripts SQL
    - Checklist de validación

---

## 🚀 Inicio Rápido

### Para Desarrolladores

1. Lee **Estado Actual** para entender la situación
2. Revisa **Problemas** para conocer los riesgos
3. Estudia **Arquitectura Objetivo** para la visión
4. Implementa según **Plan de Implementación**

### Para Arquitectos

1. **Arquitectura Objetivo** - Modelo de tenancy
2. **RLS** - Estrategia de seguridad
3. **Servicios y API** - Patrones obligatorios
4. **Matriz por Módulo** - Análisis detallado

### Para QA

1. **Errores y Diagnóstico** - Casos de prueba
2. **Plan de Implementación** - Checklist de validación
3. **Flujo Completo** - Casos de uso end-to-end

### Para DevOps

1. **RLS** - Scripts de base de datos
2. **Plan de Implementación** - Orden de despliegue
3. **Errores y Diagnóstico** - Monitoreo y logs

---

## ⚠️ Advertencias Críticas

### 🔴 SEGURIDAD CRÍTICA

**El sistema actualmente NO tiene Row Level Security (RLS) implementado.**

Esto significa que:
- ✅ Cualquier usuario autenticado puede acceder a datos de CUALQUIER tienda
- ✅ Puede modificar/eliminar datos de otras tiendas usando DevTools o Postman
- ✅ La seguridad depende 100% del frontend (NO es seguro)

**Acción requerida:** Implementar RLS INMEDIATAMENTE (ver documento 05_RLS)

### 🟡 PRIORIDADES

1. **Semana 1 (CRÍTICO):**
   - Implementar RLS en tablas críticas
   - Reforzar Edge Functions
   - Validar servicios frontend

2. **Semana 2 (ALTO):**
   - RLS en tablas secundarias
   - Mejorar UX/UI
   - Agregar logs estándar

3. **Semana 3 (MEDIO):**
   - Migración de datos
   - Documentación completa
   - Pruebas exhaustivas

---

## 📊 Métricas Clave

### Estado Actual

| Componente | Estado | Prioridad |
|------------|--------|-----------|
| RLS | ❌ No implementado | 🔴 CRÍTICO |
| Edge Functions | ⚠️ Sin validación | 🔴 CRÍTICO |
| Servicios Frontend | ⚠️ Validación parcial | 🔴 CRÍTICO |
| UX/UI | ⚠️ Básico | 🟡 ALTO |
| Logs | ❌ No estandarizados | 🟡 ALTO |
| Migración de Datos | ⏳ Pendiente | 🟢 MEDIO |

### Objetivos

- ✅ 0 fugas de datos entre tiendas
- ✅ 100% de tablas con RLS
- ✅ 100% de Edge Functions validadas
- ✅ 100% de servicios con validación
- ✅ 0 errores de tienda en producción

---

## 🎯 Contexto del Sistema

### ¿Qué es Multi-Tienda?

SCO es un sistema **multi-tenant** donde:
- Múltiples clientes (tiendas) comparten la misma aplicación
- Cada tienda tiene sus propios datos aislados
- Los usuarios pertenecen a una o más tiendas
- Al hacer login, el usuario selecciona con qué tienda trabajar

### Modelo Actual

```
┌─────────────────────────────────────────┐
│         Base de Datos Única             │
│                                         │
│  ┌─────────────┐  ┌─────────────┐     │
│  │  Tienda A   │  │  Tienda B   │     │
│  │             │  │             │     │
│  │ clientes    │  │ clientes    │     │
│  │ productos   │  │ productos   │     │
│  │ pedidos     │  │ pedidos     │     │
│  └─────────────┘  └─────────────┘     │
│                                         │
│  ┌─────────────────────────────┐       │
│  │   Catálogos Globales        │       │
│  │   (compartidos)             │       │
│  └─────────────────────────────┘       │
└─────────────────────────────────────────┘
```

### Módulos del Sistema

1. **Dashboard** - Estadísticas y KPIs
2. **Clientes** - Gestión de clientes
3. **Inventario** - Control de stock
4. **Productos** - Catálogo de productos
5. **Cotizaciones** - Presupuestos
6. **Pedidos** - Órdenes de compra
7. **Facturación** - Facturación electrónica (Hacienda CR)
8. **Tareas** - Gestión de tareas
9. **Optimizador** - Optimización de cortes
10. **Seguridad** - Usuarios, roles y permisos
11. **Mantenimiento** - Alertas y reabastecimiento
12. **CostBot** - Chatbot con RAG

---

## 📖 Cómo Usar Esta Documentación

### Lectura Secuencial

Si eres nuevo en el proyecto, lee los documentos en orden:

1. Estado Actual → 2. Problemas → 3. Arquitectura → 4. Flujo → 5. RLS → 6. Servicios → 7. UX → 8. Errores → 9. Matriz → 10. Plan

### Lectura por Rol

**Desarrollador Backend:**
- 05_RLS
- 06_SERVICIOS_API
- 08_ERRORES_DIAGNOSTICO
- 10_PLAN_IMPLEMENTACION

**Desarrollador Frontend:**
- 04_FLUJO_COMPLETO
- 06_SERVICIOS_API
- 07_UX_UI
- 08_ERRORES_DIAGNOSTICO

**Arquitecto:**
- 03_ARQUITECTURA_OBJETIVO
- 05_RLS
- 09_MATRIZ_MODULOS

**QA:**
- 08_ERRORES_DIAGNOSTICO
- 10_PLAN_IMPLEMENTACION (Checklist)

---

## 🔗 Referencias

### Documentos Existentes del Proyecto

- `MULTITIENDA_00_INDICE.md` - Índice anterior
- `MULTITIENDA_01_ESTADO_ACTUAL.md` - Estado previo
- `sql_multi_tienda_completo.sql` - Scripts SQL
- `src/hooks/useAuth.ts` - Hook de autenticación
- `src/pages/auth/LoginPage.tsx` - Login

### Enlaces Externos

- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase JWT](https://supabase.com/docs/guides/auth/auth-helpers/nextjs#custom-claims)
- [Multi-Tenancy Patterns](https://docs.microsoft.com/en-us/azure/architecture/patterns/multi-tenancy)

---

## 📝 Notas de Versión

### Versión 1.0 (Enero 2025)

- ✅ Documentación inicial completa
- ✅ Análisis de estado actual
- ✅ Identificación de problemas críticos
- ✅ Arquitectura objetivo definida
- ✅ Plan de implementación detallado
- ✅ Scripts SQL listos para ejecutar
- ✅ Checklist de validación

---

## 👥 Contacto

Para preguntas o aclaraciones sobre esta documentación:

- **Equipo de Desarrollo SCO**
- **Sistema:** SCO - Sistema de Costeos OLO

---

**Última actualización:** Enero 2025  
**Versión:** 1.0  
**Estado:** Documentación Completa
