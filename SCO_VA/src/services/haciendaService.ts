import { supabase } from '../lib/supabase';
import type { 
  HaciendaSettings, 
  FacturaElectronica, 
  FacturaLinea, 
  HaciendaEnvio,
  TokenResponse,
  HaciendaResponse 
} from '../types/facturacion';

class HaciendaService {
  private baseUrlSandbox = 'https://api.comprobanteselectronicos.go.cr/recepcion-sandbox/v1';
  private baseUrlProduccion = 'https://api.comprobanteselectronicos.go.cr/recepcion/v1';
  private idpUrlSandbox = 'https://idp.comprobanteselectronicos.go.cr/auth/realms/rut-stag/protocol/openid-connect/token';
  private idpUrlProduccion = 'https://idp.comprobanteselectronicos.go.cr/auth/realms/rut/protocol/openid-connect/token';

  async getSettings(): Promise<HaciendaSettings | null> {
    try {
      const { data, error } = await supabase.from('settings').select('value').eq('key', 'hacienda_config').single();
      if (error) return null;
      if (!data?.value) return null;
      const config = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      return config as HaciendaSettings;
    } catch {
      return null;
    }
  }

  async saveSettings(settings: Partial<HaciendaSettings>): Promise<boolean> {
    try {
      const { error } = await supabase.from('settings').upsert({ key: 'hacienda_config', value: JSON.stringify(settings), updated_at: new Date().toISOString() });
      if (error) throw error;
      return true;
    } catch {
      return false;
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const settings = await this.getSettings();
      if (!settings) {
        return { success: false, message: 'No hay configuración de Hacienda' };
      }

      const token = await this.getAccessToken(settings);
      if (token) {
        return { success: true, message: 'Conexión exitosa con Hacienda' };
      } else {
        return { success: false, message: 'Error obteniendo token de acceso' };
      }
    } catch (error) {
      return { success: false, message: `Error: ${error}` };
    }
  }

