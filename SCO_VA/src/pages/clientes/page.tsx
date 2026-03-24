import { useState, useEffect, useCallback } from 'react';
import { ClientesLayout } from './components/ClientesLayout';
import { ClientesTable } from './components/ClientesTable';
import { ClienteForm } from './components/ClienteForm';
import { ClientesFilters } from './components/ClientesFilters';
import { ImportarClientes } from './components/ImportarClientes';
import { BuscarClienteModal } from './components/BuscarClienteModal';
import { Cliente, ClienteFilters } from '../../types/cliente';
import { ClienteService } from '../../services/clienteService';
import { PermissionButton } from '../../components/base/PermissionButton';
import { useAuth } from '../../hooks/useAuth';
import NotificationPopup from '../../components/base/NotificationPopup';
import ConfirmationDialog from '../../components/base/ConfirmationDialog';

export default function ClientesPage() {
  const { currentStore } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showBuscar, setShowBuscar] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [filters, setFilters] = useState<ClienteFilters>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Notification state
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    message: ''
  });

  // Confirmation dialog state
  const [confirmation, setConfirmation] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const showNotification = (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    setNotification({ isOpen: true, type, message });
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, isOpen: false }));
  };

  const cargarClientes = useCallback(async () => {
    if (!currentStore) {
      setClientes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await ClienteService.obtenerClientes(filters);
      setClientes(data);
    } catch (error) {
      console.error('Error cargando clientes:', error);
      setClientes([]);
    } finally {
      setLoading(false);
    }
  }, [filters, currentStore]);

  useEffect(() => {
    cargarClientes();
  }, [cargarClientes, refreshTrigger]);

  const handleCrearCliente = () => {
    setEditingCliente(null);
    setShowForm(true);
  };

  const handleEditarCliente = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setShowForm(true);
  };

  const handleEliminarCliente = async (id: number) => {
    setConfirmation({
      isOpen: true,
      title: 'Eliminar Cliente',
      message: '¿Está seguro de que desea eliminar este cliente?',
      onConfirm: async () => {
        try {
          await ClienteService.eliminarCliente(id);
          setRefreshTrigger(prev => prev + 1);
          showNotification('success', 'Cliente eliminado exitosamente');
        } catch (error) {
          console.error('Error eliminando cliente:', error);
          showNotification('error', 'Error al eliminar el cliente');
        }
      }
    });
  };

  const handleFormSubmit = async (clienteData: any) => {
    try {
      if (editingCliente) {
        await ClienteService.actualizarCliente(editingCliente.id!, clienteData);
        showNotification('success', 'Cliente actualizado exitosamente');
      } else {
        await ClienteService.crearCliente(clienteData);
        showNotification('success', 'Cliente creado exitosamente');
      }
      setShowForm(false);
      setEditingCliente(null);
      setRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      console.error('Error guardando cliente:', error);
      showNotification('error', error.message || 'Error al guardar el cliente');
    }
  };

  const handleImportSuccess = () => {
    setShowImport(false);
    setRefreshTrigger(prev => prev + 1);
  };

  // Mostrar mensaje si no hay tienda seleccionada
  if (!currentStore) {
    return (
      <ClientesLayout>
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <div className="text-gray-500">
            <i className="ri-store-line text-4xl mb-4"></i>
            <p>No hay tienda seleccionada. Por favor, seleccione una tienda para continuar.</p>
          </div>
        </div>
      </ClientesLayout>
    );
  }

  return (
    <ClientesLayout>
      {/* Notification Popup */}
      <NotificationPopup
        isOpen={notification.isOpen}
        type={notification.type}
        message={notification.message}
        onClose={hideNotification}
      />

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmation.isOpen}
        type="danger"
        title={confirmation.title}
        message={confirmation.message}
        onConfirm={() => {
          confirmation.onConfirm();
          setConfirmation(prev => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmation(prev => ({ ...prev, isOpen: false }))}
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Clientes</h1>
            <p className="text-gray-600 mt-1">
              Administra tu cartera de clientes con validación de Hacienda
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <PermissionButton
              permission="clientes:view"
              variant="primary"
              onClick={() => setShowBuscar(true)}
            >
              <i className="ri-search-line mr-2"></i>
              Buscar Cliente
            </PermissionButton>
            
            <PermissionButton
              permission="clientes:create"
              variant="success"
              onClick={() => setShowImport(true)}
            >
              <i className="ri-file-excel-line mr-2"></i>
              Importar
            </PermissionButton>
            
            <PermissionButton
              permission="clientes:create"
              variant="primary"
              onClick={handleCrearCliente}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <i className="ri-add-line mr-2"></i>
              Nuevo Cliente
            </PermissionButton>
          </div>
        </div>

        {/* Filtros */}
        <ClientesFilters filters={filters} onFiltersChange={setFilters} />

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <i className="ri-user-line text-blue-600 text-xl"></i>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Clientes</p>
                <p className="text-2xl font-bold text-gray-900">{clientes.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <i className="ri-shield-check-line text-green-600 text-xl"></i>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Validados</p>
                <p className="text-2xl font-bold text-gray-900">
                  {clientes.filter(c => c.hacienda_estado_validacion === 'valido').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <i className="ri-time-line text-yellow-600 text-xl"></i>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Pendientes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {clientes.filter(c => c.hacienda_estado_validacion === 'pendiente').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <i className="ri-building-line text-purple-600 text-xl"></i>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Jurídicos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {clientes.filter(c => c.tipo_persona === 'juridica').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de clientes */}
        <ClientesTable
          clientes={clientes}
          loading={loading}
          onEdit={handleEditarCliente}
          onDelete={handleEliminarCliente}
        />
      </div>

      {/* Modales */}
      {showForm && (
        <ClienteForm
          cliente={editingCliente}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingCliente(null);
          }}
        />
      )}

      {showImport && (
        <ImportarClientes onSuccess={handleImportSuccess} onCancel={() => setShowImport(false)} />
      )}

      {showBuscar && (
        <BuscarClienteModal
          onSelect={cliente => {
            setShowBuscar(false);
            handleEditarCliente(cliente);
          }}
          onCancel={() => setShowBuscar(false)}
        />
      )}
    </ClientesLayout>
  );
}
