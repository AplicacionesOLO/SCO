import { useState, useEffect } from 'react';
import { PedidoSeguimiento, SeguimientoHistorial, SeguimientoEstado } from '../../../types/seguimiento';
import seguimientoService from '../../../services/seguimientoService';
import SeguimientoTimeline from '../../seguimiento/components/SeguimientoTimeline';
import CambiarEstadoModal from '../../seguimiento/components/CambiarEstadoModal';
import { usePermissions } from '../../../hooks/usePermissions';
import { useNotification } from '../../../hooks/useNotification';

interface PedidoSeguimientoPanelProps {
  pedidoId: number;
  pedidoEstado: string;
}

export default function PedidoSeguimientoPanel({ pedidoId, pedidoEstado }: PedidoSeguimientoPanelProps) {
  const [seguimiento, setSeguimiento] = useState<PedidoSeguimiento | null>(null);
  const [historial, setHistorial] = useState<SeguimientoHistorial[]>([]);
  const [estados, setEstados] = useState<SeguimientoEstado[]>([]);
  const [transiciones, setTransiciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCambiarEstadoModal, setShowCambiarEstadoModal] = useState(false);

  const { canRead, canWrite } = usePermissions();
  const { showNotification } = useNotification();

  useEffect(() => {
    loadData();
  }, [pedidoId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [seguimientoData, estadosData] = await Promise.all([
        seguimientoService.getSeguimientoByPedidoId(pedidoId),
        seguimientoService.getEstados()
      ]);

      setSeguimiento(seguimientoData);
      setEstados(estadosData);

      if (seguimientoData) {
        const [historialData, transicionesData] = await Promise.all([
          seguimientoService.getHistorial(seguimientoData.id),
          seguimientoService.getTransicionesDisponibles(seguimientoData.estado_actual)
        ]);
        setHistorial(historialData);
        setTransiciones(transicionesData);
      }
    } catch (error) {
      console.error('Error cargando seguimiento:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEstado = async (estadoNuevo: string, comentario?: string) => {
    if (!seguimiento) return;

    try {
      await seguimientoService.updateEstado({
        seguimiento_id: seguimiento.id,
        estado_nuevo: estadoNuevo,
        comentario
      });

      showNotification('Estado actualizado correctamente', 'success');
      await loadData();
      setShowCambiarEstadoModal(false);
    } catch (error: any) {
      console.error('Error actualizando estado:', error);
      showNotification(error.message || 'Error al actualizar el estado', 'error');
    }
  };

  if (!canRead('seguimiento')) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <i className="ri-loader-4-line animate-spin text-3xl text-blue-600 mb-2"></i>
          <p className="text-gray-600">Cargando seguimiento...</p>
        </div>
      </div>
    );
  }

  if (!seguimiento) {
    // Si el pedido está confirmado o facturado pero no tiene seguimiento, mostrar mensaje
    if (pedidoEstado === 'confirmado' || pedidoEstado === 'facturado') {
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center py-8">
            <i className="ri-information-line text-4xl text-blue-600 mb-3"></i>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Seguimiento en Proceso</h3>
            <p className="text-gray-600 mb-4">
              El seguimiento se está creando automáticamente para este pedido.
            </p>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-refresh-line mr-2"></i>
              Actualizar
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8 text-gray-400">
          <i className="ri-route-line text-4xl mb-3"></i>
          <p>Este pedido aún no tiene seguimiento activo</p>
          <p className="text-sm mt-2">El seguimiento se crea automáticamente cuando el pedido es confirmado o facturado</p>
        </div>
      </div>
    );
  }

  const estadoActual = estados.find(e => e.codigo === seguimiento.estado_actual);

  return (
    <div className="space-y-6">
      {/* Header con estado actual */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Seguimiento de Producción</h3>
          {canWrite('seguimiento') && !estadoActual?.es_final && (
            <button
              onClick={() => setShowCambiarEstadoModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium cursor-pointer whitespace-nowrap"
            >
              <i className="ri-arrow-right-line mr-2"></i>
              Cambiar Estado
            </button>
          )}
        </div>

        {/* Estado actual con progreso */}
        <div
          className="p-6 rounded-lg mb-6"
          style={{ backgroundColor: `${estadoActual?.color}15` }}
        >
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: estadoActual?.color }}
            >
              <i className={`${estadoActual?.icono} text-white text-2xl`}></i>
            </div>
            <div className="flex-1">
              <h4 className="text-xl font-bold text-gray-900">
                {estadoActual?.nombre_publico || seguimiento.estado_actual}
              </h4>
              <p className="text-gray-600 mt-1">
                Progreso: {seguimiento.progreso_porcentaje}% completado
              </p>
            </div>
          </div>

          {/* Barra de progreso */}
          <div className="w-full bg-white bg-opacity-50 rounded-full h-4">
            <div
              className="h-4 rounded-full transition-all flex items-center justify-end pr-2"
              style={{
                width: `${seguimiento.progreso_porcentaje}%`,
                backgroundColor: estadoActual?.color
              }}
            >
              {seguimiento.progreso_porcentaje > 10 && (
                <span className="text-white text-xs font-bold">
                  {seguimiento.progreso_porcentaje}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stepper de estados */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            {estados.map((estado, index) => {
              const isCompleted = estado.orden <= (estadoActual?.orden || 0);
              const isCurrent = estado.codigo === seguimiento.estado_actual;

              return (
                <div key={estado.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isCurrent
                          ? 'ring-4 ring-opacity-30'
                          : ''
                      }`}
                      style={{
                        backgroundColor: isCompleted ? estado.color : '#E5E7EB',
                        ringColor: isCurrent ? `${estado.color}40` : 'transparent'
                      }}
                    >
                      <i
                        className={`${estado.icono} text-lg`}
                        style={{ color: isCompleted ? 'white' : '#9CA3AF' }}
                      ></i>
                    </div>
                    <span className="text-xs text-gray-600 mt-2 text-center max-w-[80px] line-clamp-2">
                      {estado.nombre_publico}
                    </span>
                  </div>
                  {index < estados.length - 1 && (
                    <div
                      className="flex-1 h-1 mx-2"
                      style={{
                        backgroundColor: isCompleted ? estado.color : '#E5E7EB'
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Información adicional */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-gray-200">
          {seguimiento.responsable && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Responsable</p>
              <p className="font-medium text-gray-900">{seguimiento.responsable.nombre_completo}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-600 mb-1">Fecha de Inicio</p>
            <p className="font-medium text-gray-900">
              {new Date(seguimiento.fecha_inicio).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              })}
            </p>
          </div>
          {seguimiento.fecha_finalizacion && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Fecha de Finalización</p>
              <p className="font-medium text-gray-900">
                {new Date(seguimiento.fecha_finalizacion).toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })}
              </p>
            </div>
          )}
        </div>

        {seguimiento.comentario_ultimo && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Último Comentario</p>
            <p className="text-gray-900">{seguimiento.comentario_ultimo}</p>
          </div>
        )}
      </div>

      {/* Timeline de historial */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Historial de Cambios</h3>
        <SeguimientoTimeline historial={historial} estados={estados} />
      </div>

      {/* Modal para cambiar estado */}
      <CambiarEstadoModal
        isOpen={showCambiarEstadoModal}
        onClose={() => setShowCambiarEstadoModal(false)}
        estadoActual={seguimiento.estado_actual}
        estadosDisponibles={estados}
        transicionesDisponibles={transiciones}
        onConfirm={handleUpdateEstado}
      />
    </div>
  );
}
