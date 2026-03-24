/**
 * Motor de variables dinámicas para plantillas de correspondencia.
 * Las variables siguen el patrón: {{nombre_variable}}
 */

/** Extrae todos los nombres de variables únicos de un texto */
export function extraerVariables(texto: string): string[] {
  const matches = [...texto.matchAll(/\{\{(\w+)\}\}/g)];
  return [...new Set(matches.map((m) => m[1]))];
}

/** Reemplaza todas las ocurrencias de {{variable}} con los valores provistos */
export function reemplazarVariables(
  texto: string,
  datos: Record<string, string>
): string {
  return texto.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return Object.prototype.hasOwnProperty.call(datos, key) && datos[key] !== ''
      ? datos[key]
      : match;
  });
}

/** Aplica reemplazo tanto al asunto como al cuerpo HTML */
export function aplicarVariablesAPlantilla(
  asunto: string,
  cuerpoHtml: string,
  datos: Record<string, string>
): { asunto: string; cuerpo_html: string } {
  return {
    asunto: reemplazarVariables(asunto, datos),
    cuerpo_html: reemplazarVariables(cuerpoHtml, datos),
  };
}

export type TipoVariable = 'texto' | 'fecha' | 'estado' | 'link' | 'email' | 'numero' | 'multilinea';

/** Catálogo de variables por tipo de evento con etiquetas, tipos y ejemplos */
export interface VariableCatalogo {
  nombre: string;
  label: string;
  descripcion: string;
  grupo: string;
  tipo: TipoVariable;
  valorPrueba: string;
}

