import { useState } from 'react';
import { ResultadoOptimizacion, PiezaCorte, ArticuloInventario, ExportDataExcel } from '../../../types/optimizador';
import * as XLSX from 'xlsx';
// 🔧 IMPORTAR HELPER DE GUARDADO CON FILE SYSTEM ACCESS API
import { saveXlsxFile } from '../../../utils/saveFile';
import { showAlert } from '../../../utils/dialog';

interface Props {
  resultado: ResultadoOptimizacion;
  piezas: PiezaCorte[];
  laminaBase: ArticuloInventario | null;
  onCerrar: () => void;
}

export default function ExportarExcelModal({ resultado, piezas, laminaBase, onCerrar }: Props) {
  // 🔧 Generar nombre con formato correcto desde el inicio
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  const nombreInicial = `SCO_Optimizacion_${anio}${mes}${dia}`;
  
  const [nombreArchivo, setNombreArchivo] = useState(nombreInicial);
  const [exportando, setExportando] = useState(false);

  const exportarExcel = async () => {
    setExportando(true);

    try {
      // Crear workbook
      const wb = XLSX.utils.book_new();

      // ============================================
      // HOJA 1: RESUMEN GENERAL
      // ============================================
      const resumenData = [
        ['OPTIMIZADOR DE CORTES 2D - RESUMEN GENERAL'],
        [''],
        ['Fecha:', new Date().toLocaleDateString('es-CR')],
        ['Lámina Base:', laminaBase?.descripcion_articulo || 'N/A'],
        ['Dimensiones Lámina:', `${laminaBase?.largo_lamina} × ${laminaBase?.ancho_lamina} mm`],
        ['Precio Lámina:', `₡${laminaBase?.precio_unitario.toLocaleString('es-CR')}`],
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
      
      // Estilos para el resumen
      wsResumen['!cols'] = [{ wch: 25 }, { wch: 30 }];
      
      XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

      // ============================================
      // HOJA 2: DETALLE DE PIEZAS
      // ============================================
      const detallePiezasData: any[][] = [
        [
          'Descripción',
          'Material (Código)',
          'Largo (mm)',
          'Ancho (mm)',
          'Cantidad',
          'Veta',
          'TC Superior',
          'TC Inferior',
          'TC Izquierdo',
          'TC Derecho',
          'CNC1',
          'CNC2',
          'm² Usados',
          'Tapacantos (m)',
          'HH (segundos)',
          'Total Pieza'
        ]
      ];

      piezas.forEach((pieza) => {
        const areaUnitaria = (pieza.largo * pieza.ancho) / 1000000;
        const areaTotal = areaUnitaria * pieza.cantidad;
        
        // 🔍 DEBUG: Ver estructura de tapacantos
        console.log('=== DEBUG PIEZA ===');
        console.log('Descripción:', pieza.descripcion);
        console.log('Tapacantos array:', pieza.tapacantos);
        console.log('Tapacantos length:', pieza.tapacantos?.length);
        if (pieza.tapacantos && pieza.tapacantos.length > 0) {
          pieza.tapacantos.forEach((tc, idx) => {
            console.log(`TC[${idx}]:`, {
              lado: tc.lado,
              codigo: tc.codigo,
              articulo_id: tc.articulo_id,
              descripcion: tc.descripcion
            });
          });
        }
        console.log('==================');
        
        // ✅ Buscar tapacantos por lado correcto
        const tcSuperior = pieza.tapacantos.find(tc => tc.lado === 'superior');
        const tcInferior = pieza.tapacantos.find(tc => tc.lado === 'inferior');
        const tcIzquierdo = pieza.tapacantos.find(tc => tc.lado === 'izquierdo');
        const tcDerecho = pieza.tapacantos.find(tc => tc.lado === 'derecho');

        // 🔍 DEBUG: Ver qué encontró
        console.log('TC encontrados:', {
          superior: tcSuperior?.codigo || 'VACÍO',
          inferior: tcInferior?.codigo || 'VACÍO',
          izquierdo: tcIzquierdo?.codigo || 'VACÍO',
          derecho: tcDerecho?.codigo || 'VACÍO'
        });

        detallePiezasData.push([
          pieza.descripcion,
          pieza.material_codigo || '',
          pieza.largo,
          pieza.ancho,
          pieza.cantidad,
          pieza.veta,
          tcSuperior?.codigo || '',
          tcInferior?.codigo || '',
          tcIzquierdo?.codigo || '',
          tcDerecho?.codigo || '',
          pieza.cnc1 || '',
          pieza.cnc2 || '',
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

      detallePiezasData.push([
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

      const wsDetalle = XLSX.utils.aoa_to_sheet(detallePiezasData);
      
      // Anchos de columna
      wsDetalle['!cols'] = [
        { wch: 30 }, // Descripción
        { wch: 15 }, // Material
        { wch: 12 }, // Largo
        { wch: 12 }, // Ancho
        { wch: 10 }, // Cantidad
        { wch: 8 },  // Veta
        { wch: 12 }, // TC Superior
        { wch: 12 }, // TC Inferior
        { wch: 12 }, // TC Izquierdo
        { wch: 12 }, // TC Derecho
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

      // 🔧 SOLUCIÓN: Usar saveXlsxFile (File System Access API)
      const nombreFinal = `${nombreArchivo}.xlsx`;
      console.log('📥 [EXPORTAR EXCEL] Guardando archivo:', nombreFinal);
      
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      console.log('=== EXPORTAR EXCEL START ===');
      console.log('filename:', nombreFinal);
      console.log('blob.type:', blob.type);
      console.log('blob.size:', blob.size);
      console.log('secureContext:', window.isSecureContext);
      console.log('protocol:', window.location.protocol);
      console.log('topLevel:', window === window.top);
      console.log('has showSaveFilePicker:', typeof (window as any).showSaveFilePicker);
      console.log('===========================');

      // ✅ Usar saveXlsxFile para controlar el nombre en "Guardar como"
      await saveXlsxFile(blob, nombreFinal);

      console.log('=== EXPORTAR EXCEL END OK ===');
      console.log('✅ [EXPORTAR EXCEL] Archivo guardado:', nombreFinal);

      setTimeout(() => {
        setExportando(false);
        onCerrar();
      }, 500);

    } catch (error) {
      console.error('❌ Error exportando Excel:', error);
      showAlert('Error al exportar el archivo Excel');
      setExportando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex items-center justify-between rounded-t-lg">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <i className="ri-file-excel-2-line"></i>
            Exportar a Excel
          </h2>
          <button
            onClick={onCerrar}
            className="text-white hover:text-gray-200 p-1"
          >
            <i className="ri-close-line text-2xl"></i>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Información */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <i className="ri-information-line"></i>
              Contenido del archivo
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Resumen General:</strong> Métricas y costos totales</li>
              <li>• <strong>Detalle de Piezas:</strong> Todas las piezas con dimensiones, tapacantos y costos</li>
              <li>• <strong>Detalle por Lámina:</strong> Distribución de piezas en cada lámina</li>
              {resultado.piezas_sin_asignar.length > 0 && (
                <li>• <strong>Piezas Sin Asignar:</strong> Piezas que no cupieron en las láminas</li>
              )}
            </ul>
          </div>

          {/* Nombre del archivo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del archivo
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={nombreArchivo}
                onChange={(e) => setNombreArchivo(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Nombre del archivo..."
              />
              <span className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg border border-gray-300">
                .xlsx
              </span>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="text-sm text-gray-600 mb-1">Total de Piezas</div>
              <div className="text-2xl font-bold text-gray-900">{piezas.length}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="text-sm text-gray-600 mb-1">Total de Láminas</div>
              <div className="text-2xl font-bold text-gray-900">{resultado.total_laminas}</div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCerrar}
              disabled={exportando}
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={exportarExcel}
              disabled={exportando}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {exportando ? (
                <>
                  <i className="ri-loader-4-line animate-spin"></i>
                  Exportando...
                </>
              ) : (
                <>
                  <i className="ri-download-line"></i>
                  Descargar Excel
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
