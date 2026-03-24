import { useState } from 'react';
import type { CorrespondenciaHistorial, HistorialFiltros, EstadoCorreo } from '../../../types/correspondencia';

interface Props {
  historial: CorrespondenciaHistorial[];
  loading: boolean;
  filtros: HistorialFiltros;
  onFiltrosChange: (f: HistorialFiltros) => void;
  onReintentar: (id: number) => void;
  onVerDetalle: (h: CorrespondenciaHistorial) => void;
}

const ESTADO_STYLES: Record<EstadoCorreo, { label: string; color: string; icon: string }> = {
  pendiente: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700', icon: 'ri-time-line' },
  enviando: { label: 'Enviando', color: 'bg-sky-100 text-sky-700', icon: 'ri-loader-4-line' },
  enviado: { label: 'Enviado', color: 'bg-green-100 text-green-700', icon: 'ri-check-line' },
  error: { label: 'Error', color: 'bg-red-100 text-red-700', icon: 'ri-error-warning-line' },
  reintentando: { label: 'Reintentando', color: 'bg-orange-100 text-orange-700', icon: 'ri-refresh-line' },
};

function fmt(dt: string | null) {
  if (!dt) return '—';
  return new Date(dt + (dt.includes('T') ? '' : 'T00:00:00')).toLocaleString('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function HistorialTab({ historial, loading, filtros, onFiltrosChange, onReintentar, onVerDetalle }: Props) {
  const [detalleAbierto, setDetalleAbierto] = useState<CorrespondenciaHistorial | null>(null);

  if (loading) return <div className="flex items-center justify-center h-48 text-gray-400"><i className="ri-loader-4-line animate-spin text-2xl mr-2"></i> Cargando...</div>;

  return (
    <div>
      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Estado</label>
          <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm cursor-pointer focus:outline-none"
            value={filtros.estado ?? ''} onChange={(e) => onFiltrosChange({ ...filtros, estado: e.target.value as EstadoCorreo | '' })}>
            <option value="">Todos</option>
            <option value="enviado">Enviado</option>
            <option value="error">Error</option>
            <option value="pendiente">Pendiente</option>
            <option value="enviando">Enviando</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Desde</label>
          <input type="date" className="border border-gray-300 rounded-lg px-3 py-2 text-sm cursor-pointer focus:outline-none"
            value={filtros.fecha_desde ?? ''} onChange={(e) => onFiltrosChange({ ...filtros, fecha_desde: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Hasta</label>
          <input type="date" className="border border-gray-300 rounded-lg px-3 py-2 text-sm cursor-pointer focus:outline-none"
            value={filtros.fecha_hasta ?? ''} onChange={(e) => onFiltrosChange({ ...filtros, fecha_hasta: e.target.value })} />
        </div>
        <div className="flex-1 min-w-40">
          <label className="block text-xs text-gray-500 mb-1">Buscar asunto</label>
          <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
            value={filtros.busqueda ?? ''} onChange={(e) => onFiltrosChange({ ...filtros, busqueda: e.target.value })} placeholder="Buscar..." />
        </div>
        <button onClick={() => onFiltrosChange({ estado: '', fecha_desde: '', fecha_hasta: '', busqueda: '' })}
          className="px-3 py-2 text-sm text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer whitespace-nowrap">
          Limpiar
        </button>
      </div>

      <div className="text-xs text-gray-400 mb-2">{historial.length} registro{historial.length !== 1 ? 's' : ''}</div>

      {historial.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-14 h-14 flex items-center justify-center bg-gray-100 rounded-full mx-auto mb-3">
            <i className="ri-mail-check-line text-2xl text-gray-400"></i>
          </div>
          <p className="text-gray-500 text-sm">Sin registros de envío con los filtros actuales.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Para</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Asunto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Regla</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Evento</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Intentos</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {historial.map((h) => {
                const est = ESTADO_STYLES[h.estado] ?? ESTADO_STYLES['pendiente'];
                const paraArr = Array.isArray(h.para) ? h.para : [];
                return (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${est.color}`}>
                        <i className={est.icon}></i> {est.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmt(h.created_at)}</td>
                    <td className="px-4 py-3 text-xs text-gray-700 max-w-32 truncate">
                      {paraArr[0] ?? '—'}{paraArr.length > 1 ? ` +${paraArr.length - 1}` : ''}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700 max-w-48 truncate">{h.asunto}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{h.regla?.nombre ?? <span className="text-gray-300">Manual</span>}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{h.evento_origen ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 text-center">{h.intentos}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setDetalleAbierto(h); onVerDetalle(h); }}
                          className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded cursor-pointer">
                          <i className="ri-eye-line text-sm"></i>
                        </button>
                        {h.estado === 'error' && (
                          <button onClick={() => onReintentar(h.id)}
                            className="w-7 h-7 flex items-center justify-center text-orange-400 hover:text-orange-600 hover:bg-orange-50 rounded cursor-pointer">
                            <i className="ri-refresh-line text-sm"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal detalle */}
      {detalleAbierto && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">Detalle del Envío #{detalleAbierto.id}</h3>
              <button onClick={() => setDetalleAbierto(null)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer"><i className="ri-close-line text-xl"></i></button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-gray-400">Estado:</span> <span className="font-medium">{detalleAbierto.estado}</span></div>
                <div><span className="text-gray-400">Fecha:</span> <span className="font-medium">{fmt(detalleAbierto.created_at)}</span></div>
                <div><span className="text-gray-400">Enviado en:</span> <span className="font-medium">{fmt(detalleAbierto.enviado_en)}</span></div>
                <div><span className="text-gray-400">Intentos:</span> <span className="font-medium">{detalleAbierto.intentos}</span></div>
              </div>
              <div><span className="text-gray-400">Para:</span> <span className="font-medium">{Array.isArray(detalleAbierto.para) ? detalleAbierto.para.join(', ') : '—'}</span></div>
              <div><span className="text-gray-400">Asunto:</span> <span className="font-medium">{detalleAbierto.asunto}</span></div>
              {detalleAbierto.error_detalle && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-red-600 mb-1">Error:</p>
                  <p className="text-xs text-red-500 font-mono">{detalleAbierto.error_detalle}</p>
                </div>
              )}
              {detalleAbierto.cuerpo_html && (
                <div>
                  <p className="text-gray-400 mb-1 text-xs">Cuerpo:</p>
                  <div className="border border-gray-200 rounded-lg p-3 max-h-40 overflow-auto" dangerouslySetInnerHTML={{ __html: detalleAbierto.cuerpo_html }} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
