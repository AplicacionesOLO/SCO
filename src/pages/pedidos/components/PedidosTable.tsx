import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../../lib/currency';
import { ESTADOS_PEDIDO, type Pedido } from '../../../types/pedido';
import { supabase } from '../../../lib/supabase';
import { showAlert, showConfirm } from '../../../utils/dialog';

interface PedidosTableProps {
  pedidos: Pedido[];
  loading: boolean;
  onEdit: (pedido: Pedido) => void;
  onConfirmar: (id: number) => void;
  onCancelar: (id: number) => void;
  onFacturar: (pedido: Pedido) => void;
}

export default function PedidosTable({ 
  pedidos, 
  loading, 
  onEdit, 
  onConfirmar, 
  onCancelar, 
  onFacturar 
}: PedidosTableProps) {
  const navigate = useNavigate();
  const [showPrintWarning, setShowPrintWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [checkingFactura, setCheckingFactura] = useState(false);

  const handlePrint = async (pedido: Pedido) => {
    // Si el pedido está facturado, verificar el estado de Hacienda
    if (pedido.estado === 'facturado' && pedido.factura_id) {
      try {
        setCheckingFactura(true);

        // Obtener el estado actual de la factura desde la base de datos
        const { data: factura, error } = await supabase
          .from('facturas_electronicas')
          .select('id, consecutivo, clave, estado_local, estado_hacienda')
          .eq('id', pedido.factura_id)
          .single();

        if (error) {
          console.error('Error obteniendo factura:', error);
          setWarningMessage('Error al verificar el estado de la factura. Por favor intente nuevamente.');
          setShowPrintWarning(true);
          setCheckingFactura(false);
          return;
        }

        if (!factura) {
          setWarningMessage('No se encontró la factura asociada a este pedido.');
          setShowPrintWarning(true);
          setCheckingFactura(false);
          return;
        }

        // Verificar si la factura fue aprobada por Hacienda
        const estadosAprobados = ['aceptado', 'aceptada', 'aprobado', 'aprobada'];
        const facturaAprobada = estadosAprobados.includes(factura.estado_hacienda?.toLowerCase() || '');

        if (facturaAprobada) {
          // Navegar a la página de impresión de factura en la misma pestaña
          navigate(`/facturacion/${pedido.factura_id}/print`);
        } else {
          // Mostrar advertencia
          setWarningMessage(
            `Por favor revisar el estatus de la factura. Se puede imprimir una vez sea aprobada por Hacienda.\n\nEstado actual: ${factura.estado_hacienda || factura.estado_local || 'Pendiente'}\nConsecutivo: ${factura.consecutivo || 'N/A'}`
          );
          setShowPrintWarning(true);
        }

        setCheckingFactura(false);
      } catch (error) {
        console.error('Error verificando factura:', error);
        setWarningMessage('Error al verificar el estado de la factura. Por favor intente nuevamente.');
        setShowPrintWarning(true);
        setCheckingFactura(false);
      }
    } else {
      // Si no está facturado, navegar a la página de impresión del pedido
      navigate(`/pedidos/${pedido.id}/print`);
    }
  };

  const handleEliminar = async (id: number) => {
    const ok = await showConfirm('¿Estás seguro de que deseas eliminar este pedido?');
    if (!ok) return;
    // Aquí iría la lógica de eliminación
    console.log('Eliminar pedido:', id);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (pedidos.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <div className="text-gray-500">
          <i className="ri-file-list-3-line text-4xl mb-4"></i>
          <p>No hay pedidos registrados</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pedido
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pedidos.map((pedido) => (
                <tr key={pedido.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {pedido.codigo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {pedido.cliente?.nombre_razon_social || pedido.cliente?.nombre || 'Sin cliente'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {pedido.cliente?.identificacion || 'Sin identificación'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${ESTADOS_PEDIDO[pedido.estado].color}`}>
                      {ESTADOS_PEDIDO[pedido.estado].label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(pedido.total, pedido.moneda)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(pedido.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {/* Botón Editar - Solo si está en borrador o confirmado */}
                      {(pedido.estado === 'borrador' || pedido.estado === 'confirmado') && (
                        <button
                          onClick={() => onEdit(pedido)}
                          className="text-blue-600 hover:text-blue-900 p-2 rounded hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Editar pedido"
                        >
                          <i className="ri-edit-line text-lg"></i>
                        </button>
                      )}

                      {/* Botón Imprimir */}
                      <button
                        onClick={() => handlePrint(pedido)}
                        disabled={checkingFactura}
                        className={`p-2 rounded transition-colors cursor-pointer ${
                          checkingFactura 
                            ? 'text-gray-400 cursor-not-allowed' 
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                        title={pedido.estado === 'facturado' ? 'Imprimir factura' : 'Imprimir pedido'}
                      >
                        {checkingFactura ? (
                          <i className="ri-loader-4-line text-lg animate-spin"></i>
                        ) : (
                          <i className="ri-printer-line text-lg"></i>
                        )}
                      </button>

                      {/* Botón Confirmar - Solo si está en borrador */}
                      {pedido.estado === 'borrador' && (
                        <button
                          onClick={() => onConfirmar(pedido.id)}
                          className="text-green-600 hover:text-green-900 p-2 rounded hover:bg-green-50 transition-colors cursor-pointer"
                          title="Confirmar pedido"
                        >
                          <i className="ri-check-line text-lg"></i>
                        </button>
                      )}

                      {/* Botón Facturar - Solo si está confirmado */}
                      {pedido.estado === 'confirmado' && (
                        <button
                          onClick={() => onFacturar(pedido)}
                          className="text-emerald-600 hover:text-emerald-900 p-2 rounded hover:bg-emerald-50 transition-colors cursor-pointer"
                          title="Facturar pedido"
                        >
                          <i className="ri-bill-line text-lg"></i>
                        </button>
                      )}

                      {/* Botón Cancelar - Solo si está en borrador o confirmado */}
                      {(pedido.estado === 'borrador' || pedido.estado === 'confirmado') && (
                        <button
                          onClick={() => onCancelar(pedido.id)}
                          className="text-orange-600 hover:text-orange-900 p-2 rounded hover:bg-orange-50 transition-colors cursor-pointer"
                          title="Cancelar pedido"
                        >
                          <i className="ri-close-line text-lg"></i>
                        </button>
                      )}

                      {/* Botón Eliminar - Solo si está en borrador o cancelado */}
                      {(pedido.estado === 'borrador' || pedido.estado === 'cancelado') && (
                        <button
                          onClick={() => handleEliminar(pedido.id)}
                          className="text-red-600 hover:text-red-900 p-2 rounded hover:bg-red-50 transition-colors cursor-pointer"
                          title="Eliminar pedido"
                        >
                          <i className="ri-delete-bin-line text-lg"></i>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de advertencia para impresión */}
      {showPrintWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                <i className="ri-error-warning-line text-2xl text-yellow-600"></i>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Factura Pendiente de Aprobación</h3>
                <p className="text-gray-600 whitespace-pre-line">{warningMessage}</p>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowPrintWarning(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
