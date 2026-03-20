import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import ThresholdForm from './ThresholdForm';
import ImportarUmbrales from './ImportarUmbrales';
import * as XLSX from 'xlsx';
import { showAlert, showConfirm } from '../../../utils/dialog';

interface InventarioThreshold {
  id: number;
  articulo_id: number;
  min_qty: number;
  max_qty: number;
  safety_stock: number;
  reorder_point: number;
  lead_time_dias: number;
  lote_minimo: number;
  activo: boolean;
  inventario?: {
    codigo_articulo: string;
    descripcion_articulo: string;
    categoria?: { nombre_categoria: string };
  };
  inventario_niveles?: {
    on_hand: number;
    reservado: number;
    disponible: number;
  };
}

interface ThresholdsTableProps {
  thresholds: InventarioThreshold[];
  onRefresh: () => void;
}

export default function ThresholdsTable({ thresholds, onRefresh }: ThresholdsTableProps) {
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingThreshold, setEditingThreshold] = useState<InventarioThreshold | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroSemaforo, setFiltroSemaforo] = useState('todos');
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [niveles, setNiveles] = useState<{[key: number]: any}>({});

  // Cargar niveles de inventario
  useEffect(() => {
    loadNiveles();
  }, [thresholds]);

  const loadNiveles = async () => {
    if (thresholds.length === 0) return;
    
    const articuloIds = thresholds.map(t => t.articulo_id);

    // Obtener niveles registrados
    const { data: nivelesData, error } = await supabase
      .from('inventario_niveles')
      .select('*')
      .in('articulo_id', articuloIds);

    // Obtener cantidad_articulo del inventario principal (fallback)
    const { data: inventarioData } = await supabase
      .from('inventario')
      .select('id_articulo, cantidad_articulo')
      .in('id_articulo', articuloIds);

    const inventarioMap: Record<number, number> = {};
    inventarioData?.forEach(item => {
      inventarioMap[item.id_articulo] = Number(item.cantidad_articulo) || 0;
    });

    if (!error && nivelesData) {
      const nivelesRegistrados = new Set(nivelesData.map(n => n.articulo_id));

      // Artículos sin registro en inventario_niveles → sincronizar desde inventario
      const articulosSinNivel = articuloIds.filter(id => !nivelesRegistrados.has(id));
      if (articulosSinNivel.length > 0) {
        const registrosACrear = articulosSinNivel.map(id => ({
          articulo_id: id,
          on_hand: inventarioMap[id] ?? 0,
          reservado: 0
        }));
        await supabase.from('inventario_niveles').upsert(registrosACrear, { onConflict: 'articulo_id' });
      }

      const nivelesMap: Record<number, any> = {};

      // Usar niveles registrados
      nivelesData.forEach(nivel => {
        nivelesMap[nivel.articulo_id] = {
          on_hand: Number(nivel.on_hand),
          reservado: Number(nivel.reservado),
          disponible: Number(nivel.on_hand) - Number(nivel.reservado)
        };
      });

      // Para los que no tenían nivel, usar el inventario principal como fallback
      articulosSinNivel.forEach(id => {
        const qty = inventarioMap[id] ?? 0;
        nivelesMap[id] = { on_hand: qty, reservado: 0, disponible: qty };
      });

      setNiveles(nivelesMap);
    }
  };

  const handleEdit = (threshold: InventarioThreshold) => {
    setEditingThreshold(threshold);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingThreshold(null);
  };

  const handleDelete = async (threshold: InventarioThreshold) => {
    if (!(await showConfirm(`¿Estás seguro de eliminar el umbral para ${threshold.inventario?.codigo_articulo}?`, { type: 'danger', title: 'Eliminar umbral' }))) {
      return;
    }

    try {
      const { error } = await supabase
        .from('inventario_thresholds')
        .delete()
        .eq('id', threshold.id);

      if (error) throw error;
      
      onRefresh();
      showAlert('Umbral eliminado exitosamente');
    } catch (error: any) {
      console.error('Error eliminando umbral:', error);
      showAlert('Error al eliminar el umbral');
    }
  };

  const handleMassiveDelete = async () => {
    if (selectedItems.length === 0) {
      showAlert('Selecciona al menos un umbral para eliminar');
      return;
    }

    if (!(await showConfirm(`¿Estás seguro de eliminar ${selectedItems.length} umbrales seleccionados?`, { type: 'danger', title: 'Eliminar umbrales' }))) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('inventario_thresholds')
        .delete()
        .in('id', selectedItems);

      if (error) throw error;
      
      setSelectedItems([]);
      onRefresh();
      showAlert(`${selectedItems.length} umbrales eliminados exitosamente`);
    } catch (error: any) {
      console.error('Error eliminando umbrales:', error);
      showAlert('Error al eliminar los umbrales');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReplenishment = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();

      const articulosParaReabastecer = thresholds.filter(threshold => {
        const nivel = niveles[threshold.articulo_id];
        if (!nivel) return false;
        return nivel.disponible < threshold.reorder_point;
      });

      if (articulosParaReabastecer.length === 0) {
        showAlert('No hay artículos que requieran reabastecimiento en este momento');
        return;
      }

      // Verificar órdenes activas existentes para no duplicar
      const articuloIds = articulosParaReabastecer.map(t => t.articulo_id);
      const { data: ordenesActivas } = await supabase
        .from('replenishment_orders')
        .select('id, articulo_id, qty_sugerida')
        .in('articulo_id', articuloIds)
        .in('estado', ['borrador', 'emitida']);

      const ordenesActivasMap = new Map(
        (ordenesActivas || []).map(o => [o.articulo_id, o])
      );

      const ordenesACrear: any[] = [];
      const ordenesAActualizar: any[] = [];
      let sinCambio = 0;

      for (const threshold of articulosParaReabastecer) {
        const nivel = niveles[threshold.articulo_id];

        // Calcular qty necesaria para llegar al máximo configurado
        let qtySugerida = Math.max(threshold.max_qty - nivel.disponible, 0);

        // Ajustar por lote mínimo
        if (threshold.lote_minimo > 0) {
          qtySugerida = Math.ceil(qtySugerida / threshold.lote_minimo) * threshold.lote_minimo;
        }

        // Nunca sugerir más del máximo configurado
        qtySugerida = Math.min(qtySugerida, threshold.max_qty);

        const motivo = nivel.disponible < threshold.min_qty ? 'below_min' : 'below_rop';
        const ordenExistente = ordenesActivasMap.get(threshold.articulo_id);

        if (ordenExistente) {
          // Ya existe una orden activa → actualizar solo si la cantidad cambió
          if (Math.abs(ordenExistente.qty_sugerida - qtySugerida) > 0.001) {
            ordenesAActualizar.push({ id: ordenExistente.id, qty_sugerida: qtySugerida, motivo });
          } else {
            sinCambio++;
          }
        } else {
          // No existe orden activa → crear nueva
          ordenesACrear.push({
            articulo_id: threshold.articulo_id,
            qty_sugerida: qtySugerida,
            motivo,
            estado: 'borrador',
            generado_por: user?.id || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      }

      // Insertar nuevas órdenes
      if (ordenesACrear.length > 0) {
        const { error } = await supabase.from('replenishment_orders').insert(ordenesACrear);
        if (error) throw error;
      }

      // Actualizar órdenes existentes
      for (const upd of ordenesAActualizar) {
        const { error } = await supabase
          .from('replenishment_orders')
          .update({ qty_sugerida: upd.qty_sugerida, motivo: upd.motivo, updated_at: new Date().toISOString() })
          .eq('id', upd.id);
        if (error) throw error;
      }

      const partes: string[] = [];
      if (ordenesACrear.length > 0) partes.push(`${ordenesACrear.length} nueva(s) creada(s)`);
      if (ordenesAActualizar.length > 0) partes.push(`${ordenesAActualizar.length} actualizada(s)`);
      if (sinCambio > 0) partes.push(`${sinCambio} ya estaban al día`);

      showAlert(partes.length ? `Reabastecimiento: ${partes.join(' · ')}` : 'Todas las órdenes ya estaban al día');

      onRefresh();
      window.dispatchEvent(new CustomEvent('replenishment-updated'));
    } catch (error: any) {
      console.error('Error generando reabastecimiento:', error);
      showAlert('Error al generar órdenes de reabastecimiento');
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculateROP = async () => {
    try {
      setLoading(true);
      
      // Obtener configuración de demanda promedio
      const { data: config } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'demanda_promedio_dia')
        .single();

      const demandaPromedioDia = config ? parseFloat(config.value) : 5.0;

      // Recalcular ROP para todos los umbrales
      const updates = thresholds.map(threshold => ({
        id: threshold.id,
        reorder_point: threshold.safety_stock + (demandaPromedioDia * threshold.lead_time_dias)
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('inventario_thresholds')
          .update({ reorder_point: update.reorder_point })
          .eq('id', update.id);

        if (error) throw error;
      }

      showAlert('Puntos de reorden recalculados exitosamente');
      onRefresh();
    } catch (error: any) {
      console.error('Error recalculando ROP:', error);
      showAlert('Error al recalcular puntos de reorden');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      // Crear datos para Excel
      const excelData = filteredThresholds.map(threshold => {
        const nivel = niveles[threshold.articulo_id] || { on_hand: 0, reservado: 0, disponible: 0 };
        const semaforo = getSemaforoColor(threshold, nivel);
        
        return {
          'Código Artículo': threshold.inventario?.codigo_articulo || '',
          'Descripción': threshold.inventario?.descripcion_articulo || '',
          'Disponible': nivel.disponible.toFixed(2),
          'En Mano': nivel.on_hand.toFixed(2),
          'Reservado': nivel.reservado.toFixed(2),
          'Min Qty': threshold.min_qty.toFixed(2),
          'Max Qty': threshold.max_qty.toFixed(2),
          'Safety Stock': threshold.safety_stock.toFixed(2),
          'Reorder Point': threshold.reorder_point.toFixed(2),
          'Lead Time (días)': threshold.lead_time_dias,
          'Lote Mínimo': threshold.lote_minimo.toFixed(2),
          'Estado Semáforo': semaforo.label
        };
      });

      // Crear workbook y worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Umbrales de Stock');

      // Configurar anchos de columna
      const colWidths = [
        { wch: 15 }, // Código Artículo
        { wch: 40 }, // Descripción
        { wch: 12 }, // Disponible
        { wch: 12 }, // En Mano
        { wch: 12 }, // Reservado
        { wch: 12 }, // Min Qty
        { wch: 12 }, // Max Qty
        { wch: 15 }, // Safety Stock
        { wch: 15 }, // Reorder Point
        { wch: 15 }, // Lead Time
        { wch: 15 }, // Lote Mínimo
        { wch: 15 }  // Estado Semáforo
      ];
      ws['!cols'] = colWidths;

      // Generar archivo Excel
      const fileName = `umbrales_stock_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
    } catch (error) {
      console.error('Error exportando a Excel:', error);
      showAlert('Error al exportar los datos a Excel');
    }
  };

  const getSemaforoColor = (threshold: InventarioThreshold, nivel?: any) => {
    const nivelActual = nivel || niveles[threshold.articulo_id] || { disponible: 0 };
    const disponible = nivelActual.disponible;
    
    if (disponible <= 0 || disponible < threshold.min_qty) {
      return { color: 'bg-red-500', label: 'Crítico', textColor: 'text-red-700' };
    } else if (disponible < threshold.reorder_point) {
      return { color: 'bg-yellow-500', label: 'Advertencia', textColor: 'text-yellow-700' };
    } else {
      return { color: 'bg-green-500', label: 'Normal', textColor: 'text-green-700' };
    }
  };

  const filteredThresholds = thresholds.filter(threshold => {
    const matchesSearch = 
      threshold.inventario?.codigo_articulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      threshold.inventario?.descripcion_articulo?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filtroSemaforo === 'todos') return true;
    
    const semaforo = getSemaforoColor(threshold);
    return (
      (filtroSemaforo === 'critico' && semaforo.label === 'Crítico') ||
      (filtroSemaforo === 'advertencia' && semaforo.label === 'Advertencia') ||
      (filtroSemaforo === 'normal' && semaforo.label === 'Normal')
    );
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(filteredThresholds.map(t => t.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, id]);
    } else {
      setSelectedItems(selectedItems.filter(item => item !== id));
    }
  };

  return (
    <div className="p-6">
      {/* Header con botones de acción */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-semibold text-gray-900">Umbrales de Stock</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleRecalculateROP}
            disabled={loading}
            className="flex items-center px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors whitespace-nowrap disabled:opacity-50"
          >
            <i className="ri-refresh-line mr-2"></i>
            Recalcular ROP
          </button>
          <button
            onClick={handleGenerateReplenishment}
            disabled={loading}
            className="flex items-center px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors whitespace-nowrap disabled:opacity-50"
          >
            <i className="ri-shopping-cart-line mr-2"></i>
            Generar Reabastecimiento
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap"
          >
            <i className="ri-download-line mr-2"></i>
            Exportar Excel
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
          >
            <i className="ri-upload-line mr-2"></i>
            Importar Excel
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <i className="ri-add-line mr-2"></i>
            Nuevo Umbral
          </button>
        </div>
      </div>

      {/* Acciones masivas */}
      {selectedItems.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-blue-800 font-medium">
              {selectedItems.length} elementos seleccionados
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleMassiveDelete}
                disabled={loading}
                className="flex items-center px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <i className="ri-delete-bin-line mr-1"></i>
                Eliminar Seleccionados
              </button>
              <button
                onClick={() => setSelectedItems([])}
                className="flex items-center px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                <i className="ri-close-line mr-1"></i>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Buscar por código o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={filtroSemaforo}
          onChange={(e) => setFiltroSemaforo(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8"
        >
          <option value="todos">Todos los estados</option>
          <option value="critico">🔴 Crítico</option>
          <option value="advertencia">🟡 Advertencia</option>
          <option value="normal">🟢 Normal</option>
        </select>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
            <span className="text-sm font-medium text-red-700">Crítico</span>
          </div>
          <p className="text-2xl font-bold text-red-900">
            {thresholds.filter(t => getSemaforoColor(t).label === 'Crítico').length}
          </p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
            <span className="text-sm font-medium text-yellow-700">Advertencia</span>
          </div>
          <p className="text-2xl font-bold text-yellow-900">
            {thresholds.filter(t => getSemaforoColor(t).label === 'Advertencia').length}
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span className="text-sm font-medium text-green-700">Normal</span>
          </div>
          <p className="text-2xl font-bold text-green-900">
            {thresholds.filter(t => getSemaforoColor(t).label === 'Normal').length}
          </p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center">
            <i className="ri-database-2-line text-blue-600 mr-2"></i>
            <span className="text-sm font-medium text-blue-700">Total</span>
          </div>
          <p className="text-2xl font-bold text-blue-900">{thresholds.length}</p>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedItems.length === filteredThresholds.length && filteredThresholds.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Artículo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Disponible
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Min / Máx
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Safety / ROP
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lead Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredThresholds.map((threshold) => {
              const nivel = niveles[threshold.articulo_id] || { on_hand: 0, reservado: 0, disponible: 0 };
              const semaforo = getSemaforoColor(threshold, nivel);
              
              return (
                <tr key={threshold.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(threshold.id)}
                      onChange={(e) => handleSelectItem(threshold.id, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 ${semaforo.color} rounded-full mr-2`}></div>
                      <span className={`text-sm font-medium ${semaforo.textColor}`}>
                        {semaforo.label}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {threshold.inventario?.codigo_articulo}
                      </div>
                      <div className="text-sm text-gray-500 max-w-xs truncate">
                        {threshold.inventario?.descripcion_articulo}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <span className={`font-medium ${semaforo.textColor}`}>
                        {nivel.disponible.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      En mano: {nivel.on_hand.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Reservado: {nivel.reservado.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>Min: {threshold.min_qty.toFixed(2)}</div>
                    <div>Máx: {threshold.max_qty.toFixed(2)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>Safety: {threshold.safety_stock.toFixed(2)}</div>
                    <div>ROP: {threshold.reorder_point.toFixed(2)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>{threshold.lead_time_dias} días</div>
                    {threshold.lote_minimo > 0 && (
                      <div className="text-xs text-gray-500">
                        Lote: {threshold.lote_minimo.toFixed(2)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(threshold)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Editar"
                      >
                        <i className="ri-edit-line"></i>
                      </button>
                      <button
                        onClick={() => handleDelete(threshold)}
                        className="text-red-600 hover:text-red-900"
                        title="Eliminar"
                      >
                        <i className="ri-delete-bin-line"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredThresholds.length === 0 && (
        <div className="text-center py-8">
          <i className="ri-database-2-line text-4xl text-gray-400 mb-2"></i>
          <p className="text-gray-500">No se encontraron artículos con los filtros aplicados</p>
        </div>
      )}

      {/* Modal de formulario */}
      {showForm && (
        <ThresholdForm
          threshold={editingThreshold}
          onClose={handleCloseForm}
          onSuccess={() => {
            handleCloseForm();
            onRefresh();
          }}
        />
      )}

      {/* Modal de importación */}
      {showImport && (
        <ImportarUmbrales
          onClose={() => setShowImport(false)}
          onSuccess={() => {
            setShowImport(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}
