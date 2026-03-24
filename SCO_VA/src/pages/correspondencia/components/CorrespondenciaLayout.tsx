import { ReactNode } from 'react';
import type { CorrespondenciaStats } from '../../../types/correspondencia';

type Tab = 'plantillas' | 'reglas' | 'historial';

interface Props {
  children: ReactNode;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  stats: CorrespondenciaStats | null;
  onNuevoEnvio: () => void;
}

const tabs: { key: Tab; label: string; icon: string }[] = [
  { key: 'plantillas', label: 'Plantillas', icon: 'ri-file-text-line' },
  { key: 'reglas', label: 'Reglas y Triggers', icon: 'ri-settings-3-line' },
  { key: 'historial', label: 'Reporte de Envíos', icon: 'ri-mail-check-line' },
];

export default function CorrespondenciaLayout({ children, activeTab, onTabChange, stats, onNuevoEnvio }: Props) {
  return (
    <main className="flex-1 overflow-auto p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Correspondencia</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión de correos automáticos y manuales vía Google SMTP</p>
        </div>
        <button
          onClick={onNuevoEnvio}
          className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
        >
          <i className="ri-send-plane-line"></i>
          Envío Manual
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-300 p-4 border-l-4 border-l-gray-400">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-500 mt-1">Total Enviados</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-300 p-4 border-l-4 border-l-green-500">
            <div className="text-2xl font-bold text-gray-900">{stats.enviados}</div>
            <div className="text-xs text-gray-500 mt-1">Exitosos</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-300 p-4 border-l-4 border-l-red-500">
            <div className="text-2xl font-bold text-gray-900">{stats.errores}</div>
            <div className="text-xs text-gray-500 mt-1">Con Error</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-300 p-4 border-l-4 border-l-yellow-500">
            <div className="text-2xl font-bold text-gray-900">{stats.pendientes}</div>
            <div className="text-xs text-gray-500 mt-1">Pendientes</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-300 p-4 border-l-4 border-l-emerald-500">
            <div className="text-2xl font-bold text-gray-900">{stats.tasa_exito}%</div>
            <div className="text-xs text-gray-500 mt-1">Tasa de Éxito</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => onTabChange(t.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === t.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <i className={t.icon}></i>
            {t.label}
          </button>
        ))}
      </div>

      {children}
    </main>
  );
}
