import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { tareaService } from '../../../services/tareaService';
import { useAuth } from '../../../hooks/useAuth';
import { formatCurrency } from '../../../lib/currency';
import { useNotification } from '../../../hooks/useNotification';
import NotificationPopup from '../../../components/base/NotificationPopup';
import ConfirmationDialog from '../../../components/base/ConfirmationDialog';
import type { 
  Tarea, 
  TareaEstado, 
  TareaItem, 
  TareaColaborador,
  UpdateTareaData 
} from '../../../types/tarea';

interface TareaProcesarModalProps {
  tarea: Tarea;
  onClose: () => void;
  onSave: () => void;
}

interface ItemOption {
  tipo: 'inventario' | 'producto';
  id: number;
  codigo: string;
  nombre: string;
  precio: number;
}

interface CotizacionOption {
  tipo: 'cotizacion';
  id: number;
  codigo: string;
  nombre: string;
  precio: number;
}

type OpcionBusqueda = ItemOption | CotizacionOption;

// ✅ Interfaz para opciones de cotización
interface CotizacionOption {
  id: number;
  codigo: string;
  cliente_nombre: string;
  total: number;
}

// ✅ Interfaz para componentes BOM
interface BOMComponent {
  id_componente: number;
  codigo_articulo: string;
  descripcion_articulo: string;
  cantidad_x_unidad: number;
  cantidad_total: number;
}

const ESTADOS: TareaEstado[] = [
  'En Cola',
  'En Proceso',
  'Produciendo',
  'Esperando suministros',
  'Terminado',
  'Finalizado'
];

