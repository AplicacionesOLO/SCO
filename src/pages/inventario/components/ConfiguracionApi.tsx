import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { ApiClient, createApiClient, handleApiError } from '../../../lib/api';
import { showAlert, showConfirm } from '../../../utils/dialog';

interface ConfiguracionApi {
  id?: number;
  nombre: string;
  url_base: string;
  api_key?: string;
  activa: boolean;
  tipo: 'inventario' | 'precios' | 'proveedores' | 'otro';
  descripcion?: string;
  headers_adicionales?: Record<string, string>;
}

export default function ConfiguracionApi() {
  const [configuraciones, setConfiguraciones] = useState<ConfiguracionApi[]>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editando, setEditando] = useState<ConfiguracionApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [probando, setProbando] = useState<number | null>(null);
  const [formData, setFormData] = useState<ConfiguracionApi>({
    nombre: '',
    url_base: '',
    api_key: '',
    activa: true,
    tipo: 'inventario',
    descripcion: '',
    headers_adicionales: {}
  });

  useEffect(() => {
    cargarConfiguraciones();
  }, []);

  const cargarConfiguraciones = async () => {
    try {
      const { data, error } = await supabase
        .from('configuraciones_api')
        .select('*')
        .order('nombre');

      if (error) throw error;
      setConfiguraciones(data || []);
    } catch (error) {
      console.error('Error cargando configuraciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const guardarConfiguracion = async () => {
    try {
      const datos = {
        ...formData,
        headers_adicionales: formData.headers_adicionales || {}
      };

      if (editando?.id) {
        const { error } = await supabase
          .from('configuraciones_api')
          .update(datos)
          .eq('id', editando.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('configuraciones_api')
          .insert(datos);
        
        if (error) throw error;
      }

      await cargarConfiguraciones();
      cerrarFormulario();
    } catch (error) {
      console.error('Error guardando configuración:', error);
      await showAlert('Error al guardar la configuración');
    }
  };

  const eliminarConfiguracion = async (id: number) => {
    if (!await showConfirm('¿Estás seguro de eliminar esta configuración?')) return;

    try {
      const { error } = await supabase
        .from('configuraciones_api')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await cargarConfiguraciones();
    } catch (error) {
      console.error('Error eliminando configuración:', error);
      await showAlert('Error al eliminar la configuración');
    }
  };

  const probarConexion = async (config: ConfiguracionApi) => {
    setProbando(config.id || 0);
    
    try {
      const client = createApiClient({
        baseUrl: config.url_base,
        apiKey: config.api_key,
        headers: config.headers_adicionales,
        timeout: 5000
      });

      // Intentar una petición básica (puede variar según la API)
      const response = await client.get('/health');
      
      if (response.success) {
        await showAlert('✅ Conexión exitosa con la API');
      } else {
        await showAlert(`❌ Error de conexión: ${response.error}`);
      }
    } catch (error) {
      await showAlert(`❌ Error de conexión: ${handleApiError(error)}`);
    } finally {
      setProbando(null);
    }
  };

  const abrirFormulario = (config?: ConfiguracionApi) => {
    if (config) {
      setEditando(config);
      setFormData(config);
    } else {
      setEditando(null);
      setFormData({
        nombre: '',
        url_base: '',
        api_key: '',
        activa: true,
        tipo: 'inventario',
        descripcion: '',
        headers_adicionales: {}
      });
    }
    setMostrarFormulario(true);
  };

  const cerrarFormulario = () => {
    setMostrarFormulario(false);
    setEditando(null);
    setFormData({
      nombre: '',
      url_base: '',
      api_key: '',
      activa: true,
      tipo: 'inventario',
      descripcion: '',
      headers_adicionales: {}
    });
  };

  const toggleActiva = async (config: ConfiguracionApi) => {
    try {
      const { error } = await supabase
        .from('configuraciones_api')
        .update({ activa: !config.activa })
        .eq('id', config.id);

      if (error) throw error;
      await cargarConfiguraciones();
    } catch (error) {
      console.error('Error actualizando estado:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <i className="ri-loader-line animate-spin text-2xl text-blue-600"></i>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Configuración de APIs</h2>
        <button
          onClick={() => abrirFormulario()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          <i className="ri-add-line mr-2"></i>
          Nueva API
        </button>
      </div>

      {/* Lista de configuraciones */}
      <div className="grid gap-4">
        {configuraciones.map((config) => (
          <div key={config.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-medium text-gray-900">{config.nombre}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    config.activa 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {config.activa ? 'Activa' : 'Inactiva'}
                  </span>
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                    {config.tipo}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-2">{config.url_base}</p>
                
                {config.descripcion && (
                  <p className="text-sm text-gray-500 mb-3">{config.descripcion}</p>
                )}
                
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <i className="ri-key-line"></i>
                  <span>{config.api_key ? 'API Key configurada' : 'Sin API Key'}</span>
                  
                  {config.headers_adicionales && Object.keys(config.headers_adicionales).length > 0 && (
                    <>
                      <span>•</span>
                      <i className="ri-settings-line"></i>
                      <span>{Object.keys(config.headers_adicionales).length} headers adicionales</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => probarConexion(config)}
                  disabled={probando === config.id}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {probando === config.id ? (
                    <>
                      <i className="ri-loader-line animate-spin mr-1"></i>
                      Probando...
                    </>
                  ) : (
                    <>
                      <i className="ri-wifi-line mr-1"></i>
                      Probar
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => toggleActiva(config)}
                  className={`px-3 py-1 rounded text-sm transition-colors whitespace-nowrap ${
                    config.activa
                      ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  <i className={`mr-1 ${config.activa ? 'ri-pause-line' : 'ri-play-line'}`}></i>
                  {config.activa ? 'Desactivar' : 'Activar'}
                </button>
                
                <button
                  onClick={() => abrirFormulario(config)}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors whitespace-nowrap"
                >
                  <i className="ri-edit-line mr-1"></i>
                  Editar
                </button>
                
                <button
                  onClick={() => eliminarConfiguracion(config.id!)}
                  className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors whitespace-nowrap"
                >
                  <i className="ri-delete-bin-line mr-1"></i>
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {configuraciones.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <i className="ri-api-line text-4xl text-gray-400 mb-4"></i>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay APIs configuradas</h3>
            <p className="text-gray-500 mb-4">Agrega tu primera configuración de API para conectar servicios externos</p>
            <button
              onClick={() => abrirFormulario()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <i className="ri-add-line mr-2"></i>
              Configurar API
            </button>
          </div>
        )}
      </div>

      {/* Modal de formulario */}
      {mostrarFormulario && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium">
                  {editando ? 'Editar Configuración de API' : 'Nueva Configuración de API'}
                </h3>
                <button
                  onClick={cerrarFormulario}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>

              <div className="space-y-4">
                {/* Información básica */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre de la API *
                    </label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="ej: API Inventario Principal"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de API
                    </label>
                    <select
                      value={formData.tipo}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="inventario">Inventario</option>
                      <option value="precios">Precios</option>
                      <option value="proveedores">Proveedores</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL Base de la API *
                  </label>
                  <input
                    type="url"
                    value={formData.url_base}
                    onChange={(e) => setFormData({ ...formData, url_base: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://api.ejemplo.com/v1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Key (opcional)
                  </label>
                  <input
                    type="password"
                    value={formData.api_key}
                    onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Tu API key aquí"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción (opcional)
                  </label>
                  <textarea
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Descripción de la API y su propósito"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="activa"
                    checked={formData.activa}
                    onChange={(e) => setFormData({ ...formData, activa: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="activa" className="ml-2 block text-sm text-gray-900">
                    API activa
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={cerrarFormulario}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarConfiguracion}
                  disabled={!formData.nombre || !formData.url_base}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {editando ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}