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
   * OPTIMIZADO: Usa batch queries para evitar N+1
   * MEJORADO: Busca por inventario_id y producto_id, no solo por descripción exacta
   */
  async getTareasAnalisis(filtros?: FiltrosTablaDatos): Promise<TareaAnalisis[]> {
    try {
      // 1. Construir query base de tareas
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
          datos_formulario,
          cantidad_personas
        `)
        .order('consecutivo', { ascending: false });

      // Aplicar filtros
      if (filtros?.busqueda) {
        const b = filtros.busqueda;
        query = query.or(
          `consecutivo.ilike.%${b}%,descripcion_breve.ilike.%${b}%,datos_formulario->>cliente.ilike.%${b}%,datos_formulario->>solicitante.ilike.%${b}%`
        );
      }

      if (filtros?.fecha_inicio_desde) {
        query = query.gte('fecha_inicio', filtros.fecha_inicio_desde);
      }

      if (filtros?.fecha_cierre_hasta) {
        query = query.lte('fecha_cierre', filtros.fecha_cierre_hasta);
      }

      if (filtros?.estado) {
        if (filtros.estado === 'Finalizado') {
          query = query.or('estado.eq.Finalizado,estado.eq.Terminado');
        } else {
          query = query.eq('estado', filtros.estado);
        }
      }

      // Límite de 500 para proteger al browser sin truncar datos históricos
      const { data: tareasData, error: tareasError } = await query.limit(500);

      if (tareasError) throw tareasError;
      if (!tareasData || tareasData.length === 0) return [];

      // Aplicar filtro de cliente en memoria (está en datos_formulario)
      let tareasFiltradas = tareasData;
      if (filtros?.cliente && filtros.cliente.trim() !== '') {
        const clienteFilter = filtros.cliente.toLowerCase();
        tareasFiltradas = tareasData.filter(t => {
          const cliente = (t.datos_formulario as any)?.cliente || '';
          return cliente.toLowerCase().includes(clienteFilter);
        });
        if (tareasFiltradas.length === 0) return [];
      }

      const tareaIds = tareasFiltradas.map(t => t.id);

      // 2. BATCH: Traer TODOS los items de todas las tareas en una sola query
      const { data: itemsData } = await supabase
        .from('tareas_items')
        .select('id, tarea_id, inventario_id, producto_id, descripcion, cantidad, costo_unitario, costo_total')
        .in('tarea_id', tareaIds);

      // Indexar items por tarea_id
      const itemsPorTarea: Record<string, typeof itemsData> = {};
      const descripcionesSet = new Set<string>();
      const inventarioIds = new Set<number>();
      const productoIds = new Set<number>();

      (itemsData || []).forEach(item => {
        if (!itemsPorTarea[item.tarea_id]) itemsPorTarea[item.tarea_id] = [];
        itemsPorTarea[item.tarea_id].push(item);
        descripcionesSet.add(item.descripcion);
        if (item.inventario_id) inventarioIds.add(item.inventario_id);
        if (item.producto_id) productoIds.add(item.producto_id);
      });

      const descripciones = Array.from(descripcionesSet);

      // 3. BATCH: Buscar inventarios por ID (inventario_id directo)
      let inventarioMap = new Map<string | number, { codigo_articulo?: string; categoria_id?: number; unidad_base_id?: number }>();

      // 3a. Buscar por inventario_id directo
      if (inventarioIds.size > 0) {
        const idsArray = Array.from(inventarioIds);
        // Intentar con 'id' primero
        const { data: inventarioPorId } = await supabase
          .from('inventario')
          .select('id, codigo_articulo, descripcion_articulo, categoria_id, unidad_base_id')
          .in('id', idsArray);

        (inventarioPorId || []).forEach(inv => {
          if (!inventarioMap.has(inv.id)) {
            inventarioMap.set(inv.id, {
              codigo_articulo: inv.codigo_articulo,
              categoria_id: inv.categoria_id,
              unidad_base_id: inv.unidad_base_id,
            });
          }
        });

        // Si no encontró nada, intentar con 'id_articulo' como fallback
        if (inventarioPorId && inventarioPorId.length === 0) {
          const { data: inventarioPorIdArt } = await supabase
            .from('inventario')
            .select('id_articulo, codigo_articulo, descripcion_articulo, categoria_id, unidad_base_id')
            .in('id_articulo', idsArray);

          (inventarioPorIdArt || []).forEach(inv => {
            if (!inventarioMap.has(inv.id_articulo)) {
              inventarioMap.set(inv.id_articulo, {
                codigo_articulo: inv.codigo_articulo,
                categoria_id: inv.categoria_id,
                unidad_base_id: inv.unidad_base_id,
              });
            }
          });
        }
      }

      // 3b. Buscar por producto_id → bom_items → inventario
      let componenteIds: number[] = [];
      if (productoIds.size > 0) {
        const { data: bomItems } = await supabase
          .from('bom_items')
          .select('id_producto, id_componente')
          .in('id_producto', Array.from(productoIds));

        if (bomItems && bomItems.length > 0) {
          componenteIds = [...new Set(bomItems.map(b => b.id_componente).filter(Boolean))];
        }
      }

      if (componenteIds.length > 0) {
        const { data: inventarioPorComponente } = await supabase
          .from('inventario')
          .select('id, id_articulo, codigo_articulo, descripcion_articulo, categoria_id, unidad_base_id')
          .in('id', componenteIds);

        (inventarioPorComponente || []).forEach(inv => {
          if (!inventarioMap.has(inv.id)) {
            inventarioMap.set(inv.id, {
              codigo_articulo: inv.codigo_articulo,
              categoria_id: inv.categoria_id,
              unidad_base_id: inv.unidad_base_id,
            });
          }
        });

        // Fallback por id_articulo
        if (inventarioPorComponente && inventarioPorComponente.length === 0) {
          const { data: inventarioPorCompIdArt } = await supabase
            .from('inventario')
            .select('id_articulo, codigo_articulo, descripcion_articulo, categoria_id, unidad_base_id')
            .in('id_articulo', componenteIds);

          (inventarioPorCompIdArt || []).forEach(inv => {
            if (!inventarioMap.has(inv.id_articulo)) {
              inventarioMap.set(inv.id_articulo, {
                codigo_articulo: inv.codigo_articulo,
                categoria_id: inv.categoria_id,
                unidad_base_id: inv.unidad_base_id,
              });
            }
          });
        }
      }

      // 3c. FALLBACK: Buscar por descripción exacta para items que no tienen inventario_id ni producto_id
      const descripcionesSinMatch = descripciones.filter(d => {
        // Si algún item con esta descripción tiene inventario_id o producto_id que ya encontramos, no necesitamos fallback
        const itemsConDescripcion = (itemsData || []).filter(i => i.descripcion === d);
        return itemsConDescripcion.some(i => {
          const tieneInventario = i.inventario_id && inventarioMap.has(i.inventario_id);
          const tieneProducto = i.producto_id && productoIds.has(i.producto_id);
          return !tieneInventario && !tieneProducto;
        });
      });

      if (descripcionesSinMatch.length > 0) {
        const { data: inventarioExacto } = await supabase
          .from('inventario')
          .select('codigo_articulo, descripcion_articulo, categoria_id, unidad_base_id')
          .in('descripcion_articulo', descripcionesSinMatch);

        (inventarioExacto || []).forEach(inv => {
          if (!inventarioMap.has(inv.descripcion_articulo)) {
            inventarioMap.set(inv.descripcion_articulo, {
              codigo_articulo: inv.codigo_articulo,
              categoria_id: inv.categoria_id,
              unidad_base_id: inv.unidad_base_id,
            });
          }
        });
      }

      // 4. BATCH: Buscar categorías necesarias en una sola query
      const categoriaIds = new Set<number>();
      inventarioMap.forEach(inv => {
        if (inv.categoria_id) categoriaIds.add(inv.categoria_id);
      });

      const categoriaMap = new Map<number, string>();
      if (categoriaIds.size > 0) {
        const { data: categoriasData } = await supabase
          .from('categorias_inventario')
          .select('id_categoria, nombre_categoria')
          .in('id_categoria', Array.from(categoriaIds));

        (categoriasData || []).forEach(c => {
          categoriaMap.set(c.id_categoria, c.nombre_categoria);
        });
      }

      // 5. BATCH: Buscar unidades de medida necesarias en una sola query
      const unidadIds = new Set<number>();
      inventarioMap.forEach(inv => {
        if (inv.unidad_base_id) unidadIds.add(inv.unidad_base_id);
      });

      const unidadMap = new Map<number, string>();
      if (unidadIds.size > 0) {
        const { data: unidadesData } = await supabase
          .from('unidades_medida')
          .select('id, simbolo')
          .in('id', Array.from(unidadIds));

        (unidadesData || []).forEach(u => {
          unidadMap.set(u.id, u.simbolo);
        });
      }

      // 6. Procesar todo en memoria
      const tareasAnalisis: TareaAnalisis[] = [];

      for (const tarea of tareasFiltradas) {
        const itemsDeTarea = itemsPorTarea[tarea.id] || [];
        const items: ItemTarea[] = [];
        const totalesPorCategoria: Record<string, number> = {};

        for (const item of itemsDeTarea) {
          let invData = null;

          // Buscar por inventario_id directo
          if (item.inventario_id) {
            invData = inventarioMap.get(item.inventario_id) || null;
          }

          // Buscar por producto_id → bom_items → inventario
          if (!invData && item.producto_id) {
            invData = inventarioMap.get(item.descripcion) || null;
          }

          // Fallback por descripción exacta
          if (!invData) {
            invData = inventarioMap.get(item.descripcion) || null;
          }

          const categoriaNombre = invData?.categoria_id
            ? (categoriaMap.get(invData.categoria_id) || 'OTROS')
            : 'OTROS';
          const unidadMedida = invData?.unidad_base_id
            ? unidadMap.get(invData.unidad_base_id)
            : null;

          items.push({
            id: item.id,
            inventario_id: item.inventario_id,
            descripcion: item.descripcion,
            codigo_articulo: invData?.codigo_articulo || null,
            categoria: categoriaNombre,
            unidad_medida: unidadMedida,
            cantidad: item.cantidad,
            precio_unitario: item.costo_unitario,
            costo_unitario: item.costo_unitario,
            total: item.costo_total,
            costo_total: item.costo_total,
          });

          totalesPorCategoria[categoriaNombre] = (totalesPorCategoria[categoriaNombre] || 0) + item.costo_total;
        }

        const totalGeneral = Object.values(totalesPorCategoria).reduce((sum, v) => sum + v, 0);

        // Alerta HH
        let alertaHH: string | undefined;
        if (totalesPorCategoria['HH'] && tarea.fecha_inicio && tarea.fecha_cierre) {
          const fechaInicio = new Date(tarea.fecha_inicio);
          const fechaCierre = new Date(tarea.fecha_cierre);
          const tiempoRealHoras = (fechaCierre.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60);
          const itemsHH = items.filter(i => i.categoria === 'HH');
          const horasTeoricas = itemsHH.reduce((sum, i) => sum + i.cantidad, 0);

          if (horasTeoricas > 0) {
            const diff = Math.abs(tiempoRealHoras - horasTeoricas) / horasTeoricas * 100;
            if (diff > 30) {
              alertaHH = `⚠️ Las horas cargadas en HH (${horasTeoricas.toFixed(1)}h) difieren ${diff.toFixed(0)}% del tiempo real (${tiempoRealHoras.toFixed(1)}h). Revisar.`;
            }
          }
        }

        const datosForm = tarea.datos_formulario as any;

        // Calcular cantidad de personas: usar campo directo de la tabla, o fallback a datos_formulario
        let cantidadPersonas = 0;
        if (typeof (tarea as any).cantidad_personas === 'number' && (tarea as any).cantidad_personas > 0) {
          cantidadPersonas = (tarea as any).cantidad_personas;
        } else if (datosForm?.cantidad_personas) {
          cantidadPersonas = Number(datosForm.cantidad_personas) || 0;
        } else if (datosForm?.colaboradores) {
          if (Array.isArray(datosForm.colaboradores)) {
            cantidadPersonas = datosForm.colaboradores.length;
          } else if (typeof datosForm.colaboradores === 'string') {
            cantidadPersonas = datosForm.colaboradores.split(',').filter((s: string) => s.trim()).length;
          }
        } else if (datosForm?.asignado_a) {
          if (Array.isArray(datosForm.asignado_a)) {
            cantidadPersonas = datosForm.asignado_a.length;
          } else if (typeof datosForm.asignado_a === 'string') {
            cantidadPersonas = datosForm.asignado_a.split(',').filter((s: string) => s.trim()).length;
          }
        }

        tareasAnalisis.push({
          id: tarea.id,
          caso: tarea.consecutivo,
          cliente: datosForm?.cliente || 'Sin cliente',
          descripcion: tarea.descripcion_breve || '',
          solicitante: datosForm?.solicitante || tarea.email_solicitante || 'Sin solicitante',
          inicio: tarea.fecha_inicio,
          cierre: tarea.fecha_cierre,
          cantidad_personas: cantidadPersonas,
          responsable: datosForm?.responsable || 'Sin asignar',
          entregado_a: tarea.entregado_a || '',
          observaciones_va: tarea.descripcion_breve || '',
          estado: tarea.estado === 'Terminado' ? 'Finalizado' : tarea.estado,
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
   * OPTIMIZADO: Query independiente, no usa getTareasAnalisis
   */
  async getTotalesPorCliente(filtros?: FiltrosTablaDatos): Promise<TotalesPorCliente[]> {
    try {
      // 1. Traer tareas con filtros (solo lo necesario)
      let query = supabase
        .from('tareas')
        .select('id, consecutivo, datos_formulario, estado, fecha_inicio, fecha_cierre')
        .order('consecutivo', { ascending: false });

      if (filtros?.busqueda) {
        const b = filtros.busqueda;
        query = query.or(
          `consecutivo.ilike.%${b}%,descripcion_breve.ilike.%${b}%,datos_formulario->>cliente.ilike.%${b}%,datos_formulario->>solicitante.ilike.%${b}%`
        );
      }
      if (filtros?.fecha_inicio_desde) {
        query = query.gte('fecha_inicio', filtros.fecha_inicio_desde);
      }
      if (filtros?.fecha_cierre_hasta) {
        query = query.lte('fecha_cierre', filtros.fecha_cierre_hasta);
      }
      if (filtros?.estado) {
        if (filtros.estado === 'Finalizado') {
          query = query.or('estado.eq.Finalizado,estado.eq.Terminado');
        } else {
          query = query.eq('estado', filtros.estado);
        }
      }

      const { data: tareasData, error } = await query;
      if (error) throw error;
      if (!tareasData || tareasData.length === 0) return [];

      // Filtrar cliente en memoria
      let tareasFiltradas = tareasData;
      if (filtros?.cliente && filtros.cliente.trim() !== '') {
        const clienteFilter = filtros.cliente.toLowerCase();
        tareasFiltradas = tareasData.filter(t => {
          const cliente = (t.datos_formulario as any)?.cliente || '';
          return cliente.toLowerCase().includes(clienteFilter);
        });
        if (tareasFiltradas.length === 0) return [];
      }

      const tareaIds = tareasFiltradas.map(t => t.id);

      // 2. Traer todos los items de esas tareas en una sola query
      const { data: itemsData } = await supabase
        .from('tareas_items')
        .select('tarea_id, costo_total')
        .in('tarea_id', tareaIds);

      // 3. Sumar por cliente en memoria
      const totalesPorCliente: Record<string, number> = {};

      const itemsPorTarea: Record<string, number> = {};
      (itemsData || []).forEach(item => {
        itemsPorTarea[item.tarea_id] = (itemsPorTarea[item.tarea_id] || 0) + item.costo_total;
      });

      for (const tarea of tareasFiltradas) {
        const cliente = (tarea.datos_formulario as any)?.cliente || 'Sin cliente';
        const total = itemsPorTarea[tarea.id] || 0;
        if (total > 0) {
          totalesPorCliente[cliente] = (totalesPorCliente[cliente] || 0) + total;
        }
      }

      return Object.entries(totalesPorCliente)
        .map(([cliente, total]) => ({ cliente, total }))
        .sort((a, b) => b.total - a.total);
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
      const tareas = await this.getTareasAnalisis(filtros);

      if (tareas.length === 0) {
        showAlert('No hay datos para exportar con los filtros aplicados', { type: 'info' });
        return;
      }

      // Agrupar tareas por estado
      const tareasPorEstado = tareas.reduce((acc, tarea) => {
        if (!acc[tarea.estado]) acc[tarea.estado] = [];
        acc[tarea.estado].push(tarea);
        return acc;
      }, {} as Record<string, TareaAnalisis[]>);

      const estados = Object.keys(tareasPorEstado).sort();

      // Obtener todas las categorías únicas
      const categoriasSet = new Set<string>();
      tareas.forEach(t => {
        Object.keys(t.totales_por_categoria || {}).forEach(c => categoriasSet.add(c));
      });
      const categorias = Array.from(categoriasSet).sort();

      const wb = XLSX.utils.book_new();

      estados.forEach(estado => {
        const tareasEstado = tareasPorEstado[estado];

        const datosHoja = tareasEstado.map(tarea => {
          const fila: Record<string, any> = {
            'Caso': tarea.caso,
            'Cliente': tarea.cliente,
            'Descripción': tarea.descripcion,
            'Solicitante': tarea.solicitante,
            'Inicio': tarea.inicio ? this.formatearFecha(tarea.inicio) : '',
            'Cierre': tarea.cierre ? this.formatearFecha(tarea.cierre) : '',
            'Responsable': tarea.responsable,
            'Entregado a': tarea.entregado_a,
            'Observaciones VA': tarea.observaciones_va,
          };

          categorias.forEach(categoria => {
            fila[categoria] = tarea.totales_por_categoria?.[categoria] || 0;
          });

          fila['Total General'] = tarea.total_general;
          return fila;
        });

        const ws = XLSX.utils.json_to_sheet(datosHoja);

        const colWidths = [
          { wch: 15 }, { wch: 25 }, { wch: 40 }, { wch: 30 },
          { wch: 12 }, { wch: 12 }, { wch: 25 }, { wch: 25 },
          { wch: 40 },
          ...categorias.map(() => ({ wch: 15 })),
          { wch: 15 },
        ];
        ws['!cols'] = colWidths;

        // Formato de moneda
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
        const primeraColMoneda = 9;
        const colsMoneda = categorias.length + 1;

        for (let R = range.s.r + 1; R <= range.e.r; ++R) {
          for (let C = primeraColMoneda; C < primeraColMoneda + colsMoneda; ++C) {
            const cell = XLSX.utils.encode_cell({ r: R, c: C });
            if (ws[cell]) ws[cell].z = '₡#,##0.00';
          }
        }

        XLSX.utils.book_append_sheet(wb, ws, estado.substring(0, 31));
      });

      const fecha = new Date().toISOString().split('T')[0];
      let nombreArchivo = `analisis_tareas_${fecha}`;
      if (filtros?.estado) nombreArchivo += `_${filtros.estado.replace(/\s+/g, '_')}`;
      if (filtros?.cliente) nombreArchivo += `_${filtros.cliente.replace(/\s+/g, '_')}`;
      nombreArchivo += '.xlsx';

      XLSX.writeFile(wb, nombreArchivo);
    } catch (error) {
      throw error;
    }
  }

  private formatearFecha(fecha: string): string {
    try {
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

export const tablaDatosTareasService = new TablaDatosTareasService();
export default tablaDatosTareasService;