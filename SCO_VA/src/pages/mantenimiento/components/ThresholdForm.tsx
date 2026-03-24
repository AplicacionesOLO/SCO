import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { showAlert } from '../../../utils/dialog';

interface ThresholdFormProps {
  threshold?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ThresholdForm({ threshold, onClose, onSuccess }: ThresholdFormProps) {
  const [loading, setLoading] = useState(false);
  const [articulosDisponibles, setArticulosDisponibles] = useState<any[]>([]);
  const [busquedaArticulo, setBusquedaArticulo] = useState('');
  const [mostrarListaArticulos, setMostrarListaArticulos] = useState(false);
  const [articuloSeleccionado, setArticuloSeleccionado] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    articulo_id: '',
    min_qty: 0,
    max_qty: 0,
    safety_stock: 0,
    lead_time_dias: 7,
    lote_minimo: 1,
    activo: true
  });

  useEffect(() => {
    if (threshold) {
      // Modo edición - cargar datos del threshold existente
      setFormData({
        articulo_id: threshold.articulo_id || '',
        min_qty: threshold.min_qty || 0,
        max_qty: threshold.max_qty || 0,
        safety_stock: threshold.safety_stock || 0,
        lead_time_dias: threshold.lead_time_dias || 7,
        lote_minimo: threshold.lote_minimo || 1,
        activo: threshold.activo !== false
      });

      // Si hay información del artículo, configurarla
      if (threshold.inventario) {
        setArticuloSeleccionado(threshold.inventario);
        setBusquedaArticulo(threshold.inventario.descripcion_articulo);
      }
    } else {
      // Modo creación - cargar artículos disponibles
      cargarArticulosDisponibles();
    }
  }, [threshold]);

  const cargarArticulosDisponibles = async () => {
    try {
      // Obtener artículos que NO tienen umbrales configurados
      const { data: articulosConUmbrales } = await supabase
        .from('inventario_thresholds')
        .select('articulo_id')
        .eq('activo', true);

      const idsConUmbrales = articulosConUmbrales?.map(t => t.articulo_id) || [];

      let query = supabase
        .from('inventario')
        .select('id_articulo, codigo_articulo, descripcion_articulo, categoria_id')
        .eq('activo', true)
        .order('descripcion_articulo');

      // Excluir artículos que ya tienen umbrales
      if (idsConUmbrales.length > 0) {
        query = query.not('id_articulo', 'in', `(${idsConUmbrales.join(',')})`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setArticulosDisponibles(data || []);
    } catch (error) {
      console.error('Error cargando artículos disponibles:', error);
    }
  };

  const filtrarArticulos = (busqueda: string) => {
    setBusquedaArticulo(busqueda);
    
    if (busqueda.length === 0) {
      setMostrarListaArticulos(false);
      setArticuloSeleccionado(null);
      setFormData(prev => ({ ...prev, articulo_id: '' }));
      return;
    }

    const filtrados = articulosDisponibles.filter(articulo =>
      articulo.descripcion_articulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      articulo.codigo_articulo.toLowerCase().includes(busqueda.toLowerCase())
    );

    setMostrarListaArticulos(filtrados.length > 0 && busqueda.length > 0);
  };

  const seleccionarArticulo = (articulo: any) => {
    setArticuloSeleccionado(articulo);
    setBusquedaArticulo(articulo.descripcion_articulo);
    setMostrarListaArticulos(false);
    setFormData(prev => ({ ...prev, articulo_id: articulo.id_articulo }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!threshold && !formData.articulo_id) {
      showAlert('Por favor seleccione un artículo');
      return;
    }

    if (formData.min_qty <= 0) {
      showAlert('La cantidad mínima debe ser mayor a 0');
      return;
    }

    if (formData.max_qty <= formData.min_qty) {
      showAlert('La cantidad máxima debe ser mayor a la mínima');
      return;
    }

    if (formData.safety_stock < 0) {
      showAlert('El stock de seguridad no puede ser negativo');
      return;
    }

    if (formData.lead_time_dias <= 0) {
      showAlert('El tiempo de entrega debe ser mayor a 0');
      return;
    }

    if (formData.lote_minimo <= 0) {
      showAlert('El lote mínimo debe ser mayor a 0');
      return;
    }

    setLoading(true);

    try {
      if (threshold) {
        // Actualizar threshold existente
        await actualizarThreshold();
      } else {
        // Crear nuevo threshold
        await crearThreshold();
      }
    } catch (error) {
      console.error('Error en submit:', error);
    } finally {
      setLoading(false);
    }
  };

  const crearThreshold = async () => {
    try {
      const { error } = await supabase
        .from('inventario_thresholds')
        .insert({
          ...formData,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      onSuccess();
    } catch (error: any) {
      console.error('Error creando threshold:', error);
      showAlert('Error al crear la configuración de umbral');
    }
  };

  const actualizarThreshold = async () => {
    try {
      const { error } = await supabase
        .from('inventario_thresholds')
        .update({
          ...formData,
          updated_at: new Date().toISOString()
        })
        .eq('id', threshold!.id);

      if (error) throw error;

      onSuccess();
    } catch (error: any) {
      console.error('Error actualizando threshold:', error);
      showAlert('Error al actualizar la configuración');
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const articulosFiltrados = articulosDisponibles.filter(articulo =>
    articulo.descripcion_articulo.toLowerCase().includes(busquedaArticulo.toLowerCase()) ||
    articulo.codigo_articulo.toLowerCase().includes(busquedaArticulo.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            {threshold ? 'Editar Umbral de Stock' : 'Nuevo Umbral de Stock'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <i className="ri-close-line text-2xl"></i>
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Selector de Artículo - Solo en modo creación */}
            {!threshold && (
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Artículo *
                </label>
                <input
                  type="text"
                  value={busquedaArticulo}
                  onChange={(e) => filtrarArticulos(e.target.value)}
                  placeholder="Buscar artículo por código o descripción..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                
                {mostrarListaArticulos && articulosFiltrados.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {articulosFiltrados.map((articulo) => (
                      <div
                        key={articulo.id_articulo}
                        onClick={() => seleccionarArticulo(articulo)}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium">{articulo.descripcion_articulo}</div>
                        <div className="text-sm text-gray-500">Código: {articulo.codigo_articulo}</div>
                      </div>
                    ))}
                  </div>
                )}
                
                {articuloSeleccionado && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
                    <i className="ri-check-line text-green-600 mr-1"></i>
                    Artículo seleccionado: <strong>{articuloSeleccionado.descripcion_articulo}</strong>
                    <div className="text-gray-600">Código: {articuloSeleccionado.codigo_articulo}</div>
                  </div>
                )}

                {busquedaArticulo && articulosFiltrados.length === 0 && !articuloSeleccionado && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                    <i className="ri-information-line mr-1"></i>
                    No se encontraron artículos disponibles. Solo se muestran artículos sin umbrales configurados.
                  </div>
                )}
              </div>
            )}

            {/* Información del artículo en modo edición */}
            {threshold && threshold.inventario && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Artículo</h3>
                <div className="text-sm text-gray-600">
                  <div><strong>Código:</strong> {threshold.inventario.codigo_articulo}</div>
                  <div><strong>Descripción:</strong> {threshold.inventario.descripcion_articulo}</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cantidad Mínima */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cantidad Mínima *
                </label>
                <input
                  type="number"
                  value={formData.min_qty}
                  onChange={(e) => handleInputChange('min_qty', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Cantidad mínima antes de generar alerta
                </p>
              </div>

              {/* Cantidad Máxima */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cantidad Máxima *
                </label>
                <input
                  type="number"
                  value={formData.max_qty}
                  onChange={(e) => handleInputChange('max_qty', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Cantidad máxima recomendada en inventario
                </p>
              </div>

              {/* Stock de Seguridad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stock de Seguridad
                </label>
                <input
                  type="number"
                  value={formData.safety_stock}
                  onChange={(e) => handleInputChange('safety_stock', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Stock adicional para contingencias
                </p>
              </div>

              {/* Tiempo de Entrega */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tiempo de Entrega (días) *
                </label>
                <input
                  type="number"
                  value={formData.lead_time_dias}
                  onChange={(e) => handleInputChange('lead_time_dias', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Días que toma recibir el pedido
                </p>
              </div>

              {/* Lote Mínimo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lote Mínimo *
                </label>
                <input
                  type="number"
                  value={formData.lote_minimo}
                  onChange={(e) => handleInputChange('lote_minimo', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Cantidad mínima por pedido
                </p>
              </div>

              {/* Estado Activo */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="activo"
                  checked={formData.activo}
                  onChange={(e) => handleInputChange('activo', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="activo" className="ml-2 block text-sm text-gray-900">
                  Umbral activo
                </label>
              </div>
            </div>

            {/* Cálculo automático del ROP */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">
                <i className="ri-calculator-line mr-2"></i>
                Punto de Reorden (ROP) Calculado
              </h3>
              <div className="text-sm text-blue-700">
                <div className="mb-1">
                  <strong>Fórmula:</strong> Stock de Seguridad + (Demanda Promedio × Tiempo de Entrega)
                </div>
                <div>
                  <strong>ROP estimado:</strong> {formData.safety_stock + (2.5 * formData.lead_time_dias)} unidades
                </div>
                <div className="text-xs mt-1 text-blue-600">
                  * Usando demanda promedio de 2.5 unidades/día (configurable en Configuración)
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-nowrap cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || (!threshold && !formData.articulo_id)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
              >
                {loading ? (
                  <>
                    <i className="ri-loader-4-line animate-spin mr-2"></i>
                    Guardando...
                  </>
                ) : (
                  <>
                    <i className={threshold ? "ri-save-line mr-2" : "ri-add-line mr-2"}></i>
                    {threshold ? 'Actualizar' : 'Crear'} Umbral
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}