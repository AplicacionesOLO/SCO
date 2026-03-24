import { supabase } from '../lib/supabase';
import type { 
  ArticuloInventario, 
  PiezaCorte, 
  ConfiguracionCorte,
  ResultadoOptimizacion,
  LaminaCorte,
  ResultadoPorMaterial,
  ProyectoOptimizador,
  TipoVeta
} from '../types/optimizador';

// Buscar artículos en inventario (láminas o tapacantos)
export async function buscarArticulosInventario(
  search: string = '',
  tipo: 'articulo' | 'lamina' | 'tapacanto' | 'hh' | 'consumible' | 'perforacion' | 'mecanizado' | null = 'articulo',
  currentStore?: { id: string; nombre: string } | null
): Promise<{ data: ArticuloInventario[]; error: any }> {
  try {
    if (!currentStore?.id) {
      return { data: [], error: { message: 'No hay tienda seleccionada' } };
    }

    if (tipo === null) {
      let query = supabase
        .from('inventario')
        .select('*')
        .eq('activo', true)
        .or(`tienda_id.eq.${currentStore.id},tienda_id.is.null`);

      if (search && search.trim().length > 0) {
        const searchTerm = `%${search.trim()}%`;
        query = query.or(`codigo_articulo.ilike.${searchTerm},descripcion_articulo.ilike.${searchTerm}`);
      }

      query = query.limit(50);

      const { data, error } = await query;
      if (error) return { data: [], error };

      const categoriaIds = [...new Set(data?.map(item => item.categoria_id).filter(Boolean))];
      let categoriasMap = new Map<number, string>();

      if (categoriaIds.length > 0) {
        const { data: categoriasData } = await supabase
          .from('categorias_inventario')
          .select('id_categoria, nombre_categoria')
          .in('id_categoria', categoriaIds);

        if (categoriasData) {
          categoriasData.forEach(cat => { categoriasMap.set(cat.id_categoria, cat.nombre_categoria); });
        }
      }

      const articulosMapeados: ArticuloInventario[] = (data || []).map(item => ({
        id: item.id_articulo, id_articulo: item.id_articulo,
        codigo_articulo: item.codigo_articulo, descripcion_articulo: item.descripcion_articulo,
        categoria_nombre: categoriasMap.get(item.categoria_id) || 'Sin categoría',
        espesor_mm: item.espesor_mm || 0, largo_lamina: item.largo_lamina_mm || 0,
        ancho_lamina: item.ancho_lamina_mm || 0, largo_lamina_mm: item.largo_lamina_mm || 0,
        ancho_lamina_mm: item.ancho_lamina_mm || 0, ancho_tapacanto_mm: item.ancho_tapacanto_mm || 0,
        grosor_tapacanto_mm: item.grosor_tapacanto_mm || 0, precio_unitario: item.precio_articulo || 0
      }));

      return { data: articulosMapeados, error: null };
    }

    let nombreCategoria = 'LAMINAS';
    if (tipo === 'tapacanto') nombreCategoria = 'TAPACANTOS';
    else if (tipo === 'lamina') nombreCategoria = 'LAMINAS';
    else if (tipo === 'mecanizado') nombreCategoria = 'MECANIZADO';

    const { data: categoriaData, error: categoriaError } = await supabase
      .from('categorias_inventario')
      .select('id_categoria')
      .eq('nombre_categoria', nombreCategoria)
      .single();

    if (categoriaError || !categoriaData) return { data: [], error: categoriaError };

    let query = supabase
      .from('inventario')
      .select(`id_articulo, codigo_articulo, descripcion_articulo, categoria_id, espesor_mm, largo_lamina_mm, ancho_lamina_mm, ancho_tapacanto_mm, grosor_tapacanto_mm, precio_articulo, activo`)
      .eq('categoria_id', categoriaData.id_categoria)
      .eq('activo', true);

    if (currentStore?.id) {
      query = query.or(`tienda_id.eq.${currentStore.id},tienda_id.is.null`);
    }

    if (search && search.trim().length > 0) {
      const searchTerm = `%${search.trim()}%`;
      const [resultCodigo, resultDescripcion] = await Promise.all([
        supabase.from('inventario')
          .select(`id_articulo, codigo_articulo, descripcion_articulo, categoria_id, espesor_mm, largo_lamina_mm, ancho_lamina_mm, ancho_tapacanto_mm, grosor_tapacanto_mm, precio_articulo, activo`)
          .eq('categoria_id', categoriaData.id_categoria).eq('activo', true)
          .or(`tienda_id.eq.${currentStore?.id || ''},tienda_id.is.null`)
          .ilike('codigo_articulo', searchTerm).limit(25),
        supabase.from('inventario')
          .select(`id_articulo, codigo_articulo, descripcion_articulo, categoria_id, espesor_mm, largo_lamina_mm, ancho_lamina_mm, ancho_tapacanto_mm, grosor_tapacanto_mm, precio_articulo, activo`)
          .eq('categoria_id', categoriaData.id_categoria).eq('activo', true)
          .or(`tienda_id.eq.${currentStore?.id || ''},tienda_id.is.null`)
          .ilike('descripcion_articulo', searchTerm).limit(25)
      ]);

      const combinedData = [...(resultCodigo.data || []), ...(resultDescripcion.data || [])];
      const uniqueData = Array.from(new Map(combinedData.map(item => [item.id_articulo, item])).values());

      let articulosValidos = uniqueData;
      if (tipo === 'lamina') {
        articulosValidos = uniqueData.filter(item => item.espesor_mm != null && item.espesor_mm > 0 && item.largo_lamina_mm != null && item.largo_lamina_mm > 0 && item.ancho_lamina_mm != null && item.ancho_lamina_mm > 0);
      }

      const articulosMapeados: ArticuloInventario[] = articulosValidos.map(item => ({
        id: item.id_articulo, id_articulo: item.id_articulo,
        codigo_articulo: item.codigo_articulo, descripcion_articulo: item.descripcion_articulo,
        categoria_nombre: nombreCategoria, espesor_mm: item.espesor_mm || 0,
        largo_lamina: item.largo_lamina_mm || 0, ancho_lamina: item.ancho_lamina_mm || 0,
        largo_lamina_mm: item.largo_lamina_mm || 0, ancho_lamina_mm: item.ancho_lamina_mm || 0,
        ancho_tapacanto_mm: item.ancho_tapacanto_mm || 0, grosor_tapacanto_mm: item.grosor_tapacanto_mm || 0,
        precio_unitario: item.precio_articulo || 0
      }));

      return { data: articulosMapeados, error: null };
    }

    query = query.limit(50);
    const { data, error } = await query;
    if (error) return { data: [], error };

    let articulosValidos = data;
    if (tipo === 'lamina') {
      articulosValidos = data.filter(item => item.espesor_mm != null && item.espesor_mm > 0 && item.largo_lamina_mm != null && item.largo_lamina_mm > 0 && item.ancho_lamina_mm != null && item.ancho_lamina_mm > 0);
    }

    const articulosMapeados: ArticuloInventario[] = articulosValidos.map(item => ({
      id: item.id_articulo, id_articulo: item.id_articulo,
      codigo_articulo: item.codigo_articulo, descripcion_articulo: item.descripcion_articulo,
      categoria_nombre: nombreCategoria, espesor_mm: item.espesor_mm || 0,
      largo_lamina: item.largo_lamina_mm || 0, ancho_lamina: item.ancho_lamina_mm || 0,
      largo_lamina_mm: item.largo_lamina_mm || 0, ancho_lamina_mm: item.ancho_lamina_mm || 0,
      ancho_tapacanto_mm: item.ancho_tapacanto_mm || 0, grosor_tapacanto_mm: item.grosor_tapacanto_mm || 0,
      precio_unitario: item.precio_articulo || 0
    }));

    return { data: articulosMapeados, error: null };
  } catch (error) {
    return { data: [], error };
  }
};

