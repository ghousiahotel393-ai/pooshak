import html2canvas from 'html2canvas';
import { formatCurrency } from '../../../lib/currencies';
import { formatAppDate } from '../../../lib/dateUtils';
import { sonner } from '../../../lib/sonner';
import { openExternalLink } from '../../../lib/urlHelper';
import { CURRENCY_DIAL_CODE } from '../../customers/customerManagerUtils';

export function buildPrintHtml(
  innerHTML: string,
  opts: {
    is58mm: boolean;
    isA4: boolean;
    pageSizeCSS: string;
    fontFamily: string;
    settings: any;
  }
): string {
  const { is58mm, isA4, pageSizeCSS, fontFamily, settings } = opts;
  const thermalWidth = is58mm ? '48mm' : '72mm';
  const finalWidth = isA4 ? '100%' : thermalWidth;

  const defaultPadH = isA4 ? 15 : is58mm ? 3.5 : 4.5;
  const padLeft = (typeof settings?.receiptPaddingLeft === 'number' && settings.receiptPaddingLeft > 0)
    ? settings.receiptPaddingLeft
    : defaultPadH;
  const padRight = (typeof settings?.receiptPaddingRight === 'number' && settings.receiptPaddingRight > 0)
    ? settings.receiptPaddingRight
    : defaultPadH;
  const padTop = typeof settings?.receiptPaddingTop === 'number' ? settings.receiptPaddingTop : (isA4 ? 12 : 2);
  const padBottom = typeof settings?.receiptPaddingBottom === 'number' ? settings.receiptPaddingBottom : (isA4 ? 12 : 10);

  const pageCSS = isA4
    ? `@page { size: A4; margin: ${Math.max(8, padTop)}mm ${Math.max(10, padRight)}mm ${Math.max(10, padBottom)}mm ${Math.max(10, padLeft)}mm; }`
    : `@page { size: ${is58mm ? '58mm auto' : '80mm auto'}; margin: 0; }`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; background: #fff !important; width: 100%; color: #000 !important; }
  ${pageCSS}
  #print-container {
    width: ${finalWidth} !important;
    max-width: ${finalWidth} !important;
    margin: 0 auto !important;
    padding-left: ${isA4 ? 0 : Math.max(0, padLeft)}mm !important;
    padding-right: ${isA4 ? 0 : Math.max(0, padRight)}mm !important;
    padding-top: ${isA4 ? 0 : Math.max(0, padTop)}mm !important;
    padding-bottom: ${isA4 ? 0 : Math.max(0, padBottom)}mm !important;
    box-sizing: border-box !important;
    position: relative !important;
    left: ${settings?.receiptOffsetX || 0}mm !important;
    background: #fff !important;
    color: #000 !important;
    display: block !important;
    word-wrap: break-word;
    font-family: ${fontFamily};
  }
  #print-container * {
    box-sizing: border-box !important;
    max-width: 100% !important;
  }
  #print-container > div {
    width: 100% !important;
    max-width: 100% !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
    box-sizing: border-box !important;
  }
  table, tr, td, th, .receipt-row, .avoid-break, [data-avoid-break="true"] {
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }
  thead {
    display: table-header-group !important;
  }
  tfoot {
    display: table-footer-group !important;
  }
  .header-segment, .totals-segment, .footer-segment, .meta-segment, .payment-segment {
    break-inside: avoid !important;
    page-break-inside: avoid !important;
    display: block !important;
  }
  .header-segment {
    text-align: center !important;
    position: relative !important;
    left: ${settings?.receiptHeaderOffsetX || 0}mm !important;
    width: 100% !important;
  }
  .footer-segment {
    text-align: center !important;
    position: relative !important;
    left: ${settings?.receiptFooterOffsetX || 0}mm !important;
    width: 100% !important;
  }
  .body-segment {
    width: 100% !important;
    display: block !important;
  }
  * { background: transparent !important; color: #000 !important; box-shadow: none !important; }
</style>
</head>
<body>
  <div id="print-container">
    ${innerHTML}
  </div>
</body>
</html>`;
}

const logoDataUrlCache = new Map<string, string>();

/**
 * Pre-inlines any remote <img> elements in receiptEl into memory data URLs BEFORE html2canvas runs.
 * 1. Checks in-memory cache (0ms).
 * 2. Grabs pixel data directly from already-loaded <img> DOM element via canvas snapshot (0ms, zero network).
 * 3. Falls back to a fast time-boxed fetch (800ms) only if element canvas is tainted.
 * Returns a cleanup function that restores the original src attributes on the live receipt.
 */
export async function inlineReceiptImagesLocally(receiptEl: HTMLElement): Promise<() => void> {
  const imgs = Array.from(receiptEl.querySelectorAll('img'));
  const restorations: Array<{ el: HTMLImageElement; origSrc: string }> = [];

  await Promise.all(imgs.map(async (img) => {
    const src = img.getAttribute('src') || '';
    if (!src || src.startsWith('data:') || src.startsWith('blob:')) return;

    // 1. In-memory cache hit
    if (logoDataUrlCache.has(src)) {
      restorations.push({ el: img, origSrc: src });
      img.setAttribute('src', logoDataUrlCache.get(src)!);
      return;
    }

    // 2. Direct DOM canvas snapshot from already-loaded image
    try {
      if (img.complete && img.naturalWidth > 0) {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataUrl = c.toDataURL('image/png');
          logoDataUrlCache.set(src, dataUrl);
          restorations.push({ el: img, origSrc: src });
          img.setAttribute('src', dataUrl);
          return;
        }
      }
    } catch {
      // Canvas tainted (CORS restriction) — fall back to fast network fetch below
    }

    if (!/^https?:\/\//i.test(src)) return;

    // 3. Fast time-boxed network fetch (max 800ms) so capture never hangs
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 800);
      const res = await fetch(src, { signal: controller.signal, cache: 'force-cache' });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const blob = await res.blob();
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
      logoDataUrlCache.set(src, dataUrl);
      restorations.push({ el: img, origSrc: src });
      img.setAttribute('src', dataUrl);
    } catch {
      // Offline / timeout: leave src alone, capture continues cleanly without error
    }
  }));

  return () => {
    restorations.forEach(({ el, origSrc }) => {
      el.setAttribute('src', origSrc);
    });
  };
}

export async function captureReceiptCanvas(receiptEl: HTMLElement): Promise<HTMLCanvasElement> {
  const restoreImgs = await inlineReceiptImagesLocally(receiptEl);
  try {
    return await html2canvas(receiptEl, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      imageTimeout: 1000,
      width: receiptEl.offsetWidth,
      height: receiptEl.scrollHeight,
      windowHeight: receiptEl.scrollHeight,
      y: 0,
      scrollX: 0,
      scrollY: 0,
    });
  } finally {
    restoreImgs();
  }
}

export function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
  sonner.success('Receipt saved to downloads');
}

export function openWhatsAppReceipt(sale: any, settings: any, currencyCode: string, showDiscount: boolean) {
  if (!sale.customerPhone) return;
  let digits = String(sale.customerPhone).replace(/\D/g, '');
  if (!digits) return;

  const dialCode = CURRENCY_DIAL_CODE[currencyCode] || '92';
  if (!digits.startsWith(dialCode)) {
    if (digits.startsWith('0')) {
      digits = dialCode + digits.substring(1);
    } else {
      digits = dialCode + digits;
    }
  }

  const itemsList = (sale.items || [])
    .map((item: any, idx: number) => `${idx + 1}. ${item.product?.name || item.name || 'Item'} (x${item.quantity}): ${formatCurrency(item.product?.price ?? item.price ?? 0, currencyCode)}`)
    .join('\n');

  let message = `*${settings.storeName} - Digital Receipt*\n\n` +
    `Hello ${sale.customerName || 'Customer'},\n` +
    `Thank you for your purchase! Here is your invoice details:\n\n` +
    `*Invoice:* ${sale.invoiceNumber}\n` +
    `*Date:* ${formatAppDate(sale.timestamp, settings.country)}\n\n` +
    `*Items:*\n${itemsList}\n\n`;

  if (showDiscount) {
    message += `*Subtotal: ${formatCurrency(sale.subtotal, currencyCode)}*\n`;
    if (sale.discountAmount > 0) {
      message += `*Discount: -${formatCurrency(sale.discountAmount, currencyCode)}*\n`;
    }
  }
  if (sale.taxAmount > 0) {
    message += `*Tax: ${formatCurrency(sale.taxAmount, currencyCode)}*\n`;
  }

  message += `\n*Total: ${formatCurrency(sale.total, currencyCode)}*\n\n` +
    `_Software by Zaynah Developers_`;
  openExternalLink(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`);
}
