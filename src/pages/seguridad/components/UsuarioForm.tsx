import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface UsuarioFormProps {
  usuario?: any;
  onClose: () => void;
  onSuccess: () => void;
}

interface Tienda {
  id: string;
  nombre: string;
  codigo: string;
}

interface RolOption {
  id: number;
  nombre: string;
}

export function UsuarioForm({ usuario, onClose, onSuccess }: UsuarioFormProps) {
  const [formData, setFormData] = useState({
    email: usuario?.email || '',
    nombre_completo: usuario?.nombre_completo || '',
    rol: usuario?.rol || '',
  });

  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [tiendasAsignadas, setTiendasAsignadas] = useState<Tienda[]>([]);
  const [tiendaSeleccionada, setTiendaSeleccionada] = useState<string>('');
  const [roles, setRoles] = useState<RolOption[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cargarTiendas();
    cargarRoles();
    if (usuario?.id) {
      cargarTiendasAsignadas();
    }
  }, [usuario]);

  const cargarRoles = async () => {
    try {
      setLoadingRoles(true);
      const { data, error } = await supabase
        .from('roles')
        .select('id, nombre')
        .order('nombre');

      if (error) throw error;

      const rolesData: RolOption[] = data || [];
      setRoles(rolesData);

      if (!formData.rol && rolesData.length > 0) {
        setFormData(prev => ({ ...prev, rol: prev.rol || rolesData[0].nombre }));
      }
    } catch (err) {
      console.error('Error al cargar roles:', err);
    } finally {
      setLoadingRoles(false);
    }
  };

  const cargarTiendas = async () => {
    try {
      const { data, error } = await supabase
        .from('tiendas')
        .select('id, nombre, codigo')
        .eq('activo', true)
        .order('nombre');

      if (error) throw error;
      setTiendas(data || []);
    } catch (error) {
      console.error('Error al cargar tiendas:', error);
    }
  };

  const cargarTiendasAsignadas = async () => {
    try {
      const { data, error } = await supabase
        .from('usuario_tiendas')
        .select(`
          tienda_id,
          tiendas (
            id,
            nombre,
            codigo
          )
        `)
        .eq('usuario_id', usuario.id)
        .eq('activo', true);

      if (error) throw error;

      const tiendasData = data?.map((item: any) => ({
        id: item.tiendas.id,
        nombre: item.tiendas.nombre,
        codigo: item.tiendas.codigo,
      })) || [];

      setTiendasAsignadas(tiendasData);
    } catch (error) {
      console.error('Error al cargar tiendas asignadas:', error);
    }
  };

  const agregarTienda = () => {
    if (!tiendaSeleccionada) return;

    const tienda = tiendas.find(t => t.id === tiendaSeleccionada);
    if (!tienda) return;

    // Verificar si ya está asignada
    if (tiendasAsignadas.some(t => t.id === tienda.id)) {
      setError('Esta tienda ya está asignada');
      return;
    }

    setTiendasAsignadas([...tiendasAsignadas, tienda]);
    setTiendaSeleccionada('');
    setError(null);
  };

  const eliminarTienda = (tiendaId: string) => {
    setTiendasAsignadas(tiendasAsignadas.filter(t => t.id !== tiendaId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Buscar el ID del rol seleccionado
      const rolSeleccionado = roles.find(r => r.nombre === formData.rol);

      if (usuario) {
        // Actualizar usuario existente
        const { error: updateError } = await supabase
          .from('usuarios')
          .update({
            nombre_completo: formData.nombre_completo,
            rol: formData.rol,
            updated_at: new Date().toISOString(),
          })
          .eq('id', usuario.id);

        if (updateError) throw updateError;

        // ✅ SINCRONIZAR usuario_roles: eliminar asignaciones antiguas e insertar la nueva
        await supabase
          .from('usuario_roles')
          .delete()
          .eq('usuario_id', usuario.id);

        if (rolSeleccionado) {
          const { error: rolInsertError } = await supabase
            .from('usuario_roles')
            .insert({ usuario_id: usuario.id, rol_id: rolSeleccionado.id });

          if (rolInsertError) {
            console.error('Error sincronizando usuario_roles:', rolInsertError);
          }
        }

        // ✅ ELIMINAR todas las asignaciones antiguas de tiendas
        const { error: deleteError } = await supabase
          .from('usuario_tiendas')
          .delete()
          .eq('usuario_id', usuario.id);

        if (deleteError) throw deleteError;

        // ✅ INSERTAR las nuevas tiendas asignadas
        if (tiendasAsignadas.length > 0) {
          const asignaciones = tiendasAsignadas.map(tienda => ({
            usuario_id: usuario.id,
            tienda_id: tienda.id,
            activo: true,
          }));

          const { error: insertError } = await supabase
            .from('usuario_tiendas')
            .insert(asignaciones);

          if (insertError) throw insertError;

          const { data: tiendaActual } = await supabase
            .from('usuario_tienda_actual')
            .select('tienda_id')
            .eq('usuario_id', usuario.id)
            .maybeSingle();

          if (!tiendaActual) {
            await supabase
              .from('usuario_tienda_actual')
              .upsert({
                usuario_id: usuario.id,
                tienda_id: tiendasAsignadas[0].id,
              });
          } else {
            const tiendaActualValida = tiendasAsignadas.some(t => t.id === tiendaActual.tienda_id);
            if (!tiendaActualValida) {
              await supabase
                .from('usuario_tienda_actual')
                .update({ tienda_id: tiendasAsignadas[0].id })
                .eq('usuario_id', usuario.id);
            }
          }
        } else {
          await supabase
            .from('usuario_tienda_actual')
            .delete()
            .eq('usuario_id', usuario.id);
        }
      } else {
        // Crear nuevo usuario
        const { data: newUser, error: createError } = await supabase
          .from('usuarios')
          .insert({
            id: crypto.randomUUID(),
            email: formData.email,
            nombre_completo: formData.nombre_completo,
            rol: formData.rol,
          })
          .select()
          .single();

        if (createError) throw createError;

        // ✅ INSERTAR en usuario_roles para el nuevo usuario
        if (rolSeleccionado) {
          const { error: rolInsertError } = await supabase
            .from('usuario_roles')
            .insert({ usuario_id: newUser.id, rol_id: rolSeleccionado.id });

          if (rolInsertError) {
            console.error('Error insertando usuario_roles para nuevo usuario:', rolInsertError);
          }
        }

        // Asignar tiendas al nuevo usuario
        if (tiendasAsignadas.length > 0) {
          const asignaciones = tiendasAsignadas.map(tienda => ({
            usuario_id: newUser.id,
            tienda_id: tienda.id,
            activo: true,
          }));

          const { error: asignacionError } = await supabase
            .from('usuario_tiendas')
            .insert(asignaciones);

          if (asignacionError) throw asignacionError;

          await supabase
            .from('usuario_tienda_actual')
            .insert({
              usuario_id: newUser.id,
              tienda_id: tiendasAsignadas[0].id,
            });
        }
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error guardando usuario:', error);
      setError(error.message || 'Error al guardar el usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {usuario ? 'Editar Usuario' : 'Nuevo Usuario'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={!!usuario}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
              required
            />
            {usuario && (
              <p className="mt-1 text-xs text-gray-500">El email no se puede modificar</p>
            )}
          </div>

          {/* Nombre Completo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre Completo
            </label>
            <input
              type="text"
              value={formData.nombre_completo}
              onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              required
            />
          </div>

          {/* Rol */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rol
            </label>
            <select
              value={formData.rol}
              onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              required
              disabled={loadingRoles}
            >
              {loadingRoles ? (
                <option value="">Cargando roles...</option>
              ) : (
                <>
                  <option value="">Seleccionar rol...</option>
                  {roles.map((rol) => (
                    <option key={rol.id} value={rol.nombre}>
                      {rol.nombre}
                    </option>
                  ))}
                </>
              )}
            </select>
            {loadingRoles && (
              <p className="mt-1 text-xs text-gray-400 flex items-center gap-1">
                <i className="ri-loader-4-line animate-spin"></i>
                Cargando roles disponibles...
              </p>
            )}
          </div>

          {/* Tiendas Asignadas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tiendas Asignadas
            </label>

            {/* Lista de tiendas asignadas */}
            {tiendasAsignadas.length > 0 ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {tiendasAsignadas.map((tienda) => (
                  <div
                    key={tienda.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-50 text-teal-700 rounded-full text-sm"
                  >
                    <span className="font-medium">{tienda.codigo}</span>
                    <span className="text-teal-600">•</span>
                    <span>{tienda.nombre}</span>
                    <button
                      type="button"
                      onClick={() => eliminarTienda(tienda.id)}
                      className="ml-1 text-teal-600 hover:text-teal-800"
                    >
                      <i className="ri-close-line text-base"></i>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mb-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-500 text-center">
                No hay tiendas asignadas
              </div>
            )}

            {/* Agregar nueva tienda */}
            <div className="flex gap-2">
              <select
                value={tiendaSeleccionada}
                onChange={(e) => setTiendaSeleccionada(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              >
                <option value="">Seleccionar tienda...</option>
                {tiendas
                  .filter(t => !tiendasAsignadas.some(ta => ta.id === t.id))
                  .map((tienda) => (
                    <option key={tienda.id} value={tienda.id}>
                      {tienda.codigo} - {tienda.nombre}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={agregarTienda}
                disabled={!tiendaSeleccionada}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm whitespace-nowrap"
              >
                <i className="ri-add-line mr-1"></i>
                Agregar
              </button>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm whitespace-nowrap"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm whitespace-nowrap"
            >
              {loading ? 'Guardando...' : usuario ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
