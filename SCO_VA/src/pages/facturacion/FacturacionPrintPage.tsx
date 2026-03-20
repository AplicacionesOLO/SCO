import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { haciendaService } from '../../services/haciendaService';
import { formatCurrency } from '../../lib/currency';
import type { FacturaElectronica } from '../../types/facturacion';

export default function FacturacionPrintPage() {
  const { id } = useParams<{ id: string }>();
  const [factura, setFactura] = useState<FacturaElectronica | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadFactura(parseInt(id));
    }
  }, [id]);

  useEffect(() => {
    // Auto-abrir diálogo de impresión
    const timer = setTimeout(() => {
      window.print();
    }, 1000);

    return () => clearTimeout(timer);
  }, [factura]);

  const loadFactura = async (facturaId: number) => {
    try {
      const data = await haciendaService.getFacturaById(facturaId);
      setFactura(data);
    } catch (error) {
      console.error('Error cargando factura:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-CR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando factura...</p>
        </div>
      </div>
    );
  }

  if (!factura) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <i className="ri-file-warning-line text-6xl text-gray-400 mb-4"></i>
          <p className="text-gray-600">Factura no encontrada</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-page { page-break-inside: avoid; }
          .print-section { page-break-inside: avoid; }
          body { margin: 0; padding: 20px; }
        }
      `}</style>

      {/* Botones de control - solo visible en pantalla */}
      <div className="no-print fixed top-4 right-4 space-x-2 z-10">
        <button
          onClick={() => window.print()}
          className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors whitespace-nowrap"
        >
          <i className="ri-printer-line mr-2"></i>
          Imprimir
        </button>
        <button
          onClick={() => window.close()}
          className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap"
        >
          <i className="ri-close-line mr-2"></i>
          Cerrar
        </button>
      </div>

      <div className="max-w-4xl mx-auto p-8 print-page">
        {/* Encabezado */}
        <div className="print-section mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-orange-600" style={{ fontFamily: 'Pacifico, serif' }}>
                OLO
              </h1>
              <p className="text-gray-600 mt-2">Sistema de Gestión Empresarial</p>
              <p className="text-sm text-gray-500">San José, Costa Rica</p>
              <p className="text-sm text-gray-500">Tel: (506) 2205-2525</p>
              <p className="text-sm text-gray-500">Email: info@olo.cr</p>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                FACTURA ELECTRÓNICA
              </h2>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Consecutivo:</p>
                <p className="font-bold text-lg">{factura.consecutivo}</p>
                <p className="text-sm text-gray-600 mt-2">Clave:</p>
                <p className="font-mono text-xs break-all">{factura.clave}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            {/* Información del Cliente */}
            <div className="print-section">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">
                Información del Cliente
              </h3>
              <div className="space-y-2">
                <p><span className="font-medium">Nombre:</span> {factura.cliente?.razon_social || factura.cliente?.nombre_completo || 'Cliente Ejemplo S.A.'}</p>
                <p><span className="font-medium">Identificación:</span> {factura.cliente?.identificacion || '3-101-2562-32'}</p>
                <p><span className="font-medium">Email:</span> {factura.cliente?.correo || 'cliente@ejemplo.com'}</p>
                <p><span className="font-medium">Teléfono:</span> {factura.cliente?.telefono || '2205-2525'}</p>
                <p><span className="font-medium">Dirección:</span> {factura.cliente?.direccion || 'San José, Costa Rica'}</p>
              </div>
            </div>

            {/* Información de la Factura */}
            <div className="print-section">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">
                Información de la Factura
              </h3>
              <div className="space-y-2">
                <p><span className="font-medium">Fecha de Emisión:</span> {formatFecha(factura.fecha_emision)}</p>
                <p><span className="font-medium">Condición de Venta:</span> {factura.condicion_venta === '01' ? 'Contado' : 'Crédito'}</p>
                <p><span className="font-medium">Medio de Pago:</span> {factura.medio_pago === '01' ? 'Efectivo' : 'Otro'}</p>
                <p><span className="font-medium">Moneda:</span> {factura.moneda}</p>
                {factura.plazo_credito > 0 && (
                  <p><span className="font-medium">Plazo de Crédito:</span> {factura.plazo_credito} días</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Detalle de Productos */}
        <div className="print-section mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
            Detalle de Productos y Servicios
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">Código</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">Descripción</th>
                  <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium">Cantidad</th>
                  <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium">Unidad</th>
                  <th className="border border-gray-300 px-3 py-2 text-right text-sm font-medium">Precio Unit.</th>
                  <th className="border border-gray-300 px-3 py-2 text-right text-sm font-medium">Descuento</th>
                  <th className="border border-gray-300 px-3 py-2 text-right text-sm font-medium">Impuesto</th>
                  <th className="border border-gray-300 px-3 py-2 text-right text-sm font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {factura.lineas?.map((linea, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-3 py-2 text-sm">{linea.codigo_articulo || 'N/A'}</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm">{linea.descripcion}</td>
                    <td className="border border-gray-300 px-3 py-2 text-center text-sm">{linea.cantidad}</td>
                    <td className="border border-gray-300 px-3 py-2 text-center text-sm">{linea.unidad_medida}</td>
                    <td className="border border-gray-300 px-3 py-2 text-right text-sm">{formatCurrency(linea.precio_unitario)}</td>
                    <td className="border border-gray-300 px-3 py-2 text-right text-sm">{formatCurrency(linea.descuento_monto)}</td>
                    <td className="border border-gray-300 px-3 py-2 text-right text-sm">{formatCurrency(linea.impuesto_monto)}</td>
                    <td className="border border-gray-300 px-3 py-2 text-right text-sm font-medium">{formatCurrency(linea.total_linea)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totales */}
        <div className="print-section mb-8">
          <div className="flex justify-end">
            <div className="w-80">
              <div className="bg-gray-50 p-4 rounded-lg border">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Subtotal:</span>
                    <span>{formatCurrency(factura.subtotal)}</span>
                  </div>
                  {factura.descuento_total > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span className="font-medium">Descuento:</span>
                      <span>-{formatCurrency(factura.descuento_total)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="font-medium">Impuesto:</span>
                    <span>{formatCurrency(factura.impuesto_total)}</span>
                  </div>
                  <div className="border-t border-gray-300 pt-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span className="text-orange-600">{formatCurrency(factura.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Estado y Observaciones */}
        <div className="print-section mb-8">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">
                Estado del Documento
              </h3>
              <div className="space-y-2">
                <p><span className="font-medium">Estado Local:</span> {factura.estado_local}</p>
                {factura.estado_hacienda && (
                  <p><span className="font-medium">Estado Hacienda:</span> {factura.estado_hacienda}</p>
                )}
              </div>
            </div>
            
            {factura.observaciones && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">
                  Observaciones
                </h3>
                <p className="text-sm text-gray-700">{factura.observaciones}</p>
              </div>
            )}
          </div>
        </div>

        {/* Pie de página */}
        <div className="print-section border-t border-gray-200 pt-6">
          <div className="text-center text-sm text-gray-600">
            <p>Este documento es una representación impresa de la factura electrónica</p>
            <p>Clave: {factura.clave}</p>
            <p className="mt-2">Generado por OLO - Sistema de Gestión Empresarial</p>
          </div>
        </div>
      </div>
    </div>
  );
}