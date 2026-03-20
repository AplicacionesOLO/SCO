import { useState } from 'react';
import type { VariableCatalogo, TipoVariable } from '../../../utils/variableUtils';
import { CATALOGO_VARIABLES } from '../../../utils/variableUtils';

interface Props {
  variablesActivas: string[];
  onInsertar: (nombre: string) => void;
  onAgregar: (v: { nombre: string; descripcion: string }) => void;
}

const GRUPOS = ['General', 'Tarea', 'Cliente', 'Cotización', 'Pedido'];

const TIPO_CONFIG: Record<TipoVariable, { label: string; color: string }> = {
  texto: { label: 'Texto', color: 'bg-blue-50 text-blue-600' },
  fecha: { label: 'Fecha', color: 'bg-purple-50 text-purple-600' },
  estado: { label: 'Estado', color: 'bg-amber-50 text-amber-600' },
  link: { label: 'Link', color: 'bg-teal-50 text-teal-600' },
  email: { label: 'Email', color: 'bg-pink-50 text-pink-600' },
  numero: { label: 'Número', color: 'bg-green-50 text-green-600' },
  multilinea: { label: 'Texto largo', color: 'bg-gray-100 text-gray-600' },
};

export default function PlantillaCatalogoPanel({ variablesActivas, onInsertar, onAgregar }: Props) {
  const [grupoActivo, setGrupoActivo] = useState<string>('Tarea');
  const [busqueda, setBusqueda] = useState('');

  const todasLasVars = busqueda.trim().length > 0
    ? CATALOGO_VARIABLES.filter(
        (c) =>
          c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
          c.label.toLowerCase().includes(busqueda.toLowerCase()) ||
          c.descripcion.toLowerCase().includes(busqueda.toLowerCase())
      )
    : CATALOGO_VARIABLES.filter((c) => c.grupo === grupoActivo);

  const handleClick = (cat: VariableCatalogo) => {
    onAgregar({ nombre: cat.nombre, descripcion: cat.label });
    onInsertar(cat.nombre);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Búsqueda */}
      <div className="relative mb-2">
        <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
        <input
          className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-400 bg-white"
          placeholder="Buscar variable..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {/* Grupos (solo si no hay búsqueda) */}
      {busqueda.trim().length === 0 && (
        <div className="flex gap-1 mb-2 flex-wrap">
          {GRUPOS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGrupoActivo(g)}
              className={`px-2.5 py-1 text-[11px] rounded-full cursor-pointer transition-colors whitespace-nowrap ${
                grupoActivo === g
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {/* Lista de variables */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-0.5">
        {todasLasVars.length === 0 && (
          <p className="text-xs text-gray-400 italic text-center py-4">No hay variables en este grupo.</p>
        )}
        {todasLasVars.map((cat) => {
          const activa = variablesActivas.includes(cat.nombre);
          const tipoConf = TIPO_CONFIG[cat.tipo];
          return (
            <button
              key={cat.nombre}
              type="button"
              onClick={() => handleClick(cat)}
              className={`w-full flex items-start gap-2 text-left px-2.5 py-2 rounded-lg border transition-colors cursor-pointer ${
                activa
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-white border-gray-100 hover:bg-gray-50 hover:border-gray-200'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                  <span className="font-mono text-[11px] text-emerald-700 font-semibold truncate">
                    {`{{${cat.nombre}}}`}
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${tipoConf.color}`}>
                    {tipoConf.label}
                  </span>
                  {activa && (
                    <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                      ✓ activa
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-600 truncate">{cat.label}</p>
                <p className="text-[10px] text-gray-400 truncate">{cat.descripcion}</p>
                <p className="text-[10px] text-gray-400 italic mt-0.5 truncate">Ej: {cat.valorPrueba}</p>
              </div>
              <div className="w-5 h-5 flex items-center justify-center text-gray-300 flex-shrink-0 mt-0.5">
                <i className={`text-sm ${activa ? 'ri-checkbox-circle-fill text-emerald-500' : 'ri-add-circle-line'}`}></i>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
