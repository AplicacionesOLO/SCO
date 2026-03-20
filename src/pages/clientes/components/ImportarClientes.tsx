import { useState, useRef } from 'react';
import { Cliente } from '../../../types/cliente';
import { ClienteService } from '../../../services/clienteService';
import NotificationPopup from '../../../components/base/NotificationPopup';

interface ImportarClientesProps {
  onSuccess: () => void;
  onCancel: () => void;
}

interface ClienteImport {
  fila: number;
  datos: Partial<Cliente>;
  errores: string[];
  advertencias: string[];
}

export function ImportarClientes({ onSuccess, onCancel }: ImportarClientesProps) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [cargando, setCargando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [clientesImport, setClientesImport] = useState<ClienteImport[]>([]);
  const [mostrarVista, setMostrarVista] = useState(false);
  const [resultadoImport, setResultadoImport] = useState<{
    exitosos: number;
    errores: number;
    detalles: string[];
  } | null>(null);
  
  // Notification state
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    message: ''
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showNotification = (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    setNotification({ isOpen: true, type, message });
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, isOpen: false }));
  };

  const descargarPlantilla = () => {
    const plantillaCSV = `Tipo Persona,Tipo Identificación,Identificación,Nombre/Razón Social,Nombre Comercial,Correo Principal,Correos Adicionales,País Teléfono,Teléfono,Teléfono Secundario,Provincia,Cantón,Distrito,Barrio,Otras Señas,Código Postal,País ISO,Dirección Extranjero 1,Dirección Extranjero 2,Código Actividad Económica,Régimen Tributario,Número Exoneración,Institución Exoneración,Porcentaje Exoneración,Vencimiento Exoneración,Moneda Preferida,Condición Venta,Días Crédito,Límite Crédito,Activo
fisica,cedula_fisica,123456789,Juan Pérez Rodríguez,,juan.perez@email.com,juan.trabajo@email.com,506,88888888,22222222,San José,San José,Carmen,Centro,Casa blanca con portón negro,10101,CR,,,620200,general,,,0,,CRC,contado,0,0,true
juridica,cedula_juridica,3101234567,Empresa Ejemplo S.A.,Empresa Ejemplo,info@empresa.com,ventas@empresa.com;contabilidad@empresa.com,506,25551234,25551235,Alajuela,Alajuela,Alajuela,Centro,Edificio azul segundo piso,20101,CR,,,471100,general,,,0,,CRC,credito,30,1000000,true`;

    const blob = new Blob([plantillaCSV], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_clientes.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const manejarArchivoSeleccionado = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        showNotification('error', 'Por favor seleccione un archivo CSV');
        return;
      }
      
      setArchivo(file);
      setClientesImport([]);
      setMostrarVista(false);
      setResultadoImport(null);
    }
  };

  const procesarArchivo = async () => {
    if (!archivo) return;

    try {
      setCargando(true);
      
      const text = await archivo.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        showNotification('error', 'El archivo debe contener al menos una fila de encabezados y una fila de datos');
        return;
      }
      
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const rows = lines.slice(1);
      
      const clientesProcesados: ClienteImport[] = [];
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i].split(',').map(cell => cell.trim().replace(/"/g, ''));
        const fila = i + 2;
        
        if (row.every(cell => !cell)) continue;
        
        const clienteData: Partial<Cliente> = {};
        const errores: string[] = [];
        const advertencias: string[] = [];
        
        headers.forEach((header, index) => {
          const valor = row[index];
          if (!valor) return;
          
          switch (header.toLowerCase()) {
            case 'tipo persona':
              if (['fisica', 'juridica', 'extranjero'].includes(valor)) {
                clienteData.tipo_persona = valor as any;
              } else {
                errores.push(`Tipo persona inválido: ${valor}`);
              }
              break;
              
            case 'tipo identificación':
              if (['cedula_fisica', 'cedula_juridica', 'dimex', 'nite', 'pasaporte'].includes(valor)) {
                clienteData.tipo_identificacion = valor as any;
              } else {
                errores.push(`Tipo identificación inválido: ${valor}`);
              }
              break;
              
            case 'identificación':
              clienteData.identificacion = valor;
              break;
              
            case 'nombre/razón social':
              clienteData.nombre_razon_social = valor;
              break;
              
            case 'nombre comercial':
              clienteData.nombre_comercial = valor;
              break;
              
            case 'correo principal':
              if (ClienteService.validarEmail(valor)) {
                clienteData.correo_principal = valor;
              } else {
                errores.push(`Email inválido: ${valor}`);
              }
              break;
              
            case 'correos adicionales':
              const emails = valor.split(';').map(e => e.trim()).filter(e => e);
              const emailsValidos = emails.filter(e => ClienteService.validarEmail(e));
              if (emailsValidos.length !== emails.length) {
                advertencias.push('Algunos correos adicionales son inválidos');
              }
              clienteData.correos_adicionales = emailsValidos;
              break;
              
            case 'país teléfono':
              clienteData.telefono_pais = valor;
              break;
              
            case 'teléfono':
              if (ClienteService.validarTelefono(valor)) {
                clienteData.telefono_numero = valor;
              } else {
                advertencias.push(`Teléfono inválido: ${valor}`);
              }
              break;
              
            case 'teléfono secundario':
              clienteData.telefono_secundario = valor;
              break;
              
            case 'código actividad económica':
              clienteData.codigo_actividad_economica = valor;
              break;
              
            case 'régimen tributario':
              if (['general', 'simplificado', 'exento', 'otro'].includes(valor)) {
                clienteData.regimen_tributario = valor as any;
              } else {
                advertencias.push(`Régimen tributario inválido: ${valor}`);
              }
              break;
              
            case 'moneda preferida':
              clienteData.moneda_preferida = valor;
              break;
              
            case 'días crédito':
              const dias = parseInt(valor);
              if (!isNaN(dias) && dias >= 0) {
                clienteData.dias_credito = dias;
              } else {
                advertencias.push(`Días crédito inválido: ${valor}`);
              }
              break;
              
            case 'límite crédito':
              const limite = parseFloat(valor);
              if (!isNaN(limite) && limite >= 0) {
                clienteData.limite_credito = limite;
              } else {
                advertencias.push(`Límite crédito inválido: ${valor}`);
              }
              break;
              
            case 'activo':
              clienteData.activo = valor.toLowerCase() === 'true';
              break;
          }
        });
        
        // Validaciones obligatorias
        if (!clienteData.tipo_persona) errores.push('Tipo persona es obligatorio');
        if (!clienteData.tipo_identificacion) errores.push('Tipo identificación es obligatorio');
        if (!clienteData.identificacion) errores.push('Identificación es obligatoria');
        if (!clienteData.nombre_razon_social) errores.push('Nombre/Razón social es obligatorio');
        if (!clienteData.correo_principal) errores.push('Correo principal es obligatorio');
        
        // Validar formato de identificación
        if (clienteData.identificacion && clienteData.tipo_identificacion) {
          if (!ClienteService.validarIdentificacion(clienteData.tipo_identificacion, clienteData.identificacion)) {
            errores.push('Formato de identificación inválido');
          }
        }
        
        // Establecer valores por defecto
        clienteData.telefono_pais = clienteData.telefono_pais || '506';
        clienteData.moneda_preferida = clienteData.moneda_preferida || 'CRC';
        clienteData.dias_credito = clienteData.dias_credito || 0;
        clienteData.limite_credito = clienteData.limite_credito || 0;
        clienteData.activo = clienteData.activo !== false;
        clienteData.hacienda_estado_validacion = 'pendiente';
        
        clientesProcesados.push({
          fila,
          datos: clienteData,
          errores,
          advertencias
        });
      }
      
      setClientesImport(clientesProcesados);
      setMostrarVista(true);
      
    } catch (error) {
      console.error('Error procesando archivo:', error);
      showNotification('error', 'Error al procesar el archivo. Verifique el formato.');
    } finally {
      setCargando(false);
    }
  };

  const ejecutarImportacion = async () => {
    try {
      setProcesando(true);
      
      const clientesValidos = clientesImport.filter(c => c.errores.length === 0);
      
      if (clientesValidos.length === 0) {
        showNotification('warning', 'No hay clientes válidos para importar');
        return;
      }
      
      let exitosos = 0;
      let errores = 0;
      const detalles: string[] = [];
      
      for (const clienteImport of clientesValidos) {
        try {
          await ClienteService.crearCliente(clienteImport.datos as Cliente);
          exitosos++;
        } catch (error: any) {
          errores++;
          detalles.push(`Fila ${clienteImport.fila}: ${error.message}`);
        }
      }
      
      setResultadoImport({ exitosos, errores, detalles });
      
      if (exitosos > 0) {
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
      
    } catch (error) {
      console.error('Error en importación:', error);
      showNotification('error', 'Error durante la importación');
    } finally {
      setProcesando(false);
    }
  };

  const clientesConErrores = clientesImport.filter(c => c.errores.length > 0);
  const clientesValidos = clientesImport.filter(c => c.errores.length === 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      {/* Notification Popup */}
      <NotificationPopup
        isOpen={notification.isOpen}
        type={notification.type}
        message={notification.message}
        onClose={hideNotification}
      />

      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Importar Clientes
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <i className="ri-close-line text-2xl"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!mostrarVista && !resultadoImport && (
            <div className="space-y-6">
              {/* Instrucciones */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <i className="ri-information-line text-blue-600 text-xl mr-3 mt-0.5"></i>
                  <div>
                    <h3 className="text-lg font-medium text-blue-900 mb-2">
                      Instrucciones de Importación
                    </h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Descargue la plantilla CSV para ver el formato correcto</li>
                      <li>• Complete los datos siguiendo las instrucciones de la plantilla</li>
                      <li>• Los campos obligatorios son: Tipo Persona, Tipo Identificación, Identificación, Nombre/Razón Social, Correo Principal</li>
                      <li>• El sistema validará duplicados por identificación</li>
                      <li>• Se pueden actualizar clientes existentes</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Descargar plantilla */}
              <div className="text-center">
                <button
                  onClick={descargarPlantilla}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center mx-auto"
                >
                  <i className="ri-download-line mr-2"></i>
                  Descargar Plantilla CSV
                </button>
                <p className="text-sm text-gray-600 mt-2">
                  Incluye ejemplos e instrucciones detalladas
                </p>
              </div>

              {/* Seleccionar archivo */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <i className="ri-file-text-line text-4xl text-gray-400 mb-4"></i>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Seleccionar Archivo
                </h3>
                <p className="text-gray-600 mb-4">
                  Seleccione un archivo CSV con los datos de clientes
                </p>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={manejarArchivoSeleccionado}
                  className="hidden"
                />
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                  <i className="ri-folder-open-line mr-2"></i>
                  Seleccionar Archivo
                </button>
                
                {archivo && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center">
                      <i className="ri-file-line text-gray-600 mr-2"></i>
                      <span className="text-sm text-gray-700">{archivo.name}</span>
                    </div>
                    
                    <button
                      onClick={procesarArchivo}
                      disabled={cargando}
                      className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {cargando ? (
                        <>
                          <i className="ri-loader-4-line animate-spin mr-2"></i>
                          Procesando...
                        </>
                      ) : (
                        <>
                          <i className="ri-play-line mr-2"></i>
                          Procesar Archivo
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Vista previa */}
          {mostrarVista && !resultadoImport && (
            <div className="space-y-6">
              {/* Resumen */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <i className="ri-check-line text-green-600 text-xl mr-2"></i>
                    <div>
                      <p className="text-sm font-medium text-green-800">Válidos</p>
                      <p className="text-2xl font-bold text-green-900">{clientesValidos.length}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <i className="ri-close-line text-red-600 text-xl mr-2"></i>
                    <div>
                      <p className="text-sm font-medium text-red-800">Con Errores</p>
                      <p className="text-2xl font-bold text-red-900">{clientesConErrores.length}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <i className="ri-file-list-line text-blue-600 text-xl mr-2"></i>
                    <div>
                      <p className="text-sm font-medium text-blue-800">Total</p>
                      <p className="text-2xl font-bold text-blue-900">{clientesImport.length}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lista de clientes */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Vista Previa de Importación</h3>
                  <p className="text-sm text-gray-600">Primeras 50 filas</p>
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fila</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Identificación</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Correo</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Observaciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {clientesImport.slice(0, 50).map((cliente, index) => (
                        <tr key={index} className={cliente.errores.length > 0 ? 'bg-red-50' : 'bg-white'}>
                          <td className="px-4 py-2 text-sm text-gray-900">{cliente.fila}</td>
                          <td className="px-4 py-2">
                            {cliente.errores.length > 0 ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <i className="ri-close-line mr-1"></i>
                                Error
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <i className="ri-check-line mr-1"></i>
                                Válido
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">{cliente.datos.identificacion}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{cliente.datos.nombre_razon_social}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{cliente.datos.correo_principal}</td>
                          <td className="px-4 py-2 text-sm">
                            {cliente.errores.length > 0 && (
                              <div className="text-red-600">
                                {cliente.errores.map((error, i) => (
                                  <div key={i} className="text-xs">• {error}</div>
                                ))}
                              </div>
                            )}
                            {cliente.advertencias.length > 0 && (
                              <div className="text-yellow-600">
                                {cliente.advertencias.map((advertencia, i) => (
                                  <div key={i} className="text-xs">⚠ {advertencia}</div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex justify-between">
                <button
                  onClick={() => setMostrarVista(false)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <i className="ri-arrow-left-line mr-2"></i>
                  Volver
                </button>
                
                <button
                  onClick={ejecutarImportacion}
                  disabled={procesando || clientesValidos.length === 0}
                  className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
                >
                  {procesando ? (
                    <>
                      <i className="ri-loader-4-line animate-spin mr-2"></i>
                      Importando...
                    </>
                  ) : (
                    <>
                      <i className="ri-upload-line mr-2"></i>
                      Importar {clientesValidos.length} Clientes
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Resultado */}
          {resultadoImport && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <i className="ri-check-line text-3xl text-green-600"></i>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Importación Completada
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <i className="ri-check-line text-green-600 text-2xl mb-2"></i>
                  <p className="text-sm font-medium text-green-800">Clientes Importados</p>
                  <p className="text-3xl font-bold text-green-900">{resultadoImport.exitosos}</p>
                </div>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <i className="ri-close-line text-red-600 text-2xl mb-2"></i>
                  <p className="text-sm font-medium text-red-800">Errores</p>
                  <p className="text-3xl font-bold text-red-900">{resultadoImport.errores}</p>
                </div>
              </div>

              {resultadoImport.detalles.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-900 mb-2">Detalles de Errores:</h4>
                  <div className="space-y-1">
                    {resultadoImport.detalles.map((detalle, index) => (
                      <p key={index} className="text-sm text-red-800">• {detalle}</p>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-center">
                <button
                  onClick={onSuccess}
                  className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                  <i className="ri-check-line mr-2"></i>
                  Finalizar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
