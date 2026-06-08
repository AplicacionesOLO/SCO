import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import ProductosForm from './components/ProductosForm';
import ProductosTable from './components/ProductosTable';
import ProductosLayout from './components/ProductosLayout';
import CategoriasProductosManager from './components/CategoriasProductosManager';
import { PermissionButton } from '../../components/base/PermissionButton';
import { showAlert, showConfirm } from '../../utils/dialog';

interface Producto {
  id_producto: number;
  codigo_producto: string;
  descripcion_producto: string;
  categoria_id: number;
  codigo_sistema?: string;
  activo?: boolean;
  categoria?: {
    nombre: string;
  };
  created_at: string;
}

interface Categoria {
  id: number;
  nombre: string;
}

type TabActiva = 'productos' | 'categorias';

export default function ProductosPage() {
  const [tabActiva, setTabActiva] = useState<TabActiva>('productos');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { currentStore } = useAuth();
  
  // Estados para filtros con búsqueda en tiempo real
  const [filtros, setFiltros] = useState({
    busqueda: '',
    categoria: null as number | null,
    mostrarInactivos: false,
    ordenar: 'codigo_producto' as keyof Producto
  });

  // Estados para paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [registrosPorPagina, setRegistrosPorPagina] = useState(10);
  const [totalRegistros, setTotalRegistros] = useState(0);

  // Cargar datos iniciales
  useEffect(() => {
    cargarProductos();
    cargarCategorias();
  }, []);

  // Cargar productos cuando cambian los filtros o la paginación
  useEffect(() => {
    cargarProductos();
  }, [filtros.busqueda, filtros.categoria, filtros.mostrarInactivos, filtros.ordenar, refreshTrigger, paginaActual, registrosPorPagina]);

  const cargarCategorias = async () => {
    if (!currentStore?.id) return;
    const { data } = await supabase
      .from('categorias')
      .select('*')
      .eq('tienda_id', currentStore.id)
      .order('nombre');
    setCategorias(data as Categoria[] || []);
  };

  const cargarProductos = async () => {
    setLoading(true);
    try {
      if (!currentStore?.id) {
        setProductos([]);
        setTotalRegistros(0);
        setLoading(false);
        return;
      }

      // Primero obtener el total de registros para la paginación
      let countQuery = supabase
        .from('productos')
        .select('*', { count: 'exact', head: true })
        .eq('tienda_id', currentStore.id);

      // Aplicar los mismos filtros para el conteo
      if (filtros.busqueda.trim()) {
        countQuery = countQuery.or(`codigo_producto.ilike.%${filtros.busqueda}%,descripcion_producto.ilike.%${filtros.busqueda}%,codigo_sistema.ilike.%${filtros.busqueda}%`);
      }

      if (filtros.categoria) {
        countQuery = countQuery.eq('categoria_id', filtros.categoria);
      }

      if (!filtros.mostrarInactivos) {
        countQuery = countQuery.eq('activo', true);
      }

      const { count } = await countQuery;
      setTotalRegistros(count || 0);

      // Ahora obtener los datos con paginación
      const desde = (paginaActual - 1) * registrosPorPagina;
      const hasta = desde + registrosPorPagina - 1;

      let query = supabase
        .from('productos')
        .select(`
          *,
          categorias(nombre),
          bom_items:bom_items!product_id(*, inventario:inventario!id_componente(precio_articulo))
        `)
        .eq('tienda_id', currentStore.id)
        .range(desde, hasta);

      // Filtro de búsqueda
      if (filtros.busqueda.trim()) {
        query = query.or(`codigo_producto.ilike.%${filtros.busqueda}%,descripcion_producto.ilike.%${filtros.busqueda}%,codigo_sistema.ilike.%${filtros.busqueda}%`);
      }

      // Filtro de categoría
      if (filtros.categoria) {
        query = query.eq('categoria_id', filtros.categoria);
      }

      // Filtro de activos/inactivos
      if (!filtros.mostrarInactivos) {
        query = query.eq('activo', true);
      }

      query = query.order(filtros.ordenar);

      const { data, error } = await query;
      
      if (error) throw error;
      
      // Calcular el costo total BOM usando precios ACTUALES de inventario
      const productosConCosto = (data || []).map(producto => {
        const itemsBOM = producto.bom_items || [];
        const costoTotal = itemsBOM.reduce((sum: number, item: any) => {
          const precioActualInventario = item.inventario?.precio_articulo ?? item.precio_unitario_base;
          const precioBaseGuardado = item.precio_unitario_base;
          const precioCambio = Math.abs(precioActualInventario - precioBaseGuardado) > 0.001;
          
          const precioAjustado = precioCambio && precioBaseGuardado > 0
            ? (item.precio_ajustado / precioBaseGuardado) * precioActualInventario
            : (item.precio_ajustado || 0);
          
          return sum + precioAjustado;
        }, 0);
        return {
          ...producto,
          costo_total_bom: costoTotal
        };
      });
      
      setProductos(productosConCosto as Producto[] || []);
    } catch (err) {
      console.error('Error cargando productos:', err);
    } finally {
      setLoading(false);
    }
  };

  // Función de búsqueda en tiempo real (sin debounce)
  const handleBusquedaChange = (valor: string) => {
    setFiltros(prev => ({ ...prev, busqueda: valor }));
    setPaginaActual(1); // Resetear a la primera página al buscar
  };

  const handleEliminarProducto = async (id: number) => {
    if (!(await showConfirm('¿Estás seguro de eliminar permanentemente este producto? Esta acción no se puede deshacer.', { type: 'danger', title: 'Eliminar producto' }))) return;

    try {
      const { data: bomItems } = await supabase
        .from('bom_items')
        .select('id')
        .eq('producto_id', id);

      if (bomItems && bomItems.length > 0) {
        showAlert('No se puede eliminar este producto porque tiene componentes BOM asociados. Considera inactivarlo en su lugar.');
        return;
      }

      const { error } = await supabase
        .from('productos')
        .delete()
        .eq('id_producto', id);

      if (error) throw error;
      
      cargarProductos();
      showAlert('Producto eliminado exitosamente');
    } catch (err) {
      console.error('Error eliminando producto:', err);
      showAlert('Error al eliminar el producto');
    }
  };

  const handleInactivarProducto = async (id: number) => {
    try {
      const { data: producto } = await supabase
        .from('productos')
        .select('activo')
        .eq('id_producto', id)
        .single();

      const nuevoEstado = !producto?.activo;
      const accion = nuevoEstado ? 'activar' : 'inactivar';
      
      if (!(await showConfirm(`¿Estás seguro de ${accion} este producto?`, { type: 'warning', title: 'Cambiar estado' }))) return;

      const { error } = await supabase
        .from('productos')
        .update({ activo: nuevoEstado })
        .eq('id_producto', id);
      
      if (error) throw error;
      await cargarProductos();
      showAlert(`Producto ${nuevoEstado ? 'activado' : 'inactivado'} correctamente`);
    } catch (err) {
      console.error('Error cambiando estado del producto:', err);
      showAlert('Error al cambiar el estado del producto');
    }
  };

  const handleEditarProducto = (producto: Producto) => {
    setEditingProducto(producto);
    setShowForm(true);
  };

  const handleDuplicarProducto = async (id: number) => {
    if (!currentStore?.id) return;

    if (!(await showConfirm('¿Duplicar este producto con todos sus componentes BOM? Se creará una copia exacta con nuevo código.', { title: 'Duplicar producto' }))) return;

    try {
      setLoading(true);

      // 1. Obtener producto original
      const { data: original, error: fetchError } = await supabase
        .from('productos')
        .select('*')
        .eq('id_producto', id)
        .eq('tienda_id', currentStore.id)
        .single();

      if (fetchError || !original) {
        showAlert('Error al obtener el producto original');
        return;
      }

      // 2. Obtener BOM items originales
      const { data: bomOriginal } = await supabase
        .from('bom_items')
        .select('*')
        .eq('product_id', id);

      // 3. Generar nuevo código de producto
      const { data: ultimoProd } = await supabase
        .from('productos')
        .select('codigo_producto')
        .eq('tienda_id', currentStore.id)
        .like('codigo_producto', 'PROD-%')
        .order('codigo_producto', { ascending: false })
        .limit(1);

      let siguiente = 1;
      if (ultimoProd && ultimoProd.length > 0 && ultimoProd[0].codigo_producto) {
        const match = ultimoProd[0].codigo_producto.match(/PROD-(\d+)/);
        if (match) {
          const num = parseInt(match[1]);
          if (!isNaN(num)) siguiente = num + 1;
        }
      }
      const nuevoCodigo = `PROD-${siguiente.toString().padStart(3, '0')}`;

      // 4. Generar nuevo código de sistema
      const { data: ultimoSist } = await supabase
        .from('productos')
        .select('codigo_sistema')
        .eq('tienda_id', currentStore.id)
        .not('codigo_sistema', 'is', null)
        .order('codigo_sistema', { ascending: false })
        .limit(1);

      let sigSistema = 1;
      if (ultimoSist && ultimoSist.length > 0 && ultimoSist[0].codigo_sistema) {
        const num = parseInt(ultimoSist[0].codigo_sistema);
        if (!isNaN(num)) sigSistema = num + 1;
      }
      const nuevoCodigoSistema = sigSistema.toString().padStart(6, '0');

      // 5. Crear nuevo producto
      const { data: nuevo, error: insertError } = await supabase
        .from('productos')
        .insert({
          codigo_producto: nuevoCodigo,
          descripcion_producto: (original as any).descripcion_producto + ' (copia)',
          categoria_id: original.categoria_id,
          codigo_sistema: nuevoCodigoSistema,
          tienda_id: currentStore.id,
          moneda: (original as any).moneda || 'CRC',
          activo: true
        })
        .select()
        .single();

      if (insertError || !nuevo) {
        console.error('Error creando producto duplicado:', insertError);
        showAlert('Error al crear el producto duplicado');
        return;
      }

      // 6. Copiar BOM items
      if (bomOriginal && bomOriginal.length > 0) {
        const nuevosBOM = bomOriginal.map((item: any) => ({
          product_id: nuevo.id_producto,
          id_componente: item.id_componente,
          nombre_componente: item.nombre_componente,
          cantidad_x_unidad: item.cantidad_x_unidad,
          unidad_id: item.unidad_id,
          unidad: item.unidad || 'Uni',
          precio_unitario_base: item.precio_unitario_base,
          precio_ajustado: item.precio_ajustado
        }));

        const { error: bomError } = await supabase
          .from('bom_items')
          .insert(nuevosBOM);

        if (bomError) {
          console.error('Error copiando BOM items:', bomError);
          showAlert('Producto duplicado pero hubo error al copiar los componentes BOM');
          cargarProductos();
          return;
        }
      }

      await cargarProductos();
      showAlert(`Producto duplicado correctamente como "${nuevoCodigo}"`);
    } catch (err) {
      console.error('Error duplicando producto:', err);
      showAlert('Error al duplicar el producto');
    } finally {
      setLoading(false);
    }
  };

  const cerrarForm = () => {
    setShowForm(false);
    setEditingProducto(null);
  };

  const handleGuardarProducto = () => {
    cargarProductos();
    cerrarForm();
  };

  // Calcular información de paginación
  const totalPaginas = Math.ceil(totalRegistros / registrosPorPagina);
  const registroDesde = totalRegistros === 0 ? 0 : (paginaActual - 1) * registrosPorPagina + 1;
  const registroHasta = Math.min(paginaActual * registrosPorPagina, totalRegistros);

  if (loading && productos.length === 0 && tabActiva === 'productos') {
    return (
      <ProductosLayout>
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
        </div>
      </ProductosLayout>
    );
  }

  return (
    <ProductosLayout>
      <div className="space-y-6">
        {/* Header con pestañas */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
          </div>
          {tabActiva === 'productos' && (
            <PermissionButton
              permission="productos:create"
              variant="primary"
              onClick={() => setShowForm(true)}
            >
              <i className="ri-add-line mr-2"></i>
              Nuevo Producto
            </PermissionButton>
          )}
        </div>

        {/* Pestañas */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-1 -mb-px">
            <button
              onClick={() => setTabActiva('productos')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                tabActiva === 'productos'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <i className="ri-box-3-line mr-2"></i>
              Productos
            </button>
            <button
              onClick={() => setTabActiva('categorias')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                tabActiva === 'categorias'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <i className="ri-price-tag-3-line mr-2"></i>
              Categorías
            </button>
          </nav>
        </div>

        {/* Contenido de la pestaña Categorías */}
        {tabActiva === 'categorias' && (
          <CategoriasProductosManager />
        )}

        {/* Contenido de la pestaña Productos */}
        {tabActiva === 'productos' && (<>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Búsqueda en tiempo real */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={filtros.busqueda}
                  onChange={(e) => handleBusquedaChange(e.target.value)}
                  placeholder="Código, descripción o código sistema..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                {loading && filtros.busqueda && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría
              </label>
              <select
                value={filtros.categoria || ''}
                onChange={(e) => {
                  setFiltros(prev => ({ 
                    ...prev, 
                    categoria: e.target.value ? parseInt(e.target.value) : null 
                  }));
                  setPaginaActual(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8"
              >
                <option value="">Todas las categorías</option>
                {categorias.map(categoria => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Ordenar por */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ordenar por
              </label>
              <select
                value={filtros.ordenar}
                onChange={(e) => setFiltros(prev => ({ 
                  ...prev, 
                  ordenar: e.target.value as keyof Producto 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8"
              >
                <option value="codigo_producto">Código Producto</option>
                <option value="descripcion_producto">Descripción</option>
                <option value="codigo_sistema">Código Sistema</option>
                <option value="created_at">Fecha Creación</option>
              </select>
            </div>

            {/* Mostrar inactivos */}
            <div className="flex items-end">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filtros.mostrarInactivos}
                  onChange={(e) => {
                    setFiltros(prev => ({ 
                      ...prev, 
                      mostrarInactivos: e.target.checked 
                    }));
                    setPaginaActual(1);
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Mostrar inactivos</span>
              </label>
            </div>
          </div>
        </div>

        {/* Información de paginación y selector de registros */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Mostrar</span>
              <select
                value={registrosPorPagina}
                onChange={(e) => {
                  setRegistrosPorPagina(Number(e.target.value));
                  setPaginaActual(1);
                }}
                className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8"
              >
                <option value={10}>10</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-gray-700">registros</span>
            </div>

            <div className="text-sm text-gray-700">
              Mostrando {registroDesde} a {registroHasta} de {totalRegistros} registros
            </div>

            {/* Controles de paginación */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPaginaActual(1)}
                disabled={paginaActual === 1}
                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Primera página"
              >
                <i className="ri-skip-back-mini-line"></i>
              </button>
              <button
                onClick={() => setPaginaActual(prev => Math.max(1, prev - 1))}
                disabled={paginaActual === 1}
                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Página anterior"
              >
                <i className="ri-arrow-left-s-line"></i>
              </button>
              
              <span className="px-4 py-1 text-sm text-gray-700">
                Página {paginaActual} de {totalPaginas || 1}
              </span>
              
              <button
                onClick={() => setPaginaActual(prev => Math.min(totalPaginas, prev + 1))}
                disabled={paginaActual >= totalPaginas}
                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Página siguiente"
              >
                <i className="ri-arrow-right-s-line"></i>
              </button>
              <button
                onClick={() => setPaginaActual(totalPaginas)}
                disabled={paginaActual >= totalPaginas}
                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Última página"
              >
                <i className="ri-skip-forward-mini-line"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Formulario Modal */}
        {showForm && (
          <ProductosForm
            producto={editingProducto}
            onGuardar={handleGuardarProducto}
            onCerrar={() => {
              setShowForm(false);
              setEditingProducto(null);
            }}
          />
        )}

        {/* Tabla de productos */}
        <ProductosTable
          productos={productos}
          loading={loading}
          onEdit={handleEditarProducto}
          onInactivar={handleInactivarProducto}
          onEliminar={handleEliminarProducto}
          onDuplicar={handleDuplicarProducto}
        />
        </>)}
      </div>
    </ProductosLayout>
  );
}
