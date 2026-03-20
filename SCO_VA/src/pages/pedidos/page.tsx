import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { pedidoService } from '../../services/pedidoService';
import { ESTADOS_PEDIDO, type Pedido } from '../../types/pedido';
import { showAlert, showConfirm } from '../../utils/dialog';
import PedidosLayout from './components/PedidosLayout';
import PedidosTable from './components/PedidosTable';
import PedidosFilters from './components/PedidosFilters';
import PedidoForm from './components/PedidoForm';
import ModalFacturarPedido from '../../components/facturacion/ModalFacturarPedido';
import AdvancedPermissionWrapper from '../../components/base/AdvancedPermissionWrapper';
import AdvancedPermissionButton from '../../components/base/AdvancedPermissionButton';
import { useAdvancedPermissions } from '../../hooks/useAdvancedPermissions';
import { RobustPermissionWrapper, PermissionButtonWrapper } from '../../components/security/RobustPermissionWrapper';
import { useRobustPermissions } from '../../hooks/useRobustPermissions';
import Sidebar from '../../components/feature/Sidebar';
import TopBar from '../../components/feature/TopBar';

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPedido, setEditingPedido] = useState<Pedido | null>(null);
  const [showFacturarModal, setShowFacturarModal] = useState(false);
  const [pedidoToFacturar, setPedidoToFacturar] = useState<Pedido | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filters, setFilters] = useState({
    estado: '',
    cliente_id: null as number | null,
    fecha_desde: '',
    fecha_hasta: ''
  });

  const { permissions } = useAdvancedPermissions();
  const { canView, canCreate } = useRobustPermissions();

  useEffect(() => {
    loadPedidos();
  }, [filters]);

  const loadPedidos = async () => {
    setLoading(true);
    try {
      const data = await pedidoService.getPedidos(filters);
      setPedidos(data);
    } catch (error) {
      console.error('Error cargando pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePedido = () => {
    setEditingPedido(null);
    setShowForm(true);
  };

  const handleEditPedido = (pedido: Pedido) => {
    setEditingPedido(pedido);
    setShowForm(true);
  };

  const handleSavePedido = async () => {
    setShowForm(false);
    setEditingPedido(null);
    await loadPedidos();
  };

  const handleConfirmarPedido = async (id: number) => {
    const ok = await showConfirm('¿Está seguro de confirmar este pedido? Esto creará reservas de inventario.');
    if (!ok) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showAlert('Error: Usuario no autenticado', { type: 'error' });
        return;
      }

      await pedidoService.confirmarPedido(id, user.id);
      showAlert('Pedido confirmado exitosamente');
      await loadPedidos();
    } catch (error) {
      console.error('Error confirmando pedido:', error);
      showAlert('Error al confirmar pedido: ' + (error instanceof Error ? error.message : 'Error desconocido'), { type: 'error' });
    }
  };

  const handleCancelarPedido = async (id: number) => {
    const ok = await showConfirm('¿Está seguro de cancelar este pedido? Esto liberará las reservas de inventario.');
    if (!ok) return;

    try {
      await pedidoService.cancelarPedido(id);
      showAlert('Pedido cancelado exitosamente');
      await loadPedidos();
    } catch (error) {
      console.error('Error cancelando pedido:', error);
      showAlert('Error al cancelar pedido: ' + (error instanceof Error ? error.message : 'Error desconocido'), { type: 'error' });
    }
  };

  const handleFacturarPedido = (pedido: Pedido) => {
    if (pedido.estado !== 'confirmado') {
      showAlert('Solo se pueden facturar pedidos confirmados', { type: 'warning' });
      return;
    }

    setPedidoToFacturar(pedido);
    setShowFacturarModal(true);
  };

  const handleFacturacionExitosa = async () => {
    setShowFacturarModal(false);
    setPedidoToFacturar(null);
    await loadPedidos();
  };

  if (showForm) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
          
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <PedidoForm
                pedido={editingPedido}
                onSave={handleSavePedido}
                onCancel={() => {
                  setShowForm(false);
                  setEditingPedido(null);
                }}
              />
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-screen bg-gray-50">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
          
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h1 className="text-2xl font-bold text-gray-900">Gestión de Pedidos</h1>
                  <button
                    onClick={handleCreatePedido}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    <i className="ri-add-line mr-2"></i>
                    Nuevo Pedido
                  </button>
                </div>

                <PedidosFilters
                  filters={filters}
                  onFiltersChange={setFilters}
                />

                <PedidosTable
                  pedidos={pedidos}
                  loading={loading}
                  onEdit={handleEditPedido}
                  onConfirmar={handleConfirmarPedido}
                  onCancelar={handleCancelarPedido}
                  onFacturar={handleFacturarPedido}
                />
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Modal de Facturación */}
      {showFacturarModal && pedidoToFacturar && (
        <ModalFacturarPedido
          pedido={pedidoToFacturar}
          isOpen={showFacturarModal}
          onClose={() => {
            setShowFacturarModal(false);
            setPedidoToFacturar(null);
          }}
          onSuccess={handleFacturacionExitosa}
        />
      )}
    </>
  );
}
