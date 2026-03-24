import { useState } from 'react';
import TablaDatosFiltros from './TablaDatosFiltros';
import TotalesClientesCard from './TotalesClientesCard';
import TablaPorEstado from './TablaPorEstado';
import type { TareaAnalisis, FiltrosTablaDatos, TotalesPorCliente } from '../../../types/tablaDatosTareas';

interface TablaDatosLayoutProps {
  tareas: TareaAnalisis[];
  totalesPorCliente: TotalesPorCliente[];
  totalGeneral: number;
  loading: boolean;
  filtros: FiltrosTablaDatos;
  onFiltroChange: (filtros: FiltrosTablaDatos) => void;
  onExportarExcel: () => void;
  onRefresh: () => void;
}

export default function TablaDatosLayout({
  tareas,
  totalesPorCliente,
  totalGeneral,
  loading,
  filtros,
  onFiltroChange,
  onExportarExcel,
  onRefresh
}: TablaDatosLayoutProps) {
  
  // Agrupar tareas por estado
  const tareasPorEstado = tareas.reduce((acc, tarea) => {
    if (!acc[tarea.estado]) {
      acc[tarea.estado] = [];
    }
    acc[tarea.estado].push(tarea);
    return acc;
  }, {} as Record<string, TareaAnalisis[]>);

  // Estados disponibles
  const estados = Object.keys(tareasPorEstado).sort();

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">
        {/* Header con logo y título */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-teal-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl" style={{ fontFamily: '"Pacifico", serif' }}>
                  O
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  CRM Valor Agregado - Tabla de datos Tareas
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Análisis EDA de producción y productividad
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={onRefresh}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-refresh-line mr-2"></i>
                Actualizar
              </button>
              <button
                onClick={onExportarExcel}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-file-excel-2-line mr-2"></i>
                Descargar Excel
              </button>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <TablaDatosFiltros
          filtros={filtros}
          onFiltroChange={onFiltroChange}
        />

        {/* Totales por Cliente */}
        <TotalesClientesCard
          totalesPorCliente={totalesPorCliente}
          totalGeneral={totalGeneral}
        />

        {/* Tablas por Estado */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <i className="ri-loader-4-line text-4xl text-blue-600 animate-spin mb-4"></i>
              <p className="text-gray-600">Cargando datos...</p>
            </div>
          </div>
        ) : estados.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <i className="ri-inbox-line text-6xl text-gray-300 mb-4"></i>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay datos disponibles
            </h3>
            <p className="text-gray-500">
              No se encontraron tareas con los filtros aplicados
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {estados.map(estado => (
              <TablaPorEstado
                key={estado}
                estado={estado}
                tareas={tareasPorEstado[estado]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
