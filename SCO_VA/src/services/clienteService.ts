import { supabase } from '../lib/supabase';
import type { Cliente } from '../types/cliente';

export interface ClienteFilters {
  search?: string;
  tipo?: string;
  activo?: boolean;
}

export const getClientes = async (filters: ClienteFilters = {}, currentStore: { id: string } | null) => {
  if (!currentStore) return { data: [], error: { message: 'No hay tienda seleccionada' } };
  try {
    let query = supabase
      .from('clientes')
      .select(`
        *,
        pais:paises(nombre),
        provincia:provincias(nombre),
        canton:cantones(nombre),
        distrito:distritos(nombre)
      `)
      .eq('tienda_id', currentStore.id); // FILTRO OBLIGATORIO POR TIENDA

    if (filters.search) {
      query = query.or(`nombre.ilike.%${filters.search}%,correo_principal.ilike.%${filters.search}%,telefono.ilike.%${filters.search}%`);
    }

    if (filters.tipo) {
      query = query.eq('tipo_cliente', filters.tipo);
    }

    if (filters.activo !== undefined) {
      query = query.eq('activo', filters.activo);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    return { data: data || [], error };
  } catch (error) {
    return { data: [], error };
  }
};

export const getClienteById = async (id: string, currentStore: { id: string } | null) => {
  if (!currentStore) return { data: null, error: { message: 'No hay tienda seleccionada' } };
  try {
    const { data, error } = await supabase
      .from('clientes')
      .select(`
        *,
        pais:paises(nombre),
        provincia:provincias(nombre),
        canton:cantones(nombre),
        distrito:distritos(nombre)
      `)
      .eq('id', id)
      .eq('tienda_id', currentStore.id) // FILTRO OBLIGATORIO POR TIENDA
      .single();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const createCliente = async (cliente: Omit<Cliente, 'id' | 'created_at' | 'updated_at'>, currentStore: { id: string } | null) => {
  if (!currentStore) return { data: null, error: { message: 'No hay tienda seleccionada' } };
  try {
    const { data, error } = await supabase
      .from('clientes')
      .insert([{
        ...cliente,
        tienda_id: currentStore.id // INCLUIR TIENDA_ID OBLIGATORIO
      }])
      .select()
      .single();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const updateCliente = async (id: string, cliente: Partial<Cliente>, currentStore: { id: string } | null) => {
  if (!currentStore) return { data: null, error: { message: 'No hay tienda seleccionada' } };
  try {
    const { data, error } = await supabase
      .from('clientes')
      .update(cliente)
      .eq('id', id)
      .eq('tienda_id', currentStore.id) // FILTRO OBLIGATORIO POR TIENDA
      .select()
      .single();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const deleteCliente = async (id: string, currentStore: { id: string } | null) => {
  if (!currentStore) return { error: { message: 'No hay tienda seleccionada' } };
  try {
    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('id', id)
      .eq('tienda_id', currentStore.id); // FILTRO OBLIGATORIO POR TIENDA

    return { error };
  } catch (error) {
    return { error };
  }
};

export const buscarClientes = async (search: string, currentStore: { id: string } | null) => {
  if (!currentStore) return { data: [], error: { message: 'No hay tienda seleccionada' } };
  try {
    const { data, error } = await supabase
      .from('clientes')
      .select('id, nombre, correo_principal, tipo_cliente')
      .eq('tienda_id', currentStore.id) // FILTRO OBLIGATORIO POR TIENDA
      .or(`nombre.ilike.%${search}%,correo_principal.ilike.%${search}%,telefono.ilike.%${search}%`)
      .eq('activo', true)
      .limit(10);

    return { data: data || [], error };
  } catch (error) {
    return { data: [], error };
  }
};

// Funciones auxiliares para ClienteService
const obtenerClientes = async (filters: ClienteFilters = {}) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data: tiendaActual } = await supabase
      .from('usuario_tienda_actual')
      .select('tienda_id')
      .eq('usuario_id', user.id)
      .single();

    if (!tiendaActual?.tienda_id) return [];

    let query = supabase
      .from('clientes')
      .select(`
        *,
        pais:paises(nombre),
        provincia:provincias(nombre),
        canton:cantones(nombre),
        distrito:distritos(nombre)
      `)
      .eq('tienda_id', tiendaActual.tienda_id)
      .eq('activo', true);

    if (filters.search) {
      query = query.or(`nombre_razon_social.ilike.%${filters.search}%,identificacion.ilike.%${filters.search}%,correo_principal.ilike.%${filters.search}%`);
    }

    if (filters.tipo) {
      query = query.eq('tipo_identificacion', filters.tipo);
    }

    query = query.order('nombre_razon_social');

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    throw error;
  }
};

const obtenerProvincias = async () => {
  try {
    const { data, error } = await supabase
      .from('provincias')
      .select('*')
      .order('nombre');
    if (error) throw error;
    return data || [];
  } catch {
    return [];
  }
};

const obtenerCantones = async (provinciaId: number) => {
  try {
    const { data, error } = await supabase
      .from('cantones')
      .select('*')
      .eq('provincia_id', provinciaId)
      .order('nombre');
    if (error) throw error;
    return data || [];
  } catch {
    return [];
  }
};

const obtenerDistritos = async (cantonId: number) => {
  try {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout al cargar distritos')), 10000)
    );
    
    const queryPromise = supabase
      .from('distritos')
      .select('*')
      .eq('canton_id', cantonId)
      .order('nombre');
    
    const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;
    
    if (error) throw error;
    
    return data || [];
  } catch {
    return [];
  }
};

const obtenerPaises = async () => {
  try {
    const { data, error } = await supabase
      .from('paises')
      .select('*')
      .order('nombre');
    if (error) throw error;
    return data || [];
  } catch {
    return [];
  }
};

const obtenerActividadesEconomicas = async () => {
  try {
    const { data, error } = await supabase
      .from('actividades_economicas')
      .select('*')
      .order('codigo');
    if (error) throw error;
    return data || [];
  } catch {
    return [];
  }
};

const validarIdentificacion = (tipo: string, identificacion: string): boolean => {
  const numero = identificacion.replace(/\D/g, '');
  
  switch (tipo) {
    case 'cedula_fisica':
      return numero.length === 9;
    case 'cedula_juridica':
      return numero.length === 10;
    case 'dimex':
      return numero.length >= 11 && numero.length <= 12;
    case 'nite':
      return numero.length === 10;
    case 'pasaporte':
      return identificacion.length >= 6 && identificacion.length <= 20;
    default:
      return false;
  }
};

const validarEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validarTelefono = (telefono: string): boolean => {
  const numero = telefono.replace(/\D/g, '');
  return numero.length >= 8 && numero.length <= 15;
};

// Exportar ClienteService como objeto
export const ClienteService = {
  obtenerClientes,
  obtenerProvincias,
  obtenerCantones,
  obtenerDistritos,
  obtenerPaises,
  obtenerActividadesEconomicas,
  validarIdentificacion,
  validarEmail,
  validarTelefono,
  buscarClientes: async (search: string) => {
    try {
      // Obtener usuario autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Obtener tienda actual del usuario
      const { data: tiendaActual, error: tiendaError } = await supabase
        .from('usuario_tienda_actual')
        .select('tienda_id')
        .eq('usuario_id', user.id)
        .single();

      if (tiendaError) throw tiendaError;

      // Buscar clientes por nombre o identificación
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nombre_razon_social, identificacion, tipo_identificacion')
        .eq('tienda_id', tiendaActual.tienda_id)
        .or(`nombre_razon_social.ilike.%${search}%,identificacion.ilike.%${search}%`)
        .eq('activo', true)
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error) {
      return [];
    }
  },

  crearCliente: async (clienteData: any) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) {
        throw new Error('Usuario no autenticado');
      }

      // Obtener la tienda actual del usuario
      const { data: usuarioTienda } = await supabase
        .from('usuario_tienda_actual')
        .select('tienda_id')
        .eq('usuario_id', session.session.user.id)
        .single();

      if (!usuarioTienda) {
        throw new Error('No se pudo determinar la tienda actual');
      }

      // Limpiar campos de fecha vacíos (convertir "" a null)
      const datosLimpios = { ...clienteData };
      if (datosLimpios.exoneracion_vencimiento === '') {
        datosLimpios.exoneracion_vencimiento = null;
      }
      if (datosLimpios.hacienda_ultimo_intento === '') {
        datosLimpios.hacienda_ultimo_intento = null;
      }

      // Preparar datos del cliente
      const nuevoCliente = {
        ...datosLimpios,
        tienda_id: usuarioTienda.tienda_id
      };

      const { data, error } = await supabase
        .from('clientes')
        .insert([nuevoCliente])
        .select()
        .single();

      if (error) {
        throw new Error('Error al crear el cliente: ' + error.message);
      }

      return data;
    } catch (error: any) {
      throw error;
    }
  },

  actualizarCliente: async (id: string, clienteData: any) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) {
        throw new Error('Usuario no autenticado');
      }

      // Obtener la tienda actual del usuario
      const { data: usuarioTienda } = await supabase
        .from('usuario_tienda_actual')
        .select('tienda_id')
        .eq('usuario_id', session.session.user.id)
        .single();

      if (!usuarioTienda) {
        throw new Error('No se pudo determinar la tienda actual');
      }

      // Limpiar campos de fecha vacíos (convertir "" a null)
      const datosLimpios = { ...clienteData };
      if (datosLimpios.exoneracion_vencimiento === '') {
        datosLimpios.exoneracion_vencimiento = null;
      }
      if (datosLimpios.hacienda_ultimo_intento === '') {
        datosLimpios.hacienda_ultimo_intento = null;
      }

      const { data, error } = await supabase
        .from('clientes')
        .update(datosLimpios)
        .eq('id', id)
        .eq('tienda_id', usuarioTienda.tienda_id)
        .select()
        .single();

      if (error) {
        throw new Error('Error al actualizar el cliente: ' + error.message);
      }

      return data;
    } catch (error: any) {
      throw error;
    }
  }
};

// Funciones para HaciendaService
const validarIdentificacionHacienda = async (identificacion: string) => {
  try {
    // Simulación de validación con Hacienda
    // En producción, aquí iría la llamada real a la API de Hacienda
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      valido: true,
      mensaje: 'Identificación válida según Hacienda'
    };
  } catch (error) {
    return {
      valido: false,
      mensaje: 'Error al validar con Hacienda'
    };
  }
};

// Exportar HaciendaService como objeto
export const HaciendaService = {
  validarIdentificacion: validarIdentificacionHacienda
};
