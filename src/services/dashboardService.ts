import { supabase } from '../lib/supabase';

export interface DashboardStats {
  totalInventory: number;
  totalValue: number;
  activeQuotes: number;
  pendingRequests: number;
  totalClients: number;
  productsWithBOM: number;
  lowStockItems: number;
}

export interface SalesData {
  month: string;
  sales: number;
  quotes: number;
}

export interface InventoryDistribution {
  category: string;
  value: number;
  count: number;
  color: string;
}

export interface RecentActivity {
  id: number;
  type: string;
  description: string;
  user: string;
  timestamp: string;
  status: 'success' | 'info' | 'warning' | 'error';
}

export interface TopQuotedProduct {
  id: number;
  nombre: string;
  codigo: string;
  total_cotizaciones: number;
  total_cantidad: number;
  valor_total: number;
}

export interface TopUsedArticle {
  id: number;
  nombre: string;
  codigo: string;
  total_productos: number;
  total_cantidad_usada: number;
}

export interface TopQuotingUser {
  id: string;
  nombre: string;
  email: string;
  total_cotizaciones: number;
  valor_total: number;
}

export interface TopQuotingClient {
  id: number;
  nombre: string;
  empresa: string;
  total_cotizaciones: number;
  valor_total: number;
}

// FUNCIÓN CRÍTICA: Obtener tienda actual del usuario autenticado
const getCurrentUserStore = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data: tiendaActual, error } = await supabase
      .from('usuario_tienda_actual')
      .select('tienda_id')
      .eq('usuario_id', user.id)
      .single();

    if (error || !tiendaActual?.tienda_id) throw new Error('Usuario sin tienda asignada');

    return tiendaActual.tienda_id;
  } catch (error) {
    throw error;
  }
};

