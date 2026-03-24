interface Props {
  onInsert: (snippet: string) => void;
}

interface SnippetBtn {
  icon: string;
  label: string;
  title: string;
  snippet: string;
}

const SNIPPETS: SnippetBtn[] = [
  {
    icon: 'ri-heading',
    label: 'Encabezado',
    title: 'Insertar encabezado de sección',
    snippet: `\n<p style="margin:0 0 12px;color:#111827;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">Sección</p>`,
  },
  {
    icon: 'ri-paragraph',
    label: 'Párrafo',
    title: 'Insertar párrafo de texto',
    snippet: `\n<p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;">Escribe aquí tu mensaje.</p>`,
  },
  {
    icon: 'ri-layout-column-fill',
    label: 'Bloque',
    title: 'Bloque destacado con fondo',
    snippet: `\n<div style="background-color:#f9fafb;border-left:4px solid #111827;border-radius:4px;padding:16px 20px;margin:12px 0;">
  <p style="margin:0 0 4px;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;font-weight:600;">Etiqueta</p>
  <p style="margin:0;color:#111827;font-size:20px;font-weight:700;">{{numero_tarea}}</p>
</div>`,
  },
  {
    icon: 'ri-cursor-fill',
    label: 'Botón',
    title: 'Botón de acción con enlace',
    snippet: `\n<a href="{{url_tarea}}" style="display:inline-block;background-color:#111827;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;font-weight:600;margin:8px 0;">
  Ver en CRM &rarr;
</a>`,
  },
  {
    icon: 'ri-table-line',
    label: 'Fila de datos',
    title: 'Tabla de par clave/valor',
    snippet: `\n<table width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0;">
  <tr>
    <td width="40%" style="padding:5px 0;color:#6b7280;font-size:13px;">Etiqueta</td>
    <td style="padding:5px 0;color:#111827;font-size:13px;">{{variable}}</td>
  </tr>
  <tr>
    <td style="padding:5px 0;color:#6b7280;font-size:13px;">Otra etiqueta</td>
    <td style="padding:5px 0;color:#111827;font-size:13px;">{{variable2}}</td>
  </tr>
</table>`,
  },
  {
    icon: 'ri-list-check-2',
    label: 'Lista',
    title: 'Lista con ítems',
    snippet: `\n<ul style="margin:8px 0;padding-left:20px;color:#374151;font-size:14px;line-height:1.8;">
  <li>Ítem 1</li>
  <li>Ítem 2</li>
  <li>Ítem 3</li>
</ul>`,
  },
  {
    icon: 'ri-separator',
    label: 'Divisor',
    title: 'Línea separadora horizontal',
    snippet: `\n<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">`,
  },
  {
    icon: 'ri-alert-line',
    label: 'Alerta',
    title: 'Bloque de alerta informativa',
    snippet: `\n<div style="background-color:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:14px 16px;margin:12px 0;">
  <p style="margin:0;color:#92400e;font-size:13px;line-height:1.5;">
    <strong>Nota:</strong> Escribe aquí un mensaje de alerta o aviso importante.
  </p>
</div>`,
  },
  {
    icon: 'ri-mail-send-line',
    label: 'Cierre',
    title: 'Párrafo de cierre y despedida',
    snippet: `\n<p style="margin:24px 0 0;color:#374151;font-size:14px;line-height:1.6;">
  Por favor, revisa la solicitud y procede con las acciones necesarias.
</p>
<p style="margin:12px 0 0;color:#374151;font-size:14px;">
  Saludos,<br><strong>Sistema SCO</strong>
</p>`,
  },
];

export default function PlantillaHtmlToolbar({ onInsert }: Props) {
  return (
    <div className="flex items-center gap-1 flex-wrap p-2 bg-gray-50 border border-gray-200 rounded-lg">
      <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mr-1 whitespace-nowrap">Insertar:</span>
      {SNIPPETS.map((s) => (
        <button
          key={s.label}
          type="button"
          title={s.title}
          onClick={() => onInsert(s.snippet)}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 bg-white border border-gray-200 rounded hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 cursor-pointer transition-colors whitespace-nowrap"
        >
          <i className={`${s.icon} text-sm`}></i>
          {s.label}
        </button>
      ))}
    </div>
  );
}
