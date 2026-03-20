# 🎯 PLAN DE IMPLEMENTACIÓN MULTI-TIENDA SCO

**Sistema:** SCO (Sistema de Costeos OLO)  
**Versión:** 1.0 FINAL  
**Fecha:** Enero 2025  
**Estado:** DOCUMENTO EJECUTABLE - NO INTERPRETABLE  

---

## ⚠️ ADVERTENCIA CRÍTICA

Este documento define el plan ÚNICO y OBLIGATORIO para llevar el sistema multi-tienda de SCO de su estado actual (parcialmente implementado) a un estado funcional al 100%.

**NINGUNA** desviación de este plan puede realizarse sin documentación y justificación explícita.

---

## 📋 ÍNDICE DE DOCUMENTOS

Este plan está dividido en documentos independientes para facilitar su lectura e implementación:

### 📚 Documentos del Plan

1. **[PLAN_01_PRINCIPIOS.md](./PLAN_01_PRINCIPIOS.md)** - Principios del Multi-Tenancy en SCO
2. **[PLAN_02_FUENTE_VERDAD.md](./PLAN_02_FUENTE_VERDAD.md)** - Fuente de Verdad de la Tienda Actual
3. **[PLAN_03_FLUJO_LOGIN.md](./PLAN_03_FLUJO_LOGIN.md)** - Flujo Correcto de Login Multi-Tienda
4. **[PLAN_04_REGLAS_QUERIES.md](./PLAN_04_REGLAS_QUERIES.md)** - Regla Obligatoria para Queries
5. **[PLAN_05_SERVICIOS_FRONTEND.md](./PLAN_05_SERVICIOS_FRONTEND.md)** - Patrón Único para Servicios Frontend
6. **[PLAN_06_EDGE_FUNCTIONS.md](./PLAN_06_EDGE_FUNCTIONS.md)** - Patrón Único para Edge Functions
7. **[PLAN_07_RLS.md](./PLAN_07_RLS.md)** - Diseño de RLS (Row Level Security)
8. **[PLAN_08_MATRIZ_MODULOS.md](./PLAN_08_MATRIZ_MODULOS.md)** - Matriz de Módulos vs Tienda
9. **[PLAN_09_FASES.md](./PLAN_09_FASES.md)** - Plan de Implementación por Fases
10. **[PLAN_10_CHECKLIST.md](./PLAN_10_CHECKLIST.md)** - Checklist Final de Validación

---

## 🎯 RESUMEN EJECUTIVO

### Objetivo Final

**Llevar el sistema multi-tienda de SCO de su estado actual (parcialmente implementado) a un estado funcional al 100%, seguro y escalable.**

### 🔑 Principios Fundamentales

1. **Fuente Única de Verdad:** Tabla `usuario_tienda_actual` en BD
2. **Cero Confianza:** NUNCA confiar en datos del frontend
3. **RLS Obligatorio:** Sin RLS no hay producción
4. **Modo Estricto:** Sin tienda no hay sistema
5. **Errores Explícitos:** Nada falla silenciosamente

### 📅 Cronograma General

| Fase | Duración | Prioridad | Bloqueante |
|------|----------|-----------|------------|
| **Fase 1: Persistencia** | 3 días | P0 | ✅ SÍ |
| **Fase 2: RLS** | 2 días | P0 | ✅ SÍ |
| **Fase 3: Servicios** | 3 días | P1 | ⚠️ PARCIAL |
| **Fase 4: Edge Functions** | 2 días | P1 | ❌ NO |
| **Fase 5: Limpieza Legacy** | 2 días | P2 | ❌ NO |

**Total:** 12 días hábiles (2.5 semanas)

### 🚨 Bloqueantes para Producción

1. ❌ RLS no implementado
2. ❌ Persistencia de tienda no funciona
3. ❌ Edge Functions sin validación
4. ❌ Servicios confiando en frontend

---

## 🚀 INICIO RÁPIDO

### Para Desarrolladores

1. **Leer primero:**
   - [PLAN_01_PRINCIPIOS.md](./PLAN_01_PRINCIPIOS.md) - Entender qué es multi-tienda en SCO
   - [PLAN_02_FUENTE_VERDAD.md](./PLAN_02_FUENTE_VERDAD.md) - Entender dónde vive la tienda

