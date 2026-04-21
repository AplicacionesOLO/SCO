import * as XLSX from 'xlsx';
import type { DetalleReporteExport } from '../services/reporteDiaService';

// ─── helpers ────────────────────────────────────────────────────────────────

const DIAS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DIAS_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function formatFechaCorta(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return `${d.getDate().toString().padStart(2, '0')}/${MESES_ES[d.getMonth()]}/${d.getFullYear()}`;
}

function getDiaSemana(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return DIAS_FULL[d.getDay()];
}

/**
 * Obtener clave de semana ISO (lunes a domingo)
 * Returns: { key: "2025-W12", label: "Sem 17/03 – 21/03" }
 */
function getSemanaMeta(iso: string): { key: string; label: string } {
  const d = new Date(iso + 'T12:00:00');
  const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay(); // lunes = 1, dom = 7
  const lunes = new Date(d);
  lunes.setDate(d.getDate() - dayOfWeek + 1);
  const dom = new Date(lunes);
  dom.setDate(lunes.getDate() + 6);

  const key = `${lunes.getFullYear()}-${lunes.getMonth().toString().padStart(2, '0')}-${lunes.getDate().toString().padStart(2, '0')}`;
  const label = `Sem ${lunes.getDate().toString().padStart(2, '0')}/${MESES_ES[lunes.getMonth()]} – ${dom.getDate().toString().padStart(2, '0')}/${MESES_ES[dom.getMonth()]}`;
  return { key, label };
}

// ─── Hoja 1: Resumen semanal por colaborador ────────────────────────────────

interface ResumenSemanalRow {
  colaborador: string;
  semana: string;
  lunes: number;
  martes: number;
  miercoles: number;
  jueves: number;
  viernes: number;
  sabado: number;
  domingo: number;
  totalHoras: number;
  totalTareas: number;
  totalUnidades: number;
  productividad: number;
}

function buildResumenSemanal(rows: DetalleReporteExport[]): ResumenSemanalRow[] {
  const mapa: Record<string, ResumenSemanalRow> = {};

  rows.forEach((r) => {
    const sem = getSemanaMeta(r.fecha_trabajo);
    const mapKey = `${r.nombre}||${sem.key}`;

    if (!mapa[mapKey]) {
      mapa[mapKey] = {
        colaborador: r.nombre,
        semana: sem.label,
        lunes: 0, martes: 0, miercoles: 0, jueves: 0, viernes: 0,
        sabado: 0, domingo: 0,
        totalHoras: 0, totalTareas: 0, totalUnidades: 0, productividad: 0,
      };
    }

    const entry = mapa[mapKey];
    const d = new Date(r.fecha_trabajo + 'T12:00:00');
    const dow = d.getDay(); // 0=dom, 1=lun ...

    if (dow === 1) entry.lunes     += r.horas;
    if (dow === 2) entry.martes    += r.horas;
    if (dow === 3) entry.miercoles += r.horas;
    if (dow === 4) entry.jueves    += r.horas;
    if (dow === 5) entry.viernes   += r.horas;
    if (dow === 6) entry.sabado    += r.horas;
    if (dow === 0) entry.domingo   += r.horas;

    entry.totalHoras    += r.horas;
    entry.totalTareas   += 1;
    entry.totalUnidades += r.unidades;
  });

  return Object.values(mapa).map((row) => ({
    ...row,
    lunes:      Math.round(row.lunes * 100) / 100,
    martes:     Math.round(row.martes * 100) / 100,
    miercoles:  Math.round(row.miercoles * 100) / 100,
    jueves:     Math.round(row.jueves * 100) / 100,
    viernes:    Math.round(row.viernes * 100) / 100,
    sabado:     Math.round(row.sabado * 100) / 100,
    domingo:    Math.round(row.domingo * 100) / 100,
    totalHoras: Math.round(row.totalHoras * 100) / 100,
    productividad: row.totalHoras > 0
      ? Math.round((row.totalUnidades / row.totalHoras) * 100) / 100
      : 0,
  })).sort((a, b) => a.colaborador.localeCompare(b.colaborador) || a.semana.localeCompare(b.semana));
}

// ─── Estilos de celda ────────────────────────────────────────────────────────

