import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { pedidoService } from '../../../services/pedidoService';
import NotificationPopup from '../../../components/base/NotificationPopup';

interface Cliente {
  id: number;
  nombre_razon_social?: string;
  identificacion?: string;
  correo_principal?: string;
  telefono_numero?: string;
  telefono_pais?: string;
  otras_senas?: string;
  barrio?: string;
  provincias?: { nombre: string };
  cantones?: { nombre: string };
  distritos?: { nombre: string };
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
  moneda?: string;
  tipo_cambio?: number;
  created_by?: string;
  cliente?: Cliente;
  cotizacion_items: CotizacionItem[];
}

interface CotizacionDetalladaProps {
  cotizacionId?: number;
}

const CotizacionDetallada: React.FC<CotizacionDetalladaProps> = ({ cotizacionId }) => {
  const navigate = useNavigate();
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<{ [key: number]: boolean }>({});
  const [creadorNombre, setCreadorNombre] = useState<string>('');

  // Auto-expandir items con BOM cuando se carga la cotización
  useEffect(() => {
    if (cotizacion?.cotizacion_items) {
      const expanded: { [key: number]: boolean } = {};
      cotizacion.cotizacion_items.forEach((item: CotizacionItem) => {
        if (item.bom_items && item.bom_items.length > 0) {
          expanded[item.id] = true;
        }
      });
      setExpandedItems(expanded);
    }
  }, [cotizacion]);
  const [creatingPedido, setCreatingPedido] = useState(false);

  // Notification state
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    message: ''
  });

  const showNotification = (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    setNotification({ isOpen: true, type, message });
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, isOpen: false }));
  };

  useEffect(() => {
    if (cotizacionId) {
      cargarCotizacionDetallada(cotizacionId);
    }
  }, [cotizacionId]);

  const toggleExpandItem = (itemId: number) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const cargarCotizacionDetallada = async (cotizacionId: number) => {
    try {
      setLoading(true);
      setError(null);

      // 1. Cargar cotización con cliente en el mismo query (evita RLS por separado)
      const { data: cotizacionData, error: cotizacionError } = await supabase
        .from('cotizaciones')
        .select(`
          *,
          clientes (
            id,
            nombre_razon_social,
            identificacion,
            correo_principal,
            telefono_numero,
            telefono_pais,
            otras_senas,
            barrio,
            provincias (nombre),
            cantones (nombre),
            distritos (nombre)
          )
        `)
        .eq('id', cotizacionId)
        .maybeSingle();

      if (cotizacionError) throw cotizacionError;
      if (!cotizacionData) {
        setError('Cotización no encontrada. Es posible que no exista o no tengas permisos para verla.');
        setLoading(false);
        return;
      }

      console.log('[CotizacionDetallada] Cotización cargada:', cotizacionData);
      console.log('[CotizacionDetallada] Estado:', cotizacionData.estado);

      // 2. El cliente ya viene en el join, extraerlo directamente
      const clienteData = (cotizacionData as any).clientes || null;
      console.log('[CotizacionDetallada] Cliente cargado por join:', clienteData);

      // 2b. Cargar usuario creador
      let nombreCreador = '';
      if (cotizacionData.created_by) {
        const { data: usuarioCreador } = await supabase
          .from('usuarios')
          .select('nombre, email')
          .eq('id', cotizacionData.created_by)
          .maybeSingle();
        if (usuarioCreador) {
          nombreCreador = usuarioCreador.nombre || usuarioCreador.email || '';
        }
      }
      setCreadorNombre(nombreCreador);

      // 3. Cargar items de cotización
      const { data: itemsData, error: itemsError } = await supabase
        .from('cotizacion_items')
        .select('*')
        .eq('cotizacion_id', cotizacionId);

      if (itemsError) {
        console.error('[CotizacionDetallada] Error cargando items:', itemsError);
        throw itemsError;
      }

      console.log('[CotizacionDetallada] Items crudos de BD:', itemsData);
      console.log('[CotizacionDetallada] Cantidad de items:', itemsData?.length || 0);

      // 4. Cargar productos para cada item (solo si tienen producto_id)
      const itemsConProductos = await Promise.all(
        (itemsData || []).map(async (item, idx) => {
          let producto = null;
          let bomItems: BOMItem[] = [];

          console.log(`[CotizacionDetallada] Procesando item #${idx}:`, {
            id: item.id,
            producto_id: item.producto_id,
            descripcion: item.descripcion,
            cantidad: item.cantidad
          });

          // Solo cargar producto y BOM si el item tiene producto_id
          if (item.producto_id) {
            const { data: productoData } = await supabase
              .from('productos')
              .select('*')
              .eq('id_producto', item.producto_id)
              .maybeSingle();
            producto = productoData;

            // 5. Cargar BOM items para cada producto
            const { data: bomData } = await supabase
              .from('bom_items')
              .select('*')
              .eq('product_id', item.producto_id);
            
            bomItems = bomData || [];
          } else {
            console.log(`[CotizacionDetallada] Item #${idx} no tiene producto_id, se muestra como ítem libre`);
          }

          return {
            ...item,
            producto,
            bom_items: bomItems
          };
        })
      );

      console.log('[CotizacionDetallada] Items procesados:', itemsConProductos);

      // Separar el campo clientes del spread para evitar conflicto con cliente
      const { clientes: _clientes, ...cotizacionSinClientes } = cotizacionData as any;
      setCotizacion({
        ...cotizacionSinClientes,
        cliente: clienteData,
        cotizacion_items: itemsConProductos
      });

    } catch (error: any) {
      console.error('Error cargando cotización detallada:', error);
      setError(error.message || 'Error al cargar la cotización. Verifica que tengas permisos para ver esta cotización.');
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

  const formatearMoneda = (valor: number | string | null | undefined, moneda: string = 'CRC') => {
    const valorNumerico = Number(valor);
    if (isNaN(valorNumerico) || valor === null || valor === undefined) {
      return moneda === 'USD' ? '$0,00' : '₡0,00';
    }
    
    const simbolo = moneda === 'USD' ? '$' : '₡';
    return simbolo + valorNumerico.toLocaleString('es-CR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const calcularTotalBOM = (bomItems: BOMItem[], cantidadItem: number) => {
    return bomItems.reduce((total, bom) => {
      const cantidadTotal = cantidadItem * (bom.cantidad_x_unidad || 0);
      const precio = bom.precio_ajustado || bom.precio_unitario || bom.precio_unitario_base || 0;
      return total + (cantidadTotal * precio);
    }, 0);
  };

  const handleImprimir = () => {
    const printUrl = `${window.location.origin}/cotizaciones/${cotizacionId}/print`;
    window.open(printUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCrearPedido = async () => {
    if (!cotizacion || !esCotizacionAprobada(cotizacion.estado)) {
      showNotification('warning', 'Solo se pueden crear pedidos desde cotizaciones aprobadas');
      return;
    }

    try {
      setCreatingPedido(true);
      const pedido = await pedidoService.createPedidoFromCotizacion(cotizacion.id);
      showNotification('success', `Pedido ${pedido.codigo} creado exitosamente`);
      
      // Navegar a la página de pedidos después de un breve delay
      setTimeout(() => {
        window.REACT_APP_NAVIGATE('/pedidos');
      }, 1500);
    } catch (error) {
      console.error('Error al crear pedido:', error);
      showNotification('error', 'Error al crear pedido: ' + (error as Error).message);
    } finally {
      setCreatingPedido(false);
    }
  };

  const handleFacturarDirecto = () => {
    if (!cotizacion || !esCotizacionAprobada(cotizacion.estado)) {
      showNotification('warning', 'Solo se pueden facturar cotizaciones aprobadas');
      return;
    }

    // Navegar a facturación con datos de la cotización
    window.REACT_APP_NAVIGATE('/facturacion', { 
      state: { 
        fromCotizacion: true, 
        cotizacionId: cotizacion.id,
        clienteId: cotizacion.cliente_id,
        items: cotizacion.cotizacion_items 
      } 
    });
  };

  // Helper: verificar si la cotización está aprobada (acepta ambos: 'aceptada' y 'aprobada')
  const esCotizacionAprobada = (estado: string) => {
    return estado === 'aceptada' || estado === 'aprobada';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <i className="ri-error-warning-line text-red-400 text-xl"></i>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error al cargar la cotización</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={() => cotizacionId && cargarCotizacionDetallada(cotizacionId)}
                className="text-sm text-red-600 hover:text-red-800 font-medium cursor-pointer"
              >
                <i className="ri-refresh-line mr-1"></i>
                Reintentar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!cotizacion) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No se encontró la cotización</p>
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

  // Obtener datos del cliente de forma más robusta usando campos reales de la BD
  const nombreCliente = cotizacion.cliente?.nombre_razon_social || 'Cliente no especificado';
  const identificacionCliente = cotizacion.cliente?.identificacion || 'No especificada';
  const correoCliente = cotizacion.cliente?.correo_principal || 'No especificado';
  const telefonoCliente = cotizacion.cliente?.telefono_numero
    ? (cotizacion.cliente.telefono_pais ? `+${cotizacion.cliente.telefono_pais} ${cotizacion.cliente.telefono_numero}` : cotizacion.cliente.telefono_numero)
    : 'No especificado';

  // Construir dirección desde los campos reales (incluyendo provincia/cantón/distrito)
  const partesDireccion = [
    (cotizacion.cliente as any)?.distritos?.nombre,
    (cotizacion.cliente as any)?.cantones?.nombre,
    (cotizacion.cliente as any)?.provincias?.nombre,
    cotizacion.cliente?.barrio,
    cotizacion.cliente?.otras_senas
  ].filter(Boolean);
  const direccionCliente = partesDireccion.length > 0 ? partesDireccion.join(', ') : 'No especificada';

  const monedaCotizacion = cotizacion.moneda || 'CRC';

  // Determinar color del badge de estado
  const getEstadoBadgeClass = (estado: string) => {
    const e = estado.toLowerCase();
    if (e === 'aceptada' || e === 'aprobada') return 'bg-emerald-100 text-emerald-800';
    if (e === 'enviada') return 'bg-sky-100 text-sky-800';
    if (e === 'rechazada') return 'bg-red-100 text-red-800';
    if (e === 'vencida') return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white">
      {/* Notification Popup */}
      <NotificationPopup
        isOpen={notification.isOpen}
        type={notification.type}
        message={notification.message}
        onClose={hideNotification}
      />

      {/* Encabezado con Logo OLO */}
      <div className="flex justify-between items-start mb-8">
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Cliente */}
        <div className="bg-gray-50 p-6 rounded-lg">
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
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Datos de la Cotización</h3>
          <div className="space-y-2">
            <p><span className="font-medium">Fecha:</span> {formatearFecha(fechaCotizacion)}</p>
            <p><span className="font-medium">Vencimiento:</span> {formatearFecha(cotizacion.fecha_vencimiento)}</p>
            <p><span className="font-medium">Estado:</span> 
              <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getEstadoBadgeClass(cotizacion.estado)}`}>
                {cotizacion.estado}
              </span>
            </p>
            <p><span className="font-medium">Moneda:</span>
              <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                monedaCotizacion === 'USD' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {monedaCotizacion === 'USD' ? '$ Dólares (USD)' : '₡ Colones (CRC)'}
              </span>
            </p>
            {monedaCotizacion === 'USD' && cotizacion.tipo_cambio && (
              <p><span className="font-medium">Tipo de cambio:</span> ₡{cotizacion.tipo_cambio.toLocaleString('es-CR', { minimumFractionDigits: 2 })}</p>
            )}
            {creadorNombre && (
              <p><span className="font-medium">Creado por:</span> {creadorNombre}</p>
            )}
          </div>
        </div>
      </div>

      {/* Tabla de Productos */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Productos Cotizados</h3>
        
        {/* Mensaje cuando no hay items */}
        {cotizacion.cotizacion_items.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <i className="ri-error-warning-line text-amber-500 text-xl"></i>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-amber-800">Esta cotización no tiene productos</h4>
                <p className="text-sm text-amber-700 mt-1">
                  La cotización está en estado <strong>"{cotizacion.estado}"</strong> pero no se encontraron líneas de productos.
                  Esto puede deberse a un problema de permisos (RLS) o a que los items fueron eliminados.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => cotizacionId && cargarCotizacionDetallada(cotizacionId)}
                    className="text-sm px-3 py-1.5 bg-amber-100 text-amber-800 rounded hover:bg-amber-200 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <i className="ri-refresh-line"></i>
                    Reintentar carga
                  </button>
                  <button
                    onClick={() => navigate('/cotizaciones')}
                    className="text-sm px-3 py-1.5 text-amber-700 hover:text-amber-900 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <i className="ri-arrow-left-line"></i>
                    Volver a cotizaciones
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
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
                  {/* Fila principal del producto */}
                  <tr className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-3">
                      {item.producto?.codigo_producto || 'SERV'}
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span>{item.descripcion}</span>
                        {item.bom_items && item.bom_items.length > 0 && (
                          <button
                            type="button"
                            className="ml-2 text-sm text-teal-600 hover:text-teal-800 print:hidden transition-colors duration-200 flex items-center gap-1 cursor-pointer"
                            aria-expanded={!!expandedItems[item.id]}
                            title="Ver componentes"
                            onClick={() => toggleExpandItem(item.id)}
                          >
                            <i className={`ri-eye-line transition-transform duration-300 ${
                              expandedItems[item.id] ? 'rotate-180' : ''
                            }`}></i>
                            <span className="text-xs">
                              {expandedItems[item.id] ? 'Ocultar' : 'Ver'}
                            </span>
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-center">
                      {Number(item.cantidad).toLocaleString('es-CR', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-center">UN</td>
                    <td className="border border-gray-300 px-4 py-3 text-right">
                      {formatearMoneda(Number(item.precio_unitario), monedaCotizacion)}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-center">
                      {Number(item.descuento || 0).toFixed(1)}%
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-center">13%</td>
                    <td className="border border-gray-300 px-4 py-3 text-right font-semibold">
                      {formatearMoneda(Number(item.subtotal), monedaCotizacion)}
                    </td>
                  </tr>

                  {/* Subsegmento BOM - Ítems utilizados */}
                  {(expandedItems[item.id] || typeof window === 'undefined') && item.bom_items && item.bom_items.length > 0 && (
                    <tr className="print:table-row">
                      <td colSpan={8} className="p-0 border border-gray-300">
                        <div className="bom-block border-l-4 border-teal-200 bg-teal-50 px-6 py-4 ml-4 mr-2 my-2">
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
                                        {formatearMoneda(precioUnitario, monedaCotizacion)}
                                      </td>
                                      <td className="text-right py-2 px-3 border-b border-gray-100 font-medium">
                                        {formatearMoneda(totalComponente, monedaCotizacion)}
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
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totales */}
      <div className="flex justify-end mb-8">
        <div className="w-full max-w-md">
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="font-medium">Subtotal:</span>
                <span>{formatearMoneda(subtotalValor, monedaCotizacion)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Descuento:</span>
                <span>-{formatearMoneda(descuentoValor, monedaCotizacion)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Impuesto:</span>
                <span>{formatearMoneda(impuestoValor, monedaCotizacion)}</span>
              </div>
              {cotizacion.flete && Number(cotizacion.flete) > 0 && (
                <div className="flex justify-between">
                  <span className="font-medium">Flete:</span>
                  <span>{formatearMoneda(Number(cotizacion.flete), monedaCotizacion)}</span>
                </div>
              )}
              {cotizacion.otros_cargos && Number(cotizacion.otros_cargos) > 0 && (
                <div className="flex justify-between">
                  <span className="font-medium">Otros:</span>
                  <span>{formatearMoneda(Number(cotizacion.otros_cargos), monedaCotizacion)}</span>
                </div>
              )}
              <div className="border-t border-gray-300 pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>{formatearMoneda(Number(cotizacion.total), monedaCotizacion)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Observaciones */}
      {(cotizacion.notas || cotizacion.observaciones) && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Observaciones</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-700">{cotizacion.notas || cotizacion.observaciones}</p>
          </div>
        </div>
      )}

      {/* Pie de página */}
      <div className="border-t border-gray-300 pt-6 text-center text-sm text-gray-600">
        <p>Cotización generada el {formatearFecha(new Date().toISOString())}</p>
        <p className="mt-2">Overseas Logistics Operations - Sistema de Gestión de Cotizaciones</p>
      </div>

      {/* Botones de acción */}
      <div className="flex justify-between items-center mt-8 print:hidden">
        <button
          onClick={() => navigate('/cotizaciones')}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200 flex items-center gap-2 cursor-pointer"
        >
          <i className="ri-arrow-left-line"></i>
          Volver a Cotizaciones
        </button>
        
        <div className="flex items-center gap-3">
          {esCotizacionAprobada(cotizacion.estado) && (
            <>
              <button
                onClick={handleCrearPedido}
                disabled={creatingPedido}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <i className="ri-shopping-cart-line"></i>
                {creatingPedido ? 'Creando...' : 'Crear Pedido'}
              </button>
              <button
                onClick={handleFacturarDirecto}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <i className="ri-bill-line"></i>
                Facturar
              </button>
            </>
          )}
          <button
            onClick={handleImprimir}
            className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full hover:from-orange-600 hover:to-orange-700 transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer"
            title="Imprimir cotización"
          >
            <i className="ri-printer-line text-xl"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CotizacionDetallada;
