import { supabase } from '../lib/supabase';

export interface IngestPDFRequest {
  textContent: string;   // Texto plano extraído del PDF
  sourceId: string;      // ID lógico del documento
  sourceType: 'pdf';
  roleScope: string;     // 'public', 'Admin', etc
  pageScope: string;     // 'general', 'optimizador_cortes', etc
  metadata?: Record<string, any>;
}

export interface IngestPDFResponse {
  success: boolean;
  sourceId: string;
  deletedChunks: number;
  createdChunks: number;
  message?: string;
}

const INGEST_ENDPOINT = `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/costbot-ingest-pdf`;

/**
 * Extrae texto de un PDF usando pdf.js en el navegador
 */
async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDocument = await loadingTask.promise;

    let fullText = '';

    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item: any) => (item && typeof item.str === 'string' ? item.str : ''))
        .filter((str: string) => str.length > 0)
        .join(' ')
        .trim();
      
      if (pageText.length > 0) {
        fullText += (fullText ? '\n\n' : '') + pageText;
      }
    }

    if (fullText.length === 0) {
      throw new Error('No se pudo extraer texto del PDF. Verifica que el PDF contenga texto seleccionable (no sea una imagen escaneada).');
    }

    return fullText;
  } catch (error: any) {
    throw new Error(
      `No se pudo extraer texto del PDF. ` +
      `Verifica que: (1) El PDF contenga texto seleccionable (no sea una imagen escaneada), ` +
      `(2) El PDF no esté protegido o encriptado, ` +
      `(3) El PDF tenga un formato estándar. ` +
      `Error técnico: ${error.message}`
    );
  }
}

/**
 * Ingesta un PDF en CostBot a partir de un File del input.
 */
export async function ingestPDFFromFile(
  file: File,
  sourceId: string,
  roleScope: string,
  pageScope: string,
  metadata?: Record<string, any>
): Promise<IngestPDFResponse> {
  if (!file) throw new Error('No se seleccionó ningún archivo PDF.');
  if (!sourceId) throw new Error('Debes indicar un ID de documento (sourceId).');

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw new Error('Error al obtener la sesión de usuario.');
  if (!session) throw new Error('No hay sesión activa. Por favor, inicia sesión.');
  if (!session.access_token) throw new Error('No se pudo obtener el token de acceso.');

  const textContent = await extractTextFromPDF(file);

  const payload: IngestPDFRequest = {
    textContent, sourceId, sourceType: 'pdf',
    roleScope: roleScope || 'public',
    pageScope: pageScope || 'general',
    metadata: { ...metadata, filename: file.name, fileSize: file.size },
  };

  const response = await fetch(INGEST_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Error ${response.status}: ${response.statusText}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error || errorMessage;
    } catch { errorMessage = errorText || errorMessage; }
    throw new Error(errorMessage);
  }

  return await response.json();
}

/**
 * Obtiene estadísticas de documentos ingresados
 */
export async function getIngestedDocumentsStats() {
  const { data, error } = await supabase
    .from('costbot_chunks')
    .select('source_id, role_scope, page_scope, metadata')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const documentsMap = new Map<string, { sourceId: string; roleScope: string; pageScope: string; chunksCount: number; metadata?: any }>();
  data.forEach(chunk => {
    const existing = documentsMap.get(chunk.source_id);
    if (existing) { existing.chunksCount++; }
    else { documentsMap.set(chunk.source_id, { sourceId: chunk.source_id, roleScope: chunk.role_scope, pageScope: chunk.page_scope, chunksCount: 1, metadata: chunk.metadata }); }
  });

  return Array.from(documentsMap.values());
}

/**
 * Elimina un documento y todos sus chunks
 */
export async function deleteIngestedDocument(sourceId: string) {
  const { error } = await supabase.from('costbot_chunks').delete().eq('source_id', sourceId);
  if (error) throw error;
}

/**
 * Obtiene estadísticas de los chunks almacenados en CostBot
 */
export async function getCostBotChunksStats(): Promise<{ totalChunks: number; totalDocuments: number; byRole: Record<string, number>; byContext: Record<string, number>; }> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) throw new Error('No se pudo obtener la sesión de usuario.');

  try {
    const { data: chunks, error } = await supabase.from('costbot_chunks').select('source_id, role_scope, page_scope');
    if (error) throw new Error('Error al obtener estadísticas de chunks');

    const uniqueDocuments = new Set(chunks?.map(c => c.source_id) || []);
    const byRole: Record<string, number> = {};
    const byContext: Record<string, number> = {};

    chunks?.forEach(chunk => {
      byRole[chunk.role_scope] = (byRole[chunk.role_scope] || 0) + 1;
      byContext[chunk.page_scope] = (byContext[chunk.page_scope] || 0) + 1;
    });

    return { totalChunks: chunks?.length || 0, totalDocuments: uniqueDocuments.size, byRole, byContext };
  } catch (error) {
    throw error;
  }
}

/**
 * Lista todos los documentos ingresados en CostBot
 */
export async function listCostBotDocuments(): Promise<Array<{ sourceId: string; roleScope: string; pageScope: string; chunksCount: number; createdAt: string; }>> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) throw new Error('No se pudo obtener la sesión de usuario.');

  try {
    const { data: chunks, error } = await supabase
      .from('costbot_chunks')
      .select('source_id, role_scope, page_scope, created_at')
      .order('created_at', { ascending: false });
    if (error) throw new Error('Error al listar documentos');

    const documentsMap = new Map<string, { sourceId: string; roleScope: string; pageScope: string; chunksCount: number; createdAt: string; }>();
    chunks?.forEach(chunk => {
      const existing = documentsMap.get(chunk.source_id);
      if (existing) { existing.chunksCount++; }
      else { documentsMap.set(chunk.source_id, { sourceId: chunk.source_id, roleScope: chunk.role_scope, pageScope: chunk.page_scope, chunksCount: 1, createdAt: chunk.created_at }); }
    });

    return Array.from(documentsMap.values());
  } catch (error) {
    throw error;
  }
}

/**
 * Elimina un documento y todos sus chunks de CostBot
 */
export async function deleteCostBotDocument(sourceId: string): Promise<{ success: boolean; deletedChunks: number }> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) throw new Error('No se pudo obtener la sesión de usuario.');

  try {
    const { data, error } = await supabase.from('costbot_chunks').delete().eq('source_id', sourceId).select();
    if (error) throw new Error('Error al eliminar documento');
    return { success: true, deletedChunks: data?.length || 0 };
  } catch (error) {
    throw error;
  }
}
