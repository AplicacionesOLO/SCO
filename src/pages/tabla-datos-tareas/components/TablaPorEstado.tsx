import { useState } from 'react';
import { formatCurrency } from '../../../lib/currency';
import type { TareaAnalisis } from '../../../types/tablaDatosTareas';

// Helper para parsear fechas sin problema de timezone (UTC vs local)
function parseFechaLocal(fechaStr: string): Date {
  // Si es solo YYYY-MM-DD, agregar T00:00:00 para forzar hora local
  if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
    return new Date(`${fechaStr}T00:00:00`);
  }
  return new Date(fechaStr);
}

interface TablaPorEstadoProps {
  estado: string;
  tareas: TareaAnalisis[];
}

export default function TablaPorEstado({ estado, tareas }: TablaPorEstadoProps) {
  const [itemsExpandidos, setItemsExpandidos] = useState<Set<string>>(new Set());

  const toggleItems = (tareaId: string) => {
    const nuevosExpandidos = new Set(itemsExpandidos);
    if (nuevosExpandidos.has(tareaId)) {
      nuevosExpandidos.delete(tareaId);
    } else {
      nuevosExpandidos.add(tareaId);
    }
    setItemsExpandidos(nuevosExpandidos);
  };

  // Color del badge según el estado
  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'En Cola':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'En Proceso':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Produciendo':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'Esperando suministros':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Terminado':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Finalizado':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Obtener color para cada categoría
  const getCategoriaColor = (categoria: string) => {
    switch (categoria) {
      case 'HH':
        return 'bg-blue-50 border-blue-200 text-blue-900';
      case 'ETIQUETAS':
        return 'bg-green-50 border-green-200 text-green-900';
      case 'DEDICADOS':
        return 'bg-purple-50 border-purple-200 text-purple-900';
      case 'EMBALAJE':
        return 'bg-orange-50 border-orange-200 text-orange-900';
      case 'MAQUINA':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'HABLADORES':
        return 'bg-pink-50 border-pink-200 text-pink-900';
      case 'REMPAQUE':
        return 'bg-indigo-50 border-indigo-200 text-indigo-900';
      case 'BOLSAS':
        return 'bg-teal-50 border-teal-200 text-teal-900';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header del estado */}
      <div className={`px-6 py-4 border-b border-gray-200 ${getEstadoColor(estado)} bg-opacity-30`}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">
            {estado}
          </h3>
          <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getEstadoColor(estado)}`}>
            {tareas.length} {tareas.length === 1 ? 'tarea' : 'tareas'}
          </span>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                Caso
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                Solicitante
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                Cliente
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                Descripción
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                Inicio
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                Cierre
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                Personas
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                Responsable
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                Entregado a
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                Observaciones VA
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                Items
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {tareas.map((tarea) => {
              const itemsExpandido = itemsExpandidos.has(tarea.id);
              
              return (
                <>
                  {/* Fila principal */}
                  <tr key={tarea.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {tarea.caso}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {tarea.solicitante}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {tarea.cliente}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                      {tarea.descripcion}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {tarea.inicio ? parseFechaLocal(tarea.inicio).toLocaleDateString('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {tarea.cierre ? parseFechaLocal(tarea.cierre).toLocaleDateString('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap">
                      {tarea.cantidad_personas || 0}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {tarea.responsable}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {tarea.entregado_a || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                      {tarea.observaciones_va || '-'}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => toggleItems(tarea.id)}
                        className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded hover:bg-blue-200 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <i className={`${itemsExpandido ? 'ri-eye-off-line' : 'ri-eye-line'} mr-1`}></i>
                        {itemsExpandido ? 'Ocultar' : 'Ver'}
                      </button>
                    </td>
                  </tr>

                  {/* Fila expandida con items */}
                  {itemsExpandido && (
                    <tr>
                      <td colSpan={11} className="px-4 py-4 bg-gray-50">
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">
                            Detalle de Items
                          </h4>
                          
                          {tarea.items.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">
                              No hay items registrados para esta tarea
                            </p>
                          ) : (
                            <>
                              <div className="overflow-x-auto">
                                <table className="w-full border border-gray-200 rounded-lg">
                                  <thead className="bg-white">
                                    <tr>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 border-b border-gray-200">
                                        Descripción
                                      </th>
                                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-700 border-b border-gray-200">
                                        Categoría
                                      </th>
                                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-700 border-b border-gray-200">
                                        Cantidad
                                      </th>
                                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-700 border-b border-gray-200">
                                        Unidad
                                      </th>
                                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-700 border-b border-gray-200">
                                        Costo Unitario
                                      </th>
                                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-700 border-b border-gray-200">
                                        Costo Total
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {tarea.items.map((item) => (
                                      <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 text-sm text-gray-900">
                                          {item.descripcion}
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded border ${getCategoriaColor(item.categoria)}`}>
                                            {item.categoria}
                                          </span>
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-900 text-right">
                                          {item.cantidad.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                          <span className="inline-block px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded">
                                            {item.unidad_medida || 'u'}
                                          </span>
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-900 text-right">
                                          {formatCurrency(item.costo_unitario)}
                                        </td>
                                        <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">
                                          {formatCurrency(item.costo_total)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                                    <tr>
                                      <td colSpan={5} className="px-4 py-2 text-sm font-bold text-gray-900 text-right">
                                        Total General:
                                      </td>
                                      <td className="px-4 py-2 text-sm font-bold text-blue-600 text-right">
                                        {formatCurrency(tarea.total_general)}
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>

                              {/* Resumen por categorías - DINÁMICO */}
                              <div className="mt-4">
                                <h5 className="text-sm font-semibold text-gray-900 mb-3">
                                  Totales por Categoría
                                </h5>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                  {Object.entries(tarea.totales_por_categoria || {})
                                    .sort(([a], [b]) => a.localeCompare(b))
                                    .map(([categoria, total]) => (
                                      <div 
                                        key={categoria} 
                                        className={`border rounded-lg p-3 ${getCategoriaColor(categoria)}`}
                                      >
                                        <p className="text-xs font-medium mb-1">{categoria}</p>
                                        <p className="text-lg font-bold">
                                          {formatCurrency(total)}
                                        </p>
                                        
                                        {/* Alerta de HH si existe */}
                                        {categoria === 'HH' && tarea.alerta_hh && (
                                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-300 rounded text-xs text-yellow-800">
                                            <i className="ri-alert-line mr-1"></i>
                                            {tarea.alerta_hh}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  
                                  {/* Total General */}
                                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <p className="text-xs text-blue-700 font-medium mb-1">TOTAL GENERAL</p>
                                    <p className="text-lg font-bold text-blue-600">
                                      {formatCurrency(tarea.total_general)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
