# DOCUMENTACIÓN COMPLETA — COSTBOT (Chatbot de la Aplicación)

---

## 1. ¿QUÉ ES COSTBOT?

CostBot es el asistente de inteligencia artificial integrado en la aplicación **Costflow**. Funciona como un chatbot flotante que aparece en todas las páginas del sistema. Utiliza tecnología **RAG (Retrieval-Augmented Generation)**, lo que significa que responde preguntas basándose en documentos PDF que el administrador sube al sistema, combinado con el modelo de lenguaje **GPT-4o-mini** de OpenAI.

---

## 2. ARQUITECTURA GENERAL

```
Usuario escribe pregunta
        ↓
[Frontend: CostBotWidget]
        ↓
[Supabase Edge Function: costbot-query]
        ↓
[OpenAI: genera embedding de la pregunta]
        ↓
[Supabase DB: búsqueda vectorial en costbot_chunks]
        ↓
[OpenAI GPT-4o-mini: genera respuesta con contexto]
        ↓
Respuesta mostrada al usuario
```

---

## 3. COMPONENTES DEL SISTEMA

### 3.1 Widget del Chat (Frontend)
**Archivo:** `src/components/costbot/CostBotWidget.tsx`

- Botón flotante en la esquina inferior derecha de todas las páginas.
- Ícono: robot (`ri-robot-2-line`), color azul degradado.
- Al hacer clic abre un panel de chat de 384px de ancho × 600px de alto.
- Muestra un contador rojo de mensajes no leídos cuando el panel está cerrado.
- El historial de conversación se guarda en **localStorage** por usuario y por contexto de página.
- Tiene botón para limpiar el historial (con confirmación).
- Detecta automáticamente en qué página está el usuario y envía ese contexto al backend.
- Muestra animación de "pensando..." (tres puntos rebotando) mientras espera respuesta.
- El input acepta Enter para enviar (sin Shift).
- Solo se muestra si el usuario está autenticado.

### 3.2 Panel de Administración (Frontend)
**Archivo:** `src/components/costbot/CostBotAdmin.tsx`

- Accesible solo para usuarios con rol **Admin**.
- Permite subir documentos PDF para alimentar el conocimiento del chatbot.
- Muestra estadísticas: total de fragmentos, documentos, roles y contextos.
- Permite eliminar documentos (con confirmación).
- Formulario de ingesta con los siguientes campos:
  - Archivo PDF (drag & drop visual)
  - ID del documento (auto-generado desde el nombre del archivo)
  - Alcance por rol (público, operador, supervisor, admin)
  - Contexto de página (general, dashboard, optimizador, inventario, etc.)
  - Descripción opcional

---

## 4. SERVICIOS (LÓGICA DE NEGOCIO)

### 4.1 Servicio de Consulta
**Archivo:** `src/services/costbotService.ts`

**Funciones principales:**

| Función | Descripción |
|---|---|
| `sendQuestionToCostBot(question)` | Envía la pregunta a la Edge Function `costbot-query` usando el SDK de Supabase. Incluye el ID del usuario, su rol y el contexto de página actual. |
| `saveChatHistory(userId, pageContext, messages)` | Guarda el historial en localStorage con clave `costbot_history::{userId}::{pageContext}`. |
| `loadChatHistory(userId, pageContext)` | Carga el historial desde localStorage. Valida que corresponda al mismo usuario y contexto. |
| `clearChatHistory(userId, pageContext)` | Elimina el historial de un contexto específico del localStorage. |
| `getAllHistoryContexts(userId)` | Lista todos los contextos que tienen historial guardado para un usuario. |

**Endpoint usado:**
```
{SUPABASE_URL}/functions/v1/costbot-query
```
Invocado mediante `supabase.functions.invoke('costbot-query', { body: payload })`.

### 4.2 Servicio de Ingesta de PDFs
**Archivo:** `src/services/costbotIngestService.ts`

**Funciones principales:**

