import type { ReportExportConfig } from './exportEngine';
import { DEFAULT_BRAND, getColumnLabel } from './exportEngine';

export type PrintMethod = 'window' | 'iframe' | 'pdf-fallback' | 'failed';
export interface PrintResult {
  method: PrintMethod;
  error?: string;
}

function isCapacitorNative(): boolean {
  const cap = (typeof window !== 'undefined' && (window as any).Capacitor) || null;
  return !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
}

function isMobile(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent)) ||
    (typeof window.innerWidth === 'number' && window.innerWidth < 768);
}

export async function printReport(config: ReportExportConfig): Promise<PrintResult> {
  // Mobile browsers / native apps: iframe & popup window.print() are blocked or non-functional.
  // Generate the PDF instead so mobile users get the native OS Print (AirPrint) & Share dialog.
  if (isMobile() || isCapacitorNative()) {
    try {
      const { exportToPDF } = await import('./exportEngine');
      const res = await exportToPDF(config);
      if (res.method === 'failed') return { method: 'failed', error: res.error };
      return { method: 'pdf-fallback' };
    } catch (e: any) {
      return { method: 'failed', error: e?.message || 'Print unavailable' };
    }
  }

  const brand = config.brand || DEFAULT_BRAND;
  const currencySymbol = config.currencySymbol || '';
  const rawPaper = (config.paperSize || '80mm').trim().toLowerCase();
  const is58mm = rawPaper === '58mm';
  const is80mm = rawPaper === '80mm';
  const isThermal = is58mm || is80mm;
  const cssWidth = is58mm ? '58mm' : is80mm ? '80mm' : '100%';

  const escapeHtml = (v: string) =>
    String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const formatVal = (col: any, row: any) => {
    const raw = row[col.key];
    if (raw === null || raw === undefined || raw === '') return '';
    if (typeof col.format === 'function') {
      try { return col.format(raw, row) ?? ''; } catch { return String(raw); }
    }
    if (col.format === 'number') {
      const n = Number(raw);
      return isNaN(n) ? String(raw) : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    if (col.format === 'currency') {
      const n = Number(raw);
      if (isNaN(n)) return String(raw);
      return `${currencySymbol ? currencySymbol + ' ' : ''}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (col.format === 'date') {
      const d = new Date(raw);
      return isNaN(d.getTime()) ? String(raw) : d.toLocaleDateString();
    }
    return String(raw);
  };

  const isNumericCol = (c: any) => c.format === 'number' || c.format === 'currency';

  const headers = config.columns
    .map(c => `<th class="${isNumericCol(c) ? 'num' : 'text'}">${escapeHtml(getColumnLabel(c))}</th>`)
    .join('');

  const body = config.rows.map(row => {
    const tds = config.columns.map(c =>
      `<td class="${isNumericCol(c) ? 'num' : 'text'}">${escapeHtml(formatVal(c, row))}</td>`
    ).join('');
    return `<tr>${tds}</tr>`;
  }).join('');

  const win = isCapacitorNative() ? null : window.open('', '_blank', 'width=1024,height=768');

  const thermalCss = isThermal ? `
    body { width: ${cssWidth}; padding: 3px; font-size: ${is58mm ? '8px' : '10px'}; color: #000; }
    .brand-header { flex-direction: column; text-align: center; border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 8px; }
    .brand-name { font-size: ${is58mm ? '12px' : '15px'}; color: #000; }
    h1 { font-size: ${is58mm ? '10px' : '12px'}; color: #000; margin-top: 4px; }
    .meta { font-size: ${is58mm ? '7px' : '8.5px'}; color: #000; }
    table { font-size: ${is58mm ? '7px' : '8.5px'}; margin-top: 8px; }
    th { background: transparent; color: #000; border-bottom: 1px solid #000; padding: 3px 2px; }
    td { padding: 3px 2px; border-bottom: 1px dotted #ccc; color: #000; }
    .footer { margin-top: 10px; font-size: ${is58mm ? '6.5px' : '7.5px'}; color: #000; }
  ` : `
    body { padding: 24px; color: #0f172a; }
    .brand-header { flex-direction: row; align-items: center; gap: 12px; border-bottom: 3px solid #10b981; padding-bottom: 12px; margin-bottom: 16px; }
    .brand-name { font-size: 18px; color: #10b981; }
    h1 { font-size: 14px; }
    .meta { font-size: 10px; color: #6b7280; }
    table { margin-top: 14px; }
    th { background: #10b981; color: #fff; font-size: 9px; padding: 7px 8px; }
    td { font-size: 9.5px; padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
    tr:nth-child(even) td { background: #f9fafb; }
    .footer { margin-top: 18px; font-size: 8px; color: #9ca3af; }
  `;

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>${escapeHtml(config.title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; }
    .brand-header { display: flex; }
    .brand-header img { height: 36px; width: auto; }
    .brand-name { font-weight: 900; letter-spacing: 0.05em; text-transform: uppercase; }
    h1 { font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 4px; }
    .meta { margin-bottom: 2px; }
    table { width: 100%; border-collapse: collapse; }
    th { font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
    th.num, td.num { text-align: right; font-variant-numeric: tabular-nums; font-family: monospace, monospace; }
    th.text, td.text { text-align: left; }
    .footer { text-align: center; }
    ${thermalCss}
    @media print { 
      body { padding: 0; ${isThermal ? `width: ${cssWidth};` : ''} } 
      ${isThermal ? `@page { margin: 0; size: ${cssWidth} auto; }` : `@page { margin: 10mm; size: auto; }`}
    }
  </style>
</head>
<body>
  <div class="brand-header">
    <img src="${escapeHtml(brand.logo || '')}" alt="" onerror="this.style.display='none'" />
    <div>
      <div class="brand-name">${escapeHtml(brand.name)}</div>
      <h1>${escapeHtml(config.title)}</h1>
      <div class="meta">Generated: ${escapeHtml(new Date().toLocaleString())}</div>
      ${config.filtersSummary ? `<div class="meta">${escapeHtml(config.filtersSummary)}</div>` : ''}
      ${config.subtitle ? `<div class="meta">${escapeHtml(config.subtitle)}</div>` : ''}
    </div>
  </div>
  <table>
    <thead><tr>${headers}</tr></thead>
    <tbody>${body}</tbody>
  </table>
  <div class="footer">${escapeHtml(brand.name)} — ${escapeHtml(config.title)} — Generated ${escapeHtml(new Date().toLocaleString())}</div>
</body>
</html>`;

  // 1. Preferred: a real popup window (desktop browsers / Electron).
  if (win) {
    win.document.write(html + '<script>window.onload=function(){window.print();}</scr' + 'ipt>');
    win.document.close();
    return { method: 'window' };
  }

  // 2. Popup blocked (standalone PWA) and NOT native: print via a hidden iframe.
  if (!isCapacitorNative() && typeof document !== 'undefined') {
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
      const idoc = iframe.contentWindow?.document;
      if (idoc) {
        idoc.open();
        idoc.write(html);
        idoc.close();
        const doPrint = () => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch { /* ignore */ }
          setTimeout(() => { try { document.body.removeChild(iframe); } catch { /* ignore */ } }, 60000);
        };
        // Give images/styles a tick to lay out.
        setTimeout(doPrint, 300);
        return { method: 'iframe' };
      }
      document.body.removeChild(iframe);
    } catch (e: any) {
      console.error('[printReport] iframe print failed:', e);
    }
  }

  // 3. Native WebView (or all else failed): produce a PDF the user can save/share.
  try {
    const { exportToPDF } = await import('./exportEngine');
    const res = await exportToPDF(config);
    if (res.method === 'failed') return { method: 'failed', error: res.error };
    return { method: 'pdf-fallback' };
  } catch (e: any) {
    return { method: 'failed', error: e?.message || 'Print unavailable' };
  }
}
