# 🤖 CostBot con RAG (Retrieval-Augmented Generation)

## 📋 Descripción General

CostBot es un asistente de IA integrado en la aplicación que utiliza **RAG (Retrieval-Augmented Generation)** para proporcionar respuestas contextuales basadas en documentos PDF ingestados. El sistema combina búsqueda vectorial con embeddings de OpenAI para ofrecer respuestas precisas y relevantes según el rol del usuario y el contexto de la página.

---

## 🎯 Características Principales

### ✅ **Chat Flotante Contextual**
- Burbuja flotante visible en todas las páginas
- Panel de chat con historial persistente por contexto
- Detección automática del contexto de página
- Contador de mensajes no leídos

### ✅ **RAG con Búsqueda Vectorial**
- Ingesta de documentos PDF
- Generación automática de embeddings (OpenAI text-embedding-3-small)
- Búsqueda por similitud de coseno
- Filtrado por rol y contexto de página

### ✅ **Control de Acceso por Roles**
- **Public:** Accesible para todos los usuarios
- **Operador:** Solo operadores y superiores
- **Supervisor:** Solo supervisores y administradores
- **Admin:** Solo administradores

### ✅ **Contextos de Página**
- Dashboard
- Optimizador de Cortes
- BOM / Productos
- Inventario
- Cotizaciones
- Pedidos
- Facturación
- Tareas
- General (todas las páginas)

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
├─────────────────────────────────────────────────────────────┤
│  CostBotWidget.tsx          │  Burbuja flotante + Chat      │
│  CostBotAdmin.tsx           │  Panel de administración      │
│  costbotService.ts          │  Servicio de consultas        │
│  costbotIngestService.ts    │  Servicio de ingesta          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    EDGE FUNCTIONS                            │
├─────────────────────────────────────────────────────────────┤
│  costbot-query              │  Consultas con RAG            │
│  costbot-ingest-pdf         │  Ingesta de PDFs              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE DATABASE                         │
├─────────────────────────────────────────────────────────────┤
│  costbot_chunks             │  Tabla con embeddings         │
│  match_costbot_chunks()     │  Función de búsqueda vectorial│
│  get_costbot_chunks_stats() │  Estadísticas                 │
│  delete_costbot_document()  │  Eliminar documentos          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      OPENAI API                              │
├─────────────────────────────────────────────────────────────┤
│  text-embedding-3-small     │  Generación de embeddings     │
│  gpt-4o-mini                │  Generación de respuestas     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Configuración Inicial

### **Paso 1: Configurar Base de Datos**

Ejecuta el script SQL para crear la tabla y los índices:

```bash
# En Supabase SQL Editor, ejecuta:
sql_costbot_rag_setup.sql
```

Esto creará:
- ✅ Tabla `costbot_chunks` con soporte para vectores
- ✅ Índices vectoriales (ivfflat) para búsqueda rápida
- ✅ Políticas RLS para seguridad
- ✅ Índices para filtrado por rol y contexto

### **Paso 2: Crear Función de Búsqueda Vectorial**

Ejecuta el script SQL para la función RPC:

```bash
# En Supabase SQL Editor, ejecuta:
sql_costbot_rag_search_function.sql
```

Esto creará:
- ✅ Función `match_costbot_chunks()` para búsqueda vectorial
- ✅ Función `get_costbot_chunks_stats()` para estadísticas
- ✅ Función `delete_costbot_document()` para eliminar documentos

### **Paso 3: Configurar API Key de OpenAI**

Configura tu API key de OpenAI en los secrets de Supabase:

```bash
supabase secrets set OPENAI_API_KEY=sk-tu-api-key-aqui
```

### **Paso 4: Desplegar Edge Functions**

Las Edge Functions ya están desplegadas:
- ✅ `costbot-query` - Consultas con RAG
- ✅ `costbot-ingest-pdf` - Ingesta de PDFs

---

## 📚 Uso del Sistema

### **1. Ingestar Documentos PDF**

#### **Desde el Panel de Administración:**

