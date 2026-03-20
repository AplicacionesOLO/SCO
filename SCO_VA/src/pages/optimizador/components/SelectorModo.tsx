import { ModoOptimizador } from '../../../types/optimizador';

interface Props {
  modo: ModoOptimizador;
  onCambiarModo: (modo: ModoOptimizador) => void;
  productoBOM?: { id: number; nombre: string } | null;
}

export default function SelectorModo({ modo, onCambiarModo, productoBOM }: Props) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Modo de Trabajo
      </label>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Modo BOM */}
        <button
          onClick={() => onCambiarModo('bom')}
          className={`relative p-4 rounded-lg border-2 transition-all ${
            modo === 'bom'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              modo === 'bom' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
            }`}>
              <i className="ri-file-list-3-line text-xl"></i>
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-gray-900 mb-1">Modo BOM</h3>
              <p className="text-sm text-gray-600">
                Cargar piezas desde un producto existente
              </p>
              {modo === 'bom' && productoBOM && (
                <div className="mt-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                  {productoBOM.nombre}
                </div>
              )}
            </div>
          </div>
          {modo === 'bom' && (
            <div className="absolute top-2 right-2">
              <i className="ri-checkbox-circle-fill text-blue-500 text-xl"></i>
            </div>
          )}
        </button>

        {/* Modo Manual */}
        <button
          onClick={() => onCambiarModo('manual')}
          className={`relative p-4 rounded-lg border-2 transition-all ${
            modo === 'manual'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              modo === 'manual' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
            }`}>
              <i className="ri-edit-box-line text-xl"></i>
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-gray-900 mb-1">Modo Manual</h3>
              <p className="text-sm text-gray-600">
                Agregar piezas personalizadas una por una
              </p>
            </div>
          </div>
          {modo === 'manual' && (
            <div className="absolute top-2 right-2">
              <i className="ri-checkbox-circle-fill text-blue-500 text-xl"></i>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