// ============================================
// CARGAR PIEZAS DESDE BOM
// ============================================

export const cargarPiezasDesdeBOM = async (
  productoId: number,
  currentStore: { id: string } | null = null
): Promise<{ data: PiezaCorte[] | null; error: any }> => {
  if (!currentStore) {
    return { data: null, error: { message: 'No hay tienda seleccionada' } };
  }

  try {
    // Obtener componentes del BOM
    const { data: bomItems, error: bomError } = await supabase
      .from('bom_items')
      .select(`
        id,
        id_componente,
        cantidad_x_unidad,
        unidad_id,
        precio_ajustado,
        inventario!inner(
          id_articulo,
          codigo_articulo,
          descripcion_articulo,
          categoria_id,
          espesor_mm,
          largo_lamina_mm,
          ancho_lamina_mm,
          precio_articulo
        ),
        unidades_medida!inner(simbolo)
      `)
      .eq('id_producto', productoId);

    if (bomError) throw bomError;

    const piezas: PiezaCorte[] = (bomItems || [])
      .filter((item: any) => {
        // Solo incluir piezas que sean láminas/tableros
        const inv = item.inventario;
        return inv.largo_lamina_mm && inv.ancho_lamina_mm;
      })
      .map((item: any) => {
        const inv = item.inventario;
        const largo = inv.largo_lamina_mm || 0;
        const ancho = inv.ancho_lamina_mm || 0;
        
        return {
          id: `bom-${item.id}`,
          descripcion: inv.descripcion_articulo,
          material_id: inv.id_articulo,
          material_codigo: inv.codigo_articulo,
          material_descripcion: inv.descripcion_articulo,
          material_precio: item.precio_ajustado || inv.precio_articulo,
          material_espesor_mm: inv.espesor_mm,
          material_largo_lamina_mm: inv.largo_lamina_mm,
          material_ancho_lamina_mm: inv.ancho_lamina_mm,
          largo,
          ancho,
          cantidad: item.cantidad_x_unidad,
          veta: determinarVetaAutomatica(largo, ancho),
          tapacantos: [],
          cnc1: '',
          cnc2: '',
          color: generarColorAleatorio()
        } as PiezaCorte;
      });

    return { data: piezas, error: null };
  } catch (error) {
    console.error('Error cargando piezas desde BOM:', error);
    return { data: null, error };
  }
};

// ============================================
// 🆕 CALCULAR DIMENSIONES DE CORTE CON COMPENSACIÓN DE TAPACANTO
// ============================================

