import { useState, useEffect } from 'react';
import { PedidoSeguimiento, SeguimientoHistorial, SeguimientoEstado } from '../../../types/seguimiento';
import SeguimientoTimeline from './SeguimientoTimeline';
import seguimientoService from '../../../services/seguimientoService';
import { formatCurrency } from '../../../lib/currency';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface SeguimientoDetalleModalProps {
  isOpen: boolean;
  onClose: () => void;
  seguimiento: PedidoSeguimiento | null;
  estados: SeguimientoEstado[];
  onCambiarEstado: () => void;
}

export default function SeguimientoDetalleModal({
  isOpen,
  onClose,
  seguimiento,
  estados,
  onCambiarEstado
}: SeguimientoDetalleModalProps) {
  const [historial, setHistorial] = useState<SeguimientoHistorial[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && seguimiento) {
      loadHistorial();
    }
  }, [isOpen, seguimiento]);

  const loadHistorial = async () => {
    if (!seguimiento) return;
    
    setLoading(true);
    try {
      const data = await seguimientoService.getHistorial(seguimiento.id);
      setHistorial(data);
    } catch (error) {
      console.error('Error cargando historial:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !seguimiento) return null;

  const estadoActual = estados.find(e => e.codigo === seguimiento.estado_actual);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Seguimiento - {seguimiento.pedido?.codigo || `Pedido #${seguimiento.pedido_id}`}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {seguimiento.pedido?.cliente?.nombre || 'Cliente no especificado'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <i className="ri-close-line text-xl text-gray-600"></i>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Información general */}
            <div className="lg:col-span-1 space-y-6">
              {/* Estado actual */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Estado Actual</h3>
                <div
                  className="p-4 rounded-lg flex items-center gap-3"
                  style={{ backgroundColor: `${estadoActual?.color}15` }}
                >
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: estadoActual?.color }}
                  >
                    <i className={`${estadoActual?.icono} text-white text-xl`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">
                      {estadoActual?.nombre_publico || seguimiento.estado_actual}
                    </p>
                    <p className="text-sm text-gray-600">
                      {seguimiento.progreso_porcentaje}% completado
                    </p>
                  </div>
                </div>

                {/* Barra de progreso */}
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="h-3 rounded-full transition-all"
                      style={{
                        width: `${seguimiento.progreso_porcentaje}%`,
                        backgroundColor: estadoActual?.color
                      }}
                    />
                  </div>
                </div>

                <button
                  onClick={onCambiarEstado}
                  className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-arrow-right-line mr-2"></i>
                  Cambiar Estado
                </button>
              </div>

              {/* Información del pedido */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Información del Pedido</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-semibold text-gray-900">
                      {seguimiento.pedido?.total ? formatCurrency(seguimiento.pedido.total) : 'N/A'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Estado Pedido:</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                      {seguimiento.pedido?.estado || 'N/A'}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-gray-600 mb-2">
                      <i className="ri-calendar-line"></i>
                      <span>Inicio:</span>
                    </div>
                    <p className="text-gray-900 text-xs">
                      {format(new Date(seguimiento.fecha_inicio), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                    </p>
                  </div>

                  {seguimiento.responsable && (
                    <div className="pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-gray-600 mb-2">
                        <i className="ri-user-line"></i>
                        <span>Responsable:</span>
                      </div>
                      <p className="text-gray-900 text-xs">{seguimiento.responsable.nombre_completo}</p>
                      <p className="text-gray-600 text-xs">{seguimiento.responsable.email}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Historial de Cambios</h3>
                {loading ? (
                  <div className="text-center py-8">
                    <i className="ri-loader-4-line animate-spin text-3xl text-blue-600"></i>
                    <p className="text-gray-600 mt-2">Cargando historial...</p>
                  </div>
                ) : (
                  <SeguimientoTimeline historial={historial} estados={estados} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
