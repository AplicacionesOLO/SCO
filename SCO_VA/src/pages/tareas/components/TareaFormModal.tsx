import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { tareaService } from '../../../services/tareaService';
import type { CreateTareaData, DepartamentoSolicitante, ClienteType, SolicitudEPA, SolicitudCOFERSA, TipoTrabajo, ItemTablaSimple, ItemTablaCompleta, TareaColaborador } from '../../../types/tarea';
import * as XLSX from 'xlsx';
import { usePermissions } from '../../../hooks/usePermissions';
import { showAlert } from '../../../utils/dialog';

interface TareaFormModalProps {
  onClose: () => void;
  onSave: () => void;
}

interface CotizacionOption {
  id: number;
  codigo: string;
  cliente_nombre: string;
  total: number;
  items: any[];
}

export default function TareaFormModal({ onClose, onSave }: TareaFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [usuarioActual, setUsuarioActual] = useState<any>(null);
  const { hasPermission } = usePermissions();
  
  // Búsqueda de cotización
  const [cotizacionBusqueda, setCotizacionBusqueda] = useState('');
  const [cotizacionSeleccionada, setCotizacionSeleccionada] = useState<CotizacionOption | null>(null);
  const [cotizacionesOpciones, setCotizacionesOpciones] = useState<CotizacionOption[]>([]);
  const [mostrarOpciones, setMostrarOpciones] = useState(false);
  const [buscandoCotizaciones, setBuscandoCotizaciones] = useState(false);
  
  // Formulario dinámico
  const [departamento, setDepartamento] = useState<DepartamentoSolicitante | ''>('');
  const [cliente, setCliente] = useState<ClienteType | ''>('');
  const [solicitudEPA, setSolicitudEPA] = useState<SolicitudEPA | ''>('');
  const [solicitudCOFERSA, setSolicitudCOFERSA] = useState<SolicitudCOFERSA | ''>('');
  const [tipoTrabajo, setTipoTrabajo] = useState<TipoTrabajo | ''>('');
  
  // Tablas dinámicas
  const [itemsTablaSimple, setItemsTablaSimple] = useState<ItemTablaSimple[]>([{ codigo: '', cantidad: 0 }]);
  const [itemsTablaCompleta, setItemsTablaCompleta] = useState<ItemTablaCompleta[]>([{ descripcion: '', cantidad: 0, motivo: '' }]);
  
  // Personal asignado (para calcular cantidad de personas)
  const [personalAsignado, setPersonalAsignado] = useState<string[]>([]);
  const [mostrarModalPersonal, setMostrarModalPersonal] = useState(false);
  const [colaboradoresDisponibles, setColaboradoresDisponibles] = useState<TareaColaborador[]>([]);
  const [busquedaColaborador, setBusquedaColaborador] = useState('');
  
  // Archivo Excel
  const [archivoExcel, setArchivoExcel] = useState<File | null>(null);
  
  // Campos adicionales
  const [fechaEstimada, setFechaEstimada] = useState('');
  const [descripcionBreve, setDescripcionBreve] = useState('');

  const fechaMinima = new Date().toISOString().split('T')[0];

  // Calcular cantidad de personas automáticamente
  const cantidadPersonas = personalAsignado.length;

  useEffect(() => {
    cargarUsuarioActual();
    cargarColaboradores();
  }, []);

  useEffect(() => {
    if (cotizacionBusqueda.length >= 3) {
      const timer = setTimeout(() => {
        buscarCotizaciones(cotizacionBusqueda);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setCotizacionesOpciones([]);
      setMostrarOpciones(false);
    }
  }, [cotizacionBusqueda]);

  const cargarUsuarioActual = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUsuarioActual(user);
      }
    } catch (error) {
      console.error('Error cargando usuario:', error);
    }
  };

  const buscarCotizaciones = async (termino: string) => {
    if (termino.length < 3) {
      setCotizacionesOpciones([]);
      return;
    }

    try {
      setBuscandoCotizaciones(true);

      // ✅ Obtener tienda actual del usuario
      const { data: tiendaActual } = await supabase
        .from('usuario_tienda_actual')
        .select('tienda_id')
        .eq('usuario_id', usuarioActual?.id)
        .single();

      console.log('🔍 Buscando cotizaciones con término:', termino);
      console.log('👤 Usuario ID:', usuarioActual?.id);
      console.log('🏪 Tienda actual:', tiendaActual?.tienda_id);

      // ✅ Construir query base - SIN filtro de tienda
      let queryPorCodigo = supabase
        .from('cotizaciones')
        .select(`
          id,
          codigo,
          total,
          tienda_id,
          clientes!cotizaciones_cliente_id_fkey(nombre_razon_social),
          cotizacion_items(*)
        `)
        .ilike('codigo', `%${termino}%`)
        .order('created_at', { ascending: false })
        .limit(10);

      let queryPorCliente = supabase
        .from('cotizaciones')
        .select(`
          id,
          codigo,
          total,
          tienda_id,
          clientes!cotizaciones_cliente_id_fkey(nombre_razon_social),
          cotizacion_items(*)
        `)
        .ilike('clientes.nombre_razon_social', `%${termino}%`)
        .order('created_at', { ascending: false })
        .limit(10);

      // ✅ OPCIONAL: Filtrar por tienda solo si el usuario tiene una tienda asignada
      // Si quieres que muestre TODAS las cotizaciones sin importar la tienda, comenta estas líneas:
      /*
      if (tiendaActual?.tienda_id) {
        queryPorCodigo = queryPorCodigo.eq('tienda_id', tiendaActual.tienda_id);
        queryPorCliente = queryPorCliente.eq('tienda_id', tiendaActual.tienda_id);
      }
      */

      // Ejecutar búsquedas
      const [resultadoCodigo, resultadoCliente] = await Promise.all([
        queryPorCodigo,
        queryPorCliente
      ]);

      console.log('📊 Resultados por código:', resultadoCodigo.data?.length || 0);
      console.log('📊 Resultados por cliente:', resultadoCliente.data?.length || 0);

      if (resultadoCodigo.error) {
        console.error('❌ Error en búsqueda por código:', resultadoCodigo.error);
      }
      if (resultadoCliente.error) {
        console.error('❌ Error en búsqueda por cliente:', resultadoCliente.error);
      }

      // Combinar resultados y eliminar duplicados
      const resultadosCombinados = [
        ...(resultadoCodigo.data || []),
        ...(resultadoCliente.data || [])
      ];

      console.log('📦 Total combinados:', resultadosCombinados.length);

      const idsUnicos = new Set();
      const resultadosUnicos = resultadosCombinados.filter(cot => {
        if (idsUnicos.has(cot.id)) {
          return false;
        }
        idsUnicos.add(cot.id);
        return true;
      });

      console.log('✅ Resultados únicos:', resultadosUnicos.length);

      // Filtrar cotizaciones sin cliente y mapear a opciones
      const opciones: CotizacionOption[] = resultadosUnicos
        .filter(cot => cot.clientes !== null) // Filtrar cotizaciones sin cliente
        .map(cot => ({
          id: cot.id,
          codigo: cot.codigo,
          cliente_nombre: cot.clientes?.nombre_razon_social || 'Sin cliente',
          total: cot.total,
          items: cot.cotizacion_items || []
        }));

      setCotizacionesOpciones(opciones);
      setMostrarOpciones(opciones.length > 0);
      
      if (opciones.length === 0) {
        console.log('⚠️ No se encontraron cotizaciones con el término:', termino);
      }
    } catch (error) {
      console.error('❌ Error en buscarCotizaciones:', error);
    } finally {
      setBuscandoCotizaciones(false);
    }
  };

  const seleccionarCotizacion = async (cotizacion: CotizacionOption) => {
    setCotizacionSeleccionada(cotizacion);
    setCotizacionBusqueda(`${cotizacion.codigo} - ${cotizacion.cliente_nombre}`);
    setMostrarOpciones(false);
    
    if (!descripcionBreve) {
      setDescripcionBreve(`Cotización ${cotizacion.codigo} - ${cotizacion.cliente_nombre}`);
    }

    try {
      console.log('🔄 Cargando items de la cotización:', cotizacion.id);
      
      // Obtener los productos de la cotización con sus BOM
      const { data: cotizacionItems, error: itemsError } = await supabase
        .from('cotizacion_items')
        .select('producto_id, cantidad')
        .eq('cotizacion_id', cotizacion.id);

      if (itemsError) {
        console.error('Error obteniendo items de cotización:', itemsError);
        return;
      }

      console.log('📦 Items de cotización encontrados:', cotizacionItems?.length || 0);

      if (!cotizacionItems || cotizacionItems.length === 0) {
        console.log('ℹ️ La cotización no tiene productos');
        return;
      }

      // Para cada producto, obtener sus componentes BOM
      const todosLosComponentes: any[] = [];

      for (const item of cotizacionItems) {
        if (!item.producto_id) continue;

        console.log('🔍 Buscando BOM para producto:', item.producto_id);

        // Para cada item de la cotización, buscar sus componentes BOM
        const { data: bomItems, error: bomError } = await supabase
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

        if (bomError) {
          console.error('Error obteniendo BOM:', bomError);
          continue;
        }

        if (bomItems && bomItems.length > 0) {
          console.log('✅ BOM encontrado:', bomItems.length, 'componentes');
          
          // Multiplicar las cantidades del BOM por la cantidad del producto en la cotización
          bomItems.forEach((bomItem: any) => {
            const cantidadTotal = bomItem.cantidad_x_unidad * item.cantidad;
            const costoUnitario = bomItem.inventario.costo_articulo || 0;
            
            // Buscar si ya existe este componente en la lista
            const existente = todosLosComponentes.find(
              comp => comp.id_articulo === bomItem.inventario.id_articulo
            );

            if (existente) {
              // Si ya existe, sumar la cantidad
              existente.cantidad += cantidadTotal;
            } else {
              // Si no existe, agregarlo
              todosLosComponentes.push({
                id_articulo: bomItem.inventario.id_articulo,
                codigo: bomItem.inventario.codigo_articulo,
                descripcion: bomItem.inventario.descripcion_articulo,
                cantidad: cantidadTotal,
                costo_unitario: costoUnitario,
                tipo: 'inventario'
              });
            }
          });
        }
      }

      console.log('📊 Total de componentes únicos:', todosLosComponentes.length);

      if (todosLosComponentes.length > 0) {
        // ✅ Cargar en la tabla simple (Código | Cantidad)
        const itemsSimples: ItemTablaSimple[] = todosLosComponentes.map(comp => ({
          id_articulo: comp.id_articulo,
          codigo: comp.codigo,
          descripcion: comp.descripcion,
          cantidad: comp.cantidad,
          tipo: 'inventario'
        }));
        setItemsTablaSimple(itemsSimples);

        // ✅ Cargar en la tabla completa (Descripción | Cantidad | Motivo)
        // Formato: "CODIGO - Descripción" | Cantidad | "Cotización COT-XXXXX"
        const itemsCompletos: ItemTablaCompleta[] = todosLosComponentes.map(comp => ({
          descripcion: `${comp.codigo} - ${comp.descripcion}`,
          cantidad: comp.cantidad,
          motivo: `Cotización ${cotizacion.codigo}`,
          precio: comp.costo_unitario
        }));
        setItemsTablaCompleta(itemsCompletos);

        console.log(`✅ Se cargaron ${todosLosComponentes.length} componentes en ambas tablas`);
        
        // Mostrar mensaje de éxito
        showAlert(`Se cargaron ${todosLosComponentes.length} componentes desde la cotización\n\n` +
              `Los productos se han agregado a:\n` +
              `• Ítems consumidos (Código y Cantidad)\n` +
              `• Consumo de Inventario (Descripción, Cantidad y Precio)`);
      } else {
        console.log('ℹ️ Los productos de la cotización no tienen componentes BOM definidos');
        showAlert('ℹ️ Los productos de la cotización no tienen componentes BOM definidos', { type: 'info' });
      }

    } catch (error) {
      console.error('Error cargando items de BOM:', error);
      showAlert('Error al cargar los componentes de la cotización', { type: 'error' });
    }
  };

  const limpiarCotizacion = () => {
    setCotizacionSeleccionada(null);
    setCotizacionBusqueda('');
    setCotizacionesOpciones([]);
  };

  const abrirCotizacion = () => {
    if (cotizacionSeleccionada) {
      window.open(`/cotizaciones/${cotizacionSeleccionada.id}`, '_blank');
    }
  };

  // Manejo de tabla simple (Código | Cantidad)
  const agregarFilaSimple = () => {
    setItemsTablaSimple([...itemsTablaSimple, { codigo: '', cantidad: 0 }]);
  };

  const eliminarFilaSimple = (index: number) => {
    if (itemsTablaSimple.length > 1) {
      setItemsTablaSimple(itemsTablaSimple.filter((_, i) => i !== index));
    }
  };

  const actualizarFilaSimple = (index: number, campo: keyof ItemTablaSimple, valor: any) => {
    const nuevosItems = [...itemsTablaSimple];
    nuevosItems[index] = { ...nuevosItems[index], [campo]: valor };
    setItemsTablaSimple(nuevosItems);
  };

  // Manejo de tabla completa (Descripción | Cantidad | Motivo)
  const agregarFilaCompleta = () => {
    setItemsTablaCompleta([...itemsTablaCompleta, { descripcion: '', cantidad: 0, motivo: '' }]);
  };

  const eliminarFilaCompleta = (index: number) => {
    if (itemsTablaCompleta.length > 1) {
      setItemsTablaCompleta(itemsTablaCompleta.filter((_, i) => i !== index));
    }
  };

  const actualizarFilaCompleta = (index: number, campo: keyof ItemTablaCompleta, valor: any) => {
    const nuevosItems = [...itemsTablaCompleta];
    nuevosItems[index] = { ...nuevosItems[index], [campo]: valor };
    setItemsTablaCompleta(nuevosItems);
  };

  // Manejo de archivo Excel
  const handleArchivoExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Detectar tipo de tabla según columnas
      if (jsonData.length > 0) {
        const primeraFila: any = jsonData[0];
        
        if ('Codigo' in primeraFila || 'codigo' in primeraFila) {
          // Tabla simple
          const items: ItemTablaSimple[] = jsonData.map((row: any) => ({
            codigo: row.Codigo || row.codigo || '',
            cantidad: parseFloat(row.Cantidad || row.cantidad || 0)
          }));
          setItemsTablaSimple(items);
        } else if ('Descripcion' in primeraFila || 'descripcion' in primeraFila) {
          // Tabla completa
          const items: ItemTablaCompleta[] = jsonData.map((row: any) => ({
            descripcion: row.Descripcion || row.descripcion || '',
            cantidad: parseFloat(row.Cantidad || row.cantidad || 0),
            motivo: row.Motivo || row.motivo || ''
          }));
          setItemsTablaCompleta(items);
        }
      }

      setArchivoExcel(file);
      showAlert('Archivo Excel cargado exitosamente');
    } catch (error) {
      console.error('Error procesando Excel:', error);
      showAlert('Error al procesar el archivo Excel', { type: 'error' });
    }
  };

  // Descargar plantilla Excel
  const descargarPlantillaExcel = () => {
    // Determinar qué tipo de plantilla descargar
    const esTablaSimple = mostrarTablaSimple();
    const esTablaCompleta = mostrarTablaCompleta();

    let worksheet: XLSX.WorkSheet;
    let nombreArchivo: string;

    if (esTablaSimple) {
      // Plantilla para tabla simple (Código | Cantidad)
      const datosPlantilla = [
        { Codigo: 'PROD-001', Cantidad: 100 },
        { Codigo: 'PROD-002', Cantidad: 50 },
        { Codigo: 'PROD-003', Cantidad: 75 }
      ];
      worksheet = XLSX.utils.json_to_sheet(datosPlantilla);
      nombreArchivo = 'Plantilla_Codigos_Cantidades.xlsx';
    } else if (esTablaCompleta) {
      // Plantilla para tabla completa (Descripción | Cantidad | Motivo)
      const datosPlantilla = [
        { Descripcion: 'Pallets de madera', Cantidad: 50, Motivo: 'Exportación' },
        { Descripcion: 'Contenedores plásticos', Cantidad: 20, Motivo: 'Almacenamiento' },
        { Descripcion: 'Cajas de cartón', Cantidad: 100, Motivo: 'Empaque' }
      ];
      worksheet = XLSX.utils.json_to_sheet(datosPlantilla);
      nombreArchivo = 'Plantilla_Descripcion_Cantidad_Motivo.xlsx';
    } else {
      // Plantilla genérica
      const datosPlantilla = [
        { Codigo: 'PROD-001', Cantidad: 100 }
      ];
      worksheet = XLSX.utils.json_to_sheet(datosPlantilla);
      nombreArchivo = 'Plantilla_Productos.xlsx';
    }

    // Crear libro de trabajo
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');

    // Descargar archivo
    XLSX.writeFile(workbook, nombreArchivo);
  };

  // Determinar qué tipo de tabla mostrar
  const mostrarTablaSimple = () => {
    if (departamento === 'Servicio al Cliente' && cliente === 'EPA') {
      return ['Códigos de Barra', 'Registros sanitarios', 'Traducción', 'Usos Delta Plus'].includes(solicitudEPA);
    }
    if (departamento === 'Servicio al Cliente' && cliente === 'COFERSA') {
      return true; // Siempre muestra tabla simple para COFERSA
    }
    return false;
  };

  const mostrarTablaCompleta = () => {
    if (departamento === 'Servicio al Cliente' && cliente === 'EPA') {
      return ['Licencias / contenedores / Pallets', 'Suministros'].includes(solicitudEPA);
    }
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!departamento) {
      showAlert('Debe seleccionar un departamento solicitante', { type: 'warning' });
      return;
    }

    if (departamento === 'Servicio al Cliente' && !cliente) {
      showAlert('Debe seleccionar un cliente', { type: 'warning' });
      return;
    }

    if (departamento === 'Servicio al Cliente' && cliente === 'EPA' && !solicitudEPA) {
      showAlert('Debe seleccionar qué desea solicitar', { type: 'warning' });
      return;
    }

    if (departamento === 'Servicio al Cliente' && cliente === 'COFERSA' && !solicitudCOFERSA) {
      showAlert('Debe seleccionar qué desea solicitar', { type: 'warning' });
      return;
    }

    if (departamento === 'Servicio al Cliente' && cliente === 'COFERSA' && !tipoTrabajo) {
      showAlert('Debe seleccionar el tipo de trabajo', { type: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const user = usuarioActual;
      if (!user) throw new Error('Usuario no autenticado');

      const tiendaActual = await supabase
        .from('usuario_tienda_actual')
        .select('tienda_id')
        .eq('usuario_id', user.id)
        .single();

      if (!tiendaActual.data) throw new Error('No hay tienda seleccionada');

      // Construir datos del formulario
      const datosFormulario: any = {
        departamento_solicitante: departamento,
        cliente: cliente || null,
        solicitud_epa: solicitudEPA || null,
        solicitud_cofersa: solicitudCOFERSA || null,
        tipo_trabajo: tipoTrabajo || null
      };

      // Agregar items según el tipo de tabla
      if (mostrarTablaSimple()) {
        datosFormulario.items_tabla_simple = itemsTablaSimple.filter(item => item.codigo && item.cantidad > 0);
      }

      if (mostrarTablaCompleta()) {
        datosFormulario.items_tabla_completa = itemsTablaCompleta.filter(item => item.descripcion && item.cantidad > 0);
      }

      // Calcular cantidad total de unidades (convertir a entero)
      let cantidadTotal = 0;
      if (datosFormulario.items_tabla_simple) {
        cantidadTotal = datosFormulario.items_tabla_simple.reduce((sum: number, item: ItemTablaSimple) => sum + item.cantidad, 0);
      }
      if (datosFormulario.items_tabla_completa) {
        cantidadTotal += datosFormulario.items_tabla_completa.reduce((sum: number, item: ItemTablaCompleta) => sum + item.cantidad, 0);
      }

      // Convertir a entero (redondear)
      const cantidadTotalEntero = Math.round(cantidadTotal);

      // Generar descripción breve automática si no existe
      let descripcionBreveFinal = descripcionBreve;
      if (!descripcionBreveFinal) {
        if (cotizacionSeleccionada) {
          descripcionBreveFinal = `Cotización ${cotizacionSeleccionada.codigo}`;
        } else {
          descripcionBreveFinal = `${departamento} - ${cliente || 'General'}`;
          if (solicitudEPA) descripcionBreveFinal += ` - ${solicitudEPA}`;
          if (solicitudCOFERSA) descripcionBreveFinal += ` - ${solicitudCOFERSA}`;
        }
      }

      if (descripcionBreveFinal.length > 100) {
        descripcionBreveFinal = descripcionBreveFinal.substring(0, 97) + '...';
      }

      const tareaData: CreateTareaData = {
        tienda_id: tiendaActual.data.tienda_id,
        solicitante_id: user.id,
        email_solicitante: user.email || '',
        datos_formulario: datosFormulario,
        estado: 'En Cola',
        cotizacion_id: cotizacionSeleccionada?.id,
        fecha_estimada_entrega: fechaEstimada || undefined,
        cantidad_unidades: cantidadTotalEntero > 0 ? cantidadTotalEntero : undefined,
        descripcion_breve: descripcionBreveFinal,
        personal_asignado: personalAsignado // ✅ Guardar personal asignado
      };

      await tareaService.createTarea(tareaData);
      
      console.log('✅ Tarea creada exitosamente');
      onSave();
    } catch (error) {
      console.error('Error creando tarea:', error);
      showAlert('Error al crear la tarea: ' + (error as Error).message, { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const cargarColaboradores = async () => {
    try {
      const data = await tareaService.getColaboradores();
      setColaboradoresDisponibles(data.filter(c => c.activo));
    } catch (error) {
      console.error('Error cargando colaboradores:', error);
    }
  };

  const agregarPersonal = (colaboradorId: string) => {
    if (!personalAsignado.includes(colaboradorId)) {
      setPersonalAsignado([...personalAsignado, colaboradorId]);
    }
  };

  const eliminarPersonal = (colaboradorId: string) => {
    setPersonalAsignado(personalAsignado.filter(id => id !== colaboradorId));
  };

  const colaboradoresFiltrados = colaboradoresDisponibles.filter(c => 
    c.nombre.toLowerCase().includes(busquedaColaborador.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(busquedaColaborador.toLowerCase()))
  );

  const colaboradoresSeleccionados = colaboradoresDisponibles.filter(c => 
    personalAsignado.includes(c.id)
  );

  // Función para manejar la carga de Excel
  const handleCargarExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Importar la librería xlsx dinámicamente
      const XLSX = await import('xlsx');
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = event.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

          if (jsonData.length < 2) {
            showAlert('El archivo Excel está vacío o no tiene datos válidos', { type: 'warning' });
            return;
          }

          // Obtener encabezados (primera fila)
          const headers = jsonData[0].map((h: any) => String(h).toLowerCase().trim());
          
          // Detectar tipo de tabla según las columnas
          const tieneDescripcion = headers.includes('descripcion') || headers.includes('descripción');
          const tieneMotivo = headers.includes('motivo');
          const tieneCodigo = headers.includes('codigo') || headers.includes('código');
          const tieneCantidad = headers.includes('cantidad');

          if (!tieneCantidad) {
            showAlert('El archivo Excel debe tener una columna "Cantidad"', { type: 'warning' });
            return;
          }

          // Procesar filas de datos (desde la segunda fila)
          const nuevasFilas: any[] = [];
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;

            const fila: any = {};
            
            // Mapear datos según el tipo de tabla
            if (tieneDescripcion && tieneMotivo) {
              // Tabla completa: Descripción | Cantidad | Motivo
              const descripcionIdx = headers.findIndex(h => h === 'descripcion' || h === 'descripción');
              const cantidadIdx = headers.findIndex(h => h === 'cantidad');
              const motivoIdx = headers.findIndex(h => h === 'motivo');

              fila.descripcion = row[descripcionIdx] || '';
              fila.cantidad = Number(row[cantidadIdx]) || 0;
              fila.motivo = row[motivoIdx] || '';
            } else if (tieneCodigo) {
              // Tabla simple: Código | Cantidad
              const codigoIdx = headers.findIndex(h => h === 'codigo' || h === 'código');
              const cantidadIdx = headers.findIndex(h => h === 'cantidad');

              fila.codigo = row[codigoIdx] || '';
              fila.cantidad = Number(row[cantidadIdx]) || 0;
            } else {
              showAlert('El archivo Excel debe tener las columnas correctas según el tipo de solicitud', { type: 'warning' });
              return;
            }

            // Solo agregar filas con datos válidos
            if ((fila.codigo || fila.descripcion) && fila.cantidad > 0) {
              nuevasFilas.push(fila);
            }
          }

          if (nuevasFilas.length === 0) {
            showAlert('No se encontraron datos válidos en el archivo Excel', { type: 'warning' });
            return;
          }

          // Reemplazar las filas actuales con las del Excel
          if (tieneDescripcion && tieneMotivo) {
            setItemsTablaCompleta(nuevasFilas);
          } else {
            setItemsTablaSimple(nuevasFilas);
          }

          showAlert(`Se importaron ${nuevasFilas.length} productos correctamente`);
          
          // Limpiar el input para permitir cargar el mismo archivo nuevamente
          e.target.value = '';
        } catch (error) {
          console.error('Error procesando Excel:', error);
          showAlert('Error al procesar el archivo Excel. Verifique que el formato sea correcto.', { type: 'error' });
        }
      };

      reader.onerror = () => {
        showAlert('Error al leer el archivo', { type: 'error' });
      };

      reader.readAsBinaryString(file);
    } catch (error) {
      console.error('Error cargando Excel:', error);
      showAlert('Error al cargar el archivo Excel', { type: 'error' });
    }
  };

  const cargarComponentesDesdeCotizacion = async (cotizacionId: number) => {
    try {
      const { data: cotizacionItems, error: itemsError } = await supabase
        .from('cotizacion_items')
        .select('producto_id, cantidad')
        .eq('cotizacion_id', cotizacionId);

      if (itemsError) {
        console.error('Error obteniendo items de cotización:', itemsError);
        return;
      }

      if (!cotizacionItems || cotizacionItems.length === 0) {
        showAlert('La cotización no tiene productos asociados', { type: 'info' });
        return;
      }

      const todosLosComponentes: any[] = [];

      for (const item of cotizacionItems) {
        const { data: bomItems, error: bomError } = await supabase
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

        if (bomError) {
          console.error('Error obteniendo BOM:', bomError);
          continue;
        }

        if (bomItems && bomItems.length > 0) {
          bomItems.forEach((bomItem: any) => {
            const cantidadTotal = bomItem.cantidad_x_unidad * item.cantidad;
            const costoUnitario = bomItem.inventario.costo_articulo || 0;
            const existente = todosLosComponentes.find(
              (c) => c.id === bomItem.id_componente
            );

            if (existente) {
              existente.cantidad += cantidadTotal;
            } else {
              todosLosComponentes.push({
                id: bomItem.id_componente,
                tipo: 'Inventario',
                descripcion: `${bomItem.inventario.codigo_articulo} - ${bomItem.inventario.descripcion_articulo}`,
                cantidad: cantidadTotal,
                costo_unitario: costoUnitario
              });
            }
          });
        }
      }

      if (todosLosComponentes.length === 0) {
        showAlert('Los productos de la cotización no tienen componentes BOM definidos', { type: 'info' });
        return;
      }

      const itemsSimples: ItemTablaSimple[] = todosLosComponentes.map((comp) => ({
        codigo: comp.descripcion,
        cantidad: comp.cantidad
      }));
      setItemsTablaSimple(itemsSimples);

      const itemsCompletos: ItemTablaCompleta[] = todosLosComponentes.map((comp) => ({
        descripcion: comp.descripcion,
        cantidad: comp.cantidad,
        motivo: '',
        precio: comp.costo_unitario
      }));
      setItemsTablaCompleta(itemsCompletos);

      showAlert(`Se cargaron ${todosLosComponentes.length} componentes desde la cotización`);
    } catch (error) {
      console.error('Error al cargar componentes:', error);
      showAlert('Error al cargar los componentes de la cotización', { type: 'error' });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Nueva Solicitud de Trabajo</h2>
            <p className="text-sm text-gray-500 mt-1">
              Solicitante: {usuarioActual?.email || 'Cargando...'}
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Búsqueda de Cotización */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <i className="ri-file-list-3-line"></i>
              ¿Desea importar datos desde una cotización existente?
            </h3>
            <div className="relative">
              <input
                type="text"
                value={cotizacionBusqueda}
                onChange={(e) => {
                  setCotizacionBusqueda(e.target.value);
                  if (!e.target.value) {
                    limpiarCotizacion();
                  }
                }}
                onFocus={() => cotizacionesOpciones.length > 0 && setMostrarOpciones(true)}
                placeholder="Buscar por código de cotización o nombre del cliente..."
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {buscandoCotizaciones && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <i className="ri-loader-4-line animate-spin text-gray-400"></i>
                </div>
              )}
              {cotizacionSeleccionada && (
                <button
                  type="button"
                  onClick={limpiarCotizacion}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <i className="ri-close-circle-line text-xl"></i>
                </button>
              )}
            </div>

            {/* Dropdown de opciones */}
            {mostrarOpciones && cotizacionesOpciones.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {cotizacionesOpciones.map((cotizacion) => (
                  <button
                    key={cotizacion.id}
                    type="button"
                    onClick={() => seleccionarCotizacion(cotizacion)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {cotizacion.codigo}
                        </div>
                        <div className="text-sm text-gray-600">
                          {cotizacion.cliente_nombre}
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-blue-600">
                        ₡{cotizacion.total.toLocaleString('es-CR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {cotizacionBusqueda.length >= 3 && !buscandoCotizaciones && cotizacionesOpciones.length === 0 && (
              <div className="mt-2 text-sm text-gray-500 text-center">
                No se encontraron cotizaciones
              </div>
            )}

            {cotizacionSeleccionada && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-800">
                  <i className="ri-checkbox-circle-line"></i>
                  <span className="text-sm font-medium">
                    Cotización seleccionada: {cotizacionSeleccionada.codigo}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Formulario Dinámico */}
          <div className="space-y-6 border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900">Información de la Solicitud</h3>

            {/* 1. Departamento Solicitante */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Departamento Solicitante <span className="text-red-500">*</span>
              </label>
              <select
                value={departamento}
                onChange={(e) => {
                  setDepartamento(e.target.value as DepartamentoSolicitante);
                  setCliente('');
                  setSolicitudEPA('');
                  setSolicitudCOFERSA('');
                  setTipoTrabajo('');
                }}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleccionar departamento...</option>
                <option value="Servicio al Cliente">Servicio al Cliente</option>
                <option value="Zona Franca">Zona Franca</option>
                <option value="Otros">Otros</option>
              </select>
            </div>

            {/* 2. Cliente (solo si es Servicio al Cliente) */}
            {departamento === 'Servicio al Cliente' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cliente <span className="text-red-500">*</span>
                </label>
                <select
                  value={cliente}
                  onChange={(e) => {
                    setCliente(e.target.value as ClienteType);
                    setSolicitudEPA('');
                    setSolicitudCOFERSA('');
                    setTipoTrabajo('');
                  }}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Seleccionar cliente...</option>
                  <option value="EPA">EPA</option>
                  <option value="COFERSA">COFERSA</option>
                </select>
              </div>
            )}

            {/* 3. Solicitud EPA */}
            {departamento === 'Servicio al Cliente' && cliente === 'EPA' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ¿Qué deseas solicitar? <span className="text-red-500">*</span>
                </label>
                <select
                  value={solicitudEPA}
                  onChange={(e) => setSolicitudEPA(e.target.value as SolicitudEPA)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Seleccionar tipo de solicitud...</option>
                  <option value="Códigos de Barra">Códigos de Barra</option>
                  <option value="Registros sanitarios">Registros sanitarios</option>
                  <option value="Licencias / contenedores / Pallets">Licencias / contenedores / Pallets</option>
                  <option value="Traducción">Traducción</option>
                  <option value="Suministros">Suministros</option>
                  <option value="Usos Delta Plus">Usos Delta Plus</option>
                  <option value="Armado de sillas">Armado de sillas</option>
                </select>
              </div>
            )}

            {/* 4. Solicitud COFERSA */}
            {departamento === 'Servicio al Cliente' && cliente === 'COFERSA' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ¿Qué deseas solicitar? <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={solicitudCOFERSA}
                    onChange={(e) => setSolicitudCOFERSA(e.target.value as SolicitudCOFERSA)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Seleccionar tipo de solicitud...</option>
                    <option value="Etiquetado">Etiquetado</option>
                    <option value="Cambio de imagen">Cambio de imagen</option>
                    <option value="Licencias">Licencias</option>
                    <option value="Suministros">Suministros</option>
                    <option value="Re-empacar productos">Re-empacar productos</option>
                  </select>
                </div>

                {solicitudCOFERSA && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      El siguiente trabajo es para: <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={tipoTrabajo}
                      onChange={(e) => setTipoTrabajo(e.target.value as TipoTrabajo)}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Seleccionar tipo de trabajo...</option>
                      <option value="Trabajo Interno (Stock)">Trabajo Interno (Stock)</option>
                      <option value="Clientes de Cofersa">Clientes de Cofersa</option>
                    </select>
                  </div>
                )}
              </>
            )}

            {/* Tabla Simple: Código | Cantidad */}
            {mostrarTablaSimple() && (
              <div className="border border-gray-300 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700">
                    {cliente === 'COFERSA' ? 'Código y cantidades a etiquetar' : 'Código y cantidades'} <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={descargarPlantillaExcel}
                      className="px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded cursor-pointer hover:bg-green-100 transition-colors whitespace-nowrap"
                    >
                      <i className="ri-download-2-line mr-1"></i>
                      Descargar Plantilla
                    </button>
                    <label className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded cursor-pointer hover:bg-blue-100 transition-colors whitespace-nowrap">
                      <i className="ri-file-excel-2-line mr-1"></i>
                      Cargar Excel
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleArchivoExcel}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={agregarFilaSimple}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <i className="ri-add-line mr-1"></i>
                      Agregar Fila
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border border-gray-300">Código</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border border-gray-300">Cantidad</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-700 border border-gray-300 w-20">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemsTablaSimple.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="border border-gray-300 p-1">
                            <input
                              type="text"
                              value={item.codigo}
                              onChange={(e) => actualizarFilaSimple(index, 'codigo', e.target.value)}
                              placeholder="Código del producto"
                              className="w-full px-2 py-1 text-sm border-0 focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className="border border-gray-300 p-1">
                            <input
                              type="number"
                              value={item.cantidad}
                              onChange={(e) => actualizarFilaSimple(index, 'cantidad', parseFloat(e.target.value) || 0)}
                              placeholder="0"
                              min="0"
                              step="0.01"
                              className="w-full px-2 py-1 text-sm border-0 focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className="border border-gray-300 p-1 text-center">
                            <button
                              type="button"
                              onClick={() => eliminarFilaSimple(index)}
                              disabled={itemsTablaSimple.length === 1}
                              className="text-red-600 hover:text-red-800 disabled:text-gray-300 disabled:cursor-not-allowed cursor-pointer"
                            >
                              <i className="ri-delete-bin-line"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Formato Excel: Columnas "Codigo" y "Cantidad"
                </p>
              </div>
            )}

            {/* Tabla Completa: Descripción | Cantidad | Motivo */}
            {mostrarTablaCompleta() && (
              <div className="border border-gray-300 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700">
                    Descripción, cantidad y motivo <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={descargarPlantillaExcel}
                      className="px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded cursor-pointer hover:bg-green-100 transition-colors whitespace-nowrap"
                    >
                      <i className="ri-download-2-line mr-1"></i>
                      Descargar Plantilla
                    </button>
                    <label className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded cursor-pointer hover:bg-blue-100 transition-colors whitespace-nowrap">
                      <i className="ri-file-excel-2-line mr-1"></i>
                      Cargar Excel
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleArchivoExcel}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={agregarFilaCompleta}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <i className="ri-add-line mr-1"></i>
                      Agregar Fila
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border border-gray-300">Descripción</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border border-gray-300">Cantidad</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border border-gray-300">Motivo</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-700 border border-gray-300 w-20">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemsTablaCompleta.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="border border-gray-300 p-1">
                            <input
                              type="text"
                              value={item.descripcion}
                              onChange={(e) => actualizarFilaCompleta(index, 'descripcion', e.target.value)}
                              placeholder="Descripción del item"
                              className="w-full px-2 py-1 text-sm border-0 focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className="border border-gray-300 p-1">
                            <input
                              type="number"
                              value={item.cantidad}
                              onChange={(e) => actualizarFilaCompleta(index, 'cantidad', parseFloat(e.target.value) || 0)}
                              placeholder="0"
                              min="0"
                              step="0.01"
                              className="w-full px-2 py-1 text-sm border-0 focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className="border border-gray-300 p-1">
                            <input
                              type="text"
                              value={item.motivo}
                              onChange={(e) => actualizarFilaCompleta(index, 'motivo', e.target.value)}
                              placeholder="Motivo de la solicitud"
                              className="w-full px-2 py-1 text-sm border-0 focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className="border border-gray-300 p-1 text-center">
                            <button
                              type="button"
                              onClick={() => eliminarFilaCompleta(index)}
                              disabled={itemsTablaCompleta.length === 1}
                              className="text-red-600 hover:text-red-800 disabled:text-gray-300 disabled:cursor-not-allowed cursor-pointer"
                            >
                              <i className="ri-delete-bin-line"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Formato Excel: Columnas "Descripcion", "Cantidad" y "Motivo"
                </p>
              </div>
            )}

            {/* Campos Adicionales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-200 pt-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha Estimada de Entrega
                </label>
                <input
                  type="date"
                  value={fechaEstimada}
                  onChange={(e) => setFechaEstimada(e.target.value)}
                  min={fechaMinima}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Campo "Cantidad de Personas" eliminado - solo se asigna en Procesar */}
            </div>

            {/* Descripción Breve y Botón Ver Cotización */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción Breve
                </label>
                <input
                  type="text"
                  value={descripcionBreve}
                  onChange={(e) => setDescripcionBreve(e.target.value)}
                  placeholder="Resumen de la solicitud..."
                  maxLength={100}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {descripcionBreve.length}/100 caracteres
                </p>
              </div>

              {/* Botón Ver Cotización */}
              {cotizacionSeleccionada && hasPermission('cotizaciones:read') && (
                <div>
                  <button
                    type="button"
                    onClick={abrirCotizacion}
                    className="w-full px-4 py-3 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-300 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <i className="ri-external-link-line"></i>
                    Ver Cotización Completa
                  </button>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Se abrirá en una nueva pestaña para revisar o modificar
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 border-t border-gray-200 pt-6 sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <i className="ri-loader-4-line animate-spin"></i>
                  Guardando...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <i className="ri-save-line"></i>
                  Guardar y Enviar
                </div>
              )}
            </button>
          </div>
        </form>

        {/* Modal de Asignar Personal */}
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
                      const estaAsignado = personalAsignado.includes(colaborador.id);
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
      </div>
    </div>
  );
}