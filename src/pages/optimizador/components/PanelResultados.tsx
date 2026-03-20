import { ResultadoOptimizacion } from '../../../types/optimizador';
import { formatCurrency } from '../../../lib/currency';

interface Props {
  resultado: ResultadoOptimizacion;
  onExportar: () => void;
}

export default function PanelResultados({ resultado, onExportar }: Props) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <i className="ri-bar-chart-box-line text-blue-600"></i>
          Resultados de Optimización
        </h3>
        <button
          onClick={onExportar}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <i className="ri-file-excel-2-line"></i>
          Exportar Excel
        </button>
      </div>

      {/* 🆕 Resultados por Material */}
      {resultado.resultados_por_material && resultado.resultados_por_material.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <i className="ri-stack-line text-blue-600"></i>
            Resultados por Material
          </h4>
          <div className="space-y-4">
            {resultado.resultados_por_material.map((materialResult, index) => (
              <div key={index} className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h5 className="font-bold text-gray-900 text-base mb-1">
                      {materialResult.material_codigo}
                    </h5>
                    <p className="text-sm text-gray-700 mb-2">
                      {materialResult.material_descripcion}
                    </p>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <i className="ri-ruler-line text-blue-600"></i>
                        {materialResult.largo_lamina_mm} × {materialResult.ancho_lamina_mm} mm
                      </span>
                      <span className="flex items-center gap-1">
                        <i className="ri-stack-line text-blue-600"></i>
                        Espesor: {materialResult.espesor_mm} mm
                      </span>
                      <span className="flex items-center gap-1">
                        <i className="ri-price-tag-3-line text-green-600"></i>
                        {formatCurrency(materialResult.precio_unitario_lamina)} / lámina
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div className="bg-white rounded-lg p-3 border border-blue-200">
                    <div className="text-xs text-gray-600 mb-1">Láminas Usadas</div>
                    <div className="text-xl font-bold text-blue-900">
                      {materialResult.total_laminas}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-green-200">
                    <div className="text-xs text-gray-600 mb-1">Aprovechamiento</div>
                    <div className="text-xl font-bold text-green-900">
                      {materialResult.porcentaje_aprovechamiento_promedio.toFixed(1)}%
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-purple-200">
                    <div className="text-xs text-gray-600 mb-1">Piezas</div>
                    <div className="text-xl font-bold text-purple-900">
                      {materialResult.piezas_asignadas}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-orange-200">
                    <div className="text-xs text-gray-600 mb-1">Costo Total</div>
                    <div className="text-lg font-bold text-orange-900">
                      {formatCurrency(materialResult.costo_total_laminas)}
                    </div>
                  </div>
                </div>

                {/* Detalle de láminas de este material */}
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="text-xs font-semibold text-gray-700 mb-2">
                    Detalle de Láminas:
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {materialResult.laminas.map((lamina) => (
                      <div
                        key={lamina.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                            <span className="text-blue-900 font-bold text-xs">{lamina.id}</span>
                          </div>
                          <span className="text-gray-700">{lamina.piezas.length} pzs</span>
                        </div>
                        <span className="font-semibold text-green-600">
                          {lamina.porcentaje_aprovechamiento.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Métricas Globales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <i className="ri-stack-line text-blue-600"></i>
            <span className="text-sm text-blue-900 font-medium">Total Láminas</span>
          </div>
          <div className="text-2xl font-bold text-blue-900">
            {resultado.total_laminas}
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <i className="ri-percent-line text-green-600"></i>
            <span className="text-sm text-green-900 font-medium">Aprovechamiento</span>
          </div>
          <div className="text-2xl font-bold text-green-900">
            {resultado.porcentaje_aprovechamiento_global.toFixed(1)}%
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <i className="ri-checkbox-circle-line text-purple-600"></i>
            <span className="text-sm text-purple-900 font-medium">Área Utilizada</span>
          </div>
          <div className="text-2xl font-bold text-purple-900">
            {resultado.area_total_utilizada.toFixed(2)} m²
          </div>
        </div>

        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
          <div className="flex items-center gap-2 mb-2">
            <i className="ri-delete-bin-line text-orange-600"></i>
            <span className="text-sm text-orange-900 font-medium">Sobrante</span>
          </div>
          <div className="text-2xl font-bold text-orange-900">
            {resultado.area_total_sobrante.toFixed(2)} m²
          </div>
        </div>
      </div>

      {/* Costos */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <i className="ri-money-dollar-circle-line text-green-600"></i>
          Desglose de Costos
        </h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2 border-b border-gray-200">
            <span className="text-sm text-gray-700">Materiales (Láminas)</span>
            <span className="text-sm font-semibold text-gray-900">
              {formatCurrency(resultado.costo_total_materiales)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-200">
            <span className="text-sm text-gray-700">Tapacantos</span>
            <span className="text-sm font-semibold text-gray-900">
              {formatCurrency(resultado.costo_total_tapacantos)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-200">
            <span className="text-sm text-gray-700">Horas Máquina (HH)</span>
            <span className="text-sm font-semibold text-gray-900">
              {formatCurrency(resultado.costo_total_hh)}
            </span>
          </div>
          <div className="flex items-center justify-between py-3 bg-blue-50 -mx-4 px-4 rounded-lg mt-2">
            <span className="text-base font-bold text-blue-900">TOTAL</span>
            <span className="text-xl font-bold text-blue-900">
              {formatCurrency(resultado.costo_total)}
            </span>
          </div>
        </div>
      </div>

      {/* Detalle por Lámina (todas) */}
      <div className="mt-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <i className="ri-list-check text-blue-600"></i>
          Todas las Láminas ({resultado.laminas.length})
        </h4>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {resultado.laminas.map((lamina) => (
            <div
              key={lamina.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-900 font-bold">{lamina.id}</span>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    Lámina {lamina.id} - {lamina.material_codigo}
                  </div>
                  <div className="text-xs text-gray-600">
                    {lamina.piezas.length} piezas • {lamina.largo} × {lamina.ancho} mm • {lamina.espesor} mm
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-green-600">
                  {lamina.porcentaje_aprovechamiento.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600">
                  {lamina.area_utilizada.toFixed(2)} m² / {lamina.area_total.toFixed(2)} m²
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Piezas sin asignar (si hay) */}
      {resultado.piezas_sin_asignar.length > 0 && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <i className="ri-error-warning-line text-red-600 text-xl mt-0.5"></i>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-900 mb-2">
                Piezas sin asignar ({resultado.piezas_sin_asignar.length})
              </h4>
              <p className="text-sm text-red-800 mb-3">
                Las siguientes piezas no pudieron ser asignadas a ninguna lámina. 
                Considera ajustar las dimensiones o usar láminas más grandes.
              </p>
              <div className="space-y-1">
                {resultado.piezas_sin_asignar.map((pieza) => (
                  <div key={pieza.id} className="text-sm text-red-900">
                    • {pieza.descripcion} ({pieza.largo} × {pieza.ancho} mm) - Material: {pieza.material_codigo}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recomendaciones */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <i className="ri-lightbulb-line"></i>
          Recomendaciones
        </h4>
        <ul className="text-sm text-blue-800 space-y-1">
          {resultado.porcentaje_aprovechamiento_global < 70 && (
            <li>• El aprovechamiento es bajo. Considera agrupar más piezas o ajustar dimensiones.</li>
          )}
          {resultado.porcentaje_aprovechamiento_global >= 85 && (
            <li>• ¡Excelente aprovechamiento! La optimización es muy eficiente.</li>
          )}
          {resultado.area_total_sobrante > 1 && (
            <li>• Hay {resultado.area_total_sobrante.toFixed(2)} m² de sobrante que puede reutilizarse.</li>
          )}
          {resultado.total_laminas > 5 && (
            <li>• Considera negociar descuento por volumen con tu proveedor ({resultado.total_laminas} láminas).</li>
          )}
          {resultado.resultados_por_material && resultado.resultados_por_material.length > 1 && (
            <li>• Se están usando {resultado.resultados_por_material.length} tipos diferentes de láminas en este proyecto.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
