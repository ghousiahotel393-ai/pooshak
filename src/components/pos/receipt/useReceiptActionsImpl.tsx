import { useEffect, useRef, useState, useCallback } from 'react';
import { sonner } from '../../../lib/sonner';
import { useSoundFeedback } from '../../../hooks/useSoundFeedback';
import { type ReceiptCtx } from './types';
import { buildPrintHtml, captureReceiptCanvas, triggerDownload, openWhatsAppReceipt } from './receiptUtils';

export function useReceiptActions(
  ctx: ReceiptCtx,
  opts: { onClose: () => void; isAutoPrint: boolean }
) {
  const { sale, settings, is58mm, isA4, pageSizeCSS, fontFamily, currencyCode, showDiscount } = ctx;
  const { onClose, isAutoPrint } = opts;
  const { play } = useSoundFeedback();

  const isPrintingRef = useRef(false);
  const autoPrintStartedRef = useRef(false);
  const autoPngSavedRef = useRef(false);
  const [isSavingPng, setIsSavingPng] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const handlePrint = useCallback(async () => {
    console.log('[ReceiptPrint] handlePrint triggered');
    if (isPrintingRef.current) {
      console.log('[ReceiptPrint] Already printing, skipping');
      return;
    }
    isPrintingRef.current = true;

    setTimeout(() => {
      isPrintingRef.current = false;
    }, 3000);

    play('receipt');
    const receiptEl = document.getElementById('receipt-content');
    if (!receiptEl) {
      console.warn('[ReceiptPrint] Element not found, retrying in 500ms...');
      setTimeout(handlePrint, 500);
      return;
    }

    const printHTML = buildPrintHtml(receiptEl.innerHTML, {
      is58mm,
      isA4,
      pageSizeCSS,
      fontFamily,
      settings,
    });

    const savedConfig = (() => {
      try {
        const raw = localStorage.getItem('pos_hardware_printer_config');
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    })();
    const targetPrinter = savedConfig?.address || '';

    // @ts-ignore -- electronAPI is injected by the optional Electron shell only
    if (window.electronAPI && window.electronAPI.isElectron) {
      console.log('[ReceiptPrint] Using Electron silent print:', isAutoPrint, 'target:', targetPrinter || 'Default');
      try {
        // @ts-ignore -- electronAPI is injected by the optional Electron shell only
        await window.electronAPI.printHtml(printHTML, {
          silent: isAutoPrint,
          printerName: targetPrinter,
          is58mm,
          isA4,
        });
      } catch (error) {
        console.error('Electron print failed:', error);
      }
    } else {
      console.log('[ReceiptPrint] Using browser iframe print');
      const iframe = document.createElement('iframe');
      iframe.style.cssText = `
        position: fixed;
        right: 0;
        bottom: 0;
        width: 0;
        height: 0;
        border: none;
        visibility: hidden;
        z-index: -1;
      `;
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(printHTML);
        doc.close();

        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            console.log('[ReceiptPrint] Browser print triggered');
          } catch (e) {
            console.error('iframe print failed:', e);
          }

          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 2000);
        }, 500);
      } else {
        console.error('[ReceiptPrint] Could not access iframe document');
      }
    }
  }, [is58mm, isA4, pageSizeCSS, fontFamily, settings, play]);

  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  useEffect(() => {
    if (isAutoPrint && !autoPrintStartedRef.current) {
      autoPrintStartedRef.current = true;
      console.log('[ReceiptPrint] Auto-print initialized');
      const timer = setTimeout(() => {
        handlePrint().then(() => {
          setTimeout(() => {
            console.log('[ReceiptPrint] Auto-closing after print attempt');
            handleSafeClose();
          }, 3000);
        }).catch(err => {
          console.error('[ReceiptPrint] Print failed:', err);
        });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isAutoPrint]);

  const performAutoSavePng = useCallback(async () => {
    if (autoPngSavedRef.current || isSavingPng) return;
    autoPngSavedRef.current = true;
    setIsSavingPng(true);

    try {
      const receiptEl = document.getElementById('receipt-content');
      if (!receiptEl) return;

      const originalStyle = receiptEl.style.cssText;
      receiptEl.style.boxShadow = 'none';
      receiptEl.style.height = 'auto';
      receiptEl.style.overflow = 'visible';

      const canvas = await captureReceiptCanvas(receiptEl);

      receiptEl.style.cssText = originalStyle;

      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const dateStr = new Date().toISOString().slice(0, 10);
        const fileName = `${dateStr}_${sale.invoiceNumber || sale.id?.slice(-8)}.png`;

        try {
          const { localDb } = await import('../../../lib/localDb');
          await localDb.savedReceiptPngs.put({
            id: `${dateStr}_${sale.id}`,
            invoiceNumber: sale.invoiceNumber,
            saleDate: dateStr,
            saleId: sale.id,
            blob,
            fileName,
            createdAt: new Date()
          });
        } catch (dbErr) {
          console.warn('[ReceiptPrint] Failed to save PNG to IndexedDB:', dbErr);
        }

        triggerDownload(blob, fileName);
      }, 'image/png');
    } catch (err) {
      console.error('[ReceiptPrint] Auto-save PNG failed:', err);
    } finally {
      setIsSavingPng(false);
    }
  }, [isSavingPng, sale]);

  const handleSafeClose = useCallback(async () => {
    if (settings.autoSaveReceiptPng && !autoPngSavedRef.current && !isSavingPng) {
      document.body.style.cursor = 'wait';
      await performAutoSavePng();
      document.body.style.cursor = 'default';
    }
    onClose();
  }, [settings.autoSaveReceiptPng, isSavingPng, performAutoSavePng, onClose]);

  useEffect(() => {
    if (!settings.autoSaveReceiptPng) return;
    const timer = setTimeout(() => {
      performAutoSavePng();
    }, 1500);
    return () => clearTimeout(timer);
  }, [settings.autoSaveReceiptPng, performAutoSavePng]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAutoPrint && autoPrintStartedRef.current) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        const printBtn = document.getElementById('receipt-print-btn');
        if (printBtn) printBtn.click();
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        const shareBtn = document.getElementById('receipt-share-btn');
        if (shareBtn) shareBtn.click();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        const closeBtn = document.getElementById('receipt-close-btn');
        if (closeBtn) closeBtn.click();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAutoPrint]);

  const handleWhatsAppRedirect = useCallback(() => {
    openWhatsAppReceipt(sale, settings, currencyCode, showDiscount);
  }, [sale, settings, currencyCode, showDiscount]);

  const handleShareReceipt = useCallback(async () => {
    const receiptEl = document.getElementById('receipt-content');
    if (!receiptEl || isSharing) return;

    setIsSharing(true);
    try {
      const originalStyle = receiptEl.style.cssText;
      receiptEl.style.boxShadow = 'none';
      receiptEl.style.height = 'auto';
      receiptEl.style.overflow = 'visible';

      const canvas = await captureReceiptCanvas(receiptEl);

      receiptEl.style.cssText = originalStyle;

      canvas.toBlob(async (blob) => {
        setIsSharing(false);
        if (!blob) {
          sonner.error('Could not generate receipt image');
          return;
        }

        const fileName = `Receipt_${sale.invoiceNumber || 'receipt'}.png`;
        const file = new File([blob], fileName, { type: 'image/png' });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: `Receipt ${sale.invoiceNumber || ''}`,
              files: [file],
            });
          } catch (shareErr: any) {
            if (shareErr.name !== 'AbortError') {
              console.error('Share failed:', shareErr);
              triggerDownload(blob, fileName);
            }
          }
        } else {
          triggerDownload(blob, fileName);
        }
      }, 'image/png');
    } catch (err) {
      setIsSharing(false);
      console.error('Capture failed:', err);
      sonner.error('Receipt capture failed');
    }
  }, [isSharing, sale]);

  return {
    handlePrint,
    handleSafeClose,
    handleWhatsAppRedirect,
    handleShareReceipt,
    isSavingPng,
    isSharing,
    triggerDownload,
  };
}
