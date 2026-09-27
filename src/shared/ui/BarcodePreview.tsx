import React from 'react';
import JsBarcode from 'jsbarcode';
import { BarcodeOptions } from '../../utils/barcode';

interface BarcodePreviewProps {
  value: string;
  options?: BarcodeOptions;
  className?: string;
  inline?: boolean;
  height?: number;
  showValue?: boolean;
}

// Memory cache for generated SVG path data to avoid re-running JsBarcode on every single update/render
const barcodeCache = new Map<string, { innerHTML: string; width: string; height: string; viewBox: string }>();

function getBarcodeData(value: string, options?: any) {
  // Enforce displayValue: false in SVG generation so JsBarcode only produces bars.
  // JsBarcode's SVG <text> elements are clipped/truncated in html2canvas / PNG sharing
  // (e.g. "INV--1(") and duplicate text. The React <span> below renders complete text.
  const cleanOptions = { ...options, displayValue: false };
  const cacheKey = `${value}_${JSON.stringify(cleanOptions)}`;
  if (barcodeCache.has(cacheKey)) {
    return barcodeCache.get(cacheKey)!;
  }

  try {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(svg, value, {
      format: 'CODE128',
      width: 1.5,
      height: 60,
      margin: 2,
      background: 'transparent',
      lineColor: '#000000',
      ...cleanOptions,
      displayValue: false
    });

    const w = svg.getAttribute('width') || '100';
    const h = svg.getAttribute('height') || '40';
    const widthVal = w.replace('px', '');
    const heightVal = h.replace('px', '');
    const viewBox = `0 0 ${widthVal} ${heightVal}`;

    const data = {
      innerHTML: svg.innerHTML,
      width: w,
      height: h,
      viewBox
    };
    barcodeCache.set(cacheKey, data);
    return data;
  } catch (err) {
    console.error('[Barcode] Failed to generate in-memory SVG:', err);
    return { innerHTML: '', width: '100', height: '40', viewBox: '0 0 100 40' };
  }
}

export const BarcodePreview = React.memo(
  ({
    value,
    options,
    className,
    inline = false,
    height,
    showValue
  }: BarcodePreviewProps) => {
    if (!value) {
      return inline ? (
        <span className="text-[11px] font-medium text-gray-600 dark:text-gray-500">No Barcode</span>
      ) : null;
    }

    const shouldShowValue = showValue !== false;

    const barcode = getBarcodeData(value, {
      height: height !== undefined ? height : (inline ? 12 : 28),
      width: inline ? 0.75 : 0.9,
      ...options,
      displayValue: false
    });

    const containerStyle: React.CSSProperties = inline
      ? {
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          height: '44px',
          backgroundColor: '#ffffff',
          padding: '2px 8px',
          borderRadius: '8px',
          border: '1px solid #f3f4f6',
          verticalAlign: 'middle',
        }
      : {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '10px 14px',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          boxShadow: 'none',
          width: 'fit-content',
          maxWidth: '100%',
          margin: '8px auto',
        };

    const svgStyle: React.CSSProperties = {
      display: 'block',
      margin: '0 auto',
      maxWidth: '100%',
      height: height !== undefined ? `${height}px` : (inline ? '16px' : '32px'),
    };

    const textStyle: React.CSSProperties = {
      display: 'block',
      margin: inline ? '2px auto 0 auto' : '4px auto 0 auto',
      textAlign: 'center',
      fontFamily: 'monospace',
      fontWeight: '700',
      color: '#000000',
      fontSize: inline ? '9px' : '11px',
      letterSpacing: '0.05em',
      whiteSpace: 'nowrap',
      width: '100%',
    };

    return (
      <div
        className={
          inline
            ? `flex flex-col items-center justify-center overflow-hidden h-[44px] bg-white px-2 py-0.5 rounded border border-neutral-200 dark:border-white/[0.08] ${className || ''}`
            : `p-2.5 bg-white rounded-xl border border-neutral-200 dark:border-white/[0.08] flex flex-col items-center justify-center shadow-none ${className || ''}`
        }
        style={containerStyle}
      >
        <svg
          viewBox={barcode.viewBox}
          width={barcode.width.replace('px', '')}
          height={barcode.height.replace('px', '')}
          className={`${height !== undefined ? '' : (inline ? 'h-[16px]' : 'h-[32px]')} w-auto text-black`}
          style={svgStyle}
          dangerouslySetInnerHTML={{ __html: barcode.innerHTML }}
        />
        {shouldShowValue && value && (
          <span
            className={inline ? "text-[9px] font-mono font-bold mt-0.5 text-black leading-none select-all tracking-wider text-center" : "text-[11px] font-mono font-bold mt-1 text-black select-all tracking-wider text-center"}
            style={textStyle}
          >
            {value}
          </span>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.value === nextProps.value &&
      prevProps.inline === nextProps.inline &&
      prevProps.height === nextProps.height &&
      prevProps.showValue === nextProps.showValue &&
      prevProps.className === nextProps.className &&
      JSON.stringify(prevProps.options) === JSON.stringify(nextProps.options)
    );
  }
);