function cellStyle(opts: {
  bold?: boolean;
  bg?: string;
  color?: string;
  border?: boolean;
  align?: 'left' | 'center' | 'right';
  numFmt?: string;
  wrapText?: boolean;
}) {
  return {
    font: {
      bold: opts.bold ?? false,
      color: opts.color ? { rgb: opts.color } : undefined,
    },
    fill: opts.bg ? { fgColor: { rgb: opts.bg }, patternType: 'solid' } : undefined,
    alignment: {
      horizontal: opts.align ?? 'left',
      vertical: 'center',
      wrapText: opts.wrapText ?? false,
    },
    border: opts.border
      ? {
          top:    { style: 'thin', color: { rgb: 'D1D5DB' } },
          bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
          left:   { style: 'thin', color: { rgb: 'D1D5DB' } },
          right:  { style: 'thin', color: { rgb: 'D1D5DB' } },
        }
      : undefined,
    numFmt: opts.numFmt,
  };
}

function applyStyleToRange(ws: XLSX.WorkSheet, fromRow: number, toRow: number, fromCol: number, toCol: number, style: object) {
  for (let r = fromRow; r <= toRow; r++) {
    for (let c = fromCol; c <= toCol; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (!ws[ref]) ws[ref] = { t: 'z', v: '' };
      ws[ref].s = style;
    }
  }
}

// ─── Builder hojas ───────────────────────────────────────────────────────────

