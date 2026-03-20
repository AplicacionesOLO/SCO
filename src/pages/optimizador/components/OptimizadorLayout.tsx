import { ReactNode } from 'react';
import Sidebar from '../../../components/feature/Sidebar';
import TopBar from '../../../components/feature/TopBar';
import MobileNav from '../../../components/feature/MobileNav';

interface Props {
  children: ReactNode;
}

export default function OptimizadorLayout({ children }: Props) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1920px] mx-auto p-6">
            {children}
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
