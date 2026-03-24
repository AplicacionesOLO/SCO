import { useState } from 'react';
import type { Tarea, TareaFilters, TareaEstado } from '../../../types/tarea';

interface TareasDeadlineProps {
  tareas: Tarea[];
  loading: boolean;
  filtros: TareaFilters;
  onFiltroChange: (filtros: TareaFilters) => void;
  onProcesar: (tarea: Tarea) => void;
  onRefresh: () => void;
}

const ESTADOS: TareaEstado[] = [
  'En Cola',
  'En Proceso',
  'Produciendo',
  'Esperando suministros',
  'Terminado',
  'Finalizado'
];

const getEstadoColor = (estado: TareaEstado): string => {
  const colores: Record<TareaEstado, string> = {
    'En Cola': 'bg-gray-100 text-gray-800',
    'En Proceso': 'bg-blue-100 text-blue-800',
    'Produciendo': 'bg-purple-100 text-purple-800',
    'Esperando suministros': 'bg-yellow-100 text-yellow-800',
    'Terminado': 'bg-green-100 text-green-800',
    'Finalizado': 'bg-gray-200 text-gray-600'
  };
  return colores[estado] || 'bg-gray-100 text-gray-800';
};

export default function TareasDeadline({
  tareas,
  loading,
  filtros,
  onFiltroChange,
  onProcesar,
  onRefresh
}: TareasDeadlineProps) {
  const [busqueda, setBusqueda] = useState(filtros.busqueda || '');

  const handleBusquedaChange = (value: string) => {
    setBusqueda(value);
    onFiltroChange({ ...filtros, busqueda: value });
  };

  const handleEstadoChange = (estado: string) => {
    onFiltroChange({ ...filtros, estado: estado as TareaEstado | '' });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Filtros */}
      <div className="p-4 border-b border-gray-300">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1">
            <div className="relative">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input
                type="text"
                placeholder="Buscar por consecutivo o descripción..."
                value={busqueda}
                onChange={(e) => handleBusquedaChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          {/* Filtro por estado */}
          <div className="sm:w-48">
            <select
              value={filtros.estado || ''}
              onChange={(e) => handleEstadoChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos (sin Finalizado)</option>
              {ESTADOS.map(estado => (
                <option key={estado} value={estado}>{estado}</option>
              ))}
            </select>
          </div>
          
          {/* Botón refrescar */}
          <button
            onClick={onRefresh}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <i className="ri-refresh-line"></i>
            Refrescar
          </button>
        </div>
      </div>
      
      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-300">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tarea
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha Estimada
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Solicitante
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cantidad
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Descripción
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-500">
                    <i className="ri-loader-4-line animate-spin"></i>
                    Cargando tareas...
                  </div>
                </td>
              </tr>
            ) : tareas.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No hay tareas para mostrar
                </td>
              </tr>
            ) : (
              tareas.map((tarea) => (
                <tr key={tarea.id} className="hover:bg-gray-50">
                  {/* Consecutivo */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onProcesar(tarea)}
                      className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                    >
                      {tarea.consecutivo}
                    </button>
                    <div className="text-xs text-gray-500">
                      {new Date(tarea.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  
                  {/* Fecha Estimada */}
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {tarea.fecha_estimada_entrega ? (
                      <span className={
                        new Date(tarea.fecha_estimada_entrega) < new Date() 
                          ? 'text-red-600 font-medium' 
                          : ''
                      }>
                        {new Date(tarea.fecha_estimada_entrega).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-gray-400">Sin definir</span>
                    )}
                  </td>
                  
                  {/* Solicitante */}
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {tarea.email_solicitante}
                  </td>
                  
                  {/* Cantidad */}
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {tarea.cantidad_unidades || '-'}
                  </td>
                  
                  {/* Descripción */}
                  <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                    {tarea.descripcion_breve || '-'}
                  </td>
                  
                  {/* Estado */}
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getEstadoColor(tarea.estado)}`}>
                      {tarea.estado}
                    </span>
                  </td>
                  
                  {/* Acciones */}
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onProcesar(tarea)}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Procesar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Footer con total */}
      {!loading && tareas.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-300 text-sm text-gray-500">
          Mostrando {tareas.length} tarea{tareas.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