/**
 * Calcula las dimensiones de corte ajustadas por grosor de tapacanto
 * 
 * REGLA: Si un lado lleva tapacanto, la dimensión del corte debe reducirse
 * por el grosor para que al pegar el tapacanto la medida final sea la original.
 * 
 * INTERPRETACIÓN POR LADO:
 * - TC Superior e Inferior afectan el ANCHO (porque van a lo largo)
 * - TC Izquierdo y Derecho afectan el LARGO (porque van a lo ancho)
 * 
 * @param pieza - Pieza con dimensiones finales y tapacantos asignados
 * @param inventarioTapacantos - Map con información de tapacantos del inventario
 * @returns Objeto con largo_corte_mm y ancho_corte_mm, o null si hay error
 */
async function calcularDimensionesCorte(
  pieza: PiezaCorte,
  inventarioTapacantos: Map<string, { grosor_mm: number }>
): Promise<{ largo_corte_mm: number; ancho_corte_mm: number; error?: string } | null> {
  const largoOriginal = pieza.largo;
  const anchoOriginal = pieza.ancho;

  // Inicializar ajustes
  let ajusteLargo = 0;
  let ajusteAncho = 0;

  // Procesar cada tapacanto
  if (pieza.tapacantos && pieza.tapacantos.length > 0) {
    for (const tc of pieza.tapacantos) {
      if (!tc.codigo || tc.codigo === 'Sin TC') continue;

      // Buscar grosor en inventario
      const infoTC = inventarioTapacantos.get(tc.codigo);
      const grosor = infoTC?.grosor_mm || tc.grosor_mm || 0;

      if (grosor <= 0) {
        continue;
      }

      // Aplicar ajuste según el lado
      switch (tc.lado) {
        case 'superior':
        case 'inferior':
          // TC Superior e Inferior afectan el ANCHO
          ajusteAncho += grosor;
          break;
        case 'izquierdo':
        case 'derecho':
          // TC Izquierdo y Derecho afectan el LARGO
          ajusteLargo += grosor;
          break;
      }
    }
  }

  // Calcular dimensiones de corte
  const largoCorte = largoOriginal - ajusteLargo;
  const anchoCorte = anchoOriginal - ajusteAncho;

  // 🚨 VALIDACIÓN CRÍTICA: Dimensiones de corte deben ser > 0
  if (largoCorte <= 0) {
    return { largo_corte_mm: largoCorte, ancho_corte_mm: anchoCorte, error: `Dimensión de corte LARGO inválida (${largoCorte} mm). El grosor de los tapacantos izquierdo/derecho (${ajusteLargo} mm) excede la dimensión original (${largoOriginal} mm).` };
  }

  if (anchoCorte <= 0) {
    return { largo_corte_mm: largoCorte, ancho_corte_mm: anchoCorte, error: `Dimensión de corte ANCHO inválida (${anchoCorte} mm). El grosor de los tapacantos superior/inferior (${ajusteAncho} mm) excede la dimensión original (${anchoOriginal} mm).` };
  }

  return {
    largo_corte_mm: largoCorte,
    ancho_corte_mm: anchoCorte
  };
}

// ============================================
// 🆕 OBTENER INFORMACIÓN DE TAPACANTOS DEL INVENTARIO
// ============================================

async function obtenerInfoTapacantos(
  codigosTapacantos: string[],
  currentStore: { id: string } | null
): Promise<Map<string, { grosor_mm: number; precio: number }>> {
  const infoMap = new Map<string, { grosor_mm: number; precio: number }>();

  if (codigosTapacantos.length === 0) return infoMap;

  try {
    const { data, error } = await supabase
      .from('inventario')
      .select('codigo_articulo, grosor_tapacanto_mm, precio_articulo')
      .in('codigo_articulo', codigosTapacantos);

    if (error) {
      return infoMap;
    }

    if (data) {
      data.forEach(item => {
        infoMap.set(item.codigo_articulo, {
          grosor_mm: item.grosor_tapacanto_mm || 0,
          precio: item.precio_articulo || 0
        });
      });
    }
  } catch (error) {
    console.error('❌ [INVENTARIO TC] Error inesperado:', error);
  }

  return infoMap;
}

// ============================================
// ALGORITMO DE OPTIMIZACIÓN DE CORTES 2D
// 🆕 MEJORADO: Agrupa por material y optimiza cada grupo
// 🆕 INCLUYE: Compensación de tapacanto por grosor
// ============================================

