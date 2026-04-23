import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { formatCurrency } from '../../../lib/currency';
import { showSuccess, showError } from '../../../utils/dialog';
import BuscarArticuloModal from './BuscarArticuloModal';
import BOMTable from './BOMTable';

interface Producto {
  id_producto?: number;
  codigo_producto: string;
  descripcion: string;
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
  const productoEditar = producto;
  const onSuccess = onGuardar;
  const onClose = onCerrar;
  const { currentStore } = useAuth();

  const [formData, setFormData] = useState({
    codigo_producto: '',
    descripcion_producto: '',
    categoria_id: '',
    codigo_sistema: '',
    moneda: 'CRC'
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
        codigo_sistema: productoEditar.codigo_sistema || '',
        moneda: (productoEditar as any).moneda || 'CRC'
      });
      cargarBOMItems(productoEditar.id_producto!);
    } else {
      generarCodigoProducto();
      setBomItems([]);
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
        .maybeSingle();

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
    } catch (err) {
      console.error('Error cargando tienda actual:', err);
      setError('Error al cargar la tienda actual');
    }
  };

  const cargarCategorias = async () => {
    try {
      if (!currentStore?.id) return;
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .eq('tienda_id', currentStore.id)
        .order('nombre');

      if (error) {
        console.error('Error cargando categorias:', error);
        return;
      }
      setCategorias(data || []);
    } catch (err) {
      console.error('Error cargando categorias:', err);
    }
  };

  const generarCodigoSistema = async () => {
    if (!tiendaActual) {
      setError('No hay tienda seleccionada para generar el código');
      return;
    }
    try {
      const { data } = await supabase
        .from('productos')
        .select('codigo_sistema')
        .eq('tienda_id', tiendaActual)
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

      let codigoUnico = false;
      let intentos = 0;
      let codigoGenerado = '';

      while (!codigoUnico && intentos < 100) {
        codigoGenerado = (siguienteNumero + intentos).toString().padStart(6, '0');
        
        const { data: existente } = await supabase
          .from('productos')
          .select('id_producto')
          .eq('tienda_id', tiendaActual)
          .eq('codigo_sistema', codigoGenerado)
          .maybeSingle();

        if (!existente) {
          codigoUnico = true;
        } else {
          intentos++;
        }
      }

      setFormData(prev => ({ ...prev, codigo_sistema: codigoGenerado }));
    } catch (err) {
      console.error('Error generando código de sistema:', err);
      setFormData(prev => ({ ...prev, codigo_sistema: Date.now().toString().slice(-6) }));
    }
  };

  const generarCodigoProducto = async (): Promise<string> => {
    if (!tiendaActual) {
      setError('No hay tienda seleccionada para generar el código');
      return '';
    }
    try {
      const { data } = await supabase
        .from('productos')
        .select('codigo_producto')
        .eq('tienda_id', tiendaActual)
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

      let codigoUnico = false;
      let intentos = 0;
      let codigoGenerado = '';

      while (!codigoUnico && intentos < 100) {
        codigoGenerado = `PROD-${(siguienteNumero + intentos).toString().padStart(3, '0')}`;
        
        const { data: existente } = await supabase
          .from('productos')
          .select('id_producto')
          .eq('tienda_id', tiendaActual)
          .eq('codigo_producto', codigoGenerado)
          .maybeSingle();

        if (!existente) {
          codigoUnico = true;
        } else {
          intentos++;
        }
      }

      setFormData(prev => ({ ...prev, codigo_producto: codigoGenerado }));
      return codigoGenerado;
    } catch (err) {
      console.error('Error generando código de producto:', err);
      const timestamp = Date.now().toString().slice(-6);
      const codigoFallback = `PROD-${timestamp}`;
      setFormData(prev => ({ ...prev, codigo_producto: codigoFallback }));
      return codigoFallback;
    }
  };

  const cargarBOMItems = async (productoId: number) => {
    try {
      const { data, error } = await supabase
        .from('bom_items')
        .select(`
          *,
          inventario:inventario!id_componente(descripcion_articulo, categoria:categorias_inventario(nombre_categoria)),
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
          categoria_nombre: item.inventario?.categoria?.nombre_categoria,
          unidad_nombre: item.unidad_medida?.nombre,
          unidad_simbolo: item.unidad_medida?.simbolo
        }));
        setBomItems(items);
      }
    } catch (err) {
      console.error('Error cargando componentes BOM:', err);
    }
  };

  const calcularCostoTotal = () => {
    const total = bomItems.reduce((sum, item) => sum + item.precio_ajustado, 0);
    setCostoTotal(total);
  };

  const validarFormulario = async (): Promise<boolean> => {
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

    if (!tiendaActual) {
      setError('No hay tienda seleccionada. No se puede guardar el producto.');
      return false;
    }

    // Validar unicidad del código de producto SOLO dentro de la tienda actual
    if (!productoEditar || formData.codigo_producto !== productoEditar.codigo_producto) {
      try {
        const { data: existente, error: errCheck } = await supabase
          .from('productos')
          .select('id_producto')
          .eq('tienda_id', tiendaActual)
          .eq('codigo_producto', formData.codigo_producto)
          .maybeSingle();

        if (errCheck) {
          console.error('Error validando código de producto:', errCheck);
          setError('Error al validar el código del producto. Intenta nuevamente.');
          return false;
        }

        if (existente && (!productoEditar || existente.id_producto !== productoEditar.id_producto)) {
          setError('El código de producto ya existe en esta tienda. Generando uno nuevo...');
          await generarCodigoProducto();
          return false;
        }
      } catch (err) {
        console.error('Error validando código:', err);
        setError('Error al validar el código del producto. Intenta nuevamente.');
        return false;
      }
    }

    // Validar unicidad del código de sistema SOLO dentro de la tienda actual
    if (formData.codigo_sistema) {
      try {
        const { data: existente, error: errCheck } = await supabase
          .from('productos')
          .select('id_producto')
          .eq('tienda_id', tiendaActual)
          .eq('codigo_sistema', formData.codigo_sistema)
          .maybeSingle();

        if (errCheck) {
          console.error('Error validando código de sistema:', errCheck);
          setError('Error al validar el código de sistema. Intenta nuevamente.');
          return false;
        }

        if (existente && (!productoEditar || existente.id_producto !== productoEditar.id_producto)) {
          setError('El código de sistema ya existe en esta tienda. Generando uno nuevo...');
          await generarCodigoSistema();
          return false;
        }
      } catch (err) {
        console.error('Error validando código de sistema:', err);
        setError('Error al validar el código de sistema. Intenta nuevamente.');
        return false;
      }
    }

    return true;
  };

  const mapearUnidad = (unidadId: number): string => {
    const mapeoUnidades: { [key: number]: string } = {
      1: 'Uni',
      2: 'kg',
      3: 'g',
      4: 'm',
      5: 'cm',
      6: 'mm',
      7: 'h',
      8: 'min',
      9: 's',
      10: 'Uni'
    };
    return mapeoUnidades[unidadId] || 'Uni';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tiendaActual) {
      setError('No hay tienda seleccionada');
      showError('No se puede guardar: no hay tienda seleccionada');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const esValido = await validarFormulario();
      if (!esValido) {
        setLoading(false);
        return;
      }

      let codigoProducto = formData.codigo_producto;

      // Verificación final antes de guardar (solo para productos nuevos)
      if (!productoEditar) {
        try {
          const { data: existingProduct, error: errExisting } = await supabase
            .from('productos')
            .select('id_producto')
            .eq('tienda_id', tiendaActual)
            .eq('codigo_producto', codigoProducto)
            .maybeSingle();

          if (errExisting) {
            console.error('Error verificando código antes de guardar:', errExisting);
          }

          if (existingProduct) {
            setError('El código ya está en uso en esta tienda. Generando uno nuevo...');
            codigoProducto = await generarCodigoProducto();
            
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const { data: stillExists } = await supabase
              .from('productos')
              .select('id_producto')
              .eq('tienda_id', tiendaActual)
              .eq('codigo_producto', codigoProducto)
              .maybeSingle();

            if (stillExists) {
              codigoProducto = `PROD-${Date.now().toString().slice(-6)}`;
              setFormData(prev => ({ ...prev, codigo_producto: codigoProducto }));
            }
            
            setError('');
          }
        } catch (err) {
          console.error('Error en verificación final de código:', err);
        }
      }

      let productoId: number;

      if (productoEditar) {
        // Actualizar producto existente
        const updateData: any = {
          codigo_producto: formData.codigo_producto,
          descripcion_producto: formData.descripcion_producto,
          categoria_id: parseInt(formData.categoria_id),
          codigo_sistema: formData.codigo_sistema,
          costo_total_bom: costoTotal,
        };
        // Solo incluir moneda si el backend la soporta
        if (formData.moneda) {
          updateData.moneda = formData.moneda;
        }

        const { data, error: updateError } = await supabase
          .from('productos')
          .update(updateData)
          .eq('id_producto', productoEditar.id_producto)
          .eq('tienda_id', tiendaActual)
          .select()
          .single();

        if (updateError) {
          // Si falla por columna moneda no existente, reintentar sin ella
          if (updateError.code === 'PGRST204' && updateError.message?.includes('moneda')) {
            delete updateData.moneda;
            const { data: retryData, error: retryError } = await supabase
              .from('productos')
              .update(updateData)
              .eq('id_producto', productoEditar.id_producto)
              .eq('tienda_id', tiendaActual)
              .select()
              .single();
            if (retryError) throw retryError;
            if (!retryData) throw new Error('No se recibió respuesta al actualizar el producto');
            productoId = retryData.id_producto;
            showError('Aviso: la columna "moneda" no existe en la base de datos. Ejecuta el SQL sql_agregar_moneda_productos.sql en Supabase para habilitarla.');
          } else {
            throw updateError;
          }
        } else {
          if (!data) throw new Error('No se recibió respuesta al actualizar el producto');
          productoId = data.id_producto;
        }

        // Eliminar componentes existentes del BOM
        const { error: deleteError } = await supabase
          .from('bom_items')
          .delete()
          .eq('product_id', productoId);

        if (deleteError) {
          console.error('Error eliminando BOM items anteriores:', deleteError);
          // No lanzamos error aquí, continuamos intentando insertar los nuevos
        }
      } else {
        // Crear nuevo producto CON tienda_id
        const insertData: any = {
          codigo_producto: codigoProducto,
          descripcion_producto: formData.descripcion_producto,
          categoria_id: parseInt(formData.categoria_id),
          codigo_sistema: formData.codigo_sistema,
          costo_total_bom: costoTotal,
          tienda_id: tiendaActual,
        };
        // Solo incluir moneda si el backend la soporta
        if (formData.moneda) {
          insertData.moneda = formData.moneda;
        }

        const { data, error: insertError } = await supabase
          .from('productos')
          .insert(insertData)
          .select()
          .single();

        if (insertError) {
          // Si falla por columna moneda no existente, reintentar sin ella
          if (insertError.code === 'PGRST204' && insertError.message?.includes('moneda')) {
            delete insertData.moneda;
            const { data: retryData, error: retryError } = await supabase
              .from('productos')
              .insert(insertData)
              .select()
              .single();
            if (retryError) throw retryError;
            if (!retryData) throw new Error('No se recibió respuesta al crear el producto');
            productoId = retryData.id_producto;
            showError('Aviso: la columna "moneda" no existe en la base de datos. Ejecuta el SQL sql_agregar_moneda_productos.sql en Supabase para habilitarla.');
          } else {
            throw insertError;
          }
        } else {
          if (!data) throw new Error('No se recibió respuesta al crear el producto');
          productoId = data.id_producto;
        }
      }

      // Guardar componentes del BOM si existen
      let bomGuardado = true;
      let bomErrorMsg = '';
      
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

        if (bomError) {
          bomGuardado = false;
          bomErrorMsg = bomError.message || '';
          console.error('Error guardando BOM items:', bomError);
          
          // Si es error de permisos RLS, mostrar mensaje específico
          if (bomError.code === '42501') {
            setError('El producto se guardó correctamente, pero NO se pudieron guardar los componentes BOM por falta de permisos. Contacta al administrador para que revise las políticas de seguridad de la tabla "bom_items".');
            showError('Producto guardado, pero los componentes BOM no se guardaron por falta de permisos. Contacta al administrador.');
          } else {
            setError(`El producto se guardó correctamente, pero hubo un error al guardar los componentes BOM: ${bomErrorMsg}`);
            showError(`Producto guardado, pero error en BOM: ${bomErrorMsg}`);
          }
          
          // Aún así consideramos éxito parcial — el producto sí se guardó
          onSuccess();
          onClose();
          return;
        }
      }

      // ÉXITO completo: mostrar mensaje claro
      if (productoEditar) {
        showSuccess(`Producto "${formData.descripcion_producto}" actualizado correctamente`);
      } else {
        showSuccess(`Producto "${formData.descripcion_producto}" creado correctamente con código ${codigoProducto}`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error guardando producto:', err);
      
      if (err?.code === '23505') {
        if (err?.message?.includes('productos_codigo_producto_key')) {
          setError('El código de producto ya está en uso en esta tienda. Se generará uno nuevo automáticamente.');
          await generarCodigoProducto();
          showError('El código de producto ya existe en esta tienda. Se generó uno nuevo, intenta guardar de nuevo.');
        } else if (err?.message?.includes('productos_codigo_sistema_key')) {
          setError('El código de sistema ya está en uso en esta tienda. Se generará uno nuevo automáticamente.');
          await generarCodigoSistema();
          showError('El código de sistema ya existe en esta tienda. Se generó uno nuevo, intenta guardar de nuevo.');
        } else {
          setError('Ya existe un producto con estos datos en esta tienda. Por favor, verifica la información.');
          showError('Error de duplicado: ya existe un producto con estos datos en esta tienda.');
        }
      } else if (err?.code === '42501') {
        setError('No tienes permisos para realizar esta acción. Contacta al administrador.');
        showError('No tienes permisos para guardar productos. Contacta al administrador.');
      } else if (err?.code === 'PGRST116') {
        setError('No se encontró el producto para actualizar. Puede que haya sido eliminado o no pertenezca a tu tienda.');
        showError('No se encontró el producto. Puede que haya sido eliminado o no pertenezca a tu tienda.');
      } else {
        const msg = err?.message || 'Error desconocido al guardar el producto';
        setError(msg);
        showError(`Error al guardar: ${msg}`);
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Moneda del Precio *
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, moneda: 'CRC' })}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 transition-all whitespace-nowrap cursor-pointer ${
                      formData.moneda === 'CRC'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-medium'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-base">&#x20A1;</span>
                    <span className="text-sm">Colones</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, moneda: 'USD' })}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 transition-all whitespace-nowrap cursor-pointer ${
                      formData.moneda === 'USD'
                        ? 'border-amber-500 bg-amber-50 text-amber-700 font-medium'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-base">$</span>
                    <span className="text-sm">Dólares</span>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Define la moneda en que está expresado el costo BOM
                </p>
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

            <div className="flex gap-3 pt-4 border-t">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 whitespace-nowrap"
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

      {showBuscarModal && (
        <BuscarArticuloModal
          onSeleccionar={agregarComponente}
          onCerrar={() => setShowBuscarModal(false)}
          moneda={formData.moneda}
        />
      )}
    </div>
  );
}
