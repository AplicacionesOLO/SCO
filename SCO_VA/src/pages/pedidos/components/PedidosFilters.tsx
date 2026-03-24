import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import type { PedidoFilters } from '../../../types/pedido';

interface PedidosFiltersProps {
  filters: PedidoFilters;
  onFiltersChange: (filters: PedidoFilters) => void;
}

export default function PedidosFilters({ filters, onFiltersChange }: PedidosFiltersProps) {
  const [clientes, setClientes] = useState<Array<{ id: number; nombre_razon_social: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadClientes();
  }, []);

  const loadClientes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nombre_razon_social')
        .order('nombre_razon_social');

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Error al cargar clientes:', error);
      // Optionally add user notification here
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof PedidoFilters, value: string) => {
    const newFilters = {
      ...filters,
      [key]: value || undefined
    };
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Búsqueda */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Buscar
          </label>
          <div className="relative">
            <input
              type="text"
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Código, notas..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
          </div>
        </div>

        {/* Cliente */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cliente
          </label>
          <select
            value={filters.cliente_id || ''}
            onChange={(e) => handleFilterChange('cliente_id', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          >
            <option value="">Todos los clientes</option>
            {clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.nombre_razon_social}
              </option>
            ))}
          </select>
        </div>

        {/* Estado */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estado
          </label>
          <select
            value={filters.estado || ''}
            onChange={(e) => handleFilterChange('estado', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos los estados</option>
            <option value="borrador">Borrador</option>
            <option value="confirmado">Confirmado</option>
            <option value="facturado">Facturado</option>
            <option value="cancelado">Cancelado</option>
            <option value="vencido">Vencido</option>
          </select>
        </div>

        {/* Fecha desde */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha desde
          </label>
          <input
            type="date"
            value={filters.fecha_desde || ''}
            onChange={(e) => handleFilterChange('fecha_desde', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Fecha hasta */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha hasta
          </label>
          <input
            type="date"
            value={filters.fecha_hasta || ''}
            onChange={(e) => handleFilterChange('fecha_hasta', e.target.value)}
            min={filters.fecha_desde || undefined}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Botón limpiar filtros */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={clearFilters}
          className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <i className="ri-close-line"></i>
          Limpiar filtros
        </button>
      </div>
    </div>
  );
}
