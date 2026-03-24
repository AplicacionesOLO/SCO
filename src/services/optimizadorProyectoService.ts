/**
 * Servicio para gestionar proyectos temporales del optimizador 2D
 */

import { supabase } from '../lib/supabase';

export interface PiezaOptimizador {
  descripcion: string;
  largo: number;
  ancho: number;
  cantidad: number;
  veta: string;
  tapacanto_superior: string;
  tapacanto_inferior: string;
  tapacanto_izquierdo: string;
  tapacanto_derecho: string;
  cnc1: string;
  cnc1_codigo: string; // 🆕 Código del artículo CNC1
  cnc1_cantidad: number; // 🆕 Cantidad de CNC1
  cnc2: string;
  cnc2_codigo: string; // 🆕 Código del artículo CNC2
  cnc2_cantidad: number; // 🆕 Cantidad de CNC2
  codigo_material: string;
  nombre_material: string;
  precio_unitario?: number;
  subtotal?: number;
}

export interface Detallelamina {
  numero_lamina: number;
  piezas_count: number;
  aprovechamiento: number;
  area_utilizada: number;
  area_total: number;
  dimensiones: {
    largo: number;
    ancho: number;
    espesor: number;
  };
}

export interface ResultadoMaterial {
  codigo_material: string;
  nombre_material: string;
  dimensiones: {
    largo: number;
    ancho: number;
    espesor: number;
  };
  precio_lamina: number;
  laminas_usadas: number;
  aprovechamiento_promedio: number;
  total_piezas: number;
  costo_total: number;
  area_utilizada: number;
  area_sobrante: number;
  detalle_laminas: Detallelamina[];
}

export interface ResumenProyecto {
  total_laminas: number;
  aprovechamiento_promedio: number;
  total_piezas: number;
  costo_total: number;
  costo_materiales: number;
  costo_tapacantos: number;
  costo_horas_maquina: number;
  area_utilizada: number;
  area_sobrante: number;
}

export interface ProyectoOptimizador {
  id_proyecto?: string;
  id_usuario?: string;
  id_tienda?: string;
  nombre_proyecto?: string;
  fecha_creacion?: string;
  piezas: PiezaOptimizador[];
  resultados_optimizacion: Record<string, ResultadoMaterial>;
  resumen: ResumenProyecto;
  estado?: 'activo' | 'cotizado' | 'archivado';
  id_cotizacion?: string;
}

/**
 * Guarda o actualiza un proyecto del optimizador
 */
export async function guardarProyectoOptimizador(
  proyecto: ProyectoOptimizador
): Promise<{ success: boolean; id_proyecto?: string; error?: string }> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return { success: false, error: 'Usuario no autenticado' };

    const { data: tiendaData } = await supabase
      .from('usuario_tienda_actual')
      .select('id_tienda')
      .eq('id_usuario', userData.user.id)
      .single();

    if (!tiendaData) return { success: false, error: 'No se encontró la tienda del usuario' };

    if (proyecto.id_proyecto) {
      const { error } = await supabase
        .from('optimizador_proyectos_temp')
        .update({ piezas: proyecto.piezas, resultados_optimizacion: proyecto.resultados_optimizacion, resumen: proyecto.resumen, nombre_proyecto: proyecto.nombre_proyecto })
        .eq('id_proyecto', proyecto.id_proyecto);

      if (error) return { success: false, error: error.message };
      return { success: true, id_proyecto: proyecto.id_proyecto };
    } else {
      const { data, error } = await supabase
        .from('optimizador_proyectos_temp')
        .insert({ id_usuario: userData.user.id, id_tienda: tiendaData.id_tienda, piezas: proyecto.piezas, resultados_optimizacion: proyecto.resultados_optimizacion, resumen: proyecto.resumen, nombre_proyecto: proyecto.nombre_proyecto || 'Proyecto sin nombre', estado: 'activo' })
        .select('id_proyecto')
        .single();

      if (error) return { success: false, error: error.message };
      return { success: true, id_proyecto: data.id_proyecto };
    }
  } catch {
    return { success: false, error: 'Error al guardar el proyecto' };
  }
}

/**
 * Obtiene el proyecto activo del usuario
 */
export async function obtenerProyectoActivo(): Promise<ProyectoOptimizador | null> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;

    const { data, error } = await supabase
      .from('optimizador_proyectos_temp')
      .select('*')
      .eq('id_usuario', userData.user.id)
      .eq('estado', 'activo')
      .order('fecha_creacion', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    return data as ProyectoOptimizador;
  } catch {
    return null;
  }
}

/**
 * Obtiene un proyecto por ID
 */
export async function obtenerProyectoPorId(id_proyecto: string): Promise<ProyectoOptimizador | null> {
  try {
    const { data, error } = await supabase
      .from('optimizador_proyectos_temp')
      .select('*')
      .eq('id_proyecto', id_proyecto)
      .single();

    if (error || !data) return null;
    return data as ProyectoOptimizador;
  } catch {
    return null;
  }
}

/**
 * Marca un proyecto como cotizado
 */
export async function marcarProyectoCotizado(
  id_proyecto: string,
  id_cotizacion: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('optimizador_proyectos_temp')
      .update({ estado: 'cotizado', id_cotizacion })
      .eq('id_proyecto', id_proyecto);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch {
    return { success: false, error: 'Error al actualizar el proyecto' };
  }
}

/**
 * Elimina un proyecto
 */
export async function eliminarProyecto(id_proyecto: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('optimizador_proyectos_temp')
      .delete()
      .eq('id_proyecto', id_proyecto);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch {
    return { success: false, error: 'Error al eliminar el proyecto' };
  }
}

/**
 * Limpia proyectos antiguos (más de 7 días sin actividad)
 */
export async function limpiarProyectosAntiguos(): Promise<{ success: boolean; eliminados?: number; error?: string }> {
  try {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - 7);

    const { data, error } = await supabase
      .from('optimizador_proyectos_temp')
      .delete()
      .lt('updated_at', fechaLimite.toISOString())
      .eq('estado', 'activo')
      .select('id_proyecto');

    if (error) return { success: false, error: error.message };
    return { success: true, eliminados: data?.length || 0 };
  } catch {
    return { success: false, error: 'Error al limpiar proyectos' };
  }
}
