import { useState, useEffect } from 'react';
import type { CorrespondenciaPlantilla, EnvioManualPayload } from '../../../types/correspondencia';
import {
  extraerVariables,
  aplicarVariablesAPlantilla,
  CATALOGO_VARIABLES,
} from '../../../utils/variableUtils';

interface Props {
  plantillas: CorrespondenciaPlantilla[];
  onClose: () => void;
  onEnviar: (payload: EnvioManualPayload) => Promise<void>;
}

export default function EnvioManualModal({ plantillas, onClose, onEnviar }: Props) {
  const [para, setPara] = useState('');
  const [cc, setCc] = useState('');
  const [asunto, setAsunto] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  const [plantillaId, setPlantillaId] = useState<number | ''>('');
  const [variablesData, setVariablesData] = useState<Record<string, string>>({});
  const [variablesDetectadas, setVariablesDetectadas] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; msg: string } | null>(null);
  const [previewActivo, setPreviewActivo] = useState(false);

  // Extraer variables cuando cambia asunto o cuerpo
  useEffect(() => {
    const vars = [...new Set([...extraerVariables(asunto), ...extraerVariables(cuerpo)])];
    setVariablesDetectadas(vars);
    // Mantener valores existentes, inicializar nuevas vacías
    setVariablesData((prev) => {
      const next: Record<string, string> = {};
      vars.forEach((v) => { next[v] = prev[v] ?? ''; });
      return next;
    });
  }, [asunto, cuerpo]);

  const onSelectPlantilla = (id: number | '') => {
    setPlantillaId(id);
    if (id) {
      const p = plantillas.find((x) => x.id === id);
      if (p) {
        setAsunto(p.asunto);
        setCuerpo(p.cuerpo_html);
      }
    } else {
      setAsunto('');
      setCuerpo('');
    }
  };

  const asuntoFinal = (() => {
    try { return aplicarVariablesAPlantilla(asunto, cuerpo, variablesData).asunto; } catch { return asunto; }
  })();
  const cuerpoFinal = (() => {
    try { return aplicarVariablesAPlantilla(asunto, cuerpo, variablesData).cuerpo_html; } catch { return cuerpo; }
  })();

  const handleEnviar = async () => {
    const emails = para.split(',').map((e) => e.trim()).filter((e) => e.includes('@'));
    if (!emails.length || !asunto.trim() || !cuerpo.trim()) return;
    setLoading(true);
    setResultado(null);
    try {
      await onEnviar({
        para: emails,
        cc: cc ? cc.split(',').map((e) => e.trim()).filter((e) => e.includes('@')) : [],
        asunto: asuntoFinal,
        cuerpo_html: cuerpoFinal,
        plantilla_id: plantillaId ? Number(plantillaId) : undefined,
        evento_origen: 'manual',
        variables_data: Object.keys(variablesData).length > 0 ? variablesData : undefined,
      });
      setResultado({ ok: true, msg: 'Correo enviado exitosamente' });
    } catch {
      setResultado({ ok: false, msg: 'Error al enviar. Verifica los datos e inténtalo de nuevo.' });
    } finally {
      setLoading(false);
    }
  };

  const getLabelVariable = (nombre: string) => {
    const cat = CATALOGO_VARIABLES.find((v) => v.nombre === nombre);
    return cat?.label ?? nombre.replace(/_/g, ' ');
  };

  const varsSinRellenar = variablesDetectadas.filter((v) => !variablesData[v]?.trim());

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-300">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <i className="ri-send-plane-line text-emerald-600"></i>
            Envío Manual de Correo
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer">
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Plantilla */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plantilla (opcional)</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm cursor-pointer"
              value={plantillaId}
              onChange={(e) => onSelectPlantilla(e.target.value ? parseInt(e.target.value) : '')}
            >
              <option value="">— Sin plantilla —</option>
              {plantillas.filter((p) => p.activo).map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>

          {/* Para */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Para * <span className="text-gray-400 font-normal">(separar múltiples por coma)</span>
            </label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={para}
              onChange={(e) => setPara(e.target.value)}
              placeholder="correo@empresa.com, otro@empresa.com"
            />
          </div>

          {/* CC */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CC</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="cc@empresa.com"
            />
          </div>

          {/* Asunto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asunto *</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={asunto}
              onChange={(e) => setAsunto(e.target.value)}
              placeholder="Asunto del correo"
            />
          </div>

          {/* Panel de variables dinámicas */}
          {variablesDetectadas.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <i className="ri-braces-line text-amber-600"></i>
                <span className="text-sm font-semibold text-amber-800">
                  Variables detectadas — completa los datos del correo
                </span>
                {varsSinRellenar.length > 0 && (
                  <span className="ml-auto text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                    {varsSinRellenar.length} sin rellenar
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {variablesDetectadas.map((v) => (
                  <div key={v}>
                    <label className="block text-xs font-medium text-amber-700 mb-1">
                      {getLabelVariable(v)}
                      <span className="ml-1 font-mono text-amber-500 font-normal">{`{{${v}}}`}</span>
                    </label>
                    <input
                      className="w-full border border-amber-200 bg-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                      value={variablesData[v] ?? ''}
                      onChange={(e) => setVariablesData((prev) => ({ ...prev, [v]: e.target.value }))}
                      placeholder={`Ej: ${CATALOGO_VARIABLES.find((c) => c.nombre === v)?.valorPrueba ?? v}`}
                    />
                  </div>
                ))}
              </div>

              {/* Preview rápido del asunto con variables aplicadas */}
              {asuntoFinal !== asunto && (
                <div className="mt-3 pt-3 border-t border-amber-200">
                  <p className="text-xs text-amber-600 mb-1">Asunto resultante:</p>
                  <p className="text-sm text-gray-800 font-medium">{asuntoFinal}</p>
                </div>
              )}
            </div>
          )}

          {/* Cuerpo HTML */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Cuerpo HTML *</label>
              {variablesDetectadas.length > 0 && (
                <button
                  onClick={() => setPreviewActivo((p) => !p)}
                  className="text-xs text-emerald-600 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <i className={previewActivo ? 'ri-code-line' : 'ri-eye-line'}></i>
                  {previewActivo ? 'Ver código' : 'Vista previa con datos'}
                </button>
              )}
            </div>
            {previewActivo ? (
              <div
                className="w-full min-h-40 border border-gray-300 rounded-lg p-4 text-sm overflow-auto bg-white"
                dangerouslySetInnerHTML={{ __html: cuerpoFinal }}
              />
            ) : (
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
                rows={8}
                value={cuerpo}
                onChange={(e) => setCuerpo(e.target.value)}
                placeholder="<p>Hola {{nombre_cliente}},</p><p>Mensaje aquí...</p>"
              />
            )}
          </div>

          {resultado && (
            <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${resultado.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              <i className={resultado.ok ? 'ri-check-circle-line' : 'ri-error-warning-line'}></i>
              {resultado.msg}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-gray-300">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer whitespace-nowrap"
          >
            Cerrar
          </button>
          <button
            onClick={handleEnviar}
            disabled={loading || !para.trim() || !asunto.trim() || !cuerpo.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 cursor-pointer flex items-center gap-2 whitespace-nowrap"
          >
            <i className="ri-send-plane-line"></i>
            {loading ? 'Enviando...' : 'Enviar Correo'}
          </button>
        </div>
      </div>
    </div>
  );
}
