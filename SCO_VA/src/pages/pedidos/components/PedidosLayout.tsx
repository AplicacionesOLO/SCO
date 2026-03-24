
import { ReactNode, useState } from 'react';
import Sidebar from '../../../components/feature/Sidebar';
import TopBar from '../../../components/feature/TopBar';
import MobileNav from '../../../components/feature/MobileNav';

interface PedidosLayoutProps {
  children: ReactNode;
  title?: string;
  onCreatePedido?: () => void;
}

export default function PedidosLayout({ children, title = "Gestión de Pedidos", onCreatePedido }: PedidosLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TopBar */}
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        
        {/* Contenido */}
        <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              {onCreatePedido && (
                <button
                  onClick={onCreatePedido}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Nuevo Pedido
                </button>
              )}
            </div>
            
            {children}
          </div>
        </main>
      </div>

      {/* Navegación móvil */}
      <MobileNav />
    </div>
  );
}
