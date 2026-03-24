import { supabase } from '../lib/supabase';

// ─── Tipos ─────────────────────────────────────────────────────────────────

export interface TareaReporteColaborador {
  id?: number;
  tarea_id: number;
  colaborador_id: number;
  tienda_id: string;
  fecha_trabajo: string;
  fecha_hora_inicio?: string | null;
  fecha_hora_fin?: string | null;
  horas_trabajadas?: number | null;
  unidades_procesadas?: number;
  observaciones?: string | null;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

export interface MiColaborador {
  id: number;
  nombre: string;
  email: string;
  tienda_id: string;
}

export interface TareaConReporte {
  id: number;
  consecutivo: string;
  estado: string;
  descripcion_breve?: string;
  cantidad_unidades?: number;
  fecha_inicio?: string | null;
  fecha_cierre?: string | null;
  datos_formulario: Record<string, any>;
  reporte?: TareaReporteColaborador;
}

export interface MetricaColaborador {
  colaborador_id: number;
  nombre: string;
  fecha_trabajo: string;
  horas_total: number;
  tareas_count: number;
  unidades_total: number;
  productividad_por_hora: number;
  cumple_estandar: boolean;   // >= 7.5h
  alerta: 'ok' | 'bajo' | 'exceso' | 'sospechoso';
}

<<<<<<< HEAD
export interface DetalleReporteExport {
  colaborador_id: number;
  nombre: string;
  fecha_trabajo: string;
  consecutivo: string;
  tipo_trabajo: string;
  descripcion: string;
  hora_inicio: string;
  hora_fin: string;
  horas: number;
  unidades: number;
  observaciones: string;
}

=======
>>>>>>> d2a8ce309b31eed137b76e3d57cfe5bec6c176a0
// ─── Servicio ───────────────────────────────────────────────────────────────

class ReporteDiaService {
  /**
   * Buscar el registro de colaborador del usuario actual por email
   */
  async getMiColaborador(): Promise<MiColaborador | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return null;

      const { data: tiendaActual } = await supabase
        .from('usuario_tienda_actual')
        .select('tienda_id')
        .eq('usuario_id', user.id)
        .maybeSingle();

      if (!tiendaActual) return null;

      const { data, error } = await supabase
        .from('tareas_colaboradores')
        .select('id, nombre, email, tienda_id')
        .eq('tienda_id', tiendaActual.tienda_id)
        .eq('activo', true)
        .ilike('email', user.email)
        .maybeSingle();

      if (error || !data) return null;

