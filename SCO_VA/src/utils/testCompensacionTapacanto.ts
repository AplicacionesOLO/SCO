/**
 * PRUEBAS UNITARIAS - COMPENSACIÓN DE TAPACANTO POR GROSOR
 * 
 * Este archivo contiene casos de prueba para validar la lógica de compensación
 * de dimensiones de corte según el grosor de los tapacantos aplicados.
 * 
 * REGLAS DE COMPENSACIÓN:
 * - TC Superior e Inferior afectan el ANCHO (van a lo largo)
 * - TC Izquierdo y Derecho afectan el LARGO (van a lo ancho)
 * - Si un lado lleva TC, la dimensión de corte se reduce por el grosor
 * - La medida final (después de pegar TC) debe ser la original ingresada
 */

import { PiezaCorte, Tapacanto } from '../types/optimizador';

// ============================================
// CASOS DE PRUEBA
// ============================================

interface CasoPrueba {
  nombre: string;
  descripcion: string;
  pieza: {
    largo: number;
    ancho: number;
    tapacantos: Tapacanto[];
  };
  esperado: {
    largo_corte: number;
    ancho_corte: number;
    ajuste_largo: number;
    ajuste_ancho: number;
  };
}

export const casosPrueba: CasoPrueba[] = [
  // ============================================
  // CASO A: Solo TC Superior (grosor 0.6mm)
  // ============================================
  {
    nombre: 'Caso A: Solo TC Superior',
    descripcion: 'TC Superior 0.6mm → Reducir ancho en 0.6mm',
    pieza: {
      largo: 800,
      ancho: 500,
      tapacantos: [
        {
          lado: 'superior',
          codigo: 'TC-001',
          grosor_mm: 0.6
        }
      ]
    },
    esperado: {
      largo_corte: 800,
      ancho_corte: 499.4, // 500 - 0.6
      ajuste_largo: 0,
      ajuste_ancho: 0.6
    }
  },

  // ============================================
  // CASO B: TC Superior + Inferior (grosores diferentes)
  // ============================================
  {
    nombre: 'Caso B: TC Superior + Inferior',
    descripcion: 'TC Superior 0.6mm + TC Inferior 0.8mm → Reducir ancho en 1.4mm',
    pieza: {
      largo: 800,
      ancho: 500,
      tapacantos: [
        {
          lado: 'superior',
          codigo: 'TC-001',
          grosor_mm: 0.6
        },
        {
          lado: 'inferior',
          codigo: 'TC-002',
          grosor_mm: 0.8
        }
      ]
    },
    esperado: {
      largo_corte: 800,
      ancho_corte: 498.6, // 500 - 0.6 - 0.8
      ajuste_largo: 0,
      ajuste_ancho: 1.4
    }
  },

  // ============================================
  // CASO C: TC Izquierdo + Derecho (mismo grosor)
  // ============================================
  {
    nombre: 'Caso C: TC Izquierdo + Derecho',
    descripcion: 'TC Izquierdo 0.6mm + TC Derecho 0.6mm → Reducir largo en 1.2mm',
    pieza: {
      largo: 800,
      ancho: 500,
      tapacantos: [
        {
          lado: 'izquierdo',
          codigo: 'TC-001',
          grosor_mm: 0.6
        },
        {
          lado: 'derecho',
          codigo: 'TC-001',
          grosor_mm: 0.6
        }
      ]
    },
    esperado: {
      largo_corte: 798.8, // 800 - 0.6 - 0.6
      ancho_corte: 500,
      ajuste_largo: 1.2,
      ajuste_ancho: 0
    }
  },

  // ============================================
  // CASO D: Todos los lados con TC (grosor 0.6mm)
  // ============================================
  {
    nombre: 'Caso D: Todos los lados con TC',
    descripcion: 'TC en los 4 lados (0.6mm) → Reducir largo 1.2mm y ancho 1.2mm',
    pieza: {
      largo: 800,
      ancho: 500,
      tapacantos: [
        {
          lado: 'superior',
          codigo: 'TC-001',
          grosor_mm: 0.6
        },
        {
          lado: 'inferior',
          codigo: 'TC-001',
          grosor_mm: 0.6
        },
        {
          lado: 'izquierdo',
          codigo: 'TC-001',
          grosor_mm: 0.6
        },
        {
          lado: 'derecho',
          codigo: 'TC-001',
          grosor_mm: 0.6
        }
      ]
    },
    esperado: {
      largo_corte: 798.8, // 800 - 1.2
      ancho_corte: 498.8, // 500 - 1.2
      ajuste_largo: 1.2,
      ajuste_ancho: 1.2
    }
  },

  // ============================================
  // CASO E: Sin tapacantos
  // ============================================
  {
    nombre: 'Caso E: Sin tapacantos',
    descripcion: 'Sin TC → Dimensiones de corte = dimensiones originales',
    pieza: {
      largo: 800,
      ancho: 500,
      tapacantos: []
    },
    esperado: {
      largo_corte: 800,
      ancho_corte: 500,
      ajuste_largo: 0,
      ajuste_ancho: 0
    }
  },

  // ============================================
  // CASO F: TC con grosor 0 (no configurado)
  // ============================================
  {
    nombre: 'Caso F: TC sin grosor configurado',
    descripcion: 'TC sin grosor → No aplica ajuste',
    pieza: {
      largo: 800,
      ancho: 500,
      tapacantos: [
        {
          lado: 'superior',
          codigo: 'TC-SIN-GROSOR',
          grosor_mm: 0
        }
      ]
    },
    esperado: {
      largo_corte: 800,
      ancho_corte: 500,
      ajuste_largo: 0,
      ajuste_ancho: 0
    }
  },

  // ============================================
  // CASO G: Pieza pequeña con TC grueso (ERROR)
  // ============================================
  {
    nombre: 'Caso G: ERROR - TC excede dimensión',
    descripcion: 'TC Superior 30mm + Inferior 30mm en pieza de 50mm ancho → ERROR',
    pieza: {
      largo: 800,
      ancho: 50,
      tapacantos: [
        {
          lado: 'superior',
          codigo: 'TC-GRUESO',
          grosor_mm: 30
        },
        {
          lado: 'inferior',
          codigo: 'TC-GRUESO',
          grosor_mm: 30
        }
      ]
    },
    esperado: {
      largo_corte: 800,
      ancho_corte: -10, // 50 - 60 = -10 (INVÁLIDO)
      ajuste_largo: 0,
      ajuste_ancho: 60
    }
  }
];

