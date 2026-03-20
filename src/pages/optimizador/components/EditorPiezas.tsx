import React, { useState } from 'react';
import { PiezaCorte, ModoOptimizador, ArticuloInventario } from '../../../types/optimizador';
import TablaPiezas from './TablaPiezas';
import SelectorProductoBOM from './SelectorProductoBOM';
import { useAuth } from '../../../hooks/useAuth';

interface EditorPiezasProps {
  modo: ModoOptimizador;
  piezas: PiezaCorte[];
  laminaBase: ArticuloInventario | null;
  onCargarBOM: (productoId: number, productoNombre: string) => void;
  onAgregarPieza: (pieza: PiezaCorte) => void;
  onEditarPieza: (index: number, pieza: PiezaCorte) => void;
  onEliminarPieza: (index: number) => void;
  onSeleccionarLamina: (lamina: ArticuloInventario | null) => void;
  onLimpiar: () => void;
}

const EditorPiezas: React.FC<EditorPiezasProps> = ({
  modo,
  piezas,
  laminaBase,
  onCargarBOM,
  onAgregarPieza,
  onEditarPieza,
  onEliminarPieza,
  onSeleccionarLamina,
  onLimpiar
}) => {
  const { currentStore } = useAuth();

  const handleDuplicarPieza = (index: number) => {
    const piezaOriginal = piezas[index];
    const piezaDuplicada: PiezaCorte = {
      ...piezaOriginal,
      id: `${piezaOriginal.id}-dup-${Date.now()}`,
      descripcion: `${piezaOriginal.descripcion} (Copia)`,
      tapacantos: [...piezaOriginal.tapacantos] // Copiar el array de tapacantos
    };
    onAgregarPieza(piezaDuplicada);
  };

  const handleAgregarNuevaPieza = () => {
    const colores = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    const colorAleatorio = colores[Math.floor(Math.random() * colores.length)];
    
    const nuevaPieza: PiezaCorte = {
      id: `pieza-${Date.now()}`,
      descripcion: '',
      largo: 0,
      ancho: 0,
      cantidad: 1,
      veta: 'S',
      tapacantos: [], // ✅ Inicializar como array vacío
      color: colorAleatorio
    };
    onAgregarPieza(nuevaPieza);
  };

  return (
    <div className="space-y-4">
      {/* Selector de Producto BOM (solo en modo BOM) */}
      {modo === 'bom' && (
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <SelectorProductoBOM onSeleccionar={onCargarBOM} />
        </div>
      )}

      {/* Header con botones */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <i className="ri-table-line text-blue-600"></i>
            Lista de Piezas
          </h3>
          <div className="flex gap-2">
            <button
              onClick={handleAgregarNuevaPieza}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <i className="ri-add-line"></i>
              Nueva Pieza
            </button>
            {piezas.length > 0 && (
              <button
                onClick={onLimpiar}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <i className="ri-delete-bin-line"></i>
                Limpiar Todo
              </button>
            )}
          </div>
        </div>

        {/* Tabla de piezas estilo Excel */}
        <TablaPiezas
          piezas={piezas}
          onEditar={onEditarPieza}
          onEliminar={onEliminarPieza}
          onDuplicar={handleDuplicarPieza}
          tiendaActual={currentStore}
        />
      </div>
    </div>
  );
};

export default EditorPiezas;
