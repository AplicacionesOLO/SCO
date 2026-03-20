import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import MantenimientoLayout from './components/MantenimientoLayout';
import ThresholdsTable from './components/ThresholdsTable';
import AlertasTable from './components/AlertasTable';
import ReplenishmentTable from './components/ReplenishmentTable';
import ConfiguracionInventario from './components/ConfiguracionInventario';
import DashboardKPIs from './components/DashboardKPIs';
import PrediccionDemanda from './components/PrediccionDemanda';
import MovimientosInventario from './components/MovimientosInventario';
import NotificacionesRealTime from './components/NotificacionesRealTime';

export default function MantenimientoPage() {
  const [vistaActual, setVistaActual] = useState('umbrales');
  const [loading, setLoading] = useState(true);
  const [thresholds, setThresholds] = useState<any[]>([]);
  const [alertas, setAlertas] = useState<any[]>([]);
  const [replenishments, setReplenishments] = useState<any[]>([]);

  const loadThresholds = useCallback(async () => {
    const { data, error } = await supabase
      .from('inventario_thresholds')
      .select(`
        *,
        inventario!inner(codigo_articulo, descripcion_articulo)
      `)
      .eq('activo', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error cargando umbrales:', error);
      return;
    }
    setThresholds(data || []);
  }, []);

  const loadAlertas = useCallback(async () => {
    const { data, error } = await supabase
      .from('inventario_alertas')
      .select(`
        *,
        inventario!inner(codigo_articulo, descripcion_articulo)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error cargando alertas:', error);
      return;
    }
    setAlertas(data || []);
  }, []);

  const loadReplenishments = useCallback(async () => {
    const { data, error } = await supabase
      .from('replenishment_orders')
      .select(`
        *,
        inventario!inner(codigo_articulo, descripcion_articulo)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error cargando órdenes:', error);
      return;
    }
    setReplenishments(data || []);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([loadThresholds(), loadAlertas(), loadReplenishments()]);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  }, [loadThresholds, loadAlertas, loadReplenishments]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Escuchar evento de nuevas órdenes generadas desde ThresholdsTable
  useEffect(() => {
    const handleReplenishmentUpdated = () => {
      loadReplenishments();
    };
    window.addEventListener('replenishment-updated', handleReplenishmentUpdated);
    return () => window.removeEventListener('replenishment-updated', handleReplenishmentUpdated);
  }, [loadReplenishments]);

  // Al cambiar de pestaña, recargar los datos correspondientes
  const handleCambiarVista = useCallback((vista: string) => {
    setVistaActual(vista);
    if (vista === 'reabastecimiento') loadReplenishments();
    if (vista === 'alertas') loadAlertas();
    if (vista === 'umbrales') loadThresholds();
    // movimientos carga sus propios datos internamente
  }, [loadReplenishments, loadAlertas, loadThresholds]);

  const renderContent = () => {
    if (loading && ['umbrales', 'alertas', 'reabastecimiento'].includes(vistaActual)) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    switch (vistaActual) {
      case 'umbrales':
        return (
          <ThresholdsTable
            thresholds={thresholds}
            onRefresh={loadThresholds}
          />
        );
      case 'alertas':
        return (
          <AlertasTable
            alertas={alertas}
            onRefresh={loadAlertas}
          />
        );
      case 'reabastecimiento':
        return (
          <ReplenishmentTable
            orders={replenishments}
            onRefresh={loadReplenishments}
          />
        );
      case 'kpis':
        return <DashboardKPIs key="kpis" />;
      case 'prediccion':
        return <PrediccionDemanda key="prediccion" />;
      case 'configuracion':
        return <ConfiguracionInventario key="configuracion" />;
      case 'movimientos':
        return <MovimientosInventario key="movimientos" />;
      default:
        return (
          <ThresholdsTable
            thresholds={thresholds}
            onRefresh={loadThresholds}
          />
        );
    }
  };

  return (
    <MantenimientoLayout
      vistaActual={vistaActual}
      onCambiarVista={handleCambiarVista}
    >
      {/* Notificaciones en tiempo real */}
      <div className="fixed top-4 right-4 z-50">
        <NotificacionesRealTime />
      </div>

      {renderContent()}
    </MantenimientoLayout>
  );
}
