import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import * as XLSX from 'xlsx';

interface Movimiento {
  id: number;
  articulo_id: number;
  tipo: string;
  cantidad: number;
  stock_anterior: number | null;
  stock_posterior: number | null;
  referencia_type: string | null;
  referencia_id: number | null;
  notas: string | null;
  usuario_id: string | null;
  created_at: string;
  inventario?: { codigo_articulo: string; descripcion_articulo: string };
  usuarios?: { nombre_completo: string; email: string } | null;
}

const TIPOS_MOVIMIENTO = [
  { value: 'compra',      label: 'Compra / Entrada',     icon: 'ri-arrow-down-circle-line',    color: 'text-green-700',  bg: 'bg-green-100',  signo: '+' },
  { value: 'venta',       label: 'Venta / Salida',        icon: 'ri-arrow-up-circle-line',      color: 'text-red-700',    bg: 'bg-red-100',    signo: '-' },
  { value: 'ajuste',      label: 'Ajuste Manual',         icon: 'ri-equalizer-line',            color: 'text-amber-700',  bg: 'bg-amber-100',  signo: '±' },
  { value: 'reserva',     label: 'Reserva',               icon: 'ri-lock-line',                 color: 'text-orange-700', bg: 'bg-orange-100', signo: '-' },
  { value: 'liberacion',  label: 'Liberación de Reserva', icon: 'ri-lock-unlock-line',          color: 'text-teal-700',   bg: 'bg-teal-100',   signo: '+' },
  { value: 'merma',       label: 'Merma / Pérdida',       icon: 'ri-error-warning-line',        color: 'text-rose-700',   bg: 'bg-rose-100',   signo: '-' },
  { value: 'traslado',    label: 'Traslado',              icon: 'ri-exchange-line',             color: 'text-violet-700', bg: 'bg-violet-100', signo: '→' },
  { value: 'devolucion',  label: 'Devolución',            icon: 'ri-arrow-go-back-line',        color: 'text-cyan-700',   bg: 'bg-cyan-100',   signo: '+' },
  { value: 'eliminacion', label: 'Eliminación',           icon: 'ri-delete-bin-line',           color: 'text-gray-700',   bg: 'bg-gray-100',   signo: '−' },
];

function getTipoInfo(tipo: string, cantidad: number) {
  const found = TIPOS_MOVIMIENTO.find(t => t.value === tipo);
  if (found) return found;
  // fallback by sign
  return cantidad >= 0
    ? { label: tipo, icon: 'ri-add-circle-line', color: 'text-green-700', bg: 'bg-green-100', signo: '+' }
    : { label: tipo, icon: 'ri-subtract-line',   color: 'text-red-700',   bg: 'bg-red-100',   signo: '-' };
}

function getReferenciaBadge(type: string | null, id: number | null) {
  if (!type || !id) return null;
  const labels: Record<string, string> = {
    replenishment_order: `Orden #${id}`,
    cotizacion: `Cotización #${id}`,
    pedido: `Pedido #${id}`,
    ajuste_manual: `Ajuste #${id}`,
  };
  return labels[type] || `${type} #${id}`;
}

