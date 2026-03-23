import { RouteObject } from 'react-router-dom';
import { lazy } from 'react';
import ProtectedRoute from '../components/auth/ProtectedRoute';

// Lazy loading de páginas
const HomePage = lazy(() => import('../pages/home/page'));
const DashboardPage = lazy(() => import('../pages/dashboard/page'));
const ClientesPage = lazy(() => import('../pages/clientes/page'));
const ProductosPage = lazy(() => import('../pages/productos/page'));
const InventarioPage = lazy(() => import('../pages/inventario/page'));
const CotizacionesPage = lazy(() => import('../pages/cotizaciones/page'));
const CotizacionDetalladaPage = lazy(() => import('../pages/cotizaciones/CotizacionDetalladaPage'));
const CotizacionPrintPage = lazy(() => import('../pages/cotizaciones/CotizacionPrintPage'));
const PedidosPage = lazy(() => import('../pages/pedidos/page'));
const PedidoPrintPage = lazy(() => import('../pages/pedidos/PedidoPrintPage'));
const FacturacionPage = lazy(() => import('../pages/facturacion/page'));
const EmisionFacturaPage = lazy(() => import('../pages/facturacion/EmisionFacturaPage'));
const FacturacionPrintPage = lazy(() => import('../pages/facturacion/FacturacionPrintPage'));
const MantenimientoPage = lazy(() => import('../pages/mantenimiento/page'));
const SeguimientoPage = lazy(() => import('../pages/seguimiento/page'));
const TareasPage = lazy(() => import('../pages/tareas/page'));
const TablaDatosTareasPage = lazy(() => import('../pages/tabla-datos-tareas/page'));
const CorrespondenciaPage = lazy(() => import('../pages/correspondencia/page'));
const OptimizadorPage = lazy(() => import('../pages/optimizador/page'));
const SeguridadPage = lazy(() => import('../pages/seguridad/page'));
const PerfilPage = lazy(() => import('../pages/perfil/page'));
const CostBotAdminPage = lazy(() => import('../components/costbot/CostBotAdmin'));
const ReporteDiaPage = lazy(() => import('../pages/reporte-dia/page'));

// Páginas de autenticación
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage'));
const CallbackPage = lazy(() => import('../pages/auth/CallbackPage'));
const PendingStorePage = lazy(() => import('../pages/auth/PendingStorePage'));

// Página 404
const NotFoundPage = lazy(() => import('../pages/NotFound'));

import CotizacionOptimizadorPage from '../pages/cotizaciones/CotizacionOptimizadorPage';

const routes: RouteObject[] = [
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/auth/login',
    element: <LoginPage />,
  },
  {
    path: '/auth/register',
    element: <RegisterPage />,
  },
  {
    path: '/auth/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/auth/callback',
    element: <CallbackPage />,
  },
  {
    path: '/auth/pending-store',
    element: <PendingStorePage />,
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute requireAuth permission="dashboard:view">
        <DashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/clientes',
    element: (
      <ProtectedRoute requireAuth permission="clientes:view">
        <ClientesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/productos',
    element: (
      <ProtectedRoute requireAuth permission="productos:view">
        <ProductosPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/inventario',
    element: (
      <ProtectedRoute requireAuth permission="inventario:view">
        <InventarioPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/cotizaciones',
    element: (
      <ProtectedRoute requireAuth permission="cotizaciones:view">
        <CotizacionesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/cotizaciones/:id',
    element: <CotizacionDetalladaPage />
  },
  {
    path: '/cotizaciones/:id/detallada',
    element: <CotizacionDetalladaPage />
  },
  {
    path: '/cotizaciones/optimizador/:id',
    element: <CotizacionOptimizadorPage />
  },
  {
    path: '/cotizaciones/print/:id',
    element: <CotizacionPrintPage />
  },
  {
    path: '/pedidos',
    element: (
      <ProtectedRoute requireAuth permission="pedidos:view">
        <PedidosPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/pedidos/:id/print',
    element: (
      <ProtectedRoute requireAuth permission="pedidos:view">
        <PedidoPrintPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/facturacion',
    element: (
      <ProtectedRoute requireAuth permission="facturacion:view">
        <FacturacionPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/facturacion/emision',
    element: (
      <ProtectedRoute requireAuth permission="facturacion:create">
        <EmisionFacturaPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/facturacion/:id/print',
    element: (
      <ProtectedRoute requireAuth permission="facturacion:view">
        <FacturacionPrintPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/mantenimiento',
    element: (
      <ProtectedRoute requireAuth permission="mantenimiento:view">
        <MantenimientoPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/seguimiento',
    element: (
      <ProtectedRoute requireAuth permission="seguimiento:view">
        <SeguimientoPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/tareas',
    element: (
      <ProtectedRoute requireAuth permission="tareas:view">
        <TareasPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/reporte-dia',
    element: (
      <ProtectedRoute requireAuth>
        <ReporteDiaPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/tabla-datos-tareas',
    element: (
      <ProtectedRoute requireAuth permission="tareas:view">
        <TablaDatosTareasPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/correspondencia',
    element: (
      <ProtectedRoute requireAuth>
        <CorrespondenciaPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/optimizador',
    element: (
      <ProtectedRoute requireAuth permission="optimizador:view">
        <OptimizadorPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/seguridad',
    element: (
      <ProtectedRoute requireAuth permission="seguridad:view">
        <SeguridadPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/costbot-admin',
    element: (
      <ProtectedRoute requireAuth role="Admin">
        <CostBotAdminPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/perfil',
    element: (
      <ProtectedRoute requireAuth>
        <PerfilPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
];

export default routes;
