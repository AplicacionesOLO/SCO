import { supabase } from '../lib/supabase';
import { correspondenciaService } from './correspondenciaService';
import type { 
  Tarea, 
  TareaItem, 
  TareaConfigCampo, 
  TareaEncargado, 
  TareaColaborador,
  CreateTareaData,
  UpdateTareaData,
  TareaFilters,
  TareaStats
} from '../types/tarea';

/**
 * Servicio para gestión de tareas
 * Incluye multi-tienda, RLS y consecutivo automático
 */
class TareaService {
  
  // =====================================================
  // TAREAS - CRUD
  // =====================================================
  
  /**
   * Obtener lista de tareas con filtros
   */
  async getTareas(filters?: TareaFilters): Promise<Tarea[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');
      const { data: tiendaActual } = await supabase.from('usuario_tienda_actual').select('tienda_id').eq('usuario_id', user.id).single();
      if (!tiendaActual) throw new Error('No hay tienda asignada');

      // Construir query base - SIN JOIN a usuarios
      let query = supabase
        .from('tareas')
        .select(`
          *,
          items:tareas_items(
            id,
            producto_id,
            inventario_id,
            descripcion,
            cantidad,
            costo_unitario,
            costo_total
          ),
          personal_asignado:tareas_personal_asignado(
            id,
            colaborador_id,
            colaborador:tareas_colaboradores(
              id,
              nombre,
              email,
              telefono
            )
          )
        `)
        .eq('tienda_id', tiendaActual.tienda_id)
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (filters?.estado) {
        query = query.eq('estado', filters.estado);
      }

      if (filters?.fecha_desde) {
        query = query.gte('created_at', filters.fecha_desde);
      }

      if (filters?.fecha_hasta) {
        query = query.lte('created_at', filters.fecha_hasta);
      }

      if (filters?.busqueda) {
        query = query.or(`consecutivo.ilike.%${filters.busqueda}%,descripcion_breve.ilike.%${filters.busqueda}%`);
      }

      if (filters?.solicitante_id) {
        query = query.eq('solicitante_id', filters.solicitante_id);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener tarea por ID
   */
  async getTareaById(id: string): Promise<Tarea | null> {
    try {
      const { data, error } = await supabase
        .from('tareas')
        .select(`
          *,
          items:tareas_items(
            id,
            producto_id,
            inventario_id,
            descripcion,
            cantidad,
            costo_unitario,
            costo_total
          ),
          personal_asignado:tareas_personal_asignado(
            id,
            colaborador_id,
            colaborador:tareas_colaboradores(
              id,
              nombre,
              email,
              telefono
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      return data;
    } catch {
      return null;
    }
  }

  /**
   * Crear nueva tarea
   */
  async createTarea(data: CreateTareaData): Promise<Tarea> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');
      const { data: tiendaData } = await supabase.from('usuario_tienda_actual').select('tienda_id').eq('usuario_id', user.id).single();
      if (!tiendaData) throw new Error('No hay tienda asignada');

      // Crear tarea (el consecutivo se genera automáticamente por trigger)
      const { data: tarea, error: tareaError } = await supabase
        .from('tareas')
        .insert({
          tienda_id: tiendaData.tienda_id,
          solicitante_id: user.id,
          email_solicitante: user.email || '',
          datos_formulario: data.datos_formulario,
          cotizacion_id: data.cotizacion_id,
          fecha_estimada_entrega: data.fecha_estimada_entrega,
          cantidad_unidades: data.cantidad_unidades,
          descripcion_breve: data.descripcion_breve,
          estado: 'En Cola',
          total_costo: 0,
          created_by: user.id
        })
        .select()
        .single();

      if (tareaError) throw tareaError;

      const df = tarea.datos_formulario || {};

      // ── Disparar evento de correspondencia con entity_data completo ────────
      correspondenciaService.dispararEventoSeguro('tarea.creada', tiendaData.tienda_id, {
        tarea_id: tarea.id,
        consecutivo: tarea.consecutivo,
        descripcion_breve: tarea.descripcion_breve ?? '',
        estado: 'En Cola',
        email_solicitante: user.email ?? '',
        nombre_solicitante: user.user_metadata?.full_name ?? user.email ?? '',
        fecha_estimada_entrega: tarea.fecha_estimada_entrega ?? null,
        cantidad_unidades: tarea.cantidad_unidades ?? null,
        tienda_id: tiendaData.tienda_id,
        // Campos del formulario dinámico — escalares
        departamento_solicitante: df.departamento_solicitante ?? null,
        cliente: df.cliente ?? null,
        solicitud_epa: df.solicitud_epa ?? null,
        solicitud_cofersa: df.solicitud_cofersa ?? null,
        tipo_trabajo: df.tipo_trabajo ?? null,
        // Arrays de ítems del formulario dinámico (necesarios para renderizar tablas)
        items_tabla_simple: df.items_tabla_simple ?? [],
        items_tabla_completa: df.items_tabla_completa ?? [],
        // Auditoría
        created_at: tarea.created_at,
        cotizacion_id: tarea.cotizacion_id ?? null,
      });
      // ────────────────────────────────────────────────────────────────────

      // Notificación legacy (opcional)
      this.enviarNotificacionSegura(tarea.id, 'En Cola');

      return this.getTareaById(tarea.id) as Promise<Tarea>;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Actualizar tarea
   */
  async updateTarea(id: string, data: UpdateTareaData): Promise<Tarea> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Obtener estado anterior para notificación
      const { data: tareaAnterior } = await supabase
        .from('tareas')
        .select('estado, consecutivo, descripcion_breve, email_solicitante, fecha_estimada_entrega, tienda_id, datos_formulario')
        .eq('id', id)
        .single();

      const estadoAnterior = tareaAnterior?.estado;

      // Calcular total de costos si hay items
      let totalCosto = 0;
      if (data.items) {
        totalCosto = data.items.reduce((sum, item) => sum + (item.cantidad * item.costo_unitario), 0);
      }

      // Actualizar tarea principal
      const { error: tareaError } = await supabase
        .from('tareas')
        .update({
          fecha_estimada_entrega: data.fecha_estimada_entrega,
          cantidad_unidades: data.cantidad_unidades,
          descripcion_breve: data.descripcion_breve,
          cantidad_personas: data.cantidad_personas,
          fecha_inicio: data.fecha_inicio,
          fecha_cierre: data.fecha_cierre,
          entregado_a: data.entregado_a,
          estado: data.estado,
          total_costo: data.items ? totalCosto : undefined,
          updated_by: user.id
        })
        .eq('id', id);

      if (tareaError) throw tareaError;

      // Actualizar items si se proporcionan
      if (data.items) {
        await supabase.from('tareas_items').delete().eq('tarea_id', id);

        if (data.items.length > 0) {
          const items = data.items.map(item => ({
            tarea_id: id,
            producto_id: item.producto_id,
            inventario_id: item.inventario_id,
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            costo_unitario: item.costo_unitario
          }));

          const { error: itemsError } = await supabase
            .from('tareas_items')
            .insert(items);

          if (itemsError) throw itemsError;
        }
      }

      // Actualizar personal asignado si se proporciona
      if (data.personal_asignado) {
        await supabase.from('tareas_personal_asignado').delete().eq('tarea_id', id);

        if (data.personal_asignado.length > 0) {
          const asignaciones = data.personal_asignado.map(colaboradorId => ({
            tarea_id: id,
            colaborador_id: colaboradorId
          }));

          const { error: asignacionError } = await supabase
            .from('tareas_personal_asignado')
            .insert(asignaciones);

          if (asignacionError) throw asignacionError;
        }
      }

      // ── Disparar eventos de correspondencia según el cambio ────────────────
      if (data.estado && estadoAnterior && data.estado !== estadoAnterior && tareaAnterior?.tienda_id) {
        // Extraer campos del formulario dinámico del estado anterior
        const dfAnterior = (tareaAnterior.datos_formulario as any) || {};

        const entityDataEstado = {
          tarea_id: id,
          consecutivo: tareaAnterior.consecutivo ?? '',
          descripcion_breve: data.descripcion_breve ?? tareaAnterior.descripcion_breve ?? '',
          estado_anterior: estadoAnterior,
          estado_nuevo: data.estado,
          estado: data.estado,
          email_solicitante: tareaAnterior.email_solicitante ?? '',
          fecha_estimada_entrega: data.fecha_estimada_entrega ?? tareaAnterior.fecha_estimada_entrega ?? null,
          tienda_id: tareaAnterior.tienda_id,
          fecha_cambio: new Date().toISOString(),
          // Campos del formulario dinámico para contexto en el correo
          departamento_solicitante: dfAnterior.departamento_solicitante ?? null,
          cliente: dfAnterior.cliente ?? null,
          solicitud_epa: dfAnterior.solicitud_epa ?? null,
          solicitud_cofersa: dfAnterior.solicitud_cofersa ?? null,
          tipo_trabajo: dfAnterior.tipo_trabajo ?? null,
        };

        // Siempre disparar tarea.estado_cambiado (cubre TODOS los estados)
        correspondenciaService.dispararEventoSeguro('tarea.estado_cambiado', tareaAnterior.tienda_id, entityDataEstado);

        // Adicionalmente disparar tarea.finalizada cuando se marca como Finalizado
        if (data.estado === 'Finalizado') {
          correspondenciaService.dispararEventoSeguro('tarea.finalizada', tareaAnterior.tienda_id, entityDataEstado);
        }
      }
      // ────────────────────────────────────────────────────────────────────────

      // Notificación legacy
      if (data.estado && estadoAnterior && data.estado !== estadoAnterior) {
        this.enviarNotificacionCambioEstadoSegura(id, estadoAnterior, data.estado);
      }

      return this.getTareaById(id) as Promise<Tarea>;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Eliminar tarea
   */
  async deleteTarea(id: string): Promise<void> {
    const { error } = await supabase
      .from('tareas')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Error eliminando tarea: ${JSON.stringify(error)}`);
    }
  }

  /**
   * Obtener estadísticas de tareas
   */
  async getStats(): Promise<TareaStats> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');
      const { data: tiendaActual } = await supabase.from('usuario_tienda_actual').select('tienda_id').eq('usuario_id', user.id).single();
      if (!tiendaActual) throw new Error('No hay tienda asignada');

      const { data, error } = await supabase
        .from('tareas')
        .select('estado')
        .eq('tienda_id', tiendaActual.tienda_id);

      if (error) throw error;

      const stats: TareaStats = {
        total: data?.length || 0,
        en_cola: data?.filter(t => t.estado === 'En Cola').length || 0,
        en_proceso: data?.filter(t => t.estado === 'En Proceso').length || 0,
        produciendo: data?.filter(t => t.estado === 'Produciendo').length || 0,
        esperando_suministros: data?.filter(t => t.estado === 'Esperando suministros').length || 0,
        terminado: data?.filter(t => t.estado === 'Terminado').length || 0,
        finalizado: data?.filter(t => t.estado === 'Finalizado').length || 0
      };

      return stats;
    } catch (error) {
      throw error;
    }
  }

