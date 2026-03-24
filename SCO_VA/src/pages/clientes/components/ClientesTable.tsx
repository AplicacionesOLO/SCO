import { Cliente } from '../../../types/cliente';
import { formatCurrency } from '../../../lib/currency';
import { PermissionButton } from '../../../components/base/PermissionButton';
import { useNotification } from '../../../hooks/useNotification';
import NotificationPopup from '../../../components/base/NotificationPopup';
import ConfirmationDialog from '../../../components/base/ConfirmationDialog';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../lib/supabase';

interface ClientesTableProps {
  clientes: Cliente[];
  loading: boolean;
  onEdit: (cliente: Cliente) => void;
  onDelete: (id: number) => void;
}

export function ClientesTable({ clientes, loading, onEdit, onDelete }: ClientesTableProps) {
  const { currentStore } = useAuth();
  const {
    notification,
    showNotification,
    showSuccess,
    showError,
    showWarning,
    hideNotification,
    confirmation,
    showConfirmation,
    hideConfirmation,
  } = useNotification();

  const getEstadoHaciendaColor = (estado: string) => {
    switch (estado) {
      case 'valido':      return 'bg-green-100 text-green-800';
      case 'pendiente':   return 'bg-yellow-100 text-yellow-800';
      case 'no_valido':   return 'bg-red-100 text-red-800';
      case 'error':       return 'bg-gray-100 text-gray-800';
      default:            return 'bg-gray-100 text-gray-800';
    }
  };

  const getEstadoHaciendaTexto = (estado: string) => {
    switch (estado) {
      case 'valido':    return 'Válido';
      case 'pendiente': return 'Pendiente';
      case 'no_valido': return 'No Válido';
      case 'error':     return 'Error';
      default:          return 'Desconocido';
    }
  };

  const getTipoPersonaTexto = (tipo: string) => {
    switch (tipo) {
      case 'fisica':     return 'Física';
      case 'juridica':   return 'Jurídica';
      case 'extranjero': return 'Extranjero';
      default:           return tipo;
    }
  };

  const handleDeleteCliente = (cliente: Cliente) => {
    showConfirmation(
      'danger',
      '¿Eliminar cliente?',
      '¿Está seguro que desea eliminar este cliente? Esta acción no se puede deshacer.',
      async () => {
        try {
          const { data: cotizacionCheck } = await supabase
            .from('cotizaciones')
            .select('id_cotizacion')
            .eq('id_cliente', cliente.id!)
            .limit(1);

          if (cotizacionCheck && cotizacionCheck.length > 0) {
            showNotification('warning', 'No se puede eliminar', 'Este cliente tiene cotizaciones asociadas. Para eliminarlo, primero debe eliminar todas sus cotizaciones.');
            return;
          }

          const { data: pedidoCheck } = await supabase
            .from('pedidos')
            .select('id_pedido')
            .eq('id_cliente', cliente.id!)
            .limit(1);

          if (pedidoCheck && pedidoCheck.length > 0) {
            showNotification('warning', 'No se puede eliminar', 'Este cliente tiene pedidos asociados. Para eliminarlo, primero debe eliminar todos sus pedidos.');
            return;
          }

          const { error } = await supabase
            .from('clientes')
            .delete()
            .eq('id_cliente', cliente.id!);

          if (error) throw error;

          onDelete(cliente.id!);
          showNotification('success', 'Cliente eliminado', 'Cliente eliminado exitosamente.');
        } catch (error: any) {
          console.error('Error eliminando cliente:', error);
          showNotification('error', 'Error al eliminar', `No se pudo eliminar el cliente: ${error.message || 'Error desconocido'}. Por favor, inténtelo nuevamente.`);
        }
      }
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <span className="ml-3 text-gray-600">Cargando clientes...</span>
        </div>
      </div>
    );
  }

  if (clientes.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <i className="ri-user-line text-4xl text-gray-400 mb-4"></i>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay clientes</h3>
        <p className="text-gray-600 mb-4">
          No se encontraron clientes que coincidan con los filtros aplicados.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Vista móvil */}
        <div className="lg:hidden">
          <div className="divide-y divide-gray-200">
            {clientes.map((cliente) => (
              <div key={cliente.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {cliente.nombre_razon_social}
                      </h3>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getEstadoHaciendaColor(cliente.hacienda_estado_validacion)}`}>
                        {getEstadoHaciendaTexto(cliente.hacienda_estado_validacion)}
                      </span>
                    </div>

                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center">
                        <i className="ri-id-card-line w-4 h-4 mr-2"></i>
                        <span>{cliente.identificacion}</span>
                        <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
                          {getTipoPersonaTexto(cliente.tipo_persona)}
                        </span>
                      </div>

                      <div className="flex items-center">
                        <i className="ri-mail-line w-4 h-4 mr-2"></i>
                        <span className="truncate">{cliente.correo_principal}</span>
                      </div>

                      {cliente.telefono_numero && (
                        <div className="flex items-center">
                          <i className="ri-phone-line w-4 h-4 mr-2"></i>
                          <span>+{cliente.telefono_pais} {cliente.telefono_numero}</span>
                        </div>
                      )}

                      {cliente.limite_credito > 0 && (
                        <div className="flex items-center">
                          <i className="ri-money-dollar-circle-line w-4 h-4 mr-2"></i>
                          <span>Límite: {formatCurrency(cliente.limite_credito)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 ml-4">
                    <PermissionButton
                      permission="clientes:edit"
                      variant="icon"
                      onClick={() => onEdit(cliente)}
                      title="Editar cliente"
                      className="text-blue-600 hover:bg-blue-50"
                    >
                      <i className="ri-edit-line w-4 h-4"></i>
                    </PermissionButton>

                    <PermissionButton
                      permission="clientes:delete"
                      variant="icon"
                      onClick={() => handleDeleteCliente(cliente)}
                      title="Eliminar cliente"
                      className="text-red-600 hover:bg-red-50"
                    >
                      <i className="ri-delete-bin-line w-4 h-4"></i>
                    </PermissionButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Vista desktop */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Identificación
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contacto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado Hacienda
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Límite Crédito
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clientes.map((cliente) => (
                <tr key={cliente.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {cliente.nombre_razon_social}
                      </div>
                      {cliente.nombre_comercial && (
                        <div className="text-sm text-gray-500">
                          {cliente.nombre_comercial}
                        </div>
                      )}
                      <div className="text-xs text-gray-400">
                        {getTipoPersonaTexto(cliente.tipo_persona)}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{cliente.identificacion}</div>
                    <div className="text-xs text-gray-500 capitalize">
                      {cliente.tipo_identificacion.replace('_', ' ')}
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{cliente.correo_principal}</div>
                    {cliente.telefono_numero && (
                      <div className="text-sm text-gray-500">
                        +{cliente.telefono_pais} {cliente.telefono_numero}
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEstadoHaciendaColor(cliente.hacienda_estado_validacion)}`}>
                      {getEstadoHaciendaTexto(cliente.hacienda_estado_validacion)}
                    </span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {cliente.limite_credito > 0 ? formatCurrency(cliente.limite_credito) : '-'}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <PermissionButton
                        permission="clientes:edit"
                        variant="icon"
                        onClick={() => onEdit(cliente)}
                        title="Editar cliente"
                        className="text-blue-600 hover:bg-blue-50"
                      >
                        <i className="ri-edit-line w-4 h-4"></i>
                      </PermissionButton>

                      <PermissionButton
                        permission="clientes:delete"
                        variant="icon"
                        onClick={() => handleDeleteCliente(cliente)}
                        title="Eliminar cliente"
                        className="text-red-600 hover:bg-red-50"
                      >
                        <i className="ri-delete-bin-line w-4 h-4"></i>
                      </PermissionButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <NotificationPopup
          isOpen={notification.isOpen}
          onClose={hideNotification}
          title={notification.title}
          message={notification.message}
          type={notification.type}
        />
      </div>

      <ConfirmationDialog
        isOpen={confirmation.isOpen}
        type={confirmation.type}
        title={confirmation.title}
        message={confirmation.message}
        onConfirm={confirmation.onConfirm}
        onCancel={confirmation.onCancel}
      />
    </>
  );
}
