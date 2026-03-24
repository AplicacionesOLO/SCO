// Tipos para el módulo de Optimizador de Cortes 2D

export type ModoOptimizador = 'bom' | 'manual';
export type TipoVeta = 'S' | 'X' | 'N'; // S=Sentido largo, X=Sentido ancho, N=Sin veta

export interface ArticuloInventario {
  id: number;
  codigo_articulo: string;
  descripcion_articulo: string;
  categoria_id: number;
  categoria_nombre?: string;
  unidad_base_id: number;
  unidad_simbolo?: string;
  precio_unitario: number;
  // 🆕 Campos de dimensiones de lámina (desde inventario)
  espesor_mm?: number;
  largo_lamina_mm?: number;
  ancho_lamina_mm?: number;
  // 🆕 Campos de dimensiones de tapacanto (desde inventario)
  ancho_tapacanto_mm?: number;
  grosor_tapacanto_mm?: number;
  tipo_articulo: 'lamina' | 'tapacanto' | 'hh' | 'consumible' | 'perforacion';
}

export interface Tapacanto {
  lado: 'superior' | 'inferior' | 'izquierdo' | 'derecho';
  articulo_id?: number;
  codigo?: string;
  descripcion?: string;
  precio_unitario?: number;
  metros_lineales?: number;
  // 🆕 Grosor del tapacanto en mm (para compensación de corte)
  grosor_mm?: number;
}

export interface PiezaCorte {
  id: string;
  descripcion: string;
  material_id?: number;
  material_codigo?: string;
  material_descripcion?: string;
  material_precio?: number;
  // 🆕 Dimensiones de la lámina del material (heredadas del inventario)
  material_espesor_mm?: number;
  material_largo_lamina_mm?: number;
  material_ancho_lamina_mm?: number;
  // 🆕 Dimensiones FINALES (las que ingresa el usuario - medida final deseada)
  largo: number;
  ancho: number;
  // 🆕 Dimensiones de CORTE (ajustadas por grosor de tapacanto)
  largo_corte_mm?: number;
  ancho_corte_mm?: number;
  cantidad: number;
  veta: TipoVeta;
  tapacantos: Tapacanto[];
  cnc1?: string;
  cnc2?: string;
  cnc1_cantidad?: number;
  cnc2_cantidad?: number;
  // Calculados
  area_unitaria?: number;
  area_total?: number;
  metros_tapacanto_total?: number;
  hh_segundos?: number;
  costo_material?: number;
  costo_tapacantos?: number;
  costo_hh?: number;
  costo_total?: number;
  costo_pieza?: number;
  // Para renderizado
  color?: string;
  posicion_x?: number;
  posicion_y?: number;
  rotada?: boolean;
  lamina_asignada?: number;
}

export interface LaminaCorte {
  id: number;
  numero_lamina: number;
  material_id: number;
  material_codigo: string;
  material_descripcion: string;
  largo: number;
  ancho: number;
  espesor: number;
  area_total: number;
  area_utilizada: number;
  area_sobrante: number;
  porcentaje_aprovechamiento: number;
  piezas: PiezaCorte[];
  costo_lamina: number;
  costo_piezas: number;
}

export interface ConfiguracionCorte {
  espesor_sierra: number; // kerf en mm
  margen_seguridad: number; // margen en mm
  permitir_rotacion: boolean;
  optimizar_desperdicio: boolean;
}

// 🆕 Resultado por material (código de lámina)
export interface ResultadoPorMaterial {
  material_id: number;
  material_codigo: string;
  material_descripcion: string;
  espesor_mm: number;
  largo_lamina_mm: number;
  ancho_lamina_mm: number;
  precio_unitario_lamina: number;
  laminas: LaminaCorte[];
  total_laminas: number;
  area_total_utilizada: number;
  area_total_sobrante: number;
  porcentaje_aprovechamiento_promedio: number;
  costo_total_laminas: number;
  piezas_asignadas: number;
}

export interface ResultadoOptimizacion {
  // 🆕 Resultados agrupados por material
  resultados_por_material: ResultadoPorMaterial[];
  // Totales globales
  laminas: LaminaCorte[];
  total_laminas: number;
  area_total_utilizada: number;
  area_total_sobrante: number;
  porcentaje_aprovechamiento_global: number;
  costo_total_materiales: number;
  costo_total_tapacantos: number;
  costo_total_hh: number;
  costo_total: number;
  piezas_sin_asignar: PiezaCorte[];
}

export interface ProyectoOptimizador {
  id?: string;
  nombre: string;
  descripcion?: string;
  modo: ModoOptimizador;
  producto_bom_id?: number;
  producto_bom_nombre?: string;
  piezas: PiezaCorte[];
  configuracion: ConfiguracionCorte;
  resultado?: ResultadoOptimizacion;
  created_at?: string;
  updated_at?: string;
  tienda_id?: string;
  usuario_id?: string;
}

export interface ExportDataExcel {
  descripcion: string;
  material_codigo: string;
  largo: number;
  ancho: number;
  cantidad: number;
  veta: string;
  largo_inf: string;
  largo_sup: string;
  ancho_inf: string;
  ancho_sup: string;
  cnc1: string;
  cnc2: string;
  m2_usados: number;
  tapacantos_metros: number;
  hh_segundos: number;
  total_pieza: number;
}