export const optimizarCortes = async (
  piezas: PiezaCorte[],
  config: ConfiguracionCorte,
  currentStore: { id: string } | null = null
): Promise<ResultadoOptimizacion> => {
  // 🆕 VALIDACIÓN CRÍTICA: Verificar que hay piezas
  if (!piezas || piezas.length === 0) {
    throw new Error('No hay piezas para optimizar');
  }

  // 🆕 PASO 0: Obtener información de tapacantos del inventario
  const codigosTapacantos = new Set<string>();
  piezas.forEach(pieza => {
    if (pieza.tapacantos) {
      pieza.tapacantos.forEach(tc => {
        if (tc.codigo && tc.codigo !== 'Sin TC') {
          codigosTapacantos.add(tc.codigo);
        }
      });
    }
  });

  const inventarioTapacantos = await obtenerInfoTapacantos(
    Array.from(codigosTapacantos),
    currentStore
  );

  // 🆕 PASO 0.5: Calcular dimensiones de corte para cada pieza
  const piezasConDimensionesCorte: PiezaCorte[] = [];
  const erroresValidacion: string[] = [];

  for (const pieza of piezas) {
    const resultado = await calcularDimensionesCorte(pieza, inventarioTapacantos);
    
    if (resultado?.error) {
      erroresValidacion.push(`Pieza "${pieza.descripcion}": ${resultado.error}`);
      continue;
    }

    if (resultado) {
      // Actualizar pieza con dimensiones de corte
      const piezaActualizada = {
        ...pieza,
        largo_corte_mm: resultado.largo_corte_mm,
        ancho_corte_mm: resultado.ancho_corte_mm
      };
      piezasConDimensionesCorte.push(piezaActualizada);

      // Actualizar grosor en tapacantos
      if (piezaActualizada.tapacantos) {
        piezaActualizada.tapacantos.forEach(tc => {
          if (tc.codigo && tc.codigo !== 'Sin TC') {
            const info = inventarioTapacantos.get(tc.codigo);
            if (info) {
              tc.grosor_mm = info.grosor_mm;
            }
          }
        });
      }
    }
  }

  // 🚨 Si hay errores de validación, lanzar excepción
  if (erroresValidacion.length > 0) {
    const mensajeError = `Errores de validación de dimensiones:\n${erroresValidacion.join('\n')}`;
    throw new Error(mensajeError);
  }

  // 🆕 PASO 1: Agrupar piezas por material_codigo
  const piezasPorMaterial = new Map<string, PiezaCorte[]>();
  
  piezasConDimensionesCorte.forEach(pieza => {
    if (!pieza.material_codigo) {
      return;
    }
    
    const codigo = pieza.material_codigo;
    if (!piezasPorMaterial.has(codigo)) {
      piezasPorMaterial.set(codigo, []);
    }
    piezasPorMaterial.get(codigo)!.push(pieza);
  });

  // 🆕 PASO 2: Obtener dimensiones de lámina desde inventario para cada material
  const resultadosPorMaterial: ResultadoPorMaterial[] = [];
  const todasLasLaminas: LaminaCorte[] = [];
  const todasPiezasSinAsignar: PiezaCorte[] = [];
  let contadorLaminasGlobal = 1;

  piezasPorMaterial.forEach((piezasDelMaterial, codigoMaterial) => {
    const primeraPieza = piezasDelMaterial[0];
    
    // 🆕 VALIDACIÓN CRÍTICA: El material debe tener dimensiones de lámina
    if (!primeraPieza.material_largo_lamina_mm || !primeraPieza.material_ancho_lamina_mm) {
      return;
    }

    // 🆕 Usar dimensiones de inventario (NO de las piezas)
    const laminaBaseMaterial = {
      id: primeraPieza.material_id || 0,
      codigo_articulo: primeraPieza.material_codigo || '',
      descripcion_articulo: primeraPieza.material_descripcion || '',
      precio_unitario: primeraPieza.material_precio || 0,
      largo_lamina_mm: primeraPieza.material_largo_lamina_mm,
      ancho_lamina_mm: primeraPieza.material_ancho_lamina_mm,
      espesor_mm: primeraPieza.material_espesor_mm || 18
    };

    // Optimizar este grupo de piezas
    const { laminas, piezasSinAsignar } = optimizarGrupoDePiezas(
      piezasDelMaterial,
      laminaBaseMaterial,
      config,
      contadorLaminasGlobal
    );

    // 🆕 VALIDACIÓN: Si hay piezas válidas, DEBE haber al menos 1 lámina
    if (piezasDelMaterial.length > piezasSinAsignar.length && laminas.length === 0) {
      throw new Error(`Error en optimización: No se generaron láminas para material ${codigoMaterial}`);
    }

    contadorLaminasGlobal += laminas.length;

    // Calcular métricas para este material
    const totalLaminas = laminas.length;
    const areaTotalUtilizada = laminas.reduce((sum, l) => sum + l.area_utilizada, 0);
    const areaTotalSobrante = laminas.reduce((sum, l) => sum + l.area_sobrante, 0);
    const porcentajePromedio = totalLaminas > 0
      ? laminas.reduce((sum, l) => sum + l.porcentaje_aprovechamiento, 0) / totalLaminas
      : 0;
    const costoTotalLaminas = totalLaminas * laminaBaseMaterial.precio_unitario;

    // 🆕 Solo agregar resultado si se generaron láminas
    if (totalLaminas > 0) {
      resultadosPorMaterial.push({
        material_id: laminaBaseMaterial.id,
        material_codigo: laminaBaseMaterial.codigo_articulo,
        material_descripcion: laminaBaseMaterial.descripcion_articulo,
        espesor_mm: laminaBaseMaterial.espesor_mm,
        largo_lamina_mm: laminaBaseMaterial.largo_lamina_mm,
        ancho_lamina_mm: laminaBaseMaterial.ancho_lamina_mm,
        precio_unitario_lamina: laminaBaseMaterial.precio_unitario,
        laminas,
        total_laminas: totalLaminas,
        area_total_utilizada: areaTotalUtilizada,
        area_total_sobrante: areaTotalSobrante,
        porcentaje_aprovechamiento_promedio: porcentajePromedio,
        costo_total_laminas: costoTotalLaminas,
        piezas_asignadas: piezasDelMaterial.length - piezasSinAsignar.length
      });

      todasLasLaminas.push(...laminas);
    }

    todasPiezasSinAsignar.push(...piezasSinAsignar);
  });

  // 🆕 VALIDACIÓN FINAL: Si había piezas válidas, debe haber al menos 1 lámina
  const piezasValidasTotal = piezasConDimensionesCorte.length - todasPiezasSinAsignar.length;
  if (piezasValidasTotal > 0 && todasLasLaminas.length === 0) {
    throw new Error('Error en optimización: No se pudieron generar láminas para las piezas válidas');
  }

  // 🆕 PASO 3: Calcular totales globales
  const resultado = calcularResultadoGlobal(
    resultadosPorMaterial,
    todasLasLaminas,
    todasPiezasSinAsignar
  );

  // 🆕 VALIDACIÓN FINAL DEL RESULTADO
  if (resultado.total_laminas === 0 && piezasValidasTotal > 0) {
    throw new Error('Error en optimización: No se generaron láminas');
  }

  return resultado;
};

