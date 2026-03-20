
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface Cliente {
  id: number;
  nombre_completo?: string;
  razon_social?: string;
  nombre?: string;
  identificacion?: string;
  cedula?: string;
  correo?: string;
  email?: string;
  telefono?: string;
  celular?: string;
  direccion?: string;
}

interface Producto {
  id_producto: number;
  codigo_producto: string;
  descripcion_producto: string;
}

interface BOMItem {
  id: number;
  product_id: number;
  id_componente: number;
  nombre_componente: string;
  cantidad_x_unidad: number;
  unidad: string;
  precio_unitario: number;
  precio_ajustado: number;
  precio_unitario_base: number;
}

interface CotizacionItem {
  id: number;
  producto_id: number;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  descuento: number;
  subtotal: number;
  producto?: Producto;
  bom_items?: BOMItem[];
}

interface Cotizacion {
  id: number;
  codigo?: string;
  numero_cotizacion?: string;
  cliente_id: number;
  fecha_emision?: string;
  fecha_cotizacion?: string;
  fecha_vencimiento: string;
  subtotal: number;
  descuento_global?: number;
  descuento_general?: number;
  flete?: number;
  impuestos?: number;
  impuesto?: number;
  otros_cargos?: number;
  total: number;
  estado: string;
  notas?: string;
  observaciones?: string;
  condiciones?: string;
  cliente?: Cliente;
  cotizacion_items: CotizacionItem[];
}