| Función | Descripción |
|---|---|
| `ingestPDFFromFile(file, sourceId, roleScope, pageScope, metadata)` | Proceso completo: extrae texto del PDF en el navegador, luego lo envía a la Edge Function. |
| `extractTextFromPDF(file)` | Extrae texto plano de un PDF usando la librería `pdfjs-dist` directamente en el navegador (no en el servidor). Usa el worker de CDN: `cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`. |
| `getCostBotChunksStats()` | Obtiene estadísticas de la tabla `costbot_chunks` (total chunks, documentos únicos, distribución por rol y contexto). |
| `listCostBotDocuments()` | Lista todos los documentos agrupados por `source_id`. |
| `deleteCostBotDocument(sourceId)` | Elimina todos los chunks de un documento por su `source_id`. |

**Endpoint de ingesta:**
```
{SUPABASE_URL}/functions/v1/costbot-ingest-pdf
```
Llamado con `fetch()` directo (no SDK), enviando el token JWT en el header `Authorization`.

---

## 5. DETECCIÓN DE CONTEXTO DE PÁGINA

**Archivo:** `src/utils/costbotContext.ts`

CostBot detecta automáticamente en qué módulo está el usuario para enviar contexto relevante al backend. El orden de prioridad es:

1. Atributo `data-costbot-context` en el `<body>` del HTML.
2. Atributo `data-costbot-context` en el elemento `#root`.
3. Mapeo automático desde `window.location.pathname`.

**Tabla de mapeo de rutas a contextos:**

| Ruta | Contexto enviado |
|---|---|
| `/` | `home` |
| `/dashboard` | `dashboard` |
| `/productos` | `productos` |
| `/bom` | `bom` |
| `/optimizador` | `optimizador_cortes` |
| `/inventario` | `inventario` |
| `/clientes` | `clientes` |
| `/cotizaciones` | `cotizaciones` |
| `/pedidos` | `pedidos` |
| `/facturacion` | `facturacion` |
| `/tareas` | `tareas` |
| `/seguimiento` | `seguimiento` |
| `/mantenimiento` | `mantenimiento` |
| `/seguridad` | `seguridad` |
| `/perfil` | `perfil` |
| `/tabla-datos-tareas` | `tabla_datos_tareas` |
| (cualquier otra) | `general` |

---

## 6. EDGE FUNCTIONS (BACKEND EN SUPABASE)

### 6.1 costbot-query — Responder preguntas
**Archivo:** `supabase/functions/costbot-query/index.ts`

**Flujo completo:**

1. **Validación de autenticación:** Verifica el JWT del header `Authorization`. Si no hay token o es inválido, retorna 401.
2. **Validación del usuario:** Compara el `userId` del body con el del JWT para evitar suplantación.
3. **Validación de la pregunta:** Máximo 2000 caracteres, no puede estar vacía.
4. **Normalización del contexto:** Convierte el `pageContext` recibido a uno de los valores permitidos. Si no coincide, usa `general`.
5. **Generación de embedding:** Llama a `OpenAI text-embedding-3-small` para convertir la pregunta en un vector numérico.
6. **Búsqueda vectorial (RAG):** Llama a la función SQL `match_costbot_chunks` en Supabase con:
   - El embedding de la pregunta
   - Los `role_scopes` permitidos según el rol del usuario
   - El `page_scope` del contexto actual
   - Si no encuentra resultados en el contexto específico, reintenta con `general`
7. **Generación de respuesta:** Llama a `OpenAI GPT-4o-mini` con:
   - Un system prompt que incluye los documentos encontrados como contexto
   - La pregunta del usuario
   - Temperatura: 0.7, máximo 1500 tokens
8. **Respuesta al frontend:** Devuelve `{ answer, metadata: { pageContext, role } }`.

**Permisos por rol (qué documentos puede ver cada rol):**

| Rol del usuario | Documentos accesibles |
|---|---|
| Admin / Administrador / Super Admin / rol `1` | public, admin, supervisor, operador |
| Supervisor / rol `2` | public, supervisor, operador |
| Operador / rol `3` | public, operador |
| Guest (sin rol) | public |

**Respuestas de fallback (sin OpenAI o sin documentos):**
Si no hay API key de OpenAI o no se encuentran documentos, el bot responde con mensajes predefinidos según el contexto de página (dashboard, optimizador, inventario, etc.).