// ============================================
// FUNCIONES AUXILIARES
// ============================================

// 🆕 Crear nueva lámina
function crearNuevaLamina(
  id: number,
  laminaBase: {
    id: number;
    codigo_articulo: string;
    descripcion_articulo: string;
    precio_unitario: number;
    largo_lamina_mm: number;
    ancho_lamina_mm: number;
    espesor_mm: number;
  }
): LaminaCorte {
  return {
    id,
    numero_lamina: id,
    material_id: laminaBase.id,
    material_codigo: laminaBase.codigo_articulo,
    material_descripcion: laminaBase.descripcion_articulo,
    largo: laminaBase.largo_lamina_mm,
    ancho: laminaBase.ancho_lamina_mm,
    espesor: laminaBase.espesor_mm,
    piezas: [],
    area_total: laminaBase.largo_lamina_mm * laminaBase.ancho_lamina_mm,
    area_utilizada: 0,
    area_sobrante: laminaBase.largo_lamina_mm * laminaBase.ancho_lamina_mm,
    porcentaje_aprovechamiento: 0,
    costo_lamina: laminaBase.precio_unitario,
    costo_piezas: 0
  };
}

// 🆕 Calcular métricas de una lámina
function calcularMetricasLamina(lamina: LaminaCorte): void {
  const areaTotal = lamina.largo * lamina.ancho;
  let areaUtilizada = 0;
  let costoPiezas = 0;

  lamina.piezas.forEach(pieza => {
    const piezaLargo = pieza.rotada ? pieza.ancho : pieza.largo;
    const piezaAncho = pieza.rotada ? pieza.largo : pieza.ancho;
    const areaPieza = piezaLargo * piezaAncho;
    areaUtilizada += areaPieza;
    costoPiezas += pieza.costo_pieza || 0;
  });

  lamina.area_utilizada = areaUtilizada;
  lamina.area_sobrante = areaTotal - areaUtilizada;
  lamina.porcentaje_aprovechamiento = areaTotal > 0 ? (areaUtilizada / areaTotal) * 100 : 0;
  lamina.costo_piezas = costoPiezas;
}

// 🆕 Calcular costos de una pieza
function calcularCostosPieza(pieza: PiezaCorte, lamina: LaminaCorte): void {
  const piezaLargo = pieza.rotada ? pieza.ancho : pieza.largo;
  const piezaAncho = pieza.rotada ? pieza.largo : pieza.ancho;
  const areaPieza = (piezaLargo * piezaAncho) / 1000000; // m²
  const areaLamina = (lamina.largo * lamina.ancho) / 1000000; // m²
  
  // 🆕 Costo proporcional del material (lámina)
  pieza.costo_material = areaLamina > 0 ? (areaPieza / areaLamina) * lamina.costo_lamina : 0;
  
  // 🆕 Costo de tapacantos
  pieza.costo_tapacantos = 0;
  pieza.metros_tapacanto_total = 0;
  
  if (pieza.tapacantos && pieza.tapacantos.length > 0) {
    pieza.tapacantos.forEach(tc => {
      if (tc.precio_unitario && tc.metros_lineales) {
        const costoTapacanto = (tc.metros_lineales / 1000) * tc.precio_unitario; // convertir mm a metros
        pieza.costo_tapacantos! += costoTapacanto;
        pieza.metros_tapacanto_total! += tc.metros_lineales / 1000;
      }
    });
  }
  
  // 🆕 Costo de horas máquina (HH)
  // Estimación: 1 segundo por cada 10mm de corte + 5 segundos de setup por pieza
  const perimetroCorte = (piezaLargo + piezaAncho) * 2; // mm
  const segundosCorte = (perimetroCorte / 10) + 5; // segundos estimados
  pieza.hh_segundos = segundosCorte;
  
  // Asumir costo de HH desde configuración o usar valor por defecto
  // Por ahora usamos 0 hasta que se configure en el sistema
  const costoHHPorSegundo = 0; // Se puede configurar después
  pieza.costo_hh = segundosCorte * costoHHPorSegundo;
  
  // 🆕 Costo total de la pieza
  pieza.costo_total = pieza.costo_material + pieza.costo_tapacantos + pieza.costo_hh;
  
  // 🆕 Costo de la pieza para la lámina (solo material proporcional)
  pieza.costo_pieza = pieza.costo_material;
}

