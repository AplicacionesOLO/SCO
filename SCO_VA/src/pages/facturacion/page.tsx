import { useState, useEffect } from 'react';
import { FacturacionLayout } from './components/FacturacionLayout';
import { FacturacionTable } from './components/FacturacionTable';
import { FacturacionFilters } from './components/FacturacionFilters';
import { FacturacionForm } from './components/FacturacionForm';
import { ConfiguracionHacienda } from './components/ConfiguracionHacienda';
import { ComprobantesRecibidos } from './components/ComprobantesRecibidos';
import type { FacturaElectronica } from '../../types/facturacion';
import Sidebar from '../../components/feature/Sidebar';
import TopBar from '../../components/feature/TopBar';
import { supabase } from '../../lib/supabase';
import { showAlert } from '../../utils/dialog';

export default function FacturacionPage() {
  const [activeTab, setActiveTab] = useState('facturas');
  const [facturas, setFacturas] = useState<FacturaElectronica[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingFactura, setEditingFactura] = useState<FacturaElectronica | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filters, setFilters] = useState({
    fecha_desde: '',
    fecha_hasta: '',
    estado_local: '',
    cliente_id: null
  });

  useEffect(() => {
    loadFacturas();
  }, [filters]);

  const loadFacturas = async () => {
    setLoading(true);
    try {
      console.log('🔍 [FACTURACIÓN] Cargando facturas desde la base de datos...');
      console.log('🔍 [FACTURACIÓN] Filtros aplicados:', filters);

      // Construir query con filtros
      let query = supabase
        .from('facturas_electronicas')
        .select(`
          id,
          numero_consecutivo,
          clave_numerica,
          tipo_documento,
          fecha_emision,
          cliente_id,
          estado,
          subtotal,
          descuento_total,
          impuesto_total,
          total_general,
          moneda,
          tipo_cambio,
          condicion_venta,
          medio_pago,
          notas,
          created_at,
          clientes!inner(
            id,
            nombre_razon_social,
            identificacion
          )
        `)
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (filters.fecha_desde) {
        query = query.gte('fecha_emision', filters.fecha_desde);
        console.log('🔍 [FACTURACIÓN] Filtro fecha_desde:', filters.fecha_desde);
      }
      if (filters.fecha_hasta) {
        query = query.lte('fecha_emision', filters.fecha_hasta);
        console.log('🔍 [FACTURACIÓN] Filtro fecha_hasta:', filters.fecha_hasta);
      }
      if (filters.estado_local) {
        query = query.eq('estado', filters.estado_local);
        console.log('🔍 [FACTURACIÓN] Filtro estado:', filters.estado_local);
      }
      if (filters.cliente_id) {
        query = query.eq('cliente_id', filters.cliente_id);
        console.log('🔍 [FACTURACIÓN] Filtro cliente_id:', filters.cliente_id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ [FACTURACIÓN] Error cargando facturas:', error);
        throw error;
      }

      console.log('✅ [FACTURACIÓN] Facturas obtenidas:', data?.length || 0);

      // Mapear datos de la base de datos al formato esperado
      const facturasFormateadas: FacturaElectronica[] = (data || []).map((factura: any) => ({
        id: factura.id,
        consecutivo: factura.numero_consecutivo,
        clave: factura.clave_numerica,
        tipo_documento: factura.tipo_documento || '01',
        fecha_emision: factura.fecha_emision,
        cliente_id: factura.cliente_id,
        cliente: {
          razon_social: factura.clientes?.nombre_razon_social,
          identificacion: factura.clientes?.identificacion
        },
        estado_local: factura.estado || 'borrador',
        estado_hacienda: undefined, // Por ahora no tenemos este campo
        subtotal: Number(factura.subtotal) || 0,
        descuento_total: Number(factura.descuento_total) || 0,
        impuesto_total: Number(factura.impuesto_total) || 0,
        total: Number(factura.total_general) || 0,
        moneda: factura.moneda || 'CRC',
        tipo_cambio: Number(factura.tipo_cambio) || 1,
        condicion_venta: factura.condicion_venta || '01',
        medio_pago: factura.medio_pago || '01',
        plazo_credito: 0,
        observaciones: factura.notas,
        created_at: factura.created_at
      }));

      console.log('✅ [FACTURACIÓN] Facturas formateadas:', facturasFormateadas.length);
      setFacturas(facturasFormateadas);
    } catch (error) {
      console.error('❌ [FACTURACIÓN] Error cargando facturas:', error);
      setFacturas([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFactura = () => {
    setEditingFactura(null);
    setShowForm(true);
  };

  const handleEditFactura = (factura: FacturaElectronica) => {
    setEditingFactura(factura);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingFactura(null);
    loadFacturas();
  };

  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters);
  };

  const handleFirmarFactura = async (factura: FacturaElectronica) => {
    try {
      showAlert('Funcionalidad de firma requiere configuración de Hacienda');
    } catch (error) {
      console.error('Error firmando factura:', error);
      showAlert('Error firmando factura');
    }
  };

  const handleEnviarFactura = async (factura: FacturaElectronica) => {
    try {
      showAlert('Funcionalidad de envío requiere configuración de Hacienda');
    } catch (error) {
      console.error('Error enviando factura:', error);
      showAlert('Error enviando factura a Hacienda');
    }
  };

  const handleConsultarEstado = async (factura: FacturaElectronica) => {
    try {
      showAlert('Funcionalidad de consulta requiere configuración de Hacienda');
    } catch (error) {
      console.error('Error consultando estado:', error);
      showAlert('Error consultando estado en Hacienda');
    }
  };

  const tabs = [
    { id: 'facturas', label: 'Facturas Electrónicas', icon: 'ri-file-text-line' },
    { id: 'recibidos', label: 'Comprobantes Recibidos', icon: 'ri-inbox-line' },
    { id: 'configuracion', label: 'Configuración Hacienda', icon: 'ri-settings-3-line' }
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="space-y-6">
              {/* Tabs */}
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap cursor-pointer ${
                        activeTab === tab.id
                          ? 'border-orange-500 text-orange-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <i className={`${tab.icon} mr-2`}></i>
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Content */}
              {activeTab === 'facturas' && (
                <div className="space-y-6">
                  {!showForm ? (
                    <>
                      <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold text-gray-900">Facturación Electrónica</h1>
                        <button
                          onClick={handleCreateFactura}
                          className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors whitespace-nowrap cursor-pointer"
                        >
                          <i className="ri-add-line mr-2"></i>
                          Nueva Factura
                        </button>
                      </div>

                      <FacturacionFilters
                        filters={filters}
                        onFiltersChange={handleFiltersChange}
                      />

                      <FacturacionTable
                        facturas={facturas}
                        loading={loading}
                        onEdit={handleEditFactura}
                        onFirmar={handleFirmarFactura}
                        onEnviar={handleEnviarFactura}
                        onConsultarEstado={handleConsultarEstado}
                      />
                    </>
                  ) : (
                    <FacturacionForm
                      factura={editingFactura}
                      onClose={handleCloseForm}
                    />
                  )}
                </div>
              )}

              {activeTab === 'recibidos' && (
                <ComprobantesRecibidos />
              )}

              {activeTab === 'configuracion' && (
                <ConfiguracionHacienda />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}