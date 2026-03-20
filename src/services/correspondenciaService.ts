import { supabase } from '../lib/supabase';
import type {
  CorrespondenciaPlantilla,
  CorrespondenciaRegla,
  CorrespondenciaHistorial,
  CreatePlantillaData,
  CreateReglaData,
  EnvioManualPayload,
  HistorialFiltros,
  CorrespondenciaStats,
} from '../types/correspondencia';

const SUPABASE_URL = import.meta.env.VITE_PUBLIC_SUPABASE_URL as string;

// ─── PLANTILLAS ───────────────────────────────────────────────

export const correspondenciaService = {
  // ---------- Plantillas ----------
  async getPlantillas(): Promise<CorrespondenciaPlantilla[]> {
    const { data, error } = await supabase
      .from('correspondencia_plantillas')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async createPlantilla(payload: CreatePlantillaData): Promise<CorrespondenciaPlantilla> {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('correspondencia_plantillas')
      .insert({ ...payload, created_by: user?.id })
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async updatePlantilla(id: number, payload: Partial<CreatePlantillaData>): Promise<CorrespondenciaPlantilla> {
    const { data, error } = await supabase
      .from('correspondencia_plantillas')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async deletePlantilla(id: number): Promise<void> {
    const { error } = await supabase
      .from('correspondencia_plantillas')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async togglePlantilla(id: number, activo: boolean): Promise<void> {
    const { error } = await supabase
      .from('correspondencia_plantillas')
      .update({ activo, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  // ---------- Reglas ----------
  async getReglas(): Promise<CorrespondenciaRegla[]> {
    const { data, error } = await supabase
      .from('correspondencia_reglas')
      .select('*, plantilla:correspondencia_plantillas(id, nombre, asunto)')
      .order('prioridad', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async createRegla(payload: CreateReglaData): Promise<CorrespondenciaRegla> {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('correspondencia_reglas')
      .insert({ ...payload, created_by: user?.id })
      .select('*, plantilla:correspondencia_plantillas(id, nombre, asunto)')
      .single();
    if (error) throw error;
    return data;
  },

  async updateRegla(id: number, payload: Partial<CreateReglaData>): Promise<CorrespondenciaRegla> {
    const { data, error } = await supabase
      .from('correspondencia_reglas')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, plantilla:correspondencia_plantillas(id, nombre, asunto)')
      .single();
    if (error) throw error;
    return data;
  },

  async deleteRegla(id: number): Promise<void> {
    const { error } = await supabase
      .from('correspondencia_reglas')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async toggleRegla(id: number, activo: boolean): Promise<void> {
    const { error } = await supabase
      .from('correspondencia_reglas')
      .update({ activo, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  // ---------- Historial ----------
  async getHistorial(filtros?: HistorialFiltros): Promise<CorrespondenciaHistorial[]> {
    let query = supabase
      .from('correspondencia_historial')
      .select('*, regla:correspondencia_reglas(id, nombre), plantilla:correspondencia_plantillas(id, nombre)')
      .order('created_at', { ascending: false })
      .limit(200);

    if (filtros?.estado) query = query.eq('estado', filtros.estado);
    if (filtros?.fecha_desde) query = query.gte('created_at', filtros.fecha_desde + 'T00:00:00');
    if (filtros?.fecha_hasta) query = query.lte('created_at', filtros.fecha_hasta + 'T23:59:59');
    if (filtros?.busqueda) {
      query = query.ilike('asunto', `%${filtros.busqueda}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async getStats(): Promise<CorrespondenciaStats> {
    const { data, error } = await supabase
      .from('correspondencia_historial')
      .select('estado');
    if (error) throw error;

    const total = data?.length ?? 0;
    const enviados = data?.filter((r) => r.estado === 'enviado').length ?? 0;
    const errores = data?.filter((r) => r.estado === 'error').length ?? 0;
    const pendientes = data?.filter((r) => r.estado === 'pendiente' || r.estado === 'enviando').length ?? 0;

    return {
      total,
      enviados,
      errores,
      pendientes,
      tasa_exito: total > 0 ? Math.round((enviados / total) * 100) : 0,
    };
  },

  // ---------- Envío ----------
  async enviarCorreo(payload: EnvioManualPayload): Promise<{ success: boolean; historial_id?: number; error?: string }> {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/correspondencia-enviar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  /**
   * Dispara un evento del sistema hacia el motor de reglas de correspondencia.
   * Busca reglas activas para el evento dado y envía los correos correspondientes.
   * COMPLETAMENTE ASÍNCRONO — nunca bloquea ni lanza error al llamador.
   */
  dispararEventoSeguro(
    tipoEvento: string,
    tiendaId: string,
    entityData: Record<string, unknown>
  ): void {
    setTimeout(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const res = await fetch(`${SUPABASE_URL}/functions/v1/correspondencia-disparar-evento`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ tipo_evento: tipoEvento, tienda_id: tiendaId, entity_data: entityData }),
        });

        await res.json();
      } catch {
        // Silencioso — los disparadores nunca bloquean el flujo principal
      }
    }, 0);
  },

  async reintentarEnvio(historialId: number): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await supabase
      .from('correspondencia_historial')
      .select('*')
      .eq('id', historialId)
      .maybeSingle();
    if (error || !data) throw error ?? new Error('Registro no encontrado');

    return this.enviarCorreo({
      para: data.para as string[],
      cc: data.cc as string[],
      cco: data.cco as string[],
      asunto: data.asunto,
      cuerpo_html: data.cuerpo_html ?? '',
      plantilla_id: data.plantilla_id ?? undefined,
      tienda_id: data.tienda_id ?? undefined,
      evento_origen: data.evento_origen ?? 'reintento',
      metadata: data.metadata as Record<string, unknown>,
    });
  },
};
