import { ReactNode } from 'react';
import type { TareaStats } from '../../../types/tarea';

interface TareasLayoutProps {
  children: ReactNode;
  stats: TareaStats | null;
  onNuevaTarea: () => void;
  onConfigEncargados: () => void;
  onConfigColaboradores: () => void;
  onExportar: () => void;
  canCreate: boolean;
  canManage: boolean;
}

export default function TareasLayout({
  children,
  stats,
  onNuevaTarea,
  onConfigEncargados,
  onConfigColaboradores,
  onExportar,
  canCreate,
  canManage
}: TareasLayoutProps) {
  return (
    <main className="flex-1 overflow-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tareas</h1>
            <p className="text-sm text-gray-500 mt-1">
              Gestión de órdenes de trabajo y seguimiento de producción
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Botón Exportar */}
            <button
              onClick={onExportar}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <i className="ri-download-line"></i>
              Exportar
            </button>
            
            {/* Botón Colaboradores */}
            {canManage && (
              <button
                onClick={onConfigColaboradores}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <i className="ri-team-line"></i>
                Colaboradores
              </button>
            )}
            
            {/* Botón Encargados */}
            {canManage && (
              <button
                onClick={onConfigEncargados}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <i className="ri-user-settings-line"></i>
                Encargados
              </button>
            )}
            
            {/* Botón Nueva Tarea */}
            {canCreate && (
              <button
                onClick={onNuevaTarea}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <i className="ri-add-line"></i>
                Nueva Tarea
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-300 p-4 border-l-4 border-l-gray-400">
            <div className="text-2xl font-bold text-gray-900">{stats.en_cola}</div>
            <div className="text-xs text-gray-500 mt-1">En Cola</div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-300 p-4 border-l-4 border-l-blue-500">
            <div className="text-2xl font-bold text-gray-900">{stats.en_proceso}</div>
            <div className="text-xs text-gray-500 mt-1">En Proceso</div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-300 p-4 border-l-4 border-l-purple-500">
            <div className="text-2xl font-bold text-gray-900">{stats.produciendo}</div>
            <div className="text-xs text-gray-500 mt-1">Produciendo</div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-300 p-4 border-l-4 border-l-yellow-500">
            <div className="text-2xl font-bold text-gray-900">{stats.esperando_suministros}</div>
            <div className="text-xs text-gray-500 mt-1">Esperando</div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-300 p-4 border-l-4 border-l-green-500">
            <div className="text-2xl font-bold text-gray-900">{stats.terminado}</div>
            <div className="text-xs text-gray-500 mt-1">Terminado</div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-300 p-4 border-l-4 border-l-gray-600">
            <div className="text-2xl font-bold text-gray-900">{stats.finalizado}</div>
            <div className="text-xs text-gray-500 mt-1">Finalizado</div>
          </div>
        </div>
      )}
      
      {/* Contenido principal */}
      {children}
    </main>
  );
}