export default function MovimientosInventario() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [fechaDesde, setFechaDesde] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [fechaHasta, setFechaHasta] = useState(() => new Date().toISOString().split('T')[0]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const loadMovimientos = useCallback(async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('inventario_movimientos')
        .select(`
          *,
          inventario!inner(codigo_articulo, descripcion_articulo),
          usuarios(nombre_completo, email)
        `)
        .gte('created_at', `${fechaDesde}T00:00:00`)
        .lte('created_at', `${fechaHasta}T23:59:59`)
        .order('created_at', { ascending: false })
        .limit(500);

      if (filtroTipo !== 'todos') {
        query = query.eq('tipo', filtroTipo);
      }

      const { data, error } = await query;
      if (error) throw error;
      setMovimientos(data || []);
      setPage(1);
    } catch (err) {
      console.error('Error cargando movimientos:', err);
    } finally {
      setLoading(false);
    }
  }, [fechaDesde, fechaHasta, filtroTipo]);

  useEffect(() => { loadMovimientos(); }, [loadMovimientos]);

  // También recargar cuando llegue evento de reabastecimiento
  useEffect(() => {
    const handler = () => loadMovimientos();
    window.addEventListener('replenishment-updated', handler);
    return () => window.removeEventListener('replenishment-updated', handler);
  }, [loadMovimientos]);

  // ── Filtrado local por búsqueda ─────────────────────────────────────────
  const filtered = movimientos.filter(m => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      m.inventario?.codigo_articulo?.toLowerCase().includes(q) ||
      m.inventario?.descripcion_articulo?.toLowerCase().includes(q) ||
      m.usuarios?.nombre_completo?.toLowerCase().includes(q) ||
      m.notas?.toLowerCase().includes(q)
    );
  });

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  // ── KPIs ────────────────────────────────────────────────────────────────
  const totalEntradas = movimientos.filter(m => Number(m.cantidad) > 0).reduce((s, m) => s + Number(m.cantidad), 0);
  const totalSalidas  = movimientos.filter(m => Number(m.cantidad) < 0).reduce((s, m) => s + Number(m.cantidad), 0);
  const tiposUnicos   = [...new Set(movimientos.map(m => m.tipo))].length;

  // ── Excel ───────────────────────────────────────────────────────────────
  const handleExport = () => {
    const data = filtered.map(m => ({
      'Fecha':           new Date(m.created_at).toLocaleDateString('es-CR'),
      'Hora':            new Date(m.created_at).toLocaleTimeString('es-CR'),
      'Código':          m.inventario?.codigo_articulo || '',
      'Descripción':     m.inventario?.descripcion_articulo || '',
      'Tipo':            getTipoInfo(m.tipo, m.cantidad).label,
      'Cantidad':        m.cantidad,
      'Stock Anterior':  m.stock_anterior ?? '',
      'Stock Posterior': m.stock_posterior ?? '',
      'Usuario':         m.usuarios?.nombre_completo || m.usuario_id || 'Sistema',
      'Referencia':      getReferenciaBadge(m.referencia_type, m.referencia_id) || '',
      'Notas':           m.notas || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 35 }, { wch: 20 },
      { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 22 }, { wch: 16 }, { wch: 40 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');
    XLSX.writeFile(wb, `movimientos_inventario_${fechaDesde}_${fechaHasta}.xlsx`);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Historial de Movimientos</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Registro completo de entradas, salidas y ajustes de inventario
          </p>
        </div>
        <button onClick={handleExport}
          className="flex items-center px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors whitespace-nowrap cursor-pointer text-sm">
          <i className="ri-download-line mr-2"></i>Exportar Excel
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <i className="ri-arrow-down-circle-line text-green-600 text-sm"></i>
            <span className="text-sm font-medium text-green-700">Total Entradas</span>
          </div>
          <p className="text-2xl font-bold text-green-800">+{totalEntradas.toLocaleString('es-CR', { maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <i className="ri-arrow-up-circle-line text-red-600 text-sm"></i>
            <span className="text-sm font-medium text-red-700">Total Salidas</span>
          </div>
          <p className="text-2xl font-bold text-red-800">{totalSalidas.toLocaleString('es-CR', { maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <i className="ri-history-line text-gray-600 text-sm"></i>
            <span className="text-sm font-medium text-gray-700">Total Registros</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{filtered.length}</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <i className="ri-equalizer-line text-amber-600 text-sm"></i>
            <span className="text-sm font-medium text-amber-700">Tipos de Mov.</span>
          </div>
          <p className="text-2xl font-bold text-amber-800">{tiposUnicos}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Buscar artículo o usuario</label>
            <input type="text" placeholder="Código, descripción, usuario..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de movimiento</label>
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent">
              <option value="todos">Todos los tipos</option>
              {TIPOS_MOVIMIENTO.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
            <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
            <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent" />
          </div>
        </div>
      </div>

      {/* Leyenda de tipos */}
      <div className="flex flex-wrap gap-2">
        {TIPOS_MOVIMIENTO.map(t => (
          <button key={t.value}
            onClick={() => setFiltroTipo(filtroTipo === t.value ? 'todos' : t.value)}
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-all ${
              filtroTipo === t.value ? `${t.bg} ${t.color} ring-2 ring-offset-1 ring-current` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            <i className={`${t.icon} mr-1`}></i>{t.label}
          </button>
        ))}
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <i className="ri-loader-4-line animate-spin text-3xl text-gray-400 mr-3"></i>
          <span className="text-gray-500">Cargando movimientos...</span>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Fecha / Hora</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Artículo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Tipo</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Cantidad</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Stock Anterior</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Stock Posterior</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Usuario</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Referencia</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Notas</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {paginated.map(mov => {
                  const tipoInfo = getTipoInfo(mov.tipo, mov.cantidad);
                  const isEntrada = Number(mov.cantidad) > 0;
                  const refLabel = getReferenciaBadge(mov.referencia_type, mov.referencia_id);

                  return (
                    <tr key={mov.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-gray-900 font-medium">{new Date(mov.created_at).toLocaleDateString('es-CR')}</div>
                        <div className="text-xs text-gray-400">{new Date(mov.created_at).toLocaleTimeString('es-CR')}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 whitespace-nowrap">{mov.inventario?.codigo_articulo}</div>
                        <div className="text-xs text-gray-500 max-w-xs truncate">{mov.inventario?.descripcion_articulo}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${tipoInfo.bg} ${tipoInfo.color}`}>
                          <i className={`${tipoInfo.icon} mr-1`}></i>
                          {tipoInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className={`text-base font-bold ${isEntrada ? 'text-green-700' : 'text-red-700'}`}>
                          {isEntrada ? '+' : ''}{Number(mov.cantidad).toLocaleString('es-CR', { maximumFractionDigits: 3 })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap text-gray-600 font-mono text-xs">
                        {mov.stock_anterior != null
                          ? Number(mov.stock_anterior).toLocaleString('es-CR', { maximumFractionDigits: 3 })
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap font-mono text-xs">
                        {mov.stock_posterior != null ? (
                          <span className={`font-semibold ${Number(mov.stock_posterior) > 0 ? 'text-gray-800' : 'text-red-600'}`}>
                            {Number(mov.stock_posterior).toLocaleString('es-CR', { maximumFractionDigits: 3 })}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded-full">
                            <i className="ri-user-line text-xs text-gray-500"></i>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-gray-800">
                              {mov.usuarios?.nombre_completo || 'Sistema'}
                            </div>
                            {mov.usuarios?.email && (
                              <div className="text-xs text-gray-400 truncate max-w-24">{mov.usuarios.email}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {refLabel && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            <i className="ri-link-m mr-1"></i>{refLabel}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-500 max-w-xs block truncate" title={mov.notas || ''}>
                          {mov.notas || '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">
                Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length} registros
              </span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 cursor-pointer whitespace-nowrap">
                  <i className="ri-arrow-left-s-line"></i> Anterior
                </button>
                <span className="px-3 py-1.5 text-sm text-gray-700">{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 cursor-pointer whitespace-nowrap">
                  Siguiente <i className="ri-arrow-right-s-line"></i>
                </button>
              </div>
            </div>
          )}

          {filtered.length === 0 && !loading && (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <i className="ri-history-line text-4xl text-gray-300 block mb-3"></i>
              <p className="text-gray-500 font-medium">No hay movimientos en el rango seleccionado</p>
              <p className="text-gray-400 text-sm mt-1">Ajusta los filtros o el rango de fechas</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
