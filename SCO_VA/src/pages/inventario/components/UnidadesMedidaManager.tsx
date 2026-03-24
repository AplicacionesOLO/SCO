import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { showAlert, showConfirm } from '../../../utils/dialog';

interface UnidadMedida {
  id: number;
  nombre: string;
  simbolo: string;
  factor_base: number;
  grupo: string;
  created_at: string;
  tienda_id: string;
}

const GRUPOS = ['longitud', 'masa', 'tiempo', 'unitario', 'volumen', 'area', 'otro'];

export default function UnidadesMedidaManager() {
  const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUnidad, setEditingUnidad] = useState<UnidadMedida | null>(null);
  const [formData, setFormData] = useState({ nombre: '', simbolo: '', factor_base: '1', grupo: 'unitario' });
  const [error, setError] = useState('');
  const [filterGrupo, setFilterGrupo] = useState<string>('all');
  const { currentStore } = useAuth();

  useEffect(() => {
    if (currentStore?.id) cargarUnidades();
  }, [currentStore]);

  const cargarUnidades = async () => {
    if (!currentStore?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('unidades_medida')
        .select('*')
        .eq('tienda_id', currentStore.id)
        .order('grupo, nombre');
      if (error) throw error;
      setUnidades(data || []);
    } catch (err) {
      console.error('Error cargando unidades:', err);
    } finally {
      setLoading(false);
    }
  };

  const guardarUnidad = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!currentStore?.id) { setError('No hay tienda seleccionada'); return; }

    const nombre = formData.nombre.trim();
    const simbolo = formData.simbolo.trim();
    if (!nombre) { setError('El nombre es requerido'); return; }
    if (!simbolo) { setError('El símbolo es requerido'); return; }
    const factor = parseFloat(formData.factor_base);
    if (isNaN(factor) || factor <= 0) { setError('El factor base debe ser mayor a 0'); return; }

    // Verificar nombre único en la tienda
    const { data: existente } = await supabase
      .from('unidades_medida')
      .select('id')
      .eq('tienda_id', currentStore.id)
      .ilike('nombre', nombre)
      .neq('id', editingUnidad?.id || 0);
    if (existente && existente.length > 0) { setError('Ya existe una unidad con este nombre'); return; }

    try {
      if (editingUnidad) {
        const { error } = await supabase
          .from('unidades_medida')
          .update({ nombre, simbolo, factor_base: factor, grupo: formData.grupo })
          .eq('id', editingUnidad.id);
        if (error) throw error;
        showAlert('Unidad actualizada correctamente');
      } else {
        const { error } = await supabase
          .from('unidades_medida')
          .insert({ nombre, simbolo, factor_base: factor, grupo: formData.grupo, tienda_id: currentStore.id });
        if (error) throw error;
        showAlert('Unidad creada correctamente');
      }
      await cargarUnidades();
      cerrarForm();
    } catch (err: any) {
      console.error('Error guardando unidad:', err);
      if (err?.code === '23505') {
        setError('Ya existe una unidad con ese nombre. Usa un nombre diferente.');
      } else {
        setError('Error al guardar la unidad de medida');
      }
    }
  };

  const eliminarUnidad = async (unidad: UnidadMedida) => {
    const ok = await showConfirm(`¿Eliminar la unidad "${unidad.nombre}"? Esta acción no se puede deshacer.`);
    if (!ok) return;
    try {
      const { error } = await supabase.from('unidades_medida').delete().eq('id', unidad.id);
      if (error) {
        if (error.message.includes('foreign key') || error.message.includes('violates')) {
          showAlert('No se puede eliminar: esta unidad está siendo usada en artículos del inventario.');
        } else {
          throw error;
        }
        return;
      }
      await cargarUnidades();
    } catch (err) {
      console.error('Error eliminando unidad:', err);
      showAlert('Error al eliminar la unidad de medida');
    }
  };

  const editarUnidad = (unidad: UnidadMedida) => {
    setEditingUnidad(unidad);
    setFormData({ nombre: unidad.nombre, simbolo: unidad.simbolo, factor_base: unidad.factor_base.toString(), grupo: unidad.grupo });
    setShowForm(true);
  };

  const cerrarForm = () => {
    setShowForm(false);
    setEditingUnidad(null);
    setFormData({ nombre: '', simbolo: '', factor_base: '1', grupo: 'unitario' });
    setError('');
  };

  const unidadesFiltradas = filterGrupo === 'all' ? unidades : unidades.filter(u => u.grupo === filterGrupo);
  const gruposConUnidades = [...new Set(unidades.map(u => u.grupo))];

  const grupoColor: Record<string, string> = {
    longitud: 'bg-sky-100 text-sky-700',
    masa: 'bg-amber-100 text-amber-700',
    tiempo: 'bg-violet-100 text-violet-700',
    unitario: 'bg-emerald-100 text-emerald-700',
    volumen: 'bg-orange-100 text-orange-700',
    area: 'bg-rose-100 text-rose-700',
    otro: 'bg-gray-100 text-gray-700',
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-700"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Unidades de Medida</h2>
          <p className="text-sm text-gray-500 mt-0.5">{unidades.length} unidades registradas para esta tienda</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2"
        >
          <i className="ri-add-line"></i>
          Nueva Unidad
        </button>
      </div>

      {/* Filtro por grupo */}
      {gruposConUnidades.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterGrupo('all')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${filterGrupo === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Todos
          </button>
          {gruposConUnidades.map(g => (
            <button
              key={g}
              onClick={() => setFilterGrupo(g)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap capitalize ${filterGrupo === g ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {/* Modal Formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingUnidad ? 'Editar Unidad' : 'Nueva Unidad de Medida'}
              </h3>
              <button onClick={cerrarForm} className="text-gray-400 hover:text-gray-600 cursor-pointer w-8 h-8 flex items-center justify-center">
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                <i className="ri-error-warning-line mr-2"></i>{error}
              </div>
            )}

            <form onSubmit={guardarUnidad} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm"
                  placeholder="Ej: Metros"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Símbolo *</label>
                  <input
                    type="text"
                    value={formData.simbolo}
                    onChange={(e) => setFormData({ ...formData, simbolo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm"
                    placeholder="Ej: m"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Factor Base *</label>
                  <input
                    type="number"
                    step="0.000001"
                    min="0.000001"
                    value={formData.factor_base}
                    onChange={(e) => setFormData({ ...formData, factor_base: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grupo *</label>
                <select
                  value={formData.grupo}
                  onChange={(e) => setFormData({ ...formData, grupo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm cursor-pointer"
                >
                  {GRUPOS.map(g => (
                    <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-gray-900 text-white py-2 rounded-lg hover:bg-gray-800 transition-colors whitespace-nowrap cursor-pointer text-sm font-medium">
                  {editingUnidad ? 'Actualizar' : 'Crear Unidad'}
                </button>
                <button type="button" onClick={cerrarForm} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap cursor-pointer text-sm">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {unidadesFiltradas.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <i className="ri-ruler-line text-4xl text-gray-300"></i>
            </div>
            <h3 className="text-base font-medium text-gray-900 mb-1">No hay unidades</h3>
            <p className="text-sm text-gray-500 mb-4">Crea la primera unidad de medida para esta tienda</p>
            <button onClick={() => setShowForm(true)} className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm cursor-pointer hover:bg-gray-800 transition-colors whitespace-nowrap">
              Crear Unidad
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Símbolo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grupo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Factor Base</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creada</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {unidadesFiltradas.map((unidad) => (
                  <tr key={unidad.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{unidad.nombre}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-gray-100 text-gray-700 text-sm font-mono font-medium">
                        {unidad.simbolo}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${grupoColor[unidad.grupo] || 'bg-gray-100 text-gray-700'}`}>
                        {unidad.grupo}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {unidad.factor_base}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(unidad.created_at).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => editarUnidad(unidad)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer" title="Editar">
                          <i className="ri-edit-line"></i>
                        </button>
                        <button onClick={() => eliminarUnidad(unidad)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer" title="Eliminar">
                          <i className="ri-delete-bin-line"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
