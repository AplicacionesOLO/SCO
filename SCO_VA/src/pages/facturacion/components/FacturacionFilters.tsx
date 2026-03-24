import { useState, useEffect } from 'react';

interface FacturacionFiltersProps {
  filters: any;
  onFiltersChange: (filters: any) => void;
}

export function FacturacionFilters({ filters, onFiltersChange }: FacturacionFiltersProps) {
  const [clientes] = useState<any[]>([
    { id: 1, razon_social: 'Cliente Demo 1', identificacion: '1-1234-5678' },
    { id: 2, razon_social: 'Cliente Demo 2', identificacion: '2-2345-6789' }
  ]);

  const handleFilterChange = (field: string, value: any) => {
    onFiltersChange({
      ...filters,
      [field]: value
    });
  };

  const handleReset = () => {
    onFiltersChange({
      fecha_desde: '',
      fecha_hasta: '',
      estado_local: '',
      cliente_id: null
    });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fecha Desde
          </label>
          <input
            type="date"
            value={filters.fecha_desde}
            onChange={(e) => handleFilterChange('fecha_desde', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fecha Hasta
          </label>
          <input
            type="date"
            value={filters.fecha_hasta}
            onChange={(e) => handleFilterChange('fecha_hasta', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Estado
          </label>
          <select
            value={filters.estado_local}
            onChange={(e) => handleFilterChange('estado_local', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Todos</option>
            <option value="borrador">Borrador</option>
            <option value="firmado">Firmado</option>
            <option value="enviado">Enviado</option>
            <option value="aceptado">Aceptado</option>
            <option value="rechazado">Rechazado</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cliente
          </label>
          <select
            value={filters.cliente_id || ''}
            onChange={(e) => handleFilterChange('cliente_id', e.target.value ? parseInt(e.target.value) : null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Todos</option>
            {clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.razon_social}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleReset}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap"
        >
          <i className="ri-refresh-line mr-2"></i>
          Limpiar Filtros
        </button>
      </div>
    </div>
  );
}