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

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'borrador': return 'ri-draft-line';
      case 'enviada': return 'ri-send-plane-line';
      case 'aceptada': return 'ri-check-double-line';
      case 'rechazada': return 'ri-close-circle-line';
      case 'vencida': return 'ri-time-line';
      default: return 'ri-file-line';
    }
  };

  const getEstadoBorderColor = (estado: string) => {
    switch (estado) {
      case 'borrador': return 'border-l-gray-300';
      case 'enviada': return 'border-l-sky-400';
      case 'aceptada': return 'border-l-emerald-400';
      case 'rechazada': return 'border-l-red-400';
      case 'vencida': return 'border-l-orange-400';
      default: return 'border-l-gray-300';
    }
  };

  const getVencimientoInfo = (fecha: string | null | undefined) => {
    if (!fecha) return null;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const venc = new Date(fecha);
    venc.setHours(0, 0, 0, 0);
    const diff = Math.ceil((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { label: `Venció hace ${Math.abs(diff)}d`, cls: 'text-red-600 bg-red-50', icon: 'ri-error-warning-line' };
    if (diff === 0) return { label: 'Vence hoy', cls: 'text-orange-600 bg-orange-50', icon: 'ri-alarm-warning-line' };
    if (diff <= 5) return { label: `Vence en ${diff}d`, cls: 'text-amber-600 bg-amber-50', icon: 'ri-timer-line' };
    return { label: formatFecha(fecha), cls: 'text-gray-500 bg-transparent', icon: '' };
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-lg border border-l-4 border-l-gray-200 p-4 animate-pulse">
            <div className="flex justify-between items-start">
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-3 bg-gray-100 rounded w-48"></div>
              </div>
              <div className="h-6 bg-gray-200 rounded-full w-20"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (cotizaciones.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-dashed border-gray-300">
        <div className="py-16 text-center">
          <div className="w-16 h-16 flex items-center justify-center bg-gray-50 rounded-full mx-auto mb-4">
            <i className="ri-file-list-3-line text-3xl text-gray-300"></i>
          </div>
          <h3 className="text-base font-medium text-gray-700 mb-1">No hay cotizaciones</h3>
          <p className="text-sm text-gray-400">No se encontraron cotizaciones con los filtros aplicados.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {cotizaciones.map((cotizacion) => {
          const vencInfo = getVencimientoInfo(cotizacion.fecha_vencimiento);
          const esOptimizador = cotizacion.metadata?.tipo === 'optimizador';
          return (
            <div
              key={cotizacion.id}
              className={`bg-white rounded-lg border border-l-4 ${getEstadoBorderColor(cotizacion.estado)} hover:border-gray-300 transition-all duration-150 group`}
            >
              <div className="px-4 py-3 flex items-center gap-4">

                {/* Estado icon */}
                <div className={`w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0 ${
                  cotizacion.estado === 'aceptada' ? 'bg-emerald-50 text-emerald-600' :
                  cotizacion.estado === 'rechazada' ? 'bg-red-50 text-red-500' :
                  cotizacion.estado === 'enviada' ? 'bg-sky-50 text-sky-600' :
                  cotizacion.estado === 'vencida' ? 'bg-orange-50 text-orange-500' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  <i className={`${getEstadoIcon(cotizacion.estado)} text-sm`}></i>
                </div>

                {/* Código + cliente */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900 font-mono tracking-wide">
                      {cotizacion.codigo}
                    </span>
                    {esOptimizador && (
                      <span className="text-xs px-1.5 py-0.5 bg-teal-50 text-teal-600 rounded font-medium">
                        <i className="ri-scissors-cut-line mr-1"></i>Optimizador
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      cotizacion.moneda === 'USD' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      {cotizacion.moneda === 'USD' ? '$ USD' : '₡ CRC'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    <i className="ri-user-3-line mr-1"></i>
                    {cotizacion.clientes?.nombre_razon_social || 'Sin cliente'}
                    {cotizacion.clientes?.identificacion && (
                      <span className="text-gray-400 ml-1">· {cotizacion.clientes.identificacion}</span>
                    )}
                  </p>
                </div>

                {/* Fechas */}
                <div className="hidden md:flex flex-col items-end gap-1 min-w-[120px]">
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <i className="ri-calendar-line"></i>
                    <span>{formatFecha(cotizacion.fecha_emision)}</span>
                  </div>
                  {vencInfo && (
                    <div className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${vencInfo.cls}`}>
                      {vencInfo.icon && <i className={vencInfo.icon}></i>}
                      <span>{vencInfo.label}</span>
                    </div>
                  )}
                </div>

                {/* Estado badge */}
                <div className="hidden sm:block">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${getEstadoColor(cotizacion.estado)}`}>
                    {getEstadoTexto(cotizacion.estado)}
                  </span>
                </div>

                {/* Total */}
                <div className="text-right min-w-[110px]">
                  <div className="text-sm font-bold text-gray-900">
                    {formatCurrency(cotizacion.total, cotizacion.moneda)}
                  </div>
                  <div className="text-xs text-gray-400">Total</div>
                </div>

                {/* Acciones rápidas + menú */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => { onEditar(cotizacion); }}
                    title="Editar"
                    className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
                  >
                    <i className="ri-edit-line text-sm"></i>
                  </button>
                  <button
                    onClick={() => verCotizacionDetallada(cotizacion.id!)}
                    title="Ver detallada"
                    className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
                  >
                    <i className="ri-eye-line text-sm"></i>
                  </button>
                  <button
                    onClick={() => generarPDF(cotizacion)}
                    title="Imprimir"
                    className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
                  >
                    <i className="ri-printer-line text-sm"></i>
                  </button>
                </div>

                {/* Menú desplegable */}
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => toggleMenu(cotizacion.id!)}
                    className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
                  >
                    <i className="ri-more-2-fill text-sm"></i>
                  </button>

                  {menuAbierto === cotizacion.id && (
                    <div className="absolute right-0 mt-1 w-52 bg-white rounded-lg border border-gray-200 z-20 overflow-hidden">
                      <div className="py-1">
                        {esOptimizador && (
                          <button
                            onClick={() => { navigate(`/cotizaciones/optimizador/${cotizacion.id}`); setMenuAbierto(null); }}
                            className="flex items-center w-full text-left px-3 py-2 text-sm text-teal-700 hover:bg-teal-50 cursor-pointer font-medium"
                          >
                            <i className="ri-scissors-cut-line mr-2.5 w-4"></i>
                            Ver Optimizador
                          </button>
                        )}
                        <button
                          onClick={() => { onEditar(cotizacion); setMenuAbierto(null); }}
                          className="flex items-center w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                        >
                          <i className="ri-edit-line mr-2.5 w-4"></i>Editar
                        </button>
                        <button
                          onClick={() => { generarPDF(cotizacion); setMenuAbierto(null); }}
                          className="flex items-center w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                        >
                          <i className="ri-printer-line mr-2.5 w-4"></i>Imprimir
                        </button>
                        <button
                          onClick={() => abrirModalEnvio(cotizacion)}
                          className="flex items-center w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                        >
                          <i className="ri-mail-send-line mr-2.5 w-4"></i>Enviar por correo
                        </button>
                        <button
                          onClick={() => verCotizacionDetallada(cotizacion.id!)}
                          className="flex items-center w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                        >
                          <i className="ri-file-text-line mr-2.5 w-4"></i>Ver Detallada
                        </button>
                        <button
                          onClick={() => descargarPDFDetallado(cotizacion)}
                          className="flex items-center w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                        >
                          <i className="ri-download-line mr-2.5 w-4"></i>Descargar PDF
                        </button>
                        <button
                          onClick={() => { onDuplicar(cotizacion.id!); setMenuAbierto(null); }}
                          className="flex items-center w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                        >
                          <i className="ri-file-copy-line mr-2.5 w-4"></i>Duplicar
                        </button>

                        {cotizacion.estado === 'borrador' && (
                          <button
                            onClick={() => { onCambiarEstado(cotizacion.id!, 'enviada'); setMenuAbierto(null); }}
                            className="flex items-center w-full text-left px-3 py-2 text-sm text-sky-700 hover:bg-sky-50 cursor-pointer"
                          >
                            <i className="ri-send-plane-line mr-2.5 w-4"></i>Marcar como Enviada
                          </button>
                        )}
                        {cotizacion.estado === 'enviada' && (
                          <>
                            <button
                              onClick={() => { onCambiarEstado(cotizacion.id!, 'aceptada'); setMenuAbierto(null); }}
                              className="flex items-center w-full text-left px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                            >
                              <i className="ri-check-double-line mr-2.5 w-4"></i>Marcar Aceptada
                            </button>
                            <button
                              onClick={() => { onCambiarEstado(cotizacion.id!, 'rechazada'); setMenuAbierto(null); }}
                              className="flex items-center w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
                            >
                              <i className="ri-close-circle-line mr-2.5 w-4"></i>Marcar Rechazada
                            </button>
                          </>
                        )}

                        <div className="border-t border-gray-100 my-1"></div>
                        <button
                          onClick={() => { onEliminar(cotizacion.id!); setMenuAbierto(null); }}
                          className="flex items-center w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
                        >
                          <i className="ri-delete-bin-line mr-2.5 w-4"></i>Eliminar
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          );
        })}
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
