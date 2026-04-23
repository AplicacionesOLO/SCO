import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';

interface Props {
  nombreInicial: string;
  onCreado: (articulo: any) => void;
  onCerrar: () => void;
}

export default function CrearArticuloModal({ nombreInicial, onCreado, onCerrar }: Props) {
  const [formData, setFormData] = useState({
    codigo_articulo: '',
    descripcion_articulo: nombreInicial,
    cantidad_articulo: '0',
    costo_articulo: '0',
    ganancia_articulo: '0',
    categoria_id: '',
    unidad_base_id: '10'
  });
  const [categorias, setCategorias] = useState<any[]>([]);
  const [unidades, setUnidades] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { currentStore } = useAuth();

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    if (!currentStore?.id) return;
    const [categoriasRes, unidadesRes] = await Promise.all([
      supabase.from('categorias_inventario').select('*').eq('tienda_id', currentStore.id).order('nombre_categoria'),
      supabase.from('unidades_medida').select('*').eq('tienda_id', currentStore.id).order('nombre')
    ]);
    setCategorias(categoriasRes.data || []);
    setUnidades(unidadesRes.data || []);
  };

  const generarCodigo = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return `ART${timestamp}${random}`;
  };

  const validarFormulario = async () => {
    setError('');
    
    if (!formData.codigo_articulo.trim()) {
      setError('El código del artículo es requerido');
      return false;
    }
    
    if (!formData.descripcion_articulo.trim()) {
      setError('La descripción es requerida');
      return false;
    }
    
    if (!formData.categoria_id) {
      setError('La categoría es requerida');
      return false;
    }

    const costo = parseFloat(formData.costo_articulo);
    const ganancia = parseFloat(formData.ganancia_articulo);
    
    if (isNaN(costo) || costo < 0) {
      setError('El costo debe ser un número mayor o igual a 0');
      return false;
    }
    
    if (isNaN(ganancia) || ganancia < 0 || ganancia > 100) {
      setError('La ganancia debe ser entre 0 y 100%');
      return false;
    }

    // Verificar unicidad del código
    const { data: existente } = await supabase
      .from('inventario')
      .select('id_articulo')
      .ilike('codigo_articulo', formData.codigo_articulo.trim())
      .maybeSingle();

    if (existente) {
      setError('Ya existe un artículo con este código');
      return false;
    }

    return true;
  };

  const crearArticulo = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!(await validarFormulario())) return;
    
    setLoading(true);
    
    try {
      const costo = parseFloat(formData.costo_articulo);
      const ganancia = parseFloat(formData.ganancia_articulo);
      
      const datosArticulo = {
        codigo_articulo: formData.codigo_articulo.trim(),
        descripcion_articulo: formData.descripcion_articulo.trim(),
        cantidad_articulo: parseFloat(formData.cantidad_articulo),
        costo_articulo: costo,
        ganancia_articulo: ganancia,
        categoria_id: parseInt(formData.categoria_id),
        unidad_base_id: parseInt(formData.unidad_base_id),
        tienda_id: currentStore.id
      };

      const { data, error } = await supabase
        .from('inventario')
        .insert(datosArticulo)
        .select(`
          *,
          categoria:categorias_inventario(nombre_categoria),
          unidad:unidades_medida(nombre, simbolo)
        `)
        .maybeSingle();
      
      if (error) throw error;
      
      onCreado(data);
    } catch (err) {
      console.error('Error creando artículo:', err);
      setError('Error al crear el artículo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Crear Nuevo Artículo
            </h3>
            <button
              onClick={onCerrar}
              className="text-gray-400 hover:text-gray-600"
            >
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={crearArticulo} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código del Artículo *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.codigo_articulo}
                  onChange={(e) => setFormData({ ...formData, codigo_articulo: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: ART001"
                  required
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, codigo_articulo: generarCodigo() })}
                  className="bg-gray-100 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
                  title="Generar código automático"
                >
                  <i className="ri-refresh-line"></i>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción *
              </label>
              <input
                type="text"
                value={formData.descripcion_articulo}
                onChange={(e) => setFormData({ ...formData, descripcion_articulo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Descripción del artículo"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría *
              </label>
              <select
                value={formData.categoria_id}
                onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
                className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Seleccionar categoría</option>
                {categorias.map(cat => (
                  <option key={cat.id_categoria} value={cat.id_categoria}>{cat.nombre_categoria}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unidad Base *
              </label>
              <select
                value={formData.unidad_base_id}
                onChange={(e) => setFormData({ ...formData, unidad_base_id: e.target.value })}
                className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {unidades.map(unidad => (
                  <option key={unidad.id} value={unidad.id}>
                    {unidad.nombre} ({unidad.simbolo})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad Inicial
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={formData.cantidad_articulo}
                  onChange={(e) => setFormData({ ...formData, cantidad_articulo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Costo Unitario
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={formData.costo_articulo}
                  onChange={(e) => setFormData({ ...formData, costo_articulo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ganancia (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.ganancia_articulo}
                onChange={(e) => setFormData({ ...formData, ganancia_articulo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">
                Precio final: ${(parseFloat(formData.costo_articulo || '0') * (1 + parseFloat(formData.ganancia_articulo || '0') / 100)).toFixed(2)}
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {loading ? (
                  <>
                    <i className="ri-loader-line animate-spin mr-2"></i>
                    Creando...
                  </>
                ) : (
                  <>
                    <i className="ri-add-line mr-2"></i>
                    Crear Artículo
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onCerrar}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors whitespace-nowrap"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
