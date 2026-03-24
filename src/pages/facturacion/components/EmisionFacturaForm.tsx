import { useState, useEffect } from 'react';
import { formatCurrency } from '../../../lib/currency';
import { showAlert } from '../../../utils/dialog';

interface EmisionFacturaFormProps {
  origenData?: any;
  loading: boolean;
  onEmitir: (data: any) => void;
  onGuardarBorrador: (data: any) => void;
  onCancelar: () => void;
}

interface FacturaItem {
  id_item: number;
  tipo_item: 'inventario' | 'producto' | 'servicio';
  codigo: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  descuento_porcentaje: number;
  impuesto_porcentaje: number;
  subtotal: number;
  descuento_monto: number;
  impuesto_monto: number;
  total: number;
  bom_items?: any[];
}

export function EmisionFacturaForm({ 
  origenData, 
  loading, 
  onEmitir, 
  onGuardarBorrador, 
  onCancelar 
}: EmisionFacturaFormProps) {
  const [paso, setPaso] = useState(1);
  const [formData, setFormData] = useState({
    // Paso 1: Origen
    origen_tipo: '',
    origen_id: null,
    
    // Paso 2: Encabezado
    tipo_documento: 'FE',
    moneda: 'CRC',
    tipo_cambio: 1.0,
    condicion_venta: 'contado',
    medio_pago: 'efectivo',
    fecha_emision: new Date().toISOString().split('T')[0],
    codigo_actividad: '722001',
    observaciones: '',
    
    // Cliente
    cliente_id: 0,
    cliente: null,
    
    // Items
    items: [] as FacturaItem[]
  });

  // Datos demo para clientes
  const [clientesDemo] = useState([
    {
      id: 1,
      nombre_razon_social: 'Empresa Demo S.A.',
      identificacion: '3-101-123456',
      correo_principal: 'contacto@empresademo.com',
      telefono: '2222-3333'
    },
    {
      id: 2,
      nombre_razon_social: 'Comercial Los Andes Ltda.',
      identificacion: '3-102-654321',
      correo_principal: 'ventas@losandes.com',
      telefono: '2555-7777'
    },
    {
      id: 3,
      nombre_razon_social: 'Juan Pérez Rodríguez',
      identificacion: '1-1234-5678',
      correo_principal: 'juan.perez@email.com',
      telefono: '8888-9999'
    }
  ]);

  // Datos demo para productos
  const [productosDemo] = useState([
    {
      id: 1,
      codigo: 'PROD001',
      descripcion: 'Producto Demo 1',
      precio_venta: 15000,
      unidad: 'UND',
      tipo: 'producto'
    },
    {
      id: 2,
      codigo: 'SERV001',
      descripcion: 'Servicio de Consultoría',
      precio_venta: 25000,
      unidad: 'HORA',
      tipo: 'servicio'
    },
    {
      id: 3,
      codigo: 'INV001',
      descripcion: 'Artículo de Inventario',
      precio_venta: 8500,
      unidad: 'UND',
      tipo: 'inventario'
    }
  ]);

  const [origenes] = useState<any[]>([
    {
      id: 1,
      codigo: 'PED-001',
      fecha_creacion: new Date().toISOString(),
      total: 150000,
      cliente: { id: 1, nombre_razon_social: 'Cliente Demo 1', identificacion: '1-1234-5678' }
    },
    {
      id: 2,
      codigo: 'COT-001',
      fecha_emision: new Date().toISOString(),
      total: 200000,
      cliente: { id: 2, nombre_razon_social: 'Cliente Demo 2', identificacion: '2-2345-6789' }
    }
  ]);
  const [busquedaOrigen, setBusquedaOrigen] = useState('');
  const [showClienteSelector, setShowClienteSelector] = useState(false);
  const [showProductoSelector, setShowProductoSelector] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [totales, setTotales] = useState({
    subtotal: 0,
    descuento_total: 0,
    impuesto_total: 0,
    total: 0
  });

  // Cargar datos iniciales
  useEffect(() => {
    if (origenData) {
      precargarDesdeOrigen(origenData);
    }
  }, [origenData]);

  // Recalcular totales cuando cambien los items
  useEffect(() => {
    calcularTotales();
  }, [formData.items]);

  const precargarDesdeOrigen = (origen: any) => {
    const { tipo, data } = origen;
    
    setFormData(prev => ({
      ...prev,
      origen_tipo: tipo,
      origen_id: data.id,
      cliente_id: data.cliente_id,
      cliente: data.cliente || data.clientes,
      moneda: data.moneda || 'CRC',
      tipo_cambio: data.tipo_cambio || 1.0,
      items: convertirItemsDesdeOrigen(data.items || [])
    }));

    setPaso(2); // Ir directamente al paso 2
  };

  const convertirItemsDesdeOrigen = (items: any[]): FacturaItem[] => {
    return items.map((item, index) => ({
      id_item: item.item_id || item.producto_id || index,
      tipo_item: item.item_type || (item.producto_id ? 'producto' : 'inventario'),
      codigo: item.codigo_articulo || item.codigo || '',
      descripcion: item.descripcion || item.descripcion_producto || '',
      unidad: item.unidad || 'UND',
      cantidad: item.cantidad || 1,
      precio_unitario: item.precio_unitario || item.precio_unit || 0,
      descuento_porcentaje: item.descuento_porcentaje || 0,
      impuesto_porcentaje: item.impuesto_porcentaje || 13,
      subtotal: 0,
      descuento_monto: 0,
      impuesto_monto: 0,
      total: 0,
      bom_items: item.meta_json?.bom_items || []
    }));
  };

  const buscarOrigenes = (busqueda: string) => {
    // Filtrar orígenes demo basado en la búsqueda
    if (!busqueda || busqueda.length < 2) {
      return [];
    }
    return origenes.filter(origen => 
      origen.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
      origen.cliente.nombre_razon_social.toLowerCase().includes(busqueda.toLowerCase())
    );
  };

  const seleccionarOrigen = (origen: any) => {
    // Simular carga de datos completos
    const datosCompletos = {
      ...origen,
      items: [
        {
          codigo: 'PROD001',
          descripcion: 'Producto Demo 1',
          cantidad: 2,
          precio_unitario: 50000,
          unidad: 'UND'
        }
      ]
    };

    precargarDesdeOrigen({
      tipo: formData.origen_tipo,
      data: datosCompletos
    });
  };

  const calcularTotales = () => {
    let subtotal = 0;
    let descuento_total = 0;
    let impuesto_total = 0;

    const itemsActualizados = formData.items.map(item => {
      const itemSubtotal = item.cantidad * item.precio_unitario;
      const itemDescuento = itemSubtotal * (item.descuento_porcentaje / 100);
      const baseImponible = itemSubtotal - itemDescuento;
      const itemImpuesto = baseImponible * (item.impuesto_porcentaje / 100);
      const itemTotal = baseImponible + itemImpuesto;

      subtotal += itemSubtotal;
      descuento_total += itemDescuento;
      impuesto_total += itemImpuesto;

      return {
        ...item,
        subtotal: itemSubtotal,
        descuento_monto: itemDescuento,
        impuesto_monto: itemImpuesto,
        total: itemTotal
      };
    });

    setFormData(prev => ({
      ...prev,
      items: itemsActualizados
    }));

    setTotales({
      subtotal,
      descuento_total,
      impuesto_total,
      total: subtotal - descuento_total + impuesto_total
    });
  };

  const actualizarItem = (index: number, campo: keyof FacturaItem, valor: any) => {
    const nuevosItems = [...formData.items];
    nuevosItems[index] = { ...nuevosItems[index], [campo]: valor };
    
    setFormData(prev => ({
      ...prev,
      items: nuevosItems
    }));
  };

  const eliminarItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const seleccionarCliente = (cliente: any) => {
    setFormData(prev => ({
      ...prev,
      cliente_id: cliente.id,
      cliente: cliente
    }));
    setShowClienteSelector(false);
  };

  const agregarProducto = (producto: any) => {
    const nuevoItem: FacturaItem = {
      id_item: producto.id,
      tipo_item: producto.tipo === 'producto' ? 'producto' : 'inventario',
      codigo: producto.codigo,
      descripcion: producto.descripcion,
      unidad: producto.unidad || 'UND',
      cantidad: 1,
      precio_unitario: producto.precio_venta || 0,
      descuento_porcentaje: 0,
      impuesto_porcentaje: 13,
      subtotal: 0,
      descuento_monto: 0,
      impuesto_monto: 0,
      total: 0,
      bom_items: []
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, nuevoItem]
    }));
    setShowProductoSelector(false);
  };

  const validarFormulario = () => {
    if (!formData.cliente_id) {
      showAlert('Debe seleccionar un cliente');
      return false;
    }

    if (formData.items.length === 0) {
      showAlert('Debe agregar al menos un artículo');
      return false;
    }

    if (!formData.codigo_actividad) {
      showAlert('Debe especificar el código de actividad económica');
      return false;
    }

    return true;
  };

  const handleEmitir = async () => {
    if (!validarFormulario()) return;

    setProcesando(true);
    try {
      const payload = {
        origen_tipo: formData.origen_tipo,
        origen_id: formData.origen_id,
        tipo_documento: formData.tipo_documento,
        moneda: formData.moneda,
        tipo_cambio: formData.tipo_cambio,
        condicion_venta: formData.condicion_venta,
        medio_pago: formData.medio_pago,
        observaciones: formData.observaciones,
        cliente_id: formData.cliente_id,
        lineas: formData.items.map(item => ({
          id_item: item.id_item,
          tipo_item: item.tipo_item,
          descripcion: item.descripcion,
          unidad: item.unidad,
          cantidad: item.cantidad,
          precio_unit: item.precio_unitario,
          descuento_pct: item.descuento_porcentaje,
          impuesto_pct: item.impuesto_porcentaje,
          total: item.total
        }))
      };

      await onEmitir(payload);
    } finally {
      setProcesando(false);
    }
  };

  const handleGuardarBorrador = async () => {
    if (!formData.cliente_id) {
      showAlert('Debe seleccionar un cliente');
      return;
    }

    const payload = {
      ...formData,
      estado_local: 'borrador'
    };

    await onGuardarBorrador(payload);
  };

  const origenesFiltered = buscarOrigenes(busquedaOrigen);

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Progress Steps */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {[
            { num: 1, title: 'Selección de Origen', icon: 'ri-file-search-line' },
            { num: 2, title: 'Encabezado de Factura', icon: 'ri-file-edit-line' },
            { num: 3, title: 'Detalle de Productos', icon: 'ri-shopping-cart-line' },
            { num: 4, title: 'Confirmación', icon: 'ri-check-line' }
          ].map((step, index) => (
            <div key={step.num} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                paso >= step.num 
                  ? 'bg-blue-600 border-blue-600 text-white' 
                  : 'border-gray-300 text-gray-500'
              }`}>
                {paso > step.num ? (
                  <i className="ri-check-line"></i>
                ) : (
                  <i className={step.icon}></i>
                )}
              </div>
              <div className="ml-3 hidden sm:block">
                <p className={`text-sm font-medium ${
                  paso >= step.num ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {step.title}
                </p>
              </div>
              {index < 3 && (
                <div className={`hidden sm:block w-16 h-0.5 ml-4 ${
                  paso > step.num ? 'bg-blue-600' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* Paso 1: Selección de Origen */}
        {paso === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Selección de Origen</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Origen del documento *
                </label>
                <select
                  value={formData.origen_tipo}
                  onChange={(e) => setFormData(prev => ({ ...prev, origen_tipo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Seleccionar origen...</option>
                  <option value="pedido">Desde Pedido Confirmado</option>
                  <option value="cotizacion">Desde Cotización Aprobada</option>
                </select>
              </div>

              {formData.origen_tipo && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Buscar {formData.origen_tipo}
                  </label>
                  <input
                    type="text"
                    value={busquedaOrigen}
                    onChange={(e) => setBusquedaOrigen(e.target.value)}
                    placeholder={`Buscar por código o cliente...`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            {/* Lista de resultados */}
            {origenesFiltered.length > 0 && (
              <div className="border border-gray-200 rounded-lg">
                <div className="max-h-64 overflow-y-auto">
                  {origenesFiltered.map((origen) => (
                    <div
                      key={origen.id}
                      onClick={() => seleccionarOrigen(origen)}
                      className="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer last:border-b-0"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-900">{origen.codigo}</div>
                          <div className="text-sm text-gray-500">
                            Cliente: {origen.cliente?.nombre_razon_social}
                          </div>
                          <div className="text-sm text-gray-500">
                            {origen.cliente?.identificacion}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-900">
                            {formatCurrency(origen.total, 'CRC')}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(origen.fecha_emision || origen.fecha_creacion).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => setPaso(2)}
                disabled={!formData.origen_id && !origenData}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
              >
                Continuar
                <i className="ri-arrow-right-line ml-2"></i>
              </button>
            </div>
          </div>
        )}

        {/* Paso 2: Encabezado de Factura */}
        {paso === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Encabezado de Factura</h2>
              <button
                onClick={() => setPaso(1)}
                className="text-blue-600 hover:text-blue-800 cursor-pointer"
              >
                <i className="ri-arrow-left-line mr-1"></i>
                Volver
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de documento *
                </label>
                <select
                  value={formData.tipo_documento}
                  onChange={(e) => setFormData(prev => ({ ...prev, tipo_documento: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="FE">Factura Electrónica (FE)</option>
                  <option value="TE">Tiquete Electrónico (TE)</option>
                  <option value="NC">Nota de Crédito (NC)</option>
                  <option value="ND">Nota de Débito (ND)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Moneda
                </label>
                <select
                  value={formData.moneda}
                  onChange={(e) => setFormData(prev => ({ ...prev, moneda: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="CRC">Colones (CRC)</option>
                  <option value="USD">Dólares (USD)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de cambio
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.tipo_cambio}
                  onChange={(e) => setFormData(prev => ({ ...prev, tipo_cambio: parseFloat(e.target.value) || 1 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Condición de venta *
                </label>
                <select
                  value={formData.condicion_venta}
                  onChange={(e) => setFormData(prev => ({ ...prev, condicion_venta: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="contado">Contado</option>
                  <option value="credito">Crédito</option>
                  <option value="apartado">Apartado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Medio de pago *
                </label>
                <select
                  value={formData.medio_pago}
                  onChange={(e) => setFormData(prev => ({ ...prev, medio_pago: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de emisión *
                </label>
                <input
                  type="date"
                  value={formData.fecha_emision}
                  onChange={(e) => setFormData(prev => ({ ...prev, fecha_emision: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código actividad económica *
                </label>
                <input
                  type="text"
                  value={formData.codigo_actividad}
                  onChange={(e) => setFormData(prev => ({ ...prev, codigo_actividad: e.target.value }))}
                  placeholder="Ej: 722001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Cliente */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cliente *
              </label>
              <div className="flex gap-2">
                <div className="flex-1 p-3 border border-gray-300 rounded-lg bg-gray-50">
                  {formData.cliente ? (
                    <div>
                      <div className="font-medium">{formData.cliente.nombre_razon_social}</div>
                      <div className="text-sm text-gray-500">{formData.cliente.identificacion}</div>
                      <div className="text-sm text-gray-500">{formData.cliente.correo_principal}</div>
                    </div>
                  ) : (
                    <span className="text-gray-500">Seleccionar cliente</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowClienteSelector(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
                >
                  <i className="ri-search-line"></i>
                </button>
              </div>
            </div>

            {/* Selector de Cliente */}
            {showClienteSelector && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Seleccionar Cliente</h3>
                    <button
                      onClick={() => setShowClienteSelector(false)}
                      className="text-gray-500 hover:text-gray-700 cursor-pointer"
                    >
                      <i className="ri-close-line text-xl"></i>
                    </button>
                  </div>
                  <div className="space-y-2">
                    {clientesDemo.map((cliente) => (
                      <div
                        key={cliente.id}
                        onClick={() => seleccionarCliente(cliente)}
                        className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <div className="font-medium">{cliente.nombre_razon_social}</div>
                        <div className="text-sm text-gray-500">{cliente.identificacion}</div>
                        <div className="text-sm text-gray-500">{cliente.correo_principal}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones
              </label>
              <textarea
                value={formData.observaciones}
                onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Observaciones adicionales..."
              />
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setPaso(1)}
                className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer whitespace-nowrap"
              >
                <i className="ri-arrow-left-line mr-2"></i>
                Anterior
              </button>
              <button
                onClick={() => setPaso(3)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer whitespace-nowrap"
              >
                Continuar
                <i className="ri-arrow-right-line ml-2"></i>
              </button>
            </div>
          </div>
        )}

        {/* Paso 3: Detalle de Productos */}
        {paso === 3 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Detalle de Productos/Servicios</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setPaso(2)}
                  className="text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  <i className="ri-arrow-left-line mr-1"></i>
                  Volver
                </button>
                <button
                  onClick={() => setShowProductoSelector(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer"
                >
                  <i className="ri-add-line mr-2"></i>
                  Agregar
                </button>
              </div>
            </div>

            {/* Selector de Producto */}
            {showProductoSelector && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Seleccionar Producto</h3>
                    <button
                      onClick={() => setShowProductoSelector(false)}
                      className="text-gray-500 hover:text-gray-700 cursor-pointer"
                    >
                      <i className="ri-close-line text-xl"></i>
                    </button>
                  </div>
                  <div className="space-y-2">
                    {productosDemo.map((producto) => (
                      <div
                        key={producto.id}
                        onClick={() => agregarProducto(producto)}
                        className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <div className="font-medium">{producto.descripcion}</div>
                        <div className="text-sm text-gray-500">Código: {producto.codigo}</div>
                        <div className="text-sm text-gray-500">
                          Precio: {formatCurrency(producto.precio_venta, 'CRC')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tabla de Items */}
            {formData.items.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <i className="ri-shopping-cart-line text-4xl mb-4"></i>
                <p className="text-lg font-medium">No hay productos agregados</p>
                <p>Use el botón "Agregar" para añadir productos o servicios</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Código
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Descripción
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unidad
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cantidad
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Precio Unit.
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Desc. %
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Imp. %
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
                    {formData.items.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.codigo}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="max-w-xs">
                            <div className="font-medium">{item.descripcion}</div>
                            {item.bom_items && item.bom_items.length > 0 && (
                              <div className="mt-2 text-xs text-gray-500">
                                <details className="cursor-pointer">
                                  <summary className="font-medium">Ítems utilizados ({item.bom_items.length})</summary>
                                  <div className="mt-1 pl-4 border-l-2 border-blue-200">
                                    {item.bom_items.map((bomItem: any, bomIndex: number) => (
                                      <div key={bomIndex} className="py-1">
                                        <span className="font-medium">{bomItem.descripcion}</span>
                                        <span className="ml-2 text-gray-400">
                                          {bomItem.cantidad_total} {bomItem.unidad}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.unidad}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            step="0.001"
                            value={item.cantidad}
                            onChange={(e) => actualizarItem(index, 'cantidad', parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            step="0.01"
                            value={item.precio_unitario}
                            onChange={(e) => actualizarItem(index, 'precio_unitario', parseFloat(e.target.value) || 0)}
                            className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            step="0.01"
                            value={item.descuento_porcentaje}
                            onChange={(e) => actualizarItem(index, 'descuento_porcentaje', parseFloat(e.target.value) || 0)}
                            className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            step="0.01"
                            value={item.impuesto_porcentaje}
                            onChange={(e) => actualizarItem(index, 'impuesto_porcentaje', parseFloat(e.target.value) || 0)}
                            className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(item.total, formData.moneda)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => eliminarItem(index)}
                            className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded cursor-pointer"
                          >
                            <i className="ri-delete-bin-line"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Totales */}
            {formData.items.length > 0 && (
              <div className="border-t pt-6">
                <div className="max-w-md ml-auto space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(totales.subtotal, formData.moneda)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Descuentos:</span>
                    <span>-{formatCurrency(totales.descuento_total, formData.moneda)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Impuestos:</span>
                    <span>{formatCurrency(totales.impuesto_total, formData.moneda)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold border-t pt-2">
                    <span>Total:</span>
                    <span>{formatCurrency(totales.total, formData.moneda)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <button
                onClick={() => setPaso(2)}
                className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer whitespace-nowrap"
              >
                <i className="ri-arrow-left-line mr-2"></i>
                Anterior
              </button>
              <button
                onClick={() => setPaso(4)}
                disabled={formData.items.length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
              >
                Continuar
                <i className="ri-arrow-right-line ml-2"></i>
              </button>
            </div>
          </div>
        )}

        {/* Paso 4: Confirmación */}
        {paso === 4 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Confirmación y Emisión</h2>
              <button
                onClick={() => setPaso(3)}
                className="text-blue-600 hover:text-blue-800 cursor-pointer"
              >
                <i className="ri-arrow-left-line mr-1"></i>
                Volver
              </button>
            </div>

            {/* Resumen */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Información General</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tipo de documento:</span>
                    <span className="font-medium">{formData.tipo_documento}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cliente:</span>
                    <span className="font-medium">{formData.cliente?.nombre_razon_social}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Moneda:</span>
                    <span className="font-medium">{formData.moneda}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Condición de venta:</span>
                    <span className="font-medium">{formData.condicion_venta}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Medio de pago:</span>
                    <span className="font-medium">{formData.medio_pago}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Totales</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span>{formatCurrency(totales.subtotal, formData.moneda)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Descuentos:</span>
                    <span>-{formatCurrency(totales.descuento_total, formData.moneda)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Impuestos:</span>
                    <span>{formatCurrency(totales.impuesto_total, formData.moneda)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold border-t pt-3">
                    <span>Total:</span>
                    <span>{formatCurrency(totales.total, formData.moneda)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Productos */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Productos/Servicios ({formData.items.length})
              </h3>
              <div className="space-y-2">
                {formData.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                    <div>
                      <span className="font-medium">{item.descripcion}</span>
                      <span className="text-gray-500 ml-2">({item.codigo})</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(item.total, formData.moneda)}</div>
                      <div className="text-sm text-gray-500">
                        {item.cantidad} × {formatCurrency(item.precio_unitario, formData.moneda)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex justify-between">
              <button
                onClick={() => setPaso(3)}
                className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer whitespace-nowrap"
              >
                <i className="ri-arrow-left-line mr-2"></i>
                Anterior
              </button>
              
              <div className="flex gap-3">
                <button
                  onClick={handleGuardarBorrador}
                  disabled={loading}
                  className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-save-line mr-2"></i>
                  Guardar Borrador
                </button>
                
                <button
                  onClick={handleEmitir}
                  disabled={loading || procesando}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                >
                  {procesando ? (
                    <>
                      <i className="ri-loader-4-line animate-spin mr-2"></i>
                      Firmando y enviando a Hacienda...
                    </>
                  ) : (
                    <>
                      <i className="ri-send-plane-line mr-2"></i>
                      Emitir Factura
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
