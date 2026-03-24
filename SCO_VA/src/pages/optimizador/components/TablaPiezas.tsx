import { useState } from 'react';
import { PiezaCorte, ArticuloInventario } from '../../../types/optimizador';
import BuscadorArticuloBlur from './BuscadorArticuloBlur';

interface Props {
  piezas: PiezaCorte[];
  onEditar: (index: number, pieza: PiezaCorte) => void;
  onEliminar: (index: number) => void;
  onDuplicar?: (index: number) => void;
  tiendaActual: { id: string; nombre: string } | null;
}

export default function TablaPiezas({ piezas, onEditar, onEliminar, onDuplicar, tiendaActual }: Props) {
  const [editandoIndex, setEditandoIndex] = useState<number | null>(null);
  const [editandoCampo, setEditandoCampo] = useState<string | null>(null);

  if (piezas.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <i className="ri-inbox-line text-4xl text-gray-400 mb-3"></i>
        <h3 className="text-lg font-medium text-gray-900 mb-1">Sin piezas</h3>
        <p className="text-gray-600">
          Agrega piezas manualmente, importa desde Excel o carga desde un producto BOM
        </p>
      </div>
    );
  }

  const handleCambiarValor = (index: number, campo: string, valor: any) => {
    const piezaActual = piezas[index];
    const piezaEditada = { ...piezaActual, [campo]: valor };
    
    // Recalcular veta automáticamente si cambian dimensiones
    if (campo === 'largo' || campo === 'ancho') {
      const largo = campo === 'largo' ? parseFloat(valor) : piezaActual.largo;
      const ancho = campo === 'ancho' ? parseFloat(valor) : piezaActual.ancho;
      
      if (largo > ancho) {
        piezaEditada.veta = 'S';
      } else if (ancho > largo) {
        piezaEditada.veta = 'X';
      } else {
        piezaEditada.veta = 'N';
      }
    }
    
    onEditar(index, piezaEditada);
  };

  const handleSeleccionarMaterial = (index: number, articulo: ArticuloInventario) => {
    const piezaActual = piezas[index];
    const piezaEditada = {
      ...piezaActual,
      material_id: articulo.id,
      material_codigo: articulo.codigo_articulo,
      material_descripcion: articulo.descripcion_articulo,
      material_precio: articulo.precio_unitario,
      material_espesor_mm: articulo.espesor_mm,
      material_largo_lamina_mm: articulo.largo_lamina_mm,
      material_ancho_lamina_mm: articulo.ancho_lamina_mm
    };
    onEditar(index, piezaEditada);
    setEditandoIndex(null);
    setEditandoCampo(null);
  };

  const handleSeleccionarTapacanto = (index: number, lado: string, articulo: ArticuloInventario | null) => {
    const piezaActual = piezas[index];
    const tapacantos = Array.isArray(piezaActual.tapacantos) ? [...piezaActual.tapacantos] : [];
    
    const indiceTC = tapacantos.findIndex(tc => tc.lado === lado);
    
    if (articulo) {
      if (indiceTC >= 0) {
        tapacantos[indiceTC] = {
          lado: lado as any,
          articulo_id: articulo.id,
          codigo: articulo.codigo_articulo,
          descripcion: articulo.descripcion_articulo,
          precio_unitario: articulo.precio_unitario,
          grosor_mm: articulo.grosor_tapacanto_mm || 0
        };
      } else {
        tapacantos.push({
          lado: lado as any,
          articulo_id: articulo.id,
          codigo: articulo.codigo_articulo,
          descripcion: articulo.descripcion_articulo,
          precio_unitario: articulo.precio_unitario,
          grosor_mm: articulo.grosor_tapacanto_mm || 0
        });
      }
    } else {
      if (indiceTC >= 0) {
        tapacantos.splice(indiceTC, 1);
      }
    }
    
    onEditar(index, { ...piezaActual, tapacantos });
    setEditandoIndex(null);
    setEditandoCampo(null);
  };

  // 🆕 Manejar selección de CNC desde inventario
  const handleSeleccionarCNC = (index: number, campo: 'cnc1' | 'cnc2', articulo: ArticuloInventario) => {
    const piezaActual = piezas[index];
    const piezaEditada = {
      ...piezaActual,
      [campo]: articulo.codigo_articulo // Guardar solo el código
    };
    onEditar(index, piezaEditada);
    setEditandoIndex(null);
    setEditandoCampo(null);
  };

  const obtenerTapacanto = (pieza: PiezaCorte, lado: string) => {
    if (!pieza.tapacantos || !Array.isArray(pieza.tapacantos)) {
      return undefined;
    }
    return pieza.tapacantos.find(tc => tc.lado === lado);
  };

  const handleDuplicar = (index: number) => {
    if (onDuplicar) {
      onDuplicar(index);
    }
  };

  // 🆕 Calcular dimensiones de corte estimadas (para preview)
  const calcularDimensionesCorteEstimadas = (pieza: PiezaCorte) => {
    let ajusteLargo = 0;
    let ajusteAncho = 0;

    if (pieza.tapacantos && pieza.tapacantos.length > 0) {
      pieza.tapacantos.forEach(tc => {
        const grosor = tc.grosor_mm || 0;
        if (grosor > 0) {
          switch (tc.lado) {
            case 'superior':
            case 'inferior':
              ajusteAncho += grosor;
              break;
            case 'izquierdo':
            case 'derecho':
              ajusteLargo += grosor;
              break;
          }
        }
      });
    }

    return {
      largo_corte: pieza.largo - ajusteLargo,
      ancho_corte: pieza.ancho - ajusteAncho,
      ajuste_largo: ajusteLargo,
      ajuste_ancho: ajusteAncho
    };
  };

  const totalPiezas = piezas.reduce((sum, p) => sum + Number(p.cantidad || 0), 0);
  const areaTotal = piezas.reduce((sum, p) => {
    const area = (Number(p.largo || 0) * Number(p.ancho || 0) * Number(p.cantidad || 0)) / 1000000;
    return sum + area;
  }, 0);

  const getVetaIcon = (direccion: string) => {
    switch (direccion) {
      case 'S':
        return { icon: 'ri-arrow-right-line', label: 'S - Hacia largo', color: 'text-teal-600' };
      case 'X':
        return { icon: 'ri-arrow-down-line', label: 'X - Cruzada', color: 'text-orange-600' };
      case 'N':
        return { icon: 'ri-close-circle-line', label: 'N - Sin veta', color: 'text-gray-400' };
      default:
        return { icon: 'ri-question-line', label: 'Desconocida', color: 'text-gray-400' };
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* 🔧 Contenedor con altura máxima y scroll */}
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <table className="w-full">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr className="border-b">
              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 w-12">#</th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 min-w-[150px]">Descripción</th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 min-w-[200px]">Material</th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700 w-32">
                <div className="flex flex-col items-center">
                  <span>Medida Final</span>
                  <span className="text-[10px] text-gray-500 font-normal">(Largo × Ancho)</span>
                </div>
              </th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700 w-32">
                <div className="flex flex-col items-center">
                  <span>Corte Ajustado</span>
                  <span className="text-[10px] text-gray-500 font-normal">(con TC)</span>
                </div>
              </th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700 w-20">Cant.</th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700 w-28">Veta</th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 min-w-[120px]">TC Superior</th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 min-w-[120px]">TC Inferior</th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 min-w-[120px]">TC Izquierdo</th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 min-w-[120px]">TC Derecho</th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 min-w-[140px]">CNC1</th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 min-w-[140px]">CNC2</th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700 w-24">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {piezas.map((pieza, index) => {
              const vetaInfo = getVetaIcon(pieza.veta || 'N');
              const area = ((Number(pieza.largo || 0) * Number(pieza.ancho || 0)) / 1000000).toFixed(2);
              const dimensionesCorte = calcularDimensionesCorteEstimadas(pieza);
              const tieneAjuste = dimensionesCorte.ajuste_largo > 0 || dimensionesCorte.ajuste_ancho > 0;

              return (
                <tr key={pieza.id} className="hover:bg-gray-50">
                  {/* # */}
                  <td className="px-2 py-2">
                    <div
                      className="w-6 h-6 rounded flex items-center justify-center text-white font-semibold text-xs"
                      style={{ backgroundColor: pieza.color }}
                    >
                      {index + 1}
                    </div>
                  </td>

                  {/* Descripción */}
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={pieza.descripcion}
                      onChange={(e) => handleCambiarValor(index, 'descripcion', e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Descripción"
                    />
                  </td>

                  {/* Material */}
                  <td className="px-2 py-2">
                    {editandoIndex === index && editandoCampo === 'material' ? (
                      <BuscadorArticuloBlur
                        tipoArticulo="lamina"
                        tiendaActual={tiendaActual}
                        onSeleccionar={(art) => handleSeleccionarMaterial(index, art)}
                        onCancelar={() => {
                          setEditandoIndex(null);
                          setEditandoCampo(null);
                        }}
                        placeholder="Buscar material..."
                      />
                    ) : (
                      <button
                        onClick={() => {
                          setEditandoIndex(index);
                          setEditandoCampo('material');
                        }}
                        className="w-full text-left px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      >
                        {pieza.material_codigo ? (
                          <div>
                            <div className="font-medium text-gray-900">{pieza.material_codigo}</div>
                            <div className="text-gray-500 truncate">{pieza.material_descripcion}</div>
                          </div>
                        ) : (
                          <span className="text-red-600">Seleccionar material...</span>
                        )}
                      </button>
                    )}
                  </td>

                  {/* 🆕 Medida Final (Largo × Ancho) */}
                  <td className="px-2 py-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={pieza.largo}
                          onChange={(e) => handleCambiarValor(index, 'largo', parseFloat(e.target.value) || 0)}
                          className="w-16 px-2 py-1 text-xs text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min="0"
                          step="1"
                          title="Largo final (mm)"
                        />
                        <span className="text-gray-400 text-xs">×</span>
                        <input
                          type="number"
                          value={pieza.ancho}
                          onChange={(e) => handleCambiarValor(index, 'ancho', parseFloat(e.target.value) || 0)}
                          className="w-16 px-2 py-1 text-xs text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min="0"
                          step="1"
                          title="Ancho final (mm)"
                        />
                      </div>
                      <div className="text-[10px] text-gray-500 text-center">
                        {pieza.largo} × {pieza.ancho} mm
                      </div>
                    </div>
                  </td>

                  {/* 🆕 Corte Ajustado (con compensación de TC) */}
                  <td className="px-2 py-2">
                    <div className="flex flex-col items-center gap-1">
                      {tieneAjuste ? (
                        <>
                          <div 
                            className="text-xs font-semibold text-orange-700 bg-orange-50 px-2 py-1 rounded border border-orange-200 cursor-help"
                            title={`Ajuste por tapacanto:\nLargo: -${dimensionesCorte.ajuste_largo}mm\nAncho: -${dimensionesCorte.ajuste_ancho}mm`}
                          >
                            {dimensionesCorte.largo_corte} × {dimensionesCorte.ancho_corte}
                          </div>
                          <div className="text-[10px] text-orange-600 flex items-center gap-1">
                            <i className="ri-scissors-cut-line"></i>
                            <span>-{dimensionesCorte.ajuste_largo + dimensionesCorte.ajuste_ancho}mm</span>
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-gray-400">
                          Sin ajuste
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Cantidad */}
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      value={pieza.cantidad}
                      onChange={(e) => handleCambiarValor(index, 'cantidad', parseInt(e.target.value) || 1)}
                      className="w-20 px-2 py-1 text-xs text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1"
                      step="1"
                    />
                  </td>

                  {/* Veta - LISTA DESPLEGABLE */}
                  <td className="px-2 py-2">
                    <select
                      value={pieza.veta || 'N'}
                      onChange={(e) => handleCambiarValor(index, 'veta', e.target.value)}
                      className="w-28 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="S">S - Hacia largo</option>
                      <option value="X">X - Cruzada</option>
                      <option value="N">N - Sin veta</option>
                    </select>
                    <div className="flex items-center gap-1 mt-1">
                      <i className={`${vetaInfo.icon} ${vetaInfo.color} text-xs`}></i>
                      <span className={`${vetaInfo.color} text-[10px]`}>
                        {vetaInfo.label}
                      </span>
                    </div>
                  </td>

                  {/* Tapacanto Superior */}
                  <td className="px-2 py-2">
                    {editandoIndex === index && editandoCampo === 'tc_superior' ? (
                      <BuscadorArticuloBlur
                        tipoArticulo="tapacanto"
                        tiendaActual={tiendaActual}
                        onSeleccionar={(art) => handleSeleccionarTapacanto(index, 'superior', art)}
                        onCancelar={() => {
                          setEditandoIndex(null);
                          setEditandoCampo(null);
                        }}
                        placeholder="Buscar tapacanto..."
                      />
                    ) : (
                      <button
                        onClick={() => {
                          setEditandoIndex(index);
                          setEditandoCampo('tc_superior');
                        }}
                        className="w-full text-left px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      >
                        {obtenerTapacanto(pieza, 'superior') ? (
                          <div className="flex items-center justify-between">
                            <span>{obtenerTapacanto(pieza, 'superior')?.codigo}</span>
                            {obtenerTapacanto(pieza, 'superior')?.grosor_mm && (
                              <span className="text-[10px] text-orange-600 font-semibold">
                                {obtenerTapacanto(pieza, 'superior')?.grosor_mm}mm
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">Sin TC</span>
                        )}
                      </button>
                    )}
                  </td>

                  {/* Tapacanto Inferior */}
                  <td className="px-2 py-2">
                    {editandoIndex === index && editandoCampo === 'tc_inferior' ? (
                      <BuscadorArticuloBlur
                        tipoArticulo="tapacanto"
                        tiendaActual={tiendaActual}
                        onSeleccionar={(art) => handleSeleccionarTapacanto(index, 'inferior', art)}
                        onCancelar={() => {
                          setEditandoIndex(null);
                          setEditandoCampo(null);
                        }}
                        placeholder="Buscar tapacanto..."
                      />
                    ) : (
                      <button
                        onClick={() => {
                          setEditandoIndex(index);
                          setEditandoCampo('tc_inferior');
                        }}
                        className="w-full text-left px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      >
                        {obtenerTapacanto(pieza, 'inferior') ? (
                          <div className="flex items-center justify-between">
                            <span>{obtenerTapacanto(pieza, 'inferior')?.codigo}</span>
                            {obtenerTapacanto(pieza, 'inferior')?.grosor_mm && (
                              <span className="text-[10px] text-orange-600 font-semibold">
                                {obtenerTapacanto(pieza, 'inferior')?.grosor_mm}mm
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">Sin TC</span>
                        )}
                      </button>
                    )}
                  </td>

                  {/* Tapacanto Izquierdo */}
                  <td className="px-2 py-2">
                    {editandoIndex === index && editandoCampo === 'tc_izquierdo' ? (
                      <BuscadorArticuloBlur
                        tipoArticulo="tapacanto"
                        tiendaActual={tiendaActual}
                        onSeleccionar={(art) => handleSeleccionarTapacanto(index, 'izquierdo', art)}
                        onCancelar={() => {
                          setEditandoIndex(null);
                          setEditandoCampo(null);
                        }}
                        placeholder="Buscar tapacanto..."
                      />
                    ) : (
                      <button
                        onClick={() => {
                          setEditandoIndex(index);
                          setEditandoCampo('tc_izquierdo');
                        }}
                        className="w-full text-left px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      >
                        {obtenerTapacanto(pieza, 'izquierdo') ? (
                          <div className="flex items-center justify-between">
                            <span>{obtenerTapacanto(pieza, 'izquierdo')?.codigo}</span>
                            {obtenerTapacanto(pieza, 'izquierdo')?.grosor_mm && (
                              <span className="text-[10px] text-orange-600 font-semibold">
                                {obtenerTapacanto(pieza, 'izquierdo')?.grosor_mm}mm
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">Sin TC</span>
                        )}
                      </button>
                    )}
                  </td>

                  {/* Tapacanto Derecho */}
                  <td className="px-2 py-2">
                    {editandoIndex === index && editandoCampo === 'tc_derecho' ? (
                      <BuscadorArticuloBlur
                        tipoArticulo="tapacanto"
                        tiendaActual={tiendaActual}
                        onSeleccionar={(art) => handleSeleccionarTapacanto(index, 'derecho', art)}
                        onCancelar={() => {
                          setEditandoIndex(null);
                          setEditandoCampo(null);
                        }}
                        placeholder="Buscar tapacanto..."
                      />
                    ) : (
                      <button
                        onClick={() => {
                          setEditandoIndex(index);
                          setEditandoCampo('tc_derecho');
                        }}
                        className="w-full text-left px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      >
                        {obtenerTapacanto(pieza, 'derecho') ? (
                          <div className="flex items-center justify-between">
                            <span>{obtenerTapacanto(pieza, 'derecho')?.codigo}</span>
                            {obtenerTapacanto(pieza, 'derecho')?.grosor_mm && (
                              <span className="text-[10px] text-orange-600 font-semibold">
                                {obtenerTapacanto(pieza, 'derecho')?.grosor_mm}mm
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">Sin TC</span>
                        )}
                      </button>
                    )}
                  </td>

                  {/* CNC1 */}
                  <td className="text-xs border-b border-gray-200 px-2 py-2">
                    {editandoIndex === index && editandoCampo === 'cnc1' ? (
                      <BuscadorArticuloBlur
                        tipoArticulo="mecanizado"
                        tiendaActual={tiendaActual}
                        onSeleccionar={(art) => handleSeleccionarCNC(index, 'cnc1', art)}
                        onCancelar={() => {
                          setEditandoIndex(null);
                          setEditandoCampo(null);
                        }}
                        placeholder="Buscar CNC1..."
                      />
                    ) : (
                      <div className="flex items-center gap-1">
                        {/* 🔍 CAMPO DE BÚSQUEDA CNC1 */}
                        <button
                          onClick={() => {
                            setEditandoIndex(index);
                            setEditandoCampo('cnc1');
                          }}
                          className={`flex-1 text-left px-2 py-1 text-xs rounded transition-colors ${
                            pieza.cnc1 && pieza.cnc1.trim() !== ''
                              ? 'bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100'
                              : 'text-gray-400 border border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                          }`}
                          title="Buscar artículo CNC1"
                        >
                          {pieza.cnc1 && pieza.cnc1.trim() !== '' ? pieza.cnc1 : '+ Buscar CNC1'}
                        </button>

                        {/* 🔢 CAMPO DE CANTIDAD CNC1 */}
                        <input
                          type="number"
                          value={pieza.cnc1_cantidad || 0}
                          onChange={(e) => handleCambiarValor(index, 'cnc1_cantidad', parseInt(e.target.value) || 0)}
                          disabled={!pieza.cnc1 || pieza.cnc1.trim() === ''}
                          className="w-14 px-1 py-1 text-xs text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
                          min="0"
                          step="1"
                          placeholder="Cant"
                          title={pieza.cnc1 && pieza.cnc1.trim() !== '' ? "Cantidad CNC1" : "Seleccione un CNC1 primero"}
                        />
                      </div>
                    )}
                  </td>

                  {/* CNC2 */}
                  <td className="text-xs border-b border-gray-200 px-2 py-2">
                    {editandoIndex === index && editandoCampo === 'cnc2' ? (
                      <BuscadorArticuloBlur
                        tipoArticulo="mecanizado"
                        tiendaActual={tiendaActual}
                        onSeleccionar={(art) => handleSeleccionarCNC(index, 'cnc2', art)}
                        onCancelar={() => {
                          setEditandoIndex(null);
                          setEditandoCampo(null);
                        }}
                        placeholder="Buscar CNC2..."
                      />
                    ) : (
                      <div className="flex items-center gap-1">
                        {/* 🔍 CAMPO DE BÚSQUEDA CNC2 */}
                        <button
                          onClick={() => {
                            setEditandoIndex(index);
                            setEditandoCampo('cnc2');
                          }}
                          className={`flex-1 text-left px-2 py-1 text-xs rounded transition-colors ${
                            pieza.cnc2 && pieza.cnc2.trim() !== ''
                              ? 'bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100'
                              : 'text-gray-400 border border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                          }`}
                          title="Buscar artículo CNC2"
                        >
                          {pieza.cnc2 && pieza.cnc2.trim() !== '' ? pieza.cnc2 : '+ Buscar CNC2'}
                        </button>

                        {/* 🔢 CAMPO DE CANTIDAD CNC2 */}
                        <input
                          type="number"
                          value={pieza.cnc2_cantidad || 0}
                          onChange={(e) => handleCambiarValor(index, 'cnc2_cantidad', parseInt(e.target.value) || 0)}
                          disabled={!pieza.cnc2 || pieza.cnc2.trim() === ''}
                          className="w-14 px-1 py-1 text-xs text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
                          min="0"
                          step="1"
                          placeholder="Cant"
                          title={pieza.cnc2 && pieza.cnc2.trim() !== '' ? "Cantidad CNC2" : "Seleccione un CNC2 primero"}
                        />
                      </div>
                    )}
                  </td>

                  {/* Acciones */}
                  <td className="px-2 py-2">
                    <div className="flex items-center justify-center gap-1">
                      {onDuplicar && (
                        <button
                          onClick={() => handleDuplicar(index)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Duplicar"
                        >
                          <i className="ri-file-copy-line text-sm"></i>
                        </button>
                      )}
                      <button
                        onClick={() => onEliminar(index)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Eliminar"
                      >
                        <i className="ri-delete-bin-line text-sm"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer con totales */}
      <div className="px-4 py-3 border-t bg-gray-50">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-gray-700">Totales:</span>
          <div className="flex items-center gap-6">
            <span className="text-gray-600">
              Piezas: <strong className="text-gray-900">{totalPiezas}</strong>
            </span>
            <span className="text-gray-600">
              Área: <strong className="text-gray-900">{areaTotal.toFixed(2)} m²</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
