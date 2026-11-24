import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  CURRENCY_CONES,
  formatCurrencyByCode,
  type CashCurrencyCode,
  type ConeCountSummary,
} from './currencyDenominations';
import { formatAmount, formatDateForFrontEnd, formatUsd } from './formatters';
import { formatCategoriaAporte } from './rolePermissions';

export interface CashActDonationItem {
  id: string;
  donante: string;
  monto: number;
  descripcion: string;
  fecha: string;
  moneda: CashCurrencyCode;
  medio_pago: 'efectivo' | 'transferencia' | 'pago_movil';
  monto_original: number;
  tasa_bcv: number | null;
  monto_usd: number;
  monto_ves: number | null;
  categoria_aporte?: string | null;
  actividad_o_responsable?: string | null;
}

export interface ParsedDenominationLine {
  currency: CashCurrencyCode;
  count: number;
  denominationLabel: string;
  subtotalLabel: string;
}

export interface ParsedCashActMetadata {
  activity: string | null;
  responsibleUser: string | null;
  additionalCounters: string[];
  sessionTag: string | null;
  denominationLines: ParsedDenominationLine[];
}

export function createCashActSessionTag(): string {
  return `ACTA-${Date.now().toString(36).toUpperCase()}`;
}

/**
 * Construye la descripción enriquecida y auditable para un registro de arqueo en efectivo.
 */
export function buildCashActDescription(params: {
  categoria: string;
  actividad?: string | null;
  responsibleUser?: string | null;
  additionalCounters?: string[];
  sessionTag?: string | null;
  coneSummary: ConeCountSummary;
}): string {
  const parts: string[] = [];
  const cleanAct = params.actividad?.trim();
  parts.push(
    `${params.categoria.toUpperCase()} — Registro Interno${cleanAct ? ` (${cleanAct})` : ''}`,
  );

  if (params.responsibleUser?.trim()) {
    parts.push(`Responsable: ${params.responsibleUser.trim()}`);
  }

  const cleanCounters = (params.additionalCounters || []).map((c) => c.trim()).filter(Boolean);
  if (cleanCounters.length > 0) {
    parts.push(`Conteo adicional: ${cleanCounters.join(', ')}`);
  }

  if (params.sessionTag?.trim()) {
    parts.push(`Lote: ${params.sessionTag.trim()}`);
  }

  if (params.coneSummary.breakdownText) {
    parts.push(params.coneSummary.breakdownText);
  }

  return parts.join(' | ');
}

/**
 * Extrae metadatos del arqueo (responsable, equipo de conteo, lote y desglose de billetes)
 * desde la descripción almacenada en la donación.
 */
export function parseCashActDescription(
  descripcion: string | null | undefined,
  fallbackCurrency: CashCurrencyCode = 'USD',
): ParsedCashActMetadata {
  const raw = (descripcion || '').trim();
  const segments = raw
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);

  let activity: string | null = null;
  let responsibleUser: string | null = null;
  let additionalCounters: string[] = [];
  let sessionTag: string | null = null;
  const denominationLines: ParsedDenominationLine[] = [];

  for (const seg of segments) {
    if (seg.startsWith('Responsable:')) {
      responsibleUser = seg.replace(/^Responsable:\s*/i, '').trim() || null;
      continue;
    }
    if (seg.startsWith('Conteo adicional:')) {
      const listStr = seg.replace(/^Conteo adicional:\s*/i, '').trim();
      additionalCounters = listStr
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      continue;
    }
    if (seg.startsWith('Lote:')) {
      sessionTag = seg.replace(/^Lote:\s*/i, '').trim() || null;
      continue;
    }

    const arqueoMatch = seg.match(/^Arqueo\s+(VES|USD|EUR|COP)\s+\[\d+\s+billetes?\]:\s*(.+)$/i);
    if (arqueoMatch) {
      const currency = arqueoMatch[1].toUpperCase() as CashCurrencyCode;
      const itemsStr = arqueoMatch[2];
      // Cada ítem tiene el formato: 4xBs. 500,00 (Bs. 2.000,00) o 2xCOP $100.000 (COP $200.000)
      const itemRegex = /(\d+)x([^(]+)\(([^)]+)\)/g;
      let match = itemRegex.exec(itemsStr);
      while (match !== null) {
        denominationLines.push({
          currency,
          count: parseInt(match[1], 10) || 0,
          denominationLabel: match[2].trim(),
          subtotalLabel: match[3].trim(),
        });
        match = itemRegex.exec(itemsStr);
      }
      continue;
    }

    if (!activity && seg.includes('Registro Interno')) {
      const parenMatch = seg.match(/\(([^)]+)\)/);
      if (parenMatch) {
        activity = parenMatch[1].trim();
      }
    }
  }

  // Si no tenía desglose explícito, devolver vacío para que el generador use el monto total de la fila
  void fallbackCurrency;

  return {
    activity,
    responsibleUser,
    additionalCounters,
    sessionTag,
    denominationLines,
  };
}

