import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cotizacion } from '../../../types/cotizacion';
import { formatCurrency } from '../../../lib/currency';
import { supabase } from '../../../lib/supabase';
import { Link } from 'react-router-dom';
import { showAlert } from '../../../utils/dialog';

interface CotizacionesTableProps {
  cotizaciones: Cotizacion[];
  loading: boolean;
  onEditar: (cotizacion: Cotizacion) => void;
  onEliminar: (id: number) => void;
  onDuplicar: (id: number) => void;
  onCambiarEstado: (id: number, estado: string) => void;
  onDescargarPDF: (cotizacion: Cotizacion) => void;
}

export function CotizacionesTable({
  cotizaciones,
  loading,
  onEditar,
  onEliminar,
  onDuplicar,
  onCambiarEstado,
  onDescargarPDF
}: CotizacionesTableProps) {
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState<number | null>(null);
  const [modalEnvio, setModalEnvio] = useState<{ abierto: boolean; cotizacion: any }>({
    abierto: false,
    cotizacion: null
  });
  const [datosEnvio, setDatosEnvio] = useState({
    destinatario: '',
    asunto: '',
    mensaje: ''
  });
  const [enviandoCorreo, setEnviandoCorreo] = useState(false);

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'borrador':
        return 'bg-gray-100 text-gray-800';
      case 'enviada':
        return 'bg-blue-100 text-blue-800';
      case 'aceptada':
        return 'bg-green-100 text-green-800';
      case 'rechazada':
        return 'bg-red-100 text-red-800';
      case 'vencida':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEstadoTexto = (estado: string) => {
    switch (estado) {
      case 'borrador':
        return 'Borrador';
      case 'enviada':
        return 'Enviada';
      case 'aceptada':
        return 'Aceptada';
      case 'rechazada':
        return 'Rechazada';
      case 'vencida':
        return 'Vencida';
      default:
        return estado;
    }
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-CR');
  };

  const toggleMenu = (id: number) => {
    setMenuAbierto(menuAbierto === id ? null : id);
  };

  const generarPDF = async (cotizacion: any) => {
    try {
      console.log('Generando PDF para cotización:', cotizacion.id);
      
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
            otras_senas,
            barrio
          )
        `)
        .eq('id', cotizacion.id)
        .single();

      if (cotizacionError) {
        console.error('Error obteniendo cotización:', cotizacionError);
        showAlert('Error al obtener los datos de la cotización', { type: 'error' });
        return;
      }

      console.log('Cotización obtenida para PDF:', cotizacionData);

      const { data: itemsData, error: itemsError } = await supabase
        .from('cotizacion_items')
        .select('*')
        .eq('cotizacion_id', cotizacion.id);

      if (itemsError) {
        console.error('Error obteniendo items:', itemsError);
        showAlert('Error al obtener los items de la cotización', { type: 'error' });
        return;
      }

      const productIds = itemsData?.map(item => item.producto_id).filter(Boolean) || [];
      let productosData = [];
      
      if (productIds.length > 0) {
        const { data: productos, error: productosError } = await supabase
          .from('productos')
          .select('id_producto, codigo_producto, descripcion_producto, costo_total_bom')
          .in('id_producto', productIds);

        if (!productosError) {
          productosData = productos || [];
        }
      }

      const itemsConProductos = itemsData?.map(item => {
        const producto = productosData.find(p => p.id_producto === item.producto_id);
        return {
          ...item,
          productos: producto || null
        };
      }) || [];

      const cotizacionCompleta = {
        ...cotizacionData,
        cotizacion_items: itemsConProductos
      };

      const htmlContent = generarHTMLPDF(cotizacionCompleta);
      
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `cotizacion-${cotizacionCompleta.codigo}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error generando PDF:', error);
      showAlert('Error al generar el PDF', { type: 'error' });
    }
  };

  const generarHTMLParaImpresion = (cotizacion: any) => {
    const cliente = cotizacion.clientes || {};
    const items = cotizacion.cotizacion_items || [];
    
    const direccion = [
      cliente.otras_senas,
      cliente.barrio
    ].filter(Boolean).join(', ') || 'No especificada';

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cotización ${cotizacion.codigo}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; color: #333; }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
        .company-name { font-size: 24px; font-weight: bold; color: #2563eb; margin-bottom: 5px; }
        .document-title { font-size: 18px; color: #666; }
        .info-section { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .info-box { width: 48%; }
        .info-title { font-weight: bold; color: #2563eb; margin-bottom: 10px; font-size: 14px; }
        .info-content { background: #f8fafc; padding: 15px; border-radius: 5px; }
        .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .table th, .table td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
        .table th { background: #2563eb; color: white; font-weight: bold; }
        .table tr:nth-child(even) { background: #f8fafc; }
        .totals { margin-top: 20px; }
        .totals-table { width: 300px; margin-left: auto; }
        .total-row { font-weight: bold; background: #2563eb !important; color: white; }
        .footer { margin-top: 40px; text-align: center; color: #666; font-size: 10px; }
        
        @media print {
            body { font-size: 11px; }
            .container { padding: 10px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="company-name">Mi Empresa</div>
            <div class="document-title">COTIZACIÓN</div>
        </div>

        <div class="info-section">
            <div class="info-box">
                <div class="info-title">INFORMACIÓN DEL CLIENTE</div>
                <div class="info-content">
                    <strong>Cliente:</strong> ${cliente.nombre_razon_social || 'No especificado'}<br>
                    <strong>Identificación:</strong> ${cliente.identificacion || 'No especificada'}<br>
                    <strong>Correo:</strong> ${cliente.correo_principal || 'No especificado'}<br>
                    <strong>Teléfono:</strong> ${cliente.telefono_numero || 'No especificado'}<br>
                    <strong>Dirección:</strong> ${direccion}
                </div>
            </div>
            <div class="info-box">
                <div class="info-title">INFORMACIÓN DE LA COTIZACIÓN</div>
                <div class="info-content">
                    <strong>Código:</strong> ${cotizacion.codigo}<br>
                    <strong>Fecha Emisión:</strong> ${new Date(cotizacion.fecha_emision).toLocaleDateString('es-ES')}<br>
                    <strong>Fecha Vencimiento:</strong> ${new Date(cotizacion.fecha_vencimiento).toLocaleDateString('es-ES')}<br>
                    <strong>Estado:</strong> ${cotizacion.estado.toUpperCase()}<br>
                    <strong>Moneda:</strong> ${cotizacion.moneda}
                </div>
            </div>
        </div>

        <table class="table">
            <thead>
                <tr>
                    <th>Código</th>
                    <th>Descripción</th>
                    <th>Cantidad</th>
                    <th>Precio Unit.</th>
                    <th>Descuento</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(item => `
                    <tr>
                        <td>${item.productos?.codigo_producto || item.codigo_producto || 'N/A'}</td>
                        <td>${item.productos?.descripcion_producto || item.descripcion_producto || 'Producto sin descripción'}</td>
                        <td>${item.cantidad || 0}</td>
                        <td>${formatCurrency(item.precio_unitario || 0, cotizacion.moneda)}</td>
                        <td>${item.descuento_porcentaje || 0}%</td>
                        <td>${formatCurrency(item.total_linea || 0, cotizacion.moneda)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="totals">
            <table class="table totals-table">
                <tr>
                    <td><strong>Subtotal:</strong></td>
                    <td>${formatCurrency(cotizacion.subtotal || 0, cotizacion.moneda)}</td>
                </tr>
                <tr>
                    <td><strong>Descuento:</strong></td>
                    <td>${formatCurrency(cotizacion.descuento_valor || 0, cotizacion.moneda)}</td>
                </tr>
                <tr>
                    <td><strong>Flete:</strong></td>
                    <td>${formatCurrency(cotizacion.flete || 0, cotizacion.moneda)}</td>
                </tr>
                <tr>
                    <td><strong>Impuestos:</strong></td>
                    <td>${formatCurrency(cotizacion.impuestos || 0, cotizacion.moneda)}</td>
                </tr>
                <tr>
                    <td><strong>Otros:</strong></td>
                    <td>${formatCurrency(cotizacion.otros || 0, cotizacion.moneda)}</td>
                </tr>
                <tr class="total-row">
                    <td><strong>TOTAL:</strong></td>
                    <td><strong>${formatCurrency(cotizacion.total || 0, cotizacion.moneda)}</strong></td>
                </tr>
            </table>
        </div>

        <div class="footer">
            <p>Cotización generada el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}</p>
            <p>Este documento es una cotización y no constituye una factura</p>
        </div>
    </div>
</body>
</html>`;
  };

  const generarHTMLPDF = (cotizacion: any) => {
    const cliente = cotizacion.clientes || {};
    const items = cotizacion.cotizacion_items || [];

    const direccion = [
      cliente.otras_senas,
      cliente.barrio
    ].filter(Boolean).join(', ') || 'No especificada';

    // Función para formatear números correctamente
    const formatearMoneda = (valor: any) => {
      const numero = parseFloat(valor) || 0;
      return numero.toLocaleString('es-CR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    };

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cotización ${cotizacion.codigo}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; color: #333; }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #5AAB8E; padding-bottom: 20px; }
        .company-logo { width: 120px; height: auto; margin-bottom: 10px; }
        .company-name { font-size: 24px; font-weight: bold; color: #5AAB8E; margin-bottom: 5px; }
        .document-title { font-size: 18px; color: #666; }
        .info-section { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .info-box { width: 48%; }
        .info-title { font-weight: bold; color: #5AAB8E; margin-bottom: 10px; font-size: 14px; }
        .info-content { background: #f8fafc; padding: 15px; border-radius: 5px; }
        .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .table th, .table td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
        .table th { background: #5AAB8E; color: white; font-weight: bold; }
        .table tr:nth-child(even) { background: #f8fafc; }
        .totals { margin-top: 20px; }
        .totals-table { width: 300px; margin-left: auto; }
        .total-row { font-weight: bold; background: #5AAB8E !important; color: white; }
        .footer { margin-top: 40px; text-align: center; color: #666; font-size: 10px; }
        
        @media print {
            body { font-size: 11px; }
            .container { padding: 10px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRYi7j4OFVRmD2T0m6NyFHqYa96zun92AUTIA&s" alt="SCO Logo" class="company-logo">
            <div class="company-name">SCO</div>
            <div class="document-title">COTIZACIÓN</div>
        </div>

        <div class="info-section">
            <div class="info-box">
                <div class="info-title">INFORMACIÓN DEL CLIENTE</div>
                <div class="info-content">
                    <strong>Cliente:</strong> ${cliente.nombre_razon_social || 'No especificado'}<br>
                    <strong>Identificación:</strong> ${cliente.identificacion || 'No especificada'}<br>
                    <strong>Correo:</strong> ${cliente.correo_principal || 'No especificado'}<br>
                    <strong>Teléfono:</strong> ${cliente.telefono_numero || 'No especificado'}<br>
                    <strong>Dirección:</strong> ${direccion}
                </div>
            </div>
            <div class="info-box">
                <div class="info-title">INFORMACIÓN DE LA COTIZACIÓN</div>
                <div class="info-content">
                    <strong>Código:</strong> ${cotizacion.codigo}<br>
                    <strong>Fecha Emisión:</strong> ${new Date(cotizacion.fecha_emision).toLocaleDateString('es-ES')}<br>
                    <strong>Fecha Vencimiento:</strong> ${new Date(cotizacion.fecha_vencimiento).toLocaleDateString('es-ES')}<br>
                    <strong>Estado:</strong> ${cotizacion.estado.toUpperCase()}<br>
                    <strong>Moneda:</strong> ${cotizacion.moneda}
                </div>
            </div>
        </div>

        <table class="table">
            <thead>
                <tr>
                    <th>Código</th>
                    <th>Descripción</th>
                    <th>Cantidad</th>
                    <th>Precio Unit.</th>
                    <th>Descuento</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(item => `
                    <tr>
                        <td>${item.productos?.codigo_producto || item.codigo_producto || 'N/A'}</td>
                        <td>${item.productos?.descripcion_producto || item.descripcion_producto || 'Producto sin descripción'}</td>
                        <td>${item.cantidad || 0}</td>
                        <td>₡${formatearMoneda(item.precio_unitario || 0)}</td>
                        <td>${item.descuento_porcentaje || item.descuento || 0}%</td>
                        <td>₡${formatearMoneda(item.total_linea || item.subtotal || 0)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="totals">
            <table class="table totals-table">
                <tr>
                    <td><strong>Subtotal:</strong></td>
                    <td>₡${formatearMoneda(cotizacion.subtotal || 0)}</td>
                </tr>
                <tr>
                    <td><strong>Descuento:</strong></td>
                    <td>₡${formatearMoneda(cotizacion.descuento_valor || 0)}</td>
                </tr>
                <tr>
                    <td><strong>Flete:</strong></td>
                    <td>₡${formatearMoneda(cotizacion.flete || 0)}</td>
                </tr>
                <tr>
                    <td><strong>Impuestos:</strong></td>
                    <td>₡${formatearMoneda(cotizacion.impuestos || 0)}</td>
                </tr>
                <tr>
                    <td><strong>Otros:</strong></td>
                    <td>₡${formatearMoneda(cotizacion.otros || 0)}</td>
                </tr>
                <tr class="total-row">
                    <td><strong>TOTAL:</strong></td>
                    <td><strong>₡${formatearMoneda(cotizacion.total || 0)}</strong></td>
                </tr>
            </table>
        </div>

        <div class="footer">
            <p>Cotización generada el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}</p>
            <p>Este documento es una cotización y no constituye una factura</p>
        </div>
    </div>
</body>
</html>`;
  };

  const abrirModalEnvio = (cotizacion: any) => {
    const correoCliente = cotizacion.clientes?.correo_principal || '';
    const asuntoDefault = `Cotización ${cotizacion.codigo} - ${cotizacion.clientes?.nombre_razon_social || 'Cliente'}`;
    const mensajeDefault = `Estimado/a cliente,

Adjunto encontrará la cotización ${cotizacion.codigo} con los detalles de los productos y servicios solicitados.

Esta cotización tiene una validez hasta el ${cotizacion.fecha_vencimiento ? new Date(cotizacion.fecha_vencimiento).toLocaleDateString('es-ES') : 'fecha indicada'}.

Si tiene alguna consulta o requiere modificaciones, no dude en contactarnos.

Quedamos atentos a su respuesta.

Saludos cordiales,
Equipo de Ventas`;

    setDatosEnvio({
      destinatario: correoCliente,
      asunto: asuntoDefault,
      mensaje: mensajeDefault
    });
    
    setModalEnvio({ abierto: true, cotizacion });
    setMenuAbierto(null);
  };

  const cerrarModalEnvio = () => {
    setModalEnvio({ abierto: false, cotizacion: null });
    setDatosEnvio({ destinatario: '', asunto: '', mensaje: '' });
  };

  const enviarCotizacionPorCorreo = async () => {
    if (!datosEnvio.destinatario.trim()) {
      showAlert('Por favor ingrese un correo electrónico de destino', { type: 'warning' });
      return;
    }

    if (!datosEnvio.asunto.trim()) {
      showAlert('Por favor ingrese un asunto para el correo', { type: 'warning' });
      return;
    }

    try {
      setEnviandoCorreo(true);

      const htmlCotizacion = await generarHTMLParaEnvio(modalEnvio.cotizacion);

      const mailtoLink = `mailto:${datosEnvio.destinatario}?subject=${encodeURIComponent(datosEnvio.asunto)}&body=${encodeURIComponent(datosEnvio.mensaje + '\n\nNota: La cotización detallada se encuentra adjunta en formato PDF.')}`;
      
      window.open(mailtoLink);
      
      const blob = new Blob([htmlCotizacion], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `cotizacion-${modalEnvio.cotizacion.codigo}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showAlert('Se ha abierto su cliente de correo y descargado la cotización. Por favor adjunte el archivo descargado al correo.', { type: 'info' });
      cerrarModalEnvio();
    } catch (error) {
      console.error('Error enviando cotización:', error);
      showAlert('Error al preparar el envío de la cotización', { type: 'error' });
    } finally {
      setEnviandoCorreo(false);
    }
  };

  const generarHTMLParaEnvio = async (cotizacion: any) => {
    try {
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
            otras_senas,
            barrio
          )
        `)
        .eq('id', cotizacion.id)
        .single();

      if (cotizacionError) {
        throw new Error('Error obteniendo datos de la cotización');
      }

      const { data: itemsData, error: itemsError } = await supabase
        .from('cotizacion_items')
        .select('*')
        .eq('cotizacion_id', cotizacion.id);

      if (itemsError) {
        throw new Error('Error obteniendo items de la cotización');
      }

      const productIds = itemsData?.map(item => item.producto_id).filter(Boolean) || [];
      let productosData = [];
      
      if (productIds.length > 0) {
        const { data: productos, error: productosError } = await supabase
          .from('productos')
          .select('id_producto, codigo_producto, descripcion_producto, costo_total_bom')
          .in('id_producto', productIds);

        if (!productosError) {
          productosData = productos || [];
        }
      }

      const itemsConProductos = itemsData?.map(item => {
        const producto = productosData.find(p => p.id_producto === item.producto_id);
        return {
          ...item,
          productos: producto || null
        };
      }) || [];

      const cotizacionCompleta = {
        ...cotizacionData,
        cotizacion_items: itemsConProductos
      };

      return generarHTMLPDF(cotizacionCompleta);
    } catch (error) {
      console.error('Error generando HTML para envío:', error);
      throw error;
    }
  };

  const verCotizacionDetallada = (cotizacionId: number) => {
    navigate(`/cotizaciones/${cotizacionId}/detallada`);
    setMenuAbierto(null);
  };

  const descargarPDFDetallado = async (cotizacion: any) => {
    try {
      // Generar PDF usando la misma lógica pero optimizada para descarga
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
            otras_senas,
            barrio
          )
        `)
        .eq('id', cotizacion.id)
        .single();

      if (cotizacionError) {
        console.error('Error obteniendo cotización:', cotizacionError);
        showAlert('Error al obtener los datos de la cotización', { type: 'error' });
        return;
      }

      const { data: itemsData, error: itemsError } = await supabase
        .from('cotizacion_items')
        .select('*')
        .eq('cotizacion_id', cotizacion.id);

      if (itemsError) {
        console.error('Error obteniendo items:', itemsError);
        showAlert('Error al obtener los items de la cotización', { type: 'error' });
        return;
      }

      const productIds = itemsData?.map(item => item.producto_id).filter(Boolean) || [];
      let productosData = [];
      
      if (productIds.length > 0) {
        const { data: productos, error: productosError } = await supabase
          .from('productos')
          .select('id_producto, codigo_producto, descripcion_producto, costo_total_bom')
          .in('id_producto', productIds);

        if (!productosError) {
          productosData = productos || [];
        }
      }

      const itemsConProductos = itemsData?.map(item => {
        const producto = productosData.find(p => p.id_producto === item.producto_id);
        return {
          ...item,
          productos: producto || null
        };
      }) || [];

      const cotizacionCompleta = {
        ...cotizacionData,
        cotizacion_items: itemsConProductos
      };

      const htmlContent = generarHTMLPDF(cotizacionCompleta);
      
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `COT-${cotizacionCompleta.codigo}-detallada.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      setMenuAbierto(null);
      
    } catch (error) {
      console.error('Error generando PDF:', error);
      showAlert('Error al generar el PDF', { type: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando cotizaciones...</p>
        </div>
      </div>
    );
  }

  if (cotizaciones.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-8 text-center">
          <i className="ri-file-list-3-line text-4xl text-gray-400 mb-4"></i>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay cotizaciones</h3>
          <p className="text-gray-600">No se encontraron cotizaciones con los filtros aplicados.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha Emisión
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vencimiento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Moneda
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {cotizaciones.map((cotizacion) => (
                <tr key={cotizacion.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {cotizacion.codigo}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {cotizacion.clientes?.nombre_razon_social || 'Sin cliente'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {cotizacion.clientes?.identificacion || ''}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEstadoColor(cotizacion.estado)}`}>
                      {getEstadoTexto(cotizacion.estado)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatFecha(cotizacion.fecha_emision)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {cotizacion.fecha_vencimiento ? formatFecha(cotizacion.fecha_vencimiento) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(cotizacion.total, cotizacion.moneda)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {cotizacion.moneda}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="relative">
                      <button
                        onClick={() => toggleMenu(cotizacion.id!)}
                        className="text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        <i className="ri-more-2-fill"></i>
                      </button>
                      
                      {menuAbierto === cotizacion.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
                          <div className="py-1">
                            {/* Opción especial para cotizaciones del optimizador */}
                            {cotizacion.metadata?.tipo === 'optimizador' && (
                              <button
                                onClick={() => {
                                  console.log('[COTIZACIONES] Navegando a cotización optimizador:', cotizacion.id);
                                  navigate(`/cotizaciones/optimizador/${cotizacion.id}`);
                                  setMenuAbierto(null);
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-teal-700 hover:bg-teal-50 cursor-pointer font-medium"
                              >
                                <i className="ri-scissors-cut-line mr-2"></i>
                                Ver Optimizador
                              </button>
                            )}
                            
                            <button
                              onClick={() => {
                                onEditar(cotizacion);
                                setMenuAbierto(null);
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                            >
                              <i className="ri-edit-line mr-2"></i>
                              Editar
                            </button>
                            
                            <button
                              onClick={() => {
                                generarPDF(cotizacion);
                                setMenuAbierto(null);
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                            >
                              <i className="ri-printer-line mr-2"></i>
                              Imprimir
                            </button>

                            <button
                              onClick={() => abrirModalEnvio(cotizacion)}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                            >
                              <i className="ri-mail-send-line mr-2"></i>
                              Enviar
                            </button>
                            
                            <button
                              onClick={() => verCotizacionDetallada(cotizacion.id!)}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                            >
                              <i className="ri-file-text-line mr-2"></i>
                              Ver Detallada
                            </button>

                            <button
                              onClick={() => descargarPDFDetallado(cotizacion)}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                            >
                              <i className="ri-download-line mr-2"></i>
                              Descargar PDF
                            </button>
                            
                            <button
                              onClick={() => {
                                onDuplicar(cotizacion.id!);
                                setMenuAbierto(null);
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                            >
                              <i className="ri-file-copy-line mr-2"></i>
                              Duplicar
                            </button>

                            {cotizacion.estado === 'borrador' && (
                              <button
                                onClick={() => {
                                  onCambiarEstado(cotizacion.id!, 'enviada');
                                  setMenuAbierto(null);
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                              >
                                <i className="ri-send-plane-line mr-2"></i>
                                Marcar como Enviada
                              </button>
                            )}

                            {cotizacion.estado === 'enviada' && (
                              <>
                                <button
                                  onClick={() => {
                                    onCambiarEstado(cotizacion.id!, 'aceptada');
                                    setMenuAbierto(null);
                                  }}
                                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                                >
                                  <i className="ri-check-line mr-2"></i>
                                  Marcar Aceptada
                                </button>
                                <button
                                  onClick={() => {
                                    onCambiarEstado(cotizacion.id!, 'rechazada');
                                    setMenuAbierto(null);
                                  }}
                                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                                >
                                  <i className="ri-close-line mr-2"></i>
                                  Marcar Rechazada
                                </button>
                              </>
                            )}

                            <div className="border-t border-gray-100"></div>
                            
                            <button
                              onClick={() => {
                                onEliminar(cotizacion.id!);
                                setMenuAbierto(null);
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 cursor-pointer"
                            >
                              <i className="ri-delete-bin-line mr-2"></i>
                              Eliminar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Envío por Correo */}
      {modalEnvio.abierto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                Enviar Cotización por Correo
              </h2>
              <button
                onClick={cerrarModalEnvio}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center">
                  <i className="ri-information-line text-blue-600 mr-2"></i>
                  <span className="text-sm text-blue-800">
                    Cotización: <strong>{modalEnvio.cotizacion?.codigo}</strong> - 
                    Cliente: <strong>{modalEnvio.cotizacion?.clientes?.nombre_razon_social}</strong>
                  </span>
                </div>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); enviarCotizacionPorCorreo(); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Correo de destino *
                  </label>
                  <input
                    type="email"
                    value={datosEnvio.destinatario}
                    onChange={(e) => setDatosEnvio(prev => ({ ...prev, destinatario: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="cliente@ejemplo.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Asunto *
                  </label>
                  <input
                    type="text"
                    value={datosEnvio.asunto}
                    onChange={(e) => setDatosEnvio(prev => ({ ...prev, asunto: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mensaje
                  </label>
                  <textarea
                    value={datosEnvio.mensaje}
                    onChange={(e) => setDatosEnvio(prev => ({ ...prev, mensaje: e.target.value }))}
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Escriba su mensaje aquí..."
                  />
                </div>

                <div className="flex justify-end space-x-4 pt-4 border-top border-gray-200">
                  <button
                    type="button"
                    onClick={cerrarModalEnvio}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-nowrap cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={enviandoCorreo}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 whitespace-nowrap cursor-pointer"
                  >
                    {enviandoCorreo ? (
                      <>
                        <i className="ri-loader-4-line animate-spin mr-2"></i>
                        Preparando...
                      </>
                    ) : (
                      <>
                        <i className="ri-mail-send-line mr-2"></i>
                        Enviar Cotización
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