1. Ve a la sección de administración de CostBot
2. Selecciona un archivo PDF
3. Configura:
   - **ID del Documento:** Identificador único (ej: `manual_optimizador_v1`)
   - **Alcance por Rol:** `public`, `operador`, `supervisor`, `admin`
   - **Contexto de Página:** `general`, `dashboard`, `optimizador_cortes`, etc.
   - **Descripción:** Descripción opcional del contenido
4. Haz clic en "Ingestar Documento"

#### **Desde el Código:**

```typescript
import { ingestPDFFromFile } from './services/costbotIngestService';

// Ingestar desde un archivo File
const result = await ingestPDFFromFile(
  file,                           // File object
  'manual_optimizador_v1',        // sourceId
  'public',                       // roleScope
  'optimizador_cortes',           // pageScope
  {
    description: 'Manual del optimizador de cortes',
    version: '1.0',
    author: 'Equipo Técnico'
  }
);

console.log(`Chunks creados: ${result.chunksInserted}`);
```

#### **Desde una URL:**

```typescript
import { ingestPDF } from './services/costbotIngestService';

const result = await ingestPDF({
  pdfUrl: 'https://example.com/manual.pdf',
  sourceId: 'manual_inventario_v1',
  roleScope: 'public',
  pageScope: 'inventario',
  metadata: {
    filename: 'Manual_Inventario.pdf',
    version: '1.0'
  }
});
```

---

### **2. Usar CostBot en el Frontend**

El widget de CostBot ya está integrado en todas las páginas. Los usuarios pueden:

1. **Hacer clic en la burbuja flotante** en la esquina inferior derecha
2. **Escribir su pregunta** en el chat
3. **Recibir respuestas contextuales** basadas en:
   - Su rol de usuario
   - La página actual donde se encuentra
   - Los documentos ingestados relevantes

#### **Ejemplo de Conversación:**

**Usuario en `/optimizador`:**
```
Usuario: ¿Cómo agrego piezas manualmente?

CostBot: Según el Manual del Optimizador (página 3):

Para agregar piezas manualmente:
1. Haz clic en el botón "Agregar Pieza"
2. Completa los campos:
   - Largo (mm)
   - Ancho (mm)
   - Cantidad
   - Veta (S/X/N)
3. Haz clic en "Guardar"

📚 Fuentes consultadas (2):
- Manual_Optimizador.pdf
- Guia_Rapida.pdf
```

---

### **3. Gestionar Documentos**

#### **Listar Documentos:**

```typescript
import { listCostBotDocuments } from './services/costbotIngestService';

const documents = await listCostBotDocuments();

documents.forEach(doc => {
  console.log(`${doc.source_id}: ${doc.chunks_count} chunks`);
});
```

#### **Obtener Estadísticas:**

```typescript
import { getCostBotChunksStats } from './services/costbotIngestService';

const stats = await getCostBotChunksStats();

console.log(`Total chunks: ${stats.total_chunks}`);
console.log(`Documentos: ${stats.sources_count}`);
console.log(`Roles:`, stats.role_scopes);
console.log(`Contextos:`, stats.page_scopes);
```

#### **Eliminar Documento:**

```typescript
import { deleteCostBotDocument } from './services/costbotIngestService';

const deletedCount = await deleteCostBotDocument('manual_optimizador_v1');
console.log(`${deletedCount} chunks eliminados`);
```

---

## 🔐 Sistema de Permisos por Rol

### **Mapeo de Roles a Scopes:**

| Rol del Usuario | Puede Ver Documentos Con Scope |
|-----------------|--------------------------------|
| **Admin / Administrador** | `public`, `admin`, `supervisor`, `operador` |
| **Supervisor** | `public`, `supervisor`, `operador` |
| **Operador** | `public`, `operador` |
| **Guest / Otros** | `public` |

### **Ejemplo:**

Si un documento tiene `role_scope = 'admin'`:
- ✅ Administradores pueden verlo
- ❌ Supervisores NO pueden verlo
- ❌ Operadores NO pueden verlo

---

## 🔍 Flujo de Búsqueda RAG

### **Paso a Paso:**