// 🆕 Calcular resultado global
function calcularResultadoGlobal(
  resultadosPorMaterial: ResultadoPorMaterial[],
  todasLasLaminas: LaminaCorte[],
  todasPiezasSinAsignar: PiezaCorte[]
): ResultadoOptimizacion {
  const totalLaminas = todasLasLaminas.length;
  const areaTotalUtilizada = todasLasLaminas.reduce((sum, l) => sum + l.area_utilizada, 0);
  const areaTotalSobrante = todasLasLaminas.reduce((sum, l) => sum + l.area_sobrante, 0);
  const areaTotal = areaTotalUtilizada + areaTotalSobrante;
  const porcentajeGlobal = areaTotal > 0 ? (areaTotalUtilizada / areaTotal) * 100 : 0;
  
  // 🆕 CALCULAR COSTOS TOTALES DESDE LAS PIEZAS
  let costoTotalMateriales = 0;
  let costoTotalTapacantos = 0;
  let costoTotalHH = 0;
  
  todasLasLaminas.forEach(lamina => {
    // Costo del material (lámina completa)
    costoTotalMateriales += lamina.costo_lamina;
    
    // Costos de las piezas (tapacantos y HH)
    lamina.piezas.forEach(pieza => {
      costoTotalTapacantos += pieza.costo_tapacantos || 0;
      costoTotalHH += pieza.costo_hh || 0;
    });
  });
  
  const costoTotal = costoTotalMateriales + costoTotalTapacantos + costoTotalHH;

  return {
    laminas: todasLasLaminas,
    total_laminas: totalLaminas,
    area_total_utilizada: areaTotalUtilizada,
    area_total_sobrante: areaTotalSobrante,
    porcentaje_aprovechamiento_global: porcentajeGlobal,
    costo_total_materiales: costoTotalMateriales,
    costo_total_tapacantos: costoTotalTapacantos,
    costo_total_hh: costoTotalHH,
    costo_total: costoTotal,
    piezas_sin_asignar: todasPiezasSinAsignar,
    resultados_por_material: resultadosPorMaterial
  };
}

// Determinar veta automática según dimensiones
function determinarVetaAutomatica(largo: number, ancho: number): TipoVeta {
  if (largo > ancho * 1.5) return 'S';
  if (ancho > largo * 1.5) return 'X';
  return 'N';
}

// Generar color aleatorio para visualización
function generarColorAleatorio(): string {
  const colores = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'
  ];
  return colores[Math.floor(Math.random() * colores.length)];
}

// ============================================
// OPTIMIZAR UN GRUPO DE PIEZAS DEL MISMO MATERIAL
// 🆕 ALGORITMO MEJORADO: Respeta veta y valida dimensiones
// 🆕 USA: Dimensiones de corte (ajustadas por tapacanto)
// ============================================

function optimizarGrupoDePiezas(
  piezas: PiezaCorte[],
  laminaBase: {
    id: number;
    codigo_articulo: string;
    descripcion_articulo: string;
    precio_unitario: number;
    largo_lamina_mm: number;
    ancho_lamina_mm: number;
    espesor_mm: number;
  },
  config: ConfiguracionCorte,
  contadorInicial: number
): { laminas: LaminaCorte[]; piezasSinAsignar: PiezaCorte[] } {
  const laminas: LaminaCorte[] = [];
  let laminaCounter = contadorInicial;

  // 🆕 Definir lado largo y corto de la lámina (para validación de veta)
  const ladoLargoLamina = Math.max(laminaBase.largo_lamina_mm, laminaBase.ancho_lamina_mm);
  const ladoCortoLamina = Math.min(laminaBase.largo_lamina_mm, laminaBase.ancho_lamina_mm);

  // Expandir piezas según cantidad
  const piezasExpandidas: PiezaCorte[] = [];
  piezas.forEach(pieza => {
    for (let i = 0; i < pieza.cantidad; i++) {
      piezasExpandidas.push({
        ...pieza,
        id: `${pieza.id}-${i}`,
        cantidad: 1
      });
    }
  });

  // 🆕 VALIDACIÓN DE VETA: Separar piezas válidas e inválidas
  // 🆕 USAR DIMENSIONES DE CORTE en lugar de dimensiones originales
  const piezasValidas: PiezaCorte[] = [];
  const piezasInvalidas: PiezaCorte[] = [];
  const espacioCorte = config.espesor_sierra + config.margen_seguridad;

  piezasExpandidas.forEach(pieza => {
    // 🆕 Usar dimensiones de corte si existen, sino usar originales
    const largoParaValidar = pieza.largo_corte_mm || pieza.largo;
    const anchoParaValidar = pieza.ancho_corte_mm || pieza.ancho;
    
    const ladoLargoPieza = Math.max(largoParaValidar, anchoParaValidar);
    const ladoCortoPieza = Math.min(largoParaValidar, anchoParaValidar);

    let esValida = false;
    let razonInvalida = '';

    if (pieza.veta === 'S') {
      // Veta S: El lado largo de la pieza debe ir paralelo a la veta de la lámina
      // Por lo tanto, el lado largo de la pieza debe ser <= lado largo de la lámina
      if (ladoLargoPieza + espacioCorte <= ladoLargoLamina && 
          ladoCortoPieza + espacioCorte <= ladoCortoLamina) {
        esValida = true;
      }
    } else if (pieza.veta === 'X') {
      // Veta X: El lado largo de la pieza debe ir perpendicular a la veta de la lámina
      // Por lo tanto, el lado largo de la pieza debe ser <= lado corto de la lámina
      if (ladoLargoPieza + espacioCorte <= ladoCortoLamina && 
          ladoCortoPieza + espacioCorte <= ladoLargoLamina) {
        esValida = true;
      }
    } else {
      // Veta N: Sin restricción, solo verificar que quepa en cualquier orientación
      // 🆕 Usar dimensiones de corte
      if ((largoParaValidar + espacioCorte <= laminaBase.largo_lamina_mm && 
           anchoParaValidar + espacioCorte <= laminaBase.ancho_lamina_mm) ||
          (anchoParaValidar + espacioCorte <= laminaBase.largo_lamina_mm && 
           largoParaValidar + espacioCorte <= laminaBase.ancho_lamina_mm)) {
        esValida = true;
      }
    }

    if (esValida) {
      piezasValidas.push(pieza);
    } else {
      piezasInvalidas.push(pieza);
    }
  });

  // Ordenar piezas por área descendente (usar dimensiones de corte)
  const piezasOrdenadas = [...piezasValidas].sort((a, b) => {
    const areaA = (a.largo_corte_mm || a.largo) * (a.ancho_corte_mm || a.ancho);
    const areaB = (b.largo_corte_mm || b.largo) * (b.ancho_corte_mm || b.ancho);
    return areaB - areaA;
  });

  // Algoritmo de colocación
  let iteracion = 0;
  const MAX_ITERACIONES = 50;
  let laminasSinPiezas = 0;
  const MAX_LAMINAS_VACIAS = 3;

  while (piezasOrdenadas.length > 0 && iteracion < MAX_ITERACIONES) {
    iteracion++;
    
    const lamina = crearNuevaLamina(laminaCounter++, laminaBase);
    
    const resultado = colocarPiezasEnLamina(piezasOrdenadas, lamina, config, laminaBase);
    
    if (lamina.piezas.length > 0) {
      calcularMetricasLamina(lamina);
      laminas.push(lamina);
      laminasSinPiezas = 0;
    } else {
      laminasSinPiezas++;
    }

    if (laminasSinPiezas >= MAX_LAMINAS_VACIAS) {
      break;
    }
  }

  const todasPiezasSinAsignar = [...piezasOrdenadas, ...piezasInvalidas];

  // 🆕 GARANTÍA: Si hay piezas válidas y no se crearon láminas, crear al menos 1
  if (piezasValidas.length > 0 && laminas.length === 0) {
    const laminaMinima = crearNuevaLamina(laminaCounter++, laminaBase);
    calcularMetricasLamina(laminaMinima);
    laminas.push(laminaMinima);
  }

  return {
    laminas,
    piezasSinAsignar: todasPiezasSinAsignar
  };
}

