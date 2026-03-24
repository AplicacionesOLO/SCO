import { useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { PiezaCorte } from '../../../types/optimizador';
import { useNotification } from '../../../hooks/useNotification';
import { buscarArticulosInventario } from '../../../services/optimizadorService';
import { supabase } from '../../../lib/supabase';
import * as XLSX from 'xlsx';
import { showAlert } from '../../../utils/dialog';

interface Props {
  onImportar: (piezas: PiezaCorte[]) => void;
}

// 🎨 Paleta de 20 colores únicos
const COLORES_PIEZAS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16',
  '#06B6D4', '#F43F5E', '#92400E', '#6B7280', '#7C3AED',
  '#22C55E', '#EAB308', '#DC2626', '#0EA5E9', '#D946EF'
];

export default function ImportarExcelModal({ onImportar }: Props) {
  const { showNotification } = useNotification();
  const { currentStore } = useAuth();
  const [mostrarModal, setMostrarModal] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [previsualizacion, setPrevisualizacion] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);

  const handleSeleccionarArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setArchivo(file);
    leerArchivo(file);
  };

  const leerArchivo = (file: File) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        setPrevisualizacion(jsonData.slice(0, 5)); // Mostrar solo 5 filas de preview
      } catch (error) {
        console.error('Error leyendo archivo:', error);
        showNotification('error', 'Error al leer el archivo Excel');
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleImportar = async () => {
    if (!archivo) return;

    setCargando(true);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

        console.log('📥 [IMPORTAR] Iniciando importación de', jsonData.length, 'filas');

        // 🔧 HELPER: Normalizar código (quitar .0, trim, convertir a string)
        const normalizarCodigo = (valor: any): string => {
          if (!valor) return '';
          let str = String(valor).trim();
          // Quitar .0 al final (ej: 334433.0 → 334433)
          if (str.endsWith('.0')) {
            str = str.slice(0, -2);
          }
          return str;
        };

        // 🆕 PASO 1: Extraer todos los códigos únicos de materiales y tapacantos
        const codigosMateriales = new Set<string>();
        const codigosTapacantos = new Set<string>();
        const codigosCNC = new Set<string>();

        jsonData.forEach(row => {
          const materialCodigo = normalizarCodigo(row['Material'] || row['material']);
          if (materialCodigo) codigosMateriales.add(materialCodigo);

          // 🔧 Normalizar códigos de tapacantos
          const tcSup = normalizarCodigo(row['TC Superior'] || row['tc_superior']);
          const tcInf = normalizarCodigo(row['TC Inferior'] || row['tc_inferior']);
          const tcIzq = normalizarCodigo(row['TC Izquierdo'] || row['tc_izquierdo']);
          const tcDer = normalizarCodigo(row['TC Derecho'] || row['tc_derecho']);

          // Ignorar valores como "Sin TC", "0", vacíos
          if (tcSup && tcSup !== 'Sin TC' && tcSup !== '0') codigosTapacantos.add(tcSup);
          if (tcInf && tcInf !== 'Sin TC' && tcInf !== '0') codigosTapacantos.add(tcInf);
          if (tcIzq && tcIzq !== 'Sin TC' && tcIzq !== '0') codigosTapacantos.add(tcIzq);
          if (tcDer && tcDer !== 'Sin TC' && tcDer !== '0') codigosTapacantos.add(tcDer);

          // 🆕 Extraer códigos de CNC
          const cnc1 = normalizarCodigo(row['CNC1'] || row['cnc1']);
          const cnc2 = normalizarCodigo(row['CNC2'] || row['cnc2']);
          if (cnc1 && cnc1 !== '0') codigosCNC.add(cnc1);
          if (cnc2 && cnc2 !== '0') codigosCNC.add(cnc2);
        });

        console.log('🔍 [IMPORTAR] Códigos a validar:', {
          materiales: Array.from(codigosMateriales),
          tapacantos: Array.from(codigosTapacantos),
          cnc: Array.from(codigosCNC)
        });

        // 🆕 PASO 2: Buscar materiales en la base de datos
        const materialesMap = new Map<string, any>();
        
        for (const codigo of codigosMateriales) {
          const { data: materiales } = await buscarArticulosInventario(codigo, 'lamina', currentStore);
          
          if (materiales && materiales.length > 0) {
            // Buscar coincidencia exacta (case-insensitive)
            const materialExacto = materiales.find(m => 
              m.codigo_articulo.toLowerCase().trim() === codigo.toLowerCase().trim()
            );
            
            if (materialExacto) {
              materialesMap.set(codigo, materialExacto);
              console.log('✅ [IMPORTAR] Material encontrado:', codigo, '→', materialExacto.descripcion_articulo);
            }
          }
        }

        console.log('📊 [IMPORTAR] Resumen de materiales encontrados:', {
          total_buscados: codigosMateriales.size,
          total_encontrados: materialesMap.size,
          materiales_encontrados: Array.from(materialesMap.keys()),
          materiales_no_encontrados: Array.from(codigosMateriales).filter(c => !materialesMap.has(c))
        });

        // 🆕 PASO 3: Buscar tapacantos en la base de datos (MISMA LÓGICA QUE MATERIALES)
        const tapacantosMap = new Map<string, any>();
        
        if (codigosTapacantos.size > 0) {
          for (const codigo of codigosTapacantos) {
            const { data: tapacantos } = await buscarArticulosInventario(codigo, 'tapacanto', currentStore);
            
            console.log(`🔍 [tapacanto_resolve] Buscando "${codigo}":`, {
              columna: 'TC',
              codigo_normalizado: codigo,
              encontrado: tapacantos && tapacantos.length > 0,
              resultados: tapacantos?.length || 0
            });
            
            if (tapacantos && tapacantos.length > 0) {
              // Buscar coincidencia exacta (case-insensitive)
              const tapacantoExacto = tapacantos.find(tc => 
                tc.codigo_articulo.toLowerCase().trim() === codigo.toLowerCase().trim()
              );
              
              if (tapacantoExacto) {
                tapacantosMap.set(codigo, tapacantoExacto);
                console.log('✅ [tapacanto_resolve]', {
                  columna: 'TC',
                  codigo_normalizado: codigo,
                  encontrado: true,
                  id_articulo: tapacantoExacto.id,
                  codigo_articulo: tapacantoExacto.codigo_articulo,
                  descripcion: tapacantoExacto.descripcion_articulo
                });
              }
            }
          }
        }

        console.log('📊 [IMPORTAR] Resumen de tapacantos encontrados:', {
          total_buscados: codigosTapacantos.size,
          total_encontrados: tapacantosMap.size,
          tapacantos_encontrados: Array.from(tapacantosMap.keys()),
          tapacantos_no_encontrados: Array.from(codigosTapacantos).filter(c => !tapacantosMap.has(c))
        });

        // 🆕 PASO 3.5: Buscar códigos de CNC en la base de datos
        const cncMap = new Map<string, any>();
        
        if (codigosCNC.size > 0) {
          const { data: todosCNC, error: errorCNC } = await supabase
            .from('inventario')
            .select(`
              id_articulo,
              codigo_articulo,
              descripcion_articulo,
              precio_articulo
            `)
            .in('codigo_articulo', Array.from(codigosCNC))
            .eq('id_tienda', currentStore?.id)
            .eq('activo', true);

          if (!errorCNC && todosCNC) {
            todosCNC.forEach(cnc => {
              cncMap.set(cnc.codigo_articulo, cnc);
              console.log('✅ [IMPORTAR] CNC encontrado:', cnc.codigo_articulo, '→', cnc.descripcion_articulo, '- Precio:', cnc.precio_articulo);
            });
          }
        }

        // 🆕 PASO 4: Mapear piezas con validación
        const piezasImportadas: PiezaCorte[] = [];
        const erroresValidacion: string[] = [];

        jsonData.forEach((row, index) => {
          const descripcion = row['Descripción'] || row['Descripcion'] || row['descripcion'] || `Pieza ${index + 1}`;
          const materialCodigo = normalizarCodigo(row['Material'] || row['material']);
          const largo = parseFloat(row['Largo'] || row['largo'] || '0');
          const ancho = parseFloat(row['Ancho'] || row['ancho'] || '0');
          const cantidad = parseInt(row['Cantidad'] || row['cantidad'] || '1');
          const veta = (row['Veta'] || row['veta'] || 'S').toString().toUpperCase();
          
          // 🔧 Leer CNC con sus cantidades
          const cnc1Codigo = normalizarCodigo(row['CNC1'] || row['cnc1']);
          const cnc1Cantidad = parseInt(row['CNC1 Cantidad'] || row['cnc1_cantidad'] || '0');
          const cnc2Codigo = normalizarCodigo(row['CNC2'] || row['cnc2']);
          const cnc2Cantidad = parseInt(row['CNC2 Cantidad'] || row['cnc2_cantidad'] || '0');

          // 🆕 Validar material
          if (!materialCodigo) {
            erroresValidacion.push(`Fila ${index + 1}: Sin código de material`);
            return;
          }

          const material = materialesMap.get(materialCodigo);
          if (!material) {
            erroresValidacion.push(
              `Fila ${index + 1}: Material "${materialCodigo}" no encontrado en inventario.\n` +
              `   • Verifica que el código sea correcto\n` +
              `   • Asegúrate de que esté en la categoría LAMINAS\n` +
              `   • Verifica que esté activo y tenga dimensiones completas`
            );
            return;
          }

          // 🔧 CORREGIDO: Validar y mapear tapacantos con nombres correctos
          const tapacantos = [];
          const tapacantosData = [
            { lado: 'superior' as const, codigo: normalizarCodigo(row['TC Superior'] || row['tc_superior']) },
            { lado: 'inferior' as const, codigo: normalizarCodigo(row['TC Inferior'] || row['tc_inferior']) },
            { lado: 'izquierdo' as const, codigo: normalizarCodigo(row['TC Izquierdo'] || row['tc_izquierdo']) },
            { lado: 'derecho' as const, codigo: normalizarCodigo(row['TC Derecho'] || row['tc_derecho']) }
          ];

          tapacantosData.forEach(({ lado, codigo }) => {
            // Ignorar valores vacíos, "Sin TC", "0"
            if (codigo && codigo !== 'Sin TC' && codigo !== '0') {
              const tapacanto = tapacantosMap.get(codigo);
              
              if (tapacanto) {
                tapacantos.push({
                  lado,
                  articulo_id: tapacanto.id,
                  codigo: tapacanto.codigo_articulo,
                  descripcion: tapacanto.descripcion_articulo,
                  precio_unitario: tapacanto.precio_articulo || 0,
                  grosor_mm: tapacanto.grosor_tapacanto_mm || 0,
                  metros_lineales: 0
                });
                console.log(`✅ [IMPORTAR] Tapacanto asignado a "${descripcion}" - ${lado}: ${codigo}`);
              } else {
                console.warn(`⚠️ [IMPORTAR] Tapacanto "${codigo}" no encontrado para pieza "${descripcion}" - lado: ${lado}`);
              }
            }
          });

          // Log de pieza mapeada
          console.log('📦 [pieza_mapeada]', {
            desc: descripcion,
            tcSup: tapacantos.find(tc => tc.lado === 'superior')?.codigo || null,
            tcInf: tapacantos.find(tc => tc.lado === 'inferior')?.codigo || null,
            tcIzq: tapacantos.find(tc => tc.lado === 'izquierdo')?.codigo || null,
            tcDer: tapacantos.find(tc => tc.lado === 'derecho')?.codigo || null
          });

          // 🆕 Validar y normalizar veta (S, X, N)
          let vetaNormalizada: 'S' | 'X' | 'N' = 'S';
          const vetaStr = String(veta).toUpperCase().trim();
          
          if (vetaStr === 'S' || vetaStr === 'X' || vetaStr === 'N') {
            vetaNormalizada = vetaStr as 'S' | 'X' | 'N';
          } else if (vetaStr === 'Y' || vetaStr === 'YES' || vetaStr === 'SI' || vetaStr === 'SÍ') {
            vetaNormalizada = 'N';
          } else {
            vetaNormalizada = largo > ancho ? 'S' : (ancho > largo ? 'X' : 'N');
          }

          // 🎨 Asignar color secuencial (20 colores antes de repetir)
          const color = COLORES_PIEZAS[index % COLORES_PIEZAS.length];

          // 🆕 Crear pieza con datos validados del material
          piezasImportadas.push({
            id: `excel-${Date.now()}-${index}`,
            descripcion,
            material_id: material.id,
            material_codigo: material.codigo_articulo,
            material_descripcion: material.descripcion_articulo,
            material_precio: material.precio_unitario || 0,
            material_espesor_mm: material.espesor_mm,
            material_largo_lamina_mm: material.largo_lamina_mm,
            material_ancho_lamina_mm: material.ancho_lamina_mm,
            largo,
            ancho,
            cantidad,
            veta: vetaNormalizada,
            tapacantos,
            cnc1: cnc1Codigo,
            cnc1_codigo: cnc1Codigo,
            cnc1_cantidad: cnc1Cantidad,
            cnc2: cnc2Codigo,
            cnc2_codigo: cnc2Codigo,
            cnc2_cantidad: cnc2Cantidad,
            color
          } as PiezaCorte);

          console.log(`✅ [IMPORTAR] Pieza "${descripcion}" creada:`, {
            material: materialCodigo,
            tapacantos: tapacantos.length,
            cnc1: cnc1Codigo ? `${cnc1Codigo} x ${cnc1Cantidad}` : '-',
            cnc2: cnc2Codigo ? `${cnc2Codigo} x ${cnc2Cantidad}` : '-'
          });
        });

        // 🆕 PASO 5: Mostrar resultados
        if (erroresValidacion.length > 0) {
          console.error('❌ [IMPORTAR] Errores de validación:', erroresValidacion);
          
          // Mostrar los primeros 5 errores en un modal más informativo
          const mensajeErrores = erroresValidacion.slice(0, 5).join('\n\n');
          const mensajeCompleto = `❌ Se encontraron ${erroresValidacion.length} error(es) de validación:\n\n${mensajeErrores}${erroresValidacion.length > 5 ? '\n\n... y más errores' : ''}\n\n💡 Sugerencias:\n\n1. Verifica que los códigos de material existan en tu inventario\n2. Asegúrate de que los materiales estén en la categoría LAMINAS\n3. Verifica que los materiales estén activos\n4. Asegúrate de que tengan dimensiones completas (largo, ancho, espesor)\n5. Revisa la consola del navegador (F12) para más detalles\n\n📋 Materiales buscados: ${Array.from(codigosMateriales).join(', ')}\n✅ Materiales encontrados: ${Array.from(materialesMap.keys()).join(', ') || 'Ninguno'}`;
          
          showAlert(`Se encontraron ${erroresValidacion.length} error(es) de validación. Revisa la consola para más detalles.`);
          showNotification('error', `${erroresValidacion.length} error(es) de validación. Revisa el mensaje.`);
        }

        if (piezasImportadas.length > 0) {
          onImportar(piezasImportadas);
          showNotification('success', `✅ Se importaron ${piezasImportadas.length} piezas correctamente`);
          setMostrarModal(false);
          setArchivo(null);
          setPrevisualizacion([]);
        } else {
          showNotification('error', 'No se pudo importar ninguna pieza. Verifica los códigos de material.');
        }

        setCargando(false);
      } catch (error) {
        console.error('Error importando:', error);
        showNotification('error', 'Error al importar el archivo. Verifica el formato.');
        setCargando(false);
      }
    };

    reader.readAsBinaryString(archivo);
  };

  const descargarPlantilla = () => {
    const plantilla = [
      {
        'Descripción': 'Tapa superior',
        'Material': 'MEL001',
        'Largo': 2000,
        'Ancho': 600,
        'Cantidad': 1,
        'Veta': 'S',
        'TC Superior': 'TC001',
        'TC Inferior': 'TC001',
        'TC Izquierdo': 'TC001',
        'TC Derecho': 'TC001',
        'CNC1': '77788',
        'CNC1 Cantidad': 1,
        'CNC2': '77788',
        'CNC2 Cantidad': 2
      },
      {
        'Descripción': 'Lateral izquierdo',
        'Material': 'MEL001',
        'Largo': 1800,
        'Ancho': 400,
        'Cantidad': 1,
        'Veta': 'S',
        'TC Superior': 'TC001',
        'TC Inferior': '',
        'TC Izquierdo': 'TC001',
        'TC Derecho': 'TC001',
        'CNC1': '77788',
        'CNC1 Cantidad': 1,
        'CNC2': '',
        'CNC2 Cantidad': 0
      },
      {
        'Descripción': 'Entrepaño',
        'Material': 'MEL001',
        'Largo': 400,
        'Ancho': 1800,
        'Cantidad': 2,
        'Veta': 'X',
        'TC Superior': 'TC001',
        'TC Inferior': 'TC001',
        'TC Izquierdo': '',
        'TC Derecho': '',
        'CNC1': '',
        'CNC1 Cantidad': 0,
        'CNC2': '',
        'CNC2 Cantidad': 0
      }
    ];

    const ws = XLSX.utils.json_to_sheet(plantilla);
    
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
      { wch: 15 }, // CNC1 Cantidad
      { wch: 15 }, // CNC2
      { wch: 15 }  // CNC2 Cantidad
    ];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Piezas');
    XLSX.writeFile(wb, 'plantilla_optimizador.xlsx');
    
    showNotification('success', 'Plantilla descargada correctamente');
  };

  return (
    <>
      <button
        onClick={() => setMostrarModal(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 whitespace-nowrap"
      >
        <i className="ri-folder-open-line"></i>
        Cargar Proyecto
      </button>

      {mostrarModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <i className="ri-file-excel-2-line text-2xl"></i>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Cargar Proyecto desde Excel</h2>
                    <p className="text-blue-100 text-sm">
                      Importa la lista de piezas desde un archivo Excel (.xlsx)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMostrarModal(false);
                    setArchivo(null);
                    setPrevisualizacion([]);
                  }}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                  disabled={cargando}
                >
                  <i className="ri-close-line text-2xl"></i>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Formato esperado */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <i className="ri-information-line"></i>
                  Formato del Archivo Excel
                </h3>
                <div className="text-sm text-blue-800 space-y-2">
                  <p>El archivo debe contener las siguientes columnas:</p>
                  <div className="bg-white rounded-lg p-3 font-mono text-xs overflow-x-auto">
                    <div className="grid grid-cols-7 gap-2 min-w-max">
                      <div className="font-bold">1. Descripción</div>
                      <div className="font-bold">2. Material</div>
                      <div className="font-bold">3. Largo</div>
                      <div className="font-bold">4. Ancho</div>
                      <div className="font-bold">5. Cantidad</div>
                      <div className="font-bold">6. Veta</div>
                      <div className="font-bold">7. TC Superior</div>
                    </div>
                    <div className="grid grid-cols-7 gap-2 min-w-max mt-2">
                      <div className="font-bold">8. TC Inferior</div>
                      <div className="font-bold">9. TC Izquierdo</div>
                      <div className="font-bold">10. TC Derecho</div>
                      <div className="font-bold">11. CNC1</div>
                      <div className="font-bold">12. CNC1 Cantidad</div>
                      <div className="font-bold">13. CNC2</div>
                      <div className="font-bold">14. CNC2 Cantidad</div>
                    </div>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded p-2 mt-2">
                    <p className="text-xs text-amber-900">
                      <strong>Importante:</strong> Los códigos de Material, Tapacantos y CNC deben existir en tu inventario
                    </p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded p-2 mt-2">
                    <p className="text-xs text-green-900">
                      <strong>Veta:</strong> Usa <strong>S</strong> (hacia largo), <strong>X</strong> (cruzada), o <strong>N</strong> (sin veta)
                    </p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded p-2 mt-2">
                    <p className="text-xs text-purple-900">
                      <strong>CNC:</strong> Ingresa el código del artículo CNC y su cantidad. Ejemplo: CNC1 = "77788", CNC1 Cantidad = 1
                    </p>
                  </div>
                </div>
              </div>

              {/* Descargar plantilla */}
              <div className="mb-6">
                <button
                  onClick={descargarPlantilla}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  disabled={cargando}
                >
                  <i className="ri-download-2-line text-xl"></i>
                  Descargar Plantilla de Ejemplo
                </button>
              </div>

              {/* Selector de archivo */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar archivo Excel
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleSeleccionarArchivo}
                    className="hidden"
                    id="file-upload"
                    disabled={cargando}
                  />
                  <label
                    htmlFor="file-upload"
                    className={`${cargando ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} flex flex-col items-center gap-3`}
                  >
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                      <i className={`${cargando ? 'ri-loader-4-line animate-spin' : 'ri-upload-cloud-2-line'} text-3xl text-blue-600`}></i>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-gray-900">
                        {cargando ? 'Validando códigos...' : (archivo ? archivo.name : 'Haz clic para seleccionar un archivo')}
                      </p>
                      <p className="text-sm text-gray-600">
                        {cargando ? 'Por favor espera...' : 'o arrastra y suelta aquí'}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500">
                      Formatos soportados: .xlsx, .xls
                    </p>
                  </label>
                </div>
              </div>

              {/* Previsualización */}
              {previsualizacion.length > 0 && !cargando && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <i className="ri-eye-line text-blue-600"></i>
                    Previsualización (primeras 5 filas)
                  </h3>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200 text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          {Object.keys(previsualizacion[0]).map((key) => (
                            <th key={key} className="px-3 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {previsualizacion.map((row, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            {Object.values(row).map((value: any, i) => (
                              <td key={i} className="px-3 py-2 text-gray-900 whitespace-nowrap">
                                {value}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Se validarán todos los códigos de material y tapacantos antes de importar
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => {
                  setMostrarModal(false);
                  setArchivo(null);
                  setPrevisualizacion([]);
                }}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
                disabled={cargando}
              >
                Cancelar
              </button>
              <button
                onClick={handleImportar}
                disabled={!archivo || cargando}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold flex items-center justify-center gap-2"
              >
                {cargando ? (
                  <>
                    <i className="ri-loader-4-line text-xl animate-spin"></i>
                    Validando...
                  </>
                ) : (
                  <>
                    <i className="ri-check-line text-xl"></i>
                    Cargar Piezas
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
