
import { useState, useRef } from 'react';
import { supabase } from '../../../lib/supabase';

interface ImportarUmbralesProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportarUmbrales({ onClose, onSuccess }: ImportarUmbralesProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/)) {
      setError('Por favor selecciona un archivo Excel (.xlsx, .xls) o CSV');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Leer el archivo como texto para procesarlo
      const text = await file.text();
      const lines = text.split('\n');
      
      if (lines.length < 2) {
        throw new Error('El archivo debe contener al menos una fila de datos además del encabezado');
      }

      // Procesar CSV (asumiendo formato: codigo_articulo,min_qty,max_qty,safety_stock,lead_time_dias,lote_minimo)
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const expectedHeaders = ['codigo_articulo', 'min_qty', 'max_qty', 'safety_stock', 'lead_time_dias', 'lote_minimo'];
      
      // Validar encabezados
      const hasRequiredHeaders = expectedHeaders.every(header => 
        headers.some(h => h.toLowerCase().includes(header.toLowerCase()))
      );

      if (!hasRequiredHeaders) {
        throw new Error(`El archivo debe contener las columnas: ${expectedHeaders.join(', ')}`);
      }

      const dataRows = lines.slice(1).filter(line => line.trim());
      const processedData = [];
      const errors = [];

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i].split(',').map(cell => cell.trim().replace(/"/g, ''));
        
        if (row.length < expectedHeaders.length) {
          errors.push(`Fila ${i + 2}: Datos incompletos`);
          continue;
        }

        const codigo_articulo = row[0];
        const min_qty = parseFloat(row[1]);
        const max_qty = parseFloat(row[2]);
        const safety_stock = parseFloat(row[3]);
        const lead_time_dias = parseInt(row[4]);
        const lote_minimo = parseFloat(row[5]) || 0;

        // Validaciones
        if (!codigo_articulo) {
          errors.push(`Fila ${i + 2}: Código de artículo requerido`);
          continue;
        }

        if (isNaN(min_qty) || min_qty < 0) {
          errors.push(`Fila ${i + 2}: Cantidad mínima debe ser un número ≥ 0`);
          continue;
        }

        if (isNaN(max_qty) || max_qty < min_qty) {
          errors.push(`Fila ${i + 2}: Cantidad máxima debe ser ≥ cantidad mínima`);
          continue;
        }

        if (isNaN(safety_stock) || safety_stock < 0) {
          errors.push(`Fila ${i + 2}: Stock de seguridad debe ser un número ≥ 0`);
          continue;
        }

        if (isNaN(lead_time_dias) || lead_time_dias < 0) {
          errors.push(`Fila ${i + 2}: Lead time debe ser un número entero ≥ 0`);
          continue;
        }

        // Buscar el artículo en inventario
        const { data: articulo, error: articuloError } = await supabase
          .from('inventario')
          .select('Id_Articulo')
          .eq('codigo_articulo', codigo_articulo)
          .single();

        if (articuloError || !articulo) {
          errors.push(`Fila ${i + 2}: Artículo '${codigo_articulo}' no encontrado en inventario`);
          continue;
        }

        // Calcular ROP
        const demanda_promedio_dia = 1.0; // Valor por defecto, se puede obtener de configuración
        const reorder_point = safety_stock + (demanda_promedio_dia * lead_time_dias);

        processedData.push({
          articulo_id: articulo.Id_Articulo,
          min_qty,
          max_qty,
          safety_stock,
          reorder_point,
          lead_time_dias,
          lote_minimo,
          activo: true
        });
      }

      if (errors.length > 0) {
        throw new Error(`Errores encontrados:\n${errors.join('\n')}`);
      }

      if (processedData.length === 0) {
        throw new Error('No se encontraron datos válidos para procesar');
      }

      // Insertar o actualizar umbrales
      let insertedCount = 0;
      let updatedCount = 0;

      for (const threshold of processedData) {
        // Verificar si ya existe un umbral para este artículo
        const { data: existing } = await supabase
          .from('inventario_thresholds')
          .select('id')
          .eq('articulo_id', threshold.articulo_id)
          .single();

        if (existing) {
          // Actualizar
          const { error: updateError } = await supabase
            .from('inventario_thresholds')
            .update(threshold)
            .eq('id', existing.id);

          if (updateError) throw updateError;
          updatedCount++;
        } else {
          // Insertar
          const { error: insertError } = await supabase
            .from('inventario_thresholds')
            .insert(threshold);

          if (insertError) throw insertError;
          insertedCount++;
        }
      }

      setSuccess(`Importación exitosa: ${insertedCount} umbrales creados, ${updatedCount} actualizados`);
      
      setTimeout(() => {
        onSuccess();
      }, 2000);

    } catch (error: any) {
      console.error('Error importando umbrales:', error);
      setError(error.message || 'Error al procesar el archivo');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const headers = ['codigo_articulo', 'min_qty', 'max_qty', 'safety_stock', 'lead_time_dias', 'lote_minimo'];
    const sampleData = [
      ['ART001', '10', '100', '15', '7', '5'],
      ['ART002', '5', '50', '10', '3', '1'],
      ['ART003', '20', '200', '30', '14', '10']
    ];

    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_umbrales_stock.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Importar Umbrales de Stock
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        {/* Instrucciones */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">
            <i className="ri-information-line mr-2"></i>
            Instrucciones de importación
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• El archivo debe ser CSV o Excel (.xlsx, .xls)</li>
            <li>• Debe contener las columnas: codigo_articulo, min_qty, max_qty, safety_stock, lead_time_dias, lote_minimo</li>
            <li>• Los códigos de artículo deben existir en el inventario</li>
            <li>• Las cantidades deben ser números positivos</li>
            <li>• max_qty debe ser mayor o igual a min_qty</li>
          </ul>
        </div>

        {/* Botón para descargar plantilla */}
        <div className="mb-6">
          <button
            onClick={downloadTemplate}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <i className="ri-download-line mr-2"></i>
            Descargar Plantilla CSV
          </button>
        </div>

        {/* Área de carga */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <i className="ri-upload-cloud-2-line text-4xl text-gray-400 mb-4"></i>
          <p className="text-lg font-medium text-gray-700 mb-2">
            Arrastra tu archivo aquí o haz clic para seleccionar
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Formatos soportados: CSV, Excel (.xlsx, .xls)
          </p>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileInput}
            className="hidden"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Procesando...' : 'Seleccionar Archivo'}
          </button>
        </div>

        {/* Mensajes */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start">
              <i className="ri-error-warning-line text-red-500 mr-2 mt-0.5"></i>
              <div>
                <h4 className="font-medium text-red-800">Error</h4>
                <pre className="text-sm text-red-700 whitespace-pre-wrap">{error}</pre>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <i className="ri-check-line text-green-500 mr-2"></i>
              <div>
                <h4 className="font-medium text-green-800">Éxito</h4>
                <p className="text-sm text-green-700">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="mt-4 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Procesando archivo...</span>
          </div>
        )}

        {/* Botones */}
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
