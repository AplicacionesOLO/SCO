import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';
import { showAlert } from '../utils/dialog';
import type { 
  TareaAnalisis, 
  FiltrosTablaDatos, 
  TotalesPorCliente,
  ItemTarea 
} from '../types/tablaDatosTareas';

/**
 * Servicio para análisis EDA de tareas
 * Centraliza datos de producción y productividad
 */
class TablaDatosTareasService {
  
  /**
   * Obtener tareas para análisis con totales por categoría
   */
  async getTareasAnalisis(filtros?: FiltrosTablaDatos): Promise<TareaAnalisis[]> {
    try {
      // Construir query base - Solo columnas que existen en la tabla
      let query = supabase
        .from('tareas')
        .select(`
          id,
          consecutivo,
          descripcion_breve,
          fecha_inicio,
          fecha_cierre,
          estado,
          entregado_a,
          solicitante_id,
          email_solicitante,
          datos_formulario
        `)
        .order('consecutivo', { ascending: false });

      // Aplicar filtros
      if (filtros?.busqueda) {
        query = query.or(`consecutivo.ilike.%${filtros.busqueda}%,descripcion_breve.ilike.%${filtros.busqueda}%`);
      }

      // FIX: usar nombres de campo correctos del tipo FiltrosTablaDatos
      if (filtros?.fecha_inicio_desde) {
        query = query.gte('fecha_inicio', filtros.fecha_inicio_desde);
      }

      if (filtros?.fecha_cierre_hasta) {
        query = query.lte('fecha_cierre', filtros.fecha_cierre_hasta);
      }

      if (filtros?.estado) {
        query = query.eq('estado', filtros.estado);
      }

      const { data: tareasData, error: tareasError } = await query;

      if (tareasError) {
        throw tareasError;
      }

      // Procesar cada tarea
      const tareasAnalisis: TareaAnalisis[] = [];

      for (const tarea of tareasData || []) {
        // Obtener nombre del cliente desde datos_formulario
        const nombreCliente = (tarea.datos_formulario as any)?.cliente || 'Sin cliente';

        // Aplicar filtro de cliente si existe
        if (filtros?.cliente && filtros.cliente.trim() !== '') {
          if (!nombreCliente.toLowerCase().includes(filtros.cliente.toLowerCase())) {
            continue;
          }
        }

        // Obtener solicitante desde datos_formulario o email
        const solicitante = (tarea.datos_formulario as any)?.solicitante || tarea.email_solicitante || 'Sin solicitante';

        // Obtener responsable desde datos_formulario
        const responsable = (tarea.datos_formulario as any)?.responsable || 'Sin asignar';

        // Obtener items de la tarea
        const { data: itemsData, error: itemsError } = await supabase
          .from('tareas_items')
          .select(`
            id,
            descripcion,
            cantidad,
            costo_unitario,
            costo_total
          `)
          .eq('tarea_id', tarea.id);

        if (itemsError) {
          continue;
        }

        // Para cada item, buscar en inventario por descripción
        const items: ItemTarea[] = [];
        const totalesPorCategoria: Record<string, number> = {};
        
        for (const item of itemsData || []) {
          let categoriaNombre = 'OTROS';
          let codigoArticulo: string | null = null;
          let unidadMedida: string | null = null;

          // Buscar en inventario por descripción exacta
          const { data: inventarioData, error: inventarioError } = await supabase
            .from('inventario')
            .select(`
              id_articulo,
              codigo_articulo,
              descripcion_articulo,
              categoria_id,
              unidad_base_id
            `)
            .eq('descripcion_articulo', item.descripcion)
            .single();

          if (inventarioError) {
            // Intentar búsqueda parcial (ILIKE)
            const { data: inventarioDataPartial, error: inventarioErrorPartial } = await supabase
              .from('inventario')
              .select(`
                id_articulo,
                codigo_articulo,
                descripcion_articulo,
                categoria_id,
                unidad_base_id
              `)
              .ilike('descripcion_articulo', `%${item.descripcion}%`)
              .limit(1)
              .single();

            if (!inventarioErrorPartial && inventarioDataPartial) {
              codigoArticulo = inventarioDataPartial.codigo_articulo;

              // Buscar categoría
              if (inventarioDataPartial.categoria_id) {
                const { data: categoriaData, error: categoriaError } = await supabase
                  .from('categorias_inventario')
                  .select('nombre_categoria')
                  .eq('id_categoria', inventarioDataPartial.categoria_id)
                  .single();

                if (!categoriaError && categoriaData) {
                  categoriaNombre = categoriaData.nombre_categoria;
                }
              }

              // Buscar unidad de medida
              if (inventarioDataPartial.unidad_base_id) {
                const { data: unidadData, error: unidadError } = await supabase
                  .from('unidades_medida')
                  .select('simbolo')
                  .eq('id', inventarioDataPartial.unidad_base_id)
                  .single();

                if (!unidadError && unidadData) {
                  unidadMedida = unidadData.simbolo;
                }
              }
            }
          } else if (inventarioData) {
            codigoArticulo = inventarioData.codigo_articulo;

            // Buscar categoría
            if (inventarioData.categoria_id) {
              const { data: categoriaData, error: categoriaError } = await supabase
                .from('categorias_inventario')
                .select('nombre_categoria')
                .eq('id_categoria', inventarioData.categoria_id)
                .single();

              if (!categoriaError && categoriaData) {
                categoriaNombre = categoriaData.nombre_categoria;
              }
            }

            // Buscar unidad de medida
            if (inventarioData.unidad_base_id) {
              const { data: unidadData, error: unidadError } = await supabase
                .from('unidades_medida')
                .select('simbolo')
                .eq('id', inventarioData.unidad_base_id)
                .single();

              if (!unidadError && unidadData) {
                unidadMedida = unidadData.simbolo;
              }
            }
          }

          // Agregar item procesado
          items.push({
            id: item.id,
            descripcion: item.descripcion,
            codigo_articulo: codigoArticulo,
            categoria: categoriaNombre,
            unidad_medida: unidadMedida,
            cantidad: item.cantidad,
            costo_unitario: item.costo_unitario,
            costo_total: item.costo_total,
          });

          // Acumular total por categoría
          if (!totalesPorCategoria[categoriaNombre]) {
            totalesPorCategoria[categoriaNombre] = 0;
          }
          totalesPorCategoria[categoriaNombre] += item.costo_total;
        }

        // Calcular total general
        const totalGeneral = Object.values(totalesPorCategoria).reduce((sum, val) => sum + val, 0);

        // Validar HH si existe
        let alertaHH: string | undefined;
        if (totalesPorCategoria['HH'] && tarea.fecha_inicio && tarea.fecha_cierre) {
          const fechaInicio = new Date(tarea.fecha_inicio);
          const fechaCierre = new Date(tarea.fecha_cierre);
          const tiempoRealHoras = (fechaCierre.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60);
          
          // Calcular horas teóricas desde los items HH
          const itemsHH = items.filter(i => i.categoria === 'HH');
          const horasTeoricasTotal = itemsHH.reduce((sum, i) => sum + i.cantidad, 0);

          if (horasTeoricasTotal > 0) {
            const diferenciaPorcentaje = Math.abs(tiempoRealHoras - horasTeoricasTotal) / horasTeoricasTotal * 100;

            if (diferenciaPorcentaje > 30) {
              alertaHH = `⚠️ Las horas cargadas en HH (${horasTeoricasTotal.toFixed(1)}h) difieren ${diferenciaPorcentaje.toFixed(0)}% del tiempo real (${tiempoRealHoras.toFixed(1)}h). Revisar.`;
            }
          }
        }

        // Agregar tarea procesada
        tareasAnalisis.push({
          id: tarea.id,
          caso: tarea.consecutivo,
          cliente: nombreCliente,
          descripcion: tarea.descripcion_breve || '',
          solicitante: solicitante,
          inicio: tarea.fecha_inicio,
          cierre: tarea.fecha_cierre,
          cantidad_personas: 0,
          responsable: responsable,
          entregado_a: tarea.entregado_a || '',
          observaciones_va: tarea.descripcion_breve || '',
          estado: tarea.estado,
          items,
          totales_por_categoria: totalesPorCategoria,
          total_general: totalGeneral,
          alerta_hh: alertaHH,
          dedicados: totalesPorCategoria['DEDICADOS'] || 0,
          etiquetas: totalesPorCategoria['ETIQUETAS'] || 0,
          hh: totalesPorCategoria['HH'] || 0,
        });
      }

      return tareasAnalisis;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener totales por cliente
   */
  async getTotalesPorCliente(filtros?: FiltrosTablaDatos): Promise<TotalesPorCliente[]> {
    try {
      const tareas = await this.getTareasAnalisis(filtros);
      
      // Agrupar por cliente
      const totalesPorCliente = tareas.reduce((acc, tarea) => {
        const cliente = tarea.cliente;
        if (!acc[cliente]) {
          acc[cliente] = 0;
        }
        acc[cliente] += tarea.total_general;
        return acc;
      }, {} as Record<string, number>);

      // Convertir a array y ordenar por total descendente
      const resultado: TotalesPorCliente[] = Object.entries(totalesPorCliente)
        .map(([cliente, total]) => ({ cliente, total }))
        .sort((a, b) => b.total - a.total);

      return resultado;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Exportar datos a Excel con formato inteligente
   * - Una hoja por estado
   * - Columnas fijas + columnas dinámicas por categoría
   * - Respeta filtros activos
   */
  async exportarExcel(filtros?: FiltrosTablaDatos): Promise<void> {
    try {
      // Obtener tareas filtradas
      const tareas = await this.getTareasAnalisis(filtros);
      
      if (tareas.length === 0) {
        showAlert('No hay datos para exportar con los filtros aplicados', { type: 'info' });
        return;
      }

      // Agrupar tareas por estado
      const tareasPorEstado = tareas.reduce((acc, tarea) => {
        if (!acc[tarea.estado]) {
          acc[tarea.estado] = [];
        }
        acc[tarea.estado].push(tarea);
        return acc;
      }, {} as Record<string, TareaAnalisis[]>);

      const estados = Object.keys(tareasPorEstado).sort();

      // Obtener todas las categorías únicas de todas las tareas
      const categoriasSet = new Set<string>();
      tareas.forEach(tarea => {
        Object.keys(tarea.totales_por_categoria || {}).forEach(categoria => {
          categoriasSet.add(categoria);
        });
      });
      const categorias = Array.from(categoriasSet).sort();

      // Crear libro de Excel
      const wb = XLSX.utils.book_new();

      // Crear una hoja por cada estado
      estados.forEach(estado => {
        const tareasEstado = tareasPorEstado[estado];

        // Preparar datos para esta hoja
        const datosHoja = tareasEstado.map(tarea => {
          // FIX: usar tarea.caso (no tarea.consecutivo) y tarea.inicio/tarea.cierre (no tarea.fecha_inicio/tarea.fecha_cierre)
          const fila: Record<string, any> = {
            'Caso': tarea.caso,
            'Cliente': tarea.cliente,
            'Descripción': tarea.descripcion,
            'Solicitante': tarea.solicitante,
            'Inicio': tarea.inicio ? this.formatearFecha(tarea.inicio) : '',
            'Cierre': tarea.cierre ? this.formatearFecha(tarea.cierre) : '',
            'Responsable': tarea.responsable,
            'Entregado a': tarea.entregado_a,
            'Observaciones VA': tarea.observaciones_va
          };

          // Columnas dinámicas por categoría
          categorias.forEach(categoria => {
            const totalCategoria = tarea.totales_por_categoria?.[categoria] || 0;
            fila[categoria] = totalCategoria;
          });

          // Columna Total General
          fila['Total General'] = tarea.total_general;

          return fila;
        });

        // Crear hoja
        const ws = XLSX.utils.json_to_sheet(datosHoja);

        // Configurar anchos de columna
        const colWidths = [
          { wch: 15 },  // Caso
          { wch: 25 },  // Cliente
          { wch: 40 },  // Descripción
          { wch: 30 },  // Solicitante
          { wch: 12 },  // Inicio
          { wch: 12 },  // Cierre
          { wch: 25 },  // Responsable
          { wch: 25 },  // Entregado a
          { wch: 40 },  // Observaciones VA
          ...categorias.map(() => ({ wch: 15 })), // Categorías dinámicas
          { wch: 15 }   // Total General
        ];
        ws['!cols'] = colWidths;

        // Aplicar formato de moneda a las columnas de categorías y total
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
        const columnasMoneda = categorias.length + 1; // +1 para Total General
        const primeraColumnaMoneda = 9; // Después de "Observaciones VA"

        for (let R = range.s.r + 1; R <= range.e.r; ++R) {
          for (let C = primeraColumnaMoneda; C < primeraColumnaMoneda + columnasMoneda; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            if (ws[cellAddress]) {
              ws[cellAddress].z = '₡#,##0.00';
            }
          }
        }

        // Agregar hoja al libro (nombre de hoja limitado a 31 caracteres)
        const nombreHoja = estado.substring(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
      });

      // Generar nombre de archivo con fecha y filtros
      const fecha = new Date().toISOString().split('T')[0];
      let nombreArchivo = `analisis_tareas_${fecha}`;
      
      if (filtros?.estado) {
        nombreArchivo += `_${filtros.estado.replace(/\s+/g, '_')}`;
      }
      // FIX: usar filtros.cliente (no filtros.cliente_id)
      if (filtros?.cliente) {
        nombreArchivo += `_${filtros.cliente.replace(/\s+/g, '_')}`;
      }
      
      nombreArchivo += '.xlsx';

      // Descargar archivo
      XLSX.writeFile(wb, nombreArchivo);

    } catch (error) {
      throw error;
    }
  }

  /**
   * Formatear fecha para Excel (sin problema de timezone)
   */
  private formatearFecha(fecha: string): string {
    try {
      // Si es solo YYYY-MM-DD, parsear como hora local (no UTC)
      const date = /^\d{4}-\d{2}-\d{2}$/.test(fecha)
        ? new Date(`${fecha}T00:00:00`)
        : new Date(fecha);
      const dia = String(date.getDate()).padStart(2, '0');
      const mes = String(date.getMonth() + 1).padStart(2, '0');
      const anio = date.getFullYear();
      return `${dia}/${mes}/${anio}`;
    } catch {
      return fecha;
    }
  }

  /**
   * Actualizar categoría de un item
   */
  async actualizarCategoriaItem(itemId: string, categoria: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('tareas_items')
        .update({ categoria })
        .eq('id', itemId);

      if (error) throw error;

    } catch (error) {
      throw error;
    }
  }
}

// Exportar instancia del servicio
export const tablaDatosTareasService = new TablaDatosTareasService();
export default tablaDatosTareasService;
