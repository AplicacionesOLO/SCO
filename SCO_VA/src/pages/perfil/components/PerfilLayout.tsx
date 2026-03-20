import { ReactNode } from 'react';
import Sidebar from '../../../components/feature/Sidebar';
import TopBar from '../../../components/feature/TopBar';
import MobileNav from '../../../components/feature/MobileNav';
import { useState } from 'react';

interface PerfilLayoutProps {
  children: ReactNode;
}

export default function PerfilLayout({ children }: PerfilLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* TopBar */}
        <TopBar onMenuClick={() => setIsMobileMenuOpen(true)} />
        
        {/* Mobile Navigation */}
        <MobileNav 
          isOpen={isMobileMenuOpen} 
          onClose={() => setIsMobileMenuOpen(false)} 
        />
        
        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}