export const CATALOGO_VARIABLES: VariableCatalogo[] = [
  // ── General ────────────────────────────────────────────────
  {
    nombre: 'fecha_hoy',
    label: 'Fecha de hoy',
    descripcion: 'Fecha actual en formato dd/mm/yyyy',
    grupo: 'General',
    tipo: 'fecha',
    valorPrueba: new Date().toLocaleDateString('es-CR'),
  },
  {
    nombre: 'hora_actual',
    label: 'Hora actual',
    descripcion: 'Hora del sistema al momento del envío',
    grupo: 'General',
    tipo: 'texto',
    valorPrueba: new Date().toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' }),
  },
  {
    nombre: 'nombre_empresa',
    label: 'Nombre de la empresa',
    descripcion: 'Razón social o nombre comercial configurado',
    grupo: 'General',
    tipo: 'texto',
    valorPrueba: 'OLogistics S.A.',
  },
  {
    nombre: 'url_sistema',
    label: 'URL del sistema',
    descripcion: 'Enlace principal al CRM/SCO',
    grupo: 'General',
    tipo: 'link',
    valorPrueba: 'https://sco.ologistics.com',
  },

  // ── Cliente ────────────────────────────────────────────────
  {
    nombre: 'nombre_cliente',
    label: 'Nombre del cliente',
    descripcion: 'Nombre completo o razón social del cliente',
    grupo: 'Cliente',
    tipo: 'texto',
    valorPrueba: 'Carlos Rodríguez',
  },
  {
    nombre: 'email_cliente',
    label: 'Email del cliente',
    descripcion: 'Correo electrónico principal del cliente',
    grupo: 'Cliente',
    tipo: 'email',
    valorPrueba: 'carlos@empresa.com',
  },
  {
    nombre: 'telefono_cliente',
    label: 'Teléfono del cliente',
    descripcion: 'Número de contacto del cliente',
    grupo: 'Cliente',
    tipo: 'texto',
    valorPrueba: '+506 8888-1234',
  },

  // ── Tarea ──────────────────────────────────────────────────
  {
    nombre: 'numero_tarea',
    label: 'Número / Código de tarea',
    descripcion: 'Consecutivo único de la tarea (ej: VA0007)',
    grupo: 'Tarea',
    tipo: 'numero',
    valorPrueba: 'VA0007',
  },
  {
    nombre: 'estado_tarea',
    label: 'Estado de la tarea',
    descripcion: 'Estado actual: Pendiente, En Proceso, Finalizado, etc.',
    grupo: 'Tarea',
    tipo: 'estado',
    valorPrueba: 'Pendiente',
  },
  {
    nombre: 'prioridad',
    label: 'Prioridad',
    descripcion: 'Nivel de prioridad: Alta, Media, Baja',
    grupo: 'Tarea',
    tipo: 'estado',
    valorPrueba: 'Alta',
  },
  {
    nombre: 'descripcion_tarea',
    label: 'Descripción / Instrucciones',
    descripcion: 'Descripción breve o instrucciones de la tarea',
    grupo: 'Tarea',
    tipo: 'multilinea',
    valorPrueba: 'Revisar y ajustar el pedido de láminas para proyecto Tipsy según especificaciones adjuntas.',
  },
  {
    nombre: 'solicitante',
    label: 'Nombre del solicitante',
    descripcion: 'Usuario que registró la tarea',
    grupo: 'Tarea',
    tipo: 'texto',
    valorPrueba: 'María González',
  },
  {
    nombre: 'email_solicitante',
    label: 'Email del solicitante',
    descripcion: 'Correo electrónico de quien solicitó la tarea',
    grupo: 'Tarea',
    tipo: 'email',
    valorPrueba: 'mgonzalez@ologistics.com',
  },
  {
    nombre: 'departamento',
    label: 'Departamento solicitante',
    descripcion: 'Área que genera la solicitud: Servicio al Cliente, Zona Franca, Otros',
    grupo: 'Tarea',
    tipo: 'texto',
    valorPrueba: 'Servicio al Cliente',
  },
  {
    nombre: 'cliente',
    label: 'Cliente (EPA / COFERSA)',
    descripcion: 'Cliente de la cadena al que pertenece la tarea',
    grupo: 'Tarea',
    tipo: 'texto',
    valorPrueba: 'EPA',
  },
  {
    nombre: 'tipo_solicitud',
    label: 'Tipo de solicitud',
    descripcion: 'Tipo de trabajo o categoría de la solicitud',
    grupo: 'Tarea',
    tipo: 'texto',
    valorPrueba: 'Trabajo en tienda',
  },
  {
    nombre: 'nombre_proyecto',
    label: 'Nombre del cliente/proyecto',
    descripcion: 'Nombre del proyecto o cliente final referenciado en la tarea',
    grupo: 'Tarea',
    tipo: 'texto',
    valorPrueba: 'Tipsy',
  },
  {
    nombre: 'cantidad_unidades',
    label: 'Cantidad de unidades',
    descripcion: 'Número de unidades especificado en la tarea',
    grupo: 'Tarea',
    tipo: 'numero',
    valorPrueba: '24',
  },
  {
    nombre: 'fecha_creacion',
    label: 'Fecha de creación',
    descripcion: 'Fecha y hora en que se registró la tarea',
    grupo: 'Tarea',
    tipo: 'fecha',
    valorPrueba: '20/03/2026',
  },
  {
    nombre: 'fecha_entrega',
    label: 'Fecha estimada de entrega',
    descripcion: 'Fecha límite o fecha de entrega al cliente',
    grupo: 'Tarea',
    tipo: 'fecha',
    valorPrueba: '07/04/2026',
  },
  {
    nombre: 'asignado_a',
    label: 'Responsable asignado',
    descripcion: 'Nombre del encargado o responsable de la tarea',
    grupo: 'Tarea',
    tipo: 'texto',
    valorPrueba: 'Juan Álvarez',
  },
  {
    nombre: 'tienda',
    label: 'Tienda / Sucursal',
    descripcion: 'Nombre de la tienda o sucursal relacionada',
    grupo: 'Tarea',
    tipo: 'texto',
    valorPrueba: 'EPA San José Centro',
  },
  {
    nombre: 'observaciones',
    label: 'Observaciones adicionales',
    descripcion: 'Comentarios u observaciones adicionales registradas',
    grupo: 'Tarea',
    tipo: 'multilinea',
    valorPrueba: 'Coordinar con el proveedor antes del jueves.',
  },
  {
    nombre: 'url_tarea',
    label: 'Link a la tarea',
    descripcion: 'URL directa para acceder a la tarea en el sistema',
    grupo: 'Tarea',
    tipo: 'link',
    valorPrueba: 'https://sco.ologistics.com/tareas',
  },

  // ── Cotización ─────────────────────────────────────────────
  {
    nombre: 'numero_cotizacion',
    label: 'Número de cotización',
    descripcion: 'Código único de la cotización',
    grupo: 'Cotización',
    tipo: 'numero',
    valorPrueba: 'COT-2026-0087',
  },
  {
    nombre: 'total_cotizacion',
    label: 'Total de cotización',
    descripcion: 'Monto total de la cotización con formato de moneda',
    grupo: 'Cotización',
    tipo: 'numero',
    valorPrueba: '₡ 450,000.00',
  },
  {
    nombre: 'fecha_cotizacion',
    label: 'Fecha de cotización',
    descripcion: 'Fecha en que se generó la cotización',
    grupo: 'Cotización',
    tipo: 'fecha',
    valorPrueba: '20/03/2026',
  },

  // ── Pedido ─────────────────────────────────────────────────
  {
    nombre: 'numero_pedido',
    label: 'Número de pedido',
    descripcion: 'Código único del pedido',
    grupo: 'Pedido',
    tipo: 'numero',
    valorPrueba: 'PED-2026-0023',
  },
  {
    nombre: 'estado_pedido',
    label: 'Estado del pedido',
    descripcion: 'Estado actual: Pendiente, En Producción, Entregado',
    grupo: 'Pedido',
    tipo: 'estado',
    valorPrueba: 'En Producción',
  },
  {
    nombre: 'total_pedido',
    label: 'Total del pedido',
    descripcion: 'Monto total del pedido con formato de moneda',
    grupo: 'Pedido',
    tipo: 'numero',
    valorPrueba: '₡ 680,000.00',
  },
  {
    nombre: 'fecha_entrega_pedido',
    label: 'Fecha de entrega del pedido',
    descripcion: 'Fecha estimada de entrega del pedido',
    grupo: 'Pedido',
    tipo: 'fecha',
    valorPrueba: '05/04/2026',
  },
];

