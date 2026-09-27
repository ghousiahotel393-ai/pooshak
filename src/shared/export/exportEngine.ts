import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveFile, type SaveFileResult } from './saveFile';

/**
 * exportEngine — THE single shared source of truth for ALL business report
 * exports (PDF / Excel / CSV / Print) across the entire app.
 *
 * No page-specific logic lives here. It only knows how to render a generic
 * tabular report from a generic config. Every page passes its own
 * data / columns / title / filter-summary via <ExportButton> props.
 *
 * Explicitly separate systems (DO NOT route through here):
 *  - Full database backup/restore (BackupTab / DatabaseTools / InventoryManager JSON)
 *  - POS receipts & KOT prints (pos/ReceiptPrint.tsx, pos/KOTPrint.tsx)
 *  - Barcode label printing (BarcodeGenerator)
 */

export type ExportFormat = 'pdf' | 'xlsx' | 'csv' | 'print';

export type ExportColumnFormat =
  | 'string'
  | 'number'
  | 'currency'
  | 'date'
  | ((value: any, row: Record<string, any>) => string);

export interface ExportColumn {
  key: string;
  label?: string;
  header?: string;
  format?: ExportColumnFormat;
}

export function getColumnLabel(col: ExportColumn): string {
  return col.label || col.header || col.key || '';
}

export interface ReportExportConfig {
  title: string;
  subtitle?: string;
  columns: ExportColumn[];
  rows: Record<string, any>[];
  filtersSummary?: string;
  brand?: { name: string; logo?: string };
  filename?: string;
  currencySymbol?: string;
  paperSize?: string;
}

export const DEFAULT_BRAND = { name: 'Zaynahs POS', logo: '/zaynahs-logo.svg' };

/* ─── Low-level helpers (safe to reuse from backup tooling) ─── */

/**
 * Cross-platform blob save. Routes through the platform-aware `saveFile`
 * (Capacitor Filesystem+Share on native, Web Share on standalone PWA, anchor
 * download on desktop/Electron) instead of a browser-only anchor click that
 * silently no-ops inside a native WebView / installed PWA.
 */
export function triggerDownload(blob: Blob, filename: string): Promise<SaveFileResult> {
  return saveFile(blob, filename, blob.type || 'application/octet-stream');
}

function safeFilename(name: string) {
  return name.replace(/[^a-z0-9\-_ ]/gi, '_').replace(/\s+/g, '_').replace(/_+/g, '_');
}

export function defaultFilename(title: string, ext: string) {
  const date = new Date().toISOString().slice(0, 10);
  return `${safeFilename(title)}_${date}.${ext}`;
}

/* ─── Value formatting (mirrors on-screen display; no silent drops) ─── */

