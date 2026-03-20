import { ReactNode } from 'react';

interface SeguimientoLayoutProps {
  children: ReactNode;
}

export default function SeguimientoLayout({ children }: SeguimientoLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1920px] mx-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Seguimiento de Pedidos</h1>
              <p className="text-sm text-gray-600 mt-1">
                Monitorea el progreso de producción y entrega de tus pedidos en tiempo real
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
