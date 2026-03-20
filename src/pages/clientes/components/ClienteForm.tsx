import { useState, useEffect } from 'react';
import {
  Cliente,
  Provincia,
  Canton,
  Distrito,
  Pais,
  ActividadEconomica,
} from '../../../types/cliente';
import { ClienteService, HaciendaService } from '../../../services/clienteService';

interface ClienteFormProps {
  cliente?: Cliente | null;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export function ClienteForm({
  cliente,
  onSubmit,
  onCancel,
}: ClienteFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [validandoHacienda, setValidandoHacienda] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);
  const [loadingCatalogos, setLoadingCatalogos] = useState(false);
  const [loadingDistritos, setLoadingDistritos] = useState(false);

  // Catálogos
  const [provincias, setProvincias] = useState<Provincia[]>([]);
  const [cantones, setCantones] = useState<Canton[]>([]);
  const [distritos, setDistritos] = useState<Distrito[]>([]);
  const [paises, setPaises] = useState<Pais[]>([]);
  const [actividadesEconomicas, setActividadesEconomicas] = useState<
    ActividadEconomica[]
  >([]);

  // Formulario
  const [formData, setFormData] = useState({
    tipo_persona: 'fisica' as const,
    tipo_identificacion: 'cedula_fisica' as const,
    identificacion: '',
    nombre_razon_social: '',
    nombre_comercial: '',
    correo_principal: '',
    correos_adicionales: [] as string[],
    telefono_pais: '506',
    telefono_numero: '',
    telefono_secundario: '',
    provincia_id: undefined as number | undefined,
    canton_id: undefined as number | undefined,
    distrito_id: undefined as number | undefined,
    barrio: '',
    otras_senas: '',
    codigo_postal: '',
    pais_iso: 'CR',
    direccion_extranjero_line1: '',
    direccion_extranjero_line2: '',
    codigo_actividad_economica: '',
    regimen_tributario: 'general' as const,
    exoneracion_numero: '',
    exoneracion_institucion: '',
    exoneracion_porcentaje: 0,
    exoneracion_vencimiento: '',
    moneda_preferida: 'CRC',
    condicion_venta_preferida: 'contado',
    dias_credito: 0,
    limite_credito: 0,
    lista_precios_id: undefined as number | undefined,
    hacienda_estado_validacion: 'pendiente' as const,
    hacienda_ultimo_mensaje: '',
    hacienda_ultimo_intento: '',
    activo: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [correoAdicional, setCorreoAdicional] = useState('');

  const steps = [
    { number: 1, title: 'Tipo e Identificación', icon: 'ri-id-card-line' },
    { number: 2, title: 'Datos Legales', icon: 'ri-building-line' },
    { number: 3, title: 'Contacto', icon: 'ri-phone-line' },
    { number: 4, title: 'Dirección', icon: 'ri-map-pin-line' },
    { number: 5, title: 'Información Fiscal', icon: 'ri-file-list-3-line' },
    { number: 6, title: 'Preferencias', icon: 'ri-settings-3-line' },
  ];

  // Cargar datos iniciales
  useEffect(() => {
    const inicializar = async () => {
      setLoadingCatalogos(true);
      await cargarCatalogos();
      
      if (cliente) {
        // Cargar datos del cliente incluyendo dirección
        setFormData({
          tipo_persona: cliente.tipo_persona || 'fisica',
          tipo_identificacion: cliente.tipo_identificacion || 'cedula_fisica',
          identificacion: cliente.identificacion || '',
          nombre_razon_social: cliente.nombre_razon_social || '',
          nombre_comercial: cliente.nombre_comercial || '',
          correo_principal: cliente.correo_principal || '',
          correos_adicionales: cliente.correos_adicionales || [],
          telefono_pais: cliente.telefono_pais || '506',
          telefono_numero: cliente.telefono_numero || '',
          telefono_secundario: cliente.telefono_secundario || '',
          provincia_id: cliente.provincia_id || undefined,
          canton_id: cliente.canton_id || undefined,
          distrito_id: cliente.distrito_id || undefined,
          barrio: cliente.barrio || '',
          otras_senas: cliente.otras_senas || '',
          codigo_postal: cliente.codigo_postal || '',
          pais_iso: cliente.pais_iso || 'CR',
          direccion_extranjero_line1: cliente.direccion_extranjero_line1 || '',
          direccion_extranjero_line2: cliente.direccion_extranjero_line2 || '',
          codigo_actividad_economica: cliente.codigo_actividad_economica || '',
          regimen_tributario: cliente.regimen_tributario || 'general',
          exoneracion_numero: cliente.exoneracion_numero || '',
          exoneracion_institucion: cliente.exoneracion_institucion || '',
          exoneracion_porcentaje: cliente.exoneracion_porcentaje || 0,
          exoneracion_vencimiento: cliente.exoneracion_vencimiento || '',
          moneda_preferida: cliente.moneda_preferida || 'CRC',
          condicion_venta_preferida: cliente.condicion_venta_preferida || 'contado',
          dias_credito: cliente.dias_credito || 0,
          limite_credito: cliente.limite_credito || 0,
          lista_precios_id: cliente.lista_precios_id || undefined,
          hacienda_estado_validacion: cliente.hacienda_estado_validacion || 'pendiente',
          hacienda_ultimo_mensaje: cliente.hacienda_ultimo_mensaje || '',
          hacienda_ultimo_intento: cliente.hacienda_ultimo_intento || '',
          activo: cliente.activo !== undefined ? cliente.activo : true,
        });

        // Cargar cantones y distritos si hay provincia y cantón
        if (cliente.provincia_id) {
          const cantonesData = await ClienteService.obtenerCantones(cliente.provincia_id);
          setCantones(cantonesData);
          
          if (cliente.canton_id) {
            const distritosData = await ClienteService.obtenerDistritos(cliente.canton_id);
            setDistritos(distritosData);
          }
        }
      }
      setLoadingCatalogos(false);
    };

    inicializar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cargar cantones cuando cambia la provincia
  useEffect(() => {
    const cargarCantonesEffect = async () => {
      if (formData.provincia_id) {
        const cantonesData = await ClienteService.obtenerCantones(formData.provincia_id);
        setCantones(cantonesData);
        
        // Solo limpiar si no estamos cargando un cliente existente
        if (!loadingCatalogos && (!cliente || cliente.provincia_id !== formData.provincia_id)) {
          setFormData(prev => ({
            ...prev,
            canton_id: undefined,
            distrito_id: undefined,
          }));
          setDistritos([]);
        }
      } else {
        setCantones([]);
        setDistritos([]);
        if (!loadingCatalogos) {
          setFormData(prev => ({
            ...prev,
            canton_id: undefined,
            distrito_id: undefined,
          }));
        }
      }
    };

    cargarCantonesEffect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.provincia_id]);

  // Cargar distritos cuando cambia el cantón
  useEffect(() => {
    const cargarDistritosEffect = async () => {
      if (formData.canton_id) {
        console.log('🔄 Iniciando carga de distritos para cantón:', formData.canton_id);
        setLoadingDistritos(true);
        
        try {
          const distritosData = await ClienteService.obtenerDistritos(formData.canton_id);
          console.log('✅ Distritos obtenidos:', distritosData.length);
          setDistritos(distritosData);
          
          // Solo limpiar si no estamos cargando un cliente existente
          if (!loadingCatalogos && (!cliente || cliente.canton_id !== formData.canton_id)) {
            setFormData(prev => ({
              ...prev,
              distrito_id: undefined,
            }));
          }
          
          // Si no hay distritos, mostrar advertencia
          if (distritosData.length === 0) {
            console.warn('⚠️ No se encontraron distritos para el cantón:', formData.canton_id);
          }
        } catch (error) {
          console.error('❌ Error cargando distritos:', error);
          setDistritos([]);
          showError('Error', 'No se pudieron cargar los distritos. Por favor intenta nuevamente.');
        } finally {
          setLoadingDistritos(false);
        }
      } else {
        setDistritos([]);
        setLoadingDistritos(false);
        if (!loadingCatalogos) {
          setFormData(prev => ({
            ...prev,
            distrito_id: undefined,
          }));
        }
      }
    };

    cargarDistritosEffect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.canton_id]);

  const cargarCatalogos = async () => {
    try {
      const [provinciasData, paisesData, actividadesData] = await Promise.all([
        ClienteService.obtenerProvincias(),
        ClienteService.obtenerPaises(),
        ClienteService.obtenerActividadesEconomicas(),
      ]);

      setProvincias(provinciasData);
      setPaises(paisesData);
      setActividadesEconomicas(actividadesData);
    } catch (error) {
      console.error('Error cargando catálogos:', error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validarPaso = (paso: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (paso) {
      case 1:
        if (!formData.tipo_persona)
          newErrors.tipo_persona = 'Requerido';
        if (!formData.tipo_identificacion)
          newErrors.tipo_identificacion = 'Requerido';
        if (!formData.identificacion) {
          newErrors.identificacion = 'Requerido';
        } else if (
          !ClienteService.validarIdentificacion(
            formData.tipo_identificacion,
            formData.identificacion,
          )
        ) {
          newErrors.identificacion = 'Formato de identificación inválido';
        }
        break;

      case 2:
        if (!formData.nombre_razon_social)
          newErrors.nombre_razon_social = 'Requerido';
        break;

      case 3:
        if (!formData.correo_principal) {
          newErrors.correo_principal = 'Requerido';
        } else if (!ClienteService.validarEmail(formData.correo_principal)) {
          newErrors.correo_principal = 'Email inválido';
        }
        if (
          formData.telefono_numero &&
          !ClienteService.validarTelefono(formData.telefono_numero)
        ) {
          newErrors.telefono_numero = 'Teléfono inválido';
        }
        break;

      case 4:
        if (formData.tipo_persona !== 'extranjero') {
          if (!formData.provincia_id)
            newErrors.provincia_id = 'Requerido';
          if (!formData.canton_id) newErrors.canton_id = 'Requerido';
          // Solo validar distrito si hay distritos disponibles para el cantón seleccionado
          if (!formData.distrito_id && distritos.length > 0) {
            newErrors.distrito_id = 'Requerido';
          }
        } else {
          if (!formData.pais_iso) newErrors.pais_iso = 'Requerido';
          if (!formData.direccion_extranjero_line1)
            newErrors.direccion_extranjero_line1 = 'Requerido';
        }
        break;

      case 5:
        if (!formData.codigo_actividad_economica)
          newErrors.codigo_actividad_economica = 'Requerido';
        if (
          formData.exoneracion_porcentaje &&
          (formData.exoneracion_porcentaje < 0 ||
            formData.exoneracion_porcentaje > 100)
        ) {
          newErrors.exoneracion_porcentaje = 'Debe estar entre 0 y 100';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validarPaso(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const showSuccess = (title: string, message: string) => {
    setNotification({ type: 'success', title, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const showError = (title: string, message: string) => {
    setNotification({ type: 'error', title, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const validarConHacienda = async () => {
    try {
      setValidandoHacienda(true);
      const resultado = await HaciendaService.validarIdentificacion(
        formData.identificacion,
      );

      setFormData(prev => ({
        ...prev,
        hacienda_estado_validacion: resultado.valido
          ? 'valido'
          : 'no_valido',
        hacienda_ultimo_mensaje: resultado.mensaje,
        hacienda_ultimo_intento: new Date().toISOString(),
      }));

      showSuccess('Validación exitosa', resultado.mensaje);
    } catch (error) {
      console.error('Error validando con Hacienda:', error);
      showError('Error al validar', 'Error al validar con Hacienda');
    } finally {
      setValidandoHacienda(false);
    }
  };

  const agregarCorreoAdicional = () => {
    if (correoAdicional && ClienteService.validarEmail(correoAdicional)) {
      setFormData(prev => ({
        ...prev,
        correos_adicionales: [...prev.correos_adicionales, correoAdicional],
      }));
      setCorreoAdicional('');
    }
  };

  const eliminarCorreoAdicional = (index: number) => {
    setFormData(prev => ({
      ...prev,
      correos_adicionales: prev.correos_adicionales.filter(
        (_, i) => i !== index,
      ),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar el paso actual antes de guardar
    if (!validarPaso(currentStep)) {
      return;
    }

    try {
      setLoading(true);
      
      // Preparar datos para enviar
      const dataToSubmit = { ...formData };
      
      // Si no hay distritos disponibles para el cantón seleccionado, enviar distrito_id como null
      if (formData.tipo_persona !== 'extranjero' && formData.canton_id && distritos.length === 0) {
        dataToSubmit.distrito_id = null as any;
        console.log('ℹ️ Cantón sin distritos registrados, guardando distrito_id como null');
      }
      
      await onSubmit(dataToSubmit);
    } catch (error) {
      console.error('Error guardando cliente:', error);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------
  // Render functions for each step (unchanged)
  // -------------------------------------------------
  const renderStep1 = () => (
    <div className="space-y-6">
      {/* Tipo de Persona */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de Persona *
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { value: 'fisica', label: 'Persona Física', icon: 'ri-user-line' },
            {
              value: 'juridica',
              label: 'Persona Jurídica',
              icon: 'ri-building-line',
            },
            { value: 'extranjero', label: 'Extranjero', icon: 'ri-global-line' },
          ].map(tipo => (
            <button
              key={tipo.value}
              type="button"
              onClick={() => handleInputChange('tipo_persona', tipo.value)}
              className={`p-4 border-2 rounded-lg text-left transition-colors ${
                formData.tipo_persona === tipo.value
                  ? 'border-teal-500 bg-teal-50 text-teal-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <i className={`${tipo.icon} text-xl mb-2 block`}></i>
              <div className="font-medium">{tipo.label}</div>
            </button>
          ))}
        </div>
        {errors.tipo_persona && (
          <p className="text-red-600 text-sm mt-1">{errors.tipo_persona}</p>
        )}
      </div>

      {/* Tipo de Identificación */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de Identificación *
        </label>
        <select
          value={formData.tipo_identificacion}
          onChange={e =>
            handleInputChange('tipo_identificacion', e.target.value)
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        >
          <option value="cedula_fisica">Cédula Física</option>
          <option value="cedula_juridica">Cédula Jurídica</option>
          <option value="dimex">DIMEX</option>
          <option value="nite">NITE</option>
          <option value="pasaporte">Pasaporte</option>
        </select>
        {errors.tipo_identificacion && (
          <p className="text-red-600 text-sm mt-1">
            {errors.tipo_identificacion}
          </p>
        )}
      </div>

      {/* Número de Identificación */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Número de Identificación *
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={formData.identificacion}
            onChange={e =>
              handleInputChange('identificacion', e.target.value)
            }
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder="Ingrese la identificación"
          />
          <button
            type="button"
            onClick={validarConHacienda}
            disabled={!formData.identificacion || validandoHacienda}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors whitespace-nowrap"
          >
            {validandoHacienda ? (
              <i className="ri-loader-4-line animate-spin"></i>
            ) : (
              <i className="ri-shield-check-line"></i>
            )}
            Validar
          </button>
        </div>
        {errors.identificacion && (
          <p className="text-red-600 text-sm mt-1">{errors.identificacion}</p>
        )}

        {formData.hacienda_estado_validacion !== 'pendiente' && (
          <div
            className={`mt-2 p-3 rounded-lg ${
              formData.hacienda_estado_validacion === 'valido'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            <div className="flex items-center">
              <i
                className={`${
                  formData.hacienda_estado_validacion === 'valido'
                    ? 'ri-check-line'
                    : 'ri-close-line'
                } mr-2`}
              ></i>
              <span className="text-sm">
                {formData.hacienda_ultimo_mensaje}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      {/* Nombre / Razón Social */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {formData.tipo_persona === 'fisica'
            ? 'Nombre Completo'
            : 'Razón Social'}{' '}
          *
        </label>
        <input
          type="text"
          value={formData.nombre_razon_social}
          onChange={e =>
            handleInputChange('nombre_razon_social', e.target.value)
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          placeholder={
            formData.tipo_persona === 'fisica'
              ? 'Juan Pérez Rodríguez'
              : 'Empresa S.A.'
          }
        />
        {errors.nombre_razon_social && (
          <p className="text-red-600 text-sm mt-1">
            {errors.nombre_razon_social}
          </p>
        )}
      </div>

      {/* Nombre Comercial - Ahora disponible para todos los tipos */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nombre Comercial / Alias
        </label>
        <input
          type="text"
          value={formData.nombre_comercial}
          onChange={e =>
            handleInputChange('nombre_comercial', e.target.value)
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          placeholder="Nombre comercial o alias del cliente"
        />
        <p className="text-xs text-gray-500 mt-1">
          Nombre de fantasía o alias con el que se conoce al cliente
        </p>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      {/* Correo Principal */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Correo Electrónico Principal *
        </label>
        <input
          type="email"
          value={formData.correo_principal}
          onChange={e => handleInputChange('correo_principal', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          placeholder="correo@ejemplo.com"
        />
        {errors.correo_principal && (
          <p className="text-red-600 text-sm mt-1">
            {errors.correo_principal}
          </p>
        )}
      </div>

      {/* Correos Adicionales */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Correos Adicionales
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="email"
            value={correoAdicional}
            onChange={e => setCorreoAdicional(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder="correo.adicional@ejemplo.com"
          />
          <button
            type="button"
            onClick={agregarCorreoAdicional}
            disabled={!correoAdicional}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-400 transition-colors"
          >
            <i className="ri-add-line"></i>
          </button>
        </div>

        {formData.correos_adicionales.length > 0 && (
          <div className="space-y-2">
            {formData.correos_adicionales.map((correo, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
              >
                <span className="flex-1 text-sm">{correo}</span>
                <button
                  type="button"
                  onClick={() => eliminarCorreoAdicional(index)}
                  className="text-red-600 hover:text-red-800 p-1"
                >
                  <i className="ri-close-line"></i>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Teléfonos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Teléfono Principal */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Teléfono Principal
          </label>
          <div className="flex gap-2">
            <select
              value={formData.telefono_pais}
              onChange={e => handleInputChange('telefono_pais', e.target.value)}
              className="w-20 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="506">+506</option>
              <option value="1">+1</option>
              <option value="52">+52</option>
              <option value="502">+502</option>
              <option value="504">+504</option>
              <option value="503">+503</option>
              <option value="507">+507</option>
              <option value="505">+505</option>
            </select>
            <input
              type="tel"
              value={formData.telefono_numero}
              onChange={e =>
                handleInputChange('telefono_numero', e.target.value)
              }
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="88888888"
            />
          </div>
          {errors.telefono_numero && (
            <p className="text-red-600 text-sm mt-1">
              {errors.telefono_numero}
            </p>
          )}
        </div>

        {/* Teléfono Secundario */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Teléfono Secundario
          </label>
          <input
            type="tel"
            value={formData.telefono_secundario}
            onChange={e =>
              handleInputChange('telefono_secundario', e.target.value)
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder="22222222"
          />
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      {formData.tipo_persona !== 'extranjero' ? (
        <>
          {/* Direccion Nacional */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Provincia */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Provincia *
              </label>
              <select
                value={formData.provincia_id || ''}
                onChange={e =>
                  handleInputChange(
                    'provincia_id',
                    e.target.value ? parseInt(e.target.value) : undefined,
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="">Seleccionar provincia</option>
                {provincias.map(provincia => (
                  <option key={provincia.id} value={provincia.id}>
                    {provincia.nombre}
                  </option>
                ))}
              </select>
              {errors.provincia_id && (
                <p className="text-red-600 text-sm mt-1">
                  {errors.provincia_id}
                </p>
              )}
            </div>

            {/* Cantón */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cantón *
              </label>
              <select
                value={formData.canton_id || ''}
                onChange={e =>
                  handleInputChange(
                    'canton_id',
                    e.target.value ? parseInt(e.target.value) : undefined,
                  )
                }
                disabled={!formData.provincia_id || cantones.length === 0}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">
                  {!formData.provincia_id 
                    ? 'Primero seleccione una provincia' 
                    : cantones.length === 0 
                    ? 'Cargando cantones...' 
                    : 'Seleccionar cantón'
                  }
                </option>
                {cantones.map(canton => (
                  <option key={canton.id} value={canton.id}>
                    {canton.nombre}
                  </option>
                ))}
              </select>
              {errors.canton_id && (
                <p className="text-red-600 text-sm mt-1">{errors.canton_id}</p>
              )}
            </div>

            {/* Distrito */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Distrito {distritos.length > 0 ? '*' : ''}
              </label>
              <div className="relative">
                <select
                  value={formData.distrito_id || ''}
                  onChange={e =>
                    handleInputChange(
                      'distrito_id',
                      e.target.value ? parseInt(e.target.value) : undefined,
                    )
                  }
                  disabled={!formData.canton_id || loadingDistritos}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed pr-10"
                >
                  <option value="">
                    {!formData.canton_id 
                      ? 'Primero seleccione un cantón' 
                      : loadingDistritos 
                      ? 'Cargando distritos...' 
                      : distritos.length === 0
                      ? 'Sin distritos (opcional)'
                      : 'Seleccionar distrito'
                    }
                  </option>
                  {distritos.map(distrito => (
                    <option key={distrito.id} value={distrito.id}>
                      {distrito.nombre}
                    </option>
                  ))}
                </select>
                {loadingDistritos && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <i className="ri-loader-4-line animate-spin text-teal-600"></i>
                  </div>
                )}
              </div>
              {errors.distrito_id && (
                <p className="text-red-600 text-sm mt-1">{errors.distrito_id}</p>
              )}
              {!loadingDistritos && formData.canton_id && distritos.length === 0 && (
                <p className="text-blue-600 text-xs mt-1 flex items-center">
                  <i className="ri-information-line mr-1"></i>
                  Este cantón no tiene distritos registrados. Puede continuar sin seleccionar distrito.
                </p>
              )}
            </div>
          </div>

          {/* Barrio y Código Postal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Barrio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Barrio
              </label>
              <input
                type="text"
                value={formData.barrio}
                onChange={e => handleInputChange('barrio', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Nombre del barrio"
              />
            </div>

            {/* Código Postal */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código Postal
              </label>
              <input
                type="text"
                value={formData.codigo_postal}
                onChange={e => handleInputChange('codigo_postal', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="10101"
              />
            </div>
          </div>

          {/* Otras Señas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Otras Señas
            </label>
            <textarea
              value={formData.otras_senas}
              onChange={e => handleInputChange('otras_senas', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="Descripción detallada de la dirección"
            />
          </div>
        </>
      ) : (
        <>
          {/* Dirección Extranjera */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              País *
            </label>
            <select
              value={formData.pais_iso || ''}
              onChange={e => handleInputChange('pais_iso', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="">Seleccionar país</option>
              {paises.map(pais => (
                <option key={pais.codigo_iso} value={pais.codigo_iso}>
                  {pais.nombre}
                </option>
              ))}
            </select>
            {errors.pais_iso && (
              <p className="text-red-600 text-sm mt-1">{errors.pais_iso}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dirección Línea 1 *
            </label>
            <input
              type="text"
              value={formData.direccion_extranjero_line1}
              onChange={e =>
                handleInputChange('direccion_extranjero_line1', e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="Dirección principal"
            />
            {errors.direccion_extranjero_line1 && (
              <p className="text-red-600 text-sm mt-1">
                {errors.direccion_extranjero_line1}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dirección Línea 2
            </label>
            <input
              type="text"
              value={formData.direccion_extranjero_line2}
              onChange={e =>
                handleInputChange('direccion_extranjero_line2', e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="Información adicional de dirección"
            />
          </div>
        </>
      )}
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      {/* Código de Actividad Económica */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Código de Actividad Económica *
        </label>
        <select
          value={formData.codigo_actividad_economica}
          onChange={e =>
            handleInputChange('codigo_actividad_economica', e.target.value)
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        >
          <option value="">Seleccionar actividad económica</option>
          {actividadesEconomicas.map(actividad => (
            <option key={actividad.codigo} value={actividad.codigo}>
              {actividad.codigo} - {actividad.descripcion}
            </option>
          ))}
        </select>
        {errors.codigo_actividad_economica && (
          <p className="text-red-600 text-sm mt-1">
            {errors.codigo_actividad_economica}
          </p>
        )}
      </div>

      {/* Régimen Tributario */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Régimen Tributario
        </label>
        <select
          value={formData.regimen_tributario}
          onChange={e => handleInputChange('regimen_tributario', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        >
          <option value="general">General</option>
          <option value="simplificado">Simplificado</option>
          <option value="exento">Exento</option>
          <option value="otro">Otro</option>
        </select>
      </div>

      {/* Exoneración */}
      <div className="border-t border-gray-200 pt-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">
          Información de Exoneración
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Número de Exoneración */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Número de Exoneración
            </label>
            <input
              type="text"
              value={formData.exoneracion_numero}
              onChange={e =>
                handleInputChange('exoneracion_numero', e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="Número de exoneración"
            />
          </div>

          {/* Institución que Exonera */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Institución que Exonera
            </label>
            <input
              type="text"
              value={formData.exoneracion_institucion}
              onChange={e =>
                handleInputChange('exoneracion_institucion', e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="Nombre de la institución"
            />
          </div>

          {/* Porcentaje */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Porcentaje de Exoneración (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.exoneracion_porcentaje}
              onChange={e =>
                handleInputChange(
                  'exoneracion_porcentaje',
                  parseFloat(e.target.value) || 0,
                )
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-5
              focus:border-transparent"
              placeholder="0.00"
            />
            {errors.exoneracion_porcentaje && (
              <p className="text-red-600 text-sm mt-1">
                {errors.exoneracion_porcentaje}
              </p>
            )}
          </div>

          {/* Fecha Vencimiento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de Vencimiento
            </label>
            <input
              type="date"
              value={formData.exoneracion_vencimiento}
              onChange={e =>
                handleInputChange('exoneracion_vencimiento', e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-5
              focus:border-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep6 = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Moneda Preferida */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Moneda Preferida
          </label>
          <select
            value={formData.moneda_preferida}
            onChange={e => handleInputChange('moneda_preferida', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
          >
            <option value="CRC">Colones (₡)</option>
            <option value="USD">Dólares ($)</option>
            <option value="EUR">Euros (€)</option>
          </select>
        </div>

        {/* Condición de Venta */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Condición de Venta
          </label>
          <select
            value={formData.condicion_venta_preferida}
            onChange={e =>
              handleInputChange('condicion_venta_preferida', e.target.value)
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
          >
            <option value="contado">Contado</option>
            <option value="credito">Crédito</option>
            <option value="mixto">Mixto</option>
          </select>
        </div>

        {/* Días de Crédito */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Días de Crédito
          </label>
          <input
            type="number"
            min="0"
            value={formData.dias_credito}
            onChange={e =>
              handleInputChange('dias_credito', parseInt(e.target.value) || 0)
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
            placeholder="0"
          />
          <p className="text-xs text-gray-500 mt-1">
            Días de crédito otorgados al cliente
          </p>
        </div>

        {/* Límite de Crédito */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Límite de Crédito (₡)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={formData.limite_credito}
            onChange={e =>
              handleInputChange('limite_credito', parseFloat(e.target.value) || 0)
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
            placeholder="0.00"
          />
          <p className="text-xs text-gray-500 mt-1">
            Monto máximo de crédito permitido
          </p>
        </div>
      </div>

      {/* Activo */}
      <div className="flex items-center pt-2 border-t border-gray-200">
        <input
          type="checkbox"
          id="activo"
          checked={formData.activo}
          onChange={e => handleInputChange('activo', e.target.checked)}
          className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded cursor-pointer"
        />
        <label htmlFor="activo" className="ml-2 block text-sm text-gray-900 cursor-pointer">
          Cliente activo
        </label>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start">
          <i className="ri-information-line text-blue-600 text-lg mr-2 mt-0.5"></i>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Información de Preferencias</p>
            <p className="text-xs">
              Estas preferencias se aplicarán por defecto al crear cotizaciones y pedidos para este cliente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      case 5:
        return renderStep5();
      case 6:
        return renderStep6();
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Notificación */}
        {notification && (
          <div className={`absolute top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            <div className="font-medium">{notification.title}</div>
            <div className="text-sm">{notification.message}</div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">
            {cliente ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <i className="ri-close-line text-2xl"></i>
          </button>
        </div>

        {/* Steps progress bar */}
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                    currentStep === step.number
                      ? 'bg-teal-600 text-white flex-1'
                      : currentStep > step.number
                      ? 'bg-teal-100 text-teal-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <span className="font-medium">{step.number}</span>
                  {currentStep === step.number && (
                    <span className="text-sm font-medium whitespace-nowrap">{step.title}</span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-0.5 mx-1 ${
                    currentStep > step.number ? 'bg-teal-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form content - Ajustado para mejor scroll */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-6">
              <div className="flex items-center mb-4">
                <i
                  className={`${steps[currentStep - 1].icon} text-2xl text-teal-600 mr-3`}
                ></i>
                <h3 className="text-lg font-medium text-gray-900">
                  {steps[currentStep - 1].title}
                </h3>
              </div>

              {renderCurrentStep()}
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <button
              type="button"
              onClick={handlePrevStep}
              disabled={currentStep === 1}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              <i className="ri-arrow-left-line mr-2"></i>
              Anterior
            </button>

            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">
                Paso {currentStep} de {steps.length}
              </span>
              
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
              >
                Cancelar
              </button>

              {currentStep === steps.length ? (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center whitespace-nowrap"
                >
                  {loading ? (
                    <>
                      <i className="ri-loader-4-line animate-spin mr-2"></i>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <i className="ri-save-line mr-2"></i>
                      {cliente ? 'Actualizar' : 'Crear'} Cliente
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap"
                >
                  Siguiente
                  <i className="ri-arrow-right-line ml-2"></i>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
