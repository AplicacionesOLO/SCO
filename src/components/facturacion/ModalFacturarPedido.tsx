import { useState } from 'react';
import { useNotification } from '../../hooks/useNotification';
import ConfirmationDialog from '../base/ConfirmationDialog';
import { supabase } from '../../lib/supabase';

interface FacturacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  pedido: any;
  onSuccess: () => void;
}

export default function ModalFacturarPedido({ isOpen, onClose, pedido, onSuccess }: FacturacionModalProps) {
  const [loading, setLoading] = useState(false);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { showNotification } = useNotification();

  const validarDatos = () => {
    const errores: string[] = [];
    
    if (!pedido) {
      errores.push('No se ha seleccionado un pedido');
    }
    
    if (!pedido?.cliente_id) {
      errores.push('El pedido debe tener un cliente asignado');
    }
    
    // Verificar items - puede estar en items o pedido_items
    const items = pedido?.items || pedido?.pedido_items || [];
    if (items.length === 0) {
      errores.push('El pedido debe tener al menos un item');
    }
    
    if (!pedido?.total || pedido.total <= 0) {
      errores.push('El pedido debe tener un total válido');
    }
    
    if (pedido?.estado !== 'confirmado') {
      errores.push('Solo se pueden facturar pedidos confirmados');
    }
    
    return errores;
  };

  const handleEmitirFactura = async () => {
    const errores = validarDatos();
    
    if (errores.length > 0) {
      setValidationErrors(errores);
      setShowValidationDialog(true);
      return;
    }

    setLoading(true);
    
    try {
      console.log('📤 Emitiendo factura para pedido:', pedido.id);

      // Obtener items del pedido (puede estar en items o pedido_items)
      const items = pedido.items || pedido.pedido_items || [];

      // Generar correlation ID para trazabilidad
      const correlationId = crypto.randomUUID();
      console.log('🔍 Correlation ID:', correlationId);

      // Llamar a la Edge Function de Supabase usando fetch directo para mejor manejo de errores
      const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;
      
      // Obtener el token de sesión
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${supabaseUrl}/functions/v1/facturar-pedido`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || supabaseAnonKey}`,
          'apikey': supabaseAnonKey,
          'x-correlation-id': correlationId
        },
        body: JSON.stringify({
          pedido_id: pedido.id,
          tipo_documento: '01', // 01 = Factura Electrónica
          condicion_venta: '01', // 01 = Contado
          medio_pago: '01', // 01 = Efectivo
          moneda: 'CRC',
          tipo_cambio: 1,
          observaciones: null,
          items: items.map((item: any) => ({
            item_type: item.item_type || 'producto',
            item_id: item.item_id,
            descripcion: item.descripcion,
            unidad: item.unidad || 'UND',
            cantidad: item.cantidad,
            precio_unitario: item.precio_unit || item.precio_unitario,
            descuento_porcentaje: item.descuento_pct || item.descuento_porcentaje || 0,
            impuesto_porcentaje: item.impuesto_pct || item.impuesto_porcentaje || 13,
            total: item.total
          }))
        })
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);

      // Leer el cuerpo de la respuesta
      const responseText = await response.text();
      console.log('📄 Response body:', responseText);

      let resultado;
      try {
        resultado = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Error parseando respuesta:', parseError);
        setErrorMessage(`❌ Error al procesar respuesta del servidor:\n\n${responseText}\n\nID de seguimiento: ${correlationId}`);
        setShowErrorDialog(true);
        return;
      }

      console.log('📥 Respuesta parseada:', resultado);

      // Si la respuesta HTTP no es OK (2xx)
      if (!response.ok) {
        console.error('❌ Error HTTP:', response.status, resultado);
        
        let errorDetails = '';
        
        if (resultado.code) {
          errorDetails = `Código: ${resultado.code}\n`;
        }
        
        if (resultado.message) {
          errorDetails += resultado.message;
        } else {
          errorDetails += 'Error desconocido';
        }
        
        if (resultado.pgError) {
          errorDetails += `\n\nError de base de datos:\n`;
          errorDetails += `• Código: ${resultado.pgError.code || 'N/A'}\n`;
          errorDetails += `• Mensaje: ${resultado.pgError.message || 'N/A'}\n`;
          if (resultado.pgError.details) {
            errorDetails += `• Detalles: ${resultado.pgError.details}\n`;
          }
          if (resultado.pgError.hint) {
            errorDetails += `• Sugerencia: ${resultado.pgError.hint}\n`;
          }
        }
        
        if (resultado.stage) {
          errorDetails += `\n\nEtapa: ${resultado.stage}`;
        }
        
        errorDetails += `\n\nID de seguimiento: ${resultado.correlationId || correlationId}`;
        
        setErrorMessage(`❌ Error al emitir factura:\n\n${errorDetails}`);
        setShowErrorDialog(true);
        return;
      }
      
      // Verificar si la respuesta indica éxito
      if (resultado && resultado.success) {
        setSuccessMessage(`✅ Factura ${resultado.consecutivo} creada exitosamente\n\nEstado: ${resultado.estado}\nClave: ${resultado.clave}\n\nID: ${resultado.factura_id}`);
        setShowSuccessDialog(true);
      } else if (resultado && resultado.ok === false) {
        // La Edge Function devolvió un error estructurado
        const errorMsg = resultado.message || 'Error desconocido';
        const errorCode = resultado.code || 'UNKNOWN';
        const correlationIdResp = resultado.correlationId || correlationId;
        
        let detailedError = `Código: ${errorCode}\n${errorMsg}`;
        
        if (resultado.pgError) {
          detailedError += `\n\nError de base de datos:\n${JSON.stringify(resultado.pgError, null, 2)}`;
        }
        
        detailedError += `\n\nID de seguimiento: ${correlationIdResp}`;
        
        setErrorMessage(`❌ Error al emitir factura:\n\n${detailedError}`);
        setShowErrorDialog(true);
      } else {
        // Respuesta inesperada
        setErrorMessage(`❌ Respuesta inesperada del servidor:\n\n${JSON.stringify(resultado, null, 2)}\n\nID de seguimiento: ${correlationId}`);
        setShowErrorDialog(true);
      }
    } catch (error) {
      console.error('💥 Error inesperado emitiendo factura:', error);
      
      let errorMsg = 'Error inesperado al emitir factura';
      
      if (error instanceof Error) {
        errorMsg += `:\n\n${error.message}`;
        
        if (error.stack) {
          console.error('Stack trace:', error.stack);
        }
      } else {
        errorMsg += `:\n\n${String(error)}`;
      }
      
      setErrorMessage(errorMsg);
      setShowErrorDialog(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessConfirm = () => {
    setShowSuccessDialog(false);
    onSuccess();
    onClose();
  };

  const handleErrorConfirm = () => {
    setShowErrorDialog(false);
  };

  if (!isOpen) return null;

  // Obtener nombre del cliente correctamente
  const nombreCliente = pedido?.cliente?.nombre_razon_social || pedido?.cliente?.nombre || 'Sin nombre';
  
  // Obtener items correctamente (puede estar en items o pedido_items)
  const items = pedido?.items || pedido?.pedido_items || [];

  return (
    <>
      {/* Modal Principal */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Emitir Factura Electrónica
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
                disabled={loading}
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 mb-2">
                ¿Deseas emitir una factura electrónica para el pedido #{pedido?.codigo}?
              </p>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-700">
                  <div><strong>Cliente:</strong> {nombreCliente}</div>
                  <div><strong>Total:</strong> ₡{pedido?.total?.toLocaleString() || '0'}</div>
                  <div><strong>Items:</strong> {items.length}</div>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={handleEmitirFactura}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                {loading ? (
                  <>
                    <i className="ri-loader-4-line animate-spin mr-2"></i>
                    Procesando...
                  </>
                ) : (
                  <>
                    <i className="ri-bill-line mr-2"></i>
                    Emitir Factura
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog de Errores de Validación */}
      <ConfirmationDialog
        isOpen={showValidationDialog}
        onClose={() => setShowValidationDialog(false)}
        onConfirm={() => setShowValidationDialog(false)}
        title="Errores de Validación"
        message={
          <div className="space-y-2">
            <p className="text-gray-600 mb-3">Se encontraron los siguientes errores:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-red-600">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        }
        type="error"
        confirmText="Entendido"
        showCancel={false}
      />

      {/* Dialog de Éxito */}
      <ConfirmationDialog
        isOpen={showSuccessDialog}
        onClose={handleSuccessConfirm}
        onConfirm={handleSuccessConfirm}
        title="Factura Emitida Exitosamente"
        message={
          <div className="space-y-3">
            <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-4">
              <i className="ri-check-line text-2xl text-green-600"></i>
            </div>
            <div className="text-center">
              <p className="text-gray-600 whitespace-pre-line">{successMessage}</p>
            </div>
          </div>
        }
        type="success"
        confirmText="Continuar"
        showCancel={false}
      />

      {/* Dialog de Error */}
      <ConfirmationDialog
        isOpen={showErrorDialog}
        onClose={handleErrorConfirm}
        onConfirm={handleErrorConfirm}
        title="Error al Emitir Factura"
        message={
          <div className="space-y-3">
            <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
              <i className="ri-close-line text-2xl text-red-600"></i>
            </div>
            <div className="text-center">
              <p className="text-gray-600 whitespace-pre-line text-left">{errorMessage}</p>
            </div>
          </div>
        }
        type="error"
        confirmText="Cerrar"
        showCancel={false}
      />
    </>
  );
}
