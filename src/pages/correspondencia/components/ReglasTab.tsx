import type { CorrespondenciaRegla } from '../../../types/correspondencia';

interface Props {
  reglas: CorrespondenciaRegla[];
  loading: boolean;
  onNueva: () => void;
  onEditar: (r: CorrespondenciaRegla) => void;
  onToggle: (r: CorrespondenciaRegla) => void;
  onEliminar: (r: CorrespondenciaRegla) => void;
}

const EVENTO_LABELS: Record<string, { label: string; color: string }> = {
  'manual': { label: 'Manual', color: 'bg-gray-100 text-gray-600' },
  'tarea.creada': { label: 'Tarea Creada', color: 'bg-emerald-100 text-emerald-700' },
  'tarea.estado_cambiado': { label: 'Tarea: Estado', color: 'bg-yellow-100 text-yellow-700' },
  'tarea.finalizada': { label: 'Tarea Finalizada', color: 'bg-green-100 text-green-700' },
  'cotizacion.creada': { label: 'Cotización', color: 'bg-orange-100 text-orange-700' },
  'pedido.creado': { label: 'Pedido Creado', color: 'bg-teal-100 text-teal-700' },
  'pedido.estado_cambiado': { label: 'Pedido: Estado', color: 'bg-red-100 text-red-700' },
};

export default function ReglasTab({ reglas, loading, onNueva, onEditar, onToggle, onEliminar }: Props) {
  if (loading) return <div className="flex items-center justify-center h-48 text-gray-400"><i className="ri-loader-4-line animate-spin text-2xl mr-2"></i> Cargando...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{reglas.length} regla{reglas.length !== 1 ? 's' : ''} configurada{reglas.length !== 1 ? 's' : ''}</p>
        <button onClick={onNueva} className="px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 flex items-center gap-2 cursor-pointer whitespace-nowrap">
          <i className="ri-add-line"></i> Nueva Regla
        </button>
      </div>

      {reglas.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-14 h-14 flex items-center justify-center bg-gray-100 rounded-full mx-auto mb-3">
            <i className="ri-settings-3-line text-2xl text-gray-400"></i>
          </div>
          <p className="text-gray-500 text-sm">No hay reglas. Define la primera para automatizar envíos.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Evento</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Plantilla</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Destinatarios</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Prioridad</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reglas.map((r) => {
                const ev = EVENTO_LABELS[r.evento_trigger] ?? { label: r.evento_trigger, color: 'bg-gray-100 text-gray-600' };
                const emails = (r.destinatarios_config as { tipo: string; emails?: string[] }).emails ?? [];
                return (
                  <tr key={r.id} className={`hover:bg-gray-50 ${!r.activo ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <span className={`w-2 h-2 rounded-full inline-block ${r.activo ? 'bg-green-400' : 'bg-gray-300'}`}></span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{r.nombre}</div>
                      {r.descripcion && <div className="text-xs text-gray-400 truncate max-w-40">{r.descripcion}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${ev.color}`}>{ev.label}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{r.plantilla?.nombre ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {emails.length > 0 ? (
                        <span>{emails[0]}{emails.length > 1 ? ` +${emails.length - 1}` : ''}</span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{r.prioridad}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => onEditar(r)} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded cursor-pointer"><i className="ri-edit-line text-sm"></i></button>
                        <button onClick={() => onToggle(r)} className={`w-7 h-7 flex items-center justify-center rounded cursor-pointer ${r.activo ? 'text-yellow-400 hover:text-yellow-600 hover:bg-yellow-50' : 'text-green-400 hover:text-green-600 hover:bg-green-50'}`}>
                          <i className={`text-sm ${r.activo ? 'ri-pause-circle-line' : 'ri-play-circle-line'}`}></i>
                        </button>
                        <button onClick={() => onEliminar(r)} className="w-7 h-7 flex items-center justify-center text-red-300 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"><i className="ri-delete-bin-line text-sm"></i></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
