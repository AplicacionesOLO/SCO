# DOCUMENTACIÓN TÉCNICA: SISTEMA MULTI-TIENDA SCO

**Sistema:** SCO (Sistema de Costeos OLO)  
**Versión:** 1.0  
**Fecha:** 2024  

---

## 📚 ÍNDICE DE DOCUMENTOS

Este documento técnico está dividido en múltiples archivos para facilitar su lectura y mantenimiento.

### Documentos Principales

1. **[MULTITIENDA_01_ESTADO_ACTUAL.md](./MULTITIENDA_01_ESTADO_ACTUAL.md)**
   - Estado actual del sistema
   - Estructura de base de datos
   - Código frontend existente
   - Funciones RPC

2. **[MULTITIENDA_02_PROBLEMAS.md](./MULTITIENDA_02_PROBLEMAS.md)**
   - Problemas de arquitectura detectados
   - Problemas de flujo
   - Problemas de queries
   - Problemas de orden de carga

3. **[MULTITIENDA_03_ARQUITECTURA.md](./MULTITIENDA_03_ARQUITECTURA.md)**
   - Arquitectura objetivo
   - Diagrama de flujo completo
   - Capas de seguridad
   - Modelo de tenancy

4. **[MULTITIENDA_04_FLUJO_COMPLETO.md](./MULTITIENDA_04_FLUJO_COMPLETO.md)**
   - Flujo end-to-end: Login → Selección → Operación
   - Casos especiales
   - Fuentes de verdad y persistencia

5. **[MULTITIENDA_05_RLS.md](./MULTITIENDA_05_RLS.md)**
   - Row Level Security (RLS)
   - Funciones helper
   - Políticas por tabla
   - Políticas para catálogos globales

6. **[MULTITIENDA_06_API_SERVICIOS.md](./MULTITIENDA_06_API_SERVICIOS.md)**
   - Patrón obligatorio para servicios
   - Patrón para Edge Functions
   - Helpers recomendados
   - Uso en componentes

7. **[MULTITIENDA_07_UI_UX.md](./MULTITIENDA_07_UI_UX.md)**
   - Componente selector de tienda
   - Estados de UI
   - Comportamiento al cambiar tienda

8. **[MULTITIENDA_08_ERRORES.md](./MULTITIENDA_08_ERRORES.md)**
   - Errores comunes y soluciones
   - Diagnóstico de problemas
   - Estándar de logs

9. **[MULTITIENDA_09_MATRIZ_MODULOS.md](./MULTITIENDA_09_MATRIZ_MODULOS.md)**
   - Matriz por módulo
   - Tablas y filtros por módulo
   - Queries típicas

10. **[MULTITIENDA_10_MIGRACION.md](./MULTITIENDA_10_MIGRACION.md)**
    - Plan de migración paso a paso
    - Rollback plan
    - Validación y monitoreo

11. **[MULTITIENDA_11_PRUEBAS.md](./MULTITIENDA_11_PRUEBAS.md)**
    - Checklist completo de pruebas
    - Pruebas de login, RLS, servicios
    - Pruebas de Postman

12. **[MULTITIENDA_12_ACCIONES.md](./MULTITIENDA_12_ACCIONES.md)**
    - Acciones recomendadas por prioridad
    - Checklist de implementación
    - Resumen ejecutivo

---

## 🎯 OBJETIVO

Documentar la funcionalidad multi-tienda del sistema SCO para:
- Separar información por tienda (tenant)
- Hacer que login + selección de tienda funcione 100% end-to-end
- Implementar seguridad mediante RLS
- Establecer patrones de código obligatorios

---

## 🚀 INICIO RÁPIDO

### Para Desarrolladores
1. Leer: [Estado Actual](./MULTITIENDA_01_ESTADO_ACTUAL.md)
2. Leer: [Problemas Detectados](./MULTITIENDA_02_PROBLEMAS.md)
3. Implementar: [Patrón de Servicios](./MULTITIENDA_06_API_SERVICIOS.md)

### Para Arquitectos
1. Leer: [Arquitectura Objetivo](./MULTITIENDA_03_ARQUITECTURA.md)
2. Leer: [Modelo de Tenancy](./MULTITIENDA_03_ARQUITECTURA.md#modelo-de-tenancy)
3. Revisar: [Plan de Migración](./MULTITIENDA_10_MIGRACION.md)

### Para QA
1. Leer: [Checklist de Pruebas](./MULTITIENDA_11_PRUEBAS.md)
2. Ejecutar: Pruebas de Login, RLS, Servicios
3. Reportar: Issues encontrados

### Para DevOps
1. Leer: [Plan de Migración](./MULTITIENDA_10_MIGRACION.md)
2. Preparar: Backup y rollback plan
3. Monitorear: Logs y métricas

---

## ⚠️ ADVERTENCIAS CRÍTICAS

### 🔴 SEGURIDAD
- **NO hay RLS implementado actualmente**
- Usuarios pueden ver datos de otras tiendas si manipulan queries
- **ACCIÓN REQUERIDA:** Implementar RLS inmediatamente

### 🟡 PERSISTENCIA
- `currentStore` se pierde al recargar página (F5)
- **ACCIÓN REQUERIDA:** Validar carga desde BD en useAuth

### 🟡 VALIDACIÓN
- Edge Functions no validan tienda actual
- **ACCIÓN REQUERIDA:** Agregar validación en todas las EF

---

## 📊 MÉTRICAS CLAVE

| Métrica | Valor Actual | Valor Objetivo |
|---------|--------------|----------------|
| Tablas con RLS | 0 | 8 |
| Servicios validando tienda | ~60% | 100% |
| Edge Functions con validación | 0% | 100% |
| Cobertura de pruebas | 0% | 80% |

---

## 🔗 ENLACES ÚTILES

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [React Context API](https://react.dev/reference/react/useContext)

---

## 📝 HISTORIAL DE CAMBIOS

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | 2024 | Documento inicial |

---

## 👥 CONTACTO

Para preguntas o aclaraciones sobre esta documentación:
- Equipo Técnico SCO
- Email: [contacto]
- Slack: #sco-multitienda

---

**NOTA:** Esta documentación es un documento vivo. Se actualizará conforme se implementen cambios en el sistema.
