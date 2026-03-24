import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmisionFacturaForm } from './components/EmisionFacturaForm';
import Sidebar from '../../components/feature/Sidebar';
import TopBar from '../../components/feature/TopBar';
import { supabase } from '../../lib/supabase';
import { showAlert, showConfirm } from '../../utils/dialog';

export default function EmisionFacturaPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleEmitir = async (data: any) => {
    setLoading(true);
    try {
      console.log('📤 Emitiendo factura a Hacienda:', data);

      // Llamar a la Edge Function real para facturar
      const { data: result, error } = await supabase.functions.invoke('facturar-pedido', {
        body: {
          pedido_id: data.pedido_id,
          tipo_documento: data.tipo_documento || '01', // 01 = Factura Electrónica
          condicion_venta: data.condicion_venta || '01', // 01 = Contado
          medio_pago: data.medio_pago || '01', // 01 = Efectivo
          plazo_credito: data.plazo_credito || 0,
          items: data.items,
          notas: data.notas
        }
      });

      if (error) {
        console.error('❌ Error en Edge Function:', error);
        throw new Error(error.message || 'Error al emitir factura');
      }

      console.log('✅ Factura emitida exitosamente:', result);

      showAlert(`Factura emitida exitosamente\n\nClave: ${result.clave}\nConsecutivo: ${result.consecutivo}\nEstado: ${result.estado}\n\nLa factura ha sido enviada a Hacienda y está siendo procesada.`);
      
      navigate('/facturacion');
    } catch (error: any) {
      console.error('❌ Error en emisión:', error);
      showAlert(`Error al emitir factura:\n\n${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGuardarBorrador = async (data: any) => {
    setLoading(true);
    try {
      console.log('💾 Guardando borrador de factura:', data);

      // Guardar en la tabla facturas_electronicas con estado 'borrador'
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: tiendaActual } = await supabase
        .from('usuario_tienda_actual')
        .select('tienda_id')
        .eq('usuario_id', user.id)
        .single();

      if (!tiendaActual) throw new Error('No hay tienda asignada');

      // Calcular totales
      const subtotal = data.items.reduce((sum: number, item: any) => sum + (item.cantidad * item.precio_unitario), 0);
      const descuento = data.items.reduce((sum: number, item: any) => sum + (item.cantidad * item.precio_unitario * (item.descuento_porcentaje || 0) / 100), 0);
      const impuesto = data.items.reduce((sum: number, item: any) => {
        const subtotalItem = item.cantidad * item.precio_unitario;
        const descuentoItem = subtotalItem * (item.descuento_porcentaje || 0) / 100;
        return sum + ((subtotalItem - descuentoItem) * (item.impuesto_porcentaje || 13) / 100);
      }, 0);
      const total = subtotal - descuento + impuesto;

      // Insertar factura en estado borrador
      const { data: factura, error: facturaError } = await supabase
        .from('facturas_electronicas')
        .insert({
          pedido_id: data.pedido_id,
          tipo_documento: data.tipo_documento || '01',
          consecutivo: `BORRADOR-${Date.now()}`,
          clave: '',
          fecha_emision: new Date().toISOString(),
          condicion_venta: data.condicion_venta || '01',
          medio_pago: data.medio_pago || '01',
          plazo_credito: data.plazo_credito || 0,
          moneda: data.moneda || 'CRC',
          tipo_cambio: data.tipo_cambio || 1,
          subtotal,
          descuento,
          impuesto,
          total,
          estado: 'borrador',
          notas: data.notas,
          tienda_id: tiendaActual.tienda_id,
          created_by: user.id
        })
        .select()
        .single();

      if (facturaError) throw facturaError;

      // Insertar items de la factura
      if (data.items && data.items.length > 0) {
        const items = data.items.map((item: any) => ({
          factura_id: factura.id,
          item_type: item.item_type || 'producto',
          item_id: item.item_id,
          descripcion: item.descripcion,
          unidad: item.unidad || 'UND',
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          descuento_porcentaje: item.descuento_porcentaje || 0,
          impuesto_porcentaje: item.impuesto_porcentaje || 13,
          total: item.total
        }));

        const { error: itemsError } = await supabase
          .from('factura_items')
          .insert(items);

        if (itemsError) throw itemsError;
      }

      console.log('✅ Borrador guardado:', factura);
      showAlert('Borrador guardado exitosamente');
      navigate('/facturacion');
    } catch (error: any) {
      console.error('❌ Error guardando borrador:', error);
      showAlert(`Error al guardar borrador:\n\n${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = async () => {
    if (await showConfirm('¿Está seguro que desea cancelar? Se perderán los datos ingresados.', { type: 'warning', title: 'Cancelar emisión' })) {
      navigate('/facturacion');
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Emisión de Factura</h1>
                  <p className="text-gray-600 mt-1">
                    Cree una nueva factura electrónica desde cero o basada en un pedido/cotización
                  </p>
                </div>
                <button
                  onClick={handleCancelar}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-close-line mr-2"></i>
                  Cancelar
                </button>
              </div>
            </div>

            <EmisionFacturaForm
              loading={loading}
              onEmitir={handleEmitir}
              onGuardarBorrador={handleGuardarBorrador}
              onCancelar={handleCancelar}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
