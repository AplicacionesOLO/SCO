import { useState, useEffect } from 'react';
import { formatCurrency } from '../../../lib/currency';
import type { FacturaElectronica, FacturaLinea } from '../../../types/facturacion';
import { TIPOS_DOCUMENTO, CONDICIONES_VENTA, MEDIOS_PAGO, UNIDADES_MEDIDA } from '../../../types/facturacion';
import { showAlert } from '../../../utils/dialog';

interface FacturacionFormProps {
  factura: FacturaElectronica | null;
  onClose: () => void;
}

export function FacturacionForm({ factura, onClose }: FacturacionFormProps) {
  const [formData, setFormData] = useState<Partial<FacturaElectronica>>({
    tipo_documento: '01',
    fecha_emision: new Date().toISOString().split('T')[0],
    moneda: 'CRC',
    tipo_cambio: 1.0000,
    condicion_venta: '01',
    plazo_credito: 0,
    medio_pago: '01',
    estado_local: 'borrador',
    subtotal: 0,
    descuento_total: 0,
    impuesto_total: 0,
    total: 0
  });

  const [lineas, setLineas] = useState<FacturaLinea[]>([]);
  const [clientes] = useState<any[]>([
    { id: 1, razon_social: 'Cliente Demo 1', identificacion: '1-1234-5678' },
    { id: 2, razon_social: 'Cliente Demo 2', identificacion: '2-2345-6789' }
  ]);
  const [productos] = useState<any[]>([
    { id: 1, codigo: 'PROD001', descripcion: 'Producto Demo 1', precio_venta: 10000, unidad_medida: 'Unid' },
    { id: 2, codigo: 'PROD002', descripcion: 'Producto Demo 2', precio_venta: 20000, unidad_medida: 'Unid' }
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (factura) {
      setFormData(factura);
      setLineas(factura.lineas || []);
    }
  }, [factura]);

  useEffect(() => {
    calcularTotales();
  }, [lineas]);

  const calcularTotales = () => {
    const subtotal = lineas.reduce((sum, linea) => sum + linea.subtotal_linea, 0);
    const descuentoTotal = lineas.reduce((sum, linea) => sum + linea.descuento_monto, 0);
    const impuestoTotal = lineas.reduce((sum, linea) => sum + linea.impuesto_monto, 0);
    const total = subtotal - descuentoTotal + impuestoTotal;

    setFormData(prev => ({
      ...prev,
      subtotal,
      descuento_total: descuentoTotal,
      impuesto_total: impuestoTotal,
      total
    }));
  };

  const agregarLinea = () => {
    const nuevaLinea: FacturaLinea = {
      numero_linea: lineas.length + 1,
      descripcion: '',
      unidad_medida: 'Unid',
      cantidad: 1,
      precio_unitario: 0,
      descuento_porcentaje: 0,
      descuento_monto: 0,
      subtotal_linea: 0,
      impuesto_porcentaje: 13.00,
      impuesto_monto: 0,
      total_linea: 0
    };

    setLineas([...lineas, nuevaLinea]);
  };

  const actualizarLinea = (index: number, campo: keyof FacturaLinea, valor: any) => {
    const nuevasLineas = [...lineas];
    nuevasLineas[index] = { ...nuevasLineas[index], [campo]: valor };

    // Recalcular totales de la línea
    const linea = nuevasLineas[index];
    const subtotalLinea = linea.cantidad * linea.precio_unitario;
    const descuentoMonto = (subtotalLinea * linea.descuento_porcentaje) / 100;
    const baseImpuesto = subtotalLinea - descuentoMonto;
    const impuestoMonto = (baseImpuesto * linea.impuesto_porcentaje) / 100;
    const totalLinea = baseImpuesto + impuestoMonto;

    nuevasLineas[index] = {
      ...linea,
      subtotal_linea: subtotalLinea,
      descuento_monto: descuentoMonto,
      impuesto_monto: impuestoMonto,
      total_linea: totalLinea
    };

    setLineas(nuevasLineas);
  };

  const eliminarLinea = (index: number) => {
    const nuevasLineas = lineas.filter((_, i) => i !== index);
    // Renumerar líneas
    nuevasLineas.forEach((linea, i) => {
      linea.numero_linea = i + 1;
    });
    setLineas(nuevasLineas);
  };

  const seleccionarProducto = (index: number, productoId: string) => {
    const producto = productos.find(p => p.id === parseInt(productoId));
    if (producto) {
      actualizarLinea(index, 'codigo_articulo', producto.codigo);
      actualizarLinea(index, 'descripcion', producto.descripcion);
      actualizarLinea(index, 'precio_unitario', producto.precio_venta || 0);
      actualizarLinea(index, 'unidad_medida', producto.unidad_medida || 'Unid');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (lineas.length === 0) {
        showAlert('Debe agregar al menos una línea');
        setLoading(false);
        return;
      }

      console.log('Guardando factura:', { formData, lineas });
      
      showAlert('Factura guardada exitosamente (modo demo)');
      onClose();
    } catch (error) {
      console.error('Error guardando factura:', error);
      showAlert('Error guardando factura');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">
          {factura ? 'Editar Factura' : 'Nueva Factura'}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 cursor-pointer"
        >
          <i className="ri-close-line text-2xl"></i>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información General */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Información General</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Documento
              </label>
              <select
                value={formData.tipo_documento}
                onChange={(e) => setFormData({ ...formData, tipo_documento: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              >
                {Object.entries(TIPOS_DOCUMENTO).map(([codigo, nombre]) => (
                  <option key={codigo} value={codigo}>{nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cliente
              </label>
              <select
                value={formData.cliente_id || ''}
                onChange={(e) => setFormData({ ...formData, cliente_id: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              >
                <option value="">Seleccionar cliente</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.razon_social} - {cliente.identificacion}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Emisión
              </label>
              <input
                type="date"
                value={formData.fecha_emision?.split('T')[0]}
                onChange={(e) => setFormData({ ...formData, fecha_emision: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Condición de Venta
              </label>
              <select
                value={formData.condicion_venta}
                onChange={(e) => setFormData({ ...formData, condicion_venta: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {Object.entries(CONDICIONES_VENTA).map(([codigo, nombre]) => (
                  <option key={codigo} value={codigo}>{nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Medio de Pago
              </label>
              <select
                value={formData.medio_pago}
                onChange={(e) => setFormData({ ...formData, medio_pago: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {Object.entries(MEDIOS_PAGO).map(([codigo, nombre]) => (
                  <option key={codigo} value={codigo}>{nombre}</option>
                ))}
              </select>
            </div>

            {formData.condicion_venta === '02' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plazo de Crédito (días)
                </label>
                <input
                  type="number"
                  value={formData.plazo_credito}
                  onChange={(e) => setFormData({ ...formData, plazo_credito: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  min="0"
                />
              </div>
            )}
          </div>
        </div>

        {/* Líneas de Detalle */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Líneas de Detalle</h3>
            <button
              type="button"
              onClick={agregarLinea}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors whitespace-nowrap cursor-pointer"
            >
              <i className="ri-add-line mr-2"></i>
              Agregar Línea
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Precio</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descuento %</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {lineas.map((linea, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2">
                      <select
                        onChange={(e) => seleccionarProducto(index, e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                      >
                        <option value="">Seleccionar</option>
                        {productos.map((producto) => (
                          <option key={producto.id} value={producto.id}>
                            {producto.codigo} - {producto.descripcion}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={linea.descripcion}
                        onChange={(e) => actualizarLinea(index, 'descripcion', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                        required
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={linea.cantidad}
                        onChange={(e) => actualizarLinea(index, 'cantidad', parseFloat(e.target.value))}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                        min="0"
                        step="0.01"
                        required
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={linea.precio_unitario}
                        onChange={(e) => actualizarLinea(index, 'precio_unitario', parseFloat(e.target.value))}
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                        min="0"
                        step="0.01"
                        required
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={linea.descuento_porcentaje}
                        onChange={(e) => actualizarLinea(index, 'descuento_porcentaje', parseFloat(e.target.value))}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                        min="0"
                        max="100"
                        step="0.01"
                      />
                    </td>
                    <td className="px-3 py-2 text-sm font-medium">
                      {formatCurrency(linea.total_linea)}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => eliminarLinea(index)}
                        className="text-red-600 hover:text-red-900 cursor-pointer"
                      >
                        <i className="ri-delete-bin-line"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totales */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Resumen</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Subtotal</p>
              <p className="text-lg font-semibold">{formatCurrency(formData.subtotal || 0)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Descuento</p>
              <p className="text-lg font-semibold text-red-600">-{formatCurrency(formData.descuento_total || 0)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Impuesto</p>
              <p className="text-lg font-semibold">{formatCurrency(formData.impuesto_total || 0)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-xl font-bold text-orange-600">{formatCurrency(formData.total || 0)}</p>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer"
          >
            {loading ? 'Guardando...' : 'Guardar Factura'}
          </button>
        </div>
      </form>
    </div>
  );
}