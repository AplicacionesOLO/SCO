import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { UsuarioForm } from './UsuarioForm';
import { AsignarTiendaModal } from './AsignarTiendaModal';
import { showAlert, showConfirm } from '../../../utils/dialog';

interface Usuario {
  id: string;
  email: string;
  nombre_completo: string;
  rol: string;
  activo: boolean;
  created_at: string;
  tienda_nombre?: string | null;
  tiendas_asignadas?: Array<{ id: string; nombre: string; codigo: string }>;
}

export function UsuariosTab() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);
  const [showAsignarTienda, setShowAsignarTienda] = useState(false);
  const [usuarioParaTienda, setUsuarioParaTienda] = useState<Usuario | null>(null);

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    try {
      setLoading(true);
      
      // ✅ Cargar usuarios con su tienda actual Y todas las tiendas asignadas
      const { data, error } = await supabase
        .from('usuarios')
        .select(`
          *,
          usuario_tienda_actual(
            tienda_id,
            tiendas(
              id,
              nombre
            )
          ),
          usuario_tiendas(
            tienda_id,
            tiendas(
              id,
              nombre,
              codigo
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error en query:', error);
        throw error;
      }
      
      console.log('📊 Datos crudos de Supabase:', data);
      
      // Mapear los datos para incluir el nombre de la tienda actual y todas las tiendas asignadas
      const usuariosConTiendas = (data || []).map(usuario => {
        console.log('👤 Usuario:', usuario.email);
        console.log('📦 usuario_tiendas raw:', usuario.usuario_tiendas);
        
        // Extraer el nombre de la tienda actual
        let tiendaNombre = null;
        
        if (usuario.usuario_tienda_actual) {
          const tiendaData = Array.isArray(usuario.usuario_tienda_actual) 
            ? usuario.usuario_tienda_actual[0] 
            : usuario.usuario_tienda_actual;
          
          if (tiendaData?.tiendas) {
            tiendaNombre = Array.isArray(tiendaData.tiendas)
              ? tiendaData.tiendas[0]?.nombre
              : tiendaData.tiendas?.nombre;
          }
        }
        
        // Extraer todas las tiendas asignadas
        let tiendasAsignadas: Array<{ id: string; nombre: string; codigo: string }> = [];
        
        if (usuario.usuario_tiendas && Array.isArray(usuario.usuario_tiendas)) {
          tiendasAsignadas = usuario.usuario_tiendas
            .filter(ut => ut.tiendas) // Filtrar solo las que tienen datos de tienda
            .map(ut => {
              console.log('🏪 Procesando tienda:', ut.tiendas);
              return {
                id: ut.tiendas.id,
                nombre: ut.tiendas.nombre,
                codigo: ut.tiendas.codigo
              };
            });
        }
        
        console.log('✅ Tiendas asignadas procesadas:', tiendasAsignadas);
        
        return {
          ...usuario,
          tienda_nombre: tiendaNombre,
          tiendas_asignadas: tiendasAsignadas
        };
      });
      
      console.log('✅ Usuarios procesados:', usuariosConTiendas);
      setUsuarios(usuariosConTiendas);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      
      // Fallback: cargar usuarios sin tienda si falla el JOIN
      try {
        const { data: usuariosSinTienda, error: errorFallback } = await supabase
          .from('usuarios')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (!errorFallback && usuariosSinTienda) {
          setUsuarios(usuariosSinTienda.map(u => ({ ...u, tienda_nombre: null, tiendas_asignadas: [] })));
        }
      } catch (fallbackError) {
        console.error('Error en fallback:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (usuario: Usuario) => {
    setEditingUsuario(usuario);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const ok = await showConfirm('¿Está seguro de eliminar este usuario?');
    if (!ok) return;

    try {
      const { error } = await supabase
        .from('usuarios')
        .delete()
        .eq('id', id);

      if (error) throw error;
      cargarUsuarios();
    } catch (error) {
      console.error('Error eliminando usuario:', error);
      showAlert('Error al eliminar el usuario', { type: 'error' });
    }
  };

  const handleToggleActivo = async (usuario: Usuario) => {
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ activo: !usuario.activo })
        .eq('id', usuario.id);

      if (error) throw error;
      cargarUsuarios();
    } catch (error) {
      console.error('Error actualizando estado:', error);
      showAlert('Error al actualizar el estado del usuario', { type: 'error' });
    }
  };

  const handleAsignarTienda = (usuario: Usuario) => {
    setUsuarioParaTienda(usuario);
    setShowAsignarTienda(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con botón Nuevo */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Usuarios del Sistema</h2>
          <p className="text-sm text-gray-600">Gestiona los usuarios y sus permisos</p>
        </div>
        <button
          onClick={() => {
            setEditingUsuario(null);
            setShowForm(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center cursor-pointer whitespace-nowrap"
        >
          <i className="ri-add-line mr-2"></i>
          Nuevo Usuario
        </button>
      </div>

      {/* Tabla de usuarios */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tiendas Asignadas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha Registro
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {usuarios.map((usuario) => (
                <tr key={usuario.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <i className="ri-user-line text-blue-600 text-lg"></i>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {usuario.nombre_completo || 'Sin nombre'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{usuario.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                      {usuario.rol || 'Sin rol'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {usuario.tiendas_asignadas && usuario.tiendas_asignadas.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {usuario.tiendas_asignadas.map((tienda) => (
                          <span
                            key={tienda.id}
                            className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-teal-100 text-teal-800"
                            title={tienda.nombre}
                          >
                            <i className="ri-store-2-line mr-1"></i>
                            {tienda.codigo}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-600">
                        <i className="ri-alert-line mr-1"></i>
                        Sin tiendas
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActivo(usuario)}
                      className="cursor-pointer"
                    >
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        usuario.activo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {usuario.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(usuario.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleAsignarTienda(usuario)}
                        className="text-teal-600 hover:text-teal-900 cursor-pointer"
                        title="Asignar Tienda"
                      >
                        <i className="ri-store-2-line text-lg"></i>
                      </button>
                      <button
                        onClick={() => handleEdit(usuario)}
                        className="text-blue-600 hover:text-blue-900 cursor-pointer"
                        title="Editar"
                      >
                        <i className="ri-edit-line text-lg"></i>
                      </button>
                      <button
                        onClick={() => handleDelete(usuario.id)}
                        className="text-red-600 hover:text-red-900 cursor-pointer"
                        title="Eliminar"
                      >
                        <i className="ri-delete-bin-line text-lg"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {usuarios.length === 0 && (
          <div className="text-center py-12">
            <i className="ri-user-line text-gray-400 text-5xl mb-4"></i>
            <p className="text-gray-500">No hay usuarios registrados</p>
          </div>
        )}
      </div>

      {/* Modal de formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-900">
                  {editingUsuario ? 'Editar Usuario' : 'Nuevo Usuario'}
                </h3>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingUsuario(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <i className="ri-close-line text-2xl"></i>
                </button>
              </div>
              <UsuarioForm
                usuario={editingUsuario}
                onClose={() => {
                  setShowForm(false);
                  setEditingUsuario(null);
                }}
                onSuccess={() => {
                  cargarUsuarios(); // ✅ RECARGAR LA LISTA ANTES DE CERRAR
                  setShowForm(false);
                  setEditingUsuario(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal de asignar tienda */}
      {showAsignarTienda && usuarioParaTienda && (
        <AsignarTiendaModal
          usuario={usuarioParaTienda}
          onClose={() => {
            setShowAsignarTienda(false);
            setUsuarioParaTienda(null);
          }}
          onSuccess={() => {
            setShowAsignarTienda(false);
            setUsuarioParaTienda(null);
            cargarUsuarios();
          }}
        />
      )}
    </div>
  );
}