2. **Implementar:**
   - [PLAN_09_FASES.md](./PLAN_09_FASES.md) - Seguir fases en orden

3. **Validar:**
   - [PLAN_10_CHECKLIST.md](./PLAN_10_CHECKLIST.md) - Verificar que todo funciona

### Para Arquitectos

1. **Revisar:**
   - [PLAN_01_PRINCIPIOS.md](./PLAN_01_PRINCIPIOS.md) - Modelo de tenancy
   - [PLAN_07_RLS.md](./PLAN_07_RLS.md) - Estrategia de seguridad
   - [PLAN_08_MATRIZ_MODULOS.md](./PLAN_08_MATRIZ_MODULOS.md) - Impacto por módulo

### Para QA

1. **Ejecutar:**
   - [PLAN_10_CHECKLIST.md](./PLAN_10_CHECKLIST.md) - Tests de validación

### Para DevOps

1. **Verificar:**
   - [PLAN_07_RLS.md](./PLAN_07_RLS.md) - RLS implementado
   - [PLAN_10_CHECKLIST.md](./PLAN_10_CHECKLIST.md) - KPIs de producción

---

## 📊 Estado Actual vs Estado Objetivo

### ❌ Estado Actual (Problemas)

- ✅ Estructura de tablas multi-tienda creada
- ✅ Login con selección de tienda funciona
- ❌ `currentStore` se pierde al recargar (F5)
- ❌ NO hay RLS implementado (CRÍTICO)
- ❌ Edge Functions confían en `tienda_id` del frontend
- ❌ Servicios inconsistentes (algunos validan, otros no)
- ❌ Datos legacy con `tienda_id = NULL`

### ✅ Estado Objetivo (Solución)

- ✅ `currentStore` persiste en BD + Context + localStorage
- ✅ RLS implementado en todas las tablas críticas
- ✅ Edge Functions validan tienda desde BD
- ✅ Servicios estandarizados (sin parámetro `tienda_id`)
- ✅ Datos legacy migrados
- ✅ Sistema 100% funcional y seguro

---

## 🎯 PRÓXIMOS PASOS INMEDIATOS

### **Día 1-3: Fase 1 - Persistencia**

1. Leer [PLAN_02_FUENTE_VERDAD.md](./PLAN_02_FUENTE_VERDAD.md)
2. Leer [PLAN_03_FLUJO_LOGIN.md](./PLAN_03_FLUJO_LOGIN.md)
3. Implementar según [PLAN_09_FASES.md](./PLAN_09_FASES.md) - Fase 1
4. Validar con [PLAN_10_CHECKLIST.md](./PLAN_10_CHECKLIST.md) - Tests 4 y 5

### **Día 4-5: Fase 2 - RLS**

1. Leer [PLAN_07_RLS.md](./PLAN_07_RLS.md)
2. Implementar según [PLAN_09_FASES.md](./PLAN_09_FASES.md) - Fase 2
3. Validar con [PLAN_10_CHECKLIST.md](./PLAN_10_CHECKLIST.md) - Test 8

### **Día 6-8: Fase 3 - Servicios**

1. Leer [PLAN_05_SERVICIOS_FRONTEND.md](./PLAN_05_SERVICIOS_FRONTEND.md)
2. Implementar según [PLAN_09_FASES.md](./PLAN_09_FASES.md) - Fase 3
3. Validar con [PLAN_10_CHECKLIST.md](./PLAN_10_CHECKLIST.md) - Test 10

---

## 📞 SOPORTE

Este documento es la **FUENTE DE VERDAD ABSOLUTA** para la implementación multi-tienda del sistema SCO.

**Cualquier desviación de este plan debe ser justificada y documentada.**

**Cualquier duda debe resolverse consultando estos documentos primero.**

---

**Documento:** 00_PLAN_DE_IMPLEMENTACION (ÍNDICE)  
**Versión:** 1.0 FINAL  
**Última actualización:** Enero 2025  
**Estado:** LISTO PARA IMPLEMENTAR
