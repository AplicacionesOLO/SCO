import { useState, useEffect, useRef, useCallback } from 'react';
import type { CorrespondenciaPlantilla, CreatePlantillaData, VariablePlantilla } from '../../../types/correspondencia';
import {
  extraerVariables,
  aplicarVariablesAPlantilla,
  buildDatosPrueba,
  CATALOGO_VARIABLES,
  PLANTILLAS_BASE,
} from '../../../utils/variableUtils';
import PlantillaHtmlToolbar from './PlantillaHtmlToolbar';
import PlantillaCatalogoPanel from './PlantillaCatalogoPanel';

interface Props {
  plantilla?: CorrespondenciaPlantilla | null;
  onClose: () => void;
  onSave: (data: CreatePlantillaData) => Promise<void>;
}

type PanelDerecho = 'catalogo' | 'preview' | 'test';

export default function PlantillaModal({ plantilla, onClose, onSave }: Props) {
  const [form, setForm] = useState<CreatePlantillaData>({
    nombre: '',
    descripcion: '',
    asunto: '',
    cuerpo_html: '',
    variables: [],
    activo: true,
  });
  const [loading, setLoading] = useState(false);
  const [panelDerecho, setPanelDerecho] = useState<PanelDerecho>('preview');
  const [previewDatos, setPreviewDatos] = useState<Record<string, string>>({});
  const [showPlantillasBase, setShowPlantillasBase] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (plantilla) {
      setForm({
        nombre: plantilla.nombre,
        descripcion: plantilla.descripcion ?? '',
        asunto: plantilla.asunto,
        cuerpo_html: plantilla.cuerpo_html,
        variables: plantilla.variables ?? [],
        activo: plantilla.activo,
      });
    }
  }, [plantilla]);

  // Sincronizar variables detectadas
  useEffect(() => {
    const detectadas = [
      ...new Set([
        ...extraerVariables(form.asunto),
        ...extraerVariables(form.cuerpo_html),
      ]),
    ];
    const nuevas: VariablePlantilla[] = detectadas
      .filter((d) => !form.variables?.some((v) => v.nombre === d))
      .map((d) => {
        const cat = CATALOGO_VARIABLES.find((c) => c.nombre === d);
        return { nombre: d, descripcion: cat?.label ?? d.replace(/_/g, ' ') };
      });
    if (nuevas.length > 0) {
      setForm((f) => ({ ...f, variables: [...(f.variables ?? []), ...nuevas] }));
    }
    setPreviewDatos((prev) => {
      const nuevosData = buildDatosPrueba(detectadas);
      return { ...nuevosData, ...prev };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.asunto, form.cuerpo_html]);

  const handleSave = async () => {
    if (!form.nombre.trim() || !form.asunto.trim() || !form.cuerpo_html.trim()) return;
    setLoading(true);
    try {
      await onSave(form);
    } finally {
      setLoading(false);
    }
  };

  const removeVariable = (nombre: string) => {
    setForm((f) => ({ ...f, variables: f.variables?.filter((v) => v.nombre !== nombre) }));
  };

  const addVariable = useCallback((v: VariablePlantilla) => {
    setForm((f) => {
      if (f.variables?.some((x) => x.nombre === v.nombre)) return f;
      return { ...f, variables: [...(f.variables ?? []), v] };
    });
  }, []);

  /** Inserta texto en la posición del cursor del textarea */
  const insertarEnCursor = useCallback((texto: string) => {
    const el = textareaRef.current;
    if (!el) {
      setForm((f) => ({ ...f, cuerpo_html: f.cuerpo_html + texto }));
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const current = form.cuerpo_html;
    const next = current.substring(0, start) + texto + current.substring(end);
    setForm((f) => ({ ...f, cuerpo_html: next }));
    setTimeout(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + texto.length;
    }, 0);
  }, [form.cuerpo_html]);

  const insertarVariable = useCallback((nombre: string) => {
    insertarEnCursor(`{{${nombre}}}`);
  }, [insertarEnCursor]);

  const cargarPlantillaBase = (id: string) => {
    const base = PLANTILLAS_BASE.find((p) => p.id === id);
    if (!base) return;
    setForm((f) => ({
      ...f,
      asunto: f.asunto || base.asunto,
      cuerpo_html: base.cuerpo_html,
    }));
    setShowPlantillasBase(false);
    setPanelDerecho('preview');
  };

  const previewResult = aplicarVariablesAPlantilla(form.asunto, form.cuerpo_html, previewDatos);
  const variablesNombres = (form.variables ?? []).map((v) => v.nombre);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3">
      <div className="bg-white rounded-xl w-full flex flex-col" style={{ maxWidth: '1200px', height: '92vh' }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center bg-emerald-100 rounded-lg">
              <i className="ri-file-text-line text-emerald-700 text-sm"></i>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                {plantilla ? 'Editar Plantilla' : 'Nueva Plantilla'}
              </h2>
              <p className="text-xs text-gray-400">Editor HTML con preview en tiempo real</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Selector de plantillas base */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPlantillasBase((o) => !o)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-700 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 cursor-pointer whitespace-nowrap transition-colors"
              >
                <i className="ri-layout-masonry-line text-sm"></i>
                Usar plantilla base
                <i className={`ri-arrow-${showPlantillasBase ? 'up' : 'down'}-s-line text-xs`}></i>
              </button>
              {showPlantillasBase && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl z-10 w-72">
                  <p className="px-4 pt-3 pb-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Plantillas base disponibles
                  </p>
                  {PLANTILLAS_BASE.map((pb) => (
                    <button
                      key={pb.id}
                      type="button"
                      onClick={() => cargarPlantillaBase(pb.id)}
                      className="w-full flex items-start gap-2 px-4 py-2.5 hover:bg-emerald-50 cursor-pointer transition-colors text-left"
                    >
                      <i className="ri-layout-3-line text-emerald-500 text-sm mt-0.5 flex-shrink-0"></i>
                      <div>
                        <p className="text-xs font-medium text-gray-800">{pb.nombre}</p>
                        <p className="text-[11px] text-gray-500">{pb.descripcion}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer rounded-lg hover:bg-gray-100 transition-colors"
            >
              <i className="ri-close-line text-lg"></i>
            </button>
          </div>
        </div>

        {/* ── Body: columna izquierda (editor) + columna derecha (panel) ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ─ Columna izquierda: Editor ─ */}
          <div className="flex flex-col w-0 flex-1 overflow-hidden border-r border-gray-200">

            {/* Metadatos */}
            <div className="flex-shrink-0 px-5 pt-4 pb-0 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={form.nombre}
                    onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                    placeholder="Ej: Tarea Creada — Notificación"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={form.descripcion ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                    placeholder="Descripción breve"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Asunto *</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  value={form.asunto}
                  onChange={(e) => setForm((f) => ({ ...f, asunto: e.target.value }))}
                  placeholder="Ej: Nueva solicitud — Caso {{numero_tarea}}"
                />
              </div>

              {/* Variables activas */}
              {(form.variables ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {(form.variables ?? []).map((v) => (
                    <span
                      key={v.nombre}
                      className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-1 text-[11px]"
                    >
                      <button
                        type="button"
                        onClick={() => insertarVariable(v.nombre)}
                        className="hover:underline cursor-pointer font-mono font-semibold"
                        title={`Insertar {{${v.nombre}}} en cursor`}
                      >
                        {`{{${v.nombre}}}`}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeVariable(v.nombre)}
                        className="text-emerald-300 hover:text-red-500 cursor-pointer ml-0.5"
                      >
                        <i className="ri-close-line text-[10px]"></i>
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Toolbar HTML */}
              <PlantillaHtmlToolbar onInsert={insertarEnCursor} />
            </div>

            {/* Textarea cuerpo HTML */}
            <div className="flex-1 px-5 py-3 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-gray-600">
                  Cuerpo HTML *
                </label>
                <span className="text-[10px] text-gray-400">
                  {form.cuerpo_html.length} caracteres &bull; HTML + estilos inline
                </span>
              </div>
              <textarea
                ref={textareaRef}
                className="flex-1 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none leading-relaxed"
                value={form.cuerpo_html}
                onChange={(e) => setForm((f) => ({ ...f, cuerpo_html: e.target.value }))}
                placeholder={`<!DOCTYPE html>\n<html lang="es">\n<body>\n  <p>Hola,</p>\n  <p>Se ha registrado la tarea <strong>{{numero_tarea}}</strong>.</p>\n</body>\n</html>`}
                spellCheck={false}
              />
            </div>
          </div>

          {/* ─ Columna derecha: Tabs (Preview / Catálogo / Test) ─ */}
          <div className="flex flex-col w-96 flex-shrink-0 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 flex-shrink-0 bg-gray-50">
              {(
                [
                  { id: 'preview' as PanelDerecho, icon: 'ri-eye-line', label: 'Preview' },
                  { id: 'catalogo' as PanelDerecho, icon: 'ri-braces-line', label: 'Variables' },
                  { id: 'test' as PanelDerecho, icon: 'ri-test-tube-line', label: 'Datos prueba' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPanelDerecho(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium cursor-pointer border-b-2 transition-colors ${
                    panelDerecho === tab.id
                      ? 'border-emerald-600 text-emerald-700 bg-white'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <i className={`${tab.icon} text-sm`}></i>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Panel Preview */}
            {panelDerecho === 'preview' && (
              <div className="flex-1 overflow-hidden flex flex-col">
                {/* Asunto preview */}
                <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 flex-shrink-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-400 flex-shrink-0">Asunto:</span>
                    <span className="text-gray-800 font-medium truncate">
                      {previewResult.asunto || form.asunto || '—'}
                    </span>
                  </div>
                </div>
                {/* Render HTML */}
                <div className="flex-1 overflow-y-auto p-3 bg-gray-100">
                  <div
                    className="bg-white rounded-lg overflow-hidden text-sm"
                    dangerouslySetInnerHTML={{ __html: previewResult.cuerpo_html || '<p style="color:#9ca3af;padding:24px;text-align:center;">El preview aparecerá aquí mientras escribes HTML...</p>' }}
                  />
                </div>
              </div>
            )}

            {/* Panel Catálogo de Variables */}
            {panelDerecho === 'catalogo' && (
              <div className="flex-1 overflow-hidden flex flex-col p-3 gap-2">
                <p className="text-[11px] text-gray-500 flex-shrink-0">
                  Haz clic en una variable para insertarla en el cursor del editor.
                </p>
                <div className="flex-1 overflow-hidden">
                  <PlantillaCatalogoPanel
                    variablesActivas={variablesNombres}
                    onInsertar={insertarVariable}
                    onAgregar={addVariable}
                  />
                </div>
              </div>
            )}

            {/* Panel Datos de Prueba */}
            {panelDerecho === 'test' && (
              <div className="flex-1 overflow-y-auto p-3">
                <p className="text-[11px] text-gray-500 mb-3">
                  Edita los valores de prueba para ver cómo queda el correo en el preview.
                </p>
                {(form.variables ?? []).length === 0 ? (
                  <p className="text-xs text-gray-400 italic text-center py-6">
                    Agrega variables para ver los datos de prueba.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {(form.variables ?? []).map((v) => (
                      <div key={v.nombre}>
                        <label className="block text-[10px] font-mono text-emerald-700 mb-0.5">
                          {`{{${v.nombre}}}`}
                        </label>
                        <p className="text-[10px] text-gray-400 mb-1">{v.descripcion}</p>
                        <input
                          className="w-full border border-gray-200 bg-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                          value={previewDatos[v.nombre] ?? ''}
                          onChange={(e) =>
                            setPreviewDatos((prev) => ({ ...prev, [v.nombre]: e.target.value }))
                          }
                          placeholder={`Valor de prueba...`}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="activo-plt"
              checked={form.activo ?? true}
              onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))}
              className="cursor-pointer"
            />
            <label htmlFor="activo-plt" className="text-sm text-gray-600 cursor-pointer">
              Plantilla activa
            </label>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer whitespace-nowrap"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading || !form.nombre || !form.asunto || !form.cuerpo_html}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 cursor-pointer whitespace-nowrap flex items-center gap-2"
            >
              {loading && <i className="ri-loader-4-line animate-spin text-sm"></i>}
              {loading ? 'Guardando...' : 'Guardar Plantilla'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
