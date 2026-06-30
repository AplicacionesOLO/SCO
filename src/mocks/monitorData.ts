// =====================================================
// MOCK DATA PARA EL MÓDULO DE MONITOR (CLUSTERS)
// =====================================================

import type { ClusterConUsuarios, ClusterUsuario, TareaComentario, MonitorStats } from '../types/monitor';

export const MOCK_CLUSTERS: ClusterConUsuarios[] = [
  {
    id: 'cluster-001',
    nombre: 'Cofersa',
    cliente: 'COFERSA',
    descripcion: 'Cluster para usuarios que necesitan ver tareas del cliente Cofersa',
    activo: true,
    tienda_id: '1',
    created_at: '2025-11-15T08:00:00Z',
    updated_at: '2026-01-10T14:30:00Z',
    created_by: 'admin-001',
    cantidad_usuarios: 3,
    cantidad_tareas: 12,
    usuarios: [
      {
        id: 'cu-001',
        cluster_id: 'cluster-001',
        usuario_id: 'user-100',
        created_at: '2025-11-15T08:00:00Z',
        usuario: { id: 'user-100', email: 'visualizador1@cofersa.com', nombre_completo: 'Carlos Mendoza' }
      },
      {
        id: 'cu-002',
        cluster_id: 'cluster-001',
        usuario_id: 'user-101',
        created_at: '2025-12-01T10:00:00Z',
        usuario: { id: 'user-101', email: 'visualizador2@cofersa.com', nombre_completo: 'María Rodríguez' }
      },
      {
        id: 'cu-003',
        cluster_id: 'cluster-001',
        usuario_id: 'user-102',
        created_at: '2026-01-05T09:00:00Z',
        usuario: { id: 'user-102', email: 'supervisor@cofersa.com', nombre_completo: 'Juan Pérez' }
      }
    ]
  },
  {
    id: 'cluster-002',
    nombre: 'EPA',
    cliente: 'EPA',
    descripcion: 'Cluster para usuarios que necesitan ver tareas del cliente EPA',
    activo: true,
    tienda_id: '1',
    created_at: '2025-12-20T11:00:00Z',
    updated_at: '2026-02-05T16:00:00Z',
    created_by: 'admin-001',
    cantidad_usuarios: 2,
    cantidad_tareas: 8,
    usuarios: [
      {
        id: 'cu-004',
        cluster_id: 'cluster-002',
        usuario_id: 'user-200',
        created_at: '2025-12-20T11:00:00Z',
        usuario: { id: 'user-200', email: 'visualizador@epa.com', nombre_completo: 'Ana Vargas' }
      },
      {
        id: 'cu-005',
        cluster_id: 'cluster-002',
        usuario_id: 'user-201',
        created_at: '2026-01-15T08:30:00Z',
        usuario: { id: 'user-201', email: 'coordinador@epa.com', nombre_completo: 'Luis Ramírez' }
      }
    ]
  }
];

export const MOCK_COMENTARIOS: TareaComentario[] = [
  {
    id: 'com-001',
    tarea_id: 'mock-COF-001',
    usuario_id: 'user-100',
    usuario: { id: 'user-100', email: 'visualizador1@cofersa.com', nombre_completo: 'Carlos Mendoza' },
    comentario: 'Revisé las etiquetas y todo está correcto con el diseño enviado. ¿Cuándo estiman terminar la producción?',
    created_at: '2026-06-01T09:15:00Z'
  },
  {
    id: 'com-002',
    tarea_id: 'mock-COF-001',
    usuario_id: 'user-102',
    usuario: { id: 'user-102', email: 'supervisor@cofersa.com', nombre_completo: 'Juan Pérez' },
    comentario: 'La producción va según lo planeado. Estimamos terminar el lote completo para el viernes 6 de junio.',
    created_at: '2026-06-01T10:30:00Z'
  },
  {
    id: 'com-003',
    tarea_id: 'mock-COF-002',
    usuario_id: 'user-101',
    usuario: { id: 'user-101', email: 'visualizador2@cofersa.com', nombre_completo: 'María Rodríguez' },
    comentario: 'Necesitamos confirmar la cantidad de unidades para el re-empaque. El cliente pidió ajustar de 500 a 750.',
    created_at: '2026-06-02T08:45:00Z'
  },
  {
    id: 'com-004',
    tarea_id: 'mock-EPA-001',
    usuario_id: 'user-200',
    usuario: { id: 'user-200', email: 'visualizador@epa.com', nombre_completo: 'Ana Vargas' },
    comentario: 'Los códigos de barra están listos, falta la aprobación del registro sanitario.',
    created_at: '2026-06-02T14:00:00Z'
  },
  {
    id: 'com-005',
    tarea_id: 'mock-COF-003',
    usuario_id: 'user-100',
    usuario: { id: 'user-100', email: 'visualizador1@cofersa.com', nombre_completo: 'Carlos Mendoza' },
    comentario: '¿Ya tienen el visto bueno de calidad para este lote? Necesitamos confirmar antes del viernes.',
    created_at: '2026-06-04T11:20:00Z'
  },
  {
    id: 'com-006',
    tarea_id: 'mock-EPA-002',
    usuario_id: 'user-201',
    usuario: { id: 'user-201', email: 'coordinador@epa.com', nombre_completo: 'Luis Ramírez' },
    comentario: 'Los registros sanitarios están en revisión con el Ministerio. Apenas tenga respuesta les aviso.',
    created_at: '2026-06-03T16:00:00Z'
  },
  {
    id: 'com-007',
    tarea_id: 'mock-COF-005',
    usuario_id: 'user-102',
    usuario: { id: 'user-102', email: 'supervisor@cofersa.com', nombre_completo: 'Juan Pérez' },
    comentario: 'Las licencias de importación ya fueron enviadas al agente aduanal. Quedamos a la espera.',
    created_at: '2026-06-05T07:30:00Z'
  }
];

export const MOCK_MONITOR_STATS: Record<string, MonitorStats> = {
  'COFERSA': {
    total: 12,
    en_cola: 3,
    en_proceso: 4,
    produciendo: 3,
    esperando_suministros: 1,
    finalizado: 1
  },
  'EPA': {
    total: 8,
    en_cola: 2,
    en_proceso: 2,
    produciendo: 2,
    esperando_suministros: 1,
    finalizado: 1
  }
};