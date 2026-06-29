import { useState } from 'react';
import type { Tarea } from '../../../types/tarea';
import type { TareaComentario } from '../../../types/monitor';

interface MonitorTaskCardProps {
  tarea: Tarea;
  comentarios: TareaComentario[];
  canComment?: boolean;
  onVerComentarios: (tarea: Tarea) => void;
  onAgregarComentario: (tarea: Tarea) => void;
}

const ESTADO_COLORS: Record<string, string> = {
  'En Cola': 'bg-foreground-200/70 text-foreground-700',
  'En Proceso': 'bg-secondary-100 text-secondary-800',
  'Produciendo': 'bg-accent-100 text-accent-800',
  'Esperando suministros': 'bg-amber-100 text-amber-800',
  'Finalizado': 'bg-foreground-200 text-foreground-600'
};

const ESTADO_ICONS: Record<string, string> = {
  'En Cola': 'ri-inbox-line',
  'En Proceso': 'ri-loader-4-line',
  'Produciendo': 'ri-tools-line',
  'Esperando suministros': 'ri-time-line',
  'Finalizado': 'ri-check-double-line'
};

export default function MonitorTaskCard({
  tarea,
  comentarios,
  canComment = false,
  onVerComentarios,
  onAgregarComentario
}: MonitorTaskCardProps) {
  const [expandido, setExpandido] = useState(false);

  const df = tarea.datos_formulario as any;
  const estadoColor = ESTADO_COLORS[tarea.estado] || 'bg-gray-100 text-gray-700';
  const estadoIcon = ESTADO_ICONS[tarea.estado] || 'ri-question-line';
  const comentariosCount = comentarios.length;
  const fechaVencida = tarea.fecha_estimada_entrega 
    ? new Date(tarea.fecha_estimada_entrega) < new Date() 
    : false;

  return (
    <div className="bg-white border border-background-200/70 rounded-lg overflow-hidden transition-all hover:border-background-300/60">
      {/* Header de la tarjeta */}
      <div 
        className="p-4 md:p-5 cursor-pointer"
        onClick={() => setExpandido(!expandido)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-bold text-foreground-950">
                {tarea.consecutivo}
              </span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${estadoColor}`}>
                <i className={`${estadoIcon} text-xs`}></i>
                {tarea.estado}
              </span>
              {fechaVencida && tarea.estado !== 'Finalizado' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                  <i className="ri-alert-line text-xs"></i>
                  Vencida
                </span>
              )}
            </div>
            
            <p className="text-sm text-foreground-800 mt-2 leading-relaxed">
              {tarea.descripcion_breve || 'Sin descripción'}
            </p>

            {/* Metadata en línea */}
            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-foreground-500">
              <span className="flex items-center gap-1">
                <i className="ri-calendar-line"></i>
                Creada: {new Date(tarea.created_at).toLocaleDateString('es-CR')}
              </span>
              {tarea.fecha_estimada_entrega && (
                <span className={`flex items-center gap-1 ${fechaVencida ? 'text-red-600 font-medium' : ''}`}>
                  <i className="ri-flag-line"></i>
                  Entrega: {new Date(tarea.fecha_estimada_entrega).toLocaleDateString('es-CR')}
                </span>
              )}
              {tarea.cantidad_unidades && (
                <span className="flex items-center gap-1">
                  <i className="ri-stack-line"></i>
                  {tarea.cantidad_unidades} unidades
                </span>
              )}
              {df?.solicitud_cofersa && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-secondary-100 text-secondary-700">
                  {df.solicitud_cofersa}
                </span>
              )}
              {df?.solicitud_epa && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-accent-100 text-accent-700">
                  {df.solicitud_epa}
                </span>
              )}
              {df?.tipo_trabajo && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-background-100 text-foreground-600">
                  {df.tipo_trabajo}
                </span>
              )}
            </div>
          </div>

          {/* Acciones y badge de comentarios */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {canComment && (
              <button
                onClick={(e) => { e.stopPropagation(); onAgregarComentario(tarea); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-secondary-700 bg-secondary-100 rounded-lg hover:bg-secondary-200 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-chat-3-line"></i>
                Comentar
              </button>
            )}
            {comentariosCount > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); onVerComentarios(tarea); }}
                className="flex items-center gap-1 text-xs text-foreground-500 hover:text-foreground-800 transition-colors cursor-pointer"
              >
                <i className="ri-message-2-line"></i>
                {comentariosCount} comentario{comentariosCount !== 1 ? 's' : ''}
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setExpandido(!expandido); }}
              className="text-foreground-400 hover:text-foreground-700 transition-colors cursor-pointer"
            >
              <i className={`${expandido ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} text-lg`}></i>
            </button>
          </div>
        </div>
      </div>

      {/* Contenido expandido */}
      {expandido && (
        <div className="px-4 md:px-5 pb-4 md:pb-5 border-t border-background-100 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-foreground-500 text-xs">Solicitante</span>
              <p className="text-foreground-900 mt-0.5">{tarea.email_solicitante}</p>
            </div>
            <div>
              <span className="text-foreground-500 text-xs">Departamento</span>
              <p className="text-foreground-900 mt-0.5">{df?.departamento_solicitante || '-'}</p>
            </div>
            <div>
              <span className="text-foreground-500 text-xs">Cliente</span>
              <p className="text-foreground-900 mt-0.5">{df?.cliente || '-'}</p>
            </div>
            {tarea.cantidad_personas && (
              <div>
                <span className="text-foreground-500 text-xs">Personas asignadas</span>
                <p className="text-foreground-900 mt-0.5">{tarea.cantidad_personas}</p>
              </div>
            )}
            {tarea.fecha_inicio && (
              <div>
                <span className="text-foreground-500 text-xs">Fecha inicio</span>
                <p className="text-foreground-900 mt-0.5">{new Date(tarea.fecha_inicio).toLocaleDateString('es-CR')}</p>
              </div>
            )}
            {tarea.fecha_cierre && (
              <div>
                <span className="text-foreground-500 text-xs">Fecha cierre</span>
                <p className="text-foreground-900 mt-0.5">{new Date(tarea.fecha_cierre).toLocaleDateString('es-CR')}</p>
              </div>
            )}
            {tarea.entregado_a && (
              <div>
                <span className="text-foreground-500 text-xs">Entregado a</span>
                <p className="text-foreground-900 mt-0.5">{tarea.entregado_a}</p>
              </div>
            )}
          </div>

          {/* Comentarios recientes en vista expandida */}
          {comentarios.length > 0 && (
            <div className="mt-4 pt-4 border-t border-background-100">
              <h4 className="text-xs font-semibold text-foreground-500 uppercase tracking-wider mb-3">
                Comentarios recientes
              </h4>
              <div className="space-y-3">
                {comentarios.slice(-3).reverse().map(com => (
                  <div key={com.id} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-secondary-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-secondary-700">
                        {(com.usuario?.nombre_completo || com.usuario?.email || 'U')[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground-900">
                          {com.usuario?.nombre_completo || com.usuario?.email || 'Usuario'}
                        </span>
                        <span className="text-xs text-foreground-400">
                          {new Date(com.created_at).toLocaleDateString('es-CR', { 
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground-700 mt-0.5">{com.comentario}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onVerComentarios(tarea); }}
                className="mt-3 text-xs text-secondary-600 hover:text-secondary-800 font-medium cursor-pointer"
              >
                Ver todos los comentarios →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}