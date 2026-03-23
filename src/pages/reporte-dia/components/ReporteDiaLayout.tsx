import type { ReactNode } from 'react';
import type { MiColaborador } from '../../../services/reporteDiaService';

interface Props {
  colaborador: MiColaborador | null;
  totalTareas: number;
  tareasConReporte: number;
  tareasSinReporte: number;
  filtroEstado: string;
  busqueda: string;
  onFiltroEstadoChange: (v: string) => void;
  onBusquedaChange: (v: string) => void;
  onRefresh: () => void;
  children: ReactNode;
}

const ESTADOS = ['En Cola', 'En Proceso', 'Produciendo', 'Esperando suministros', 'Terminado', 'Finalizado'];

export default function ReporteDiaLayout({
  colaborador,
  totalTareas,
  tareasConReporte,
  tareasSinReporte,
  filtroEstado,
  busqueda,
  onFiltroEstadoChange,
  onBusquedaChange,
  onRefresh,
  children,
}: Props) {
  const hoy = new Date().toLocaleDateString('es-CR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <main className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-5">
          {/* Título y colaborador */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: '"Inter", sans-serif' }}>
                Reporte del Día
              </h1>
              <p className="text-sm text-gray-500 mt-1 capitalize">{hoy}</p>
              {colaborador && (
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
                  <i className="ri-user-line text-emerald-600 text-sm"></i>
                  <span className="text-sm font-medium text-emerald-800">{colaborador.nombre}</span>
                </div>
              )}
            </div>

            <button
              onClick={onRefresh}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-refresh-line"></i>
              Actualizar
            </button>
          </div>

          {/* Tarjetas de resumen */}
          {colaborador && (
            <div className="grid grid-cols-3 gap-4 mb-5">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Total asignadas</p>
                <p className="text-3xl font-bold text-gray-900">{totalTareas}</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                <p className="text-xs text-emerald-600 uppercase tracking-wide font-medium mb-1">Con registro</p>
                <p className="text-3xl font-bold text-emerald-700">{tareasConReporte}</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <p className="text-xs text-amber-600 uppercase tracking-wide font-medium mb-1">Sin registrar</p>
                <p className="text-3xl font-bold text-amber-700">{tareasSinReporte}</p>
              </div>
            </div>
          )}

          {/* Filtros */}
          {colaborador && (
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => onBusquedaChange(e.target.value)}
                  placeholder="Buscar por número, tipo o descripción..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <select
                value={filtroEstado}
                onChange={(e) => onFiltroEstadoChange(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer"
              >
                <option value="">Todos los estados</option>
                {ESTADOS.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
              {(filtroEstado || busqueda) && (
                <button
                  onClick={() => { onFiltroEstadoChange(''); onBusquedaChange(''); }}
                  className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-close-line mr-1"></i>Limpiar
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Contenido */}
      <div className="p-4">
        {children}
      </div>
    </main>
  );
}
