import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/feature/Sidebar';
import TopBar from '../../components/feature/TopBar';
import ReporteDiaLayout from './components/ReporteDiaLayout';
import TareaReporteCard from './components/TareaReporteCard';
import ColaboradorNoEncontrado from './components/ColaboradorNoEncontrado';
import MetricasColaboradores from './components/MetricasColaboradores';
import { reporteDiaService, type MiColaborador, type TareaConReporte } from '../../services/reporteDiaService';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

type TabId = 'mis-tareas' | 'metricas';

const TABLE_HEADERS = [
  { label: '#', cls: 'w-[110px]' },
  { label: 'Estado', cls: 'w-[130px]' },
  { label: 'Tipo de solicitud', cls: 'w-[150px]' },
  { label: 'Descripción', cls: 'w-[180px]' },
  { label: 'Uds. Totales', cls: 'w-[80px] text-center' },
  { label: 'Inicio tarea', cls: 'w-[130px]' },
  { label: 'Cierre tarea', cls: 'w-[130px]' },
  { label: 'Mi inicio real', cls: 'w-[165px]' },
  { label: 'Mi cierre real', cls: 'w-[165px]' },
  { label: 'Hrs', cls: 'w-[60px] text-center' },
  { label: 'Mis uds.', cls: 'w-[80px]' },
  { label: 'Observación', cls: 'w-[180px]' },
  { label: '', cls: 'w-[110px]' },
];

export default function ReporteDiaPage() {
  const { profile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [colaborador, setColaborador] = useState<MiColaborador | null>(null);
  const [tiendaId, setTiendaId] = useState<string | null>(null);
  const [tareas, setTareas] = useState<TareaConReporte[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [busqueda, setBusqueda] = useState<string>('');
  const [tabActivo, setTabActivo] = useState<TabId>('mis-tareas');

  const puedeVerMetricas =
    profile?.rol === 'Admin' || profile?.rol === 'Valor Agregado';

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const colab = await reporteDiaService.getMiColaborador();
      setColaborador(colab);

      if (colab) {
        setTiendaId(colab.tienda_id);
        const tareasData = await reporteDiaService.getMisTareas(colab.id);
        setTareas(tareasData);
      } else {
        const { data: tiendaActual } = await supabase
          .from('usuario_tienda_actual')
          .select('tienda_id')
          .maybeSingle();
        if (tiendaActual) setTiendaId(tiendaActual.tienda_id);
      }
    } catch {
      setError('Error al cargar los datos. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleReporteSaved = useCallback(() => {
    cargarDatos();
  }, [cargarDatos]);

  const tareasFiltradas = tareas.filter((t) => {
    const matchEstado = !filtroEstado || t.estado === filtroEstado;
    const matchBusqueda =
      !busqueda ||
      t.consecutivo.toLowerCase().includes(busqueda.toLowerCase()) ||
      (t.descripcion_breve || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      reporteDiaService.extraerTipoSolicitud(t.datos_formulario).toLowerCase().includes(busqueda.toLowerCase());
    return matchEstado && matchBusqueda;
  });

  const tareasConReporte = tareas.filter((t) => t.reporte).length;
  const tareasSinReporte = tareas.length - tareasConReporte;

  const renderMisTareas = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3 text-gray-500">
            <i className="ri-loader-4-line text-4xl animate-spin text-gray-400"></i>
            <p className="text-sm">Cargando tareas asignadas...</p>
          </div>
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3 text-red-500">
            <i className="ri-error-warning-line text-4xl"></i>
            <p className="text-sm">{error}</p>
            <button
              onClick={cargarDatos}
              className="mt-2 px-4 py-2 text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100 cursor-pointer whitespace-nowrap"
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }
    if (!colaborador) {
      return puedeVerMetricas ? (
        <div className="flex items-center justify-center py-24 flex-col gap-3 text-gray-400">
          <i className="ri-information-line text-4xl"></i>
          <p className="text-sm text-gray-500">No estás registrado como colaborador. Usa la pestaña <strong>Métricas de Equipo</strong> para ver el resumen del equipo.</p>
        </div>
      ) : (
        <ColaboradorNoEncontrado />
      );
    }
    if (tareasFiltradas.length === 0) {
      return (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <i className="ri-task-line text-5xl"></i>
            <p className="text-base font-medium text-gray-600">
              {tareas.length === 0
                ? 'No tienes tareas asignadas actualmente'
                : 'No hay tareas que coincidan con los filtros'}
            </p>
            {(filtroEstado || busqueda) && (
              <button
                onClick={() => { setFiltroEstado(''); setBusqueda(''); }}
                className="text-sm text-emerald-600 hover:underline cursor-pointer"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>
      );
    }
    return (
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {TABLE_HEADERS.map((h) => (
                <th
                  key={h.label || 'action'}
                  className={`px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap ${h.cls}`}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tareasFiltradas.map((tarea) => (
              <TareaReporteCard
                key={tarea.id}
                tarea={tarea}
                colaboradorId={colaborador.id}
                tiendaId={colaborador.tienda_id}
                onSaved={handleReporteSaved}
              />
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />

        <ReporteDiaLayout
          colaborador={colaborador}
          totalTareas={tareas.length}
          tareasConReporte={tareasConReporte}
          tareasSinReporte={tareasSinReporte}
          filtroEstado={filtroEstado}
          busqueda={busqueda}
          onFiltroEstadoChange={setFiltroEstado}
          onBusquedaChange={setBusqueda}
          onRefresh={cargarDatos}
          puedeVerMetricas={puedeVerMetricas}
          tabActivo={tabActivo}
          onTabChange={setTabActivo}
        >
          {tabActivo === 'metricas' && puedeVerMetricas && tiendaId ? (
            <MetricasColaboradores tiendaId={tiendaId} />
          ) : (
            renderMisTareas()
          )}
        </ReporteDiaLayout>
      </div>
    </div>
  );
}
