import { supabase } from '../lib/supabase';

export interface UsuarioPendiente {
  id: string;
  nombre_completo: string;
  email: string;
  rol: string;
  activo: boolean;
  created_at: string;
}

export interface TiendaDisponible {
  id: string;
  nombre: string;
  codigo: string;
  activo: boolean;
}

export interface AsignarTiendaRequest {
  usuario_id: string;
  tienda_id: string;
}

class UsuariosPendientesService {
  async obtenerUsuariosPendientes(): Promise<UsuarioPendiente[]> {
    try {
      const { data: usuariosConTienda, error: errorTiendas } = await supabase
        .from('usuario_tiendas').select('usuario_id').eq('activo', true);
      if (errorTiendas) throw errorTiendas;

      const idsConTienda = usuariosConTienda?.map(ut => ut.usuario_id) || [];

      let query = supabase.from('usuarios').select('id, nombre_completo, email, rol, activo, created_at').eq('activo', true);

      if (idsConTienda.length > 0) {
        const idsString = idsConTienda.map(id => `"${id}"`).join(',');
        query = query.not('id', 'in', `(${idsString})`);
      }

      const { data: usuariosPendientes, error: errorUsuarios } = await query;
      if (errorUsuarios) throw errorUsuarios;

      return usuariosPendientes?.map(usuario => ({
        id: usuario.id, nombre_completo: usuario.nombre_completo,
        email: usuario.email, rol: usuario.rol || 'Sin rol',
        activo: usuario.activo, created_at: usuario.created_at
      })) || [];
    } catch (error) {
      throw new Error(`Error cargando usuarios pendientes: ${JSON.stringify(error)}`);
    }
  }

  async obtenerTiendasDisponibles(): Promise<TiendaDisponible[]> {
    try {
      const { data, error } = await supabase.from('tiendas').select('id, nombre, codigo, activo').eq('activo', true).order('nombre');
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new Error(`Error cargando tiendas: ${JSON.stringify(error)}`);
    }
  }

  async asignarTienda(request: AsignarTiendaRequest): Promise<void> {
    try {
      const { data: usuario, error: errorUsuario } = await supabase
        .from('usuarios').select('id, nombre_completo, rol').eq('id', request.usuario_id).eq('activo', true).maybeSingle();
      if (errorUsuario || !usuario) throw new Error('Usuario no encontrado o inactivo');

      const { data: tienda, error: errorTienda } = await supabase
        .from('tiendas').select('id, nombre').eq('id', request.tienda_id).eq('activo', true).maybeSingle();
      if (errorTienda || !tienda) throw new Error('Tienda no encontrada o inactiva');

      const { error: errorAsignacion } = await supabase
        .from('usuario_tiendas')
        .upsert(
          { usuario_id: request.usuario_id, tienda_id: request.tienda_id, activo: true },
          { onConflict: 'usuario_id,tienda_id' }
        );
      if (errorAsignacion) throw errorAsignacion;

      const { error: errorTiendaActual } = await supabase
        .from('usuario_tienda_actual').upsert({ usuario_id: request.usuario_id, tienda_id: request.tienda_id });
      if (errorTiendaActual) {
        await supabase.from('usuario_tiendas').delete().eq('usuario_id', request.usuario_id).eq('tienda_id', request.tienda_id);
        throw errorTiendaActual;
      }

      if (usuario.rol) {
        const { data: rolData } = await supabase.from('roles').select('id').eq('nombre', usuario.rol).maybeSingle();
        if (rolData) {
          const { data: existeRol } = await supabase.from('usuario_roles').select('rol_id').eq('usuario_id', request.usuario_id).maybeSingle();
          if (!existeRol) {
            await supabase.from('usuario_roles').insert({ usuario_id: request.usuario_id, rol_id: rolData.id });
          }
        }
      }
    } catch (error) {
      throw new Error(`Error asignando tienda: ${JSON.stringify(error)}`);
    }
  }

  async rechazarRegistro(usuarioId: string): Promise<void> {
    try {
      const { error } = await supabase.from('usuarios').update({ activo: false }).eq('id', usuarioId);
      if (error) throw error;
    } catch (error) {
      throw new Error(`Error rechazando registro: ${JSON.stringify(error)}`);
    }
  }
}

export const usuariosPendientesService = new UsuariosPendientesService();
