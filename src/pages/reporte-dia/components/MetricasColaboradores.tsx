import { useState, useEffect, useCallback } from 'react';
import { reporteDiaService, type MetricaColaborador } from '../../../services/reporteDiaService';
<<<<<<< HEAD
import { exportarMetricasExcel } from '../../../utils/exportMetricasExcel';
=======
>>>>>>> d2a8ce309b31eed137b76e3d57cfe5bec6c176a0

interface Props {
  tiendaId: string;
}

const ESTANDAR_HORAS = 7.5;

function AlertaBadge({ alerta, horas }: { alerta: MetricaColaborador['alerta']; horas: number }) {
  if (alerta === 'sospechoso') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 whitespace-nowrap">
        <i className="ri-error-warning-line"></i> Revisar ({horas}h)
      </span>
    );
  }
  if (alerta === 'bajo') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 whitespace-nowrap">
        <i className="ri-arrow-down-line"></i> Bajo ({horas}h)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 whitespace-nowrap">
      <i className="ri-check-line"></i> OK ({horas}h)
    </span>
  );
}

function BarraProgreso({ horas }: { horas: number }) {
  const pct = Math.min((horas / ESTANDAR_HORAS) * 100, 130);
  const color =
    horas >= ESTANDAR_HORAS && horas <= 10
      ? 'bg-emerald-500'
      : horas > 10
      ? 'bg-orange-400'
      : 'bg-red-400';

  return (
    <div className="w-full bg-gray-100 rounded-full h-2 relative overflow-hidden">
      <div
        className={`${color} h-2 rounded-full transition-all duration-500`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
      {/* Marca del estándar */}
      <div
        className="absolute top-0 bottom-0 w-px bg-gray-400"
        style={{ left: '100%', transform: 'translateX(-1px)' }}
        title="Estándar 7.5h"
      />
    </div>
  );
}

export default function MetricasColaboradores({ tiendaId }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const [fechaDesde, setFechaDesde] = useState(today);
  const [fechaHasta, setFechaHasta] = useState(today);
  const [metricas, setMetricas] = useState<MetricaColaborador[]>([]);
  const [loading, setLoading] = useState(false);
  const [vistaFecha, setVistaFecha] = useState<'hoy' | 'semana' | 'personalizado'>('hoy');
<<<<<<< HEAD
  const [exportando, setExportando] = useState(false);
=======
>>>>>>> d2a8ce309b31eed137b76e3d57cfe5bec6c176a0

  const cargar = useCallback(async (desde: string, hasta: string) => {
    setLoading(true);
    try {
      const data = await reporteDiaService.getMetricasColaboradores(tiendaId, desde, hasta);
      setMetricas(data);
    } finally {
      setLoading(false);
    }
  }, [tiendaId]);

  useEffect(() => {
    cargar(fechaDesde, fechaHasta);
  }, [cargar, fechaDesde, fechaHasta]);

  const aplicarRango = (rango: 'hoy' | 'semana') => {
    setVistaFecha(rango);
    const d = new Date();
    if (rango === 'hoy') {
      const iso = d.toISOString().split('T')[0];
      setFechaDesde(iso);
      setFechaHasta(iso);
    } else {
      const dia = d.getDay() || 7;
      const lunes = new Date(d);
      lunes.setDate(d.getDate() - dia + 1);
      const viernes = new Date(lunes);
      viernes.setDate(lunes.getDate() + 4);
      setFechaDesde(lunes.toISOString().split('T')[0]);
      setFechaHasta(viernes.toISOString().split('T')[0]);
    }
  };

<<<<<<< HEAD
  const handleExport = async () => {
    setExportando(true);
    try {
      const detalle = await reporteDiaService.getDetalleCompletoParaExport(tiendaId, fechaDesde, fechaHasta);
      exportarMetricasExcel(detalle, fechaDesde, fechaHasta);
    } finally {
      setExportando(false);
    }
  };

=======
>>>>>>> d2a8ce309b31eed137b76e3d57cfe5bec6c176a0
  // Totales del resumen superior
  const totalColab       = metricas.length;
  const cumplenEstandar  = metricas.filter((m) => m.cumple_estandar).length;
  const bajoEstandar     = metricas.filter((m) => m.alerta === 'bajo').length;
  const sospechosos      = metricas.filter((m) => m.alerta === 'sospechoso').length;
  const promedioHoras    = totalColab > 0
    ? Math.round((metricas.reduce((s, m) => s + m.horas_total, 0) / totalColab) * 100) / 100
    : 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 flex items-center justify-center bg-violet-100 rounded-lg">
            <i className="ri-bar-chart-grouped-line text-violet-600 text-lg"></i>
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Métricas de Equipo</h2>
            <p className="text-xs text-gray-500">Estándar: {ESTANDAR_HORAS}h diarias por colaborador</p>
          </div>
<<<<<<< HEAD
=======
          <span className="ml-1 px-2 py-0.5 bg-violet-100 text-violet-700 text-xs font-medium rounded-full">
            Solo Admin / Valor Agregado
          </span>
>>>>>>> d2a8ce309b31eed137b76e3d57cfe5bec6c176a0
        </div>

        {/* Filtros de rango */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
            {(['hoy', 'semana'] as const).map((r) => (
              <button
                key={r}
                onClick={() => aplicarRango(r)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer whitespace-nowrap ${
                  vistaFecha === r ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {r === 'hoy' ? 'Hoy' : 'Esta semana'}
              </button>
            ))}
            <button
              onClick={() => setVistaFecha('personalizado')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer whitespace-nowrap ${
                vistaFecha === 'personalizado' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Rango
            </button>
          </div>

          {vistaFecha === 'personalizado' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-violet-500"
              />
              <span className="text-xs text-gray-400">–</span>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-violet-500"
              />
            </div>
          )}

          <button
            onClick={() => cargar(fechaDesde, fechaHasta)}
            className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg cursor-pointer whitespace-nowrap transition-colors flex items-center gap-1.5"
          >
            <i className="ri-refresh-line"></i> Actualizar
          </button>
<<<<<<< HEAD

          {/* Botón Exportar Excel */}
          <button
            onClick={handleExport}
            disabled={exportando || metricas.length === 0}
            className={`px-3 py-1.5 text-xs rounded-lg cursor-pointer whitespace-nowrap transition-colors flex items-center gap-1.5 font-medium ${
              metricas.length === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : exportando
                ? 'bg-emerald-100 text-emerald-600 cursor-wait'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {exportando ? (
              <>
                <i className="ri-loader-4-line animate-spin"></i> Generando...
              </>
            ) : (
              <>
                <i className="ri-file-excel-2-line"></i> Exportar .xlsx
              </>
            )}
          </button>
=======
>>>>>>> d2a8ce309b31eed137b76e3d57cfe5bec6c176a0
        </div>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-5 divide-x divide-gray-100 border-b border-gray-100">
        {[
          { label: 'Colaboradores', val: totalColab, icon: 'ri-team-line', color: 'text-gray-700' },
          { label: 'Cumplen estándar', val: cumplenEstandar, icon: 'ri-checkbox-circle-line', color: 'text-emerald-600' },
          { label: 'Bajo estándar', val: bajoEstandar, icon: 'ri-arrow-down-circle-line', color: 'text-red-500' },
          { label: 'Revisar registros', val: sospechosos, icon: 'ri-alert-line', color: 'text-orange-500' },
          { label: 'Promedio hrs/día', val: `${promedioHoras}h`, icon: 'ri-time-line', color: promedioHoras >= ESTANDAR_HORAS ? 'text-emerald-600' : 'text-red-500' },
        ].map((k) => (
          <div key={k.label} className="px-5 py-3 flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <i className={`${k.icon} text-sm`}></i>
              {k.label}
            </div>
            <p className={`text-2xl font-bold ${k.color}`}>{k.val}</p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <i className="ri-loader-4-line text-3xl animate-spin mr-2"></i>
          <span className="text-sm">Cargando métricas...</span>
        </div>
      ) : metricas.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-gray-400 flex-col gap-2">
          <i className="ri-bar-chart-2-line text-4xl"></i>
          <p className="text-sm">No hay registros en el período seleccionado</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {[
                  { label: 'Colaborador', cls: 'w-[200px]' },
                  { label: 'Fecha', cls: 'w-[110px]' },
                  { label: 'Horas reg.', cls: 'w-[90px] text-center' },
                  { label: 'Progreso vs 7.5h', cls: 'w-[180px]' },
                  { label: 'Tareas', cls: 'w-[70px] text-center' },
                  { label: 'Unidades', cls: 'w-[80px] text-center' },
                  { label: 'Uds/hora', cls: 'w-[80px] text-center' },
                  { label: 'Estado', cls: 'w-[140px]' },
                ].map((h) => (
                  <th
                    key={h.label}
                    className={`px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap ${h.cls}`}
                  >
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {metricas.map((m, idx) => {
                const rowBg =
                  m.alerta === 'sospechoso'
                    ? 'bg-orange-50/40 hover:bg-orange-50'
                    : m.alerta === 'bajo'
                    ? 'bg-red-50/30 hover:bg-red-50'
                    : 'hover:bg-gray-50/80';

                return (
                  <tr key={idx} className={`transition-colors ${rowBg}`}>
                    {/* Colaborador */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 flex items-center justify-center rounded-full bg-violet-100 text-violet-700 text-xs font-bold shrink-0">
                          {m.nombre.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-800 truncate max-w-[150px]">{m.nombre}</span>
                      </div>
                    </td>
                    {/* Fecha */}
                    <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(m.fecha_trabajo + 'T12:00:00').toLocaleDateString('es-CR', {
                        weekday: 'short', day: '2-digit', month: 'short'
                      })}
                    </td>
                    {/* Horas */}
                    <td className="px-3 py-2.5 text-center">
                      <span className={`font-semibold ${m.cumple_estandar ? 'text-emerald-700' : 'text-red-600'}`}>
                        {m.horas_total}h
                      </span>
                    </td>
                    {/* Barra progreso */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <BarraProgreso horas={m.horas_total} />
                        <span className="text-xs text-gray-400 whitespace-nowrap w-[34px] text-right">
                          {Math.round((m.horas_total / ESTANDAR_HORAS) * 100)}%
                        </span>
                      </div>
                    </td>
                    {/* Tareas */}
                    <td className="px-3 py-2.5 text-center text-gray-700 font-medium">{m.tareas_count}</td>
                    {/* Unidades */}
                    <td className="px-3 py-2.5 text-center text-gray-700">{m.unidades_total.toLocaleString()}</td>
                    {/* Productividad */}
                    <td className="px-3 py-2.5 text-center">
                      <span className="text-gray-600">{m.productividad_por_hora}</span>
                    </td>
                    {/* Estado */}
                    <td className="px-3 py-2.5">
                      <AlertaBadge alerta={m.alerta} horas={m.horas_total} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Leyenda */}
      <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-6 flex-wrap">
        <span className="text-xs text-gray-400 font-medium">Leyenda:</span>
        <span className="flex items-center gap-1.5 text-xs text-emerald-600"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> ≥ 7.5h — cumple</span>
        <span className="flex items-center gap-1.5 text-xs text-red-500"><span className="w-2 h-2 rounded-full bg-red-400 inline-block"></span> &lt; 7.5h — bajo estándar</span>
        <span className="flex items-center gap-1.5 text-xs text-orange-500"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block"></span> &gt; 10h — revisar veracidad del registro</span>
      </div>
    </div>
  );
}
