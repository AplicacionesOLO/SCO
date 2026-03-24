
import { useState } from 'react';
import { formatCurrency } from '../../../lib/currency';

interface BOMItem {
  id?: number;
  id_componente: number;
  nombre_componente: string;
  cantidad_x_unidad: number;
  unidad_id: number;
  precio_unitario_base: number;
  precio_ajustado: number;
  categoria_nombre?: string;
  unidad_nombre?: string;
  unidad_simbolo?: string;
}

interface Props {
  items: BOMItem[];
  onEliminar: (index: number) => void;
  onEditar: (index: number, cantidad: number, unidadId: number, precioAjustado: number) => void;
}

export default function BOMTable({ items, onEliminar, onEditar }: Props) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editData, setEditData] = useState({
    cantidad: '',
    unidadId: '',
    precioAjustado: 0
  });

  const iniciarEdicion = (e: React.MouseEvent, index: number, item: BOMItem) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingIndex(index);
    setEditData({
      cantidad: item.cantidad_x_unidad.toString(),
      unidadId: item.unidad_id.toString(),
      precioAjustado: item.precio_ajustado
    });
  };

  const guardarEdicion = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (editingIndex !== null) {
      const cantidad = parseFloat(editData.cantidad);
      const unidadId = parseInt(editData.unidadId);
      
      if (cantidad > 0 && unidadId) {
        onEditar(editingIndex, cantidad, unidadId, editData.precioAjustado);
        cancelarEdicion();
      }
    }
  };

  const cancelarEdicion = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setEditingIndex(null);
    setEditData({ cantidad: '', unidadId: '', precioAjustado: 0 });
  };

  const eliminarItem = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    onEliminar(index);
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <i className="ri-list-check-line text-3xl text-gray-400 mb-2"></i>
        <h3 className="text-lg font-medium text-gray-900 mb-1">Sin componentes BOM</h3>
        <p className="text-gray-500">Agrega componentes para construir la lista de materiales</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Componente
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cantidad
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unidad
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Categoría
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Precio Unitario
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.id_componente}
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {item.nombre_componente}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  {editingIndex === index ? (
                    <input
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      value={editData.cantidad}
                      onChange={(e) => setEditData({ ...editData, cantidad: e.target.value })}
                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div className="text-sm text-gray-900">
                      {item.cantidad_x_unidad.toLocaleString('es-ES', { 
                        minimumFractionDigits: 4, 
                        maximumFractionDigits: 4 
                      })}
                    </div>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    {item.unidad_simbolo || item.unidad_nombre}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  {item.categoria_nombre && (
                    <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
                      {item.categoria_nombre}
                    </span>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-green-600">
                    {formatCurrency(item.precio_ajustado)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Base: {formatCurrency(item.precio_unitario_base)}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {editingIndex === index ? (
                    <div className="flex gap-1 justify-end">
                      <button
                        type="button"
                        onClick={guardarEdicion}
                        className="text-green-600 hover:text-green-900 p-1"
                        title="Guardar"
                      >
                        <i className="ri-check-line"></i>
                      </button>
                      <button
                        type="button"
                        onClick={cancelarEdicion}
                        className="text-gray-600 hover:text-gray-900 p-1"
                        title="Cancelar"
                      >
                        <i className="ri-close-line"></i>
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-1 justify-end">
                      <button
                        type="button"
                        onClick={(e) => iniciarEdicion(e, index, item)}
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title="Editar"
                      >
                        <i className="ri-edit-line"></i>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => eliminarItem(e, index)}
                        className="text-red-600 hover:text-red-900 p-1"
                        title="Eliminar"
                      >
                        <i className="ri-delete-bin-line"></i>
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
