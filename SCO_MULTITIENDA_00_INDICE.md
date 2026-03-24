# SCO - SISTEMA MULTI-TIENDA: ÍNDICE GENERAL

**Sistema:** SCO (Sistema de Costeos OLO)  
**Versión:** 1.0 DEFINITIVA  
**Fecha:** 2025  
**Estado:** OBLIGATORIO - FUENTE DE VERDAD ABSOLUTA

---

## 📚 ESTRUCTURA DE LA DOCUMENTACIÓN

Este documento es el **índice maestro** de la documentación técnica definitiva para la implementación del sistema multi-tienda de SCO.

La documentación está dividida en **9 documentos independientes** para facilitar su lectura y mantenimiento:

### 📖 Documentos Disponibles

1. **[SCO_MULTITIENDA_01_ESTADO_ACTUAL.md](./SCO_MULTITIENDA_01_ESTADO_ACTUAL.md)**
   - Cómo funciona hoy el sistema
   - Qué datos se guardan
   - Qué se rompe al refrescar
   - Qué módulos usan tienda_id

2. **[SCO_MULTITIENDA_02_FUENTE_VERDAD.md](./SCO_MULTITIENDA_02_FUENTE_VERDAD.md)**
   - Tabla usuario_tienda_actual
   - Quién escribe y quién lee
   - Cuándo se valida
   - Jerarquía de fuentes

3. **[SCO_MULTITIENDA_03_FLUJO_COMPLETO.md](./SCO_MULTITIENDA_03_FLUJO_COMPLETO.md)**
   - Login
   - Selección de tienda
   - Persistencia
   - Carga inicial
   - Cambio de tienda
   - Logout

4. **[SCO_MULTITIENDA_04_SEGURIDAD_RLS.md](./SCO_MULTITIENDA_04_SEGURIDAD_RLS.md)**
   - Principios de seguridad
   - Diseño completo de RLS
   - Templates SQL
   - Tablas por tipo

5. **[SCO_MULTITIENDA_05_REGLAS_QUERIES.md](./SCO_MULTITIENDA_05_REGLAS_QUERIES.md)**
   - Regla única para queries
   - Templates para SELECT, INSERT, UPDATE, DELETE
   - Qué pasa si no hay tienda
   - Queries con joins

6. **[SCO_MULTITIENDA_06_EDGE_FUNCTIONS.md](./SCO_MULTITIENDA_06_EDGE_FUNCTIONS.md)**
   - Validación obligatoria
   - Qué está prohibido
   - Cómo deben fallar
   - Template completo

7. **[SCO_MULTITIENDA_07_MATRIZ_MODULOS.md](./SCO_MULTITIENDA_07_MATRIZ_MODULOS.md)**
   - Análisis por módulo
   - Riesgos actuales
   - Acciones requeridas
   - 11 módulos analizados

8. **[SCO_MULTITIENDA_08_PLAN_FASES.md](./SCO_MULTITIENDA_08_PLAN_FASES.md)**
   - 5 fases de implementación
   - Tareas por fase
   - Qué NO se toca
   - Validaciones

9. **[SCO_MULTITIENDA_09_CHECKLIST.md](./SCO_MULTITIENDA_09_CHECKLIST.md)**
   - Casos de prueba obligatorios
   - Pruebas manuales
   - Pruebas con Postman
   - Logs esperados

---

## 🎯 RESUMEN EJECUTIVO

### Objetivo Final
Completar la implementación multi-tienda del sistema SCO para que sea **100% funcional, segura y escalable**.

### Estado Actual
- ✅ Estructura de tablas existe
- ✅ Filtros parciales implementados
- ❌ Persistencia rota (se pierde al refrescar)
- ❌ Sin RLS (inseguro)
- ❌ Edge Functions confían en frontend
- ❌ Datos legacy sin clasificar

### Estado Objetivo
- ✅ Persistencia en BD (fuente de verdad)
- ✅ RLS en todas las tablas críticas
- ✅ Edge Functions validan desde BD
- ✅ Servicios confían en RLS
- ✅ Datos legacy migrados
- ✅ Sistema 100% seguro y funcional

