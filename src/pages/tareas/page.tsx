import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/feature/Sidebar';
import TopBar from '../../components/feature/TopBar';
import TareasLayout from './components/TareasLayout';
import TareasDeadline from './components/TareasDeadline';
import TareaFormModal from './components/TareaFormModal';
import TareaProcesarModal from './components/TareaProcesarModal';
import ConfigEncargadosModal from './components/ConfigEncargadosModal';
import ColaboradoresModal from './components/ColaboradoresModal';
import { tareaService } from '../../services/tareaService';
import type { Tarea, TareaFilters, TareaStats } from '../../types/tarea';
import { useAuth } from '../../hooks/useAuth';
import { showAlert, showConfirm } from '../../utils/dialog';

export default function TareasPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  
  // Estados principales
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [stats, setStats] = useState<TareaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Estados de modales
  const [showFormModal, setShowFormModal] = useState(false);
  const [showProcesarModal, setShowProcesarModal] = useState(false);
  const [showEncargadosModal, setShowEncargadosModal] = useState(false);
  const [showColaboradoresModal, setShowColaboradoresModal] = useState(false);
  const [selectedTarea, setSelectedTarea] = useState<Tarea | null>(null);
  
  // Filtros
  const [filtros, setFiltros] = useState<TareaFilters>({
    estado: '',
    fecha_desde: '',
    fecha_hasta: '',
    busqueda: ''
  });

  // Cargar datos al montar
  useEffect(() => {
    cargarDatos();
  }, [filtros]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Aplicar filtro por defecto: excluir Finalizado
      const filtrosAplicados = { ...filtros };
      if (!filtrosAplicados.estado) {
        // Si no hay filtro de estado, excluir Finalizado
      }
      
      const [tareasData, statsData] = await Promise.all([
        tareaService.getTareas(filtrosAplicados),
        tareaService.getStats()
      ]);
      
      // Filtrar Finalizado por defecto si no hay filtro específico
      let tareasFiltradas = tareasData;
      if (!filtros.estado) {
        tareasFiltradas = tareasData.filter(t => t.estado !== 'Finalizado');
      }
      
      setTareas(tareasFiltradas);
      setStats(statsData);
    } catch (error) {
      console.error('Error cargando tareas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handlers
  const handleNuevaTarea = () => {
    setSelectedTarea(null);
    setShowFormModal(true);
  };

  const handleProcesarTarea = (tarea: Tarea) => {
    setSelectedTarea(tarea);
    setShowProcesarModal(true);
  };

  const handleSaveTarea = async () => {
    setShowFormModal(false);
    setShowProcesarModal(false);
    await cargarDatos();
  };

  const handleFiltroChange = (nuevosFiltros: TareaFilters) => {
    setFiltros(nuevosFiltros);
  };

  const handleExportar = async () => {
    try {
      // Obtener todas las tareas sin filtro de estado
      const todasTareas = await tareaService.getTareas({});
      
      // Crear CSV
      const headers = [
        'Consecutivo',
        'Estado',
        'Fecha Creación',
        'Fecha Estimada',
        'Solicitante',
        'Descripción',
        'Cantidad Unidades',
        'Cantidad Personas',
        'Fecha Inicio',
        'Fecha Cierre',
        'Entregado A',
        'Total Costo'
      ];
      
      const rows = todasTareas.map(t => [
        t.consecutivo,
        t.estado,
        new Date(t.created_at).toLocaleDateString(),
        t.fecha_estimada_entrega || '',
        t.email_solicitante,
        t.descripcion_breve || '',
        t.cantidad_unidades || '',
        t.cantidad_personas || '',
        t.fecha_inicio ? new Date(t.fecha_inicio).toLocaleDateString() : '',
        t.fecha_cierre ? new Date(t.fecha_cierre).toLocaleDateString() : '',
        t.entregado_a || '',
        t.total_costo || 0
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');
      
      // Descargar archivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `tareas_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      console.log('✅ Exportación completada');
    } catch (error) {
      console.error('Error exportando:', error);
      showAlert('Error al exportar datos');
    }
  };

  const handleEliminarTarea = async (tarea: Tarea) => {
    if (!(await showConfirm(`¿Está seguro que desea eliminar la tarea "${tarea.nombre_tarea}"? Esta acción no se puede deshacer.`, { type: 'danger', title: 'Eliminar tarea' }))) {
      return;
    }

    try {
      await tareaService.deleteTarea(tarea.id);
      showAlert('Tarea eliminada exitosamente');
      cargarDatos();
    } catch (error) {
      console.error('Error eliminando tarea:', error);
      showAlert('Error al eliminar la tarea: ' + (error as Error).message);
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
        
        {/* Layout de Tareas */}
        <TareasLayout
          stats={stats}
          onNuevaTarea={handleNuevaTarea}
          onConfigEncargados={() => setShowEncargadosModal(true)}
          onConfigColaboradores={() => setShowColaboradoresModal(true)}
          onExportar={handleExportar}
          canCreate={hasPermission('tareas:create')}
          canManage={hasPermission('tareas:manage')}
        >
          {/* Vista Deadline */}
          <TareasDeadline
            tareas={tareas}
            loading={loading}
            filtros={filtros}
            onFiltroChange={handleFiltroChange}
            onProcesar={handleProcesarTarea}
            onRefresh={cargarDatos}
          />
        </TareasLayout>
      </div>
      
      {/* Modal: Nueva Tarea */}
      {showFormModal && (
        <TareaFormModal
          onClose={() => setShowFormModal(false)}
          onSave={handleSaveTarea}
        />
      )}
      
      {/* Modal: Procesar Tarea */}
      {showProcesarModal && selectedTarea && (
        <TareaProcesarModal
          tarea={selectedTarea}
          onClose={() => setShowProcesarModal(false)}
          onSave={handleSaveTarea}
        />
      )}
      
      {/* Modal: Configurar Encargados */}
      {showEncargadosModal && (
        <ConfigEncargadosModal
          onClose={() => setShowEncargadosModal(false)}
        />
      )}
      
      {/* Modal: Gestionar Colaboradores */}
      {showColaboradoresModal && (
        <ColaboradoresModal
          onClose={() => setShowColaboradoresModal(false)}
        />
      )}
    </div>
  );
}
