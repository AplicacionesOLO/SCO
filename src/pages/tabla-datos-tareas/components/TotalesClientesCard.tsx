import { useState } from 'react';
import { formatCurrency } from '../../../lib/currency';
import type { TotalesPorCliente } from '../../../types/tablaDatosTareas';

interface TotalesClientesCardProps {
  totalesPorCliente: TotalesPorCliente[];
  totalGeneral: number;
}

export default function TotalesClientesCard({ totalesPorCliente, totalGeneral }: TotalesClientesCardProps) {
  const [mostrarTodos, setMostrarTodos] = useState(false);

  const clientesMostrar = mostrarTodos ? totalesPorCliente : totalesPorCliente.slice(0, 5);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-sm border border-blue-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Totales por cliente</h2>
          <p className="text-sm text-gray-600 mt-1">
            Resumen de producción por cliente
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Total General</p>
          <p className="text-3xl font-bold text-blue-600">
            {formatCurrency(totalGeneral)}
          </p>
        </div>
      </div>

      {totalesPorCliente.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <i className="ri-inbox-line text-4xl text-gray-300 mb-2"></i>
          <p>No hay datos de clientes disponibles</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Total ₡
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {clientesMostrar.map((cliente, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {cliente.cliente}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                      {formatCurrency(cliente.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalesPorCliente.length > 5 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-600">
                Mostrando {clientesMostrar.length} de {totalesPorCliente.length} clientes
              </p>
              <button
                onClick={() => setMostrarTodos(!mostrarTodos)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded-lg hover:bg-blue-200 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className={`${mostrarTodos ? 'ri-eye-off-line' : 'ri-eye-line'}`}></i>
                {mostrarTodos ? 'Ver menos' : 'Ver todos'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