---

## 🚀 INICIO RÁPIDO

### Para Desarrolladores
1. Leer: **01_ESTADO_ACTUAL** (entender situación)
2. Leer: **02_FUENTE_VERDAD** (entender arquitectura)
3. Leer: **05_REGLAS_QUERIES** (patrones de código)
4. Leer: **06_EDGE_FUNCTIONS** (template obligatorio)
5. Implementar: **08_PLAN_FASES** (paso a paso)

### Para Arquitectos
1. Leer: **02_FUENTE_VERDAD** (arquitectura)
2. Leer: **04_SEGURIDAD_RLS** (modelo de seguridad)
3. Leer: **07_MATRIZ_MODULOS** (análisis completo)
4. Revisar: **08_PLAN_FASES** (estrategia)

### Para QA
1. Leer: **01_ESTADO_ACTUAL** (contexto)
2. Leer: **09_CHECKLIST** (casos de prueba)
3. Ejecutar: Tests manuales y con Postman

### Para DevOps
1. Leer: **04_SEGURIDAD_RLS** (requisitos de BD)
2. Leer: **08_PLAN_FASES** (plan de deploy)
3. Validar: RLS implementado antes de producción

---

## ⚠️ ADVERTENCIAS CRÍTICAS

### 🚨 BLOQUEANTES PARA PRODUCCIÓN

**El sistema NO puede salir a producción sin:**

1. ❌ RLS implementado en todas las tablas críticas
2. ❌ Edge Functions validando tienda desde BD
3. ❌ Persistencia de tienda en BD funcionando
4. ❌ Todos los tests de validación pasando

### 🚨 VULNERABILIDADES ACTUALES

**Sin RLS, el sistema es INSEGURO:**
- Cualquier usuario puede ver datos de cualquier tienda usando DevTools
- Cualquier usuario puede modificar datos de otras tiendas usando Postman
- La seguridad depende 100% del frontend (NO es seguro)

---

## 📊 MÉTRICAS CLAVE

### Tablas Críticas
- **19 tablas** requieren tienda_id obligatorio
- **7 tablas** son globales (sin tienda_id)
- **4 tablas** son híbridas (tienda_id nullable)

### Módulos Afectados
- **11 módulos** analizados
- **3 módulos** con riesgo ALTO
- **5 módulos** con riesgo MEDIO
- **3 módulos** con riesgo BAJO

### Plan de Implementación
- **5 fases** de implementación
- **12 días** estimados
- **60+ tareas** identificadas
- **10 tests** obligatorios

---

## 🔑 PRINCIPIOS FUNDAMENTALES

### 1. Fuente Única de Verdad
**La tienda activa SIEMPRE se obtiene desde `usuario_tienda_actual` en BD.**

### 2. Zero Trust
**Ningún dato del frontend es confiable para seguridad.**

### 3. RLS Obligatorio
**Sin RLS no hay producción.**

### 4. Modo Estricto
**Sin tienda no hay sistema.**

### 5. Errores Explícitos
**Nada falla silenciosamente.**

---

## 📖 CÓMO USAR ESTA DOCUMENTACIÓN

### Lectura Secuencial (Recomendado)
Lee los documentos en orden (01 → 09) para entender el sistema completo.

### Lectura por Tema
Busca el documento específico según tu necesidad:
- **Arquitectura:** 02, 04
- **Implementación:** 05, 06, 08
- **Testing:** 09
- **Análisis:** 01, 07

### Referencia Rápida
Usa este índice para encontrar información específica rápidamente.

---

## 📞 NOTAS FINALES

Esta documentación es la **FUENTE DE VERDAD ABSOLUTA** para la implementación multi-tienda del sistema SCO.

**Cualquier desviación debe ser justificada y documentada.**

**Cualquier duda debe resolverse consultando estos documentos primero.**

**Ningún deploy a producción puede realizarse sin cumplir el 100% de esta documentación.**

---

**Versión:** 1.0 DEFINITIVA  
**Fecha:** 2025  
**Estado:** OBLIGATORIO