### 6.2 costbot-ingest-pdf — Ingestar documentos
**Archivo:** `supabase/functions/costbot-ingest-pdf/index.ts`

**Flujo completo:**

1. **Validación de autenticación:** Verifica el JWT.
2. **Verificación de rol Admin:** Solo usuarios con `rol = 'Admin'` en la tabla `usuarios` pueden ingestar. Retorna 403 si no es Admin.
3. **Recepción del texto:** Recibe el texto plano ya extraído por el frontend (no base64, no binario).
4. **Validación de legibilidad:** Analiza los primeros 500 caracteres. Si más del 20% son caracteres no imprimibles, rechaza el documento.
5. **División en chunks:** Divide el texto en fragmentos de máximo 1500 caracteres, respetando párrafos y oraciones.
6. **Generación de embeddings:** Para cada chunk, llama a `OpenAI text-embedding-3-small` para generar su vector.
7. **Limpieza previa:** Elimina todos los chunks anteriores del mismo `source_id`.
8. **Inserción en base de datos:** Inserta los nuevos chunks en la tabla `costbot_chunks` con su embedding, rol, contexto y metadata.

---

## 7. BASE DE DATOS

### Tabla: `costbot_chunks`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Identificador único del chunk |
| `source_id` | TEXT | ID lógico del documento (ej: `manual_optimizador_v1`) |
| `source_type` | TEXT | Siempre `'pdf'` actualmente |
| `page_number` | INTEGER | Número de página del PDF (actualmente siempre 1) |
| `chunk_index` | INTEGER | Índice del fragmento dentro del documento |
| `content` | TEXT | Texto del fragmento |
| `role_scope` | TEXT | Rol mínimo para acceder: `public`, `operador`, `supervisor`, `admin` |
| `page_scope` | TEXT | Contexto de página: `general`, `dashboard`, `optimizador_cortes`, etc. |
| `metadata` | JSONB | Datos adicionales: nombre de archivo, tamaño, quién lo subió, fecha |
| `embedding` | VECTOR | Vector numérico generado por OpenAI (1536 dimensiones) |
| `created_at` | TIMESTAMP | Fecha de creación |

### Función SQL: `match_costbot_chunks`
Función de búsqueda vectorial que recibe:
- `query_embedding`: vector de la pregunta
- `match_threshold`: umbral mínimo de similitud (actualmente 0.0)
- `match_count`: número máximo de resultados (10)
- `filter_role_scopes`: array de roles permitidos
- `filter_page_scope`: contexto de página a filtrar

---

## 8. HISTORIAL DE CONVERSACIÓN

- **Almacenamiento:** localStorage del navegador.
- **Clave:** `costbot_history::{userId}::{pageContext}`
- **Estructura guardada:**
  ```json
  {
    "userId": "uuid-del-usuario",
    "pageContext": "dashboard",
    "messages": [
      {
        "id": "user-1234567890",
        "role": "user",
        "content": "¿Cómo funciona el optimizador?",
        "timestamp": 1234567890000,
        "metadata": { "pageContext": "optimizador_cortes" }
      },
      {
        "id": "bot-1234567891",
        "role": "bot",
        "content": "El optimizador te permite...",
        "timestamp": 1234567891000,
        "metadata": { "pageContext": "optimizador_cortes", "userRole": "Admin" }
      }
    ],
    "lastUpdated": 1234567891000
  }
  ```
- El historial es **por contexto de página**: cada módulo tiene su propio historial independiente.
- El historial **no se comparte entre usuarios**.
- Se puede limpiar manualmente desde el botón de la papelera en el header del chat.

---

## 9. VARIABLES DE ENTORNO REQUERIDAS

### En el archivo `.env` (frontend):
```
VITE_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### En los secrets de Supabase Edge Functions:
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OPENAI_API_KEY=sk-...
```

> ⚠️ Sin `OPENAI_API_KEY`, el sistema funciona en modo degradado: no genera embeddings ni respuestas inteligentes, solo muestra mensajes de fallback predefinidos.

---

## 10. MODELO DE IA UTILIZADO

