import React, { useState, useEffect } from 'react';
import { CotizacionesLayout } from './components/CotizacionesLayout';
import CotizacionForm from './components/CotizacionForm';
import { CotizacionesFilters } from './components/CotizacionesFilters';
import { CotizacionesTable } from './components/CotizacionesTable';
import { Cotizacion, CotizacionFilters as FilterType } from '../../types/cotizacion';
import { CotizacionService } from '../../services/cotizacionService';
import ConfirmationDialog from '../../components/base/ConfirmationDialog';

const CotizacionesPage: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingCotizacion, setEditingCotizacion] = useState<Cotizacion | null>(null);
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterType>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    cotizacionId: number | null;
  }>({
    isOpen: false,
    cotizacionId: null
  });

  // Cargar cotizaciones
  useEffect(() => {
    cargarCotizaciones();
  }, [filters, currentPage, itemsPerPage]);

  const cargarCotizaciones = async () => {
    try {
      setLoading(true);
      const data = await CotizacionService.obtenerCotizaciones(filters);
      setCotizaciones(data);
    } catch (error) {
      console.error('Error cargando cotizaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar cotizaciones en tiempo real
  const cotizacionesFiltradas = cotizaciones.filter(cotizacion => {
    let cumpleFiltros = true;

    // Búsqueda general
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      cumpleFiltros = cumpleFiltros && (
        cotizacion.numero?.toString().includes(searchTerm) ||
        cotizacion.codigo?.toLowerCase().includes(searchTerm) ||
        cotizacion.clientes?.nombre_razon_social?.toLowerCase().includes(searchTerm) ||
        cotizacion.clientes?.identificacion?.toLowerCase().includes(searchTerm) ||
        cotizacion.descripcion?.toLowerCase().includes(searchTerm) ||
        cotizacion.observaciones?.toLowerCase().includes(searchTerm)
      );
    }

    // Filtro por cliente
    if (filters.cliente_id) {
      cumpleFiltros = cumpleFiltros && cotizacion.cliente_id?.toString() === filters.cliente_id;
    }

    // Filtro por estado
    if (filters.estado) {
      cumpleFiltros = cumpleFiltros && cotizacion.estado === filters.estado;
    }

    // Filtro por moneda
    if (filters.moneda) {
      cumpleFiltros = cumpleFiltros && cotizacion.moneda === filters.moneda;
    }

    // Filtro por fecha desde
    if (filters.fecha_desde) {
      cumpleFiltros = cumpleFiltros && new Date(cotizacion.fecha_emision) >= new Date(filters.fecha_desde);
    }

    // Filtro por fecha hasta
    if (filters.fecha_hasta) {
      cumpleFiltros = cumpleFiltros && new Date(cotizacion.fecha_emision) <= new Date(filters.fecha_hasta);
    }

    return cumpleFiltros;
  });

  // Paginación
  const totalItems = cotizacionesFiltradas.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const cotizacionesPaginadas = cotizacionesFiltradas.slice(startIndex, endIndex);

  // Estadísticas
  const stats = {
    total: cotizacionesFiltradas.length,
    borradores: cotizacionesFiltradas.filter(c => c.estado === 'borrador').length,
    enviadas: cotizacionesFiltradas.filter(c => c.estado === 'enviada').length,
    aceptadas: cotizacionesFiltradas.filter(c => c.estado === 'aceptada').length,
    rechazadas: cotizacionesFiltradas.filter(c => c.estado === 'rechazada').length,
  };

  const handleFormSubmit = async (values: Cotizacion) => {
    try {
      if (editingCotizacion) {
        await CotizacionService.actualizarCotizacion(editingCotizacion.id!, values);
      } else {
        await CotizacionService.crearCotizacion(values);
      }
      await cargarCotizaciones();
    } catch (error) {
      console.error('Error guardando cotización:', error);
    } finally {
      setShowForm(false);
      setEditingCotizacion(null);
    }
  };

  const handleEditar = (cotizacion: Cotizacion) => {
    setEditingCotizacion(cotizacion);
    setShowForm(true);
  };

  const handleEliminar = async (id: number) => {
    setConfirmDialog({
      isOpen: true,
      cotizacionId: id
    });
  };

  const confirmarEliminar = async () => {
    if (confirmDialog.cotizacionId) {
      try {
        await CotizacionService.eliminarCotizacion(confirmDialog.cotizacionId);
        await cargarCotizaciones();
      } catch (error) {
        console.error('Error eliminando cotización:', error);
      } finally {
        setConfirmDialog({ isOpen: false, cotizacionId: null });
      }
    }
  };

  const cancelarEliminar = () => {
    setConfirmDialog({ isOpen: false, cotizacionId: null });
  };

  const handleDuplicar = async (id: number) => {
    try {
      await CotizacionService.duplicarCotizacion(id);
      await cargarCotizaciones();
    } catch (error) {
      console.error('Error duplicando cotización:', error);
    }
  };

  const handleCambiarEstado = async (id: number, nuevoEstado: string) => {
    try {
      await CotizacionService.cambiarEstado(id, nuevoEstado);
      await cargarCotizaciones();
    } catch (error) {
      console.error('Error cambiando estado:', error);
    }
  };

  const handleFiltersChange = (newFilters: FilterType) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset a la primera página al cambiar filtros
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  return (
    <CotizacionesLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cotizaciones</h1>
            <p className="text-gray-600">Gestiona las cotizaciones de tu empresa</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center justify-center whitespace-nowrap"
          >
            <i className="ri-add-line mr-2"></i>
            Nueva Cotización
          </button>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <i className="ri-file-list-3-line text-blue-600"></i>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-lg font-semibold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 rounded-lg">
                <i className="ri-draft-line text-gray-600"></i>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Borradores</p>
                <p className="text-lg font-semibold text-gray-900">{stats.borradores}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <i className="ri-send-plane-line text-blue-600"></i>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Enviadas</p>
                <p className="text-lg font-semibold text-gray-900">{stats.enviadas}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <i className="ri-check-line text-green-600"></i>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Aceptadas</p>
                <p className="text-lg font-semibold text-gray-900">{stats.aceptadas}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <i className="ri-close-line text-red-600"></i>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Rechazadas</p>
                <p className="text-lg font-semibold text-gray-900">{stats.rechazadas}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <CotizacionesFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />

        {/* Controles de paginación superiores */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-700">
              Mostrando {startIndex + 1} - {Math.min(endIndex, totalItems)} de {totalItems} cotizaciones
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">Mostrar:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="ri-skip-back-line"></i>
                </button>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="ri-arrow-left-s-line"></i>
                </button>
                
                {/* Páginas numeradas */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  if (pageNum <= totalPages) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-1 text-sm border rounded ${
                          currentPage === pageNum
                            ? 'bg-teal-600 text-white border-teal-600'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  return null;
                })}
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="ri-arrow-right-s-line"></i>
                </button>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="ri-skip-forward-line"></i>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tabla */}
        <CotizacionesTable
          cotizaciones={cotizacionesPaginadas}
          loading={loading}
          onEditar={handleEditar}
          onEliminar={handleEliminar}
          onDuplicar={handleDuplicar}
          onCambiarEstado={handleCambiarEstado}
          onDescargarPDF={() => {}}
        />

        {/* Controles de paginación inferiores */}
        {totalPages > 1 && (
          <div className="flex justify-center">
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm border border-gray-300 rounded-l hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Primera
              </button>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm border-t border-b border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              
              <span className="px-4 py-2 text-sm border-t border-b border-gray-300 bg-gray-50">
                Página {currentPage} de {totalPages}
              </span>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm border-t border-b border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm border border-gray-300 rounded-r hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Última
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de formulario */}
      {showForm && (
        <CotizacionForm
          cotizacion={editingCotizacion}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingCotizacion(null);
          }}
          isOpen={showForm}
        />
      )}

      {/* Modal de confirmación de eliminación */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        type="danger"
        title="Eliminar Cotización"
        message="¿Está seguro de que desea eliminar esta cotización? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={confirmarEliminar}
        onCancel={cancelarEliminar}
      />
    </CotizacionesLayout>
  );
};

export default CotizacionesPage;
