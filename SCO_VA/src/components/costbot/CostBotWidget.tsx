import { useState, useEffect, useRef } from 'react';
import { sendQuestionToCostBot, saveChatHistory, loadChatHistory, clearChatHistory } from '../../services/costbotService';
import { getPageContext, getPageContextLabel } from '../../utils/costbotContext';
import { useAuth } from '../../hooks/useAuth';
import ConfirmationDialog from '../base/ConfirmationDialog';
import type { CostBotMessage } from '../../types/costbot';

export default function CostBotWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<CostBotMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentContext, setCurrentContext] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // 🆕 Estado para el diálogo de confirmación
  const [showClearDialog, setShowClearDialog] = useState(false);

  // Cargar historial al montar o cambiar de contexto
  useEffect(() => {
    if (!user) return;

    const context = getPageContext();
    setCurrentContext(context);

    const history = loadChatHistory(user.id, context);
    setMessages(history);
  }, [user, window.location.pathname]);

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Guardar historial cuando cambian los mensajes
  useEffect(() => {
    if (user && messages.length > 0) {
      saveChatHistory(user.id, currentContext, messages);
    }
  }, [messages, user, currentContext]);

  // 🆕 Auto-focus en el input cuando se abre el panel o termina de pensar
  useEffect(() => {
    if (isOpen && !isThinking) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, isThinking]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isThinking || !user) return;

    const userMessage: CostBotMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: Date.now(),
      metadata: {
        pageContext: currentContext
      }
    };

    // Agregar mensaje del usuario
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsThinking(true);

    try {
      const response = await sendQuestionToCostBot(userMessage.content);

      const botMessage: CostBotMessage = {
        id: `bot-${Date.now()}`,
        role: 'bot',
        content: response.answer,
        timestamp: Date.now(),
        metadata: {
          pageContext: response.metadata.pageContext,
          userRole: String(response.metadata.role)
        }
      };

      setMessages(prev => [...prev, botMessage]);

      // Si el panel está cerrado, incrementar contador de no leídos
      if (!isOpen) {
        setUnreadCount(prev => prev + 1);
      }

    } catch (error) {
      const errorMessage: CostBotMessage = {
        id: `error-${Date.now()}`,
        role: 'bot',
        content: 'Lo siento, tuve un problema al procesar tu mensaje. 😔 ¿Podrías intentarlo de nuevo en unos momentos?',
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsThinking(false);
      // Volver a enfocar el input después de enviar
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const handleTogglePanel = () => {
    setIsOpen(prev => !prev);
    if (!isOpen) {
      setUnreadCount(0); // Resetear contador al abrir
    }
  };

  const handleClearHistory = () => {
    if (!user) return;
    setShowClearDialog(true);
  };

  const confirmClearHistory = () => {
    if (!user) return;
    clearChatHistory(user.id, currentContext);
    setMessages([]);
    setShowClearDialog(false);
  };

  const cancelClearHistory = () => {
    setShowClearDialog(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Burbuja flotante */}
      <button
        onClick={handleTogglePanel}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-50 hover:scale-110"
        aria-label="Abrir CostBot"
      >
        <i className="ri-robot-2-line text-2xl"></i>
        
        {/* Contador de no leídos */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel de chat */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[600px] bg-white rounded-lg shadow-2xl z-50 flex flex-col overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <i className="ri-robot-2-line text-xl"></i>
              </div>
              <div>
                <h3 className="font-semibold text-lg">CostBot</h3>
                <p className="text-xs text-blue-100">
                  {getPageContextLabel(currentContext)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearHistory}
                className="w-8 h-8 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                title="Limpiar historial"
              >
                <i className="ri-delete-bin-line"></i>
              </button>
              <button
                onClick={handleTogglePanel}
                className="w-8 h-8 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 mt-8">
                <i className="ri-chat-3-line text-4xl mb-2"></i>
                <p className="text-sm">¡Hola! Soy CostBot.</p>
                <p className="text-xs mt-1">Pregúntame sobre costos, optimización o cualquier duda.</p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-800 border border-gray-200'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  
                  {/* 🔥 ELIMINADO - Ya no mostramos fuentes consultadas */}
                  
                  <p className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                  }`}>
                    {new Date(message.timestamp).toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}

            {/* Indicador de "pensando..." */}
            {isThinking && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                    <span className="text-xs text-gray-500">CostBot está pensando...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-gray-200">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe tu pregunta..."
                disabled={isThinking}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isThinking}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center whitespace-nowrap"
              >
                <i className="ri-send-plane-fill"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🆕 Diálogo de confirmación para limpiar historial */}
      <ConfirmationDialog
        isOpen={showClearDialog}
        type="warning"
        title="Limpiar Conversación"
        message={`¿Estás seguro de que quieres eliminar todo el historial de esta sección (${getPageContextLabel(currentContext)})? Esta acción no se puede deshacer.`}
        confirmText="Sí, Limpiar"
        cancelText="Cancelar"
        onConfirm={confirmClearHistory}
        onCancel={cancelClearHistory}
      />
    </>
  );
}