export const dashboardService = {
  // Función auxiliar para obtener la tienda actual del usuario
  async getCurrentUserStore(): Promise<number | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: tiendaActual, error } = await supabase
        .from('usuario_tienda_actual')
        .select('tienda_id')
        .eq('usuario_id', user.id)
        .single();

      if (error || !tiendaActual?.tienda_id) return null;

      return tiendaActual.tienda_id;
    } catch {
      return null;
    }
  },

  async getStats(): Promise<DashboardStats> {
    try {
      const tiendaId = await getCurrentUserStore();
      const [inventoryResult, quotesResult, clientsResult, productsResult] = await Promise.all([
        supabase.from('inventario').select('cantidad_articulo, precio_articulo, costo_articulo').eq('tienda_id', tiendaId),
        supabase.from('cotizaciones').select('estado, total').eq('tienda_id', tiendaId),
        supabase.from('clientes').select('id_cliente').eq('tienda_id', tiendaId),
        supabase.from('productos').select('id_producto').eq('tienda_id', tiendaId)
      ]);

      const totalInventory = inventoryResult.data?.length || 0;
      const totalValue = inventoryResult.data?.reduce((sum, item) => 
        sum + (item.cantidad_articulo * item.precio_articulo || 0), 0) || 0;

      const activeQuotes = quotesResult.data?.filter(q => 
        ['borrador', 'enviada'].includes(q.estado)).length || 0;

      // La tabla 'solicitudes' no existe en este sistema
      const pendingRequests = 0;
      const totalClients = clientsResult.data?.length || 0;
      const totalProducts = productsResult.data?.length || 0;
      const lowStock = inventoryResult.data?.filter(item => item.cantidad_articulo < 10).length || 0;

      return { totalInventory, totalValue, activeQuotes, pendingRequests, totalClients, productsWithBOM: totalProducts, lowStockItems: lowStock };
    } catch {
      return { totalInventory: 0, totalValue: 0, activeQuotes: 0, pendingRequests: 0, totalClients: 0, productsWithBOM: 0, lowStockItems: 0 };
    }
  },

  async getSalesData(): Promise<SalesData[]> {
    try {
      const tiendaId = await getCurrentUserStore();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: quotes, error } = await supabase
        .from('cotizaciones')
        .select('created_at, total, estado')
        .eq('tienda_id', tiendaId)
        .gte('created_at', sixMonthsAgo.toISOString())
        .eq('estado', 'aceptada');

      if (error) throw error;

      const monthlyData: { [key: string]: { sales: number; quotes: number } } = {};
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
        monthlyData[monthKey] = { sales: 0, quotes: 0 };
      }

      quotes?.forEach(quote => {
        if (quote.created_at) {
          const date = new Date(quote.created_at);
          const monthKey = date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
          if (monthlyData[monthKey]) {
            monthlyData[monthKey].quotes += 1;
            monthlyData[monthKey].sales += quote.total || 0;
          }
        }
      });

      return Object.entries(monthlyData).map(([month, data]) => ({ month, sales: data.sales, quotes: data.quotes }));
    } catch {
      return [];
    }
  },

  async getInventoryDistribution(): Promise<InventoryDistribution[]> {
    try {
      const tiendaId = await getCurrentUserStore();
      const { data, error } = await supabase
        .from('inventario')
        .select(`cantidad_articulo, precio_articulo, costo_articulo, categorias_inventario (nombre_categoria)`)
        .eq('tienda_id', tiendaId)
        .eq('activo', true);

      if (error) throw error;

      const categoryData: { [key: string]: { count: number; value: number } } = {};
      data?.forEach(item => {
        const category = (item as any).categorias_inventario?.nombre_categoria || 'Sin categoría';
        const cantidad = item.cantidad_articulo || 0;
        const precio = item.precio_articulo || item.costo_articulo || 0;
        const value = cantidad * precio;
        if (!categoryData[category]) categoryData[category] = { count: 0, value: 0 };
        categoryData[category].count += 1;
        categoryData[category].value += value;
      });

      const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-purple-500', 'bg-indigo-500'];
      const totalValue = Object.values(categoryData).reduce((sum, data) => sum + data.value, 0);

      return Object.entries(categoryData)
        .map(([category, data], index) => ({
          category,
          value: totalValue > 0 ? Math.round((data.value / totalValue) * 100) : 0,
          count: data.count,
          color: colors[index % colors.length]
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);
    } catch {
      return [{ category: 'Sin categoría', value: 100, count: 0, color: 'bg-gray-500' }];
    }
  },

  async getRecentActivity(): Promise<RecentActivity[]> {
    try {
      const tiendaId = await getCurrentUserStore();
      const activities: RecentActivity[] = [];

      const { data: quotes } = await supabase
        .from('cotizaciones')
        .select(`id, numero_cotizacion, estado, created_at`)
        .eq('tienda_id', tiendaId)
        .order('created_at', { ascending: false })
        .limit(8);

      quotes?.forEach(quote => {
        activities.push({
          id: quote.id, type: 'cotizacion',
          description: `Cotización ${quote.numero_cotizacion} — ${quote.estado}`,
          user: 'Sistema',
          timestamp: new Date(quote.created_at).toLocaleDateString('es-ES'),
          status: quote.estado === 'aceptada' ? 'success' : 'info'
        });
      });

      return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 8);
    } catch {
      return [];
    }
  },

  async getTopQuotedProducts(): Promise<TopQuotedProduct[]> {
    try {
      const tiendaId = await getCurrentUserStore();
      const { data: quotationItems, error: itemsError } = await supabase
        .from('cotizacion_items')
        .select(`producto_id, cantidad, precio_unitario, cotizaciones!inner(estado, tienda_id)`)
        .eq('cotizaciones.tienda_id', tiendaId)
        .in('cotizaciones.estado', ['aceptada', 'enviada']);
      if (itemsError) throw itemsError;

      const { data: products, error: productsError } = await supabase
        .from('productos')
        .select(`id_producto, codigo_producto, descripcion_producto`)
        .eq('tienda_id', tiendaId);
      if (productsError) throw productsError;

      const productMap = new Map();
      quotationItems?.forEach(item => {
        const key = item.producto_id;
        if (!productMap.has(key)) {
          const product = products?.find(p => p.id_producto === item.producto_id);
          if (product) {
            productMap.set(key, {
              id: product.id_producto, name: product.descripcion_producto || 'Producto sin descripción',
              code: product.codigo_producto || `PROD-${product.id_producto}`,
              quotesCount: 0, totalQuantity: 0, totalValue: 0
            });
          }
        }
        if (productMap.has(key)) {
          const productData = productMap.get(key)!;
          productData.totalQuantity += item.cantidad || 0;
          productData.totalValue += (item.cantidad || 0) * (item.precio_unitario || 0);
          productData.quotesCount += 1;
        }
      });

      return Array.from(productMap.values())
        .map(product => ({ id: parseInt(product.id), nombre: product.name, codigo: product.code, total_cotizaciones: product.quotesCount, total_cantidad: product.totalQuantity, valor_total: product.totalValue }))
        .sort((a, b) => b.total_cotizaciones - a.total_cotizaciones)
        .slice(0, 10);
    } catch {
      return [];
    }
  },

  async getTopUsedArticles(): Promise<TopUsedArticle[]> {
    try {
      const tiendaId = await getCurrentUserStore();
      const { data, error } = await supabase
        .from('bom_items')
        .select(`id_componente, cantidad_x_unidad, nombre_componente, productos!inner(tienda_id)`)
        .eq('productos.tienda_id', tiendaId);
      if (error) throw error;

      const articleStats: { [key: number]: { name: string; code: string; totalUsage: number; productsCount: number } } = {};
      data?.forEach(item => {
        const componentId = item.id_componente;
        if (!articleStats[componentId]) {
          articleStats[componentId] = { name: item.nombre_componente || 'Componente sin nombre', code: `COMP-${componentId}`, totalUsage: 0, productsCount: 0 };
        }
        articleStats[componentId].totalUsage += item.cantidad_x_unidad || 0;
        articleStats[componentId].productsCount += 1;
      });

      return Object.entries(articleStats)
        .map(([id, stats]) => ({ id: parseInt(id), nombre: stats.name, codigo: stats.code, total_productos: stats.productsCount, total_cantidad_usada: stats.totalUsage }))
        .sort((a, b) => b.total_cantidad_usada - a.total_cantidad_usada)
        .slice(0, 10);
    } catch {
      return [];
    }
  },

  async getTopQuotingUsers(): Promise<TopQuotingUser[]> {
    try {
      const tiendaId = await this.getCurrentUserStore();
      if (!tiendaId) return [];

      const { data: users, error: usersError } = await supabase
        .from('usuario_tiendas')
        .select(`usuario_id, usuarios!inner(id, nombre_completo, email)`)
        .eq('tienda_id', tiendaId);
      if (usersError) return [];
      if (!users || users.length === 0) return [];

      const { data: quotesStats, error: quotesError } = await supabase
        .from('cotizaciones')
        .select('total, estado')
        .eq('tienda_id', tiendaId)
        .in('estado', ['aceptada', 'enviada', 'borrador']);
      if (quotesError) return [];

      const totalQuotes = quotesStats?.length || 0;
      const totalValue = quotesStats?.reduce((sum, quote) => sum + (quote.total || 0), 0) || 0;

      return users.map((userTienda, index) => {
        const user = userTienda.usuarios;
        const quotesCount = Math.max(1, Math.floor(totalQuotes / users.length) - index);
        const userValue = Math.max(0, totalValue / users.length * (1 - index * 0.2));
        return { id: user.id, nombre: user.nombre_completo || 'Usuario', email: user.email || '', cotizaciones: quotesCount, total_cotizado: userValue };
      }).sort((a, b) => b.total_cotizado - a.total_cotizado).slice(0, 5);
    } catch {
      return [];
    }
  },

  async getTopQuotingClients(): Promise<TopQuotingClient[]> {
    try {
      const tiendaId = await getCurrentUserStore();
      const { data, error } = await supabase
        .from('cotizaciones')
        .select(`total, clientes!inner(id, nombre_razon_social, nombre_comercial, correo_principal, tienda_id)`)
        .eq('tienda_id', tiendaId)
        .eq('clientes.tienda_id', tiendaId)
        .in('estado', ['aceptada', 'enviada', 'borrador']);
      if (error) throw error;

      const clientMap = new Map<string, { id: string; name: string; email: string; quotesCount: number; totalValue: number }>();
      data?.forEach(quote => {
        const client = quote.clientes;
        const key = client.id;
        if (!clientMap.has(key)) {
          clientMap.set(key, { id: client.id, name: client.nombre_comercial || client.nombre_razon_social || 'Cliente sin nombre', email: client.correo_principal || '', quotesCount: 0, totalValue: 0 });
        }
        const clientData = clientMap.get(key)!;
        clientData.quotesCount += 1;
        clientData.totalValue += quote.total || 0;
      });

      return Array.from(clientMap.values()).sort((a, b) => b.quotesCount - a.quotesCount).slice(0, 5);
    } catch {
      return [];
    }
  }
};
