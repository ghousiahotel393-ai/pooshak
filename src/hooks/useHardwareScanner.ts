import { useEffect, useRef } from 'react';

/**
 * Hardware (keyboard-wedge) barcode scanner listener.
 *
 * A USB/Bluetooth HID scanner emits its characters as an extremely fast keystroke burst
 * (typically < 40ms apart) usually terminated by Enter. This hook detects that burst by
 * inter-key timing and:
 *   - suppresses the burst characters (preventDefault + stopImmediatePropagation) so they do
 *     NOT leak into the focused search box as visible "1 2 3..." typing or trigger a filter
 *     per character, and
 *   - fires `onScan(code)` instantly on the terminating Enter (or on a short inactivity flush
 *     for scanners that send no Enter suffix).
 *
 * Slow human typing (gaps > threshold) is left completely untouched, so manual search still
 * works normally. This is the single authoritative scan→cart entry point for the POS.
 */
export function useHardwareScanner(onScan: (barcodeValue: string) => void) {
  const buffer = useRef('');
  const lastKeyTime = useRef(0);
  const fastCount = useRef(0); // consecutive rapid keystrokes seen in the current burst
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    const FAST_MS = 45; // max inter-key gap that still counts as a scanner burst
    const MIN_LEN = 3; // shortest accepted code (short SKUs)
    const IDLE_MS = 120; // no-Enter scanners: flush the burst after this idle gap

    const reset = () => {
      buffer.current = '';
      lastKeyTime.current = 0;
      fastCount.current = 0;
    };

    // A burst is a scan when it is long enough AND most of its keystrokes arrived at scanner speed.
    const isScanBurst = (code: string) =>
      code.length >= MIN_LEN && fastCount.current >= Math.max(1, Math.floor(code.length / 2));

    const clearFocusedInput = () => {
      const el = document.activeElement;
      if (el instanceof HTMLInputElement && el.type !== 'checkbox' && el.type !== 'radio') {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        setter?.call(el, '');
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };

    const fire = (code: string) => {
      clearFocusedInput();
      onScanRef.current(code);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const now = Date.now();

      if (e.key === 'Enter' || e.keyCode === 13) {
        const scanned = buffer.current.trim();
        if (timer.current) clearTimeout(timer.current);
        if (isScanBurst(scanned)) {
          // Confident scan — own the Enter so it never falls through to the search input.
          e.preventDefault();
          e.stopImmediatePropagation();
          fire(scanned);
        }
        reset();
        return;
      }

      if (e.key && e.key.length === 1) {
        const gap = lastKeyTime.current > 0 ? now - lastKeyTime.current : Infinity;

        if (gap < FAST_MS) {
          // Inside a scanner burst — keep the char out of the UI entirely.
          fastCount.current += 1;
          e.preventDefault();
          e.stopImmediatePropagation();
        } else if (buffer.current.length > 0) {
          // A slow gap breaks the burst; restart buffering from this key.
          buffer.current = '';
          fastCount.current = 0;
        }

        buffer.current += e.key;
        lastKeyTime.current = now;

        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          // Scanners with no Enter suffix: flush a detected burst after a brief idle.
          const scanned = buffer.current.trim();
          if (isScanBurst(scanned)) fire(scanned);
          reset();
        }, IDLE_MS);
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
}
