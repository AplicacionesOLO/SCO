import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { usePermissions } from '../../../hooks/usePermissions';
import TiendaForm from './TiendaForm';
import { showAlert } from '../../../utils/dialog';

interface Tienda {
  id: string;
  nombre: string;
  codigo: string;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

interface DeleteConfirm {
  open: boolean;
  tienda: Tienda | null;
}

export function TiendasTab() {
  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTienda, setEditingTienda] = useState<Tienda | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActivo, setFilterActivo] = useState<'all' | 'active' | 'inactive'>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm>({ open: false, tienda: null });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const { hasPermission, isAdmin } = usePermissions();
  const canCreate = isAdmin || hasPermission('tiendas:create');
  const canEdit   = isAdmin || hasPermission('tiendas:edit');
  const canDelete = isAdmin || hasPermission('tiendas:delete');

  const cargarTiendas = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tiendas')
        .select('*')
        .order('nombre');

      if (error) throw error;
      setTiendas(data || []);
    } catch (err) {
      console.error('Error cargando tiendas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarTiendas();
  }, [cargarTiendas]);

  const handleEdit = (tienda: Tienda) => {
    setEditingTienda(tienda);
    setShowForm(true);
  };

  const handleNew = () => {
    setEditingTienda(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    setShowForm(false);
    setEditingTienda(null);
    await cargarTiendas();
    setSuccessMsg(editingTienda ? 'Tienda actualizada correctamente' : 'Tienda creada correctamente');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const confirmDelete = (tienda: Tienda) => {
    setDeleteConfirm({ open: true, tienda });
  };

  const handleDelete = async () => {
    if (!deleteConfirm.tienda) return;
    setDeleteLoading(true);

    try {
      const { data: asignaciones } = await supabase
        .from('usuario_tiendas')
        .select('id')
        .eq('tienda_id', deleteConfirm.tienda.id)
        .eq('activo', true)
        .limit(1);

      if (asignaciones && asignaciones.length > 0) {
        setDeleteConfirm({ open: false, tienda: null });
        showAlert('No se puede eliminar esta tienda porque tiene usuarios asignados activos.', { type: 'warning' });
        return;
      }

      const { error } = await supabase
        .from('tiendas')
        .delete()
        .eq('id', deleteConfirm.tienda.id);

      if (error) throw error;

      setDeleteConfirm({ open: false, tienda: null });
      await cargarTiendas();
      setSuccessMsg('Tienda eliminada correctamente');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      console.error('Error eliminando tienda:', err);
      showAlert(err.message || 'Error al eliminar la tienda', { type: 'error' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const tiendsFiltradas = tiendas.filter(t => {
    const matchSearch =
      t.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.email && t.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchActivo =
      filterActivo === 'all' ||
      (filterActivo === 'active' && t.activo) ||
      (filterActivo === 'inactive' && !t.activo);

    return matchSearch && matchActivo;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mensaje de éxito */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg flex items-center">
          <i className="ri-checkbox-circle-line mr-2 text-emerald-600"></i>
          {successMsg}
        </div>
      )}

      {/* Filtros y acciones */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 max-w-2xl">
          {/* Búsqueda */}
          <div className="relative flex-1">
            <div className="w-9 h-9 absolute left-0 top-0 flex items-center justify-center pointer-events-none">
              <i className="ri-search-line text-gray-400 text-sm"></i>
            </div>
            <input
              type="text"
              placeholder="Buscar por nombre, código o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
            />
          </div>
          {/* Filtro estado */}
          <select
            value={filterActivo}
            onChange={(e) => setFilterActivo(e.target.value as 'all' | 'active' | 'inactive')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm cursor-pointer"
          >
            <option value="all">Todas</option>
            <option value="active">Activas</option>
            <option value="inactive">Inactivas</option>
          </select>
        </div>

        {canCreate && (
          <button
            onClick={handleNew}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap flex items-center cursor-pointer"
          >
            <i className="ri-add-line mr-2"></i>
            Nueva Tienda
          </button>
        )}
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{tiendas.length}</div>
          <div className="text-xs text-gray-500 mt-1">Total tiendas</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-emerald-600">{tiendas.filter(t => t.activo).length}</div>
          <div className="text-xs text-gray-500 mt-1">Activas</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-400">{tiendas.filter(t => !t.activo).length}</div>
          <div className="text-xs text-gray-500 mt-1">Inactivas</div>
        </div>
      </div>

      {/* Tabla */}
      {tiendsFiltradas.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Tienda
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                    Contacto
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                    Dirección
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tiendsFiltradas.map((tienda) => (
                  <tr key={tienda.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <div className="w-9 h-9 flex items-center justify-center bg-emerald-100 rounded-lg mr-3 flex-shrink-0">
                          <i className="ri-store-2-line text-emerald-600 text-base"></i>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{tienda.nombre}</div>
                          <div className="text-xs text-gray-500">
                            Creada {new Date(tienda.created_at).toLocaleDateString('es-CR')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded">
                        {tienda.codigo}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="space-y-1">
                        {tienda.telefono && (
                          <div className="flex items-center text-gray-600 text-xs">
                            <i className="ri-phone-line mr-1.5 text-gray-400"></i>
                            {tienda.telefono}
                          </div>
                        )}
                        {tienda.email && (
                          <div className="flex items-center text-gray-600 text-xs">
                            <i className="ri-mail-line mr-1.5 text-gray-400"></i>
                            {tienda.email}
                          </div>
                        )}
                        {!tienda.telefono && !tienda.email && (
                          <span className="text-gray-400 text-xs">Sin contacto</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-gray-600 text-xs line-clamp-2">
                        {tienda.direccion || <span className="text-gray-400">Sin dirección</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        tienda.activo
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                          tienda.activo ? 'bg-emerald-500' : 'bg-gray-400'
                        }`} />
                        {tienda.activo ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {canEdit && (
                          <button
                            onClick={() => handleEdit(tienda)}
                            title="Editar tienda"
                            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                          >
                            <i className="ri-edit-line"></i>
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => confirmDelete(tienda)}
                            title="Eliminar tienda"
                            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                          >
                            <i className="ri-delete-bin-line"></i>
                          </button>
                        )}
                        {!canEdit && !canDelete && (
                          <span className="text-xs text-gray-400">Sin acceso</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg text-center py-16">
          <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded-full mx-auto mb-4">
            <i className="ri-store-2-line text-gray-400 text-2xl"></i>
          </div>
          <h3 className="text-base font-medium text-gray-900 mb-1">
            {searchTerm || filterActivo !== 'all' ? 'Sin resultados' : 'No hay tiendas registradas'}
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            {searchTerm || filterActivo !== 'all'
              ? 'Intenta con otros filtros de búsqueda'
              : 'Crea la primera tienda para comenzar'}
          </p>
          {canCreate && !searchTerm && filterActivo === 'all' && (
            <button
              onClick={handleNew}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium cursor-pointer whitespace-nowrap"
            >
              <i className="ri-add-line mr-2"></i>
              Crear primera tienda
            </button>
          )}
        </div>
      )}

      {/* Modal Form */}
      {showForm && (
        <TiendaForm
          tienda={editingTienda}
          onClose={() => {
            setShowForm(false);
            setEditingTienda(null);
          }}
          onSave={handleSave}
        />
      )}

      {/* Modal confirmación eliminar */}
      {deleteConfirm.open && deleteConfirm.tienda && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm mx-4">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 flex items-center justify-center bg-red-100 rounded-full mr-3">
                <i className="ri-delete-bin-line text-red-600"></i>
              </div>
              <h3 className="text-base font-semibold text-gray-900">Eliminar Tienda</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              ¿Estás seguro que deseas eliminar la tienda{' '}
              <strong>{deleteConfirm.tienda.nombre}</strong> ({deleteConfirm.tienda.codigo})?
            </p>
            <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-md mb-5">
              Esta acción no se puede deshacer. Si hay usuarios asignados activos a esta tienda, no podrá eliminarse.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm({ open: false, tienda: null })}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md whitespace-nowrap cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50 whitespace-nowrap cursor-pointer flex items-center"
              >
                {deleteLoading ? (
                  <>
                    <i className="ri-loader-4-line animate-spin mr-2"></i>
                    Eliminando...
                  </>
                ) : (
                  <>
                    <i className="ri-delete-bin-line mr-2"></i>
                    Eliminar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
