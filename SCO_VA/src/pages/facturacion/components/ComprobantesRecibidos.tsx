import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { formatCurrency } from '../../../lib/currency';
import type { ComprobanteRecibido } from '../../../types/facturacion';
import { showAlert } from '../../../utils/dialog';

export function ComprobantesRecibidos() {
  const [comprobantes, setComprobantes] = useState<ComprobanteRecibido[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComprobante, setSelectedComprobante] = useState<ComprobanteRecibido | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadComprobantes();
  }, []);

  const loadComprobantes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('comprobantes_recibidos')
        .select('*')
        .order('fecha_emision', { ascending: false });

      if (error) throw error;
      setComprobantes(data || []);
    } catch (error) {
      console.error('Error cargando comprobantes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAceptar = async (comprobante: ComprobanteRecibido) => {
    try {
      const mensajeReceptor = await generarMensajeReceptor(comprobante, 'aceptado');
      
      await supabase
        .from('comprobantes_recibidos')
        .update({
          estado_receptor: 'aceptado',
          fecha_respuesta: new Date().toISOString(),
          xml_respuesta: mensajeReceptor
        })
        .eq('id', comprobante.id);

      loadComprobantes();
      showAlert('Comprobante aceptado exitosamente');
    } catch (error) {
      console.error('Error aceptando comprobante:', error);
      showAlert('Error aceptando comprobante');
    }
  };

  const handleRechazar = async (comprobante: ComprobanteRecibido, razon: string) => {
    try {
      const mensajeReceptor = await generarMensajeReceptor(comprobante, 'rechazado', razon);
      
      await supabase
        .from('comprobantes_recibidos')
        .update({
          estado_receptor: 'rechazado',
          fecha_respuesta: new Date().toISOString(),
          xml_respuesta: mensajeReceptor,
          observaciones: razon
        })
        .eq('id', comprobante.id);

      loadComprobantes();
      setShowModal(false);
      showAlert('Comprobante rechazado exitosamente');
    } catch (error) {
      console.error('Error rechazando comprobante:', error);
      showAlert('Error rechazando comprobante');
    }
  };

  const generarMensajeReceptor = async (comprobante: ComprobanteRecibido, accion: string, razon?: string): Promise<string> => {
    // Generar XML de mensaje receptor según especificaciones de Hacienda
    const fecha = new Date().toISOString();
    
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<MensajeReceptor xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.3/mensajeReceptor">
  <Clave>${comprobante.clave}</Clave>
  <NumeroCedulaEmisor>${comprobante.emisor_cedula}</NumeroCedulaEmisor>
  <FechaEmisionDoc>${comprobante.fecha_emision}</FechaEmisionDoc>
  <Mensaje>${accion === 'aceptado' ? '1' : '2'}</Mensaje>
  ${razon ? `<DetalleMensaje>${razon}</DetalleMensaje>` : ''}
  <MontoTotalImpuesto>${comprobante.total || 0}</MontoTotalImpuesto>
  <TotalFactura>${comprobante.total || 0}</TotalFactura>
</MensajeReceptor>`;

    return xml;
  };

  const getEstadoBadge = (estado: string) => {
    const colors = {
      pendiente: 'bg-yellow-100 text-yellow-800',
      aceptado: 'bg-green-100 text-green-800',
      rechazado: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[estado as keyof typeof colors]}`}>
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
          <p className="mt-2 text-gray-600">Cargando comprobantes recibidos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Comprobantes Recibidos</h2>
        <div className="text-sm text-gray-600">
          Total: {comprobantes.length} comprobantes
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clave
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Emisor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha Emisión
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
              {comprobantes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <i className="ri-inbox-line text-4xl mb-4 block"></i>
                    No hay comprobantes recibidos
                  </td>
                </tr>
              ) : (
                comprobantes.map((comprobante) => (
                  <tr key={comprobante.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {comprobante.clave}
                      </div>
                      <div className="text-sm text-gray-500">
                        Tipo: {comprobante.tipo_documento}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {comprobante.emisor_nombre || 'Sin nombre'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {comprobante.emisor_cedula}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatFecha(comprobante.fecha_emision)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {comprobante.total ? formatCurrency(comprobante.total) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getEstadoBadge(comprobante.estado_receptor)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {comprobante.estado_receptor === 'pendiente' && (
                          <>
                            <button
                              onClick={() => handleAceptar(comprobante)}
                              className="text-green-600 hover:text-green-900"
                              title="Aceptar"
                            >
                              <i className="ri-check-line"></i>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedComprobante(comprobante);
                                setShowModal(true);
                              }}
                              className="text-red-600 hover:text-red-900"
                              title="Rechazar"
                            >
                              <i className="ri-close-line"></i>
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => window.open(`/facturacion/comprobante/${comprobante.id}/print`, '_blank')}
                          className="text-gray-600 hover:text-gray-900"
                          title="Ver/Imprimir"
                        >
                          <i className="ri-eye-line"></i>
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

      {/* Modal de Rechazo */}
      {showModal && selectedComprobante && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Rechazar Comprobante
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Clave: {selectedComprobante.clave}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Emisor: {selectedComprobante.emisor_nombre}
              </p>
              
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Razón del rechazo:
              </label>
              <textarea
                id="razon-rechazo"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Ingrese la razón del rechazo..."
              />
            </div>

            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const razon = (document.getElementById('razon-rechazo') as HTMLTextAreaElement).value;
                  if (razon.trim()) {
                    handleRechazar(selectedComprobante, razon);
                  } else {
                    showAlert('Debe ingresar una razón para el rechazo');
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
              >
                Rechazar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}