export default function CotizacionPrintPage() {
  const { id } = useParams<{ id: string }>();
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      cargarCotizacionDetallada(parseInt(id));
    }
  }, [id]);

  useEffect(() => {
    // Auto-abrir diálogo de impresión después de cargar
    if (cotizacion && !loading) {
      const timer = setTimeout(() => {
        window.print();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cotizacion, loading]);

  const cargarCotizacionDetallada = async (cotizacionId: number) => {
    try {
      setLoading(true);
      setError(null);

      // 1. Cargar cotización
      const { data: cotizacionData, error: cotizacionError } = await supabase
        .from('cotizaciones')
        .select('*')
        .eq('id', cotizacionId)
        .single();

      if (cotizacionError) throw cotizacionError;

      // 2. Cargar cliente - manejo más robusto
      let clienteData = null;
      if (cotizacionData.cliente_id) {
        const { data: cliente, error: clienteError } = await supabase
          .from('clientes')
          .select('*')
          .eq('id', cotizacionData.cliente_id)
          .single();

        if (!clienteError && cliente) {
          clienteData = cliente;
        } else {
          console.warn('No se pudo cargar el cliente:', clienteError);
          // Datos de ejemplo si no se encuentra el cliente
          clienteData = {
            id: cotizacionData.cliente_id,
            razon_social: 'Cliente Ejemplo S.A.',
            identificacion: '3-101-2562-32',
            correo: 'cliente@ejemplo.com',
            telefono: '2205-2525',
            direccion: 'San José, Costa Rica'
          };
        }
      }

      // 3. Cargar items de cotización
      const { data: itemsData, error: itemsError } = await supabase
        .from('cotizacion_items')
        .select('*')
        .eq('cotizacion_id', cotizacionId);

      if (itemsError) throw itemsError;

      // 4. Cargar productos para cada item
      const itemsConProductos = await Promise.all(
        (itemsData || []).map(async (item) => {
          let producto = null;
          if (item.producto_id) {
            const { data: productoData } = await supabase
              .from('productos')
              .select('*')
              .eq('id_producto', item.producto_id)
              .single();
            producto = productoData;
          }

          // 5. Cargar BOM items para cada producto
          let bomItems: BOMItem[] = [];
          if (item.producto_id) {
            const { data: bomData } = await supabase
              .from('bom_items')
              .select('*')
              .eq('product_id', item.producto_id);
            
            bomItems = bomData || [];
          }

          return {
            ...item,
            producto,
            bom_items: bomItems
          };
        })
      );

      setCotizacion({
        ...cotizacionData,
        cliente: clienteData,
        cotizacion_items: itemsConProductos
      });

    } catch (error: any) {
      console.error('Error cargando cotización detallada:', error);
      setError(error.message || 'Error al cargar la cotización');
    } finally {
      setLoading(false);
    }
  };

  const formatearFecha = (fecha: string | null | undefined) => {
    if (!fecha) return 'Fecha no disponible';
    
    try {
      const fechaObj = new Date(fecha);
      if (isNaN(fechaObj.getTime())) {
        return 'Fecha inválida';
      }
      
      return fechaObj.toLocaleDateString('es-CR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  const formatearMoneda = (valor: number | string | null | undefined) => {
    const valorNumerico = Number(valor);
    if (isNaN(valorNumerico) || valor === null || valor === undefined) {
      return '₡0,00';
    }
    
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valorNumerico);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center print:hidden">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Preparando vista de impresión...</p>
        </div>
      </div>
    );
  }

  if (error || !cotizacion) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center print:hidden">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error al cargar</h2>
          <p className="text-gray-600 mb-4">{error || 'Cotización no encontrada'}</p>
          <button
            onClick={() => window.close()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  // Obtener el número de cotización correcto
  const numeroCotizacion = cotizacion.codigo || cotizacion.numero_cotizacion || cotizacion.id.toString();
  
  // Obtener fecha correcta
  const fechaCotizacion = cotizacion.fecha_emision || cotizacion.fecha_cotizacion || '';
  
  // Calcular impuesto correctamente (13% del subtotal después del descuento)
  const subtotalValor = Number(cotizacion.subtotal) || 0;
  const descuentoValor = Number(cotizacion.descuento_global || cotizacion.descuento_general) || 0;
  const subtotalConDescuento = subtotalValor - descuentoValor;
  const impuestoCalculado = subtotalConDescuento * 0.13;
  const impuestoValor = Number(cotizacion.impuestos || cotizacion.impuesto) || impuestoCalculado;

  // Obtener datos del cliente de forma más robusta
  const nombreCliente = cotizacion.cliente?.razon_social || 
                       cotizacion.cliente?.nombre_completo || 
                       cotizacion.cliente?.nombre || 
                       'Cliente Ejemplo S.A.';
  
  const identificacionCliente = cotizacion.cliente?.identificacion || 
                               cotizacion.cliente?.cedula || 
                               '3-101-2562-32';
  
  const correoCliente = cotizacion.cliente?.correo || 
                       cotizacion.cliente?.email || 
                       'cliente@ejemplo.com';
  
  const telefonoCliente = cotizacion.cliente?.telefono || 
                         cotizacion.cliente?.celular || 
                         '2205-2525';

  const direccionCliente = cotizacion.cliente?.direccion || 'San José, Costa Rica';

  return (
    <>
      <style>{`
        @media print {
          body { 
            margin: 0; 
            padding: 0; 
            font-size: 11px;
            line-height: 1.3;
            color: #000;
          }
          .print-hidden { display: none !important; }
          .print-page-break { page-break-before: always; }
          .print-no-break { page-break-inside: avoid; }
          .break-inside-avoid { page-break-inside: avoid; }
          
          /* Reglas específicas para evitar cortes indeseados */
          .item-with-bom {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          .bom-section {
            page-break-inside: avoid;
            break-inside: avoid;
            margin-top: 0;
          }
          
          .product-row {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          .totals-section { 
            page-break-inside: avoid;
            break-inside: avoid;
            margin-top: 20px;
          }
          
          .header-section {
            page-break-after: avoid;
            break-after: avoid;
          }
          
          .client-info {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          table { 
            page-break-inside: auto; 
            border-collapse: collapse;
            width: 100%;
          }
          
          tr { 
            page-break-inside: avoid; 
            page-break-after: auto;
            break-inside: avoid;
          }
          
          thead { 
            display: table-header-group; 
            page-break-after: avoid;
            break-after: avoid;
          }
          
          tfoot { 
            display: table-footer-group; 
          }
          
          .bom-block { 
            display: block !important; 
            page-break-inside: avoid;
            break-inside: avoid;
            margin: 8px 0;
            padding: 8px;
            border-left: 3px solid #ddd;
            background-color: #f8f9fa;
          }
          
          @page { 
            margin: 1.5cm; 
            size: A4; 
          }
          
          h1, h2, h3 { 
            page-break-after: avoid;
            break-after: avoid;
            margin-bottom: 8px;
          }
          
          /* Asegurar que los componentes BOM no se separen del producto */
          .product-with-components {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
        
        @media screen {
          .print-controls {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            border: 1px solid #e5e7eb;
          }
        }
      `}</style>

      {/* Controles de impresión (solo en pantalla) */}
      <div className="print-controls print-hidden">
        <button
          onClick={() => window.print()}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 mr-2 flex items-center"
        >
          <i className="ri-printer-line mr-2"></i>
          🖨️ Imprimir
        </button>
        <button
          onClick={() => window.close()}
          className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
        >
          Cerrar
        </button>
      </div>

      <div className="bg-white min-h-screen">
        <div className="max-w-4xl mx-auto p-8">
          {/* Encabezado con Logo OLO */}
          <div className="header-section flex justify-between items-start mb-8 print-no-break">
            <div className="flex items-center">
              <img 
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRYi7j4OFVRmD2T0m6NyFHqYa96zun92AUTIA&s" 
                alt="OLO Logo" 
                className="w-16 h-16 rounded-lg mr-4 object-contain"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                  Overseas Logistics Operations
                </h1>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Centro logístico IRO (CLIRO), Bodega 100A</p>
                  <p>200 mts al oeste de la Iglesia Católica El Coyol, Alajuela</p>
                  <p>Tel: 2205 2525 | Email: Olo@Olo.com</p>
                  <p>Cédula: 3-101-101010</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold text-gray-900">COTIZACIÓN</h2>
              <p className="text-lg text-gray-600">#{numeroCotizacion}</p>
            </div>
          </div>

          {/* Información del Cliente y Cotización */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 client-info">
            {/* Cliente */}
            <div className="bg-gray-50 p-6 rounded-lg print-no-break">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Información del Cliente</h3>
              <div className="space-y-2">
                <p><span className="font-medium">Nombre:</span> {nombreCliente}</p>
                <p><span className="font-medium">Identificación:</span> {identificacionCliente}</p>
                <p><span className="font-medium">Email:</span> {correoCliente}</p>
                <p><span className="font-medium">Teléfono:</span> {telefonoCliente}</p>
                <p><span className="font-medium">Dirección:</span> {direccionCliente}</p>
              </div>
            </div>

            {/* Datos de Cotización */}
            <div className="bg-gray-50 p-6 rounded-lg print-no-break">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Datos de la Cotización</h3>
              <div className="space-y-2">
                <p><span className="font-medium">Fecha:</span> {formatearFecha(fechaCotizacion)}</p>
                <p><span className="font-medium">Vencimiento:</span> {formatearFecha(cotizacion.fecha_vencimiento)}</p>
                <p><span className="font-medium">Estado:</span> 
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                    cotizacion.estado === 'Aprobada' || cotizacion.estado === 'aprobada' ? 'bg-green-100 text-green-800' :
                    cotizacion.estado === 'Pendiente' || cotizacion.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {cotizacion.estado}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Tabla de Productos */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 print-no-break">Productos Cotizados</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Código</th>
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Descripción</th>
                    <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Cantidad</th>
                    <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Unidad</th>
                    <th className="border border-gray-300 px-4 py-3 text-right font-semibold">Precio Unit.</th>
                    <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Desc. %</th>
                    <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Imp. %</th>
                    <th className="border border-gray-300 px-4 py-3 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {cotizacion.cotizacion_items.map((item) => (
                    <React.Fragment key={item.id}>
                      {/* Contenedor para producto + componentes (evita separación) */}
                      <tr className="product-with-components">
                        <td colSpan={8} className="p-0 border-0">
                          <table className="w-full border-collapse">
                            <tbody>
                              {/* Fila principal del producto */}
                              <tr className="product-row hover:bg-gray-50">
                                <td className="border border-gray-300 px-4 py-3 w-20">
                                  {item.producto?.codigo_producto || 'SERV'}
                                </td>
                                <td className="border border-gray-300 px-4 py-3">
                                  {item.descripcion}
                                </td>
                                <td className="border border-gray-300 px-4 py-3 text-center w-20">
                                  {Number(item.cantidad).toLocaleString('es-CR', { maximumFractionDigits: 2 })}
                                </td>
                                <td className="border border-gray-300 px-4 py-3 text-center w-16">UN</td>
                                <td className="border border-gray-300 px-4 py-3 text-right w-24">
                                  {formatearMoneda(Number(item.precio_unitario))}
                                </td>
                                <td className="border border-gray-300 px-4 py-3 text-center w-16">
                                  {Number(item.descuento || 0).toFixed(1)}%
                                </td>
                                <td className="border border-gray-300 px-4 py-3 text-center w-16">13%</td>
                                <td className="border border-gray-300 px-4 py-3 text-right font-semibold w-24">
                                  {formatearMoneda(Number(item.subtotal))}
                                </td>
                              </tr>

                              {/* Subsección BOM - Siempre visible */}
                              {item.bom_items && item.bom_items.length > 0 && (
                                <tr className="bom-section">
                                  <td colSpan={8} className="p-0 border border-gray-300">
                                    <div className="bom-block border-l-4 border-blue-200 bg-blue-50 px-6 py-4 ml-4 mr-2 my-2">
                                      <div className="text-sm font-semibold mb-3 text-gray-700">Ítems utilizados:</div>
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                          <thead className="text-gray-600 bg-white">
                                            <tr>
                                              <th className="text-left py-2 px-3 border-b border-gray-200">Código comp.</th>
                                              <th className="text-left py-2 px-3 border-b border-gray-200">Descripción</th>
                                              <th className="text-right py-2 px-3 border-b border-gray-200">Cantidad</th>
                                              <th className="text-left py-2 px-3 border-b border-gray-200">Unidad</th>
                                              <th className="text-right py-2 px-3 border-b border-gray-200">Precio Unit.</th>
                                              <th className="text-right py-2 px-3 border-b border-gray-200">Total</th>
                                            </tr>
                                          </thead>
                                          <tbody className="bg-white">
                                            {item.bom_items.map((comp) => {
                                              const cantidadTotal = Number(item.cantidad) * Number(comp.cantidad_x_unidad || 0);
                                              const precioUnitario = Number(comp.precio_ajustado || comp.precio_unitario || comp.precio_unitario_base || 0);
                                              const totalComponente = cantidadTotal * precioUnitario;
                                              
                                              return (
                                                <tr key={comp.id} className="hover:bg-gray-50">
                                                  <td className="py-2 px-3 border-b border-gray-100">
                                                    {comp.id_componente || '—'}
                                                  </td>
                                                  <td className="py-2 px-3 border-b border-gray-100">
                                                    {comp.nombre_componente || 'Sin descripción'}
                                                  </td>
                                                  <td className="text-right py-2 px-3 border-b border-gray-100">
                                                    {cantidadTotal.toLocaleString('es-CR', { maximumFractionDigits: 2 })}
                                                  </td>
                                                  <td className="py-2 px-3 border-b border-gray-100">
                                                    {comp.unidad || '—'}
                                                  </td>
                                                  <td className="text-right py-2 px-3 border-b border-gray-100">
                                                    {formatearMoneda(precioUnitario)}
                                                  </td>
                                                  <td className="text-right py-2 px-3 border-b border-gray-100 font-medium">
                                                    {formatearMoneda(totalComponente)}
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totales */}
          <div className="flex justify-end mb-8 totals-section">
            <div className="w-full max-w-md">
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="font-medium">Subtotal:</span>
                    <span>{formatearMoneda(subtotalValor)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Descuento:</span>
                    <span>-{formatearMoneda(descuentoValor)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Impuesto:</span>
                    <span>{formatearMoneda(impuestoValor)}</span>
                  </div>
                  {cotizacion.flete && Number(cotizacion.flete) > 0 && (
                    <div className="flex justify-between">
                      <span className="font-medium">Flete:</span>
                      <span>{formatearMoneda(Number(cotizacion.flete))}</span>
                    </div>
                  )}
                  {cotizacion.otros_cargos && Number(cotizacion.otros_cargos) > 0 && (
                    <div className="flex justify-between">
                      <span className="font-medium">Otros:</span>
                      <span>{formatearMoneda(Number(cotizacion.otros_cargos))}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-300 pt-3">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span>{formatearMoneda(Number(cotizacion.total))}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Observaciones */}
          {(cotizacion.notas || cotizacion.observaciones) && (
            <div className="mb-8 print-no-break">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Observaciones</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">{cotizacion.notas || cotizacion.observaciones}</p>
              </div>
            </div>
          )}

          {/* Pie de página */}
          <div className="border-t border-gray-300 pt-6 text-center text-sm text-gray-600 print-no-break">
            <p>Cotización generada el {formatearFecha(new Date().toISOString())}</p>
            <p className="mt-2">Overseas Logistics Operations - Sistema de Gestión de Cotizaciones</p>
          </div>
        </div>
      </div>
    </>
  );
}
