import { supabase } from '../lib/supabase';

export interface ProductoFilters {
  search?: string;
  categoria?: string;
  activo?: boolean;
}

export const getProductos = async (filters: ProductoFilters = {}, currentStore: { id: string } | null) => {
  if (!currentStore) return { data: [], error: { message: 'No hay tienda seleccionada' } };
  try {
    let query = supabase
      .from('productos')
      .select(`
        *,
        categoria:categorias(nombre)
      `)
      .eq('tienda_id', currentStore.id); // FILTRO OBLIGATORIO POR TIENDA

    if (filters.search) {
      query = query.or(`nombre.ilike.%${filters.search}%,codigo.ilike.%${filters.search}%,descripcion.ilike.%${filters.search}%`);
    }

    if (filters.categoria) {
      query = query.eq('categoria_id', filters.categoria);
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

export const getProductoById = async (id: string, currentStore: { id: string } | null) => {
  if (!currentStore) return { data: null, error: { message: 'No hay tienda seleccionada' } };
  try {
    const { data, error } = await supabase
      .from('productos')
      .select(`
        *,
        categorias(nombre)
      `)
      .eq('id_producto', id)
      .eq('tienda_id', currentStore.id)
      .maybeSingle();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const createProducto = async (producto: any, currentStore: { id: string } | null) => {
  if (!currentStore) return { data: null, error: { message: 'No hay tienda seleccionada' } };
  try {
    const { data, error } = await supabase
      .from('productos')
      .insert([{
        ...producto,
        tienda_id: currentStore.id // INCLUIR TIENDA_ID OBLIGATORIO
      }])
      .select()
      .single();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const updateProducto = async (id: string, producto: any, currentStore: { id: string } | null) => {
  if (!currentStore) return { data: null, error: { message: 'No hay tienda seleccionada' } };
  try {
    const { data, error } = await supabase
      .from('productos')
      .update(producto)
      .eq('id_producto', id)
      .eq('tienda_id', currentStore.id)
      .select()
      .maybeSingle();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const deleteProducto = async (id: string, currentStore: { id: string } | null) => {
  if (!currentStore) return { error: { message: 'No hay tienda seleccionada' } };
  try {
    const { error } = await supabase
      .from('productos')
      .delete()
      .eq('id_producto', id)
      .eq('tienda_id', currentStore.id);

    return { error };
  } catch (error) {
    return { error };
  }
};

export const buscarProductos = async (search: string, currentStore: { id: string } | null) => {
  if (!currentStore) return { data: [], error: { message: 'No hay tienda seleccionada' } };
  try {
    const { data, error } = await supabase
      .from('productos')
      .select('id_producto, descripcion_producto, codigo_producto')
      .eq('tienda_id', currentStore.id)
      .or(`descripcion_producto.ilike.%${search}%,codigo_producto.ilike.%${search}%`)
      .eq('activo', true)
      .limit(10);

    return { data: data || [], error };
  } catch (error) {
    return { data: [], error };
  }
};
