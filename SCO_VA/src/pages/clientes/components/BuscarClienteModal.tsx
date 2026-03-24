
import { useState, useEffect } from 'react';
import { Cliente } from '../../../types/cliente';
import { ClienteService } from '../../../services/clienteService';

interface BuscarClienteModalProps {
  onSelect: (cliente: Cliente) => void;
  onCancel: () => void;
}

export function BuscarClienteModal({ onSelect, onCancel }: BuscarClienteModalProps) {
  const [termino, setTermino] = useState('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const buscarClientes = async (busqueda: string) => {
    if (busqueda.length < 2) {
      setClientes([]);
      return;
    }

    try {
      setLoading(true);
      const resultados = await ClienteService.buscarClientes(busqueda);
      setClientes(resultados);
    } catch (error) {
      console.error('Error buscando clientes:', error);
      setClientes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (valor: string) => {
    setTermino(valor);
    
    // Limpiar timer anterior
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    // Configurar nuevo timer
    const timer = setTimeout(() => {
      buscarClientes(valor);
    }, 300);
    
    setDebounceTimer(timer);
  };

  const getTipoPersonaTexto = (tipo: string) => {
    switch (tipo) {
      case 'fisica':
        return 'Física';
      case 'juridica':
        return 'Jurídica';
      case 'extranjero':
        return 'Extranjero';
      default:
        return tipo;
    }
  };

  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Buscar Cliente
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <i className="ri-close-line text-2xl"></i>
          </button>
        </div>

        {/* Búsqueda */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
            <input
              type="text"
              placeholder="Buscar por nombre, identificación o correo..."
              value={termino}
              onChange={(e) => handleInputChange(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              autoFocus
            />
          </div>
          
          {termino.length > 0 && termino.length < 2 && (
            <p className="text-sm text-gray-500 mt-2">
              Ingrese al menos 2 caracteres para buscar
            </p>
          )}
        </div>

        {/* Resultados */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
              <span className="ml-3 text-gray-600">Buscando...</span>
            </div>
          )}

          {!loading && termino.length >= 2 && clientes.length === 0 && (
            <div className="text-center p-8">
              <i className="ri-search-line text-4xl text-gray-400 mb-4"></i>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No se encontraron clientes
              </h3>
              <p className="text-gray-600">
                No hay clientes que coincidan con "<strong>{termino}</strong>"
              </p>
            </div>
          )}

          {!loading && clientes.length > 0 && (
            <div className="divide-y divide-gray-200">
              {clientes.map((cliente) => (
                <button
                  key={cliente.id}
                  onClick={() => onSelect(cliente)}
                  className="w-full p-4 text-left hover:bg-gray-50 transition-colors focus:bg-gray-50 focus:outline-none"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {cliente.nombre_razon_social}
                        </h3>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {getTipoPersonaTexto(cliente.tipo_persona)}
                        </span>
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center">
                          <i className="ri-id-card-line w-4 h-4 mr-2"></i>
                          <span>{cliente.identificacion}</span>
                        </div>
                        
                        <div className="flex items-center">
                          <i className="ri-mail-line w-4 h-4 mr-2"></i>
                          <span className="truncate">{cliente.correo_principal}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-4">
                      <i className="ri-arrow-right-line text-gray-400"></i>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {termino.length === 0 && (
            <div className="text-center p-8">
              <i className="ri-search-2-line text-4xl text-gray-400 mb-4"></i>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Buscar Cliente
              </h3>
              <p className="text-gray-600">
                Ingrese el nombre, identificación o correo del cliente que desea encontrar
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
