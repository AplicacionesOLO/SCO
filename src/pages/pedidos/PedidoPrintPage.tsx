
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { pedidoService } from '../../services/pedidoService';
import { formatCurrency } from '../../lib/currency';
import type { Pedido } from '../../types/pedido';

export default function PedidoPrintPage() {
  const { id } = useParams<{ id: string }>();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadPedido(parseInt(id));
    }
  }, [id]);

  useEffect(() => {
    // Auto-abrir diálogo de impresión
    const timer = setTimeout(() => {
      window.print();
    }, 1000);

    return () => clearTimeout(timer);
  }, [pedido]);

  const loadPedido = async (pedidoId: number) => {
    try {
      const data = await pedidoService.getPedidoById(pedidoId);
      setPedido(data);
    } catch (error) {
      console.error('Error al cargar pedido:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Cargando pedido...</p>
        </div>
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Error: No se pudo cargar el pedido</p>
          <button
            onClick={() => window.close()}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Botones de acción - solo visible en pantalla */}
      <div className="print:hidden fixed top-4 right-4 flex gap-2 z-10">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
        >
          <i className="ri-printer-line"></i>
          Imprimir
        </button>
        <button
          onClick={() => window.close()}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center gap-2"
        >
          <i className="ri-close-line"></i>
          Cerrar
        </button>
      </div>

      {/* Contenido del pedido */}
      <div className="max-w-4xl mx-auto p-8 print:p-0">
        {/* Header de la empresa */}
        <div className="text-center mb-8 pb-6 border-b-2 border-gray-300">
          <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Pacifico, serif' }}>
            OLO
          </h1>
          <p className="text-gray-600">Sistema de Gestión Empresarial</p>
          <p className="text-sm text-gray-500">
            San José, Costa Rica • Tel: (506) 2205-2525 • Email: info@olo.cr
          </p>
        </div>

        {/* Información del pedido */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Datos del pedido */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">PEDIDO DE VENTA</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">Número:</span>
                <span>{pedido.codigo}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Fecha de emisión:</span>
                <span>{new Date(pedido.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Estado:</span>
                <span className="capitalize font-medium">{pedido.estado}</span>
              </div>
              {pedido.confirmado_at && (
                <div className="flex justify-between">
                  <span className="font-medium">Fecha confirmación:</span>
                  <span>{new Date(pedido.confirmado_at).toLocaleDateString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="font-medium">Moneda:</span>
                <span>{pedido.moneda}</span>
              </div>
              {pedido.tipo_cambio !== 1 && (
                <div className="flex justify-between">
                  <span className="font-medium">Tipo de cambio:</span>
                  <span>₡{pedido.tipo_cambio.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Información del cliente */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Información del Cliente</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Nombre:</span>
                <div>{pedido.cliente?.nombre || 'Cliente Ejemplo S.A.'}</div>
              </div>
              <div>
                <span className="font-medium">Identificación:</span>
                <div>{pedido.cliente?.identificacion || '3-101-2562-32'}</div>
              </div>
              <div>
                <span className="font-medium">Email:</span>
                <div>{pedido.cliente?.email || 'cliente@ejemplo.com'}</div>
              </div>
              <div>
                <span className="font-medium">Teléfono:</span>
                <div>{pedido.cliente?.telefono || '2205-2525'}</div>
              </div>
              <div>
                <span className="font-medium">Dirección:</span>
                <div>{pedido.cliente?.direccion || 'San José, Costa Rica'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Referencia a cotización */}
        {pedido.cotizacion && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Referencia:</strong> Pedido generado desde cotización {pedido.cotizacion.numero_cotizacion}
            </p>
          </div>
        )}

        {/* Tabla de productos */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Detalle de Productos</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">Código</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">Descripción</th>
                  <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium">Unidad</th>
                  <th className="border border-gray-300 px-3 py-2 text-right text-sm font-medium">Cantidad</th>
                  <th className="border border-gray-300 px-3 py-2 text-right text-sm font-medium">Precio Unit.</th>
                  <th className="border border-gray-300 px-3 py-2 text-right text-sm font-medium">Descuento</th>
                  <th className="border border-gray-300 px-3 py-2 text-right text-sm font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {pedido.items.map((item, index) => (
                  <tr key={index} className="product-with-components">
                    <td className="border border-gray-300 px-3 py-2 text-sm">{item.codigo_articulo}</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm">{item.descripcion}</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-center">{item.unidad}</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-right">{item.cantidad}</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-right">
                      {formatCurrency(item.precio_unitario, pedido.moneda)}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-right">
                      {item.descuento_porcentaje > 0 ? `${item.descuento_porcentaje}%` : '-'}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-right font-medium">
                      {formatCurrency(item.total_linea, pedido.moneda)}
                    </td>
                  </tr>
                ))}

                {/* Componentes BOM expandidos */}
                {pedido.items.map((item, itemIndex) => 
                  item.meta_json?.bom_items?.map((bomItem, bomIndex) => (
                    <tr key={`${itemIndex}-bom-${bomIndex}`} className="bg-blue-50 bom-section">
                      <td className="border border-gray-300 px-6 py-1 text-xs text-gray-600">
                        └ {bomItem.codigo}
                      </td>
                      <td className="border border-gray-300 px-6 py-1 text-xs text-gray-600">
                        {bomItem.descripcion}
                      </td>
                      <td className="border border-gray-300 px-3 py-1 text-xs text-gray-600 text-center">
                        {bomItem.unidad}
                      </td>
                      <td className="border border-gray-300 px-3 py-1 text-xs text-gray-600 text-right">
                        {bomItem.cantidad_total}
                      </td>
                      <td className="border border-gray-300 px-3 py-1 text-xs text-gray-600 text-right">
                        {formatCurrency(bomItem.precio_unitario, pedido.moneda)}
                      </td>
                      <td className="border border-gray-300 px-3 py-1 text-xs text-gray-600 text-right">-</td>
                      <td className="border border-gray-300 px-3 py-1 text-xs text-gray-600 text-right">
                        {formatCurrency(bomItem.total, pedido.moneda)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totales */}
        <div className="totals-section mb-8">
          <div className="max-w-md ml-auto">
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{formatCurrency(pedido.subtotal, pedido.moneda)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Descuento:</span>
                <span>-{formatCurrency(pedido.descuento_total, pedido.moneda)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Impuesto:</span>
                <span>{formatCurrency(pedido.impuesto_total, pedido.moneda)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span>{formatCurrency(pedido.total, pedido.moneda)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notas */}
        {pedido.notas && (
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Notas</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{pedido.notas}</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 border-t pt-4">
          <p>Este documento fue generado automáticamente por el Sistema OLO</p>
          <p>Fecha de impresión: {new Date().toLocaleString()}</p>
        </div>
      </div>

      {/* Estilos de impresión */}
      <style jsx>{`
        @media print {
          .print:hidden {
            display: none !important;
          }
          
          .print:p-0 {
            padding: 0 !important;
          }
          
          body {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          
          .product-with-components {
            page-break-inside: avoid;
          }
          
          .bom-section {
            page-break-inside: avoid;
          }
          
          .totals-section {
            page-break-inside: avoid;
          }
          
          .client-info {
            page-break-inside: avoid;
          }
          
          table {
            page-break-inside: auto;
          }
          
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          thead {
            display: table-header-group;
          }
          
          tfoot {
            display: table-footer-group;
          }
        }
      `}</style>
    </div>
  );
}