/** Obtiene el valor de prueba de una variable por nombre */
export function getValorPrueba(nombre: string): string {
  const cat = CATALOGO_VARIABLES.find((v) => v.nombre === nombre);
  return cat?.valorPrueba ?? `[${nombre}]`;
}

/** Construye un objeto de datos de prueba para una lista de variables */
export function buildDatosPrueba(variables: string[]): Record<string, string> {
  return Object.fromEntries(variables.map((v) => [v, getValorPrueba(v)]));
}

// ── Plantillas base predefinidas ────────────────────────────────

export interface PlantillaBase {
  id: string;
  nombre: string;
  descripcion: string;
  asunto: string;
  cuerpo_html: string;
}

export const PLANTILLAS_BASE: PlantillaBase[] = [
  {
    id: 'tarea_creada',
    nombre: 'Tarea Creada — Notificación formal',
    descripcion: 'Correo profesional de notificación cuando se registra una nueva tarea o solicitud',
    asunto: 'Nueva solicitud registrada — Caso {{numero_tarea}}',
    cuerpo_html: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background-color:#111827;padding:28px 32px;">
              <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.5px;">SCO</p>
              <p style="margin:4px 0 0;color:#9ca3af;font-size:12px;">Sistema de Gestión SCO</p>
            </td>
          </tr>

          <!-- Intro -->
          <tr>
            <td style="padding:32px 32px 0;">
              <p style="margin:0 0 8px;color:#374151;font-size:15px;">Hola,</p>
              <p style="margin:0;color:#374151;font-size:15px;line-height:1.6;">
                Se ha registrado una nueva solicitud en el sistema. A continuación encontrarás los detalles de la misma.
              </p>
            </td>
          </tr>

          <!-- Bloque número de caso -->
          <tr>
            <td style="padding:24px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#f9fafb;border-left:4px solid #111827;border-radius:4px;padding:16px 20px;">
                    <p style="margin:0 0 4px;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;font-weight:600;">Número de Caso</p>
                    <p style="margin:0;color:#111827;font-size:24px;font-weight:700;letter-spacing:1px;">{{numero_tarea}}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Botón Ver CRM -->
          <tr>
            <td style="padding:20px 32px 0;">
              <a href="{{url_tarea}}" style="display:inline-block;background-color:#111827;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;font-weight:600;">
                Ver en CRM &rarr;
              </a>
            </td>
          </tr>

          <!-- Sección: Datos generales -->
          <tr>
            <td style="padding:28px 32px 0;">
              <p style="margin:0 0 12px;color:#111827;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">
                Datos Generales
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="40%" style="padding:6px 0;color:#6b7280;font-size:13px;">Estado</td>
                  <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:500;">{{estado_tarea}}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#6b7280;font-size:13px;">Prioridad</td>
                  <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:500;">{{prioridad}}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#6b7280;font-size:13px;">Fecha de creación</td>
                  <td style="padding:6px 0;color:#111827;font-size:13px;">{{fecha_creacion}}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#6b7280;font-size:13px;">Fecha de entrega</td>
                  <td style="padding:6px 0;color:#111827;font-size:13px;">{{fecha_entrega}}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Sección: Detalle de la solicitud -->
          <tr>
            <td style="padding:20px 32px 0;">
              <p style="margin:0 0 12px;color:#111827;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">
                Detalle de la Solicitud
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="40%" style="padding:6px 0;color:#6b7280;font-size:13px;">Departamento solicitante</td>
                  <td style="padding:6px 0;color:#111827;font-size:13px;">{{departamento}}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#6b7280;font-size:13px;">Cliente</td>
                  <td style="padding:6px 0;color:#111827;font-size:13px;">{{cliente}}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#6b7280;font-size:13px;">Tipo de solicitud</td>
                  <td style="padding:6px 0;color:#111827;font-size:13px;">{{tipo_solicitud}}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#6b7280;font-size:13px;">Nombre del cliente/proyecto</td>
                  <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:500;">{{nombre_proyecto}}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#6b7280;font-size:13px;">Cantidad de unidades</td>
                  <td style="padding:6px 0;color:#111827;font-size:13px;">{{cantidad_unidades}}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Instrucciones -->
          <tr>
            <td style="padding:16px 32px 0;">
              <p style="margin:0 0 6px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;">Instrucciones</p>
              <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;background-color:#f9fafb;border-radius:4px;padding:12px 14px;">
                {{descripcion_tarea}}
              </p>
            </td>
          </tr>

          <!-- Sección: Solicitante -->
          <tr>
            <td style="padding:20px 32px 0;">
              <p style="margin:0 0 12px;color:#111827;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">
                Solicitante
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="40%" style="padding:6px 0;color:#6b7280;font-size:13px;">Nombre</td>
                  <td style="padding:6px 0;color:#111827;font-size:13px;">{{solicitante}}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#6b7280;font-size:13px;">Correo</td>
                  <td style="padding:6px 0;color:#111827;font-size:13px;">{{email_solicitante}}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Sección: Asignación -->
          <tr>
            <td style="padding:20px 32px 0;">
              <p style="margin:0 0 12px;color:#111827;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">
                Asignación
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="40%" style="padding:6px 0;color:#6b7280;font-size:13px;">Responsable</td>
                  <td style="padding:6px 0;color:#111827;font-size:13px;">{{asignado_a}}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#6b7280;font-size:13px;">Tienda / Sucursal</td>
                  <td style="padding:6px 0;color:#111827;font-size:13px;">{{tienda}}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA final -->
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 20px;color:#374151;font-size:14px;line-height:1.6;">
                Por favor, revisa la solicitud y procede con las acciones necesarias.
              </p>
              <p style="margin:0;color:#374151;font-size:14px;">Saludos,<br><strong>Sistema SCO</strong></p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:11px;text-align:center;">
                Este es un correo automático generado por el sistema SCO. No responder a este correo directamente.
              </p>
              <p style="margin:4px 0 0;color:#9ca3af;font-size:11px;text-align:center;">
                {{nombre_empresa}} &bull; {{fecha_hoy}}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    id: 'notificacion_simple',
    nombre: 'Notificación simple',
    descripcion: 'Correo corto con asunto, mensaje principal y botón de acción',
    asunto: 'Notificación — {{numero_tarea}}',
    cuerpo_html: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;background-color:#f4f4f4;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background:#111827;padding:24px 32px;">
              <p style="margin:0;color:#fff;font-size:16px;font-weight:700;">SCO</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#111827;font-size:22px;font-weight:700;">Hola,</p>
              <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.7;">
                Tienes una nueva notificación relacionada con la tarea <strong>{{numero_tarea}}</strong>.
              </p>
              <a href="{{url_tarea}}" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:600;">
                Ver detalle &rarr;
              </a>
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:11px;text-align:center;">
                {{nombre_empresa}} &bull; {{fecha_hoy}}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
];
