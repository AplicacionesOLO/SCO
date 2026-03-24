import { SeguimientoHistorial, SeguimientoEstado } from '../../../types/seguimiento';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface SeguimientoTimelineProps {
  historial: SeguimientoHistorial[];
  estados: SeguimientoEstado[];
}

export default function SeguimientoTimeline({ historial, estados }: SeguimientoTimelineProps) {
  const getEstadoInfo = (codigo: string) => {
    return estados.find(e => e.codigo === codigo);
  };

  if (historial.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <i className="ri-time-line text-4xl mb-2"></i>
        <p>No hay historial de cambios</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {historial.map((item, index) => {
        const estadoInfo = getEstadoInfo(item.estado_nuevo);
        const isFirst = index === 0;
        const isLast = index === historial.length - 1;

        return (
          <div key={item.id} className="flex gap-4">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: estadoInfo?.color || '#3B82F6',
                  opacity: isLast ? 1 : 0.7
                }}
              >
                <i className={`${estadoInfo?.icono || 'ri-checkbox-circle-line'} text-white text-lg`}></i>
              </div>
              {!isLast && (
                <div
                  className="w-0.5 flex-1 min-h-[60px]"
                  style={{
                    backgroundColor: estadoInfo?.color || '#3B82F6',
                    opacity: 0.3
                  }}
                />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-8">
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {estadoInfo?.nombre_publico || item.estado_nuevo}
                    </h4>
                    {item.estado_anterior && (
                      <p className="text-sm text-gray-600">
                        Desde: {getEstadoInfo(item.estado_anterior)?.nombre_publico || item.estado_anterior}
                      </p>
                    )}
                  </div>
                  {isLast && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full whitespace-nowrap">
                      Estado actual
                    </span>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <i className="ri-user-line"></i>
                    <span>{item.responsable?.nombre_completo || 'Usuario desconocido'}</span>
                  </div>

                  <div className="flex items-center gap-2 text-gray-600">
                    <i className="ri-calendar-line"></i>
                    <span>
                      {format(new Date(item.created_at), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
                    </span>
                  </div>

                  {item.duracion_minutos && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <i className="ri-time-line"></i>
                      <span>Duración: {item.duracion_minutos} minutos</span>
                    </div>
                  )}
                </div>

                {item.comentario && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-sm text-gray-700">{item.comentario}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
