import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/feature/Sidebar';
import TopBar from '../../components/feature/TopBar';
import CorrespondenciaLayout from './components/CorrespondenciaLayout';
import PlantillasTab from './components/PlantillasTab';
import ReglasTab from './components/ReglasTab';
import HistorialTab from './components/HistorialTab';
import PlantillaModal from './components/PlantillaModal';
import ReglaModal from './components/ReglaModal';
import EnvioManualModal from './components/EnvioManualModal';
import { correspondenciaService } from '../../services/correspondenciaService';
import { showConfirm, showAlert } from '../../utils/dialog';
import type {
  CorrespondenciaPlantilla,
  CorrespondenciaRegla,
  CorrespondenciaHistorial,
  CorrespondenciaStats,
  CreatePlantillaData,
  CreateReglaData,
  HistorialFiltros,
  EnvioManualPayload,
} from '../../types/correspondencia';

type Tab = 'plantillas' | 'reglas' | 'historial';

export default function CorrespondenciaPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('plantillas');

  const [plantillas, setPlantillas] = useState<CorrespondenciaPlantilla[]>([]);
  const [reglas, setReglas] = useState<CorrespondenciaRegla[]>([]);
  const [historial, setHistorial] = useState<CorrespondenciaHistorial[]>([]);
  const [stats, setStats] = useState<CorrespondenciaStats | null>(null);

  const [loadingPlantillas, setLoadingPlantillas] = useState(false);
  const [loadingReglas, setLoadingReglas] = useState(false);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  const [showPlantillaModal, setShowPlantillaModal] = useState(false);
  const [showReglaModal, setShowReglaModal] = useState(false);
  const [showEnvioModal, setShowEnvioModal] = useState(false);

  const [selectedPlantilla, setSelectedPlantilla] = useState<CorrespondenciaPlantilla | null>(null);
  const [selectedRegla, setSelectedRegla] = useState<CorrespondenciaRegla | null>(null);

  const [historialFiltros, setHistorialFiltros] = useState<HistorialFiltros>({ estado: '', fecha_desde: '', fecha_hasta: '', busqueda: '' });

  const cargarPlantillas = useCallback(async () => {
    setLoadingPlantillas(true);
    try { setPlantillas(await correspondenciaService.getPlantillas()); }
    catch (e) { console.error(e); } finally { setLoadingPlantillas(false); }
  }, []);

  const cargarReglas = useCallback(async () => {
    setLoadingReglas(true);
    try { setReglas(await correspondenciaService.getReglas()); }
    catch (e) { console.error(e); } finally { setLoadingReglas(false); }
  }, []);

  const cargarHistorial = useCallback(async () => {
    setLoadingHistorial(true);
    try { setHistorial(await correspondenciaService.getHistorial(historialFiltros)); }
    catch (e) { console.error(e); } finally { setLoadingHistorial(false); }
  }, [historialFiltros]);

  const cargarStats = useCallback(async () => {
    try { setStats(await correspondenciaService.getStats()); } catch { /* ignore */ }
  }, []);

  useEffect(() => { cargarPlantillas(); cargarReglas(); cargarStats(); }, [cargarPlantillas, cargarReglas, cargarStats]);
  useEffect(() => { if (activeTab === 'historial') cargarHistorial(); }, [activeTab, cargarHistorial]);

  // Plantillas CRUD
  const handleSavePlantilla = async (data: CreatePlantillaData) => {
    if (selectedPlantilla) {
      await correspondenciaService.updatePlantilla(selectedPlantilla.id, data);
    } else {
      await correspondenciaService.createPlantilla(data);
    }
    setShowPlantillaModal(false);
    setSelectedPlantilla(null);
    await cargarPlantillas();
  };

  const handleTogglePlantilla = async (p: CorrespondenciaPlantilla) => {
    await correspondenciaService.togglePlantilla(p.id, !p.activo);
    await cargarPlantillas();
  };

  const handleEliminarPlantilla = async (p: CorrespondenciaPlantilla) => {
    if (!(await showConfirm(`¿Eliminar la plantilla "${p.nombre}"?`, { type: 'danger', title: 'Eliminar plantilla' }))) return;
    try {
      await correspondenciaService.deletePlantilla(p.id);
      await cargarPlantillas();
    } catch { showAlert('No se puede eliminar: puede estar en uso por alguna regla.'); }
  };

  // Reglas CRUD
  const handleSaveRegla = async (data: CreateReglaData) => {
    if (selectedRegla) {
      await correspondenciaService.updateRegla(selectedRegla.id, data);
    } else {
      await correspondenciaService.createRegla(data);
    }
    setShowReglaModal(false);
    setSelectedRegla(null);
    await cargarReglas();
  };

  const handleToggleRegla = async (r: CorrespondenciaRegla) => {
    await correspondenciaService.toggleRegla(r.id, !r.activo);
    await cargarReglas();
  };

  const handleEliminarRegla = async (r: CorrespondenciaRegla) => {
    if (!(await showConfirm(`¿Eliminar la regla "${r.nombre}"?`, { type: 'danger', title: 'Eliminar regla' }))) return;
    await correspondenciaService.deleteRegla(r.id);
    await cargarReglas();
  };

  // Envío
  const handleEnvioManual = async (payload: EnvioManualPayload) => {
    const result = await correspondenciaService.enviarCorreo(payload);
    if (!result.success) throw new Error(result.error ?? 'Error desconocido');
    await cargarStats();
    if (activeTab === 'historial') await cargarHistorial();
  };

  const handleReintentar = async (id: number) => {
    try {
      await correspondenciaService.reintentarEnvio(id);
      showAlert('Reintento procesado.');
      await cargarHistorial();
      await cargarStats();
    } catch { showAlert('Error al reintentar envío.'); }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <CorrespondenciaLayout
          activeTab={activeTab}
          onTabChange={setActiveTab}
          stats={stats}
          onNuevoEnvio={() => setShowEnvioModal(true)}
        >
          {activeTab === 'plantillas' && (
            <PlantillasTab
              plantillas={plantillas}
              loading={loadingPlantillas}
              onNueva={() => { setSelectedPlantilla(null); setShowPlantillaModal(true); }}
              onEditar={(p) => { setSelectedPlantilla(p); setShowPlantillaModal(true); }}
              onToggle={handleTogglePlantilla}
              onEliminar={handleEliminarPlantilla}
            />
          )}
          {activeTab === 'reglas' && (
            <ReglasTab
              reglas={reglas}
              loading={loadingReglas}
              onNueva={() => { setSelectedRegla(null); setShowReglaModal(true); }}
              onEditar={(r) => { setSelectedRegla(r); setShowReglaModal(true); }}
              onToggle={handleToggleRegla}
              onEliminar={handleEliminarRegla}
            />
          )}
          {activeTab === 'historial' && (
            <HistorialTab
              historial={historial}
              loading={loadingHistorial}
              filtros={historialFiltros}
              onFiltrosChange={(f) => setHistorialFiltros(f)}
              onReintentar={handleReintentar}
              onVerDetalle={() => {}}
            />
          )}
        </CorrespondenciaLayout>
      </div>

      {showPlantillaModal && (
        <PlantillaModal
          plantilla={selectedPlantilla}
          onClose={() => { setShowPlantillaModal(false); setSelectedPlantilla(null); }}
          onSave={handleSavePlantilla}
        />
      )}

      {showReglaModal && (
        <ReglaModal
          regla={selectedRegla}
          plantillas={plantillas}
          onClose={() => { setShowReglaModal(false); setSelectedRegla(null); }}
          onSave={handleSaveRegla}
        />
      )}

      {showEnvioModal && (
        <EnvioManualModal
          plantillas={plantillas}
          onClose={() => setShowEnvioModal(false)}
          onEnviar={handleEnvioManual}
        />
      )}
    </div>
  );
}
