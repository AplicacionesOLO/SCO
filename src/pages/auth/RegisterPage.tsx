import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom';

interface Store {
  id: string;
  nombre: string;
  codigo: string;
}

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    nombre_completo: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [selectedStore, setSelectedStore] = useState('');
  const [stores, setStores] = useState<Store[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [lastAttempt, setLastAttempt] = useState<number>(0);
  const { signUp, getAvailableStores } = useAuth();
  const navigate = useNavigate();

  // Cargar tiendas disponibles
  useEffect(() => {
    const loadStores = async () => {
      try {
        const availableStores = await getAvailableStores();
        setStores(availableStores);
        
        // Si solo hay una tienda, seleccionarla automáticamente
        if (availableStores.length === 1) {
          setSelectedStore(availableStores[0].id);
        }
      } catch (err) {
        console.error('Error cargando tiendas:', err);
      } finally {
        setLoadingStores(false);
      }
    };

    loadStores();
  }, [getAvailableStores]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { isValid: false, message: 'Por favor ingresa un email válido' };
    }

    const emailLower = email.toLowerCase();
    const commonDomainErrors = {
      'gmai.com': 'gmail.com',
      'gmal.com': 'gmail.com',
      'gmial.com': 'gmail.com',
      'gmil.com': 'gmail.com',
      'yahooo.com': 'yahoo.com',
      'yaho.com': 'yahoo.com',
      'hotmial.com': 'hotmail.com',
      'hotmil.com': 'hotmail.com',
      'outlok.com': 'outlook.com',
      'outloo.com': 'outlook.com'
    };

    for (const [wrong, correct] of Object.entries(commonDomainErrors)) {
      if (emailLower.includes(wrong)) {
        return { 
          isValid: false, 
          message: `¿Quisiste decir "${emailLower.replace(wrong, correct)}"? Verifica tu email.` 
        };
      }
    }

    return { isValid: true, message: '' };
  };

  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return { isValid: false, message: 'La contraseña debe tener al menos 8 caracteres' };
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return { 
        isValid: false, 
        message: 'La contraseña debe contener al menos una mayúscula, una minúscula y un número' 
      };
    }

    return { isValid: true, message: '' };
  };

  const validateForm = () => {
    if (!formData.nombre_completo || !formData.email || !formData.password || !formData.confirmPassword) {
      return 'Por favor completa todos los campos';
    }

    if (!selectedStore) {
      return 'Por favor selecciona una tienda';
    }

    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      return emailValidation.message;
    }

    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      return passwordValidation.message;
    }

    if (formData.password !== formData.confirmPassword) {
      return 'Las contraseñas no coinciden';
    }

    return null;
  };

  const checkRateLimit = () => {
    const now = Date.now();
    const timeSinceLastAttempt = now - lastAttempt;
    const minInterval = 15000;

    if (lastAttempt > 0 && timeSinceLastAttempt < minInterval) {
      const remainingTime = Math.ceil((minInterval - timeSinceLastAttempt) / 1000);
      return `Por seguridad, debes esperar ${remainingTime} segundos antes de intentar nuevamente.`;
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const rateLimitError = checkRateLimit();
    if (rateLimitError) {
      setError(rateLimitError);
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = await signUp(
        formData.email, 
        formData.password, 
        {
          nombre_completo: formData.nombre_completo,
        },
        selectedStore
      );

      if (result.error) {
        if (result.error.message?.includes('For security purposes')) {
          setError('Por seguridad, debes esperar antes de intentar nuevamente. Intenta en unos minutos.');
          setLastAttempt(Date.now());
          return;
        }
        
        setError(result.error.message || 'Error al crear la cuenta');
        return;
      }

      if (result.success) {
        setSuccessMessage(result.message || 'Cuenta creada exitosamente');
        setShowSuccessModal(true);
        
        setFormData({
          nombre_completo: '',
          email: '',
          password: '',
          confirmPassword: '',
        });
        setSelectedStore('');
      }
      
    } catch (error: any) {
      console.error('Error en registro:', error);
      setError('Error inesperado al crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    navigate('/login');
  };

  const getRemainingTime = () => {
    if (lastAttempt === 0) return 0;
    const now = Date.now();
    const timeSinceLastAttempt = now - lastAttempt;
    const minInterval = 15000;
    const remaining = Math.max(0, minInterval - timeSinceLastAttempt);
    return Math.ceil(remaining / 1000);
  };

  const remainingTime = getRemainingTime();
  const canSubmit = !loading && remainingTime === 0 && !loadingStores && stores.length > 0;

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="mx-auto h-12 w-12 flex items-center justify-center">
              <img 
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRYi7j4OFVRmD2T0m6NyFHqYa96zun92AUTIA&s" 
                alt="SCO" 
                className="h-12 w-12 rounded-full object-cover"
              />
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Crear Cuenta en SCO
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Sistema de Costeos OLO
            </p>
          </div>
          
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {remainingTime > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
                <div className="flex items-center">
                  <i className="ri-time-line mr-2"></i>
                  Espera {remainingTime} segundos antes de intentar nuevamente
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label htmlFor="nombre_completo" className="block text-sm font-medium text-gray-700">
                  Nombre Completo
                </label>
                <input
                  id="nombre_completo"
                  name="nombre_completo"
                  type="text"
                  required
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Tu nombre completo"
                  value={formData.nombre_completo}
                  onChange={handleChange}
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Correo Electrónico
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Contraseña
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Mínimo 8 caracteres"
                  value={formData.password}
                  onChange={handleChange}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Debe contener al menos 8 caracteres, una mayúscula, una minúscula y un número
                </p>
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirmar Contraseña
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Confirma tu contraseña"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="store" className="block text-sm font-medium text-gray-700">
                  Tienda
                </label>
                {loadingStores ? (
                  <div className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                    Cargando tiendas...
                  </div>
                ) : stores.length === 0 ? (
                  <div className="mt-1 w-full px-3 py-2 border border-red-300 rounded-md bg-red-50 text-red-600 text-sm">
                    No hay tiendas disponibles. Contacta al administrador.
                  </div>
                ) : (
                  <select
                    id="store"
                    name="store"
                    required
                    value={selectedStore}
                    onChange={(e) => setSelectedStore(e.target.value)}
                    className="mt-1 w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">Selecciona una tienda</option>
                    {stores.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.nombre} ({store.codigo})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={!canSubmit}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creando cuenta...
                  </div>
                ) : remainingTime > 0 ? (
                  `Esperar ${remainingTime}s`
                ) : (
                  'Crear Cuenta'
                )}
              </button>
            </div>

            <div className="text-center">
              <span className="text-sm text-gray-600">
                ¿Ya tienes cuenta?{' '}
                <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                  Inicia sesión aquí
                </Link>
              </span>
            </div>
          </form>
        </div>
      </div>

      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <i className="ri-check-line text-green-600 text-xl"></i>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                ¡Cuenta Creada Exitosamente!
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                {successMessage}
              </p>
              <button
                onClick={handleSuccessModalClose}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                Ir al Login
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
