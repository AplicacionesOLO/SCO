import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { pedidoService } from '../../../services/pedidoService';
import { CotizacionService } from '../../../services/cotizacionService';
import { BuscarClienteModal } from '../../clientes/components/BuscarClienteModal';
import { BuscarProductoModal } from '../../cotizaciones/components/BuscarProductoModal';
import { formatCurrency } from '../../../lib/currency';
import { showAlert } from '../../../utils/dialog';
import type { Pedido, PedidoItem, CreatePedidoRequest, UpdatePedidoRequest } from '../../../types/pedido';

interface PedidoFormProps {
  pedido?: Pedido | null;
  onSave: () => void;
  onCancel: () => void;
}

export function PedidoForm({ pedido, onSave, onCancel }: PedidoFormProps) {
  const [formData, setFormData] = useState({
    cliente_id: 0,
    moneda: 'CRC',
    tipo_cambio: 520.0,
    notas: '',
    items: [] as PedidoItem[]
  });
  
  const [cliente, setCliente] = useState<any>(null);
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [showProductoModal, setShowProductoModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actualizandoTipoCambio, setActualizandoTipoCambio] = useState(false);
  const [mensajeTipoCambio, setMensajeTipoCambio] = useState('Tipo de cambio según Banco Central de Costa Rica (BCCR). Haga clic en actualizar para obtener el valor más reciente.');
  const [totales, setTotales] = useState({
    subtotal: 0,
    descuento_total: 0,
    impuesto_total: 0,
    total: 0
  });

  useEffect(() => {
    // Obtener tipo de cambio automáticamente al cargar
    obtenerTipoCambio();
    
    if (pedido) {
      // Mapear correctamente los items del pedido
      const itemsMapeados = (pedido.items || []).map(item => ({
        item_type: item.item_type || 'producto',
        item_id: item.item_id || 0,
        codigo_articulo: item.codigo_articulo || '',
        descripcion: item.descripcion || 'Sin descripción',
        unidad: item.unidad || 'UND',
        cantidad: item.cantidad || 1,
        precio_unitario: item.precio_unit || item.precio_unitario || 0,
        descuento_porcentaje: item.descuento_pct || item.descuento_porcentaje || 0,
        descuento_monto: 0,
        impuesto_porcentaje: item.impuesto_pct || item.impuesto_porcentaje || 13,
        impuesto_monto: 0,
        subtotal_linea: item.total || item.total_linea || 0,
        total_linea: item.total || item.total_linea || 0,
        meta_json: item.meta_json
      }));

      setFormData({
        cliente_id: pedido.cliente_id,
        moneda: pedido.moneda,
        tipo_cambio: pedido.tipo_cambio,
        notas: pedido.notas || '',
        items: itemsMapeados
      });
      setCliente(pedido.cliente);
    }
  }, [pedido]);

  useEffect(() => {
    calculateTotales();
  }, [formData.items]);

  // Función para obtener tipo de cambio del BCCR
  const obtenerTipoCambio = async () => {
    try {
      setActualizandoTipoCambio(true);
      
      // Usar el mismo método que cotizaciones para obtener tipo de cambio del BCCR
      const tipoCambio = await CotizacionService.obtenerTipoCambioBCCR();
      
      setFormData(prev => ({
        ...prev,
        tipo_cambio: tipoCambio
      }));
      
      // Actualizar el mensaje informativo
      setMensajeTipoCambio(`💰 Tipo de cambio actualizado según BCCR: ₡${tipoCambio.toFixed(2)} por USD`);
    } catch (error) {
      console.error('Error obteniendo tipo de cambio:', error);
      setMensajeTipoCambio('❌ Error al obtener tipo de cambio del BCCR. Usando valor por defecto.');
    } finally {
      setActualizandoTipoCambio(false);
    }
  };

  const calculateTotales = () => {
    let subtotal = 0;
    let descuento_total = 0;
    let impuesto_total = 0;

    formData.items.forEach(item => {
      const itemSubtotal = item.cantidad * item.precio_unitario;
      const itemDescuento = itemSubtotal * (item.descuento_porcentaje / 100);
      const itemSubtotalConDescuento = itemSubtotal - itemDescuento;
      const itemImpuesto = itemSubtotalConDescuento * (item.impuesto_porcentaje / 100);

      subtotal += itemSubtotal;
      descuento_total += itemDescuento;
      impuesto_total += itemImpuesto;
    });

    const total = subtotal - descuento_total + impuesto_total;

    setTotales({
      subtotal,
      descuento_total,
      impuesto_total,
      total
    });
  };

  const handleClienteSelect = (clienteSeleccionado: any) => {
    setCliente(clienteSeleccionado);
    setFormData(prev => ({
      ...prev,
      cliente_id: clienteSeleccionado.id
    }));
    setShowClienteModal(false);
  };

  const handleProductoSelect = async (producto: any) => {
    try {
      console.log('Producto seleccionado:', producto);
      
      // Obtener componentes BOM si es un producto
      let bomItems = [];
      if (producto.tipo === 'producto' || producto.id_producto) {
        const { data: bom, error } = await supabase
          .from('bom_items')
          .select(`
            *,
            articulo:inventario(codigo, descripcion, unidad, precio_venta)
          `)
          .eq('producto_id', producto.id_producto || producto.id);

        if (!error && bom) {
          bomItems = bom.map((bomItem: any) => ({
            id: bomItem.articulo_id,
            codigo: bomItem.articulo.codigo,
            descripcion: bomItem.articulo.descripcion,
            cantidad_por_unidad: bomItem.cantidad,
            cantidad_total: bomItem.cantidad * 1,
            unidad: bomItem.articulo.unidad,
            precio_unitario: bomItem.articulo.precio_venta || 0,
            total: (bomItem.articulo.precio_venta || 0) * bomItem.cantidad
          }));
        }
      }

      // Mapear correctamente los campos del producto
      const nuevoItem: PedidoItem = {
        item_type: producto.tipo === 'producto' || producto.id_producto ? 'producto' : 'inventario',
        item_id: producto.id_producto || producto.id,
        codigo_articulo: producto.codigo_producto || producto.codigo || '',
        descripcion: producto.descripcion_producto || producto.descripcion || producto.nombre || 'Sin descripción',
        unidad: producto.unidad || 'UND',
        cantidad: 1,
        precio_unitario: producto.costo_total_bom || producto.precio_venta || 0,
        descuento_porcentaje: 0,
        descuento_monto: 0,
        impuesto_porcentaje: 13,
        impuesto_monto: 0,
        subtotal_linea: producto.costo_total_bom || producto.precio_venta || 0,
        total_linea: (producto.costo_total_bom || producto.precio_venta || 0) * 1.13,
        meta_json: bomItems.length > 0 ? { bom_items: bomItems } : undefined
      };

      console.log('Nuevo item creado:', nuevoItem);

      setFormData(prev => ({
        ...prev,
        items: [...prev.items, nuevoItem]
      }));
    } catch (error) {
      console.error('Error al agregar producto:', error);
      showAlert('Error al agregar producto: ' + (error as Error).message, { type: 'error' });
    }
    setShowProductoModal(false);
  };

  const updateItem = (index: number, field: keyof PedidoItem, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Recalcular totales del item
    const item = newItems[index];
    const itemSubtotal = item.cantidad * item.precio_unitario;
    const itemDescuento = itemSubtotal * (item.descuento_porcentaje / 100);
    const itemSubtotalConDescuento = itemSubtotal - itemDescuento;
    const itemImpuesto = itemSubtotalConDescuento * (item.impuesto_porcentaje / 100);

    newItems[index].subtotal_linea = itemSubtotal;
    newItems[index].descuento_monto = itemDescuento;
    newItems[index].impuesto_monto = itemImpuesto;
    newItems[index].total_linea = itemSubtotalConDescuento + itemImpuesto;

    // Actualizar cantidades BOM si aplica
    if (field === 'cantidad' && item.meta_json?.bom_items) {
      const updatedBomItems = item.meta_json.bom_items.map(bomItem => ({
        ...bomItem,
        cantidad_total: bomItem.cantidad_por_unidad * item.cantidad,
        total: bomItem.precio_unitario * bomItem.cantidad_por_unidad * item.cantidad
      }));
      newItems[index].meta_json = { bom_items: updatedBomItems };
    }

    setFormData(prev => ({
      ...prev,
      items: newItems
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.cliente_id) {
      showAlert('Debe seleccionar un cliente', { type: 'warning' });
      return;
    }

    if (formData.items.length === 0) {
      showAlert('Debe agregar al menos un artículo', { type: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const createData = {
        cliente_id: formData.cliente_id,
        moneda: formData.moneda,
        tipo_cambio: formData.tipo_cambio,
        notas: formData.notas,
        subtotal: totales.subtotal,
        descuento_total: totales.descuento_total,
        impuesto_total: totales.impuesto_total,
        total: totales.total,
        items: formData.items.map(item => ({
          item_type: item.item_type,
          item_id: item.item_id,
          descripcion: item.descripcion || 'Sin descripción',
          unidad: item.unidad || 'UND',
          cantidad: item.cantidad || 1,
          precio_unit: item.precio_unitario || 0,
          descuento_pct: item.descuento_porcentaje || 0,
          impuesto_pct: item.impuesto_porcentaje || 0,
          total: item.total_linea || 0,
          meta_json: item.meta_json
        }))
      };

      if (pedido) {
        await pedidoService.updatePedido(pedido.id, createData);
      } else {
        await pedidoService.createPedido(createData);
      }

      onSave();
    } catch (error) {
      console.error('Error al guardar pedido:', error);
      showAlert('Error al guardar pedido: ' + (error as Error).message, { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {pedido ? `Editar Pedido ${pedido.codigo}` : 'Nuevo Pedido'}
              </h1>
              {pedido && (
                <p className="text-sm text-gray-500">
                  Estado: <span className="font-medium">{pedido.estado}</span>
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 whitespace-nowrap"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="pedido-form"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>

          <form id="pedido-form" onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Información del Cliente */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cliente *
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 p-3 border border-gray-300 rounded-lg bg-gray-50">
                    {cliente ? (
                      <div>
                        <div className="font-medium">{cliente.nombre_razon_social}</div>
                        <div className="text-sm text-gray-500">{cliente.identificacion}</div>
                      </div>
                    ) : (
                      <span className="text-gray-500">Seleccionar cliente</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowClienteModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <i className="ri-search-line"></i>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Cambio
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={formData.tipo_cambio}
                      onChange={(e) => setFormData(prev => ({ ...prev, tipo_cambio: parseFloat(e.target.value) || 1 }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="520.00"
                    />
                    <button
                      type="button"
                      onClick={obtenerTipoCambio}
                      disabled={actualizandoTipoCambio}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
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
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas
              </label>
              <textarea
                value={formData.notas}
                onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Notas adicionales del pedido..."
              />
            </div>

            {/* Items */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Items del Pedido</h3>
                <button
                  type="button"
                  onClick={() => setShowProductoModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 whitespace-nowrap"
                >
                  <i className="ri-add-line"></i>
                  Agregar Item
                </button>
              </div>

              {formData.items.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <i className="ri-shopping-cart-line text-4xl mb-2"></i>
                  <p>No hay items agregados</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.items.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-start">
                        <div className="lg:col-span-2">
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Descripción
                          </label>
                          <div className="text-sm font-medium">{item.descripcion || 'Sin descripción'}</div>
                          <div className="text-xs text-gray-500">{item.codigo_articulo || 'Sin código'}</div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Cantidad
                          </label>
                          <input
                            type="number"
                            step="0.001"
                            value={item.cantidad}
                            onChange={(e) => updateItem(index, 'cantidad', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Precio Unit.
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.precio_unitario}
                            onChange={(e) => updateItem(index, 'precio_unitario', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Desc. %
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.descuento_porcentaje}
                            onChange={(e) => updateItem(index, 'descuento_porcentaje', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div className="flex items-end justify-between">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              Total
                            </label>
                            <div className="text-sm font-medium">
                              {formatCurrency(item.total_linea, formData.moneda)}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-800 p-1"
                          >
                            <i className="ri-delete-bin-line"></i>
                          </button>
                        </div>
                      </div>

                      {/* Componentes BOM */}
                      {item.meta_json?.bom_items && item.meta_json.bom_items.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Ítems utilizados:</h4>
                          <div className="bg-blue-50 rounded p-3">
                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-2 text-xs font-medium text-gray-600 mb-2">
                              <div>Código</div>
                              <div>Descripción</div>
                              <div>Cant. x Unidad</div>
                              <div>Cant. Total</div>
                              <div>Total</div>
                            </div>
                            {item.meta_json.bom_items.map((bomItem, bomIndex) => (
                              <div key={bomIndex} className="grid grid-cols-1 lg:grid-cols-5 gap-2 text-xs text-gray-700 py-1">
                                <div>{bomItem.codigo}</div>
                                <div>{bomItem.descripcion}</div>
                                <div>{bomItem.cantidad_por_unidad} {bomItem.unidad}</div>
                                <div>{bomItem.cantidad_total} {bomItem.unidad}</div>
                                <div>{formatCurrency(bomItem.total, formData.moneda)}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Totales */}
            {formData.items.length > 0 && (
              <div className="border-t pt-6">
                <div className="max-w-md ml-auto space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(totales.subtotal, formData.moneda)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Descuento:</span>
                    <span>-{formatCurrency(totales.descuento_total, formData.moneda)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Impuesto:</span>
                    <span>{formatCurrency(totales.impuesto_total, formData.moneda)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold border-t pt-2">
                    <span>Total:</span>
                    <span>{formatCurrency(totales.total, formData.moneda)}</span>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Modales */}
      {showClienteModal && (
        <BuscarClienteModal
          onSelect={handleClienteSelect}
          onClose={() => setShowClienteModal(false)}
        />
      )}

      {showProductoModal && (
        <BuscarProductoModal
          onSelect={handleProductoSelect}
          onClose={() => setShowProductoModal(false)}
        />
      )}
    </div>
  );
}

export default PedidoForm;
