import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Valida que el texto extraído sea legible (no basura binaria)
 */
function isTextReadable(text: string): boolean {
  if (!text || text.length < 10) return false;
  
  // Contar caracteres imprimibles vs no imprimibles
  let printableCount = 0;
  let binaryCount = 0;
  
  for (let i = 0; i < Math.min(text.length, 500); i++) {
    const code = text.charCodeAt(i);
    
    // Caracteres imprimibles: espacio (32) hasta ~ (126), más saltos de línea y tabs
    if ((code >= 32 && code <= 126) || code === 10 || code === 13 || code === 9) {
      printableCount++;
    } else if (code < 32 || code > 126) {
      binaryCount++;
    }
  }
  
  // Si más del 20% son caracteres no imprimibles, es basura binaria
  const binaryRatio = binaryCount / (printableCount + binaryCount);
  
  console.log(`🔍 [VALIDATION] Análisis de legibilidad:`, {
    printableCount,
    binaryCount,
    binaryRatio: (binaryRatio * 100).toFixed(2) + '%',
    isReadable: binaryRatio < 0.2
  });
  
  return binaryRatio < 0.2;
}

function chunkText(text: string, maxChunkSize: number = 1500): string[] {
  console.log(`✂️ [CHUNKING] Dividiendo texto de ${text.length} caracteres en chunks de máximo ${maxChunkSize} caracteres`);
  
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  console.log(`📋 [CHUNKING] Texto dividido en ${paragraphs.length} párrafos`);
  
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    const trimmedParagraph = paragraph.trim();
    
    if (trimmedParagraph.length > maxChunkSize) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      
      const sentences = trimmedParagraph.split(/[.!?]+/).filter(s => s.trim().length > 0);
      
      for (const sentence of sentences) {
        const trimmedSentence = sentence.trim();
        if (currentChunk.length + trimmedSentence.length > maxChunkSize && currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
          currentChunk = trimmedSentence;
        } else {
          currentChunk += (currentChunk.length > 0 ? '. ' : '') + trimmedSentence;
        }
      }
    } else {
      if (currentChunk.length + trimmedParagraph.length > maxChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = trimmedParagraph;
      } else {
        currentChunk += (currentChunk.length > 0 ? '\n\n' : '') + trimmedParagraph;
      }
    }
  }
  
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  console.log(`✅ [CHUNKING] Texto dividido en ${chunks.length} chunks`);
  
  // Mostrar preview del primer chunk para verificar que es texto legible
  if (chunks.length > 0) {
    const firstChunkPreview = chunks[0].substring(0, 200).replace(/\s+/g, ' ').trim();
    console.log(`📝 [CHUNKING] Preview del primer chunk (primeros 200 caracteres):`);
    console.log(`"${firstChunkPreview}..."`);
    console.log(`📊 [CHUNKING] Longitud del primer chunk: ${chunks[0].length} caracteres`);
  }
  
  chunks.forEach((chunk, idx) => {
    console.log(`  📄 [CHUNKING] Chunk ${idx + 1}: ${chunk.length} caracteres`);
  });
  
  return chunks;
}