```
1. Usuario envía pregunta
   ↓
2. Sistema genera embedding de la pregunta (OpenAI)
   ↓
3. Búsqueda vectorial en costbot_chunks:
   a. Filtra por role_scope según rol del usuario
   b. Busca primero en page_scope específico (ej: "optimizador_cortes")
   c. Si encuentra < 3 chunks, amplía a page_scope = "general"
   d. Ordena por similitud de coseno
   e. Retorna top 10 chunks más relevantes
   ↓
4. Construye prompt con contexto:
   - Instrucciones del sistema
   - Rol del usuario
   - Contexto de página
   - Fragmentos de documentos encontrados
   ↓
5. Llama a OpenAI GPT-4o-mini
   ↓
6. Retorna respuesta con:
   - Texto de la respuesta
   - Número de chunks usados
   - Fuentes consultadas
```

---

## 📊 Estructura de la Tabla `costbot_chunks`

```sql
CREATE TABLE costbot_chunks (
  id UUID PRIMARY KEY,
  source_id TEXT NOT NULL,              -- ID del documento
  source_type TEXT DEFAULT 'pdf',       -- Tipo de fuente
  page_number INTEGER,                  -- Número de página
  chunk_index INTEGER NOT NULL,         -- Índice del chunk
  content TEXT NOT NULL,                -- Texto del chunk
  role_scope TEXT DEFAULT 'public',     -- Alcance por rol
  page_scope TEXT DEFAULT 'general',    -- Alcance por página
  metadata JSONB DEFAULT '{}',          -- Metadatos adicionales
  embedding vector(1536),               -- Vector embedding
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);
```

### **Índices:**

- ✅ **Índice vectorial (ivfflat):** Para búsqueda rápida por similitud
- ✅ **Índice en role_scope:** Para filtrado por rol
- ✅ **Índice en page_scope:** Para filtrado por contexto
- ✅ **Índice compuesto:** Para búsquedas filtradas eficientes

---

## 🛠️ Funciones RPC Disponibles

### **1. `match_costbot_chunks()`**

Busca chunks relevantes usando similitud vectorial.

```sql
SELECT * FROM match_costbot_chunks(
  query_embedding := '[0.1, 0.2, ...]'::vector,
  match_threshold := 0.5,
  match_count := 10,
  filter_role_scopes := ARRAY['public', 'admin'],
  filter_page_scope := 'optimizador_cortes'
);
```

**Parámetros:**
- `query_embedding`: Vector de la pregunta (1536 dimensiones)
- `match_threshold`: Umbral mínimo de similitud (0.0 - 1.0)
- `match_count`: Número máximo de resultados
- `filter_role_scopes`: Array de scopes permitidos
- `filter_page_scope`: Contexto de página (NULL = todos)

**Retorna:**
- `id`, `source_id`, `content`, `similarity`, etc.

---

### **2. `get_costbot_chunks_stats()`**

Obtiene estadísticas de los chunks almacenados.

```sql
SELECT * FROM get_costbot_chunks_stats();
```

**Retorna:**
```json
{
  "total_chunks": 150,
  "sources_count": 5,
  "role_scopes": {
    "public": 100,
    "admin": 30,
    "supervisor": 20
  },
  "page_scopes": {
    "general": 50,
    "optimizador_cortes": 40,
    "inventario": 30,
    "dashboard": 30
  }
}
```

---

### **3. `delete_costbot_document()`**

Elimina todos los chunks de un documento.

```sql
SELECT delete_costbot_document('manual_optimizador_v1');
```

**Retorna:** Número de chunks eliminados

---

## 🎨 Componentes Frontend

### **1. CostBotWidget**

Widget flotante visible en todas las páginas.

**Ubicación:** `src/components/costbot/CostBotWidget.tsx`

**Características:**
- Burbuja flotante con contador de no leídos
- Panel de chat con historial
- Detección automática de contexto
- Muestra fuentes consultadas en respuestas

---

### **2. CostBotAdmin**

Panel de administración para gestionar documentos.

**Ubicación:** `src/components/costbot/CostBotAdmin.tsx`

