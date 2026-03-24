import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { useNotification } from '../../../hooks/useNotification';
import NotificationPopup from '../../../components/base/NotificationPopup';

interface Articulo {
  id_articulo: number;
  codigo_articulo: string;
  descripcion_articulo: string;
  cantidad_articulo: number;
  costo_articulo: number;
  ganancia_articulo: number;
  precio_articulo: number;
  categoria_id: number;
  unidad_base_id?: number;
  activo: boolean;
  espesor_mm?: number;
  largo_lamina_mm?: number;
  ancho_lamina_mm?: number;
  ancho_tapacanto_mm?: number;
  grosor_tapacanto_mm?: number;
  cod_barras?: string;
  tipo_cod_barras?: number;
}

interface Categoria {
  id_categoria: number;
  nombre_categoria: string;
  descripcion_categoria?: string;
}

interface UnidadMedida {
  id: number;
  nombre: string;
  simbolo: string;
  grupo: string;
}

interface TipoCodigoBarras {
  id_tipo_cod_barras: number;
  descripcion_tipo_cod_barras: string;
  formato_valido: string | null;
  activo: boolean;
}

interface InventarioFormProps {
  articulo: Articulo | null;
  onSave: (data: Partial<Articulo>) => void;
  onCancel: () => void;
}

