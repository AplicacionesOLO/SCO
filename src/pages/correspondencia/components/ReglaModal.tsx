import { useState, useEffect } from 'react';
import type { CorrespondenciaRegla, CorrespondenciaPlantilla, CreateReglaData, EventoTrigger } from '../../../types/correspondencia';

interface Props {
  regla?: CorrespondenciaRegla | null;
  plantillas: CorrespondenciaPlantilla[];
  onClose: () => void;
  onSave: (data: CreateReglaData) => Promise<void>;
}

const EVENTOS: { value: EventoTrigger; label: string; icono: string }[] = [
  { value: 'manual', label: 'Envío Manual', icono: 'ri-cursor-line' },
  { value: 'tarea.creada', label: 'Tarea Creada', icono: 'ri-task-line' },
  { value: 'tarea.estado_cambiado', label: 'Tarea: Cambio de Estado', icono: 'ri-refresh-line' },
  { value: 'tarea.finalizada', label: 'Tarea Finalizada', icono: 'ri-checkbox-circle-line' },
  { value: 'cotizacion.creada', label: 'Cotización Creada', icono: 'ri-file-text-line' },
  { value: 'pedido.creado', label: 'Pedido Creado', icono: 'ri-shopping-cart-line' },
  { value: 'pedido.estado_cambiado', label: 'Pedido: Cambio de Estado', icono: 'ri-truck-line' },
];

