import { useState, useEffect } from 'react';
import {
  reporteDiaService,
  type TareaConReporte,
  type TareaReporteColaborador,
} from '../../../services/reporteDiaService';
import { showAlert } from '../../../utils/dialog';

interface Props {
  tarea: TareaConReporte;
  colaboradorId: number;
  tiendaId: string;
  onSaved: () => void;
}

const ESTADO_CONFIG: Record<string, { color: string }> = {
  'En Cola': { color: 'bg-gray-100 text-gray-700' },
  'En Proceso': { color: 'bg-sky-100 text-sky-700' },
  'Produciendo': { color: 'bg-emerald-100 text-emerald-700' },
  'Esperando suministros': { color: 'bg-amber-100 text-amber-700' },
  'Terminado': { color: 'bg-teal-100 text-teal-700' },
  'Finalizado': { color: 'bg-gray-100 text-gray-500' },
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TareaReporteCard({ tarea, colaboradorId, tiendaId, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [unidades, setUnidades] = useState<number | ''>('');
  const [observaciones, setObservaciones] = useState('');

  const horasCalculadas =
    fechaInicio && fechaFin
      ? reporteDiaService.calcularHoras(
          new Date(fechaInicio).toISOString(),
          new Date(fechaFin).toISOString()
        )
      : undefined;

  useEffect(() => {
    if (tarea.reporte) {
      setFechaInicio(reporteDiaService.toDatetimeLocal(tarea.reporte.fecha_hora_inicio));
      setFechaFin(reporteDiaService.toDatetimeLocal(tarea.reporte.fecha_hora_fin));
      setUnidades(tarea.reporte.unidades_procesadas ?? '');
      setObservaciones(tarea.reporte.observaciones ?? '');
    } else {
      setFechaInicio(reporteDiaService.toDatetimeLocal(tarea.fecha_inicio));
      setFechaFin(reporteDiaService.toDatetimeLocal(tarea.fecha_cierre));
      setUnidades('');
      setObservaciones('');
    }
  }, [tarea]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (fechaInicio && fechaFin && new Date(fechaFin) <= new Date(fechaInicio)) {
      newErrors.fechaFin = 'Cierre debe ser posterior al inicio';
    }
    if (unidades !== '' && Number(unidades) < 0) {
      newErrors.unidades = 'No puede ser negativo';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGuardar = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload: Omit<TareaReporteColaborador, 'created_at' | 'updated_at' | 'created_by'> = {
        id: tarea.reporte?.id,
        tarea_id: tarea.id,
        colaborador_id: colaboradorId,
        tienda_id: tiendaId,
        fecha_trabajo: new Date().toISOString().split('T')[0],
        fecha_hora_inicio: fechaInicio ? new Date(fechaInicio).toISOString() : null,
        fecha_hora_fin: fechaFin ? new Date(fechaFin).toISOString() : null,
        unidades_procesadas: unidades !== '' ? Number(unidades) : 0,
        observaciones: observaciones || null,
      };
      await reporteDiaService.guardarReporte(payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved();
    } catch (err) {
      showAlert('Error al guardar: ' + (err as Error).message, { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const estadoCfg = ESTADO_CONFIG[tarea.estado] ?? ESTADO_CONFIG['En Cola'];
  const tipoSolicitud = reporteDiaService.extraerTipoSolicitud(tarea.datos_formulario);
  const yaRegistrado = !!tarea.reporte;

  const inputBase =
    'w-full px-2 py-1.5 text-xs border rounded-md focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white';
  const inputError = 'border-red-400';
  const inputNormal = 'border-gray-300';

  return (
    <tr className={`group transition-colors ${yaRegistrado ? 'bg-emerald-50/40' : 'bg-white'} hover:bg-gray-50/80`}>
      {/* Consecutivo */}
      <td className="px-3 py-2.5 whitespace-nowrap align-middle">
        <span className="text-xs font-bold text-gray-800 font-mono">{tarea.consecutivo}</span>
      </td>

      {/* Estado */}
      <td className="px-3 py-2.5 whitespace-nowrap align-middle">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${estadoCfg.color}`}>
          {tarea.estado}
        </span>
        {yaRegistrado && (
          <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
            <i className="ri-check-line text-xs"></i>
          </span>
        )}
      </td>

      {/* Tipo */}
      <td className="px-3 py-2.5 align-middle max-w-[150px]">
        <span className="text-xs text-gray-700 font-medium line-clamp-2 leading-tight">{tipoSolicitud}</span>
      </td>

      {/* Descripción */}
      <td className="px-3 py-2.5 align-middle max-w-[180px]">
        <span className="text-xs text-gray-500 line-clamp-2 leading-tight">
          {tarea.descripcion_breve || <span className="text-gray-300 italic">—</span>}
        </span>
      </td>

      {/* Uds. Totales */}
      <td className="px-3 py-2.5 whitespace-nowrap align-middle text-center">
        <span className="text-xs font-semibold text-gray-700">
          {tarea.cantidad_unidades != null ? tarea.cantidad_unidades.toLocaleString() : '—'}
        </span>
      </td>

      {/* Ref. Inicio Tarea */}
      <td className="px-3 py-2.5 whitespace-nowrap align-middle">
        <span className="text-xs text-gray-400">{fmtDate(tarea.fecha_inicio)}</span>
      </td>

      {/* Ref. Cierre Tarea */}
      <td className="px-3 py-2.5 whitespace-nowrap align-middle">
        <span className="text-xs text-gray-400">{fmtDate(tarea.fecha_cierre)}</span>
      </td>

      {/* Mi Inicio Real */}
      <td className="px-2 py-2 align-middle min-w-[165px]">
        <input
          type="datetime-local"
          value={fechaInicio}
          onChange={(e) => {
            setFechaInicio(e.target.value);
            setErrors((p) => ({ ...p, fechaFin: '' }));
          }}
          className={`${inputBase} ${inputNormal}`}
        />
      </td>

      {/* Mi Cierre Real */}
      <td className="px-2 py-2 align-middle min-w-[165px]">
        <input
          type="datetime-local"
          value={fechaFin}
          onChange={(e) => {
            setFechaFin(e.target.value);
            setErrors((p) => ({ ...p, fechaFin: '' }));
          }}
          className={`${inputBase} ${errors.fechaFin ? inputError : inputNormal}`}
        />
        {errors.fechaFin && (
          <p className="text-xs text-red-500 mt-0.5 leading-tight">{errors.fechaFin}</p>
        )}
      </td>

      {/* Hrs calculadas */}
      <td className="px-3 py-2.5 whitespace-nowrap align-middle text-center">
        {horasCalculadas !== undefined ? (
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            {horasCalculadas}h
          </span>
        ) : (
          <span className="text-xs text-gray-300">—</span>
        )}
      </td>

      {/* Mis Unidades */}
      <td className="px-2 py-2 align-middle min-w-[80px]">
        <input
          type="number"
          value={unidades}
          onChange={(e) => {
            setUnidades(e.target.value === '' ? '' : Number(e.target.value));
            setErrors((p) => ({ ...p, unidades: '' }));
          }}
          min={0}
          placeholder="0"
          className={`${inputBase} ${errors.unidades ? inputError : inputNormal} text-center`}
        />
        {errors.unidades && (
          <p className="text-xs text-red-500 mt-0.5 leading-tight">{errors.unidades}</p>
        )}
      </td>

      {/* Observaciones */}
      <td className="px-2 py-2 align-middle min-w-[180px]">
        <input
          type="text"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          maxLength={500}
          placeholder="Observación opcional..."
          className={`${inputBase} ${inputNormal}`}
        />
      </td>

      {/* Acción */}
      <td className="px-3 py-2.5 whitespace-nowrap align-middle">
        <button
          type="button"
          onClick={handleGuardar}
          disabled={saving}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${
            saved
              ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
              : yaRegistrado
              ? 'bg-sky-600 text-white hover:bg-sky-700'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          {saving ? (
            <><i className="ri-loader-4-line animate-spin text-xs"></i> Guardando</>
          ) : saved ? (
            <><i className="ri-check-double-line text-xs"></i> Guardado</>
          ) : yaRegistrado ? (
            <><i className="ri-refresh-line text-xs"></i> Actualizar</>
          ) : (
            <><i className="ri-save-line text-xs"></i> Registrar</>
          )}
        </button>
      </td>
    </tr>
  );
}