// ============================================
// FUNCIÓN DE CÁLCULO (PARA PRUEBAS)
// ============================================

export function calcularDimensionesCorteTest(pieza: {
  largo: number;
  ancho: number;
  tapacantos: Tapacanto[];
}): {
  largo_corte: number;
  ancho_corte: number;
  ajuste_largo: number;
  ajuste_ancho: number;
  error?: string;
} {
  let ajusteLargo = 0;
  let ajusteAncho = 0;

  if (pieza.tapacantos && pieza.tapacantos.length > 0) {
    pieza.tapacantos.forEach(tc => {
      const grosor = tc.grosor_mm || 0;
      if (grosor > 0) {
        switch (tc.lado) {
          case 'superior':
          case 'inferior':
            ajusteAncho += grosor;
            break;
          case 'izquierdo':
          case 'derecho':
            ajusteLargo += grosor;
            break;
        }
      }
    });
  }

  const largoCorte = pieza.largo - ajusteLargo;
  const anchoCorte = pieza.ancho - ajusteAncho;

  let error: string | undefined;
  if (largoCorte <= 0) {
    error = `Dimensión de corte LARGO inválida (${largoCorte} mm). El grosor de los tapacantos izquierdo/derecho (${ajusteLargo} mm) excede la dimensión original (${pieza.largo} mm).`;
  }
  if (anchoCorte <= 0) {
    error = `Dimensión de corte ANCHO inválida (${anchoCorte} mm). El grosor de los tapacantos superior/inferior (${ajusteAncho} mm) excede la dimensión original (${pieza.ancho} mm).`;
  }

  return {
    largo_corte: largoCorte,
    ancho_corte: anchoCorte,
    ajuste_largo: ajusteLargo,
    ajuste_ancho: ajusteAncho,
    error
  };
}

// ============================================
// EJECUTAR PRUEBAS
// ============================================

export function ejecutarPruebas(): void {
  let pruebas_exitosas = 0;
  let pruebas_fallidas = 0;

  casosPrueba.forEach((caso, index) => {
    const resultado = calcularDimensionesCorteTest(caso.pieza);

    const esExitoso = 
      resultado.largo_corte === caso.esperado.largo_corte &&
      resultado.ancho_corte === caso.esperado.ancho_corte &&
      resultado.ajuste_largo === caso.esperado.ajuste_largo &&
      resultado.ajuste_ancho === caso.esperado.ajuste_ancho;

    if (esExitoso) {
      pruebas_exitosas++;
    } else {
      pruebas_fallidas++;
    }
  });
}

// ============================================
// EJEMPLOS DE USO
// ============================================

export const ejemplosUso = {
  ejemplo1: {
    titulo: 'Puerta de mueble con TC en 4 lados',
    descripcion: 'Puerta de 600×400mm con tapacanto de 0.6mm en los 4 lados',
    entrada: {
      largo: 600,
      ancho: 400,
      tapacantos: [
        { lado: 'superior', grosor_mm: 0.6 },
        { lado: 'inferior', grosor_mm: 0.6 },
        { lado: 'izquierdo', grosor_mm: 0.6 },
        { lado: 'derecho', grosor_mm: 0.6 }
      ]
    },
    salida: {
      largo_corte: 598.8, // 600 - 1.2
      ancho_corte: 398.8, // 400 - 1.2
      explicacion: 'Se corta la pieza a 598.8×398.8mm. Al pegar los tapacantos de 0.6mm en cada lado, la medida final será exactamente 600×400mm.'
    }
  },
  ejemplo2: {
    titulo: 'Estante con TC solo en frente',
    descripcion: 'Estante de 800×300mm con tapacanto solo en el frente (superior)',
    entrada: {
      largo: 800,
      ancho: 300,
      tapacantos: [
        { lado: 'superior', grosor_mm: 0.6 }
      ]
    },
    salida: {
      largo_corte: 800, // Sin cambio
      ancho_corte: 299.4, // 300 - 0.6
      explicacion: 'Se corta la pieza a 800×299.4mm. Al pegar el tapacanto de 0.6mm en el frente, la medida final será 800×300mm.'
    }
  }
};

// Para ejecutar las pruebas en consola:
// import { ejecutarPruebas } from './utils/testCompensacionTapacanto';
// ejecutarPruebas();
