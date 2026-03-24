import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { showAlert, showConfirm } from '../../../utils/dialog';

interface InventarioAlerta {
  id: number;
  articulo_id: number;
  tipo: 'below_min' | 'below_rop' | 'stockout';
  detalle: any;
  leida: boolean;
  created_at: string;
  inventario?: {
    codigo_articulo: string;
    descripcion_articulo: string;
  };
}

interface AlertasTableProps {
  alertas: InventarioAlerta[];
  onRefresh: () => void;
}

export default function AlertasTable({ alertas, onRefresh }: AlertasTableProps) {
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  const getTipoInfo = (tipo: string) => {
    switch (tipo) {
      case 'stockout':
        return { 
          label: 'Sin Stock', 
          color: 'bg-red-100 text-red-800', 
          icon: 'ri-error-warning-line',
          iconColor: 'text-red-600'
        };
      case 'below_min':
        return { 
          label: 'Bajo Mínimo', 
          color: 'bg-orange-100 text-orange-800', 
          icon: 'ri-alert-line',
          iconColor: 'text-orange-600'
        };
      case 'below_rop':
        return { 
          label: 'Bajo ROP', 
          color: 'bg-yellow-100 text-yellow-800', 
          icon: 'ri-information-line',
          iconColor: 'text-yellow-600'
        };
      default:
        return { 
          label: 'Desconocido', 
          color: 'bg-gray-100 text-gray-800', 
          icon: 'ri-question-line',
          iconColor: 'text-gray-600'
        };
    }
  };

  const handleMarkAsRead = async (alertaId: number) => {
    try {
      const { error } = await supabase
        .from('inventario_alertas')
        .update({ leida: true })
        .eq('id', alertaId);

      if (error) throw error;
      onRefresh();
    } catch (error: any) {
      console.error('Error marcando alerta como leída:', error);
      showAlert('Error al marcar la alerta como leída');
    }
  };

  const handleMarkMultipleAsRead = async () => {
    if (selectedItems.length === 0) {
      showAlert('Selecciona al menos una alerta');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('inventario_alertas')
        .update({ leida: true })
        .in('id', selectedItems);

      if (error) throw error;
      
      setSelectedItems([]);
      onRefresh();
      showAlert(`${selectedItems.length} alertas marcadas como leídas`);
    } catch (error: any) {
      console.error('Error marcando alertas como leídas:', error);
      showAlert('Error al marcar las alertas como leídas');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMultiple = async () => {
    if (selectedItems.length === 0) {
      showAlert('Selecciona al menos una alerta');
      return;
    }

    if (!(await showConfirm(`¿Estás seguro de eliminar ${selectedItems.length} alertas seleccionadas?`, { type: 'danger', title: 'Eliminar alertas' }))) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('inventario_alertas')
        .delete()
        .in('id', selectedItems);

      if (error) throw error;
      
      setSelectedItems([]);
      onRefresh();
      showAlert(`${selectedItems.length} alertas eliminadas exitosamente`);
    } catch (error: any) {
      console.error('Error eliminando alertas:', error);
      showAlert('Error al eliminar las alertas');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Fecha',
      'Tipo',
      'Código Artículo',
      'Descripción',
      'Disponible',
      'Umbral',
      'Estado',
      'Leída'
    ];

    const csvData = filteredAlertas.map(alerta => {
      const tipoInfo = getTipoInfo(alerta.tipo);
      const detalle = alerta.detalle || {};
      
      return [
        new Date(alerta.created_at).toLocaleDateString(),
        tipoInfo.label,
        detalle.articulo_codigo || '',
        detalle.articulo_descripcion || '',
        detalle.disponible || '0',
        detalle.min_qty || detalle.reorder_point || '0',
        alerta.leida ? 'Leída' : 'No leída',
        alerta.leida ? 'Sí' : 'No'
      ];
    });

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `alertas_inventario_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerateAlertas = async () => {
    try {
      setLoading(true);
      
      // Obtener umbrales y niveles para generar alertas
      const { data: thresholds, error: thresholdsError } = await supabase
        .from('inventario_thresholds')
        .select(`
          *,
          inventario:inventario!inner(codigo_articulo, descripcion_articulo)
        `)
        .eq('activo', true);

      if (thresholdsError) throw thresholdsError;

      const alertasACrear = [];

      for (const threshold of thresholds || []) {
        // Obtener nivel actual
        const { data: nivel } = await supabase
          .from('inventario_niveles')
          .select('*')
          .eq('articulo_id', threshold.articulo_id)
          .single();

        if (!nivel) continue;

        const disponible = nivel.on_hand - nivel.reservado;
        let tipoAlerta = null;

        if (disponible <= 0) {
          tipoAlerta = 'stockout';
        } else if (disponible < threshold.min_qty) {
          tipoAlerta = 'below_min';
        } else if (disponible < threshold.reorder_point) {
          tipoAlerta = 'below_rop';
        }

        if (tipoAlerta) {
          // Verificar si ya existe una alerta similar no leída
          const { data: alertaExistente } = await supabase
            .from('inventario_alertas')
            .select('id')
            .eq('articulo_id', threshold.articulo_id)
            .eq('tipo', tipoAlerta)
            .eq('leida', false)
            .single();

          if (!alertaExistente) {
            alertasACrear.push({
              articulo_id: threshold.articulo_id,
              tipo: tipoAlerta,
              detalle: {
                disponible,
                min_qty: threshold.min_qty,
                reorder_point: threshold.reorder_point,
                articulo_codigo: threshold.inventario.codigo_articulo,
                articulo_descripcion: threshold.inventario.descripcion_articulo
              },
              leida: false
            });
          }
        }
      }

      if (alertasACrear.length > 0) {
        const { error: insertError } = await supabase
          .from('inventario_alertas')
          .insert(alertasACrear);

        if (insertError) throw insertError;
        
        showAlert(`Se generaron ${alertasACrear.length} nuevas alertas`);
      } else {
        showAlert('No se encontraron nuevas alertas para generar');
      }

      onRefresh();
    } catch (error: any) {
      console.error('Error generando alertas:', error);
      showAlert('Error al generar alertas automáticas');
    } finally {
      setLoading(false);
    }
  };

  const filteredAlertas = alertas.filter(alerta => {
    const matchesSearch = 
      alerta.detalle?.articulo_codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alerta.detalle?.articulo_descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filtroTipo !== 'todos' && alerta.tipo !== filtroTipo) return false;
    if (filtroEstado === 'leidas' && !alerta.leida) return false;
    if (filtroEstado === 'no_leidas' && alerta.leida) return false;

    return true;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(filteredAlertas.map(a => a.id));
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
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-semibold text-gray-900">Alertas de Inventario</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleGenerateAlertas}
            disabled={loading}
            className="flex items-center px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors whitespace-nowrap disabled:opacity-50"
          >
            <i className="ri-refresh-line mr-2"></i>
            Generar Alertas
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap"
          >
            <i className="ri-download-line mr-2"></i>
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Acciones masivas */}
      {selectedItems.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-blue-800 font-medium">
              {selectedItems.length} alertas seleccionadas
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleMarkMultipleAsRead}
                disabled={loading}
                className="flex items-center px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <i className="ri-check-line mr-1"></i>
                Marcar como Leídas
              </button>
              <button
                onClick={handleDeleteMultiple}
                disabled={loading}
                className="flex items-center px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <i className="ri-delete-bin-line mr-1"></i>
                Eliminar
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
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <input
          type="text"
          placeholder="Buscar por código o descripción..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8"
        >
          <option value="todos">Todos los tipos</option>
          <option value="stockout">🔴 Sin Stock</option>
          <option value="below_min">🟠 Bajo Mínimo</option>
          <option value="below_rop">🟡 Bajo ROP</option>
        </select>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8"
        >
          <option value="todos">Todos los estados</option>
          <option value="no_leidas">No leídas</option>
          <option value="leidas">Leídas</option>
        </select>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="flex items-center">
            <i className="ri-error-warning-line text-red-600 mr-2"></i>
            <span className="text-sm font-medium text-red-700">Sin Stock</span>
          </div>
          <p className="text-2xl font-bold text-red-900">
            {alertas.filter(a => a.tipo === 'stockout').length}
          </p>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="flex items-center">
            <i className="ri-alert-line text-orange-600 mr-2"></i>
            <span className="text-sm font-medium text-orange-700">Bajo Mínimo</span>
          </div>
          <p className="text-2xl font-bold text-orange-900">
            {alertas.filter(a => a.tipo === 'below_min').length}
          </p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="flex items-center">
            <i className="ri-information-line text-yellow-600 mr-2"></i>
            <span className="text-sm font-medium text-yellow-700">Bajo ROP</span>
          </div>
          <p className="text-2xl font-bold text-yellow-900">
            {alertas.filter(a => a.tipo === 'below_rop').length}
          </p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center">
            <i className="ri-notification-line text-blue-600 mr-2"></i>
            <span className="text-sm font-medium text-blue-700">No Leídas</span>
          </div>
          <p className="text-2xl font-bold text-blue-900">
            {alertas.filter(a => !a.leida).length}
          </p>
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
                  checked={selectedItems.length === filteredAlertas.length && filteredAlertas.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Artículo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Detalle
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAlertas.map((alerta) => {
              const tipoInfo = getTipoInfo(alerta.tipo);
              const detalle = alerta.detalle || {};
              
              return (
                <tr key={alerta.id} className={`hover:bg-gray-50 ${!alerta.leida ? 'bg-blue-50' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(alerta.id)}
                      onChange={(e) => handleSelectItem(alerta.id, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(alerta.created_at).toLocaleDateString()}
                    <div className="text-xs text-gray-500">
                      {new Date(alerta.created_at).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tipoInfo.color}`}>
                      <i className={`${tipoInfo.icon} ${tipoInfo.iconColor} mr-1`}></i>
                      {tipoInfo.label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {detalle.articulo_codigo}
                    </div>
                    <div className="text-sm text-gray-500 max-w-xs truncate">
                      {detalle.articulo_descripcion}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>Disponible: <span className="font-medium">{detalle.disponible || 0}</span></div>
                    {detalle.min_qty && (
                      <div className="text-xs text-gray-500">Mínimo: {detalle.min_qty}</div>
                    )}
                    {detalle.reorder_point && (
                      <div className="text-xs text-gray-500">ROP: {detalle.reorder_point}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {alerta.leida ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <i className="ri-check-line mr-1"></i>
                        Leída
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <i className="ri-notification-line mr-1"></i>
                        Nueva
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {!alerta.leida && (
                      <button
                        onClick={() => handleMarkAsRead(alerta.id)}
                        className="text-green-600 hover:text-green-900 mr-3"
                        title="Marcar como leída"
                      >
                        <i className="ri-check-line"></i>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredAlertas.length === 0 && (
        <div className="text-center py-8">
          <i className="ri-notification-off-line text-4xl text-gray-400 mb-2"></i>
          <p className="text-gray-500">No se encontraron alertas con los filtros aplicados</p>
        </div>
      )}
    </div>
  );
}
