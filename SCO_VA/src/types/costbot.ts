// Tipos para CostBot

export interface CostBotMessage {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: number;
  metadata?: {
    pageContext?: string;
    userRole?: string | number;
    chunksUsed?: number;
    sources?: string[];
  };
}

export interface CostBotRequest {
  userId: string | number;
  role: string | number;
  pageContext: string;
  question: string;
}

export interface CostBotResponse {
  answer: string;
  usedContext?: string;
  metadata: {
    pageContext: string;
    role: string | number;
    chunksUsed?: number;
    sources?: string[];
  };
}

export interface CostBotHistory {
  userId: string | number;
  pageContext: string;
  messages: CostBotMessage[];
  lastUpdated: number;
}

// 🆕 Tipos para RAG e ingesta de PDFs

export interface CostBotChunk {
  id: string;
  source_id: string;
  source_type: string;
  page_number: number;
  chunk_index: number;
  content: string;
  role_scope: string;
  page_scope: string;
  metadata: Record<string, any>;
  embedding?: number[];
  similarity?: number;
  created_at?: string;
  created_by?: string;
}

export interface IngestPDFRequest {
  pdfUrl?: string;
  pdfBase64?: string;
  sourceId: string;
  roleScope?: 'public' | 'admin' | 'supervisor' | 'operador';
  pageScope?: string;
  metadata?: {
    filename?: string;
    version?: string;
    author?: string;
    description?: string;
    [key: string]: any;
  };
}

export interface IngestPDFResponse {
  success: boolean;
  message: string;
  chunksInserted: number;
  sourceId: string;
}

export interface CostBotChunksStats {
  total_chunks: number;
  sources_count: number;
  role_scopes: Record<string, number>;
  page_scopes: Record<string, number>;
}
