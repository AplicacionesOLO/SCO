import { useState } from 'react';
import type { PedidoSeguimiento, SeguimientoEstado } from '../../../types/seguimiento';

interface SeguimientoKanbanProps {
  estados: SeguimientoEstado[];
  seguimientos: PedidoSeguimiento[];
  onUpdateEstado: (seguimientoId: string, nuevoEstado: string) => void;
  onViewDetails: (seguimiento: PedidoSeguimiento) => void;
}

export default function SeguimientoKanban({
  estados,
  seguimientos,
  onUpdateEstado,
  onViewDetails
}: SeguimientoKanbanProps) {
  const [draggedItem, setDraggedItem] = useState<PedidoSeguimiento | null>(null);

  const getSeguimientosPorEstado = (estadoCodigo: string) => {
    // ✅ Protección contra undefined
    return (seguimientos || []).filter(s => s.estado_actual === estadoCodigo);
  };

  const handleDragStart = (seguimiento: PedidoSeguimiento) => {
    setDraggedItem(seguimiento);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (estadoCodigo: string) => {
    if (draggedItem && draggedItem.estado_actual !== estadoCodigo) {
      onUpdateEstado(draggedItem.id, estadoCodigo);
    }
    setDraggedItem(null);
  };

  // ✅ Validación de datos vacíos
  if (!seguimientos || seguimientos.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <i className="ri-inbox-line text-4xl mb-2"></i>
        <p>No hay solicitudes para mostrar</p>
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {estados.map(estado => {
        const seguimientosEstado = getSeguimientosPorEstado(estado.codigo);
        
        return (
          <div
            key={estado.id}
            className="flex-shrink-0 w-80 bg-gray-50 rounded-lg"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(estado.codigo)}
          >
            {/* Header de la columna */}
            <div 
              className="p-4 border-b border-gray-200"
              style={{ backgroundColor: estado.color + '20' }}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{estado.nombre}</h3>
                <span className="bg-white px-2 py-1 rounded-full text-sm font-medium">
                  {seguimientosEstado.length}
                </span>
              </div>
            </div>

            {/* Lista de tarjetas */}
            <div className="p-4 space-y-3 min-h-[200px]">
              {seguimientosEstado.map(seguimiento => (
                <div
                  key={seguimiento.id}
                  draggable
                  onDragStart={() => handleDragStart(seguimiento)}
                  className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-move hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-semibold text-gray-900">
                      {seguimiento.codigo}
                    </span>
                    <span 
                      className="px-2 py-1 rounded text-xs font-medium"
                      style={{ 
                        backgroundColor: estado.color + '20',
                        color: estado.color
                      }}
                    >
                      {estado.nombre}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {seguimiento.descripcion}
                  </p>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      <i className="ri-user-line mr-1"></i>
                      {seguimiento.cliente_nombre || 'Sin cliente'}
                    </span>
                    <span>
                      {seguimiento.prioridad && (
                        <span className={`px-2 py-1 rounded ${
                          seguimiento.prioridad === 'urgente' ? 'bg-red-100 text-red-700' :
                          seguimiento.prioridad === 'alta' ? 'bg-orange-100 text-orange-700' :
                          seguimiento.prioridad === 'media' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {seguimiento.prioridad}
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                    <button
                      onClick={() => onViewDetails(seguimiento)}
                      className="flex-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded text-sm font-medium hover:bg-blue-100 transition-colors"
                    >
                      <i className="ri-eye-line mr-1"></i>
                      Ver Detalle
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
