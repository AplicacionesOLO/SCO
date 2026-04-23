import { PermissionButton } from '../../../components/base/PermissionButton';
import { getCurrencySymbol } from '../../../lib/currency';

interface Producto {
  id_producto: number;
  codigo_producto: string;
  descripcion: string;
  categoria_id: number;
  codigo_sistema?: string;
  activo?: boolean;
  categoria?: {
    nombre: string;
  };
  created_at: string;
}

interface Props {
  productos: Producto[];
  loading?: boolean;
  onEdit: (producto: Producto) => void;
  onEliminar: (id: number) => void;
  onInactivar: (id: number) => void;
}

export default function ProductosTable({ productos, loading, onEdit, onEliminar, onInactivar }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Estado
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Código
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Descripción
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Categoría
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Código Sistema
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Moneda
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Costo Total BOM
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Fecha Creación
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {productos.map((producto) => (
            <tr 
              key={producto.id_producto} 
              className={`border-b hover:bg-gray-50 ${!producto.activo ? 'bg-red-50' : ''}`}
            >
              {/* Estado */}
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    producto.activo 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {producto.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </td>
              
              {/* Código */}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {producto.codigo_producto}
              </td>
              
              {/* Descripción */}
              <td className="px-6 py-4 text-sm text-gray-900">
                {(producto as any).descripcion_producto || producto.descripcion}
              </td>
              
              {/* Categoría */}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {(producto as any).categorias?.nombre || producto.categoria?.nombre || 'Sin categoría'}
              </td>
              
              {/* Código Sistema */}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {producto.codigo_sistema || '-'}
              </td>
              
              {/* Moneda */}
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  ((producto as any).moneda || 'CRC') === 'USD'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {(producto as any).moneda || 'CRC'}
                </span>
              </td>

              {/* Costo Total BOM */}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                {getCurrencySymbol((producto as any).moneda || 'CRC')}{((producto as any).costo_total_bom || 0).toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              
              {/* Fecha Creación */}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {producto.created_at ? new Date(producto.created_at).toLocaleDateString('es-ES') : 'Sin fecha'}
              </td>
              
              {/* Acciones */}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div className="flex space-x-2 justify-end">
                  <PermissionButton
                    permission="productos:edit"
                    variant="icon"
                    onClick={() => onEdit(producto)}
                    title="Editar producto"
                    className="text-blue-600 hover:bg-blue-50"
                  >
                    <i className="ri-edit-line w-4 h-4 flex items-center justify-center"></i>
                  </PermissionButton>
                  
                  <PermissionButton
                    permission="productos:edit"
                    variant="icon"
                    onClick={() => onInactivar(producto.id_producto)}
                    title={producto.activo ? 'Inactivar producto' : 'Activar producto'}
                    className={producto.activo 
                      ? 'text-orange-600 hover:bg-orange-50' 
                      : 'text-green-600 hover:bg-green-50'
                    }
                  >
                    <i className={`${producto.activo ? 'ri-pause-line' : 'ri-play-line'} w-4 h-4 flex items-center justify-center`}></i>
                  </PermissionButton>
                  
                  <PermissionButton
                    permission="productos:delete"
                    variant="icon"
                    onClick={() => onEliminar(producto.id_producto)}
                    title="Eliminar permanentemente"
                    className="text-red-600 hover:bg-red-50"
                  >
                    <i className="ri-delete-bin-line w-4 h-4 flex items-center justify-center"></i>
                  </PermissionButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