async function generateEmbedding(text: string): Promise<number[]> {
  console.log(`🔢 [EMBEDDING] Generando embedding para texto de ${text.length} caracteres...`);
  
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openaiApiKey) {
    console.error('❌ [EMBEDDING] OPENAI_API_KEY no configurada');
    throw new Error('OPENAI_API_KEY no configurada en las variables de entorno');
  }
  
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }
    
    const data = await response.json();
    console.log(`✅ [EMBEDDING] Embedding generado: ${data.data[0].embedding.length} dimensiones`);
    return data.data[0].embedding;
  } catch (error) {
    console.error('❌ [EMBEDDING] Error al generar embedding:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🚀 ========================================');
    console.log('🚀 [INGEST] NUEVA SOLICITUD DE INGESTIÓN');
    console.log('🚀 ========================================');
    
    console.log('🔐 [AUTH] Iniciando validación de autenticación...');
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ [AUTH] Header de autorización no encontrado');
      return new Response(
        JSON.stringify({ 
          error: 'Usuario no autenticado: Header de autorización no encontrado',
          timestamp: new Date().toISOString()
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('✅ [AUTH] Header de autorización encontrado');

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      console.error('❌ [AUTH] Token JWT no encontrado en el header');
      return new Response(
        JSON.stringify({ 
          error: 'Usuario no autenticado: Token JWT no encontrado',
          timestamp: new Date().toISOString()
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('✅ [AUTH] Token JWT extraído');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    console.log('✅ [AUTH] Cliente de Supabase creado');

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ [AUTH] Error al validar token:', authError);
      return new Response(
        JSON.stringify({ 
          error: 'Usuario no autenticado: Token inválido o expirado',
          timestamp: new Date().toISOString()
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('✅ [AUTH] Usuario autenticado:', { 
      userId: user.id, 
      email: user.email 
    });

    console.log('🔍 [AUTH] Consultando rol del usuario...');
    
    const { data: userData, error: userError } = await supabaseAdmin
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('❌ [AUTH] Error al consultar usuario:', userError);
      return new Response(
        JSON.stringify({ 
          error: 'Error al verificar permisos del usuario',
          details: userError.message,
          timestamp: new Date().toISOString()
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userData) {
      console.error('❌ [AUTH] Usuario no encontrado en la tabla usuarios');
      return new Response(
        JSON.stringify({ 
          error: 'Usuario no encontrado en el sistema',
          timestamp: new Date().toISOString()
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ [AUTH] Datos del usuario obtenidos:', { 
      userId: user.id, 
      rol: userData.rol 
    });

    const rol = (userData.rol as string | null) ?? '';
    const isAdmin = rol === 'Admin';

    if (!isAdmin) {
      console.error('❌ [AUTH] Usuario sin permisos suficientes para ingestar PDFs:', rol);
      return new Response(
        JSON.stringify({
          error: 'No tienes permisos para ingestar documentos. Solo usuarios con rol "Admin" pueden hacerlo.',
          userRole: rol,
          timestamp: new Date().toISOString()
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ [AUTH] Usuario autorizado como administrador (Admin)');

    const body = await req.json();
    console.log('📥 [REQUEST] Body recibido:', {
      sourceId: body.sourceId,
      roleScope: body.roleScope,
      pageScope: body.pageScope,
      hasTextContent: !!body.textContent,
      textContentLength: body.textContent?.length || 0
    });

    const { 
      textContent, 
      sourceId, 
      roleScope = 'public', 
      pageScope = 'general',
      metadata = {}
    } = body;

    // Validar parámetros requeridos
    if (!sourceId) {
      return new Response(
        JSON.stringify({ 
          error: 'Falta parámetro requerido: sourceId',
          timestamp: new Date().toISOString()
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!textContent || typeof textContent !== 'string' || textContent.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'textContent vacío o inválido. Debe ser un string con el texto extraído del PDF.',
          timestamp: new Date().toISOString()
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🧾 [INGEST] Iniciando ingestión de documento:', { 
      sourceId, 
      textContentLength: textContent.length 
    });

    // Validar que el texto sea legible
    if (!isTextReadable(textContent)) {
      console.error('❌ [INGEST] El texto contiene caracteres binarios (no es legible)');
      return new Response(
        JSON.stringify({ 
          error: 'El texto proporcionado no es legible. Verifica que el PDF contenga texto seleccionable.',
          timestamp: new Date().toISOString()
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mostrar preview del texto recibido
    const preview = textContent.substring(0, 300).replace(/\s+/g, ' ').trim();
    console.log(`📝 [INGEST] Preview del texto recibido (primeros 300 caracteres):`);
    console.log(`"${preview}..."`);

    console.log(`📄 [INGEST] Texto recibido: longitud total = ${textContent.length} caracteres`);

    // Dividir en chunks
    const chunks = chunkText(textContent);
    console.log(`✂️ [CHUNKING] Texto dividido en ${chunks.length} chunks`);

    // Generar embeddings para cada chunk
    const allChunks: Array<{
      content: string;
      chunkIndex: number;
      embedding: number[];
    }> = [];

    for (let i = 0; i < chunks.length; i++) {
      console.log(`  🔢 [INGEST] Generando embedding para chunk ${i + 1}/${chunks.length}...`);
      const embedding = await generateEmbedding(chunks[i]);
      
      allChunks.push({
        content: chunks[i],
        chunkIndex: i,
        embedding
      });
      
      console.log(`  ✅ [INGEST] Chunk ${i + 1} procesado: ${chunks[i].length} caracteres`);
    }

    console.log(`✅ [INGEST] Total de chunks generados: ${allChunks.length}`);

    // PASO CRÍTICO: Eliminar chunks anteriores del mismo source_id
    console.log(`🗑️ [INGEST] Eliminando chunks anteriores de source_id="${sourceId}"...`);
    const { data: deletedChunks, error: deleteError } = await supabaseAdmin
      .from('costbot_chunks')
      .delete()
      .eq('source_id', sourceId)
      .select('id');

    if (deleteError) {
      console.error('❌ [INGEST] Error al eliminar chunks anteriores:', deleteError);
      return new Response(
        JSON.stringify({ 
          error: 'Error al eliminar chunks anteriores del documento',
          details: deleteError.message,
          timestamp: new Date().toISOString()
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const deletedCount = deletedChunks?.length || 0;
    console.log(`✅ [INGEST] Chunks eliminados: ${deletedCount}`);

    // Insertar nuevos chunks
    console.log('💾 [INGEST] Insertando nuevos chunks en la base de datos...');
    
    const chunksToInsert = allChunks.map(chunk => ({
      source_id: sourceId,
      source_type: 'pdf',
      page_number: 1,
      chunk_index: chunk.chunkIndex,
      content: chunk.content,
      role_scope: roleScope,
      page_scope: pageScope,
      metadata: {
        ...metadata,
        uploaded_by: user.id,
        uploaded_at: new Date().toISOString(),
        version: '1.0'
      },
      embedding: chunk.embedding
    }));

    const { data: insertedChunks, error: insertError } = await supabaseAdmin
      .from('costbot_chunks')
      .insert(chunksToInsert)
      .select('id');

    if (insertError) {
      console.error('❌ [INGEST] Error al insertar chunks:', insertError);
      return new Response(
        JSON.stringify({ 
          error: 'Error al guardar chunks en la base de datos',
          details: insertError.message,
          timestamp: new Date().toISOString()
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const insertedCount = insertedChunks?.length || 0;
    console.log(`✅ [INGEST] Chunks creados: ${insertedCount}`);

    console.log('🎉 ========================================');
    console.log('🎉 [INGEST] INGESTIÓN COMPLETADA EXITOSAMENTE');
    console.log('🎉 ========================================');

    return new Response(
      JSON.stringify({
        success: true,
        sourceId,
        deletedChunks: deletedCount,
        createdChunks: insertedCount,
        totalCharacters: textContent.length,
        message: `Documento ingestado exitosamente: ${deletedCount} chunks anteriores eliminados, ${insertedCount} chunks nuevos creados`,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ [ERROR] Error general:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Error interno del servidor',
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});