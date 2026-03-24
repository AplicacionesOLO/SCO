import { formatCurrency } from '../../../lib/currency';
import type { FacturaElectronica } from '../../../types/facturacion';

interface FacturacionTableProps {
  facturas: FacturaElectronica[];
  loading: boolean;
  onEdit: (factura: FacturaElectronica) => void;
  onFirmar: (factura: FacturaElectronica) => void;
  onEnviar: (factura: FacturaElectronica) => void;
  onConsultarEstado: (factura: FacturaElectronica) => void;
}

export function FacturacionTable({
  facturas,
  loading,
  onEdit,
  onFirmar,
  onEnviar,
  onConsultarEstado
}: FacturacionTableProps) {
  const getEstadoBadge = (estadoLocal: string, estadoHacienda?: string) => {
    const estado = estadoHacienda || estadoLocal;
    const colors = {
      borrador: 'bg-gray-100 text-gray-800',
      firmado: 'bg-blue-100 text-blue-800',
      enviado: 'bg-yellow-100 text-yellow-800',
      recibido: 'bg-orange-100 text-orange-800',
      aceptado: 'bg-green-100 text-green-800',
      rechazado: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[estado as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {estado.charAt(0).toUpperCase() + estado.slice(1)}
      </span>
    );
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-CR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando facturas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Consecutivo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cliente
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {facturas.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  <i className="ri-file-text-line text-4xl mb-4 block"></i>
                  No hay facturas registradas
                </td>
              </tr>
            ) : (
              facturas.map((factura) => (
                <tr key={factura.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {factura.consecutivo}
                    </div>
                    <div className="text-sm text-gray-500">
                      {factura.clave}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {factura.cliente?.razon_social || factura.cliente?.nombre_completo || 'Sin cliente'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {factura.cliente?.identificacion}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatFecha(factura.fecha_emision)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(factura.total)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getEstadoBadge(factura.estado_local, factura.estado_hacienda)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => onEdit(factura)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Editar"
                      >
                        <i className="ri-edit-line"></i>
                      </button>
                      
                      {factura.estado_local === 'borrador' && (
                        <button
                          onClick={() => onFirmar(factura)}
                          className="text-green-600 hover:text-green-900"
                          title="Firmar"
                        >
                          <i className="ri-shield-check-line"></i>
                        </button>
                      )}
                      
                      {factura.estado_local === 'firmado' && (
                        <button
                          onClick={() => onEnviar(factura)}
                          className="text-orange-600 hover:text-orange-900"
                          title="Enviar a Hacienda"
                        >
                          <i className="ri-send-plane-line"></i>
                        </button>
                      )}
                      
                      {factura.estado_local === 'enviado' && (
                        <button
                          onClick={() => onConsultarEstado(factura)}
                          className="text-purple-600 hover:text-purple-900"
                          title="Consultar Estado"
                        >
                          <i className="ri-refresh-line"></i>
                        </button>
                      )}
                      
                      <button
                        onClick={() => window.open(`/facturacion/${factura.id}/print`, '_blank')}
                        className="text-gray-600 hover:text-gray-900"
                        title="Imprimir"
                      >
                        <i className="ri-printer-line"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}