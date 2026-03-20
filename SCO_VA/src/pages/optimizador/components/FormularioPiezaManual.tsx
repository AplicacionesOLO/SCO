import { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { PiezaCorte, TipoVeta, Tapacanto, ArticuloInventario } from '../../../types/optimizador';
import { buscarArticulosInventario } from '../../../services/optimizadorService';
import { showAlert } from '../../../utils/dialog';

interface Props {
  onAgregar: (pieza: PiezaCorte) => void;
  onCancelar: () => void;
}

export default function FormularioPiezaManual({ onAgregar, onCancelar }: Props) {
  const { currentStore } = useAuth();
  
  const [descripcion, setDescripcion] = useState('');
  const [material, setMaterial] = useState<ArticuloInventario | null>(null);
  const [largo, setLargo] = useState('');
  const [ancho, setAncho] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [veta, setVeta] = useState<TipoVeta>('S');
  const [cnc1, setCnc1] = useState('');
  const [cnc2, setCnc2] = useState('');
  
  const [tapacantos, setTapacantos] = useState<Tapacanto[]>([
    { lado: 'largo_inf', articulo_id: undefined },
    { lado: 'largo_sup', articulo_id: undefined },
    { lado: 'ancho_inf', articulo_id: undefined },
    { lado: 'ancho_sup', articulo_id: undefined }
  ]);

  const [busquedaMaterial, setBusquedaMaterial] = useState('');
  const [materialesDisponibles, setMaterialesDisponibles] = useState<ArticuloInventario[]>([]);
  const [mostrarMateriales, setMostrarMateriales] = useState(false);

  // Calcular veta automáticamente
  useEffect(() => {
    const largoNum = parseFloat(largo);
    const anchoNum = parseFloat(ancho);
    
    if (largoNum && anchoNum) {
      if (largoNum > anchoNum) {
        setVeta('S');
      } else if (anchoNum > largoNum) {
        setVeta('X');
      } else {
        setVeta('N');
      }
    }
  }, [largo, ancho]);

  // Buscar materiales
  useEffect(() => {
    if (busquedaMaterial.length >= 2) {
      buscarMateriales();
    } else {
      setMaterialesDisponibles([]);
    }
  }, [busquedaMaterial]);

  const buscarMateriales = async () => {
    const { data } = await buscarArticulosInventario(busquedaMaterial, 'lamina', currentStore);
    setMaterialesDisponibles(data || []);
    setMostrarMateriales(true);
  };

  const seleccionarMaterial = (mat: ArticuloInventario) => {
    setMaterial(mat);
    setBusquedaMaterial('');
    setMostrarMateriales(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!descripcion || !material || !largo || !ancho || !cantidad) {
      showAlert('Por favor completa todos los campos obligatorios');
      return;
    }

    const nuevaPieza: PiezaCorte = {
      id: `manual-${Date.now()}`,
      descripcion,
      material_id: material.id,
      material_codigo: material.codigo_articulo,
      material_descripcion: material.descripcion_articulo,
      material_precio: material.precio_unitario,
      largo: parseFloat(largo),
      ancho: parseFloat(ancho),
      cantidad: parseInt(cantidad),
      veta,
      tapacantos: tapacantos.filter(tc => tc.articulo_id),
      cnc1,
      cnc2,
      color: generarColorAleatorio()
    };

    onAgregar(nuevaPieza);
  };

  const generarColorAleatorio = () => {
    const colores = [
      '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
      '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'
    ];
    return colores[Math.floor(Math.random() * colores.length)];
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-gray-50 p-6 rounded-lg border border-gray-200">
      {/* Descripción */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Descripción de la Pieza *
        </label>
        <input
          type="text"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Ej: Tapa superior, lateral izquierdo..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      {/* Material */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Material *
        </label>
        {material ? (
          <div className="bg-white border border-gray-300 rounded-lg p-3 flex items-center justify-between">
            <div>
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-2">
                {material.codigo_articulo}
              </span>
              <span className="text-sm font-medium">{material.descripcion_articulo}</span>
              <span className="text-sm text-gray-600 ml-2">
                - ₡{material.precio_unitario.toLocaleString('es-CR')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setMaterial(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <i className="ri-close-line"></i>
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              type="text"
              value={busquedaMaterial}
              onChange={(e) => setBusquedaMaterial(e.target.value)}
              placeholder="Buscar material..."
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
            
            {mostrarMateriales && materialesDisponibles.length > 0 && (
              <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {materialesDisponibles.map((mat) => (
                  <button
                    key={mat.id}
                    type="button"
                    onClick={() => seleccionarMaterial(mat)}
                    className="w-full p-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded">
                        {mat.codigo_articulo}
                      </span>
                      <span className="text-sm">{mat.descripcion_articulo}</span>
                      <span className="text-sm text-green-600 ml-auto">
                        ₡{mat.precio_unitario.toLocaleString('es-CR')}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dimensiones */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Largo (mm) *
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={largo}
            onChange={(e) => setLargo(e.target.value)}
            placeholder="2440"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ancho (mm) *
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={ancho}
            onChange={(e) => setAncho(e.target.value)}
            placeholder="1220"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cantidad *
          </label>
          <input
            type="number"
            min="1"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
      </div>

      {/* Veta */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Veta (calculada automáticamente)
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setVeta('S')}
            className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
              veta === 'S'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
            }`}
          >
            <div className="font-semibold">S - Sentido Largo</div>
            <div className="text-xs">Largo &gt; Ancho</div>
          </button>
          <button
            type="button"
            onClick={() => setVeta('X')}
            className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
              veta === 'X'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
            }`}
          >
            <div className="font-semibold">X - Sentido Ancho</div>
            <div className="text-xs">Ancho &gt; Largo</div>
          </button>
          <button
            type="button"
            onClick={() => setVeta('N')}
            className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
              veta === 'N'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
            }`}
          >
            <div className="font-semibold">N - Sin Veta</div>
            <div className="text-xs">Igual dimensión</div>
          </button>
        </div>
      </div>

      {/* CNC */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            CNC 1 (opcional)
          </label>
          <input
            type="text"
            value={cnc1}
            onChange={(e) => setCnc1(e.target.value)}
            placeholder="Descripción mecanizado..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            CNC 2 (opcional)
          </label>
          <input
            type="text"
            value={cnc2}
            onChange={(e) => setCnc2(e.target.value)}
            placeholder="Descripción mecanizado..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Botones */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancelar}
          className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <i className="ri-add-line"></i>
          Agregar Pieza
        </button>
      </div>
    </form>
  );
}