// ============================================
// 🆕 Función mejorada para colocar piezas respetando veta
// 🆕 USA: Dimensiones de corte en lugar de dimensiones originales
function colocarPiezasEnLamina(
  piezas: PiezaCorte[],
  lamina: LaminaCorte,
  config: ConfiguracionCorte,
  laminaBase: {
    largo_lamina_mm: number;
    ancho_lamina_mm: number;
  }
): { piezasColocadas: number } {
  let piezasColocadas = 0;
  const espacioCorte = config.espesor_sierra + config.margen_seguridad;

  const ladoLargoLamina = Math.max(laminaBase.largo_lamina_mm, laminaBase.ancho_lamina_mm);
  const ladoCortoLamina = Math.min(laminaBase.largo_lamina_mm, laminaBase.ancho_lamina_mm);

  // Espacios libres iniciales
  const espaciosLibres: Array<{
    x: number;
    y: number;
    ancho: number;
    alto: number;
  }> = [
    {
      x: 0,
      y: 0,
      ancho: lamina.largo,
      alto: lamina.ancho
    }
  ];

  let intentosSinExito = 0;
  const MAX_INTENTOS = piezas.length;

  while (piezas.length > 0 && intentosSinExito < MAX_INTENTOS) {
    let piezaColocada = false;

    for (let i = 0; i < piezas.length; i++) {
      const pieza = piezas[i];
      let mejorEspacio = -1;
      let mejorDesperdicio = Infinity;
      let mejorRotacion = false;

      // 🆕 Usar dimensiones de corte si existen
      const largoCorte = pieza.largo_corte_mm || pieza.largo;
      const anchoCorte = pieza.ancho_corte_mm || pieza.ancho;

      // Buscar mejor espacio para esta pieza
      for (let j = 0; j < espaciosLibres.length; j++) {
        const espacio = espaciosLibres[j];

        // 🆕 Probar orientaciones según veta
        const orientacionesPermitidas = obtenerOrientacionesPermitidas(pieza, config);

        for (const orientacion of orientacionesPermitidas) {
          const piezaLargo = orientacion.rotada ? anchoCorte : largoCorte;
          const piezaAncho = orientacion.rotada ? largoCorte : anchoCorte;
          const piezaLargoConEspacio = piezaLargo + espacioCorte;
          const piezaAnchoConEspacio = piezaAncho + espacioCorte;

          if (piezaLargoConEspacio <= espacio.ancho && piezaAnchoConEspacio <= espacio.alto) {
            const desperdicio = (espacio.ancho * espacio.alto) - (piezaLargoConEspacio * piezaAnchoConEspacio);
            if (desperdicio < mejorDesperdicio) {
              mejorDesperdicio = desperdicio;
              mejorEspacio = j;
              mejorRotacion = orientacion.rotada;
            }
          }
        }
      }

      // Si encontramos espacio, colocar pieza
      if (mejorEspacio !== -1) {
        const espacio = espaciosLibres[mejorEspacio];
        const rotada = mejorRotacion;
        
        const piezaLargo = rotada ? anchoCorte : largoCorte;
        const piezaAncho = rotada ? largoCorte : anchoCorte;
        const piezaLargoConEspacio = piezaLargo + espacioCorte;
        const piezaAnchoConEspacio = piezaAncho + espacioCorte;

        pieza.posicion_x = espacio.x;
        pieza.posicion_y = espacio.y;
        pieza.rotada = rotada;
        pieza.lamina_asignada = lamina.id;
        
        // 🆕 CORRECCIÓN CRÍTICA: Guardar dimensiones de corte en largo/ancho
        // para que el visualizador renderice las dimensiones ajustadas
        pieza.largo = largoCorte;
        pieza.ancho = anchoCorte;
        
        calcularCostosPieza(pieza, lamina);
        lamina.piezas.push(pieza);

        // Actualizar espacios
        espaciosLibres.splice(mejorEspacio, 1);

        const espacioDerechaAncho = espacio.ancho - piezaLargoConEspacio;
        const espacioArribaAlto = espacio.alto - piezaAnchoConEspacio;

        if (espacioDerechaAncho > 10) {
          espaciosLibres.push({
            x: espacio.x + piezaLargoConEspacio,
            y: espacio.y,
            ancho: espacioDerechaAncho,
            alto: piezaAnchoConEspacio
          });
        }

        if (espacioArribaAlto > 10) {
          espaciosLibres.push({
            x: espacio.x,
            y: espacio.y + piezaAnchoConEspacio,
            ancho: espacio.ancho,
            alto: espacioArribaAlto
          });
        }

        espaciosLibres.sort((a, b) => (b.ancho * b.alto) - (a.ancho * a.alto));

        piezas.splice(i, 1);
        piezasColocadas++;
        piezaColocada = true;
        intentosSinExito = 0;
        break;
      }
    }

    if (!piezaColocada) {
      intentosSinExito++;
    }
  }

  return { piezasColocadas };
}

