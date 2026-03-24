import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import * as XLSX from 'xlsx';
import { showAlert } from '../../../utils/dialog';

interface FilaImportacion {
  fila: number;
  codigo_articulo: string;
  descripcion_articulo: string;
  cantidad_articulo: string;
  costo_articulo: string;
  ganancia_articulo: string;
  categoria: string;
  unidad_base: string;
  activo: string;
  errores: string[];
  advertencias: string[];
  estado: 'valido' | 'error' | 'advertencia';
}

interface ResultadoImportacion {
  creados: number;
  actualizados: number;
  errores: number;
  detalles: string[];
}

export default function ImportarInventario() {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<FilaImportacion[]>([]);
  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [unidades, setUnidades] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currentStore } = useAuth();

  // Cargar datos de referencia al montar el componente
  useEffect(() => {
    if (currentStore?.id) cargarDatosReferencia();
  }, [currentStore]);

  const cargarDatosReferencia = async () => {
    if (!currentStore?.id) return;
    try {
      const { data: categoriasData, error: categoriasError } = await supabase
        .from('categorias')
        .select('id, nombre')
        .eq('tienda_id', currentStore.id)
        .order('nombre');

      if (categoriasError) {
        console.error('Error cargando categorías:', categoriasError);
        setCategorias([]);
      } else {
        setCategorias(categoriasData || []);
      }

      const { data: unidadesData, error: unidadesError } = await supabase
        .from('unidades_medida')
        .select('id, nombre')
        .eq('tienda_id', currentStore.id)
        .order('nombre');

      if (unidadesError) {
        console.error('Error cargando unidades:', unidadesError);
        setUnidades([]);
      } else {
        setUnidades(unidadesData || []);
      }
    } catch (error) {
      console.error('Error general cargando datos:', error);
    }
  };

  const descargarPlantillaExcel = () => {
    // Datos de ejemplo para la plantilla
    const datosEjemplo = [
      {
        codigo_articulo: 'ART001',
        descripcion_articulo: 'Tornillo Phillips 6x25mm',
        cantidad_articulo: 500.000,
        costo_articulo: 0.1500,
        ganancia_articulo: 35.00,
        categoria: 'Ferretería',
        unidad_base: 'Unidad',
        activo: 'SI'
      },
      {
        codigo_articulo: 'ART002',
        descripcion_articulo: 'Cable eléctrico 12 AWG',
        cantidad_articulo: 100.500,
        costo_articulo: 2.7500,
        ganancia_articulo: 28.50,
        categoria: 'Eléctricos',
        unidad_base: 'Metros',
        activo: 'SI'
      },
      {
        codigo_articulo: 'ART003',
        descripcion_articulo: 'Pintura acrílica blanca',
        cantidad_articulo: 25.000,
        costo_articulo: 15.2500,
        ganancia_articulo: 42.00,
        categoria: 'Pinturas',
        unidad_base: 'Litros',
        activo: 'NO'
      }
    ];

    // Crear hoja de instrucciones
    const instrucciones = [
      ['INSTRUCCIONES PARA IMPORTAR INVENTARIO'],
      [''],
      ['1. CAMPOS OBLIGATORIOS:'],
      ['   - codigo_articulo: Código único del artículo (sin espacios)'],
      ['   - descripcion_articulo: Nombre descriptivo del producto'],
      ['   - cantidad_articulo: Cantidad en stock (número decimal)'],
      ['   - costo_articulo: Precio de costo (número decimal)'],
      [''],
      ['2. CAMPOS OPCIONALES:'],
      ['   - ganancia_articulo: Porcentaje de ganancia (0-100)'],
      ['   - categoria: Nombre de la categoría (se crea si no existe)'],
      ['   - unidad_base: Unidad de medida (ver lista abajo)'],
      ['   - activo: Estado del artículo (SI/NO, TRUE/FALSE, 1/0)'],
      [''],
      ['3. UNIDADES DE MEDIDA DISPONIBLES:'],
      ['   - Unidad, Milímetros, Centímetros, Metros'],
      ['   - Gramos, Kilogramos, Libras'],
      ['   - Mililitros, Litros, Galones'],
      ['   - Segundos, Minutos, Horas'],
      [''],
      ['4. FORMATO DE NÚMEROS:'],
      ['   - Use punto (.) como separador decimal'],
      ['   - Cantidad: hasta 3 decimales (ej: 100.500)'],
      ['   - Costo: hasta 4 decimales (ej: 15.2500)'],
      ['   - Ganancia: hasta 2 decimales sin % (ej: 35.00)'],
      [''],
      ['5. NOTAS IMPORTANTES:'],
      ['   - El precio de venta se calcula automáticamente'],
      ['   - Los códigos deben ser únicos'],
      ['   - Máximo 1000 registros por importación'],
      ['   - Formatos soportados: .xlsx, .csv'],
      [''],
      ['IMPORTANTE: Use la hoja "Datos" para ingresar su información']
    ];

    // Crear workbook
    const wb = XLSX.utils.book_new();

    // Hoja de instrucciones
    const wsInstrucciones = XLSX.utils.aoa_to_sheet(instrucciones);
    XLSX.utils.book_append_sheet(wb, wsInstrucciones, 'Instrucciones');

    // Hoja de datos con ejemplos
    const wsDatos = XLSX.utils.json_to_sheet(datosEjemplo);
    XLSX.utils.book_append_sheet(wb, wsDatos, 'Datos');

    // Configurar anchos de columna para la hoja de datos
    const colWidths = [
      { wch: 15 }, // codigo_articulo
      { wch: 40 }, // descripcion_articulo
      { wch: 15 }, // cantidad_articulo
      { wch: 15 }, // costo_articulo
      { wch: 15 }, // ganancia_articulo
      { wch: 15 }, // categoria
      { wch: 15 }, // unidad_base
      { wch: 10 }  // activo
    ];
    wsDatos['!cols'] = colWidths;

    // Configurar anchos para instrucciones
    wsInstrucciones['!cols'] = [{ wch: 80 }];

    // Descargar archivo
    XLSX.writeFile(wb, 'plantilla_inventario.xlsx');
  };

  const descargarPlantillaCSV = () => {
    // Crear datos de ejemplo más completos
    const plantilla = [
      'codigo_articulo,descripcion_articulo,cantidad_articulo,costo_articulo,ganancia_articulo,categoria,unidad_base,activo',
      'ART001,Tornillo Phillips 6x25mm,500.000,0.1500,35.00,Ferretería,Unidad,SI',
      'ART002,Cable eléctrico 12 AWG,100.500,2.7500,28.50,Eléctricos,Metros,SI',
      'ART003,Pintura acrílica blanca,25.000,15.2500,42.00,Pinturas,Litros,NO'
    ].join('\n');

    // Crear instrucciones
    const instrucciones = [
      'INSTRUCCIONES PARA IMPORTAR INVENTARIO',
      '',
      '1. CAMPOS OBLIGATORIOS:',
      '   - codigo_articulo: Código único del artículo (sin espacios)',
      '   - descripcion_articulo: Nombre descriptivo del producto',
      '   - cantidad_articulo: Cantidad en stock (número decimal)',
      '   - costo_articulo: Precio de costo (número decimal)',
      '',
      '2. CAMPOS OPCIONALES:',
      '   - ganancia_articulo: Porcentaje de ganancia (0-100)',
      '   - categoria: Nombre de la categoría (se crea si no existe)',
      '   - unidad_base: Unidad de medida (ver lista abajo)',
      '   - activo: Estado del artículo (SI/NO, TRUE/FALSE, 1/0)',
      '',
      '3. UNIDADES DE MEDIDA DISPONIBLES:',
      '   - Unidad, Milímetros, Centímetros, Metros',
      '   - Gramos, Kilogramos, Libras',
      '   - Mililitros, Litros, Galones',
      '   - Segundos, Minutos, Horas',
      '',
      '4. FORMATO DE NÚMEROS:',
      '   - Use punto (.) como separador decimal',
      '   - Cantidad: hasta 3 decimales (ej: 100.500)',
      '   - Costo: hasta 4 decimales (ej: 15.2500)',
      '   - Ganancia: hasta 2 decimales sin % (ej: 35.00)',
      '',
      '5. NOTAS IMPORTANTES:',
      '   - El precio de venta se calcula automáticamente',
      '   - Los códigos deben ser únicos',
      '   - Máximo 1000 registros por importación',
      '   - Formato soportado: .csv',
      '',
      '--- PLANTILLA DE DATOS ---'
    ].join('\n');

    // Crear archivo completo
    const contenidoCompleto = instrucciones + '\n\n' + plantilla;

    // Crear y descargar archivo
    const blob = new Blob([contenidoCompleto], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_inventario.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const procesarArchivo = async (file: File) => {
    // Asegurar que los datos de referencia estén cargados
    if (unidades.length === 0) {
      await cargarDatosReferencia();
    }
    
    return new Promise<FilaImportacion[]>((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          let jsonData: any[] = [];

          if (file.name.match(/\.xlsx$/i)) {
            // Procesar archivo Excel
            const workbook = XLSX.read(data, { type: 'array' });
            
            // Buscar hoja de datos (priorizar "Datos", luego la primera hoja)
            let sheetName = 'Datos';
            if (!workbook.Sheets[sheetName]) {
              sheetName = workbook.SheetNames[0];
            }
            
            const worksheet = workbook.Sheets[sheetName];
            jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            // Encontrar fila de encabezados
            let headerRowIndex = -1;
            for (let i = 0; i < jsonData.length; i++) {
              const row = jsonData[i];
              if (row && row.some((cell: any) => 
                typeof cell === 'string' && cell.toLowerCase().includes('codigo_articulo')
              )) {
                headerRowIndex = i;
                break;
              }
            }
            
            if (headerRowIndex === -1) {
              reject(new Error('No se encontró el encabezado con "codigo_articulo" en el archivo Excel'));
              return;
            }
            
            const headers = jsonData[headerRowIndex].map((h: any) => 
              typeof h === 'string' ? h.trim().toLowerCase() : ''
            );
            const dataRows = jsonData.slice(headerRowIndex + 1);
            
            // Convertir a formato objeto
            jsonData = dataRows.map(row => {
              const obj: any = {};
              headers.forEach((header: string, index: number) => {
                if (header) {
                  obj[header] = row[index] || '';
                }
              });
              return obj;
            }).filter(row => row.codigo_articulo && row.codigo_articulo.toString().trim() !== '');
            
          } else {
            // Procesar archivo CSV
            const text = data as string;
            const lines = text.split('\n').filter(line => line.trim());
            
            // Buscar donde empiezan los datos (después de las instrucciones)
            let startIndex = 0;
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].includes('codigo_articulo')) {
                startIndex = i;
                break;
              }
            }
            
            if (startIndex === 0 && !lines[0].includes('codigo_articulo')) {
              reject(new Error('No se encontró el encabezado con los nombres de columnas'));
              return;
            }
            
            const headers = lines[startIndex].split(',').map(h => h.trim().toLowerCase());
            const dataLines = lines.slice(startIndex + 1);
            
            jsonData = dataLines.map(line => {
              const values = line.split(',').map(v => v.trim());
              const obj: any = {};
              headers.forEach((header, i) => {
                obj[header] = values[i] || '';
              });
              return obj;
            }).filter(row => row.codigo_articulo && row.codigo_articulo.toString().trim() !== '');
          }

          const filasValidadas: FilaImportacion[] = jsonData.map((fila, index) => {
            return validarFila(fila, index + 2);
          });
          
          resolve(filasValidadas.slice(0, 50)); // Máximo 50 filas en vista previa
        } catch (error) {
          reject(error);
        }
      };
      
      if (file.name.match(/\.xlsx$/i)) {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file, 'UTF-8');
      }
    });
  };

  const validarFila = (fila: any, numeroFila: number): FilaImportacion => {
    const errores: string[] = [];
    const advertencias: string[] = [];
    
    const codigo = (fila.codigo_articulo || '').toString().trim();
    const descripcion = (fila.descripcion_articulo || '').toString().trim();
    const cantidad = (fila.cantidad_articulo || '').toString().trim();
    const costo = (fila.costo_articulo || '').toString().trim();
    const ganancia = (fila.ganancia_articulo || '').toString().trim();
    const categoria = (fila.categoria || '').toString().trim();
    const unidad = (fila.unidad_base || 'Unidad').toString().trim();
    const activo = (fila.activo || 'SI').toString().trim().toUpperCase();
    
    // Validaciones obligatorias
    if (!codigo) errores.push('Código de artículo requerido');
    if (!descripcion) errores.push('Descripción requerida');
    if (!cantidad) errores.push('Cantidad requerida');
    if (!costo) errores.push('Costo requerido');
    
    // Validar números
    const cantidadNum = parseFloat(cantidad.replace(',', '.'));
    const costoNum = parseFloat(costo.replace(',', '.'));
    let gananciaNum = 0;
    
    if (cantidad && (isNaN(cantidadNum) || cantidadNum < 0)) {
      errores.push('Cantidad debe ser un número ≥ 0');
    }
    
    if (costo && (isNaN(costoNum) || costoNum < 0)) {
      errores.push('Costo debe ser un número ≥ 0');
    }
    
    if (ganancia) {
      const gananciaStr = ganancia.replace('%', '').replace(',', '.');
      gananciaNum = parseFloat(gananciaStr);
      if (isNaN(gananciaNum) || gananciaNum < 0 || gananciaNum > 100) {
        errores.push('Ganancia debe ser entre 0 y 100%');
      }
    }
    
    // Validar categoría contra tabla `categorias`
    if (categoria && !categorias.find(c => c.nombre?.toLowerCase() === categoria.toLowerCase())) {
      advertencias.push(`Categoría "${categoria}" no existe, se creará automáticamente`);
    }
    
    // Validar unidad
    const unidadValida = unidades.find(u => u.nombre.toLowerCase() === unidad.toLowerCase());
    if (!unidadValida) {
      const unidadesDisponibles = unidades.map(u => u.nombre).join(', ');
      errores.push(`Unidad "${unidad}" no válida. Unidades disponibles: ${unidadesDisponibles}`);
    }
    
    // Validar activo
    if (!['SI', 'NO', 'TRUE', 'FALSE', '1', '0'].includes(activo)) {
      errores.push('Campo activo debe ser: SI/NO, TRUE/FALSE o 1/0');
    }
    
    const estado = errores.length > 0 ? 'error' : advertencias.length > 0 ? 'advertencia' : 'valido';
    
    return {
      fila: numeroFila,
      codigo_articulo: codigo,
      descripcion_articulo: descripcion,
      cantidad_articulo: cantidad,
      costo_articulo: costo,
      ganancia_articulo: ganancia,
      categoria,
      unidad_base: unidad,
      activo,
      errores,
      advertencias,
      estado
    };
  };

  const manejarSeleccionArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validar tipo de archivo
    if (!file.name.match(/\.(csv|xlsx)$/i)) {
      showAlert('Formato de archivo no válido. Use archivos .csv o .xlsx', { type: 'warning' });
      return;
    }
    
    setArchivo(file);
    setProcesando(true);
    
    try {
      const filas = await procesarArchivo(file);
      setVistaPrevia(filas);
      setMostrarVistaPrevia(true);
    } catch (error) {
      console.error('Error procesando archivo:', error);
      showAlert(`Error al procesar el archivo: ${error}`, { type: 'error' });
    } finally {
      setProcesando(false);
    }
  };

  const ejecutarImportacion = async () => {
    if (!archivo || !currentStore?.id) return;
    
    setProcesando(true);
    const resultado: ResultadoImportacion = {
      creados: 0,
      actualizados: 0,
      errores: 0,
      detalles: []
    };
    
    try {
      // Procesar archivo completo
      const todasLasFilas = await procesarArchivo(archivo);
      const filasValidas = todasLasFilas.filter(f => f.estado !== 'error');
      
      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }
      
      // Procesar cada fila válida
      for (const fila of filasValidas) {
        try {
          // 1. Buscar o crear categoría en la tabla `categorias` (la que referencia inventario.categoria_id)
          let categoriaId = null;
          if (fila.categoria && fila.categoria.trim() !== '') {
            const { data: categoriaExistente } = await supabase
              .from('categorias')
              .select('id')
              .ilike('nombre', fila.categoria.trim())
              .eq('tienda_id', currentStore.id)
              .maybeSingle();
            
            if (categoriaExistente) {
              categoriaId = categoriaExistente.id;
            } else {
              const { data: nuevaCategoria, error: errorCategoria } = await supabase
                .from('categorias')
                .insert({
                  nombre: fila.categoria.trim(),
                  descripcion: `Categoría creada automáticamente durante importación`,
                  tienda_id: currentStore.id
                })
                .select('id')
                .single();
              
              if (errorCategoria) {
                console.error('Error creando categoría:', errorCategoria);
              } else {
                categoriaId = nuevaCategoria.id;
              }
            }
          }
          
          // 2. Buscar unidad en la tienda actual
          let unidadId: number | null = null;
          if (fila.unidad_base && fila.unidad_base.trim() !== '') {
            const { data: unidadData } = await supabase
              .from('unidades_medida')
              .select('id')
              .ilike('nombre', fila.unidad_base.trim())
              .eq('tienda_id', currentStore.id)
              .maybeSingle();
            
            if (unidadData) {
              unidadId = unidadData.id;
            } else {
              const { data: unidadFallback } = await supabase
                .from('unidades_medida')
                .select('id')
                .ilike('nombre', fila.unidad_base.trim())
                .limit(1)
                .maybeSingle();
              unidadId = unidadFallback?.id ?? null;
            }
          }
          
          // 3. Calcular valores
          const cantidad = parseFloat(fila.cantidad_articulo.replace(',', '.'));
          const costo = parseFloat(fila.costo_articulo.replace(',', '.'));
          const ganancia = fila.ganancia_articulo ? parseFloat(fila.ganancia_articulo.replace(',', '.')) : 0;
          const activo = ['SI', 'TRUE', '1'].includes(fila.activo.toUpperCase());
          
          // 4. Verificar si existe registro en inventario (dentro de la tienda actual)
          const { data: inventarioExistente } = await supabase
            .from('inventario')
            .select('id_articulo')
            .eq('codigo_articulo', fila.codigo_articulo)
            .eq('tienda_id', currentStore.id)
            .maybeSingle();
          
          if (inventarioExistente) {
            // Actualizar inventario existente
            const updateData: any = {
              descripcion_articulo: fila.descripcion_articulo,
              cantidad_articulo: cantidad,
              costo_articulo: costo,
              ganancia_articulo: ganancia,
              activo: activo,
              updated_at: new Date().toISOString()
            };
            if (categoriaId !== null) updateData.categoria_id = categoriaId;
            if (unidadId !== null) updateData.unidad_base_id = unidadId;

            const { error: errorUpdate } = await supabase
              .from('inventario')
              .update(updateData)
              .eq('id_articulo', inventarioExistente.id_articulo)
              .eq('tienda_id', currentStore.id);
            
            if (errorUpdate) {
              throw new Error(`Error actualizando inventario: ${errorUpdate.message}`);
            }
            
            resultado.actualizados++;
            resultado.detalles.push(`✅ Actualizado: ${fila.codigo_articulo} - ${fila.descripcion_articulo}`);
          } else {
            // Crear nuevo registro — INCLUIR tienda_id obligatoriamente para cumplir RLS
            const insertData: any = {
              codigo_articulo: fila.codigo_articulo,
              descripcion_articulo: fila.descripcion_articulo,
              cantidad_articulo: cantidad,
              costo_articulo: costo,
              ganancia_articulo: ganancia,
              activo: activo,
              tienda_id: currentStore.id   // ← requerido por política RLS
            };
            if (categoriaId !== null) insertData.categoria_id = categoriaId;
            if (unidadId !== null) insertData.unidad_base_id = unidadId;

            const { error: errorInsert } = await supabase
              .from('inventario')
              .insert(insertData);
            
            if (errorInsert) {
              throw new Error(`Error creando inventario: ${errorInsert.message}`);
            }
            
            resultado.creados++;
            resultado.detalles.push(`✅ Creado: ${fila.codigo_articulo} - ${fila.descripcion_articulo}`);
          }
        } catch (error: any) {
          resultado.errores++;
          resultado.detalles.push(`❌ Error en ${fila.codigo_articulo}: ${error.message || error}`);
          console.error('Error procesando fila:', fila, error);
        }
      }
      
      setResultado(resultado);
      
      if (resultado.creados > 0 || resultado.actualizados > 0) {
        showAlert(`Importación completada: ${resultado.creados} creados, ${resultado.actualizados} actualizados, ${resultado.errores} errores`);
        
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (error: any) {
      console.error('Error en importación:', error);
      showAlert(`Error durante la importación: ${error.message || error}`, { type: 'error' });
    } finally {
      setProcesando(false);
    }
  };

  const reiniciar = () => {
    setArchivo(null);
    setVistaPrevia([]);
    setMostrarVistaPrevia(false);
    setResultado(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getColorFila = (estado: string) => {
    switch (estado) {
      case 'error': return 'bg-red-50 border-red-200';
      case 'advertencia': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-green-50 border-green-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Importar Inventario</h2>
        <div className="flex gap-2">
          <button
            onClick={descargarPlantillaExcel}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap cursor-pointer"
          >
            <i className="ri-file-excel-line mr-2"></i>
            Descargar Plantilla Excel
          </button>
          <button
            onClick={descargarPlantillaCSV}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer"
          >
            <i className="ri-file-text-line mr-2"></i>
            Descargar Plantilla CSV
          </button>
        </div>
      </div>

      {!mostrarVistaPrevia && !resultado && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center">
            <i className="ri-file-excel-line text-4xl text-green-600 mb-4"></i>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Selecciona un archivo Excel o CSV
            </h3>
            <p className="text-gray-500 mb-6">
              Formatos soportados: .xlsx, .csv (máximo 1000 registros)
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx"
              onChange={manejarSeleccionArchivo}
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={procesando}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer"
            >
              {procesando ? (
                <>
                  <i className="ri-loader-line animate-spin mr-2"></i>
                  Procesando archivo...
                </>
              ) : (
                <>
                  <i className="ri-upload-line mr-2"></i>
                  Seleccionar Archivo
                </>
              )}
            </button>
          </div>
          
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Formato esperado (nombres exactos de columnas):</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>codigo_articulo:</strong> Único, sin espacios (ej: ART001)</li>
              <li>• <strong>descripcion_articulo:</strong> Nombre del producto</li>
              <li>• <strong>cantidad_articulo:</strong> Número decimal (ej: 100.000)</li>
              <li>• <strong>costo_articulo:</strong> Precio de costo (ej: 50.0000)</li>
              <li>• <strong>ganancia_articulo:</strong> Porcentaje 0-100 (ej: 25.00)</li>
              <li>• <strong>categoria:</strong> Nombre de la categoría (se crea si no existe)</li>
              <li>• <strong>unidad_base:</strong> Unidad, Milímetros, Centímetros, Metros, Gramos, Kilogramos, Libras, Segundos, Minutos, Horas</li>
              <li>• <strong>activo:</strong> SI/NO, TRUE/FALSE o 1/0</li>
            </ul>
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-xs text-yellow-800">
                <strong>Importante:</strong> Para archivos Excel, use la hoja "Datos" o asegúrese de que los datos estén en la primera hoja.
                Los nombres de las columnas deben ser exactamente como se muestran arriba.
                El precio se calcula automáticamente: precio = costo × (1 + ganancia/100)
              </p>
            </div>
          </div>
        </div>
      )}

      {mostrarVistaPrevia && !resultado && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Vista Previa - {archivo?.name}</h3>
              <div className="flex gap-2">
                <button
                  onClick={reiniciar}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors whitespace-nowrap cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={ejecutarImportacion}
                  disabled={procesando || vistaPrevia.every(f => f.estado === 'error')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer"
                >
                  {procesando ? 'Importando...' : 'Confirmar Importación'}
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-green-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">
                  {vistaPrevia.filter(f => f.estado === 'valido').length}
                </div>
                <div className="text-sm text-green-700">Válidos</div>
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {vistaPrevia.filter(f => f.estado === 'advertencia').length}
                </div>
                <div className="text-sm text-yellow-700">Advertencias</div>
              </div>
              <div className="bg-red-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-600">
                  {vistaPrevia.filter(f => f.estado === 'error').length}
                </div>
                <div className="text-sm text-red-700">Errores</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto max-h-96">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fila</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Costo</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ganancia</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Activo</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {vistaPrevia.map((fila, index) => (
                    <tr key={index} className={getColorFila(fila.estado)}>
                      <td className="px-3 py-2 text-sm">{fila.fila}</td>
                      <td className="px-3 py-2 text-sm font-medium">{fila.codigo_articulo}</td>
                      <td className="px-3 py-2 text-sm">{fila.descripcion_articulo}</td>
                      <td className="px-3 py-2 text-sm">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {fila.categoria || 'Sin categoría'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm">{fila.cantidad_articulo}</td>
                      <td className="px-3 py-2 text-sm">{fila.costo_articulo}</td>
                      <td className="px-3 py-2 text-sm">{fila.ganancia_articulo}%</td>
                      <td className="px-3 py-2 text-sm">{fila.activo}</td>
                      <td className="px-3 py-2 text-sm">
                        <div className="space-y-1">
                          {fila.errores.map((error, i) => (
                            <div key={i} className="text-red-600 text-xs">{error}</div>
                          ))}
                          {fila.advertencias.map((adv, i) => (
                            <div key={i} className="text-yellow-600 text-xs">{adv}</div>
                          ))}
                          {fila.estado === 'valido' && (
                            <div className="text-green-600 text-xs">✓ Válido</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {resultado && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium mb-4">Resultado de la Importación</h3>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-green-600">{resultado.creados}</div>
              <div className="text-sm text-green-700">Creados</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-blue-600">{resultado.actualizados}</div>
              <div className="text-sm text-blue-700">Actualizados</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-red-600">{resultado.errores}</div>
              <div className="text-sm text-red-700">Errores</div>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
            <h4 className="font-medium mb-2">Detalles:</h4>
            {resultado.detalles.map((detalle, index) => (
              <div key={index} className="text-sm text-gray-600">{detalle}</div>
            ))}
          </div>
          
          <div className="flex justify-center mt-6">
            <button
              onClick={reiniciar}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer"
            >
              Nueva Importación
            </button>
          </div>
        </div>
      )}
    </div>
  );
}