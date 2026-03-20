import { useState } from 'react';
import { InventarioLayout } from './components/InventarioLayout';
import InventarioFilters from './components/InventarioFilters';
import InventarioTable from './components/InventarioTable';
import InventarioForm from './components/InventarioForm';
import ImportarInventario from './components/ImportarInventario';
import CategoriasInventarioManager from './components/CategoriasInventarioManager';
import UnidadesMedidaManager from './components/UnidadesMedidaManager';

interface Articulo {
  id_articulo: number;
  codigo_articulo: string;
  descripcion_articulo: string;
  cantidad_articulo: number;
  costo_articulo: number;
  ganancia_articulo: number;
  precio_articulo: number;
  categoria_id: number;
  activo: boolean;
}

export default function InventarioPage() {
  const [vistaActual, setVistaActual] = useState<'inventario' | 'categorias' | 'importar' | 'unidades'>('inventario');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState('codigo_articulo');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [articuloEditando, setArticuloEditando] = useState<Articulo | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleNuevoArticulo = () => {
    setArticuloEditando(null);
    setMostrarFormulario(true);
  };

  const handleEditarArticulo = (articulo: Articulo) => {
    setArticuloEditando(articulo);
    setMostrarFormulario(true);
  };

  const handleGuardarArticulo = () => {
    setMostrarFormulario(false);
    setArticuloEditando(null);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleCancelarFormulario = () => {
    setMostrarFormulario(false);
    setArticuloEditando(null);
  };

  const renderContent = () => {
    switch (vistaActual) {
      case 'inventario':
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
                <p className="text-gray-600">Gestión de artículos y stock</p>
              </div>
              <button
                onClick={handleNuevoArticulo}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer"
              >
                <i className="ri-add-line mr-2"></i>
                Nuevo Artículo
              </button>
            </div>

            {/* Filtros */}
            <InventarioFilters
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              selectedCategoria={selectedCategoria}
              onCategoriaChange={setSelectedCategoria}
              sortBy={sortBy}
              onSortByChange={setSortBy}
              sortOrder={sortOrder}
              onSortOrderChange={setSortOrder}
            />

            {/* Tabla */}
            <InventarioTable
              searchTerm={searchTerm}
              selectedCategoria={selectedCategoria}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onEditar={handleEditarArticulo}
              refreshTrigger={refreshTrigger}
            />
          </div>
        );

      case 'categorias':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Categorías de Inventario</h1>
              <p className="text-gray-600">Gestión de categorías para artículos</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border">
              <CategoriasInventarioManager onClose={() => setVistaActual('inventario')} />
            </div>
          </div>
        );

      case 'importar':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Importar Inventario</h1>
              <p className="text-gray-600">Importación masiva desde Excel</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <ImportarInventario />
            </div>
          </div>
        );

      case 'unidades':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Unidades de Medida</h1>
              <p className="text-gray-600">Gestión de unidades para artículos del inventario</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <UnidadesMedidaManager />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <InventarioLayout vistaActual={vistaActual} onCambiarVista={setVistaActual}>
      {renderContent()}

      {/* Modal de formulario */}
      {mostrarFormulario && (
        <InventarioForm
          articulo={articuloEditando}
          onSave={handleGuardarArticulo}
          onCancel={handleCancelarFormulario}
        />
      )}
    </InventarioLayout>
  );
}
