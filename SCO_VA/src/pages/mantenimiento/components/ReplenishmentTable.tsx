import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import * as XLSX from 'xlsx';
import { showAlert, showConfirm } from '../../../utils/dialog';

interface ReplenishmentOrder {
  id: number;
  articulo_id: number;
  qty_sugerida: number;
  qty_recibida?: number | null;
  motivo: 'below_min' | 'below_rop';
  estado: 'borrador' | 'emitida' | 'completada' | 'cancelada';
  generado_por?: string;
  notas?: string;
  created_at: string;
  updated_at: string;
  inventario?: {
    codigo_articulo: string;
    descripcion_articulo: string;
  };
}

interface Movimiento {
  id: number;
  articulo_id: number;
  tipo: string;
  cantidad: number;
  notas?: string;
  created_at: string;
  referencia_id?: number;
  referencia_type?: string;
}

interface ReplenishmentTableProps {
  orders: ReplenishmentOrder[];
  onRefresh: () => void;
}

export default function ReplenishmentTable({ orders = [], onRefresh }: ReplenishmentTableProps) {
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroMotivo, setFiltroMotivo] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal notas
  const [editingOrder, setEditingOrder] = useState<ReplenishmentOrder | null>(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  // Modal recepción
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receivingOrder, setReceivingOrder] = useState<ReplenishmentOrder | null>(null);
  const [qtyRecibida, setQtyRecibida] = useState<number>(0);
  const [receivingLoading, setReceivingLoading] = useState(false);

  // Modal reporte de movimientos
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportOrder, setReportOrder] = useState<ReplenishmentOrder | null>(null);
  const [reportMovimientos, setReportMovimientos] = useState<Movimiento[]>([]);
  const [reportLoading, setReportLoading] = useState(false);

  const safeOrders = Array.isArray(orders) ? orders : [];

  useEffect(() => {
    const handler = () => onRefresh();
    window.addEventListener('replenishment-updated', handler);
    return () => window.removeEventListener('replenishment-updated', handler);
  }, [onRefresh]);

  // ─── Helpers UI ───────────────────────────────────────────────────────────

  // "Borrador" en DB → se muestra como "Pendiente" en UI
  const getEstadoInfo = (estado: string) => {
    switch (estado) {
      case 'borrador':
        return { label: 'Pendiente', color: 'bg-orange-100 text-orange-800', icon: 'ri-time-line', iconColor: 'text-orange-600' };
      case 'emitida':
        return { label: 'Emitida', color: 'bg-amber-100 text-amber-800', icon: 'ri-send-plane-line', iconColor: 'text-amber-600' };
      case 'completada':
        return { label: 'Completada', color: 'bg-green-100 text-green-800', icon: 'ri-check-line', iconColor: 'text-green-600' };
      case 'cancelada':
        return { label: 'Cancelada', color: 'bg-red-100 text-red-800', icon: 'ri-close-line', iconColor: 'text-red-600' };
      default:
        return { label: 'Desconocido', color: 'bg-gray-100 text-gray-800', icon: 'ri-question-line', iconColor: 'text-gray-600' };
    }
  };

  const getMotivoInfo = (motivo: string) => {
    switch (motivo) {
      case 'below_min': return { label: 'Bajo Mínimo', color: 'text-red-600', icon: 'ri-arrow-down-line' };
      case 'below_rop': return { label: 'Bajo ROP', color: 'text-yellow-600', icon: 'ri-alert-line' };
      default: return { label: 'Otro', color: 'text-gray-600', icon: 'ri-information-line' };
    }
  };

  // ─── Acciones individuales ────────────────────────────────────────────────

  const handleEmitir = async (orderId: number) => {
    try {
      const { error } = await supabase
        .from('replenishment_orders')
        .update({ estado: 'emitida', updated_at: new Date().toISOString() })
        .eq('id', orderId);
      if (error) throw error;
      onRefresh();
    } catch {
      showAlert('Error al emitir la orden');
    }
  };

  const handleOpenReceive = (order: ReplenishmentOrder) => {
    setReceivingOrder(order);
    // Cantidad pendiente de recibir (total - ya recibido)
    const yaRecibido = Number(order.qty_recibida) || 0;
    setQtyRecibida(order.qty_sugerida - yaRecibido);
    setShowReceiveModal(true);
  };

  const handleConfirmReceive = async () => {
    if (!receivingOrder) return;
    if (qtyRecibida <= 0) { showAlert('La cantidad recibida debe ser mayor a 0'); return; }

    const yaRecibido = Number(receivingOrder.qty_recibida) || 0;
    const maxRecibible = receivingOrder.qty_sugerida - yaRecibido;

    if (qtyRecibida > maxRecibible) {
      showAlert(`No puedes recibir más de ${maxRecibible} unidades pendientes en esta orden`);
      return;
    }

    try {
      setReceivingLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      const nuevaQtyRecibida = yaRecibido + qtyRecibida;
      const esCompleto = nuevaQtyRecibida >= receivingOrder.qty_sugerida;
      // Si completo → 'completada'. Si parcial → vuelve a 'emitida' para seguir recibiendo
      const nuevoEstado = esCompleto ? 'completada' : 'emitida';

      // 1. Obtener stock actual para registrar stock_anterior / stock_posterior
      const { data: nivelActual } = await supabase
        .from('inventario_niveles')
        .select('id, on_hand, reservado')
        .eq('articulo_id', receivingOrder.articulo_id)
        .maybeSingle();

      const stockAnterior = nivelActual ? Number(nivelActual.on_hand) : 0;
      const stockPosterior = stockAnterior + qtyRecibida;

      // 2. Actualizar la MISMA orden — nunca crear una nueva
      const { error: orderErr } = await supabase
        .from('replenishment_orders')
        .update({
          estado: nuevoEstado,
          qty_recibida: nuevaQtyRecibida,
          notas: `Recibido ${nuevaQtyRecibida}/${receivingOrder.qty_sugerida} uds.${!esCompleto ? ' — pendiente de completar' : ' — completo'}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', receivingOrder.id);
      if (orderErr) throw orderErr;

      // 3. Actualizar inventario_niveles (stock_anterior + recibido)
      if (nivelActual) {
        await supabase
          .from('inventario_niveles')
          .update({ on_hand: stockPosterior, updated_at: new Date().toISOString() })
          .eq('id', nivelActual.id);
      } else {
        await supabase
          .from('inventario_niveles')
          .insert({ articulo_id: receivingOrder.articulo_id, on_hand: qtyRecibida, reservado: 0 });
      }

      // 4. Sincronizar inventario.cantidad_articulo
      const { data: invItem } = await supabase
        .from('inventario')
        .select('id_articulo, cantidad_articulo')
        .eq('id_articulo', receivingOrder.articulo_id)
        .maybeSingle();
      if (invItem) {
        await supabase
          .from('inventario')
          .update({ cantidad_articulo: Number(invItem.cantidad_articulo || 0) + qtyRecibida })
          .eq('id_articulo', receivingOrder.articulo_id);
      }

      // 5. Registrar movimiento con stock_anterior y stock_posterior
      await supabase.from('inventario_movimientos').insert({
        articulo_id: receivingOrder.articulo_id,
        tipo: 'compra',
        cantidad: qtyRecibida,
        stock_anterior: stockAnterior,
        stock_posterior: stockPosterior,
        referencia_type: 'replenishment_order',
        referencia_id: receivingOrder.id,
        notas: `Reabastecimiento — Orden #${receivingOrder.id} · Esta recepción: ${qtyRecibida} uds. · Total acumulado: ${nuevaQtyRecibida}/${receivingOrder.qty_sugerida}`,
        usuario_id: user?.id || null
      });

      setShowReceiveModal(false);
      setReceivingOrder(null);
      onRefresh();
      window.dispatchEvent(new CustomEvent('replenishment-updated'));

      const qtyPendiente = receivingOrder.qty_sugerida - nuevaQtyRecibida;
      const msg = esCompleto
        ? `Reabastecimiento completo. ${qtyRecibida} uds. ingresadas. Orden cerrada.`
        : `Recepción parcial registrada. ${qtyRecibida} uds. ingresadas. Quedan ${qtyPendiente} uds. pendientes en esta orden.`;
      showAlert(msg);
    } catch (err: any) {
      console.error('Error registrando recepción:', err);
      showAlert('Error al registrar la recepción');
    } finally {
      setReceivingLoading(false);
    }
  };

  // ─── Reporte de movimientos ───────────────────────────────────────────────

  const handleOpenReport = async (order: ReplenishmentOrder) => {
    setReportOrder(order);
    setShowReportModal(true);
    setReportLoading(true);
    try {
      const { data } = await supabase
        .from('inventario_movimientos')
        .select('*')
        .eq('referencia_type', 'replenishment_order')
        .eq('referencia_id', order.id)
        .order('created_at', { ascending: false });
      setReportMovimientos(data || []);
    } catch {
      setReportMovimientos([]);
    } finally {
      setReportLoading(false);
    }
  };

  const handleExportReport = () => {
    if (!reportOrder) return;
    const header = [
      [`REPORTE DE REABASTECIMIENTO — Orden #${reportOrder.id}`],
      [`Artículo: ${reportOrder.inventario?.codigo_articulo} — ${reportOrder.inventario?.descripcion_articulo}`],
      [`Fecha generación: ${new Date(reportOrder.created_at).toLocaleString()}`],
      [`Cantidad solicitada: ${reportOrder.qty_sugerida}`],
      [`Cantidad recibida: ${reportOrder.qty_recibida ?? 'N/A'}`],
      [`Estado: ${getEstadoInfo(reportOrder.estado).label}`],
      [],
      ['Fecha', 'Hora', 'Tipo', 'Cantidad', 'Notas'],
    ];
    const rows = reportMovimientos.map(m => [
      new Date(m.created_at).toLocaleDateString(),
      new Date(m.created_at).toLocaleTimeString(),
      m.tipo,
      m.cantidad,
      m.notas || ''
    ]);
    const totalRecibido = reportMovimientos.reduce((s, m) => s + Number(m.cantidad), 0);
    rows.push(['', '', 'TOTAL', totalRecibido, '']);

    const ws = XLSX.utils.aoa_to_sheet([...header, ...rows]);
    ws['!cols'] = [{ wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 50 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
    XLSX.writeFile(wb, `reporte_orden_${reportOrder.id}_${reportOrder.inventario?.codigo_articulo || ''}.xlsx`);
  };

  // ─── Eliminar ─────────────────────────────────────────────────────────────

  const handleDelete = async (orderId: number) => {
    if (!(await showConfirm('¿Eliminar esta orden?', { type: 'danger', title: 'Eliminar orden' }))) return;
    try {
      const { error } = await supabase.from('replenishment_orders').delete().eq('id', orderId);
      if (error) throw error;
      onRefresh();
      showAlert('Orden eliminada');
    } catch { showAlert('Error al eliminar la orden'); }
  };

  // ─── Acciones masivas ─────────────────────────────────────────────────────

  const handleMassiveChangeEstado = async (nuevoEstado: string) => {
    if (selectedItems.length === 0) { showAlert('Selecciona al menos una orden'); return; }
    if (!(await showConfirm(`¿Cambiar ${selectedItems.length} órdenes a "${nuevoEstado}"?`, { type: 'warning', title: 'Cambio masivo' }))) return;
    try {
      setLoading(true);
      const { error } = await supabase
        .from('replenishment_orders')
        .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
        .in('id', selectedItems);
      if (error) throw error;
      setSelectedItems([]);
      onRefresh();
      showAlert(`${selectedItems.length} órdenes actualizadas`);
    } catch { showAlert('Error al cambiar estados'); }
    finally { setLoading(false); }
  };

  const handleMassiveDelete = async () => {
    if (selectedItems.length === 0) { showAlert('Selecciona al menos una orden'); return; }
    if (!(await showConfirm(`¿Eliminar ${selectedItems.length} órdenes?`, { type: 'danger', title: 'Eliminar órdenes' }))) return;
    try {
      setLoading(true);
      const { error } = await supabase.from('replenishment_orders').delete().in('id', selectedItems);
      if (error) throw error;
      setSelectedItems([]);
      onRefresh();
      showAlert(`${selectedItems.length} órdenes eliminadas`);
    } catch { showAlert('Error al eliminar'); }
    finally { setLoading(false); }
  };

  // ─── Notas ────────────────────────────────────────────────────────────────

  const handleSaveNotes = async (notas: string) => {
    if (!editingOrder) return;
    try {
      const { error } = await supabase
        .from('replenishment_orders')
        .update({ notas, updated_at: new Date().toISOString() })
        .eq('id', editingOrder.id);
      if (error) throw error;
      setShowNotesModal(false);
      setEditingOrder(null);
      onRefresh();
    } catch { showAlert('Error al guardar notas'); }
  };

  // ─── Excel general ────────────────────────────────────────────────────────

  const handleExportExcel = () => {
    try {
      const data = filteredOrders.map(o => ({
        'Fecha': new Date(o.created_at).toLocaleDateString(),
        'Código': o.inventario?.codigo_articulo || '',
        'Descripción': o.inventario?.descripcion_articulo || '',
        'Solicitada': o.qty_sugerida,
        'Recibida': o.qty_recibida ?? '',
        'Motivo': getMotivoInfo(o.motivo).label,
        'Estado': getEstadoInfo(o.estado).label,
        'Notas': o.notas || ''
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Reabastecimiento');
      XLSX.writeFile(wb, `ordenes_reabastecimiento_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch { showAlert('Error al exportar'); }
  };

  // ─── Filtros ──────────────────────────────────────────────────────────────

  const filteredOrders = safeOrders.filter(o => {
    // Las órdenes completadas ya no aparecen aquí — están en la pestaña Movimientos
    if (o.estado === 'completada') return false;

    const matchSearch =
      o.inventario?.codigo_articulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.inventario?.descripcion_articulo?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchSearch) return false;
    if (filtroEstado !== 'todos' && o.estado !== filtroEstado) return false;
    if (filtroMotivo !== 'todos' && o.motivo !== filtroMotivo) return false;
    return true;
  });

  const handleSelectAll = (checked: boolean) =>
    setSelectedItems(checked ? filteredOrders.map(o => o.id) : []);
  const handleSelectItem = (id: number, checked: boolean) =>
    setSelectedItems(prev => checked ? [...prev, id] : prev.filter(i => i !== id));

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-6">

      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Órdenes de Reabastecimiento</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Al completar una orden parcialmente se genera automáticamente la Pendiente por el faltante
          </p>
        </div>
        <button onClick={handleExportExcel}
          className="flex items-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap cursor-pointer">
          <i className="ri-download-line mr-2"></i>Exportar Excel
        </button>
      </div>

      {/* Acciones masivas */}
      {selectedItems.length > 0 && (
        <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-gray-800 font-medium">{selectedItems.length} órdenes seleccionadas</span>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => handleMassiveChangeEstado('emitida')} disabled={loading}
                className="flex items-center px-2 py-1 bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors disabled:opacity-50 text-sm whitespace-nowrap cursor-pointer">
                <i className="ri-send-plane-line mr-1"></i>Emitir
              </button>
              <button onClick={() => handleMassiveChangeEstado('cancelada')} disabled={loading}
                className="flex items-center px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50 text-sm whitespace-nowrap cursor-pointer">
                <i className="ri-close-line mr-1"></i>Cancelar
              </button>
              <button onClick={handleMassiveDelete} disabled={loading}
                className="flex items-center px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors disabled:opacity-50 text-sm whitespace-nowrap cursor-pointer">
                <i className="ri-delete-bin-line mr-1"></i>Eliminar
              </button>
              <button onClick={() => setSelectedItems([])}
                className="flex items-center px-2 py-1 bg-white border border-gray-300 text-gray-600 rounded hover:bg-gray-50 transition-colors text-sm whitespace-nowrap cursor-pointer">
                <i className="ri-close-line mr-1"></i>Cancelar selección
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <input type="text" placeholder="Buscar por código o descripción..."
          value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent" />
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent">
          <option value="todos">Todos los estados</option>
          <option value="borrador">⏳ Pendiente</option>
          <option value="emitida">🚚 Emitida</option>
          <option value="cancelada">❌ Cancelada</option>
        </select>
        <select value={filtroMotivo} onChange={e => setFiltroMotivo(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent">
          <option value="todos">Todos los motivos</option>
          <option value="below_min">🔴 Bajo Mínimo</option>
          <option value="below_rop">🟡 Bajo ROP</option>
        </select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Pendientes', count: safeOrders.filter(o => o.estado === 'borrador').length, icon: 'ri-time-line', bg: 'bg-orange-50', text: 'text-orange-700' },
          { label: 'Emitidas', count: safeOrders.filter(o => o.estado === 'emitida').length, icon: 'ri-send-plane-line', bg: 'bg-amber-50', text: 'text-amber-700' },
          { label: 'Completadas', count: safeOrders.filter(o => o.estado === 'completada').length, icon: 'ri-check-double-line', bg: 'bg-green-50', text: 'text-green-700' },
          { label: 'Total órdenes', count: safeOrders.length, icon: 'ri-shopping-cart-line', bg: 'bg-gray-50', text: 'text-gray-700' },
        ].map(({ label, count, icon, bg, text }) => (
          <div key={label} className={`${bg} p-4 rounded-lg`}>
            <div className="flex items-center gap-2 mb-1">
              <i className={`${icon} ${text} text-sm`}></i>
              <span className={`text-sm font-medium ${text}`}>{label}</span>
            </div>
            <p className={`text-2xl font-bold ${text}`}>{count}</p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">
                <input type="checkbox"
                  checked={selectedItems.length === filteredOrders.length && filteredOrders.length > 0}
                  onChange={e => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300" />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Artículo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Motivo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredOrders.map(order => {
              const estadoInfo = getEstadoInfo(order.estado);
              const motivoInfo = getMotivoInfo(order.motivo);
              const esParcial = order.estado === 'completada' && order.qty_recibida != null && order.qty_recibida < order.qty_sugerida;

              return (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <input type="checkbox" checked={selectedItems.includes(order.id)}
                      onChange={e => handleSelectItem(order.id, e.target.checked)}
                      className="rounded border-gray-300" />
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(order.created_at).toLocaleDateString()}
                    <div className="text-xs text-gray-400">{new Date(order.created_at).toLocaleTimeString()}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm font-medium text-gray-900">{order.inventario?.codigo_articulo}</div>
                    <div className="text-xs text-gray-500 max-w-xs truncate">{order.inventario?.descripcion_articulo}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <div className="flex flex-col">
                      {order.estado === 'completada' && order.qty_recibida != null ? (
                        <span className="font-medium text-gray-900">
                          {order.qty_recibida} <span className="text-xs text-gray-400">recibidas</span>
                        </span>
                      ) : (
                        <span className="font-medium text-gray-900">
                          {order.qty_sugerida} <span className="text-xs text-gray-400">solicitadas</span>
                        </span>
                      )}
                      {esParcial && (
                        <span className="text-xs text-amber-600 font-medium">
                          Parcial ({order.qty_recibida}/{order.qty_sugerida})
                        </span>
                      )}
                      {order.estado === 'completada' && order.qty_recibida === order.qty_sugerida && (
                        <span className="text-xs text-green-600 font-medium">Completo</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center text-xs font-medium ${motivoInfo.color}`}>
                      <i className={`${motivoInfo.icon} mr-1`}></i>{motivoInfo.label}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${estadoInfo.color}`}>
                      <i className={`${estadoInfo.icon} ${estadoInfo.iconColor} mr-1 text-xs`}></i>
                      {estadoInfo.label}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-1">
                      {order.estado === 'borrador' && (
                        <button onClick={() => handleEmitir(order.id)}
                          className="w-7 h-7 flex items-center justify-center text-amber-600 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                          title="Emitir orden">
                          <i className="ri-send-plane-line text-base"></i>
                        </button>
                      )}
                      {order.estado === 'emitida' && (
                        <button onClick={() => handleOpenReceive(order)}
                          className="w-7 h-7 flex items-center justify-center text-green-600 hover:bg-green-50 rounded transition-colors cursor-pointer"
                          title="Registrar recepción">
                          <i className="ri-archive-line text-base"></i>
                        </button>
                      )}
                      {/* Reporte: disponible para completadas */}
                      {order.estado === 'completada' && (
                        <button onClick={() => handleOpenReport(order)}
                          className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                          title="Ver reporte de movimientos">
                          <i className="ri-file-chart-line text-base"></i>
                        </button>
                      )}
                      <button onClick={() => { setEditingOrder(order); setShowNotesModal(true); }}
                        className="w-7 h-7 flex items-center justify-center text-gray-400 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                        title="Notas">
                        <i className="ri-sticky-note-line text-base"></i>
                      </button>
                      <button onClick={() => handleDelete(order.id)}
                        className="w-7 h-7 flex items-center justify-center text-red-400 hover:bg-red-50 rounded transition-colors cursor-pointer"
                        title="Eliminar">
                        <i className="ri-delete-bin-line text-base"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredOrders.length === 0 && (
        <div className="text-center py-12">
          <i className="ri-check-double-line text-4xl text-gray-300 block mb-3"></i>
          <p className="text-gray-500 text-sm font-medium">No hay órdenes activas</p>
          <p className="text-gray-400 text-xs mt-1">Las órdenes completadas se registran en la pestaña <strong>Movimientos</strong></p>
        </div>
      )}

      {/* ══ MODAL: Registrar Recepción ══════════════════════════════════════ */}
      {showReceiveModal && receivingOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Registrar Recepción</h3>
                <p className="text-sm text-gray-500 mt-0.5">Indica las unidades realmente recibidas</p>
              </div>
              <button onClick={() => { setShowReceiveModal(false); setReceivingOrder(null); }}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded cursor-pointer">
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Artículo</div>
                <div className="font-semibold text-gray-900">{receivingOrder.inventario?.codigo_articulo}</div>
                <div className="text-sm text-gray-600">{receivingOrder.inventario?.descripcion_articulo}</div>
              </div>
              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
                <span className="text-sm text-amber-800 font-medium">
                  <i className="ri-file-list-3-line mr-1"></i>Cantidad solicitada
                </span>
                <span className="text-lg font-bold text-amber-900">{receivingOrder.qty_sugerida}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cantidad recibida <span className="text-red-500">*</span>
                </label>
                <input type="number" min={0.01} max={receivingOrder.qty_sugerida} step={0.01}
                  value={qtyRecibida}
                  onChange={e => setQtyRecibida(Math.min(parseFloat(e.target.value) || 0, receivingOrder.qty_sugerida))}
                  className="w-full px-4 py-3 text-xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 text-center"
                  autoFocus />
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-gray-400">Mínimo: 0.01</span>
                  <span className="text-xs text-gray-400">Máximo: {receivingOrder.qty_sugerida}</span>
                </div>
                {qtyRecibida > 0 && qtyRecibida < receivingOrder.qty_sugerida && (
                  <div className="mt-2 flex items-start text-amber-700 text-xs bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                    <i className="ri-information-line mr-1.5 mt-0.5 flex-shrink-0"></i>
                    <span>
                      Recepción parcial — se crearán automáticamente <strong>{receivingOrder.qty_sugerida - qtyRecibida}</strong> unidades como nueva orden Pendiente
                    </span>
                  </div>
                )}
              </div>
              {/* Impacto en inventario */}
              {qtyRecibida > 0 && (
                <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                  <div className="text-xs text-green-700 font-medium mb-1">
                    <i className="ri-arrow-up-circle-line mr-1"></i>Impacto en inventario
                  </div>
                  <p className="text-sm text-green-800">
                    Se sumarán <strong>{qtyRecibida}</strong> uds. al stock · Total acumulado en esta orden: <strong>{(Number(receivingOrder.qty_recibida) || 0) + qtyRecibida}/{receivingOrder.qty_sugerida}</strong>
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={() => { setShowReceiveModal(false); setReceivingOrder(null); }}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap cursor-pointer">
                Cancelar
              </button>
              <button onClick={handleConfirmReceive} disabled={receivingLoading || qtyRecibida <= 0}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer">
                {receivingLoading
                  ? <><i className="ri-loader-4-line animate-spin mr-1"></i>Procesando...</>
                  : <><i className="ri-check-line mr-1"></i>Confirmar Recepción</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: Reporte de Movimientos ═══════════════════════════════════ */}
      {showReportModal && reportOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Reporte — Orden #{reportOrder.id}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {reportOrder.inventario?.codigo_articulo} · {reportOrder.inventario?.descripcion_articulo}
                </p>
              </div>
              <button onClick={() => setShowReportModal(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded cursor-pointer">
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            {/* Resumen */}
            <div className="px-6 pt-4 pb-2 grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">Solicitado</div>
                <div className="text-lg font-bold text-gray-900">{reportOrder.qty_sugerida}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <div className="text-xs text-green-600 mb-1">Recibido</div>
                <div className="text-lg font-bold text-green-700">{reportOrder.qty_recibida ?? '—'}</div>
              </div>
              <div className={`rounded-lg p-3 text-center ${reportOrder.qty_recibida != null && reportOrder.qty_recibida < reportOrder.qty_sugerida ? 'bg-amber-50' : 'bg-gray-50'}`}>
                <div className="text-xs text-gray-500 mb-1">Pendiente</div>
                <div className={`text-lg font-bold ${reportOrder.qty_recibida != null && reportOrder.qty_recibida < reportOrder.qty_sugerida ? 'text-amber-700' : 'text-gray-900'}`}>
                  {reportOrder.qty_recibida != null ? Math.max(0, reportOrder.qty_sugerida - reportOrder.qty_recibida) : reportOrder.qty_sugerida}
                </div>
              </div>
            </div>

            {/* Tabla movimientos */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="text-sm font-semibold text-gray-700 mb-3">
                <i className="ri-history-line mr-1"></i>Movimientos registrados
              </div>
              {reportLoading ? (
                <div className="flex items-center justify-center py-8">
                  <i className="ri-loader-4-line animate-spin text-2xl text-gray-400 mr-2"></i>
                  <span className="text-gray-500 text-sm">Cargando movimientos...</span>
                </div>
              ) : reportMovimientos.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <i className="ri-file-list-3-line text-3xl text-gray-300 block mb-2"></i>
                  <p className="text-sm text-gray-500">No hay movimientos registrados para esta orden</p>
                </div>
              ) : (
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                        <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Notas</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportMovimientos.map(mov => (
                        <tr key={mov.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                            {new Date(mov.created_at).toLocaleDateString()}
                            <div className="text-xs text-gray-400">{new Date(mov.created_at).toLocaleTimeString()}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 capitalize">
                              {mov.tipo}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">
                            +{mov.cantidad}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 max-w-xs">{mov.notas || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                      <tr>
                        <td colSpan={2} className="px-4 py-2.5 text-right text-xs font-bold text-gray-700 uppercase">Total recibido</td>
                        <td className="px-4 py-2.5 text-right font-bold text-green-700">
                          +{reportMovimientos.reduce((s, m) => s + Number(m.cantidad), 0)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 pt-0 border-t border-gray-100">
              <button onClick={() => setShowReportModal(false)}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap">
                Cerrar
              </button>
              <button onClick={handleExportReport} disabled={reportMovimientos.length === 0}
                className="flex items-center px-4 py-2 text-sm text-white bg-gray-700 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-40 cursor-pointer whitespace-nowrap">
                <i className="ri-download-line mr-2"></i>Exportar Reporte
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: Notas ════════════════════════════════════════════════════ */}
      {showNotesModal && editingOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Notas de la orden</h3>
              <button onClick={() => setShowNotesModal(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded cursor-pointer">
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-500 mb-3">Orden #{editingOrder.id} — {editingOrder.inventario?.codigo_articulo}</p>
              <textarea ref={notesRef} defaultValue={editingOrder.notas || ''}
                placeholder="Escribe notas sobre esta orden..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent resize-none"
                rows={4} />
            </div>
            <div className="flex justify-end gap-3 p-6 pt-0">
              <button onClick={() => setShowNotesModal(false)}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap">
                Cancelar
              </button>
              <button onClick={() => handleSaveNotes(notesRef.current?.value || '')}
                className="px-4 py-2 text-sm text-white bg-gray-700 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer whitespace-nowrap">
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
