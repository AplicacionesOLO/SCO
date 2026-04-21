import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { formatCurrency } from '../../../lib/currency';
import BuscarArticuloModal from './BuscarArticuloModal';
import BOMTable from './BOMTable';

interface Producto {
  id_producto?: number;
  codigo_producto: string;
  descripcion: string; // Cambiado de descripcion_producto a descripcion
  categoria_id: number;
  codigo_sistema?: string;
  activo?: boolean;
}

interface BOMItem {
  id?: number;
  id_componente: number;
  nombre_componente: string;
  cantidad_x_unidad: number;
  unidad_id: number;
  precio_unitario_base: number;
  precio_ajustado: number;
  categoria_nombre?: string;
  unidad_nombre?: string;
  unidad_simbolo?: string;
}

interface Props {
  producto: Producto | null;
  onGuardar: () => void;
  onCerrar: () => void;
}

export default function ProductosForm({ producto, onGuardar, onCerrar }: Props) {
  // Alias para compatibilidad con el código modificado
  const productoEditar = producto;
  const onSuccess = onGuardar;
  const onClose = onCerrar;
  const { currentStore } = useAuth();

  const [formData, setFormData] = useState({
    codigo_producto: '',
    descripcion_producto: '',
    categoria_id: '',
    codigo_sistema: ''
  });

  const [categorias, setCategorias] = useState<any[]>([]);
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [showBuscarModal, setShowBuscarModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [costoTotal, setCostoTotal] = useState(0);
  const [tiendaActual, setTiendaActual] = useState<number | null>(null);

  useEffect(() => {
    cargarTiendaActual();
    cargarCategorias();

    if (productoEditar) {
      setFormData({
        codigo_producto: productoEditar.codigo_producto || '',
        descripcion_producto: (productoEditar as any).descripcion_producto || '',
        categoria_id: productoEditar.categoria_id?.toString() || '',
        codigo_sistema: productoEditar.codigo_sistema || ''
      });
      
      // Cargar componentes BOM del producto
      cargarBOMItems(productoEditar.id_producto!);
    } else {
      // Al crear nuevo producto, generar código automáticamente
      generarCodigoProducto();
      setBomItems([]); // Limpiar componentes para nuevo producto
    }
  }, [productoEditar]);

  useEffect(() => {
    calcularCostoTotal();
  }, [bomItems]);

  const cargarTiendaActual = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Usuario no autenticado');
        return;
      }

      const { data, error } = await supabase
        .from('usuario_tienda_actual')
        .select('tienda_id')
        .eq('usuario_id', user.id)
        .single();

      if (error) {
        console.error('Error obteniendo tienda actual:', error);
        setError('No se pudo obtener la tienda actual. Por favor, selecciona una tienda.');
        return;
      }

      if (data?.tienda_id) {
        setTiendaActual(data.tienda_id);
      } else {
        setError('No tienes una tienda seleccionada. Por favor, selecciona una tienda.');
      }
    } catch (error) {
      console.error('Error cargando tienda actual:', error);
      setError('Error al cargar la tienda actual');
    }
  };

  const cargarCategorias = async () => {
    if (!currentStore?.id) return;
    const { data } = await supabase
      .from('categorias')
      .select('*')
      .eq('tienda_id', currentStore.id)
      .order('nombre');
    setCategorias(data || []);
  };

  const generarCodigoSistema = async () => {
    try {
      const { data } = await supabase
        .from('productos')
        .select('codigo_sistema')
        .not('codigo_sistema', 'is', null)
        .order('codigo_sistema', { ascending: false })
        .limit(1);

      let siguienteNumero = 1;
      
      if (data && data.length > 0 && data[0].codigo_sistema) {
        const ultimoCodigo = data[0].codigo_sistema;
        const numero = parseInt(ultimoCodigo);
        if (!isNaN(numero)) {
          siguienteNumero = numero + 1;
        }
      }

      // Verificar que el código de sistema no exista
      let codigoUnico = false;
      let intentos = 0;
      let codigoGenerado = '';

      while (!codigoUnico && intentos < 100) {
        codigoGenerado = (siguienteNumero + intentos).toString().padStart(6, '0');
        
        const { data: existente } = await supabase
          .from('productos')
          .select('id_producto')
          .eq('codigo_sistema', codigoGenerado)
          .maybeSingle();

        if (!existente) {
          codigoUnico = true;
        } else {
          intentos++;
        }
      }

      setFormData(prev => ({
        ...prev,
        codigo_sistema: codigoGenerado
      }));
    } catch (error) {
      console.error('Error generando código de sistema:', error);
      // Fallback con timestamp
      setFormData(prev => ({
        ...prev,
        codigo_sistema: Date.now().toString().slice(-6)
      }));
    }
  };

  const generarCodigoProducto = async () => {
    try {
      // Intentar hasta 10 veces para encontrar un código único
      for (let intento = 0; intento < 10; intento++) {
        const { data } = await supabase
          .from('productos')
          .select('codigo_producto')
          .like('codigo_producto', 'PROD-%')
          .order('codigo_producto', { ascending: false })
          .limit(1);

        let siguienteNumero = 1;
        
        if (data && data.length > 0 && data[0].codigo_producto) {
          const ultimoCodigo = data[0].codigo_producto;
          const match = ultimoCodigo.match(/PROD-(\d+)/);
          if (match) {
            const numero = parseInt(match[1]);
            if (!isNaN(numero)) {
              siguienteNumero = numero + 1 + intento; // Sumar intento para evitar colisiones
            }
          }
        }

        const codigoGenerado = `PROD-${siguienteNumero.toString().padStart(3, '0')}`;
        
        // Verificar que no exista
        const { data: existente } = await supabase
          .from('productos')
          .select('id_producto')
          .eq('codigo_producto', codigoGenerado)
          .maybeSingle();

        if (!existente) {
          // Código único encontrado
          setFormData(prev => ({
            ...prev,
            codigo_producto: codigoGenerado
          }));
          return codigoGenerado;
        }
      }

      // Si después de 10 intentos no se encuentra, usar timestamp
      const timestamp = Date.now().toString().slice(-6);
      const codigoFallback = `PROD-${timestamp}`;
      setFormData(prev => ({
        ...prev,
        codigo_producto: codigoFallback
      }));
      return codigoFallback;
    } catch (error) {
      console.error('Error generando código de producto:', error);
      // Fallback con timestamp para garantizar unicidad
      const timestamp = Date.now().toString().slice(-6);
      const codigoFallback = `PROD-${timestamp}`;
      setFormData(prev => ({
        ...prev,
        codigo_producto: codigoFallback
      }));
      return codigoFallback;
    }
  };

  const cargarBOMItems = async (productoId: number) => {
    try {
      const { data, error } = await supabase
        .from('bom_items')
        .select(`
          *,
          inventario:inventario!id_componente(descripcion_articulo, categoria:categorias(nombre)),
          unidad_medida:unidades_medida!unidad_id(nombre, simbolo)
        `)
        .eq('product_id', productoId);

      if (error) {
        console.error('Error cargando BOM items:', error);
        return;
      }

      if (data) {
        const items = data.map(item => ({
          id: item.id,
          id_componente: item.id_componente,
          nombre_componente: item.nombre_componente,
          cantidad_x_unidad: item.cantidad_x_unidad,
          unidad_id: item.unidad_id,
          precio_unitario_base: item.precio_unitario_base,
          precio_ajustado: item.precio_ajustado,
          categoria_nombre: item.inventario?.categoria?.nombre,
          unidad_nombre: item.unidad_medida?.nombre,
          unidad_simbolo: item.unidad_medida?.simbolo
        }));
        setBomItems(items);
      }
    } catch (error) {
      console.error('Error cargando componentes BOM:', error);
    }
  };

  const calcularCostoTotal = () => {
    const total = bomItems.reduce((sum, item) => sum + item.precio_ajustado, 0);
    setCostoTotal(total);
  };

  const validarFormulario = async () => {
    setError('');
    
    if (!formData.codigo_producto.trim()) {
      setError('El código del producto es requerido');
      return false;
    }
    
    if (!formData.descripcion_producto.trim()) {
      setError('La descripción del producto es requerida');
      return false;
    }
    
    if (!formData.categoria_id || formData.categoria_id === '') {
      setError('La categoría es requerida');
      return false;
    }

    // Validar unicidad del código de producto
    if (!productoEditar || formData.codigo_producto !== productoEditar.codigo_producto) {
      try {
        const { data: existente } = await supabase
          .from('productos')
          .select('id_producto')
          .eq('codigo_producto', formData.codigo_producto)
          .maybeSingle();

        if (existente && (!productoEditar || existente.id_producto !== productoEditar.id_producto)) {
          setError('El código de producto ya existe. Generando uno nuevo...');
          await generarCodigoProducto();
          return false;
        }
      } catch (error) {
        console.error('Error validando código:', error);
      }
    }

    // Validar unicidad del código de sistema
    if (formData.codigo_sistema) {
      try {
        const { data: existente } = await supabase
          .from('productos')
          .select('id_producto')
          .eq('codigo_sistema', formData.codigo_sistema)
          .maybeSingle();

        if (existente && (!productoEditar || existente.id_producto !== productoEditar.id_producto)) {
          setError('El código de sistema ya existe. Generando uno nuevo...');
          await generarCodigoSistema();
          return false;
        }
      } catch (error) {
        console.error('Error validando código de sistema:', error);
      }
    }

    return true;
  };

  // Función auxiliar para verificar código único
  const verificarCodigoUnico = async (codigo: string): Promise<boolean> => {
    try {
      const { data: existente } = await supabase
        .from('productos')
        .select('id_producto')
        .eq('codigo_producto', codigo)
        .maybeSingle();

      return !existente;
    } catch (error) {
      console.error('Error verificando código:', error);
      return false;
    }
  };

  // Función auxiliar para generar código único
  const generarCodigoUnico = async (): Promise<string> => {
    try {
      const { data } = await supabase
        .from('productos')
        .select('codigo_producto')
        .like('codigo_producto', 'PROD-%')
        .order('codigo_producto', { ascending: false })
        .limit(1);

      let siguienteNumero = 1;
      
      if (data && data.length > 0 && data[0].codigo_producto) {
        const ultimoCodigo = data[0].codigo_producto;
        const match = ultimoCodigo.match(/PROD-(\d+)/);
        if (match) {
          const numero = parseInt(match[1]);
          if (!isNaN(numero)) {
            siguienteNumero = numero + 1;
          }
        }
      }

      // Verificar que el código no exista antes de asignarlo
      let codigoUnico = false;
      let intentos = 0;
      let codigoGenerado = '';

      while (!codigoUnico && intentos < 100) {
        codigoGenerado = `PROD-${(siguienteNumero + intentos).toString().padStart(3, '0')}`;
        
        const { data: existente } = await supabase
          .from('productos')
          .select('id_producto')
          .eq('codigo_producto', codigoGenerado)
          .maybeSingle();

        if (!existente) {
          codigoUnico = true;
        } else {
          intentos++;
        }
      }

      return codigoGenerado;
    } catch (error) {
      console.error('Error generando código único:', error);
      // Fallback con timestamp para garantizar unicidad
      const timestamp = Date.now().toString().slice(-6);
      return `PROD-${timestamp}`;
    }
  };

  // Función para mapear ID de unidad a símbolo válido del enum
  const mapearUnidad = (unidadId: number): string => {
    const mapeoUnidades: { [key: number]: string } = {
      1: 'Uni',    // Unidad
      2: 'kg',     // Kilogramo
      3: 'g',      // Gramo
      4: 'm',      // Metro
      5: 'cm',     // Centímetro
      6: 'mm',     // Milímetro
      7: 'h',      // Hora
      8: 'min',    // Minuto
      9: 's',      // Segundo
      10: 'Uni'    // Por defecto Unidad
    };
    return mapeoUnidades[unidadId] || 'Uni';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tiendaActual) {
      setError('No hay tienda seleccionada');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Validar formulario primero
      const esValido = await validarFormulario();
      if (!esValido) {
        setLoading(false);
        return;
      }

      // Verificación final antes de guardar (solo para productos nuevos)
      if (!productoEditar) {
        const { data: existingProduct } = await supabase
          .from('productos')
          .select('id_producto')
          .eq('codigo_producto', formData.codigo_producto)
          .maybeSingle();

        if (existingProduct) {
          // Si existe, generar un nuevo código y reintentar
          setError('El código ya está en uso. Generando uno nuevo...');
          const nuevoCodigo = await generarCodigoProducto();
          
          // Esperar un momento para que el usuario vea el nuevo código
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Reintentar el guardado con el nuevo código
          setError('');
        }
      }

      let productoId: number;

      if (productoEditar) {
        // Actualizar producto existente
        const { data, error } = await supabase
          .from('productos')
          .update({
            codigo_producto: formData.codigo_producto,
            descripcion_producto: formData.descripcion_producto,
            categoria_id: parseInt(formData.categoria_id),
            codigo_sistema: formData.codigo_sistema,
            costo_total_bom: costoTotal
          })
          .eq('id_producto', productoEditar.id_producto)
          .select()
          .single();

        if (error) throw error;
        productoId = data.id_producto;

        // Eliminar componentes existentes del BOM antes de insertar los nuevos
        const { error: deleteError } = await supabase
          .from('bom_items')
          .delete()
          .eq('product_id', productoId);

        if (deleteError) throw deleteError;
      } else {
        // Crear nuevo producto CON tienda_id
        const { data, error } = await supabase
          .from('productos')
          .insert({
            codigo_producto: formData.codigo_producto,
            descripcion_producto: formData.descripcion_producto,
            categoria_id: parseInt(formData.categoria_id),
            codigo_sistema: formData.codigo_sistema,
            costo_total_bom: costoTotal,
            tienda_id: tiendaActual
          })
          .select()
          .single();

        if (error) throw error;
        productoId = data.id_producto;
      }

      // Guardar componentes del BOM si existen
      if (bomItems.length > 0) {
        const bomData = bomItems.map(comp => ({
          product_id: productoId,
          id_componente: comp.id_componente,
          nombre_componente: comp.nombre_componente,
          cantidad_x_unidad: comp.cantidad_x_unidad,
          unidad_id: comp.unidad_id,
          unidad: mapearUnidad(comp.unidad_id),
          precio_unitario_base: comp.precio_unitario_base,
          precio_ajustado: comp.precio_ajustado
        }));

        const { error: bomError } = await supabase
          .from('bom_items')
          .insert(bomData);

        if (bomError) throw bomError;
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error guardando producto:', error);
      
      // Manejo específico de errores
      if (error?.code === '23505') {
        if (error?.message?.includes('productos_codigo_producto_key')) {
          // Generar automáticamente un nuevo código
          setError('El código ya está en uso. Generando uno nuevo automáticamente...');
          await generarCodigoProducto();
          
          // Mostrar mensaje al usuario
          setTimeout(() => {
            setError('Se ha generado un nuevo código. Por favor, intenta guardar nuevamente.');
          }, 1000);
        } else if (error?.message?.includes('productos_codigo_sistema_key')) {
          setError('El código de sistema ya está en uso. Por favor, genera uno nuevo.');
          await generarCodigoSistema();
        } else {
          setError('Ya existe un producto con estos datos. Por favor, verifica la información.');
        }
      } else if (error?.code === '42501') {
        setError('No tienes permisos para realizar esta acción. Contacta al administrador.');
      } else {
        setError(error?.message || 'Error al guardar el producto. Por favor, intenta nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const agregarComponente = (articulo: any, cantidad: number, unidadId: number, precioAjustado: number) => {
    if (!articulo?.id_articulo || !unidadId || cantidad <= 0) {
      setError('Datos incompletos para agregar el componente');
      return;
    }

    const nuevoItem: BOMItem = {
      id_componente: articulo.id_articulo,
      nombre_componente: articulo.descripcion_articulo,
      cantidad_x_unidad: cantidad,
      unidad_id: unidadId,
      precio_unitario_base: articulo.precio_articulo,
      precio_ajustado: precioAjustado,
      categoria_nombre: articulo.categoria?.nombre,
      unidad_nombre: articulo.unidad?.nombre,
      unidad_simbolo: articulo.unidad?.simbolo
    };

    setBomItems([...bomItems, nuevoItem]);
    setShowBuscarModal(false);
  };

  const eliminarComponente = (index: number) => {
    setBomItems(bomItems.filter((_, i) => i !== index));
  };

  const editarComponente = (index: number, cantidad: number, unidadId: number, precioAjustado: number) => {
    const items = [...bomItems];
    if (index >= 0 && index < items.length) {
      items[index] = {
        ...items[index],
        cantidad_x_unidad: cantidad,
        unidad_id: unidadId,
        precio_ajustado: precioAjustado
      };
      setBomItems(items);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {producto ? 'Editar Producto' : 'Nuevo Producto'}
            </h2>
            <button
              onClick={onCerrar}
              className="text-gray-400 hover:text-gray-600"
            >
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información básica del producto */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código del Producto * (Autoincremental)
                </label>
                <input
                  type="text"
                  value={formData.codigo_producto}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                  placeholder="Se genera automáticamente"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Este código se genera automáticamente (PROD-001, PROD-002, etc.)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría *
                </label>
                <select
                  value={formData.categoria_id}
                  onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
                  className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Seleccionar categoría</option>
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción del Producto *
                </label>
                <textarea
                  value={formData.descripcion_producto}
                  onChange={(e) => setFormData({...formData, descripcion_producto: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  required
                  placeholder="Descripción detallada del producto"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código de Sistema {!producto && '*'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.codigo_sistema}
                    onChange={(e) => setFormData({ ...formData, codigo_sistema: e.target.value })}
                    readOnly={!!producto}
                    className={`flex-1 px-3 py-2 border border-gray-300 rounded-lg ${
                      producto 
                        ? 'bg-gray-50 text-gray-600 cursor-not-allowed' 
                        : 'focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                    }`}
                    placeholder={producto ? "Código asignado" : "Ingrese código de sistema"}
                    required={!producto}
                  />
                  {!producto && (
                    <button
                      type="button"
                      onClick={generarCodigoSistema}
                      className="bg-blue-100 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-200 transition-colors whitespace-nowrap"
                      title="Generar código automático"
                    >
                      <i className="ri-refresh-line"></i>
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {producto 
                    ? "El código de sistema no se puede modificar al editar" 
                    : "Ingrese un código único o genere uno automáticamente"
                  }
                </p>
              </div>
            </div>

            {/* Sección BOM */}
            <div className="border-t pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Lista de Materiales (BOM)
                </h3>
                <button
                  type="button"
                  onClick={() => setShowBuscarModal(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
                >
                  <i className="ri-add-line mr-2"></i>
                  Agregar Componente
                </button>
              </div>

              <BOMTable
                items={bomItems}
                onEliminar={eliminarComponente}
                onEditar={editarComponente}
              />

              {bomItems.length > 0 && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-blue-900">Costo Total del Producto:</span>
                    <span className="text-xl font-bold text-blue-900">
                      {formatCurrency(costoTotal)}
                    </span>
                  </div>
                  <p className="text-xs text-blue-700 mt-1">
                    Suma de todos los componentes BOM
                  </p>
                </div>
              )}
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-770 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {loading ? (
                  <>
                    <i className="ri-loader-line animate-spin mr-2"></i>
                    Guardando...
                  </>
                ) : (
                  <>
                    <i className="ri-save-line mr-2"></i>
                    {producto ? 'Actualizar' : 'Crear'} Producto
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onCerrar}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors whitespace-nowrap"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal de búsqueda de artículos */}
      {showBuscarModal && (
        <BuscarArticuloModal
          onSeleccionar={agregarComponente}
          onCerrar={() => setShowBuscarModal(false)}
        />
      )}
    </div>
  );
}