| Uso | Modelo | Proveedor |
|---|---|---|
| Generación de embeddings (preguntas) | `text-embedding-3-small` | OpenAI |
| Generación de embeddings (chunks al ingestar) | `text-embedding-3-small` | OpenAI |
| Generación de respuestas | `gpt-4o-mini` | OpenAI |

**Parámetros de GPT-4o-mini:**
- Temperatura: `0.7`
- Máximo de tokens en respuesta: `1500`

---

## 11. COMPORTAMIENTO DEL PROMPT DEL SISTEMA

Cuando hay documentos relevantes encontrados, el system prompt instruye al bot a:

1. Responder **solo** con información de los documentos cargados.
2. Usar un tono amigable, profesional y cercano.
3. Saludar y despedirse de forma natural.
4. Si la pregunta no está en los documentos, redirigir amablemente.
5. Mostrar empatía si detecta frustración del usuario.
6. Usar máximo 1-2 emojis por respuesta.
7. **Nunca** mencionar nombres de archivos PDF, fuentes, chunks ni detalles técnicos del sistema RAG.
8. No inventar información que no esté en los documentos.

---

## 12. SEGURIDAD

- Todas las Edge Functions validan el JWT antes de procesar cualquier solicitud.
- La ingesta de PDFs está restringida exclusivamente a usuarios con `rol = 'Admin'` en la tabla `usuarios`.
- Se verifica que el `userId` del body coincida con el del JWT para evitar suplantación de identidad.
- Las preguntas tienen un límite de 2000 caracteres para evitar abusos.
- Los documentos se filtran por rol: un usuario operador nunca puede ver documentos marcados como `admin`.
- La API key de OpenAI nunca se expone al frontend; solo existe en los secrets de las Edge Functions.

---

## 13. FLUJO COMPLETO DE INGESTA DE UN PDF

```
Admin selecciona archivo PDF
        ↓
[Navegador: pdfjs-dist extrae texto plano]
        ↓
[Frontend valida que sea texto legible]
        ↓
[Frontend envía texto + metadata a costbot-ingest-pdf]
        ↓
[Edge Function valida JWT y rol Admin]
        ↓
[Edge Function valida legibilidad del texto]
        ↓
[Edge Function divide texto en chunks de ~1500 chars]
        ↓
[Para cada chunk: OpenAI genera embedding vectorial]
        ↓
[Se eliminan chunks anteriores del mismo source_id]
        ↓
[Se insertan nuevos chunks con embeddings en costbot_chunks]
        ↓
Admin ve confirmación: "X fragmentos creados"
```

---

## 14. FLUJO COMPLETO DE UNA PREGUNTA

```
Usuario escribe pregunta y presiona Enter
        ↓
[Widget agrega mensaje del usuario a la UI]
        ↓
[costbotService.sendQuestionToCostBot(pregunta)]
        ↓
[Se obtiene sesión activa de Supabase]
        ↓
[Se detecta contexto de página actual]
        ↓
[supabase.functions.invoke('costbot-query', payload)]
        ↓
[Edge Function valida JWT]
        ↓
[OpenAI genera embedding de la pregunta]
        ↓
[Búsqueda vectorial en costbot_chunks filtrada por rol y contexto]
        ↓
[Si no hay resultados en contexto específico → reintenta con 'general']
        ↓
[OpenAI GPT-4o-mini genera respuesta con los documentos como contexto]
        ↓
[Widget muestra respuesta del bot]
        ↓
[Historial guardado en localStorage]
```

---

## 15. LIMITACIONES CONOCIDAS

- Solo soporta PDFs con texto seleccionable (no PDFs escaneados como imágenes).
- No soporta PDFs protegidos o encriptados.
- El `page_number` siempre se guarda como `1` (no se rastrea la página exacta del PDF).
- El historial se pierde si el usuario limpia el localStorage del navegador.
- Sin conexión a OpenAI, el bot solo puede dar respuestas genéricas predefinidas.
- La búsqueda vectorial usa umbral `0.0`, lo que significa que siempre retorna los 10 chunks más similares aunque la similitud sea baja.

---

*Documento generado automáticamente — Sistema Costflow*
