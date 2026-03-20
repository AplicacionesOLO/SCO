import { ReactNode, useState } from 'react';
import Sidebar from '../../../components/feature/Sidebar';
import TopBar from '../../../components/feature/TopBar';
import MobileNav from '../../../components/feature/MobileNav';

interface MantenimientoLayoutProps {
  children: ReactNode;
  vistaActual: string;
  onCambiarVista: (vista: string) => void;
}

const TABS = [
  { key: 'umbrales',         label: 'Umbrales de Stock',  icon: 'ri-dashboard-line' },
  { key: 'alertas',          label: 'Alertas',             icon: 'ri-alarm-warning-line' },
  { key: 'reabastecimiento', label: 'Reabastecimiento',    icon: 'ri-truck-line' },
  { key: 'movimientos',      label: 'Movimientos',         icon: 'ri-history-line' },
  { key: 'kpis',             label: 'Dashboard KPIs',      icon: 'ri-bar-chart-line' },
  { key: 'prediccion',       label: 'Predicción IA',       icon: 'ri-brain-line' },
  { key: 'configuracion',    label: 'Configuración',       icon: 'ri-settings-line' },
];

export default function MantenimientoLayout({ children, vistaActual, onCambiarVista }: MantenimientoLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />

        <div className="bg-white border-b border-gray-200 px-4 lg:px-6">
          <nav className="flex space-x-1 overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => onCambiarVista(tab.key)}
                className={`py-4 px-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors cursor-pointer ${
                  vistaActual === tab.key
                    ? 'border-gray-800 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className={`${tab.icon} mr-1.5`}></i>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
