import { useState, useEffect } from 'react';
import { tareaService } from '../../../services/tareaService';
import type { TareaColaborador } from '../../../types/tarea';
import { showAlert } from '../../../utils/dialog';

interface ColaboradoresModalProps {
  onClose: () => void;
}

export default function ColaboradoresModal({ onClose }: ColaboradoresModalProps) {
  const [loading, setLoading] = useState(false);
  const [colaboradores, setColaboradores] = useState<TareaColaborador[]>([]);
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: ''
  });

  useEffect(() => {
    cargarColaboradores();
  }, []);

  const cargarColaboradores = async () => {
    try {
      setLoading(true);
      const data = await tareaService.getColaboradores();
      setColaboradores(data);
    } catch (error) {
      console.error('Error cargando colaboradores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nombre.trim()) {
      showAlert('El nombre es requerido', { type: 'warning' });
      return;
    }

    try {
      setLoading(true);
      await tareaService.createColaborador(formData);
      setFormData({ nombre: '', email: '', telefono: '' });
      setShowForm(false);
      await cargarColaboradores();
    } catch (error) {
      console.error('Error creando colaborador:', error);
      showAlert('Error al crear el colaborador: ' + (error as Error).message, { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Gestionar Colaboradores</h2>
            <p className="text-sm text-gray-500 mt-1">
              Administre el personal que puede ser asignado a las tareas
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        {/* Botón agregar */}
        <div className="p-6 border-b border-gray-200">
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <i className="ri-add-line"></i>
            Nuevo Colaborador
          </button>
        </div>

        {/* Formulario para nuevo colaborador */}
        {showForm && (
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                    placeholder="Nombre completo"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="correo@ejemplo.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                    placeholder="8888-8888"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <i className="ri-loader-4-line animate-spin"></i>
                      Creando...
                    </div>
                  ) : (
                    'Crear Colaborador'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de colaboradores */}
        <div className="flex-1 overflow-y-auto">
          {loading && colaboradores.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2 text-gray-500">
                <i className="ri-loader-4-line animate-spin"></i>
                Cargando colaboradores...
              </div>
            </div>
          ) : colaboradores.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <i className="ri-team-line text-4xl text-gray-300 mb-2"></i>
              <p>No hay colaboradores registrados</p>
              <p className="text-sm">Agregue el primer colaborador usando el botón de arriba</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {colaboradores.map((colaborador) => (
                <div key={colaborador.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-gray-900">
                          {colaborador.nombre}
                        </h3>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          colaborador.activo 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {colaborador.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      
                      <div className="mt-1 space-y-1">
                        {colaborador.email && (
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <i className="ri-mail-line"></i>
                            {colaborador.email}
                          </div>
                        )}
                        {colaborador.telefono && (
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <i className="ri-phone-line"></i>
                            {colaborador.telefono}
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-1 text-xs text-gray-400">
                        Creado: {new Date(colaborador.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      {/* Aquí se podrían agregar botones para editar/desactivar */}
                      <button
                        className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                        title="Editar colaborador"
                      >
                        <i className="ri-edit-line"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {colaboradores.length} colaborador{colaboradores.length !== 1 ? 'es' : ''} registrado{colaboradores.length !== 1 ? 's' : ''}
          </div>
          
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}