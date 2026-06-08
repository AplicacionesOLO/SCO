import { useState, useEffect, useRef } from 'react';
import type { Tarea } from '../../../types/tarea';
import type { TareaComentario } from '../../../types/monitor';

interface ComentarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  tarea: Tarea | null;
  comentarios: TareaComentario[];
  loading: boolean;
  onEnviar: (comentario: string) => Promise<void>;
  currentUserId?: string;
  error?: string | null;
}

export default function ComentarioModal({
  isOpen,
  onClose,
  tarea,
  comentarios,
  loading,
  onEnviar,
  currentUserId,
  error
}: ComentarioModalProps) {
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (listaRef.current) {
      listaRef.current.scrollTop = listaRef.current.scrollHeight;
    }
  }, [comentarios]);

  const handleEnviar = async () => {
    const texto = nuevoComentario.trim();
    if (!texto || texto.length > 500) return;
    
    setEnviando(true);
    try {
      await onEnviar(texto);
      setNuevoComentario('');
    } catch {
      // Error manejado por el padre
    } finally {
      setEnviando(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEnviar();
    }
  };

  if (!isOpen || !tarea) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-lg w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-background-200/70">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-foreground-950">
              Comentarios
            </h3>
            <p className="text-xs text-foreground-500 truncate mt-0.5">
              {tarea.consecutivo} — {tarea.descripcion_breve || 'Sin descripción'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-background-100 rounded-lg transition-colors cursor-pointer flex-shrink-0 ml-2"
          >
            <i className="ri-close-line text-lg text-foreground-500"></i>
          </button>
        </div>

        {/* Lista de comentarios */}
        <div 
          ref={listaRef}
          className="flex-1 overflow-y-auto p-4 space-y-4"
        >
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <i className="ri-loader-4-line animate-spin text-2xl text-foreground-400"></i>
            </div>
          ) : comentarios.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto rounded-full bg-background-100 flex items-center justify-center mb-3">
                <i className="ri-chat-3-line text-xl text-foreground-400"></i>
              </div>
              <p className="text-sm text-foreground-500">No hay comentarios aún</p>
              <p className="text-xs text-foreground-400 mt-1">Sé el primero en comentar</p>
            </div>
          ) : (
            comentarios.map(com => {
              const esPropio = currentUserId && com.usuario_id === currentUserId;
              return (
                <div 
                  key={com.id} 
                  className={`flex gap-3 ${esPropio ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    esPropio ? 'bg-primary-100' : 'bg-secondary-100'
                  }`}>
                    <span className={`text-xs font-bold ${
                      esPropio ? 'text-primary-700' : 'text-secondary-700'
                    }`}>
                      {(com.usuario?.nombre_completo || com.usuario?.email || 'U')[0].toUpperCase()}
                    </span>
                  </div>
                  <div className={`flex-1 min-w-0 ${esPropio ? 'text-right' : ''}`}>
                    <div className={`flex items-center gap-2 ${esPropio ? 'flex-row-reverse' : ''}`}>
                      <span className="text-xs font-medium text-foreground-900">
                        {com.usuario?.nombre_completo || com.usuario?.email || 'Usuario'}
                        {esPropio && ' (tú)'}
                      </span>
                      <span className="text-xs text-foreground-400">
                        {new Date(com.created_at).toLocaleDateString('es-CR', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div className={`mt-1 px-3 py-2 rounded-lg text-sm ${
                      esPropio 
                        ? 'bg-primary-100 text-foreground-900' 
                        : 'bg-background-100 text-foreground-800'
                    }`}>
                      {com.comentario}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input de nuevo comentario */}
        <div className="p-4 border-t border-background-200/70">
          {error && (
            <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-start gap-2">
              <i className="ri-error-warning-line flex-shrink-0 mt-0.5"></i>
              <span>{error}</span>
            </div>
          )}
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={nuevoComentario}
              onChange={(e) => setNuevoComentario(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un comentario..."
              maxLength={500}
              rows={2}
              className="flex-1 px-3 py-2 text-sm border border-background-200/70 rounded-lg resize-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-background-50"
            />
            <button
              onClick={handleEnviar}
              disabled={!nuevoComentario.trim() || enviando || nuevoComentario.length > 500}
              className="px-4 py-2 bg-primary-500 text-background-50 rounded-lg hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap text-sm font-medium"
            >
              {enviando ? (
                <i className="ri-loader-4-line animate-spin"></i>
              ) : (
                <i className="ri-send-plane-fill"></i>
              )}
              Enviar
            </button>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className={`text-xs ${nuevoComentario.length > 500 ? 'text-red-500' : 'text-foreground-400'}`}>
              {nuevoComentario.length}/500
            </span>
            <span className="text-xs text-foreground-400">
              Enter para enviar
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}