/**
 * Encuentra todas las filas de donaciones en efectivo que pertenecen a la misma sesión de arqueo
 * (mismo lote `Lote: ...`, o misma fecha/donante/actividad cuando se registraron juntas).
 */
export function resolveSessionCashDonations(
  target: CashActDonationItem,
  allDonations: CashActDonationItem[],
): CashActDonationItem[] {
  const targetMeta = parseCashActDescription(target.descripcion, target.moneda);
  if (targetMeta.sessionTag) {
    const siblings = allDonations.filter((d) => {
      if (d.medio_pago !== 'efectivo') return false;
      const meta = parseCashActDescription(d.descripcion, d.moneda);
      return meta.sessionTag === targetMeta.sessionTag;
    });
    if (siblings.length > 0) return siblings;
  }
  return [target];
}

export interface GenerateCashIntakeActPdfParams {
  donation: CashActDonationItem;
  allDonations?: CashActDonationItem[];
  organizationName?: string;
  loggedUserName?: string;
}

/**
 * Genera y descarga el reporte PDF "Acta de Ingreso" para un ingreso registrado en efectivo.
 */
export function generateCashIntakeActPdf({
  donation,
  allDonations = [],
  organizationName = 'Iglesia / Organización',
  loggedUserName = 'Tesorero / Administrador',
}: GenerateCashIntakeActPdfParams): jsPDF {
  const sessionDonations = resolveSessionCashDonations(donation, allDonations);
  const primaryMeta = parseCashActDescription(donation.descripcion, donation.moneda);

  const responsibleName =
    primaryMeta.responsibleUser || loggedUserName || 'Tesorero / Administrador';
  const additionalCounters = primaryMeta.additionalCounters;
  const activityLabel =
    donation.actividad_o_responsable || primaryMeta.activity || 'Conteo de Efectivo';

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Franja superior institucional
  doc.setFillColor(15, 23, 42);
  doc.rect(14, 14, 3, 18, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(15, 23, 42);
  doc.text('ACTA DE INGRESO Y ARQUEO DE EFECTIVO', 21, 21);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`${organizationName} — Comprobante Oficial de Conteo de Tesorería`, 21, 27);

  doc.setFontSize(8.5);
  doc.text(`Fecha del Ingreso: ${formatDateForFrontEnd(donation.fecha)}`, 196, 20, {
    align: 'right',
  });
  doc.text(`Acta ID: ${donation.id.slice(0, 10).toUpperCase()}`, 196, 25, {
    align: 'right',
  });
  doc.text(`Emisión: ${new Date().toLocaleDateString('es-VE')}`, 196, 30, {
    align: 'right',
  });

  // Bloque 1: Datos Generales y Responsables del Conteo
  autoTable(doc, {
    startY: 36,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8.8,
      textColor: [30, 41, 59],
    },
    head: [['Datos del Aporte y Comisión de Conteo', 'Detalle']],
    body: [
      ['Concepto / Aportante', donation.donante || 'Conteo de Ofrenda en Culto'],
      ['Categoría del Aporte', formatCategoriaAporte(donation.categoria_aporte)],
      ['Culto / Servicio / Actividad', activityLabel],
      ['Administrador / Tesorero Responsable', responsibleName],
      [
        'Personas Adicionales en el Conteo',
        additionalCounters.length > 0
          ? additionalCounters.join(', ')
          : 'Sin participantes adicionales registrados',
      ],
    ],
    columnStyles: {
      0: { cellWidth: 66, fontStyle: 'bold', fillColor: [248, 250, 252] },
      1: { cellWidth: 114 },
    },
  });

  const afterGeneralY =
    (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 82;

  // Bloque 2: Desglose de Cantidad de Billetes por Especie Monetaria
  const denominationRows: string[][] = [];
  for (const item of sessionDonations) {
    const meta = parseCashActDescription(item.descripcion, item.moneda);
    const coneName = CURRENCY_CONES[item.moneda]?.coneLabel || item.moneda;
    if (meta.denominationLines.length > 0) {
      for (const line of meta.denominationLines) {
        denominationRows.push([
          CURRENCY_CONES[line.currency]?.coneLabel || line.currency,
          line.denominationLabel,
          String(line.count),
          line.subtotalLabel,
        ]);
      }
    } else {
      denominationRows.push([
        coneName,
        'Efectivo (Monto global sin desglose de piezas)',
        '1',
        formatCurrencyByCode(item.monto_original || item.monto, item.moneda),
      ]);
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Cantidad de Billetes Contados por Especie Monetaria', 14, afterGeneralY + 9);

  autoTable(doc, {
    startY: afterGeneralY + 12,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8.8,
    },
    bodyStyles: {
      fontSize: 8.8,
      textColor: [30, 41, 59],
    },
    head: [['Cono Monetario', 'Especie / Denominación', 'Cantidad de Billetes', 'Subtotal']],
    body: denominationRows,
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 54, fontStyle: 'bold' },
      2: { cellWidth: 36, halign: 'center' },
      3: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
    },
  });

  const afterDenomY =
    (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ||
    afterGeneralY + 45;

  // Bloque 3: Total en Cada Tipo de Moneda y Equivalente USD
  const totalsByCurrencyRows: string[][] = sessionDonations.map((item) => {
    const meta = parseCashActDescription(item.descripcion, item.moneda);
    const totalBillsInCone = meta.denominationLines.reduce((acc, l) => acc + l.count, 0);
    const coneLabel = CURRENCY_CONES[item.moneda]?.coneLabel || item.moneda;
    const rateLabel =
      item.moneda === 'USD'
        ? '1,0000 (Base USD)'
        : item.tasa_bcv
          ? `${formatAmount(item.tasa_bcv, 4)} ${
              item.moneda === 'EUR' ? '$/€' : item.moneda === 'COP' ? 'COP/$' : 'Bs/$'
            }`
          : 'N/A';

    return [
      coneLabel,
      totalBillsInCone > 0 ? `${totalBillsInCone} billetes` : 'N/A',
      formatCurrencyByCode(item.monto_original || item.monto, item.moneda),
      rateLabel,
      formatUsd(item.monto_usd || item.monto),
    ];
  });

  const totalConsolidatedUsd = sessionDonations.reduce(
    (sum, item) => sum + (item.monto_usd || item.monto || 0),
    0,
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Total por Cada Tipo de Moneda y Equivalencia Contable', 14, afterDenomY + 9);

  autoTable(doc, {
    startY: afterDenomY + 12,
    theme: 'grid',
    headStyles: {
      fillColor: [5, 150, 105],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8.8,
    },
    bodyStyles: {
      fontSize: 8.8,
      textColor: [30, 41, 59],
    },
    footStyles: {
      fillColor: [236, 253, 245],
      textColor: [6, 95, 70],
      fontStyle: 'bold',
      fontSize: 9.5,
    },
    head: [
      ['Moneda / Cono', 'Total Piezas', 'Total Moneda Origen', 'Tasa de Cambio', 'Equivalente USD'],
    ],
    body: totalsByCurrencyRows,
    foot: [
      ['TOTAL CONSOLIDADO DEL ACTA (USD)', '', '', '', `${formatUsd(totalConsolidatedUsd)} USD`],
    ],
    columnStyles: {
      0: { cellWidth: 44, fontStyle: 'bold' },
      1: { cellWidth: 28, halign: 'center' },
      2: { cellWidth: 38, halign: 'right', fontStyle: 'bold' },
      3: { cellWidth: 36, halign: 'right' },
      4: { cellWidth: 34, halign: 'right', fontStyle: 'bold' },
    },
  });

  const afterTotalsY =
    (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ||
    afterDenomY + 45;

  // Bloque 4: Firmas de Conformidad (Tesorero/Admin + Personas involucradas en el conteo)
  const signers = [
    { name: responsibleName, role: 'Tesorero / Administrador Responsable' },
    ...additionalCounters.map((name, idx) => ({
      name,
      role: `Testigo / Contador Adicional #${idx + 1}`,
    })),
  ];

  let sigStartY = afterTotalsY + 16;
  if (sigStartY > 245) {
    doc.addPage();
    sigStartY = 25;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('3. Firmas de Conformidad de la Comisión de Conteo', 14, sigStartY);

  const colPositions = [20, 112];
  let currentY = sigStartY + 22;

  signers.forEach((signer, idx) => {
    const col = idx % 2;
    if (idx > 0 && col === 0) {
      currentY += 28;
      if (currentY > 275) {
        doc.addPage();
        currentY = 35;
      }
    }
    const x = colPositions[col];
    doc.setDrawColor(148, 163, 184);
    doc.line(x, currentY, x + 74, currentY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(15, 23, 42);
    doc.text(signer.name, x + 37, currentY + 5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(100, 116, 139);
    doc.text(signer.role, x + 37, currentY + 9.5, { align: 'center' });
  });

  const safeDate = (donation.fecha || 'fecha').replace(/[^0-9-]/g, '');
  const shortId = donation.id.slice(0, 6);
  doc.save(`Acta_de_Ingreso_${safeDate}_${shortId}.pdf`);

  return doc;
}
