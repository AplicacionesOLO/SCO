import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import OptimizadorLayout from './components/OptimizadorLayout';
import SelectorModo from './components/SelectorModo';
import SelectorProductoBOM from './components/SelectorProductoBOM';
import EditorPiezas from './components/EditorPiezas';
import VisualizadorCortes from './components/VisualizadorCortes';
import PanelResultados from './components/PanelResultados';
import ConfiguracionModal from './components/ConfiguracionModal';
import ExportarExcelModal from './components/ExportarExcelModal';
import ImportarExcelModal from './components/ImportarExcelModal';
import CrearCotizacionModal from './components/CrearCotizacionModal';
import { 
  ProyectoOptimizador, 
  ModoOptimizador, 
  PiezaCorte,
  ConfiguracionCorte,
  ResultadoOptimizacion,
  ArticuloInventario
} from '../../types/optimizador';
import { 
  optimizarCortes,
  cargarPiezasDesdeBOM,
  buscarArticulosInventario
} from '../../services/optimizadorService';
// 🆕 Importar servicio de proyectos temporales
import {
  guardarProyectoOptimizador,
  obtenerProyectoActivo,
  PiezaOptimizador,
  ResultadoMaterial,
  ResumenProyecto
} from '../../services/optimizadorProyectoService';
import { useNotification } from '../../hooks/useNotification';
import * as XLSX from 'xlsx';

