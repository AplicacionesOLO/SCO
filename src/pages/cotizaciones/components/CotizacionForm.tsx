import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { CotizacionFormData, CotizacionItem } from '../../../types/cotizacion';
import { formatCurrency, formatNumber, parseCurrency } from '../../../lib/currency';
import { CotizacionService } from '../../../services/cotizacionService';
import { showAlert } from '../../../utils/dialog';

interface Cliente {
  id: number;
  nombre_razon_social: string;
  identificacion: string;
  correo_principal?: string;
}

interface Producto {
  id_producto: number;
  codigo_producto: string;
  descripcion_producto: string;
  costo_total_bom: number;
}

interface CotizacionFormProps {
  cotizacion?: any;
  onSubmit: (data: CotizacionFormData) => void;
  onCancel: () => void;
  isOpen: boolean;
}

export function CotizacionForm({ cotizacion, onSubmit, onCancel, isOpen }: CotizacionFormProps) {
  const [formData, setFormData] = useState<CotizacionFormData>({
    cliente_id: '',
    estado: 'borrador',
    fecha_emision: new Date().toISOString().split('T')[0],
    fecha_vencimiento: '',
    moneda: 'CRC',
    tipo_cambio: 520,
    descuento_global: 0,
    descuento_valor: 0,
    impuestos: 0,
    flete: 0,
    otros: 0,
    subtotal: 0,
    total: 0,
    items: []
  });

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clientesFiltrados, setClientesFiltrados] = useState<Cliente[]>([]);
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [mostrarListaClientes, setMostrarListaClientes] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);

  const [productos, setProductos] = useState<Producto[]>([]);
  const [productosFiltrados, setProductosFiltrados] = useState<Producto[]>([]);
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [mostrarListaProductos, setMostrarListaProductos] = useState(false);

  const [loading, setLoading] = useState(false);
  const [actualizandoTipoCambio, setActualizandoTipoCambio] = useState(false);
  const [mensajeTipoCambio, setMensajeTipoCambio] = useState('Tipo de cambio según Banco Central de Costa Rica (BCCR). Haga clic en actualizar para obtener el valor más reciente.');

  // Cargar datos cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      cargarClientes();
      cargarProductos();
      obtenerTipoCambio();
      
      // Configurar fecha de vencimiento por defecto (hoy + 15 días)
      const fechaVencimiento = new Date();
      fechaVencimiento.setDate(fechaVencimiento.getDate() + 15);
      
      if (cotizacion) {
        // MODO EDICIÓN: Cargar datos de la cotización existente
        console.log('Cargando cotización para editar:', cotizacion);
        cargarDatosCotizacion(cotizacion);
      } else {
        // MODO CREACIÓN: Configurar valores por defecto
        setFormData(prev => ({
          ...prev,
          fecha_vencimiento: fechaVencimiento.toISOString().split('T')[0]
        }));
      }
    }
  }, [cotizacion, isOpen]);

  // Función para cargar datos de cotización existente
  const cargarDatosCotizacion = async (cotizacionData: any) => {
    try {
      console.log('Datos de cotización recibidos:', cotizacionData);
      
      // Cargar datos básicos de la cotización
      setFormData({
        cliente_id: cotizacionData.cliente_id?.toString() || '',
        estado: cotizacionData.estado || 'borrador',
        fecha_emision: cotizacionData.fecha_emision || new Date().toISOString().split('T')[0],
        fecha_vencimiento: cotizacionData.fecha_vencimiento || '',
        moneda: cotizacionData.moneda || 'CRC',
        tipo_cambio: cotizacionData.tipo_cambio || 520,
        descuento_global: cotizacionData.descuento_global || 0,
        descuento_valor: cotizacionData.descuento_valor || 0,
        impuestos: cotizacionData.impuestos || 0,
        flete: cotizacionData.flete || 0,
        otros: cotizacionData.otros || 0,
        subtotal: cotizacionData.subtotal || 0,
        total: cotizacionData.total || 0,
        items: [] // Se cargará después
      });

      // Configurar cliente seleccionado
      if (cotizacionData.clientes) {
        setClienteSeleccionado(cotizacionData.clientes);
        setBusquedaCliente(cotizacionData.clientes.nombre_razon_social);
      }

      // Cargar items de la cotización con información completa
      if (cotizacionData.id) {
        await cargarItemsCotizacion(cotizacionData.id);
      }
      
    } catch (error) {
      console.error('Error cargando datos de cotización:', error);
    }
  };

  // Función para cargar items de la cotización con información de productos
  const cargarItemsCotizacion = async (cotizacionId: number) => {
    try {
      console.log('Cargando items de cotización:', cotizacionId);
      
      // Primero obtener los items de la cotización
      const { data: items, error } = await supabase
        .from('cotizacion_items')
        .select('*')
        .eq('cotizacion_id', cotizacionId);

      if (error) {
        console.error('Error cargando items:', error);
        return;
      }

      console.log('Items cargados:', items);

      if (items && items.length > 0) {
        // Obtener los IDs únicos de productos
        const productosIds = [...new Set(items.map(item => item.producto_id))].filter(id => id);
        
        let productosInfo: any[] = [];
        
        // Si hay productos, cargar su información por separado
        if (productosIds.length > 0) {
          const { data: productos, error: productosError } = await supabase
            .from('productos')
            .select('id_producto, codigo_producto, descripcion_producto, costo_total_bom')
            .in('id_producto', productosIds);

          if (!productosError && productos) {
            productosInfo = productos;
          }
        }

        // Formatear items con información de productos
        const itemsFormateados = items.map((item: any) => {
          // Buscar información del producto
          const productoInfo = productosInfo.find(p => p.id_producto === item.producto_id);
          
          return {
            producto_id: item.producto_id,
            cantidad: item.cantidad || 1,
            precio_unitario: item.precio_unitario || 0,
            descuento: item.descuento || 0,
            subtotal: item.subtotal || item.total_linea || 0,
            // Agregar información del producto para mostrar en la tabla
            producto_info: productoInfo || {
              codigo_producto: 'N/A',
              descripcion_producto: item.descripcion || `Producto ID: ${item.producto_id}`,
              costo_total_bom: item.precio_unitario || 0
            }
          };
        });

        console.log('Items formateados:', itemsFormateados);

        setFormData(prev => ({
          ...prev,
          items: itemsFormateados
        }));

        // Recalcular totales con los items cargados
        calcularTotales(itemsFormateados);
      }
      
    } catch (error) {
      console.error('Error cargando items de cotización:', error);
    }
  };

  const cargarClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nombre_razon_social, identificacion, correo_principal')
        .order('nombre_razon_social');

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Error cargando clientes:', error);
    }
  };

  const cargarProductos = async () => {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('id_producto, codigo_producto, descripcion_producto, costo_total_bom')
        .order('descripcion_producto');

      if (error) throw error;
      setProductos(data || []);
    } catch (error) {
      console.error('Error cargando productos:', error);
    }
  };

  const obtenerTipoCambio = async () => {
    try {
      setActualizandoTipoCambio(true);
      
      // Usar el nuevo método del servicio para obtener tipo de cambio del BCCR
      const tipoCambio = await CotizacionService.obtenerTipoCambioBCCR();
      
      setFormData(prev => ({
        ...prev,
        tipo_cambio: tipoCambio
      }));
      
      // Actualizar el mensaje informativo
      setMensajeTipoCambio(`💰 Tipo de cambio actualizado según BCCR: ₡${formatNumber(tipoCambio)} por USD`);
    } catch (error) {
      console.error('Error obteniendo tipo de cambio:', error);
      setMensajeTipoCambio('❌ Error al obtener tipo de cambio del BCCR. Usando valor por defecto.');
    } finally {
      setActualizandoTipoCambio(false);
    }
  };

  const filtrarClientes = (busqueda: string) => {
    setBusquedaCliente(busqueda);
    
    if (busqueda.length === 0) {
      setClientesFiltrados([]);
      setMostrarListaClientes(false);
      setClienteSeleccionado(null);
      setFormData(prev => ({ ...prev, cliente_id: '' }));
      return;
    }

    const filtrados = clientes.filter(cliente =>
      cliente.nombre_razon_social.toLowerCase().includes(busqueda.toLowerCase()) ||
      cliente.identificacion.includes(busqueda)
    );

    setClientesFiltrados(filtrados);
    setMostrarListaClientes(filtrados.length > 0);
  };

  const seleccionarCliente = (cliente: Cliente) => {
    setClienteSeleccionado(cliente);
    setBusquedaCliente(cliente.nombre_razon_social);
    setMostrarListaClientes(false);
    setFormData(prev => ({ ...prev, cliente_id: cliente.id.toString() }));
  };

  const filtrarProductos = (busqueda: string) => {
    setBusquedaProducto(busqueda);
    
    if (busqueda.length === 0) {
      setProductosFiltrados([]);
      setMostrarListaProductos(false);
      return;
    }

    const filtrados = productos.filter(producto =>
      producto.descripcion_producto.toLowerCase().includes(busqueda.toLowerCase()) ||
      producto.codigo_producto.toLowerCase().includes(busqueda.toLowerCase())
    );

    setProductosFiltrados(filtrados);
    setMostrarListaProductos(filtrados.length > 0);
  };

  const agregarProducto = (producto: Producto) => {
    const nuevoItem: CotizacionItem = {
      producto_id: producto.id_producto,
      cantidad: 1,
      precio_unitario: producto.costo_total_bom || 0,
      descuento: 0,
      subtotal: producto.costo_total_bom || 0
    };

    const nuevosItems = [...formData.items, nuevoItem];
    setFormData(prev => ({
      ...prev,
      items: nuevosItems
    }));

    setBusquedaProducto('');
    setMostrarListaProductos(false);
    calcularTotales(nuevosItems);
  };

  const actualizarItem = (index: number, campo: keyof CotizacionItem, valor: any) => {
    const nuevosItems = [...formData.items];
    nuevosItems[index] = { ...nuevosItems[index], [campo]: valor };

    // Recalcular total del item
    if (campo === 'cantidad' || campo === 'precio_unitario' || campo === 'descuento') {
      const item = nuevosItems[index];
      const subtotalItem = item.cantidad * item.precio_unitario;
      const descuentoItem = subtotalItem * (item.descuento / 100);
      item.subtotal = subtotalItem - descuentoItem;
    }

    setFormData(prev => ({ ...prev, items: nuevosItems }));
    calcularTotales(nuevosItems);
  };

  const eliminarItem = (index: number) => {
    const nuevosItems = formData.items.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, items: nuevosItems }));
    calcularTotales(nuevosItems);
  };

  const calcularTotales = (items: CotizacionItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    const descuentoValor = subtotal * (formData.descuento_global / 100);
    const baseImponible = subtotal - descuentoValor;
    const impuestos = baseImponible * 0.13; // 13% IVA
    const total = baseImponible + impuestos + formData.flete + formData.otros;

    setFormData(prev => ({
      ...prev,
      subtotal,
      descuento_valor: descuentoValor,
      impuestos,
      total
    }));
  };

  const handleInputChange = (campo: keyof CotizacionFormData, valor: any) => {
    setFormData(prev => {
      const newData = { ...prev, [campo]: valor };
      
      // Recalcular totales si cambian campos que afectan el cálculo
      if (['descuento_global', 'flete', 'otros'].includes(campo)) {
        const subtotal = newData.items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
        const descuentoValor = subtotal * (newData.descuento_global / 100);
        const baseImponible = subtotal - descuentoValor;
        const impuestos = baseImponible * 0.13;
        const total = baseImponible + impuestos + newData.flete + newData.otros;

        return {
          ...newData,
          subtotal,
          descuento_valor: descuentoValor,
          impuestos,
          total
        };
      }
      
      return newData;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.cliente_id) {
      showAlert('Por favor seleccione un cliente', { type: 'warning' });
      return;
    }

    if (formData.items.length === 0) {
      showAlert('Por favor agregue al menos un producto', { type: 'warning' });
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error guardando cotización:', error);
    } finally {
      setLoading(false);
    }
  };

  const obtenerProductoPorId = (productoId: number) => {
    // Primero buscar en la lista de productos cargados
    const producto = productos.find(p => p.id_producto === productoId);
    if (producto) return producto;
    
    // Si no se encuentra, buscar en los items formateados que tienen producto_info
    const item = formData.items.find(item => item.producto_id === productoId);
    if (item && (item as any).producto_info) {
      const info = (item as any).producto_info;
      return {
        id_producto: productoId,
        codigo_producto: info.codigo_producto,
        descripcion_producto: info.descripcion_producto,
        costo_total_bom: info.costo_total_bom
      };
    }
    
    return null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            {cotizacion ? 'Editar Cotización' : 'Nueva Cotización'}
            {cotizacion && (
              <span className="ml-2 text-sm text-gray-500">
                ({cotizacion.codigo})
              </span>
            )}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <i className="ri-close-line text-2xl"></i>
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cliente */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cliente *
                </label>
                <input
                  type="text"
                  value={busquedaCliente}
                  onChange={(e) => filtrarClientes(e.target.value)}
                  placeholder="Buscar cliente por nombre o identificación..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                
                {mostrarListaClientes && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {clientesFiltrados.map((cliente) => (
                      <div
                        key={cliente.id}
                        onClick={() => seleccionarCliente(cliente)}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium">{cliente.nombre_razon_social}</div>
                        <div className="text-sm text-gray-500">{cliente.identificacion}</div>
                      </div>
                    ))}
                  </div>
                )}
                
                {clienteSeleccionado && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
                    <i className="ri-check-line text-green-600 mr-1"></i>
                    Cliente seleccionado: <strong>{clienteSeleccionado.nombre_razon_social}</strong>
                  </div>
                )}
              </div>

              {/* Estado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado
                </label>
                <select
                  value={formData.estado}
                  onChange={(e) => handleInputChange('estado', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="borrador">Borrador</option>
                  <option value="enviada">Enviada</option>
                  <option value="aceptada">Aceptada</option>
                  <option value="rechazada">Rechazada</option>
                  <option value="vencida">Vencida</option>
                </select>
              </div>

              {/* Fecha de Emisión */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Emisión
                </label>
                <input
                  type="date"
                  value={formData.fecha_emision}
                  onChange={(e) => handleInputChange('fecha_emision', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Fecha de Vencimiento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Vencimiento
                </label>
                <input
                  type="date"
                  value={formData.fecha_vencimiento}
                  onChange={(e) => handleInputChange('fecha_vencimiento', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Sugerencia: {new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES')} (15 días desde hoy)
                </p>
              </div>

              {/* Moneda */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Moneda
                </label>
                <select
                  value={formData.moneda}
                  onChange={(e) => handleInputChange('moneda', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="CRC">Colones (CRC)</option>
                  <option value="USD">Dólares (USD)</option>
                </select>
              </div>

              {/* Tipo de Cambio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Cambio
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={formData.tipo_cambio}
                    onChange={(e) => setFormData(prev => ({ ...prev, tipo_cambio: parseFloat(e.target.value) || 0 }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="520.00"
                  />
                  <button
                    type="button"
                    onClick={obtenerTipoCambio}
                    disabled={actualizandoTipoCambio}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {actualizandoTipoCambio ? (
                      <i className="ri-loader-4-line animate-spin"></i>
                    ) : (
                      <i className="ri-refresh-line"></i>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {mensajeTipoCambio}
                </p>
              </div>
            </div>

            {/* Productos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar Producto
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={busquedaProducto}
                  onChange={(e) => filtrarProductos(e.target.value)}
                  placeholder="Buscar producto por código o nombre..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                
                {mostrarListaProductos && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {productosFiltrados.map((producto) => (
                      <div
                        key={producto.id_producto}
                        onClick={() => agregarProducto(producto)}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium">{producto.descripcion_producto}</div>
                        <div className="text-sm text-gray-500">
                          Código: {producto.codigo_producto} | Precio: ₡{formatNumber(producto.costo_total_bom)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Lista de Items */}
            {formData.items.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Productos Agregados ({formData.items.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Producto
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cantidad
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Precio Unit.
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Descuento %
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {formData.items.map((item, index) => {
                        const producto = obtenerProductoPorId(item.producto_id);
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {producto?.descripcion_producto || 'Producto no encontrado'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  Código: {producto?.codigo_producto || 'N/A'}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="number"
                                value={item.cantidad}
                                onChange={(e) => actualizarItem(index, 'cantidad', parseInt(e.target.value) || 0)}
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                min="1"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="number"
                                value={item.precio_unitario}
                                onChange={(e) => actualizarItem(index, 'precio_unitario', parseFloat(e.target.value) || 0)}
                                className="w-28 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                step="0.01"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="number"
                                value={item.descuento}
                                onChange={(e) => actualizarItem(index, 'descuento', parseFloat(e.target.value) || 0)}
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                min="0"
                                max="100"
                                step="0.01"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              ₡{formatNumber(item.subtotal || 0)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => eliminarItem(index)}
                                className="text-red-600 hover:text-red-900 cursor-pointer p-1 hover:bg-red-50 rounded"
                                title="Eliminar producto"
                              >
                                <i className="ri-delete-bin-line"></i>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {formData.items.length === 0 && (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                <i className="ri-shopping-cart-line text-4xl mb-2"></i>
                <p className="font-medium">No hay productos agregados</p>
                <p className="text-sm">Use la barra de búsqueda para agregar productos</p>
              </div>
            )}

            {/* Totales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descuento Global (%)
                  </label>
                  <input
                    type="number"
                    value={formData.descuento_global}
                    onChange={(e) => handleInputChange('descuento_global', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Flete
                  </label>
                  <input
                    type="number"
                    value={formData.flete}
                    onChange={(e) => handleInputChange('flete', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Otros
                  </label>
                  <input
                    type="number"
                    value={formData.otros}
                    onChange={(e) => handleInputChange('otros', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Resumen</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₡{formatNumber(formData.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Descuento ({formData.descuento_global}%):</span>
                    <span>-₡{formatNumber(formData.descuento_valor)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Impuestos (13%):</span>
                    <span>₡{formatNumber(formData.impuestos)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Flete:</span>
                    <span>₡{formatNumber(formData.flete)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Otros:</span>
                    <span>₡{formatNumber(formData.otros)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>₡{formatNumber(formData.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-nowrap cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 whitespace-nowrap cursor-pointer"
              >
                {loading ? (
                  <>
                    <i className="ri-loader-4-line animate-spin mr-2"></i>
                    Guardando...
                  </>
                ) : (
                  <>
                    <i className={cotizacion ? "ri-save-line mr-2" : "ri-add-line mr-2"}></i>
                    {cotizacion ? 'Actualizar' : 'Crear'} Cotización
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CotizacionForm;
