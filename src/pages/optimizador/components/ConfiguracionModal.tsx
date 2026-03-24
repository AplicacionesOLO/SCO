import { useState } from 'react';
import { ConfiguracionCorte } from '../../../types/optimizador';

interface Props {
  configuracion: ConfiguracionCorte;
  onGuardar: (config: ConfiguracionCorte) => void;
  onCerrar: () => void;
}

export default function ConfiguracionModal({ configuracion, onGuardar, onCerrar }: Props) {
  const [config, setConfig] = useState<ConfiguracionCorte>(configuracion);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGuardar(config);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <i className="ri-settings-3-line text-blue-600"></i>
            Configuración de Optimización
          </h2>
          <button
            onClick={onCerrar}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <i className="ri-close-line text-2xl"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Espesor de Sierra */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Espesor de Sierra (Kerf) - mm
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={config.espesor_sierra}
              onChange={(e) => setConfig({ ...config, espesor_sierra: parseFloat(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-600 mt-1">
              Espacio que ocupa la sierra al cortar. Típicamente 3-4 mm.
            </p>
          </div>

          {/* Margen de Seguridad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Margen de Seguridad - mm
            </label>
            <input
              type="number"
              step="1"
              min="0"
              value={config.margen_seguridad}
              onChange={(e) => setConfig({ ...config, margen_seguridad: parseFloat(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-600 mt-1">
              Espacio adicional entre piezas para evitar errores de corte.
            </p>
          </div>

          {/* Permitir Rotación */}
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <input
              type="checkbox"
              id="permitir_rotacion"
              checked={config.permitir_rotacion}
              onChange={(e) => setConfig({ ...config, permitir_rotacion: e.target.checked })}
              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div className="flex-1">
              <label htmlFor="permitir_rotacion" className="block text-sm font-medium text-gray-900 cursor-pointer">
                Permitir Rotación de Piezas
              </label>
              <p className="text-xs text-gray-600 mt-1">
                Permite rotar piezas 90° para mejor aprovechamiento. 
                Respeta la dirección de veta (piezas con veta X no rotan).
              </p>
            </div>
          </div>

          {/* Optimizar Desperdicio */}
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <input
              type="checkbox"
              id="optimizar_desperdicio"
              checked={config.optimizar_desperdicio}
              onChange={(e) => setConfig({ ...config, optimizar_desperdicio: e.target.checked })}
              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div className="flex-1">
              <label htmlFor="optimizar_desperdicio" className="block text-sm font-medium text-gray-900 cursor-pointer">
                Optimizar Desperdicio
              </label>
              <p className="text-xs text-gray-600 mt-1">
                Intenta minimizar el desperdicio agrupando piezas de forma más eficiente.
              </p>
            </div>
          </div>

          {/* Información Adicional */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <i className="ri-information-line"></i>
              Sobre el Algoritmo
            </h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Utiliza algoritmo Guillotine Cutting para optimización 2D</li>
              <li>• Ordena piezas por área (First Fit Decreasing)</li>
              <li>• Respeta dirección de veta según configuración</li>
              <li>• Calcula automáticamente costos de materiales y tapacantos</li>
            </ul>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCerrar}
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <i className="ri-save-line"></i>
              Guardar Configuración
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