**Características:**
- Subir PDFs
- Configurar alcance por rol y contexto
- Ver estadísticas
- Listar y eliminar documentos

---

## 🔧 Servicios

### **1. costbotService.ts**

Servicio principal para consultas.

```typescript
import { sendQuestionToCostBot } from './services/costbotService';

const response = await sendQuestionToCostBot('¿Cómo optimizo cortes?');
console.log(response.answer);
console.log(response.metadata.chunksUsed);
console.log(response.metadata.sources);
```

---

### **2. costbotIngestService.ts**

Servicio para ingesta de PDFs.

```typescript
import { 
  ingestPDFFromFile,
  getCostBotChunksStats,
  listCostBotDocuments,
  deleteCostBotDocument
} from './services/costbotIngestService';
```

---

## 📝 Mejores Prácticas

### **✅ Ingesta de Documentos:**

1. **Usa IDs descriptivos:** `manual_optimizador_v1`, `guia_inventario_2024`
2. **Configura el rol apropiado:** Solo `public` para documentación general
3. **Asigna el contexto correcto:** Usa contextos específicos para mejor relevancia
4. **Agrega metadatos útiles:** Versión, autor, descripción

### **✅ Organización de Documentos:**

- **General:** Documentación que aplica a toda la app
- **Específico:** Manuales de módulos específicos
- **Por Rol:** Documentos sensibles solo para administradores

### **✅ Mantenimiento:**

- Actualiza documentos cuando cambien funcionalidades
- Elimina documentos obsoletos
- Revisa estadísticas periódicamente

---

## 🐛 Troubleshooting

### **Problema: No se generan embeddings**

**Solución:**
```bash
# Verifica que la API key esté configurada
supabase secrets list

# Si no está, configúrala
supabase secrets set OPENAI_API_KEY=sk-tu-api-key
```

---

### **Problema: Búsqueda no encuentra resultados**

**Causas posibles:**
1. No hay documentos ingestados para ese contexto
2. El rol del usuario no tiene acceso
3. El umbral de similitud es muy alto

**Solución:**
- Verifica que haya documentos con el `page_scope` correcto
- Revisa el `role_scope` de los documentos
- Ajusta el `match_threshold` en la función RPC

---

### **Problema: Error al ingestar PDF**

**Causas posibles:**
1. Archivo no es PDF válido
2. Usuario no es administrador
3. API key de OpenAI inválida

**Solución:**
- Verifica que el archivo sea PDF
- Confirma que el usuario tenga rol de administrador
- Revisa los logs de la Edge Function

---

## 📈 Métricas y Monitoreo

### **Consultar Estadísticas:**

```typescript
const stats = await getCostBotChunksStats();

console.log(`
📊 Estadísticas de CostBot:
- Total de fragmentos: ${stats.total_chunks}
- Documentos: ${stats.sources_count}
- Distribución por rol:
  ${Object.entries(stats.role_scopes).map(([role, count]) => 
    `  • ${role}: ${count}`
  ).join('\n')}
- Distribución por contexto:
  ${Object.entries(stats.page_scopes).map(([scope, count]) => 
    `  • ${scope}: ${count}`
  ).join('\n')}
`);
```

---

## 🔮 Próximas Mejoras

- [ ] Soporte para más tipos de documentos (Word, Excel, etc.)
- [ ] Extracción real de texto de PDFs (actualmente es placeholder)
- [ ] Cache de embeddings para preguntas frecuentes
- [ ] Feedback de usuarios sobre respuestas
- [ ] Analytics de uso de CostBot
- [ ] Sugerencias automáticas de preguntas
- [ ] Modo de conversación con contexto de mensajes previos

---

## 📞 Soporte

Para dudas o problemas con CostBot:

1. Revisa los logs en Supabase Edge Functions
2. Verifica la configuración de la API key de OpenAI
3. Consulta este README
4. Contacta al equipo de desarrollo

---

## 📄 Licencia

Este módulo es parte del sistema de gestión de costos y optimización.

---

**¡CostBot está listo para ayudar a tus usuarios! 🤖✨**