  // =====================================================
  // CONFIGURACIÓN DE CAMPOS
  // =====================================================

  /**
   * Obtener configuración de campos del formulario
   */
  async getConfigCampos(): Promise<TareaConfigCampo[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: tiendaActual } = await supabase
        .from('usuario_tienda_actual')
        .select('tienda_id')
        .eq('usuario_id', user.id)
        .single();

      if (!tiendaActual) throw new Error('No hay tienda asignada');

      const { data, error } = await supabase
        .from('tareas_config_campos')
        .select('*')
        .eq('tienda_id', tiendaActual.tienda_id)
        .eq('activo', true)
        .order('orden', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      throw error;
    }
  }

  // =====================================================
  // ENCARGADOS/LÍDERES
  // =====================================================

  /**
   * Obtener encargados de la tienda
   */
  async getEncargados(): Promise<TareaEncargado[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');
      const { data: tiendaActual } = await supabase.from('usuario_tienda_actual').select('tienda_id').eq('usuario_id', user.id).single();
      if (!tiendaActual) throw new Error('No hay tienda asignada');
      const { data, error } = await supabase.from('tareas_encargados').select('*').eq('tienda_id', tiendaActual.tienda_id);
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Agregar encargado
   */
  async addEncargado(usuarioId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');
      const { data: tiendaActual } = await supabase.from('usuario_tienda_actual').select('tienda_id').eq('usuario_id', user.id).single();
      if (!tiendaActual) throw new Error('No hay tienda asignada');
      const { error } = await supabase.from('tareas_encargados').insert({ tienda_id: tiendaActual.tienda_id, usuario_id: usuarioId, created_by: user.id });
      if (error) throw error;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Remover encargado
   */
  async removeEncargado(encargadoId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('tareas_encargados')
        .delete()
        .eq('id', encargadoId);

      if (error) throw error;
    } catch (error) {
      throw error;
    }
  }

  // =====================================================
  // COLABORADORES
  // =====================================================

  /**
   * Obtener colaboradores de la tienda
   */
  async getColaboradores(): Promise<TareaColaborador[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');
      const { data: tiendaActual } = await supabase.from('usuario_tienda_actual').select('tienda_id').eq('usuario_id', user.id).single();
      if (!tiendaActual) throw new Error('No hay tienda asignada');
      const { data, error } = await supabase.from('tareas_colaboradores').select('*').eq('tienda_id', tiendaActual.tienda_id).eq('activo', true).order('nombre', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Crear colaborador
   */
  async createColaborador(data: { nombre: string; email?: string; telefono?: string }): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');
      const { data: tiendaActual } = await supabase.from('usuario_tienda_actual').select('tienda_id').eq('usuario_id', user.id).single();
      if (!tiendaActual) throw new Error('No hay tienda asignada');
      const { error } = await supabase.from('tareas_colaboradores').insert({ tienda_id: tiendaActual.tienda_id, nombre: data.nombre, email: data.email, telefono: data.telefono, activo: true });
      if (error) throw error;
    } catch (error) {
      throw error;
    }
  }

  // =====================================================
  // NOTIFICACIONES
  // =====================================================

  /**
   * Enviar notificación de nueva tarea
   */
  private async enviarNotificacionNuevaTarea(tareaId: string, estadoNuevo: string): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase.functions.invoke('enviar-notificacion-tarea', {
        body: { tarea_id: tareaId, estado_nuevo: estadoNuevo }
      });
    } catch {
      // No lanzar error para no bloquear la creación de la tarea
    }
  }

  /**
   * Enviar notificación de cambio de estado
   */
  private async enviarNotificacionCambioEstado(
    tareaId: string,
    estadoAnterior: string,
    estadoNuevo: string
  ): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase.functions.invoke('enviar-notificacion-tarea', {
        body: { tarea_id: tareaId, estado_anterior: estadoAnterior, estado_nuevo: estadoNuevo }
      });
    } catch {
      // No lanzar error para no bloquear la actualización
    }
  }

  // =====================================================
  // NOTIFICACIONES (COMPLETAMENTE OPCIONALES)
  // =====================================================

  /**
   * Enviar notificación de forma segura (no bloquea si falla)
   */
  private enviarNotificacionSegura(tareaId: string, estadoNuevo: string): void {
    setTimeout(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        await supabase.functions.invoke('enviar-notificacion-tarea', {
          body: { tarea_id: tareaId, tipo: 'creacion', estado_nuevo: estadoNuevo }
        });
      } catch {
        // not critical
      }
    }, 0);
  }

  /**
   * Enviar notificación de cambio de estado de forma segura
   */
  private enviarNotificacionCambioEstadoSegura(
    tareaId: string,
    estadoAnterior: string,
    estadoNuevo: string
  ): void {
    setTimeout(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        await supabase.functions.invoke('enviar-notificacion-tarea', {
          body: { tarea_id: tareaId, tipo: 'cambio_estado', estado_anterior: estadoAnterior, estado_nuevo: estadoNuevo }
        });
      } catch {
        // not critical
      }
    }, 0);
  }

  // =====================================================
  // IMPORTAR DESDE COTIZACIÓN
  // =====================================================

  /**
   * Importar items desde cotización
   */
  async importarDesdeCotizacion(cotizacionId: string): Promise<TareaItem[]> {
    try {
      const { data, error } = await supabase
        .from('cotizacion_items')
        .select('*')
        .eq('cotizacion_id', cotizacionId);

      if (error) throw error;

      // Convertir items de cotización a items de tarea
      const items: TareaItem[] = (data || []).map(item => ({
        id: '',
        tarea_id: '',
        producto_id: item.producto_id,
        inventario_id: null,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        costo_unitario: item.precio_unitario,
        costo_total: item.subtotal,
        created_at: new Date().toISOString()
      }));

      return items;
    } catch (error) {
      throw error;
    }
  }
}

// Exportar instancia del servicio
const tareaService = new TareaService();
export default tareaService;
export { tareaService };