  async getAccessToken(settings: HaciendaSettings): Promise<string | null> {
    try {
      const idpUrl = settings.ambiente === 'sandbox' ? this.idpUrlSandbox : this.idpUrlProduccion;
      const response = await fetch(idpUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'password', client_id: 'api-prod', username: settings.usuario_idp, password: settings.password_idp_encrypted, scope: 'openid' })
      });
      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
      const tokenData: TokenResponse = await response.json();
      return tokenData.access_token;
    } catch {
      return null;
    }
  }

  async getNextConsecutivo(tipoDocumento: string, sucursal: string = '001', terminal: string = '00001'): Promise<string> {
    try {
      // Obtener y actualizar consecutivo de forma atómica
      const { data, error } = await supabase.rpc('get_next_consecutivo', {
        p_tipo_documento: tipoDocumento,
        p_sucursal: sucursal,
        p_terminal: terminal
      });

      if (error) throw error;

      const consecutivo = data.toString().padStart(10, '0');
      return `${sucursal}${terminal}${tipoDocumento}${consecutivo}`;
    } catch (error) {
      throw error;
    }
  }

  generateClave(
    pais: string = '506',
    dia: string,
    mes: string,
    ano: string,
    cedula: string,
    consecutivo: string,
    situacion: string = '1',
    codigoSeguridad: string = '12345678'
  ): string {
    return `${pais}${dia}${mes}${ano}${cedula}${consecutivo}${situacion}${codigoSeguridad}`;
  }

  async generateXML(factura: FacturaElectronica, settings: HaciendaSettings): Promise<string> {
    const fecha = new Date(factura.fecha_emision);
    const fechaISO = fecha.toISOString();
    
    // Generar clave si no existe
    if (!factura.clave) {
      const dia = fecha.getDate().toString().padStart(2, '0');
      const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
      const ano = fecha.getFullYear().toString().slice(-2);
      
      factura.clave = this.generateClave(
        '506',
        dia,
        mes,
        ano,
        settings.cedula_emisor,
        factura.consecutivo,
        '1',
        Math.random().toString().slice(2, 10)
      );
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<FacturaElectronica xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.3/facturaElectronica" 
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                   xsi:schemaLocation="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.3/facturaElectronica https://www.hacienda.go.cr/ATV/ComprobanteElectronico/docs/esquemas/2016/v4.3/FacturaElectronica_V4.3.xsd">
  <Clave>${factura.clave}</Clave>
  <CodigoActividad>${settings.codigo_actividad_economica}</CodigoActividad>
  <NumeroConsecutivo>${factura.consecutivo}</NumeroConsecutivo>
  <FechaEmision>${fechaISO}</FechaEmision>
  <Emisor>
    <Nombre>OLO</Nombre>
    <Identificacion>
      <Tipo>02</Tipo>
      <Numero>${settings.cedula_emisor}</Numero>
    </Identificacion>
    <Ubicacion>
      <Provincia>1</Provincia>
      <Canton>01</Canton>
      <Distrito>01</Distrito>
      <OtrasSenas>San José, Costa Rica</OtrasSenas>
    </Ubicacion>
    <Telefono>
      <CodigoPais>506</CodigoPais>
      <NumTelefono>22052525</NumTelefono>
    </Telefono>
    <CorreoElectronico>info@olo.cr</CorreoElectronico>
  </Emisor>
  <Receptor>
    <Nombre>${factura.cliente?.razon_social || factura.cliente?.nombre_completo || 'Cliente'}</Nombre>
    <Identificacion>
      <Tipo>01</Tipo>
      <Numero>${factura.cliente?.identificacion || '000000000'}</Numero>
    </Identificacion>
    <Ubicacion>
      <Provincia>1</Provincia>
      <Canton>01</Canton>
      <Distrito>01</Distrito>
      <OtrasSenas>${factura.cliente?.direccion || 'San José, Costa Rica'}</OtrasSenas>
    </Ubicacion>
    <Telefono>
      <CodigoPais>506</CodigoPais>
      <NumTelefono>${factura.cliente?.telefono || '00000000'}</NumTelefono>
    </Telefono>
    <CorreoElectronico>${factura.cliente?.correo || 'cliente@ejemplo.com'}</CorreoElectronico>
  </Receptor>
  <CondicionVenta>${factura.condicion_venta}</CondicionVenta>
  ${factura.plazo_credito > 0 ? `<PlazoCredito>${factura.plazo_credito}</PlazoCredito>` : ''}
  <MedioPago>${factura.medio_pago}</MedioPago>
  <DetalleServicio>
    ${factura.lineas?.map((linea, index) => `
    <LineaDetalle>
      <NumeroLinea>${index + 1}</NumeroLinea>
      <Codigo>
        <Tipo>01</Tipo>
        <Codigo>${linea.codigo_articulo || 'SIN-CODIGO'}</Codigo>
      </Codigo>
      <Cantidad>${linea.cantidad}</Cantidad>
      <UnidadMedida>${linea.unidad_medida}</UnidadMedida>
      <Detalle>${linea.descripcion}</Detalle>
      <PrecioUnitario>${linea.precio_unitario}</PrecioUnitario>
      <MontoTotal>${linea.total_linea}</MontoTotal>
      ${linea.descuento_monto > 0 ? `
      <Descuento>
        <MontoDescuento>${linea.descuento_monto}</MontoDescuento>
        <NaturalezaDescuento>Descuento comercial</NaturalezaDescuento>
      </Descuento>` : ''}
      <SubTotal>${linea.subtotal_linea}</SubTotal>
      ${linea.impuesto_monto > 0 ? `
      <Impuesto>
        <Codigo>01</Codigo>
        <CodigoTarifa>08</CodigoTarifa>
        <Tarifa>${linea.impuesto_porcentaje}</Tarifa>
        <Monto>${linea.impuesto_monto}</Monto>
      </Impuesto>` : ''}
      <MontoTotalLinea>${linea.total_linea}</MontoTotalLinea>
    </LineaDetalle>`).join('')}
  </DetalleServicio>
  ${factura.referencia_clave ? `
  <InformacionReferencia>
    <TipoDoc>${factura.tipo_documento}</TipoDoc>
    <Numero>${factura.referencia_clave}</Numero>
    <FechaEmision>${fechaISO}</FechaEmision>
    <Codigo>${factura.referencia_codigo}</Codigo>
    <Razon>${factura.referencia_razon}</Razon>
  </InformacionReferencia>` : ''}
  <ResumenFactura>
    <CodigoTipoMoneda>
      <CodigoMoneda>${factura.moneda}</CodigoMoneda>
      <TipoCambio>${factura.tipo_cambio}</TipoCambio>
    </CodigoTipoMoneda>
    <TotalServGravados>${factura.subtotal}</TotalServGravados>
    <TotalServExentos>0.00</TotalServExentos>
    <TotalServExonerados>0.00</TotalServExonerados>
    <TotalMercanciasGravadas>0.00</TotalMercanciasGravadas>
    <TotalMercanciasExentas>0.00</TotalMercanciasExentas>
    <TotalMercanciasExoneradas>0.00</TotalMercanciasExoneradas>
    <TotalGravado>${factura.subtotal}</TotalGravado>
    <TotalExento>0.00</TotalExento>
    <TotalExonerado>0.00</TotalExonerado>
    <TotalVenta>${factura.subtotal}</TotalVenta>
    ${factura.descuento_total > 0 ? `
    <TotalDescuentos>${factura.descuento_total}</TotalDescuentos>` : ''}
    <TotalVentaNeta>${factura.subtotal - factura.descuento_total}</TotalVentaNeta>
    <TotalImpuesto>${factura.impuesto_total}</TotalImpuesto>
    <TotalIVADevuelto>0.00</TotalIVADevuelto>
    <TotalOtrosCargos>0.00</TotalOtrosCargos>
    <TotalComprobante>${factura.total}</TotalComprobante>
  </ResumenFactura>
</FacturaElectronica>`;

    return xml;
  }

  async signXML(xml: string, settings: HaciendaSettings): Promise<string> {
    // En un entorno real, aquí se implementaría la firma XAdES-EPES
    // Por ahora retornamos el XML en Base64 como placeholder
    try {
      // Simular proceso de firma
      const xmlSigned = xml; // En producción: aplicar firma XAdES-EPES con certificado .p12
      return btoa(unescape(encodeURIComponent(xmlSigned)));
    } catch (error) {
      throw error;
    }
  }

  async sendToHacienda(factura: FacturaElectronica, xmlFirmado: string): Promise<HaciendaEnvio> {
    try {
      const settings = await this.getSettings();
      if (!settings) throw new Error('No hay configuración de Hacienda');

      const token = await this.getAccessToken(settings);
      if (!token) throw new Error('No se pudo obtener token de acceso');

      const baseUrl = settings.ambiente === 'sandbox' ? this.baseUrlSandbox : this.baseUrlProduccion;
      
      const payload = {
        clave: factura.clave,
        fecha: factura.fecha_emision,
        emisor: {
          tipoIdentificacion: '02',
          numeroIdentificacion: settings.cedula_emisor
        },
        receptor: {
          tipoIdentificacion: '01',
          numeroIdentificacion: factura.cliente?.identificacion || '000000000'
        },
        comprobanteXml: xmlFirmado
      };

      const response = await fetch(`${baseUrl}/recepcion`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const envio: HaciendaEnvio = {
        factura_id: factura.id,
        tipo_envio: 'factura',
        request_payload: JSON.stringify(payload),
        response_payload: await response.text(),
        status_code: response.status,
        location_header: response.headers.get('Location') || undefined,
        estado: response.ok ? 'enviado' : 'error',
        intentos: 1,
        ultimo_intento: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      // Guardar envío en base de datos
      await supabase.from('hacienda_envios').insert(envio);

      return envio;
    } catch (error) {
      throw error;
    }
  }

  async consultarEstado(clave: string): Promise<HaciendaResponse | null> {
    try {
      const settings = await this.getSettings();
      if (!settings) return null;

      const token = await this.getAccessToken(settings);
      if (!token) return null;

      const baseUrl = settings.ambiente === 'sandbox' ? this.baseUrlSandbox : this.baseUrlProduccion;
      
      const response = await fetch(`${baseUrl}/recepcion/${clave}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        return await response.json();
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  async saveFactura(factura: Partial<FacturaElectronica>): Promise<FacturaElectronica | null> {
    try {
      const { data, error } = await supabase
        .from('facturas_electronicas')
        .insert(factura)
        .select('id,numero_consecutivo,clave_numerica,estado,total_general,notas') // USAR NOMBRES REALES
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      return null;
    }
  }

  async updateFactura(id: number, updates: Partial<FacturaElectronica>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('facturas_electronicas')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('id,consecutivo,clave,estado_hacienda'); // Solo campos necesarios

      return !error;
    } catch (error) {
      return false;
    }
  }

  async getFacturas(filters?: any): Promise<FacturaElectronica[]> {
    try {
      let query = supabase
        .from('facturas_electronicas')
        .select(`
          *,
          cliente:clientes(*),
          lineas:factura_items(*)
        `)
        .order('created_at', { ascending: false });

      if (filters?.fecha_desde) {
        query = query.gte('fecha_emision', filters.fecha_desde);
      }
      if (filters?.fecha_hasta) {
        query = query.lte('fecha_emision', filters.fecha_hasta);
      }
      if (filters?.estado_local) {
        query = query.eq('estado_local', filters.estado_local);
      }
      if (filters?.cliente_id) {
        query = query.eq('cliente_id', filters.cliente_id);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      return [];
    }
  }

  async getFacturaById(id: number): Promise<FacturaElectronica | null> {
    try {
      const { data, error } = await supabase
        .from('facturas_electronicas')
        .select(`
          *,
          cliente:clientes(*),
          lineas:factura_items(*),
          envios:hacienda_envios(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      return null;
    }
  }

  async saveFacturaLineas(facturaId: number, lineas: FacturaLinea[]): Promise<boolean> {
    try {
      // Eliminar líneas existentes
      await supabase
        .from('factura_items')
        .delete()
        .eq('factura_id', facturaId);

      // Insertar nuevas líneas
      const lineasConId = lineas.map(linea => ({
        ...linea,
        factura_id: facturaId
      }));

      const { error } = await supabase
        .from('factura_items')
        .insert(lineasConId);

      return !error;
    } catch (error) {
      return false;
    }
  }

  async auditLog(accion: string, tabla: string, registroId?: number, datosAnteriores?: any, datosNuevos?: any): Promise<void> {
    try {
      await supabase.from('hacienda_auditoria').insert({
        accion, tabla_afectada: tabla, registro_id: registroId,
        datos_anteriores: datosAnteriores, datos_nuevos: datosNuevos,
        created_at: new Date().toISOString()
      });
    } catch {
      // silently ignore
    }
  }
}

export const haciendaService = new HaciendaService();