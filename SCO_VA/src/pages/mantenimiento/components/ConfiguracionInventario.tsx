import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { showAlert } from '../../../utils/dialog';

interface Setting {
  id: number;
  key: string;
  value: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'json';
}

export default function ConfiguracionInventario() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .order('key');

      if (error) throw error;

      setSettings(data || []);
      
      // Inicializar formData con los valores actuales
      const initialData: Record<string, any> = {};
      data?.forEach(setting => {
        if (setting.type === 'boolean') {
          initialData[setting.key] = setting.value === 'true';
        } else if (setting.type === 'number') {
          initialData[setting.key] = parseFloat(setting.value) || 0;
        } else {
          initialData[setting.key] = setting.value;
        }
      });
      setFormData(initialData);
    } catch (error) {
      console.error('Error cargando configuración:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Preparar updates para cada setting
      const updates = settings.map(setting => {
        let value = formData[setting.key];
        
        // Convertir a string para almacenar
        if (setting.type === 'boolean') {
          value = value ? 'true' : 'false';
        } else if (setting.type === 'number') {
          value = value.toString();
        }

        return {
          id: setting.id,
          value: value,
          updated_at: new Date().toISOString()
        };
      });

      // Actualizar cada setting
      for (const update of updates) {
        const { error } = await supabase
          .from('settings')
          .update({ value: update.value, updated_at: update.updated_at })
          .eq('id', update.id);

        if (error) throw error;
      }

      showAlert('Configuración guardada exitosamente');
      loadSettings(); // Recargar para confirmar cambios
    } catch (error) {
      console.error('Error guardando configuración:', error);
      showAlert('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const renderInput = (setting: Setting) => {
    const value = formData[setting.key];

    switch (setting.type) {
      case 'boolean':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              id={setting.key}
              checked={value || false}
              onChange={(e) => handleInputChange(setting.key, e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor={setting.key} className="ml-2 text-sm text-gray-700">
              {value ? 'Habilitado' : 'Deshabilitado'}
            </label>
          </div>
        );

      case 'number':
        return (
          <input
            type="number"
            step="0.01"
            value={value || 0}
            onChange={(e) => handleInputChange(setting.key, parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        );

      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleInputChange(setting.key, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        );
    }
  };

  const getSettingIcon = (key: string) => {
    switch (key) {
      case 'demanda_promedio_dia':
        return 'ri-line-chart-line';
      case 'z_score_safety':
        return 'ri-shield-check-line';
      case 'permitir_stock_negativo':
        return 'ri-error-warning-line';
      case 'auto_generar_alertas':
        return 'ri-alarm-warning-line';
      case 'dias_vencimiento_alertas':
        return 'ri-calendar-line';
      default:
        return 'ri-settings-line';
    }
  };

  const getSettingCategory = (key: string) => {
    if (key.includes('demanda') || key.includes('z_score')) {
      return 'Cálculos de Stock';
    } else if (key.includes('alerta')) {
      return 'Gestión de Alertas';
    } else if (key.includes('stock') || key.includes('negativo')) {
      return 'Políticas de Inventario';
    }
    return 'General';
  };

  // Agrupar settings por categoría
  const groupedSettings = settings.reduce((acc, setting) => {
    const category = getSettingCategory(setting.key);
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(setting);
    return acc;
  }, {} as Record<string, Setting[]>);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-2">
          Configuración del Sistema de Inventario
        </h2>
        <p className="text-sm text-gray-600">
          Ajusta los parámetros globales para el cálculo de stock inteligente y gestión de alertas.
        </p>
      </div>

      <div className="space-y-8">
        {Object.entries(groupedSettings).map(([category, categorySettings]) => (
          <div key={category} className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center">
              <i className="ri-folder-settings-line mr-2 text-blue-600"></i>
              {category}
            </h3>
            
            <div className="space-y-6">
              {categorySettings.map((setting) => (
                <div key={setting.key} className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <i className={`${getSettingIcon(setting.key)} text-gray-500 mr-2`}></i>
                      <label className="text-sm font-medium text-gray-900">
                        {setting.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </label>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {setting.description}
                    </p>
                  </div>
                  
                  <div className="sm:w-64">
                    {renderInput(setting)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Información adicional */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <i className="ri-information-line text-blue-600 mr-2 mt-0.5"></i>
          <div>
            <h4 className="text-sm font-medium text-blue-900 mb-1">
              Información sobre los parámetros
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Demanda promedio día:</strong> Valor por defecto para calcular el punto de reorden (ROP)</li>
              <li>• <strong>Z-score safety:</strong> Factor estadístico para cálculo de stock de seguridad (1.65 = 90% confianza)</li>
              <li>• <strong>Permitir stock negativo:</strong> Si está deshabilitado, el sistema bloqueará operaciones que resulten en stock negativo</li>
              <li>• <strong>Auto generar alertas:</strong> Crear alertas automáticamente cuando se alcancen los umbrales</li>
              <li>• <strong>Días vencimiento alertas:</strong> Tiempo después del cual las alertas se consideran obsoletas</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="mt-8 flex justify-end space-x-3">
        <button
          onClick={loadSettings}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <i className="ri-refresh-line mr-2"></i>
          Recargar
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? (
            <>
              <i className="ri-loader-4-line mr-2 animate-spin"></i>
              Guardando...
            </>
          ) : (
            <>
              <i className="ri-save-line mr-2"></i>
              Guardar Configuración
            </>
          )}
        </button>
      </div>
    </div>
  );
}