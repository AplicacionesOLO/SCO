
import { useParams } from 'react-router-dom';
import CotizacionDetallada from './components/CotizacionDetallada';

export default function CotizacionDetalladaPage() {
  const { id } = useParams<{ id: string }>();

  return <CotizacionDetallada />;
}
