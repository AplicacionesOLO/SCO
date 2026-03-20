import { useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useNotification } from '../../../hooks/useNotification';
import { BuscarClienteModal } from '../../clientes/components/BuscarClienteModal';
import BuscadorArticuloBlur from './BuscadorArticuloBlur';
import { Cliente } from '../../../types/cliente';
import { ResultadoOptimizacion, PiezaCorte } from '../../../types/optimizador';
import { CotizacionService } from '../../../services/cotizacionService';
import { useNavigate } from 'react-router-dom';
// 🆕 Importar servicio de proyectos
import { marcarProyectoCotizado } from '../../../services/optimizadorProyectoService';
// 🔧 IMPORTAR SUPABASE
import { supabase } from '../../../lib/supabase';
import * as XLSX from 'xlsx';
// 🔧 IMPORTAR HELPER DE DESCARGA
import { downloadBlob } from '../../../utils/downloadBlob';

// 🆕 Tipo para items adicionales del inventario
interface ItemAdicional {
  id: string;
  inventario_id: number;
  codigo: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

interface CrearCotizacionModalProps {
  resultado: ResultadoOptimizacion;
  piezas: PiezaCorte[];
  proyectoId: string | null;
  onCerrar: () => void;
}

export default function CrearCotizacionModal({ 
  resultado, 
  piezas,
  proyectoId,
  onCerrar 
}: CrearCotizacionModalProps) {
  const { currentStore } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [mostrarBuscarCliente, setMostrarBuscarCliente] = useState(false);
  const [loading, setLoading] = useState(false);
  const [moneda, setMoneda] = useState('CRC');
  const [tipoCambio, setTipoCambio] = useState(520);
  const [margenUtilidad, setMargenUtilidad] = useState(20);
  const [diasVencimiento, setDiasVencimiento] = useState(15);
  const [notasAdicionales, setNotasAdicionales] = useState('');
  
  // 🆕 Estado para items adicionales del inventario
  const [itemsAdicionales, setItemsAdicionales] = useState<ItemAdicional[]>([]);

  const handleSeleccionarCliente = (cliente: Cliente) => {
    if (!cliente || !cliente.id) {
      showNotification('error', 'Cliente seleccionado inválido');
      return;
    }
    console.log('✅ Cliente seleccionado:', cliente);
    setClienteSeleccionado(cliente);
    setMostrarBuscarCliente(false);
  };

  // 🆕 Agregar item adicional del inventario
  const handleAgregarItemAdicional = (articulo: any) => {
    const nuevoItem: ItemAdicional = {
      id: Math.random().toString(36).substr(2, 9),
      inventario_id: articulo.id,
      codigo: articulo.codigo_articulo,
      descripcion: articulo.descripcion_articulo,
      cantidad: 1,
      precio_unitario: articulo.precio_unitario || 0,
      subtotal: articulo.precio_unitario || 0
    };
    setItemsAdicionales([...itemsAdicionales, nuevoItem]);
    showNotification('success', 'Item agregado');
  };

  // 🆕 Actualizar cantidad de item adicional
  const handleActualizarCantidadItem = (itemId: string, nuevaCantidad: number) => {
    setItemsAdicionales(itemsAdicionales.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          cantidad: nuevaCantidad,
          subtotal: nuevaCantidad * item.precio_unitario
        };
      }
      return item;
    }));
  };

  // 🆕 Actualizar precio de item adicional
  const handleActualizarPrecioItem = (itemId: string, nuevoPrecio: number) => {
    setItemsAdicionales(itemsAdicionales.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          precio_unitario: nuevoPrecio,
          subtotal: item.cantidad * nuevoPrecio
        };
      }
      return item;
    }));
  };

  // 🆕 Eliminar item adicional
  const handleEliminarItemAdicional = (itemId: string) => {
    setItemsAdicionales(itemsAdicionales.filter(item => item.id !== itemId));
    showNotification('success', 'Item eliminado');
  };

  const calcularPrecioConMargen = (costo: number) => {
    if (typeof costo !== 'number' || isNaN(costo) || costo < 0) {
      return 0;
    }
    if (margenUtilidad >= 100) {
      showNotification('warning', 'El margen de utilidad no puede ser 100% o mayor');
      return costo;
    }
    return costo / (1 - margenUtilidad / 100);
  };

  const formatCurrency = (value: number, currency: string) => {
    const symbol = currency === 'CRC' ? '₡' : '$';
    return `${symbol}${value.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // 🔧 FUNCIÓN CORREGIDA: Crear cotización con exportación INLINE
  const handleCrearCotizacion = () => {
    if (!clienteSeleccionado) {
      showNotification('error', 'Debes seleccionar un cliente');
      return;
    }

    if (!currentStore) {
      showNotification('error', 'No hay tienda seleccionada');
      return;
    }

    if (!resultado) {
      showNotification('error', 'No hay resultado de optimización');
      return;
    }

    setLoading(true);

    // ✅ 1️⃣ EXPORTAR EXCEL INMEDIATAMENTE (INLINE, SIN AWAIT, SIN FUNCIÓN EXTERNA)
    console.log('📥 [CREAR COT] Exportando Excel automáticamente...');
    
    try {
      // Crear workbook
      const wb = XLSX.utils.book_new();

      // Hoja 1: Resumen
      const resumenData = [
        ['RESUMEN DE OPTIMIZACIÓN'],
        [''],
        ['Lámina Base', resultado.laminaBase?.nombre || 'N/A'],
        ['Dimensiones', `${resultado.laminaBase?.ancho || 0} x ${resultado.laminaBase?.largo || 0} mm`],
        [''],
        ['Total de Piezas', resultado.piezas.length],
        ['Láminas Utilizadas', resultado.laminas.length],
        ['Eficiencia Promedio', `${resultado.eficienciaPromedio.toFixed(2)}%`],
        ['Desperdicio Total', `${resultado.desperdicioTotal.toFixed(2)} m²`],
      ];
      const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
      XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

      // Hoja 2: Piezas
      const piezasData = resultado.piezas.map((p: any) => ({
        ID: p.id,
        Nombre: p.nombre,
        Ancho: p.ancho,
        Largo: p.largo,
        Cantidad: p.cantidad,
        'Lámina Asignada': p.laminaAsignada || 'Sin asignar',
        'Tapacanto Superior': p.tapacantoSuperior || 'No',
        'Tapacanto Inferior': p.tapacantoInferior || 'No',
        'Tapacanto Izquierdo': p.tapacantoIzquierdo || 'No',
        'Tapacanto Derecho': p.tapacantoDerecho || 'No',
      }));
      const wsPiezas = XLSX.utils.json_to_sheet(piezasData);
      XLSX.utils.book_append_sheet(wb, wsPiezas, 'Piezas');

      // Hoja 3: Láminas
      const laminasData = resultado.laminas.map((l: any, idx: number) => ({
        'Lámina': idx + 1,
        'Piezas Asignadas': l.piezas.length,
        'Eficiencia': `${l.eficiencia.toFixed(2)}%`,
        'Desperdicio': `${l.desperdicio.toFixed(2)} m²`,
      }));
      const wsLaminas = XLSX.utils.json_to_sheet(laminasData);
      XLSX.utils.book_append_sheet(wb, wsLaminas, 'Láminas');

      // 🆕 HOJA 4: Detalle Piezas (igual que "Guardar proyecto")
      console.log('📊 [CREAR COT] Preparando hoja "Detalle Piezas"...');
      
      // 🔧 CREAR ENCABEZADOS EN ESPAÑOL MANUALMENTE
      const encabezadosDetalle = [
        'Descripción',
        'Material (Código)',
        'Largo (mm)',
        'Ancho (mm)',
        'Cantidad',
        'Veta',
        'Largo Inf',
        'Largo Sup',
        'Ancho Inf',
        'Ancho Sup',
        'CNC1',
        'CNC2',
        'm² Inf',
        'Tapacanto (m)',
        'HH (Horas)',
        'Total Pieza'
      ];

      const filasDetalle = piezas.map((pieza, index) => {
        console.log(`=== DEBUG PIEZA ${index + 1} (CREAR COT) ===`);
        console.log('Descripción:', pieza.descripcion);
        console.log('Tapacantos array:', pieza.tapacantos);
        console.log('Tapacantos length:', pieza.tapacantos?.length || 0);
        
        if (pieza.tapacantos && pieza.tapacantos.length > 0) {
          pieza.tapacantos.forEach((tc, i) => {
            console.log(`TC[${i}]:`, tc);
          });
        }

        console.log('CNC1:', pieza.cnc1_codigo, 'Cantidad:', pieza.cnc1_cantidad);
        console.log('CNC2:', pieza.cnc2_codigo, 'Cantidad:', pieza.cnc2_cantidad);

        const tcSuperior = pieza.tapacantos?.find(tc => tc.lado === 'superior');
        const tcInferior = pieza.tapacantos?.find(tc => tc.lado === 'inferior');
        const tcIzquierdo = pieza.tapacantos?.find(tc => tc.lado === 'izquierdo');
        const tcDerecho = pieza.tapacantos?.find(tc => tc.lado === 'derecho');

        console.log('TC encontrados:', {
          superior: tcSuperior?.codigo || '',
          inferior: tcInferior?.codigo || '',
          izquierdo: tcIzquierdo?.codigo || '',
          derecho: tcDerecho?.codigo || ''
        });
        console.log('==================');

        // 🔧 RETORNAR ARRAY EN LUGAR DE OBJETO
        return [
          pieza.descripcion || '',
          pieza.material || '',
          pieza.largo || 0,
          pieza.ancho || 0,
          pieza.cantidad || 1,
          pieza.veta || '',
          tcInferior?.codigo || '',
          tcSuperior?.codigo || '',
          tcIzquierdo?.codigo || '',
          tcDerecho?.codigo || '',
          pieza.cnc1_codigo || '',
          pieza.cnc2_codigo || '',
          pieza.m2_inf || 0,
          pieza.tapacanto_m || 0,
          pieza.hh_horas || 0,
          pieza.total_pieza || 0
        ];
      });

      console.log('📋 [CREAR COT] Ejemplo de datos Detalle Piezas:', filasDetalle.slice(0, 2));

      // 🔧 CREAR HOJA CON ENCABEZADOS + FILAS
      const datosDetallePiezas = [encabezadosDetalle, ...filasDetalle];
      const wsDetallePiezas = XLSX.utils.aoa_to_sheet(datosDetallePiezas);
      XLSX.utils.book_append_sheet(wb, wsDetallePiezas, 'Detalle Piezas');

      // Generar nombre del archivo
      const ahora = new Date();
      const anio = ahora.getFullYear();
      const mes = String(ahora.getMonth() + 1).padStart(2, '0');
      const dia = String(ahora.getDate()).padStart(2, '0');
      
      const nombreArchivo = `SCO_Optimizacion_${anio}${mes}${dia}.xlsx`;
      
      console.log(`✅ [AUTO-EXPORT] Nombre generado: ${nombreArchivo}`);

      // Convertir a Blob y descargar INMEDIATAMENTE
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      downloadBlob(blob, nombreArchivo);
      
      console.log(`✅ [AUTO-EXPORT] Excel exportado con 4 hojas: ${nombreArchivo}`);
      showNotification('success', `Excel guardado: ${nombreArchivo}`);
      
    } catch (error) {
      console.error('❌ [AUTO-EXPORT] Error al exportar:', error);
      showNotification('error', 'Error al exportar Excel');
    }

    // ✅ 2️⃣ CREAR LA COTIZACIÓN (ASYNC, DESPUÉS DE LA DESCARGA)
    void (async () => {
      try {
        console.log('📝 [CREAR COT] Creando cotización...');

        // Preparar items de la cotización
        const items = piezas.map((pieza, index) => {
          const costoUnitario = (pieza.costoMaterial || 0) + (pieza.costoTapacantos || 0) + (pieza.costoHH || 0);
          const precioUnitario = calcularPrecioConMargen(costoUnitario);

          return {
            numero_linea: index + 1,
            inventario_id: null,
            codigo_articulo: `PIEZA-${pieza.id}`,
            descripcion_articulo: pieza.nombre || `Pieza ${pieza.largo}x${pieza.ancho}mm`,
            cantidad: 1,
            precio_unitario: precioUnitario,
            descuento_porcentaje: 0,
            subtotal: precioUnitario,
            impuesto_porcentaje: 13,
            impuesto_monto: precioUnitario * 0.13,
            total: precioUnitario * 1.13,
            notas: `Material: ${pieza.material || 'N/A'} | Veta: ${pieza.veta || 'N/A'} | ${pieza.largo}x${pieza.ancho}mm`
          };
        });

        // Agregar items adicionales del inventario
        itemsAdicionales.forEach((item, index) => {
          items.push({
            numero_linea: piezas.length + index + 1,
            inventario_id: item.inventario_id,
            codigo_articulo: item.codigo,
            descripcion_articulo: item.descripcion,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            descuento_porcentaje: 0,
            subtotal: item.subtotal,
            impuesto_porcentaje: 13,
            impuesto_monto: item.subtotal * 0.13,
            total: item.subtotal * 1.13,
            notas: 'Item adicional del inventario'
          });
        });

        const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
        const impuestos = items.reduce((sum, item) => sum + item.impuesto_monto, 0);
        const total = subtotal + impuestos;

        const cotizacionData = {
          tienda_id: currentStore,
          cliente_id: clienteSeleccionado.id,
          fecha_emision: new Date().toISOString().split('T')[0],
          fecha_vencimiento: new Date(Date.now() + diasVencimiento * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          moneda,
          tipo_cambio: moneda === 'USD' ? tipoCambio : 1,
          subtotal,
          descuento_global_porcentaje: 0,
          descuento_global_monto: 0,
          impuestos,
          total,
          estado: 'borrador',
          notas: notasAdicionales || `Cotización generada desde optimizador. Proyecto: ${proyectoId || 'N/A'}`,
          items
        };

        const nuevaCotizacion = await CotizacionService.crear(cotizacionData);

        // Marcar proyecto como cotizado (si existe)
        if (proyectoId) {
          try {
            await marcarProyectoCotizado(proyectoId, nuevaCotizacion.id);
            console.log('✅ Proyecto marcado como cotizado');
          } catch (error) {
            console.error('⚠️ Error al marcar proyecto como cotizado:', error);
          }
        }

        showNotification('success', '✅ Cotización creada exitosamente');
        
        // Navegar a la cotización creada
        setTimeout(() => {
          navigate(`/cotizaciones/${nuevaCotizacion.id}`);
        }, 500);

      } catch (error: any) {
        console.error('❌ Error al crear cotización:', error);
        showNotification('error', error.message || 'Error al crear la cotización');
      } finally {
        setLoading(false);
      }
    })();
  };

  // 🆕 Calcular preview de totales (optimizador + items adicionales)
  const costoTotal = resultado?.costo_total || 0;
  const precioTotalOptimizador = calcularPrecioConMargen(costoTotal);
  const subtotalItemsAdicionales = itemsAdicionales.reduce((sum, item) => sum + item.subtotal, 0);
  const subtotal = precioTotalOptimizador + subtotalItemsAdicionales;
  const impuestos = subtotal * 0.13;
  const totalFinal = subtotal + impuestos;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Crear Cotización desde Optimizador
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Genera una cotización con todas las piezas optimizadas + items adicionales
              </p>
            </div>
            <button
              onClick={onCerrar}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <i className="ri-close-line text-2xl"></i>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Selección de Cliente */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cliente *
              </label>
              {clienteSeleccionado ? (
                <div className="flex items-center justify-between p-4 bg-teal-50 border border-teal-200 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">
                      {clienteSeleccionado.nombre_razon_social || clienteSeleccionado.razon_social || clienteSeleccionado.nombre || 'Sin nombre'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {clienteSeleccionado.identificacion || clienteSeleccionado.cedula || 'Sin identificación'}
                    </p>
                    {clienteSeleccionado.telefono && (
                      <p className="text-xs text-gray-500 mt-1">
                        📞 {clienteSeleccionado.telefono}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setClienteSeleccionado(null)}
                    className="text-teal-600 hover:text-teal-700 text-sm font-medium whitespace-nowrap"
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setMostrarBuscarCliente(true)}
                  className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition-colors text-gray-600 hover:text-teal-600 flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <i className="ri-search-line"></i>
                  Buscar Cliente
                </button>
              )}
            </div>

            {/* 🆕 Sección de Items Adicionales del Inventario */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200">
              <h3 className="text-sm font-semibold text-purple-900 mb-3 flex items-center gap-2">
                <i className="ri-add-box-line"></i>
                Items Adicionales del Inventario
              </h3>
              
              {/* Buscador de artículos - 🔧 PASAR tiendaActual */}
              <BuscadorArticuloBlur
                onSeleccionar={handleAgregarItemAdicional}
                placeholder="Buscar artículo del inventario..."
                tiendaActual={currentStore}
              />

              {/* Tabla de items adicionales */}
              {itemsAdicionales.length > 0 && (
                <div className="mt-4 bg-white rounded-lg border border-purple-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-purple-100">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-purple-900">Código</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-purple-900">Descripción</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-purple-900 w-24">Cantidad</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-purple-900 w-32">Precio Unit.</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-purple-900 w-32">Subtotal</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-purple-900 w-16">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-100">
                      {itemsAdicionales.map((item) => (
                        <tr key={item.id} className="hover:bg-purple-50">
                          <td className="px-3 py-2 text-gray-900 font-medium">{item.codigo}</td>
                          <td className="px-3 py-2 text-gray-700">{item.descripcion}</td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="1"
                              value={item.cantidad}
                              onChange={(e) => handleActualizarCantidadItem(item.id, parseInt(e.target.value) || 1)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.precio_unitario}
                              onChange={(e) => handleActualizarPrecioItem(item.id, parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-right focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-gray-900">
                            {formatCurrency(item.subtotal, moneda)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() => handleEliminarItemAdicional(item.id)}
                              className="text-red-600 hover:text-red-700 transition-colors"
                              title="Eliminar"
                            >
                              <i className="ri-delete-bin-line"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Configuración de Moneda */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Moneda
                </label>
                <select
                  value={moneda}
                  onChange={(e) => setMoneda(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="CRC">₡ Colones (CRC)</option>
                  <option value="USD">$ Dólares (USD)</option>
                </select>
              </div>

              {moneda === 'USD' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Cambio
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={tipoCambio}
                    onChange={(e) => setTipoCambio(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>

            {/* Margen de Utilidad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Margen de Utilidad (%) - Solo para piezas del optimizador
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="99"
                  step="1"
                  value={margenUtilidad}
                  onChange={(e) => setMargenUtilidad(parseFloat(e.target.value) || 0)}
                  className="flex-1"
                />
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="99"
                  value={margenUtilidad}
                  onChange={(e) => setMargenUtilidad(parseFloat(e.target.value) || 0)}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-center"
                />
                <span className="text-gray-600 font-medium whitespace-nowrap">%</span>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Este margen se aplicará sobre el costo total calculado por el optimizador. Los items adicionales usan el precio configurado.
              </p>
            </div>

            {/* Días de Vencimiento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Días de Vencimiento
              </label>
              <input
                type="number"
                min="1"
                value={diasVencimiento}
                onChange={(e) => setDiasVencimiento(parseInt(e.target.value) || 15)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            {/* Resumen de Costos */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                📊 Resumen de Costos
              </h3>
              
              <div className="space-y-2 text-sm">
                {/* Piezas del Optimizador */}
                <div className="flex justify-between text-blue-600">
                  <span>Piezas del Optimizador ({piezas.length}):</span>
                  <span className="font-medium">
                    {formatCurrency(precioTotalOptimizador, moneda)}
                  </span>
                </div>

                {/* Items Adicionales */}
                {itemsAdicionales.length > 0 && (
                  <div className="flex justify-between text-purple-600">
                    <span>Items Adicionales ({itemsAdicionales.length}):</span>
                    <span className="font-medium">
                      {formatCurrency(subtotalItemsAdicionales, moneda)}
                    </span>
                  </div>
                )}

                <div className="border-t border-gray-300 pt-2"></div>

                {/* Subtotal */}
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(subtotal, moneda)}
                  </span>
                </div>

                {/* IVA */}
                <div className="flex justify-between">
                  <span className="text-gray-600">IVA (13%):</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(impuestos, moneda)}
                  </span>
                </div>

                <div className="border-t border-gray-300 pt-2"></div>

                {/* Total */}
                <div className="flex justify-between text-lg">
                  <span className="font-semibold text-gray-900">Total:</span>
                  <span className="font-bold text-teal-600">
                    {formatCurrency(totalFinal, moneda)}
                  </span>
                </div>
              </div>
            </div>

            {/* Información de Piezas */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">
                📦 Información del Proyecto
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-blue-700">Total de Piezas:</span>
                  <span className="ml-2 font-medium text-blue-900">{piezas?.length || 0}</span>
                </div>
                <div>
                  <span className="text-blue-700">Láminas Utilizadas:</span>
                  <span className="ml-2 font-medium text-blue-900">{resultado?.total_laminas || 0}</span>
                </div>
                <div>
                  <span className="text-blue-700">Aprovechamiento:</span>
                  <span className="ml-2 font-medium text-blue-900">
                    {(resultado?.porcentaje_aprovechamiento_global || 0).toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-blue-700">Items Adicionales:</span>
                  <span className="ml-2 font-medium text-blue-900">
                    {itemsAdicionales.length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-end gap-3">
              <button
                onClick={onCerrar}
                disabled={loading}
                className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearCotizacion}
                disabled={!clienteSeleccionado || loading}
                className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
              >
                {loading ? (
                  <>
                    <i className="ri-loader-4-line animate-spin"></i>
                    Creando...
                  </>
                ) : (
                  <>
                    <i className="ri-file-text-line"></i>
                    Crear Cotización
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Buscar Cliente */}
      {mostrarBuscarCliente && (
        <BuscarClienteModal
          onSelect={handleSeleccionarCliente}
          onCancel={() => setMostrarBuscarCliente(false)}
        />
      )}
    </>
  );
}