function formatValue(
  col: ExportColumn,
  row: Record<string, any>,
  currencySymbol: string
): string {
  const raw = row[col.key];
  if (raw === null || raw === undefined || raw === '') return '';

  if (typeof col.format === 'function') {
    try {
      const v = col.format(raw, row);
      return v ?? '';
    } catch {
      return String(raw);
    }
  }

  switch (col.format) {
    case 'number': {
      const n = Number(raw);
      return isNaN(n) ? String(raw) : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    case 'currency': {
      const n = Number(raw);
      if (isNaN(n)) return String(raw);
      const symbol = currencySymbol ? `${currencySymbol} ` : '';
      return `${symbol}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    }
    case 'date': {
      const d = new Date(raw);
      return isNaN(d.getTime()) ? String(raw) : d.toLocaleDateString();
    }
    default:
      return String(raw);
  }
}

function excelValue(col: ExportColumn, row: Record<string, any>): string | number {
  const raw = row[col.key];
  if (raw === null || raw === undefined || raw === '') return '';
  // Keep numbers numeric for real Excel math; everything else as display string
  if (col.format === 'number' || col.format === 'currency') {
    const n = Number(raw);
    if (!isNaN(n)) return n;
  }
  return formatValue(col, row, '');
}

/* ─── CSV ─── */

export function exportToCSV(config: ReportExportConfig): Promise<SaveFileResult> {
  const csvEsc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const lines: string[] = [];

  if (config.title) lines.push(csvEsc(config.title));
  if (config.filtersSummary) lines.push(csvEsc(config.filtersSummary));
  lines.push(csvEsc(`Generated: ${new Date().toLocaleString()}`));

  lines.push(config.columns.map(c => csvEsc(getColumnLabel(c))).join(','));
  for (const row of config.rows) {
    lines.push(config.columns.map(c => csvEsc(formatValue(c, row, config.currencySymbol || ''))).join(','));
  }

  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  return saveFile(blob, config.filename || defaultFilename(config.title, 'csv'), 'text/csv');
}

/* ─── Excel (XLSX via SheetJS) ─── */

export function exportToExcel(config: ReportExportConfig): Promise<SaveFileResult> {
  const aoa: (string | number)[][] = [];
  if (config.title) aoa.push([config.title]);
  if (config.subtitle) aoa.push([config.subtitle]);
  if (config.filtersSummary) aoa.push([config.filtersSummary]);
  aoa.push([`Generated: ${new Date().toLocaleString()}`]);
  aoa.push([]);

  aoa.push(config.columns.map(c => getColumnLabel(c)));
  for (const row of config.rows) {
    aoa.push(config.columns.map(c => excelValue(c, row)));
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = config.columns.map(c => {
    const headerLen = getColumnLabel(c).length;
    let maxContentLen = headerLen;
    const sample = config.rows.slice(0, 100);
    for (const r of sample) {
      const v = String(r[c.key] ?? '');
      if (v.length > maxContentLen) maxContentLen = v.length;
    }
    return { wch: Math.min(Math.max(maxContentLen + 3, 14), 45) };
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  // Build an array buffer (works in WebView/PWA) and route through the
  // cross-platform saver instead of XLSX.writeFile's browser-only anchor click.
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  return saveFile(
    blob,
    config.filename || defaultFilename(config.title, 'xlsx'),
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
}

/* ─── PDF (jsPDF v4 + jspdf-autotable — proper column fit + alignment) ─── */

function isNumericColumn(col: ExportColumn): boolean {
  return col.format === 'number' || col.format === 'currency';
}

export async function exportToPDF(config: ReportExportConfig): Promise<SaveFileResult> {
  const rawPaper = (config.paperSize || '80mm').trim().toLowerCase();
  const is58mm = rawPaper === '58mm';
  const is80mm = rawPaper === '80mm';
  const isThermal = is58mm || is80mm;
  const orientation = isThermal ? 'portrait' : (config.columns.length > 5 ? 'landscape' : 'portrait');

  // Thermal rolls: slip height scales with record count, capping at 450mm before pagination
  const rowCount = config.rows.length;
  const slipHeight = isThermal
    ? Math.max(70, Math.min(Math.ceil(40 + (rowCount + 1) * (is58mm ? 6.5 : 7.5) + 20), 450))
    : 297;
  const format: string | [number, number] = is58mm ? [58, slipHeight] : is80mm ? [80, slipHeight] : 'a4';

  const doc = new jsPDF({ orientation, unit: 'mm', format });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = is58mm ? 2.5 : is80mm ? 3.5 : 12;
  const brand = config.brand || DEFAULT_BRAND;

  // Branded header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(is58mm ? 8.5 : is80mm ? 11 : 15);
  doc.setTextColor(16, 185, 129); // --color-primary
  doc.text(brand.name, margin, is58mm ? 6 : is80mm ? 8 : 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(is58mm ? 7 : is80mm ? 8.5 : 11);
  doc.setTextColor(15, 23, 42);
  doc.text(config.title, margin, is58mm ? 10.5 : is80mm ? 13 : 23);

  doc.setFontSize(is58mm ? 5 : is80mm ? 6 : 8);
  doc.setTextColor(107, 114, 128);
  let metaY = is58mm ? 14 : is80mm ? 17 : 28;
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, metaY);
  if (config.filtersSummary) {
    metaY += (isThermal ? 3 : 4);
    doc.text(config.filtersSummary, margin, metaY);
  }
  if (config.subtitle) {
    metaY += (isThermal ? 3 : 4);
    doc.text(config.subtitle, margin, metaY);
  }

  // Brand rule line
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(is58mm ? 0.3 : is80mm ? 0.4 : 0.6);
  doc.line(margin, metaY + (isThermal ? 2 : 3), pageWidth - margin, metaY + (isThermal ? 2 : 3));

  // Table — autoTable wraps long text, fits columns to page width and preserves alignment
  const head = [config.columns.map(c => getColumnLabel(c))];
  const body = config.rows.map(row =>
    config.columns.map(c => formatValue(c, row, config.currencySymbol || ''))
  );
  const columnStyles: Record<number, { halign: 'left' | 'right' }> = {};
  config.columns.forEach((c, i) => {
    if (isNumericColumn(c)) columnStyles[i] = { halign: 'right' };
  });

  const numCols = config.columns.length;
  const tableFontSize = is58mm
    ? (numCols > 5 ? 4 : numCols > 3 ? 4.5 : 5.5)
    : is80mm
    ? (numCols > 6 ? 4.8 : numCols > 4 ? 5.5 : 6.5)
    : 7.5;

  autoTable(doc, {
    head,
    body,
    startY: metaY + (isThermal ? 4.5 : 7),
    margin: { left: margin, right: margin, bottom: isThermal ? 6 : 14 },
    tableWidth: 'auto',
    styles: {
      fontSize: tableFontSize,
      cellPadding: is58mm ? 0.6 : is80mm ? 0.9 : 1.6,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [16, 185, 129],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
      fontSize: tableFontSize,
    },
    bodyStyles: { textColor: [15, 23, 42] },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles,
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  doc.setFontSize(is58mm ? 4.5 : is80mm ? 5.5 : 7);
  doc.setTextColor(156, 163, 175);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const footerY = doc.internal.pageSize.getHeight() - (isThermal ? 3 : 6);
    doc.text(`${brand.name} — ${config.title} — Page ${i} of ${pageCount}`, margin, footerY);
  }

  // Output as blob and save
  const blob = doc.output('blob') as Blob;
  return saveFile(blob, config.filename || defaultFilename(config.title, 'pdf'), 'application/pdf');
}

export { printReport } from './printReport';

