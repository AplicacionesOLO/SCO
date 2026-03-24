import { ReactNode, useState } from 'react';
import Sidebar from '../../../components/feature/Sidebar';
import TopBar from '../../../components/feature/TopBar';
import MobileNav from '../../../components/feature/MobileNav';

interface InventarioLayoutProps {
  children: ReactNode;
  vistaActual: 'inventario' | 'categorias' | 'importar' | 'unidades';
  onCambiarVista: (vista: 'inventario' | 'categorias' | 'importar' | 'unidades') => void;
}

export function InventarioLayout({ children, vistaActual, onCambiarVista }: InventarioLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const tabs = [
    {
      id: 'inventario' as const,
      label: 'Inventario',
      icon: 'ri-archive-line',
    },
    {
      id: 'categorias' as const,
      label: 'Categorías',
      icon: 'ri-folder-settings-line',
    },
    {
      id: 'unidades' as const,
      label: 'Unidades de Medida',
      icon: 'ri-ruler-line',
    },
    {
      id: 'importar' as const,
      label: 'Importar',
      icon: 'ri-file-excel-line',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TopBar */}
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        
        {/* Subtopbar con tabs */}
        <div className="bg-white border-b border-gray-200 px-4 lg:px-6">
          <div className="max-w-7xl mx-auto">
            <nav className="flex space-x-8" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onCambiarVista(tab.id)}
                  className={`${
                    vistaActual === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center cursor-pointer transition-colors`}
                >
                  <i className={`${tab.icon} mr-2`}></i>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
        
        {/* Contenido */}
        <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Navegación móvil */}
      <MobileNav />
    </div>
  );
}

export default InventarioLayout;