export default function ReglaModal({ regla, plantillas, onClose, onSave }: Props) {
  const [form, setForm] = useState<CreateReglaData>({
    nombre: '',
    descripcion: '',
    evento_trigger: 'tarea.creada',
    plantilla_id: null,
    destinatarios_config: { tipo: 'fijo', emails: [] },
    cc: [],
    cco: [],
    activo: true,
    prioridad: 0,
    max_reintentos: 3,
  });
  const [loading, setLoading] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [ccInput, setCcInput] = useState('');

  useEffect(() => {
    if (regla) {
      setForm({
        nombre: regla.nombre,
        descripcion: regla.descripcion ?? '',
        evento_trigger: regla.evento_trigger,
        plantilla_id: regla.plantilla_id,
        destinatarios_config: regla.destinatarios_config ?? { tipo: 'fijo', emails: [] },
        cc: regla.cc ?? [],
        cco: regla.cco ?? [],
        activo: regla.activo,
        prioridad: regla.prioridad,
        max_reintentos: regla.max_reintentos,
      });
    }
  }, [regla]);

  const handleSave = async () => {
    if (!form.nombre.trim()) return;
    setLoading(true);
    try { await onSave(form); } finally { setLoading(false); }
  };

  const addEmail = (tipo: 'para' | 'cc') => {
    const val = tipo === 'para' ? emailInput.trim() : ccInput.trim();
    if (!val || !val.includes('@')) return;
    if (tipo === 'para') {
      const curr = (form.destinatarios_config as { tipo: string; emails?: string[] }).emails ?? [];
      setForm((f) => ({ ...f, destinatarios_config: { ...f.destinatarios_config, emails: [...curr, val] } }));
      setEmailInput('');
    } else {
      setForm((f) => ({ ...f, cc: [...(f.cc ?? []), val] }));
      setCcInput('');
    }
  };

  const removeEmail = (tipo: 'para' | 'cc', email: string) => {
    if (tipo === 'para') {
      const curr = (form.destinatarios_config as { tipo: string; emails?: string[] }).emails ?? [];
      setForm((f) => ({ ...f, destinatarios_config: { ...f.destinatarios_config, emails: curr.filter((e) => e !== email) } }));
    } else {
      setForm((f) => ({ ...f, cc: f.cc?.filter((e) => e !== email) }));
    }
  };

  const paraEmails = ((form.destinatarios_config as { tipo: string; emails?: string[] }).emails ?? []);
  const esDestinatarioDinamico = (form.destinatarios_config as { tipo: string }).tipo === 'dinamico';

  /** Campos de email disponibles por evento */
  const CAMPOS_EMAIL_POR_EVENTO: Record<string, { value: string; label: string }[]> = {
    'tarea.creada': [
      { value: 'email_solicitante', label: 'Email del solicitante de la tarea' },
    ],
    'tarea.estado_cambiado': [
      { value: 'email_solicitante', label: 'Email del solicitante de la tarea' },
    ],
    'tarea.finalizada': [
      { value: 'email_solicitante', label: 'Email del solicitante de la tarea' },
    ],
    'cotizacion.creada': [
      { value: 'email_cliente', label: 'Email del cliente de la cotización' },
    ],
    'pedido.creado': [
      { value: 'email_cliente', label: 'Email del cliente del pedido' },
    ],
    'pedido.estado_cambiado': [
      { value: 'email_cliente', label: 'Email del cliente del pedido' },
    ],
  };
  const camposEmailDisponibles = CAMPOS_EMAIL_POR_EVENTO[form.evento_trigger] ?? [];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-300">
          <h2 className="text-lg font-semibold text-gray-900">{regla ? 'Editar Regla' : 'Nueva Regla'}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer"><i className="ri-close-line text-xl"></i></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Nombre de la regla" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
              <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                value={form.prioridad} onChange={(e) => setForm((f) => ({ ...f, prioridad: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
              value={form.descripcion ?? ''} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} placeholder="Descripción opcional" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Evento Trigger *</label>
            <div className="grid grid-cols-2 gap-2">
              {EVENTOS.map((ev) => (
                <button key={ev.value} onClick={() => setForm((f) => ({ ...f, evento_trigger: ev.value }))}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm text-left transition-colors cursor-pointer ${
                    form.evento_trigger === ev.value ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}>
                  <i className={`${ev.icono} text-base`}></i>
                  {ev.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plantilla de correo</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer"
              value={form.plantilla_id ?? ''} onChange={(e) => setForm((f) => ({ ...f, plantilla_id: e.target.value ? parseInt(e.target.value) : null }))}>
              <option value="">— Sin plantilla (usar cuerpo manual) —</option>
              {plantillas.filter((p) => p.activo).map((p) => (
                <option key={p.id} value={p.id}>{p.nombre} — {p.asunto}</option>
              ))}
            </select>
          </div>

          {/* Tipo de destinatario */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de destinatario</label>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setForm((f) => ({ ...f, destinatarios_config: { tipo: 'fijo', emails: [] } }))}
                className={`flex-1 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${!esDestinatarioDinamico ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
              >
                <i className="ri-mail-line mr-1.5"></i>Correos fijos
              </button>
              <button
                onClick={() => setForm((f) => ({ ...f, destinatarios_config: { tipo: 'dinamico', campo_email: camposEmailDisponibles[0]?.value ?? 'email_solicitante' } }))}
                className={`flex-1 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${esDestinatarioDinamico ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
              >
                <i className="ri-user-line mr-1.5"></i>Del evento (dinámico)
              </button>
            </div>

            {/* Destinatarios dinámicos */}
            {esDestinatarioDinamico ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <p className="text-xs text-emerald-700 mb-2 flex items-center gap-1">
                  <i className="ri-flashlight-line"></i>
                  El destinatario se obtiene automáticamente del evento
                </p>
                {camposEmailDisponibles.length > 0 ? (
                  <select
                    className="w-full border border-emerald-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none cursor-pointer"
                    value={(form.destinatarios_config as { tipo: string; campo_email?: string }).campo_email ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, destinatarios_config: { tipo: 'dinamico', campo_email: e.target.value } }))}
                  >
                    {camposEmailDisponibles.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-gray-500">No hay campos de email disponibles para este evento.</p>
                )}
              </div>
            ) : (
              /* Destinatarios fijos */
              <div>
                <div className="flex gap-2 mb-2">
                  <input className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addEmail('para')} placeholder="correo@empresa.com" />
                  <button onClick={() => addEmail('para')} className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 cursor-pointer whitespace-nowrap">Agregar</button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {paraEmails.map((e) => (
                    <span key={e} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 rounded-full px-3 py-1 text-xs">
                      {e}
                      <button onClick={() => removeEmail('para', e)} className="text-gray-400 hover:text-red-500 cursor-pointer"><i className="ri-close-line"></i></button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* CC */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CC (Copia)</label>
            <div className="flex gap-2 mb-2">
              <input className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" value={ccInput}
                onChange={(e) => setCcInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addEmail('cc')} placeholder="cc@empresa.com" />
              <button onClick={() => addEmail('cc')} className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 cursor-pointer whitespace-nowrap">Agregar</button>
            </div>
            <div className="flex flex-wrap gap-1">
              {form.cc?.map((e) => (
                <span key={e} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 rounded-full px-3 py-1 text-xs">
                  {e}
                  <button onClick={() => removeEmail('cc', e)} className="text-gray-400 hover:text-red-500 cursor-pointer"><i className="ri-close-line"></i></button>
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Máx. reintentos</label>
              <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" min={0} max={10}
                value={form.max_reintentos} onChange={(e) => setForm((f) => ({ ...f, max_reintentos: parseInt(e.target.value) || 3 }))} />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.activo ?? true} onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))} className="cursor-pointer" />
                <span className="text-sm text-gray-700">Regla activa</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-gray-300">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer whitespace-nowrap">Cancelar</button>
          <button onClick={handleSave} disabled={loading || !form.nombre} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 cursor-pointer whitespace-nowrap">
            {loading ? 'Guardando...' : 'Guardar Regla'}
          </button>
        </div>
      </div>
    </div>
  );
}
