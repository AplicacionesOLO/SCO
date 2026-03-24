import { useState } from 'react';
import type { FiltrosTablaDatos } from '../../../types/tablaDatosTareas';

interface TablaDatosFiltrosProps {
  filtros: FiltrosTablaDatos;
  onFiltroChange: (filtros: FiltrosTablaDatos) => void;
}

export default function TablaDatosFiltros({ filtros, onFiltroChange }: TablaDatosFiltrosProps) {
  const [busqueda, setBusqueda] = useState(filtros.busqueda || '');
  const [fechaInicio, setFechaInicio] = useState(filtros.fecha_inicio_desde || '');
  const [fechaCierre, setFechaCierre] = useState(filtros.fecha_cierre_hasta || '');
  const [estado, setEstado] = useState(filtros.estado || '');
  const [cliente, setCliente] = useState(filtros.cliente || '');

  const handleAplicarFiltros = () => {
    onFiltroChange({
      busqueda,
      fecha_inicio_desde: fechaInicio,
      fecha_cierre_hasta: fechaCierre,
      estado,
      cliente
    });
  };

  const handleLimpiarFiltros = () => {
    setBusqueda('');
    setFechaInicio('');
    setFechaCierre('');
    setEstado('');
    setCliente('');
    onFiltroChange({
      busqueda: '',
      fecha_inicio_desde: '',
      fecha_cierre_hasta: '',
      estado: '',
      cliente: ''
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Búsqueda global */}
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Buscar en todas las tablas...
          </label>
          <div className="relative">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAplicarFiltros()}
              placeholder="Caso, cliente, solicitante..."
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/80 backdrop-blur-sm"
            />
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
          </div>
        </div>

        {/* Fecha inicio desde */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Inicio desde
          </label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/80 backdrop-blur-sm"
          />
        </div>

        {/* Fecha cierre hasta */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cierre hasta
          </label>
          <input
            type="date"
            value={fechaCierre}
            onChange={(e) => setFechaCierre(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/80 backdrop-blur-sm"
          />
        </div>

        {/* Estado */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estado
          </label>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/80 backdrop-blur-sm"
          >
            <option value="">Todos los estados</option>
            <option value="En Cola">En Cola</option>
            <option value="En Proceso">En Proceso</option>
            <option value="Produciendo">Produciendo</option>
            <option value="Esperando suministros">Esperando suministros</option>
            <option value="Terminado">Terminado</option>
            <option value="Finalizado">Finalizado</option>
          </select>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={handleAplicarFiltros}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer whitespace-nowrap"
        >
          <i className="ri-filter-line mr-2"></i>
          Aplicar Filtros
        </button>
        <button
          onClick={handleLimpiarFiltros}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
        >
          <i className="ri-close-line mr-2"></i>
          Limpiar
        </button>
      </div>
    </div>
  );
}
