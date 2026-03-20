import { useState, useRef, useEffect } from 'react';
import { ResultadoOptimizacion, ConfiguracionCorte, LaminaCorte } from '../../../types/optimizador';

interface Props {
  resultado: ResultadoOptimizacion;
  configuracion: ConfiguracionCorte;
}

export default function VisualizadorCortes({ resultado }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [laminaSeleccionada, setLaminaSeleccionada] = useState(0);

  // 🆕 Log detallado del resultado recibido
  useEffect(() => {
    console.log('🎨 [VISUALIZADOR] Resultado completo recibido:', {
      tiene_resultado: !!resultado,
      estructura: resultado ? {
        total_laminas: resultado.total_laminas,
        laminas_array_length: resultado.laminas?.length,
        resultados_por_material_length: resultado.resultados_por_material?.length,
        primera_lamina: resultado.laminas?.[0] ? {
          id: resultado.laminas[0].id,
          piezas_length: resultado.laminas[0].piezas?.length,
          piezas_sample: resultado.laminas[0].piezas?.slice(0, 2)
        } : null,
        primer_resultado_material: resultado.resultados_por_material?.[0] ? {
          material_codigo: resultado.resultados_por_material[0].material_codigo,
          laminas_length: resultado.resultados_por_material[0].laminas?.length,
          primera_lamina_piezas: resultado.resultados_por_material[0].laminas?.[0]?.piezas?.length
        } : null
      } : null
    });
  }, [resultado]);

  useEffect(() => {
    if (!resultado || !canvasRef.current) {
      console.log('⚠️ [VISUALIZADOR] No hay resultado o canvas');
      return;
    }

    console.log('🎨 [VISUALIZADOR] useEffect disparado', {
      tiene_resultado: !!resultado,
      total_laminas: resultado.total_laminas,
      lamina_seleccionada: laminaSeleccionada
    });

    // 🆕 Obtener la lámina correcta desde resultados_por_material
    let laminaActual: LaminaCorte | null = null;
    
    // Primero intentar desde resultados_por_material (estructura correcta)
    if (resultado.resultados_por_material && resultado.resultados_por_material.length > 0) {
      let contadorLaminas = 0;
      for (const resultadoMaterial of resultado.resultados_por_material) {
        if (resultadoMaterial.laminas) {
          for (const lamina of resultadoMaterial.laminas) {
            if (contadorLaminas === laminaSeleccionada) {
              laminaActual = lamina;
              break;
            }
            contadorLaminas++;
          }
        }
        if (laminaActual) break;
      }
    }
    
    // Si no se encontró, intentar desde el array plano de láminas
    if (!laminaActual && resultado.laminas && resultado.laminas[laminaSeleccionada]) {
      laminaActual = resultado.laminas[laminaSeleccionada];
    }

    if (!laminaActual) {
      console.error('❌ [VISUALIZADOR] No se encontró la lámina seleccionada');
      return;
    }

    console.log('🎨 [VISUALIZADOR] Dibujando lámina', laminaSeleccionada, {
      lamina: {
        id: laminaActual.id,
        dimensiones: `${laminaActual.largo} × ${laminaActual.ancho} mm`,
        total_piezas: laminaActual.piezas?.length || 0,
        piezas: laminaActual.piezas?.map(p => ({
          id: p.id,
          desc: p.descripcion,
          pos: `(${p.posicion_x}, ${p.posicion_y})`,
          dim: `${p.largo}×${p.ancho}`,
          rotada: p.rotada
        }))
      }
    });

    dibujarLamina(canvasRef.current, laminaActual);
  }, [resultado, laminaSeleccionada]);

  const dibujarLamina = (canvas: HTMLCanvasElement, lamina: LaminaCorte) => {
    console.log('🖌️ [VISUALIZADOR] Iniciando dibujo de lámina', {
      id: lamina.id,
      dimensiones: `${lamina.largo} × ${lamina.ancho} mm`,
      total_piezas: lamina.piezas?.length || 0,
      piezas: lamina.piezas
    });

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('❌ [VISUALIZADOR] No se pudo obtener contexto 2D');
      return;
    }

    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dimensiones del canvas
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const padding = 40;

    console.log('📐 [VISUALIZADOR] Dimensiones canvas:', {
      canvas: `${canvasWidth} × ${canvasHeight}`,
      area_dibujo: `${canvasWidth - padding * 2} × ${canvasHeight - padding * 2}`,
      padding
    });

    // Calcular escala para que la lámina quepa en el canvas
    const escalaX = (canvasWidth - padding * 2) / lamina.largo;
    const escalaY = (canvasHeight - padding * 2) / lamina.ancho;
    const escala = Math.min(escalaX, escalaY);

    const laminaWidth = lamina.largo * escala;
    const laminaHeight = lamina.ancho * escala;
    const offsetX = (canvasWidth - laminaWidth) / 2;
    const offsetY = (canvasHeight - laminaHeight) / 2;

    console.log('📏 [VISUALIZADOR] Escala y posición:', {
      escala: escala.toFixed(4),
      lamina_dibujada: `${laminaWidth.toFixed(1)} × ${laminaHeight.toFixed(1)}`,
      offset: `(${offsetX.toFixed(1)}, ${offsetY.toFixed(1)})`
    });

    // Dibujar fondo de la lámina
    ctx.fillStyle = '#F9FAFB';
    ctx.fillRect(offsetX, offsetY, laminaWidth, laminaHeight);

    // Dibujar borde de la lámina
    ctx.strokeStyle = '#1F2937';
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX, offsetY, laminaWidth, laminaHeight);

    console.log('✅ [VISUALIZADOR] Lámina base dibujada');

    // 🆕 Verificar que hay piezas
    if (!lamina.piezas || lamina.piezas.length === 0) {
      console.warn('⚠️ [VISUALIZADOR] La lámina no tiene piezas para dibujar');
      
      // Mostrar mensaje en el canvas
      ctx.fillStyle = '#6B7280';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No hay piezas en esta lámina', canvasWidth / 2, canvasHeight / 2);
      
      return;
    }

    // 🆕 Calcular áreas ocupadas para identificar sobrantes
    const areasOcupadas: Array<{x: number, y: number, w: number, h: number}> = [];

    // Dibujar cada pieza
    let piezasDibujadas = 0;
    lamina.piezas.forEach((pieza, index) => {
      console.log(`🔷 [VISUALIZADOR] Dibujando pieza ${index + 1}:`, {
        id: pieza.id,
        descripcion: pieza.descripcion,
        posicion_mm: `(${pieza.posicion_x}, ${pieza.posicion_y})`,
        dimensiones_mm: `${pieza.largo} × ${pieza.ancho}`,
        veta: pieza.veta,
        rotada: pieza.rotada,
        color: pieza.color
      });

      // 🆕 Validar que la pieza tiene posición
      if (pieza.posicion_x === undefined || pieza.posicion_y === undefined) {
        console.error(`❌ [VISUALIZADOR] Pieza ${index + 1} sin posición asignada`);
        return;
      }

      // ✅ USAR DIMENSIONES DE CORTE AJUSTADAS (con compensación de tapacanto)
      const piezaLargo = pieza.rotada ? pieza.ancho : pieza.largo;
      const piezaAncho = pieza.rotada ? pieza.largo : pieza.ancho;

      const x = offsetX + (pieza.posicion_x * escala);
      const y = offsetY + (pieza.posicion_y * escala);
      const w = piezaLargo * escala;
      const h = piezaAncho * escala;

      // 🆕 Guardar área ocupada
      areasOcupadas.push({
        x: pieza.posicion_x,
        y: pieza.posicion_y,
        w: piezaLargo,
        h: piezaAncho
      });

      console.log(`  📍 [VISUALIZADOR] Posición en canvas:`, {
        posicion_canvas: `(${x.toFixed(1)}, ${y.toFixed(1)})`,
        tamaño_canvas: `${w.toFixed(1)} × ${h.toFixed(1)}`
      });

      // Dibujar rectángulo de la pieza
      ctx.fillStyle = pieza.color || '#3B82F6';
      ctx.fillRect(x, y, w, h);

      // Dibujar borde de la pieza
      ctx.strokeStyle = '#1F2937';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);

      // 🆕 Dibujar líneas de veta MEJORADAS (más visibles)
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.lineWidth = 1;

      if (pieza.veta === 'S') {
        // ✅ Veta S = Hacia el lado más largo (horizontal si largo > ancho)
        const numLineas = Math.floor(h / 12);
        for (let i = 1; i < numLineas; i++) {
          const lineaY = y + (i * h / numLineas);
          ctx.beginPath();
          ctx.moveTo(x, lineaY);
          ctx.lineTo(x + w, lineaY);
          ctx.stroke();
        }
      } else if (pieza.veta === 'X') {
        // ✅ Veta X = Cruzada, hacia el lado más corto (vertical si largo > ancho)
        const numLineas = Math.floor(w / 12);
        for (let i = 1; i < numLineas; i++) {
          const lineaX = x + (i * w / numLineas);
          ctx.beginPath();
          ctx.moveTo(lineaX, y);
          ctx.lineTo(lineaX, y + h);
          ctx.stroke();
        }
      }

      // 🆕 Dibujar flecha de dirección de veta MEJORADA (más grande y visible)
      if (w > 40 && h > 40) {
        // Fondo blanco para la flecha
        const flechaSize = Math.min(w, h) * 0.15;
        const flechaX = x + w - flechaSize - 8;
        const flechaY = y + 8;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(flechaX - 4, flechaY - 4, flechaSize + 8, flechaSize + 8);
        
        // Dibujar flecha según veta
        ctx.strokeStyle = '#1F2937';
        ctx.fillStyle = '#1F2937';
        ctx.lineWidth = 2;
        
        if (pieza.veta === 'S') {
          // Flecha horizontal → (veta hacia el lado más largo)
          const arrowY = flechaY + flechaSize / 2;
          
          // Línea
          ctx.beginPath();
          ctx.moveTo(flechaX, arrowY);
          ctx.lineTo(flechaX + flechaSize, arrowY);
          ctx.stroke();
          
          // Punta
          ctx.beginPath();
          ctx.moveTo(flechaX + flechaSize, arrowY);
          ctx.lineTo(flechaX + flechaSize - 6, arrowY - 4);
          ctx.lineTo(flechaX + flechaSize - 6, arrowY + 4);
          ctx.closePath();
          ctx.fill();
          
        } else if (pieza.veta === 'X') {
          // Flecha vertical ↓ (veta cruzada, hacia el lado más corto)
          const arrowX = flechaX + flechaSize / 2;
          
          // Línea
          ctx.beginPath();
          ctx.moveTo(arrowX, flechaY);
          ctx.lineTo(arrowX, flechaY + flechaSize);
          ctx.stroke();
          
          // Punta
          ctx.beginPath();
          ctx.moveTo(arrowX, flechaY + flechaSize);
          ctx.lineTo(arrowX - 4, flechaY + flechaSize - 6);
          ctx.lineTo(arrowX + 4, flechaY + flechaSize - 6);
          ctx.closePath();
          ctx.fill();
          
        } else if (pieza.veta === 'N') {
          // Sin veta - mostrar "N"
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('N', flechaX + flechaSize / 2, flechaY + flechaSize / 2);
        }
      }

      // Dibujar número de pieza
      ctx.fillStyle = 'white';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${index + 1}`, x + w / 2, y + h / 2);

      // ✅ Dibujar dimensiones DE CORTE AJUSTADAS
      ctx.fillStyle = '#1F2937';
      ctx.font = '10px sans-serif';
      ctx.fillText(`${piezaLargo}×${piezaAncho}`, x + w / 2, y + h / 2 + 15);

      piezasDibujadas++;
    });

    console.log(`✅ [VISUALIZADOR] ${piezasDibujadas} piezas dibujadas`);

    // 🆕 Calcular y dibujar sobrantes inteligentes DESDE LOS BORDES DE LA LÁMINA
    console.log('📦 [SOBRANTES] Calculando sobrantes desde bordes de lámina...');
    
    const sobrantes: Array<{x: number, y: number, w: number, h: number}> = [];
    
    if (areasOcupadas.length > 0) {
      // 🆕 SOBRANTE DERECHO: Desde la pieza más a la derecha hasta el borde derecho
      const piezaMasDerecha = areasOcupadas.reduce((max, area) => 
        (area.x + area.w) > (max.x + max.w) ? area : max
      );
      
      const derechaX = piezaMasDerecha.x + piezaMasDerecha.w;
      const derechaW = lamina.largo - derechaX;
      
      if (derechaW > 50) {
        sobrantes.push({
          x: derechaX,
          y: 0,
          w: derechaW,
          h: lamina.ancho  // ✅ TODO EL ALTO DE LA LÁMINA
        });
        
        console.log('  ➡️ [SOBRANTE DERECHO]:', {
          posicion: `(${derechaX}, 0)`,
          dimensiones: `${Math.round(derechaW)} × ${lamina.ancho} mm`,
          area_m2: ((derechaW * lamina.ancho) / 1000000).toFixed(2)
        });
      }
      
      // 🆕 SOBRANTE SUPERIOR: Desde la pieza más alta hasta el borde superior
      const piezaMasAlta = areasOcupadas.reduce((max, area) => 
        (area.y + area.h) > (max.y + max.h) ? area : max
      );
      
      const superiorY = piezaMasAlta.y + piezaMasAlta.h;
      const superiorH = lamina.ancho - superiorY;
      
      if (superiorH > 50) {
        sobrantes.push({
          x: 0,
          y: superiorY,
          w: lamina.largo,  // ✅ TODO EL ANCHO DE LA LÁMINA
          h: superiorH
        });
        
        console.log('  ⬆️ [SOBRANTE SUPERIOR]:', {
          posicion: `(0, ${superiorY})`,
          dimensiones: `${lamina.largo} × ${Math.round(superiorH)} mm`,
          area_m2: ((lamina.largo * superiorH) / 1000000).toFixed(2)
        });
      }
    }

    console.log(`📦 [SOBRANTES FINALES] Lámina completa:`, {
      sobrantes: sobrantes.length,
      detalles: sobrantes.map(s => ({
        posicion: `(${Math.round(s.x)}, ${Math.round(s.y)})`,
        dimensiones: `${Math.round(s.w)}×${Math.round(s.h)} mm`,
        area: ((s.w * s.h) / 1000000).toFixed(2) + ' m²'
      }))
    });

    // Dibujar sobrantes con medidas
    ctx.fillStyle = '#059669';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    sobrantes.forEach((sobrante, index) => {
      const sx = offsetX + (sobrante.x * escala);
      const sy = offsetY + (sobrante.y * escala);
      const sw = sobrante.w * escala;
      const sh = sobrante.h * escala;

      console.log(`  🎨 [DIBUJANDO SOBRANTE ${index + 1}]:`, {
        canvas_pos: `(${sx.toFixed(1)}, ${sy.toFixed(1)})`,
        canvas_size: `${sw.toFixed(1)} × ${sh.toFixed(1)} px`,
        real_size: `${Math.round(sobrante.w)} × ${Math.round(sobrante.h)} mm`
      });

      // Solo dibujar si el área es visible (> 20px en canvas)
      if (sw > 20 && sh > 20) {
        // Dibujar fondo semi-transparente para las medidas
        ctx.fillStyle = 'rgba(5, 150, 105, 0.15)';
        ctx.fillRect(sx, sy, sw, sh);

        // Dibujar borde punteado del sobrante
        ctx.strokeStyle = '#059669';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(sx, sy, sw, sh);
        ctx.setLineDash([]);

        // Dibujar medidas
        ctx.fillStyle = '#047857';
        ctx.font = 'bold 13px sans-serif';
        
        // Medida horizontal (si hay espacio)
        if (sw > 80) {
          ctx.fillText(
            `${Math.round(sobrante.w)} mm`,
            sx + sw / 2,
            sy + sh / 2 - 10
          );
        }
        
        // Medida vertical (si hay espacio)
        if (sh > 80) {
          ctx.fillText(
            `${Math.round(sobrante.h)} mm`,
            sx + sw / 2,
            sy + sh / 2 + 10
          );
        }

        // Etiqueta "SOBRANTE" (si hay espacio)
        if (sw > 100 && sh > 60) {
          ctx.font = 'bold 11px sans-serif';
          ctx.fillStyle = '#065f46';
          ctx.fillText('SOBRANTE', sx + sw / 2, sy + 20);
        }
      }
    });

    console.log(`✅ [VISUALIZADOR] ${sobrantes.length} sobrantes dibujados`);

    // Dibujar líneas de corte
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    lamina.piezas.forEach(pieza => {
      if (pieza.posicion_x === undefined || pieza.posicion_y === undefined) return;

      const piezaLargo = pieza.rotada ? pieza.ancho : pieza.largo;
      const piezaAncho = pieza.rotada ? pieza.largo : pieza.ancho;

      const x = offsetX + (pieza.posicion_x * escala);
      const y = offsetY + (pieza.posicion_y * escala);
      const w = piezaLargo * escala;
      const h = piezaAncho * escala;

      // Línea vertical derecha
      ctx.beginPath();
      ctx.moveTo(x + w, offsetY);
      ctx.lineTo(x + w, offsetY + laminaHeight);
      ctx.stroke();

      // Línea horizontal inferior
      ctx.beginPath();
      ctx.moveTo(offsetX, y + h);
      ctx.lineTo(offsetX + laminaWidth, y + h);
      ctx.stroke();
    });

    ctx.setLineDash([]);
    console.log('✅ [VISUALIZADOR] Líneas de corte dibujadas');
    console.log('🎉 [VISUALIZADOR] Dibujo completado exitosamente');
  };

  if (!resultado) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
        <i className="ri-scissors-cut-line text-6xl text-gray-300 mb-4"></i>
        <p className="text-gray-500">
          Agrega piezas y haz clic en "Optimizar Cortes" para ver el resultado
        </p>
      </div>
    );
  }

  // 🆕 Obtener el total real de láminas
  const totalLaminasReal = resultado.resultados_por_material?.reduce(
    (sum, r) => sum + (r.laminas?.length || 0), 
    0
  ) || resultado.total_laminas || 0;

  // 🆕 Obtener la lámina actual para mostrar la lista de piezas
  const obtenerLaminaActual = (): LaminaCorte | null => {
    if (resultado.resultados_por_material && resultado.resultados_por_material.length > 0) {
      let contadorLaminas = 0;
      for (const resultadoMaterial of resultado.resultados_por_material) {
        if (resultadoMaterial.laminas) {
          for (const lamina of resultadoMaterial.laminas) {
            if (contadorLaminas === laminaSeleccionada) {
              return lamina;
            }
            contadorLaminas++;
          }
        }
      }
    }
    
    if (resultado.laminas && resultado.laminas[laminaSeleccionada]) {
      return resultado.laminas[laminaSeleccionada];
    }
    
    return null;
  };

  const laminaActualParaLista = obtenerLaminaActual();

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <i className="ri-layout-grid-line text-blue-600"></i>
          Plano de Corte 2D
        </h3>

        {/* Selector de lámina */}
        {totalLaminasReal > 1 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">
              Lámina {laminaSeleccionada + 1} de {totalLaminasReal}
            </span>
            <button
              onClick={() => setLaminaSeleccionada(Math.max(0, laminaSeleccionada - 1))}
              disabled={laminaSeleccionada === 0}
              className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="ri-arrow-left-line"></i>
            </button>
            <button
              onClick={() => setLaminaSeleccionada(Math.min(totalLaminasReal - 1, laminaSeleccionada + 1))}
              disabled={laminaSeleccionada >= totalLaminasReal - 1}
              className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="ri-arrow-right-line"></i>
            </button>
          </div>
        )}
      </div>

      {/* Canvas */}
      <div className="bg-gray-50 rounded-lg border-2 border-gray-200 p-4">
        <canvas
          ref={canvasRef}
          width={1200}
          height={800}
          className="w-full h-auto"
        />
      </div>

      {/* Leyenda */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-gray-900 bg-white"></div>
          <span className="text-sm text-gray-700">Lámina base</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500"></div>
          <span className="text-sm text-gray-700">Piezas cortadas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 border-t-2 border-dashed border-red-500"></div>
          <span className="text-sm text-gray-700">Líneas de corte</span>
        </div>
        <div className="flex items-center gap-2">
          <i className="ri-arrow-right-line text-gray-700"></i>
          <span className="text-sm text-gray-700">Dirección veta</span>
        </div>
      </div>

      {/* Lista de piezas en esta lámina */}
      {laminaActualParaLista && laminaActualParaLista.piezas && laminaActualParaLista.piezas.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            Piezas en esta lámina:
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {laminaActualParaLista.piezas.map((pieza, index) => (
              <div
                key={pieza.id}
                className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div
                  className="w-8 h-8 rounded flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                  style={{ backgroundColor: pieza.color }}
                >
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {pieza.descripcion}
                  </div>
                  <div className="text-xs text-gray-600">
                    {pieza.largo} × {pieza.ancho} mm
                    {pieza.rotada && <span className="ml-2 text-orange-600">(Rotada)</span>}
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                  pieza.veta === 'S' ? 'bg-green-100 text-green-800' :
                  pieza.veta === 'X' ? 'bg-orange-100 text-orange-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {pieza.veta}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
