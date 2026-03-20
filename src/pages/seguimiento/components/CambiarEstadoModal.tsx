import { useState } from 'react';
import { SeguimientoEstado, SeguimientoTransicion } from '../../../types/seguimiento';
import { showAlert } from '../../../utils/dialog';

interface CambiarEstadoModalProps {
  isOpen: boolean;
  onClose: () => void;
  estadoActual: string;
  estadosDisponibles: SeguimientoEstado[];
  transicionesDisponibles: SeguimientoTransicion[];
  onConfirm: (estadoNuevo: string, comentario?: string) => void;
}

export default function CambiarEstadoModal({
  isOpen,
  onClose,
  estadoActual,
  estadosDisponibles,
  transicionesDisponibles,
  onConfirm
}: CambiarEstadoModalProps) {
  const [estadoSeleccionado, setEstadoSeleccionado] = useState('');
  const [comentario, setComentario] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const transicion = transicionesDisponibles.find(t => t.estado_destino === estadoSeleccionado);
  const requiereComentario = transicion?.requiere_comentario || false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!estadoSeleccionado) {
      showAlert('Por favor selecciona un estado');
      return;
    }

    if (requiereComentario && !comentario.trim()) {
      showAlert('Este cambio de estado requiere un comentario');
      return;
    }

    setLoading(true);
    try {
      await onConfirm(estadoSeleccionado, comentario || undefined);
      setEstadoSeleccionado('');
      setComentario('');
      onClose();
    } catch (error) {
      console.error('Error cambiando estado:', error);
      showAlert('Error al cambiar el estado');
    } finally {
      setLoading(false);
    }
  };

  const estadosPermitidos = estadosDisponibles.filter(estado =>
    transicionesDisponibles.some(t => t.estado_destino === estado.codigo)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Cambiar Estado</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <i className="ri-close-line text-xl text-gray-600"></i>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Estado actual */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado Actual
            </label>
            <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
              <span className="text-gray-900 font-medium">
                {estadosDisponibles.find(e => e.codigo === estadoActual)?.nombre_publico || estadoActual}
              </span>
            </div>
          </div>

          {/* Nuevo estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nuevo Estado <span className="text-red-500">*</span>
            </label>
            <select
              value={estadoSeleccionado}
              onChange={(e) => setEstadoSeleccionado(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Seleccionar estado...</option>
              {estadosPermitidos.map(estado => (
                <option key={estado.id} value={estado.codigo}>
                  {estado.nombre_publico}
                </option>
              ))}
            </select>
          </div>

          {/* Comentario */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comentario {requiereComentario && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Agrega un comentario sobre este cambio..."
              required={requiereComentario}
            />
            {requiereComentario && (
              <p className="mt-1 text-xs text-amber-600">
                <i className="ri-information-line"></i> Este cambio de estado requiere un comentario obligatorio
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium cursor-pointer whitespace-nowrap"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !estadoSeleccionado}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
            >
              {loading ? (
                <>
                  <i className="ri-loader-4-line animate-spin mr-2"></i>
                  Actualizando...
                </>
              ) : (
                <>
                  <i className="ri-check-line mr-2"></i>
                  Confirmar Cambio
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