      return data as MiColaborador;
    } catch {
      return null;
    }
  }

  /**
   * Obtener las tareas asignadas al colaborador junto con sus reportes
   */
  async getMisTareas(colaboradorId: number): Promise<TareaConReporte[]> {
    try {
      // Obtener IDs de tareas asignadas
      const { data: asignaciones, error: asignError } = await supabase
        .from('tareas_personal_asignado')
        .select('tarea_id')
        .eq('colaborador_id', colaboradorId);

      if (asignError || !asignaciones?.length) return [];

      const tareaIds = asignaciones.map((a) => a.tarea_id);

      // Traer tareas (excluir Finalizado para no saturar)
      const { data: tareas, error: tareasError } = await supabase
        .from('tareas')
        .select('id, consecutivo, estado, descripcion_breve, cantidad_unidades, fecha_inicio, fecha_cierre, datos_formulario')
        .in('id', tareaIds)
        .order('created_at', { ascending: false });

      if (tareasError) throw tareasError;

      // Traer reportes existentes de este colaborador
      const { data: reportes } = await supabase
        .from('tareas_reportes_colaboradores')
        .select('*')
        .eq('colaborador_id', colaboradorId)
        .in('tarea_id', tareaIds);

      return (tareas || []).map((tarea) => ({
        ...tarea,
        reporte: reportes?.find((r) => r.tarea_id === tarea.id),
      }));
    } catch {
      return [];
    }
  }

  /**
   * Guardar o actualizar un reporte
   */
  async guardarReporte(
    data: Omit<TareaReporteColaborador, 'created_at' | 'updated_at' | 'created_by'>
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const horas = this.calcularHoras(data.fecha_hora_inicio, data.fecha_hora_fin);

    const payload = {
      tarea_id: data.tarea_id,
      colaborador_id: data.colaborador_id,
      tienda_id: data.tienda_id,
      fecha_trabajo: data.fecha_trabajo,
      fecha_hora_inicio: data.fecha_hora_inicio || null,
      fecha_hora_fin: data.fecha_hora_fin || null,
      horas_trabajadas: horas ?? null,
      unidades_procesadas: data.unidades_procesadas ?? 0,
      observaciones: data.observaciones || null,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    if (data.id) {
      const { error } = await supabase
        .from('tareas_reportes_colaboradores')
        .update(payload)
        .eq('id', data.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('tareas_reportes_colaboradores')
        .insert({ ...payload, created_by: user.id });
      if (error) throw error;
    }
  }

  /**
   * Calcular horas entre dos timestamps
   */
  calcularHoras(inicio?: string | null, fin?: string | null): number | undefined {
    if (!inicio || !fin) return undefined;
    const diff = new Date(fin).getTime() - new Date(inicio).getTime();
    if (diff <= 0) return undefined;
    return Math.round((diff / (1000 * 60 * 60)) * 100) / 100;
  }

  /**
   * Extraer tipo de solicitud legible desde datos_formulario
   */
  extraerTipoSolicitud(datos: Record<string, any>): string {
    const parts: string[] = [];
    if (datos.departamento_solicitante) parts.push(datos.departamento_solicitante);
    if (datos.cliente) parts.push(datos.cliente);
    if (datos.solicitud_epa) parts.push(datos.solicitud_epa);
    if (datos.solicitud_cofersa) parts.push(datos.solicitud_cofersa);
    if (datos.tipo_trabajo) parts.push(datos.tipo_trabajo);
    return parts.join(' / ') || 'Sin tipo definido';
  }

  /**
   * Formatear datetime-local value para un input
   */
  toDatetimeLocal(isoString?: string | null): string {
    if (!isoString) return '';
    const d = new Date(isoString);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  /**
   * Obtener métricas de todos los colaboradores de la tienda (para Admin/Supervisor)
   */
  async getMetricasColaboradores(
    tiendaId: string,
    fechaDesde: string,
    fechaHasta: string
  ): Promise<MetricaColaborador[]> {
    try {
      const { data: reportes, error } = await supabase
        .from('tareas_reportes_colaboradores')
        .select(`
          colaborador_id,
          fecha_trabajo,
          horas_trabajadas,
          unidades_procesadas
        `)
        .eq('tienda_id', tiendaId)
        .gte('fecha_trabajo', fechaDesde)
        .lte('fecha_trabajo', fechaHasta);

      if (error || !reportes?.length) return [];

      // Traer nombres de colaboradores
      const colaboradorIds = [...new Set(reportes.map((r) => r.colaborador_id))];
      const { data: colaboradores } = await supabase
        .from('tareas_colaboradores')
        .select('id, nombre')
        .in('id', colaboradorIds);

      const nombreMap: Record<number, string> = {};
      (colaboradores || []).forEach((c) => { nombreMap[c.id] = c.nombre; });

      // Agrupar por colaborador + fecha
      const mapaMetricas: Record<string, MetricaColaborador> = {};

      reportes.forEach((r) => {
        const key = `${r.colaborador_id}::${r.fecha_trabajo}`;
        if (!mapaMetricas[key]) {
          mapaMetricas[key] = {
            colaborador_id: r.colaborador_id,
            nombre: nombreMap[r.colaborador_id] || `Colab. #${r.colaborador_id}`,
            fecha_trabajo: r.fecha_trabajo,
            horas_total: 0,
            tareas_count: 0,
            unidades_total: 0,
            productividad_por_hora: 0,
            cumple_estandar: false,
            alerta: 'bajo',
          };
        }
        const m = mapaMetricas[key];
        m.horas_total     += r.horas_trabajadas    || 0;
        m.tareas_count    += 1;
        m.unidades_total  += r.unidades_procesadas || 0;
      });

      const ESTANDAR = 7.5;
      return Object.values(mapaMetricas).map((m) => {
        const hrs = Math.round(m.horas_total * 100) / 100;
        const prod = hrs > 0 ? Math.round((m.unidades_total / hrs) * 100) / 100 : 0;
        let alerta: MetricaColaborador['alerta'] = 'ok';
        if (hrs < 1)              alerta = 'bajo';
        else if (hrs < ESTANDAR)  alerta = 'bajo';
        else if (hrs > 10)        alerta = 'sospechoso';  // más de 10h, posible error
        return { ...m, horas_total: hrs, productividad_por_hora: prod, cumple_estandar: hrs >= ESTANDAR, alerta };
      }).sort((a, b) => a.nombre.localeCompare(b.nombre));
    } catch {
      return [];
    }
  }
<<<<<<< HEAD

  /**
   * Obtener detalle completo para exportación (incluye tipo_trabajo por tarea)
   */
  async getDetalleCompletoParaExport(
    tiendaId: string,
    fechaDesde: string,
    fechaHasta: string
  ): Promise<DetalleReporteExport[]> {
    try {
      const { data: reportes, error } = await supabase
        .from('tareas_reportes_colaboradores')
        .select(`
          colaborador_id,
          fecha_trabajo,
          fecha_hora_inicio,
          fecha_hora_fin,
          horas_trabajadas,
          unidades_procesadas,
          observaciones,
          tarea_id
        `)
        .eq('tienda_id', tiendaId)
        .gte('fecha_trabajo', fechaDesde)
        .lte('fecha_trabajo', fechaHasta);

      if (error || !reportes?.length) return [];

      // Traer nombres de colaboradores
      const colaboradorIds = [...new Set(reportes.map((r) => r.colaborador_id))];
      const { data: colaboradores } = await supabase
        .from('tareas_colaboradores')
        .select('id, nombre')
        .in('id', colaboradorIds);

      const nombreMap: Record<number, string> = {};
      (colaboradores || []).forEach((c) => { nombreMap[c.id] = c.nombre; });

      // Traer datos de las tareas
      const tareaIds = [...new Set(reportes.map((r) => r.tarea_id))];
      const { data: tareas } = await supabase
        .from('tareas')
        .select('id, consecutivo, descripcion_breve, datos_formulario')
        .in('id', tareaIds);

      const tareaMap: Record<number, { consecutivo: string; descripcion: string; datos_formulario: Record<string, any> }> = {};
      (tareas || []).forEach((t) => {
        tareaMap[t.id] = {
          consecutivo: t.consecutivo || '',
          descripcion: t.descripcion_breve || '',
          datos_formulario: t.datos_formulario || {},
        };
      });

      const formatTime = (iso?: string | null): string => {
        if (!iso) return '';
        const d = new Date(iso);
        const hh = d.getHours().toString().padStart(2, '0');
        const mm = d.getMinutes().toString().padStart(2, '0');
        return `${hh}:${mm}`;
      };

      return reportes.map((r) => {
        const tarea = tareaMap[r.tarea_id] || { consecutivo: '', descripcion: '', datos_formulario: {} };
        const df = tarea.datos_formulario;
        const tipoTrabajo = df.tipo_trabajo || df.solicitud_epa || df.solicitud_cofersa || df.departamento_solicitante || '—';

        return {
          colaborador_id: r.colaborador_id,
          nombre: nombreMap[r.colaborador_id] || `Colab. #${r.colaborador_id}`,
          fecha_trabajo: r.fecha_trabajo,
          consecutivo: tarea.consecutivo,
          tipo_trabajo: tipoTrabajo,
          descripcion: tarea.descripcion,
          hora_inicio: formatTime(r.fecha_hora_inicio),
          hora_fin: formatTime(r.fecha_hora_fin),
          horas: r.horas_trabajadas || 0,
          unidades: r.unidades_procesadas || 0,
          observaciones: r.observaciones || '',
        };
      }).sort((a, b) => a.nombre.localeCompare(b.nombre) || a.fecha_trabajo.localeCompare(b.fecha_trabajo));
    } catch {
      return [];
    }
  }
=======
>>>>>>> d2a8ce309b31eed137b76e3d57cfe5bec6c176a0
}

export const reporteDiaService = new ReporteDiaService();