export default function InventarioForm({
  articulo,
  onSave,
  onCancel,
}: InventarioFormProps) {
  const [formData, setFormData] = useState({
    codigo_articulo: '',
    descripcion_articulo: '',
    cantidad_articulo: '0.000',
    costo_articulo: '0.00',
    ganancia_articulo: '0.00',
    categoria_id: 0,
    unidad_base_id: 10,
    activo: true,
    espesor_mm: '',
    largo_lamina_mm: '',
    ancho_lamina_mm: '',
    ancho_tapacanto_mm: '',
    grosor_tapacanto_mm: '',
    cod_barras: '',
    tipo_cod_barras: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [precioCalculado, setPrecioCalculado] = useState(0);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
  const [tiposCodigoBarras, setTiposCodigoBarras] = useState<TipoCodigoBarras[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<Categoria | null>(null);
  const [validandoCodigo, setValidandoCodigo] = useState(false);
  const [codigoValido, setCodigoValido] = useState<boolean | null>(null);
  const { currentStore } = useAuth();

  const { notification, showSuccess, showError, showWarning, hideNotification } = useNotification();

  // cargar categorías, unidades y tipos de códigos de barras
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);

        const [categoriasRes, unidadesRes, tiposCodigoRes] = await Promise.all([
          supabase
            .from('categorias_inventario')
            .select('id_categoria, nombre_categoria, descripcion_categoria, activo')
            .eq('activo', true)
            .eq('tienda_id', currentStore?.id ?? '')
            .order('nombre_categoria'),
          supabase
            .from('unidades_medida')
            .select('*')
            .eq('tienda_id', currentStore?.id ?? '')
            .order('grupo, nombre'),
          supabase
            .from('tipos_cod_barras')
            .select('*')
            .eq('activo', true)
            .order('descripcion_tipo_cod_barras'),
        ]);

        if (categoriasRes.error) {
          console.error('Error cargando categorías de inventario:', categoriasRes.error);
          throw new Error(`Error cargando categorías de inventario: ${categoriasRes.error.message}`);
        }

        if (unidadesRes.error) {
          console.error('Error cargando unidades:', unidadesRes.error);
          throw new Error(`Error cargando unidades: ${unidadesRes.error.message}`);
        }

        if (tiposCodigoRes.error) {
          console.error('Error cargando tipos de códigos de barras:', tiposCodigoRes.error);
        }

        setCategorias(categoriasRes.data || []);
        setUnidades(unidadesRes.data || []);
        setTiposCodigoBarras(tiposCodigoRes.data || []);
      } catch (error) {
        console.error('Error cargando datos:', error);
        showWarning(
          'Error cargando datos',
          error instanceof Error ? error.message : 'Error cargando datos del formulario'
        );
      } finally {
        setLoading(false);
      }
    };

    if (currentStore?.id) cargarDatos();
  }, [currentStore]);

  // cargar datos del artículo cuando cambie la prop
  useEffect(() => {
    if (articulo) {
      setFormData({
        codigo_articulo: articulo.codigo_articulo,
        descripcion_articulo: articulo.descripcion_articulo,
        cantidad_articulo: articulo.cantidad_articulo.toFixed(3),
        costo_articulo: articulo.costo_articulo.toFixed(2),
        ganancia_articulo: articulo.ganancia_articulo.toFixed(2),
        categoria_id: articulo.categoria_id,
        unidad_base_id: articulo.unidad_base_id || 10,
        activo: articulo.activo ?? true,
        espesor_mm: articulo.espesor_mm?.toString() || '',
        largo_lamina_mm: articulo.largo_lamina_mm?.toString() || '',
        ancho_lamina_mm: articulo.ancho_lamina_mm?.toString() || '',
        ancho_tapacanto_mm: articulo.ancho_tapacanto_mm?.toString() || '',
        grosor_tapacanto_mm: articulo.grosor_tapacanto_mm?.toString() || '',
        cod_barras: articulo.cod_barras || '',
        tipo_cod_barras: articulo.tipo_cod_barras || 0,
      });
      
      // Si hay código de barras, validarlo
      if (articulo.cod_barras && articulo.tipo_cod_barras) {
        validarCodigoBarras(articulo.cod_barras, articulo.tipo_cod_barras);
      }
    } else {
      // Limpiar formulario para nuevo artículo
      setFormData({
        codigo_articulo: '',
        descripcion_articulo: '',
        cantidad_articulo: '0.000',
        costo_articulo: '0.00',
        ganancia_articulo: '0.00',
        categoria_id: 0,
        unidad_base_id: 10,
        activo: true,
        espesor_mm: '',
        largo_lamina_mm: '',
        ancho_lamina_mm: '',
        ancho_tapacanto_mm: '',
        grosor_tapacanto_mm: '',
        cod_barras: '',
        tipo_cod_barras: 0,
      });
      setCodigoValido(null);
    }
  }, [articulo]);

  // Detectar cambio de categoría y actualizar categoriaSeleccionada
  useEffect(() => {
    if (formData.categoria_id && categorias.length > 0) {
      const categoria = categorias.find(c => c.id_categoria === formData.categoria_id);
      setCategoriaSeleccionada(categoria || null);
    } else {
      setCategoriaSeleccionada(null);
    }
  }, [formData.categoria_id, categorias]);

  // calcular precio automáticamente
  useEffect(() => {
    const costo = parseFloat(formData.costo_articulo) || 0;
    const margen = parseFloat(formData.ganancia_articulo) || 0;
    
    // Validar que el margen no sea 100% o mayor (evita división por cero o valores negativos)
    if (margen >= 100) {
      setPrecioCalculado(0);
      return;
    }
    
    // Nueva fórmula: Precio = Costo / (1 - Margen/100)
    const precio = costo / (1 - margen / 100);
    setPrecioCalculado(precio);
  }, [formData.costo_articulo, formData.ganancia_articulo]);

  // Validar código de barras cuando cambie
  useEffect(() => {
    if (formData.cod_barras && formData.tipo_cod_barras) {
      const timer = setTimeout(() => {
        validarCodigoBarras(formData.cod_barras, formData.tipo_cod_barras);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setCodigoValido(null);
    }
  }, [formData.cod_barras, formData.tipo_cod_barras]);

  const validarCodigoBarras = async (codigo: string, tipoId: number) => {
    if (!codigo || !tipoId) {
      setCodigoValido(null);
      return;
    }

    setValidandoCodigo(true);
    try {
      const tipo = tiposCodigoBarras.find(t => t.id_tipo_cod_barras === tipoId);
      
      if (!tipo) {
        setCodigoValido(null);
        return;
      }

      // Si no hay formato válido definido, aceptar cualquier código
      if (!tipo.formato_valido) {
        setCodigoValido(true);
        return;
      }

      // Validar contra la expresión regular
      const regex = new RegExp(tipo.formato_valido);
      const esValido = regex.test(codigo);
      setCodigoValido(esValido);

      if (!esValido) {
        setErrors(prev => ({
          ...prev,
          cod_barras: `El código no cumple con el formato ${tipo.descripcion_tipo_cod_barras}`
        }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.cod_barras;
          return newErrors;
        });
      }
    } catch (error) {
      console.error('Error validando código de barras:', error);
      setCodigoValido(null);
    } finally {
      setValidandoCodigo(false);
    }
  };

  const detectarTipoAutomatico = async (codigo: string) => {
    if (!codigo) return;

    console.log('🔍 [CÓDIGO DE BARRAS] Detectando tipo automático para:', codigo);

    for (const tipo of tiposCodigoBarras) {
      if (!tipo.formato_valido) continue;
      
      try {
        const regex = new RegExp(tipo.formato_valido);
        if (regex.test(codigo)) {
          console.log('✅ [CÓDIGO DE BARRAS] Tipo detectado:', tipo.descripcion_tipo_cod_barras);
          setFormData(prev => ({
            ...prev,
            tipo_cod_barras: tipo.id_tipo_cod_barras
          }));
          showSuccess(
            'Tipo detectado automáticamente',
            `${tipo.descripcion_tipo_cod_barras}`
          );
          
          // Validar inmediatamente después de detectar
          await validarCodigoBarras(codigo, tipo.id_tipo_cod_barras);
          return;
        }
      } catch (error) {
        console.error('❌ [CÓDIGO DE BARRAS] Error en regex:', error);
      }
    }

    console.log('⚠️ [CÓDIGO DE BARRAS] No se pudo detectar el tipo automáticamente');
    showWarning(
      'Tipo no detectado',
      'Por favor, seleccione manualmente el tipo de código de barras'
    );
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;
    let processedValue: string | number | boolean = value;

    // Procesar valores según el tipo
    if (type === 'checkbox') {
      processedValue = (e.target as HTMLInputElement).checked;
    } else if (['categoria_id', 'unidad_base_id', 'tipo_cod_barras'].includes(name)) {
      processedValue = parseInt(value) || 0;
    }

    // Validar ganancia entre 0-100
    if (name === 'ganancia_articulo') {
      const margen = parseFloat(value);
      if (margen < 0 || margen >= 100) {
        setErrors((prev) => ({
          ...prev,
          ganancia_articulo: 'El margen debe estar entre 0% y 99.99%',
        }));
      } else {
        setErrors((prev) => ({ ...prev, ganancia_articulo: '' }));
      }
    }

    // Si cambia el tipo de código de barras y hay un código ingresado, validar
    if (name === 'tipo_cod_barras' && formData.cod_barras) {
      const tipoId = parseInt(value) || 0;
      if (tipoId > 0) {
        validarCodigoBarras(formData.cod_barras, tipoId);
      }
    }

    setFormData((prev) => ({
      ...prev,
      [name]: processedValue,
    }));

    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleCodigoBarrasChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const codigo = e.target.value.trim();
    setFormData(prev => ({
      ...prev,
      cod_barras: codigo
    }));

    // Limpiar validación anterior
    setCodigoValido(null);
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.cod_barras;
      return newErrors;
    });

    // Si no hay código, limpiar tipo también
    if (!codigo) {
      setFormData(prev => ({
        ...prev,
        tipo_cod_barras: 0
      }));
      return;
    }

    // Si no hay tipo seleccionado, intentar detectarlo automáticamente
    if (!formData.tipo_cod_barras) {
      detectarTipoAutomatico(codigo);
    }
  };

  const handleNumericChange = (
    name: string,
    value: string,
    decimals: number
  ) => {
    // Permitir solo números con decimales específicos
    const regex = new RegExp(`^\\d*\\.?\\d{0,${decimals}}$`);
    if (regex.test(value) || value === '') {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const validateForm = async () => {
    const newErrors: Record<string, string> = {};

    if (!formData.codigo_articulo.trim()) {
      newErrors.codigo_articulo = 'El código es obligatorio';
    } else {
      // Verificar que el código no exista (solo para nuevos artículos o si cambió el código)
      if (!articulo || articulo.codigo_articulo !== formData.codigo_articulo) {
        try {
          const { data, error } = await supabase
            .from('inventario')
            .select('id_articulo')
            .eq('codigo_articulo', formData.codigo_articulo.trim())
            .maybeSingle();

          if (error && error.code !== 'PGRST116') {
            console.error('Error verificando código:', error);
            newErrors.codigo_articulo = 'Error verificando código único';
          } else if (data) {
            newErrors.codigo_articulo = 'Este código ya existe';
          }
        } catch (error) {
          console.error('Error verificando código:', error);
          newErrors.codigo_articulo = 'Error de conexión al verificar código';
        }
      }
    }

    if (!formData.descripcion_articulo.trim()) {
      newErrors.descripcion_articulo = 'La descripción es obligatoria';
    }

    const cantidad = parseFloat(formData.cantidad_articulo);
    if (isNaN(cantidad) || cantidad < 0) {
      newErrors.cantidad_articulo =
        'La cantidad debe ser un número válido mayor o igual a 0';
    }

    const costo = parseFloat(formData.costo_articulo);
    if (isNaN(costo) || costo < 0) {
      newErrors.costo_articulo =
        'El costo debe ser un número válido mayor o igual a 0';
    }

    const ganancia = parseFloat(formData.ganancia_articulo);
    if (isNaN(ganancia) || ganancia < 0 || ganancia >= 100) {
      newErrors.ganancia_articulo =
        'El margen debe estar entre 0% y 99.99%';
    }

    if (formData.categoria_id === 0) {
      newErrors.categoria_id = 'Debe seleccionar una categoría';
    }

    if (formData.unidad_base_id === 0) {
      newErrors.unidad_base_id = 'Debe seleccionar una unidad de medida';
    }

    // Validar código de barras si está presente
    if (formData.cod_barras && formData.cod_barras.trim()) {
      if (!formData.tipo_cod_barras) {
        newErrors.tipo_cod_barras = 'Debe seleccionar el tipo de código de barras';
      } else if (codigoValido === false) {
        const tipo = tiposCodigoBarras.find(t => t.id_tipo_cod_barras === formData.tipo_cod_barras);
        newErrors.cod_barras = `El código no cumple con el formato ${tipo?.descripcion_tipo_cod_barras || 'seleccionado'}`;
      }
      
      // Verificar que el código de barras no exista en otro artículo
      if (!newErrors.cod_barras) {
        try {
          const { data, error } = await supabase
            .from('inventario')
            .select('id_articulo, codigo_articulo, descripcion_articulo')
            .eq('cod_barras', formData.cod_barras.trim())
            .maybeSingle();

          if (error && error.code !== 'PGRST116') {
            console.error('Error verificando código de barras:', error);
          } else if (data && (!articulo || data.id_articulo !== articulo.id_articulo)) {
            newErrors.cod_barras = `Este código de barras ya está asignado al artículo: ${data.codigo_articulo} - ${data.descripcion_articulo}`;
          }
        } catch (error) {
          console.error('Error verificando código de barras:', error);
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (saving) return;

    // Limpiar errores previos
    setErrors({});

    const isValid = await validateForm();
    if (!isValid) {
      showError(
        'Formulario incompleto',
        'Por favor, corrija los errores antes de continuar'
      );
      return;
    }

    try {
      setSaving(true);

      // ✅ OBTENER TIENDA ACTUAL DEL USUARIO
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No hay usuario autenticado');
      }

      // ✅ OBTENER TIENDA ACTUAL
      const { data: tiendaActual, error: tiendaError } = await supabase
        .from('usuario_tienda_actual')
        .select('tienda_id')
        .eq('usuario_id', user.id)
        .single();

      if (tiendaError || !tiendaActual?.tienda_id) {
        console.error('❌ [GUARDAR] Error obteniendo tienda actual:', tiendaError);
        throw new Error('No tienes una tienda asignada. Contacta al administrador.');
      }

      console.log('✅ [GUARDAR] Tienda actual del usuario:', tiendaActual.tienda_id);

      const dataToSave: any = {
        codigo_articulo: formData.codigo_articulo.trim(),
        descripcion_articulo: formData.descripcion_articulo.trim(),
        cantidad_articulo: parseFloat(formData.cantidad_articulo),
        costo_articulo: parseFloat(formData.costo_articulo),
        ganancia_articulo: parseFloat(formData.ganancia_articulo),
        categoria_id: formData.categoria_id,
        unidad_base_id: formData.unidad_base_id,
        activo: formData.activo,
        cod_barras: formData.cod_barras && formData.cod_barras.trim() ? formData.cod_barras.trim() : null,
        tipo_cod_barras: formData.cod_barras && formData.cod_barras.trim() && formData.tipo_cod_barras ? formData.tipo_cod_barras : null,
        tienda_id: tiendaActual.tienda_id // ✅ AGREGAR TIENDA_ID
      };

      console.log('💾 [GUARDAR] Datos del código de barras:', {
        cod_barras: dataToSave.cod_barras,
        tipo_cod_barras: dataToSave.tipo_cod_barras,
        tipo_nombre: tiposCodigoBarras.find(t => t.id_tipo_cod_barras === dataToSave.tipo_cod_barras)?.descripcion_tipo_cod_barras
      });

      console.log('💾 [GUARDAR] Tienda asignada al artículo:', dataToSave.tienda_id);

      // Si la categoría es LAMINAS, agregar los campos de medidas
      if (categoriaSeleccionada?.nombre_categoria === 'LAMINAS') {
        dataToSave.espesor_mm = formData.espesor_mm ? parseFloat(formData.espesor_mm) : null;
        dataToSave.largo_lamina_mm = formData.largo_lamina_mm ? parseFloat(formData.largo_lamina_mm) : null;
        dataToSave.ancho_lamina_mm = formData.ancho_lamina_mm ? parseFloat(formData.ancho_lamina_mm) : null;
        // Limpiar campos de tapacantos
        dataToSave.ancho_tapacanto_mm = null;
        dataToSave.grosor_tapacanto_mm = null;
      } 
      // Si la categoría es TAPACANTOS, agregar los campos de medidas de tapacantos
      else if (categoriaSeleccionada?.nombre_categoria === 'TAPACANTOS') {
        dataToSave.ancho_tapacanto_mm = formData.ancho_tapacanto_mm ? parseFloat(formData.ancho_tapacanto_mm) : null;
        dataToSave.grosor_tapacanto_mm = formData.grosor_tapacanto_mm ? parseFloat(formData.grosor_tapacanto_mm) : null;
        // Limpiar campos de láminas
        dataToSave.espesor_mm = null;
        dataToSave.largo_lamina_mm = null;
        dataToSave.ancho_lamina_mm = null;
      } 
      else {
        // Si no es lámina ni tapacanto, asegurar que todos los campos sean null
        dataToSave.espesor_mm = null;
        dataToSave.largo_lamina_mm = null;
        dataToSave.ancho_lamina_mm = null;
        dataToSave.ancho_tapacanto_mm = null;
        dataToSave.grosor_tapacanto_mm = null;
      }

      let result;

      if (articulo) {
        // Actualizar artículo existente
        result = await supabase
          .from('inventario')
          .update(dataToSave)
          .eq('id_articulo', articulo.id_articulo)
          .select();
      } else {
        // Crear nuevo artículo
        result = await supabase
          .from('inventario')
          .insert([dataToSave])
          .select();
      }

      if (result.error) {
        console.error('❌ [GUARDAR] Error en operación:', result.error);
        throw new Error(result.error.message);
      }

      // ── Registro de movimiento de inventario ───────────────────────────────
      const nuevaCantidad = parseFloat(formData.cantidad_articulo);
      const articuloId = articulo ? articulo.id_articulo : result.data?.[0]?.id_articulo;

      if (articuloId) {
        if (!articulo && nuevaCantidad > 0) {
          // Artículo nuevo con stock inicial
          await supabase.from('inventario_movimientos').insert({
            articulo_id: articuloId,
            tipo: 'ajuste',
            cantidad: nuevaCantidad,
            stock_anterior: 0,
            stock_posterior: nuevaCantidad,
            referencia_type: 'inventario',
            referencia_id: articuloId,
            notas: `Creación de artículo — stock inicial: ${nuevaCantidad} uds.`,
            usuario_id: user.id,
          });
        } else if (articulo) {
          const cantidadAnterior = Number(articulo.cantidad_articulo);
          const delta = nuevaCantidad - cantidadAnterior;
          if (delta !== 0) {
            // Ajuste manual de cantidad
            await supabase.from('inventario_movimientos').insert({
              articulo_id: articuloId,
              tipo: 'ajuste',
              cantidad: delta,
              stock_anterior: cantidadAnterior,
              stock_posterior: nuevaCantidad,
              referencia_type: 'inventario',
              referencia_id: articuloId,
              notas: `Ajuste manual de stock: ${cantidadAnterior} → ${nuevaCantidad} (${delta > 0 ? '+' : ''}${delta} uds.)`,
              usuario_id: user.id,
            });
          }
        }
      }
      // ──────────────────────────────────────────────────────────────────────

      console.log('✅ [GUARDAR] Artículo guardado exitosamente:', result.data);

      showSuccess(
        articulo ? 'Artículo actualizado' : 'Artículo creado',
        `El artículo ${dataToSave.cod_barras ? 'con código de barras ' + dataToSave.cod_barras : ''} ha sido ${articulo ? 'actualizado' : 'creado'} exitosamente`
      );

      onSave(dataToSave);
    } catch (error: any) {
      console.error('❌ [GUARDAR] Error guardando artículo:', error);

      let errorMessage = 'Error al guardar el artículo. Intente nuevamente.';

      if (error.message) {
        if (error.message.includes('duplicate key')) {
          if (error.message.includes('cod_barras')) {
            errorMessage = 'El código de barras ya existe en otro artículo.';
          } else {
            errorMessage = 'El código del artículo ya existe.';
          }
        } else if (error.message.includes('connection')) {
          errorMessage = 'Error de conexión. Verifique su conexión a internet.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'La operación tardó demasiado. Intente nuevamente.';
        } else if (error.message.includes('categoria_inventario_id')) {
          errorMessage = 'Error con la categoría seleccionada. Intente nuevamente.';
        } else if (error.message.includes('tienda asignada')) {
          errorMessage = error.message; // Mostrar el mensaje personalizado de tienda
        } else if (error.message.includes('row-level security')) {
          errorMessage = 'No tienes permisos para realizar esta operación. Verifica que tengas una tienda asignada.';
        }
      }

      showError('Error al guardar', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Cargando datos
              </h3>
              <p className="text-sm text-gray-600">
                Conectando con la base de datos...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getUnidadesPorGrupo = () => {
    const grupos: { [key: string]: UnidadMedida[] } = {};
    unidades.forEach((unidad) => {
      if (!grupos[unidad.grupo]) {
        grupos[unidad.grupo] = [];
      }
      grupos[unidad.grupo].push(unidad);
    });
    return grupos;
  };

  const unidadesPorGrupo = getUnidadesPorGrupo();

  // Verificar si la categoría seleccionada es LAMINAS
  const esLamina = categoriaSeleccionada?.nombre_categoria === 'LAMINAS';
  // Verificar si la categoría seleccionada es TAPACANTOS
  const esTapacanto = categoriaSeleccionada?.nombre_categoria === 'TAPACANTOS';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto">
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              {articulo ? 'Editar Artículo' : 'Nuevo Artículo'}
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg cursor-pointer"
            >
              <i className="ri-close-line text-2xl"></i>
            </button>
          </div>

          {errors.general && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              <i className="ri-error-warning-line mr-2"></i>
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Información básica */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Información Básica
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Código */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código del Artículo *
                  </label>
                  <input
                    type="text"
                    name="codigo_articulo"
                    value={formData.codigo_articulo}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                      errors.codigo_articulo
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-300'
                    }`}
                    placeholder="Ej: MAT-001"
                  />
                  {errors.codigo_articulo && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <i className="ri-error-warning-line mr-1"></i>
                      {errors.codigo_articulo}
                    </p>
                  )}
                </div>

                {/* Categoría */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoría *
                  </label>
                  <div className="relative">
                    <select
                      name="categoria_id"
                      value={formData.categoria_id}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 pr-10 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer ${
                        errors.categoria_id
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-300'
                      }`}
                    >
                      <option value={0}>Seleccionar categoría</option>
                      {categorias.map((categoria) => (
                        <option key={categoria.id_categoria} value={categoria.id_categoria}>
                          {categoria.nombre_categoria}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <i className="ri-arrow-down-s-line text-gray-400 text-lg"></i>
                    </div>
                  </div>
                  {errors.categoria_id && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <i className="ri-error-warning-line mr-1"></i>
                      {errors.categoria_id}
                    </p>
                  )}
                </div>
              </div>

              {/* Descripción */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción *
                </label>
                <textarea
                  name="descripcion_articulo"
                  value={formData.descripcion_articulo}
                  onChange={handleChange}
                  rows={3}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none ${
                    errors.descripcion_articulo
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300'
                  }`}
                  placeholder="Descripción detallada del artículo"
                />
                {errors.descripcion_articulo && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <i className="ri-error-warning-line mr-1"></i>
                    {errors.descripcion_articulo}
                  </p>
                )}
              </div>
            </div>

            {/* Código de Barras */}
            <div className="bg-indigo-50 rounded-lg p-6 border-2 border-indigo-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <i className="ri-barcode-line text-indigo-600 mr-2 text-xl"></i>
                Código de Barras (Opcional)
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tipo de código de barras */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Código
                    {formData.cod_barras && formData.cod_barras.trim() && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </label>
                  <div className="relative">
                    <select
                      name="tipo_cod_barras"
                      value={formData.tipo_cod_barras}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 pr-10 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none cursor-pointer ${
                        errors.tipo_cod_barras
                          ? 'border-red-500 bg-red-50'
                          : formData.tipo_cod_barras > 0
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-300'
                      }`}
                      disabled={!formData.cod_barras || !formData.cod_barras.trim()}
                    >
                      <option value={0}>
                        {formData.cod_barras && formData.cod_barras.trim() 
                          ? 'Seleccionar tipo' 
                          : 'Ingrese primero el código'}
                      </option>
                      {tiposCodigoBarras.map((tipo) => (
                        <option key={tipo.id_tipo_cod_barras} value={tipo.id_tipo_cod_barras}>
                          {tipo.descripcion_tipo_cod_barras}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      {formData.tipo_cod_barras > 0 ? (
                        <i className="ri-check-line text-indigo-600 text-lg"></i>
                      ) : (
                        <i className="ri-arrow-down-s-line text-gray-400 text-lg"></i>
                      )}
                    </div>
                  </div>
                  {errors.tipo_cod_barras && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <i className="ri-error-warning-line mr-1"></i>
                      {errors.tipo_cod_barras}
                    </p>
                  )}
                  {formData.tipo_cod_barras > 0 && (
                    <p className="mt-2 text-xs text-indigo-700 flex items-center">
                      <i className="ri-information-line mr-1"></i>
                      {tiposCodigoBarras.find(t => t.id_tipo_cod_barras === formData.tipo_cod_barras)?.descripcion_tipo_cod_barras}
                    </p>
                  )}
                </div>

                {/* Código de barras */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código de Barras
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="cod_barras"
                      value={formData.cod_barras}
                      onChange={handleCodigoBarrasChange}
                      className={`w-full px-4 py-3 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                        errors.cod_barras
                          ? 'border-red-500 bg-red-50'
                          : codigoValido === true
                          ? 'border-green-500 bg-green-50'
                          : codigoValido === false
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-300'
                      }`}
                      placeholder="Ingrese el código de barras"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      {validandoCodigo ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                      ) : codigoValido === true ? (
                        <i className="ri-check-line text-green-600 text-xl"></i>
                      ) : codigoValido === false ? (
                        <i className="ri-close-line text-red-600 text-xl"></i>
                      ) : formData.cod_barras && formData.cod_barras.trim() ? (
                        <i className="ri-barcode-line text-indigo-600 text-xl"></i>
                      ) : null}
                    </div>
                  </div>
                  {errors.cod_barras && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <i className="ri-error-warning-line mr-1"></i>
                      {errors.cod_barras}
                    </p>
                  )}
                  {codigoValido === true && (
                    <p className="mt-2 text-sm text-green-600 flex items-center font-medium">
                      <i className="ri-check-line mr-1"></i>
                      Código válido para {tiposCodigoBarras.find(t => t.id_tipo_cod_barras === formData.tipo_cod_barras)?.descripcion_tipo_cod_barras}
                    </p>
                  )}
                  {codigoValido === false && !errors.cod_barras && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <i className="ri-close-line mr-1"></i>
                      El código no cumple con el formato esperado
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-4 p-3 bg-indigo-100 rounded-lg border border-indigo-300">
                <p className="text-xs text-indigo-800 flex items-start">
                  <i className="ri-lightbulb-line mr-2 mt-0.5 flex-shrink-0"></i>
                  <span>
                    <strong>Detección automática:</strong> Ingrese el código de barras y el sistema intentará detectar automáticamente el tipo. También puede seleccionar el tipo manualmente si lo prefiere.
                  </span>
                </p>
              </div>
            </div>

            {/* Medidas de Lámina - Solo si la categoría es LAMINAS */}
            {esLamina && (
              <div className="bg-amber-50 rounded-lg p-6 border-2 border-amber-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <i className="ri-ruler-line text-amber-600 mr-2"></i>
                  Medidas de Lámina
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Espesor */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Espesor (mm)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="espesor_mm"
                        value={formData.espesor_mm}
                        onChange={(e) =>
                          handleNumericChange('espesor_mm', e.target.value, 2)
                        }
                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all text-right"
                        placeholder="0.00"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <span className="text-gray-500 text-sm font-medium">mm</span>
                      </div>
                    </div>
                  </div>

                  {/* Largo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Largo (mm)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="largo_lamina_mm"
                        value={formData.largo_lamina_mm}
                        onChange={(e) =>
                          handleNumericChange('largo_lamina_mm', e.target.value, 2)
                        }
                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all text-right"
                        placeholder="0.00"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <span className="text-gray-500 text-sm font-medium">mm</span>
                      </div>
                    </div>
                  </div>

                  {/* Ancho */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ancho (mm)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="ancho_lamina_mm"
                        value={formData.ancho_lamina_mm}
                        onChange={(e) =>
                          handleNumericChange('ancho_lamina_mm', e.target.value, 2)
                        }
                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all text-right"
                        placeholder="0.00"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <span className="text-gray-500 text-sm font-medium">mm</span>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-amber-700 mt-3 flex items-center">
                  <i className="ri-information-line mr-1"></i>
                  Estos campos son específicos para láminas y se utilizan en el optimizador de cortes
                </p>
              </div>
            )}

            {/* Medidas de Tapacanto - Solo si la categoría es TAPACANTOS */}
            {esTapacanto && (
              <div className="bg-purple-50 rounded-lg p-6 border-2 border-purple-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <i className="ri-ruler-2-line text-purple-600 mr-2"></i>
                  Medidas de Tapacanto
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Ancho */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ancho (mm)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="ancho_tapacanto_mm"
                        value={formData.ancho_tapacanto_mm}
                        onChange={(e) =>
                          handleNumericChange('ancho_tapacanto_mm', e.target.value, 2)
                        }
                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-right"
                        placeholder="0.00"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <span className="text-gray-500 text-sm font-medium">mm</span>
                      </div>
                    </div>
                  </div>

                  {/* Grosor */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Grosor (mm)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="grosor_tapacanto_mm"
                        value={formData.grosor_tapacanto_mm}
                        onChange={(e) =>
                          handleNumericChange('grosor_tapacanto_mm', e.target.value, 2)
                        }
                        className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-right"
                        placeholder="0.00"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <span className="text-gray-500 text-sm font-medium">mm</span>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-purple-700 mt-3 flex items-center">
                  <i className="ri-information-line mr-1"></i>
                  Estos campos son específicos para tapacantos y se utilizarán en el optimizador de cortes
                </p>
              </div>
            )}

            {/* Unidad de medida */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Unidad de Medida
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unidad Base *
                </label>
                <div className="relative">
                  <select
                    name="unidad_base_id"
                    value={formData.unidad_base_id}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 pr-10 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer ${
                      errors.unidad_base_id
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-300'
                    }`}
                  >
                    <option value={0}>Seleccionar unidad</option>
                    {Object.entries(unidadesPorGrupo).map(
                      ([grupo, unidadesGrupo]) => (
                        <optgroup
                          key={grupo}
                          label={
                            grupo.charAt(0).toUpperCase() + grupo.slice(1)
                          }
                        >
                          {unidadesGrupo.map((unidad) => (
                            <option key={unidad.id} value={unidad.id}>
                              {unidad.nombre} ({unidad.simbolo})
                            </option>
                          ))}
                        </optgroup>
                      )
                    )}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <i className="ri-arrow-down-s-line text-gray-400 text-lg"></i>
                  </div>
                </div>
                {errors.unidad_base_id && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <i className="ri-error-warning-line mr-1"></i>
                    {errors.unidad_base_id}
                  </p>
                )}
              </div>
            </div>

            {/* Información financiera */}
            <div className="bg-green-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Información Financiera
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Cantidad */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cantidad en Stock
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="cantidad_articulo"
                      value={formData.cantidad_articulo}
                      onChange={(e) =>
                        handleNumericChange(
                          'cantidad_articulo',
                          e.target.value,
                          3
                        )
                      }
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-right ${
                        errors.cantidad_articulo
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-300'
                      }`}
                      placeholder="0.000"
                    />
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <i className="ri-archive-line text-gray-400"></i>
                    </div>
                  </div>
                  {errors.cantidad_articulo && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <i className="ri-error-warning-line mr-1"></i>
                      {errors.cantidad_articulo}
                    </p>
                  )}
                </div>

                {/* Costo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Costo Unitario
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="costo_articulo"
                      value={formData.costo_articulo}
                      onChange={(e) =>
                        handleNumericChange(
                          'costo_articulo',
                          e.target.value,
                          2
                        )
                      }
                      className={`w-full px-4 py-3 pl-8 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-right ${
                        errors.costo_articulo
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-300'
                      }`}
                      placeholder="0.00"
                    />
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <span className="text-gray-500 font-medium">₡</span>
                    </div>
                  </div>
                  {errors.costo_articulo && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <i className="ri-error-warning-line mr-1"></i>
                      {errors.costo_articulo}
                    </p>
                  )}
                </div>

                {/* Ganancia */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Margen sobre Precio (%)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="ganancia_articulo"
                      value={formData.ganancia_articulo}
                      onChange={(e) =>
                        handleNumericChange(
                          'ganancia_articulo',
                          e.target.value,
                          2
                        )
                      }
                      className={`w-full px-4 py-3 pr-8 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-right ${
                        errors.ganancia_articulo
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-300'
                      }`}
                      placeholder="0.00"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <span className="text-gray-500 font-medium">%</span>
                    </div>
                  </div>
                  {errors.ganancia_articulo && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <i className="ri-error-warning-line mr-1"></i>
                      {errors.ganancia_articulo}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1 flex items-center">
                    <i className="ri-information-line mr-1"></i>
                    Porcentaje de utilidad respecto al precio de venta
                  </p>
                </div>
              </div>
            </div>

            {/* Estado */}
            <div className="flex items-center p-4 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                name="activo"
                id="activo"
                checked={formData.activo}
                onChange={handleChange}
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
              />
              <label
                htmlFor="activo"
                className="ml-3 block text-sm font-medium text-gray-900 cursor-pointer"
              >
                <i className="ri-check-line mr-1"></i>
                Artículo activo
              </label>
            </div>

            {/* Precio calculado */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <i className="ri-calculator-line text-blue-600 text-xl mr-2"></i>
                  <span className="text-sm font-medium text-blue-900">
                    Precio de Venta Calculado:
                  </span>
                </div>
                <span className="text-2xl font-bold text-blue-900">
                  {precioCalculado > 0 ? formatCurrency(precioCalculado) : '₡0.00'}
                </span>
              </div>
              <div className="mt-3 space-y-1">
                <p className="text-xs text-blue-700 flex items-center">
                  <i className="ri-information-line mr-1"></i>
                  Precio = Costo / (1 - Margen/100)
                </p>
                {parseFloat(formData.ganancia_articulo) >= 100 && (
                  <p className="text-xs text-red-600 flex items-center font-medium">
                    <i className="ri-error-warning-line mr-1"></i>
                    El margen debe ser menor a 100% para calcular el precio
                  </p>
                )}
                {precioCalculado > 0 && parseFloat(formData.ganancia_articulo) > 0 && (
                  <p className="text-xs text-green-700 flex items-center">
                    <i className="ri-check-line mr-1"></i>
                    Utilidad: {formatCurrency(precioCalculado - parseFloat(formData.costo_articulo || '0'))} ({formData.ganancia_articulo}% del precio)
                  </p>
                )}
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onCancel}
                disabled={saving}
                className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap disabled:opacity-50 flex items-center cursor-pointer"
              >
                <i className="ri-close-line mr-2"></i>
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap disabled:opacity-50 flex items-center cursor-pointer"
              >
                {saving && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                )}
                <i className={`${saving ? 'hidden' : 'ri-save-line'} mr-2`}></i>
                {articulo ? 'Actualizar' : 'Crear'} Artículo
              </button>
            </div>
          </form>
        </div>
      </div>
      <NotificationPopup
        isOpen={notification.isOpen}
        onClose={hideNotification}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />
    </div>
  );
}