export default function OptimizadorPage() {
  const { currentStore, user } = useAuth();
  const { showNotification } = useNotification();
  
  const [modo, setModo] = useState<ModoOptimizador>('manual');
  const [piezas, setPiezas] = useState<PiezaCorte[]>([]);
  const [configuracion, setConfiguracion] = useState<ConfiguracionCorte>({
    espesor_sierra: 3,
    margen_seguridad: 5,
    permitir_rotacion: true,
    optimizar_desperdicio: true
  });
  const [resultado, setResultado] = useState<ResultadoOptimizacion | null>(null);
  const [loading, setLoading] = useState(false);
  const [mostrarConfiguracion, setMostrarConfiguracion] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showCrearCotizacion, setShowCrearCotizacion] = useState(false);
  const [productoBOM, setProductoBOM] = useState<{id: number; nombre: string} | null>(null);
  // 🆕 ID del proyecto temporal actual
  const [proyectoId, setProyectoId] = useState<string | null>(null);

  // 🆕 Cargar proyecto activo al iniciar
  useEffect(() => {
    cargarProyectoActivo();
  }, []);

  const cargarProyectoActivo = async () => {
    try {
      const proyecto = await obtenerProyectoActivo();
      if (proyecto) {
        console.log('📂 Proyecto activo cargado:', proyecto);
        setProyectoId(proyecto.id_proyecto || null);
        // Convertir piezas del formato de BD al formato de la app
        if (proyecto.piezas && proyecto.piezas.length > 0) {
          const piezasConvertidas = proyecto.piezas.map((p: PiezaOptimizador) => ({
            id: Math.random().toString(36).substr(2, 9),
            descripcion: p.descripcion,
            largo: p.largo,
            ancho: p.ancho,
            cantidad: p.cantidad,
            veta: p.veta,
            material_codigo: p.codigo_material,
            material_nombre: p.nombre_material,
            tapacantos: [
              { lado: 'largo_sup', codigo: p.tapacanto_superior },
              { lado: 'largo_inf', codigo: p.tapacanto_inferior },
              { lado: 'ancho_inf', codigo: p.tapacanto_izquierdo },
              { lado: 'ancho_sup', codigo: p.tapacanto_derecho }
            ],
            cnc1: p.cnc1,
            cnc1_codigo: p.cnc1_codigo || '', // 🆕 Cargar código CNC1
            cnc1_cantidad: p.cnc1_cantidad || 0, // 🆕 Cargar cantidad CNC1
            cnc2: p.cnc2,
            cnc2_codigo: p.cnc2_codigo || '', // 🆕 Cargar código CNC2
            cnc2_cantidad: p.cnc2_cantidad || 0 // 🆕 Cargar cantidad CNC2
          }));
          setPiezas(piezasConvertidas as PiezaCorte[]);
          console.log('✅ Piezas cargadas con CNC:', piezasConvertidas.map(p => ({
            descripcion: p.descripcion,
            cnc1: p.cnc1_codigo ? `${p.cnc1_codigo} x ${p.cnc1_cantidad}` : '-',
            cnc2: p.cnc2_codigo ? `${p.cnc2_codigo} x ${p.cnc2_cantidad}` : '-'
          })));
        }
      }
    } catch (error) {
      console.error('Error cargando proyecto activo:', error);
    }
  };

  // 🆕 Guardar proyecto automáticamente cuando cambian piezas o resultados
  useEffect(() => {
    if (piezas.length > 0 || resultado) {
      guardarProyectoAutomaticamente();
    }
  }, [piezas, resultado]);

  const guardarProyectoAutomaticamente = async () => {
    try {
      // Convertir piezas al formato de BD
      const piezasParaBD: PiezaOptimizador[] = piezas.map(p => ({
        descripcion: p.descripcion || '',
        largo: p.largo,
        ancho: p.ancho,
        cantidad: p.cantidad,
        veta: p.veta,
        tapacanto_superior: p.tapacantos.find(tc => tc.lado === 'largo_sup')?.codigo || '',
        tapacanto_inferior: p.tapacantos.find(tc => tc.lado === 'largo_inf')?.codigo || '',
        tapacanto_izquierdo: p.tapacantos.find(tc => tc.lado === 'ancho_inf')?.codigo || '',
        tapacanto_derecho: p.tapacantos.find(tc => tc.lado === 'ancho_sup')?.codigo || '',
        cnc1: p.cnc1 || '',
        cnc1_codigo: p.cnc1_codigo || '', // 🆕 Guardar código CNC1
        cnc1_cantidad: p.cnc1_cantidad || 0, // 🆕 Guardar cantidad CNC1
        cnc2: p.cnc2 || '',
        cnc2_codigo: p.cnc2_codigo || '', // 🆕 Guardar código CNC2
        cnc2_cantidad: p.cnc2_cantidad || 0, // 🆕 Guardar cantidad CNC2
        codigo_material: p.material_codigo || '',
        nombre_material: p.material_nombre || '',
        precio_unitario: 0,
        subtotal: 0
      }));

      console.log('💾 [GUARDAR] Piezas con CNC:', piezasParaBD.map(p => ({
        descripcion: p.descripcion,
        cnc1: p.cnc1_codigo ? `${p.cnc1_codigo} x ${p.cnc1_cantidad}` : '-',
        cnc2: p.cnc2_codigo ? `${p.cnc2_codigo} x ${p.cnc2_cantidad}` : '-'
      })));

      // Convertir resultados al formato de BD
      const resultadosParaBD: Record<string, ResultadoMaterial> = {};
      if (resultado?.resultados_por_material) {
        resultado.resultados_por_material.forEach(rm => {
          resultadosParaBD[rm.codigo_material] = {
            codigo_material: rm.codigo_material,
            nombre_material: rm.nombre_material,
            dimensiones: rm.dimensiones,
            precio_lamina: rm.precio_lamina,
            laminas_usadas: rm.laminas_usadas,
            aprovechamiento_promedio: rm.aprovechamiento_promedio,
            total_piezas: rm.total_piezas,
            costo_total: rm.costo_total,
            area_utilizada: rm.area_utilizada,
            area_sobrante: rm.area_sobrante,
            detalle_laminas: rm.detalle_laminas
          };
        });
      }

      // Preparar resumen
      const resumen: ResumenProyecto = {
        total_laminas: resultado?.total_laminas || 0,
        aprovechamiento_promedio: resultado?.porcentaje_aprovechamiento_global || 0,
        total_piezas: piezas.length,
        costo_total: resultado?.costo_total || 0,
        costo_materiales: resultado?.costo_materiales || 0,
        costo_tapacantos: resultado?.costo_tapacantos || 0,
        costo_horas_maquina: resultado?.costo_horas_maquina || 0,
        area_utilizada: resultado?.area_utilizada || 0,
        area_sobrante: resultado?.area_sobrante || 0
      };

      const respuesta = await guardarProyectoOptimizador({
        id_proyecto: proyectoId || undefined,
        piezas: piezasParaBD,
        resultados_optimizacion: resultadosParaBD,
        resumen: resumen,
        nombre_proyecto: `Proyecto ${new Date().toLocaleDateString()}`
      });

      if (respuesta.success && respuesta.id_proyecto) {
        setProyectoId(respuesta.id_proyecto);
        console.log('✅ Proyecto guardado automáticamente:', respuesta.id_proyecto);
      }
    } catch (error) {
      console.error('Error guardando proyecto automáticamente:', error);
    }
  };

  const handleCambiarModo = (nuevoModo: ModoOptimizador) => {
    setModo(nuevoModo);
    setPiezas([]);
    setResultado(null);
    setProductoBOM(null);
  };

  const handleProductoBOMSelect = async (productoId: number, productoNombre: string) => {
    setLoading(true);
    try {
      const { data, error } = await cargarPiezasDesdeBOM(productoId, currentStore);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setPiezas(data);
        setProductoBOM({ id: productoId, nombre: productoNombre });
        showNotification('success', `Se cargaron ${data.length} piezas desde el BOM`);
      } else {
        showNotification('warning', 'El producto no tiene piezas válidas en el BOM');
      }
    } catch (error) {
      console.error('Error cargando BOM:', error);
      showNotification('error', 'Error al cargar las piezas del BOM');
    } finally {
      setLoading(false);
    }
  };

  const handleExportarExcel = () => {
    setShowExport(true);
  };

  const handleAgregarPieza = (pieza: PiezaCorte) => {
    setPiezas([...piezas, pieza]);
    setResultado(null);
  };

  const handleEditarPieza = (index: number, piezaEditada: PiezaCorte) => {
    const nuevasPiezas = [...piezas];
    nuevasPiezas[index] = piezaEditada;
    setPiezas(nuevasPiezas);
    setResultado(null);
  };

  const handleEliminarPieza = (index: number) => {
    const nuevasPiezas = piezas.filter((_, i) => i !== index);
    setPiezas(nuevasPiezas);
    setResultado(null);
  };

  const handleOptimizar = async () => {
    console.log('🎯 [OPTIMIZAR] Botón presionado', {
      total_piezas: piezas.length,
      piezas: piezas.map(p => ({
        descripcion: p.descripcion,
        material: p.material_codigo,
        dimensiones: `${p.largo}x${p.ancho}`,
        tiene_dimensiones_lamina: !!(p.material_largo_lamina_mm && p.material_ancho_lamina_mm)
      }))
    });

    // 🆕 Validar que todas las piezas tengan material asignado
    const piezasSinMaterial = piezas.filter(p => !p.material_codigo);
    if (piezasSinMaterial.length > 0) {
      console.error('❌ [OPTIMIZAR] Piezas sin material:', piezasSinMaterial);
      showNotification('error', `Hay ${piezasSinMaterial.length} pieza(s) sin material asignado`);
      return;
    }

    // 🆕 Validar que todas las piezas con material tengan dimensiones de lámina
    const piezasSinDimensiones = piezas.filter(p => 
      p.material_codigo && (!p.material_largo_lamina_mm || !p.material_ancho_lamina_mm)
    );
    if (piezasSinDimensiones.length > 0) {
      console.error('❌ [OPTIMIZAR] Piezas sin dimensiones de lámina:', piezasSinDimensiones);
      showNotification('error', 
        `Hay ${piezasSinDimensiones.length} pieza(s) cuyo material no tiene dimensiones de lámina configuradas en inventario`
      );
      return;
    }

    if (piezas.length === 0) {
      console.warn('⚠️ [OPTIMIZAR] No hay piezas para optimizar');
      showNotification('error', 'Debes agregar al menos una pieza');
      return;
    }

    console.log('✅ [OPTIMIZAR] Validaciones pasadas, iniciando optimización...');
    setLoading(true);
    
    try {
      console.log('🚀 [OPTIMIZAR] Llamando a optimizarCortes...');
      const resultadoOptimizacion = await optimizarCortes(piezas, configuracion, currentStore);
      
      console.log('📊 [OPTIMIZAR] Resultado obtenido:', {
        total_laminas: resultadoOptimizacion.total_laminas,
        laminas: resultadoOptimizacion.laminas.length,
        aprovechamiento: resultadoOptimizacion.porcentaje_aprovechamiento_global,
        materiales: resultadoOptimizacion.resultados_por_material?.length || 0,
        piezas_sin_asignar: resultadoOptimizacion.piezas_sin_asignar.length
      });
      
      setResultado(resultadoOptimizacion);
      
      if (resultadoOptimizacion.piezas_sin_asignar.length > 0) {
        showNotification('warning', 
          `Optimización completada. ${resultadoOptimizacion.piezas_sin_asignar.length} piezas no pudieron ser asignadas`
        );
      } else {
        showNotification('success', 
          `Optimización completada. Se utilizaron ${resultadoOptimizacion.total_laminas} láminas con ${resultadoOptimizacion.porcentaje_aprovechamiento_global.toFixed(1)}% de aprovechamiento`
        );
      }
    } catch (error) {
      console.error('❌ [OPTIMIZAR] Error en optimización:', error);
      showNotification('error', 'Error al optimizar los cortes: ' + (error as Error).message);
    } finally {
      setLoading(false);
      console.log('🏁 [OPTIMIZAR] Proceso finalizado');
    }
  };

  const handleLimpiar = () => {
    setPiezas([]);
    setResultado(null);
    setProductoBOM(null);
    setProyectoId(null); // 🆕 Limpiar ID del proyecto
  };

  // 🆕 Función para exportar piezas a Excel
  const handleGuardarProyecto = () => {
    console.log('=== GUARDAR PROYECTO START ===');
    console.log('Total piezas:', piezas.length);
    
    if (piezas.length === 0) {
      showNotification('warning', 'No hay piezas para exportar');
      return;
    }

    try {
      console.log('📊 [GUARDAR] Preparando datos para Excel...');
      
      // Preparar datos para Excel
      const datosExcel = piezas.map((pieza, index) => {
        console.log(`=== DEBUG PIEZA ${index + 1} ===`);
        console.log('Descripción:', pieza.descripcion);
        console.log('CNC1:', pieza.cnc1_codigo, 'Cantidad:', pieza.cnc1_cantidad);
        console.log('CNC2:', pieza.cnc2_codigo, 'Cantidad:', pieza.cnc2_cantidad);
        console.log('Tapacantos array:', pieza.tapacantos);
        console.log('Tapacantos length:', pieza.tapacantos?.length || 0);
        
        if (pieza.tapacantos && pieza.tapacantos.length > 0) {
          pieza.tapacantos.forEach((tc, i) => {
            console.log(`TC[${i}]:`, tc);
          });
        }
        
        // 🔧 CORREGIDO: Usar los nombres correctos de lados
        const tcSuperior = pieza.tapacantos?.find(tc => tc.lado === 'superior');
        const tcInferior = pieza.tapacantos?.find(tc => tc.lado === 'inferior');
        const tcIzquierdo = pieza.tapacantos?.find(tc => tc.lado === 'izquierdo');
        const tcDerecho = pieza.tapacantos?.find(tc => tc.lado === 'derecho');

        console.log('TC encontrados:', {
          superior: tcSuperior?.codigo || 'N/A',
          inferior: tcInferior?.codigo || 'N/A',
          izquierdo: tcIzquierdo?.codigo || 'N/A',
          derecho: tcDerecho?.codigo || 'N/A'
        });
        console.log('==================');

        return {
          'Descripción': pieza.descripcion || '',
          'Material': pieza.material_codigo || '',
          'Largo': pieza.largo,
          'Ancho': pieza.ancho,
          'Cantidad': pieza.cantidad,
          'Veta': pieza.veta, // S, X o N
          'TC Superior': tcSuperior?.codigo || '',
          'TC Inferior': tcInferior?.codigo || '',
          'TC Izquierdo': tcIzquierdo?.codigo || '',
          'TC Derecho': tcDerecho?.codigo || '',
          'CNC1': pieza.cnc1_codigo || '',
          'CNC1 Cantidad': pieza.cnc1_cantidad || 0,
          'CNC2': pieza.cnc2_codigo || '',
          'CNC2 Cantidad': pieza.cnc2_cantidad || 0
        };
      });

      console.log('✅ [GUARDAR] Datos preparados:', datosExcel.length, 'filas');
      console.log('📋 [GUARDAR] Ejemplo de datos CNC:', datosExcel.map(d => ({
        descripcion: d['Descripción'],
        cnc1: d['CNC1'],
        cnc1_cantidad: d['CNC1 Cantidad'],
        cnc2: d['CNC2'],
        cnc2_cantidad: d['CNC2 Cantidad']
      })));

      // Crear workbook
      const ws = XLSX.utils.json_to_sheet(datosExcel);
      const wb = XLSX.utils.book_new();
      
      // Ajustar anchos de columna
      ws['!cols'] = [
        { wch: 30 }, // Descripción
        { wch: 15 }, // Material
        { wch: 10 }, // Largo
        { wch: 10 }, // Ancho
        { wch: 10 }, // Cantidad
        { wch: 8 },  // Veta
        { wch: 15 }, // TC Superior
        { wch: 15 }, // TC Inferior
        { wch: 15 }, // TC Izquierdo
        { wch: 15 }, // TC Derecho
        { wch: 15 }, // CNC1
        { wch: 12 }, // CNC1 Cantidad
        { wch: 15 }, // CNC2
        { wch: 12 }  // CNC2 Cantidad
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Piezas');

      // Generar nombre de archivo con fecha
      const fecha = new Date().toISOString().split('T')[0];
      const nombreArchivo = `Proyecto_Optimizador_${fecha}.xlsx`;

      console.log('📥 [GUARDAR] Descargando archivo:', nombreArchivo);

      // Descargar archivo
      XLSX.writeFile(wb, nombreArchivo);

      console.log('=== GUARDAR PROYECTO END OK ===');
      showNotification('success', `Proyecto exportado: ${nombreArchivo}`);
    } catch (error) {
      console.error('❌ [GUARDAR] Error al exportar:', error);
      showNotification('error', 'Error al exportar el proyecto');
    }
  };

  // 🆕 Función para importar piezas desde Excel
  const handleCargarProyecto = (piezasImportadas: PiezaCorte[]) => {
    setPiezas(piezasImportadas);
    setResultado(null);
    showNotification('success', `Se cargaron ${piezasImportadas.length} piezas desde el archivo`);
  };

  // 🆕 Función para exportar Excel automáticamente antes de crear cotización
  const exportarExcelAutomatico = () => {
    if (!resultado || piezas.length === 0) {
      return;
    }

    try {
      console.log('📥 [AUTO-EXPORT] Exportando Excel automáticamente...');
      console.log('📊 [CREAR COT] Preparando hoja "Detalle Piezas"...');
      
      // Crear workbook
      const wb = XLSX.utils.book_new();

      // ============================================
      // HOJA 1: RESUMEN GENERAL
      // ============================================
      const resumenData = [
        ['OPTIMIZADOR DE CORTES 2D - RESUMEN GENERAL'],
        [''],
        ['Fecha:', new Date().toLocaleDateString('es-CR')],
        [''],
        ['RESULTADOS DE OPTIMIZACIÓN'],
        ['Total de Láminas:', resultado.total_laminas],
        ['Aprovechamiento Global:', `${resultado.porcentaje_aprovechamiento_global.toFixed(2)}%`],
        ['Área Total Utilizada:', `${resultado.area_total_utilizada.toFixed(4)} m²`],
        ['Área Total Sobrante:', `${resultado.area_total_sobrante.toFixed(4)} m²`],
        [''],
        ['COSTOS'],
        ['Materiales (Láminas):', `₡${resultado.costo_total_materiales.toLocaleString('es-CR')}`],
        ['Tapacantos:', `₡${resultado.costo_total_tapacantos.toLocaleString('es-CR')}`],
        ['Horas Máquina (HH):', `₡${resultado.costo_total_hh.toLocaleString('es-CR')}`],
        ['TOTAL:', `₡${resultado.costo_total.toLocaleString('es-CR')}`],
      ];

      const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
      wsResumen['!cols'] = [{ wch: 25 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

      // ============================================
      // HOJA 2: DETALLE DE PIEZAS (CORREGIDO)
      // ============================================
      const encabezadosDetalle = [
        'Descripción',
        'Material (Código)',
        'Largo (mm)',
        'Ancho (mm)',
        'Cantidad',
        'Veta',
        'Largo Inf',
        'Largo Sup',
        'Ancho Inf',
        'Ancho Sup',
        'CNC1',
        'CNC2',
        'm² Usados',
        'Tapacanto (m)',
        'HH (segundos)',
        'Total Pieza'
      ];

      const filasDetalle: any[][] = [];

      piezas.forEach((pieza, index) => {
        console.log(`=== DEBUG PIEZA ${index + 1} (CREAR COT) ===`);
        console.log('Descripción:', pieza.descripcion);
        console.log('Tapacantos array:', pieza.tapacantos);
        console.log('Tapacantos length:', pieza.tapacantos?.length || 0);
        
        if (pieza.tapacantos && pieza.tapacantos.length > 0) {
          pieza.tapacantos.forEach((tc, i) => {
            console.log(`TC[${i}]:`, tc);
          });
        }

        const areaUnitaria = (pieza.largo * pieza.ancho) / 1000000;
        const areaTotal = areaUnitaria * pieza.cantidad;
        
        const largoInf = pieza.tapacantos.find(tc => tc.lado === 'largo_inf');
        const largoSup = pieza.tapacantos.find(tc => tc.lado === 'largo_sup');
        const anchoInf = pieza.tapacantos.find(tc => tc.lado === 'ancho_inf');
        const anchoSup = pieza.tapacantos.find(tc => tc.lado === 'ancho_sup');

        console.log('CNC1:', pieza.cnc1_codigo, 'Cantidad:', pieza.cnc1_cantidad);
        console.log('CNC2:', pieza.cnc2_codigo, 'Cantidad:', pieza.cnc2_cantidad);
        console.log('TC encontrados:', {
          largoInf: largoInf?.codigo || 'N/A',
          largoSup: largoSup?.codigo || 'N/A',
          anchoInf: anchoInf?.codigo || 'N/A',
          anchoSup: anchoSup?.codigo || 'N/A'
        });
        console.log('==================');

        filasDetalle.push([
          pieza.descripcion,
          pieza.material_codigo || '',
          pieza.largo,
          pieza.ancho,
          pieza.cantidad,
          pieza.veta,
          largoInf?.codigo || '',
          largoSup?.codigo || '',
          anchoInf?.codigo || '',
          anchoSup?.codigo || '',
          pieza.cnc1_codigo || '',
          pieza.cnc2_codigo || '',
          areaTotal.toFixed(4),
          pieza.metros_tapacanto_total?.toFixed(2) || '0',
          pieza.hh_segundos || 0,
          pieza.costo_total?.toFixed(2) || '0'
        ]);
      });

      // Totales
      const totalM2 = piezas.reduce((sum, p) => sum + ((p.largo * p.ancho * p.cantidad) / 1000000), 0);
      const totalTapacantos = piezas.reduce((sum, p) => sum + (p.metros_tapacanto_total || 0), 0);
      const totalHH = piezas.reduce((sum, p) => sum + (p.hh_segundos || 0), 0);
      const totalCosto = piezas.reduce((sum, p) => sum + (p.costo_total || 0), 0);

      filasDetalle.push([
        'TOTALES',
        '',
        '',
        '',
        piezas.reduce((sum, p) => sum + p.cantidad, 0),
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        totalM2.toFixed(4),
        totalTapacantos.toFixed(2),
        totalHH,
        totalCosto.toFixed(2)
      ]);

      console.log('📋 [CREAR COT] Ejemplo de datos Detalle Piezas:', filasDetalle.slice(0, 2));

      // 🔧 CREAR HOJA CON ENCABEZADOS EN ESPAÑOL
      const wsDetalle = XLSX.utils.aoa_to_sheet([encabezadosDetalle, ...filasDetalle]);
      
      // Anchos de columna
      wsDetalle['!cols'] = [
        { wch: 30 }, // Descripción
        { wch: 15 }, // Material
        { wch: 12 }, // Largo
        { wch: 12 }, // Ancho
        { wch: 10 }, // Cantidad
        { wch: 8 },  // Veta
        { wch: 12 }, // Largo Inf
        { wch: 12 }, // Largo Sup
        { wch: 12 }, // Ancho Inf
        { wch: 12 }, // Ancho Sup
        { wch: 20 }, // CNC1
        { wch: 20 }, // CNC2
        { wch: 12 }, // m² Usados
        { wch: 15 }, // Tapacantos
        { wch: 12 }, // HH
        { wch: 15 }  // Total
      ];

      XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle Piezas');

      // ============================================
      // HOJA 3: DETALLE POR LÁMINA
      // ============================================
      const detalleLaminasData: any[][] = [
        ['DETALLE POR LÁMINA'],
        ['']
      ];

      resultado.laminas.forEach((lamina) => {
        detalleLaminasData.push([`LÁMINA ${lamina.id}`]);
        detalleLaminasData.push([
          'Material:', lamina.material_descripcion,
          'Dimensiones:', `${lamina.largo} × ${lamina.ancho} mm`,
          'Espesor:', `${lamina.espesor} mm`
        ]);
        detalleLaminasData.push([
          'Área Total:', `${lamina.area_total.toFixed(4)} m²`,
          'Área Utilizada:', `${lamina.area_utilizada.toFixed(4)} m²`,
          'Área Sobrante:', `${lamina.area_sobrante.toFixed(4)} m²`,
          'Aprovechamiento:', `${lamina.porcentaje_aprovechamiento.toFixed(2)}%`
        ]);
        detalleLaminasData.push(['']);
        detalleLaminasData.push(['#', 'Descripción', 'Largo', 'Ancho', 'Veta', 'Rotada', 'Posición X', 'Posición Y']);
        
        lamina.piezas.forEach((pieza, index) => {
          detalleLaminasData.push([
            index + 1,
            pieza.descripcion,
            pieza.largo,
            pieza.ancho,
            pieza.veta,
            pieza.rotada ? 'Sí' : 'No',
            pieza.posicion_x || 0,
            pieza.posicion_y || 0
          ]);
        });
        
        detalleLaminasData.push(['']);
        detalleLaminasData.push(['']);
      });

      const wsLaminas = XLSX.utils.aoa_to_sheet(detalleLaminasData);
      wsLaminas['!cols'] = [
        { wch: 8 },
        { wch: 30 },
        { wch: 12 },
        { wch: 12 },
        { wch: 8 },
        { wch: 10 },
        { wch: 12 },
        { wch: 12 }
      ];

      XLSX.utils.book_append_sheet(wb, wsLaminas, 'Detalle Láminas');

      // ============================================
      // HOJA 4: PIEZAS SIN ASIGNAR (si hay)
      // ============================================
      if (resultado.piezas_sin_asignar.length > 0) {
        const sinAsignarData: any[][] = [
          ['PIEZAS SIN ASIGNAR'],
          [''],
          ['Las siguientes piezas no pudieron ser asignadas a ninguna lámina:'],
          [''],
          ['Descripción', 'Largo (mm)', 'Ancho (mm)', 'Cantidad', 'Veta']
        ];

        resultado.piezas_sin_asignar.forEach((pieza) => {
          sinAsignarData.push([
            pieza.descripcion,
            pieza.largo,
            pieza.ancho,
            pieza.cantidad,
            pieza.veta
          ]);
        });

        const wsSinAsignar = XLSX.utils.aoa_to_sheet(sinAsignarData);
        wsSinAsignar['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 8 }];
        XLSX.utils.book_append_sheet(wb, wsSinAsignar, 'Sin Asignar');
      }

      // 🔧 GENERAR NOMBRE DE ARCHIVO (solo letras, números y guiones bajos)
      const fecha = new Date();
      const anio = fecha.getFullYear();
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      const dia = String(fecha.getDate()).padStart(2, '0');
      
      const nombreArchivo = `SCO_Optimizacion_${anio}-${mes}-${dia}.xlsx`;
      
      console.log(`✅ [AUTO-EXPORT] Nombre generado: ${nombreArchivo}`);

      // 🔧 MÉTODO BLOB + LINK MANUAL (en lugar de writeFile)
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob(
        [wbout],
        { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
      );
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = nombreArchivo;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log(`✅ [AUTO-EXPORT] Excel exportado con 4 hojas: ${nombreArchivo}`);
      showNotification('success', `Excel guardado: ${nombreArchivo}`);

    } catch (error) {
      console.error('❌ [AUTO-EXPORT] Error al exportar:', error);
      showNotification('error', 'Error al exportar el Excel automáticamente');
    }
  };

  // 🆕 Función modificada para crear cotización con exportación automática
  const handleCrearCotizacionConExport = () => {
    // 1. Primero exportar el Excel automáticamente
    exportarExcelAutomatico();
    
    // 2. Pequeña pausa para que el usuario vea la notificación
    setTimeout(() => {
      // 3. Luego abrir el modal de cotización
      setShowCrearCotizacion(true);
    }, 500);
  };

  return (
    <OptimizadorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Optimizador de Cortes</h1>
            <p className="text-sm text-gray-600 mt-1">
              Optimiza el corte de láminas para minimizar desperdicios
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* 🔧 MODIFICADO: Botón Crear Cotización con exportación automática */}
            {resultado && (
              <button 
                onClick={handleCrearCotizacionConExport}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <i className="ri-file-text-line"></i>
                Crear Cotización
              </button>
            )}
            
            {/* 🆕 Botón Guardar Proyecto (Exportar Excel) */}
            <button 
              onClick={handleGuardarProyecto}
              disabled={piezas.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 whitespace-nowrap disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <i className="ri-file-excel-2-line"></i>
              Guardar Proyecto
            </button>
            
            {/* 🆕 Botón Cargar Proyecto (Importar Excel) */}
            <ImportarExcelModal onImportar={handleCargarProyecto} />
          </div>
        </div>

        {/* Selector de Modo */}
        <SelectorModo modo={modo} onCambiarModo={handleCambiarModo} productoBOM={productoBOM} />

        {/* Configuración */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <button
            onClick={() => setMostrarConfiguracion(!mostrarConfiguracion)}
            className="w-full flex items-center justify-between text-left"
          >
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <i className="ri-settings-3-line text-blue-600"></i>
              Configuración de Corte
            </h3>
            <i className={`ri-arrow-${mostrarConfiguracion ? 'up' : 'down'}-s-line text-gray-600`}></i>
          </button>
          {mostrarConfiguracion && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Espesor de Sierra */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Espesor de Sierra (Kerf) - mm
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={configuracion.espesor_sierra}
                  onChange={(e) => setConfiguracion({ ...configuracion, espesor_sierra: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Espacio que ocupa la sierra al cortar. Típicamente 3-4 mm.
                </p>
              </div>

              {/* Margen de Seguridad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Margen de Seguridad - mm
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={configuracion.margen_seguridad}
                  onChange={(e) => setConfiguracion({ ...configuracion, margen_seguridad: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Espacio adicional entre piezas para evitar errores de corte.
                </p>
              </div>

              {/* Permitir Rotación */}
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <input
                  type="checkbox"
                  id="permitir_rotacion"
                  checked={configuracion.permitir_rotacion}
                  onChange={(e) => setConfiguracion({ ...configuracion, permitir_rotacion: e.target.checked })}
                  className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="flex-1">
                  <label htmlFor="permitir_rotacion" className="block text-sm font-medium text-gray-900 cursor-pointer">
                    Permitir Rotación de Piezas
                  </label>
                  <p className="text-xs text-gray-600 mt-1">
                    Permite rotar piezas 90° para mejor aprovechamiento.
                  </p>
                </div>
              </div>

              {/* Optimizar Desperdicio */}
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <input
                  type="checkbox"
                  id="optimizar_desperdicio"
                  checked={configuracion.optimizar_desperdicio}
                  onChange={(e) => setConfiguracion({ ...configuracion, optimizar_desperdicio: e.target.checked })}
                  className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="flex-1">
                  <label htmlFor="optimizar_desperdicio" className="block text-sm font-medium text-gray-900 cursor-pointer">
                    Optimizar Desperdicio
                  </label>
                  <p className="text-xs text-gray-600 mt-1">
                    Intenta minimizar el desperdicio agrupando piezas de forma más eficiente.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 🆕 LAYOUT REORGANIZADO: Ancho completo */}
        <div className="space-y-6">
          {/* Editor de Piezas - Ancho completo */}
          <div className="w-full">
            <EditorPiezas
              modo={modo}
              piezas={piezas}
              laminaBase={null}
              onCargarBOM={handleProductoBOMSelect}
              onAgregarPieza={handleAgregarPieza}
              onEditarPieza={handleEditarPieza}
              onEliminarPieza={handleEliminarPieza}
              onSeleccionarLamina={() => {}}
              onLimpiar={handleLimpiar}
            />
          </div>

          {/* Botón Optimizar */}
          <div className="flex justify-center">
            <button
              onClick={handleOptimizar}
              disabled={piezas.length === 0 || loading}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 text-lg font-semibold whitespace-nowrap"
            >
              {loading ? (
                <>
                  <i className="ri-loader-4-line animate-spin"></i>
                  Optimizando...
                </>
              ) : (
                <>
                  <i className="ri-scissors-cut-line"></i>
                  Optimizar Cortes
                </>
              )}
            </button>
          </div>

          {/* Visualizador de Cortes - Ancho completo */}
          {resultado && (
            <div className="w-full">
              <VisualizadorCortes
                resultado={resultado}
                configuracion={configuracion}
              />
            </div>
          )}

          {/* Panel de Resultados - Ancho completo, debajo del visualizador */}
          {resultado && (
            <div className="w-full">
              <PanelResultados
                resultado={resultado}
                onExportar={handleExportarExcel}
              />
            </div>
          )}
        </div>

        {/* Modal de Exportar Excel */}
        {showExport && resultado && (
          <ExportarExcelModal
            resultado={resultado}
            piezas={piezas}
            laminaBase={null}
            onCerrar={() => setShowExport(false)}
          />
        )}

        {/* 🆕 Modal de Crear Cotización - Pasar proyectoId */}
        {showCrearCotizacion && resultado && (
          <CrearCotizacionModal
            resultado={resultado}
            piezas={piezas}
            proyectoId={proyectoId}
            onCerrar={() => setShowCrearCotizacion(false)}
          />
        )}
      </div>
    </OptimizadorLayout>
  );
}
