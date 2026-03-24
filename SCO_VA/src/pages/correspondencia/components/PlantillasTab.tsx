import type { CorrespondenciaPlantilla } from '../../../types/correspondencia';

interface Props {
  plantillas: CorrespondenciaPlantilla[];
  loading: boolean;
  onNueva: () => void;
  onEditar: (p: CorrespondenciaPlantilla) => void;
  onToggle: (p: CorrespondenciaPlantilla) => void;
  onEliminar: (p: CorrespondenciaPlantilla) => void;
}

export default function PlantillasTab({ plantillas, loading, onNueva, onEditar, onToggle, onEliminar }: Props) {
  if (loading) return <div className="flex items-center justify-center h-48 text-gray-400"><i className="ri-loader-4-line animate-spin text-2xl mr-2"></i> Cargando...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{plantillas.length} plantilla{plantillas.length !== 1 ? 's' : ''} registrada{plantillas.length !== 1 ? 's' : ''}</p>
        <button onClick={onNueva} className="px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 flex items-center gap-2 cursor-pointer whitespace-nowrap">
          <i className="ri-add-line"></i> Nueva Plantilla
        </button>
      </div>

      {plantillas.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-14 h-14 flex items-center justify-center bg-gray-100 rounded-full mx-auto mb-3">
            <i className="ri-file-text-line text-2xl text-gray-400"></i>
          </div>
          <p className="text-gray-500 text-sm">No hay plantillas. Crea la primera para empezar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {plantillas.map((p) => (
            <div key={p.id} className={`bg-white rounded-xl border ${p.activo ? 'border-gray-200' : 'border-gray-100 opacity-60'} p-5 flex flex-col gap-3`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${p.activo ? 'bg-green-400' : 'bg-gray-300'}`}></span>
                    <h3 className="font-semibold text-gray-900 text-sm truncate">{p.nombre}</h3>
                  </div>
                  {p.descripcion && <p className="text-xs text-gray-400 truncate">{p.descripcion}</p>}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-0.5">Asunto:</p>
                <p className="text-sm text-gray-700 font-medium truncate">{p.asunto}</p>
              </div>

              {p.variables?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {p.variables.slice(0, 4).map((v) => (
                    <span key={v.nombre} className="bg-emerald-50 text-emerald-600 text-xs rounded-full px-2 py-0.5 border border-emerald-100 font-mono">{`{{${v.nombre}}}`}</span>
                  ))}
                  {p.variables.length > 4 && <span className="text-xs text-gray-400">+{p.variables.length - 4} más</span>}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                <button onClick={() => onEditar(p)} className="flex-1 py-1.5 text-xs text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer flex items-center justify-center gap-1">
                  <i className="ri-edit-line"></i> Editar
                </button>
                <button onClick={() => onToggle(p)} className={`flex-1 py-1.5 text-xs rounded-lg cursor-pointer flex items-center justify-center gap-1 ${p.activo ? 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100' : 'text-green-600 bg-green-50 hover:bg-green-100'}`}>
                  <i className={p.activo ? 'ri-pause-circle-line' : 'ri-play-circle-line'}></i>
                  {p.activo ? 'Pausar' : 'Activar'}
                </button>
                <button onClick={() => onEliminar(p)} className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer">
                  <i className="ri-delete-bin-line text-sm"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
