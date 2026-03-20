import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { tareaService } from '../../../services/tareaService';
import type { TareaEncargado } from '../../../types/tarea';
import { showAlert } from '../../../utils/dialog';

interface ConfigEncargadosModalProps {
  onClose: () => void;
}

interface Usuario {
  id: string;
  email: string;
  nombre?: string;
}

export default function ConfigEncargadosModal({ onClose }: ConfigEncargadosModalProps) {
  const [loading, setLoading] = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [encargados, setEncargados] = useState<TareaEncargado[]>([]);
  const [selectedUsuarios, setSelectedUsuarios] = useState<string[]>([]);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Cargar usuarios de la tienda actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: tiendaActual } = await supabase
        .from('usuario_tienda_actual')
        .select('tienda_id')
        .eq('usuario_id', user.id)
        .single();

      if (!tiendaActual) return;

      // Obtener usuarios de la tienda
      const { data: usuariosData, error: usuariosError } = await supabase
        .from('usuario_tiendas')
        .select(`
          usuario_id,
          usuarios!inner(
            id,
            email
          )
        `)
        .eq('tienda_id', tiendaActual.tienda_id);

      if (usuariosError) throw usuariosError;

      const usuariosList: Usuario[] = (usuariosData || []).map(ut => ({
        id: ut.usuarios.id,
        email: ut.usuarios.email
      }));

      setUsuarios(usuariosList);

      // Cargar encargados actuales
      const encargadosData = await tareaService.getEncargados();
      setEncargados(encargadosData);
      setSelectedUsuarios(encargadosData.map(e => e.usuario_id));

    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUsuarioChange = (usuarioId: string, selected: boolean) => {
    if (selected) {
      setSelectedUsuarios(prev => [...prev, usuarioId]);
    } else {
      setSelectedUsuarios(prev => prev.filter(id => id !== usuarioId));
    }
  };

  const handleGuardar = async () => {
    try {
      setLoading(true);

      // Obtener encargados actuales
      const encargadosActuales = encargados.map(e => e.usuario_id);
      
      // Usuarios a agregar
      const usuariosAgregar = selectedUsuarios.filter(id => !encargadosActuales.includes(id));
      
      // Usuarios a remover
      const usuariosRemover = encargadosActuales.filter(id => !selectedUsuarios.includes(id));

      // Agregar nuevos encargados
      for (const usuarioId of usuariosAgregar) {
        await tareaService.addEncargado(usuarioId);
      }

      // Remover encargados
      for (const usuarioId of usuariosRemover) {
        const encargado = encargados.find(e => e.usuario_id === usuarioId);
        if (encargado) {
          await tareaService.removeEncargado(encargado.id);
        }
      }

      console.log('✅ Configuración de encargados actualizada');
      onClose();
    } catch (error) {
      console.error('Error guardando encargados:', error);
      showAlert('Error al guardar la configuración: ' + (error as Error).message, { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Configurar Encargados</h2>
            <p className="text-sm text-gray-500 mt-1">
              Seleccione los usuarios que recibirán notificaciones de nuevas tareas
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2 text-gray-500">
                <i className="ri-loader-4-line animate-spin"></i>
                Cargando usuarios...
              </div>
            </div>
          ) : usuarios.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <i className="ri-user-line text-4xl text-gray-300 mb-2"></i>
              <p>No hay usuarios en esta tienda</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-700 mb-4">
                Usuarios de la tienda ({usuarios.length}):
              </div>
              
              {usuarios.map((usuario) => (
                <label
                  key={usuario.id}
                  className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedUsuarios.includes(usuario.id)}
                    onChange={(e) => handleUsuarioChange(usuario.id, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="ml-3 flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {usuario.email}
                    </div>
                    {usuario.nombre && (
                      <div className="text-xs text-gray-500">
                        {usuario.nombre}
                      </div>
                    )}
                  </div>
                  {encargados.some(e => e.usuario_id === usuario.id) && (
                    <div className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                      Actual
                    </div>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {selectedUsuarios.length} encargado{selectedUsuarios.length !== 1 ? 's' : ''} seleccionado{selectedUsuarios.length !== 1 ? 's' : ''}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <i className="ri-loader-4-line animate-spin"></i>
                  Guardando...
                </div>
              ) : (
                'Guardar Cambios'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}