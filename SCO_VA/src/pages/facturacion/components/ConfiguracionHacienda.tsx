import { useState, useEffect } from 'react';
import { haciendaService } from '../../../services/haciendaService';
import type { HaciendaSettings } from '../../../types/facturacion';
import { showAlert } from '../../../utils/dialog';

export function ConfiguracionHacienda() {
  const [settings, setSettings] = useState<Partial<HaciendaSettings>>({
    cedula_emisor: '',
    codigo_actividad_economica: '',
    sucursal: '001',
    terminal: '00001',
    ambiente: 'sandbox',
    usuario_idp: '',
    password_idp_encrypted: '',
    certificado_p12_path: '',
    certificado_password_encrypted: '',
    proveedor_sistema: 'OLO Sistema de Gestión',
    activo: true
  });

  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await haciendaService.getSettings();
      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error cargando configuración:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const success = await haciendaService.saveSettings(settings);
      if (success) {
        showAlert('Configuración guardada exitosamente');
        loadSettings();
      } else {
        showAlert('Error guardando configuración');
      }
    } catch (error) {
      console.error('Error:', error);
      showAlert('Error guardando configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const result = await haciendaService.testConnection();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Error probando conexión'
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Configuración de Hacienda</h2>
        <button
          onClick={handleTestConnection}
          disabled={testing}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          {testing ? (
            <>
              <i className="ri-loader-4-line animate-spin mr-2"></i>
              Probando...
            </>
          ) : (
            <>
              <i className="ri-wifi-line mr-2"></i>
              Probar Conexión
            </>
          )}
        </button>
      </div>

      {testResult && (
        <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          <div className="flex items-center">
            <i className={`${testResult.success ? 'ri-check-line' : 'ri-error-warning-line'} mr-2`}></i>
            {testResult.message}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información del Emisor */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Información del Emisor</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cédula Jurídica del Emisor *
              </label>
              <input
                type="text"
                value={settings.cedula_emisor}
                onChange={(e) => setSettings({ ...settings, cedula_emisor: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="3-101-123456"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Formato: 3-101-123456</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código de Actividad Económica *
              </label>
              <input
                type="text"
                value={settings.codigo_actividad_economica}
                onChange={(e) => setSettings({ ...settings, codigo_actividad_economica: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="123456"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Código asignado por Hacienda</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sucursal
              </label>
              <input
                type="text"
                value={settings.sucursal}
                onChange={(e) => setSettings({ ...settings, sucursal: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="001"
                maxLength={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Terminal
              </label>
              <input
                type="text"
                value={settings.terminal}
                onChange={(e) => setSettings({ ...settings, terminal: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="00001"
                maxLength={5}
              />
            </div>
          </div>
        </div>

        {/* Configuración de Ambiente */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Configuración de Ambiente</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ambiente *
              </label>
              <select
                value={settings.ambiente}
                onChange={(e) => setSettings({ ...settings, ambiente: e.target.value as 'sandbox' | 'produccion' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              >
                <option value="sandbox">Sandbox (Pruebas)</option>
                <option value="produccion">Producción</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Proveedor del Sistema
              </label>
              <input
                type="text"
                value={settings.proveedor_sistema}
                onChange={(e) => setSettings({ ...settings, proveedor_sistema: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="OLO Sistema de Gestión"
              />
            </div>
          </div>
        </div>

        {/* Credenciales IdP */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Credenciales IdP (Identity Provider)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Usuario IdP *
              </label>
              <input
                type="text"
                value={settings.usuario_idp}
                onChange={(e) => setSettings({ ...settings, usuario_idp: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="usuario@empresa.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña IdP *
              </label>
              <input
                type="password"
                value={settings.password_idp_encrypted}
                onChange={(e) => setSettings({ ...settings, password_idp_encrypted: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
            <div className="flex items-start">
              <i className="ri-information-line text-yellow-600 mr-2 mt-0.5"></i>
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Importante:</p>
                <p>Las credenciales del IdP son proporcionadas por Hacienda al registrar su empresa para facturación electrónica.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Certificado Digital */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Certificado Digital</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ruta del Certificado .p12
              </label>
              <input
                type="text"
                value={settings.certificado_p12_path}
                onChange={(e) => setSettings({ ...settings, certificado_p12_path: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="/ruta/al/certificado.p12"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña del Certificado
              </label>
              <input
                type="password"
                value={settings.certificado_password_encrypted}
                onChange={(e) => setSettings({ ...settings, certificado_password_encrypted: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start">
              <i className="ri-shield-check-line text-blue-600 mr-2 mt-0.5"></i>
              <div className="text-sm text-blue-800">
                <p className="font-medium">Certificado Digital:</p>
                <p>El certificado .p12 es necesario para firmar digitalmente los comprobantes electrónicos. Debe ser emitido por una autoridad certificadora reconocida por Costa Rica.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end space-x-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </form>

      {/* Información Adicional */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Información Adicional</h3>
        
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">URLs de Ambiente Sandbox:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• API Recepción: https://api.comprobanteselectronicos.go.cr/recepcion-sandbox/v1</li>
              <li>• IdP: https://idp.comprobanteselectronicos.go.cr/auth/realms/rut-stag/protocol/openid-connect/token</li>
            </ul>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">URLs de Ambiente Producción:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• API Recepción: https://api.comprobanteselectronicos.go.cr/recepcion/v1</li>
              <li>• IdP: https://idp.comprobanteselectronicos.go.cr/auth/realms/rut/protocol/openid-connect/token</li>
            </ul>
          </div>

          <div className="p-4 bg-orange-50 rounded-lg">
            <h4 className="font-medium text-orange-900 mb-2">Pasos para Configuración:</h4>
            <ol className="text-sm text-orange-800 space-y-1 list-decimal list-inside">
              <li>Registrarse en el portal de Hacienda para facturación electrónica</li>
              <li>Obtener credenciales del IdP (usuario y contraseña)</li>
              <li>Adquirir certificado digital de una autoridad certificadora</li>
              <li>Configurar los datos en esta pantalla</li>
              <li>Probar la conexión en ambiente sandbox</li>
              <li>Solicitar paso a producción a Hacienda</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}