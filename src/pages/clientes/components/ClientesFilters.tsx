
import { useState } from 'react';
import { ClienteFilters } from '../../../types/cliente';

interface ClientesFiltersProps {
  filters: ClienteFilters;
  onFiltersChange: (filters: ClienteFilters) => void;
}

export function ClientesFilters({ filters, onFiltersChange }: ClientesFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleFilterChange = (key: keyof ClienteFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
    setShowAdvanced(false);
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
      {/* Búsqueda principal */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
            <input
              type="text"
              placeholder="Buscar por nombre, identificación o correo..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
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
          
          {(filters.search || filters.tipo_persona || filters.hacienda_estado_validacion) && (
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Persona
            </label>
            <select
              value={filters.tipo_persona || ''}
              onChange={(e) => handleFilterChange('tipo_persona', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
            >
              <option value="">Todos</option>
              <option value="fisica">Física</option>
              <option value="juridica">Jurídica</option>
              <option value="extranjero">Extranjero</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado Hacienda
            </label>
            <select
              value={filters.hacienda_estado_validacion || ''}
              onChange={(e) => handleFilterChange('hacienda_estado_validacion', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
            >
              <option value="">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="valido">Válido</option>
              <option value="no_valido">No Válido</option>
              <option value="error">Error</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              value={filters.activo !== undefined ? (filters.activo ? 'true' : 'false') : ''}
              onChange={(e) => handleFilterChange('activo', e.target.value === '' ? undefined : e.target.value === 'true')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
            >
              <option value="">Todos</option>
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
