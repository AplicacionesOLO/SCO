import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useNotification } from '../../hooks/useNotification';
// 🔧 IMPORTAR useAuth para obtener currentStore
import { useAuth } from '../../hooks/useAuth';

interface ItemOptimizador {
  id: number;
  tipo_item: string;
  descripcion: string;
  dimensiones: string;
  material: string;
  tapacantos: string;
  cnc1: string;
  cnc2: string;
  cnc_cantidad: string; // 🆕 Nueva columna para CNC con cantidad
  cnc_precio: number; // 🆕 Precio calculado de CNC
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  datos_optimizador?: any;
  producto_id?: number;
}

interface CotizacionData {
  id: number;
  codigo: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  subtotal: number;
  impuestos: number;
  total: number;
  moneda: string;
  clientes: {
    id: number;
    nombre_razon_social: string;
    identificacion: string;
    telefono_numero: string;
    correo_principal: string;
    otras_senas: string;
  };
}

export default function CotizacionOptimizadorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  // 🔧 AGREGAR useAuth para obtener currentStore
  const { currentStore } = useAuth();
  const [cotizacion, setCotizacion] = useState<CotizacionData | null>(null);
  const [itemsOptimizador, setItemsOptimizador] = useState<ItemOptimizador[]>([]);
  const [itemsAdicionales, setItemsAdicionales] = useState<ItemOptimizador[]>([]);
  const [loading, setLoading] = useState(true);

  // 🆕 Estados para desglose de costos
  const [costosMateriales, setCostosMateriales] = useState(0);
  const [costosTapacantos, setCostosTapacantos] = useState(0);
  const [costosCNC, setCostosCNC] = useState(0);
  const [costosOtros, setCostosOtros] = useState(0);

  // Calcular días de validez
  const calcularDiasValidez = () => {
    if (!cotizacion) return 30;
    
    const fechaEmision = new Date(cotizacion.fecha_emision);
    const fechaVencimiento = new Date(cotizacion.fecha_vencimiento);
    
    // Calcular diferencia en milisegundos y convertir a días
    const diferenciaMilisegundos = fechaVencimiento.getTime() - fechaEmision.getTime();
    const diasValidez = Math.round(diferenciaMilisegundos / (1000 * 60 * 60 * 24));
    
    return diasValidez > 0 ? diasValidez : 1; // Mínimo 1 día
  };

  // Función para formatear moneda con símbolo
  const formatCurrencyWithSymbol = (value: number, currency: string = 'CRC') => {
    const symbol = currency === 'CRC' ? '₡' : '$';
    const formatted = value.toLocaleString('es-CR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return `${symbol}${formatted}`;
  };

  // Calcular subtotales por tabla
  const subtotalOptimizador = itemsOptimizador.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  const subtotalAdicionales = itemsAdicionales.reduce((sum, item) => sum + (item.subtotal || 0), 0);

  // 🆕 Función para calcular cantidad de metros lineales de tapacanto
  const calcularMetrosTapacanto = (lado: 'superior' | 'inferior' | 'izquierdo' | 'derecho', largo: number, ancho: number): number => {
    // Superior e Inferior: usar el LARGO de la pieza
    if (lado === 'superior' || lado === 'inferior') {
      return largo / 1000; // Convertir mm a metros
    }
    // Izquierdo y Derecho: usar el ANCHO de la pieza
    if (lado === 'izquierdo' || lado === 'derecho') {
      return ancho / 1000; // Convertir mm a metros
    }
    return 0;
  };

  // 🆕 Función para formatear tapacantos con código y cantidad
  const formatearTapacantos = (datosOpt: any): string => {
    if (!datosOpt) return '';

    const largo = datosOpt.largo || 0;
    const ancho = datosOpt.ancho || 0;
    const tapacantos = [];

    if (datosOpt.tapacanto_superior && datosOpt.tapacanto_superior !== 'Sin TC') {
      const metros = calcularMetrosTapacanto('superior', largo, ancho);
      tapacantos.push(`Sup: ${datosOpt.tapacanto_superior} (${metros.toFixed(2)}m)`);
    }
    if (datosOpt.tapacanto_inferior && datosOpt.tapacanto_inferior !== 'Sin TC') {
      const metros = calcularMetrosTapacanto('inferior', largo, ancho);
      tapacantos.push(`Inf: ${datosOpt.tapacanto_inferior} (${metros.toFixed(2)}m)`);
    }
    if (datosOpt.tapacanto_izquierdo && datosOpt.tapacanto_izquierdo !== 'Sin TC') {
      const metros = calcularMetrosTapacanto('izquierdo', largo, ancho);
      tapacantos.push(`Izq: ${datosOpt.tapacanto_izquierdo} (${metros.toFixed(2)}m)`);
    }
    if (datosOpt.tapacanto_derecho && datosOpt.tapacanto_derecho !== 'Sin TC') {
      const metros = calcularMetrosTapacanto('derecho', largo, ancho);
      tapacantos.push(`Der: ${datosOpt.tapacanto_derecho} (${metros.toFixed(2)}m)`);
    }

    return tapacantos.length > 0 ? tapacantos.join(', ') : '';
  };

  // 🆕 Función para formatear CNC con código y cantidad
  const formatearCNC = (datosOpt: any): string => {
    const cnc = [];
    
    // 🔧 CORREGIDO: Usar cnc1_codigo y cnc2_codigo (no cnc1/cnc2)
    if (datosOpt.cnc1_codigo && datosOpt.cnc1_cantidad) {
      cnc.push(`CNC1: ${datosOpt.cnc1_codigo} x ${datosOpt.cnc1_cantidad}`);
    }
    if (datosOpt.cnc2_codigo && datosOpt.cnc2_cantidad) {
      cnc.push(`CNC2: ${datosOpt.cnc2_codigo} x ${datosOpt.cnc2_cantidad}`);
    }

    return cnc.length > 0 ? cnc.join(', ') : '-';
  };

  // 🆕 Función para calcular precio de CNC
  const calcularPrecioCNC = async (datosOpt: any): Promise<number> => {
    let precioCNC = 0;

    try {
      // 🔧 PRIMERO: Intentar usar el costo_cnc guardado en datos_optimizador
      if (datosOpt.costo_cnc && datosOpt.costo_cnc > 0) {
        console.log('✅ [CNC] Usando costo_cnc guardado:', datosOpt.costo_cnc);
        return datosOpt.costo_cnc;
      }

      // 🔧 SEGUNDO: Si no existe, calcular desde inventario
      const codigosCNC = [];
      if (datosOpt.cnc1_codigo) codigosCNC.push(datosOpt.cnc1_codigo);
      if (datosOpt.cnc2_codigo) codigosCNC.push(datosOpt.cnc2_codigo);

      if (codigosCNC.length > 0) {
        console.log('🔍 [CNC] Buscando códigos en inventario:', codigosCNC);
        console.log('🔍 [CNC] Tienda actual:', currentStore?.id, currentStore?.nombre);
        
        // 🔧 BUSCAR EN INVENTARIO - PRIMERO CON FILTRO DE TIENDA
        let inventarioCNC = null;
        let error = null;

        if (currentStore?.id) {
          const result = await supabase
            .from('inventario')
            .select('codigo_articulo, precio_articulo')
            .in('codigo_articulo', codigosCNC)
            .eq('tienda_id', currentStore.id)
            .eq('activo', true);
          
          inventarioCNC = result.data;
          error = result.error;

          console.log('🔍 [CNC] Búsqueda con filtro de tienda:', {
            encontrados: inventarioCNC?.length || 0,
            error: error?.message
          });
        }

        // 🔧 SI NO SE ENCONTRÓ NADA, BUSCAR SIN FILTRO DE TIENDA (artículos globales)
        if (!inventarioCNC || inventarioCNC.length === 0) {
          console.log('🔍 [CNC] Buscando sin filtro de tienda (artículos globales)...');
          
          const result = await supabase
            .from('inventario')
            .select('codigo_articulo, precio_articulo')
            .in('codigo_articulo', codigosCNC)
            .eq('activo', true);
          
          inventarioCNC = result.data;
          error = result.error;

          console.log('🔍 [CNC] Búsqueda sin filtro de tienda:', {
            encontrados: inventarioCNC?.length || 0,
            error: error?.message
          });
        }

        if (error) {
          console.error('❌ [CNC] Error buscando en inventario:', error);
        }

        if (inventarioCNC && inventarioCNC.length > 0) {
          console.log('✅ [CNC] Artículos encontrados en inventario:', inventarioCNC);
          
          const preciosMap = new Map(
            inventarioCNC.map(item => [item.codigo_articulo, item.precio_articulo])
          );

          console.log('💰 [CNC] Mapa de precios creado:', Array.from(preciosMap.entries()));

          // Calcular CNC1
          if (datosOpt.cnc1_codigo) {
            const precio = preciosMap.get(datosOpt.cnc1_codigo) || 0;
            const cantidad = datosOpt.cnc1_cantidad || 1;
            const subtotal = precio * cantidad;
            precioCNC += subtotal;
            console.log(`💰 [CNC1] Código: ${datosOpt.cnc1_codigo}, Precio: ₡${precio}, Cantidad: ${cantidad}, Subtotal: ₡${subtotal}`);
          }

          // Calcular CNC2
          if (datosOpt.cnc2_codigo) {
            const precio = preciosMap.get(datosOpt.cnc2_codigo) || 0;
            const cantidad = datosOpt.cnc2_cantidad || 1;
            const subtotal = precio * cantidad;
            precioCNC += subtotal;
            console.log(`💰 [CNC2] Código: ${datosOpt.cnc2_codigo}, Precio: ₡${precio}, Cantidad: ${cantidad}, Subtotal: ₡${subtotal}`);
          }
        } else {
          console.warn('⚠️ [CNC] No se encontraron artículos CNC en inventario para códigos:', codigosCNC);
        }
      } else {
        console.log('ℹ️ [CNC] No hay códigos CNC para buscar');
      }
    } catch (error) {
      console.error('❌ [CNC] Error calculando precio CNC:', error);
    }

    console.log('💰 [CNC TOTAL CALCULADO]:', precioCNC);
    return precioCNC;
  };

  // 🔧 NUEVA FUNCIÓN: Extraer datos CNC de múltiples fuentes
  const extractCncData = (item: any): { cnc1_codigo: string; cnc1_cantidad: number; cnc2_codigo: string; cnc2_cantidad: number } => {
    const datosOpt = item.datos_optimizador;
    
    // Función auxiliar para parsear strings legacy "77788 x 2"
    const parseLegacyCNC = (value: any): { codigo: string; cantidad: number } => {
      if (!value) return { codigo: '', cantidad: 0 };
      
      const str = String(value).trim();
      
      // Si es "-" o "Sin CNC" o vacío
      if (!str || str === '-' || str === 'Sin CNC' || str === '0') {
        return { codigo: '', cantidad: 0 };
      }
      
      // Si tiene formato "CODIGO x CANTIDAD" (ej: "77788 x 2")
      if (str.includes(' x ')) {
        const parts = str.split(' x ');
        const codigo = parts[0].trim();
        const cantidad = parseInt(parts[1]) || 0;
        return { codigo, cantidad };
      }
      
      // Si es solo el código (sin cantidad)
      return { codigo: str, cantidad: 1 };
    };

    let cnc1_codigo = '';
    let cnc1_cantidad = 0;
    let cnc2_codigo = '';
    let cnc2_cantidad = 0;

    if (datosOpt) {
      // CASO A: Columnas directas en datos_optimizador
      if (datosOpt.cnc1_codigo) {
        cnc1_codigo = String(datosOpt.cnc1_codigo).trim();
        cnc1_cantidad = datosOpt.cnc1_cantidad || 1;
      }
      if (datosOpt.cnc2_codigo) {
        cnc2_codigo = String(datosOpt.cnc2_codigo).trim();
        cnc2_cantidad = datosOpt.cnc2_cantidad || 1;
      }

      // CASO B: JSON anidado datos_optimizador.cnc.cnc1/cnc2
      if (!cnc1_codigo && datosOpt.cnc?.cnc1) {
        cnc1_codigo = String(datosOpt.cnc.cnc1.codigo || '').trim();
        cnc1_cantidad = datosOpt.cnc.cnc1.cantidad || 1;
      }
      if (!cnc2_codigo && datosOpt.cnc?.cnc2) {
        cnc2_codigo = String(datosOpt.cnc.cnc2.codigo || '').trim();
        cnc2_cantidad = datosOpt.cnc.cnc2.cantidad || 1;
      }

      // CASO C: Legacy strings "77788 x 2" en cnc1/cnc2
      if (!cnc1_codigo && datosOpt.cnc1) {
        const parsed = parseLegacyCNC(datosOpt.cnc1);
        cnc1_codigo = parsed.codigo;
        cnc1_cantidad = parsed.cantidad;
      }
      if (!cnc2_codigo && datosOpt.cnc2) {
        const parsed = parseLegacyCNC(datosOpt.cnc2);
        cnc2_codigo = parsed.codigo;
        cnc2_cantidad = parsed.cantidad;
      }
    }

    // CASO D: Columnas directas en item (fuera de datos_optimizador)
    if (!cnc1_codigo && item.cnc1_codigo) {
      cnc1_codigo = String(item.cnc1_codigo).trim();
      cnc1_cantidad = item.cnc1_cantidad || 1;
    }
    if (!cnc2_codigo && item.cnc2_codigo) {
      cnc2_codigo = String(item.cnc2_codigo).trim();
      cnc2_cantidad = item.cnc2_cantidad || 1;
    }

    // CASO E: Legacy strings en item.cnc1/cnc2
    if (!cnc1_codigo && item.cnc1) {
      const parsed = parseLegacyCNC(item.cnc1);
      cnc1_codigo = parsed.codigo;
      cnc1_cantidad = parsed.cantidad;
    }
    if (!cnc2_codigo && item.cnc2) {
      const parsed = parseLegacyCNC(item.cnc2);
      cnc2_codigo = parsed.codigo;
      cnc2_cantidad = parsed.cantidad;
    }

    // Filtrar valores inválidos
    if (cnc1_codigo === '0' || cnc1_codigo === 'Sin CNC') {
      cnc1_codigo = '';
      cnc1_cantidad = 0;
    }
    if (cnc2_codigo === '0' || cnc2_codigo === 'Sin CNC') {
      cnc2_codigo = '';
      cnc2_cantidad = 0;
    }

    return { cnc1_codigo, cnc1_cantidad, cnc2_codigo, cnc2_cantidad };
  };

  useEffect(() => {
    const cargarCotizacion = async () => {
      if (!id) return;

      try {
        setLoading(true);
        console.log('🔍 [OPTIMIZADOR] Cargando cotización ID:', id);

        // Convertir id a número
        const cotizacionId = parseInt(id, 10);
        if (isNaN(cotizacionId)) {
          showNotification('error', 'ID de cotización inválido');
          navigate('/cotizaciones');
          return;
        }

        // 1. Cargar cotización con información del cliente
        const { data: cotizacionData, error: cotizacionError } = await supabase
          .from('cotizaciones')
          .select(`
            id,
            codigo,
            fecha_emision,
            fecha_vencimiento,
            subtotal,
            impuestos,
            total,
            moneda,
            clientes!cliente_id (
              id,
              nombre_razon_social,
              identificacion,
              telefono_numero,
              correo_principal,
              otras_senas
            )
          `)
          .eq('id', cotizacionId)
          .single();

        if (cotizacionError) {
          console.error('❌ Error cargando cotización:', cotizacionError);
          throw cotizacionError;
        }
        
        if (!cotizacionData) {
          showNotification('error', 'Cotización no encontrada');
          navigate('/cotizaciones');
          return;
        }

        console.log('✅ [OPTIMIZADOR] Cotización cargada:', cotizacionData);
        setCotizacion(cotizacionData as CotizacionData);

        // 2. Cargar items de la cotización
        const { data: itemsData, error: itemsError } = await supabase
          .from('cotizacion_items')
          .select('*')
          .eq('cotizacion_id', cotizacionId)
          .order('id', { ascending: true });

        if (itemsError) {
          console.error('❌ Error cargando items:', itemsError);
          throw itemsError;
        }

        console.log('✅ [OPTIMIZADOR COTIZACIÓN] Items crudos:', itemsData);

        // 🔧 LOG: Verificar campos CNC presentes en items crudos
        if (itemsData && itemsData.length > 0) {
          itemsData.forEach((item, idx) => {
            console.log(`🔍 [RAW CNC FIELDS] Item ${idx + 1}:`, {
              tiene_datos_optimizador: !!item.datos_optimizador,
              cnc1: item.cnc1,
              cnc2: item.cnc2,
              cnc1_codigo: item.cnc1_codigo,
              cnc2_codigo: item.cnc2_codigo,
              datos_opt_cnc1: item.datos_optimizador?.cnc1,
              datos_opt_cnc2: item.datos_optimizador?.cnc2,
              datos_opt_cnc1_codigo: item.datos_optimizador?.cnc1_codigo,
              datos_opt_cnc2_codigo: item.datos_optimizador?.cnc2_codigo
            });
          });
        }

        // 3. 🔧 EXTRAER TODOS LOS CÓDIGOS CNC ÚNICOS DE TODOS LOS ITEMS
        const codigosCNCUnicos = new Set<string>();
        
        if (itemsData && itemsData.length > 0) {
          itemsData.forEach(item => {
            const extracted = extractCncData(item);
            
            console.log(`🔍 [EXTRACTED CNC] Item ${item.id}:`, extracted);
            
            if (extracted.cnc1_codigo) {
              codigosCNCUnicos.add(extracted.cnc1_codigo);
            }
            if (extracted.cnc2_codigo) {
              codigosCNCUnicos.add(extracted.cnc2_codigo);
            }
          });
        }

        console.log('🔍 [CNC] Códigos únicos encontrados:', Array.from(codigosCNCUnicos));

        // 4. 🔧 BUSCAR TODOS LOS PRECIOS DE CNC EN UNA SOLA CONSULTA
        let preciosCNCMap = new Map<string, number>();
        
        if (codigosCNCUnicos.size > 0) {
          console.log('🔍 [CNC] Buscando precios para códigos únicos:', Array.from(codigosCNCUnicos));
          
          // 🔧 INTENTAR CON FILTRO DE TIENDA SI EXISTE
          let inventarioCNC = null;
          let inventarioError = null;

          if (currentStore?.id) {
            const result = await supabase
              .from('inventario')
              .select('codigo_articulo, precio_articulo')
              .in('codigo_articulo', Array.from(codigosCNCUnicos))
              .eq('tienda_id', currentStore.id)
              .eq('activo', true);

            inventarioCNC = result.data;
            inventarioError = result.error;

            console.log('🔍 [CNC] Búsqueda con filtro de tienda:', {
              tienda_id: currentStore.id,
              tienda_nombre: currentStore.nombre,
              encontrados: inventarioCNC?.length || 0,
              error: inventarioError?.message
            });
          }

          // 🔧 SI NO SE ENCONTRÓ NADA, BUSCAR SIN FILTRO DE TIENDA
          if (!inventarioCNC || inventarioCNC.length === 0) {
            console.log('🔍 [CNC] Buscando sin filtro de tienda (artículos globales)...');
            
            const result = await supabase
              .from('inventario')
              .select('codigo_articulo, precio_articulo')
              .in('codigo_articulo', Array.from(codigosCNCUnicos))
              .eq('activo', true);
          
          inventarioCNC = result.data;
          inventarioError = result.error;

          console.log('🔍 [CNC] Búsqueda sin filtro de tienda:', {
            encontrados: inventarioCNC?.length || 0,
            error: inventarioError?.message
          });
        }

        if (inventarioError) {
          console.error('❌ [CNC] Error buscando en inventario:', inventarioError);
        }

        if (inventarioCNC && inventarioCNC.length > 0) {
          console.log('✅ [CNC] Artículos encontrados en inventario:', {
            count: inventarioCNC.length,
            articulos: inventarioCNC.map(item => ({
                codigo: item.codigo_articulo,
                precio: item.precio_articulo
              }))
            });
            
            // Crear mapa de precios
            inventarioCNC.forEach(item => {
              preciosCNCMap.set(item.codigo_articulo, item.precio_articulo || 0);
              console.log(`💰 [CNC] Precio guardado: ${item.codigo_articulo} = ₡${item.precio_articulo}`);
            });

            console.log('💰 [CNC] Mapa de precios completo:', Array.from(preciosCNCMap.entries()));
          } else {
            console.warn('⚠️ [CNC] No se encontraron artículos CNC en inventario');
          }

          // Verificar códigos no encontrados
          codigosCNCUnicos.forEach(codigo => {
            if (!preciosCNCMap.has(codigo)) {
              console.warn(`⚠️ [CNC] Código NO encontrado en inventario: ${codigo}`);
            } else {
              console.log(`✅ [CNC] Código encontrado: ${codigo} = ₡${preciosCNCMap.get(codigo)}`);
            }
          });
        }

        // 5. 🔧 PROCESAR ITEMS Y CALCULAR PRECIOS CNC CON EL MAPA
        const itemsOpt: ItemOptimizador[] = [];
        const itemsAd: ItemOptimizador[] = [];

        // Variables para calcular desglose de costos
        let totalMateriales = 0;
        let totalTapacantos = 0;
        let totalCNC = 0;
        let totalOtros = 0;

        if (itemsData && itemsData.length > 0) {
          itemsData.forEach(item => {
            // EXTRAER INFORMACIÓN DE datos_optimizador SI EXISTE
            if (item.datos_optimizador && Object.keys(item.datos_optimizador).length > 0) {
              const datosOpt = item.datos_optimizador;
              
              // Construir texto de tapacantos CON CANTIDADES
              const tapacantosText = formatearTapacantos(datosOpt);

              // Construir texto de material
              const materialText = datosOpt.material_codigo && datosOpt.material_nombre 
                ? `${datosOpt.material_codigo} - ${datosOpt.material_nombre}`
                : datosOpt.material_codigo || datosOpt.material_nombre || item.material || 'Sin especificar';

              // Construir texto de dimensiones
              const dimensionesText = datosOpt.largo && datosOpt.ancho 
                ? `${datosOpt.largo} × ${datosOpt.ancho} mm`
                : item.dimensiones || '-';

              // 🔧 EXTRAER DATOS CNC DE MÚLTIPLES FUENTES
              const extracted = extractCncData(item);

              // 🔧 CONSTRUIR TEXTO DE CNC CON FORMATO SOLICITADO
              const cncParts: string[] = [];
              
              if (extracted.cnc1_codigo) {
                cncParts.push(`CNC1: ${extracted.cnc1_codigo} x ${extracted.cnc1_cantidad}`);
              }
              if (extracted.cnc2_codigo) {
                cncParts.push(`CNC2: ${extracted.cnc2_codigo} x ${extracted.cnc2_cantidad}`);
              }

              const cncText = cncParts.length > 0 ? cncParts.join(', ') : '-';

              // 🔧 CALCULAR PRECIO CNC USANDO EL MAPA
              let precioCNC = 0;

              // Primero intentar usar costo_cnc guardado
              if (datosOpt.costo_cnc && datosOpt.costo_cnc > 0) {
                precioCNC = datosOpt.costo_cnc;
                console.log(`💰 [CNC] Usando costo_cnc guardado para item ${item.id}: ₡${precioCNC}`);
              } else {
                // Calcular desde el mapa de precios
                console.log(`🔍 [CNC] Calculando precio para item ${item.id}:`, {
                  cnc1_codigo: extracted.cnc1_codigo,
                  cnc1_cantidad: extracted.cnc1_cantidad,
                  cnc2_codigo: extracted.cnc2_codigo,
                  cnc2_cantidad: extracted.cnc2_cantidad
                });

                if (extracted.cnc1_codigo) {
                  const precio1 = preciosCNCMap.get(extracted.cnc1_codigo) || 0;
                  const subtotal1 = precio1 * extracted.cnc1_cantidad;
                  precioCNC += subtotal1;
                  console.log(`💰 [CNC1] ${extracted.cnc1_codigo}: ₡${precio1} x ${extracted.cnc1_cantidad} = ₡${subtotal1}`);
                }
                if (extracted.cnc2_codigo) {
                  const precio2 = preciosCNCMap.get(extracted.cnc2_codigo) || 0;
                  const subtotal2 = precio2 * extracted.cnc2_cantidad;
                  precioCNC += subtotal2;
                  console.log(`💰 [CNC2] ${extracted.cnc2_codigo}: ₡${precio2} x ${extracted.cnc2_cantidad} = ₡${subtotal2}`);
                }

                console.log(`💰 [CNC TOTAL] Item ${item.id}: ₡${precioCNC}`);
              }

              console.log('🧾 [CNC] Item procesado:', {
                id: item.id,
                descripcion: datosOpt.descripcion || item.descripcion,
                cnc1: extracted.cnc1_codigo || 'N/A',
                cant1: extracted.cnc1_cantidad,
                precio1: extracted.cnc1_codigo ? preciosCNCMap.get(extracted.cnc1_codigo) : 0,
                cnc2: extracted.cnc2_codigo || 'N/A',
                cant2: extracted.cnc2_cantidad,
                precio2: extracted.cnc2_codigo ? preciosCNCMap.get(extracted.cnc2_codigo) : 0,
                cncTexto: cncText,
                cncTotal: precioCNC
              });

              // CALCULAR COSTOS DESGLOSADOS
              const subtotalItem = item.subtotal || 0;
              
              // Usar los costos reales si están disponibles en datos_optimizador
              const costoMaterial = datosOpt.costo_material || (subtotalItem * 0.60);
              const costoTapacantos = datosOpt.costo_tapacantos || (subtotalItem * 0.25);
              const costoCNC = precioCNC || datosOpt.costo_cnc || (subtotalItem * 0.10);
              const costoOtros = subtotalItem - (costoMaterial + costoTapacantos + costoCNC);

              totalMateriales += costoMaterial;
              totalTapacantos += costoTapacantos;
              totalCNC += costoCNC;
              totalOtros += costoOtros > 0 ? costoOtros : 0;

              itemsOpt.push({
                ...item,
                descripcion: datosOpt.descripcion || item.descripcion,
                dimensiones: dimensionesText,
                material: materialText,
                tapacantos: tapacantosText,
                cnc1: datosOpt.cnc1 || '',
                cnc2: datosOpt.cnc2 || '',
                cnc_cantidad: cncText,
                cnc_precio: precioCNC
              } as ItemOptimizador);
            } else {
              // Items adicionales: NO tienen datos_optimizador (son del inventario)
              totalOtros += item.subtotal || 0;
              itemsAd.push(item as ItemOptimizador);
            }
          });
        }

        console.log('✅ [OPTIMIZADOR COTIZACIÓN] Items optimizador procesados:', itemsOpt);
        console.log('✅ [OPTIMIZADOR COTIZACIÓN] Items adicionales:', itemsAd);

        setItemsOptimizador(itemsOpt);
        setItemsAdicionales(itemsAd);

        // Guardar desglose de costos
        setCostosMateriales(totalMateriales);
        setCostosTapacantos(totalTapacantos);
        setCostosCNC(totalCNC);
        setCostosOtros(totalOtros);

      } catch (error: any) {
        console.error('❌ Error:', error);
        showNotification('error', 'Error cargando cotización');
        navigate('/cotizaciones');
      } finally {
        setLoading(false);
      }
    };

    cargarCotizacion();
  }, [id]);

  const handleImprimir = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando cotización...</p>
        </div>
      </div>
    );
  }

  if (!cotizacion) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <i className="ri-file-warning-line text-6xl text-gray-400 mb-4"></i>
          <p className="text-gray-600 mb-4">Cotización no encontrada</p>
          <button
            onClick={() => navigate('/cotizaciones')}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 whitespace-nowrap"
          >
            Volver a Cotizaciones
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Botones de Acción */}
        <div className="mb-6 flex justify-between items-center print:hidden">
          <button
            onClick={() => navigate('/cotizaciones')}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 whitespace-nowrap"
          >
            <i className="ri-arrow-left-line"></i>
            Volver
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleImprimir}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center gap-2 whitespace-nowrap"
            >
              <i className="ri-printer-line"></i>
              Imprimir
            </button>
          </div>
        </div>

        {/* Contenido de la Cotización */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Encabezado con Logo OLO */}
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center">
              <img 
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRYi7j4OFVRmD2T0m6NyFHqYa96zun92AUTIA&s" 
                alt="OLO Logo" 
                className="w-16 h-16 rounded-lg mr-4 object-contain"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                  Overseas Logistics Operations
                </h1>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Centro logístico IRO (CLIRO), Bodega 100A</p>
                  <p>200 mts al oeste de la Iglesia Católica El Coyol, Alajuela</p>
                  <p>Tel: 2205 2525 | Email: Olo@Olo.com</p>
                  <p>Cédula: 3-101-101010</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">COTIZACIÓN</h2>
              <div className="bg-teal-100 px-3 py-1 rounded-lg inline-block mb-3">
                <span className="text-xs font-semibold text-teal-700">OPTIMIZADOR 2D</span>
              </div>
              <div className="space-y-1 text-sm">
                <p className="text-gray-700"><span className="font-semibold">No:</span> {cotizacion.codigo}</p>
                <p className="text-gray-700"><span className="font-semibold">Fecha:</span> {new Date(cotizacion.fecha_emision).toLocaleDateString('es-CR')}</p>
                <p className="text-gray-700"><span className="font-semibold">Vencimiento:</span> {new Date(cotizacion.fecha_vencimiento).toLocaleDateString('es-CR')}</p>
              </div>
            </div>
          </div>

          {/* Información del Cliente */}
          <div className="mb-8 bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <i className="ri-user-line text-teal-600"></i>
              Información del Cliente
            </h3>
            {cotizacion.clientes ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Nombre:</p>
                  <p className="font-medium text-gray-900">{cotizacion.clientes.nombre_razon_social}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Identificación:</p>
                  <p className="font-medium text-gray-900">{cotizacion.clientes.identificacion}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Teléfono:</p>
                  <p className="font-medium text-gray-900">{cotizacion.clientes.telefono_numero || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Correo:</p>
                  <p className="font-medium text-gray-900">{cotizacion.clientes.correo_principal || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-600">Dirección:</p>
                  <p className="font-medium text-gray-900">{cotizacion.clientes.otras_senas || 'N/A'}</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No hay información del cliente disponible</p>
            )}
          </div>

          {/* TABLA 1: Detalle de Piezas Optimizadas */}
          {itemsOptimizador.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalle de Piezas Optimizadas</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-teal-600 text-white">
                      <th className="border border-teal-700 px-4 py-3 text-left">Descripción</th>
                      <th className="border border-teal-700 px-4 py-3 text-center">Dimensiones</th>
                      <th className="border border-teal-700 px-4 py-3 text-center">Material</th>
                      <th className="border border-teal-700 px-4 py-3 text-center">Tapacantos</th>
                      <th className="border border-teal-700 px-4 py-3 text-center">CNC</th>
                      <th className="border border-teal-700 px-4 py-3 text-right">Precio CNC</th>
                      <th className="border border-teal-700 px-4 py-3 text-center">Cantidad</th>
                      <th className="border border-teal-700 px-4 py-3 text-right">Precio Unit.</th>
                      <th className="border border-teal-700 px-4 py-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsOptimizador.map((item, index) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-3">
                          <span className="font-medium">{item.descripcion || `Pieza ${index + 1}`}</span>
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-center">
                          <span className="text-sm font-mono">{item.dimensiones || '-'}</span>
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-center">
                          <span className="text-sm">{item.material || '-'}</span>
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-left">
                          {item.tapacantos ? (
                            <span className="text-xs whitespace-pre-line">{item.tapacantos}</span>
                          ) : (
                            <span className="text-xs text-gray-400 italic">-</span>
                          )}
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-center">
                          {item.cnc_cantidad && item.cnc_cantidad !== '-' ? (
                            <span className="text-sm">{item.cnc_cantidad}</span>
                          ) : (
                            <span className="text-xs text-gray-400 italic">-</span>
                          )}
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-right">
                          {item.cnc_precio && item.cnc_precio > 0 ? (
                            <span className="text-sm font-medium text-blue-600">
                              {formatCurrencyWithSymbol(item.cnc_precio, cotizacion.moneda)}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 italic">₡0.00</span>
                          )}
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-center font-medium">
                          {item.cantidad || 1}
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-right">
                          {formatCurrencyWithSymbol(item.precio_unitario || 0, cotizacion.moneda)}
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-right font-medium">
                          {formatCurrencyWithSymbol(item.subtotal || 0, cotizacion.moneda)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-teal-50 font-semibold">
                      <td colSpan={8} className="border border-teal-200 px-4 py-3 text-right text-teal-900">
                        Subtotal Piezas Optimizadas:
                      </td>
                      <td className="border border-teal-200 px-4 py-3 text-right text-teal-900">
                        {formatCurrencyWithSymbol(subtotalOptimizador, cotizacion.moneda)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TABLA 2: Productos Adicionales / Ítems Manuales */}
          {itemsAdicionales.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Productos Adicionales</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-700 text-white">
                      <th className="border border-gray-800 px-4 py-3 text-left">Código</th>
                      <th className="border border-gray-800 px-4 py-3 text-left">Descripción</th>
                      <th className="border border-gray-800 px-4 py-3 text-center">Cantidad</th>
                      <th className="border border-gray-800 px-4 py-3 text-right">Precio Unitario</th>
                      <th className="border border-gray-800 px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsAdicionales.map((item) => {
                      // Extraer código de la descripción si tiene formato "CODIGO - Descripción"
                      const partes = item.descripcion.split(' - ');
                      const codigo = partes.length > 1 ? partes[0] : '-';
                      const descripcion = partes.length > 1 ? partes.slice(1).join(' - ') : item.descripcion;

                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-4 py-3">
                            <span className="font-mono text-sm">{codigo}</span>
                          </td>
                          <td className="border border-gray-300 px-4 py-3">
                            <span className="font-medium">{descripcion}</span>
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-center font-medium">
                            {item.cantidad || 1}
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-right">
                            {formatCurrencyWithSymbol(item.precio_unitario || 0, cotizacion.moneda)}
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-right font-medium">
                            {formatCurrencyWithSymbol(item.subtotal || 0, cotizacion.moneda)}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-gray-100 font-semibold">
                      <td colSpan={4} className="border border-gray-300 px-4 py-3 text-right text-gray-900">
                        Subtotal Productos Adicionales:
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-right text-gray-900">
                        {formatCurrencyWithSymbol(subtotalAdicionales, cotizacion.moneda)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Mensaje si no hay items */}
          {itemsOptimizador.length === 0 && itemsAdicionales.length === 0 && (
            <div className="mb-8 text-center py-8 bg-gray-50 rounded-lg">
              <i className="ri-inbox-line text-4xl text-gray-400 mb-2"></i>
              <p className="text-gray-500">No hay productos en esta cotización</p>
            </div>
          )}

          {/* 🆕 Totales con Desglose Completo */}
          <div className="flex justify-end">
            <div className="w-96 bg-gray-50 p-6 rounded-lg border-2 border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
                Desglose de Costos
              </h3>
              <div className="space-y-2">
                {/* Desglose de costos del optimizador */}
                {itemsOptimizador.length > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span className="flex items-center gap-2">
                        <i className="ri-stack-line text-teal-600"></i>
                        Materiales (Láminas):
                      </span>
                      <span className="font-medium">{formatCurrencyWithSymbol(costosMateriales, cotizacion.moneda)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span className="flex items-center gap-2">
                        <i className="ri-ruler-line text-orange-600"></i>
                        Tapacantos:
                      </span>
                      <span className="font-medium">{formatCurrencyWithSymbol(costosTapacantos, cotizacion.moneda)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span className="flex items-center gap-2">
                        <i className="ri-tools-line text-blue-600"></i>
                        Mecanizado (CNC):
                      </span>
                      <span className="font-medium">{formatCurrencyWithSymbol(costosCNC, cotizacion.moneda)}</span>
                    </div>
                    <div className="border-t border-gray-300 my-2"></div>
                  </>
                )}
                
                {/* Productos adicionales */}
                {itemsAdicionales.length > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span className="flex items-center gap-2">
                        <i className="ri-shopping-bag-line text-purple-600"></i>
                        Productos Adicionales:
                      </span>
                      <span className="font-medium">{formatCurrencyWithSymbol(subtotalAdicionales, cotizacion.moneda)}</span>
                    </div>
                    <div className="border-t border-gray-300 my-2"></div>
                  </>
                )}

                {/* Subtotal */}
                <div className="flex justify-between text-gray-700 font-medium">
                  <span>Subtotal:</span>
                  <span>{formatCurrencyWithSymbol(cotizacion.subtotal, cotizacion.moneda)}</span>
                </div>

                {/* 🔧 IVA CALCULADO CORRECTAMENTE */}
                <div className="flex justify-between text-gray-700">
                  <span>IVA (13%):</span>
                  <span className="font-medium">{formatCurrencyWithSymbol(cotizacion.subtotal * 0.13, cotizacion.moneda)}</span>
                </div>

                {/* Total */}
                <div className="border-t-2 border-gray-400 pt-3 flex justify-between text-lg font-bold text-gray-900">
                  <span>Total:</span>
                  <span className="text-teal-600">{formatCurrencyWithSymbol(cotizacion.subtotal * 1.13, cotizacion.moneda)}</span>
                </div>
              </div>

              {/* Nota informativa */}
              <div className="mt-4 pt-4 border-t border-gray-300">
                <p className="text-xs text-gray-500 italic">
                  * Los costos de materiales, tapacantos y mecanizado son estimaciones basadas en el optimizador 2D.
                </p>
              </div>
            </div>
          </div>

          {/* Términos y Condiciones */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Nota:</span> Esta cotización fue generada automáticamente desde el Optimizador de Cortes 2D.
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Los precios están sujetos a cambios sin previo aviso. Cotización válida por {calcularDiasValidez()} {calcularDiasValidez() === 1 ? 'día' : 'días'}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}