// 🆕 Obtener orientaciones permitidas según veta
function obtenerOrientacionesPermitidas(
  pieza: PiezaCorte,
  config: ConfiguracionCorte
): Array<{ rotada: boolean }> {
  const orientaciones: Array<{ rotada: boolean }> = [];

  if (pieza.veta === 'N') {
    // Sin veta: permitir ambas orientaciones si rotación está habilitada
    orientaciones.push({ rotada: false });
    if (config.permitir_rotacion) {
      orientaciones.push({ rotada: true });
    }
  } else if (pieza.veta === 'S') {
    // Veta S: lado largo paralelo a veta (normal)
    orientaciones.push({ rotada: false });
  } else if (pieza.veta === 'X') {
    // Veta X: lado largo perpendicular a veta (rotada)
    if (config.permitir_rotacion) {
      orientaciones.push({ rotada: true });
    } else {
      // Si no se permite rotación, intentar normal
      orientaciones.push({ rotada: false });
    }
  }

  return orientaciones;
}

// ============================================
// GUARDAR Y CARGAR PROYECTOS
// ============================================

export const guardarProyecto = async (
  proyecto: ProyectoOptimizador,
  currentStore: { id: string } | null,
  userId: string
) => {
  if (!currentStore) {
    return { data: null, error: { message: 'No hay tienda seleccionada' } };
  }

  try {
    const proyectoData = {
      nombre: proyecto.nombre,
      descripcion: proyecto.descripcion,
      modo: proyecto.modo,
      producto_bom_id: proyecto.producto_bom_id,
      piezas: JSON.stringify(proyecto.piezas),
      configuracion: JSON.stringify(proyecto.configuracion),
      resultado: proyecto.resultado ? JSON.stringify(proyecto.resultado) : null,
      tienda_id: currentStore.id,
      usuario_id: userId
    };

    if (proyecto.id) {
      // Actualizar
      const { data, error } = await supabase
        .from('proyectos_optimizador')
        .update(proyectoData)
        .eq('id', proyecto.id)
        .eq('tienda_id', currentStore.id)
        .select()
        .single();

      return { data, error };
    } else {
      // Crear
      const { data, error } = await supabase
        .from('proyectos_optimizador')
        .insert([proyectoData])
        .select()
        .single();

      return { data, error };
    }
  } catch (error) {
    console.error('Error guardando proyecto:', error);
    return { data: null, error };
  }
};

export const cargarProyectos = async (currentStore: { id: string } | null) => {
  if (!currentStore) {
    return { data: [], error: { message: 'No hay tienda seleccionada' } };
  }

  try {
    const { data, error } = await supabase
      .from('proyectos_optimizador')
      .select('*')
      .eq('tienda_id', currentStore.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const proyectos: ProyectoOptimizador[] = (data || []).map((p: any) => ({
      ...p,
      piezas: JSON.parse(p.piezas || '[]'),
      configuracion: JSON.parse(p.configuracion || '{}'),
      resultado: p.resultado ? JSON.parse(p.resultado) : undefined
    }));

    return { data: proyectos, error: null };
  } catch (error) {
    console.error('Error cargando proyectos:', error);
    return { data: [], error };
  }
};