function buildHojaResumen(rows: DetalleReporteExport[]): XLSX.WorkSheet {
  const resumen = buildResumenSemanal(rows);

  // Titulo
  const aoa: any[][] = [
    ['RESUMEN SEMANAL POR COLABORADOR'],
    [],
    [
      'Colaborador', 'Semana',
      'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo',
      'Total Horas', 'Nro. Tareas', 'Total Unidades', 'Uds / Hora',
    ],
  ];

  resumen.forEach((r) => {
    aoa.push([
      r.colaborador,
      r.semana,
      r.lunes || '',
      r.martes || '',
      r.miercoles || '',
      r.jueves || '',
      r.viernes || '',
      r.sabado || '',
      r.domingo || '',
      r.totalHoras,
      r.totalTareas,
      r.totalUnidades,
      r.productividad,
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Anchos de columna
  ws['!cols'] = [
    { wch: 28 }, // Colaborador
    { wch: 22 }, // Semana
    { wch: 9 },  // Lun
    { wch: 9 },  // Mar
    { wch: 10 }, // Mié
    { wch: 9 },  // Jue
    { wch: 9 },  // Vie
    { wch: 9 },  // Sáb
    { wch: 9 },  // Dom
    { wch: 12 }, // Total Horas
    { wch: 12 }, // Nro Tareas
    { wch: 14 }, // Total Unidades
    { wch: 12 }, // Uds/Hora
  ];

  // Merge título
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 12 } }];

  // Estilo título
  const titleRef = XLSX.utils.encode_cell({ r: 0, c: 0 });
  if (!ws[titleRef]) ws[titleRef] = { t: 's', v: 'RESUMEN SEMANAL POR COLABORADOR' };
  ws[titleRef].s = cellStyle({ bold: true, bg: '7C3AED', color: 'FFFFFF', align: 'center', border: true });

  // Estilo header
  const headerStyle = cellStyle({ bold: true, bg: 'EDE9FE', color: '4C1D95', align: 'center', border: true });
  for (let c = 0; c < 13; c++) {
    const ref = XLSX.utils.encode_cell({ r: 2, c });
    if (ws[ref]) ws[ref].s = headerStyle;
  }

  // Estilos datos
  for (let rowIdx = 3; rowIdx < aoa.length; rowIdx++) {
    const isAlt = (rowIdx - 3) % 2 === 1;
    const bgColor = isAlt ? 'F5F3FF' : 'FFFFFF';
    for (let c = 0; c < 13; c++) {
      const ref = XLSX.utils.encode_cell({ r: rowIdx, c });
      if (!ws[ref]) ws[ref] = { t: 'z', v: '' };
      const isNumeric = c >= 2;
      ws[ref].s = cellStyle({
        bg: bgColor,
        align: isNumeric ? 'center' : c === 0 ? 'left' : 'center',
        border: true,
        bold: c === 9, // Total Horas en negrita
      });
    }
  }

  // Altura filas
  const rowsHeights: { [key: number]: { hpx: number } } = { 0: { hpx: 32 }, 2: { hpx: 26 } };
  for (let i = 3; i < aoa.length; i++) rowsHeights[i] = { hpx: 22 };
  ws['!rows'] = Object.entries(rowsHeights).reduce((acc, [k, v]) => {
    acc[Number(k)] = v;
    return acc;
  }, [] as any);

  return ws;
}

function buildHojaDetalle(rows: DetalleReporteExport[]): XLSX.WorkSheet {
  const aoa: any[][] = [
    ['DETALLE COMPLETO DE TAREAS'],
    [],
    [
      'Colaborador', 'Fecha', 'Día', 'Semana',
      'Consecutivo', 'Tipo de Trabajo', 'Descripción',
      'Hora Inicio', 'Hora Fin', 'Horas', 'Unidades', 'Observaciones',
    ],
  ];

  rows.forEach((r) => {
    const sem = getSemanaMeta(r.fecha_trabajo);
    aoa.push([
      r.nombre,
      formatFechaCorta(r.fecha_trabajo),
      getDiaSemana(r.fecha_trabajo),
      sem.label,
      r.consecutivo,
      r.tipo_trabajo,
      r.descripcion,
      r.hora_inicio,
      r.hora_fin,
      r.horas,
      r.unidades,
      r.observaciones,
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws['!cols'] = [
    { wch: 28 }, // Colaborador
    { wch: 14 }, // Fecha
    { wch: 12 }, // Día
    { wch: 22 }, // Semana
    { wch: 14 }, // Consecutivo
    { wch: 28 }, // Tipo de Trabajo ← IMPORTANTE
    { wch: 36 }, // Descripción
    { wch: 12 }, // Hora Inicio
    { wch: 12 }, // Hora Fin
    { wch: 10 }, // Horas
    { wch: 12 }, // Unidades
    { wch: 40 }, // Observaciones
  ];

  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 11 } }];

  // Título
  const titleRef = XLSX.utils.encode_cell({ r: 0, c: 0 });
  if (!ws[titleRef]) ws[titleRef] = { t: 's', v: 'DETALLE COMPLETO DE TAREAS' };
  ws[titleRef].s = cellStyle({ bold: true, bg: '5B21B6', color: 'FFFFFF', align: 'center', border: true });

  // Header
  for (let c = 0; c < 12; c++) {
    const ref = XLSX.utils.encode_cell({ r: 2, c });
    if (ws[ref]) {
      // Resaltar "Tipo de Trabajo" con color especial
      const isTipoTrabajo = c === 5;
      ws[ref].s = cellStyle({
        bold: true,
        bg: isTipoTrabajo ? 'FEF3C7' : 'EDE9FE',
        color: isTipoTrabajo ? '92400E' : '4C1D95',
        align: 'center',
        border: true,
      });
    }
  }

  // Datos
  for (let rowIdx = 3; rowIdx < aoa.length; rowIdx++) {
    const isAlt = (rowIdx - 3) % 2 === 1;
    const bgColor = isAlt ? 'FAFAF9' : 'FFFFFF';
    for (let c = 0; c < 12; c++) {
      const ref = XLSX.utils.encode_cell({ r: rowIdx, c });
      if (!ws[ref]) ws[ref] = { t: 'z', v: '' };
      const isTipoTrabajo = c === 5;
      ws[ref].s = cellStyle({
        bg: isTipoTrabajo ? (isAlt ? 'FFFBEB' : 'FFFFF5') : bgColor,
        align: c >= 7 && c <= 10 ? 'center' : 'left',
        border: true,
        wrapText: c === 11, // Observaciones
        bold: isTipoTrabajo,
      });
    }
  }

  const rowsHeights: any[] = [];
  rowsHeights[0] = { hpx: 32 };
  rowsHeights[2] = { hpx: 26 };
  for (let i = 3; i < aoa.length; i++) rowsHeights[i] = { hpx: 22 };
  ws['!rows'] = rowsHeights;

  return ws;
}

// ─── Función principal ───────────────────────────────────────────────────────

export function exportarMetricasExcel(
  rows: DetalleReporteExport[],
  fechaDesde: string,
  fechaHasta: string,
  nombreTienda = 'Equipo'
): void {
  const wb = XLSX.utils.book_new();

  const ws1 = buildHojaResumen(rows);
  const ws2 = buildHojaDetalle(rows);

  XLSX.utils.book_append_sheet(wb, ws1, 'Resumen Semanal');
  XLSX.utils.book_append_sheet(wb, ws2, 'Detalle Tareas');

  const fechaLabel = fechaDesde === fechaHasta
    ? fechaDesde.replace(/-/g, '')
    : `${fechaDesde.replace(/-/g, '')}_${fechaHasta.replace(/-/g, '')}`;

  const fileName = `Metricas_${nombreTienda}_${fechaLabel}.xlsx`;

  XLSX.writeFile(wb, fileName);
}
