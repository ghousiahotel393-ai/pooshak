import { sonner } from '../../../lib/sonner';
import { PaperGeometry } from './barcodeLayout';

interface BuildPrintHtmlParams {
    el: HTMLElement;
    paperSize: string;
    geo: PaperGeometry;
    a4Columns: number;
    a4Rows: number;
    gapXmm: number;
    gapYmm: number;
    isThermal: boolean;
}

let activePrintPopup: Window | null = null;

/**
 * Builds clean, true-size print HTML from the on-screen preview DOM.
 * Strips preview scaling and wraps pages with strict page-break CSS.
 */
export function buildBarcodePrintHtml({
    el,
    paperSize,
    geo,
    a4Columns,
    a4Rows,
    gapXmm,
    gapYmm,
    isThermal,
}: BuildPrintHtmlParams): string {
    const pageStyle = paperSize === 'A4'
        ? `@page { size: A4 portrait; margin: 0mm; }`
        : `@page { size: ${geo.widthMm}mm ${geo.heightMm}mm; margin: 0mm; }`;

    let pagesHtml = '';

    if (!isThermal) {
        const pageEls = el.querySelectorAll('.print-page');
        const pageArr = Array.from(pageEls);
        pagesHtml = pageArr.map((pageEl, idx) => {
            const clone = pageEl.cloneNode(true) as HTMLElement;
            clone.style.transform = 'none';
            clone.style.transformOrigin = 'unset';
            clone.style.width = `${geo.widthMm}mm`;
            clone.style.height = `${geo.heightMm}mm`;
            clone.style.margin = '0 auto';
            clone.style.marginBottom = '0';
            clone.style.boxShadow = 'none';
            clone.style.boxSizing = 'border-box';
            clone.style.overflow = 'hidden';
            const isLast = idx === pageArr.length - 1;
            return `<div class="print-page-wrapper ${isLast ? 'last-page' : ''}">${clone.outerHTML}</div>`;
        }).join('\n');
    } else {
        const labelEls = el.querySelectorAll('.label-to-print');
        const labelArr = Array.from(labelEls);
        pagesHtml = labelArr.map((lblEl, idx) => {
            const clone = lblEl.cloneNode(true) as HTMLElement;
            clone.style.transform = 'none';
            clone.style.transformOrigin = 'unset';
            clone.style.width = `${geo.widthMm}mm`;
            clone.style.height = `${geo.heightMm}mm`;
            clone.style.margin = '0 auto';
            clone.style.marginBottom = '0';
            clone.style.boxShadow = 'none';
            clone.style.border = 'none';
            clone.style.boxSizing = 'border-box';
            clone.style.overflow = 'hidden';
            const isLast = idx === labelArr.length - 1;
            return `<div class="print-label-wrapper ${isLast ? 'last-page' : ''}">${clone.outerHTML}</div>`;
        }).join('\n');
    }

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Barcodes_${Date.now()}</title>
  <style>
    ${pageStyle}
    * {
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      margin: 0;
      padding: 0;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #fff !important;
      width: 100% !important;
      color: #000 !important;
    }
    .print-page-wrapper {
      width: ${geo.widthMm}mm !important;
      height: ${geo.heightMm}mm !important;
      page-break-after: always !important;
      break-after: page !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      overflow: hidden !important;
      margin: 0 auto !important;
      padding: 0 !important;
      background: #fff !important;
    }
    .print-page-wrapper.last-page {
      page-break-after: auto !important;
      break-after: auto !important;
    }
    .print-label-wrapper {
      width: ${geo.widthMm}mm !important;
      height: ${geo.heightMm}mm !important;
      page-break-after: always !important;
      break-after: page !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      overflow: hidden !important;
      margin: 0 auto !important;
      padding: 0 !important;
      background: #fff !important;
    }
    .print-label-wrapper.last-page {
      page-break-after: auto !important;
      break-after: auto !important;
    }
    .print-page {
      width: ${geo.widthMm}mm !important;
      height: ${geo.heightMm}mm !important;
      transform: none !important;
      box-shadow: none !important;
      margin: 0 !important;
      padding: ${geo.marginMm}mm !important;
      display: grid !important;
      grid-template-columns: repeat(${a4Columns}, 1fr) !important;
      grid-template-rows: repeat(${a4Rows}, 1fr) !important;
      align-content: stretch !important;
      gap: ${gapYmm}mm ${gapXmm}mm !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
      background: #fff !important;
    }
    .label-to-print {
      width: ${geo.widthMm}mm !important;
      height: ${geo.heightMm}mm !important;
      transform: none !important;
      box-shadow: none !important;
      border: none !important;
      margin: 0 !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
      background: #fff !important;
    }
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>`;
}

/**
 * Executes printing safely via Electron, invisible iframe, or popup window.
 * Ensures the print UI is focused on top and never leaves background popups or blocks scrolling.
 */
export async function executeBarcodePrint(html: string, paperSize: string): Promise<void> {
    // 1. Electron Desktop App
    // @ts-ignore
    if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.isElectron) {
        try {
            // @ts-ignore
            await window.electronAPI.printHtml(html, { silent: false, isA4: paperSize === 'A4' });
            return;
        } catch (err) {
            console.error('[BarcodePrint] Electron print error:', err);
        }
    }

    // 2. Browser Environment: Invisible Iframe (Direct & Reliable)
    // Avoids popups completely, prevents background orphaned windows, and never freezes parent scroll.
    try {
        const oldIframe = document.getElementById('pos-barcode-print-frame');
        if (oldIframe && oldIframe.parentNode) {
            oldIframe.parentNode.removeChild(oldIframe);
        }

        const iframe = document.createElement('iframe');
        iframe.id = 'pos-barcode-print-frame';
        iframe.setAttribute('title', 'Barcode Print');
        iframe.style.cssText = 'position:fixed; top:-9999px; left:-9999px; width:0; height:0; border:0; opacity:0; pointer-events:none; z-index:-1;';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document;
        if (doc) {
            doc.open();
            doc.write(html);
            doc.close();

            const doPrint = () => {
                try {
                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();
                } catch (err) {
                    console.warn('[BarcodePrint] Iframe print call failed, falling back to popup:', err);
                    printViaSafePopup(html);
                } finally {
                    setTimeout(() => {
                        const el = document.getElementById('pos-barcode-print-frame');
                        if (el && el.parentNode) el.parentNode.removeChild(el);
                    }, 5000);
                }
            };

            setTimeout(doPrint, 200);
            return;
        }
    } catch (err) {
        console.warn('[BarcodePrint] Iframe setup failed, falling back to popup:', err);
    }

    // 3. Fallback: Safe Popup with auto-close and focus
    printViaSafePopup(html);
}

function printViaSafePopup(html: string) {
    try {
        if (activePrintPopup && !activePrintPopup.closed) {
            activePrintPopup.close();
        }
    } catch {}

    const win = window.open('', 'POS_BARCODE_PRINT_POPUP', 'width=1024,height=768');
    if (!win) {
        sonner.error('Popup blocked. Please allow popups for printing.');
        return;
    }

    activePrintPopup = win;
    win.focus();

    const popupHtml = html.replace('</body>', `
        <script>
            window.onload = function() {
                window.focus();
                setTimeout(function() {
                    window.print();
                }, 100);
            };
            window.onafterprint = function() {
                setTimeout(function() {
                    window.close();
                }, 100);
            };
            // Fallback close if focus returns to window after print dialog dismiss
            var printedOnce = false;
            window.addEventListener('blur', function() { printedOnce = true; });
            window.addEventListener('focus', function() {
                if (printedOnce) {
                    setTimeout(function() { try { window.close(); } catch(e){} }, 500);
                }
            });
        </script>
    </body>`);

    win.document.open();
    win.document.write(popupHtml);
    win.document.close();
    win.focus();
}
