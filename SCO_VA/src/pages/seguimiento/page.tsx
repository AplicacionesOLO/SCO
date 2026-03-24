import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SeguimientoLayout from './components/SeguimientoLayout';
import SeguimientoKanban from './components/SeguimientoKanban';
import SeguimientoTimeline from './components/SeguimientoTimeline';
import SeguimientoDetalleModal from './components/SeguimientoDetalleModal';
import CambiarEstadoModal from './components/CambiarEstadoModal';
import { seguimientoService } from '../../services/seguimientoService';
import type { Solicitud, SolicitudEstado } from '../../types/seguimiento';
import Sidebar from '../../components/feature/Sidebar';
import TopBar from '../../components/feature/TopBar';
import { usePermissions } from '../../hooks/usePermissions';
import { showAlert } from '../../utils/dialog';

const SeguimientoPage = () => {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const [vista, setVista] = useState<'kanban' | 'timeline'>('kanban');
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [estados, setEstados] = useState<SolicitudEstado[]>([]);
  const [loading, setLoading] = useState(true);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<Solicitud | null>(null);
  const [modalDetalle, setModalDetalle] = useState(false);
  const [modalCambiarEstado, setModalCambiarEstado] = useState(false);
  const [filtros, setFiltros] = useState({
    busqueda: '',
    estado_id: '',
    fecha_desde: '',
    fecha_hasta: ''
  });

  // Verificar permisos
  useEffect(() => {
    if (!hasPermission('seguimiento:view')) {
      navigate('/dashboard');
    }
  }, [hasPermission, navigate]);

  useEffect(() => {
    cargarDatos();
  }, [filtros]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [solicitudesData, estadosData] = await Promise.all([
        seguimientoService.getSolicitudes(filtros),
        seguimientoService.getEstados()
      ]);
      setSolicitudes(solicitudesData);
      setEstados(estadosData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalle = (solicitud: Solicitud) => {
    setSolicitudSeleccionada(solicitud);
    setModalDetalle(true);
  };

  const handleCambiarEstado = (solicitud: Solicitud) => {
    if (!hasPermission('seguimiento:edit')) {
      showAlert('No tienes permisos para cambiar estados', { type: 'warning' });
      return;
    }
    setSolicitudSeleccionada(solicitud);
    setModalCambiarEstado(true);
  };

  const handleEstadoCambiado = () => {
    cargarDatos();
    setModalCambiarEstado(false);
  };

  const handleDragEnd = async (solicitudId: number, nuevoEstadoId: number) => {
    if (!hasPermission('seguimiento:edit')) {
      showAlert('No tienes permisos para cambiar estados', { type: 'warning' });
      return;
    }
    
    try {
      await seguimientoService.cambiarEstado(solicitudId, nuevoEstadoId, 'Cambio mediante arrastre');
      cargarDatos();
    } catch (error) {
      console.error('Error cambiando estado:', error);
      showAlert('Error al cambiar el estado', { type: 'error' });
    }
  };

  // Si no tiene permisos, no renderizar nada (el useEffect redirigirá)
  if (!hasPermission('seguimiento:view')) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        
        <main className="flex-1 overflow-y-auto">
          <SeguimientoLayout
            vista={vista}
            onVistaChange={setVista}
            filtros={filtros}
            onFiltrosChange={setFiltros}
            onRefresh={cargarDatos}
          >
            {loading ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <i className="ri-loader-4-line text-4xl text-teal-600 animate-spin mb-4"></i>
                  <p className="text-gray-600">Cargando seguimiento...</p>
                </div>
              </div>
            ) : vista === 'kanban' ? (
              <SeguimientoKanban
                solicitudes={solicitudes}
                estados={estados}
                onVerDetalle={handleVerDetalle}
                onCambiarEstado={handleCambiarEstado}
                onDragEnd={handleDragEnd}
              />
            ) : (
              <SeguimientoTimeline
                solicitudes={solicitudes}
                onVerDetalle={handleVerDetalle}
                onCambiarEstado={handleCambiarEstado}
              />
            )}
          </SeguimientoLayout>
        </main>
      </div>

      {modalDetalle && solicitudSeleccionada && (
        <SeguimientoDetalleModal
          solicitud={solicitudSeleccionada}
          onClose={() => setModalDetalle(false)}
        />
      )}

      {modalCambiarEstado && solicitudSeleccionada && (
        <CambiarEstadoModal
          solicitud={solicitudSeleccionada}
          estados={estados}
          onClose={() => setModalCambiarEstado(false)}
          onEstadoCambiado={handleEstadoCambiado}
        />
      )}
    </div>
  );
};

export default SeguimientoPage;