export default function TareaProcesarModal({ tarea, onClose, onSave }: TareaProcesarModalProps) {
  const { tiendaActual } = useAuth();
  
  // ✅ AGREGAR EL HOOK DE NOTIFICACIONES
  const { notification, showNotification, hideNotification, confirmation, showConfirmation, hideConfirmation } = useNotification();
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'consumo' | 'personal'>('info');
  
  // Estados del formulario
  const [fechaEstimada, setFechaEstimada] = useState(tarea.fecha_estimada_entrega || '');
  const [cantidadUnidades, setCantidadUnidades] = useState(tarea.cantidad_unidades?.toString() || '');
  const [descripcionBreve, setDescripcionBreve] = useState(tarea.descripcion_breve || '');
  const [fechaInicio, setFechaInicio] = useState(
    tarea.fecha_inicio ? new Date(tarea.fecha_inicio).toISOString().split('T')[0] : ''
  );
  const [fechaCierre, setFechaCierre] = useState(
    tarea.fecha_cierre ? new Date(tarea.fecha_cierre).toISOString().split('T')[0] : ''
  );
  const [entregadoA, setEntregadoA] = useState(tarea.entregado_a || '');
  const [estado, setEstado] = useState<TareaEstado>(tarea.estado);
  
  // Estados para items y personal
  const [items, setItems] = useState<TareaItem[]>(tarea.items || []);
  const [colaboradores, setColaboradores] = useState<TareaColaborador[]>([]);
  
  // ✅ Cargar personal asignado desde la tarea
  const [personalSeleccionado, setPersonalSeleccionado] = useState<string[]>(
    tarea.personal_asignado?.map(p => p.colaborador_id) || []
  );
  
  // ✅ Estados para el modal de asignar personal
  const [mostrarModalPersonal, setMostrarModalPersonal] = useState(false);
  const [busquedaColaborador, setBusquedaColaborador] = useState('');
  
  // Estado para expandir/contraer detalle de productos
  const [detalleProductosExpandido, setDetalleProductosExpandido] = useState(false);
  
  // ✅ Estados para el modal de ver componentes BOM
  const [mostrarModalBOM, setMostrarModalBOM] = useState(false);
  const [componentesBOM, setComponentesBOM] = useState<BOMComponent[]>([]);
  const [cargandoBOM, setCargandoBOM] = useState(false);
  const [productoSeleccionadoBOM, setProductoSeleccionadoBOM] = useState<string>('');
  
  // Nuevo item
  const [nuevoItem, setNuevoItem] = useState({
    descripcion: '',
    cantidad: 0,
    costo_unitario: 0,
    item_type: 'inventario' as 'inventario' | 'producto' | 'cotizacion',
    producto_id: null as number | null,
    inventario_id: null as number | null
  });

  // Estados para el buscador de items
  const [itemBusqueda, setItemBusqueda] = useState('');
  const [itemsOpciones, setItemsOpciones] = useState<ItemOption[]>([]);
  const [mostrarItemsOpciones, setMostrarItemsOpciones] = useState(false);
  const [buscandoItems, setBuscandoItems] = useState(false);

  // ✅ Estados para búsqueda de cotizaciones
  const [cotizacionesOpciones, setCotizacionesOpciones] = useState<CotizacionOption[]>([]);
  const [mostrarCotizacionesOpciones, setMostrarCotizacionesOpciones] = useState(false);

  // ✅ Constantes de búsqueda
  const MIN_CHARS = 2;
  const DEBOUNCE_MS = 400;

  // ✅ CARGAR COMPONENTES BOM AUTOMÁTICAMENTE AL ABRIR EL MODAL
  useEffect(() => {
    const cargarComponentesBOMAutomatico = async () => {
      // Solo cargar si hay cotización ligada y no hay items ya cargados
      if (!tarea.cotizacion_id || items.length > 0) {
        return;
      }

      console.log('='.repeat(50));
      console.log('🔄 CARGANDO COMPONENTES BOM AUTOMÁTICAMENTE');
      console.log('='.repeat(50));
      console.log('📦 Cotización ID:', tarea.cotizacion_id);

      try {
        console.log('📡 Consultando items de cotización en Supabase...');
        const { data: itemsCotizacion, error: errorItems } = await supabase
          .from('cotizacion_items')
          .select('producto_id, cantidad')
          .eq('cotizacion_id', tarea.cotizacion_id);

        console.log('📥 Respuesta de items recibida');
        console.log('   - Error:', errorItems);
        console.log('   - Data:', itemsCotizacion);
        console.log('   - Cantidad de items:', itemsCotizacion?.length || 0);

        if (errorItems) {
          console.error('❌ ERROR AL OBTENER ITEMS DE COTIZACIÓN:', errorItems);
          return;
        }

        if (!itemsCotizacion || itemsCotizacion.length === 0) {
          console.log('⚠️ La cotización no tiene items asociados');
          return;
        }

        console.log('🔄 Procesando items de cotización...');
        const componentesMap = new Map<number, { cantidad: number; costo: number; codigo: string; descripcion: string }>();

        for (const item of itemsCotizacion) {
          console.log('='.repeat(50));
          console.log('📦 Procesando item de cotización');
          console.log('   - Producto ID:', item.producto_id);
          console.log('   - Cantidad:', item.cantidad);

          console.log('📡 Consultando BOM del producto...');
          const { data: bomItems, error: errorBom } = await supabase
            .from('bom_items')
            .select(`
              id_componente,
              cantidad_x_unidad,
              inventario!bom_items_id_componente_fkey(
                id_articulo,
                codigo_articulo,
                descripcion_articulo,
                costo_articulo
              )
            `)
            .eq('product_id', item.producto_id);

          console.log('📥 Respuesta de BOM recibida');
          console.log('   - Error:', errorBom);
          console.log('   - Data:', bomItems);
          console.log('   - Cantidad de componentes:', bomItems?.length || 0);

          if (errorBom) {
            console.error('❌ ERROR AL OBTENER BOM:', errorBom);
            continue;
          }

          if (!bomItems || bomItems.length === 0) {
            console.log('⚠️ El producto no tiene BOM definido');
            continue;
          }

          console.log('🔄 Procesando componentes BOM...');
          for (const bomItem of bomItems) {
            if (!bomItem.inventario) {
              console.log('⚠️ Componente sin inventario asociado:', bomItem.id_componente);
              continue;
            }

            const cantidadTotal = item.cantidad * bomItem.cantidad_x_unidad;
            const articuloId = bomItem.inventario.id_articulo;

            console.log('   📦 Componente:', {
              id: articuloId,
              codigo: bomItem.inventario.codigo_articulo,
              descripcion: bomItem.inventario.descripcion_articulo,
              cantidadPorUnidad: bomItem.cantidad_x_unidad,
              cantidadProducto: item.cantidad,
              cantidadTotal,
              costo: bomItem.inventario.costo_articulo
            });

            if (componentesMap.has(articuloId)) {
              const existing = componentesMap.get(articuloId)!;
              console.log('   ♻️ Componente duplicado, sumando cantidades');
              console.log('      - Cantidad anterior:', existing.cantidad);
              console.log('      - Cantidad a sumar:', cantidadTotal);
              console.log('      - Cantidad nueva:', existing.cantidad + cantidadTotal);
              componentesMap.set(articuloId, {
                ...existing,
                cantidad: existing.cantidad + cantidadTotal
              });
            } else {
              console.log('   ✅ Nuevo componente agregado al mapa');
              componentesMap.set(articuloId, {
                cantidad: cantidadTotal,
                costo: bomItem.inventario.costo_articulo || 0,
                codigo: bomItem.inventario.codigo_articulo,
                descripcion: bomItem.inventario.descripcion_articulo
              });
            }
          }
        }

        console.log('='.repeat(50));
        console.log('📊 RESUMEN DE COMPONENTES');
        console.log('='.repeat(50));
        console.log('Total de componentes únicos:', componentesMap.size);
        console.log('Detalle:');
        componentesMap.forEach((comp, id) => {
          console.log(`   - ${comp.codigo}: ${comp.cantidad} unidades @ ${formatCurrency(comp.costo)}`);
        });

        console.log('🔄 Convirtiendo mapa a array de items...');
        const nuevosItems: TareaItem[] = Array.from(componentesMap.entries()).map(([id, comp]) => {
          const item = {
            id: `temp-${Date.now()}-${Math.random()}`,
            tarea_id: tarea.id,
            item_type: 'inventario' as const,
            inventario_id: id,
            producto_id: null,
            descripcion: comp.descripcion,
            cantidad: comp.cantidad,
            costo_unitario: comp.costo,
            total: comp.cantidad * comp.costo,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          console.log('   ✅ Item creado:', item);
          return item;
        });

        console.log('📊 Total de items a agregar:', nuevosItems.length);
        setItems(nuevosItems);
        console.log('✅ COMPONENTES BOM CARGADOS AUTOMÁTICAMENTE');
        console.log('='.repeat(50));

      } catch (error) {
        console.error('💥 ERROR CRÍTICO EN CARGA AUTOMÁTICA:', error);
      }
    };

    cargarComponentesBOMAutomatico();
  }, [tarea.cotizacion_id, tarea.id]);

  // ✅ Buscar items según el tipo - MEJORADO Y CORREGIDO
  useEffect(() => {
    console.log('='.repeat(50));
    console.log('🔄 useEffect de búsqueda ejecutado');
    console.log('📝 Estado actual:', {
      itemBusqueda,
      tipo: nuevoItem.item_type,
      tiendaActual: tiendaActual?.tienda_id,
      tiendaActualCompleto: tiendaActual,
      longitudBusqueda: itemBusqueda.length,
      MIN_CHARS,
      DEBOUNCE_MS
    });

    // Validación 1: Texto vacío o muy corto
    if (!itemBusqueda || itemBusqueda.length < MIN_CHARS) {
      console.log('⏸️ BÚSQUEDA CANCELADA: Texto muy corto o vacío');
      console.log('   - itemBusqueda:', itemBusqueda);
      console.log('   - Longitud:', itemBusqueda.length);
      console.log('   - Mínimo requerido:', MIN_CHARS);
      setItemsOpciones([]);
      setMostrarItemsOpciones(false);
      setCotizacionesOpciones([]);
      setMostrarCotizacionesOpciones(false);
      console.log('='.repeat(50));
      return;
    }

    // ✅ VALIDACIÓN MEJORADA: Solo requerir tienda para inventario y productos
    // Si no hay tienda, intentar buscar sin filtro de tienda
    if (nuevoItem.item_type !== 'cotizacion') {
      if (!tiendaActual?.tienda_id) {
        console.log('⚠️ ADVERTENCIA: Sin tienda actual, buscando sin filtro de tienda');
        console.log('   - Tipo:', nuevoItem.item_type);
        console.log('   - Tienda actual:', tiendaActual);
        console.log('   - Se procederá con la búsqueda sin filtro de tienda');
      } else {
        console.log('✅ Tienda actual encontrada:', tiendaActual.tienda_id);
      }
    }

    console.log('✅ Validaciones pasadas, iniciando debounce...');
    console.log('⏱️ Esperando', DEBOUNCE_MS, 'ms antes de buscar');

    const timer = setTimeout(async () => {
      console.log('='.repeat(50));
      console.log('🚀 INICIANDO BÚSQUEDA');
      console.log('📊 Parámetros de búsqueda:', {
        tipo: nuevoItem.item_type,
        termino: itemBusqueda,
        tienda: tiendaActual?.tienda_id || 'SIN TIENDA'
      });

      setBuscandoItems(true);
      console.log('⏳ Estado loading activado');

      try {
        const termino = itemBusqueda.trim();
        console.log('🔤 Término limpio:', termino);

        // ============================================
        // BÚSQUEDA DE COTIZACIONES
        // ============================================
        if (nuevoItem.item_type === 'cotizacion') {
          console.log('='.repeat(50));
          console.log('🔍 BÚSQUEDA EN COTIZACIONES');
          console.log('='.repeat(50));

          console.log('📡 Construyendo query de Supabase...');
          console.log('   - Tabla: cotizaciones');
          console.log('   - Select: id, codigo, total, clientes');
          console.log('   - Filtro: codigo.ilike.%' + termino + '%');
          console.log('   - Order: created_at DESC');
          console.log('   - Limit: 10');

          const { data, error } = await supabase
            .from('cotizaciones')
            .select(`
              id,
              codigo,
              total,
              clientes!cotizaciones_cliente_id_fkey(
                id,
                nombre_razon_social
              )
            `)
            .or(`codigo.ilike.%${termino}%`)
            .order('created_at', { ascending: false })
            .limit(10);

          console.log('📥 Respuesta de Supabase recibida');
          console.log('   - Error:', error);
          console.log('   - Data:', data);
          console.log('   - Cantidad de resultados:', data?.length || 0);

          if (error) {
            console.log('='.repeat(50));
            console.error('❌ ERROR EN BÚSQUEDA DE COTIZACIONES:', error);
            console.error('   - Mensaje:', error.message);
            console.error('   - Código:', error.code);
            console.error('   - Detalles:', error.details);
            console.log('='.repeat(50));
            return;
          }

          console.log('🔄 Procesando resultados...');
          const opciones: CotizacionOption[] = (data || [])
            .filter(cot => {
              const tieneCliente = cot.clientes !== null;
              console.log('   - Cotización', cot.codigo, '→ Cliente:', tieneCliente ? cot.clientes?.nombre_razon_social : 'NULL');
              return tieneCliente;
            })
            .map(cot => {
              const opcion = {
                id: cot.id,
                codigo: cot.codigo,
                cliente_nombre: cot.clientes?.nombre_razon_social || 'Sin cliente',
                total: cot.total
              };
              console.log('   ✅ Opción creada:', opcion);
              return opcion;
            });

          console.log('📊 Total de opciones procesadas:', opciones.length);
          console.log('📋 Opciones finales:', opciones);

          setCotizacionesOpciones(opciones);
          setMostrarCotizacionesOpciones(opciones.length > 0);
          console.log('✅ Estado actualizado');
          console.log('   - Opciones:', opciones.length);
          console.log('   - Dropdown visible:', opciones.length > 0);
        }

        // ============================================
        // BÚSQUEDA DE INVENTARIO
        // ============================================
        else if (nuevoItem.item_type === 'inventario') {
          console.log('🔍 Buscando en inventario con término:', termino);

          let query = supabase
            .from('inventario')
            .select('id_articulo, codigo_articulo, descripcion_articulo, costo_articulo');

          // Si hay tienda, filtra por tienda
          if (tiendaActual?.tienda_id) {
            console.log('   - Filtro tienda: tienda_id =', tiendaActual.tienda_id);
            query = query.eq('tienda_id', tiendaActual.tienda_id);
          } else {
            console.log('   - ⚠️ SIN FILTRO DE TIENDA (buscando en todas las tiendas)');
          }

          const { data, error } = await query
            .or(`codigo_articulo.ilike.%${termino}%,descripcion_articulo.ilike.%${termino}%`)
            .limit(10);

          console.log('📥 Respuesta de Supabase recibida');
          console.log('   - Error:', error);
          console.log('   - Data:', data);
          console.log('   - Cantidad de resultados:', data?.length || 0);

          if (error) {
            console.log('='.repeat(50));
            console.error('❌ ERROR EN BÚSQUEDA DE INVENTARIO');
            console.error('   - Mensaje:', error.message);
            console.error('   - Código:', error.code);
            console.error('   - Detalles:', error);
            console.log('='.repeat(50));
            setItemsOpciones([]);
            setMostrarItemsOpciones(false);
            return;
          }

          console.log('🔄 Procesando resultados...');
          const opciones = (data || []).map((item) => {
            const opcion = {
              tipo: 'inventario' as const,
              id: item.id_articulo,
              codigo: item.codigo_articulo,
              nombre: item.descripcion_articulo,
              precio: item.costo_articulo || 0
            };
            console.log('   ✅ Opción creada:', opcion);
            return opcion;
          });

          console.log('📊 Total de opciones procesadas:', opciones.length);
          console.log('📋 Opciones finales:', opciones);

          setItemsOpciones(opciones);
          setMostrarItemsOpciones(opciones.length > 0);

          console.log('✅ Estado actualizado');
          console.log('   - Opciones:', opciones.length);
          console.log('   - Dropdown visible:', opciones.length > 0);
        }

        // ============================================
        // BÚSQUEDA DE PRODUCTOS
        // ============================================
        else {
          console.log('🔍 Buscando en productos con término:', termino);

          let query = supabase
            .from('productos')
            .select('id_producto, codigo_producto, descripcion_producto, costo_total_bom');

          console.log('📡 Construyendo query de Supabase...');
          console.log('   - Tabla: productos');
          console.log('   - Select: id_producto, codigo_producto, descripcion_producto, costo_total_bom');

          // Filtrar por tienda si existe
          if (tiendaActual?.tienda_id) {
            query = query.eq('tienda_id', tiendaActual.tienda_id);
            console.log('   - Filtro tienda: tienda_id =', tiendaActual.tienda_id);
          } else {
            console.log('   - ⚠️ SIN FILTRO DE TIENDA (buscando en todas las tiendas)');
          }

          const { data, error } = await query
            .or(`codigo_producto.ilike.%${termino}%,descripcion_producto.ilike.%${termino}%`)
            .limit(10);

          console.log('   - Filtro búsqueda: codigo_producto.ilike.%' + termino + '% OR descripcion_producto.ilike.%' + termino + '%');
          console.log('   - Limit: 10');

          console.log('📥 Respuesta de Supabase recibida');
          console.log('   - Error:', error);
          console.log('   - Data:', data);
          console.log('   - Cantidad de resultados:', data?.length || 0);

          if (error) {
            console.log('='.repeat(50));
            console.error('❌ ERROR EN BÚSQUEDA DE PRODUCTOS');
            console.error('   - Mensaje:', error.message);
            console.error('   - Código:', error.code);
            console.error('   - Detalles:', error);
            console.log('='.repeat(50));
            setItemsOpciones([]);
            setMostrarItemsOpciones(false);
            return;
          }

          console.log('🔄 Procesando resultados...');
          const opciones = (data || []).map((item) => {
            const opcion = {
              tipo: 'producto' as const,
              id: item.id_producto,
              codigo: item.codigo_producto,
              nombre: item.descripcion_producto,
              precio: item.costo_total_bom || 0
            };
            console.log('   ✅ Opción creada:', opcion);
            return opcion;
          });

          console.log('📊 Total de opciones procesadas:', opciones.length);
          console.log('📋 Opciones finales:', opciones);

          setItemsOpciones(opciones);
          setMostrarItemsOpciones(opciones.length > 0);

          console.log('✅ Estado actualizado');
          console.log('   - Opciones:', opciones.length);
          console.log('   - Dropdown visible:', opciones.length > 0);
        }

      } catch (error) {
        console.log('='.repeat(50));
        console.error('❌ Error buscando items:', error);
      } finally {
        setBuscandoItems(false);
      }
    }, DEBOUNCE_MS);

    console.log('🔄 Timer creado, ID:', timer);
    console.log('='.repeat(50));

    return () => {
      console.log('🧹 Cleanup: Cancelando timer', timer);
      clearTimeout(timer);
    };
  }, [itemBusqueda, nuevoItem.item_type, tiendaActual]);

  useEffect(() => {
    cargarColaboradores();
  }, []);

  const cargarColaboradores = async () => {
    try {
      const colaboradoresData = await tareaService.getColaboradores();
      setColaboradores(colaboradoresData);
    } catch (error) {
      console.error('Error cargando colaboradores:', error);
    }
  };

  // ✅ Función para ver componentes BOM de un producto - CON POPUP
  const verComponentesBOM = async (item: TareaItem) => {
    if (item.item_type !== 'producto' || !item.producto_id) {
      showNotification('warning', 'Este item no es un producto o no tiene ID de producto');
      return;
    }

    setCargandoBOM(true);
    setMostrarModalBOM(true);
    setProductoSeleccionadoBOM(item.descripcion);

    try {
      const { data: bomItems, error } = await supabase
        .from('bom_items')
        .select(`
          id_componente,
          cantidad_x_unidad,
          inventario!bom_items_id_componente_fkey(
            id_articulo,
            codigo_articulo,
            descripcion_articulo
          )
        `)
        .eq('product_id', item.producto_id);

      if (error) {
        console.error('Error obteniendo BOM:', error);
        showNotification('error', 'Error al cargar los componentes del producto');
        setMostrarModalBOM(false);
        return;
      }

      if (!bomItems || bomItems.length === 0) {
        setComponentesBOM([]);
        return;
      }

      // Calcular cantidad total de cada componente
      const componentes: BOMComponent[] = bomItems.map((bomItem: any) => ({
        id_componente: bomItem.id_componente,
        codigo_articulo: bomItem.inventario.codigo_articulo,
        descripcion_articulo: bomItem.inventario.descripcion_articulo,
        cantidad_x_unidad: bomItem.cantidad_x_unidad,
        cantidad_total: bomItem.cantidad_x_unidad * item.cantidad
      }));

      setComponentesBOM(componentes);
    } catch (error) {
      console.error('Error cargando BOM:', error);
      showNotification('error', 'Error al cargar los componentes del producto');
      setMostrarModalBOM(false);
    } finally {
      setCargandoBOM(false);
    }
  };

  // ============================================
  // 🎯 SELECCIÓN DE ITEM CON LOGS
  // ============================================
  const seleccionarItem = (item: ItemOption) => {
    console.log('='.repeat(50));
    console.log('🎯 ITEM SELECCIONADO');
    console.log('='.repeat(50));
    console.log('📦 Item:', item);

    setNuevoItem({
      ...nuevoItem,
      descripcion: item.nombre,
      costo_unitario: item.precio,
      producto_id: item.tipo === 'producto' ? item.id : null,
      inventario_id: item.tipo === 'inventario' ? item.id : null
    });

    // FIX: mostrar la descripción (nombre) en el campo, no el código
    setItemBusqueda(item.nombre);
    setMostrarItemsOpciones(false);
    setItemsOpciones([]);

    console.log('✅ itemBusqueda actualizado a descripción:', item.nombre);
    console.log('='.repeat(50));
  };

  // ============================================
  // 🎯 SELECCIÓN DE COTIZACIÓN CON LOGS
  // ============================================
  const seleccionarCotizacion = async (cotizacion: CotizacionOption) => {
    console.log('='.repeat(50));
    console.log('🎯 COTIZACIÓN SELECCIONADA');
    console.log('='.repeat(50));
    console.log('📦 Cotización:', cotizacion);
    console.log('   - ID:', cotizacion.id);
    console.log('   - Código:', cotizacion.codigo);
    console.log('   - Cliente:', cotizacion.cliente_nombre);
    console.log('   - Total:', cotizacion.total);

    setItemBusqueda(cotizacion.codigo);
    setMostrarCotizacionesOpciones(false);
    setCotizacionesOpciones([]);

    console.log('✅ Estados de búsqueda limpiados');
    console.log('🔄 Iniciando importación de items de cotización...');

    try {
      console.log('📡 Consultando items de cotización en Supabase...');
      console.log('   - Tabla: cotizacion_items');
      console.log('   - Filtro: cotizacion_id =', cotizacion.id);

      const { data: itemsCotizacion, error: errorItems } = await supabase
        .from('cotizacion_items')
        .select('producto_id, cantidad')
        .eq('cotizacion_id', cotizacion.id);

      console.log('📥 Respuesta de items recibida');
      console.log('   - Error:', errorItems);
      console.log('   - Data:', itemsCotizacion);
      console.log('   - Cantidad de items:', itemsCotizacion?.length || 0);

      if (errorItems) {
        console.log('='.repeat(50));
        console.error('❌ ERROR AL OBTENER ITEMS DE COTIZACIÓN:', errorItems);
        console.error('   - Mensaje:', errorItems.message);
        console.error('   - Código:', errorItems.code);
        console.log('='.repeat(50));
        return;
      }

      if (!itemsCotizacion || itemsCotizacion.length === 0) {
        console.log('⚠️ La cotización no tiene items asociados');
        console.log('='.repeat(50));
        return;
      }

      console.log('🔄 Procesando items de cotización...');
      const componentesMap = new Map<number, { cantidad: number; costo: number; codigo: string; descripcion: string }>();

      for (const item of itemsCotizacion) {
        console.log('='.repeat(50));
        console.log('📦 Procesando item de cotización');
        console.log('   - Producto ID:', item.producto_id);
        console.log('   - Cantidad:', item.cantidad);

        console.log('📡 Consultando BOM del producto...');
        console.log('   - Tabla: bom_items');
        console.log('   - Filtro: producto_id =', item.producto_id);

        const { data: bomItems, error: errorBom } = await supabase
          .from('bom_items')
          .select(`
            id_componente,
            cantidad_x_unidad,
            inventario!bom_items_id_componente_fkey(
              id_articulo,
              codigo_articulo,
              descripcion_articulo,
              costo_articulo
            )
          `)
          .eq('product_id', item.producto_id);

        console.log('📥 Respuesta de BOM recibida');
        console.log('   - Error:', errorBom);
        console.log('   - Data:', bomItems);
        console.log('   - Cantidad de componentes:', bomItems?.length || 0);

        if (errorBom) {
          console.log('='.repeat(50));
          console.error('❌ ERROR AL OBTENER BOM:', errorBom);
          console.error('   - Mensaje:', errorBom.message);
          console.error('   - Código:', errorBom.code);
          continue;
        }

        if (!bomItems || bomItems.length === 0) {
          console.log('⚠️ El producto no tiene BOM definido');
          continue;
        }

        console.log('🔄 Procesando componentes BOM...');
        for (const bomItem of bomItems) {
          if (!bomItem.inventario) {
            console.log('⚠️ Componente sin inventario asociado:', bomItem.id_componente);
            continue;
          }

          const cantidadTotal = item.cantidad * bomItem.cantidad_x_unidad;
          const articuloId = bomItem.inventario.id_articulo;

          console.log('   📦 Componente:', {
            id: articuloId,
            codigo: bomItem.inventario.codigo_articulo,
            descripcion: bomItem.inventario.descripcion_articulo,
            cantidadPorUnidad: bomItem.cantidad_x_unidad,
            cantidadProducto: item.cantidad,
            cantidadTotal,
            costo: bomItem.inventario.costo_articulo
          });

          if (componentesMap.has(articuloId)) {
            const existing = componentesMap.get(articuloId)!;
            console.log('   ♻️ Componente duplicado, sumando cantidades');
            console.log('      - Cantidad anterior:', existing.cantidad);
            console.log('      - Cantidad a sumar:', cantidadTotal);
            console.log('      - Cantidad nueva:', existing.cantidad + cantidadTotal);
            componentesMap.set(articuloId, {
              ...existing,
              cantidad: existing.cantidad + cantidadTotal
            });
          } else {
            console.log('   ✅ Nuevo componente agregado al mapa');
            componentesMap.set(articuloId, {
              cantidad: cantidadTotal,
              costo: bomItem.inventario.costo_articulo || 0,
              codigo: bomItem.inventario.codigo_articulo,
              descripcion: bomItem.inventario.descripcion_articulo
            });
          }
        }
      }

      console.log('='.repeat(50));
      console.log('📊 RESUMEN DE COMPONENTES');
      console.log('='.repeat(50));
      console.log('Total de componentes únicos:', componentesMap.size);
      console.log('Detalle:');
      componentesMap.forEach((comp, id) => {
        console.log(`   - ${comp.codigo}: ${comp.cantidad} unidades @ ${formatCurrency(comp.costo)}`);
      });

      console.log('🔄 Convirtiendo mapa a array de items...');
      const nuevosItems: TareaItem[] = Array.from(componentesMap.entries()).map(([id, comp]) => {
        const item = {
          id: `temp-${Date.now()}-${Math.random()}`,
          tarea_id: tarea.id,
          item_type: 'inventario' as const,
          inventario_id: id,
          producto_id: null,
          descripcion: comp.descripcion,
          cantidad: comp.cantidad,
          costo_unitario: comp.costo,
          total: comp.cantidad * comp.costo,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        console.log('   ✅ Item creado:', item);
        return item;
      });

      console.log('📊 Total de items a agregar:', nuevosItems.length);
      console.log('📋 Items finales:', nuevosItems);

      setItems(prev => {
        const updated = [...prev, ...nuevosItems];
        console.log('✅ Estado items actualizado');
        console.log('   - Items anteriores:', prev.length);
        console.log('   - Items nuevos:', nuevosItems.length);
        console.log('   - Total items:', updated.length);
        return updated;
      });

      console.log('✅ IMPORTACIÓN COMPLETADA EXITOSAMENTE');
      console.log('='.repeat(50));
      
      // ✅ POPUP EN LUGAR DE ALERT
      showNotification('success', `Se importaron ${nuevosItems.length} componentes desde la cotización`);

    } catch (error) {
      console.log('='.repeat(50));
      console.error('💥 ERROR CRÍTICO EN IMPORTACIÓN');
      console.error('Error:', error);
      console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.log('='.repeat(50));
    }
  };

  const limpiarBusqueda = () => {
    setItemBusqueda('');
    setItemsOpciones([]);
    setMostrarItemsOpciones(false);
    setCotizacionesOpciones([]);
    setMostrarCotizacionesOpciones(false);
    setNuevoItem({
      descripcion: '',
      costo_unitario: 0,
      producto_id: null,
      inventario_id: null
    });
  };

  const handleAgregarItem = () => {
    if (!nuevoItem.descripcion || nuevoItem.cantidad <= 0) {
      showNotification('warning', 'Complete todos los campos del item');
      return;
    }

    const item: TareaItem = {
      id: `temp-${Date.now()}`,
      tarea_id: tarea.id,
      item_type: nuevoItem.item_type,
      producto_id: nuevoItem.producto_id,
      inventario_id: nuevoItem.inventario_id,
      descripcion: nuevoItem.descripcion,
      cantidad: nuevoItem.cantidad,
      costo_unitario: nuevoItem.costo_unitario,
      total: nuevoItem.cantidad * nuevoItem.costo_unitario,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setItems(prev => [...prev, item]);
    setNuevoItem({
      descripcion: '',
      cantidad: 0,
      costo_unitario: 0,
      item_type: 'inventario',
      producto_id: null,
      inventario_id: null
    });
    setItemBusqueda('');
  };

  const handleEliminarItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleImportarCotizacion = async () => {
    if (!tarea.cotizacion_id) {
      showNotification('warning', 'Esta tarea no tiene una cotización asociada');
      return;
    }

    console.log('='.repeat(50));
    console.log('🔄 IMPORTANDO COMPONENTES BOM DESDE COTIZACIÓN');
    console.log('='.repeat(50));
    console.log('📦 Cotización ID:', tarea.cotizacion_id);

    try {
      console.log('📡 Consultando items de cotización en Supabase...');
      const { data: itemsCotizacion, error: errorItems } = await supabase
        .from('cotizacion_items')
        .select('producto_id, cantidad')
        .eq('cotizacion_id', tarea.cotizacion_id);

      console.log('📥 Respuesta de items recibida');
      console.log('   - Error:', errorItems);
      console.log('   - Data:', itemsCotizacion);
      console.log('   - Cantidad de items:', itemsCotizacion?.length || 0);

      if (errorItems) {
        console.error('❌ ERROR AL OBTENER ITEMS DE COTIZACIÓN:', errorItems);
        showNotification('error', 'Error al obtener items de la cotización');
        return;
      }

      if (!itemsCotizacion || itemsCotizacion.length === 0) {
        console.log('⚠️ La cotización no tiene items asociados');
        showNotification('warning', 'La cotización no tiene items asociados');
        return;
      }

      console.log('🔄 Procesando items de cotización...');
      const componentesMap = new Map<number, { cantidad: number; costo: number; codigo: string; descripcion: string }>();

      for (const item of itemsCotizacion) {
        console.log('='.repeat(50));
        console.log('📦 Procesando item de cotización');
        console.log('   - Producto ID:', item.producto_id);
        console.log('   - Cantidad:', item.cantidad);

        console.log('📡 Consultando BOM del producto...');
        const { data: bomItems, error: errorBom } = await supabase
          .from('bom_items')
          .select(`
            id_componente,
            cantidad_x_unidad,
            inventario!bom_items_id_componente_fkey(
              id_articulo,
              codigo_articulo,
              descripcion_articulo,
              costo_articulo
            )
          `)
          .eq('product_id', item.producto_id);

        console.log('📥 Respuesta de BOM recibida');
        console.log('   - Error:', errorBom);
        console.log('   - Data:', bomItems);
        console.log('   - Cantidad de componentes:', bomItems?.length || 0);

        if (errorBom) {
          console.error('❌ ERROR AL OBTENER BOM:', errorBom);
          continue;
        }

        if (!bomItems || bomItems.length === 0) {
          console.log('⚠️ El producto no tiene BOM definido');
          continue;
        }

        console.log('🔄 Procesando componentes BOM...');
        for (const bomItem of bomItems) {
          if (!bomItem.inventario) {
            console.log('⚠️ Componente sin inventario asociado:', bomItem.id_componente);
            continue;
          }

          const cantidadTotal = item.cantidad * bomItem.cantidad_x_unidad;
          const articuloId = bomItem.inventario.id_articulo;

          console.log('   📦 Componente:', {
            id: articuloId,
            codigo: bomItem.inventario.codigo_articulo,
            descripcion: bomItem.inventario.descripcion_articulo,
            cantidadPorUnidad: bomItem.cantidad_x_unidad,
            cantidadProducto: item.cantidad,
            cantidadTotal,
            costo: bomItem.inventario.costo_articulo
          });

          if (componentesMap.has(articuloId)) {
            const existing = componentesMap.get(articuloId)!;
            console.log('   ♻️ Componente duplicado, sumando cantidades');
            console.log('      - Cantidad anterior:', existing.cantidad);
            console.log('      - Cantidad a sumar:', cantidadTotal);
            console.log('      - Cantidad nueva:', existing.cantidad + cantidadTotal);
            componentesMap.set(articuloId, {
              ...existing,
              cantidad: existing.cantidad + cantidadTotal
            });
          } else {
            console.log('   ✅ Nuevo componente agregado al mapa');
            componentesMap.set(articuloId, {
              cantidad: cantidadTotal,
              costo: bomItem.inventario.costo_articulo || 0,
              codigo: bomItem.inventario.codigo_articulo,
              descripcion: bomItem.inventario.descripcion_articulo
            });
          }
        }
      }

      console.log('='.repeat(50));
      console.log('📊 RESUMEN DE COMPONENTES');
      console.log('='.repeat(50));
      console.log('Total de componentes únicos:', componentesMap.size);
      console.log('Detalle:');
      componentesMap.forEach((comp, id) => {
        console.log(`   - ${comp.codigo}: ${comp.cantidad} unidades @ ${formatCurrency(comp.costo)}`);
      });

      console.log('🔄 Convirtiendo mapa a array de items...');
      const nuevosItems: TareaItem[] = Array.from(componentesMap.entries()).map(([id, comp]) => {
        const item = {
          id: `temp-${Date.now()}-${Math.random()}`,
          tarea_id: tarea.id,
          item_type: 'inventario' as const,
          inventario_id: id,
          producto_id: null,
          descripcion: comp.descripcion,
          cantidad: comp.cantidad,
          costo_unitario: comp.costo,
          total: comp.cantidad * comp.costo,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        console.log('   ✅ Item creado:', item);
        return item;
      });

      console.log('📊 Total de items a agregar:', nuevosItems.length);
      setItems(prev => [...prev, ...nuevosItems]);
      console.log('✅ IMPORTACIÓN COMPLETADA EXITOSAMENTE');
      console.log('='.repeat(50));
      
      // ✅ POPUP EN LUGAR DE ALERT
      showNotification('success', `Se importaron ${nuevosItems.length} componentes desde la cotización`);

    } catch (error) {
      console.error('💥 ERROR CRÍTICO EN IMPORTACIÓN:', error);
      showNotification('error', 'Error al importar componentes de la cotización');
    }
  };

  const handlePersonalChange = (colaboradorId: string, selected: boolean) => {
    if (selected) {
      setPersonalSeleccionado(prev => [...prev, colaboradorId]);
    } else {
      setPersonalSeleccionado(prev => prev.filter(id => id !== colaboradorId));
    }
  };

  const agregarPersonal = (colaboradorId: string) => {
    if (!personalSeleccionado.includes(colaboradorId)) {
      setPersonalSeleccionado([...personalSeleccionado, colaboradorId]);
    }
  };

  const eliminarPersonal = (colaboradorId: string) => {
    setPersonalSeleccionado(personalSeleccionado.filter(id => id !== colaboradorId));
  };

  // ✅ Calcular total correctamente
  const calcularTotalCosto = () => {
    return items.reduce((sum, item) => {
      const total = item.cantidad * item.costo_unitario;
      return sum + total;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loading) return;
    
    try {
      setLoading(true);

      const updateData: UpdateTareaData = {
        fecha_estimada_entrega: fechaEstimada || undefined,
        cantidad_unidades: cantidadUnidades ? parseFloat(cantidadUnidades) : undefined,
        descripcion_breve: descripcionBreve || undefined,
        cantidad_personas: personalSeleccionado.length,
        fecha_inicio: fechaInicio || undefined,
        fecha_cierre: fechaCierre || undefined,
        entregado_a: entregadoA || undefined,
        estado,
        items: items.map(item => ({
          item_type: item.item_type,
          item_id: item.item_id,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          costo_unitario: item.costo_unitario
        })),
        personal_asignado: personalSeleccionado
      };

      await tareaService.updateTarea(tarea.id, updateData);
      
      console.log('✅ Tarea actualizada exitosamente');
      onSave();
    } catch (error) {
      console.error('Error actualizando tarea:', error);
      showNotification('error', 'Error al actualizar la tarea: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Calcular cantidad de personas automáticamente desde el personal seleccionado
  const cantidadPersonasCalculada = personalSeleccionado.length;

  // Filtrar colaboradores para búsqueda
  const colaboradoresFiltrados = colaboradores.filter(c => 
    c.nombre.toLowerCase().includes(busquedaColaborador.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(busquedaColaborador.toLowerCase()))
  );

  const colaboradoresSeleccionados = colaboradores.filter(c => 
    personalSeleccionado.includes(c.id)
  );

  // Verificar si el detalle de productos es largo (más de 5 filas)
  const detalleProductosLargo = 
    (tarea.datos_formulario?.items_tabla_simple && tarea.datos_formulario.items_tabla_simple.length > 5) ||
    (tarea.datos_formulario?.items_tabla_completa && tarea.datos_formulario.items_tabla_completa.length > 5);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Procesar Orden: {tarea.consecutivo}</h2>
            <p className="text-sm text-gray-500 mt-1">
              Solicitante: {tarea.email_solicitante} • Creada: {new Date(tarea.created_at).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'info'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <i className="ri-information-line mr-2"></i>
            Información General
          </button>
          <button
            onClick={() => setActiveTab('consumo')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'consumo'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <i className="ri-shopping-cart-line mr-2"></i>
            Consumo e Inventario
          </button>
          <button
            onClick={() => setActiveTab('personal')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'personal'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <i className="ri-team-line mr-2"></i>
            Personal Asignado
          </button>
        </div>

        {/* Contenido */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          {/* Tab: Información General */}
          {activeTab === 'info' && (
            <div className="p-6 space-y-6">
              {/* Información original de la solicitud */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Solicitud Original</h3>
                <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                  {/* Número de Caso */}
                  <div className="flex items-start border-b border-gray-200 pb-3">
                    <span className="text-sm font-semibold text-gray-700 w-48">Número de Caso:</span>
                    <span className="text-sm text-gray-900">{tarea.consecutivo || 'N/A'}</span>
                  </div>

                  {/* Estado */}
                  <div className="flex items-start border-b border-gray-200 pb-3">
                    <span className="text-sm font-semibold text-gray-700 w-48">Estado:</span>
                    <span className={`text-sm px-2 py-1 rounded ${
                      tarea.estado === 'Completado' ? 'bg-green-100 text-green-800' :
                      tarea.estado === 'En Proceso' ? 'bg-blue-100 text-blue-800' :
                      tarea.estado === 'En Cola' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {tarea.estado}
                    </span>
                  </div>

                  {/* Cliente */}
                  {tarea.datos_formulario?.cliente && (
                    <div className="flex items-start border-b border-gray-200 pb-3">
                      <span className="text-sm font-semibold text-gray-700 w-48">Cliente:</span>
                      <span className="text-sm text-gray-900">{tarea.datos_formulario.cliente}</span>
                    </div>
                  )}

                  {/* Departamento Solicitante */}
                  {tarea.datos_formulario?.departamento_solicitante && (
                    <div className="flex items-start border-b border-gray-200 pb-3">
                      <span className="text-sm font-semibold text-gray-700 w-48">Departamento Solicitante:</span>
                      <span className="text-sm text-gray-900">{tarea.datos_formulario.departamento_solicitante}</span>
                    </div>
                  )}

                  {/* Solicitud EPA */}
                  {tarea.datos_formulario?.solicitud_epa && (
                    <div className="flex items-start border-b border-gray-200 pb-3">
                      <span className="text-sm font-semibold text-gray-700 w-48">Tipo de Solicitud:</span>
                      <span className="text-sm text-gray-900">{tarea.datos_formulario.solicitud_epa}</span>
                    </div>
                  )}

                  {/* Solicitud COFERSA */}
                  {tarea.datos_formulario?.solicitud_cofersa && (
                    <div className="flex items-start border-b border-gray-200 pb-3">
                      <span className="text-sm font-semibold text-gray-700 w-48">Tipo de Solicitud:</span>
                      <span className="text-sm text-gray-900">{tarea.datos_formulario.solicitud_cofersa}</span>
                    </div>
                  )}

                  {/* Tipo de Trabajo */}
                  {tarea.datos_formulario?.tipo_trabajo && (
                    <div className="flex items-start border-b border-gray-200 pb-3">
                      <span className="text-sm font-semibold text-gray-700 w-48">Tipo de Trabajo:</span>
                      <span className="text-sm text-gray-900">{tarea.datos_formulario.tipo_trabajo}</span>
                    </div>
                  )}

                  {/* Cantidad de Etiquetas */}
                  {tarea.cantidad_unidades && (
                    <div className="flex items-start border-b border-gray-200 pb-3">
                      <span className="text-sm font-semibold text-gray-700 w-48">Cantidad de Etiquetas:</span>
                      <span className="text-sm text-gray-900">{tarea.cantidad_unidades.toLocaleString()}</span>
                    </div>
                  )}

                  {/* Personal a cargo */}
                  <div className="flex items-start border-b border-gray-200 pb-3">
                    <span className="text-sm font-semibold text-gray-700 w-48">Personal a cargo:</span>
                    <span className="text-sm text-gray-900">
                      {tarea.encargado_nombre || tarea.encargado_email || 'No especificado'}
                    </span>
                  </div>

                  {/* Entregado a */}
                  <div className="flex items-start border-b border-gray-200 pb-3">
                    <span className="text-sm font-semibold text-gray-700 w-48">Entregado a:</span>
                    <span className="text-sm text-gray-900">
                      {tarea.solicitante_nombre || tarea.email_solicitante || 'No especificado'}
                    </span>
                  </div>

                  {/* Observaciones */}
                  {tarea.datos_formulario?.observaciones && (
                    <div className="flex items-start">
                      <span className="text-sm font-semibold text-gray-700 w-48">Observaciones:</span>
                      <span className="text-sm text-gray-900 flex-1">{tarea.datos_formulario.observaciones}</span>
                    </div>
                  )}

                  {/* Items de la tabla simple */}
                  {tarea.datos_formulario?.items_tabla_simple && tarea.datos_formulario.items_tabla_simple.length > 0 && (
                    <div className="mt-6">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-700">Detalle de Productos:</h4>
                        {detalleProductosLargo && (
                          <button
                            type="button"
                            onClick={() => setDetalleProductosExpandido(!detalleProductosExpandido)}
                            className="flex items-center gap-2 px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors cursor-pointer"
                          >
                            <i className={`${detalleProductosExpandido ? 'ri-eye-off-line' : 'ri-eye-line'}`}></i>
                            {detalleProductosExpandido ? 'Ocultar' : 'Ver todo'}
                          </button>
                        )}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                Código
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                Cantidad
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {(detalleProductosExpandido 
                              ? tarea.datos_formulario.items_tabla_simple 
                              : tarea.datos_formulario.items_tabla_simple.slice(0, 5)
                            ).map((item: any, index: number) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-4 py-2 text-sm text-gray-900">{item.codigo}</td>
                                <td className="px-4 py-2 text-sm text-gray-900">{item.cantidad.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {!detalleProductosExpandido && tarea.datos_formulario.items_tabla_simple.length > 5 && (
                          <div className="text-center py-2 text-xs text-gray-500 bg-gray-50 border-t border-gray-200">
                            Mostrando 5 de {tarea.datos_formulario.items_tabla_simple.length} productos
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Items de la tabla completa */}
                  {tarea.datos_formulario?.items_tabla_completa && tarea.datos_formulario.items_tabla_completa.length > 0 && (
                    <div className="mt-6">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-700">Detalle de Productos:</h4>
                        {detalleProductosLargo && (
                          <button
                            type="button"
                            onClick={() => setDetalleProductosExpandido(!detalleProductosExpandido)}
                            className="flex items-center gap-2 px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors cursor-pointer"
                          >
                            <i className={`${detalleProductosExpandido ? 'ri-eye-off-line' : 'ri-eye-line'}`}></i>
                            {detalleProductosExpandido ? 'Ocultar' : 'Ver todo'}
                          </button>
                        )}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                Descripción
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                Cantidad
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                Motivo
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {(detalleProductosExpandido 
                              ? tarea.datos_formulario.items_tabla_completa 
                              : tarea.datos_formulario.items_tabla_completa.slice(0, 5)
                            ).map((item: any, index: number) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-4 py-2 text-sm text-gray-900">{item.descripcion}</td>
                                <td className="px-4 py-2 text-sm text-gray-900">{item.cantidad.toLocaleString()}</td>
                                <td className="px-4 py-2 text-sm text-gray-900">{item.motivo}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {!detalleProductosExpandido && tarea.datos_formulario.items_tabla_completa.length > 5 && (
                          <div className="text-center py-2 text-xs text-gray-500 bg-gray-50 border-t border-gray-200">
                            Mostrando 5 de {tarea.datos_formulario.items_tabla_completa.length} productos
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Campos de procesamiento */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha Estimada de Entrega
                  </label>
                  <input
                    type="date"
                    value={fechaEstimada}
                    onChange={(e) => setFechaEstimada(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad de Unidades
                  </label>
                  <input
                    type="number"
                    value={cantidadUnidades}
                    onChange={(e) => setCantidadUnidades(e.target.value)}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción Breve
                  </label>
                  <textarea
                    value={descripcionBreve}
                    onChange={(e) => setDescripcionBreve(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>
              </div>

              {/* Campos de análisis */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Análisis y Seguimiento</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cantidad de Personas
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={`${cantidadPersonasCalculada} ${cantidadPersonasCalculada === 1 ? 'persona' : 'personas'}`}
                          readOnly
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <i className="ri-team-line text-gray-400 text-lg"></i>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMostrarModalPersonal(true)}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2"
                      >
                        <i className="ri-user-add-line"></i>
                        Asignar Personal
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      <i className="ri-information-line mr-1"></i>
                      Se calcula automáticamente según el personal asignado
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estado
                    </label>
                    <select
                      value={estado}
                      onChange={(e) => setEstado(e.target.value as TareaEstado)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {ESTADOS.map(est => (
                        <option key={est} value={est}>{est}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de Inicio
                    </label>
                    <input
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de Cierre
                    </label>
                    <input
                      type="date"
                      value={fechaCierre}
                      onChange={(e) => setFechaCierre(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Entregado A
                    </label>
                    <input
                      type="text"
                      value={entregadoA}
                      onChange={(e) => setEntregadoA(e.target.value)}
                      placeholder="Nombre de la persona que recibe"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Consumo e Inventario */}
          {activeTab === 'consumo' && (
            <div className="p-6 space-y-6">
              {/* Botón importar cotización */}
              {tarea.cotizacion_id && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleImportarCotizacion}
                    className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded-lg hover:bg-blue-200 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-download-line mr-2"></i>
                    Importar desde Cotización Asociada
                  </button>
                </div>
              )}

              {/* Nuevo item con buscador */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Agregar Item</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                    <select
                      value={nuevoItem.item_type}
                      onChange={(e) => {
                        const tipo = e.target.value as 'inventario' | 'producto' | 'cotizacion';
                        setNuevoItem(prev => ({ 
                          ...prev, 
                          item_type: tipo,
                          descripcion: '',
                          costo_unitario: 0,
                          producto_id: null,
                          inventario_id: null
                        }));
                        setItemBusqueda('');
                        setItemsOpciones([]);
                        setMostrarItemsOpciones(false);
                        setCotizacionesOpciones([]);
                        setMostrarCotizacionesOpciones(false);
                      }}
                      className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="inventario">Inventario</option>
                      <option value="producto">Productos</option>
                      <option value="cotizacion">Cotización</option>
                    </select>
                  </div>

                  <div className="md:col-span-2 relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {nuevoItem.item_type === 'cotizacion' ? 'Buscar Cotización' : 'Descripción'}
                      <span className="text-xs text-gray-500 ml-2">
                        {nuevoItem.item_type === 'cotizacion' 
                          ? '(Buscar por código)' 
                          : nuevoItem.item_type === 'inventario' 
                          ? 'Buscar en inventario...' 
                          : 'Buscar en productos...'}
                      </span>
                    </label>
                    
                    <div className="relative">
                      <input
                        type="text"
                        value={itemBusqueda}
                        onChange={(e) => setItemBusqueda(e.target.value)}
                        placeholder={
                          nuevoItem.item_type === 'cotizacion' 
                            ? 'Buscar cotización...' 
                            : nuevoItem.item_type === 'inventario' 
                            ? 'Buscar en inventario...' 
                            : 'Buscar en productos...'
                        }
                        className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm backdrop-blur-sm bg-white/90"
                      />
                      {buscandoItems && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <i className="ri-loader-4-line animate-spin text-gray-400"></i>
                        </div>
                      )}
                      {itemBusqueda && !buscandoItems && (
                        <button
                          type="button"
                          onClick={limpiarBusqueda}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      )}

                      {/* ✅ Dropdown de cotizaciones */}
                      {mostrarCotizacionesOpciones && cotizacionesOpciones.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white/95 backdrop-blur-md border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {cotizacionesOpciones.map((cotizacion) => (
                            <button
                              key={cotizacion.id}
                              type="button"
                              onClick={() => seleccionarCotizacion(cotizacion)}
                              className="w-full px-3 py-2 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors cursor-pointer"
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900 text-sm">{cotizacion.codigo}</div>
                                  <div className="text-xs text-gray-600">{cotizacion.cliente_nombre}</div>
                                </div>
                                <div className="text-sm font-semibold text-blue-600 ml-2">
                                  {formatCurrency(cotizacion.total)}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* ✅ Dropdown de items (inventario/productos) */}
                      {mostrarItemsOpciones && itemsOpciones.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white/95 backdrop-blur-md border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {itemsOpciones.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => seleccionarItem(item)}
                              className="w-full px-3 py-2 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors cursor-pointer"
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900 text-sm">{item.codigo}</div>
                                  <div className="text-xs text-gray-600">{item.nombre}</div>
                                </div>
                                <div className="text-sm font-semibold text-blue-600 ml-2">
                                  {formatCurrency(item.precio)}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Mensaje cuando no hay resultados */}
                      {itemBusqueda.length >= 2 && !buscandoItems && 
                       itemsOpciones.length === 0 && 
                       cotizacionesOpciones.length === 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white/95 backdrop-blur-md border border-gray-300 rounded-lg shadow-lg p-3">
                          <div className="text-sm text-gray-500 text-center">
                            <i className="ri-search-line mr-1"></i>
                            No se encontraron resultados
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                    <input
                      type="number"
                      value={nuevoItem.cantidad || ''}
                      onChange={(e) => setNuevoItem(prev => ({ ...prev, cantidad: parseFloat(e.target.value) || 0 }))}
                      min="0"
                      step="0.001"
                      placeholder="0"
                      disabled={nuevoItem.item_type === 'cotizacion'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Costo Unit.</label>
                    <input
                      type="text"
                      value={formatCurrency(nuevoItem.costo_unitario)}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                      title="El costo unitario se obtiene automáticamente del registro seleccionado"
                    />
                  </div>
                </div>

                {nuevoItem.item_type !== 'cotizacion' && (
                  <div className="flex justify-between items-center mt-4">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Total:</span> {formatCurrency(nuevoItem.cantidad * nuevoItem.costo_unitario)}
                    </div>
                    <button
                      type="button"
                      onClick={handleAgregarItem}
                      disabled={!nuevoItem.descripcion || nuevoItem.cantidad <= 0}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <i className="ri-add-line mr-2"></i>
                      Agregar
                    </button>
                  </div>
                )}

                {nuevoItem.item_type === 'cotizacion' && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <i className="ri-information-line text-blue-600 mt-0.5"></i>
                      <div className="text-sm text-blue-800">
                        <p className="font-medium">Importar desde Cotización</p>
                        <p className="text-xs mt-1">
                          Busca una cotización y selecciónala para importar automáticamente todos sus componentes BOM.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Lista de items */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Items Consumidos</h3>
                
                {items.length === 0 ? (
                  <div className="text-center text-gray-500 py-8 border border-gray-200 rounded-lg bg-gray-50">
                    <i className="ri-inbox-line text-4xl text-gray-300 mb-2"></i>
                    <p>No hay items agregados</p>
                    <p className="text-xs mt-1">Agregue items usando el formulario de arriba</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Tipo</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Descripción</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Cantidad</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Costo Unit.</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Total</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider w-24">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {items.map((item, index) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900 capitalize">
                              {item.item_type === 'inventario' ? 'Inventario' : 'Producto'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.descripcion}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.cantidad.toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">
                              {formatCurrency(item.costo_unitario)}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                              {formatCurrency(item.cantidad * item.costo_unitario)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                {/* ✅ Botón de ojito para ver componentes BOM */}
                                {item.item_type === 'producto' && item.producto_id && (
                                  <button
                                    type="button"
                                    onClick={() => verComponentesBOM(item)}
                                    className="text-blue-600 hover:text-blue-800 transition-colors cursor-pointer p-1"
                                    title="Ver componentes BOM"
                                  >
                                    <i className="ri-eye-line text-lg"></i>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleEliminarItem(index)}
                                  className="text-red-600 hover:text-red-800 transition-colors cursor-pointer p-1"
                                  title="Eliminar item"
                                >
                                  <i className="ri-delete-bin-line text-lg"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                        <tr>
                          <td colSpan={4} className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                            Total General:
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-blue-600 text-right">
                            {formatCurrency(calcularTotalCosto())}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab: Personal Asignado */}
          {activeTab === 'personal' && (
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Asignar Personal</h3>
              
              {colaboradores.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <i className="ri-team-line text-4xl text-gray-300 mb-2"></i>
                  <p>No hay colaboradores disponibles.</p>
                  <p className="text-sm">Configure colaboradores en el módulo de gestión.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {colaboradores.map((colaborador) => (
                    <label
                      key={colaborador.id}
                      className="flex items-start p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={personalSeleccionado.includes(colaborador.id)}
                        onChange={(e) => handlePersonalChange(colaborador.id, e.target.checked)}
                        className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="ml-3 flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {colaborador.nombre}
                        </div>
                        {colaborador.email && (
                          <div className="text-xs text-gray-500">
                            {colaborador.email}
                          </div>
                        )}
                        {colaborador.telefono && (
                          <div className="text-xs text-gray-500">
                            {colaborador.telefono}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer con botones */}
          <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">
              {activeTab === 'consumo' && (
                <span>Total de costos: {formatCurrency(calcularTotalCosto())}</span>
              )}
              {activeTab === 'personal' && (
                <span>{personalSeleccionado.length} colaborador{personalSeleccionado.length !== 1 ? 'es' : ''} seleccionado{personalSeleccionado.length !== 1 ? 's' : ''}</span>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <i className="ri-loader-4-line animate-spin"></i>
                    Guardando...
                  </div>
                ) : (
                  'Guardar Cambios'
                )}
              </button>
            </div>
          </div>
        </form>

        {/* ✅ Modal para ver componentes BOM */}
        {mostrarModalBOM && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Componentes del Producto</h3>
                  <p className="text-sm text-gray-500 mt-1">{productoSeleccionadoBOM}</p>
                </div>
                <button
                  onClick={() => setMostrarModalBOM(false)}
                  type="button"
                  className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>

              {/* Contenido */}
              <div className="flex-1 overflow-y-auto p-6">
                {cargandoBOM ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <i className="ri-loader-4-line animate-spin text-4xl text-blue-600 mb-4"></i>
                      <p className="text-gray-600">Cargando componentes...</p>
                    </div>
                  </div>
                ) : componentesBOM.length === 0 ? (
                  <div className="text-center text-gray-500 py-12">
                    <i className="ri-inbox-line text-4xl text-gray-300 mb-2"></i>
                    <p>Este producto no tiene componentes BOM definidos</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Código
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Descripción
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Cant. x Unidad
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Cantidad Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {componentesBOM.map((componente) => (
                          <tr key={componente.id_componente} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {componente.codigo_articulo}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {componente.descripcion_articulo}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">
                              {componente.cantidad_x_unidad.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-blue-600 text-right">
                              {componente.cantidad_total.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end p-4 border-t border-gray-200 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setMostrarModalBOM(false)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Asignar Personal (igual que en TareaFormModal) */}
        {mostrarModalPersonal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Asignar Personal</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Seleccione el personal que trabajará en esta tarea
                  </p>
                </div>
                <button
                  onClick={() => setMostrarModalPersonal(false)}
                  type="button"
                  className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>

              {/* Búsqueda */}
              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  <input
                    type="text"
                    value={busquedaColaborador}
                    onChange={(e) => setBusquedaColaborador(e.target.value)}
                    placeholder="Buscar por nombre o email..."
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                </div>
              </div>

              {/* Personal Seleccionado */}
              {colaboradoresSeleccionados.length > 0 && (
                <div className="p-4 bg-blue-50 border-b border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-blue-900">
                      Personal Asignado ({colaboradoresSeleccionados.length})
                    </h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {colaboradoresSeleccionados.map((colaborador) => (
                      <div
                        key={colaborador.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-sm"
                      >
                        <i className="ri-user-line text-blue-600"></i>
                        <span className="text-gray-900">{colaborador.nombre}</span>
                        <button
                          type="button"
                          onClick={() => eliminarPersonal(colaborador.id)}
                          className="text-red-500 hover:text-red-700 cursor-pointer"
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lista de Colaboradores Disponibles */}
              <div className="flex-1 overflow-y-auto p-4">
                {colaboradoresFiltrados.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <i className="ri-user-search-line text-4xl text-gray-300 mb-2"></i>
                    <p>No se encontraron colaboradores</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {colaboradoresFiltrados.map((colaborador) => {
                      const estaAsignado = personalSeleccionado.includes(colaborador.id);
                      return (
                        <div
                          key={colaborador.id}
                          className={`p-4 border rounded-lg transition-all cursor-pointer ${
                            estaAsignado
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'
                          }`}
                          onClick={() => {
                            if (estaAsignado) {
                              eliminarPersonal(colaborador.id);
                            } else {
                              agregarPersonal(colaborador.id);
                            }
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-medium text-gray-900">
                                  {colaborador.nombre}
                                </h4>
                                {estaAsignado && (
                                  <i className="ri-checkbox-circle-fill text-blue-600"></i>
                                )}
                              </div>
                              {colaborador.email && (
                                <p className="text-xs text-gray-500 mt-1">
                                  <i className="ri-mail-line mr-1"></i>
                                  {colaborador.email}
                                </p>
                              )}
                              {colaborador.telefono && (
                                <p className="text-xs text-gray-500 mt-1">
                                  <i className="ri-phone-line mr-1"></i>
                                  {colaborador.telefono}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-between items-center p-4 border-t border-gray-200 bg-gray-50">
                <div className="text-sm text-gray-600">
                  {colaboradoresSeleccionados.length} persona{colaboradoresSeleccionados.length !== 1 ? 's' : ''} seleccionada{colaboradoresSeleccionados.length !== 1 ? 's' : ''}
                </div>
                <button
                  type="button"
                  onClick={() => setMostrarModalPersonal(false)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Confirmar Selección
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ✅ POPUPS DE NOTIFICACIÓN Y CONFIRMACIÓN */}
        <NotificationPopup
          isOpen={notification.isOpen}
          type={notification.type}
          message={notification.message}
          onClose={hideNotification}
        />

        <ConfirmationDialog
          isOpen={confirmation.isOpen}
          type={confirmation.type}
          title={confirmation.title}
          message={confirmation.message}
          onConfirm={confirmation.onConfirm}
          onCancel={confirmation.onCancel}
        />
      </div>
    </div>
  );
}