import { useState, useEffect, useRef } from 'react';
import { CotizacionFilters } from '../../../types/cotizacion';
import { Cliente } from '../../../types/cliente';
import { ClienteService } from '../../../services/clienteService';

interface CotizacionesFiltersProps {
  filters: CotizacionFilters;
  onFiltersChange: (filters: CotizacionFilters) => void;
}

export function CotizacionesFilters({ filters, onFiltersChange }: CotizacionesFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clientesBusqueda, setClientesBusqueda] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [showClientesDropdown, setShowClientesDropdown] = useState(false);
  const [clientesFiltrados, setClientesFiltrados] = useState<Cliente[]>([]);
  const [searchTimer, setSearchTimer] = useState<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cargar clientes
  useEffect(() => {
    const cargarClientes = async () => {
      try {
        const data = await ClienteService.obtenerClientes({});
        setClientes(data);
      } catch (error) {
        console.error('Error cargando clientes:', error);
      }
    };
    cargarClientes();
  }, []);

  // Sincronizar cliente seleccionado con filtros
  useEffect(() => {
    if (filters?.cliente_id && clientes.length > 0) {
      const cliente = clientes.find(c => c.id === parseInt(filters.cliente_id!));
      if (cliente) {
        setClienteSeleccionado(cliente);
        setClientesBusqueda(`${cliente.nombre_razon_social} - ${cliente.identificacion}`);
      }
    } else {
      setClienteSeleccionado(null);
      setClientesBusqueda('');
    }
  }, [filters?.cliente_id, clientes]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowClientesDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!filters) return null;

  const handleFilterChange = (key: keyof CotizacionFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined
    });
  };

  // Manejar búsqueda en tiempo real
  const handleSearchChange = (value: string) => {
    handleFilterChange('search', value);
  };

  const handleClienteBusquedaChange = (valor: string) => {
    setClientesBusqueda(valor);
    
    // Limpiar timer anterior
    if (searchTimer) {
      clearTimeout(searchTimer);
    }
    
    // Si se borra el campo, limpiar selección
    if (!valor.trim()) {
      setClienteSeleccionado(null);
      handleFilterChange('cliente_id', '');
      setShowClientesDropdown(false);
      setClientesFiltrados([]);
      return;
    }
    
    // Configurar nuevo timer para búsqueda
    const timer = setTimeout(() => {
      const filtrados = clientes.filter(cliente =>
        cliente.nombre_razon_social.toLowerCase().includes(valor.toLowerCase()) ||
        cliente.identificacion.toLowerCase().includes(valor.toLowerCase())
      ).slice(0, 10); // Limitar a 10 resultados
      
      setClientesFiltrados(filtrados);
      setShowClientesDropdown(filtrados.length > 0);
    }, 300);
    
    setSearchTimer(timer);
  };

  const seleccionarCliente = (cliente: Cliente) => {
    setClienteSeleccionado(cliente);
    setClientesBusqueda(`${cliente.nombre_razon_social} - ${cliente.identificacion}`);
    setShowClientesDropdown(false);
    handleFilterChange('cliente_id', cliente.id?.toString());
  };

  const limpiarCliente = () => {
    setClienteSeleccionado(null);
    setClientesBusqueda('');
    setShowClientesDropdown(false);
    handleFilterChange('cliente_id', '');
  };

  const clearFilters = () => {
    onFiltersChange({});
    setShowAdvanced(false);
    setClienteSeleccionado(null);
    setClientesBusqueda('');
    setShowClientesDropdown(false);
  };

  const hasActiveFilters = filters?.search || filters?.cliente_id || filters?.estado || 
                          filters?.moneda || filters?.fecha_desde || filters?.fecha_hasta;

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
      {/* Búsqueda principal */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
            <input
              type="text"
              placeholder="Buscar por número, cliente, descripción..."
              value={filters?.search || ''}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center whitespace-nowrap"
          >
            <i className="ri-filter-line mr-2"></i>
            Filtros
            <i className={`ri-arrow-${showAdvanced ? 'up' : 'down'}-s-line ml-1`}></i>
          </button>
          
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors flex items-center whitespace-nowrap"
            >
              <i className="ri-close-line mr-2"></i>
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Filtros avanzados */}
      {showAdvanced && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t border-gray-200">
          {/* Cliente con autocompletado */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cliente
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={clientesBusqueda}
                onChange={(e) => handleClienteBusquedaChange(e.target.value)}
                onFocus={() => {
                  if (clientesFiltrados.length > 0) {
                    setShowClientesDropdown(true);
                  }
                }}
                className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              />
              
              {clienteSeleccionado && (
                <button
                  onClick={limpiarCliente}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line"></i>
                </button>
              )}
            </div>

            {/* Dropdown de clientes */}
            {showClientesDropdown && clientesFiltrados.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {clientesFiltrados.map((cliente) => (
                  <button
                    key={cliente.id}
                    onClick={() => seleccionarCliente(cliente)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                  >
                    <div className="text-sm font-medium text-gray-900">
                      {cliente.nombre_razon_social}
                    </div>
                    <div className="text-xs text-gray-600">
                      {cliente.identificacion}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {showClientesDropdown && clientesBusqueda && clientesFiltrados.length === 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3">
                <div className="text-sm text-gray-500 text-center">
                  No se encontraron clientes
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              value={filters?.estado || ''}
              onChange={(e) => handleFilterChange('estado', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
            >
              <option value="">Todos</option>
              <option value="borrador">Borrador</option>
              <option value="enviada">Enviada</option>
              <option value="aceptada">Aceptada</option>
              <option value="rechazada">Rechazada</option>
              <option value="vencida">Vencida</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Moneda
            </label>
            <select
              value={filters?.moneda || ''}
              onChange={(e) => handleFilterChange('moneda', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
            >
              <option value="">Todas</option>
              <option value="CRC">Colones (₡)</option>
              <option value="USD">Dólares ($)</option>
              <option value="EUR">Euros (€)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Desde
            </label>
            <input
              type="date"
              value={filters?.fecha_desde || ''}
              onChange={(e) => handleFilterChange('fecha_desde', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Hasta
            </label>
            <input
              type="date"
              value={filters?.fecha_hasta || ''}
              onChange={(e) => handleFilterChange('fecha_hasta', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}
