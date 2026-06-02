import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/feature/Sidebar';
import TopBar from '../../components/feature/TopBar';
import TablaDatosLayout from './components/TablaDatosLayout';
import { tablaDatosTareasService } from '../../services/tablaDatosTareasService';
import type { TareaAnalisis, FiltrosTablaDatos, TotalesPorCliente } from '../../types/tablaDatosTareas';
import { showAlert } from '../../utils/dialog';

export default function TablaDatosTareasPage() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Estados de datos
  const [tareas, setTareas] = useState<TareaAnalisis[]>([]);
  const [totalesPorCliente, setTotalesPorCliente] = useState<TotalesPorCliente[]>([]);
  const [totalGeneral, setTotalGeneral] = useState(0);
  
  // Estados de filtros
  const [filtros, setFiltros] = useState<FiltrosTablaDatos>({
    busqueda: '',
    fecha_inicio_desde: '',
    fecha_cierre_hasta: '',
    estado: '',
    cliente: ''
  });

  // Cargar datos al montar y cuando cambien los filtros
  useEffect(() => {
    cargarDatos();
  }, [filtros]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Ahora solo cargamos tareas una vez — los totales se calculan en memoria
      const tareasData = await tablaDatosTareasService.getTareasAnalisis(filtros);
      
      setTareas(tareasData);
      
      // Calcular totales por cliente en memoria (evita query duplicada)
      const totalesMap: Record<string, number> = {};
      let general = 0;
      
      for (const tarea of tareasData) {
        const cliente = tarea.cliente || 'Sin cliente';
        totalesMap[cliente] = (totalesMap[cliente] || 0) + tarea.total_general;
        general += tarea.total_general;
      }
      
      const totalesArray: TotalesPorCliente[] = Object.entries(totalesMap)
        .map(([cliente, total]) => ({ cliente, total }))
        .sort((a, b) => b.total - a.total);
      
      setTotalesPorCliente(totalesArray);
      setTotalGeneral(general);
      
    } catch (error: any) {
      console.error('Error en cargarDatos:', error);
      const mensaje = error?.message || error?.error_description || 'Error al cargar los datos de análisis';
      showAlert(mensaje);
    } finally {
      setLoading(false);
    }
  };

  const handleFiltroChange = (nuevosFiltros: FiltrosTablaDatos) => {
    setFiltros(nuevosFiltros);
  };

  const handleExportarExcel = async () => {
    try {
      await tablaDatosTareasService.exportarExcel(filtros);
    } catch (error) {
      showAlert('Error al exportar el archivo Excel');
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Contenido principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TopBar */}
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        
        {/* Layout de Tabla de Datos */}
        <TablaDatosLayout
          tareas={tareas}
          totalesPorCliente={totalesPorCliente}
          totalGeneral={totalGeneral}
          loading={loading}
          filtros={filtros}
          onFiltroChange={handleFiltroChange}
          onExportarExcel={handleExportarExcel}
          onRefresh={cargarDatos}
        />
      </div>
    </div>
  );
}