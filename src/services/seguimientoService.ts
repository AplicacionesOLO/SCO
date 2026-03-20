import { supabase } from '../lib/supabase';
import { PedidoSeguimiento, SeguimientoEstado, SeguimientoTransicion, SeguimientoStats } from '../types/seguimiento';

class SeguimientoService {
  // Método para obtener solicitudes (alias de getSeguimientos)
  async getSolicitudes(filters?: any): Promise<PedidoSeguimiento[]> {
    return this.getSeguimientos(filters);
  }

  async getSeguimientos(filters?: any): Promise<PedidoSeguimiento[]> {
    try {
      let query = supabase
        .from('solicitudes')
        .select('*')
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (filters?.estado_id) {
        query = query.eq('estado_id', filters.estado_id);
      }

      if (filters?.busqueda) {
        query = query.or(`codigo.ilike.%${filters.busqueda}%,descripcion.ilike.%${filters.busqueda}%`);
      }

      if (filters?.fecha_desde) {
        query = query.gte('created_at', filters.fecha_desde);
      }

      if (filters?.fecha_hasta) {
        query = query.lte('created_at', filters.fecha_hasta);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Obtener los estados por separado
      const estadosMap = new Map<string, SeguimientoEstado>();
      const { data: estadosData } = await supabase.from('solicitud_estados').select('*');
      if (estadosData) estadosData.forEach((estado: any) => { estadosMap.set(estado.id, estado); });

      // Mapear los datos con los estados
      const seguimientos = (data || []).map((solicitud: any) => {
        const estado = estadosMap.get(solicitud.estado_id);
        return { ...solicitud, estado: estado || { id: solicitud.estado_id, nombre: solicitud.estado_id, color: '#6B7280', orden: 0 } };
      });

      return seguimientos;
    } catch {
      throw new Error('Error obteniendo seguimientos');
    }
  }

  async getSolicitudById(id: string): Promise<PedidoSeguimiento | null> {
    try {
      const { data, error } = await supabase.from('solicitudes').select('*').eq('id', id).single();
      if (error) throw error;

      // Obtener el estado
      const { data: estadoData } = await supabase
        .from('solicitud_estados')
        .select('*')
        .eq('id', data.estado_id)
        .single();

      return {
        ...data,
        estado: estadoData || {
          id: data.estado_id,
          nombre: data.estado_id,
          color: '#6B7280',
          orden: 0
        }
      };
    } catch {
      return null;
    }
  }

  async getEstados(): Promise<SeguimientoEstado[]> {
    try {
      const { data, error } = await supabase.from('solicitud_estados').select('*').order('orden');
      if (error) throw error;

      return data || [];
    } catch {
      throw new Error('Error obteniendo estados');
    }
  }

  async cambiarEstado(solicitudId: string, nuevoEstadoId: string, observaciones?: string): Promise<void> {
    try {
      // Obtener solicitud actual
      const { data: solicitud } = await supabase
        .from('solicitudes')
        .select('estado_id')
        .eq('id', solicitudId)
        .single();

      if (!solicitud) {
        throw new Error('Solicitud no encontrada');
      }

      // Actualizar estado
      const { error: updateError } = await supabase
        .from('solicitudes')
        .update({
          estado_id: nuevoEstadoId,
          updated_at: new Date().toISOString()
        })
        .eq('id', solicitudId);

      if (updateError) throw updateError;

      // Registrar en historial (si existe la tabla)
      try {
        await supabase
          .from('solicitud_historial')
          .insert({
            solicitud_id: solicitudId,
            estado_anterior_id: solicitud.estado_id,
            estado_nuevo_id: nuevoEstadoId,
            observaciones: observaciones || null,
            created_at: new Date().toISOString()
          });
      } catch {
        // historial no crítico
      }
    } catch (error) {
      throw error;
    }
  }

  async getHistorialEstados(solicitudId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('solicitud_historial')
        .select('*')
        .eq('solicitud_id', solicitudId)
        .order('created_at', { ascending: false });

      if (error) return [];

      return data || [];
    } catch {
      return [];
    }
  }

  async getTransiciones(): Promise<SeguimientoTransicion[]> {
    try {
      // Obtener estados ordenados
      const estados = await this.getEstados();
      
      // Generar transiciones secuenciales basadas en el orden
      const transiciones: SeguimientoTransicion[] = [];
      
      for (let i = 0; i < estados.length - 1; i++) {
        transiciones.push({
          id: `${estados[i].id}-${estados[i + 1].id}`,
          estado_origen: estados[i].id,
          estado_destino: estados[i + 1].id,
          nombre: `${estados[i].nombre} → ${estados[i + 1].nombre}`,
          requiere_comentario: false,
          activo: true
        });
      }

      return transiciones;
    } catch (error) {
      throw error;
    }
  }

  async updateEstado(data: {
    seguimiento_id: string;
    estado_nuevo: string;
    comentario?: string;
    usuario_id?: string;
  }): Promise<void> {
    return this.cambiarEstado(data.seguimiento_id, data.estado_nuevo, data.comentario);
  }

  async getStats(): Promise<SeguimientoStats> {
    try {
      // Obtener todos los seguimientos
      const { data: solicitudes, error } = await supabase.from('solicitudes').select('estado_id, created_at');
      if (error) throw error;

      // Calcular estadísticas
      const total = solicitudes?.length || 0;
      const enProceso = solicitudes?.filter(s => 
        s.estado_id !== 'completado' && s.estado_id !== 'cancelado'
      ).length || 0;
      const completados = solicitudes?.filter(s => 
        s.estado_id === 'completado'
      ).length || 0;
      const atrasados = solicitudes?.filter(s => {
        const dias = Math.floor((Date.now() - new Date(s.created_at).getTime()) / (1000 * 60 * 60 * 24));
        return dias > 7 && s.estado_id !== 'completado';
      }).length || 0;

      return {
        total,
        en_proceso: enProceso,
        completados,
        atrasados
      };
    } catch {
      throw new Error('Error obteniendo estadísticas');
    }
  }
}

const seguimientoService = new SeguimientoService();
export default seguimientoService;
export { seguimientoService };
